from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

# Flood Risk Prediction Request
class FloodRiskPredictionRequest(BaseModel):
    elevation: float = Field(..., gt=0, description="Terrain elevation in meters")
    slope: float = Field(..., ge=0, description="Terrain slope in degrees")
    flow_accumulation: float = Field(..., gt=0, description="Water flow concentration value")
    distance_to_river: float = Field(..., ge=0, description="Distance from river in meters")
    flood_depth: float = Field(..., ge=0, description="Flood water depth in meters")
    lulc_agriculture: float = Field(..., ge=0, le=1, description="Agricultural land percentage (0-1)")
    lulc_urban: float = Field(..., ge=0, le=1, description="Urban land percentage (0-1)")
    population_density: float = Field(..., gt=0, description="Population density per sq km")
    velocity_index: float = Field(..., ge=0, le=1, description="Flood velocity index (0-1)")
    
    location_name: Optional[str] = Field(None, description="Name of the location")
    district: Optional[str] = Field(None, description="District name")
    state: Optional[str] = Field(None, description="State name")

class FloodRiskPredictionResponse(BaseModel):
    risk_class: int = Field(..., description="Risk class (0=Low, 1=Medium, 2=High)")
    risk_label: str = Field(..., description="Risk label (Low, Medium, High)")
    probabilities: Dict[str, float] = Field(..., description="Probability for each risk class")
    confidence: float = Field(..., ge=0, le=1, description="Model confidence score")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Prediction timestamp")
    input_data: FloodRiskPredictionRequest = Field(..., description="Input parameters used")

# Batch Prediction Request
class BatchPredictionRequest(BaseModel):
    locations: List[FloodRiskPredictionRequest] = Field(..., description="List of locations to predict")

class BatchPredictionResponse(BaseModel):
    predictions: List[FloodRiskPredictionResponse] = Field(..., description="List of predictions")
    total_locations: int = Field(..., description="Total number of predictions")
    summary: Dict[str, int] = Field(..., description="Summary of risk distribution")

# Chatbot Request
class ChatbotRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User message")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context data")
    previous_risk_data: Optional[Dict[str, Any]] = Field(default=None, description="Previous flood risk data")

class ChatbotResponse(BaseModel):
    response: str = Field(..., description="Chatbot response")
    type: str = Field(..., description="Response type (information, recommendation, alert, explanation)")
    confidence: float = Field(..., ge=0, le=1, description="Response confidence")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    requires_action: bool = Field(default=False, description="Whether user action is required")

# Flood Scenario
class FloodScenario(BaseModel):
    scenario_name: str = Field(..., description="Name of the scenario")
    water_level_increase: float = Field(..., description="Water level increase in meters")
    description: str = Field(..., description="Scenario description")

# Model Info
class ModelInfo(BaseModel):
    model_type: str
    version: str
    last_trained: Optional[str] = None
    accuracy: Optional[float] = None
    feature_count: int
    is_trained: bool

# Health Check
class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    api_version: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# API Error
class ErrorResponse(BaseModel):
    error: str
    message: str
    detail: Optional[str] = None