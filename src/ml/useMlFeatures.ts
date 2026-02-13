import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { buildMlFeatures } from './mlFeatures';

export function useMlFeatures() {
  const { mlEnabled, region, scenario, mapSample, tiffStats, tiffFeatureKey, mlManualOverrides } = useStore();

  return useMemo(() => {
    if (!mlEnabled) return undefined;

    return buildMlFeatures({
      region,
      scenario,
      mapSample,
      tiffStats,
      tiffFeatureKey,
      manualOverrides: mlManualOverrides,
    });
  }, [mlEnabled, region, scenario, mapSample, tiffStats, tiffFeatureKey, mlManualOverrides]);
}
