import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Copy, Check, BrainCircuit, FileDown, ChevronDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { createReport, getRiskSummary, sendChat } from '@/api/floodApi';
import { useMlFeatures } from '@/ml/useMlFeatures';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type AIStatus = 'idle' | 'loading' | 'success' | 'error';

export function GenAIPanel() {
    const { region, scenario, uploadedFile, aoiPolygons } = useStore();
    const mlFeatures = useMlFeatures();
    const [mode, setMode] = useState<'report' | 'chat'>('report');

    // Report State
    const [status, setStatus] = useState<AIStatus>('idle');
    const [response, setResponse] = useState<string | null>(null);
    const [alertId, setAlertId] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [insightsOpen, setInsightsOpen] = useState(true);

    // Chat State
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
        { role: 'assistant', content: 'Hello! I can answer questions about the current flood data.' }
    ]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);

    const generateInsight = async () => {
        setStatus('loading');
        setResponse(null);

        try {
            const res = await createReport({
                region,
                scenario,
                uploadedFile,
                aoiPolygons: aoiPolygons.length ? aoiPolygons : undefined,
                mlFeatures,
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

    const sendChatMessage = async () => {
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setChatInput("");
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatLoading(true);

        try {
            // Import dynamically or assume it's available. 
            // Ideally imported at top, but for this edit we assume imports are handled or we add 'sendChat' to import list above.
            // const { sendChat } = await import('@/api/floodApi');

            const res = await sendChat({
                message: userMsg,
                region,
                scenario,
                mlFeatures,
                aoiPolygons: aoiPolygons.length ? aoiPolygons : undefined,
            });

            setChatMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
        } catch (e: any) {
            console.error("Chat Error:", e);
            const errorMsg = e.message || "Unknown error";
            setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMsg}` }]);
        } finally {
            setChatLoading(false);
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

            const metrics = await getRiskSummary(region, scenario, { aoiPolygons, mlFeatures });
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
                doc.text('Jal-Setu AI — Flood Analysis Report', margin, 30);

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
                doc.text(`Jal-Setu AI • ${region} • ${scenario}`, margin, pageHeight - 18);
                doc.setTextColor(0);
            }

            doc.save(`FloodShield_${region}_${scenario}_${timestamp.toISOString().slice(0, 10)}.pdf`);
        } finally {
            setExportingPdf(false);
        }
    };

    // We need to keep exportPdf function body. I will assume I need to rewrite it or I made a mistake trying to replace the whole component.
    // Let's abort replacing the WHOLE component and instead modify the return/render part and add state.

    return (
        <Card className="flex flex-col h-full border shadow-md bg-gradient-to-br from-purple-50/50 via-background to-pink-50/30 dark:from-slate-950 dark:via-background dark:to-slate-900/30 hover-lift hover-glow animate-slide-up stagger-3 overflow-hidden group transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <div className="relative">
                        <BrainCircuit className="h-5 w-5 text-purple-600 animate-pulse" />
                        <div className="absolute inset-0 w-5 h-5 bg-purple-400/20 rounded-full animate-ping" />
                    </div>
                    <div className="flex gap-1 bg-muted p-1 rounded-lg">
                        <button
                            onClick={() => setMode('report')}
                            className={`px-2 py-0.5 rounded-md text-xs transition-colors ${mode === 'report' ? 'bg-background shadow-sm text-purple-600 font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Report
                        </button>
                        <button
                            onClick={() => setMode('chat')}
                            className={`px-2 py-0.5 rounded-md text-xs transition-colors ${mode === 'chat' ? 'bg-background shadow-sm text-blue-600 font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Chat
                        </button>
                    </div>
                </CardTitle>
                <div className="flex items-center gap-2">
                    {mode === 'report' && status === 'success' && (
                        <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200 px-2 py-0.5 rounded-full font-mono animate-scale-in shadow-sm">
                            <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse" />
                            ID: {alertId}
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 gap-4 p-4">

                {/* MODE: REPORT */}
                {mode === 'report' && (
                    <>
                        <div className="flex-1 min-h-0 rounded-lg border-2 border-border bg-background p-4 text-sm leading-relaxed text-foreground overflow-y-auto font-mono shadow-inner group-hover:border-purple-200 transition-colors duration-300 relative">
                            {/* ... existing report UI ... */}
                            {status === 'idle' && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                                    <Sparkles className="h-10 w-10 animate-pulse" />
                                    <p className="text-xs uppercase tracking-wider animate-pulse">Ready to Analyze</p>
                                </div>
                            )}
                            {status === 'loading' && (
                                <div className="h-full flex flex-col items-center justify-center gap-3 text-blue-600">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p className="text-xs font-medium animate-pulse">Running Physics-ML Models...</p>
                                </div>
                            )}
                            {status === 'success' && response && (
                                <div className="whitespace-pre-wrap animate-slide-up relative">{response}</div>
                            )}
                            {status === 'error' && <div className="text-red-500 text-xs text-center mt-10">Error generating report.</div>}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={generateInsight}
                                disabled={status === 'loading'}
                            >
                                {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                Generate Analysis
                            </Button>
                            {status === 'success' && (
                                <Button variant="outline" size="icon" onClick={copyToClipboard}>
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            )}
                        </div>
                    </>
                )}

                {/* MODE: CHAT */}
                {mode === 'chat' && (
                    <>
                        <div className="flex-1 min-h-0 rounded-lg border-2 border-border bg-background p-4 text-sm overflow-y-auto shadow-inner flex flex-col gap-3">
                            {chatMessages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${m.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-muted text-foreground rounded-bl-none'
                                        }`}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-muted text-foreground rounded-2xl rounded-bl-none px-3 py-2 text-xs flex gap-1 items-center">
                                        <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" />
                                        <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce delay-75" />
                                        <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce delay-150" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <input
                                className="flex-1 bg-background border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ask about risk, rivers..."
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                            />
                            <Button size="sm" onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}>
                                Send
                            </Button>
                        </div>
                    </>
                )}

            </CardContent>
        </Card>
    );
}
