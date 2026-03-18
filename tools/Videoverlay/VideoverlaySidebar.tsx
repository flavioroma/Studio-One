import React from 'react';
import { Trash2, Volume2, VolumeX, Music } from 'lucide-react';
import { Rotation, AudioMode, CaptionSettings, WatermarkSettings } from '../../types';
import { CaptionSettingsPanel } from '../../components/CaptionSettingsPanel';
import { WatermarkSettingsPanel } from '../../components/WatermarkSettingsPanel';
import { useLanguage } from '../../contexts/LanguageContext';
import { FileDropZone } from '../../components/FileDropZone';

import { MetadataService, VideoMetadata } from '../../services/MetadataService';

interface VideoverlaySidebarProps {
  file: File | null;
  metadata: VideoMetadata | null;
  rotation: Rotation;
  audioMode: AudioMode;
  audioFile: File | null;
  captionSettings: CaptionSettings;
  watermarkSettings: WatermarkSettings;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  rotation,
  audioMode,
  audioFile,
  captionSettings,
  watermarkSettings,
  onFileChange,
  onRotationChange,
  onAudioModeChange,
  onAudioFileChange,
  onRemoveAudioFile,
  onCaptionUpdate,
  onWatermarkUpdate,
  onDelete,
}) => {
  const { t } = useLanguage();

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
    <div className="w-80 border-r border-slate-700 bg-slate-800 flex flex-col p-6 overflow-y-auto z-10 shadow-2xl space-y-6">
      {!file ? (
        <div className="space-y-6">
          <FileDropZone
            onFilesSelected={(files) => {
              const event = {
                target: { files },
              } as React.ChangeEvent<HTMLInputElement>;
              onFileChange(event);
            }}
            accept="video/*"
            label={t.tools.videoverlay.uploadVideo}
            themeColor="tool-videoverlay"
          />
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn pb-8">
          {/* Rotation Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest text-center">
              {t.tools.videoverlay.rotation}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {rotationOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onRotationChange(opt.id as Rotation)}
                  className={`flex items-center justify-center gap-2 p-2 rounded-xl border hover:text-tool-videoverlay transition-all ${
                    rotation === opt.id
                      ? 'bg-tool-videoverlay/20 border-tool-videoverlay text-tool-videoverlay shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                      : 'bg-slate-700/50 border-slate-600 hover:border-tool-videoverlay/40 hover:bg-slate-700/50'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest text-center">
              {t.tools.videoverlay.audioSettings}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {audioOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onAudioModeChange(opt.id as AudioMode)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border hover:text-tool-videoverlay transition-all ${
                    audioMode === opt.id
                      ? 'bg-tool-videoverlay/20 border-tool-videoverlay text-tool-videoverlay shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                      : 'bg-slate-700/50 border-slate-600 hover:border-tool-videoverlay/40 hover:bg-slate-700/50'
                  }`}
                >
                  <opt.icon className="w-4 h-4 mb-1" />
                  <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                </button>
              ))}
            </div>

            {audioMode === AudioMode.Replace && (
              <div className="flex items-center gap-2 mt-2 hover:text-tool-videoverlay">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={onAudioFileChange}
                  className="hidden"
                  id="audio-upload"
                />
                <label
                  htmlFor="audio-upload"
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-600 cursor-pointer hover:border-tool-videoverlay/40 bg-slate-700/50 transition-all ${audioFile ? 'bg-tool-videoverlay/10 border-tool-videoverlay text-tool-videoverlay' : ''}`}
                >
                  <Music className="w-4 h-4" />
                  <span className="text-sm truncate max-w-[120px]">
                    {audioFile ? audioFile.name : t.tools.videoverlay.selectAudio}
                  </span>
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
              {t.common.overlay}
            </h3>

            <CaptionSettingsPanel
              settings={captionSettings}
              onUpdate={onCaptionUpdate}
              themeColor="tool-videoverlay"
            />

            <WatermarkSettingsPanel
              settings={watermarkSettings}
              onUpdate={onWatermarkUpdate}
              themeColor="tool-videoverlay"
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
            <span className="text-xs font-bold uppercase tracking-widest">
              {t.common.eraseProject}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
