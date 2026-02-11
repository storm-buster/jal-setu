FloodShield Mock API (FastAPI)

Run locally:
1) Create a virtualenv and install deps:
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt

2) Start server:
   uvicorn main:app --reload --port 8000

Endpoints:
- GET  /health
- POST /api/auth/login
- GET  /api/risk-summary?region=Bihar&scenario=1m
- POST /api/analyze-region
- GET  /api/terrain-profile?region=Bihar
- POST /api/report

Note: The Vite dev server is configured to proxy /api -> http://localhost:8000
