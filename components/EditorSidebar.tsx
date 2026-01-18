import React, { useRef, useState, useEffect } from 'react';
import { Slide, AspectRatio } from '../types';
import { calculateCaptionMetrics, calculateCaptionPosition } from '../utils/captionUtils';
import { Maximize, Move, AlignHorizontalSpaceAround, AlignVerticalSpaceAround } from 'lucide-react';
import { CaptionSettingsPanel } from './CaptionSettingsPanel';
import { useLanguage } from '../contexts/LanguageContext';

interface EditorSidebarProps {
  slide: Slide;
  onUpdate: (updates: Partial<Slide>) => void;
  onAutoCaption: () => void;
  isProcessing: boolean;
  aspectRatio: AspectRatio;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  slide,
  onUpdate,
  onAutoCaption,
  isProcessing,
  aspectRatio,
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Track container dimensions to scale the caption preview perfectly
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [aspectRatio, slide.id]);

  const getAspectStyle = () => {
    switch (aspectRatio) {
      case AspectRatio.Landscape_16_9: return '16 / 9';
      case AspectRatio.Portrait_9_16: return '9 / 16';
      case AspectRatio.Portrait_4_5: return '4 / 5';
      case AspectRatio.Square_1_1: return '1 / 1';
      default: return '16 / 9';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;

    const moveX = (dx / rect.width) * 100;
    const moveY = (dy / rect.height) * 100;

    onUpdate({
      offsetX: Math.max(-400, Math.min(400, (slide.offsetX || 0) + moveX)),
      offsetY: Math.max(-400, Math.min(400, (slide.offsetY || 0) + moveY))
    });

    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Improved Caption Preview Logic to match Canvas Rendering exactly
  const getCaptionStyle = (): React.CSSProperties => {
    // If we don't have dimensions yet, hide or default
    if (containerSize.width === 0) return { display: 'none' };

    const metrics = calculateCaptionMetrics(containerSize.width, containerSize.height, slide);
    const pos = calculateCaptionPosition(containerSize.width, containerSize.height, metrics, slide.position);

    // Convert Canvas baseline-centric Y to DOM box-top Y
    // Metric: y is baseline of first line. DOM Text top is approx y - fontSize.
    const topY = pos.y - metrics.fontSize;

    // Transform logic for X positioning
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
      whiteSpace: 'pre-wrap', // Handle newlines
      pointerEvents: 'none',
      textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
      zIndex: 20,
    };

    return style;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-100 uppercase tracking-tight">{t.tools.slidesync.slideProperties}</h3>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Maximize className="w-3 h-3 text-blue-400" /> {t.tools.slidesync.framingPreview}
        </label>

        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          className={`relative bg-black rounded-xl overflow-hidden border border-slate-700 shadow-2xl cursor-grab active:cursor-grabbing group transition-all duration-300`}
          style={{ aspectRatio: getAspectStyle() }}
        >
          {/* Draggable Image Layer */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              transform: `translate(${slide.offsetX || 0}%, ${slide.offsetY || 0}%) scale(${slide.zoom || 1})`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
          >
            <img
              src={slide.previewUrl}
              alt="Source"
              className="max-w-full max-h-full w-auto h-auto object-contain border border-white/20 shadow-2xl"
            />
          </div>

          {/* Caption Preview Overlay (Positioned exactly as it will appear on output) */}
          {slide.text && (
            <div style={getCaptionStyle()}>
              {slide.text}
            </div>
          )}

          {/* Viewport Overlay (Safe zone) */}
          <div className="absolute inset-0 border border-blue-500/20 pointer-events-none z-10">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-10">
              {[...Array(9)].map((_, i) => <div key={i} className="border border-white/20"></div>)}
            </div>
          </div>

          <div className="absolute top-2 left-2 bg-blue-600/80 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-tighter z-30">
            {t.tools.slidesync.output} {aspectRatio}
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity z-30">
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter bg-black/40 px-3 py-1 rounded-full">{t.tools.slidesync.panImage}</span>
          </div>
        </div>

        <div className="bg-slate-700/30 p-4 rounded-xl space-y-4 border border-slate-600/50">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
              <span>{t.tools.slidesync.magnification}</span>
              <span className="text-blue-400">{slide.zoom.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.01"
              value={slide.zoom}
              onChange={(e) => onUpdate({ zoom: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
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
      />
    </div>
  );
};