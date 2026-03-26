import React, { useRef, useEffect } from 'react';
import { Slide } from '../../types';
import { GripVertical, Plus } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Thumbnail } from '../../components/Thumbnail';

interface TimelineProps {
  slides: Slide[];
  activeSlideId: string | null;
  onSelectSlide: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDelete: (id: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  slides,
  activeSlideId,
  onSelectSlide,
  onReorder,
  onDelete,
  onImageUpload,
}) => {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    const dragIndexStr = e.dataTransfer.getData('text/plain');
    if (!dragIndexStr) return;

    const dragIndex = parseInt(dragIndexStr, 10);
    if (dragIndex === dropIndex) return;

    onReorder(dragIndex, dropIndex);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  useEffect(() => {
    if (activeSlideId && scrollRef.current) {
      const element = document.getElementById(`timeline-slide-${activeSlideId}`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [activeSlideId]);

  return (
    <div
      ref={scrollRef}
      onWheel={handleWheel}
      className="h-full flex gap-2 overflow-x-auto items-center px-4 custom-scrollbar select-none"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#475569 #1e293b',
      }}
    >
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>

      {slides.length === 0 && (
        <span className="text-slate-500 text-sm mx-auto">{t.tools.slidesync.noSlidesAdded}</span>
      )}

      {slides.map((slide, index) => {
        const isCustomized = !!(
          slide.captionSettings.text ||
          slide.framingSettings.zoom !== 1 ||
          slide.framingSettings.offsetX !== 0 ||
          slide.framingSettings.offsetY !== 0
        );

        return (
            <Thumbnail
              key={slide.id}
              containerId={`timeline-slide-${slide.id}`}
              id={slide.id}
              imageUrl={slide.previewUrl}
              isActive={activeSlideId === slide.id}
              isCustomized={isCustomized}
              themeColorClass="tool-slidesync"
              onClick={() => onSelectSlide(slide.id)}
              onDeleteRequest={() => onDelete(slide.id)}
              index={index}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            />
        );
      })}

      {slides.length > 0 && (
        <label className="flex-shrink-0 h-24 aspect-square rounded-lg border-2 border-slate-700 hover:border-tool-slidesync/50 hover:bg-slate-800/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all">
          <Plus className="w-5 h-5 text-slate-500" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
            {t.common.addMore}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onImageUpload}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
};
