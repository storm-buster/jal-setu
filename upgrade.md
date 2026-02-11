Upgrade the existing Flood Decision Support Dashboard built with:

React

TypeScript

ArcGIS JS API

Recharts

The system must feel government-grade, production-ready, scalable, and modern.

Implement the following improvements with clean architecture, modular structure, and maintainable code.

1️⃣ GLOBAL DARK MODE + FULL RESPONSIVENESS
Requirements:

Implement system-wide Dark Mode using:

CSS variables or Tailwind theme tokens

Persistent theme state (localStorage)

Must support:

100% screen ratio layouts

Large screens (government control room)

Tablets

Mobile devices

Constraints:

No overflow scroll clutter

No horizontal scroll

Grid-based layout

Clean spacing hierarchy (8px system)

Proper typography scale

Deliverables:

Theme provider

Toggle component

Fully responsive layout

Zero UI break at 1920x1080 and ultrawide

2️⃣ EXPORT AI REPORT AS PDF

Add a feature to export the AI-generated flood analysis report as a downloadable PDF.

Requirements:

Structured report layout:

Title

Selected region

Risk classification

Flood depth summary

Terrain profile

AI recommendations

Charts snapshot

Must use:

jsPDF OR pdf-lib

OR server-side PDF generation via backend

Output:

Properly styled

Header + footer

Timestamp

Government-ready formatting

3️⃣ ADVANCED MAP WITH TERRAIN + DEPTH + FULLSCREEN

Upgrade the ArcGIS map to:

Required Features:

3D SceneView

Terrain elevation

Flood depth rendering

Polygon drawing tool

Layer toggle control

Fullscreen mode

Legend panel

Technical:

Use ArcGIS 4.x SceneView

Enable ElevationLayer

Render depth via:

RasterLayer OR FeatureLayer with color ramp

Add expand widget

Add basemap switcher

The map must feel immersive and professional.

4️⃣ REMOVE UI CROWDING

Refactor UI layout:

Required:

Sidebar collapsible

Charts inside tab panels

AI insights inside accordion

Proper whitespace

Card-based modular sections

Follow:

Government dashboard aesthetics

No excessive shadows

Professional minimalism

5️⃣ REPLACE RAW OUTPUT WITH BACKEND + MOCK API

Build a backend layer.

Requirements:

Create mock REST API using:

FastAPI

Endpoints:

/api/analyze-region

/api/risk-summary

/api/terrain-profile

/api/report

Frontend must:

Fetch from API

Handle loading states

Handle errors

Show skeleton loaders

Avoid hardcoded data

Structure backend properly:

Controllers

Services

Models

6️⃣ TWO USER MODES (DEMO + AUTHENTICATED)

Implement two user types:

Demo User:

No persistence

No saved polygons

No memory

Authenticated User:

Polygon selections saved

Stored in:

LocalStorage OR IndexedDB

Persist across sessions

Only visible to that user

Not visible to Demo user

Authentication:

Simple JWT-based mock login

No complex auth required

Architecture:

Auth Context Provider

Protected state

Role flag (demo | authenticated)

ARCHITECTURAL EXPECTATIONS

Follow clean architecture:

Frontend:

Feature-based folder structure

Hooks for logic

Separate UI and logic

Backend:

Modular

Service layer

DTO validation

State Management:

Use Zustand or Redux Toolkit

FINAL GOAL

Transform the dashboard into:

✔ Government-grade
✔ AI-integrated
✔ Fully responsive
✔ Production-ready
✔ Clean architecture
✔ Modular
✔ Scalable

Do NOT give partial snippets. Provide complete structured implementation plan and key code.