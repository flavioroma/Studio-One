import React, { useState, useEffect, useRef } from 'react';
import { Flag, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface TimeRangeSelectorProps {
  theme: 'audiotrim' | 'videoverlay';
  currentTime: number;
  startTime: number;
  endTime: number;
  maxDuration: number;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
  formatTime: (time: number) => string;
  labels: {
    setStart: string;
    setEnd: string;
    selectionStart: string;
    selectionEnd: string;
  };
  startAddon?: React.ReactNode;
  endAddon?: React.ReactNode;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  theme,
  currentTime,
  startTime,
  endTime,
  maxDuration,
  onStartTimeChange,
  onEndTimeChange,
  formatTime,
  labels,
  startAddon,
  endAddon,
}) => {
  const [startMins, setStartMins] = useState('0');
  const [startSecs, setStartSecs] = useState('0');
  const [startCents, setStartCents] = useState('0');
  const [endMins, setEndMins] = useState('0');
  const [endSecs, setEndSecs] = useState('0');
  const [endCents, setEndCents] = useState('0');

  useEffect(() => {
    setStartMins(Math.floor(startTime / 60).toString());
    setStartSecs(Math.floor(startTime % 60).toString());
    setStartCents(Math.floor((startTime % 1) * 100).toString());
  }, [startTime]);

  useEffect(() => {
    setEndMins(Math.floor(endTime / 60).toString());
    setEndSecs(Math.floor(endTime % 60).toString());
    setEndCents(Math.floor((endTime % 1) * 100).toString());
  }, [endTime]);

  const handleSetStartFromCurrent = () => {
    const newStart = Math.min(currentTime, endTime - 0.01);
    onStartTimeChange(newStart);
  };

  const handleSetEndFromCurrent = () => {
    const newEnd = Math.max(currentTime, startTime + 0.01);
    onEndTimeChange(newEnd);
  };

  const textClass = theme === 'audiotrim' ? 'text-tool-audiotrim' : 'text-tool-videoverlay';
  const bgClass = theme === 'audiotrim' ? 'bg-tool-audiotrim' : 'bg-tool-videoverlay';
  const hoverBgClass = theme === 'audiotrim' ? 'hover:bg-tool-audiotrim/20' : 'hover:bg-tool-videoverlay/20';
  const borderClass = theme === 'audiotrim' ? 'border-tool-audiotrim/50' : 'border-tool-videoverlay/50';
  const strokeClass = theme === 'audiotrim' ? 'stroke-tool-audiotrim' : 'stroke-tool-videoverlay';
  const accentClass = theme === 'audiotrim' ? 'accent-tool-audiotrim' : 'accent-tool-videoverlay';

  // Specific classes for sliders
  const startSliderThumb = theme === 'audiotrim' 
    ? '[&::-webkit-slider-thumb]:bg-tool-audiotrim [&::-moz-range-thumb]:bg-tool-audiotrim' 
    : '[&::-webkit-slider-thumb]:bg-tool-videoverlay [&::-moz-range-thumb]:bg-tool-videoverlay';
  
  const endSliderThumb = theme === 'audiotrim'
    ? '[&::-webkit-slider-thumb]:bg-tool-audiotrim [&::-moz-range-thumb]:bg-tool-audiotrim'
    : '[&::-webkit-slider-thumb]:bg-tool-videoverlay [&::-moz-range-thumb]:bg-tool-videoverlay';

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm p-8 rounded-3xl border border-slate-700">
      {/* Marker and Current Time Row */}
      <div className="flex items-center justify-between mb-10 gap-6">
        <button
          onClick={handleSetStartFromCurrent}
          className={`flex-1 group/btn flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 ${textClass} ${hoverBgClass} border ${borderClass} rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95`}
        >
          <Flag className={`w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform ${textClass}`} />{' '}
          {labels.setStart}
        </button>

        <div className={`font-mono text-md ${textClass} bg-black/40 px-8 py-2 rounded-2xl border border-black/40 tabular-nums shadow-inner ring-1 ring-white/5 shrink-0`}>
          {formatTime(currentTime)}
        </div>

        <button
          onClick={handleSetEndFromCurrent}
          className={`flex-1 group/btn flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 ${textClass} ${hoverBgClass} border ${borderClass} rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95`}
        >
          <Flag className={`w-3.5 h-3.5 fill-current group-hover/btn:scale-110 transition-transform ${textClass}`} />{' '}
          {labels.setEnd}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Start Marker Column */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[12px] font-black uppercase tracking-widest text-slate-500">
                {labels.selectionStart}
              </label>
              <div className="flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/50">
                <input
                  type="text"
                  className={`w-8 bg-transparent text-center text-xs font-mono ${textClass} focus:outline-none`}
                  value={startMins}
                  onChange={(e) => setStartMins(e.target.value)}
                  placeholder="00"
                />
                <span className="text-slate-600 font-mono">:</span>
                <input
                  type="text"
                  className={`w-8 bg-transparent text-center text-xs font-mono ${textClass} focus:outline-none`}
                  value={startSecs}
                  onChange={(e) => setStartSecs(e.target.value)}
                  placeholder="00"
                />
                <span className="text-slate-600 font-mono">.</span>
                <input
                  type="text"
                  className={`w-8 bg-transparent text-center text-xs font-mono ${textClass} focus:outline-none`}
                  value={startCents}
                  onChange={(e) => setStartCents(e.target.value)}
                  placeholder="00"
                />
                <button
                  onClick={() => {
                    const val =
                      parseFloat(startMins || '0') * 60 +
                      parseFloat(startSecs || '0') +
                      parseFloat(startCents || '0') / 100;
                    if (!isNaN(val)) {
                      const final = Math.max(0, Math.min(val, endTime - 0.01));
                      onStartTimeChange(final);
                    }
                  }}
                  className={`ml-2 px-2 py-1 ${bgClass} text-[10px] text-white font-black uppercase rounded transition-opacity hover:opacity-90`}
                >
                  Set
                </button>
              </div>
            </div>

            <div className="relative flex items-center gap-2">
              <button
                onClick={() => {
                  const next = Math.max(0, startTime - 0.1);
                  onStartTimeChange(next);
                }}
                className="p-1 hover:text-white text-slate-500 transition-colors"
                title="-0.1s"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const next = Math.max(0, startTime - 0.01);
                  onStartTimeChange(next);
                }}
                className="p-1 hover:text-white text-slate-500 transition-colors"
                title="-0.01s"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0"
                max={maxDuration || 100}
                step="0.001"
                value={startTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const final = Math.min(val, endTime - 0.01);
                  onStartTimeChange(final);
                }}
                className={`flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer ${accentClass} [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full ${startSliderThumb} [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none`}
              />
              <button
                onClick={() => {
                  const next = Math.min(endTime - 0.01, startTime + 0.01);
                  onStartTimeChange(next);
                }}
                className="p-1 hover:text-white text-slate-500 transition-colors"
                title="+0.01s"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const next = Math.min(endTime - 0.01, startTime + 0.1);
                  onStartTimeChange(next);
                }}
                className="p-1 hover:text-white text-slate-500 transition-colors"
                title="+0.1s"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {startAddon}
        </div>

        {/* End Marker Column */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/50">
                <input
                  type="text"
                  className={`w-8 bg-transparent text-center text-xs font-mono ${textClass} focus:outline-none`}
                  value={endMins}
                  onChange={(e) => setEndMins(e.target.value)}
                  placeholder="00"
                />
                <span className="text-slate-600 font-mono">:</span>
                <input
                  type="text"
                  className={`w-8 bg-transparent text-center text-xs font-mono ${textClass} focus:outline-none`}
                  value={endSecs}
                  onChange={(e) => setEndSecs(e.target.value)}
                  placeholder="00"
                />
                <span className="text-slate-600 font-mono">.</span>
                <input
                  type="text"
                  className={`w-8 bg-transparent text-center text-xs font-mono ${textClass} focus:outline-none`}
                  value={endCents}
                  onChange={(e) => setEndCents(e.target.value)}
                  placeholder="00"
                />
                <button
                  onClick={() => {
                    const val =
                      parseFloat(endMins || '0') * 60 +
                      parseFloat(endSecs || '0') +
                      parseFloat(endCents || '0') / 100;
                    if (!isNaN(val)) {
                      const final = Math.min(maxDuration, Math.max(val, startTime + 0.01));
                      onEndTimeChange(final);
                    }
                  }}
                  className={`ml-2 px-2 py-1 ${bgClass} text-[10px] text-white font-black uppercase rounded transition-opacity hover:opacity-90`}
                >
                  Set
                </button>
              </div>
              <label className="text-[12px] font-black uppercase tracking-widest text-slate-500">
                {labels.selectionEnd}
              </label>
            </div>

            <div className="relative flex items-center gap-2">
              <button
                onClick={() => {
                  const next = Math.max(startTime + 0.01, endTime - 0.1);
                  onEndTimeChange(next);
                }}
                className="p-1 hover:text-white text-slate-500 transition-colors"
                title="-0.1s"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const next = Math.max(startTime + 0.01, endTime - 0.01);
                  onEndTimeChange(next);
                }}
                className="p-1 hover:text-white text-slate-500 transition-colors"
                title="-0.01s"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0"
                max={maxDuration || 100}
                step="0.001"
                value={endTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const final = Math.max(val, startTime + 0.01);
                  onEndTimeChange(final);
                }}
                className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer ${accentClass} [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full ${endSliderThumb} [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none`}
              />
              <button
                onClick={() => {
                  const next = Math.min(maxDuration, endTime + 0.01);
                  onEndTimeChange(next);
                }}
                className="p-1 hover:text-white text-slate-500 transition-colors"
                title="+0.01s"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const next = Math.min(maxDuration, endTime + 0.1);
                  onEndTimeChange(next);
                }}
                className="p-1 hover:text-white text-slate-500 transition-colors"
                title="+0.1s"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {endAddon}
        </div>
      </div>
    </div>
  );
};
