import React, { useRef, useEffect, useState } from 'react';
import { Slide, AspectRatio, ExportFormat, FilterMode, BorderSize } from '../../types';
import {
  calculateCaptionMetrics,
  calculateCaptionPosition,
  calculateWatermarkPosition,
} from '../../utils/captionUtils';
import { Mp4ExportService } from '../../services/Mp4ExportService';
import { Download, Loader2, AlertCircle, RotateCcw, Play, Pause } from 'lucide-react';

import { useLanguage } from '../../contexts/LanguageContext';

interface VideoPreviewProps {
  slides: Slide[];
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  audioDuration: number;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  aspectRatio: AspectRatio;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  slides,
  audioRef,
  audioDuration,
  isPlaying,
  setIsPlaying,
  currentTime,
  setCurrentTime,
  aspectRatio,
}) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>(ExportFormat.MP4);
  const [supportedFormats, setSupportedFormats] = useState<ExportFormat[]>([ExportFormat.MP4, ExportFormat.WebM]);
  const [watermarkImgs, setWatermarkImgs] = useState<Record<string, HTMLImageElement>>({});
  const [isHoveringPlayer, setIsHoveringPlayer] = useState(false);

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const checkSupport = async () => {
      let mp4Supported = false;

      // Check for MP4 support via WebCodecs (VideoEncoder)
      if ('VideoEncoder' in window) {
        try {
          const support = await VideoEncoder.isConfigSupported({
            codec: 'avc1.4d002a', // H.264 High Profile
            width: 1920,
            height: 1080,
            bitrate: 8_000_000,
            framerate: 30,
          });

          if (support.supported) {
            mp4Supported = true;
          }
        } catch (e) {
          console.error('Error checking VideoEncoder support:', e);
        }
      } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.4d002a')) {
        mp4Supported = true;
      }

      const formats = mp4Supported
        ? [ExportFormat.MP4, ExportFormat.WebM]
        : [ExportFormat.WebM];

      setSupportedFormats(formats);
      setExportFormat(mp4Supported ? ExportFormat.MP4 : ExportFormat.WebM);
    };

    checkSupport();
  }, []);

  // Preload watermarks when slides change
  useEffect(() => {
    const loadWatermarks = async () => {
      const newImgs: Record<string, HTMLImageElement> = {};
      for (const slide of slides) {
        if (slide.watermarkSettings?.file && !watermarkImgs[slide.id]) {
          const img = new Image();
          img.src = URL.createObjectURL(slide.watermarkSettings.file);
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
          newImgs[slide.id] = img;
        } else if (watermarkImgs[slide.id]) {
          newImgs[slide.id] = watermarkImgs[slide.id];
        }
      }
      setWatermarkImgs(newImgs);
    };

    loadWatermarks();
  }, [slides]);

  // Calculate high definition dimensions based on selected aspect ratio
  // Base unit 1080p
  const getDimensions = () => {
    switch (aspectRatio) {
      case AspectRatio.Landscape_16_9:
        return { w: 1920, h: 1080 };
      case AspectRatio.Portrait_9_16:
        return { w: 1080, h: 1920 };
      case AspectRatio.Portrait_3_4:
        return { w: 1080, h: 1440 };
      case AspectRatio.Square_1_1:
        return { w: 1080, h: 1080 };
      default:
        return { w: 1920, h: 1080 };
    }
  };

  const { w: CANVAS_WIDTH, h: CANVAS_HEIGHT } = getDimensions();

  const renderFrame = (ctx: CanvasRenderingContext2D, time: number) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (slides.length === 0 || audioDuration === 0) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 40px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        slides.length === 0
          ? audioRef.current
            ? t.tools.slidesync.addImagesToStart
            : t.tools.slidesync.addMediaToStart
          : t.tools.slidesync.addAudioToStart,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2
      );
      return;
    }

    const slideDuration = audioDuration / slides.length;
    let slideIndex = Math.floor(time / slideDuration);
    if (slideIndex >= slides.length) slideIndex = slides.length - 1;
    if (slideIndex < 0) slideIndex = 0;

    const currentSlide = slides[slideIndex];

    const img = new Image();
    img.src = currentSlide.previewUrl;

    try {
      const zoom = currentSlide.framingSettings.zoom || 1.0;
      const offsetX = currentSlide.framingSettings.offsetX || 0;
      const offsetY = currentSlide.framingSettings.offsetY || 0;

      // Use 'fit' scaling by default (Math.min instead of Math.max)
      const baseScale = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);

      const finalScale = baseScale * zoom;
      const w = img.width * finalScale;
      const h = img.height * finalScale;

      const baseX = (CANVAS_WIDTH - w) / 2;
      const baseY = (CANVAS_HEIGHT - h) / 2;

      const userX = (offsetX / 100) * CANVAS_WIDTH;
      const userY = (offsetY / 100) * CANVAS_HEIGHT;

      // Apply filter before drawing image
      ctx.filter =
        currentSlide.filterSettings === FilterMode.Grayscale
          ? 'grayscale(100%)'
          : currentSlide.filterSettings === FilterMode.Sepia
            ? 'sepia(100%)'
            : 'none';

      // Draw Border
      if (currentSlide.borderSettings.size && currentSlide.borderSettings.size > 0) {
        ctx.fillStyle = currentSlide.borderSettings.color || '#ffffff';
        ctx.fillRect(baseX + userX, baseY + userY, w, h);
      }

      // Draw image inside border (clip or just draw over)
      // For SlideSync, we can just draw over if we adjust the dimensions or just draw the border around the image.
      // PiCollage draws the border filling the whole rect, then clips for the image.
      // Let's follow PiCollage logic for consistency.
      const bSize = (currentSlide.borderSettings.size || 0) * (CANVAS_HEIGHT / 1080); // Scale border size
      
      if (bSize > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(baseX + userX + bSize, baseY + userY + bSize, w - 2 * bSize, h - 2 * bSize);
        ctx.clip();
        ctx.drawImage(img, baseX + userX, baseY + userY, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(img, baseX + userX, baseY + userY, w, h);
      }

      // Reset filter so caption/watermark are unaffected
      ctx.filter = 'none';
    } catch (e) {}

    if (currentSlide.captionSettings.text) {
      ctx.fillStyle = currentSlide.captionSettings.color;

      const metrics = calculateCaptionMetrics(CANVAS_WIDTH, CANVAS_HEIGHT, currentSlide.captionSettings);
      const position = calculateCaptionPosition(
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        metrics,
        currentSlide.captionSettings.position
      );

      ctx.font = `${currentSlide.captionSettings.isItalic ? 'italic ' : ''}bold ${metrics.fontSize}px Inter, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      ctx.textAlign = position.textAlign as CanvasTextAlign;

      metrics.lines.forEach((line, i) => {
        ctx.fillText(line, position.x, position.y + i * metrics.lineHeight);
      });
    }

    // Render Watermark
    const watermarkImg = watermarkImgs[currentSlide.id];
    if (watermarkImg && currentSlide.watermarkSettings) {
      const wWidth = CANVAS_WIDTH * currentSlide.watermarkSettings.scale;
      const wAspectRatio = watermarkImg.width / watermarkImg.height || 1;
      const wHeight = wWidth / wAspectRatio;

      const wPos = calculateWatermarkPosition(
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        wWidth,
        wHeight,
        currentSlide.watermarkSettings.position
      );

      ctx.globalAlpha = currentSlide.watermarkSettings.opacity;
      ctx.drawImage(watermarkImg, wPos.x, wPos.y, wWidth, wHeight);
      ctx.globalAlpha = 1.0;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      if (audioRef.current && isPlaying) {
        const time = audioRef.current.currentTime;
        setCurrentTime(time);

        if (time >= audioDuration && audioDuration > 0) {
          setIsPlaying(false);
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setCurrentTime(0);
        }
        renderFrame(ctx, time);
      } else if (!isPlaying) {
        renderFrame(ctx, currentTime);
      }
      animationRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, slides, audioDuration, currentTime, aspectRatio, t]);

  const togglePlay = () => {
    if (!audioRef.current || slides.length === 0) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current || slides.length === 0) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    audioRef.current.play();
    setIsPlaying(true);
  };

  const handleExport = async () => {
    if (!audioRef.current || slides.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRecording(true);
    setIsPlaying(false);
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentTime(0);

    // --- MP4 OFFLINE RENDER PATH ---
    if (exportFormat === ExportFormat.MP4) {
      try {
        // Fetch the audio file blob from the source URL to pass to the service
        // Note: audioRef.src might be a blob URL already if user uploaded it.
        let audioFile: File | null = null;
        if (audioRef.current.src) {
          const response = await fetch(audioRef.current.src);
          const blob = await response.blob();
          audioFile = new File([blob], 'audio.mp3', { type: blob.type });
        }

        const exporter = new Mp4ExportService();
        const blob = await exporter.export(
          slides,
          {
            width: getDimensions().w,
            height: getDimensions().h,
            fps: 30, // Consistently 30fps
            audioFile,
          },
          (progress) => {
            // Optional: could add progress state here
          }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `slidesync-${aspectRatio.replace(':', '-')}.mp4`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('MP4 Export Failed:', error);
        alert(t.tools.slidesync.exportFailed);
      } finally {
        setIsRecording(false);
      }
      return;
    }

    // --- WEBM RECORDING PATH (Original) ---
    const canvasStream = canvas.captureStream(30);
    const audioContext = new AudioContext();
    const response = await fetch(audioRef.current.src);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const dest = audioContext.createMediaStreamDestination();
    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(dest);

    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const mimeType =
      (exportFormat as string) === ExportFormat.MP4
        ? 'video/mp4;codecs=avc1.4d002a'
        : 'video/webm;codecs=vp9';

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 8000000, // 8 Mbps
      audioBitsPerSecond: 128000, // 128 kbps
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = (exportFormat as string) === ExportFormat.MP4 ? 'mp4' : 'webm';
      a.download = `slidesync-${aspectRatio.replace(':', '-')}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
      sourceNode.stop();
      audioContext.close();
    };

    recorder.start();
    sourceNode.start(0);

    const startTime = performance.now();
    const ctx = canvas.getContext('2d')!;
    const recordLoop = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed >= audioDuration) {
        recorder.stop();
        return;
      }
      renderFrame(ctx, elapsed);
      requestAnimationFrame(recordLoop);
    };
    recordLoop();
  };

  const isDisabled = slides.length === 0 || !audioRef.current;

  // CSS for dynamic aspect ratio display
  const getContainerAspect = () => {
    switch (aspectRatio) {
      case AspectRatio.Landscape_16_9:
        return 'aspect-video w-full max-h-full';
      case AspectRatio.Portrait_9_16:
        return 'aspect-[9/16] h-full max-h-full';
      case AspectRatio.Portrait_3_4:
        return 'aspect-[3/4] h-full max-h-full';
      case AspectRatio.Square_1_1:
        return 'aspect-square h-full max-h-full';
      default:
        return 'aspect-video w-full max-h-full';
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      <div
        className={`relative shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden border-4 border-slate-800 bg-black transition-all duration-500 ${getContainerAspect()}`}
        onMouseEnter={() => setIsHoveringPlayer(true)}
        onMouseLeave={() => setIsHoveringPlayer(false)}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain"
        />
        {!isPlaying && !isRecording && !isDisabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300 z-40">
            <div
              className="bg-white/10 backdrop-blur-md p-4 rounded-full border border-white/20 hover:scale-110 hover:bg-white/20 transition-all flex flex-col items-center gap-2 group pointer-events-auto cursor-pointer"
              onClick={handleRestart}
            >
              <RotateCcw className="w-8 h-8 text-white group-hover:rotate-[-45deg] transition-transform" />
              <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">
                {t.common.restartPreview}
              </span>
            </div>
          </div>
        )}

        {/* Player UI Overlay */}
        <div
          className={`absolute inset-0 z-30 flex flex-col transition-opacity duration-300 pointer-events-none ${isHoveringPlayer && !isRecording ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="flex-1 cursor-pointer pointer-events-auto" onClick={togglePlay} />

          {/* Bottom Bar */}
          <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex items-center gap-4 pointer-events-auto">
            <button
              onClick={togglePlay}
              className="text-white hover:text-tool-slidesync transition-transform active:scale-95 disabled:opacity-50"
              disabled={isDisabled || isRecording}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={audioDuration > 0 ? audioDuration : 100}
              step="0.033"
              value={currentTime}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCurrentTime(val);
                if (audioRef.current) {
                  audioRef.current.currentTime = val;
                }
              }}
              disabled={isDisabled || isRecording}
              className="flex-1 h-1.5 bg-slate-600 rounded-full appearance-none cursor-pointer accent-tool-slidesync hover:h-2 transition-all outline-none"
            />

            <div className="font-mono text-xs text-white tabular-nums drop-shadow-md pr-2 select-none">
              {formatTime(currentTime)} / {formatTime(audioDuration)}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-6 bottom-0 z-20 flex flex-col items-end gap-2">
        {/* Format Selector on top */}
        <div className="flex bg-slate-800/50 backdrop-blur-md rounded-xl p-1 border border-slate-700/50 shadow-lg">
          {supportedFormats.map((fmt) => (
            <button
              key={fmt}
              onClick={() => setExportFormat(fmt)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                exportFormat === fmt
                  ? 'bg-tool-slidesync text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title={
                fmt === ExportFormat.MP4
                  ? t.tools.slidesync.exportAsMp4
                  : t.tools.slidesync.exportAsWebm
              }
            >
              {fmt === ExportFormat.MP4 ? 'MP4' : 'WEBM'}
            </button>
          ))}
        </div>

        {/* Export Button on the bottom */}
        <button
          onClick={handleExport}
          disabled={isDisabled || isRecording}
          className={`flex items-center justify-center gap-3 px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all w-full min-w-[180px] ${
            isRecording
              ? 'bg-slate-800 text-slate-500'
              : 'bg-tool-slidesync hover:opacity-90 hover:scale-[1.02] text-white shadow-xl shadow-tool-slidesync/10 active:scale-95'
          }`}
        >
          {isRecording ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t.tools.slidesync.creating}</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>{t.tools.slidesync.exportClip}</span>
            </>
          )}
        </button>
      </div>
      {isRecording && (
        <div className="absolute top-12 bg-red-600/90 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-3 animate-pulse z-50 shadow-2xl border border-white/20">
          <div className="w-3 h-3 bg-white rounded-full"></div>
          <span className="font-bold uppercase tracking-wider text-xs">
            {t.tools.slidesync.recordingNote}
          </span>
        </div>
      )}
      {isDisabled && (
        <div className="absolute bottom-6 text-amber-500 flex items-center gap-3 text-xs font-bold uppercase tracking-widest bg-amber-950/40 backdrop-blur px-6 py-3 rounded-full border border-amber-900/50 z-10">
          <AlertCircle className="w-5 h-5" />
          {t.tools.slidesync.awaitingMedia}
        </div>
      )}
    </div>
  );
};
