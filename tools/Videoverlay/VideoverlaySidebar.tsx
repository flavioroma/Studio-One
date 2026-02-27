import React from 'react';
import { Upload, Trash2, Monitor, Smartphone, Smartphone as SmartphoneIcon, Square, Volume2, VolumeX, Music, Video as VideoIcon } from 'lucide-react';
import { AspectRatio, Rotation, AudioMode, TextColor, TextPosition, TextSize, CaptionSettings, WatermarkSettings } from '../../types';
import { CaptionSettingsPanel } from '../../components/CaptionSettingsPanel';
import { WatermarkSettingsPanel } from '../../components/WatermarkSettingsPanel';
import { useLanguage } from '../../contexts/LanguageContext';

interface VideoverlaySidebarProps {
    file: File | null;
    metadata: { width: number; height: number; duration?: number; bitrate?: number } | null;
    aspectRatio: AspectRatio;
    rotation: Rotation;
    audioMode: AudioMode;
    audioFile: File | null;
    captionSettings: CaptionSettings;
    watermarkSettings: WatermarkSettings;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAspectRatioChange: (ratio: AspectRatio) => void;
    onRotationChange: (rot: Rotation) => void;
    onAudioModeChange: (mode: AudioMode) => void;
    onAudioFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveAudioFile: () => void;
    onCaptionUpdate: (updates: Partial<CaptionSettings>) => void;
    onWatermarkUpdate: (updates: Partial<WatermarkSettings>) => void;
    onDelete: () => void;
}

export const VideoverlaySidebar: React.FC<VideoverlaySidebarProps> = ({
    file,
    metadata,
    aspectRatio,
    rotation,
    audioMode,
    audioFile,
    captionSettings,
    watermarkSettings,
    onFileChange,
    onAspectRatioChange,
    onRotationChange,
    onAudioModeChange,
    onAudioFileChange,
    onRemoveAudioFile,
    onCaptionUpdate,
    onWatermarkUpdate,
    onDelete,
}) => {
    const { t } = useLanguage();

    const isRotated = rotation === Rotation.CW_90 || rotation === Rotation.CCW_90;
    const w = metadata ? (isRotated ? metadata.height : metadata.width) : 16;
    const h = metadata ? (isRotated ? metadata.width : metadata.height) : 9;

    const ratio = w / h;
    const isLandscapeOrSquare = w >= h;

    const is16_9 = Math.abs(ratio - 16 / 9) < 0.05;
    const is9_16 = Math.abs(ratio - 9 / 16) < 0.05;
    const is5_4 = Math.abs(ratio - 5 / 4) < 0.05;
    const is4_5 = Math.abs(ratio - 4 / 5) < 0.05;

    let formatOptions = [];

    if (isLandscapeOrSquare) {
        if (is16_9 || is5_4) {
            formatOptions = [
                { id: AspectRatio.Landscape_16_9, label: '16:9', icon: Monitor },
                { id: AspectRatio.Landscape_5_4, label: '5:4', icon: Monitor }, // 5:4 is Landscape/Monitor
                { id: AspectRatio.Square_1_1, label: '1:1', icon: Square },
            ];
        } else {
            formatOptions = [
                { id: AspectRatio.Landscape_16_9, label: '16:9', icon: Monitor },
                { id: AspectRatio.Landscape_5_4, label: '5:4', icon: Monitor },
                { id: AspectRatio.Original, label: t.tools.videoverlay.originalFormat, icon: VideoIcon },
            ];
        }
    } else {
        if (is9_16 || is4_5) {
            formatOptions = [
                { id: AspectRatio.Portrait_9_16, label: '9:16', icon: Smartphone },
                { id: AspectRatio.Portrait_4_5, label: '4:5', icon: SmartphoneIcon },
                { id: AspectRatio.Square_1_1, label: '1:1', icon: Square },
            ];
        } else {
            formatOptions = [
                { id: AspectRatio.Portrait_9_16, label: '9:16', icon: Smartphone },
                { id: AspectRatio.Portrait_4_5, label: '4:5', icon: SmartphoneIcon },
                { id: AspectRatio.Original, label: t.tools.videoverlay.originalFormat, icon: VideoIcon },
            ];
        }
    }

    const rotationOptions = [
        { id: Rotation.None, label: '0°' },
        { id: Rotation.CW_90, label: '90° CW' },
        { id: Rotation.CCW_90, label: '90° CCW' },
        { id: Rotation.Half, label: '180°' },
    ];

    const audioOptions = [
        { id: AudioMode.Keep, label: t.tools.videoverlay.keepAudio, icon: Volume2 },
        { id: AudioMode.Remove, label: t.tools.videoverlay.removeAudio, icon: VolumeX },
        { id: AudioMode.Replace, label: t.tools.videoverlay.replaceAudio, icon: Music },
    ];

    return (
        <div className="w-80 border-r border-slate-700 bg-slate-800 flex flex-col p-6 overflow-y-auto z-10 shadow-2xl">
            {!file ? (
                <div className="space-y-6">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                        <p className="text-md text-blue-400 leading-relaxed text-center">
                            {t.tools.videoverlay.selectVideo}
                        </p>
                    </div>
                    <label className="flex flex-col items-center justify-center gap-4 w-full h-48 rounded-3xl border-2 border-dashed border-slate-600 hover:border-purple-500 hover:bg-slate-700/50 cursor-pointer transition-all group">
                        <div className="p-4 bg-slate-700 rounded-full group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-purple-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-400">{t.tools.videoverlay.uploadVideo}</span>
                        <input type="file" accept="video/*" onChange={onFileChange} className="hidden" />
                    </label>
                </div>
            ) : (
                <div className="space-y-8 animate-fadeIn">
                    {/* Format Settings */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest text-center">{t.tools.videoverlay.videoFormat}</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {formatOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => onAspectRatioChange(opt.id)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${aspectRatio === opt.id
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                                        }`}
                                >
                                    <opt.icon className="w-4 h-4 mb-1" />
                                    <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rotation Settings */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest text-center">{t.tools.videoverlay.rotation}</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {rotationOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => onRotationChange(opt.id as Rotation)}
                                    className={`flex items-center justify-center gap-2 p-2 rounded-xl border transition-all ${rotation === opt.id
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                                        }`}
                                >
                                    <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Audio Settings */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest text-center">{t.tools.videoverlay.audioSettings}</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {audioOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => onAudioModeChange(opt.id as AudioMode)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${audioMode === opt.id
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                                        }`}
                                >
                                    <opt.icon className="w-4 h-4 mb-1" />
                                    <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                                </button>
                            ))}
                        </div>

                        {audioMode === AudioMode.Replace && (
                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={onAudioFileChange}
                                    className="hidden"
                                    id="audio-upload"
                                />
                                <label
                                    htmlFor="audio-upload"
                                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-600 cursor-pointer hover:bg-slate-700/50 transition-all ${audioFile ? 'bg-blue-600/10 border-blue-400 text-blue-300' : ''}`}
                                >
                                    <Music className="w-4 h-4" />
                                    <span className="text-sm truncate max-w-[120px]">{audioFile ? audioFile.name : t.tools.videoverlay.selectAudio}</span>
                                </label>
                                {audioFile && (
                                    <button
                                        onClick={onRemoveAudioFile}
                                        className="p-3 text-red-400 hover:bg-red-900/20 rounded-xl"
                                        title={t.tools.videoverlay.removeAudio}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest text-center">
                            {t.tools.videoverlay.overlaySettings}
                        </h3>

                        <CaptionSettingsPanel
                            settings={captionSettings}
                            onUpdate={onCaptionUpdate}
                        />

                        <WatermarkSettingsPanel
                            settings={watermarkSettings}
                            onUpdate={onWatermarkUpdate}
                        />
                    </div>
                </div>
            )}

            {file && (
                <div className="pt-6 mt-auto border-t border-slate-700">
                    <button
                        onClick={onDelete}
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
