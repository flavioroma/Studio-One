import React from 'react';
import { FilterMode } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface FilterSettingsPanelProps {
  currentFilter?: FilterMode;
  onChange: (filter: FilterMode) => void;
  themeColor?: string;
}

export const FilterSettingsPanel: React.FC<FilterSettingsPanelProps> = ({
  currentFilter = FilterMode.Normal,
  onChange,
  themeColor = 'tool-slidesync',
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

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {t.common.filters}
      </label>
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
};
