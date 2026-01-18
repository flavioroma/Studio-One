import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Download, Trash2, Loader2, AlertTriangle, Move, Calendar, MapPin, Monitor } from 'lucide-react';
import { TextPosition, TextColor, TextSize } from '../../types';
import { PersistenceService } from '../../services/PersistenceService';
import { CaptionSettingsPanel, CaptionSettings } from '../../components/CaptionSettingsPanel';
import { WatermarkSettingsPanel, WatermarkSettings } from '../../components/WatermarkSettingsPanel';
import { calculateCaptionMetrics, calculateCaptionPosition, calculateWatermarkPosition } from '../../utils/captionUtils';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { MetadataService, PhotoMetadata } from '../../services/MetadataService';
import { useLanguage } from '../../contexts/LanguageContext';

export const PhotoverlayTool: React.FC = () => {
    const { t } = useLanguage();
    const [file, setFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    // Consolidated Caption Settings State
    const [captionSettings, setCaptionSettings] = useState<CaptionSettings>({
        text: '',
        color: TextColor.White,
        position: TextPosition.BottomLeft,
        textSize: TextSize.Small, // Default
        isItalic: false
    });

    // Watermark Settings State
    const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>({
        file: null,
        position: TextPosition.TopRight,
        opacity: 0.2, // Default 20%
        scale: 0.2 // Default 20%
    });

    const [isExporting, setIsExporting] = useState(false);
    const [metadata, setMetadata] = useState<{ width: number; height: number } | null>(null);
    const [exifData, setExifData] = useState<PhotoMetadata | null>(null);

    // Delete Confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Preview Sizing
    const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ResizeObserver to track container size for WYSIWYG preview
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [imageUrl]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const url = URL.createObjectURL(selectedFile);
            setFile(selectedFile);
            setImageUrl(url);

            // Fetch Metadata
            try {
                const data = await MetadataService.getPhotoMetadata(selectedFile);
                setExifData(data);
            } catch (err) {
                console.warn("Could not read metadata", err);
                setExifData(null);
            }
        }
    };

    // Persistence Logic
    const isLoadedRef = useRef(false);

    // Load State
    useEffect(() => {
        const load = async () => {
            const state = await PersistenceService.loadPhotoverlayState();
            if (state) {
                setFile(state.file);
                setCaptionSettings({
                    text: state.caption,
                    color: state.color,
                    position: state.position,
                    textSize: (state as any).textSize || TextSize.Small,
                    isItalic: (state as any).isItalic || false,
                });

                // Load Watermark State
                if (state.watermarkFile) {
                    setWatermarkSettings(prev => ({
                        ...prev,
                        file: state.watermarkFile || null,
                        position: state.watermarkPosition || TextPosition.TopRight
                    }));
                }

                if (state.file) {
                    setImageUrl(URL.createObjectURL(state.file));
                    // Fetch Metadata for loaded file
                    try {
                        const data = await MetadataService.getPhotoMetadata(state.file);
                        setExifData(data);
                    } catch (err) {
                        console.warn("Could not read metadata", err);
                    }
                }
            }
            isLoadedRef.current = true;
        };
        load();
    }, []);

    // Save State
    useEffect(() => {
        if (!isLoadedRef.current) return;

        const timeoutId = setTimeout(() => {
            PersistenceService.savePhotoverlayState({
                file,
                caption: captionSettings.text,
                color: captionSettings.color,
                position: captionSettings.position,
                textSize: captionSettings.textSize,
                isItalic: captionSettings.isItalic,
                watermarkFile: watermarkSettings.file,
                watermarkPosition: watermarkSettings.position
            });
        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [file, captionSettings, watermarkSettings]);

    const onImageLoad = () => {
        if (imageRef.current) {
            setMetadata({
                width: imageRef.current.naturalWidth,
                height: imageRef.current.naturalHeight
            });
        }
    };

    const handleExport = async () => {
        if (!file || !imageRef.current || !metadata) return;

        setIsExporting(true);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context");

            // Set canvas dimensions to match original image
            canvas.width = metadata.width;
            canvas.height = metadata.height;

            // Draw Image
            ctx.drawImage(imageRef.current, 0, 0, metadata.width, metadata.height);

            // Draw Watermark
            if (watermarkSettings.file) {
                const img = new Image();
                const url = URL.createObjectURL(watermarkSettings.file);
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = url;
                });

                // Watermark logic
                const w = metadata.width * watermarkSettings.scale;
                const aspectRatio = img.width / img.height;
                const h = w / aspectRatio;

                const pos = calculateWatermarkPosition(metadata.width, metadata.height, w, h, watermarkSettings.position);
                ctx.globalAlpha = watermarkSettings.opacity;
                ctx.drawImage(img, pos.x, pos.y, w, h);
                ctx.globalAlpha = 1.0; // Reset opacity

                URL.revokeObjectURL(url);
            }

            // Calculate Metrics and Position for the full size image
            const metrics = calculateCaptionMetrics(metadata.width, metadata.height, {
                text: captionSettings.text,
                textSize: captionSettings.textSize
            });

            const position = calculateCaptionPosition(metadata.width, metadata.height, metrics, captionSettings.position);

            // Configure Text
            const fontStyle = captionSettings.isItalic ? 'italic' : 'normal';
            ctx.font = `${fontStyle} bold ${metrics.fontSize}px Inter, sans-serif`;
            ctx.fillStyle = captionSettings.color;
            ctx.textAlign = position.textAlign as CanvasTextAlign;
            ctx.textBaseline = 'alphabetic';

            // Text Shadow
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = metrics.fontSize * 0.15; // Scale shadow blur with font size slightly
            ctx.shadowOffsetX = metrics.fontSize * 0.04;
            ctx.shadowOffsetY = metrics.fontSize * 0.04;

            // Draw Each Line
            metrics.lines.forEach((line, i) => {
                ctx.fillText(line, position.x, position.y + (i * metrics.lineHeight));
            });

            // Export
            canvas.toBlob(async (blob) => {
                if (blob) {
                    let finalBlob = blob;
                    // Transfer Metadata if available
                    if (file) {
                        try {
                            finalBlob = await MetadataService.transferPhotoMetadata(file, blob);
                        } catch (e) {
                            console.warn("Failed to transfer metadata", e);
                        }
                    }

                    const url = URL.createObjectURL(finalBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                    // Use original extension if possible or default to type
                    const ext = file.type.split('/')[1] || 'jpg';
                    a.download = `photoverlay-${originalName}.${ext}`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
                setIsExporting(false);
            }, 'image/jpeg', 0.95); // Force JPEG for EXIF support

        } catch (error) {
            console.error("Export failed:", error);
            alert(t.tools.photoverlay.exportFailed);
            setIsExporting(false);
        }
    };

    // Delete Handling
    const handleDeleteRequest = () => {
        setShowDeleteConfirm(true);
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    const confirmDelete = () => {
        // 1. Reset State
        setFile(null);
        setImageUrl(null);
        setMetadata(null);
        setExifData(null);
        setCaptionSettings(prev => ({ ...prev, text: '' }));
        setWatermarkSettings(prev => ({ ...prev, file: null }));

        // 2. Immediately Clear Persistence
        PersistenceService.savePhotoverlayState({
            file: null,
            caption: '',
            color: TextColor.White,
            position: TextPosition.BottomLeft,
            textSize: TextSize.Small,
            isItalic: false,
            watermarkFile: null,
            watermarkPosition: TextPosition.TopRight
        });

        setShowDeleteConfirm(false);
    };

    // Calculate CSS styles using shared metrics
    const getPreviewStyle = (): React.CSSProperties => {
        if (containerSize.height === 0 || containerSize.width === 0) return { display: 'none' };

        const metrics = calculateCaptionMetrics(containerSize.width, containerSize.height, {
            text: captionSettings.text,
            textSize: captionSettings.textSize
        });

        return {
            color: captionSettings.color,
            textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
            fontSize: `${metrics.fontSize}px`,
            lineHeight: `${metrics.lineHeight}px`,
            fontWeight: 'bold',
            fontStyle: captionSettings.isItalic ? 'italic' : 'normal',
            fontFamily: 'Inter, sans-serif',

            // Flex positioning
            display: 'flex',
            width: '100%',
            height: '100%',
            padding: `${metrics.padding}px`,

            justifyContent: captionSettings.position.includes('Left') ? 'flex-start' : captionSettings.position.includes('Right') ? 'flex-end' : 'center',
            alignItems: captionSettings.position.includes('Top') ? 'flex-start' : captionSettings.position.includes('Bottom') ? 'flex-end' : 'center',
            textAlign: captionSettings.position.includes('Left') ? 'left' : captionSettings.position.includes('Right') ? 'right' : 'center'
        };
    };

    // Watermark Preview Logic
    const getWatermarkStyle = (): React.CSSProperties => {
        if (!watermarkSettings.file || containerSize.width === 0) return { display: 'none' };

        const widthPercent = (watermarkSettings.scale * 100) + '%';
        const paddingPercent = '5%';

        const style: React.CSSProperties = {
            position: 'absolute',
            width: widthPercent,
            height: 'auto',
            pointerEvents: 'none',
            zIndex: 20, // Above text
            opacity: watermarkSettings.opacity
        };

        switch (watermarkSettings.position) {
            case TextPosition.TopLeft:
                style.top = paddingPercent;
                style.left = paddingPercent;
                break;
            case TextPosition.TopRight:
                style.top = paddingPercent;
                style.right = paddingPercent;
                break;
            case TextPosition.BottomLeft:
                style.bottom = paddingPercent;
                style.left = paddingPercent;
                break;
            case TextPosition.BottomRight:
                style.bottom = paddingPercent;
                style.right = paddingPercent;
                break;
            case TextPosition.Center:
                style.top = '50%';
                style.left = '50%';
                style.transform = 'translate(-50%, -50%)';
                break;
            case TextPosition.TopCenter:
                style.top = paddingPercent;
                style.left = '50%';
                style.transform = 'translate(-50%, 0)';
                break;
            case TextPosition.BottomCenter:
                style.bottom = paddingPercent;
                style.left = '50%';
                style.transform = 'translate(-50%, 0)';
                break;
        }

        return style;
    };

    return (
        <div className="h-full flex bg-slate-900 overflow-hidden">
            {/* Settings Sidebar */}
            <div className="w-80 border-r border-slate-700 bg-slate-800 flex flex-col p-6 overflow-y-auto z-10 shadow-2xl">
                <h2 className="text-lg font-bold mb-8 text-slate-100 uppercase tracking-widest text-center">
                    {t.tools.photoverlay.overlaySettings}
                </h2>

                {!file ? (
                    <div className="space-y-6">
                        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                            <p className="text-md text-purple-400 leading-relaxed text-center">
                                {t.tools.photoverlay.selectPhoto}
                            </p>
                        </div>
                        <label className="flex flex-col items-center justify-center gap-4 w-full h-48 rounded-3xl border-2 border-dashed border-slate-600 hover:border-pink-500 hover:bg-slate-700/50 cursor-pointer transition-all group">
                            <div className="p-4 bg-slate-700 rounded-full group-hover:scale-110 transition-transform">
                                <Upload className="w-8 h-8 text-pink-400" />
                            </div>
                            <span className="text-sm font-bold text-slate-400">{t.tools.photoverlay.uploadPhoto}</span>
                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>
                ) : (
                    <div className="space-y-8 animate-fadeIn">
                        <CaptionSettingsPanel
                            settings={captionSettings}
                            onUpdate={(updates) => setCaptionSettings(prev => ({ ...prev, ...updates }))}
                        />

                        <WatermarkSettingsPanel
                            settings={watermarkSettings}
                            onUpdate={(updates) => setWatermarkSettings(prev => ({ ...prev, ...updates }))}
                        />

                    </div>
                )}
            </div>

            {/* Main Preview / Viewport */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
                <div className="flex-1 relative flex items-center justify-center p-12 overflow-hidden">
                    {!imageUrl ? (
                        <div className="flex flex-col items-center gap-4 text-slate-600 animate-pulse">
                            <ImageIcon className="w-24 h-24 stroke-[1px]" />
                            <p className="font-bold uppercase tracking-[0.3em] text-xs">{t.tools.photoverlay.awaitingSource}</p>
                        </div>
                    ) : (
                        <>
                            <div
                                ref={containerRef}
                                className="relative group shadow-2xl rounded-2xl overflow-hidden border-4 border-slate-800 max-h-[70vh]"
                                style={{
                                    aspectRatio: metadata ? `${metadata.width} / ${metadata.height}` : 'auto'
                                }}
                            >
                                <img
                                    ref={imageRef}
                                    src={imageUrl}
                                    onLoad={onImageLoad}
                                    className="max-h-[70vh] w-auto pointer-events-none object-contain"
                                    alt="Preview"
                                />

                                {/* Watermark Overlay (DOM) */}
                                {watermarkSettings.file && (
                                    <img
                                        src={URL.createObjectURL(watermarkSettings.file)}
                                        style={getWatermarkStyle()}
                                        alt="watermark"
                                    />
                                )}

                                {/* Preview Layer Overlay */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <div
                                        className="absolute inset-0 z-10"
                                        style={getPreviewStyle()}
                                    >
                                        <div style={{ whiteSpace: 'pre-wrap' }}>
                                            {captionSettings.text}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Remove Button - Positioned in Corner of Enclosing Area */}
                            <button
                                onClick={handleDeleteRequest}
                                disabled={isExporting}
                                className="absolute bottom-6 right-6 p-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl border border-red-500/20 transition-all shadow-lg backdrop-blur-sm z-30 group"
                                title={t.tools.photoverlay.removePhoto}
                            >
                                <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                        </>
                    )}
                </div>

                {/* Controls Bar */}
                {file && (
                    <div className="bg-slate-800/80 backdrop-blur-md border-t border-slate-700 p-6 flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <div className="flex flex-col">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                                    <Monitor className="w-3 h-3" /> {t.tools.photoverlay.resolution}
                                </p>
                                <p className="text-sm font-bold text-white">
                                    {metadata ? `${metadata.width} x ${metadata.height}` : '...'}
                                </p>
                            </div>

                            {exifData?.creationTime && (
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3" /> {t.tools.photoverlay.mediaCreated}
                                    </p>
                                    <p className="text-sm font-bold text-white">
                                        {exifData.creationTime.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </div>
                            )}

                            {exifData?.latitude && exifData?.longitude && (
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                                        <MapPin className="w-3 h-3" /> {t.tools.photoverlay.location}
                                    </p>
                                    <p className="text-sm font-bold text-white">
                                        {exifData.latitude.toFixed(4)}, {exifData.longitude.toFixed(4)}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden lg:flex flex-col items-end mr-4">
                                <p className="text-[12px] font-black uppercase text-slate-500 tracking-widest">
                                    100% client-side
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold">
                                    All processing happens directly in your browser, keeping your data private
                                </p>
                            </div>
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="flex items-center gap-3 px-8 py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-black rounded-2xl transition-all shadow-xl shadow-white/5 active:scale-95 disabled:opacity-50"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>{t.tools.photoverlay.exporting}</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-5 h-5" />
                                        <span>{t.tools.photoverlay.exportPhoto}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={cancelDelete}
                onConfirm={confirmDelete}
                title={t.tools.photoverlay.removePhotoTitle}
                message={t.tools.photoverlay.removePhotoMsg}
                confirmLabel={t.tools.photoverlay.yesRemove}
                cancelLabel={t.tools.photoverlay.cancel}
                Icon={Trash2}
            />
        </div>
    );
};

