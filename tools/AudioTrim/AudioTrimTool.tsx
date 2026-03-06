import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  Download,
  Trash2,
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { FileDropZone } from '../../components/FileDropZone';
import { PersistenceService } from '../../services/PersistenceService';
import { useLanguage } from '../../contexts/LanguageContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';

type ExportFormat = 'wav' | 'mp3';

export const AudioTrimTool: React.FC = () => {
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
  const [exportFormat, setExportFormat] = useState<ExportFormat>('wav');
  const [audioDataOffset, setAudioDataOffset] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);

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
      setPeaks(filteredData.map((n) => n * multiplier));

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
      console.error('Decoding error:', e);
      alert(t.tools.audiotrim.decodeError);
    }
  };

  // Persistence Logic
  const isLoadedRef = useRef(false);

  // Load State
  useEffect(() => {
    const load = async () => {
      const state = await PersistenceService.loadAudioTrimState();
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
      PersistenceService.saveAudioTrimState({
        file,
        startTime,
        endTime,
        exportFormat,
      });
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [file, startTime, endTime, exportFormat]);

  const handleDrop = (files: FileList) => {
    if (files && files[0]) {
      processAudio(files[0]);
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

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !waveformContainerRef.current) return;

    const rect = waveformContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = x / rect.width;
    const time = pct * (audioBuffer?.duration || 0);

    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, audioBuffer?.duration]);

  const handleKeyDown = (e: React.KeyboardEvent, type: 'start' | 'end') => {
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 1.0 : e.altKey ? 0.01 : 0.1;
      const delta = e.key === 'ArrowLeft' ? -step : step;

      if (type === 'start') {
        setStartTime((prev) => {
          const next = Math.max(0, Math.min(prev + delta, endTime - 0.01));
          if (audioRef.current) audioRef.current.currentTime = next;
          return next;
        });
      } else {
        setEndTime((prev) =>
          Math.max(startTime + 0.01, Math.min(prev + delta, audioBuffer?.duration || 0))
        );
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
        view.setInt16(
          offset + (i * numChannels + channel) * 2,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true
        );
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
        downloadBlob(blob, `trimmed_${file.name.replace(/\.[^/.]+$/, '')}.mp3`);
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
        downloadBlob(blob, `trimmed_${file.name.replace(/\.[^/.]+$/, '')}.wav`);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert(t.tools.audiotrim.exportFailed);
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
    setStartTime(0);
    setEndTime(0);
    if (audioRef.current) audioRef.current.src = '';

    // Clear Persistence
    PersistenceService.saveAudioTrimState({
      file: null,
      startTime: 0,
      endTime: 0,
      exportFormat: 'wav',
    });
  };

  const handleDeleteRequest = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    reset();
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redraw waveform on canvas
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Set display size
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale all drawing operations by dpr
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const barCount = peaks.length;
    const gap = 2; // Consistent gap
    const barWidth = (width - (barCount - 1) * gap) / barCount;

    ctx.clearRect(0, 0, width, height);

    peaks.forEach((p, i) => {
      const x = i * (barWidth + gap);
      const barHeight = Math.max(2, p * height); // Minimum 2px height
      const y = (height - barHeight) / 2;

      const progress = i / barCount;
      const startPct = startTime / (audioBuffer?.duration || 1);
      const endPct = endTime / (audioBuffer?.duration || 1);
      const isActive = progress >= startPct && progress <= endPct;

      // Drawer colors based on theme
      if (isActive) {
        // Linear gradient for active bars
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)'); // Light
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.4)'); // Darker
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = '#334155'; // slate-700
      }

      // Draw rounded bar
      const radius = barWidth / 2;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barHeight, radius);
      } else {
        // Fallback for older browsers
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();
    });
  };

  // Redraw when peaks or markers change
  useEffect(() => {
    drawWaveform();
  }, [peaks, startTime, endTime, audioBuffer]);

  // Handle Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      drawWaveform();
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [peaks, startTime, endTime]);

  return (
    <div className="h-full flex flex-col bg-slate-900 p-8 overflow-y-auto">
      <div className="max-w-5xl w-full mx-auto space-y-8">
        {!file ? (
          <FileDropZone
            onFilesSelected={handleDrop}
            accept="audio/mpeg, audio/mp3, audio/wav, video/mp4, video/webm, video/ogg, video/quicktime"
            label={t.tools.audiotrim.dropZoneTitle}
            themeColor="tool-audiotrim"
          />
        ) : (
          <div className="space-y-6 animate-fadeIn pb-12">
            <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 bg-tool-audiotrim/10 rounded-xl shrink-0">
                  <Music className="w-6 h-6 text-tool-audiotrim" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">{file.name}</h2>
                </div>
              </div>
              <button
                onClick={handleDeleteRequest}
                className="p-3 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all shrink-0"
                title={t.common.removeFile}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Waveform Editor Area */}
            <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl relative overflow-hidden group/editor">
              <div
                ref={waveformContainerRef}
                className="h-48 w-full relative cursor-crosshair"
                onClick={(e) => {
                  if (!audioRef.current) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const pct = x / rect.width;
                  const time = pct * (audioBuffer?.duration || 0);
                  audioRef.current.currentTime = time;
                  setCurrentTime(time);
                }}
              >
                {/* Canvas Waveform */}
                <canvas ref={canvasRef} className="w-full h-full block" />

                {/* Overlays for cut sections */}
                <div
                  className="absolute inset-y-0 left-0 bg-slate-950/70 pointer-events-none border-r border-tool-audiotrim/30"
                  style={{ width: `${(startTime / (audioBuffer?.duration || 1)) * 100}%` }}
                ></div>
                <div
                  className="absolute inset-y-0 right-0 bg-slate-950/70 pointer-events-none border-l border-tool-audiotrim/30"
                  style={{ width: `${(1 - endTime / (audioBuffer?.duration || 1)) * 100}%` }}
                ></div>

                {/* Playback Cursor */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-white z-10 shadow-[0_0_15px_rgba(255,255,255,1)] pointer-events-none"
                  style={{ left: `${(currentTime / (audioBuffer?.duration || 1)) * 100}%` }}
                >
                  <div
                    className="absolute -top-1 -left-[7px] w-4 h-4 bg-white rotate-45 pointer-events-auto cursor-col-resize hover:scale-125 transition-transform"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsDragging(true);
                    }}
                  ></div>
                </div>
              </div>

              {/* Marker Controls Overlay */}
              <div className="mt-8 space-y-8">
                <div className="flex justify-center">
                  <div className="font-mono text-lg text-white bg-black/40 px-6 py-2 rounded-xl border border-slate-700 tabular-nums shadow-inner">
                    {formatTime(currentTime)}
                  </div>
                </div>

                <div className="flex justify-evenly items-start pt-8 border-t border-slate-700/50">
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => togglePlay('all')}
                      className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all ${
                        isPlaying && playMode === 'all'
                          ? 'bg-tool-audiotrim/80 text-white shadow-lg shadow-tool-audiotrim/20 ring-2 ring-white/20'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                      title={t.tools.audiotrim.playFull}
                    >
                      {isPlaying && playMode === 'all' ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 ml-1" />
                      )}
                    </button>
                    <span className="text-[12px] font-black uppercase tracking-widest text-slate-500">
                      {t.tools.audiotrim.fullTrack}
                    </span>
                    <span className="text-[10px] font-mono text-tool-audiotrim/70 font-bold uppercase tracking-widest">
                      {formatTime(audioBuffer?.duration || 0)}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => togglePlay('selection')}
                      className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all ${
                        isPlaying && playMode === 'selection'
                          ? 'bg-tool-audiotrim text-white shadow-lg shadow-tool-audiotrim/20 ring-2 ring-white/20'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                      title={t.tools.audiotrim.playSelection}
                    >
                      {isPlaying && playMode === 'selection' ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 ml-1" />
                      )}
                    </button>
                    <span className="text-[12px] font-black uppercase tracking-widest text-slate-500">
                      {t.tools.audiotrim.selection}
                    </span>
                    <span className="text-[10px] font-mono text-tool-audiotrim/70 font-bold uppercase tracking-widest">
                      {formatTime(endTime - startTime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Controls Panel */}
            <div className="flex flex-col gap-6">
              {/* Marker Controls */}
              <div className="bg-slate-800/80 backdrop-blur-sm p-8 rounded-3xl border border-slate-700 space-y-8">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={handleSetStart}
                    className="flex-1 group/btn flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-700 hover:bg-tool-audiotrim/20 hover:text-tool-audiotrim border border-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                  >
                    <Flag className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />{' '}
                    {t.tools.audiotrim.setStart}
                  </button>
                  <button
                    onClick={handleSetEnd}
                    className="flex-1 group/btn flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-700 hover:bg-tool-audiotrim/20 hover:text-tool-audiotrim border border-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                  >
                    <Flag className="w-3.5 h-3.5 fill-current group-hover/btn:scale-110 transition-transform" />{' '}
                    {t.tools.audiotrim.setEnd}
                  </button>
                </div>

                {/* Range Inputs (Fine-tuning enabled) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[12px] font-black uppercase tracking-widest text-slate-500">
                        {t.tools.audiotrim.selectionStart}
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-tool-audiotrim">
                          {formatTime(startTime)}
                        </span>
                      </div>
                    </div>
                    <div className="relative flex items-center gap-2">
                      <button
                        onClick={() => setStartTime((s) => Math.max(0, s - 0.1))}
                        className="p-1 hover:text-white text-slate-500 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
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
                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-tool-audiotrim"
                      />
                      <button
                        onClick={() => setStartTime((s) => Math.min(endTime - 0.01, s + 0.1))}
                        className="p-1 hover:text-white text-slate-500 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[12px] font-black uppercase tracking-widest text-slate-500">
                        {t.tools.audiotrim.selectionEnd}
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-tool-audiotrim">
                          {formatTime(endTime)}
                        </span>
                      </div>
                    </div>
                    <div className="relative flex items-center gap-2">
                      <button
                        onClick={() => setEndTime((s) => Math.max(startTime + 0.01, s - 0.1))}
                        className="p-1 hover:text-white text-slate-500 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
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
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-tool-audiotrim"
                      />
                      <button
                        onClick={() =>
                          setEndTime((s) => Math.min(audioBuffer?.duration || 0, s + 0.1))
                        }
                        className="p-1 hover:text-white text-slate-500 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[12px] text-slate-600 text-center italic mt-4">
                  {t.tools.audiotrim.tip}
                </p>
              </div>

              {/* Export Panel */}
              <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-700 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div>
                    <p className="text-[12px] font-black uppercase text-slate-500 mb-1">
                      {t.tools.audiotrim.outputFormat}
                    </p>
                    <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700">
                      <button
                        onClick={() => setExportFormat('wav')}
                        className={`px-4 py-1 text-[12px] font-black uppercase rounded-md transition-all ${exportFormat === 'wav' ? 'bg-tool-audiotrim text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        WAV
                      </button>
                      <button
                        onClick={() => setExportFormat('mp3')}
                        className={`px-4 py-1 text-[12px] font-black uppercase rounded-md transition-all ${exportFormat === 'mp3' ? 'bg-tool-audiotrim text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        MP3
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 max-w-[600px] text-right">
                    <p className="text-[12px] font-black uppercase text-slate-500 mb-1">
                      {t.tools.audiotrim.desc}
                    </p>
                    <p className="text-[12px] text-tool-audiotrim/80 leading-relaxed font-medium whitespace-pre-line">
                      {exportFormat === 'wav'
                        ? t.tools.audiotrim.wavDesc
                        : t.tools.audiotrim.mp3Desc}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-tool-audiotrim hover:opacity-90 text-white font-black rounded-2xl transition-all disabled:opacity-50 shadow-xl shadow-tool-audiotrim/10 active:scale-95"
                >
                  {isExporting ? (
                    <Clock className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  <span>
                    {t.tools.audiotrim.exportAs} {exportFormat.toUpperCase()}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        <audio ref={audioRef} className="hidden" />
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={t.tools.audiotrim.removeTrackTitle}
        message={t.tools.audiotrim.removeTrackMsg}
        confirmLabel={t.common.yesRemove}
        cancelLabel={t.common.cancel}
        Icon={Trash2}
      />
    </div>
  );
};
