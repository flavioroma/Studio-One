import React from 'react';
import { Upload, Plus, Check, Trash2 } from 'lucide-react';
import { PhotoItem, CaptionSettings, WatermarkSettings, TextColor, TextPosition, TextSize } from '../../types';
import { CaptionSettingsPanel } from '../../components/CaptionSettingsPanel';
import { WatermarkSettingsPanel } from '../../components/WatermarkSettingsPanel';
import { useLanguage } from '../../contexts/LanguageContext';

interface PhotoverlaySidebarProps {
    itemsCount: number;
    selectedItem: PhotoItem | null;
    applyToAll: boolean;
    onApplyToAllChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCaptionUpdate: (updates: Partial<CaptionSettings>) => void;
    onWatermarkUpdate: (updates: Partial<WatermarkSettings>) => void;
    onDeleteAll: () => void;
}

export const PhotoverlaySidebar: React.FC<PhotoverlaySidebarProps> = ({
    itemsCount,
    selectedItem,
    applyToAll,
    onApplyToAllChange,
    onFileChange,
    onCaptionUpdate,
    onWatermarkUpdate,
    onDeleteAll,
}) => {
    const { t } = useLanguage();

    return (
        <div className="w-80 border-r border-slate-700 bg-slate-800 flex flex-col p-6 overflow-y-auto z-10 shadow-2xl justify-between">
            <h2 className="text-lg font-bold mb-4 text-slate-100 uppercase tracking-widest text-center">
                {t.tools.photoverlay.overlaySettings}
            </h2>

            {itemsCount > 0 && (
                <div className="mb-8 p-4 bg-slate-700/50 rounded-2xl border border-slate-600">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${applyToAll ? 'bg-pink-500 border-pink-500' : 'border-slate-500 group-hover:border-pink-400'}`}>
                            {applyToAll && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                        </div>
                        <span className="text-xs font-bold text-slate-300 group-hover:text-slate-100 transition-colors">
                            {t.tools.photoverlay.applyToAll}
                        </span>
                        <input type="checkbox" checked={applyToAll} onChange={onApplyToAllChange} className="hidden" />
                    </label>
                </div>
            )}

            {itemsCount === 0 ? (
                <div className="space-y-6">
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                        <p className="text-md text-purple-400 leading-relaxed text-center">
                            {t.tools.photoverlay.selectPhoto}
                        </p>
                    </div>
                    <label className="flex flex-col items-center justify-center gap-4 w-full h-48 rounded-3xl border-2 border-dashed border-slate-600 hover:border-pink-500 hover:bg-slate-700/50 cursor-pointer transition-all group">
                        <div className="p-4 bg-slate-700 rounded-full group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-pink-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-400">{t.tools.photoverlay.uploadPhoto}</span>
                        <input type="file" accept="image/*" multiple onChange={onFileChange} className="hidden" />
                    </label>
                </div>
            ) : (
                <div className="space-y-8 animate-fadeIn">
                    <CaptionSettingsPanel
                        settings={selectedItem?.captionSettings || { text: '', color: TextColor.White, position: TextPosition.BottomLeft, textSize: TextSize.Small, isItalic: false }}
                        onUpdate={onCaptionUpdate}
                    />

                    <WatermarkSettingsPanel
                        settings={selectedItem?.watermarkSettings || { file: null, position: TextPosition.TopRight, opacity: 0.2, scale: 0.2 }}
                        onUpdate={onWatermarkUpdate}
                    />
                </div>
            )}

            {itemsCount > 0 && (
                <div className="pt-6 mt-auto border-t border-slate-700">
                    <button
                        onClick={onDeleteAll}
                        className="w-full flex items-center justify-center gap-3 p-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-2xl transition-all group"
                    >
                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-widest">{t.common.eraseProject}</span>
                    </button>
                </div>
            )}
        </div>
    );
};
