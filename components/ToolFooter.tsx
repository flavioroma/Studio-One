import React, { useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Thumbnail } from './Thumbnail';
import { Plus } from 'lucide-react';

export interface ToolFooterProps<T> {
  // Top Area
  headerContent?: React.ReactNode;
  className?: string;

  // Timeline Data
  items: T[];
  getItemId: (item: T) => string;
  getItemUrl: (item: T) => string;
  isItemCustomized?: (item: T) => boolean;
  isItemVisible?: (item: T) => boolean; 
  
  // State
  activeItemId: string | null;
  emptyMessage: string;
  addMoreLabel?: string;
  themeColorClass: 'tool-slidesync' | 'tool-photoverlay' | 'tool-picollage';
  
  // Actions
  onSelectItem: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onAddMore: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onToggleVisibility?: (id: string) => void;
}

export const ToolFooter = <T,>({
  headerContent,
  className = "bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 pt-4 pb-2",
  items,
  getItemId,
  getItemUrl,
  isItemCustomized,
  isItemVisible,
  activeItemId,
  emptyMessage,
  addMoreLabel,
  themeColorClass,
  onSelectItem,
  onDeleteRequest,
  onAddMore,
  onReorder,
  onToggleVisibility,
}: ToolFooterProps<T>) => {
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
    if (!dragIndexStr || !onReorder) return;

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
    if (activeItemId && scrollRef.current) {
      const element = document.getElementById(`footer-thumb-${activeItemId}`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [activeItemId]);

  return (
    <div className={`flex flex-col ${className}`}>
      {headerContent && (
        <div className="mb-2 px-4">
          {headerContent}
        </div>
      )}

      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="shrink flex gap-2 overflow-x-auto items-center px-4 py-2 custom-scrollbar select-none"
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

        {items.length === 0 && (
          <span className="text-slate-500 text-sm mx-auto">{emptyMessage}</span>
        )}

        {items.map((item, index) => {
          const id = getItemId(item);
          const visible = isItemVisible ? isItemVisible(item) : true;

          return (
            <Thumbnail
              key={id}
              containerId={`footer-thumb-${id}`}
              id={id}
              imageUrl={getItemUrl(item)}
              isActive={activeItemId === id}
              isCustomized={isItemCustomized ? isItemCustomized(item) : false}
              themeColorClass={themeColorClass}
              isDimmed={!visible}
              onClick={() => onSelectItem(id)}
              onDeleteRequest={() => onDeleteRequest(id)}
              visibilityToggle={onToggleVisibility ? {
                isVisible: visible,
                onToggle: () => onToggleVisibility(id)
              } : undefined}
              index={index}
              draggable={!!onReorder}
              onDragStart={onReorder ? (e) => handleDragStart(e, index) : undefined}
              onDragOver={onReorder ? handleDragOver : undefined}
              onDrop={onReorder ? (e) => handleDrop(e, index) : undefined}
            />
          );
        })}

        {items.length > 0 && (
          <label className={`flex-shrink-0 w-24 h-24 rounded-lg border-2 border-slate-700 hover:border-${themeColorClass}/50 hover:bg-slate-800/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all`}>
            <Plus className="w-5 h-5 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter text-center px-1">
              {addMoreLabel || t.common.addMore}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onAddMore}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
};
