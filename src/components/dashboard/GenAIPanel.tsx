import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Copy, Check, BrainCircuit, FileDown, ChevronDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { createReport, getRiskSummary } from '@/api/floodApi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type AIStatus = 'idle' | 'loading' | 'success' | 'error';

export function GenAIPanel() {
    const { region, scenario, uploadedFile, aoiPolygons } = useStore();
    const [status, setStatus] = useState<AIStatus>('idle');
    const [response, setResponse] = useState<string | null>(null);
    const [alertId, setAlertId] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [insightsOpen, setInsightsOpen] = useState(true);

    const generateInsight = async () => {
        setStatus('loading');
        setResponse(null);

        try {
            const res = await createReport({
                region,
                scenario,
                uploadedFile,
                aoiPolygons: aoiPolygons.length ? aoiPolygons : undefined,
            });

            setAlertId(res.alertId);
            setResponse(res.report);
            setStatus('success');
        } catch (e: unknown) {
            console.error(e);
            setStatus('error');
            setResponse(null);
        }
    };

    const copyToClipboard = () => {
        if (response) {
            navigator.clipboard.writeText(response);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const exportPdf = async () => {
        if (!response) return;

        setExportingPdf(true);
        try {
            const timestamp = new Date();
            const dateStr = timestamp.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

            const metrics = await getRiskSummary(region, scenario, { aoiPolygons });
            const riskClass =
                metrics.riskScore >= 8 ? 'Critical' : metrics.riskScore >= 6 ? 'High' : metrics.riskScore >= 4 ? 'Moderate' : 'Low';

            const doc = new jsPDF({
                unit: 'pt',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 40;
            let y = margin;

            const drawHeader = (pageNum: number) => {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(16);
                doc.text('FloodShield AI — Flood Analysis Report', margin, 30);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.text(`Generated: ${dateStr}`, margin, 46);
                doc.text(`Alert ID: ${alertId || 'N/A'}`, pageWidth - margin, 46, { align: 'right' });

                doc.setDrawColor(200);
                doc.line(margin, 58, pageWidth - margin, 58);

                doc.setFontSize(9);
                doc.setTextColor(120);
                doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 18, { align: 'right' });
                doc.setTextColor(0);
            };

            const newPage = (pageNum: number) => {
                doc.addPage();
                drawHeader(pageNum);
                y = 80;
            };

            // Page 1
            drawHeader(1);
            y = 80;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('Context', margin, y);
            y += 18;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const contextLines = [
                `Region: ${region}`,
                `Scenario (flood depth): ${scenario}`,
                `Risk classification: ${riskClass}`,
                uploadedFile ? `Custom raster uploaded: ${uploadedFile.name}` : 'Custom raster uploaded: No',
            ];
            contextLines.forEach((line) => {
                doc.text(line, margin, y);
                y += 14;
            });
            y += 8;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('Summary metrics', margin, y);
            y += 18;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const metricLines = [
                `Flooded area: ${metrics.area} km²`,
                `Population at risk: ${(metrics.population / 1_000_000).toFixed(2)} M`,
                `Risk index: ${metrics.riskScore}/10`,
                `Embankment status: ${metrics.embankmentStatus}`,
            ];
            metricLines.forEach((line) => {
                doc.text(line, margin, y);
                y += 14;
            });
            y += 10;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('AI analysis', margin, y);
            y += 18;

            doc.setFont('courier', 'normal');
            doc.setFontSize(9);
            const textWidth = pageWidth - margin * 2;
            const wrapped = doc.splitTextToSize(response.replace(/\r\n/g, '\n'), textWidth);

            for (const line of wrapped) {
                if (y > pageHeight - 80) {
                    newPage(doc.getNumberOfPages() + 1);
                    doc.setFont('courier', 'normal');
                    doc.setFontSize(9);
                }
                doc.text(String(line), margin, y);
                y += 12;
            }

            // Charts snapshot (optional)
            const chartsEl = document.getElementById('charts-snapshot');
            if (chartsEl) {
                const canvas = await html2canvas(chartsEl, {
                    backgroundColor: null,
                    scale: 2,
                    useCORS: true,
                });

                const imgData = canvas.toDataURL('image/png');
                const imgMaxWidth = pageWidth - margin * 2;
                const imgHeight = (canvas.height * imgMaxWidth) / canvas.width;

                if (y + imgHeight + 40 > pageHeight) {
                    newPage(doc.getNumberOfPages() + 1);
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text('Charts snapshot', margin, y);
                y += 18;

                doc.addImage(imgData, 'PNG', margin, y, imgMaxWidth, imgHeight);
                y += imgHeight + 10;
            }

            // Redraw headers/footers page numbers correctly
            const totalPages = doc.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                drawHeader(i);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(120);
                doc.text(`FloodShield AI • ${region} • ${scenario}`, margin, pageHeight - 18);
                doc.setTextColor(0);
            }

            doc.save(`FloodShield_${region}_${scenario}_${timestamp.toISOString().slice(0, 10)}.pdf`);
        } finally {
            setExportingPdf(false);
        }
    };

    return (
        <Card className="flex flex-col h-full border shadow-md bg-gradient-to-br from-purple-50/50 via-background to-pink-50/30 dark:from-slate-950 dark:via-background dark:to-slate-900/30 hover-lift hover-glow animate-slide-up stagger-3 overflow-hidden group transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <div className="relative">
                        <BrainCircuit className="h-5 w-5 text-purple-600 animate-pulse" />
                        <div className="absolute inset-0 w-5 h-5 bg-purple-400/20 rounded-full animate-ping" />
                    </div>
                    <button
                        type="button"
                        onClick={() => setInsightsOpen((v) => !v)}
                        className="flex items-center gap-2"
                        aria-label={insightsOpen ? 'Collapse insights' : 'Expand insights'}
                        title={insightsOpen ? 'Collapse insights' : 'Expand insights'}
                    >
                        <span className="group-hover:text-purple-700 transition-colors">
                            {uploadedFile ? "Custom Raster Analysis" : "AI Situation Report"}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${insightsOpen ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                </CardTitle>
                <div className="flex items-center gap-2">
                    {status === 'success' && (
                        <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200 px-2 py-0.5 rounded-full font-mono animate-scale-in shadow-sm">
                            <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse" />
                            ID: {alertId}
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 gap-4 p-4">

                {/* Output Area (accordion) */}
                {insightsOpen && (
                    <div className="flex-1 min-h-0 rounded-lg border-2 border-border bg-background p-4 text-sm leading-relaxed text-foreground overflow-y-auto font-mono shadow-inner group-hover:border-purple-200 transition-colors duration-300 relative">
                    {/* Corner decoration */}
                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-purple-100/50 to-transparent rounded-bl-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-12 h-12 bg-gradient-to-tr from-purple-100/50 to-transparent rounded-tr-3xl pointer-events-none" />
                    {status === 'idle' && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                            <div className="relative">
                                <Sparkles className="h-10 w-10 animate-pulse" />
                                <div className="absolute inset-0 blur-xl bg-purple-300/30 animate-pulse" />
                            </div>
                            <p className="text-xs uppercase tracking-wider animate-pulse">Ready to Analyze</p>
                            <div className="flex gap-1 mt-2">
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                            </div>
                        </div>
                    )}

                    {status === 'loading' && (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-blue-600">
                            <div className="relative">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <div className="absolute inset-0 blur-xl bg-blue-400/40 animate-pulse" />
                            </div>
                            <p className="text-xs font-medium animate-pulse">Running Physics-ML Models...</p>
                            <div className="flex gap-2 mt-2">
                                <div className="h-1 w-16 bg-blue-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full animate-shimmer" style={{ width: '40%' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'success' && response && (
                        <div className="whitespace-pre-wrap animate-slide-up relative">
                            <div className="absolute -left-2 top-0 w-1 h-full bg-gradient-to-b from-purple-500 via-blue-500 to-transparent rounded-full" />
                            {response}
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="h-full flex items-center justify-center text-red-500 text-xs">
                            Error connecting to FloodShield Neural Core.
                        </div>
                    )}
                    </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/40 transition-all duration-300 hover:scale-105 relative overflow-hidden group"
                        onClick={generateInsight}
                        disabled={status === 'loading' || exportingPdf}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            {status === 'loading' ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Generate Analysis
                                </>
                            )}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                    </Button>

                    {status === 'success' && (
                        <>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={copyToClipboard}
                                className="shrink-0"
                                aria-label="Copy report"
                                title="Copy report"
                            >
                                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </Button>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={exportPdf}
                                className="shrink-0"
                                disabled={exportingPdf}
                                aria-label="Export report as PDF"
                                title="Export report as PDF"
                            >
                                {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
