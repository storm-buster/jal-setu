import { useEffect, useRef } from 'react';
import SceneView from '@arcgis/core/views/SceneView';
import WebMap from '@arcgis/core/WebMap';
import Legend from '@arcgis/core/widgets/Legend';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Graphic from '@arcgis/core/Graphic';
import Polygon from '@arcgis/core/geometry/Polygon';
import PolygonSymbol3D from '@arcgis/core/symbols/PolygonSymbol3D';
import ExtrudeSymbol3DLayer from '@arcgis/core/symbols/ExtrudeSymbol3DLayer';
import Fullscreen from '@arcgis/core/widgets/Fullscreen';
import Expand from '@arcgis/core/widgets/Expand';
import LayerList from '@arcgis/core/widgets/LayerList';
import BasemapGallery from '@arcgis/core/widgets/BasemapGallery';
import Sketch from '@arcgis/core/widgets/Sketch';
import { useStore, type AoiPolygon, type Region, type Scenario } from '@/store/useStore';
import { getPolygonsStorageKey, useAuth } from '@/auth/AuthProvider';
import { GoogleEarthMap } from './GoogleEarthMap';

type RegionBounds = { minLon: number; maxLon: number; minLat: number; maxLat: number };

type RegionConfig = {
    center: [number, number];
    zoom: number;
    bounds: RegionBounds;
};

const REGION_CONFIG: Record<Region, RegionConfig> = {
    Bihar: {
        center: [85.3131, 25.0961],
        zoom: 8,
        bounds: { minLon: 84, maxLon: 86, minLat: 24, maxLat: 26 },
    },
    Uttarakhand: {
        center: [79.0193, 30.0668],
        zoom: 9,
        bounds: { minLon: 78, maxLon: 80, minLat: 29, maxLat: 31 },
    },
    Jharkhand: {
        center: [85.2799, 23.6102],
        zoom: 8,
        bounds: { minLon: 83.2, maxLon: 87.0, minLat: 22.0, maxLat: 25.0 },
    },
    'Uttar Pradesh': {
        center: [80.9462, 26.8467],
        zoom: 7,
        bounds: { minLon: 77.0, maxLon: 84.5, minLat: 23.7, maxLat: 29.8 },
    },
};

function getRegionCenter(region: Region): [number, number] {
    return REGION_CONFIG[region].center;
}

function getRegionRings(region: Region): number[][][] {
    const b = REGION_CONFIG[region].bounds;
    return [[[b.minLon, b.minLat], [b.maxLon, b.minLat], [b.maxLon, b.maxLat], [b.minLon, b.maxLat], [b.minLon, b.minLat]]];
}

function depthMetersFromScenario(s: Scenario): number {
    if (s === '0m') return 0;
    if (s === '1m') return 1;
    return 2;
}

function isPointWithinRegionApprox(point: __esri.Point, region: Region): boolean {
    // Our mock region polygons are simple rectangles; use bbox containment.
    // longitude/latitude can be nullish depending on spatial reference, so fall back to x/y.
    const lon = typeof point.longitude === 'number' ? point.longitude : point.x;
    const lat = typeof point.latitude === 'number' ? point.latitude : point.y;

    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;

    const b = REGION_CONFIG[region].bounds;
    return lon >= b.minLon && lon <= b.maxLon && lat >= b.minLat && lat <= b.maxLat;
}

function createExtrudedSymbol(color: number[], sizeMeters: number) {
    return new PolygonSymbol3D({
        symbolLayers: [
            new ExtrudeSymbol3DLayer({
                size: sizeMeters,
                material: { color: [...color, 0.7] },
            }),
        ],
    });
}

type StoredPolygon = AoiPolygon;

function serializePolygons(layer: GraphicsLayer): StoredPolygon[] {
    const out: StoredPolygon[] = [];
    layer.graphics.forEach((g) => {
        if (!g.geometry || g.geometry.type !== 'polygon') return;
        const poly = g.geometry as __esri.Polygon;
        out.push({
            rings: poly.rings as number[][][],
            wkid: poly.spatialReference?.wkid ?? undefined,
        });
    });
    return out;
}

function hydratePolygons(polys: StoredPolygon[]): __esri.GraphicProperties[] {
    return polys.map((p) => ({
        geometry: new Polygon({
            rings: p.rings,
            spatialReference: p.wkid ? { wkid: p.wkid } : undefined,
        }),
    }));
}

function ArcGISMapComponent() {
    const mapDiv = useRef<HTMLDivElement>(null);
    const viewRef = useRef<SceneView | null>(null);
    const layersRef = useRef<Record<string, GraphicsLayer>>({});

    const { region, activeLayer, scenario, setAoiPolygons } = useStore();
    const { mode, user } = useAuth();

    const initialRegionRef = useRef(region);
    const regionRef = useRef(region);
    const scenarioRef = useRef(scenario);

    const authModeRef = useRef(mode);
    const authUserIdRef = useRef<string | null>(user?.userId ?? null);

    useEffect(() => {
        regionRef.current = region;
        scenarioRef.current = scenario;
    }, [region, scenario]);

    useEffect(() => {
        authModeRef.current = mode;
        authUserIdRef.current = user?.userId ?? null;
    }, [mode, user]);

    useEffect(() => {
        if (!mapDiv.current) return;

        const webmap = new WebMap({
            // 3D satellite-style basemap by default. (BasemapGallery still lets users switch.)
            basemap: 'hybrid',
            // Enables terrain in 3D
            ground: 'world-elevation',
            // portalItem: { id: "YOUR_WEB_MAP_ID" }
        });

        const view = new SceneView({
            container: mapDiv.current,
            map: webmap,
            center: getRegionCenter(initialRegionRef.current),
            zoom: 7,
            ui: {
                components: ['attribution', 'zoom', 'compass'],
            },
            environment: {
                atmosphereEnabled: true,
                starsEnabled: false,
            },
        });

        // ArcGIS-style info UI uses the built-in Popup.
        if (view.popup) {
            // Keep popup open as the cursor moves (we update it on hover).
            view.popup.autoCloseEnabled = false;
            view.popup.dockEnabled = true;
            view.popup.dockOptions = {
                position: 'bottom-right',
                breakpoint: false,
            };
        }

        viewRef.current = view;

        // --- MOCK LAYERS (Depth + Risk + Velocity) ---
        const makePolygon = () =>
            new Polygon({
                rings: getRegionRings(initialRegionRef.current),
            });

        const createScenarioLayer = (id: string, title: string, color: number[], extrudeMeters: number) => {
            const layer = new GraphicsLayer({
                id,
                title,
                visible: false,
                elevationInfo: { mode: 'on-the-ground' },
            });

            const graphic = new Graphic({
                geometry: makePolygon(),
                symbol: createExtrudedSymbol(color, extrudeMeters),
            });

            layer.add(graphic);
            return layer;
        };

        // Depth layers (include 0m so the UI always maps to a layer id)
        const depth0 = createScenarioLayer('Depth_0m', 'Flood Depth (0m)', [148, 163, 184], 1);
        const depth1 = createScenarioLayer('Depth_1m', 'Flood Depth (1m)', [31, 78, 121], 600);
        const depth2 = createScenarioLayer('Depth_2m', 'Flood Depth (2m)', [20, 50, 90], 1200);

        // Risk layers (mock) - scenario-aware
        const risk0 = createScenarioLayer('Risk_0m', 'Risk (0m)', [34, 197, 94], 80);
        const risk1 = createScenarioLayer('Risk_1m', 'Risk (1m)', [255, 165, 0], 140);
        const risk2 = createScenarioLayer('Risk_2m', 'Risk (2m)', [255, 59, 48], 200);

        // Velocity layers (mock) - scenario-aware
        const vel0 = createScenarioLayer('Velocity_0m', 'Velocity (0m)', [168, 85, 247], 90);
        const vel1 = createScenarioLayer('Velocity_1m', 'Velocity (1m)', [128, 0, 128], 160);
        const vel2 = createScenarioLayer('Velocity_2m', 'Velocity (2m)', [79, 70, 229], 240);

        // User-drawn polygons
        const sketchLayer = new GraphicsLayer({
            id: 'User_Polygons',
            title: 'User Polygons',
            elevationInfo: { mode: 'on-the-ground' },
            visible: true,
        });

        webmap.addMany([
            depth0,
            depth1,
            depth2,
            risk0,
            risk1,
            risk2,
            vel0,
            vel1,
            vel2,
            sketchLayer,
        ]);

        layersRef.current = {
            Depth_0m: depth0,
            Depth_1m: depth1,
            Depth_2m: depth2,
            Risk_0m: risk0,
            Risk_1m: risk1,
            Risk_2m: risk2,
            Velocity_0m: vel0,
            Velocity_1m: vel1,
            Velocity_2m: vel2,
            User_Polygons: sketchLayer,
        };

        // --- WIDGETS ---
        const fullscreen = new Fullscreen({ view });
        view.ui.add(fullscreen, 'top-left');

        // --- CURSOR READOUT (depth + terrain) ---
        const hoverTimer = { id: 0 as number | 0 };
        const onPointerMove = view.on('pointer-move', (evt) => {
            if (hoverTimer.id) return;

            const { x, y } = evt;
            hoverTimer.id = window.setTimeout(async () => {
                hoverTimer.id = 0;
                if (!viewRef.current || viewRef.current.destroyed) return;

                const mp = viewRef.current.toMap({ x, y }) as __esri.Point | null;
                if (!mp) return;

                const lon = typeof mp.longitude === 'number' ? mp.longitude : mp.x;
                const lat = typeof mp.latitude === 'number' ? mp.latitude : mp.y;
                if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;

                // Elevation (terrain) at point.
                let elevationM: number | null = null;
                try {
                    const ground = viewRef.current.map?.ground;
                    if (ground) {
                        const result = await ground.queryElevation(mp);
                        const z = (result as unknown as { geometry?: { z?: number } }).geometry?.z;
                        elevationM = typeof z === 'number' ? z : (typeof mp.z === 'number' ? mp.z : null);
                    } else {
                        elevationM = typeof mp.z === 'number' ? mp.z : null;
                    }
                } catch {
                    elevationM = typeof mp.z === 'number' ? mp.z : null;
                }

                // Flood depth (mock): only meaningful within our region bbox.
                // If you later swap to a real RasterLayer/FeatureLayer, replace this with hitTest/raster sampling.
                const within = isPointWithinRegionApprox(mp, regionRef.current);
                const depthM = within ? depthMetersFromScenario(scenarioRef.current) : 0;

                const content = `
<div style="font-size:12px;line-height:1.4">
  <div><b>Lon/Lat</b>: <span style="font-family:monospace">${lon.toFixed(5)}, ${lat.toFixed(5)}</span></div>
  <div><b>Terrain</b>: <span style="font-family:monospace">${elevationM == null ? '—' : `${Math.round(elevationM)} m`}</span></div>
  <div><b>Depth</b>: <span style="font-family:monospace">${depthM} m</span></div>
</div>`;

                if (!view.popup) return;

                view.popup.open({
                    title: 'Point info',
                    location: mp,
                    content,
                    fetchFeatures: false,
                });
            }, 120);
        });

        const syncAoi = () => {
            const payload = serializePolygons(sketchLayer);
            setAoiPolygons(payload);
        };

        const persist = () => {
            // Always keep the in-memory AOI in sync (demo and authenticated modes).
            syncAoi();

            if (authModeRef.current !== 'authenticated') return;
            const userId = authUserIdRef.current;
            if (!userId) return;

            const key = getPolygonsStorageKey(userId);
            const payload = serializePolygons(sketchLayer);
            window.localStorage.setItem(key, JSON.stringify(payload));
        };

        const loadPersisted = () => {
            // Always clear for demo mode or when unauthenticated.
            sketchLayer.removeAll();
            setAoiPolygons([]);

            if (authModeRef.current !== 'authenticated') return;
            const userId = authUserIdRef.current;
            if (!userId) return;

            const key = getPolygonsStorageKey(userId);
            try {
                const raw = window.localStorage.getItem(key);
                if (!raw) return;
                const parsed = JSON.parse(raw) as unknown;
                if (!Array.isArray(parsed)) return;

                const polys = parsed as StoredPolygon[];
                const graphics = hydratePolygons(polys).map((props) => new Graphic(props));
                sketchLayer.addMany(graphics);

                // Sync AOI to the app state.
                setAoiPolygons(polys);
            } catch {
                // ignore parse errors
            }
        };

        // Sketch (polygon drawing tool)
        const sketch = new Sketch({
            view,
            layer: sketchLayer,
            creationMode: 'update',
            visibleElements: {
                createTools: {
                    point: false,
                    polyline: false,
                    rectangle: true,
                    circle: false,
                    polygon: true,
                },
                selectionTools: {
                    ['lasso-selection']: false,
                    ['rectangle-selection']: true,
                } as __esri.VisibleElementsSelectionToolsProperties,
                settingsMenu: true,
                undoRedoMenu: true,
            },
        });
        view.ui.add(sketch, 'top-right');

        // Load persisted polygons for authenticated users.
        loadPersisted();

        const onCreate = sketch.on('create', (evt: __esri.SketchCreateEvent) => {
            if (evt.state === 'complete') persist();
        });
        const onUpdate = sketch.on('update', (evt: __esri.SketchUpdateEvent) => {
            if (evt.state === 'complete') persist();
        });
        const onDelete = sketch.on('delete', () => {
            persist();
        });

        // Expandable right-side panel: Legend + LayerList + BasemapGallery
        const panel = document.createElement('div');
        panel.style.width = '320px';
        panel.style.maxHeight = '70vh';
        panel.style.overflow = 'auto';
        panel.style.padding = '8px';

        const legendContainer = document.createElement('div');
        const layerListContainer = document.createElement('div');
        const basemapContainer = document.createElement('div');

        const section = (title: string, container: HTMLElement) => {
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = '12px';

            const header = document.createElement('div');
            header.textContent = title;
            header.style.fontWeight = '600';
            header.style.fontSize = '12px';
            header.style.margin = '8px 0';

            wrapper.appendChild(header);
            wrapper.appendChild(container);
            return wrapper;
        };

        panel.appendChild(section('Legend', legendContainer));
        panel.appendChild(section('Layers', layerListContainer));
        panel.appendChild(section('Basemaps', basemapContainer));

        const layerList = new LayerList({ view, container: layerListContainer });
        const legend = new Legend({ view, container: legendContainer });
        const basemapGallery = new BasemapGallery({ view, container: basemapContainer });

        const expand = new Expand({
            view,
            content: panel,
            expanded: false,
            expandTooltip: 'Map controls',
        });
        view.ui.add(expand, 'top-right');

        // Make sure widgets are destroyed with the view
        return () => {
            onPointerMove.remove();
            onCreate.remove();
            onUpdate.remove();
            onDelete.remove();
            basemapGallery.destroy();
            legend.destroy();
            layerList.destroy();
            expand.destroy();
            sketch.destroy();
            fullscreen.destroy();
            view.destroy();
        };
    }, []);

    // Re-center camera + update mock layer geometries when region changes
    useEffect(() => {
        if (!viewRef.current || viewRef.current.destroyed) return;

        viewRef.current.goTo({
            center: getRegionCenter(region),
            zoom: REGION_CONFIG[region].zoom,
            tilt: 55,
        }, { duration: 900 }).catch((error) => {
            if (error?.name !== 'AbortError') {
                console.error('SceneView goTo error:', error);
            }
        });

        const polygon = new Polygon({ rings: getRegionRings(region) });
        for (const layer of Object.values(layersRef.current)) {
            // Only update our mock scenario layers; do not touch user-drawn polygons.
            if (layer.id === 'User_Polygons') continue;
            layer.graphics.forEach((g) => {
                g.geometry = polygon;
            });
        }
    }, [region]);

    // Switching between demo/auth should show/hide persisted polygons.
    useEffect(() => {
        const sketchLayer = layersRef.current['User_Polygons'];
        if (!sketchLayer) return;

        sketchLayer.removeAll();
        setAoiPolygons([]);
        if (mode !== 'authenticated' || !user) return;

        const key = getPolygonsStorageKey(user.userId);
        try {
            const raw = window.localStorage.getItem(key);
            if (!raw) return;
            const parsed = JSON.parse(raw) as unknown;
            if (!Array.isArray(parsed)) return;

            const polys = parsed as StoredPolygon[];
            const graphics = hydratePolygons(polys).map((props) => new Graphic(props));
            sketchLayer.addMany(graphics);
            setAoiPolygons(polys);
        } catch {
            // ignore parse errors
        }
    }, [mode, user, setAoiPolygons]);

    // Visibility strategy: toggle layers instead of reloading
    useEffect(() => {
        if (!viewRef.current || viewRef.current.destroyed) return;

        const map = viewRef.current.map;

        map?.layers.forEach((lyr) => {
            if (lyr.type !== 'graphics') return;
            if (lyr.id === 'User_Polygons') return; // always visible

            lyr.visible = false;

            if (activeLayer === 'Depth') {
                if (lyr.id === `Depth_${scenario}`) lyr.visible = true;
            } else if (activeLayer === 'Risk') {
                if (lyr.id === `Risk_${scenario}`) lyr.visible = true;
            } else if (activeLayer === 'Velocity') {
                if (lyr.id === `Velocity_${scenario}`) lyr.visible = true;
            }
        });
    }, [scenario, activeLayer]);

    return (
        <div className="flex-1 h-full relative bg-muted/30 dark:bg-muted/20 rounded-xl overflow-hidden shadow-lg border-2 border-border group hover:shadow-2xl transition-all duration-500 hover:border-blue-300">
            <div ref={mapDiv} className="w-full h-full" />

            {/* Professional Overlay Badge */}
            <div className="absolute top-4 left-4 glass px-4 py-2 rounded-lg text-sm font-medium shadow-lg border border-white/50 flex flex-col gap-1 animate-slide-up hover-scale backdrop-blur-xl">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                    3D Scene • Current Layer
                </span>
                <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${activeLayer === 'Risk' ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-blue-600 shadow-lg shadow-blue-600/50'}`}></span>
                    <span className="font-bold">{activeLayer} Analysis</span>
                    <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">({scenario})</span>
                </div>
            </div>

            <div className="absolute bottom-6 left-4 glass px-3 py-1.5 text-[10px] text-muted-foreground rounded-full border border-white/50 pointer-events-none shadow-md backdrop-blur-xl">
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Terrain enabled • Draw polygons • Fullscreen available
                </span>
            </div>

        </div>
    );
}

export function MapComponent() {
    const provider = (import.meta.env.VITE_MAP_PROVIDER as string | undefined)?.toLowerCase();

    // If explicitly set, honor it.
    if (provider === 'google') return <GoogleEarthMap />;
    if (provider === 'arcgis') return <ArcGISMapComponent />;

    // Auto: prefer Google if a key is provided, otherwise ArcGIS.
    const hasGoogleKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
    return hasGoogleKey ? <GoogleEarthMap /> : <ArcGISMapComponent />;
}
