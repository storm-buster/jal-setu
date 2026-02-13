import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

class Settings(BaseSettings):
    # API Configuration
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8000"))
    api_debug: bool = os.getenv("API_DEBUG", "true").lower() == "true"
    
    # OpenAI Configuration
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
    
    # ML Model Configuration
    model_path: str = os.getenv("MODEL_PATH", "models/flood_risk_model.pkl")
    model_version: str = os.getenv("MODEL_VERSION", "1.0.0")
    retrain_interval_days: int = int(os.getenv("RETRAIN_INTERVAL_DAYS", "30"))
    
    # Flood Risk Thresholds
    low_risk_threshold: float = float(os.getenv("LOW_RISK_THRESHOLD", "0.33"))
    medium_risk_threshold: float = float(os.getenv("MEDIUM_RISK_THRESHOLD", "0.66"))
    
    # Data Configuration
    data_dir: str = os.getenv("DATA_DIR", "data")
    upload_dir: str = os.getenv("UPLOAD_DIR", "uploads")
    max_upload_size_mb: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
    
    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_file: str = os.getenv("LOG_FILE", "logs/floodshield.log")
    
    class Config:
        env_file = ".env"

settings = Settings()