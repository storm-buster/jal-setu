# Requirements Document

## Introduction

This feature integrates the existing flood_risk_model.pkl machine learning model into the backend API and enhances the map visualization to accurately display flood risk, depth, and velocity data around river regions rather than random areas. The system shall use the ML model to generate realistic predictions based on geographic features and shall render flood layers that align with actual river locations within each region.

## Glossary

- **FloodShield System**: The full-stack application consisting of a React frontend and FastAPI backend that provides flood risk analysis and visualization
- **ML Model**: The pre-trained flood_risk_model.pkl file containing a Random Forest classifier for flood risk prediction
- **River Layer**: Geographic data representing river locations and their surrounding flood-prone areas
- **Flood Visualization Layer**: Map graphics layers (Depth, Risk, Velocity) that display flood impact zones
- **Scenario Slider**: UI control that allows users to select flood depth scenarios (0m, 1m, 2m)
- **Region**: One of four geographic areas (Bihar, Uttarakhand, Jharkhand, Uttar Pradesh) available for analysis
- **ArcGIS SceneView**: The 3D map component used to render geographic data and flood layers

## Requirements

### Requirement 1

**User Story:** As a flood analyst, I want the system to use the actual ML model for risk predictions, so that I receive accurate and data-driven flood risk assessments.

#### Acceptance Criteria

1. WHEN the backend starts, THE FloodShield System SHALL load the flood_risk_model.pkl file from the repository root directory
2. WHEN the ML model fails to load, THE FloodShield System SHALL log the error and continue operating with fallback mock data
3. WHEN a risk summary request is received, THE FloodShield System SHALL invoke the ML model with region-specific features to generate risk predictions
4. WHEN the ML model returns a prediction, THE FloodShield System SHALL convert the risk class and confidence into a 0-10 risk score for display
5. WHEN the /api/ml/health endpoint is called, THE FloodShield System SHALL return the model loading status and any error messages

### Requirement 2

**User Story:** As a disaster management official, I want flood visualizations to appear around actual river locations, so that I can identify real flood-prone areas for evacuation planning.

#### Acceptance Criteria

1. WHEN a region is selected, THE FloodShield System SHALL identify river coordinates within that region's geographic bounds
2. WHEN the scenario slider is adjusted, THE FloodShield System SHALL render flood layers along river corridors rather than covering the entire region
3. WHERE river data is available, THE FloodShield System SHALL create buffer zones around rivers based on the selected flood depth scenario
4. WHEN displaying the Depth layer, THE FloodShield System SHALL show graduated flood extent with 0m showing no flooding, 1m showing moderate river buffer, and 2m showing extended river buffer
5. WHEN displaying Risk or Velocity layers, THE FloodShield System SHALL apply the same river-based geometry as the Depth layer

### Requirement 3

**User Story:** As a map user, I want to see realistic flood patterns that follow river topography, so that the visualization matches real-world flood behavior.

#### Acceptance Criteria

1. WHEN the map loads a region, THE FloodShield System SHALL generate or load river network geometry for that region
2. WHEN flood depth increases from 0m to 2m, THE FloodShield System SHALL expand the flood visualization progressively outward from river centerlines
3. WHEN the user hovers over a flooded area, THE FloodShield System SHALL display accurate depth values based on distance from the nearest river
4. WHERE elevation data is available, THE FloodShield System SHALL adjust flood extent based on terrain elevation relative to river level
5. WHEN multiple rivers exist in a region, THE FloodShield System SHALL render flood zones for all major rivers within the visible area

### Requirement 4

**User Story:** As a system administrator, I want the ML model integration to be maintainable and testable, so that future model updates can be deployed without breaking the system.

#### Acceptance Criteria

1. THE FloodShield System SHALL provide a dedicated endpoint at /api/ml/predict for direct ML model inference with custom feature inputs
2. WHEN the ML model is updated, THE FloodShield System SHALL support loading the new model file without code changes
3. WHEN feature importance data is requested, THE FloodShield System SHALL extract and return the top 5 features from the loaded ML model
4. THE FloodShield System SHALL validate all ML input features against expected ranges before invoking the model
5. WHEN invalid features are provided, THE FloodShield System SHALL return a 400 error with descriptive validation messages

### Requirement 5

**User Story:** As a frontend developer, I want the map component to receive river geometry data from the backend, so that I can render accurate flood visualizations without hardcoding coordinates.

#### Acceptance Criteria

1. THE FloodShield System SHALL provide a new endpoint at /api/river-geometry that accepts region and scenario parameters
2. WHEN the /api/river-geometry endpoint is called, THE FloodShield System SHALL return GeoJSON or coordinate arrays representing river-based flood zones
3. WHEN the frontend requests river geometry, THE FloodShield System SHALL include metadata about buffer distances and flood extent
4. THE FloodShield System SHALL cache river geometry calculations to minimize response time for repeated requests
5. WHEN river data is unavailable for a region, THE FloodShield System SHALL return an empty geometry with appropriate status indicators
