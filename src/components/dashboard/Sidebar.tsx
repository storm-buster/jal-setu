import type { ChangeEvent } from 'react';
import { useStore, type MlFeatures, type MlNumericFeatureKey, type Region, type LayerType, type Scenario } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Zap, Waves, AlertTriangle, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TiffUploader } from './TiffUploader';

interface SidebarProps {
    className?: string;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
}

export function Sidebar({ className, collapsed = false, onToggleCollapsed }: SidebarProps) {
    const {
        region,
        setRegion,
        scenario,
        setScenario,
        activeLayer,
        setActiveLayer,
        mlEnabled,
        setMlEnabled,
        mlManualOverrides,
        setMlManualOverride,
        resetMlManualOverrides,
        mapSample,
        tiffStats,
        tiffFeatureKey,
        setTiffFeatureKey,
    } = useStore();

    const setNum = (key: MlNumericFeatureKey) => (e: ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setMlManualOverride(key, raw === '' ? undefined : Number(raw));
    };

    const setStr = (key: 'location_name' | 'district' | 'state') => (e: ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setMlManualOverride(key, raw === '' ? undefined : raw);
    };

    const overrideValue = <K extends keyof MlFeatures>(key: K) => {
        const v = mlManualOverrides[key];
        return v == null ? '' : String(v);
    };

    return (
        <div
            className={cn(
                collapsed
                    ? 'w-16 h-full p-2 flex flex-col gap-3 overflow-y-auto'
                    : 'w-full h-full p-4 flex flex-col gap-4 overflow-y-auto',
                className
            )}
        >
            <div className={cn('flex items-center px-1 py-1', collapsed ? 'justify-center' : 'gap-2')}>
                <Waves className={cn('text-primary', collapsed ? 'w-7 h-7' : 'w-8 h-8')} />
                {!collapsed && (
                    <div>
                        <h1 className="text-base font-semibold tracking-wide">Operational controls</h1>
                        <p className="text-[11px] text-muted-foreground">Region • scenario • layers • reporting</p>
                    </div>
                )}

                {onToggleCollapsed && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("ml-auto", collapsed && "ml-0")}
                        onClick={onToggleCollapsed}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                    </Button>
                )}
            </div>

            {collapsed ? (
                <div className="flex flex-col gap-2 items-center">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={onToggleCollapsed}
                        aria-label="Open controls"
                        title="Open controls"
                    >
                        <PanelLeftOpen className="h-4 w-4" />
                    </Button>
                    <div className="text-[10px] text-muted-foreground text-center leading-snug px-1">
                        Controls
                    </div>
                </div>
            ) : (
                <>

            <Card className="border border-border shadow-sm">
                <CardContent className="p-4 space-y-3">
                    <div className="text-sm font-semibold">Select region</div>

                    <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value as Region)}
                        className={cn(
                            'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none',
                            'focus:ring-2 focus:ring-ring'
                        )}
                        aria-label="Select region"
                    >
                        <option value="Bihar">Bihar</option>
                        <option value="Uttarakhand">Uttarakhand</option>
                        <option value="Jharkhand">Jharkhand</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                    </select>

                    <div className="text-xs text-muted-foreground">Select an operational geography for the dashboard.</div>
                </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Scenario impact</div>
                        <span className="text-xs font-mono bg-accent/30 px-2 py-1 rounded text-primary">+{scenario}</span>
                    </div>
                    <Slider
                        min={0}
                        max={2}
                        step={1}
                        value={[parseInt(scenario)]}
                        onValueChange={(val) => setScenario(`${val[0]}m` as Scenario)}
                        className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">Flood depth simulation (0m = Normal, +1m, +2m)</p>
                </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
                <CardContent className="p-4 space-y-3">
                    <div className="text-sm font-semibold">Custom analysis upload</div>
                    <TiffUploader />
                </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold">ML inference (wtf2)</div>
                            <div className="text-[11px] text-muted-foreground">Combine Map + GeoTIFF + Manual inputs</div>
                        </div>
                        <Button
                            variant={mlEnabled ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setMlEnabled(!mlEnabled)}
                            title={mlEnabled ? 'Disable ML inference' : 'Enable ML inference'}
                        >
                            {mlEnabled ? 'ML: ON' : 'ML: OFF'}
                        </Button>
                    </div>

                    <div className="space-y-1 text-[11px] text-muted-foreground">
                        <div>
                            <span className="font-medium text-foreground">Map sample:</span>{' '}
                            {mapSample ? `${mapSample.elevationM == null ? '—' : `${Math.round(mapSample.elevationM)} m`} @ ${mapSample.lon.toFixed(3)}, ${mapSample.lat.toFixed(3)}` : '—'}
                        </div>
                        <div>
                            <span className="font-medium text-foreground">GeoTIFF mean:</span>{' '}
                            {tiffStats ? `${tiffStats.mean.toFixed(3)} (min ${tiffStats.min.toFixed(3)}, max ${tiffStats.max.toFixed(3)})` : '—'}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium">GeoTIFF maps to</label>
                        <select
                            value={tiffFeatureKey}
                            onChange={(e) => setTiffFeatureKey(e.target.value as MlNumericFeatureKey)}
                            className={cn(
                                'h-9 w-full rounded-md border border-input bg-background px-3 text-xs outline-none',
                                'focus:ring-2 focus:ring-ring'
                            )}
                            aria-label="Select which ML feature the GeoTIFF mean should populate"
                        >
                            <option value="elevation">elevation</option>
                            <option value="slope">slope</option>
                            <option value="flow_accumulation">flow_accumulation</option>
                            <option value="distance_to_river">distance_to_river</option>
                            <option value="lulc_agriculture">lulc_agriculture</option>
                            <option value="lulc_urban">lulc_urban</option>
                            <option value="population_density">population_density</option>
                            <option value="velocity_index">velocity_index</option>
                        </select>
                        {!tiffStats && (
                            <div className="text-[10px] text-muted-foreground">
                                Upload a GeoTIFF to compute a mean value; your selection will be applied after upload.
                            </div>
                        )}
                    </div>

                    <details className="rounded-md border border-border p-3 bg-background/50">
                        <summary className="cursor-pointer text-xs font-semibold">Manual overrides</summary>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <label className="text-[10px] text-muted-foreground">
                                elevation
                                <input className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs" value={overrideValue('elevation')} onChange={setNum('elevation')} />
                            </label>
                            <label className="text-[10px] text-muted-foreground">
                                slope
                                <input className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs" value={overrideValue('slope')} onChange={setNum('slope')} />
                            </label>
                            <label className="text-[10px] text-muted-foreground">
                                flow_accumulation
                                <input className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs" value={overrideValue('flow_accumulation')} onChange={setNum('flow_accumulation')} />
                            </label>
                            <label className="text-[10px] text-muted-foreground">
                                distance_to_river
                                <input className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs" value={overrideValue('distance_to_river')} onChange={setNum('distance_to_river')} />
                            </label>
                            <label className="text-[10px] text-muted-foreground">
                                population_density
                                <input className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs" value={overrideValue('population_density')} onChange={setNum('population_density')} />
                            </label>
                            <label className="text-[10px] text-muted-foreground">
                                velocity_index
                                <input className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs" value={overrideValue('velocity_index')} onChange={setNum('velocity_index')} />
                            </label>
                            <label className="text-[10px] text-muted-foreground">
                                lulc_agriculture
                                <input className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs" value={overrideValue('lulc_agriculture')} onChange={setNum('lulc_agriculture')} />
                            </label>
                            <label className="text-[10px] text-muted-foreground">
                                lulc_urban
                                <input className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs" value={overrideValue('lulc_urban')} onChange={setNum('lulc_urban')} />
                            </label>
                            <label className="text-[10px] text-muted-foreground col-span-2">
                                location_name
                                <input className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs" value={overrideValue('location_name')} onChange={setStr('location_name')} />
                            </label>
                        </div>

                        <div className="mt-3 flex gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={resetMlManualOverrides}>
                                Reset overrides
                            </Button>
                        </div>
                    </details>

                    <div className="text-[10px] text-muted-foreground">
                        When ML is ON, the frontend sends a full feature vector to the backend, which runs the wtf2 model.
                        Flood depth comes from the Scenario slider (0m/1m/2m).
                    </div>
                </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
                <CardContent className="p-4 space-y-3">
                    <div className="text-sm font-semibold">Layer visualization</div>
                    <div className="flex flex-col gap-2">
                        {(['Depth', 'Risk', 'Velocity'] as LayerType[]).map((layer) => (
                            <Button
                                key={layer}
                                variant={activeLayer === layer ? 'secondary' : 'outline'}
                                className="justify-start gap-2"
                                onClick={() => setActiveLayer(layer)}
                            >
                                {layer === 'Depth' && <Waves className="w-4 h-4" />}
                                {layer === 'Risk' && <AlertTriangle className="w-4 h-4" />}
                                {layer === 'Velocity' && <Zap className="w-4 h-4" />}
                                <span>{layer}</span>
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>


                </>
            )}
        </div>
    );
}
