import { useEffect, useRef } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useStore, type Region, type Scenario } from '@/store/useStore';

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const mapId = import.meta.env.VITE_GOOGLE_MAP_ID as string | undefined;

const REGION_CENTER: Record<Region, google.maps.LatLngLiteral> = {
  Bihar: { lng: 85.3131, lat: 25.0961 },
  Uttarakhand: { lng: 79.0193, lat: 30.0668 },
  Jharkhand: { lng: 85.2799, lat: 23.6102 },
  'Uttar Pradesh': { lng: 80.9462, lat: 26.8467 },
};

function getRegionCenter(region: Region): google.maps.LatLngLiteral {
  return REGION_CENTER[region];
}

function depthMetersFromScenario(s: Scenario): number {
  if (s === '0m') return 0;
  if (s === '1m') return 1;
  return 2;
}

export function GoogleEarthMap() {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const elevationRef = useRef<google.maps.ElevationService | null>(null);

  const regionRef = useRef<Region>('Bihar');
  const scenarioRef = useRef<Scenario>('0m');

  const { region, scenario } = useStore();

  useEffect(() => {
    regionRef.current = region;
    scenarioRef.current = scenario;
  }, [region, scenario]);

  useEffect(() => {
    if (!divRef.current) return;
    if (!apiKey) return;

    let listeners: google.maps.MapsEventListener[] = [];

    let cancelled = false;

    setOptions({
      key: apiKey,
      v: 'weekly',
      mapIds: mapId ? [mapId] : undefined,
    });

    (async () => {
      try {
        const { Map } = await importLibrary('maps');
        await importLibrary('elevation');

        if (cancelled) return;

        const map = new Map(divRef.current!, {
          center: getRegionCenter(regionRef.current),
          zoom: 9,
          mapId,
          mapTypeId: google.maps.MapTypeId.HYBRID,
          heading: 0,
          tilt: 67.5,
          disableDefaultUI: false,
          fullscreenControl: true,
          mapTypeControl: true,
          streetViewControl: false,
        });

        mapRef.current = map;
        infoRef.current = new google.maps.InfoWindow({
          disableAutoPan: true,
        });
        elevationRef.current = new google.maps.ElevationService();

        // Hover readout (throttled): elevation + scenario depth
        let timer: number | null = null;
        listeners.push(
          google.maps.event.addListener(map, 'mousemove', (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            if (timer != null) return;

            const latLng = e.latLng;
            timer = window.setTimeout(() => {
              timer = null;

              const elevationService = elevationRef.current;
              const info = infoRef.current;
              if (!elevationService || !info) return;

              const depthM = depthMetersFromScenario(scenarioRef.current);

              elevationService.getElevationForLocations(
                { locations: [latLng] },
                (results: google.maps.ElevationResult[] | null, status: google.maps.ElevationStatus) => {
                  const elev =
                    status === 'OK' && results && results[0] ? Math.round(results[0].elevation) : null;

                  const content = `
                    <div style="font-size:12px;line-height:1.4">
                      <div><b>Lon/Lat</b>: <span style="font-family:monospace">${latLng.lng().toFixed(5)}, ${latLng.lat().toFixed(5)}</span></div>
                      <div><b>Terrain</b>: <span style="font-family:monospace">${elev == null ? '—' : `${elev} m`}</span></div>
                      <div><b>Depth</b>: <span style="font-family:monospace">${depthM} m</span></div>
                    </div>
                  `;

                  info.setContent(content);
                  info.setPosition(latLng);
                  info.open({ map });
                }
              );
            }, 150);
          })
        );
      } catch (err: unknown) {
        console.error('Google Maps load failed:', err);
      }
    })();

    return () => {
      cancelled = true;
      listeners.forEach((l) => l.remove());
      listeners = [];
      mapRef.current = null;
      infoRef.current = null;
      elevationRef.current = null;
    };
  }, []);

  // Respond to region changes with a smooth-ish pan.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo(getRegionCenter(region));
  }, [region]);

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Missing VITE_GOOGLE_MAPS_API_KEY. Add it to your environment to enable Google Earth-style 3D map.
      </div>
    );
  }

  return <div ref={divRef} className="w-full h-full" />;
}
