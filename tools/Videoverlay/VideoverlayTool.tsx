import React, { useState, useRef, useEffect } from 'react';
import { Upload, Video as VideoIcon, Download, Trash2, RotateCcw, Loader2, AlertTriangle, Calendar } from 'lucide-react';
import { PlaybackControls } from '../../components/PlaybackControls';
import { MetadataService, VideoMetadata } from '../../services/MetadataService';
import { TextPosition, TextColor, TextSize } from '../../types';
import { PersistenceService } from '../../services/PersistenceService';
import { Mp4ExportService } from '../../services/Mp4ExportService';
import { CaptionSettingsPanel, CaptionSettings } from '../../components/CaptionSettingsPanel';
import { WatermarkSettingsPanel, WatermarkSettings } from '../../components/WatermarkSettingsPanel';
import { calculateCaptionMetrics, calculateCaptionPosition, calculateWatermarkPosition } from '../../utils/captionUtils';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useLanguage } from '../../contexts/LanguageContext';

export const VideoverlayTool: React.FC = () => {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

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

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  // Abort Control
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Preview Sizing
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
  }, [videoUrl]);

  // Track video time for UI
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationFrameId: number;

    const loop = () => {
      if (!video.paused && !video.ended) {
        setCurrentTime(video.currentTime);
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    if (isPlaying) {
      loop();
    } else {
      // Ensure we catch the exact time when paused
      setCurrentTime(video.currentTime);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const url = URL.createObjectURL(selectedFile);
      setFile(selectedFile);
      setVideoUrl(url);
    }
  };

  // Persistence Logic
  const isLoadedRef = useRef(false);

  // Load State
  useEffect(() => {
    const load = async () => {
      const state = await PersistenceService.loadVideoverlayState();
      if (state) {
        setFile(state.file);
        setCaptionSettings({
          text: state.caption,
          color: state.color,
          position: state.position,
          textSize: (state as any).textSize || TextSize.Small, // Backwards compat
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
          setVideoUrl(URL.createObjectURL(state.file));
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
      PersistenceService.saveVideoverlayState({
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

  const onLoadedMetadata = async () => {
    if (videoRef.current && file) {
      try {
        const data = await MetadataService.getVideoMetadata(file);
        setMetadata(data);
      } catch (err) {
        // Fallback if service fails (unlikely given it uses DOM)
        setMetadata({
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
          duration: videoRef.current.duration,
          bitrate: 0
        });
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleExport = async () => {
    if (!file) return;

    setIsExporting(true);
    setIsPlaying(false);
    setExportProgress(0);
    if (videoRef.current) videoRef.current.pause();

    // Init AbortController
    abortControllerRef.current = new AbortController();

    try {
      const exportService = new Mp4ExportService();
      const blob = await exportService.exportVideoWithOverlay(
        file,
        {
          text: captionSettings.text,
          color: captionSettings.color,
          position: captionSettings.position,
          textSize: captionSettings.textSize,
          isItalic: captionSettings.isItalic,
          watermark: watermarkSettings.file ? {
            file: watermarkSettings.file,
            position: watermarkSettings.position,
            scale: watermarkSettings.scale,
            opacity: watermarkSettings.opacity
          } : undefined
        },
        (progress) => setExportProgress(progress),
        abortControllerRef.current.signal
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `overlay-${file.name.replace(/\.[^/.]+$/, "")}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      if (error.name === 'AbortError') {

      } else {
        console.error("Export failed:", error);
        alert(t.tools.videoverlay.exportFailed);
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      abortControllerRef.current = null;
    }
  };

  const requestCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setShowCancelConfirm(false);
  };

  const closeCancelConfirm = () => {
    setShowCancelConfirm(false);
  };

  // Calculate CSS styles using shared metrics
  const getPreviewStyle = (): React.CSSProperties => {
    // Fallback if size not yet measured
    if (containerSize.height === 0 || containerSize.width === 0) return { display: 'none' };

    // Use shared logic for metrics
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
      padding: `${metrics.padding}px`, // Use exact padding from logic

      justifyContent: captionSettings.position.includes('Left') ? 'flex-start' : captionSettings.position.includes('Right') ? 'flex-end' : 'center',
      alignItems: captionSettings.position.includes('Top') ? 'flex-start' : captionSettings.position.includes('Bottom') ? 'flex-end' : 'center',
      textAlign: captionSettings.position.includes('Left') ? 'left' : captionSettings.position.includes('Right') ? 'right' : 'center'
    };
  };

  // Watermark Preview Logic
  const getWatermarkStyle = (): React.CSSProperties => {
    if (!watermarkSettings.file || containerSize.width === 0) return { display: 'none' };

    // Use a generic placeholder width to calculate position until image loads?
    // Actually, for React CSS, we can just use the absolute positioning and CSS width %.
    // The `calculateWatermarkPosition` util is for Canvas which needs exact pixels.
    // For DOM, let's use flex or absolute positioning closer to the logic.

    // HOWEVER, user requested "scale/size ... same in both preview and output".
    // Canvas uses explicit pixel drawing. DOM uses %.
    // If I say "width: 20%" in CSS, it is 20% of container width.
    // In Canvas, I will do `width = containerWidth * 0.2`.
    // This is perfectly consistent.

    const widthPercent = (watermarkSettings.scale * 100) + '%';
    const paddingPercent = '5%'; // consistent with 0.05 logic

    // We can map TextPosition to typical CSS alignments
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
    setVideoUrl(null);
    setMetadata(null);
    setCaptionSettings(prev => ({ ...prev, text: '' }));
    setWatermarkSettings(prev => ({ ...prev, file: null }));

    // 2. Immediately Clear Persistence
    PersistenceService.saveVideoverlayState({
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

  return (
    <div className="h-full flex bg-slate-900 overflow-hidden">
      {/* Settings Sidebar */}
      <div className="w-80 border-r border-slate-700 bg-slate-800 flex flex-col p-6 overflow-y-auto z-10 shadow-2xl">
        <h2 className="text-lg font-bold mb-8 text-slate-100 uppercase tracking-widest text-center">
          {t.tools.videoverlay.overlaySettings}
        </h2>

        {!file ? (
          <div className="space-y-6">
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <p className="text-md text-blue-400 leading-relaxed text-center">
                {t.tools.videoverlay.selectVideo}
              </p>
            </div>
            <label className="flex flex-col items-center justify-center gap-4 w-full h-48 rounded-3xl border-2 border-dashed border-slate-600 hover:border-purple-500 hover:bg-slate-700/50 cursor-pointer transition-all group">
              <div className="p-4 bg-slate-700 rounded-full group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-purple-400" />
              </div>
              <span className="text-sm font-bold text-slate-400">{t.tools.videoverlay.uploadVideo}</span>
              <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
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
        <div className="flex-1 relative flex flex-col items-center justify-center p-12 overflow-hidden gap-8">
          {!videoUrl ? (
            <div className="flex flex-col items-center gap-4 text-slate-600 animate-pulse">
              <VideoIcon className="w-24 h-24 stroke-[1px]" />
              <p className="font-bold uppercase tracking-[0.3em] text-xs">{t.tools.videoverlay.awaitingSource}</p>
            </div>
          ) : (
            <>
              <div
                ref={containerRef}
                className="relative group shadow-2xl rounded-2xl overflow-hidden border-4 border-slate-800 max-h-[60vh]"
                style={{
                  aspectRatio: metadata ? `${metadata.width} / ${metadata.height}` : '16 / 9'
                }}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onLoadedMetadata={onLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  className="max-h-[60vh] w-auto pointer-events-none"
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

                {/* Pause Overlay */}
                {!isPlaying && !isExporting && (
                  <div
                    className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center cursor-pointer group z-20"
                    onClick={togglePlay}
                  >
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-full border border-white/20 group-hover:scale-110 transition-all flex flex-col items-center gap-2">
                      <RotateCcw className="w-12 h-12 text-white" />
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">{t.tools.videoverlay.restartPreview}</span>
                    </div>
                  </div>
                )}
              </div>

              <PlaybackControls
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                currentTime={currentTime}
                duration={metadata?.duration || 0}
                isDisabled={isExporting}
              />

              {/* Remove Button - Positioned in Corner of Enclosing Area */}
              <button
                onClick={handleDeleteRequest}
                disabled={isExporting}
                className="absolute bottom-6 right-6 p-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl border border-red-500/20 transition-all shadow-lg backdrop-blur-sm z-30 group"
                title={t.tools.videoverlay.removeVideo}
              >
                <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </>
          )}
        </div>

        {/* Controls Bar */}
        {file && (
          <div className="bg-slate-800/80 backdrop-blur-md border-t border-slate-700 p-6 flex items-center justify-between">
            <div className="flex items-center gap-6">

              <div className="flex flex-col">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t.tools.videoverlay.resolution}</p>
                <p className="text-sm font-bold text-white">
                  {metadata ? `${metadata.width} x ${metadata.height}` : t.tools.videoverlay.calculating}
                </p>
              </div>

              {metadata && (
                <>
                  {metadata && metadata.creationTime && (
                    <div className="flex flex-col">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> {t.tools.videoverlay.mediaCreated}
                      </p>
                      <p className="text-sm font-bold text-white">
                        {metadata.creationTime.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end mr-4">
                <p className="text-[12px] font-black uppercase text-slate-500 tracking-widest">
                  {isExporting ? t.tools.videoverlay.highQualityRender : t.tools.videoverlay.processing}
                </p>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  {isExporting ? t.tools.videoverlay.frameByFrame : t.tools.videoverlay.browserNativeRender}
                </div>
              </div>
              <div className="hidden lg:flex flex-col items-end mr-4">
                <p className="text-[12px] font-black uppercase text-slate-500 tracking-widest">
                  {t.tools.videoverlay.clientSideNote}
                </p>
                <p className="text-[10px] text-slate-400">
                  {t.tools.videoverlay.privacyNote}
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
                    <span>{t.tools.videoverlay.processingProgress} {Math.round(exportProgress * 100)}%</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>{t.tools.videoverlay.exportVideo}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Constraints Notice Overlay - Updated for HQ Render */}
      {isExporting && (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex flex-col items-center justify-center p-8 animate-fadeIn">
          <div className="max-w-md text-center space-y-6">
            <div className="relative">
              <Loader2 className="w-20 h-20 text-purple-500 animate-spin mx-auto opacity-20" />
              <VideoIcon className="w-10 h-10 text-purple-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-white">{t.tools.videoverlay.generatingHQ}</h3>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-300 ease-out"
                style={{ width: `${exportProgress * 100}%` }}
              />
            </div>

            <p className="text-slate-400 leading-relaxed text-sm">
              {t.tools.videoverlay.hqNote}
            </p>
            <div className="flex items-center gap-3 p-4 bg-amber-900/20 border border-amber-500/20 rounded-2xl text-amber-500 text-xs text-left">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{t.tools.videoverlay.keepTabActive}</span>
            </div>

            <button
              onClick={requestCancel}
              className="px-6 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold uppercase tracking-wider transition-all"
            >
              {t.tools.videoverlay.cancelGeneration}
            </button>
          </div>
        </div>
      )}

      {/* Export Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelConfirm}
        onClose={closeCancelConfirm}
        onConfirm={confirmCancel}
        title={t.tools.videoverlay.abortGenerationTitle}
        message={t.tools.videoverlay.abortGenerationMsg}
        confirmLabel={t.tools.videoverlay.yesAbort}
        cancelLabel={t.tools.videoverlay.continue}
        Icon={AlertTriangle}
      />

      {/* Delete Video Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={t.tools.videoverlay.removeVideoTitle}
        message={t.tools.videoverlay.removeVideoMsg}
        confirmLabel={t.tools.videoverlay.yesRemove}
        cancelLabel={t.tools.videoverlay.cancel}
        Icon={Trash2}
      />
    </div>
  );
};