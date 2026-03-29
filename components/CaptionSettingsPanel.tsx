import React from 'react';
import { Wand2, Type, Italic } from 'lucide-react';
import { TextPosition, TextColor, TextSize, CaptionSettings } from '../types';
import { ColorPalette } from './ColorPalette';
import { useLanguage } from '../contexts/LanguageContext';

interface CaptionSettingsPanelProps {
  settings: CaptionSettings;
  onUpdate: (updates: Partial<CaptionSettings>) => void;
  onAutoCaption?: () => void;
  isProcessing?: boolean;
  themeColor?: string;
}

export const CaptionSettingsPanel: React.FC<CaptionSettingsPanelProps> = ({
  settings,
  onUpdate,
  onAutoCaption,
  isProcessing = false,
  themeColor = 'blue-500', // Fallback
}) => {
  const { t } = useLanguage();

  const themeClasses = {
    'tool-audiotrim': {
      bg: 'bg-tool-audiotrim',
      ring: 'focus:ring-tool-audiotrim',
      ringHalf: 'ring-tool-audiotrim/50',
      hoverText: 'hover:text-tool-audiotrim',
    },
    'tool-slidesync': {
      bg: 'bg-tool-slidesync',
      ring: 'focus:ring-tool-slidesync',
      ringHalf: 'ring-tool-slidesync/50',
      hoverText: 'hover:text-tool-slidesync',
    },
    'tool-photoverlay': {
      bg: 'bg-tool-photoverlay',
      ring: 'focus:ring-tool-photoverlay',
      ringHalf: 'ring-tool-photoverlay/50',
      hoverText: 'hover:text-tool-photoverlay',
    },
    'tool-videoverlay': {
      bg: 'bg-tool-videoverlay',
      ring: 'focus:ring-tool-videoverlay',
      ringHalf: 'ring-tool-videoverlay/50',
      hoverText: 'hover:text-tool-videoverlay',
    },
    'tool-picollage': {
      bg: 'bg-tool-picollage',
      ring: 'focus:ring-tool-picollage',
      ringHalf: 'ring-tool-picollage/50',
      hoverText: 'hover:text-tool-picollage',
    },
  }[themeColor] || {
    bg: 'bg-blue-600',
    ring: 'focus:ring-blue-600',
    ringHalf: 'ring-blue-600/50',
    hoverText: 'hover:text-blue-600',
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {t.captions.captionText}
          </label>
          {/* {onAutoCaption && (
            <button
              onClick={onAutoCaption}
              disabled={isProcessing}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                isProcessing
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : `bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600`
              }`}
              title={t.tools.slidesync.autoCaption}
            >
              {isProcessing ? (
                <div className="w-3 h-3 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin" />
              ) : (
                <Wand2 className={`w-3 h-3 ${themeColor === 'tool-slidesync' ? 'text-tool-slidesync' : 'text-tool-photoverlay'}`} />
              )}
              {isProcessing ? t.captions.thinking : t.tools.slidesync.analyze}
            </button>
          )} */}
        </div>
        <textarea
          value={settings.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className={`w-full bg-slate-700 border border-slate-600 rounded-xl p-3 text-sm ${themeClasses.ring} focus:ring-2 focus:outline-none resize-none h-24`}
          placeholder={t.captions.enterOverlayText}
        />
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Italic className="w-3 h-3" /> {t.captions.textStyle}
            </label>
            <div className="flex bg-slate-700 p-1 rounded-xl border border-slate-600">
              <button
                onClick={() => onUpdate({ isItalic: false })}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${!settings.isItalic ? `${themeClasses.bg} text-white shadow-lg` : `text-slate-400 ${themeClasses.hoverText}`}`}
              >
                {t.captions.normal}
              </button>
              <button
                onClick={() => onUpdate({ isItalic: true })}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${settings.isItalic ? `${themeClasses.bg} text-white shadow-lg` : `text-slate-400 ${themeClasses.hoverText}`}`}
              >
                {t.captions.italic}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Type className="w-3 h-3" /> {t.captions.textSize}
            </label>
            <div className="flex bg-slate-700 p-1 rounded-xl border border-slate-600">
              {Object.values(TextSize).map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdate({ textSize: size })}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    settings.textSize === size
                      ? `${themeClasses.bg} text-white shadow-lg`
                      : `text-slate-400 ${themeClasses.hoverText}`
                  }`}
                >
                  {t.captions.textSizes[size]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {t.captions.position}
            </label>
            <select
              value={settings.position}
              onChange={(e) => onUpdate({ position: e.target.value as TextPosition })}
              className={`w-full bg-slate-700 border border-slate-600 rounded-xl p-2.5 text-[11px] font-bold focus:ring-2 ${themeClasses.ring} focus:outline-none appearance-none`}
            >
              {Object.values(TextPosition).map((pos) => (
                <option key={pos} value={pos}>
                  {t.captions.textPositions[pos]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ColorPalette
          selectedColor={settings.color}
          onColorChange={(color) => onUpdate({ color })}
          themeColor={themeColor}
        />
      </div>
    </div>
  );
};
