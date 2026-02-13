# 🌊 Jal-Setu AI - Technical Implementation Guide

## 📚 Table of Contents

1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Quick Start](#quick-start)
4. [Detailed Setup](#detailed-setup)
5. [API Documentation](#api-documentation)
6. [ML Model Guide](#ml-model-guide)
7. [GenAI Integration](#genai-integration)
8. [Frontend Development](#frontend-development)
9. [Deployment](#deployment)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)
12. [Contributing](#contributing)

---

## 🎯 Introduction

Jal-Setu AI is a comprehensive flood risk decision support system that combines machine learning predictions with generative AI interpretation. This technical guide covers all aspects of implementation, setup, and deployment.

### What This System Does

1. **Predicts flood risk** using a Random Forest classifier trained on terrain, hydrology, and exposure features
2. **Interprets results** using OpenAI GPT-4 to provide actionable insights
3. **Generates action plans** for administrators and emergency responders
4. **Provides a web interface** for interactive risk assessment

### Key Technologies

- **Backend**: FastAPI (Python)
- **ML**: Scikit-learn (Random Forest)
- **GenAI**: OpenAI GPT-4
- **Frontend**: HTML5, CSS3, JavaScript
- **GIS**: ArcGIS Pro (for data processing)

---

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│                  (Web Dashboard + API)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Application                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  API Router  │  │  Validation  │  │   Business   │    │
│  │              │  │   (Pydantic) │  │    Logic     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  ML Service  │  │  Chatbot     │  │  Data        │    │
│  │  (Predict)   │  │  (GenAI)     │  │  Processor   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Storage                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  ML Model    │  │  File Store  │  │  Uploads     │    │
│  │  (.pkl)      │  │  (GeoTIFF)   │  │  Directory   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Component Details

#### 1. API Layer (FastAPI)
- RESTful API with 8 endpoints
- Automatic API documentation (Swagger UI)
- Request/response validation (Pydantic)
- CORS support for web integration

#### 2. ML Service
- Random Forest classifier (100 estimators)
- 12 engineered features
- Probability-based predictions
- Single and batch prediction support

#### 3. Chatbot Service
- OpenAI GPT-4 integration
- Context-aware responses
- Risk interpretation
- Action plan generation

#### 4. Data Processing
- Feature engineering pipeline
- Data validation
- Standardization
- Error handling

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- OpenAI API key
- 4GB RAM minimum
- 2GB disk space

### 5-Minute Setup

```bash
# 1. Clone or download the project
cd floodshield-ai

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env and add your OpenAI API key

# 4. Train the model
cd ml
python train_model.py
cd ..

# 5. Start the backend
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# 6. Access the web interface
# Open index.html in your browser
```

### Access URLs

- **Web Interface**: `http://localhost:8050` (if using http.server)
- **API Documentation**: `http://localhost:8000/docs`
- **API Base**: `http://localhost:8000`

---

## 🔧 Detailed Setup

### 1. Environment Configuration

Create a `.env` file with the following variables:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_DEBUG=true

# ML Model Configuration
MODEL_PATH=models/flood_risk_model.pkl
MODEL_VERSION=1.0.0

# Risk Thresholds
LOW_RISK_THRESHOLD=0.33
MEDIUM_RISK_THRESHOLD=0.66

# Directory Configuration
DATA_DIR=data
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_MB=10

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/floodshield.log
```

### 2. Directory Structure

Ensure the following directories exist:

```bash
mkdir -p models data uploads logs static templates api ml genai examples
```

### 3. Dependency Installation

Install all required packages:

```bash
pip install -r requirements.txt
```

**Key Dependencies:**
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `scikit-learn` - ML algorithms
- `openai` - GenAI API
- `pydantic` - Data validation
- `python-dotenv` - Environment management

### 4. ML Model Training

Train the Random Forest classifier:

```bash
cd ml
python train_model.py
```

**What this does:**
1. Generates 1000 synthetic training samples
2. Engineers 12 features from raw inputs
3. Trains Random Forest classifier
4. Achieves ~85% accuracy
5. Saves model to `models/flood_risk_model.pkl`

**Training Output:**
```
INFO: Generating sample training data...
INFO: Generated 1000 samples
INFO: Risk distribution:
1    469
2    268
0    263
INFO: Training random_forest model...
INFO: Training completed. Accuracy: 0.850
INFO: Model saved to ../models/flood_risk_model.pkl
```

---

## 📖 API Documentation

### Base URL
```
http://localhost:8000
```

### Endpoints

#### 1. Health Check

**GET** `/health`

Check API and model status.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "api_version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00"
}
```

---

#### 2. Model Information

**GET** `/model/info`

Get ML model details.

**Response:**
```json
{
  "model_type": "random_forest",
  "version": "1.0.0",
  "feature_count": 12,
  "is_trained": true
}
```

---

#### 3. Single Prediction

**POST** `/predict`

Predict flood risk for one location.

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

**cURL Example:**
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "elevation": 125.5,
    "slope": 12.3,
    "flow_accumulation": 2345.67,
    "distance_to_river": 123.45,
    "flood_depth": 2.3,
    "lulc_agriculture": 0.65,
    "lulc_urban": 0.15,
    "population_density": 856,
    "velocity_index": 0.78
  }'
```

**Python Example:**
```python
import requests

response = requests.post('http://localhost:8000/predict', json={
    "elevation": 125.5,
    "slope": 12.3,
    "flood_depth": 2.3,
    # ... other parameters
})

result = response.json()
print(f"Risk Level: {result['risk_label']}")
print(f"Confidence: {result['confidence']:.2%}")
```

---

#### 4. Batch Prediction

**POST** `/predict/batch`

Predict flood risk for multiple locations.

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

---

#### 5. Chatbot Interaction

**POST** `/chat`

Interact with the AI assistant.

**Request Body:**
```json
{
  "message": "What does high flood risk mean?",
  "previous_risk_data": {
    "risk_class": 2,
    "risk_label": "High",
    "probabilities": {
      "low": 0.05,
      "medium": 0.10,
      "high": 0.85
    },
    "input_data": { ... }
  }
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

---

#### 6. Generate Risk Summary

**POST** `/chat/summary`

Generate an executive summary for administrators.

**Request Body:** Flood risk prediction data

**Response:**
```json
{
  "summary": "Current assessment shows HIGH risk with 85% confidence..."
}
```

---

#### 7. Generate Action Plan

**POST** `/chat/action-plan`

Generate a detailed action plan based on risk level.

**Request Body:** Flood risk prediction data

**Response:**
```json
{
  "action_plan": "Immediate Actions:\n1. Initiate evacuation...",
  "risk_level": "high",
  "generated_at": "2024-01-15T10:30:00"
}
```

---

#### 8. Upload Data

**POST** `/upload/data`

Upload flood data files (CSV, GeoTIFF, etc.)

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

## 🤖 ML Model Guide

### Model Architecture

**Algorithm**: Random Forest Classifier
- **Estimators**: 100 trees
- **Max Depth**: 15
- **Min Samples Split**: 5
- **Min Samples Leaf**: 2
- **Class Weight**: Balanced

### Features (12 Engineered Features)

#### Raw Inputs (9 Features)
1. **elevation** - Terrain elevation (meters)
2. **slope** - Terrain slope (degrees)
3. **flow_accumulation** - Water flow concentration
4. **distance_to_river** - Distance from river (meters)
5. **flood_depth** - Water depth (meters)
6. **lulc_agriculture** - Agricultural land percentage (0-1)
7. **lulc_urban** - Urban land percentage (0-1)
8. **population_density** - Population per sq km
9. **velocity_index** - Flood velocity index (0-1)

#### Engineered Features (3 Additional)
10. **flow_accumulation_log** - Log-transformed flow accumulation
11. **distance_to_river_log** - Log-transformed distance
12. **depth_elevation_ratio** - Depth relative to elevation
13. **slope_velocity_interaction** - Slope × velocity
14. **population_exposure** - Population × depth exposure

### Risk Classification

**Classes:**
- **0**: Low Risk (Monitor situation)
- **1**: Medium Risk (Prepare for evacuation)
- **2**: High Risk (Initiate evacuation)

**Thresholds:**
- Low Risk: probability < 0.33
- Medium Risk: 0.33 ≤ probability < 0.66
- High Risk: probability ≥ 0.66

### Model Performance

- **Accuracy**: 85%
- **Cross-validation**: 5-fold
- **Training Time**: ~30 seconds (1000 samples)
- **Prediction Time**: <1 second per sample

### Feature Importance

Top features by importance:
1. distance_to_river_log (19.3%)
2. velocity_index (16.4%)
3. slope_velocity_interaction (11.9%)
4. flood_depth (11.8%)
5. depth_elevation_ratio (11.1%)

### Custom Training

Train with your own data:

```python
from ml.flood_risk_model import FloodRiskModel
import pandas as pd

# Load your data
df = pd.read_csv('your_data.csv')

# Prepare features
X = df.drop('risk_class', axis=1)
y = df['risk_class']

# Initialize and train
model = FloodRiskModel(model_type='random_forest', n_estimators=200)
accuracy = model.train(X, y)

# Save model
model.save_model('models/custom_model.pkl')
```

### Model Evaluation

```python
from sklearn.metrics import classification_report, confusion_matrix

# Make predictions
y_pred = model.predict(X_test)

# Classification report
print(classification_report(y_test, y_pred))

# Confusion matrix
print(confusion_matrix(y_test, y_pred))
```

---

## 🧠 GenAI Integration

### Chatbot Configuration

The chatbot uses OpenAI GPT-4 for intelligent responses.

**Model:** GPT-4 Turbo Preview
**Temperature:** 0.7 (balanced creativity)
**Max Tokens:** 800 (response length)

### Capabilities

1. **Risk Interpretation**
   - Explains technical predictions
   - Describes risk levels
   - Clarifies terminology

2. **Decision Support**
   - Provides recommendations
   - Suggests actions
   - Prioritizes tasks

3. **Context Awareness**
   - Uses prediction data
   - Adapts to risk level
   - Provides tailored advice

4. **Action Planning**
   - Generates detailed plans
   - Sets timelines
   - Identifies priorities

### Direct Usage

```python
from genai.chatbot import FloodShieldChatbot

# Initialize chatbot
chatbot = FloodShieldChatbot()

# Simple chat
response = chatbot.chat(
    message="What should we do for high flood risk?"
)

print(response['response'])

# With context
risk_data = {
    "risk_label": "High",
    "confidence": 0.85,
    "input_data": {
        "flood_depth": 2.3,
        "velocity_index": 0.78
    }
}

response = chatbot.chat(
    message="Is this urgent?",
    risk_data=risk_data
)

print(response['response'])
```

### Generate Summary

```python
summary = chatbot.generate_risk_summary(risk_data)
print(summary)
```

### Generate Action Plan

```python
action_plan = chatbot.generate_action_plan(risk_data)
print(action_plan['action_plan'])
```

---

## 🎨 Frontend Development

### File Structure

```
static/
├── styles.css          # Main stylesheet
index.html              # Main dashboard
```

### Key Components

#### 1. Prediction Form

Located in `index.html`, handles:
- Input validation
- Feature parameter entry
- Location metadata
- Form submission

#### 2. Results Display

Shows:
- Risk level badge (color-coded)
- Confidence score
- Probability distribution
- Feature importance

#### 3. Chatbot Interface

Features:
- Message history
- User/assistant differentiation
- Quick question buttons
- Auto-scroll to latest message

### Customization

#### Change API Base URL

Edit `index.html`:
```javascript
const API_BASE = 'https://your-api-url.com';
```

#### Modify Styling

Edit `static/styles.css`:
- Colors: Update CSS variables
- Layout: Adjust grid and flex properties
- Components: Modify card and form styles

#### Add New Features

1. Add new input fields to form
2. Update API request in JavaScript
3. Handle new response data
4. Update display logic

### API Integration

All frontend API calls use `fetch()`:

```javascript
// Prediction
const response = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
});

const result = await response.json();

// Chatbot
const chatResponse = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        message: userMessage,
        previous_risk_data: lastPrediction
    })
});

const chatResult = await chatResponse.json();
```

---

## 🚢 Deployment

### Development Deployment

#### Backend

```bash
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend

```bash
python -m http.server 8050
```

### Production Deployment

#### Option 1: Docker

**Dockerfile (Backend):**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build and Run:**
```bash
docker build -t floodshield-api .
docker run -p 8000:8000 floodshield-api
```

#### Option 2: Cloud Services

**AWS EC2:**
1. Launch Ubuntu instance
2. Install Python and dependencies
3. Clone repository
4. Configure environment
5. Run with Gunicorn:
```bash
gunicorn api.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

**Google Cloud Run:**
```bash
gcloud run deploy floodshield-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**Azure App Service:**
```bash
az webapp up --name floodshield-api --runtime PYTHON:3.11
```

#### Option 3: Nginx Reverse Proxy

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /static {
        alias /path/to/static;
    }
}
```

### Environment Variables (Production)

Set these in your production environment:

```bash
OPENAI_API_KEY=your-production-api-key
OPENAI_MODEL=gpt-4-turbo-preview
API_DEBUG=false
LOG_LEVEL=WARNING
```

### Security Considerations

1. **API Keys**: Never commit `.env` file
2. **HTTPS**: Use SSL in production
3. **CORS**: Configure allowed origins
4. **Rate Limiting**: Implement rate limiting
5. **Authentication**: Add user authentication
6. **Input Validation**: Already implemented with Pydantic

---

## 🧪 Testing

### Unit Tests

```python
# test_ml_model.py
import pytest
from ml.flood_risk_model import FloodRiskModel

def test_model_initialization():
    model = FloodRiskModel()
    assert model.model_type == 'random_forest'
    assert model.n_estimators == 100

def test_prediction():
    model = FloodRiskModel()
    model.load_model('models/flood_risk_model.pkl')
    
    sample = {
        'elevation': 125.5,
        'slope': 12.3,
        'flow_accumulation': 2345.67,
        'distance_to_river': 123.45,
        'flood_depth': 2.3,
        'lulc_agriculture': 0.65,
        'lulc_urban': 0.15,
        'population_density': 856,
        'velocity_index': 0.78
    }
    
    result = model.predict(sample)
    assert 'risk_label' in result
    assert 'confidence' in result
```

Run tests:
```bash
pytest test_ml_model.py -v
```

### API Testing

```bash
# Health check
curl http://localhost:8000/health

# Single prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d @test_data.json

# Batch prediction
curl -X POST http://localhost:8000/predict/batch \
  -H "Content-Type: application/json" \
  -d @batch_data.json
```

### Integration Testing

```python
# test_integration.py
import requests

def test_full_workflow():
    # 1. Check health
    health = requests.get('http://localhost:8000/health')
    assert health.json()['status'] == 'healthy'
    
    # 2. Make prediction
    prediction = requests.post('http://localhost:8000/predict', json=test_data)
    result = prediction.json()
    assert result['risk_label'] in ['Low', 'Medium', 'High']
    
    # 3. Get summary
    summary = requests.post('http://localhost:8000/chat/summary', json=result)
    assert 'summary' in summary.json()
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Model Not Loading

**Problem:** `Model not loaded` error

**Solutions:**
```bash
# Check if model file exists
ls -la models/flood_risk_model.pkl

# Retrain model
cd ml && python train_model.py && cd ..

# Check permissions
chmod 644 models/flood_risk_model.pkl
```

#### 2. OpenAI API Error

**Problem:** `Error generating chatbot response`

**Solutions:**
```bash
# Check API key
echo $OPENAI_API_KEY

# Verify API key is set in .env
cat .env | grep OPENAI_API_KEY

# Test API key
python -c "import openai; client = openai.OpenAI(); print(client.models.list())"
```

#### 3. Port Already in Use

**Problem:** `Address already in use`

**Solutions:**
```bash
# Find process using port
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port
python -m uvicorn api.main:app --port 8001
```

#### 4. Import Errors

**Problem:** `ModuleNotFoundError`

**Solutions:**
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check Python version
python --version  # Should be 3.11+

# Install specific package
pip install <package-name>
```

#### 5. CORS Errors

**Problem:** Browser CORS errors

**Solutions:**
```python
# In api/main.py, ensure CORS is configured
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Debug Mode

Enable debug logging:

```bash
# In .env
LOG_LEVEL=DEBUG
API_DEBUG=true

# Restart server
python -m uvicorn api.main:app --reload --log-level debug
```

### Check Logs

```bash
# View application logs
tail -f logs/floodshield.log

# View server output
# If running in background
# Check the output file mentioned in terminal
```

---

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make** your changes
4. **Test** thoroughly:
   ```bash
   pytest
   ```
5. **Commit** changes:
   ```bash
   git commit -m "Add your feature"
   ```
6. **Push** to branch:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create** Pull Request

### Code Style

- Follow PEP 8 guidelines
- Use descriptive variable names
- Add docstrings to functions
- Include type hints where appropriate
- Write unit tests for new features

### Documentation

Update documentation when:
- Adding new features
- Changing API endpoints
- Modifying configuration
- Updating dependencies

---

## 📚 Additional Resources

### External Documentation

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Scikit-learn User Guide](https://scikit-learn.org/stable/user_guide.html)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Pydantic Documentation](https://docs.pydantic.dev/)

### Project Files

- `README.md` - Project overview
- `PROJECT_IDEA.md` - Vision and concepts
- `QUICK_START.md` - Quick start guide
- `examples/api_usage_examples.py` - API examples
- `todo.md` - Development tasks

### Support

- Check existing issues on GitHub
- Review documentation
- Ask questions in discussions
- Contact development team

---

## 📄 License

This project is part of the Jal-Setu AI initiative.

---

**Last Updated: January 2024**

**Built with ❤️ for safer communities**