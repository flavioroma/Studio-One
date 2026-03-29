import React from 'react';
import { Trash2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export interface ThumbnailProps {
  id: string;
  imageUrl: string;
  isActive: boolean;
  isCustomized: boolean;
  themeColorClass: 'tool-slidesync' | 'tool-photoverlay' | 'tool-picollage';
  isDimmed?: boolean;

  onClick: () => void;
  onDeleteRequest: () => void;

  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;

  index?: number;
  visibilityToggle?: {
    isVisible: boolean;
    onToggle: () => void;
  };
  containerId?: string;
}

const themeClasses: Record<string, string> = {
  'tool-slidesync': 'border-tool-slidesync shadow-tool-slidesync/20',
  'tool-photoverlay': 'border-tool-photoverlay shadow-tool-photoverlay/20',
  'tool-picollage': 'border-tool-picollage shadow-tool-picollage/20',
};

export const Thumbnail: React.FC<ThumbnailProps> = ({
  id,
  imageUrl,
  isActive,
  isCustomized,
  themeColorClass,
  isDimmed = false,
  onClick,
  onDeleteRequest,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  index,
  visibilityToggle,
  containerId,
}) => {
  const { t } = useLanguage();

  const activeClasses = isActive
    ? `${themeClasses[themeColorClass]} shadow-lg scale-105 z-10`
    : 'border-slate-600 hover:border-slate-400';

  const dimClasses = isDimmed && !isActive ? 'opacity-50 grayscale' : '';

  return (
    <div
      id={containerId || `thumb-${id}`}
      data-testid="thumbnail"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      className={`relative group h-24 aspect-square flex-shrink-0 cursor-pointer overflow-hidden border-2 transition-all duration-300 rounded-xl ${activeClasses} ${dimClasses}`}
    >
      {/* Drag Handle Overlay */}
      {draggable && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-move z-20">
          <GripVertical className="text-white w-6 h-6 drop-shadow-md" />
        </div>
      )}

      {/* Main Image */}
      <img
        src={imageUrl}
        alt={index !== undefined ? `Slide ${index + 1}` : 'Thumbnail'}
        className="w-full h-full object-cover pointer-events-none"
      />

      {/* SlideSync Index Badge */}
      {index !== undefined && (
        <div className="absolute bottom-0 left-0 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-tr-lg font-bold z-10 pointer-events-none">
          #{index + 1}
        </div>
      )}

      {/* Customized Indicator */}
      {isCustomized && (
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <div
            className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
            title={t.common.isCustomized}
          ></div>
        </div>
      )}

      {/* Bottom Right Actions */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDeleteRequest();
        }}
        className="absolute bottom-1 right-1 p-1.5 bg-red-500/90 text-white rounded-md hover:bg-red-600 transition-all z-30 shadow-sm hover:scale-110 opacity-0 group-hover:opacity-100"
        title={t.common.removeFile}
        data-testid="delete-thumbnail"
      >
        <Trash2 className="w-3 h-3" />
      </button>

      {/* Bottom Left Actions (PiCollage Visibility) */}
      {visibilityToggle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            visibilityToggle.onToggle();
          }}
          className="absolute bottom-1 left-1 p-1.5 bg-slate-800/80 text-white rounded-md hover:bg-slate-700 transition-all z-30 shadow-sm hover:scale-110 opacity-0 group-hover:opacity-100"
          title={
            visibilityToggle.isVisible ? t.tools.picollage.hidePicture : t.tools.picollage.showPicture
          }
          data-testid="visibility-toggle"
        >
          {visibilityToggle.isVisible ? (
            <Eye className="w-3 h-3 hover:text-tool-picollage" />
          ) : (
            <EyeOff className="w-3 h-3 hover:text-tool-picollage" />
          )}
        </button>
      )}
    </div>
  );
};
