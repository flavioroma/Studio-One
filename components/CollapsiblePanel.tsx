import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface CollapsiblePanelProps {
  title: string;
  children: React.ReactNode;
  themeColor?: string;
  defaultExpanded?: boolean;
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  children,
  themeColor,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const themeClasses = {
    'tool-photoverlay': {
      hover: 'group-hover:text-tool-photoverlay',
      hoverIconBg: 'group-hover:bg-tool-photoverlay/10',
      hoverIconBorder: 'group-hover:border-tool-photoverlay/30',
    },
    'tool-slidesync': {
      hover: 'group-hover:text-tool-slidesync',
      hoverIconBg: 'group-hover:bg-tool-slidesync/10',
      hoverIconBorder: 'group-hover:border-tool-slidesync/30',
    },
    'tool-videoverlay': {
      hover: 'group-hover:text-tool-videoverlay',
      hoverIconBg: 'group-hover:bg-tool-videoverlay/10',
      hoverIconBorder: 'group-hover:border-tool-videoverlay/30',
    },
    'tool-picollage': {
      hover: 'group-hover:text-tool-picollage',
      hoverIconBg: 'group-hover:bg-tool-picollage/10',
      hoverIconBorder: 'group-hover:border-tool-picollage/30',
    },
    'tool-audiotrim': {
      hover: 'group-hover:text-tool-audiotrim',
      hoverIconBg: 'group-hover:bg-tool-audiotrim/10',
      hoverIconBorder: 'group-hover:border-tool-audiotrim/30',
    },
  }[themeColor] || {
    hover: 'group-hover:text-white',
    hoverIconBg: 'group-hover:bg-slate-700',
    hoverIconBorder: 'group-hover:border-slate-500',
  };

  return (
    <div className={`space-y-4 animate-fadeIn`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 group transition-all"
      >
        <div className={`p-1 rounded-md transition-all duration-300 ${themeClasses.hoverIconBg} ${themeClasses.hoverIconBorder} shadow-sm`}>
          <ChevronRight 
            className={`w-4 h-4 text-slate-300 ${themeClasses.hover} transition-all duration-300 ${isExpanded ? 'rotate-90' : ''}`} 
          />
        </div>
        <span className={`text-xs font-black text-slate-300 uppercase tracking-wider ${themeClasses.hover} transition-colors`}>
          {title}
        </span>
        <div className="flex-1 h-px bg-slate-700/50"></div>
      </button>

      {isExpanded && (
        <div className="animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
};
