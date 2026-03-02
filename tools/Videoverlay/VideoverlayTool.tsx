import React, { useState, useRef, useEffect } from 'react';
import { Upload, Video as VideoIcon, Download, Trash2, RotateCcw, Loader2, AlertTriangle, Calendar, Monitor, Smartphone, Smartphone as SmartphoneIcon, Square, Volume2, VolumeX, Music, RotateCw, Flag, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { PlaybackControls } from '../../components/PlaybackControls';
import { MetadataService, VideoMetadata } from '../../services/MetadataService';
import { TextPosition, TextColor, TextSize, AspectRatio, Rotation, AudioMode, CaptionSettings, WatermarkSettings } from '../../types';
import { PersistenceService } from '../../services/PersistenceService';
import { Mp4ExportService } from '../../services/Mp4ExportService';
import { calculateCaptionMetrics, calculateCaptionPosition, calculateWatermarkPosition } from '../../utils/captionUtils';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { VideoverlaySidebar } from './VideoverlaySidebar';

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

  const [rotation, setRotation] = useState<Rotation>(Rotation.None);
  const [audioMode, setAudioMode] = useState<AudioMode>(AudioMode.Keep);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Abort Control
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Hover state for player controls
  const [isHoveringPlayer, setIsHoveringPlayer] = useState(false);

  // Preview Sizing
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load audio preview URL
  useEffect(() => {
    if (audioPreviewRef.current && audioFile && audioMode === AudioMode.Replace) {
      const url = URL.createObjectURL(audioFile);
      audioPreviewRef.current.src = url;
      return () => URL.revokeObjectURL(url);
    } else if (audioPreviewRef.current) {
      audioPreviewRef.current.src = "";
    }
  }, [audioFile, audioMode]);

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
        let time = video.currentTime;
        if (endTime > 0 && time >= endTime - 0.05) {
          video.pause();
          if (audioPreviewRef.current) audioPreviewRef.current.pause();
          setIsPlaying(false);
          video.currentTime = endTime;
          time = endTime;
        }
        setCurrentTime(time);

        // Sync custom audio preview
        if (audioPreviewRef.current && audioMode === AudioMode.Replace && !audioPreviewRef.current.paused) {
          const expectedAudioTime = Math.max(0, video.currentTime - startTime);
          if (Math.abs(audioPreviewRef.current.currentTime - expectedAudioTime) > 0.3) {
            audioPreviewRef.current.currentTime = expectedAudioTime;
          }
        }

        animationFrameId = requestAnimationFrame(loop);
      }
    };

    if (isPlaying) {
      if (endTime > 0 && (video.currentTime >= endTime || video.currentTime < startTime)) {
        video.currentTime = startTime;
      }
      loop();
    } else {
      // Ensure we catch the exact time when paused
      setCurrentTime(video.currentTime);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, startTime, endTime, audioMode]);

  // Global keyboard shortcuts for frame-by-frame navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in a text input or textarea
      const target = e.target as HTMLElement;
      const isRangeInput = target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range';
      const isTextInput =
        target.tagName === 'TEXTAREA' ||
        (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'range');

      if (isTextInput) return;

      // If it's a range input, let its native navigation (with our new 0.033 step) handle it
      if (isRangeInput) return;

      if (!videoRef.current || isExporting) return;

      const frameTime = 1 / 30; // Default to 30fps if unknown

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const newTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + frameTime);
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const newTime = Math.max(0, videoRef.current.currentTime - frameTime);
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExporting]);

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const url = URL.createObjectURL(selectedFile);
      setFile(selectedFile);
      setVideoUrl(url);
      setMetadata(null);
      setError(null);
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

        if (state.rotation !== undefined) setRotation(state.rotation);
        if (state.audioMode) setAudioMode(state.audioMode);
        if (state.audioFile) setAudioFile(state.audioFile);
        if (state.startTime !== undefined) setStartTime(state.startTime);
        if (state.endTime !== undefined) setEndTime(state.endTime);

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
        watermarkPosition: watermarkSettings.position,
        rotation,
        audioMode,
        audioFile,
        startTime,
        endTime
      });
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [file, captionSettings, watermarkSettings, rotation, audioMode, audioFile, startTime, endTime]);

  // Effect to handle metadata extraction when file changes
  useEffect(() => {
    if (!file) {
      setMetadata(null);
      setError(null);
      return;
    }

    const loadMetadata = async () => {
      try {
        const data = await MetadataService.getVideoMetadata(file);
        setMetadata(data);
        setError(null);
        if (data.duration) {
          setEndTime(prev => prev === 0 ? data.duration : prev);
        }
      } catch (err: any) {
        console.error("Metadata loading failed:", err);
        setError(t.tools.videoverlay.videoError);
      }
    };

    loadMetadata();
  }, [file, t.tools.videoverlay.videoError]);

  const onLoadedMetadata = () => {
    if (videoRef.current && file) {
      const vidDuration = videoRef.current.duration;
      setEndTime(prev => prev === 0 ? vidDuration : prev);

      // If metadata failed to load via service, but video element managed to load,
      // fallback to basic properties
      if (!metadata) {
        setMetadata({
          width: videoRef.current.videoWidth || 1920,
          height: videoRef.current.videoHeight || 1080,
          duration: vidDuration || 0,
          bitrate: 0
        });
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        if (audioPreviewRef.current) audioPreviewRef.current.pause();
      } else {
        const actualEndTime = endTime > 0 ? endTime : (metadata?.duration || videoRef.current.duration || 0);
        if (videoRef.current.currentTime >= actualEndTime - 0.1 || videoRef.current.currentTime < startTime) {
          videoRef.current.currentTime = startTime;
        }
        videoRef.current.play();
        if (audioPreviewRef.current && audioMode === AudioMode.Replace) {
          audioPreviewRef.current.currentTime = Math.max(0, videoRef.current.currentTime - startTime);
          audioPreviewRef.current.play().catch(e => console.error("Audio play failed", e));
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleExport = async () => {
    if (!file) return;

    setIsExporting(true);
    setIsPlaying(false);
    setExportProgress(0);
    if (videoRef.current) videoRef.current.pause();
    if (audioPreviewRef.current) audioPreviewRef.current.pause();

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
          } : undefined,
          rotation,
          audioMode,
          audioFile,
          startTime,
          endTime
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
    setRotation(Rotation.None);
    setAudioMode(AudioMode.Keep);
    setAudioFile(null);
    setStartTime(0);
    setEndTime(0);
    setError(null);

    // 2. Immediately Clear Persistence
    PersistenceService.saveVideoverlayState({
      file: null,
      caption: '',
      color: TextColor.White,
      position: TextPosition.BottomLeft,
      textSize: TextSize.Small,
      isItalic: false,
      watermarkFile: null,
      watermarkPosition: TextPosition.TopRight,
      rotation: Rotation.None,
      audioMode: AudioMode.Keep,
      audioFile: null,
      startTime: 0,
      endTime: 0
    });

    setShowDeleteConfirm(false);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  return (
    <div className="h-full flex bg-slate-900 overflow-hidden">
      <VideoverlaySidebar
        file={file}
        metadata={metadata}
        rotation={rotation}
        audioMode={audioMode}
        audioFile={audioFile}
        captionSettings={captionSettings}
        watermarkSettings={watermarkSettings}
        onFileChange={handleFileChange}
        onRotationChange={setRotation}
        onAudioModeChange={setAudioMode}
        onAudioFileChange={handleAudioUpload}
        onRemoveAudioFile={() => setAudioFile(null)}
        onCaptionUpdate={(updates) => setCaptionSettings(prev => ({ ...prev, ...updates }))}
        onWatermarkUpdate={(updates) => setWatermarkSettings(prev => ({ ...prev, ...updates }))}
        onDelete={handleDeleteRequest}
      />

      {/* Main Preview / Viewport */}

      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <div className="flex-1 relative flex flex-col items-center justify-center p-12 overflow-hidden gap-8">
          {!videoUrl ? (
            <div className="flex flex-col items-center gap-4 text-slate-600 animate-pulse">
              <VideoIcon className="w-24 h-24 stroke-[1px]" />
              <p className="font-bold uppercase tracking-[0.3em] text-xs">{t.tools.videoverlay.awaitingSource}</p>
            </div>
          ) : error ? (
            <div className="max-w-md w-full flex flex-col items-center gap-6 p-10 bg-slate-900/50 backdrop-blur-md rounded-3xl border border-red-500/20 shadow-2xl animate-fadeIn">
              <div className="p-4 bg-red-500/10 rounded-2xl">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-xl font-bold text-white">Video Error</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {error}
                </p>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setVideoUrl(null);
                  setError(null);
                }}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                {t.common.removeFile}
              </button>
            </div>
          ) : (
            <>
              <div
                ref={containerRef}
                className="relative group shadow-2xl rounded-2xl overflow-hidden border border-slate-700 bg-black max-h-[75vh]"
                style={{
                  aspectRatio: metadata ? `${(rotation === Rotation.CW_90 || rotation === Rotation.CCW_90 ? metadata.height : metadata.width)} / ${(rotation === Rotation.CW_90 || rotation === Rotation.CCW_90 ? metadata.width : metadata.height)}` : '16 / 9'
                }}
                onMouseEnter={() => setIsHoveringPlayer(true)}
                onMouseLeave={() => setIsHoveringPlayer(false)}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onLoadedMetadata={onLoadedMetadata}
                  onError={() => {
                    console.error("Video element error");
                    setError(t.tools.videoverlay.videoError);
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    if (audioPreviewRef.current) audioPreviewRef.current.pause();
                  }}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  className="w-full h-full object-contain pointer-events-none"
                  style={{
                    transform: (rotation === Rotation.CW_90 || rotation === Rotation.CCW_90)
                      ? `rotate(${rotation}deg) scale(${metadata ? Math.max(metadata.width, metadata.height) / Math.min(metadata.width, metadata.height) : 1})`
                      : `rotate(${rotation}deg)`,
                    transformOrigin: 'center center'
                  }}
                  muted={audioMode !== AudioMode.Keep}
                />

                <audio ref={audioPreviewRef} className="hidden" />

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

                {/* Player UI Overlay */}
                <div
                  className={`absolute inset-0 z-30 flex flex-col transition-opacity duration-300 ${isHoveringPlayer && !isExporting ? 'opacity-100' : 'opacity-0'}`}
                >
                  <div className="flex-1 cursor-pointer" onClick={togglePlay} />

                  {/* Bottom Bar */}
                  <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex items-center gap-4">
                    <button
                      onClick={togglePlay}
                      className="text-white hover:text-tool-videoverlay transition-transform active:scale-95 disabled:opacity-50"
                      disabled={isExporting}
                    >
                      {(() => {
                        const actualEndTime = endTime > 0 ? endTime : (metadata?.duration || 0);
                        const isEnded = !isPlaying && currentTime >= actualEndTime - 0.1;
                        if (isEnded) return <RotateCcw className="w-6 h-6" />;
                        if (isPlaying) return <Pause className="w-6 h-6 fill-current" />;
                        return <Play className="w-6 h-6 fill-current translate-x-0.5" />;
                      })()}
                    </button>

                    <input
                      type="range"
                      min={startTime}
                      max={endTime > 0 ? endTime : (metadata?.duration || 100)}
                      step="0.033"
                      value={currentTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCurrentTime(val);
                        if (videoRef.current) {
                          videoRef.current.currentTime = val;
                        }
                      }}
                      className="flex-1 h-1.5 bg-slate-600 rounded-full appearance-none cursor-pointer accent-tool-videoverlay hover:h-2 transition-all outline-none"
                    />

                    <div className="font-mono text-xs text-white tabular-nums drop-shadow-md pr-2 select-none">
                      {formatTime(currentTime)} / {formatTime(endTime > 0 ? endTime : (metadata?.duration || 0))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trimming Controls */}
              {!isExporting && metadata && (
                <div className="w-full max-w-2xl bg-slate-800/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-700 space-y-6 mt-4 z-20 shadow-xl">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => {
                        if (videoRef.current) setStartTime(Math.min(videoRef.current.currentTime, endTime - 0.01));
                      }}
                      className="flex-1 group/btn flex items-center justify-center gap-2 px-5 py-3 bg-slate-700 hover:bg-tool-videoverlay/20 hover:text-tool-videoverlay border border-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                    >
                      <Flag className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" /> {t.tools.audiotrim.setStart}
                    </button>
                    <button
                      onClick={() => {
                        if (videoRef.current) setEndTime(Math.max(videoRef.current.currentTime, startTime + 0.01));
                      }}
                      className="flex-1 group/btn flex items-center justify-center gap-2 px-5 py-3 bg-slate-700 hover:bg-tool-videoverlay/20 hover:text-tool-videoverlay border border-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                    >
                      <Flag className="w-3.5 h-3.5 fill-current group-hover/btn:scale-110 transition-transform" /> {t.tools.audiotrim.setEnd}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.tools.audiotrim.selectionStart}</label>
                        <span className="text-xs font-mono text-tool-videoverlay">
                          {Math.floor(startTime / 60)}:{Math.floor(startTime % 60).toString().padStart(2, '0')}.{Math.floor((startTime % 1) * 100).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div className="relative flex items-center gap-2">
                        <button
                          onClick={() => {
                            const newTime = Math.max(0, startTime - 0.1);
                            setStartTime(newTime);
                            if (videoRef.current) videoRef.current.currentTime = newTime;
                          }}
                          className="p-1 hover:text-white text-slate-500 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <input
                          type="range"
                          min="0"
                          max={metadata.duration || 100}
                          step="0.033"
                          value={startTime}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setStartTime(Math.min(val, endTime - 0.01));
                            if (videoRef.current) videoRef.current.currentTime = val;
                          }}
                          className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-tool-videoverlay"
                        />
                        <button
                          onClick={() => {
                            const newTime = Math.min(endTime - 0.01, startTime + 0.1);
                            setStartTime(newTime);
                            if (videoRef.current) videoRef.current.currentTime = newTime;
                          }}
                          className="p-1 hover:text-white text-slate-500 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.tools.audiotrim.selectionEnd}</label>
                        <span className="text-xs font-mono text-tool-videoverlay">
                          {Math.floor(endTime / 60)}:{Math.floor(endTime % 60).toString().padStart(2, '0')}.{Math.floor((endTime % 1) * 100).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div className="relative flex items-center gap-2">
                        <button
                          onClick={() => {
                            const newTime = Math.max(startTime + 0.01, endTime - 0.1);
                            setEndTime(newTime);
                            if (videoRef.current) videoRef.current.currentTime = newTime;
                          }}
                          className="p-1 hover:text-white text-slate-500 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <input
                          type="range"
                          min="0"
                          max={metadata.duration || 100}
                          step="0.033"
                          value={endTime}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setEndTime(Math.max(val, startTime + 0.01));
                            if (videoRef.current) videoRef.current.currentTime = val;
                          }}
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-tool-videoverlay"
                        />
                        <button
                          onClick={() => {
                            const newTime = Math.min(metadata.duration || 0, endTime + 0.1);
                            setEndTime(newTime);
                            if (videoRef.current) videoRef.current.currentTime = newTime;
                          }}
                          className="p-1 hover:text-white text-slate-500 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}
        </div>

        {/* Controls Bar */}
        {file && (
          <div className="bg-slate-800/80 backdrop-blur-md border-t border-slate-700 p-6 flex items-center justify-between">
            <div className="flex items-center gap-6">

              <div className="flex flex-col">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t.common.resolution}</p>
                <p className="text-sm font-bold text-white">
                  {metadata ? `${metadata.width} x ${metadata.height}` : t.tools.videoverlay.calculating}
                </p>
              </div>

              {metadata && (
                <>
                  {metadata && metadata.creationTime && (
                    <div className="flex flex-col">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> {t.common.mediaCreated}
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
                <div className="flex items-center gap-2 text-tool-videoverlay text-xs font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-tool-videoverlay animate-pulse"></div>
                  {isExporting ? t.tools.videoverlay.frameByFrame : t.tools.videoverlay.browserNativeRender}
                </div>
              </div>
              <div className="hidden lg:flex flex-col items-end mr-4">
                <p className="text-[12px] font-black uppercase text-slate-500 tracking-widest">
                  {t.tools.videoverlay.videoOutputTitle}
                </p>
                <p className="text-[10px] text-slate-400">
                  {t.tools.videoverlay.videoOutputDesc}
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-3 px-8 py-3.5 bg-tool-videoverlay hover:opacity-90 text-white font-black rounded-2xl transition-all shadow-xl shadow-tool-videoverlay/10 active:scale-95 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{Math.round(exportProgress * 100)}%</span>
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
              <Loader2 className="w-20 h-20 text-tool-videoverlay animate-spin mx-auto opacity-20" />
              <VideoIcon className="w-10 h-10 text-tool-videoverlay/80 absolute inset-0 m-auto animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-white">{t.tools.videoverlay.generatingHQ}</h3>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-tool-videoverlay transition-all duration-300 ease-out"
                style={{ width: `${Math.round(exportProgress * 100)}%` }}
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
        title={t.tools.videoverlay.cancelExport}
        message={t.tools.videoverlay.cancelConfirm}
        confirmLabel={t.tools.videoverlay.yesCancel}
        cancelLabel={t.tools.videoverlay.noContinue}
        Icon={AlertTriangle}
      />

      {/* Delete Video Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={t.common.eraseProject}
        message={t.common.eraseConfirm}
        confirmLabel={t.common.eraseProject}
        cancelLabel={t.common.cancel}
        Icon={Trash2}
      />
    </div>
  );
};