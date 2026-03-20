import React from 'react';
import { MagnificationSettingsPanel } from './MagnificationSettingsPanel';
import { CollapsiblePanel } from './CollapsiblePanel';
import { FramingSettings, AspectRatio } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface FramingSettingsPanelProps {
  imageUrl: string;
  settings: FramingSettings;
  onUpdate: (updates: Partial<FramingSettings>) => void;
  aspectRatio: AspectRatio;
  sourceDimensions?: { width: number; height: number } | null;
  themeColor?: string;
  defaultExpanded?: boolean;
}

export const FramingSettingsPanel: React.FC<FramingSettingsPanelProps> = ({
  imageUrl,
  settings,
  onUpdate,
  aspectRatio,
  sourceDimensions,
  themeColor = 'tool-photoverlay',
  defaultExpanded = true,
}) => {
  const { t } = useLanguage();

  return (
    <CollapsiblePanel 
      title={t.tools.photoverlay.framing} 
      themeColor={themeColor}
      defaultExpanded={defaultExpanded}
    >
      <div className="px-1">
        <MagnificationSettingsPanel
          imageUrl={imageUrl}
          settings={settings}
          onUpdate={onUpdate}
          aspectRatio={aspectRatio}
          sourceDimensions={sourceDimensions}
          themeColor={themeColor}
        />
      </div>
    </CollapsiblePanel>
  );
};
