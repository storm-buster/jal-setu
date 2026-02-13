# 🌊 Jal-Setu AI - Complete Flood Risk Decision Support System

## 📋 Overview

Jal-Setu AI is a physics-first, LiDAR-powered flood decision intelligence system built using ArcGIS hydrology modelling, machine learning risk refinement, and generative AI decision interpretation to deliver district-scale, deployment-ready flood preparedness intelligence.

### 🎯 Project Components

- **ML Model**: Random Forest-based flood risk classification (85% accuracy)
- **GenAI Chatbot**: OpenAI-powered intelligent assistant for decision support
- **FastAPI Backend**: RESTful API with comprehensive endpoints
- **Web Interface**: Interactive dashboard for predictions and chatbot interaction

---

## 🚀 Quick Start

### 1. Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
nano .env
```

### 2. Train the ML Model

```bash
cd ml
python train_model.py
```

This will:
- Generate synthetic training data (1000 samples)
- Train a Random Forest classifier
- Save the model to `models/flood_risk_model.pkl`
- Achieve ~85% accuracy

### 3. Start the Backend Server

```bash
# From project root
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at: `http://localhost:8000`

### 4. Access the Web Interface

Open `index.html` in your web browser or use:
```bash
python -m http.server 8050
```

Then visit: `http://localhost:8050`

---

## 📁 Project Structure

```
floodshield-ai/
├── api/
│   ├── main.py              # FastAPI application
│   └── schemas.py           # Pydantic data models
├── ml/
│   ├── flood_risk_model.py  # ML model implementation
│   └── train_model.py       # Model training script
├── genai/
│   └── chatbot.py           # GenAI chatbot
├── data/
│   └── sample_flood_data.csv # Sample training data
├── models/
│   └── flood_risk_model.pkl # Trained ML model
├── static/
│   └── styles.css           # Frontend styles
├── uploads/                 # File upload directory
├── logs/                    # Application logs
├── index.html               # Web interface
├── config.py                # Configuration management
├── requirements.txt         # Python dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

---

## 🔌 API Endpoints

### System Health

#### `GET /health`
Check API health status

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "api_version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00"
}
```

### Model Information

#### `GET /model/info`
Get information about the loaded ML model

**Response:**
```json
{
  "model_type": "random_forest",
  "version": "1.0.0",
  "feature_count": 12,
  "is_trained": true
}
```

### Prediction Endpoints

#### `POST /predict`
Predict flood risk for a single location

**Request Body:**
```json
{
  "elevation": 125.5,
  "slope": 12.3,
  "flow_accumulation": 2345.67,
  "distance_to_river": 123.45,
  "flood_depth": 2.3,
  "lulc_agriculture": 0.65,
  "lulc_urban": 0.15,
  "population_density": 856,
  "velocity_index": 0.78,
  "location_name": "Patna District",
  "district": "Patna",
  "state": "Bihar"
}
```

**Response:**
```json
{
  "risk_class": 2,
  "risk_label": "High",
  "probabilities": {
    "low": 0.05,
    "medium": 0.10,
    "high": 0.85
  },
  "confidence": 0.85,
  "timestamp": "2024-01-15T10:30:00",
  "input_data": { ... }
}
```

#### `POST /predict/batch`
Predict flood risk for multiple locations

**Request Body:**
```json
{
  "locations": [
    { ...location1... },
    { ...location2... },
    { ...location3... }
  ]
}
```

**Response:**
```json
{
  "predictions": [ ... ],
  "total_locations": 3,
  "summary": {
    "Low": 1,
    "Medium": 1,
    "High": 1
  }
}
```

### Chatbot Endpoints

#### `POST /chat`
Interact with the AI assistant

**Request Body:**
```json
{
  "message": "What does high flood risk mean?",
  "previous_risk_data": { ...optional... }
}
```

**Response:**
```json
{
  "response": "High flood risk indicates...",
  "type": "information",
  "confidence": 0.85,
  "requires_action": false
}
```

#### `POST /chat/summary`
Generate a risk summary for administrators

**Request Body:** Flood risk prediction data

**Response:**
```json
{
  "summary": "Current assessment shows HIGH risk..."
}
```

#### `POST /chat/action-plan`
Generate a detailed action plan

**Request Body:** Flood risk prediction data

**Response:**
```json
{
  "action_plan": "Immediate Actions:\n1. Initiate evacuation...",
  "risk_level": "high"
}
```

### Data Upload

#### `POST /upload/data`
Upload flood data files

**Request:** Multipart form data with file

**Response:**
```json
{
  "message": "File uploaded successfully",
  "filename": "data.csv",
  "file_path": "/uploads/data.csv",
  "size": 1024
}
```

---

## 🤖 ML Model Details

### Features Used (12 Features)

1. **elevation** - Terrain elevation (meters)
2. **slope** - Terrain slope (degrees)
3. **flow_accumulation_log** - Water flow concentration (log-transformed)
4. **distance_to_river_log** - Distance from river (log-transformed, meters)
5. **flood_depth** - Water depth from bathtub model (meters)
6. **lulc_agriculture** - Agricultural land percentage (0-1)
7. **lulc_urban** - Urban land percentage (0-1)
8. **population_density** - Population per square km
9. **velocity_index** - Flood velocity indicator (0-1)
10. **depth_elevation_ratio** - Depth relative to elevation
11. **slope_velocity_interaction** - Slope × velocity interaction
12. **population_exposure** - Population × depth exposure

### Risk Classification

- **0 = Low Risk** - Monitor situation, maintain preparedness
- **1 = Medium Risk** - Prepare for potential evacuation, monitor closely
- **2 = High Risk** - Initiate evacuation procedures, deploy emergency resources

### Model Performance

- **Accuracy**: ~85%
- **Model Type**: Random Forest
- **Cross-validation**: 5-fold
- **Feature Engineering**: 12 engineered features from 9 raw inputs

---

## 🧠 GenAI Chatbot

### Capabilities

1. **Risk Interpretation** - Explains technical predictions in simple language
2. **Decision Support** - Provides actionable recommendations
3. **Action Planning** - Generates detailed response plans
4. **Context Awareness** - Uses current risk data for personalized responses
5. **Government-Friendly** - Tailored for administrators and officials

### Response Types

- **Information** - General knowledge and explanations
- **Recommendation** - Suggested actions and decisions
- **Alert** - Urgent warnings and notifications
- **Explanation** - Technical details and rationale

---

## 🌐 Web Interface Features

### Flood Risk Prediction Form

- **Input Fields**: All 12 terrain, hydrology, and exposure features
- **Location Metadata**: District, state, location name
- **Real-time Validation**: Input validation and error handling
- **One-click Prediction**: Instant ML-based risk assessment

### Results Display

- **Risk Level Visualization**: Color-coded risk badges
- **Confidence Score**: Model confidence percentage
- **Probability Breakdown**: Low/Medium/High probabilities
- **AI Integration**: Generate summaries and action plans

### AI Chatbot

- **Natural Language Interface**: Ask questions in plain language
- **Context-Aware**: Uses current prediction data
- **Quick Questions**: Pre-built common questions
- **Real-time Responses**: Instant AI-powered answers
- **Message History**: Conversation context maintained

### System Status

- **Health Monitoring**: API and model status
- **Version Information**: Current API version
- **Last Update**: Timestamp tracking

---

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_DEBUG=true

# ML Model
MODEL_PATH=models/flood_risk_model.pkl
MODEL_VERSION=1.0.0

# Risk Thresholds
LOW_RISK_THRESHOLD=0.33
MEDIUM_RISK_THRESHOLD=0.66

# Directories
DATA_DIR=data
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_MB=10

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/floodshield.log
```

---

## 🔧 Advanced Usage

### Custom Model Training

```python
from ml.flood_risk_model import FloodRiskModel
import pandas as pd

# Load your data
df = pd.read_csv('your_data.csv')

# Initialize model
model = FloodRiskModel(model_type='random_forest', n_estimators=200)

# Train
X = df.drop('risk_class', axis=1)
y = df['risk_class']
accuracy = model.train(X, y)

# Save
model.save_model('models/custom_model.pkl')
```

### Using the Chatbot Directly

```python
from genai.chatbot import FloodShieldChatbot

# Initialize
chatbot = FloodShieldChatbot()

# Chat
response = chatbot.chat(
    message="What should we do for high risk?",
    risk_data=prediction_result
)

print(response['response'])
```

### Batch Predictions

```python
import requests

locations = [
    { ...location1... },
    { ...location2... },
    { ...location3... }
]

response = requests.post(
    'http://localhost:8000/predict/batch',
    json={'locations': locations}
)

results = response.json()
print(f"Processed {results['total_locations']} locations")
print(f"Summary: {results['summary']}")
```

---

## 📊 Data Flow

```
1. User Input (Web Interface)
   ↓
2. API Request (FastAPI)
   ↓
3. ML Prediction (Random Forest)
   ↓
4. Risk Classification (Low/Medium/High)
   ↓
5. GenAI Interpretation (OpenAI)
   ↓
6. Decision Support (Chatbot)
   ↓
7. Results Display (Web Interface)
```

---

## 🛡️ System Limitations

**What it DOES:**
- Provide fast risk intelligence
- Deliver decision-ready outputs
- Support preparedness planning
- Offer terrain-adaptive risk classification

**What it does NOT do:**
- Replace hydraulic CFD simulation
- Predict exact flood timing
- Replace real-time sensor systems
- Provide guarantees on predictions

---

## 🔐 Security Considerations

- API keys stored in environment variables
- Input validation on all endpoints
- CORS configuration for production
- File upload size limits
- Error handling without sensitive data exposure

---

## 📈 Future Enhancements

- [ ] Real-time data integration (IMD rainfall, river levels)
- [ ] ArcGIS Online dashboard integration
- [ ] Mobile app for field officers
- [ ] Multi-language support
- [ ] Historical trend analysis
- [ ] Email/SMS alert system
- [ ] Advanced visualization with maps
- [ ] User authentication and authorization

---

## 🤝 Contributing

To contribute to Jal-Setu AI:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## 📄 License

This project is part of the Jal-Setu AI initiative.

---

## 📞 Support

For questions or support:
- Create an issue on the repository
- Contact the development team
- Check the API documentation at `/docs`

---

## 🙏 Acknowledgments

- **ArcGIS** - Hydrology modelling tools
- **OpenAI** - GenAI capabilities
- **Scikit-learn** - ML framework
- **FastAPI** - Backend framework

---

## 🎯 Core Philosophy

**Physics → ML → GenAI Layering**

1. **Physics Layer** - Ensures scientific correctness with ArcGIS hydrology
2. **ML Layer** - Adapts risk classification to terrain variation
3. **GenAI Layer** - Converts outputs into human decision language

---

**Built with ❤️ for safer communities**