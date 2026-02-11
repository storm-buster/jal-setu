from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


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


class AnalyzeRegionRequest(BaseModel):
    region: Region
    scenario: Scenario
    aoiPolygons: Optional[list[PolygonAOI]] = None


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


app = FastAPI(title="FloodShield Mock API", version="0.1.0")

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

    aoi_area_km2 = _aoi_bbox_area_km2(aoi)
    if aoi_area_km2 <= 0:
        return base

    # Rough reference region areas for scaling.
    region_area_km2: dict[Region, float] = {
        "Bihar": 1000.0,
        "Uttarakhand": 500.0,
        "Jharkhand": 800.0,
        "Uttar Pradesh": 1800.0,
    }

    scale = min(1.0, max(0.03, aoi_area_km2 / region_area_km2[region]))

    area = int(round(base.area * scale))
    population = int(round(base.population * scale))

    # Nudge risk score slightly by AOI scale; clamp to [0,10].
    score = max(0.0, min(10.0, base.riskScore + (scale - 0.25) * 0.8))

    return RiskSummaryResponse(
        area=area,
        population=population,
        riskScore=round(score, 2),
        embankmentStatus=risk_classification(score),
    )


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/auth/login", response_model=AuthLoginResponse)
def auth_login(payload: AuthLoginRequest):
    # Mock "JWT" token. This is intentionally not a real signed JWT.
    # The frontend treats its presence as an "authenticated" session.
    user_id = payload.username.strip().lower()
    token = f"mock-jwt.{user_id}.{int(datetime.now(timezone.utc).timestamp())}"
    return AuthLoginResponse(token=token, userId=user_id)


@app.get("/api/risk-summary", response_model=RiskSummaryResponse)
def risk_summary(region: Region, scenario: Scenario):
    return FLOOD_DATA[region][scenario]


@app.post("/api/risk-summary", response_model=RiskSummaryResponse)
def risk_summary_post(payload: AnalyzeRegionRequest):
    base = FLOOD_DATA[payload.region][payload.scenario]
    return apply_aoi_scale(payload.region, payload.scenario, base, payload.aoiPolygons)


@app.post("/api/analyze-region", response_model=AnalyzeRegionResponse)
def analyze_region(payload: AnalyzeRegionRequest):
    base_risk = FLOOD_DATA[payload.region][payload.scenario]
    risk = apply_aoi_scale(payload.region, payload.scenario, base_risk, payload.aoiPolygons)

    # Mocked but deterministic for now.
    feature_importance = [
        {"name": "Elevation", "importance": 0.85, "fill": "#1f4e79"},
        {"name": "Rainfall", "importance": 0.72, "fill": "#2e75b6"},
        {"name": "Soil Type", "importance": 0.54, "fill": "#6fa8dc"},
        {"name": "Land Use", "importance": 0.45, "fill": "#9fc5e8"},
        {"name": "Slopes", "importance": 0.30, "fill": "#cfe2f3"},
    ]

    # Impact comparison: 1m vs 2m for the selected AOI (if present), plus 1m vs 2m at the state level.
    def impact_item(r: Region, s: Scenario, aoi: Optional[list[PolygonAOI]]):
        base = FLOOD_DATA[r][s]
        scaled = apply_aoi_scale(r, s, base, aoi)
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

    base = FLOOD_DATA[payload.region][payload.scenario]
    risk = apply_aoi_scale(payload.region, payload.scenario, base, payload.aoiPolygons)
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
        report_text = (
            f"**SITREP [{date_only}]**: Flood projection for {payload.region} under {payload.scenario} scenario.\n\n"
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
