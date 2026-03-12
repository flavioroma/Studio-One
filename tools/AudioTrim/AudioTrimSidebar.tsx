import React from 'react';
import { Music, Trash2 } from 'lucide-react';
import { AudioTrackItem } from '../../services/PersistenceService';
import { useLanguage } from '../../contexts/LanguageContext';
import { FileDropZone } from '../../components/FileDropZone';

interface AudioTrimSidebarProps {
  tracks: AudioTrackItem[];
  selectedId: string | null;
  onFilesSelected: (files: FileList) => void;
  onSelectTrack: (id: string) => void;
  onDeleteAll: () => void;
  isDisabled?: boolean;
}

export const AudioTrimSidebar: React.FC<AudioTrimSidebarProps> = ({
  tracks,
  selectedId,
  onFilesSelected,
  onSelectTrack,
  onDeleteAll,
  isDisabled = false,
}) => {
  const { t } = useLanguage();

  return (
    <div
      className={`w-80 border-r border-slate-700 bg-slate-800 flex flex-col p-6 overflow-y-auto z-10 shadow-2xl space-y-6 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {tracks.length === 0 ? (
        <div className="space-y-6">
          <FileDropZone
            onFilesSelected={onFilesSelected}
            accept="audio/mpeg, audio/mp3, audio/wav, video/mp4, video/webm, video/ogg, video/quicktime"
            multiple
            label={t.tools.audiotrim.dropZoneTitleMulti}
            themeColor="tool-audiotrim"
          />
        </div>
      ) : (
        <div className="space-y-4 animate-fadeIn">
          {/* Track list */}
          <div className="space-y-2">
            {tracks.map((track) => (
              <button
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  selectedId === track.id
                    ? 'bg-tool-audiotrim/20 border-tool-audiotrim text-tool-audiotrim shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-slate-700/50 border-slate-600 hover:border-tool-audiotrim/40 hover:bg-slate-700/50 text-slate-300'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${selectedId === track.id ? 'bg-tool-audiotrim/20' : 'bg-slate-600/50'}`}
                >
                  <Music className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold truncate">{track.file.name}</span>
              </button>
            ))}
          </div>
          {/* Upload more area */}
          <FileDropZone
            onFilesSelected={onFilesSelected}
            accept="audio/mpeg, audio/mp3, audio/wav, video/mp4, video/webm, video/ogg, video/quicktime"
            multiple
            themeColor="tool-audiotrim"
            className="h-24"
          />
        </div>
      )}

      {tracks.length > 0 && (
        <div className="pt-6 mt-auto border-t border-slate-700">
          <button
            onClick={onDeleteAll}
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
