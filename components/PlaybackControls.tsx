import React from 'react';
import { Play, Pause } from 'lucide-react';

interface PlaybackControlsProps {
    isPlaying: boolean;
    onTogglePlay: () => void;
    currentTime: number;
    duration: number;
    isDisabled?: boolean;
    themeColor: string;
    children?: React.ReactNode;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
    isPlaying,
    onTogglePlay,
    currentTime,
    duration,
    isDisabled = false,
    themeColor,
    children
}) => {
    const formatTime = (seconds: number) => {
        if (!Number.isFinite(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const themeClasses = {
        'tool-audiotrim': {
            hoverText: 'hover:text-tool-audiotrim',
            text: 'text-tool-audiotrim'
        },
        'tool-slidesync': {
            hoverText: 'hover:text-tool-slidesync',
            text: 'text-tool-slidesync'
        },
        'tool-photoverlay': {
            hoverText: 'hover:text-tool-photoverlay',
            text: 'text-tool-photoverlay'
        },
        'tool-videoverlay': {
            hoverText: 'hover:text-tool-videoverlay',
            text: 'text-tool-videoverlay'
        }
    }[themeColor] || {
        hoverText: 'hover:text-slate-300',
        text: 'text-slate-300'
    };

    return (
        <div className="mt-8 flex items-center gap-8 bg-slate-800/90 backdrop-blur-xl rounded-full px-10 py-4 border border-slate-700/50 z-10 shadow-2xl">
            <button
                onClick={onTogglePlay}
                disabled={isDisabled}
                className={`text-white ${themeClasses.hoverText} disabled:opacity-50 transition-all active:scale-90`}
            >
                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
            </button>
            <div className="font-mono text-lg text-slate-100 w-32 text-center tabular-nums">
                <span className={`${themeClasses.text}`}>{formatTime(currentTime)}</span>
                <span className="text-slate-600 mx-2">/</span>
                <span className="text-slate-400">{formatTime(duration)}</span>
            </div>
            {children && (
                <>
                    <div className="h-10 w-[2px] bg-slate-700 mx-2"></div>
                    {children}
                </>
            )}
        </div>
    );
};
