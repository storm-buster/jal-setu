import { useStore, type Region, type LayerType, type Scenario } from '@/store/useStore';
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
    const { region, setRegion, scenario, setScenario, activeLayer, setActiveLayer } = useStore();

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
