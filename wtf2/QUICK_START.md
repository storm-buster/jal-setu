# 🚀 Quick Start Guide - Jal-Setu AI

## ⚡ Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```bash
OPENAI_API_KEY=sk-your-api-key-here
```

### Step 3: Train the Model

```bash
cd ml
python train_model.py
cd ..
```

### Step 4: Start the Backend

```bash
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 5: Access the Web Interface

Option A - Direct File Access:
- Open `index.html` in your web browser

Option B - Local Server:
```bash
python -m http.server 8050
```
Then visit: `http://localhost:8050`

### Step 6: Make a Prediction

1. Fill in the flood risk prediction form
2. Click "Predict Risk"
3. View results and chat with the AI assistant

---

## 🎯 Live Demo URLs

### Web Interface
```
https://floodshield-002xp.app.super.myninja.ai
```

### API Documentation
```
https://floodshield-002xo.app.super.myninja.ai/docs
```

### API Endpoints
```
https://floodshield-002xo.app.super.myninja.ai/
```

---

## 📝 First Prediction Example

Use these values to test the system:

| Parameter | Value |
|-----------|-------|
| Elevation | 125.5 m |
| Slope | 12.3° |
| Flow Accumulation | 2345.67 |
| Distance to River | 123.45 m |
| Flood Depth | 2.3 m |
| Velocity Index | 0.78 |
| Agriculture Land | 0.65 |
| Urban Land | 0.15 |
| Population Density | 856 people/sq km |
| Location | Patna District |

**Expected Result**: HIGH RISK (85% confidence)

---

## 💬 Chat with the AI Assistant

After making a prediction, try these questions:

1. "What does high flood risk mean?"
2. "What should we do now?"
3. "How urgent is the situation?"
4. "Generate an action plan"

---

## 🔧 Test the API

### Using cURL

```bash
# Health Check
curl https://floodshield-002xo.app.super.myninja.ai/health

# Single Prediction
curl -X POST https://floodshield-002xo.app.super.myninja.ai/predict \
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

### Using Python

```python
import requests

API_BASE = "https://floodshield-002xo.app.super.myninja.ai"

# Make prediction
response = requests.post(f"{API_BASE}/predict", json={
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

## 📚 Next Steps

1. **Read the full documentation**: Check `README.md` for detailed information
2. **Run API examples**: Try `examples/api_usage_examples.py`
3. **Customize the model**: Train with your own data
4. **Integrate with ArcGIS**: Connect to real terrain data
5. **Deploy to production**: Use Docker or cloud services

---

## ❓ Troubleshooting

### Model not loading
- Ensure you've trained the model: `cd ml && python train_model.py`
- Check that `models/flood_risk_model.pkl` exists

### Chatbot not working
- Verify your OpenAI API key in `.env`
- Check API key has sufficient credits

### API connection errors
- Ensure the backend is running: `python -m uvicorn api.main:app --reload`
- Check the port is not already in use

---

## 🆘 Need Help?

- **Documentation**: See `README.md`
- **API Docs**: Visit `/docs` endpoint
- **Examples**: Check `examples/` directory
- **Issues**: Create a GitHub issue

---

**Ready to protect communities with AI-powered flood intelligence! 🌊**