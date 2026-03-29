import React from 'react';
import { Trash2, Monitor, Smartphone, Square, Tablet, Image as ImageIcon } from 'lucide-react';
import { AspectRatio, PiCollagePicture, BorderSize, FilterMode, CaptionSettings, WatermarkSettings, FramingSettings, TextColor, TextPosition, TextSize } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { FileDropZone } from '../../components/FileDropZone';
import { FilterSettingsPanel } from '../../components/FilterSettingsPanel';
import { BorderSettingsPanel } from '../../components/BorderSettingsPanel';
import { FramingSettingsPanel } from '../../components/FramingSettingsPanel';
import { OverlaySettingsPanel } from '../../components/OverlaySettingsPanel';

interface PiCollageSidebarProps {
  pictures: PiCollagePicture[];
  activePictureId: string | null;
  aspectRatio: AspectRatio;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onUpdatePicture: (id: string, updates: Partial<PiCollagePicture>) => void;
  onCaptionUpdate: (updates: Partial<CaptionSettings>) => void;
  onWatermarkUpdate: (updates: Partial<WatermarkSettings>) => void;
  onFramingUpdate: (updates: Partial<FramingSettings>) => void;
  onFilterUpdate: (filter: FilterMode) => void;
  onBorderUpdate: (updates: Partial<{ borderSize: BorderSize; borderColor: TextColor }>) => void;
  applyToAll: boolean;
  onApplyToAllChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  applyFilterToAll: boolean;
  onApplyFilterToAllChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  applyBorderToAll: boolean;
  onApplyBorderToAllChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteProject: () => void;
  hasSlideSyncSlides?: boolean;
  onImportFromSlideSync?: () => void;
  hasPhotoverlayItems?: boolean;
  onImportFromPhotoverlay?: () => void;
}

export const PiCollageSidebar: React.FC<PiCollageSidebarProps> = ({
  pictures,
  activePictureId,
  aspectRatio,
  onImageUpload,
  onAspectRatioChange,
  onUpdatePicture,
  onCaptionUpdate,
  onWatermarkUpdate,
  onFramingUpdate,
  onFilterUpdate,
  onBorderUpdate,
  applyToAll,
  onApplyToAllChange,
  applyFilterToAll,
  onApplyFilterToAllChange,
  applyBorderToAll,
  onApplyBorderToAllChange,
  onDeleteProject,
  hasSlideSyncSlides = false,
  onImportFromSlideSync,
  hasPhotoverlayItems = false,
  onImportFromPhotoverlay,
}) => {
  const { t } = useLanguage();

  const formatOptions = [
    { id: AspectRatio.Landscape_16_9, label: '16:9', icon: Monitor },
    { id: AspectRatio.Portrait_9_16, label: '9:16', icon: Smartphone },
    { id: AspectRatio.Portrait_3_4, label: '3:4', icon: Tablet },
    { id: AspectRatio.Square_1_1, label: '1:1', icon: Square },
  ];

  const activePicture = pictures.find((p) => p.id === activePictureId);

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-4">
      {pictures.length === 0 ? (
        <div className="flex-1 space-y-6">
          <FileDropZone
            onFilesSelected={(files) => {
              const event = {
                target: { files },
              } as React.ChangeEvent<HTMLInputElement>;
              onImageUpload(event);
            }}
            accept="image/*"
            label={t.tools.picollage.addImages}
            themeColor="tool-picollage"
            multiple={true}
          />
          {hasSlideSyncSlides && onImportFromSlideSync && (
            <button
              onClick={onImportFromSlideSync}
              className="flex items-center justify-center gap-2 w-full p-4 rounded-xl border border-tool-slidesync/20 hover:border-tool-slidesync/60 bg-tool-slidesync/10 hover:bg-tool-slidesync/20 transition-all text-slate-300 hover:text-tool-slidesync"
            >
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm font-medium">{t.common.importFromSlideSync}</span>
            </button>
          )}
          {hasPhotoverlayItems && onImportFromPhotoverlay && (
            <button
              onClick={onImportFromPhotoverlay}
              className="flex items-center justify-center gap-2 w-full p-4 rounded-xl border border-tool-photoverlay/20 hover:border-tool-photoverlay/60 bg-tool-photoverlay/10 hover:bg-tool-photoverlay/20 transition-all text-slate-300 hover:text-tool-photoverlay"
            >
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm font-medium">{t.common.importFromPhotoverlay}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 space-y-6 animate-fadeIn pb-8">
          {/* Output Resolution Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest text-center">
              {t.common.aspectRatio}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {formatOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onAspectRatioChange(opt.id)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    aspectRatio === opt.id
                      ? 'bg-tool-picollage/20 border-tool-picollage text-tool-picollage shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                      : 'bg-slate-700/50 border-slate-600 hover:border-tool-picollage/40 hover:text-tool-picollage'
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-700" />

          {/* Picture Properties */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest text-center">
              {t.tools.picollage.pictureProperties}
            </h3>

            {!activePicture ? (
              <div className="text-center p-4 text-slate-500 text-sm">
                {t.tools.picollage.noPictureSelected}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Framing Settings */}
                <FramingSettingsPanel
                  key={`framing-${activePicture.id}`}
                  imageUrl={activePicture.previewUrl}
                  settings={activePicture.framingSettings}
                  onUpdate={onFramingUpdate}
                  aspectRatio={AspectRatio.Original}
                  themeColor="tool-picollage"
                  defaultExpanded={
                    activePicture.framingSettings.zoom !== 1 ||
                    activePicture.framingSettings.offsetX !== 0 ||
                    activePicture.framingSettings.offsetY !== 0
                  }
                />

                {/* Filter Settings */}
                <FilterSettingsPanel
                  key={`filter-${activePicture.id}`}
                  currentFilter={activePicture.filterSettings}
                  onChange={onFilterUpdate}
                  themeColor="tool-picollage"
                  collapsible
                  applyToAll={applyFilterToAll}
                  onApplyToAllChange={onApplyFilterToAllChange}
                  defaultExpanded={!!activePicture.filterSettings && activePicture.filterSettings !== FilterMode.Normal}
                />

                {/* Border Settings */}
                <BorderSettingsPanel
                  key={`border-${activePicture.id}`}
                  borderSize={activePicture.borderSettings.size || BorderSize.None}
                  borderColor={activePicture.borderSettings.color || TextColor.White}
                  onSizeChange={(borderSize) => onBorderUpdate({ borderSize })}
                  onColorChange={(borderColor) => onBorderUpdate({ borderColor })}
                  themeColor="tool-picollage"
                  applyToAll={applyBorderToAll}
                  onApplyToAllChange={onApplyBorderToAllChange}
                  defaultExpanded={activePicture.borderSettings.size !== BorderSize.None}
                />

                {/* Overlay Settings */}
                <OverlaySettingsPanel
                  key={`overlay-${activePicture.id}`}
                  applyToAll={applyToAll}
                  onApplyToAllChange={onApplyToAllChange}
                  captionSettings={activePicture.captionSettings}
                  onCaptionUpdate={onCaptionUpdate}
                  watermarkSettings={activePicture.watermarkSettings}
                  onWatermarkUpdate={onWatermarkUpdate}
                  themeColor="tool-picollage"
                  defaultExpanded={
                    (activePicture.captionSettings?.text && activePicture.captionSettings.text !== '') ||
                    !!activePicture.watermarkSettings?.file
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Erase Project Button */}
      {pictures.length > 0 && (
        <div className="pt-6 mt-auto border-t border-slate-700">
          <button
            onClick={onDeleteProject}
            className="w-full flex items-center justify-center gap-3 p-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-2xl transition-all group"
          >
            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">
              {t.common.eraseProject}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
