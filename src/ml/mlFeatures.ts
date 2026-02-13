import type {
  MapSample,
  MlFeatures,
  MlNumericFeatureKey,
  RasterStats,
  Region,
  Scenario,
} from '@/store/useStore';

const REGION_BASELINES: Record<Region, Omit<MlFeatures, 'flood_depth'>> = {
  Bihar: {
    elevation: 120,
    slope: 2.8,
    flow_accumulation: 2600,
    distance_to_river: 140,
    lulc_agriculture: 0.72,
    lulc_urban: 0.18,
    population_density: 1100,
    velocity_index: 0.55,
    location_name: 'Bihar',
    district: null,
    state: 'Bihar',
  },
  Uttarakhand: {
    elevation: 650,
    slope: 18,
    flow_accumulation: 1400,
    distance_to_river: 220,
    lulc_agriculture: 0.35,
    lulc_urban: 0.1,
    population_density: 260,
    velocity_index: 0.75,
    location_name: 'Uttarakhand',
    district: null,
    state: 'Uttarakhand',
  },
  Jharkhand: {
    elevation: 180,
    slope: 6,
    flow_accumulation: 2100,
    distance_to_river: 180,
    lulc_agriculture: 0.55,
    lulc_urban: 0.16,
    population_density: 600,
    velocity_index: 0.58,
    location_name: 'Jharkhand',
    district: null,
    state: 'Jharkhand',
  },
  'Uttar Pradesh': {
    elevation: 110,
    slope: 2.2,
    flow_accumulation: 3000,
    distance_to_river: 120,
    lulc_agriculture: 0.65,
    lulc_urban: 0.22,
    population_density: 1200,
    velocity_index: 0.62,
    location_name: 'Uttar Pradesh',
    district: null,
    state: 'Uttar Pradesh',
  },
};

export function scenarioToFloodDepth(s: Scenario): number {
  if (s === '0m') return 0;
  if (s === '1m') return 1;
  return 2;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function applyTiffFeature(ml: MlFeatures, key: MlNumericFeatureKey, stats: RasterStats): MlFeatures {
  const mean = stats.mean;

  if (key === 'lulc_agriculture' || key === 'lulc_urban' || key === 'velocity_index') {
    return { ...ml, [key]: clamp01(mean) } as MlFeatures;
  }

  if (key === 'slope') {
    return { ...ml, slope: Math.max(0, mean) };
  }

  if (key === 'distance_to_river' || key === 'flow_accumulation' || key === 'population_density') {
    return { ...ml, [key]: Math.max(0, mean) } as MlFeatures;
  }

  if (key === 'flood_depth') {
    return { ...ml, flood_depth: Math.max(0, mean) };
  }

  // elevation
  return { ...ml, elevation: Math.max(1, mean) };
}

function applyMapSample(ml: MlFeatures, sample: MapSample): MlFeatures {
  if (sample.elevationM == null) return ml;
  return {
    ...ml,
    elevation: Math.max(1, sample.elevationM),
    location_name: `Map sample (${sample.lon.toFixed(4)}, ${sample.lat.toFixed(4)})`,
  };
}

export function buildMlFeatures(params: {
  region: Region;
  scenario: Scenario;
  mapSample: MapSample | null;
  tiffStats: RasterStats | null;
  tiffFeatureKey: MlNumericFeatureKey;
  manualOverrides: Partial<MlFeatures>;
}): MlFeatures {
  const { region, scenario, mapSample, tiffStats, tiffFeatureKey, manualOverrides } = params;

  let ml: MlFeatures = {
    ...REGION_BASELINES[region],
    flood_depth: scenarioToFloodDepth(scenario),
  };

  if (mapSample) ml = applyMapSample(ml, mapSample);
  if (tiffStats) ml = applyTiffFeature(ml, tiffFeatureKey, tiffStats);

  // Manual overrides win last (except flood_depth; scenario controls it).
  ml = { ...ml, ...manualOverrides };

  // Scenario is the single source of truth for flood depth in this UI.
  ml.flood_depth = scenarioToFloodDepth(scenario);

  // Final clamps/sanity.
  ml.lulc_agriculture = clamp01(ml.lulc_agriculture);
  ml.lulc_urban = clamp01(ml.lulc_urban);
  ml.velocity_index = clamp01(ml.velocity_index);
  ml.slope = Math.max(0, ml.slope);
  ml.flood_depth = Math.max(0, ml.flood_depth);
  ml.elevation = Math.max(1, ml.elevation);
  ml.flow_accumulation = Math.max(0.0001, ml.flow_accumulation);
  ml.population_density = Math.max(0.0001, ml.population_density);
  ml.distance_to_river = Math.max(0, ml.distance_to_river);

  // Keep consistent
  if (!ml.state) ml.state = region;

  return ml;
}
