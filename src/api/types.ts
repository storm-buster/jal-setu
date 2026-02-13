import type { AoiPolygon, MlFeatures, Region, Scenario, TifMetadata } from '@/store/useStore';

export type RiskSummary = {
  area: number;
  population: number;
  riskScore: number;
  embankmentStatus: string;
};

export type AnalyzeRegionRequest = {
  region: Region;
  scenario: Scenario;
  aoiPolygons?: AoiPolygon[];
  mlFeatures?: MlFeatures;
};

export type AnalyzeRegionResponse = {
  risk: RiskSummary;
  featureImportance: Array<{ name: string; importance: number; fill: string }>;
  impactComparison: Array<{ name: string; area: number; risk: number }>;
};

export type TerrainProfileResponse = {
  region: Region;
  profile: number[];
};

export type ReportRequest = {
  region: Region;
  scenario: Scenario;
  uploadedFile: TifMetadata | null;
  aoiPolygons?: AoiPolygon[];
  mlFeatures?: MlFeatures;
};

export type RiskSummaryRequest = {
  region: Region;
  scenario: Scenario;
  aoiPolygons?: AoiPolygon[];
  mlFeatures?: MlFeatures;
};

export type ReportResponse = {
  alertId: string;
  timestamp: string;
  report: string;
};

// GeoJSON types for river geometry
export type GeoJSONGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][];
};

export type GeoJSONFeature = {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: {
    river_name: string;
    buffer_km: number;
    flood_prone: boolean;
    river_width_m?: number;
    scenario: Scenario;
    region: Region;
  };
};

export type GeoJSONFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
};

export type RiverGeometryResponse = {
  region: Region;
  scenario: Scenario;
  geometry: GeoJSONFeatureCollection;
  metadata: {
    buffer_km: number;
    river_count: number;
    generated_at: string;
    error?: string;
  };
};
