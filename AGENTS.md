# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project summary
FloodShield AI is a small full-stack demo:
- Frontend: React + TypeScript (Vite) dashboard using Tailwind CSS, Zustand, Recharts, and ArcGIS JS (`@arcgis/core`) with an optional Google 3D map provider.
- Backend: a mock FastAPI server under `backend/` that serves JSON for charts/metrics and generates a report string.

## Common commands (PowerShell)

### Frontend (Vite)
```pwsh
npm install
# Clean install from package-lock.json (useful in CI or when debugging deps)
npm ci

npm run dev

# Production build (outputs dist/)
npm run build

# Serve the production build locally
npm run preview

# Lint (ESLint v9 flat config)
npm run lint
npm run lint -- --fix

# Lint a single file
npx eslint src/components/map/MapView.tsx

# Typecheck only (TS project references)
npx tsc -b
```

### Backend (FastAPI mock)
```pwsh
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Run full stack locally
1) Start the backend on port 8000 (see above).
2) In a second terminal, start the frontend with `npm run dev`.

The Vite dev server proxies `GET/POST /api/*` to `http://localhost:8000` (see `vite.config.ts`).

### Tests
No automated test runner is configured in either the frontend (`package.json` has no `test` script) or the backend (no `tests/` present).

## Architecture (big picture)

### Frontend runtime entry + top-level layout
- `index.html` mounts `#root` and loads `src/main.tsx`.
- `src/main.tsx` wires providers and renders `App`:
  - `ThemeProvider` (dark/light via `localStorage`)
  - `AuthProvider` (demo vs authenticated “mode” via `localStorage`)
- `src/App.tsx` composes the main dashboard layout:
  - `Sidebar` (region/scenario/layer controls + login + GeoTIFF upload)
  - `KPICards` (KPIs)
  - `MapComponent` (ArcGIS SceneView or Google map)
  - `ChartsSection` + `GenAIPanel` (analysis + report export)

### State + auth model
- Global UI state lives in `src/store/useStore.ts` (Zustand): `region`, `scenario`, `activeLayer`, `uploadedFile`.
- Auth state lives in `src/auth/AuthProvider.tsx`:
  - `mode: 'demo' | 'authenticated'`
  - a stored token/userId is used for client-side UX (e.g. polygon persistence), not for API authorization headers.

### Frontend↔backend API layer
- `src/api/client.ts` exposes `apiFetch()` which throws `ApiError` on non-2xx.
- Feature APIs:
  - `src/api/authApi.ts` → `POST /api/auth/login`
  - `src/api/floodApi.ts` → `/api/risk-summary`, `/api/analyze-region`, `/api/terrain-profile`, `/api/report`
- In dev, requests go to the backend via the Vite proxy (`vite.config.ts`). In production, you’ll need an equivalent reverse-proxy / hosting setup.

### Map subsystem
`src/components/map/MapView.tsx` provides `MapComponent`, which selects a provider:
- `VITE_MAP_PROVIDER=arcgis|google` forces a provider.
- Otherwise it auto-selects Google when `VITE_GOOGLE_MAPS_API_KEY` is present.

ArcGIS path (default):
- Uses a 3D `SceneView` with a `WebMap` basemap (`hybrid`) and terrain (`world-elevation`).
- Creates mock `GraphicsLayer`s with IDs that match the visibility toggles:
  - `Depth_0m`, `Depth_1m`, `Depth_2m`
  - `Risk_0m`, `Risk_1m`, `Risk_2m`
  - `Velocity_0m`, `Velocity_1m`, `Velocity_2m`
  - `User_Polygons` (user-drawn)
- The active layer is controlled by Zustand (`activeLayer` + `scenario`) by toggling `layer.visible` (no layer reload).
- Includes ArcGIS widgets (Sketch, Fullscreen, Expand panel with Legend/LayerList/BasemapGallery).
- User polygons are persisted per authenticated user to `localStorage` (see `getPolygonsStorageKey()` in `src/auth/AuthProvider.tsx`).

Google path (`src/components/map/GoogleEarthMap.tsx`):
- Requires `VITE_GOOGLE_MAPS_API_KEY` (optionally `VITE_GOOGLE_MAP_ID`).
- Uses the Elevation service to show a hover readout (terrain + current scenario depth).

### Dashboards + reports
- `src/components/dashboard/Charts.tsx` calls `analyzeRegion()` to render Recharts bar charts.
- `src/components/dashboard/GenAIPanel.tsx` calls `createReport()` and can export a PDF via `jspdf` + `html2canvas`.
- `src/components/dashboard/TiffUploader.tsx` parses GeoTIFFs via `geotiff` and stores derived metadata in Zustand; `uploadedFile` is forwarded to `POST /api/report`.

### Backend (mock FastAPI)
- `backend/main.py` defines the FastAPI app and serves mocked, deterministic responses.
- The in-memory `FLOOD_DATA` table is the source of truth for `/api/risk-summary` and for parts of `/api/analyze-region` and `/api/report`.
- `POST /api/auth/login` returns a mock token string; it is intentionally not a real signed JWT.

## Deployment (as documented in README.md)
The repository’s README describes Vercel deployment for the frontend:
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

## Repo-specific conventions worth knowing
- Path alias: `@/` → `src/` (see `vite.config.ts` and `tsconfig.app.json`).
- TypeScript uses project references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`), so `tsc -b` is the canonical way to typecheck.
