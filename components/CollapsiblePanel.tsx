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
      text: 'text-tool-photoverlay',
      border: 'border-tool-photoverlay/30',
      bg: 'bg-tool-photoverlay/10',
    },
    'tool-slidesync': {
      text: 'text-tool-slidesync',
      border: 'border-tool-slidesync/30',
      bg: 'bg-tool-slidesync/10',
    },
    'tool-videoverlay': {
      text: 'text-tool-videoverlay',
      border: 'border-tool-videoverlay/30',
      bg: 'bg-tool-videoverlay/10',
    },
    // 'tool-videomagnifier': {
    //   text: 'text-tool-videomagnifier',
    //   border: 'border-tool-videomagnifier/30',
    //   bg: 'bg-tool-videomagnifier/10',
    // },
    'tool-picollage': {
      text: 'text-tool-picollage',
      border: 'border-tool-picollage/30',
      bg: 'bg-tool-picollage/10',
    },
  }[themeColor] || {
    text: 'text-slate-100',
    border: 'border-slate-600',
    bg: 'bg-slate-700/50',
  };

  return (
    <div className={`space-y-4 animate-fadeIn`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 group transition-all"
      >
        <div className={`p-1.5 rounded-lg bg-slate-700/50 group-hover:bg-slate-700 transition-colors border border-slate-600 group-hover:border-slate-500 shadow-sm`}>
          <ChevronRight 
            className={`w-4 h-4 text-slate-400 group-hover:text-slate-100 transition-all duration-300 ${isExpanded ? 'rotate-90' : ''}`} 
          />
        </div>
        <span className="text-xs font-black text-slate-100 uppercase tracking-[0.2em] group-hover:text-white transition-colors">
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
