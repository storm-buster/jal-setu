import { Sidebar } from '@/components/dashboard/Sidebar';
import { KPICards } from '@/components/dashboard/KPICards';
import { MapComponent } from '@/components/map/MapView';
import { AnalyticsSection } from '@/components/dashboard/Charts';
import { GenAIPanel } from '@/components/dashboard/GenAIPanel';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AuthMenu } from '@/auth/AuthMenu';

function App() {
  return (
    <div className="flex h-[100dvh] w-[100dvw] overflow-hidden bg-background font-sans text-foreground">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Background kept intentionally subtle to reduce visual noise */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-background to-purple-50/20 dark:from-slate-950 dark:via-background dark:to-slate-900/40 pointer-events-none -z-10" />

        {/* Top Header */}
        <header className="flex-none flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-background/85 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="text-xs md:text-sm font-semibold tracking-wide">Jal-Setu AI</div>
              <div className="text-[10px] md:text-xs text-muted-foreground">Flood Decision Support Dashboard</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AuthMenu />
            <ThemeToggle />
            <div className="hidden lg:block text-xs text-muted-foreground ml-2">Restricted Access • Govt. of India</div>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          {/* 3-column operational grid */}
          <section className="grid grid-cols-1 lg:grid-flow-row-dense lg:grid-cols-[minmax(320px,26%)_minmax(640px,54%)_minmax(260px,20%)] gap-4 p-3 md:p-4">
            {/* CENTER: Map (fills the top workspace height on desktop) */}
            <section className="min-h-0 flex flex-col items-stretch lg:col-start-2">
              <div className="w-full rounded-xl border border-border bg-card shadow-sm overflow-hidden h-[420px] sm:h-[520px] lg:h-[calc(100dvh-168px)]">
                <MapComponent />
              </div>
            </section>

            {/* LEFT: Controls */}
            <aside className="min-h-0 lg:col-start-1">
              <div className="overflow-y-auto rounded-xl border border-border bg-card/60 backdrop-blur-sm h-[420px] sm:h-[520px] lg:h-[calc(100dvh-168px)]">
                <Sidebar className="w-full" />
              </div>
            </aside>

            {/* RIGHT: KPI stack */}
            <aside className="min-h-0 lg:col-start-3">
              <div className="overflow-y-auto rounded-xl border border-border bg-card/60 backdrop-blur-sm p-2 md:p-3 h-[420px] sm:h-[520px] lg:h-[calc(100dvh-168px)]">
                <div className="flex flex-col h-full min-h-0">
                  <div className="text-xs font-semibold tracking-wide text-muted-foreground mb-2">Risk indicators</div>
                  <div className="flex-1 min-h-0">
                    <KPICards variant="stack" className="h-full" />
                  </div>
                </div>
              </div>
            </aside>
          </section>

          {/* Bottom analytics (full width) */}
          <section className="px-3 md:px-4 pb-4">
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-3 md:p-4">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">Analytics &amp; simulation</div>

              {/* On desktop: charts side-by-side, situation report to the right. On mobile: stacked. */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
                <div id="charts-snapshot" className="min-w-0">
                  <AnalyticsSection />
                </div>
                <div className="min-w-0">
                  <GenAIPanel />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App
