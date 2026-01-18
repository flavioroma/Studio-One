import React, { useRef } from 'react';
import { Slide } from '../types';
import { GripVertical, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface TimelineProps {
  slides: Slide[];
  activeSlideId: string | null;
  onSelectSlide: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDelete: (id: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ slides, activeSlideId, onSelectSlide, onReorder, onDelete }) => {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    const dragIndexStr = e.dataTransfer.getData("text/plain");
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

  return (
    <div
      ref={scrollRef}
      onWheel={handleWheel}
      className="h-full flex gap-4 overflow-x-auto items-center pb-4 px-2 custom-scrollbar select-none"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#475569 #1e293b'
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

      {slides.map((slide, index) => (
        <div
          key={slide.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
          onClick={() => onSelectSlide(slide.id)}
          className={`relative group h-24 aspect-video flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${activeSlideId === slide.id ? 'border-blue-500 shadow-lg shadow-blue-500/20 scale-105 z-10' : 'border-slate-600 hover:border-slate-400'
            }`}
        >
          {/* Drag Handle Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-move z-20">
            <GripVertical className="text-white w-6 h-6 drop-shadow-md" />
          </div>

          <img
            src={slide.previewUrl}
            alt={`Slide ${index + 1}`}
            className="w-full h-full object-cover pointer-events-none"
          />
          <div className="absolute bottom-0 left-0 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-tr font-bold z-10">
            #{index + 1}
          </div>
          {slide.text && (
            <div className="absolute top-2 right-2 z-10">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" title={t.tools.slidesync.hasText}></div>
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(slide.id);
            }}
            className="absolute bottom-1 right-1 p-1.5 bg-red-500/90 text-white rounded-md hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 z-30 shadow-sm hover:scale-110"
            title={t.tools.slidesync.removeFile}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};