import React from 'react';
import { Trash2, Monitor, Smartphone, Square, Tablet } from 'lucide-react';
import { AspectRatio, PiCollagePicture, BorderSize, FilterMode } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { FileDropZone } from '../../components/FileDropZone';

interface PiCollageSidebarProps {
  pictures: PiCollagePicture[];
  activePictureId: string | null;
  aspectRatio: AspectRatio;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onUpdatePicture: (id: string, updates: Partial<PiCollagePicture>) => void;
  onDeleteProject: () => void;
}

export const PiCollageSidebar: React.FC<PiCollageSidebarProps> = ({
  pictures,
  activePictureId,
  aspectRatio,
  onImageUpload,
  onAspectRatioChange,
  onUpdatePicture,
  onDeleteProject,
}) => {
  const { t } = useLanguage();

  const formatOptions = [
    { id: AspectRatio.Landscape_16_9, label: '16:9', icon: Monitor },
    { id: AspectRatio.Portrait_9_16, label: '9:16', icon: Smartphone },
    { id: AspectRatio.Portrait_3_4, label: '3:4', icon: Tablet },
    { id: AspectRatio.Square_1_1, label: '1:1', icon: Square },
  ];

  const borderOptions = [
    { id: BorderSize.None, label: t.tools.picollage.borderNone },
    { id: BorderSize.Small, label: t.tools.picollage.borderSmall },
    { id: BorderSize.Medium, label: t.tools.picollage.borderMedium },
    { id: BorderSize.Large, label: t.tools.picollage.borderLarge },
  ];

  const filterOptions = [
    { id: FilterMode.Normal, label: t.tools.picollage.filterNormal },
    { id: FilterMode.Grayscale, label: t.tools.picollage.filterGrayscale },
    { id: FilterMode.Sepia, label: t.tools.picollage.filterSepia },
  ];

  const activePicture = pictures.find((p) => p.id === activePictureId);

  return (
    <div className="flex flex-col h-full">
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
        </div>
      ) : (
        <div className="flex-1 space-y-8 animate-fadeIn overflow-y-auto pb-8 pr-2 custom-scrollbar">
          {/* Output Resolution Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest text-center">
              {t.tools.picollage.aspectRatio}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {formatOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onAspectRatioChange(opt.id)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    aspectRatio === opt.id
                      ? 'bg-tool-picollage/20 border-tool-picollage text-tool-picollage shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                      : 'bg-slate-700/50 border-slate-600 hover:border-tool-picollage/40 hover:bg-slate-700/50'
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
                {/* Border Settings */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t.tools.picollage.border}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {borderOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => onUpdatePicture(activePicture.id, { borderSize: opt.id })}
                        className={`p-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                          activePicture.borderSize === opt.id
                            ? 'bg-tool-picollage/20 border-tool-picollage text-tool-picollage'
                            : 'bg-slate-700/50 border-slate-600 hover:border-tool-picollage/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Settings */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t.tools.picollage.filters}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {filterOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => onUpdatePicture(activePicture.id, { filter: opt.id })}
                        className={`p-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                          activePicture.filter === opt.id
                            ? 'bg-tool-picollage/20 border-tool-picollage text-tool-picollage'
                            : 'bg-slate-700/50 border-slate-600 hover:border-tool-picollage/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Framing/Magnification Settings */}
                <div className="space-y-4 bg-slate-700/30 p-4 rounded-xl border border-slate-600/50">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                      <span>{t.tools.slidesync.magnification}</span>
                      <span className="text-tool-picollage">{activePicture.zoom.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.01"
                      value={activePicture.zoom}
                      onChange={(e) =>
                        onUpdatePicture(activePicture.id, { zoom: parseFloat(e.target.value) })
                      }
                      className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-tool-picollage"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onUpdatePicture(activePicture.id, { offsetX: 0 })}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {t.tools.slidesync.centerX}
                    </button>
                    <button
                      onClick={() => onUpdatePicture(activePicture.id, { offsetY: 0 })}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {t.tools.slidesync.centerY}
                    </button>
                  </div>
                </div>
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
