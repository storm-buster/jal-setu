# FloodShield AI - Deployment Instructions

## Overview
FloodShield AI is a government-grade flood decision support system frontend. It uses React, Vite, ArcGIS API for JavaScript, and Recharts.

## Setup
1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Development Server**:
    ```bash
    npm run dev
    ```

## Build for Production
To create a production-ready build (deployed to `dist/`):
```bash
npm run build
```

## Deployment via Vercel
1.  Push code to GitHub.
2.  Import project in Vercel.
3.  Framework Preset: **Vite**.
4.  Build Command: `npm run build`.
5.  Output Directory: `dist`.
6.  Click **Deploy**.

## Configuration
-   **ArcGIS WebMap**: Update `src/components/map/MapView.tsx` with your specific Portal Item ID.
-   **Backend API**: Connect `GenAIPanel.tsx` to your real ML inference endpoint.

## Architecture
-   `src/store/`: Global state (Zustand).
-   `src/components/dashboard/`: UI widgets (KPIs, Charts, Sidebar).
-   `src/components/map/`: ArcGIS integration.
