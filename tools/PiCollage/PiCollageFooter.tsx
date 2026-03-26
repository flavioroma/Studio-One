import React from 'react';
import { Eye, EyeOff, Trash2, Plus, Download } from 'lucide-react';
import { PiCollagePicture, FilterMode } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { Thumbnail } from '../../components/Thumbnail';

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
        {pictures.map((pic) => {
          const isCustomized = !!(
            pic.captionSettings?.text ||
            pic.watermarkSettings?.file ||
            pic.framingSettings?.zoom !== 1 ||
            pic.framingSettings?.offsetX !== 0 ||
            pic.framingSettings?.offsetY !== 0 ||
            pic.filterSettings !== FilterMode.Normal
          );

          return (
            <Thumbnail
              key={pic.id}
              id={pic.id}
              imageUrl={pic.previewUrl}
              isActive={activePictureId === pic.id}
              isCustomized={isCustomized}
              themeColorClass="tool-picollage"
              isDimmed={!pic.isVisible}
              onClick={() => onSelectPicture(pic.id)}
              onDeleteRequest={() => onRemovePicture(pic.id)}
              visibilityToggle={{
                isVisible: pic.isVisible,
                onToggle: () => onToggleVisibility(pic.id)
              }}
            />
          );
        })}

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
