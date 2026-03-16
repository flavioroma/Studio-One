import React, { useRef } from 'react';
import { Upload, Trash2, Layout, Image as ImageIcon } from 'lucide-react';
import { TextPosition, WatermarkSettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface WatermarkSettingsPanelProps {
  settings: WatermarkSettings;
  onUpdate: (updates: Partial<WatermarkSettings>) => void;
  themeColor?: string;
}

export const WatermarkSettingsPanel: React.FC<WatermarkSettingsPanelProps> = ({
  settings,
  onUpdate,
  themeColor = 'blue-500', // Fallback
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpdate({ file: e.target.files[0] });
    }
  };

  const handleRemove = () => {
    onUpdate({ file: null });
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const themeClasses = {
    'tool-audiotrim': {
      borderHover: 'hover:border-tool-audiotrim',
      text: 'text-tool-audiotrim',
      accent: 'accent-tool-audiotrim',
      ring: 'focus:ring-tool-audiotrim',
    },
    'tool-slidesync': {
      borderHover: 'hover:border-tool-slidesync',
      text: 'text-tool-slidesync',
      accent: 'accent-tool-slidesync',
      ring: 'focus:ring-tool-slidesync',
    },
    'tool-photoverlay': {
      borderHover: 'hover:border-tool-photoverlay',
      text: 'text-tool-photoverlay',
      accent: 'accent-tool-photoverlay',
      ring: 'focus:ring-tool-photoverlay',
    },
    'tool-videoverlay': {
      borderHover: 'hover:border-tool-videoverlay',
      text: 'text-tool-videoverlay',
      accent: 'accent-tool-videoverlay',
      ring: 'focus:ring-tool-videoverlay',
    },
  }[themeColor] || {
    borderHover: 'hover:border-blue-500',
    text: 'text-blue-500',
    accent: 'accent-blue-500',
    ring: 'focus:ring-blue-500',
  };

  if (!settings.file) {
    return (
      <div className="space-y-4 pt-4 border-t border-slate-700 animate-fadeIn">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <ImageIcon className="w-3 h-3" /> {t.watermark.title}
        </h3>
        <label
          className={`flex flex-col items-center justify-center gap-3 w-full h-24 rounded-2xl border-1 border-slate-700 ${themeClasses.borderHover} hover:bg-slate-700/30 cursor-pointer transition-all group`}
        >
          <div className="p-2 bg-slate-800 rounded-full group-hover:scale-110 transition-transform">
            <Upload className={`w-4 h-4 ${themeClasses.text}`} />
          </div>
          <span
            className={`text-[10px] font-bold text-slate-500 group-hover:${themeClasses.text} uppercase tracking-wider`}
          >
            {t.watermark.upload}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4 border-t border-slate-700 animate-fadeIn">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <ImageIcon className="w-3 h-3" /> {t.watermark.title}
        </label>
        <button
          onClick={handleRemove}
          className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 uppercase tracking-tight transition-colors"
        >
          <Trash2 className="w-3 h-3" /> {t.watermark.remove}
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {/* Tiny Preview */}
          <div className="w-10 h-10 bg-slate-800 rounded-lg p-1 border border-slate-700 shrink-0">
            <img
              src={URL.createObjectURL(settings.file)}
              className="w-full h-full object-contain"
              alt="Watermark"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-200 truncate">{settings.file.name}</p>
            <p className="text-[10px] text-slate-500 font-medium">
              {(settings.file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Layout className="w-3 h-3" /> {t.watermark.position}
          </label>
          <select
            value={settings.position}
            onChange={(e) => onUpdate({ position: e.target.value as TextPosition })}
            className={`w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-[11px] font-bold focus:ring-2 ${themeClasses.ring} focus:outline-none appearance-none`}
          >
            {Object.values(TextPosition).map((pos) => (
              <option key={pos} value={pos}>
                {t.captions.textPositions[pos]}
              </option>
            ))}
          </select>
        </div>

        {/* Size Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {t.watermark.size}
            </label>
            <span className="text-[10px] font-medium text-slate-400">
              {Math.round(settings.scale * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="90"
            step="1"
            value={settings.scale * 100}
            onChange={(e) => onUpdate({ scale: parseInt(e.target.value) / 100 })}
            className={`w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer ${themeClasses.accent}`}
          />
        </div>

        {/* Opacity Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {t.watermark.opacity}
            </label>
            <span className="text-[10px] font-medium text-slate-400">
              {Math.round(settings.opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="1"
            value={settings.opacity * 100}
            onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) / 100 })}
            className={`w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer ${themeClasses.accent}`}
          />
        </div>
      </div>
    </div>
  );
};
