import React from 'react';
import { Check } from 'lucide-react';
import { CaptionSettingsPanel } from './CaptionSettingsPanel';
import { WatermarkSettingsPanel } from './WatermarkSettingsPanel';
import { CollapsiblePanel } from './CollapsiblePanel';
import { CaptionSettings, WatermarkSettings, TextColor, TextPosition, TextSize } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface OverlaySettingsPanelProps {
  applyToAll: boolean;
  onApplyToAllChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  captionSettings: CaptionSettings;
  onCaptionUpdate: (updates: Partial<CaptionSettings>) => void;
  watermarkSettings: WatermarkSettings;
  onWatermarkUpdate: (updates: Partial<WatermarkSettings>) => void;
  onAutoCaption?: () => void;
  isProcessing?: boolean;
  themeColor?: string;
  defaultExpanded?: boolean;
}

export const OverlaySettingsPanel: React.FC<OverlaySettingsPanelProps> = ({
  applyToAll,
  onApplyToAllChange,
  captionSettings,
  onCaptionUpdate,
  watermarkSettings,
  onWatermarkUpdate,
  onAutoCaption,
  isProcessing,
  themeColor = 'tool-photoverlay',
  defaultExpanded = true,
}) => {
  const { t } = useLanguage();

  return (
    <CollapsiblePanel 
      title={t.common.overlay} 
      themeColor={themeColor}
      defaultExpanded={defaultExpanded}
    >
      <div className="space-y-6">
        <div className={`p-4 bg-slate-700/50 rounded-2xl border border-slate-600 hover:bg-slate-700/50 transition-all ${themeColor === 'tool-slidesync' ? 'hover:border-tool-slidesync/40' : 'hover:border-tool-photoverlay/40'}`}>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${applyToAll ? (themeColor === 'tool-slidesync' ? 'bg-tool-slidesync border-tool-slidesync' : 'bg-tool-photoverlay border-tool-photoverlay') : (themeColor === 'tool-slidesync' ? 'border-slate-500 group-hover:border-tool-slidesync/80' : 'border-slate-500 group-hover:border-tool-photoverlay/80')}`}
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

        <div className="space-y-8 animate-fadeIn pb-4">
          <CaptionSettingsPanel
            settings={captionSettings}
            onUpdate={onCaptionUpdate}
            onAutoCaption={onAutoCaption}
            isProcessing={isProcessing}
            themeColor={themeColor}
          />

          <WatermarkSettingsPanel
            settings={watermarkSettings}
            onUpdate={onWatermarkUpdate}
            themeColor={themeColor}
          />
        </div>
      </div>
    </CollapsiblePanel>
  );
};
