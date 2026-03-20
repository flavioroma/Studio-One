import React from 'react';
import { FilterMode } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Check } from 'lucide-react';
import { CollapsiblePanel } from './CollapsiblePanel';

interface FilterSettingsPanelProps {
  currentFilter?: FilterMode;
  onChange: (filter: FilterMode) => void;
  themeColor?: string;
  collapsible?: boolean;
  applyToAll?: boolean;
  onApplyToAllChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  defaultExpanded?: boolean;
}

export const FilterSettingsPanel: React.FC<FilterSettingsPanelProps> = ({
  currentFilter = FilterMode.Normal,
  onChange,
  themeColor = 'tool-slidesync',
  collapsible = false,
  applyToAll = false,
  onApplyToAllChange,
  defaultExpanded = true,
}) => {
  const { t } = useLanguage();

  const options = [
    { id: FilterMode.Normal, label: t.common.filterNormal },
    { id: FilterMode.Grayscale, label: t.common.filterGrayscale },
    { id: FilterMode.Sepia, label: t.common.filterSepia },
  ];

  const themeClasses = {
    'tool-slidesync': {
      active: 'bg-tool-slidesync/20 border-tool-slidesync text-tool-slidesync',
      hover: 'hover:border-tool-slidesync/40',
    },
    'tool-photoverlay': {
      active: 'bg-tool-photoverlay/20 border-tool-photoverlay text-tool-photoverlay',
      hover: 'hover:border-tool-photoverlay/40',
    },
    'tool-picollage': {
      active: 'bg-tool-picollage/20 border-tool-picollage text-tool-picollage',
      hover: 'hover:border-tool-picollage/40',
    },
  }[themeColor] || {
    active: 'bg-blue-500/20 border-blue-500 text-blue-500',
    hover: 'hover:border-blue-500/40',
  };

  const content = (
    <div className="space-y-4">
      {onApplyToAllChange && (
        <div className="p-4 bg-slate-700/50 rounded-2xl border border-slate-600 hover:bg-slate-700/50 transition-all mb-2"
             style={{ borderColor: applyToAll ? `var(--${themeColor})` : undefined }}>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                applyToAll 
                  ? `bg-${themeColor} border-${themeColor}` 
                  : 'border-slate-500 group-hover:border-slate-400'
              }`}
            >
              {applyToAll && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
            </div>
            <span className="text-xs font-bold text-slate-300 group-hover:text-slate-100 transition-colors">
              {t.tools.photoverlay.applyFilterToAll}
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
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`p-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${
              currentFilter === opt.id
                ? themeClasses.active
                : `bg-slate-700/50 border-slate-600 ${themeClasses.hover}`
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (collapsible) {
    return (
      <CollapsiblePanel 
        title={t.common.filters} 
        themeColor={themeColor}
        defaultExpanded={defaultExpanded}
      >
        {content}
      </CollapsiblePanel>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest text-center">
        {t.common.filters}
      </h2>
      {content}
    </div>
  );
};
