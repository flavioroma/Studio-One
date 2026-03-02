import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavbarProps {
  toolName: string;
  onBack: () => void;
  toolId?: string;
}
export const Navbar: React.FC<NavbarProps> = ({ toolName, onBack, toolId }) => {
  const { t } = useLanguage();

  const getThemeColor = () => {
    switch (toolId) {
      case 'audiotrim': return 'text-tool-audiotrim';
      case 'slidesync': return 'text-tool-slidesync';
      case 'photoverlay': return 'text-tool-photoverlay';
      case 'videoverlay': return 'text-tool-videoverlay';
      default: return 'text-blue-400/80';
    }
  };

  return (
    <nav className="h-14 bg-slate-800/50 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-6 z-50">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">{t.common.backToHome}</span>
      </button>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-widest text-slate-100">{t.common.activeTool}</span>
          <div className="h-4 w-[1px] bg-slate-600"></div>
          <span className={`text-lg font-bold ${getThemeColor()}`}>{toolName}</span>
        </div>
        <LanguageSwitcher />
      </div>
    </nav>
  );
};