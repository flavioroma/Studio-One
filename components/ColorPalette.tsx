import React from 'react';
import { Palette } from 'lucide-react';
import { TextColor } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ColorPaletteProps {
  selectedColor: TextColor;
  onColorChange: (color: TextColor) => void;
  themeColor?: string;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  selectedColor,
  onColorChange,
  themeColor = 'tool-photoverlay',
}) => {
  const { t } = useLanguage();

  const ringHalfClass = {
    'tool-audiotrim': 'ring-tool-audiotrim/50',
    'tool-slidesync': 'ring-tool-slidesync/50',
    'tool-photoverlay': 'ring-tool-photoverlay/50',
    'tool-videoverlay': 'ring-tool-videoverlay/50',
    'tool-picollage': 'ring-tool-picollage/50',
  }[themeColor] || 'ring-blue-600/50';

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <Palette className="w-3 h-3" /> {t.captions.colorPalette}
      </label>
      <div className="grid grid-cols-10 gap-1.5 pt-1">
        {Object.entries(TextColor).map(([name, hex]) => (
          <button
            key={name}
            onClick={() => onColorChange(hex as TextColor)}
            className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 ${
              selectedColor === hex
                ? `border-white ring-2 ${ringHalfClass}`
                : 'border-transparent'
            }`}
            style={{ backgroundColor: hex }}
            title={name}
          />
        ))}
      </div>
    </div>
  );
};
