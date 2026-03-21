import React from 'react';
import { Check, Trash2 } from 'lucide-react';
import {
  PhotoItem,
  CaptionSettings,
  WatermarkSettings,
  TextColor,
  TextPosition,
  TextSize,
  NamingSettings,
  FramingSettings,
  AspectRatio,
  FilterMode,
  BorderSize,
} from '../../types';
import { FramingSettingsPanel } from '../../components/FramingSettingsPanel';
import { OverlaySettingsPanel } from '../../components/OverlaySettingsPanel';
import { FilterSettingsPanel } from '../../components/FilterSettingsPanel';
import { BorderSettingsPanel } from '../../components/BorderSettingsPanel';
import { useLanguage } from '../../contexts/LanguageContext';
import { FileDropZone } from '../../components/FileDropZone';

interface PhotoverlaySidebarProps {
  itemsCount: number;
  selectedItem: PhotoItem | null;
  applyToAll: boolean;
  onApplyToAllChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  applyFilterToAll: boolean;
  onApplyFilterToAllChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCaptionUpdate: (updates: Partial<CaptionSettings>) => void;
  onWatermarkUpdate: (updates: Partial<WatermarkSettings>) => void;
  onFramingUpdate: (updates: Partial<FramingSettings>) => void;
  onFilterUpdate: (filter: FilterMode) => void;
  onBorderUpdate: (updates: Partial<{ borderSize: BorderSize; borderColor: TextColor }>) => void;
  applyBorderToAll: boolean;
  onApplyBorderToAllChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  namingSettings: NamingSettings;
  onNamingUpdate: (updates: Partial<NamingSettings>) => void;
  preserveMetadata: boolean;
  onPreserveMetadataChange: (value: boolean) => void;
  onDeleteAll: () => void;
}

export const PhotoverlaySidebar: React.FC<PhotoverlaySidebarProps> = ({
  itemsCount,
  selectedItem,
  applyToAll,
  onApplyToAllChange,
  applyFilterToAll,
  onApplyFilterToAllChange,
  onFileChange,
  onCaptionUpdate,
  onWatermarkUpdate,
  onFramingUpdate,
  onFilterUpdate,
  onBorderUpdate,
  applyBorderToAll,
  onApplyBorderToAllChange,
  namingSettings,
  onNamingUpdate,
  preserveMetadata,
  onPreserveMetadataChange,
  onDeleteAll,
}) => {
  const { t } = useLanguage();

  return (
    <div className="w-80 border-r border-slate-700 bg-slate-800 flex flex-col p-6 overflow-y-auto z-10 shadow-2xl space-y-6">
      {itemsCount === 0 ? (
        <div className="space-y-6">
          <FileDropZone
            onFilesSelected={(files) => {
              const event = {
                target: { files },
              } as React.ChangeEvent<HTMLInputElement>;
              onFileChange(event);
            }}
            accept="image/*"
            multiple
            label={t.tools.photoverlay.uploadPhotos}
            themeColor="tool-photoverlay"
          />
        </div>
      ) : (
        <>
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest text-center">
            {t.common.generalSettings}
          </h2>
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-slate-700/50 rounded-2xl border border-slate-600 space-y-4 hover:border-tool-photoverlay/40 shadow-inner">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      namingSettings.keepOriginal
                        ? 'bg-tool-photoverlay border-tool-photoverlay'
                        : 'border-slate-500 group-hover:border-slate-400'
                    }`}
                  >
                    {namingSettings.keepOriginal && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-xs font-bold text-slate-300 group-hover:text-slate-100 transition-colors">
                    {t.tools.photoverlay.keepOriginalNames}
                  </span>
                  <input
                    type="checkbox"
                    checked={namingSettings.keepOriginal}
                    onChange={(e) => onNamingUpdate({ keepOriginal: e.target.checked })}
                    className="hidden"
                  />
                </label>

                {!namingSettings.keepOriginal && (
                  <div className="space-y-4 animate-fadeIn pt-2 border-t border-slate-600/50">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                        {t.common.add}
                      </span>
                      <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-600">
                        <button
                          onClick={() => onNamingUpdate({ type: 'prefix' })}
                          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                            namingSettings.type === 'prefix'
                              ? 'bg-tool-photoverlay text-white shadow-lg'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {t.common.prefix}
                        </button>
                        <button
                          onClick={() => onNamingUpdate({ type: 'suffix' })}
                          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                            namingSettings.type === 'suffix'
                              ? 'bg-tool-photoverlay text-white shadow-lg'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {t.common.suffix}
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={namingSettings.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Windows/Linux/iOS invalid chars: < > : " / \ | ? *
                          const filtered = val.replace(/[<>:"/\\|?*]/g, '');
                          onNamingUpdate({ value: filtered });
                        }}
                        placeholder={t.common.typeSomething}
                        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-tool-photoverlay transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-700/50 rounded-2xl border border-slate-600 hover:border-tool-photoverlay/40 shadow-inner transition-all">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      preserveMetadata
                        ? 'bg-tool-photoverlay border-tool-photoverlay'
                        : 'border-slate-500 group-hover:border-slate-400'
                    }`}
                  >
                    {preserveMetadata && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-xs font-bold text-slate-300 group-hover:text-slate-100 transition-colors">
                    {t.tools.photoverlay.preserveMetadata}
                  </span>
                  <input
                    type="checkbox"
                    checked={preserveMetadata}
                    onChange={(e) => onPreserveMetadataChange(e.target.checked)}
                    className="hidden"
                  />
                </label>

                {selectedItem && (
                  <div className="flex gap-2 ml-1">
                    {selectedItem.exifData?.creationTime && (
                      <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-[9px] font-bold uppercase tracking-tighter">
                        {t.common.mediaCreated}
                      </span>
                    )}
                    {selectedItem.exifData?.latitude !== undefined && (
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[9px] font-bold uppercase tracking-tighter">
                        GPS
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-700 my-2 pt-4" />

          <h3 className="mt-2 text-sm font-bold text-slate-100 uppercase tracking-widest text-center">
            {t.tools.photoverlay.pictureProperties}
          </h3>

          {/* New Collapsible Framing Section */}
          {selectedItem && (
            <FramingSettingsPanel
              key={`framing-${selectedItem.id}`}
              imageUrl={selectedItem.previewUrl}
              settings={selectedItem.framingSettings}
              onUpdate={onFramingUpdate}
              aspectRatio={AspectRatio.Original}
              sourceDimensions={selectedItem.metadata}
              themeColor="tool-photoverlay"
              defaultExpanded={
                selectedItem.framingSettings.zoom !== 1 ||
                selectedItem.framingSettings.offsetX !== 0 ||
                selectedItem.framingSettings.offsetY !== 0
              }
            />
          )}

          {/* New Collapsible Filter Section */}
          {selectedItem && (
            <FilterSettingsPanel
              key={`filter-${selectedItem.id}`}
              currentFilter={selectedItem.filterSettings}
              onChange={onFilterUpdate}
              themeColor="tool-photoverlay"
              collapsible
              applyToAll={applyFilterToAll}
              onApplyToAllChange={onApplyFilterToAllChange}
              defaultExpanded={
                !!selectedItem.filterSettings && selectedItem.filterSettings !== FilterMode.Normal
              }
            />
          )}

          {/* New Collapsible Border Section */}
          {selectedItem && (
            <BorderSettingsPanel
              key={`border-${selectedItem.id}`}
              borderSize={selectedItem.borderSettings.size || BorderSize.None}
              borderColor={selectedItem.borderSettings.color || TextColor.White}
              onSizeChange={(borderSize) => onBorderUpdate({ borderSize })}
              onColorChange={(borderColor) => onBorderUpdate({ borderColor })}
              themeColor="tool-photoverlay"
              applyToAll={applyBorderToAll}
              onApplyToAllChange={onApplyBorderToAllChange}
              defaultExpanded={!!selectedItem.borderSettings.size}
            />
          )}

          {/* New Collapsible Overlay Section */}
          {selectedItem && (
            <OverlaySettingsPanel
              key={`overlay-${selectedItem.id}`}
              applyToAll={applyToAll}
              onApplyToAllChange={onApplyToAllChange}
              captionSettings={
                selectedItem?.captionSettings || {
                  text: '',
                  color: TextColor.White,
                  position: TextPosition.BottomLeft,
                  textSize: TextSize.Small,
                  isItalic: false,
                }
              }
              onCaptionUpdate={onCaptionUpdate}
              watermarkSettings={
                selectedItem?.watermarkSettings || {
                  file: null,
                  position: TextPosition.TopRight,
                  opacity: 0.2,
                  scale: 0.2,
                }
              }
              onWatermarkUpdate={onWatermarkUpdate}
              themeColor="tool-photoverlay"
              defaultExpanded={
                (selectedItem?.captionSettings?.text && selectedItem.captionSettings.text !== '') ||
                !!selectedItem?.watermarkSettings?.file
              }
            />
          )}

          <div className="pt-6 mt-auto border-t border-slate-700">
            <button
              onClick={onDeleteAll}
              className="w-full flex items-center justify-center gap-3 p-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-2xl transition-all group"
            >
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest">
                {t.common.eraseProject}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
