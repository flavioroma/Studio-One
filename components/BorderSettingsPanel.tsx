import React from 'react';
import { BorderSize, TextColor } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Check } from 'lucide-react';
import { CollapsiblePanel } from './CollapsiblePanel';

interface BorderSettingsPanelProps {
  borderSize: BorderSize;
  borderColor: TextColor;
  onSizeChange: (size: BorderSize) => void;
  onColorChange: (color: TextColor) => void;
  themeColor?: string;
  applyToAll?: boolean;
  onApplyToAllChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  defaultExpanded?: boolean;
}

export const BorderSettingsPanel: React.FC<BorderSettingsPanelProps> = ({
  borderSize,
  borderColor,
  onSizeChange,
  onColorChange,
  themeColor = 'tool-slidesync',
  applyToAll = false,
  onApplyToAllChange,
  defaultExpanded = false,
}) => {
  const { t } = useLanguage();

  const borderOptions = [
    { id: BorderSize.None, label: t.tools.picollage.borderNone },
    { id: BorderSize.Small, label: t.tools.picollage.borderSmall },
    { id: BorderSize.Medium, label: t.tools.picollage.borderMedium },
    { id: BorderSize.Large, label: t.tools.picollage.borderLarge },
  ];

  const colorOptions = Object.values(TextColor);

  const themeClasses = {
    'tool-slidesync': {
      active: 'bg-tool-slidesync/20 border-tool-slidesync text-tool-slidesync',
      hover: 'hover:border-tool-slidesync/40',
      check: 'bg-tool-slidesync border-tool-slidesync',
    },
    'tool-photoverlay': {
      active: 'bg-tool-photoverlay/20 border-tool-photoverlay text-tool-photoverlay',
      hover: 'hover:border-tool-photoverlay/40',
      check: 'bg-tool-photoverlay border-tool-photoverlay',
    },
    'tool-picollage': {
      active: 'bg-tool-picollage/20 border-tool-picollage text-tool-picollage',
      hover: 'hover:border-tool-picollage/40',
      check: 'bg-tool-picollage border-tool-picollage',
    },
  }[themeColor] || {
    active: 'bg-blue-500/20 border-blue-500 text-blue-500',
    hover: 'hover:border-blue-500/40',
    check: 'bg-blue-500 border-blue-500',
  };

  return (
    <CollapsiblePanel
      title={t.tools.picollage.border}
      themeColor={themeColor}
      defaultExpanded={defaultExpanded}
    >
      <div className="space-y-6">
        {onApplyToAllChange && (
          <div className="p-4 bg-slate-700/50 rounded-2xl border border-slate-600 hover:bg-slate-700/50 transition-all shadow-inner"
               style={{ borderColor: applyToAll ? `var(--${themeColor})` : undefined }}>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                  applyToAll 
                    ? themeClasses.check 
                    : 'border-slate-500 group-hover:border-slate-400'
                }`}
              >
                {applyToAll && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
              </div>
              <span className="text-xs font-bold text-slate-300 group-hover:text-slate-100 transition-colors">
                {themeColor === 'tool-slidesync' ? t.tools.slidesync.applyToAll : t.tools.photoverlay.applyToAll}
              </span>
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={onApplyToAllChange}
                className="hidden"
              />
            </label>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {borderOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onSizeChange(opt.id)}
                className={`p-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                  borderSize === opt.id
                    ? themeClasses.active
                    : `bg-slate-700/50 border-slate-600 ${themeClasses.hover}`
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {borderSize !== BorderSize.None && (
            <div className="space-y-3 animate-fadeIn pt-2 border-t border-slate-700/50">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                {t.common.color}
              </label>
              <div className="grid grid-cols-5 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => onColorChange(color)}
                    className={`group relative w-full aspect-square rounded-full border-2 transition-all hover:scale-110 active:scale-90 ${
                      borderColor === color ? 'border-white shadow-lg' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    {borderColor === color && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className={`w-3 h-3 ${color === TextColor.White ? 'text-slate-900' : 'text-white'}`} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </CollapsiblePanel>
  );
};
