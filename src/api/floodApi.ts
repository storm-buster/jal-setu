import type { Region, Scenario } from '@/store/useStore';
import { apiFetch } from './client';
import type {
  AnalyzeRegionRequest,
  AnalyzeRegionResponse,
  ReportRequest,
  ReportResponse,
  RiskSummary,
  RiskSummaryRequest,
  TerrainProfileResponse,
} from './types';

export function getRiskSummary(region: Region, scenario: Scenario, opts?: { aoiPolygons?: RiskSummaryRequest['aoiPolygons'] }) {
  // Backwards-compatible: if no AOI is provided, keep the GET endpoint.
  if (!opts?.aoiPolygons || opts.aoiPolygons.length === 0) {
    const params = new URLSearchParams({ region, scenario });
    return apiFetch<RiskSummary>(`/api/risk-summary?${params.toString()}`);
  }

  const body: RiskSummaryRequest = { region, scenario, aoiPolygons: opts.aoiPolygons };
  return apiFetch<RiskSummary>('/api/risk-summary', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function analyzeRegion(payload: AnalyzeRegionRequest) {
  return apiFetch<AnalyzeRegionResponse>('/api/analyze-region', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getTerrainProfile(region: Region) {
  const params = new URLSearchParams({ region });
  return apiFetch<TerrainProfileResponse>(`/api/terrain-profile?${params.toString()}`);
}

export function createReport(payload: ReportRequest) {
  const body: Omit<ReportRequest, 'uploadedFile'> & { uploadedFile?: ReportRequest['uploadedFile'] } = {
    region: payload.region,
    scenario: payload.scenario,
    uploadedFile: payload.uploadedFile ?? undefined,
    aoiPolygons: payload.aoiPolygons && payload.aoiPolygons.length > 0 ? payload.aoiPolygons : undefined,
  };

  return apiFetch<ReportResponse>('/api/report', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
