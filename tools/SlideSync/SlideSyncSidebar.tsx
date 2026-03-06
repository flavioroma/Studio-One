import React, { useRef, useState, useEffect } from 'react';
import { Slide, AspectRatio } from '../../types';
import { calculateCaptionMetrics, calculateCaptionPosition } from '../../utils/captionUtils';
import {
  Maximize,
  Move,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Plus,
  Music,
  Trash2,
  Monitor,
  Smartphone,
  Smartphone as SmartphoneIcon,
  Square,
  Image as ImageIcon,
} from 'lucide-react';
import { CaptionSettingsPanel } from '../../components/CaptionSettingsPanel';
import { useLanguage } from '../../contexts/LanguageContext';

interface SlideSyncSidebarProps {
  slide: Slide | null; // Allow null for when no slide is selected
  onUpdate: (updates: Partial<Slide>) => void;
  onAutoCaption: () => void;
  isProcessing: boolean;
  aspectRatio: AspectRatio;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  audioFile: File | null;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAudio: () => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  hasContent: boolean;
  onDeleteAll: () => void;
}

export const SlideSyncSidebar: React.FC<SlideSyncSidebarProps> = ({
  slide,
  onUpdate,
  onAutoCaption,
  isProcessing,
  aspectRatio,
  onImageUpload,
  audioFile,
  onAudioUpload,
  onRemoveAudio,
  onAspectRatioChange,
  hasContent,
  onDeleteAll,
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const formatOptions = [
    { id: AspectRatio.Landscape_16_9, label: '16:9', icon: Monitor },
    { id: AspectRatio.Portrait_9_16, label: '9:16', icon: Smartphone },
    { id: AspectRatio.Portrait_4_5, label: '4:5', icon: SmartphoneIcon },
    { id: AspectRatio.Square_1_1, label: '1:1', icon: Square },
  ];

  // Track container dimensions to scale the caption preview perfectly
  useEffect(() => {
    if (!containerRef.current || !slide) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [aspectRatio, slide?.id]);

  const getAspectStyle = () => {
    switch (aspectRatio) {
      case AspectRatio.Landscape_16_9:
        return '16 / 9';
      case AspectRatio.Portrait_9_16:
        return '9 / 16';
      case AspectRatio.Portrait_4_5:
        return '4 / 5';
      case AspectRatio.Square_1_1:
        return '1 / 1';
      default:
        return '16 / 9';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current || !slide) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;

    const moveX = (dx / rect.width) * 100;
    const moveY = (dy / rect.height) * 100;

    onUpdate({
      offsetX: Math.max(-400, Math.min(400, (slide.offsetX || 0) + moveX)),
      offsetY: Math.max(-400, Math.min(400, (slide.offsetY || 0) + moveY)),
    });

    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Improved Caption Preview Logic to match Canvas Rendering exactly
  const getCaptionStyle = (): React.CSSProperties => {
    // If we don't have dimensions yet, hide or default
    if (containerSize.width === 0 || !slide) return { display: 'none' };

    const metrics = calculateCaptionMetrics(containerSize.width, containerSize.height, slide);
    const pos = calculateCaptionPosition(
      containerSize.width,
      containerSize.height,
      metrics,
      slide.position
    );

    const topY = pos.y - metrics.fontSize;

    let transformX = '0%';
    if (pos.textAlign === 'center') transformX = '-50%';
    else if (pos.textAlign === 'right') transformX = '-100%';

    const style: React.CSSProperties = {
      color: slide.color,
      fontSize: `${metrics.fontSize}px`,
      lineHeight: '1.2',
      fontWeight: 'bold',
      fontStyle: slide.isItalic ? 'italic' : 'normal',
      fontFamily: 'Inter, sans-serif',
      position: 'absolute',
      left: `${pos.x}px`,
      top: `${topY}px`,
      textAlign: pos.textAlign,
      transform: `translateX(${transformX})`,
      whiteSpace: 'pre-wrap',
      pointerEvents: 'none',
      textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
      zIndex: 20,
    };

    return style;
  };

  return (
    <div
      className="space-y-6 flex flex-col h-full"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex items-center justify-center">
        <h3 className="text-md font-bold text-slate-100 uppercase tracking-tight">
          {t.tools.slidesync.mediaSettings}
        </h3>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-400">
            {t.tools.slidesync.backgroundMusic}
            <br />
            {t.tools.slidesync.backgroundMusicDesc}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="audio/*"
              onChange={onAudioUpload}
              className="hidden"
              id="audio-upload"
            />
            <label
              htmlFor="audio-upload"
              className={`flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-slate-600 hover:border-tool-slidesync/40 bg-slate-700/50 cursor-pointer transition-all ${audioFile ? 'bg-tool-slidesync/10 border-tool-slidesync/40 text-tool-slidesync/80' : ''}`}
            >
              <Music className="w-4 h-4" />
              <span className="text-sm truncate max-w-[120px]">
                {audioFile ? audioFile.name : t.tools.slidesync.selectAudio}
              </span>
            </label>
            {audioFile && (
              <button
                onClick={onRemoveAudio}
                className="p-3 text-red-400 hover:bg-red-900/20 rounded-xl"
                title={t.tools.slidesync.removeAudio}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-400">
            {t.tools.slidesync.uploadPhotos}
          </label>
          <div className="relative group">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={onImageUpload}
              className="hidden"
              id="img-upload"
            />
            <label
              htmlFor="img-upload"
              className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-slate-600 hover:border-tool-slidesync/40 bg-slate-700/50 cursor-pointer transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-medium">{t.tools.slidesync.addPhotos}</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-400">
            {t.tools.slidesync.videoFormat}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {formatOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onAspectRatioChange(opt.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                  aspectRatio === opt.id
                    ? 'bg-tool-slidesync/20 border-tool-slidesync text-tool-slidesync shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                    : 'bg-slate-700/50 border-slate-600 hover:border-tool-slidesync/40'
                }`}
              >
                <opt.icon className="w-4 h-4 mb-1" />
                <span className="text-[10px] font-bold uppercase">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <hr className="border-slate-700 my-4" />

      {slide ? (
        <div className="space-y-6 animate-fadeIn pb-8">
          <div className="flex items-center justify-center">
            <h3 className="text-md font-bold text-slate-100 uppercase tracking-tight">
              {t.tools.slidesync.slideProperties}
            </h3>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Maximize className="w-3 h-3 text-tool-slidesync" />{' '}
              {t.tools.slidesync.framingPreview}
            </label>

            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              className="relative bg-black rounded-xl overflow-hidden border border-slate-700 shadow-2xl cursor-grab active:cursor-grabbing group transition-all duration-300"
              style={{ aspectRatio: getAspectStyle() }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate(${slide.offsetX || 0}%, ${slide.offsetY || 0}%) scale(${slide.zoom || 1})`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                }}
              >
                <img
                  src={slide.previewUrl}
                  alt="Source"
                  className="max-w-full max-h-full w-auto h-auto object-contain border border-white/20 shadow-2xl"
                />
              </div>

              {slide.text && <div style={getCaptionStyle()}>{slide.text}</div>}

              <div className="absolute inset-0 border border-tool-slidesync/20 pointer-events-none z-10">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-10">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="border border-white/20"></div>
                  ))}
                </div>
              </div>

              <div className="absolute top-2 left-2 bg-tool-slidesync border border-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-tighter z-30">
                {t.tools.slidesync.output} {aspectRatio}
              </div>

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity z-30">
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter bg-black/40 px-3 py-1 rounded-full">
                  {t.tools.slidesync.panImage}
                </span>
              </div>
            </div>

            <div className="bg-slate-700/30 p-4 rounded-xl space-y-4 border border-slate-600/50">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                  <span>{t.tools.slidesync.magnification}</span>
                  <span className="text-tool-slidesync">{slide.zoom.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.01"
                  value={slide.zoom}
                  onChange={(e) => onUpdate({ zoom: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-tool-slidesync"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdate({ offsetX: 0 })}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-colors"
                  title={t.tools.slidesync.centerX}
                >
                  <AlignHorizontalSpaceAround className="w-3 h-3" /> {t.tools.slidesync.centerX}
                </button>
                <button
                  onClick={() => onUpdate({ offsetY: 0 })}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-colors"
                  title={t.tools.slidesync.centerY}
                >
                  <AlignVerticalSpaceAround className="w-3 h-3" /> {t.tools.slidesync.centerY}
                </button>
              </div>

              <button
                onClick={() => onUpdate({ offsetX: 0, offsetY: 0, zoom: 1.0 })}
                className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-colors"
              >
                <Move className="w-3 h-3" /> {t.tools.slidesync.resetFraming}
              </button>
            </div>
          </div>

          <CaptionSettingsPanel
            settings={slide}
            onUpdate={onUpdate}
            onAutoCaption={onAutoCaption}
            isProcessing={isProcessing}
            themeColor="tool-slidesync"
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center opacity-40">
          <ImageIcon className="w-12 h-12 mb-4" />
          <p className="text-sm font-medium">{t.tools.slidesync.noSlideSelected}</p>
        </div>
      )}
      {hasContent && (
        <div className="pt-6 pb-4 mt-auto border-t border-slate-700">
          <button
            onClick={onDeleteAll}
            className="w-full flex items-center justify-center gap-3 p-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-2xl transition-all group"
          >
            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">
              {t.common.eraseProject}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
