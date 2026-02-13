from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import logging
from typing import List
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from api.schemas import (
    FloodRiskPredictionRequest,
    FloodRiskPredictionResponse,
    BatchPredictionRequest,
    BatchPredictionResponse,
    ChatbotRequest,
    ChatbotResponse,
    ModelInfo,
    HealthResponse,
    ErrorResponse
)
from ml.flood_risk_model import FloodRiskModel
from genai.chatbot import FloodShieldChatbot

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global model and chatbot instances
flood_model: FloodRiskModel = None
chatbot: FloodShieldChatbot = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - load models on startup."""
    global flood_model, chatbot
    
    logger.info("Starting Jal-Setu AI API...")
    
    # Initialize ML Model
    try:
        flood_model = FloodRiskModel()
        if os.path.exists(settings.model_path):
            flood_model.load_model(settings.model_path)
            logger.info(f"ML Model loaded successfully from {settings.model_path}")
        else:
            logger.warning(f"Model file not found at {settings.model_path}. Model not loaded.")
    except Exception as e:
        logger.error(f"Error loading ML model: {str(e)}")
    
    # Initialize Chatbot
    try:
        chatbot = FloodShieldChatbot()
        logger.info("GenAI Chatbot initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing chatbot: {str(e)}")
    
    yield
    
    logger.info("Shutting down Jal-Setu AI API...")

# Initialize FastAPI app
app = FastAPI(
    title="Jal-Setu AI API",
    description="Physics-first flood risk decision support system with ML and GenAI",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Check API health status."""
    return HealthResponse(
        status="healthy",
        model_loaded=flood_model is not None and flood_model.is_trained,
        api_version="1.0.0"
    )

# Model information endpoint
@app.get("/model/info", response_model=ModelInfo, tags=["Model"])
async def get_model_info():
    """Get information about the loaded ML model."""
    if not flood_model:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return ModelInfo(
        model_type=flood_model.model_type,
        version=settings.model_version,
        feature_count=len(flood_model.feature_names),
        is_trained=flood_model.is_trained
    )

# Single prediction endpoint
@app.post("/predict", response_model=FloodRiskPredictionResponse, tags=["Prediction"])
async def predict_flood_risk(request: FloodRiskPredictionRequest):
    """
    Predict flood risk for a single location.
    
    This endpoint uses the ML model to classify flood risk based on terrain,
    hydrology, and exposure features.
    """
    if not flood_model or not flood_model.is_trained:
        raise HTTPException(status_code=503, detail="ML model not available")
    
    try:
        # Convert request to dict
        input_data = request.dict()
        
        # Make prediction
        prediction = flood_model.predict(input_data)
        
        # Build response
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

# Batch prediction endpoint
@app.post("/predict/batch", response_model=BatchPredictionResponse, tags=["Prediction"])
async def predict_batch(request: BatchPredictionRequest):
    """
    Predict flood risk for multiple locations.
    
    This endpoint processes multiple locations in a single request for efficiency.
    """
    if not flood_model or not flood_model.is_trained:
        raise HTTPException(status_code=503, detail="ML model not available")
    
    try:
        # Convert to DataFrame
        import pandas as pd
        data_list = [loc.dict() for loc in request.locations]
        df = pd.DataFrame(data_list)
        
        # Make predictions
        predictions = flood_model.predict_batch(df)
        
        # Build response
        response_data = []
        summary = {'Low': 0, 'Medium': 0, 'High': 0}
        
        for i, pred in enumerate(predictions):
            response_data.append(FloodRiskPredictionResponse(
                risk_class=pred['risk_class'],
                risk_label=pred['risk_label'],
                probabilities=pred['probabilities'],
                confidence=pred['confidence'],
                input_data=request.locations[i]
            ))
            summary[pred['risk_label']] += 1
        
        response = BatchPredictionResponse(
            predictions=response_data,
            total_locations=len(response_data),
            summary=summary
        )
        
        logger.info(f"Batch prediction completed for {len(response_data)} locations")
        return response
        
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")

# Chatbot endpoint
@app.post("/chat", response_model=ChatbotResponse, tags=["Chatbot"])
async def chat_with_assistant(request: ChatbotRequest):
    """
    Interact with the Jal-Setu AI chatbot.
    
    This endpoint provides intelligent flood risk interpretation and decision support.
    """
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not available")
    
    try:
        # Process chat request
        response = chatbot.chat(
            message=request.message,
            risk_data=request.previous_risk_data,
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

# Risk summary endpoint
@app.post("/chat/summary", tags=["Chatbot"])
async def generate_risk_summary(risk_data: dict):
    """
    Generate a comprehensive risk summary for administrators.
    """
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not available")
    
    try:
        summary = chatbot.generate_risk_summary(risk_data)
        return {"summary": summary}
    except Exception as e:
        logger.error(f"Summary generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")

# Action plan endpoint
@app.post("/chat/action-plan", tags=["Chatbot"])
async def generate_action_plan(risk_data: dict):
    """
    Generate a detailed action plan based on risk level.
    """
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not available")
    
    try:
        action_plan = chatbot.generate_action_plan(risk_data)
        return action_plan
    except Exception as e:
        logger.error(f"Action plan generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Action plan generation failed: {str(e)}")

# Data upload endpoint
@app.post("/upload/data", tags=["Data"])
async def upload_data(file: UploadFile = File(...)):
    """
    Upload flood data files (CSV, GeoTIFF, etc.) for processing.
    """
    try:
        # Create upload directory if it doesn't exist
        os.makedirs(settings.upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(settings.upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"File uploaded successfully: {file.filename}")
        
        return {
            "message": "File uploaded successfully",
            "filename": file.filename,
            "file_path": file_path,
            "size": len(content)
        }
        
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

# Run the application
if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_debug,
        log_level=settings.log_level.lower()
    )