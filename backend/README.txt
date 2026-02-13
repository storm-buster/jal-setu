FloodShield Mock API (FastAPI)

Run locally:
1) Create a virtualenv and install deps:
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt

   Note: If scikit-learn/pandas/numpy/joblib are installed, the server will use the wtf2 ML model
   (wtf2/models/flood_risk_model.pkl) to generate risk scores. Otherwise it falls back to mock data.

2) Start server:
   uvicorn main:app --reload --port 8000

Endpoints:
- GET  /health
- POST /api/auth/login
- GET  /api/risk-summary?region=Bihar&scenario=1m
- POST /api/analyze-region
- GET  /api/terrain-profile?region=Bihar
- POST /api/report

ML integration (from wtf2/):
- GET  /api/ml/health
- POST /api/ml/predict

Note: The Vite dev server is configured to proxy /api -> http://localhost:8000
