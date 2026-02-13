import { create } from 'zustand';

export type Region = 'Bihar' | 'Uttarakhand' | 'Jharkhand' | 'Uttar Pradesh';
export type Scenario = '0m' | '1m' | '2m';
export type LayerType = 'Depth' | 'Risk' | 'Velocity' | 'Population';

export type AoiPolygon = {
    rings: number[][][];
    wkid?: number;
};

export interface TifMetadata {
    name: string;
    width: number;
    height: number;
    bands: number;
    size: number;
}

export type MlFeatures = {
    elevation: number;
    slope: number;
    flow_accumulation: number;
    distance_to_river: number;
    flood_depth: number;
    lulc_agriculture: number;
    lulc_urban: number;
    population_density: number;
    velocity_index: number;

    location_name?: string | null;
    district?: string | null;
    state?: string | null;
};

export type MlNumericFeatureKey =
    | 'elevation'
    | 'slope'
    | 'flow_accumulation'
    | 'distance_to_river'
    | 'flood_depth'
    | 'lulc_agriculture'
    | 'lulc_urban'
    | 'population_density'
    | 'velocity_index';

export type RasterStats = {
    mean: number;
    min: number;
    max: number;
    sampleCount: number;
};

export type MapSample = {
    lon: number;
    lat: number;
    elevationM: number | null;
};

interface AppState {
    region: Region;
    scenario: Scenario;
    activeLayer: LayerType;

    // Optional ML inference (wtf2 model) inputs
    mlEnabled: boolean;
    mlManualOverrides: Partial<MlFeatures>;

    // Auto-derived inputs
    mapSample: MapSample | null;
    tiffStats: RasterStats | null;
    tiffFeatureKey: MlNumericFeatureKey;

    uploadedFile: TifMetadata | null;
    aoiPolygons: AoiPolygon[];

    setRegion: (region: Region) => void;
    setScenario: (scenario: Scenario) => void;
    setActiveLayer: (layer: LayerType) => void;

    setMlEnabled: (enabled: boolean) => void;
    setMlManualOverride: <K extends keyof MlFeatures>(key: K, value: MlFeatures[K] | undefined) => void;
    resetMlManualOverrides: () => void;

    setMapSample: (sample: MapSample | null) => void;
    setTiffStats: (stats: RasterStats | null) => void;
    setTiffFeatureKey: (key: MlNumericFeatureKey) => void;

    setUploadedFile: (file: TifMetadata | null) => void;
    setAoiPolygons: (polygons: AoiPolygon[]) => void;
}

export const useStore = create<AppState>((set) => ({
    region: 'Bihar',
    scenario: '0m',
    activeLayer: 'Depth',

    mlEnabled: false,
    mlManualOverrides: {},

    mapSample: null,
    tiffStats: null,
    tiffFeatureKey: 'elevation',

    uploadedFile: null,
    aoiPolygons: [],

    setRegion: (region) => set({ region }),
    setScenario: (scenario) => set({ scenario }),
    setActiveLayer: (activeLayer) => set({ activeLayer }),

    setMlEnabled: (mlEnabled) => set({ mlEnabled }),
    setMlManualOverride: (key, value) =>
        set((s) => {
            const next = { ...s.mlManualOverrides };
            if (value === undefined) {
                delete (next as Record<string, unknown>)[String(key)];
            } else {
                (next as Record<string, unknown>)[String(key)] = value;
            }
            return { mlManualOverrides: next };
        }),
    resetMlManualOverrides: () => set({ mlManualOverrides: {} }),

    setMapSample: (mapSample) => set({ mapSample }),
    setTiffStats: (tiffStats) => set({ tiffStats }),
    setTiffFeatureKey: (tiffFeatureKey) => set({ tiffFeatureKey }),

    setUploadedFile: (uploadedFile) => set({ uploadedFile }),
    setAoiPolygons: (aoiPolygons) => set({ aoiPolygons }),
}));
