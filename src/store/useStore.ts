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

interface AppState {
    region: Region;
    scenario: Scenario;
    activeLayer: LayerType;
    uploadedFile: TifMetadata | null;
    aoiPolygons: AoiPolygon[];
    setRegion: (region: Region) => void;
    setScenario: (scenario: Scenario) => void;
    setActiveLayer: (layer: LayerType) => void;
    setUploadedFile: (file: TifMetadata | null) => void;
    setAoiPolygons: (polygons: AoiPolygon[]) => void;
}

export const useStore = create<AppState>((set) => ({
    region: 'Bihar',
    scenario: '0m',
    activeLayer: 'Depth',
    uploadedFile: null,
    aoiPolygons: [],
    setRegion: (region) => set({ region }),
    setScenario: (scenario) => set({ scenario }),
    setActiveLayer: (activeLayer) => set({ activeLayer }),
    setUploadedFile: (uploadedFile) => set({ uploadedFile }),
    setAoiPolygons: (aoiPolygons) => set({ aoiPolygons }),
}));
