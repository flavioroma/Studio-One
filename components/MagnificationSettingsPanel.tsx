import React, { useRef, useState, useEffect } from 'react';
import { Maximize, Move, AlignHorizontalSpaceAround, AlignVerticalSpaceAround } from 'lucide-react';
import { FramingSettings, AspectRatio } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface MagnificationSettingsPanelProps {
  imageUrl: string;
  settings: FramingSettings;
  onUpdate: (updates: Partial<FramingSettings>) => void;
  aspectRatio: AspectRatio;
  sourceDimensions?: { width: number; height: number } | null;
  themeColor?: string;
  captionText?: string;
  getCaptionStyle?: () => React.CSSProperties;
}

export const MagnificationSettingsPanel: React.FC<MagnificationSettingsPanelProps> = ({
  imageUrl,
  settings,
  onUpdate,
  aspectRatio,
  sourceDimensions,
  themeColor,
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

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
      offsetX: Math.max(-400, Math.min(400, (settings.offsetX || 0) + moveX)),
      offsetY: Math.max(-400, Math.min(400, (settings.offsetY || 0) + moveY)),
    });

    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getAspectStyle = () => {
    if (aspectRatio === AspectRatio.Original && sourceDimensions) {
      return `${sourceDimensions.width} / ${sourceDimensions.height}`;
    }
    switch (aspectRatio) {
      case AspectRatio.Landscape_16_9:
        return '16 / 9';
      case AspectRatio.Portrait_9_16:
        return '9 / 16';
      case AspectRatio.Portrait_3_4:
        return '3 / 4';
      case AspectRatio.Square_1_1:
        return '1 / 1';
      default:
        return '1 / 1';
    }
  };

  const themeClasses = {
    'tool-slidesync': {
      text: 'text-tool-slidesync',
      accent: 'accent-tool-slidesync',
      border: 'border-tool-slidesync/20',
      bg: 'bg-tool-slidesync',
      borderHover: 'hover:border-tool-slidesync/40',
    },
    'tool-photoverlay': {
      text: 'text-tool-photoverlay',
      accent: 'accent-tool-photoverlay',
      border: 'border-tool-photoverlay/20',
      bg: 'bg-tool-photoverlay',
      borderHover: 'hover:border-tool-photoverlay/40',
    },
    'tool-picollage': {
      text: 'text-tool-picollage',
      accent: 'accent-tool-picollage',
      border: 'border-tool-picollage/20',
      bg: 'bg-tool-picollage',
      borderHover: 'hover:border-tool-picollage/40',
    },
  }[themeColor] || {
    text: 'text-blue-500',
    accent: 'accent-blue-500',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500',
    borderHover: 'hover:border-blue-500/40',
  };

  return (
    <div className="space-y-3" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <Maximize className={`w-3 h-3 ${themeClasses.text}`} /> {t.tools.slidesync.framingPreview}
      </label>

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        className={`relative bg-black rounded-xs overflow-hidden border border-slate-700 shadow-2xl cursor-grab active:cursor-grabbing group transition-all duration-300`}
        style={{ aspectRatio: getAspectStyle() }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            transform: `translate(${settings.offsetX || 0}%, ${settings.offsetY || 0}%) scale(${settings.zoom || 1})`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <img
            src={imageUrl}
            alt="Source"
            className="max-w-full max-h-full w-auto h-auto object-contain border border-white/20 shadow-2xl"
          />
        </div>

        <div className={`absolute inset-0 border ${themeClasses.border} pointer-events-none z-10`}>
          <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-10">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="border border-white/20"></div>
            ))}
          </div>
        </div>

        {themeColor === 'tool-slidesync' && (
          <div
            className={`absolute top-2 left-2 ${themeClasses.bg} border border-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-tighter z-30`}
          >
            {t.common.output} {aspectRatio}
          </div>
        )}

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
            <span className={themeClasses.text}>{settings.zoom.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.01"
            value={settings.zoom}
            onChange={(e) => onUpdate({ zoom: parseFloat(e.target.value) })}
            className={`w-full h-1 bg-slate-700 rounded-lg cursor-pointer range-sm ${themeClasses.accent} transition-all`}
            aria-label={t.tools.slidesync.magnification}
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
  );
};
