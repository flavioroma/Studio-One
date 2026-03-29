import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ToolLoadingScreenProps {
  Icon: LucideIcon;
  /** CSS variable name from :root, e.g. '--tool-slidesync' */
  colorVar: string;
}

/**
 * A reusable loading screen overlay displayed while a tool is restoring
 * its persisted state. Uses the tool's brand color (via CSS custom properties)
 * for a spinner, icon pulse, and bouncing dots.
 */
export const ToolLoadingScreen: React.FC<ToolLoadingScreenProps> = ({ Icon, colorVar }) => {
  const { t } = useLanguage();

  // Read the RGB triplet from the CSS variable (e.g. "59 130 246")
  const rgb = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();
  const color = `rgb(${rgb})`;
  const colorFaded = `rgba(${rgb}, 0.2)`;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md transition-all duration-300 animate-fadeIn">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div
            className="w-16 h-16 rounded-full animate-spin"
            style={{
              border: '4px solid',
              borderColor: `${colorFaded} ${colorFaded} ${colorFaded} ${color}`,
            }}
          />
          <Icon
            className="w-6 h-6 absolute inset-0 m-auto animate-pulse"
            style={{ color }}
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-white font-bold tracking-[0.2em] uppercase text-sm">
            {t.common.loading}
          </span>
          <div className="flex gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s]"
              style={{ backgroundColor: color }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s]"
              style={{ backgroundColor: color }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
