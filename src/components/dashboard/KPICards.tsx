import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/store/useStore';
import { Users, Waves, ShieldAlert, Activity, ArrowUpRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRiskSummary } from '@/api/floodApi';
import type { RiskSummary } from '@/api/types';

type KPICardsVariant = 'grid' | 'stack';

export function KPICards({ variant = 'grid', className }: { variant?: KPICardsVariant; className?: string }) {
    const { region, scenario, aoiPolygons } = useStore();

    const [currentData, setCurrentData] = useState<RiskSummary | null>(null);
    const [baselineData, setBaselineData] = useState<RiskSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        Promise.all([
            getRiskSummary(region, scenario, { aoiPolygons }),
            getRiskSummary(region, '1m', { aoiPolygons }),
        ])
            .then(([curr, base]) => {
                if (cancelled) return;
                setCurrentData(curr);
                setBaselineData(base);
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setError(e instanceof Error ? e.message : 'Failed to load KPI metrics');
            })
            .finally(() => {
                if (cancelled) return;
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [region, scenario, aoiPolygons]);

    const stats = useMemo(() => {
        if (!currentData || !baselineData) return null;

        // Calculate Deltas (Example: from 1m to 2m)
        const isBaseline = scenario === '1m';
        const getDelta = (curr: number, prev: number) => {
            if (isBaseline) return null;
            if (prev === 0) return null;
            const pct = ((curr - prev) / prev) * 100;
            return `+${pct.toFixed(1)}%`;
        };

        return [
            {
                title: "Flooded Area",
                value: `${currentData.area} km²`,
                delta: getDelta(currentData.area, baselineData.area),
                icon: Waves,
                desc: "Inundated Land",
                color: "text-blue-600"
            },
            {
                title: "High Risk Pop.",
                value: `${(currentData.population / 1000000).toFixed(2)} M`,
                delta: getDelta(currentData.population, baselineData.population),
                icon: Users,
                desc: "People in Red Zones",
                color: "text-orange-600"
            },
            {
                title: "Risk Index",
                value: `${currentData.riskScore}/10`,
                delta: null, // Index delta might be confusing
                icon: ShieldAlert,
                desc: "Avg. Zonal Risk",
                color: "text-red-600"
            },
            {
                title: "Embankment",
                value: currentData.embankmentStatus,
                icon: Activity,
                desc: "Infrastructure Health",
                color: currentData.embankmentStatus === 'Critical' ? "text-red-500" : "text-green-500"
            }
        ];
    }, [baselineData, currentData, scenario]);


    if (error) {
        return (
            <div className="p-4">
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            </div>
        );
    }

    const gridClassName =
        variant === 'stack'
            ? 'grid grid-cols-1 gap-2 h-full auto-rows-fr'
            : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';

    if (loading || !stats) {
        return (
            <div className={cn(gridClassName, className)}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                        <CardHeader className="pb-2">
                            <Skeleton className="h-3 w-24" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-7 w-32" />
                            <Skeleton className="h-3 w-28 mt-2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className={cn(gridClassName, className)}>
            {stats.map((stat, i) => (
                    <Card
                    key={i}
                    className={cn(
                        'border-l-4 bg-card overflow-hidden relative group shadow-sm',
                        variant === 'stack' ? 'h-full min-h-[84px]' : 'hover-lift hover-glow cursor-pointer',
                        variant === 'grid' && `stagger-${i + 1}`
                    )}
                    style={{
                        borderLeftColor:
                            i === 3 && stat.value === 'Critical'
                                ? 'red'
                                : i === 0
                                    ? '#3b82f6'
                                    : i === 1
                                        ? '#f97316'
                                        : i === 2
                                            ? '#ef4444'
                                            : '#10b981',
                        animationFillMode: 'both',
                    }}
                >
                    {/* Keep hover shimmer subtle to reduce clutter */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full"
                        style={{ transition: 'transform 0.8s ease' }}
                    />

                    <CardHeader className={cn(
                        'flex flex-row items-center justify-between space-y-0',
                        variant === 'stack' ? 'py-2' : 'pb-2'
                    )}>
                        <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {stat.title}
                        </CardTitle>
                        <stat.icon className={cn('h-4 w-4', stat.color)} />
                    </CardHeader>
                    <CardContent className={cn('pt-0', variant === 'stack' ? 'pb-3' : '')}>
                        <div className="flex items-baseline gap-2">
                            <div className={cn('font-bold', variant === 'stack' ? 'text-2xl' : 'text-2xl')}>
                                {stat.value}
                            </div>
                            {stat.delta && (
                                <span className="flex items-center text-[11px] font-semibold text-red-500">
                                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                                    {stat.delta}
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{stat.desc}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
