# Implementation Plan

- [x] 1. Update ML model loading to use root directory



  - Modify `backend/wtf2_ml.py` to change the default model path from `wtf2/models/flood_risk_model.pkl` to `flood_risk_model.pkl` in the repository root
  - Update the `_repo_root()` function to correctly resolve the repository root path
  - Update the `Wtf2Model.__init__` method to use the new model path
  - _Requirements: 1.1, 1.2_

- [x] 2. Create river geometry service module

  - [x] 2.1 Create `backend/river_geometry.py` with data structures


    - Define `RiverSegment` dataclass with name and coordinates
    - Define `FloodGeometry` dataclass for GeoJSON-compatible output
    - Create `RIVER_NETWORKS` dictionary with river coordinates for all four regions (Bihar, Uttarakhand, Jharkhand, Uttar Pradesh)
    - _Requirements: 2.1, 3.1, 5.2_

  - [x] 2.2 Implement buffer calculation and geometry generation


    - Write `calculate_buffer_distance()` function that computes buffer based on scenario, river width, and terrain slope
    - Write `generate_flood_buffer()` function that creates polygon geometry around river coordinates with specified buffer
    - Write `get_river_network()` function to retrieve rivers for a given region
    - Write `get_flood_geometry()` main function that generates complete GeoJSON FeatureCollection for region/scenario
    - _Requirements: 2.2, 2.3, 2.4, 3.2, 3.5_

  - [x] 2.3 Add caching for geometry generation


    - Implement `@lru_cache` decorator on geometry generation function
    - Set cache size to 32 entries (covers all region/scenario combinations)
    - _Requirements: 5.4_

- [x] 3. Add river geometry API endpoint

  - [x] 3.1 Define request/response models in `backend/main.py`


    - Create `RiverGeometryRequest` Pydantic model (if needed for POST, otherwise use query params)
    - Create `RiverGeometryResponse` Pydantic model with region, scenario, geometry, and metadata fields
    - _Requirements: 5.1, 5.2_

  - [x] 3.2 Implement GET `/api/river-geometry` endpoint


    - Create route handler that accepts region and scenario query parameters
    - Call `river_geometry.get_flood_geometry()` to generate geometry
    - Build metadata dictionary with buffer distance, river count, and timestamp
    - Return `RiverGeometryResponse` with GeoJSON FeatureCollection
    - Add error handling for invalid regions or geometry generation failures
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 4. Update frontend API client

  - [x] 4.1 Add TypeScript types for river geometry


    - Define `RiverGeometryResponse` interface in `src/api/types.ts` or inline in `floodApi.ts`
    - Include GeoJSON types (FeatureCollection, Feature, Polygon)
    - _Requirements: 5.2, 5.3_

  - [x] 4.2 Implement `getRiverGeometry()` function


    - Add function to `src/api/floodApi.ts` that calls `/api/river-geometry` endpoint
    - Use `apiFetch` with query parameters for region and scenario
    - Return typed `RiverGeometryResponse` promise
    - _Requirements: 5.1, 5.2_

- [x] 5. Transform map visualization to use river geometries

  - [x] 5.1 Add GeoJSON to ArcGIS Polygon conversion utility


    - Write `convertGeoJSONToPolygons()` function in `MapView.tsx` that converts GeoJSON FeatureCollection to ArcGIS Polygon array
    - Handle both Polygon and MultiPolygon geometry types
    - Extract coordinates and create ArcGIS Polygon instances with proper spatial reference
    - _Requirements: 2.2, 5.2_

  - [x] 5.2 Create async river geometry loader

    - Write `loadRiverGeometry()` async function that fetches river geometry for region/scenario
    - Call `getRiverGeometry()` API function
    - Convert response to ArcGIS Polygons using conversion utility
    - Return empty array on error or for 0m scenario
    - Add error logging
    - _Requirements: 2.1, 2.2, 5.5_

  - [x] 5.3 Update layer creation to use river geometries


    - Modify `createScenarioLayer()` to be async and accept region/scenario parameters
    - Replace `getRegionRings()` call with `loadRiverGeometry()` call
    - Create multiple graphics for each polygon returned (one per river segment)
    - Update all layer creation calls (Depth_0m, Depth_1m, Depth_2m, Risk_*, Velocity_*) to use new async pattern
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [x] 5.4 Implement dynamic layer reloading on region change


    - Update the region change `useEffect` to reload all scenario layers with new river geometries
    - Create `reloadLayers()` async function that iterates through all layers except User_Polygons
    - For each layer, clear existing graphics and load new river geometries for the current region
    - Preserve layer symbols and visibility state during reload
    - _Requirements: 2.1, 3.1, 3.5_

  - [x] 5.5 Update hover info to show river-based depth


    - Modify the pointer-move handler to check if the cursor is within a river flood zone
    - Use `view.hitTest()` to detect if cursor is over a flood layer graphic
    - Display accurate depth based on the active scenario when over a flood zone
    - Show 0m depth when outside flood zones
    - _Requirements: 3.3_

  - [x] 5.6 Remove obsolete mock region polygon code


    - Delete `getRegionRings()` function
    - Remove `REGION_CONFIG.bounds` if no longer needed (keep center and zoom)
    - Clean up `isPointWithinRegionApprox()` if replaced by hitTest
    - _Requirements: 2.2_

- [x] 6. Verify ML model integration

  - [x] 6.1 Test model loading from root directory


    - Start the backend and verify flood_risk_model.pkl loads successfully
    - Check `/api/ml/health` endpoint returns `modelLoaded: true`
    - Verify no errors in backend logs related to model loading
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 6.2 Validate risk predictions use ML model

    - Call `/api/risk-summary` with different regions and scenarios
    - Verify risk scores differ from mock FLOOD_DATA values (indicating ML is active)
    - Check that feature importance endpoint returns actual model features
    - _Requirements: 1.3, 1.4, 4.3_

- [x] 7. End-to-end validation


  - [x] 7.1 Test river visualization for all regions

    - Load each region (Bihar, Uttarakhand, Jharkhand, Uttar Pradesh) in the map
    - Verify flood layers appear along river locations, not region-wide
    - Check that 0m scenario shows no flooding
    - Confirm 1m and 2m scenarios show progressively larger flood zones
    - _Requirements: 2.1, 2.2, 2.4, 3.2_

  - [x] 7.2 Test scenario slider interaction

    - Slide between 0m, 1m, and 2m scenarios
    - Verify flood extent updates correctly for each scenario
    - Check that all layer types (Depth, Risk, Velocity) use the same river geometries
    - _Requirements: 2.2, 2.3, 2.5_

  - [x] 7.3 Verify layer switching with river data

    - Switch between Depth, Risk, and Velocity layers
    - Confirm each layer displays river-based geometries with appropriate colors and extrusion
    - Check that layer visibility toggles work correctly
    - _Requirements: 2.5_

  - [ ]* 7.4 Performance validation
    - Measure API response time for `/api/river-geometry` (should be <200ms)
    - Check map rendering performance when loading river geometries
    - Verify caching reduces subsequent requests for same region/scenario
    - Monitor browser memory usage with multiple layers active
    - _Requirements: 5.4_
