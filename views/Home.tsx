import React from 'react';
import {
  Video,
  ArrowRight,
  Sparkles,
  Scissors,
  Layers,
  Image as ImageIcon,
  LayoutGrid,
  Heart,
} from 'lucide-react';
import { ToolId } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface HomeProps {
  onSelectTool: (tool: ToolId) => void;
}

export const Home: React.FC<HomeProps> = ({ onSelectTool }) => {
  const { t } = useLanguage();

  const tools = [
    {
      id: 'audiotrim' as ToolId,
      name: t.tools.audiotrim.title,
      description: t.home.audiotrim.description,
      icon: Scissors,
      color: 'bg-tool-audiotrim',
      hoverBorder: 'hover:border-tool-audiotrim/50',
      badge: t.home.badges.updated,
    },
    {
      id: 'slidesync' as ToolId,
      name: t.tools.slidesync.title,
      description: t.home.slidesync.description,
      icon: Layers,
      color: 'bg-tool-slidesync',
      hoverBorder: 'hover:border-tool-slidesync/50',
      badge: t.home.badges.popular,
    },
    {
      id: 'videoverlay' as ToolId,
      name: t.tools.videoverlay.title,
      description: t.home.videoverlay.description,
      icon: Video,
      color: 'bg-tool-videoverlay',
      hoverBorder: 'hover:border-tool-videoverlay/50',
      badge: t.home.badges.new,
    },
    {
      id: 'photoverlay' as ToolId,
      name: t.tools.photoverlay.title,
      description: t.home.photoverlay.description,
      icon: ImageIcon,
      color: 'bg-tool-photoverlay',
      hoverBorder: 'hover:border-tool-photoverlay/50',
      badge: t.home.badges.new,
    },
    {
      id: 'picollage' as ToolId,
      name: t.tools.picollage.title,
      description: t.home.picollage.description,
      icon: LayoutGrid,
      color: 'bg-tool-picollage',
      hoverBorder: 'hover:border-tool-picollage/50',
      badge: t.home.badges.new,
    },
    {
      id: 'donation' as ToolId,
      name: t.home.donation.title,
      description: t.home.donation.description,
      icon: Heart,
      color: 'bg-orange-500',
      hoverBorder: 'hover:border-orange-500/50',
      badge: '', // No badge needed
      linkText: t.home.donation.link,
    },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 overflow-y-auto">
      <div className="max-w-4xl w-full text-center mb-8 animate-fadeIn">
        <div className="flex justify-center mb-6">
          <LanguageSwitcher />
        </div>
        <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          {t.home.title}
        </h1>
        <p className="text-xl text-slate-400 max-w-4xl mx-auto mb-8 lg:whitespace-nowrap">
          {t.home.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`group relative flex flex-col items-start text-left p-6 bg-slate-800/40 border border-slate-700 rounded-3xl ${tool.hoverBorder} hover:bg-slate-800/60 transition-all duration-300 shadow-xl`}
          >
            <div
              className={`p-3 rounded-2xl ${tool.color} mb-6 group-hover:scale-110 transition-transform duration-300`}
            >
              <tool.icon className="w-6 h-6 text-white" />
            </div>

            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-slate-100">{tool.name}</h2>
              {/* <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-400">
                {tool.badge}
              </span> */}
            </div>

            <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-1">{tool.description}</p>

            <div className="flex items-center gap-2 text-slate-400 text-sm font-bold group-hover:gap-4 transition-all">
              <span>{tool.linkText || t.common.openTool}</span>
              <ArrowRight className="w-4 h-4" />
            </div>

            <div className="absolute -inset-px rounded-3xl border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          </button>
        ))}
      </div>

      <div className="mt-12 text-center flex flex-col items-center">
        <p className="text-white font-bold">{t.home.clientSideTitle}</p>
        <p className="text-slate-500 text-sm">{t.home.clientSideDesc}</p>
      </div>

      <div className="mt-12 flex flex-col items-center gap-2 text-slate-500 text-xs italic">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>{t.home.credits}</span>
        </div>
        <div className="text-[10px] opacity-40 font-mono mt-1">v{__APP_VERSION__}</div>
      </div>
    </div>
  );
};
