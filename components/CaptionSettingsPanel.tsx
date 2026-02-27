import React from 'react';
import { Wand2, Type, Italic, Palette } from 'lucide-react';
import { TextPosition, TextColor, TextSize, CaptionSettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface CaptionSettingsPanelProps {
    settings: CaptionSettings;
    onUpdate: (updates: Partial<CaptionSettings>) => void;
    onAutoCaption?: () => void;
    isProcessing?: boolean;
}

export const CaptionSettingsPanel: React.FC<CaptionSettingsPanelProps> = ({
    settings,
    onUpdate,
    onAutoCaption,
    isProcessing = false,
}) => {
    const { t } = useLanguage();

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.tools.slidesync.captionText}</label>
                    {/* AI Caption hidden for now - existing code preserved below */}
                    {/* {onAutoCaption && (
                        <button
                            onClick={onAutoCaption}
                            disabled={isProcessing}
                            className="text-[10px] font-bold flex items-center gap-1.5 px-3 py-1 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-full transition-all disabled:opacity-50 uppercase tracking-tight"
                            title={t.tools.slidesync.aiCaptionTitle}
                        >
                            <Wand2 className="w-3 h-3" />
                            {isProcessing ? t.tools.slidesync.thinking : t.tools.slidesync.aiCaption}
                        </button>
                    )} */}
                </div>
                <textarea
                    value={settings.text}
                    onChange={(e) => onUpdate({ text: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-24"
                    placeholder={t.tools.slidesync.enterOverlayText}
                />
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Italic className="w-3 h-3" /> {t.tools.slidesync.textStyle}
                        </label>
                        <div className="flex bg-slate-700 p-1 rounded-xl border border-slate-600">
                            <button
                                onClick={() => onUpdate({ isItalic: false })}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${!settings.isItalic ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                {t.tools.slidesync.normal}
                            </button>
                            <button
                                onClick={() => onUpdate({ isItalic: true })}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${settings.isItalic ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                {t.tools.slidesync.italic}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Type className="w-3 h-3" /> {t.tools.slidesync.textSize}
                        </label>
                        <div className="flex bg-slate-700 p-1 rounded-xl border border-slate-600">
                            {Object.values(TextSize).map((size) => (
                                <button
                                    key={size}
                                    onClick={() => onUpdate({ textSize: size })}
                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${settings.textSize === size ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                >
                                    {t.tools.slidesync.textSizes[size]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.tools.slidesync.position}</label>
                        <select
                            value={settings.position}
                            onChange={(e) => onUpdate({ position: e.target.value as TextPosition })}
                            className="w-full bg-slate-700 border border-slate-600 rounded-xl p-2.5 text-[11px] font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                        >
                            {Object.values(TextPosition).map((pos) => (
                                <option key={pos} value={pos}>{t.tools.slidesync.textPositions[pos]}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Palette className="w-3 h-3" /> {t.tools.slidesync.colorPalette}
                    </label>
                    <div className="grid grid-cols-10 gap-1.5 pt-1">
                        {Object.entries(TextColor).map(([name, hex]) => (
                            <button
                                key={name}
                                onClick={() => onUpdate({ color: hex as TextColor })}
                                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 ${settings.color === hex ? 'border-white ring-2 ring-blue-500/50' : 'border-transparent'
                                    }`}
                                style={{ backgroundColor: hex }}
                                title={name}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
