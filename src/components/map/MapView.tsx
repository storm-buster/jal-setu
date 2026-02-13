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
import { getRiverGeometry } from '@/api/floodApi';
import type { GeoJSONFeatureCollection } from '@/api/types';

type RegionConfig = {
    center: [number, number];
    zoom: number;
};

const REGION_CONFIG: Record<Region, RegionConfig> = {
    Bihar: {
        center: [85.3131, 25.0961],
        zoom: 8,
    },
    Uttarakhand: {
        center: [79.0193, 30.0668],
        zoom: 9,
    },
    Jharkhand: {
        center: [85.2799, 23.6102],
        zoom: 8,
    },
    'Uttar Pradesh': {
        center: [80.9462, 26.8467],
        zoom: 7,
    },
};

function getRegionCenter(region: Region): [number, number] {
    return REGION_CONFIG[region].center;
}

function depthMetersFromScenario(s: Scenario): number {
    if (s === '0m') return 0;
    if (s === '1m') return 1;
    return 2;
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

function convertGeoJSONToPolygons(geojson: GeoJSONFeatureCollection): __esri.Polygon[] {
    /**
     * Converts GeoJSON FeatureCollection to ArcGIS Polygon array.
     * Handles both Polygon and MultiPolygon geometry types.
     */
    const polygons: __esri.Polygon[] = [];

    for (const feature of geojson.features) {
        if (!feature.geometry || !feature.geometry.coordinates) continue;

        try {
            const polygon = new Polygon({
                rings: feature.geometry.coordinates as number[][][],
                spatialReference: { wkid: 4326 }, // WGS84
            });
            polygons.push(polygon);
        } catch (error) {
            console.warn('Failed to convert GeoJSON feature to polygon:', error);
        }
    }

    return polygons;
}

async function loadRiverGeometry(region: Region, scenario: Scenario): Promise<__esri.Polygon[]> {
    /**
     * Fetches river geometry from the backend and converts to ArcGIS Polygons.
     * Returns empty array on error or for 0m scenario.
     */
    if (scenario === '0m') {
        return []; // No flooding for 0m scenario
    }

    try {
        const response = await getRiverGeometry(region, scenario);
        return convertGeoJSONToPolygons(response.geometry);
    } catch (error) {
        console.error('Failed to load river geometry:', error);
        return [];
    }
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

    const { region, activeLayer, scenario, setAoiPolygons, setMapSample } = useStore();
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

        // User-drawn polygons (Created synchronously so it's available for the Sketch widget)
        const sketchLayer = new GraphicsLayer({
            id: 'User_Polygons',
            title: 'User Polygons',
            elevationInfo: { mode: 'on-the-ground' },
            visible: true,
        });

        // --- MOCK LAYERS (Depth + Risk + Velocity) ---
        const createScenarioLayer = async (
            id: string,
            title: string,
            color: number[],
            extrudeMeters: number,
            region: Region,
            scenario: Scenario
        ) => {
            const layer = new GraphicsLayer({
                id,
                title,
                visible: false,
                elevationInfo: { mode: 'on-the-ground' },
            });

            // Load river-based geometries
            const polygons = await loadRiverGeometry(region, scenario);

            // Create a graphic for each river polygon
            polygons.forEach(polygon => {
                const graphic = new Graphic({
                    geometry: polygon,
                    symbol: createExtrudedSymbol(color, extrudeMeters),
                });
                layer.add(graphic);
            });

            return layer;
        };

        // Create all layers asynchronously with river geometries
        const initializeLayers = async () => {
            // Depth layers (include 0m so the UI always maps to a layer id)
            // 0m: Light Blue (Normal), 1m: Medium Blue, 2m: Deep Navy
            const depth0 = await createScenarioLayer('Depth_0m', 'Flood Depth (0m)', [100, 181, 246], 10, initialRegionRef.current, '0m');
            const depth1 = await createScenarioLayer('Depth_1m', 'Flood Depth (1m)', [33, 150, 243], 600, initialRegionRef.current, '1m');
            const depth2 = await createScenarioLayer('Depth_2m', 'Flood Depth (2m)', [13, 71, 161], 1200, initialRegionRef.current, '2m');

            // Risk layers - scenario-aware with river geometries
            // 0m: Green (Safe), 1m: Orange (Warning), 2m: Red (Critical)
            const risk0 = await createScenarioLayer('Risk_0m', 'Risk (0m)', [76, 175, 80], 50, initialRegionRef.current, '0m');
            const risk1 = await createScenarioLayer('Risk_1m', 'Risk (1m)', [255, 152, 0], 140, initialRegionRef.current, '1m');
            const risk2 = await createScenarioLayer('Risk_2m', 'Risk (2m)', [211, 47, 47], 200, initialRegionRef.current, '2m');

            // Velocity layers - scenario-aware with river geometries
            // 0m: Blue-Purple (Low), 1m: Purple (Med), 2m: Deep Violet/Indigo (High)
            const vel0 = await createScenarioLayer('Velocity_0m', 'Velocity (0m)', [179, 157, 219], 60, initialRegionRef.current, '0m');
            const vel1 = await createScenarioLayer('Velocity_1m', 'Velocity (1m)', [124, 77, 255], 160, initialRegionRef.current, '1m');
            const vel2 = await createScenarioLayer('Velocity_2m', 'Velocity (2m)', [101, 31, 255], 240, initialRegionRef.current, '2m');

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
        };

        // Initialize layers asynchronously
        initializeLayers().catch(error => {
            console.error('Failed to initialize map layers:', error);
        });

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

                // Flood depth: check if cursor is over a flood layer using hitTest
                let depthM = 0;
                try {
                    const hitResponse = await viewRef.current.hitTest({ x, y });
                    if (hitResponse.results.length > 0) {
                        for (const result of hitResponse.results) {
                            if (result.type === 'graphic') {
                                const graphic = result.graphic;
                                const layerId = graphic.layer?.id;

                                // Check if this is a flood layer (Depth, Risk, or Velocity)
                                const layerIdStr = typeof layerId === 'string' ? layerId : String(layerId);
                                if (layerIdStr && (layerIdStr.startsWith('Depth_') || layerIdStr.startsWith('Risk_') || layerIdStr.startsWith('Velocity_'))) {
                                    // Extract scenario from layer ID
                                    const parts = layerIdStr.split('_');
                                    if (parts.length >= 2) {
                                        const scenario = parts[1] as Scenario;
                                        depthM = depthMetersFromScenario(scenario);
                                        break; // Found a flood layer, use its depth
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    // If hitTest fails, fall back to 0m
                    depthM = 0;
                }

                // Save last map sample for ML auto-fill.
                setMapSample({ lon, lat, elevationM });

                const content = `
<div style="font-size:12px;line-height:1.4">
  <div><b>Lon/Lat</b>: <span style="font-family:monospace">${lon.toFixed(5)}, ${lat.toFixed(5)}</span></div>
  <div><b>Terrain</b>: <span style="font-family:monospace">${elevationM == null ? '—' : `${Math.round(elevationM)} m`}</span></div>
  <div><b>Depth</b>: <span style="font-family:monospace">${depthM} m</span></div>
</div>`;

                if (!view.popup || typeof view.popup.open !== 'function') return;

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

    // Re-center camera + reload river geometries when region changes
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

        // Reload all scenario layers with new river geometries for the selected region
        const reloadLayers = async () => {
            for (const [layerId, layer] of Object.entries(layersRef.current)) {
                // Skip user-drawn polygons
                if (layerId === 'User_Polygons') continue;

                // Extract scenario from layer ID (e.g., "Depth_1m" -> "1m")
                const parts = layerId.split('_');
                if (parts.length < 2) continue;
                const scenario = parts[1] as Scenario;

                // Store the current symbol for reuse
                const existingSymbol = layer.graphics.length > 0
                    ? layer.graphics.getItemAt(0)?.symbol // Fix undefined check here
                    : null;

                // Clear existing graphics
                layer.removeAll();

                // Load new river geometries for this region/scenario
                const polygons = await loadRiverGeometry(region, scenario);

                // Add new graphics with river geometries
                polygons.forEach(polygon => {
                    const graphic = new Graphic({
                        geometry: polygon,
                        symbol: existingSymbol || createExtrudedSymbol([100, 100, 100], 100),
                    });
                    layer.add(graphic);
                });
            }
        };

        reloadLayers().catch(error => {
            console.error('Failed to reload river geometries:', error);
        });
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
