# Design Document

## Overview

This design integrates the flood_risk_model.pkl ML model into the backend and transforms the map visualization from region-wide flood coverage to river-centric flood zones. The solution involves three main components:

1. **Backend ML Integration**: Update the model loading logic to use the root-level flood_risk_model.pkl file
2. **River Geometry Service**: Create a new API endpoint that generates river-based flood geometries
3. **Frontend Map Enhancement**: Modify the ArcGIS map component to consume and render river-based flood layers

The design maintains backward compatibility with existing mock data while enabling realistic, river-aligned flood visualizations.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  MapView.tsx   │  │ floodApi.ts  │  │  useStore.ts    │ │
│  │  (ArcGIS 3D)   │◄─┤ (API Client) │◄─┤  (State Mgmt)   │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/JSON
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                       │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   main.py      │  │ wtf2_ml.py   │  │ river_geometry  │ │
│  │ (API Routes)   │─►│ (ML Wrapper) │  │   .py (NEW)     │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
│           │                   │                   │          │
│           └───────────────────┴───────────────────┘          │
│                              │                               │
│                              ▼                               │
│                  ┌──────────────────────┐                    │
│                  │ flood_risk_model.pkl │                    │
│                  │   (Root Directory)   │                    │
│                  └──────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Model Loading**: Backend loads flood_risk_model.pkl from repository root on startup
2. **River Geometry Request**: Frontend requests river geometry for selected region/scenario
3. **Geometry Generation**: Backend generates river-based flood polygons with appropriate buffers
4. **Map Rendering**: Frontend receives GeoJSON and renders flood layers along rivers
5. **Risk Calculation**: ML model processes region features and returns risk predictions

## Components and Interfaces

### Backend Components

#### 1. ML Model Loader (wtf2_ml.py - Modified)

**Purpose**: Update model path to load from repository root instead of wtf2/models/

**Changes**:
```python
def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]

# Update Wtf2Model.__init__
def __init__(self, model_path: Optional[Path] = None):
    self._model_path = model_path or (_repo_root() / "flood_risk_model.pkl")
```

**Interface**:
- Input: Optional custom model path
- Output: Loaded model instance or error state
- Error Handling: Graceful fallback to mock data if model unavailable

#### 2. River Geometry Service (backend/river_geometry.py - New)

**Purpose**: Generate river-based flood zone geometries for each region

**Core Functions**:

```python
@dataclass
class RiverSegment:
    """Represents a river segment with coordinates"""
    name: str
    coordinates: list[tuple[float, float]]  # [(lon, lat), ...]
    
@dataclass
class FloodGeometry:
    """GeoJSON-compatible flood zone geometry"""
    type: str  # "Polygon" or "MultiPolygon"
    coordinates: list[list[list[float]]]
    properties: dict[str, Any]

def get_river_network(region: Region) -> list[RiverSegment]:
    """Returns major rivers for a region"""
    
def generate_flood_buffer(
    river: RiverSegment,
    buffer_km: float,
    elevation_factor: float = 1.0
) -> FloodGeometry:
    """Creates flood zone polygon around river with specified buffer"""
    
def get_flood_geometry(
    region: Region,
    scenario: Scenario
) -> dict[str, Any]:
    """Main entry point: returns complete flood geometry for region/scenario"""
```

**River Data Structure**:
```python
RIVER_NETWORKS: dict[Region, list[RiverSegment]] = {
    "Bihar": [
        RiverSegment(
            name="Ganges",
            coordinates=[(84.5, 25.5), (85.0, 25.3), (85.5, 25.1), ...]
        ),
        RiverSegment(
            name="Kosi",
            coordinates=[(86.5, 26.0), (86.3, 25.5), ...]
        ),
    ],
    # ... other regions
}
```

**Buffer Calculation**:
- 0m scenario: No buffer (empty geometry)
- 1m scenario: 2-5 km buffer depending on river width and terrain
- 2m scenario: 5-12 km buffer with expanded coverage

#### 3. API Endpoint (backend/main.py - New Route)

**Endpoint**: `GET /api/river-geometry`

**Request Parameters**:
```python
class RiverGeometryRequest(BaseModel):
    region: Region
    scenario: Scenario
```

**Response**:
```python
class RiverGeometryResponse(BaseModel):
    region: Region
    scenario: Scenario
    geometry: dict[str, Any]  # GeoJSON FeatureCollection
    metadata: dict[str, Any]  # Buffer distances, river count, etc.
```

**Implementation**:
```python
@app.get("/api/river-geometry", response_model=RiverGeometryResponse)
def get_river_geometry(region: Region, scenario: Scenario):
    geometry = river_geometry.get_flood_geometry(region, scenario)
    metadata = {
        "buffer_km": river_geometry.get_buffer_distance(scenario),
        "river_count": len(river_geometry.get_river_network(region)),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return RiverGeometryResponse(
        region=region,
        scenario=scenario,
        geometry=geometry,
        metadata=metadata
    )
```

### Frontend Components

#### 1. API Client Extension (src/api/floodApi.ts)

**New Function**:
```typescript
export interface RiverGeometryResponse {
  region: Region;
  scenario: Scenario;
  geometry: GeoJSON.FeatureCollection;
  metadata: {
    buffer_km: number;
    river_count: number;
    generated_at: string;
  };
}

export function getRiverGeometry(
  region: Region,
  scenario: Scenario
): Promise<RiverGeometryResponse> {
  const params = new URLSearchParams({ region, scenario });
  return apiFetch<RiverGeometryResponse>(
    `/api/river-geometry?${params.toString()}`
  );
}
```

#### 2. Map Component Updates (src/components/map/MapView.tsx)

**Key Changes**:

1. **Remove Mock Region-Wide Polygons**: Delete `getRegionRings()` and replace with river-based geometries

2. **Add River Geometry Loader**:
```typescript
const loadRiverGeometry = async (
  region: Region,
  scenario: Scenario
): Promise<__esri.Polygon[]> => {
  try {
    const response = await getRiverGeometry(region, scenario);
    return convertGeoJSONToPolygons(response.geometry);
  } catch (error) {
    console.error('Failed to load river geometry:', error);
    return []; // Return empty for 0m or on error
  }
};
```

3. **Update Layer Creation**:
```typescript
const createScenarioLayer = async (
  id: string,
  title: string,
  color: number[],
  extrudeMeters: number,
  region: Region,
  scenario: Scenario
) => {
  const layer = new GraphicsLayer({
    id,
    title,
    visible: false,
    elevationInfo: { mode: 'on-the-ground' },
  });

  const polygons = await loadRiverGeometry(region, scenario);
  
  polygons.forEach(polygon => {
    const graphic = new Graphic({
      geometry: polygon,
      symbol: createExtrudedSymbol(color, extrudeMeters),
    });
    layer.add(graphic);
  });

  return layer;
};
```

4. **Dynamic Layer Updates on Region Change**:
```typescript
useEffect(() => {
  if (!viewRef.current) return;

  // Reload all scenario layers with new river geometry
  const reloadLayers = async () => {
    for (const [layerId, layer] of Object.entries(layersRef.current)) {
      if (layerId === 'User_Polygons') continue;
      
      const [_, scenario] = layerId.split('_') as [string, Scenario];
      layer.removeAll();
      
      const polygons = await loadRiverGeometry(region, scenario);
      polygons.forEach(polygon => {
        const graphic = new Graphic({
          geometry: polygon,
          symbol: layer.graphics.getItemAt(0)?.symbol, // Reuse symbol
        });
        layer.add(graphic);
      });
    }
  };

  reloadLayers();
}, [region]);
```

## Data Models

### River Network Data

**Storage**: Hardcoded in `backend/river_geometry.py` (can be externalized to JSON/database later)

**Structure**:
```python
{
  "Bihar": {
    "rivers": [
      {
        "name": "Ganges",
        "coordinates": [[lon, lat], ...],
        "avg_width_m": 800,
        "flood_prone": true
      },
      {
        "name": "Kosi",
        "coordinates": [[lon, lat], ...],
        "avg_width_m": 400,
        "flood_prone": true
      }
    ]
  }
}
```

### GeoJSON Response Format

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [[lon1, lat1], [lon2, lat2], ...]
        ]
      },
      "properties": {
        "river_name": "Ganges",
        "buffer_km": 5.0,
        "scenario": "1m",
        "risk_level": "high"
      }
    }
  ]
}
```

## Error Handling

### Backend Error Scenarios

1. **Model Loading Failure**:
   - Log warning with error details
   - Set `wtf2_model.load_error` message
   - Continue with mock FLOOD_DATA
   - Return `modelLoaded: false` from `/api/ml/health`

2. **River Geometry Generation Failure**:
   - Return empty FeatureCollection
   - Include error message in metadata
   - Frontend falls back to no visualization (0m equivalent)

3. **Invalid Region/Scenario**:
   - Return 400 Bad Request with validation error
   - Use FastAPI's built-in Pydantic validation

### Frontend Error Scenarios

1. **API Request Failure**:
   - Catch in `loadRiverGeometry()`
   - Log error to console
   - Return empty polygon array
   - Display user-friendly message in map overlay

2. **GeoJSON Conversion Failure**:
   - Validate GeoJSON structure before conversion
   - Skip invalid features
   - Log warnings for debugging

3. **Map Rendering Failure**:
   - Wrap layer creation in try-catch
   - Fall back to previous layer state
   - Show error badge on map

## Testing Strategy

### Backend Testing

1. **Unit Tests** (backend/test_river_geometry.py):
   - Test river network data retrieval for each region
   - Test buffer calculation with various scenarios
   - Test GeoJSON generation and validation
   - Test model loading from root directory

2. **Integration Tests** (backend/test_api.py):
   - Test `/api/river-geometry` endpoint with valid inputs
   - Test error handling for invalid region/scenario
   - Test response format compliance with GeoJSON spec
   - Test ML model integration with river geometry

3. **Manual Testing**:
   - Verify model loads from flood_risk_model.pkl in root
   - Check `/api/ml/health` returns correct status
   - Validate river geometries visually in GeoJSON viewer

### Frontend Testing

1. **Component Tests**:
   - Test `getRiverGeometry()` API client function
   - Test GeoJSON to ArcGIS Polygon conversion
   - Test layer visibility toggling with river geometries

2. **Integration Tests**:
   - Test map loads river geometry on region change
   - Test scenario slider updates flood extent
   - Test layer switching (Depth/Risk/Velocity) with river data

3. **Visual/Manual Testing**:
   - Verify flood zones align with river locations
   - Check buffer distances scale appropriately (0m→1m→2m)
   - Validate all four regions have correct river networks
   - Test hover info shows accurate depth values near rivers

### Performance Testing

1. **Backend**:
   - Measure river geometry generation time (target: <200ms)
   - Test caching effectiveness for repeated requests
   - Profile ML model inference time

2. **Frontend**:
   - Measure map rendering time with river geometries
   - Test layer switching performance
   - Monitor memory usage with multiple layers

## Implementation Notes

### River Coordinate Data Sources

For initial implementation, use simplified river centerlines based on:
- OpenStreetMap river data for major rivers
- Approximate coordinates for main river segments (5-10 points per river)
- Focus on major flood-prone rivers in each region

**Bihar**: Ganges, Kosi, Gandak, Bagmati
**Uttarakhand**: Ganges, Yamuna, Alaknanda, Bhagirathi
**Jharkhand**: Damodar, Subarnarekha, Koel
**Uttar Pradesh**: Ganges, Yamuna, Gomti, Ghaghra

### Buffer Calculation Algorithm

```python
def calculate_buffer_distance(
    scenario: Scenario,
    river_width_m: float,
    terrain_slope: float
) -> float:
    """
    Calculate flood buffer distance based on scenario and terrain
    
    Base buffer:
    - 0m: 0 km
    - 1m: 2-5 km
    - 2m: 5-12 km
    
    Adjustments:
    - Wider rivers get larger buffers
    - Flatter terrain gets larger buffers
    """
    base_buffer = {
        "0m": 0.0,
        "1m": 3.0,  # km
        "2m": 8.0,  # km
    }[scenario]
    
    width_factor = 1.0 + (river_width_m / 1000.0)  # Wider rivers
    slope_factor = 1.0 + (1.0 / max(terrain_slope, 0.1))  # Flatter terrain
    
    return base_buffer * width_factor * slope_factor
```

### Caching Strategy

Implement simple in-memory caching for river geometries:

```python
from functools import lru_cache

@lru_cache(maxsize=32)  # Cache up to 32 region/scenario combinations
def get_flood_geometry_cached(
    region: Region,
    scenario: Scenario
) -> dict[str, Any]:
    return generate_flood_geometry(region, scenario)
```

### Migration Path

1. **Phase 1**: Update ML model path, add river geometry endpoint
2. **Phase 2**: Update frontend to consume river geometries
3. **Phase 3**: Remove old mock region-wide polygon code
4. **Phase 4**: Add elevation-based refinements to flood extent

This design maintains backward compatibility while enabling the transition to realistic river-based flood visualization.
