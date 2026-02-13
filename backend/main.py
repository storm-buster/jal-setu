from __future__ import annotations

from datetime import datetime, timezone
import logging
from typing import Any, Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from wtf2_ml import (
    region_scenario_to_features,
    risk_score_from_prediction,
    wtf2_model,
)
import river_geometry

logger = logging.getLogger(__name__)


Region = Literal["Bihar", "Uttarakhand", "Jharkhand", "Uttar Pradesh"]
Scenario = Literal["0m", "1m", "2m"]


class UploadedFileMetadata(BaseModel):
    name: str
    width: int
    height: int
    bands: int
    size: int


class PolygonAOI(BaseModel):
    rings: list[list[list[float]]]
    wkid: Optional[int] = None


class MlPredictRequest(BaseModel):
    elevation: float = Field(..., gt=0)
    slope: float = Field(..., ge=0)
    flow_accumulation: float = Field(..., gt=0)
    distance_to_river: float = Field(..., ge=0)
    flood_depth: float = Field(..., ge=0)
    lulc_agriculture: float = Field(..., ge=0, le=1)
    lulc_urban: float = Field(..., ge=0, le=1)
    population_density: float = Field(..., gt=0)
    velocity_index: float = Field(..., ge=0, le=1)

    location_name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None


class AnalyzeRegionRequest(BaseModel):
    region: Region
    scenario: Scenario
    aoiPolygons: Optional[list[PolygonAOI]] = None

    # Optional: provide full ML feature vector (wtf2) to drive real inference.
    # If omitted, backend uses a region+scenario baseline.
    mlFeatures: Optional[MlPredictRequest] = None


class RiskSummaryResponse(BaseModel):
    area: int
    population: int
    riskScore: float
    embankmentStatus: str


class AnalyzeRegionResponse(BaseModel):
    risk: RiskSummaryResponse
    featureImportance: list[dict]
    impactComparison: list[dict]


class TerrainProfileResponse(BaseModel):
    region: Region
    profile: list[int]


class ReportRequest(BaseModel):
    region: Region
    scenario: Scenario
    uploadedFile: Optional[UploadedFileMetadata] = None
    aoiPolygons: Optional[list[PolygonAOI]] = None

    # Optional ML override for the riskScore used in the report.
    mlFeatures: Optional[MlPredictRequest] = None


class ReportResponse(BaseModel):
    alertId: str
    timestamp: str
    report: str


class AuthLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class AuthLoginResponse(BaseModel):
    token: str
    userId: str


class MlModelHealthResponse(BaseModel):
    modelLoaded: bool
    modelPath: str
    error: Optional[str] = None


class RiverGeometryResponse(BaseModel):
    region: Region
    scenario: Scenario
    geometry: dict[str, Any]  # GeoJSON FeatureCollection
    metadata: dict[str, Any]  # Buffer distances, river count, timestamp


class MlPredictResponse(BaseModel):
    risk_class: int
    risk_label: str
    probabilities: dict[str, float]
    confidence: float
    timestamp: str
    input_data: MlPredictRequest


app = FastAPI(title="FloodShield", version="0.1.0")

# In dev, Vite proxy is recommended; CORS is here for direct calls.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


FLOOD_DATA: dict[Region, dict[Scenario, RiskSummaryResponse]] = {
    "Bihar": {
        "0m": RiskSummaryResponse(area=0, population=0, riskScore=0.0, embankmentStatus="Normal"),
        "1m": RiskSummaryResponse(area=850, population=1_100_000, riskScore=6.2, embankmentStatus="Stable"),
        "2m": RiskSummaryResponse(area=1240, population=2_400_000, riskScore=8.4, embankmentStatus="Critical"),
    },
    "Uttarakhand": {
        "0m": RiskSummaryResponse(area=0, population=0, riskScore=0.0, embankmentStatus="Normal"),
        "1m": RiskSummaryResponse(area=210, population=300_000, riskScore=4.5, embankmentStatus="Stable"),
        "2m": RiskSummaryResponse(area=420, population=800_000, riskScore=7.1, embankmentStatus="Monitor"),
    },
    "Jharkhand": {
        "0m": RiskSummaryResponse(area=0, population=0, riskScore=0.0, embankmentStatus="Normal"),
        "1m": RiskSummaryResponse(area=430, population=650_000, riskScore=5.3, embankmentStatus="Stable"),
        "2m": RiskSummaryResponse(area=780, population=1_450_000, riskScore=7.6, embankmentStatus="Monitor"),
    },
    "Uttar Pradesh": {
        "0m": RiskSummaryResponse(area=0, population=0, riskScore=0.0, embankmentStatus="Normal"),
        "1m": RiskSummaryResponse(area=1120, population=2_050_000, riskScore=6.7, embankmentStatus="Stable"),
        "2m": RiskSummaryResponse(area=1680, population=4_300_000, riskScore=8.1, embankmentStatus="Critical"),
    },
}


def _scenario_depth_m(s: Scenario) -> float:
    return {"0m": 0.0, "1m": 1.0, "2m": 2.0}[s]


def _ml_features_for_region_scenario(*, region: Region, scenario: Scenario, ml_features: MlPredictRequest) -> dict:
    # Ensure the UI scenario controls the model's flood_depth.
    data = ml_features.model_dump()
    data["flood_depth"] = _scenario_depth_m(scenario)

    # Keep location strings consistent with our UI regions.
    if not data.get("state"):
        data["state"] = region

    return data


def get_base_risk(
    region: Region,
    scenario: Scenario,
    ml_features: Optional[MlPredictRequest] = None,
) -> RiskSummaryResponse:
    """Get area/pop from the table and (optionally) replace riskScore with wtf2 ML output."""

    base = FLOOD_DATA[region][scenario]

    if not wtf2_model.available():
        return base

    try:
        if ml_features is not None:
            features = _ml_features_for_region_scenario(region=region, scenario=scenario, ml_features=ml_features)
        else:
            features = region_scenario_to_features(region=region, scenario=scenario)

        pred = wtf2_model.predict(features)
        score = risk_score_from_prediction(pred)
        return base.model_copy(update={"riskScore": round(score, 2), "embankmentStatus": risk_classification(score)})
    except Exception as e:  # noqa: BLE001
        # Fall back to the mock data if anything goes wrong.
        logger.warning("wtf2 ML prediction failed; using mock FLOOD_DATA. error=%s", e)
        return base


def get_feature_importance() -> list[dict]:
    pairs = wtf2_model.feature_importance()
    if not pairs:
        # Previous mocked-but-deterministic defaults.
        return [
            {"name": "Elevation", "importance": 0.85, "fill": "#1f4e79"},
            {"name": "Rainfall", "importance": 0.72, "fill": "#2e75b6"},
            {"name": "Soil Type", "importance": 0.54, "fill": "#6fa8dc"},
            {"name": "Land Use", "importance": 0.45, "fill": "#9fc5e8"},
            {"name": "Slopes", "importance": 0.30, "fill": "#cfe2f3"},
        ]

    colors = ["#1f4e79", "#2e75b6", "#6fa8dc", "#9fc5e8", "#cfe2f3"]

    def pretty_name(s: str) -> str:
        s = s.replace("_log", " (log)")
        s = s.replace("_", " ")
        return s.title()

    top = pairs[:5]
    return [
        {"name": pretty_name(name), "importance": round(imp, 4), "fill": colors[i % len(colors)]}
        for i, (name, imp) in enumerate(top)
    ]


def risk_classification(score: float) -> str:
    if score >= 8:
        return "Critical"
    if score >= 6:
        return "High"
    if score >= 4:
        return "Moderate"
    return "Low"


def _aoi_bbox_area_km2(polys: list[PolygonAOI]) -> float:
    """Very rough AOI area estimation based on bbox of all rings in lon/lat degrees."""

    lons: list[float] = []
    lats: list[float] = []

    for p in polys:
        for ring in p.rings:
            for coord in ring:
                if len(coord) < 2:
                    continue
                lon, lat = coord[0], coord[1]
                lons.append(lon)
                lats.append(lat)

    if not lons or not lats:
        return 0.0

    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)

    # Approx conversion: 1 deg lat ~ 111 km; 1 deg lon ~ 111 km * cos(lat)
    mid_lat = (min_lat + max_lat) / 2.0
    km_per_deg_lat = 111.0
    km_per_deg_lon = 111.0 * max(0.1, abs(__import__("math").cos(__import__("math").radians(mid_lat))))

    width_km = max(0.0, (max_lon - min_lon) * km_per_deg_lon)
    height_km = max(0.0, (max_lat - min_lat) * km_per_deg_lat)

    return width_km * height_km



def apply_aoi_scale(region: Region, scenario: Scenario, base: RiskSummaryResponse, aoi: Optional[list[PolygonAOI]]) -> RiskSummaryResponse:
    if not aoi:
        return base

    # 1. Check for river intersections (The "Smart" Logic)
    # We collect all rings from all polygons
    all_rings = []
    for p in aoi:
        for ring in p.rings:
            all_rings.append(ring)
            
    intersects = river_geometry.check_river_intersection(region, all_rings)
    
    # 2. Logic: If AOI is provided, we strictly look at what's INSIDE the AOI.
    if not intersects:
        debug_msg = "No River"
        if not river_geometry.SHAPELY_AVAILABLE:
            debug_msg = "Shapely Missing"
        else:
             # Check if we even have rivers
             rivs = river_geometry.get_river_network(region)
             debug_msg = f"No Intersect (Checked {len(rivs)} rivers)"
             
        if scenario == "0m":
            return RiskSummaryResponse(area=0, population=0, riskScore=0.0, embankmentStatus="Normal")
            
        # No river in the box -> No flood risk from rivers (ignoring local rain for now)
        return RiskSummaryResponse(
            area=0, 
            population=0, 
            riskScore=0.0, 
            embankmentStatus=f"Safe - {debug_msg}"
        )

    # 3. If intersects, calculate risk based on the specific rivers found
    # We sum up the intersection lengths to gauge magnitude
    total_river_km = sum(r.intersection_length_km for r in intersects)
    primary_river = intersects[0].river_name
    
    # Base risk for the scenario (1m or 2m)
    # Scale risk: A longer river segment in the box = higher risk
    # But max out at 10.0
    
    # Simple heuristic: 1km of river in the box is "bad"
    risk_factor = min(1.0, total_river_km / 10.0) # 10km of river = max risk magnitude
    
    # Scenario multiplier
    scenario_mult = 1.0 if scenario == "1m" else 1.5
    
    # Calculate score
    # Baseline for having ANY river in 1m flood = 5.0
    # Add up to 4.0 based on length
    score = (5.0 + (risk_factor * 4.0)) * scenario_mult
    score = min(9.9, max(1.0, score)) # Clamp
    
    # Area/Pop estimation
    aoi_area_km2 = _aoi_bbox_area_km2(aoi)
    
    # Assume flood width varies by scenario
    flood_width_km = 1.0 if scenario == "1m" else 3.0
    flooded_area = min(aoi_area_km2, total_river_km * flood_width_km)
    
    # Pop density mock (say 500 ppl/km2)
    pop_at_risk = int(flooded_area * 500)

    return RiskSummaryResponse(
        area=int(flooded_area),
        population=pop_at_risk,
        riskScore=round(score, 2),
        embankmentStatus=f"Critical ({primary_river})" if score > 7 else f"Warning ({primary_river})",
    )


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/api/ml/health", response_model=MlModelHealthResponse)
def ml_health():
    loaded = wtf2_model.available()
    return MlModelHealthResponse(
        modelLoaded=loaded,
        modelPath=str(wtf2_model.model_path),
        error=None if loaded else wtf2_model.load_error,
    )


@app.post("/api/ml/predict", response_model=MlPredictResponse)
def ml_predict(payload: MlPredictRequest):
    if not wtf2_model.available():
        raise HTTPException(status_code=503, detail=wtf2_model.load_error or "ML model unavailable")

    pred = wtf2_model.predict(payload.model_dump())

    return MlPredictResponse(
        risk_class=pred.risk_class,
        risk_label=pred.risk_label,
        probabilities=pred.probabilities,
        confidence=pred.confidence,
        timestamp=datetime.now(timezone.utc).isoformat(),
        input_data=payload,
    )


@app.post("/api/auth/login", response_model=AuthLoginResponse)
def auth_login(payload: AuthLoginRequest):
    # Mock "JWT" token. This is intentionally not a real signed JWT.
    # The frontend treats its presence as an "authenticated" session.
    user_id = payload.username.strip().lower()
    token = f"mock-jwt.{user_id}.{int(datetime.now(timezone.utc).timestamp())}"
    return AuthLoginResponse(token=token, userId=user_id)


@app.get("/api/risk-summary", response_model=RiskSummaryResponse)
def risk_summary(region: Region, scenario: Scenario):
    return get_base_risk(region, scenario)


@app.post("/api/risk-summary", response_model=RiskSummaryResponse)
def risk_summary_post(payload: AnalyzeRegionRequest):
    # If AOI provided, we DO NOT use the region baseline. We calculate strictly per AOI.
    if payload.aoiPolygons:
         # Pass dummy baseline because apply_aoi_scale will override it completely now
         dummy_base = RiskSummaryResponse(area=0, population=0, riskScore=0, embankmentStatus="")
         return apply_aoi_scale(payload.region, payload.scenario, dummy_base, payload.aoiPolygons)
         
    return get_base_risk(payload.region, payload.scenario, payload.mlFeatures)


@app.post("/api/analyze-region", response_model=AnalyzeRegionResponse)
def analyze_region(payload: AnalyzeRegionRequest):
    if payload.aoiPolygons:
        dummy_base = RiskSummaryResponse(area=0, population=0, riskScore=0, embankmentStatus="")
        risk = apply_aoi_scale(payload.region, payload.scenario, dummy_base, payload.aoiPolygons)
    else:
        risk = get_base_risk(payload.region, payload.scenario, payload.mlFeatures)

    feature_importance = get_feature_importance()

    # Impact comparison: 1m vs 2m for the selected AOI (if present), plus 1m vs 2m at the state level.
    def impact_item(r: Region, s: Scenario, aoi: Optional[list[PolygonAOI]]):
        if aoi:
             dummy = RiskSummaryResponse(area=0, population=0, riskScore=0, embankmentStatus="")
             scaled = apply_aoi_scale(r, s, dummy, aoi)
        else:
             base = get_base_risk(r, s, payload.mlFeatures)
             scaled = base # No AOI scaling needed for regional baseline
             
        return {
            "name": f"{r} +{s}",
            "area": scaled.area,
            # Render in millions for chart readability.
            "risk": round(scaled.population / 1_000_000, 2),
        }

    impact = [
        impact_item(payload.region, "1m", payload.aoiPolygons),
        impact_item(payload.region, "2m", payload.aoiPolygons),
        impact_item(payload.region, "1m", None),
        impact_item(payload.region, "2m", None),
    ]

    return AnalyzeRegionResponse(
        risk=risk,
        featureImportance=feature_importance,
        impactComparison=impact,
    )


@app.get("/api/terrain-profile", response_model=TerrainProfileResponse)
def terrain_profile(region: Region):
    # Mock 40 samples; values are just placeholders.
    base = {
        "Bihar": 120,
        "Uttarakhand": 650,
        "Jharkhand": 180,
        "Uttar Pradesh": 110,
    }[region]
    profile = [base + ((i % 9) * 7) - ((i % 5) * 4) for i in range(40)]
    return TerrainProfileResponse(region=region, profile=profile)


@app.post("/api/report", response_model=ReportResponse)
def report(payload: ReportRequest):
    now = datetime.now(timezone.utc)
    date_only = now.date().isoformat()
    alert_id = f"FS-{payload.region[:2].upper()}-{date_only.replace('-', '')}-{'EXT' if payload.uploadedFile else '01'}"

    # Determine risk context
    river_context = ""
    if payload.aoiPolygons:
         # Re-run check to get names for the prompt
         all_rings = []
         for p in payload.aoiPolygons:
            for ring in p.rings:
                all_rings.append(ring)
         intersects = river_geometry.check_river_intersection(payload.region, all_rings)
         
         if intersects:
             names = ", ".join(set(r.river_name for r in intersects))
             river_context = f"**Detected Rivers**: {names} within the designated zone.\n"
         else:
             river_context = "**Status**: No major river channels detected within the selected polygon.\n"

         dummy = RiskSummaryResponse(area=0, population=0, riskScore=0, embankmentStatus="")
         risk = apply_aoi_scale(payload.region, payload.scenario, dummy, payload.aoiPolygons)
    else:
         base = get_base_risk(payload.region, payload.scenario, payload.mlFeatures)
         risk = base # apply_aoi_scale handles None AOI by returning base, but let's be explicit
    
    risk_class = risk_classification(risk.riskScore)

    if payload.uploadedFile:
        report_text = (
            f"**ANALYSIS REPORT [{date_only}]**: Custom Raster Dataset Inspection\n\n"
            f"**Source**: `{payload.uploadedFile.name}`\n"
            f"**Dimensions**: {payload.uploadedFile.width}x{payload.uploadedFile.height} pixels | "
            f"**Bands**: {payload.uploadedFile.bands}\n\n"
            "**Detected Anomalies**:\n"
            "1. **High Water Mark**: Localized maxima exceeding historic norms in the SW quadrant.\n"
            f"2. **Data-Model Variance**: Uploaded raster shows higher saturation than baseline models for {payload.region}.\n\n"
            "**Recommendation**:\n"
            "1. **Field Validation**: Deploy drone unit to verify spectral signature.\n"
            "2. **Ingestion**: Merge dataset into ensemble for calibrated risk scoring."
        )
    else:
        # Dynamic report based on polygon findings
        report_text = (
            f"**SITREP [{date_only}]**: Flood projection for {payload.region} under {payload.scenario} scenario.\n\n"
            f"{river_context}\n"
            f"**Risk classification**: {risk_class}\n"
            f"**Flooded area**: {risk.area} km²\n"
            f"**Population at risk**: {risk.population}\n\n"
            "**Key Hazards**:\n"
            "1. **Critical Inundation**: Northern sectors facing elevated depth.\n"
            f"2. **Infrastructure Risk**: Embankments status: {risk.embankmentStatus}.\n\n"
            "**Recommended Action**:\n"
            "1. **Evacuation**: Prioritize high-risk sectors.\n"
            "2. **Medical Logistics**: Pre-position water-borne disease response kits."
        )

    return ReportResponse(alertId=alert_id, timestamp=now.isoformat(), report=report_text)




@app.get("/api/river-geometry", response_model=RiverGeometryResponse)
def get_river_geometry_endpoint(region: Region, scenario: Scenario):
    """
    Returns GeoJSON FeatureCollection of river flood buffers for the given region and scenario.
    """
    geom = river_geometry.get_flood_geometry(region, scenario)
    
    base_buffer = 0.0
    if scenario == "1m":
        base_buffer = 3.0
    elif scenario == "2m":
        base_buffer = 8.0

    return RiverGeometryResponse(
        region=region,
        scenario=scenario,
        geometry=geom,
        metadata={
            "buffer_km": base_buffer,
            "river_count": len(geom.get("features", [])),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    )


class ChatRequest(BaseModel):
    message: str
    region: Region
    scenario: Scenario
    mlFeatures: Optional[MlPredictRequest] = None
    aoiPolygons: Optional[list[PolygonAOI]] = None


class ChatResponse(BaseModel):
    response: str
    timestamp: str


@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest):
    """
    Simple rule-based chatbot that answers questions based on the current flood analysis.
    """
    try:
        print(f"Received chat request: {payload}")
        msg = payload.message.lower()
        
        # 1. Calculate current risk context (reusing existing logic)
        if payload.aoiPolygons:
            dummy = RiskSummaryResponse(area=0, population=0, riskScore=0, embankmentStatus="")
            risk = apply_aoi_scale(payload.region, payload.scenario, dummy, payload.aoiPolygons)
            
            # Check rivers
            all_rings = [ring for p in payload.aoiPolygons for ring in p.rings]
            intersects = river_geometry.check_river_intersection(payload.region, all_rings)
            rivers_found = [r.river_name for r in intersects]
            river_text = f"The {', '.join(rivers_found)} river(s)" if rivers_found else "No major rivers"
        else:
            risk = get_base_risk(payload.region, payload.scenario, payload.mlFeatures)
            rivers_found = [] # Regional view, generic
            river_text = "major rivers in this region"

        # 2. Rule-based intent matching
        response_text = ""
        
        if "risk" in msg or "score" in msg or "safe" in msg or "danger" in msg:
            status = "safe" if risk.riskScore < 4 else "moderate" if risk.riskScore < 7 else "CRITICAL"
            response_text = (
                f"The current flood risk score is **{risk.riskScore}/10** ({status}).\n"
                f"Embankment Status: {risk.embankmentStatus}."
            )
            
        elif "river" in msg or "water" in msg or "stream" in msg:
            if payload.aoiPolygons:
                if rivers_found:
                    response_text = f"I detected the following rivers in your selected area: **{', '.join(rivers_found)}**."
                else:
                    response_text = "I did not detect any major rivers within the polygon you drew."
            else:
                response_text = f"This region ({payload.region}) contains several major river networks. Draw a polygon to see specifically which ones are affecting an area."

        elif "population" in msg or "people" in msg or "affected" in msg:
            if risk.population > 0:
                response_text = f"We estimate approximately **{risk.population:,} people** are at risk in this area under the {payload.scenario} scenario."
            else:
                response_text = "There is negligible population at risk in this specific area under the current scenario."

        elif "area" in msg or "flooded" in msg or "extent" in msg:
             response_text = f"The estimated flooded area is **{risk.area} km²**."

        elif "scenario" in msg or "depth" in msg:
            depth = "0m (Normal)" if payload.scenario == "0m" else "1-2m" if payload.scenario == "1m" else ">3m"
            response_text = f"You are currently viewing the **{payload.scenario}** scenario. This simulates flood depths of approximately {depth} above normal levels."

        elif "hello" in msg or "hi" in msg or "help" in msg:
            response_text = "Hello! I am the Jal-Setu AI Assistant. You can ask me about:\n- Flood Risk Scores\n- Affected Population\n- Intersecting Rivers\n- Flooded Area Estimates"

        else:
            # Fallback with data summary
            response_text = (
                "I'm not sure specifically, but here is the data for this area:\n"
                f"- Risk Score: {risk.riskScore}/10\n"
                f"- Pop. at Risk: {risk.population:,}\n"
                f"- Rivers: {river_text}"
            )

        return ChatResponse(
            response=response_text,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(error_msg)
        with open("error_log.txt", "w") as f:
            f.write(error_msg)
        raise HTTPException(status_code=500, detail=str(e))
