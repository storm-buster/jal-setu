import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    CartesianGrid,
    Legend,
} from 'recharts';
import { useStore } from '@/store/useStore';
import { analyzeRegion } from '@/api/floodApi';
import type { AnalyzeRegionResponse } from '@/api/types';
import { AlertCircle } from 'lucide-react';
import { useMlFeatures } from '@/ml/useMlFeatures';

const AXIS_TICK = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

function formatCompactNumber(v: number) {
    if (!Number.isFinite(v)) return String(v);
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
    return String(v);
}

function formatPct(v: number) {
    if (!Number.isFinite(v)) return String(v);
    return `${Math.round(v * 100)}%`;
}

type ChartTooltipPayloadItem = {
    dataKey?: string | number;
    name?: string;
    value?: number | string;
    color?: string;
};

type ChartTooltipProps = {
    active?: boolean;
    payload?: ChartTooltipPayloadItem[];
    label?: string;
};

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="rounded-lg border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
            <div className="text-xs font-semibold text-foreground mb-1">{label}</div>
            <div className="space-y-1">
                {payload.map((p: ChartTooltipPayloadItem) => {
                    const key = `${p.dataKey ?? p.name}`;
                    const value = typeof p.value === 'number' ? p.value : Number(p.value);
                    const display =
                        p.dataKey === 'importance'
                            ? formatPct(value)
                            : p.dataKey === 'risk'
                                ? `${value.toFixed(2)} M`
                                : formatCompactNumber(value);

                    return (
                        <div key={key} className="flex items-center justify-between gap-6 text-xs">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: String(p.color ?? 'hsl(var(--foreground))') }} />
                                <span>{String(p.name ?? p.dataKey)}</span>
                            </div>
                            <div className="font-mono text-foreground">{display}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function AnalyticsSection() {
    const { region, scenario, aoiPolygons } = useStore();
    const mlFeatures = useMlFeatures();

    const [data, setData] = useState<AnalyzeRegionResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        analyzeRegion({
            region,
            scenario,
            aoiPolygons: aoiPolygons.length ? aoiPolygons : undefined,
            mlFeatures,
        })
            .then((res) => {
                if (cancelled) return;
                setData(res);
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setError(e instanceof Error ? e.message : 'Failed to load analytics');
            })
            .finally(() => {
                if (cancelled) return;
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [region, scenario, aoiPolygons, mlFeatures]);

    const featureData = useMemo(() => data?.featureImportance ?? [], [data]);
    const impactData = useMemo(() => data?.impactComparison ?? [], [data]);

    if (error) {
        return (
            <div className="p-2">
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            </div>
        );
    }

    const wrapperClassName = 'grid grid-cols-1 lg:grid-cols-2 gap-4';

    if (loading || !data) {
        return (
            <div className={wrapperClassName}>
                <Card className="overflow-hidden">
                    <CardHeader className="py-3">
                        <Skeleton className="h-4 w-56" />
                    </CardHeader>
                    <CardContent className="p-3">
                        <Skeleton className="h-[240px] w-full" />
                    </CardContent>
                </Card>
                <Card className="overflow-hidden">
                    <CardHeader className="py-3">
                        <Skeleton className="h-4 w-56" />
                    </CardHeader>
                    <CardContent className="p-3">
                        <Skeleton className="h-[240px] w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className={wrapperClassName}>
            {/* Feature Importance Graph */}
            <Card className="overflow-hidden shadow-sm bg-gradient-to-br from-card to-card/70">
                <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">Feature importance</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                    <div className="w-full h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={featureData} margin={{ top: 6, right: 18, left: 80, bottom: 6 }}>
                                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} horizontal={false} />
                                <XAxis
                                    type="number"
                                    domain={[0, 1]}
                                    tickFormatter={(v) => formatPct(Number(v))}
                                    tick={AXIS_TICK}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis type="category" dataKey="name" width={120} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip />} />
                                <Bar dataKey="importance" name="Importance" radius={[6, 6, 6, 6]} barSize={18}>
                                    {featureData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Impact Comparison */}
            <Card className="overflow-hidden shadow-sm bg-gradient-to-br from-card to-card/70">
                <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">Impact comparison</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                    <div className="w-full h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            {/* Dual-axis: area (km²) and population at risk (M) have very different scales */}
                            <BarChart data={impactData} margin={{ top: 10, right: 28, left: 12, bottom: 4 }} barGap={8}>
                                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
                                <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />

                                <YAxis
                                    yAxisId="area"
                                    tick={AXIS_TICK}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => formatCompactNumber(Number(v))}
                                />
                                <YAxis
                                    yAxisId="risk"
                                    orientation="right"
                                    tick={AXIS_TICK}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${Number(v).toFixed(1)}M`}
                                />

                                <Tooltip content={<ChartTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }} />

                                <Bar
                                    yAxisId="area"
                                    dataKey="area"
                                    name="Flooded area (km²)"
                                    fill="#2e75b6"
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={44}
                                />
                                <Bar
                                    yAxisId="risk"
                                    dataKey="risk"
                                    name="Population at risk (M)"
                                    fill="#f97316"
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={44}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
