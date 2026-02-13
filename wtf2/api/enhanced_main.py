from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import logging
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from api.schemas import (
    FloodRiskPredictionRequest,
    FloodRiskPredictionResponse,
    ChatbotRequest,
    ChatbotResponse,
    ModelInfo,
    HealthResponse
)
from ml.flood_risk_model import FloodRiskModel
from genai.enhanced_chatbot import FloodShieldEnhancedChatbot

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global model and chatbot instances
flood_model: FloodRiskModel = None
enhanced_chatbot: FloodShieldEnhancedChatbot = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    global flood_model, enhanced_chatbot
    
    logger.info("Starting Jal-Setu AI Enhanced API...")
    
    # Initialize ML Model
    try:
        flood_model = FloodRiskModel()
        if os.path.exists(settings.model_path):
            flood_model.load_model(settings.model_path)
            logger.info(f"✓ ML Model loaded successfully from {settings.model_path}")
        else:
            logger.warning(f"✗ Model file not found at {settings.model_path}")
    except Exception as e:
        logger.error(f"✗ Error loading ML model: {str(e)}")
    
    # Initialize Enhanced Chatbot
    try:
        enhanced_chatbot = FloodShieldEnhancedChatbot(ml_model=flood_model)
        logger.info("✓ Enhanced GenAI Chatbot initialized with ML integration")
    except Exception as e:
        logger.error(f"✗ Error initializing chatbot: {str(e)}")
    
    yield
    
    logger.info("Shutting down Jal-Setu AI Enhanced API...")

# Initialize FastAPI app
app = FastAPI(
    title="Jal-Setu AI Enhanced API",
    description="Enhanced flood risk decision support with predictive analysis and land impact assessment",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Check API health status."""
    return HealthResponse(
        status="healthy",
        model_loaded=flood_model is not None and flood_model.is_trained,
        api_version="2.0.0"
    )

# Model info
@app.get("/model/info", response_model=ModelInfo, tags=["Model"])
async def get_model_info():
    """Get ML model information."""
    if not flood_model:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return ModelInfo(
        model_type=flood_model.model_type,
        version=settings.model_version,
        feature_count=len(flood_model.feature_names),
        is_trained=flood_model.is_trained
    )

# Prediction with Land Impact
@app.post("/predict/analyze", tags=["Prediction"])
async def predict_with_analysis(request: FloodRiskPredictionRequest):
    """
    Predict flood risk with detailed land impact analysis.
    
    This endpoint provides:
    - ML-based risk classification
    - Land impact analysis (which areas will be affected)
    - Regional context (Bihar/Jharkhand characteristics)
    - Risk factors and safe zones
    - Evacuation priorities
    """
    if not flood_model or not flood_model.is_trained:
        raise HTTPException(status_code=503, detail="ML model not available")
    
    if not enhanced_chatbot:
        raise HTTPException(status_code=503, detail="Enhanced chatbot not available")
    
    try:
        # Convert request to dict
        input_data = request.dict()
        
        # Get location info
        location_name = input_data.get('location_name', 'Unknown')
        region = input_data.get('state', None) or input_data.get('district', None)
        
        # Use enhanced chatbot for comprehensive prediction
        prediction = enhanced_chatbot.predict_flood_risk(
            elevation=input_data['elevation'],
            slope=input_data['slope'],
            flow_accumulation=input_data['flow_accumulation'],
            distance_to_river=input_data['distance_to_river'],
            flood_depth=input_data['flood_depth'],
            lulc_agriculture=input_data['lulc_agriculture'],
            lulc_urban=input_data['lulc_urban'],
            population_density=input_data['population_density'],
            velocity_index=input_data['velocity_index'],
            location_name=location_name,
            region=region
        )
        
        logger.info(f"Comprehensive analysis completed for {location_name}: {prediction['ml_prediction']['risk_label']} risk")
        
        return prediction
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# Standard prediction endpoint (backward compatible)
@app.post("/predict", response_model=FloodRiskPredictionResponse, tags=["Prediction"])
async def predict_flood_risk(request: FloodRiskPredictionRequest):
    """Standard flood risk prediction (backward compatible)."""
    if not flood_model or not flood_model.is_trained:
        raise HTTPException(status_code=503, detail="ML model not available")
    
    try:
        input_data = request.dict()
        prediction = flood_model.predict(input_data)
        
        response = FloodRiskPredictionResponse(
            risk_class=prediction['risk_class'],
            risk_label=prediction['risk_label'],
            probabilities=prediction['probabilities'],
            confidence=prediction['confidence'],
            input_data=request
        )
        
        logger.info(f"Prediction made for {request.location_name or 'unknown location'}: {prediction['risk_label']} risk")
        return response
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# Enhanced chatbot with prediction context
@app.post("/chat/enhanced", response_model=ChatbotResponse, tags=["Chatbot"])
async def chat_with_enhanced_assistant(request: ChatbotRequest):
    """
    Interact with the enhanced AI assistant.
    
    This endpoint uses the enhanced chatbot with:
    - ML model integration for predictions
    - Land impact analysis
    - Regional context awareness
    - Detailed risk factor explanation
    """
    if not enhanced_chatbot:
        raise HTTPException(status_code=503, detail="Enhanced chatbot not available")
    
    try:
        response = enhanced_chatbot.chat_with_prediction(
            message=request.message,
            prediction_data=request.previous_risk_data,
            conversation_history=None
        )
        
        return ChatbotResponse(
            response=response['response'],
            type=response['type'],
            confidence=response['confidence'],
            requires_action=response['requires_action']
        )
        
    except Exception as e:
        logger.error(f"Enhanced chatbot error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enhanced chatbot failed: {str(e)}")

# Standard chatbot (backward compatible)
@app.post("/chat", response_model=ChatbotResponse, tags=["Chatbot"])
async def chat_with_assistant(request: ChatbotRequest):
    """Standard chatbot endpoint (backward compatible)."""
    if not enhanced_chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not available")
    
    try:
        response = enhanced_chatbot.chat_with_prediction(
            message=request.message,
            prediction_data=request.previous_risk_data,
            conversation_history=None
        )
        
        return ChatbotResponse(
            response=response['response'],
            type=response['type'],
            confidence=response['confidence'],
            requires_action=response['requires_action']
        )
        
    except Exception as e:
        logger.error(f"Chatbot error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chatbot failed: {str(e)}")

# Run the application
if __name__ == "__main__":
    uvicorn.run(
        "api.enhanced_main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_debug,
        log_level=settings.log_level.lower()
    )