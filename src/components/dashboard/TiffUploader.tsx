import { useState, useRef, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileType, CheckCircle2, Loader2, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import * as GeoTIFF from 'geotiff';

export function TiffUploader() {
    const { setUploadedFile, uploadedFile, setTiffStats } = useStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError(null);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
            const image = await tiff.getImage();

            const metadata = {
                name: file.name,
                width: image.getWidth(),
                height: image.getHeight(),
                bands: image.getSamplesPerPixel(),
                size: file.size
            };

            // Downsample and compute basic raster stats (first band) for ML feature derivation.
            // This keeps things fast even for large rasters.
            let stats = null as null | { mean: number; min: number; max: number; sampleCount: number };
            try {
                const width = Math.min(96, image.getWidth());
                const height = Math.min(96, image.getHeight());
                const noData = (image as unknown as { getGDALNoData?: () => unknown }).getGDALNoData?.();

                const rasters = await (image as unknown as { readRasters: (opts: unknown) => Promise<unknown> }).readRasters({
                    samples: [0],
                    width,
                    height,
                    interleave: true,
                });

                const data = rasters as unknown as ArrayLike<number>;
                let min = Number.POSITIVE_INFINITY;
                let max = Number.NEGATIVE_INFINITY;
                let sum = 0;
                let count = 0;

                for (let i = 0; i < data.length; i++) {
                    const v = Number(data[i]);
                    if (!Number.isFinite(v)) continue;
                    if (noData != null && v === Number(noData)) continue;
                    min = Math.min(min, v);
                    max = Math.max(max, v);
                    sum += v;
                    count += 1;
                }

                if (count > 0) {
                    stats = { mean: sum / count, min, max, sampleCount: count };
                }
            } catch (e: unknown) {
                console.warn('Failed to compute raster stats:', e);
            }

            // Simulate "Analysis" time for realism
            setTimeout(() => {
                setUploadedFile(metadata);
                setTiffStats(stats);
                setLoading(false);
            }, 1500);

        } catch (err) {
            console.error("Error parsing TIFF:", err);
            setError("Invalid GeoTIFF file. Please upload a valid raster.");
            setTiffStats(null);
            setLoading(false);
        }
    };

    const clearFile = () => {
        setUploadedFile(null);
        setTiffStats(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Card className="border-dashed border-2 border-border bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-slate-900/20 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-900/30 transition-all duration-300 group cursor-pointer">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                <input
                    type="file"
                    accept=".tif,.tiff"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                />

                {!uploadedFile && !loading && (
                    <div className="text-center space-y-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-200 transition-all duration-300">
                            <Upload className="w-5 h-5 group-hover:animate-bounce" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xs font-semibold text-foreground">Upload Custom Raster</h4>
                            <p className="text-[10px] text-muted-foreground">Supports .TIF / .GeoTIFF</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Select File
                        </Button>
                        {error && <p className="text-[10px] text-red-500">{error}</p>}
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center gap-3 py-4">
                        <div className="relative">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <div className="absolute inset-0 blur-xl bg-blue-400/30 animate-pulse" />
                        </div>
                        <span className="text-xs text-muted-foreground animate-pulse font-medium">Analyzing raster data...</span>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        </div>
                    </div>
                )}

                {uploadedFile && (
                    <div className="w-full space-y-3 animate-scale-in">
                        <div className="flex items-center gap-3 bg-gradient-to-r from-background to-green-50/50 dark:to-slate-900/20 p-3 rounded-lg border border-green-100 dark:border-border shadow-md hover:shadow-lg transition-all duration-300">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 text-green-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                                <FileType className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate text-foreground">{uploadedFile.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                    {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • {uploadedFile.width}x{uploadedFile.height}px
                                </p>
                            </div>
                            <button onClick={clearFile} className="text-muted-foreground hover:text-red-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-green-700 font-medium justify-center bg-gradient-to-r from-green-50 to-emerald-50 py-2 rounded-lg shadow-sm border border-green-100">
                            <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
                            <span>Ready for AI Analysis</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
