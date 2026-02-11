import type { AoiPolygon, Region, Scenario, TifMetadata } from '@/store/useStore';

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
};

export type RiskSummaryRequest = {
  region: Region;
  scenario: Scenario;
  aoiPolygons?: AoiPolygon[];
};

export type ReportResponse = {
  alertId: string;
  timestamp: string;
  report: string;
};
