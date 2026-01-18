import React, { useState, useRef, useEffect } from 'react';
import { Music, Upload, Scissors, Play, Pause, Download, Trash2, Clock, CheckCircle2, Flag, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { PersistenceService } from '../../services/PersistenceService';
import { useLanguage } from '../../contexts/LanguageContext';

type ExportFormat = 'wav' | 'mp3';

export const MPTrimTool: React.FC = () => {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<'selection' | 'all'>('selection');
  const [isExporting, setIsExporting] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp3');
  const [audioDataOffset, setAudioDataOffset] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  /**
   * Parses the MP3 file to find where the actual audio data starts.
   * This handles ID3v2 tags which often shift the audio timing in byte-slices.
   */
  const getMP3DataOffset = async (blob: Blob): Promise<number> => {
    const headerBuffer = await blob.slice(0, 10).arrayBuffer();
    const view = new DataView(headerBuffer);

    // Check for "ID3" magic string
    if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
      // ID3v2 header found. Size is stored in bytes 6-9 as a synchsafe integer (7 bits per byte)
      const byte6 = view.getUint8(6);
      const byte7 = view.getUint8(7);
      const byte8 = view.getUint8(8);
      const byte9 = view.getUint8(9);

      const size = (byte6 << 21) | (byte7 << 14) | (byte8 << 7) | byte9;
      return size + 10; // Header size is 10 bytes + the payload size
    }
    return 0; // No ID3v2 header found
  };

  const processAudio = async (selectedFile: File) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await selectedFile.arrayBuffer();

    try {
      const buffer = await audioCtx.decodeAudioData(arrayBuffer);

      // Calculate data offset to improve MP3 slicing accuracy
      const offset = await getMP3DataOffset(selectedFile);
      setAudioDataOffset(offset);

      const rawData = buffer.getChannelData(0);
      const samples = 300;
      const blockSize = Math.floor(rawData.length / samples);
      const filteredData = [];
      for (let i = 0; i < samples; i++) {
        let blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum = sum + Math.abs(rawData[blockStart + j]);
        }
        filteredData.push(sum / blockSize);
      }

      const multiplier = Math.pow(Math.max(...filteredData), -1);
      setPeaks(filteredData.map(n => n * multiplier));

      setAudioBuffer(buffer);
      setFile(selectedFile);
      setStartTime(0);
      setEndTime(buffer.duration);
      setCurrentTime(0);

      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(selectedFile);
        audioRef.current.currentTime = 0;
      }
    } catch (e) {
      console.error("Decoding error:", e);
      alert(t.tools.mptrim.decodeError);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processAudio(e.target.files[0]);
    }
  }


  // Persistence Logic
  const isLoadedRef = useRef(false);

  // Load State
  useEffect(() => {
    const load = async () => {
      const state = await PersistenceService.loadMPTrimState();
      if (state && state.file) {
        // Restore file and re-process audio
        await processAudio(state.file);
        // Override defaults with saved values
        setStartTime(state.startTime);
        setEndTime(state.endTime);
        setExportFormat(state.exportFormat);
      }
      isLoadedRef.current = true;
    };
    load();
  }, []);

  // Save State
  useEffect(() => {
    if (!isLoadedRef.current) return;

    const timeoutId = setTimeout(() => {
      PersistenceService.saveMPTrimState({
        file,
        startTime,
        endTime,
        exportFormat
      });
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [file, startTime, endTime, exportFormat]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAudio(e.dataTransfer.files[0]);
    }
  };

  const togglePlay = (mode: 'selection' | 'all') => {
    if (!audioRef.current) return;

    if (isPlaying && mode === playMode) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setPlayMode(mode);
      if (mode === 'selection') {
        if (audioRef.current.currentTime >= endTime || audioRef.current.currentTime < startTime) {
          audioRef.current.currentTime = startTime;
        }
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (!audioRef.current) return;

    const updateProgress = () => {
      if (audioRef.current) {
        const time = audioRef.current.currentTime;
        setCurrentTime(time);

        if (playMode === 'selection' && time >= endTime) {
          audioRef.current.pause();
          setIsPlaying(false);
          audioRef.current.currentTime = startTime;
        } else if (playMode === 'all' && time >= (audioBuffer?.duration || 0)) {
          audioRef.current.pause();
          setIsPlaying(false);
          audioRef.current.currentTime = 0;
        }
      }
      animationRef.current = requestAnimationFrame(updateProgress);
    };

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateProgress);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, startTime, endTime, playMode, audioBuffer]);

  const handleSetStart = () => {
    if (!audioRef.current) return;
    const newStart = Math.min(audioRef.current.currentTime, endTime - 0.01);
    setStartTime(newStart);
  };

  const handleSetEnd = () => {
    if (!audioRef.current) return;
    const newEnd = Math.max(audioRef.current.currentTime, startTime + 0.01);
    setEndTime(newEnd);
  };

  const handleKeyDown = (e: React.KeyboardEvent, type: 'start' | 'end') => {
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 1.0 : (e.altKey ? 0.01 : 0.1);
      const delta = e.key === 'ArrowLeft' ? -step : step;

      if (type === 'start') {
        setStartTime(prev => {
          const next = Math.max(0, Math.min(prev + delta, endTime - 0.01));
          if (audioRef.current) audioRef.current.currentTime = next;
          return next;
        });
      } else {
        setEndTime(prev => Math.max(startTime + 0.01, Math.min(prev + delta, audioBuffer?.duration || 0)));
      }
    }
  };

  const bufferToWav = (buffer: AudioBuffer) => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const length = buffer.length * numChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + buffer.length * numChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, buffer.length * numChannels * 2, true);

    const offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset + (i * numChannels + channel) * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      }
    }

    return arrayBuffer;
  };

  const handleExport = async () => {
    if (!file || !audioBuffer) return;
    setIsExporting(true);

    try {
      if (exportFormat === 'mp3') {
        // High-precision Bitstream Slice for MP3
        // We subtract the metadata header size from the calculation to ensure accurate mapping.
        const audioPayloadSize = file.size - audioDataOffset;
        const startPct = startTime / audioBuffer.duration;
        const endPct = endTime / audioBuffer.duration;

        const startByte = audioDataOffset + Math.floor(startPct * audioPayloadSize);
        const endByte = audioDataOffset + Math.floor(endPct * audioPayloadSize);

        const blob = file.slice(startByte, endByte, file.type);
        downloadBlob(blob, `trimmed_${file.name.replace(/\.[^/.]+$/, "")}.mp3`);
      } else {
        // High-fidelity PCM Render for WAV
        const frameStart = Math.floor(startTime * audioBuffer.sampleRate);
        const frameEnd = Math.floor(endTime * audioBuffer.sampleRate);
        const frameCount = frameEnd - frameStart;

        const offlineCtx = new OfflineAudioContext(
          audioBuffer.numberOfChannels,
          frameCount,
          audioBuffer.sampleRate
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start(0, startTime, endTime - startTime);

        const renderedBuffer = await offlineCtx.startRendering();
        const wavData = bufferToWav(renderedBuffer);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        downloadBlob(blob, `trimmed_${file.name.replace(/\.[^/.]+$/, "")}.wav`);
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert(t.tools.mptrim.exportFailed);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setAudioBuffer(null);
    setPeaks([]);
    setIsPlaying(false);
    setAudioDataOffset(0);
    if (audioRef.current) audioRef.current.src = "";
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 p-8 overflow-y-auto">
      <div className="max-w-5xl w-full mx-auto space-y-8">
        {!file ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-700 bg-slate-800/30 rounded-3xl h-[400px] flex flex-col items-center justify-center transition-all hover:border-emerald-500/50 hover:bg-slate-800/50 group"
          >
            <div className="p-6 bg-slate-700 rounded-full mb-6 group-hover:scale-110 transition-transform">
              <Upload className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">{t.tools.mptrim.dropZoneTitle}</h2>
            <p className="text-slate-400 mb-8 text-center px-6 leading-relaxed" dangerouslySetInnerHTML={{ __html: t.tools.mptrim.dropZoneDesc }}>
            </p>
            <input
              type="file"
              accept="audio/mpeg, audio/mp3, audio/wav"
              className="hidden"
              id="audio-input"
              onChange={handleFileChange}
            />
            <label
              htmlFor="audio-input"
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              {t.tools.mptrim.selectFile}
            </label>
          </div>
        ) : (
          <div className="space-y-6 animate-fadeIn pb-12">
            <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 bg-emerald-500/10 rounded-xl shrink-0">
                  <Music className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">{file.name}</h2>
                </div>
              </div>
              <button onClick={reset} className="p-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all shrink-0" title={t.tools.mptrim.removeFile}>
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Waveform Editor Area */}
            <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl relative overflow-hidden group/editor">
              <div className="h-48 w-full flex items-center gap-[2px] relative cursor-crosshair"
                onClick={(e) => {
                  if (!audioRef.current) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const pct = x / rect.width;
                  const time = pct * (audioBuffer?.duration || 0);
                  audioRef.current.currentTime = time;
                  setCurrentTime(time);
                }}>
                {/* Waveform Visualization */}
                {peaks.map((p, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-slate-700 rounded-full relative overflow-hidden"
                    style={{ height: `${p * 100}%` }}
                  >
                    {/* Active Segment Highlight */}
                    {(i / peaks.length) >= (startTime / (audioBuffer?.duration || 1)) &&
                      (i / peaks.length) <= (endTime / (audioBuffer?.duration || 1)) && (
                        <div className="absolute inset-0 bg-emerald-400/60 transition-colors"></div>
                      )
                    }
                  </div>
                ))}

                {/* Overlays for cut sections */}
                <div
                  className="absolute inset-y-0 left-0 bg-slate-950/70 pointer-events-none border-r border-emerald-500/30"
                  style={{ width: `${(startTime / (audioBuffer?.duration || 1)) * 100}%` }}
                ></div>
                <div
                  className="absolute inset-y-0 right-0 bg-slate-950/70 pointer-events-none border-l border-emerald-500/30"
                  style={{ width: `${(1 - endTime / (audioBuffer?.duration || 1)) * 100}%` }}
                ></div>

                {/* Playback Cursor */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-white z-10 shadow-[0_0_15px_rgba(255,255,255,1)]"
                  style={{ left: `${(currentTime / (audioBuffer?.duration || 1)) * 100}%` }}
                >
                  <div className="absolute -top-1 -left-[3px] w-2 h-2 bg-white rotate-45"></div>
                </div>
              </div>

              {/* Marker Controls Overlay */}
              <div className="mt-8 flex items-center justify-between">
                <div className="flex gap-4">
                  <button
                    onClick={handleSetStart}
                    className="group/btn flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-emerald-600/20 hover:text-emerald-400 border border-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                  >
                    <Flag className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" /> {t.tools.mptrim.setStart}
                  </button>
                  <button
                    onClick={handleSetEnd}
                    className="group/btn flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-emerald-600/20 hover:text-emerald-400 border border-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                  >
                    <Flag className="w-3.5 h-3.5 fill-current group-hover/btn:scale-110 transition-transform" /> {t.tools.mptrim.setEnd}
                  </button>
                </div>

                <div className="font-mono text-2xl text-white bg-black/40 px-6 py-2 rounded-xl border border-slate-700 tabular-nums shadow-inner">
                  {formatTime(currentTime)}
                </div>
              </div>

              {/* Range Inputs (Fine-tuning enabled) */}
              <div className="mt-6 grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.tools.mptrim.selectionStart}</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-emerald-400">{formatTime(startTime)}</span>
                    </div>
                  </div>
                  <div className="relative flex items-center gap-2">
                    <button onClick={() => setStartTime(s => Math.max(0, s - 0.1))} className="p-1 hover:text-white text-slate-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <input
                      ref={startInputRef}
                      type="range"
                      min="0"
                      max={audioBuffer?.duration || 100}
                      step="0.001"
                      value={startTime}
                      onKeyDown={(e) => handleKeyDown(e, 'start')}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setStartTime(Math.min(val, endTime - 0.01));
                        if (audioRef.current) audioRef.current.currentTime = val;
                      }}
                      className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <button onClick={() => setStartTime(s => Math.min(endTime - 0.01, s + 0.1))} className="p-1 hover:text-white text-slate-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                  <p className="text-[9px] text-slate-600 text-center italic">{t.tools.mptrim.tip}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.tools.mptrim.selectionEnd}</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-emerald-400">{formatTime(endTime)}</span>
                    </div>
                  </div>
                  <div className="relative flex items-center gap-2">
                    <button onClick={() => setEndTime(s => Math.max(startTime + 0.01, s - 0.1))} className="p-1 hover:text-white text-slate-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <input
                      ref={endInputRef}
                      type="range"
                      min="0"
                      max={audioBuffer?.duration || 100}
                      step="0.001"
                      value={endTime}
                      onKeyDown={(e) => handleKeyDown(e, 'end')}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setEndTime(Math.max(val, startTime + 0.01));
                      }}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <button onClick={() => setEndTime(s => Math.min(audioBuffer?.duration || 0, s + 0.1))} className="p-1 hover:text-white text-slate-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                  <p className="text-[9px] text-slate-600 text-center italic">{t.tools.mptrim.tip}</p>
                </div>
              </div>
            </div>

            {/* Main Controls Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Playback Controls */}
              <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-700 flex items-center justify-around">
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={() => togglePlay('all')}
                    className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all ${isPlaying && playMode === 'all'
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 ring-2 ring-white/20'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                    title={t.tools.mptrim.playFull}
                  >
                    {isPlaying && playMode === 'all' ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                    {t.tools.mptrim.fullTrack}<br />
                    <span className="text-emerald-400/80 font-mono lower">{formatTime(audioBuffer?.duration || 0)}</span>
                  </span>
                </div>

                <div className="h-12 w-[1px] bg-slate-700"></div>

                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={() => togglePlay('selection')}
                    className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all ${isPlaying && playMode === 'selection'
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 ring-2 ring-white/20'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                    title={t.tools.mptrim.playSelection}
                  >
                    {isPlaying && playMode === 'selection' ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                    {t.tools.mptrim.selection}<br />
                    <span className="text-emerald-400/80 font-mono lower">{formatTime(endTime - startTime)}</span>
                  </span>
                </div>
              </div>

              {/* Export Panel */}
              <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-700 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{t.tools.mptrim.outputFormat}</p>
                    <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700">
                      <button
                        onClick={() => setExportFormat('mp3')}
                        className={`px-4 py-1 text-[10px] font-black uppercase rounded-md transition-all ${exportFormat === 'mp3' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        MP3
                      </button>
                      <button
                        onClick={() => setExportFormat('wav')}
                        className={`px-4 py-1 text-[10px] font-black uppercase rounded-md transition-all ${exportFormat === 'wav' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        WAV
                      </button>
                    </div>
                  </div>
                  <div className="text-right hidden lg:block">
                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{t.tools.mptrim.method}</p>
                    <p className="text-xs text-emerald-400 font-bold flex items-center gap-1 justify-end">
                      {exportFormat === 'mp3' ? t.tools.mptrim.smartSlice : t.tools.mptrim.losslessMaster}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white hover:bg-slate-100 text-slate-900 font-black rounded-2xl transition-all disabled:opacity-50 shadow-xl shadow-white/5 active:scale-95"
                >
                  {isExporting ? <Clock className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  <span>{t.tools.mptrim.downloadAs} {exportFormat.toUpperCase()}</span>
                </button>
              </div>
            </div>

            {exportFormat === 'mp3' && (
              <div className="flex items-center gap-3 p-4 bg-amber-900/20 border border-amber-500/20 rounded-2xl text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: `<strong>${t.tools.mptrim.mp3NoteTitle}</strong> ${t.tools.mptrim.mp3NoteDesc}` }}>
                </p>
              </div>
            )}
          </div>
        )}

        <audio ref={audioRef} className="hidden" />

        {/* Info Footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-slate-800/50">
          <div className="flex gap-4 items-start">
            <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
            <div>
              <h4 className="font-bold text-white text-sm uppercase tracking-tight">{t.tools.mptrim.headerAwareTitle}</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.tools.mptrim.headerAwareDesc}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700"><Scissors className="w-5 h-5 text-emerald-500" /></div>
            <div>
              <h4 className="font-bold text-white text-sm uppercase tracking-tight">{t.tools.mptrim.formatChoiceTitle}</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.tools.mptrim.formatChoiceDesc}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700"><Download className="w-5 h-5 text-emerald-500" /></div>
            <div>
              <h4 className="font-bold text-white text-sm uppercase tracking-tight">{t.tools.mptrim.clientSideTitle}</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.tools.mptrim.clientSideDesc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};