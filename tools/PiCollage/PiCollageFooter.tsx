import React from 'react';
import { Eye, EyeOff, Trash2, Plus, Download } from 'lucide-react';
import { PiCollagePicture } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface PiCollageFooterProps {
  pictures: PiCollagePicture[];
  activePictureId: string | null;
  onSelectPicture: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRemovePicture: (id: string) => void;
  onAddMoreClick: () => void;
}

export const PiCollageFooter: React.FC<PiCollageFooterProps> = ({
  pictures,
  activePictureId,
  onSelectPicture,
  onToggleVisibility,
  onRemovePicture,
  onAddMoreClick,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex h-full items-center gap-6">
      <div className="flex-1 flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar h-full pt-4">
        {pictures.map((pic) => (
          <div
            key={pic.id}
            className={`relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 ${
              activePictureId === pic.id
                ? 'ring-2 ring-tool-picollage shadow-[0_0_15px_rgba(234,179,8,0.3)] scale-105'
                : 'ring-1 ring-slate-700 hover:ring-slate-500 hover:scale-105'
            } ${!pic.isVisible && activePictureId !== pic.id ? 'opacity-50 grayscale' : ''}`}
            onClick={() => onSelectPicture(pic.id)}
          >
            <img src={pic.previewUrl} alt="Thumbnail" className="w-full h-full object-cover" />

            {/* Hover UI */}
            <div
              className={`absolute inset-0 bg-black/60 flex items-center justify-between px-3 ${activePictureId === pic.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility(pic.id);
                }}
                className="p-1.5 text-white hover:text-tool-picollage rounded-full bg-slate-800/50 hover:bg-slate-800 transition-colors"
                title={
                  pic.isVisible ? t.tools.picollage.hidePicture : t.tools.picollage.showPicture
                }
              >
                {pic.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePicture(pic.id);
                }}
                className="p-1.5 text-white hover:text-red-400 rounded-full bg-slate-800/50 hover:bg-slate-800 transition-colors"
                title={t.tools.picollage.removePicture}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Add More Button slot */}
        {pictures.length > 0 && (
          <button
            onClick={onAddMoreClick}
            className="flex-shrink-0 w-24 h-24 rounded-2xl border-2 border-dashed border-slate-700 hover:border-tool-picollage flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-tool-picollage transition-all hover:bg-tool-picollage/5 group"
          >
            <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {t.common.addMore}
            </span>
            <input
              id="picollage-add-more"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                // We'll pass processing upstream through onAddMoreClick or handle it in Parent
                // Rather than injecting onChange directly if onAddMoreClick is simple, we will trigger it from parent.
              }}
            />
          </button>
        )}
      </div>
    </div>
  );
};
