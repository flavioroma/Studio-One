import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileDropZoneProps {
  onFilesSelected: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  themeColor: string; // e.g., 'tool-videoverlay'
  className?: string;
  children?: React.ReactNode;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesSelected,
  accept,
  multiple = false,
  label,
  themeColor,
  className = '',
  children,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasHeight = className.split(' ').some((cls) => cls.startsWith('h-'));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  const themeClasses = {
    'tool-audiotrim': {
      border: 'border-tool-audiotrim',
      bg: 'bg-tool-audiotrim/10',
      hoverBorder: 'hover:border-tool-audiotrim',
      text: 'text-tool-audiotrim',
    },
    'tool-slidesync': {
      border: 'border-tool-slidesync',
      bg: 'bg-tool-slidesync/10',
      hoverBorder: 'hover:border-tool-slidesync',
      text: 'text-tool-slidesync',
    },
    'tool-photoverlay': {
      border: 'border-tool-photoverlay',
      bg: 'bg-tool-photoverlay/10',
      hoverBorder: 'hover:border-tool-photoverlay',
      text: 'text-tool-photoverlay',
    },
    'tool-videoverlay': {
      border: 'border-tool-videoverlay',
      bg: 'bg-tool-videoverlay/10',
      hoverBorder: 'hover:border-tool-videoverlay',
      text: 'text-tool-videoverlay',
    },
    'tool-picollage': {
      border: 'border-tool-picollage',
      bg: 'bg-tool-picollage/10',
      hoverBorder: 'hover:border-tool-picollage',
      text: 'text-tool-picollage',
    },
  }[themeColor] || {
    border: 'border-slate-600',
    bg: 'bg-slate-700/10',
    hoverBorder: 'hover:border-slate-500',
    text: 'text-slate-400',
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`flex flex-col items-center justify-center gap-4 w-full rounded-3xl border-2 border-dashed transition-all cursor-pointer group ${
        !hasHeight ? 'h-48' : ''
      } ${
        isDragging
          ? `${themeClasses.border} ${themeClasses.bg}`
          : `border-slate-600 ${themeClasses.hoverBorder} hover:bg-slate-700/50`
      } ${className}`}
    >
      {children ? (
        children
      ) : (
        <>
          <div
            className={`p-4 bg-slate-700 rounded-full transition-transform group-hover:scale-110 ${isDragging ? 'scale-110 bg-slate-600' : ''}`}
          >
            <Upload className={`w-8 h-8 ${themeClasses.text}`} />
          </div>
          {label && (
            <span className="text-sm font-bold text-slate-400 group-hover:text-slate-200 transition-colors px-4 text-center">
              {label}
            </span>
          )}
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        data-testid="file-input"
      />
    </div>
  );
};
