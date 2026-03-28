import React from 'react';
import { BorderSize, TextColor } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Check } from 'lucide-react';
import { CollapsiblePanel } from './CollapsiblePanel';
import { ColorPalette } from './ColorPalette';

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


  const themeClasses = {
    'tool-slidesync': {
      active: 'bg-tool-slidesync/20 border-tool-slidesync text-tool-slidesync',
      hover: 'hover:border-tool-slidesync/40',
      check: 'bg-tool-slidesync border-tool-slidesync',
      checkHover: 'group-hover:border-tool-slidesync/80',
    },
    'tool-photoverlay': {
      active: 'bg-tool-photoverlay/20 border-tool-photoverlay text-tool-photoverlay',
      hover: 'hover:border-tool-photoverlay/40',
      check: 'bg-tool-photoverlay border-tool-photoverlay',
      checkHover: 'group-hover:border-tool-photoverlay/80',
    },
    'tool-picollage': {
      active: 'bg-tool-picollage/20 border-tool-picollage text-tool-picollage',
      hover: 'hover:border-tool-picollage/40',
      check: 'bg-tool-picollage border-tool-picollage',
      checkHover: 'group-hover:border-tool-picollage/80',
    },
  }[themeColor] || {
    active: 'bg-blue-500/20 border-blue-500 text-blue-500',
    hover: 'hover:border-blue-500/40',
    check: 'bg-blue-500 border-blue-500',
    checkHover: 'group-hover:border-blue-500/80',
  };

  return (
    <CollapsiblePanel
      title={t.tools.picollage.border}
      themeColor={themeColor}
      defaultExpanded={defaultExpanded}
    >
      <div className="space-y-6">
        {onApplyToAllChange && (
          <div className={`p-4 bg-slate-700/50 rounded-2xl border border-slate-600 hover:bg-slate-700/50 transition-all ${themeClasses.hover}`}>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                  applyToAll 
                    ? themeClasses.check 
                    : `border-slate-500 ${themeClasses.checkHover}`
                }`}
              >
                {applyToAll && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
              </div>
              <span className="text-xs font-bold text-slate-300 group-hover:text-slate-100 transition-colors">
                {themeColor === 'tool-slidesync' ? t.tools.slidesync.applyBorderToAll : themeColor === 'tool-picollage' ? t.tools.picollage.applyBorderToAll : t.tools.photoverlay.applyBorderToAll}
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
            <div className="animate-fadeIn pt-2">
              <ColorPalette
                selectedColor={borderColor}
                onColorChange={onColorChange}
                themeColor={themeColor}
              />
            </div>
          )}
        </div>
      </div>
    </CollapsiblePanel>
  );
};
