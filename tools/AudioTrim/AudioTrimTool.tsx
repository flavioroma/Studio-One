import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
} from 'lucide-react';
import { PersistenceService, AudioTrackItem } from '../../services/PersistenceService';
import { useLanguage } from '../../contexts/LanguageContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { AudioTrimSidebar } from './AudioTrimSidebar';
import { TimeRangeSelector } from '../../components/TimeRangeSelector';
import * as lamejs from '@breezystack/lamejs';
import { bufferToWav } from '../../utils/audioUtils';

type ExportFormat = 'wav' | 'mp3';

export const AudioTrimTool: React.FC = () => {
  const { t } = useLanguage();

  // Multi-track state
  const [tracks, setTracks] = useState<AudioTrackItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Per-track transient state (derived from selected track's file)
  const [file, setFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<'selection' | 'all' | 'endSelection'>('selection');
  const [isExporting, setIsExporting] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('wav');
  const [audioDataOffset, setAudioDataOffset] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEraseProjectConfirm, setShowEraseProjectConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playEndSeconds, setPlayEndSeconds] = useState(5);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef(0);

  const animationRef = useRef<number | null>(null);
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);

  const selectedTrack = tracks.find((t) => t.id === selectedId) || null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const formatTimeForFilename = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}m${secs.toString().padStart(2, '0')}s${ms.toString().padStart(2, '0')}`;
  };


  const syncEndInputs = (time: number) => {
    setEndMins(Math.floor(time / 60).toString());
    setEndSecs(Math.floor(time % 60).toString());
    setEndCents(Math.floor((time % 1) * 100).toString());
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

      // Initialize AudioContext
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      return buffer;
    } catch (e) {
      console.error('Decoding error:', e);
      alert(t.tools.audiotrim.decodeError);
      return null;
    }
  };

  // Persistence Logic
  const isLoadedRef = useRef(false);
  // Suppress saving during track switch
  const isSwitchingRef = useRef(false);

  // Load State
  useEffect(() => {
    const load = async () => {
      setIsProcessing(true);
      try {
        const state = await PersistenceService.loadAudioTrimState();
        if (state && state.tracks.length > 0) {
          setTracks(state.tracks);
          const initialId = state.selectedId || state.tracks[0].id;
          setSelectedId(initialId);

          // Process the initially selected track
          const initialTrack = state.tracks.find((t) => t.id === initialId) || state.tracks[0];
          const buffer = await processAudio(initialTrack.file);
          if (buffer) {
            const effectiveEndTime = initialTrack.endTime || buffer.duration;
            setStartTime(initialTrack.startTime);
            setEndTime(effectiveEndTime);
            setExportFormat(initialTrack.exportFormat);
          }
        }
      } finally {
        isLoadedRef.current = true;
        setIsProcessing(false);
      }
    };
    load();
  }, []);

  // Save State — debounced
  useEffect(() => {
    if (!isLoadedRef.current || isSwitchingRef.current) return;

    const timeoutId = setTimeout(() => {
      // Update current track's mutable fields before saving
      const updatedTracks = tracks.map((track) => {
        if (track.id === selectedId) {
          return { ...track, startTime, endTime, exportFormat };
        }
        return track;
      });

      PersistenceService.saveAudioTrimState({
        tracks: updatedTracks,
        selectedId,
      });
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [tracks, selectedId, startTime, endTime, exportFormat]);

  // Save current track state before switching
  const saveCurrentTrackState = useCallback(() => {
    if (selectedId) {
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id === selectedId) {
            return { ...track, startTime, endTime, exportFormat };
          }
          return track;
        })
      );
    }
  }, [selectedId, startTime, endTime, exportFormat]);

  // Handle track selection
  const handleSelectTrack = useCallback(
    async (id: string) => {
      if (id === selectedId || isProcessing) return;

      stopAudio();

      // Save current track's state
      saveCurrentTrackState();

      isSwitchingRef.current = true;
      setIsProcessing(true);

      const track = tracks.find((t) => t.id === id);
      if (!track) {
        setIsProcessing(false);
        isSwitchingRef.current = false;
        return;
      }

      setSelectedId(id);
      try {
        const buffer = await processAudio(track.file);
        if (buffer) {
          const effectiveEndTime = track.endTime || buffer.duration;
          setStartTime(track.startTime);
          setEndTime(effectiveEndTime);
          setExportFormat(track.exportFormat);
          setCurrentTime(0);

          // Update track metadata if it was 0
          if (track.endTime === 0) {
            setTracks((prev) =>
              prev.map((t) => (t.id === id ? { ...t, endTime: buffer.duration } : t))
            );
          }
        }
      } finally {
        setIsProcessing(false);
        isSwitchingRef.current = false;
      }
    },
    [selectedId, tracks, startTime, endTime, exportFormat, isProcessing]
  );

  // Handle file drop (multi file)
  const handleDrop = async (files: FileList) => {
    if (!files || files.length === 0) return;

    stopAudio();
    saveCurrentTrackState();

    const newTracks: AudioTrackItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const id = Math.random().toString(36).substr(2, 9);
      newTracks.push({
        id,
        file: files[i],
        startTime: 0,
        endTime: 0, // will be set after processing
        exportFormat: 'wav',
      });
    }

    setTracks((prev) => [...prev, ...newTracks]);

    // Select and process the first new track
    const firstTrack = newTracks[0];
    setSelectedId(firstTrack.id);
    setIsProcessing(true);
    try {
      const buffer = await processAudio(firstTrack.file);
      if (buffer) {
        const duration = buffer.duration;
        setStartTime(0);
        setEndTime(duration);
        setCurrentTime(0);

        // Update the track with the actual duration
        setTracks((prev) =>
          prev.map((track) =>
            track.id === firstTrack.id ? { ...track, endTime: duration } : track
          )
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {}
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const startPlayback = (time: number, mode: 'selection' | 'all' | 'endSelection') => {
    stopAudio();
    if (!audioCtxRef.current || !audioBuffer) return;

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    const source = audioCtxRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtxRef.current.destination);

    source.start(0, time);
    sourceNodeRef.current = source;
    startTimeRef.current = audioCtxRef.current.currentTime - time;
    setIsPlaying(true);
    setPlayMode(mode);
  };

  const togglePlay = (mode: 'selection' | 'all' | 'endSelection') => {
    if (isPlaying && mode === playMode) {
      stopAudio();
    } else {
      let startPosition = mode === 'selection' ? Math.max(startTime, currentTime) : currentTime;
      if (mode === 'selection') {
        startPosition = startTime;
      }
      if (mode === 'endSelection') {
        startPosition = Math.max(startTime, endTime - playEndSeconds);
      }
      if (mode === 'all' && startPosition >= (audioBuffer?.duration || 0)) {
        startPosition = 0;
      }
      startPlayback(startPosition, mode);
    }
  };

  useEffect(() => {
    const updateProgress = () => {
      if (isPlaying && audioCtxRef.current && sourceNodeRef.current) {
        const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
        setCurrentTime(elapsed);

        if ((playMode === 'selection' || playMode === 'endSelection') && elapsed >= endTime) {
          stopAudio();
          setCurrentTime(startTime);
        } else if (playMode === 'all' && elapsed >= (audioBuffer?.duration || 0)) {
          stopAudio();
          setCurrentTime(0);
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


  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !waveformContainerRef.current) return;

    const rect = waveformContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = x / rect.width;
    const time = pct * (audioBuffer?.duration || 0);

    if (isPlaying) {
      startPlayback(time, playMode);
    } else {
      setCurrentTime(time);
    }
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

  const handleExport = async () => {
    if (!file || !audioBuffer) return;
    setIsExporting(true);

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const startStr = formatTimeForFilename(startTime);
    const endStr = formatTimeForFilename(endTime);
    const fileName = `${baseName}_trim_${startStr}_${endStr}.${exportFormat}`;

    try {
      // 1. Render exactly the offline segment for WAV or MP3
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

      if (exportFormat === 'mp3') {
        // High-precision MP3 generation using lamejs
        const channels = renderedBuffer.numberOfChannels;
        const sampleRate = renderedBuffer.sampleRate;
        const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
        const mp3Data: Uint8Array[] = [];

        // Convert Float32 to Int16
        const samplesL = new Int16Array(renderedBuffer.length);
        const samplesR = channels > 1 ? new Int16Array(renderedBuffer.length) : samplesL;

        const leftData = renderedBuffer.getChannelData(0);
        const rightData = channels > 1 ? renderedBuffer.getChannelData(1) : leftData;

        for (let i = 0; i < renderedBuffer.length; i++) {
          samplesL[i] = leftData[i] < 0 ? leftData[i] * 32768 : leftData[i] * 32767;
          if (channels > 1) {
            samplesR[i] = rightData[i] < 0 ? rightData[i] * 32768 : rightData[i] * 32767;
          }
        }

        const sampleBlockSize = 1152; // Can be anything, but 1152 is standard for MP3

        for (let i = 0; i < renderedBuffer.length; i += sampleBlockSize) {
          const leftChunk = samplesL.subarray(i, i + sampleBlockSize);
          const rightChunk = channels > 1 ? samplesR.subarray(i, i + sampleBlockSize) : leftChunk;

          let mp3buf;
          if (channels === 2) {
            mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
          } else {
            mp3buf = mp3encoder.encodeBuffer(leftChunk);
          }
          if (mp3buf.length > 0) {
            mp3Data.push(new Uint8Array(mp3buf));
          }
        }

        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) {
          mp3Data.push(new Uint8Array(mp3buf));
        }

        const blob = new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
        downloadBlob(blob, fileName);
      } else {
        // High-fidelity PCM Render for WAV
        const wavData = bufferToWav(renderedBuffer);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        downloadBlob(blob, fileName);
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

  const resetCurrentTrack = () => {
    setFile(null);
    setAudioBuffer(null);
    setPeaks([]);
    setIsPlaying(false);
    setAudioDataOffset(0);
    setStartTime(0);
    setEndTime(0);
    stopAudio();
  };

  // Remove a single track (from the main page trash button)
  const handleDeleteRequest = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!selectedId) return;

    const remaining = tracks.filter((t) => t.id !== selectedId);
    setTracks(remaining);
    resetCurrentTrack();

    if (remaining.length > 0) {
      // Select the first remaining track
      const nextTrack = remaining[0];
      setSelectedId(nextTrack.id);
      setIsProcessing(true);
      processAudio(nextTrack.file)
        .then((buffer) => {
          if (buffer) {
            const effectiveEndTime = nextTrack.endTime || buffer.duration;
            setStartTime(nextTrack.startTime);
            setEndTime(effectiveEndTime);
            setExportFormat(nextTrack.exportFormat);

            // Update track metadata if it was 0
            if (nextTrack.endTime === 0) {
              setTracks((prev) =>
                prev.map((t) => (t.id === nextTrack.id ? { ...t, endTime: buffer.duration } : t))
              );
            }
          }
        })
        .finally(() => {
          setIsProcessing(false);
        });
    } else {
      setSelectedId(null);
      PersistenceService.saveAudioTrimState({ tracks: [], selectedId: null });
    }

    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Erase entire project
  const handleEraseProject = () => {
    setShowEraseProjectConfirm(true);
  };

  const confirmEraseProject = () => {
    setTracks([]);
    setSelectedId(null);
    resetCurrentTrack();
    PersistenceService.saveAudioTrimState({ tracks: [], selectedId: null });
    setShowEraseProjectConfirm(false);
  };

  const cancelEraseProject = () => {
    setShowEraseProjectConfirm(false);
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
    <div className="h-full flex bg-slate-900 overflow-hidden">
      <AudioTrimSidebar
        tracks={tracks}
        selectedId={selectedId}
        onFilesSelected={handleDrop}
        onSelectTrack={handleSelectTrack}
        onDeleteAll={handleEraseProject}
        isDisabled={isProcessing}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
        {/* Loading Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md transition-all duration-300 animate-fadeIn">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-tool-audiotrim/20 border-t-tool-audiotrim rounded-full animate-spin"></div>
                <Music className="w-6 h-6 text-tool-audiotrim absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-white font-bold tracking-[0.2em] uppercase text-sm">
                  {t.common.loading}
                </span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-tool-audiotrim rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-tool-audiotrim rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-tool-audiotrim rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 relative flex flex-col items-center p-8 overflow-y-auto">
          {!selectedTrack ? (
            <div className="flex flex-col items-center gap-4 text-slate-600 animate-pulse my-auto">
              <Music className="w-24 h-24 stroke-[1px]" />
              <p className="font-bold uppercase tracking-[0.3em] text-xs">
                {t.tools.audiotrim.noTracksHint}
              </p>
            </div>
          ) : !file ? (
            <div className="flex flex-col items-center gap-4 text-slate-600 animate-pulse my-auto">
              <Music className="w-24 h-24 stroke-[1px]" />
              <p className="font-bold uppercase tracking-[0.3em] text-xs">
                {t.tools.audiotrim.noTracksHint}
              </p>
            </div>
          ) : (
            <div className="max-w-5xl w-full mx-auto space-y-8 my-auto">
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-3 bg-tool-audiotrim/10 rounded-xl shrink-0">
                      <Music className="w-6 h-6 text-tool-audiotrim" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-white truncate">{file.name}</h2>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        Duration: {formatTime(audioBuffer?.duration || 0)}
                      </p>
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
                    className="h-48 w-full relative cursor-crosshair border border-tool-audiotrim/30"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const pct = x / rect.width;
                      const time = pct * (audioBuffer?.duration || 0);
                      if (isPlaying) {
                        startPlayback(time, playMode);
                      } else {
                        setCurrentTime(time);
                      }
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

                  {/* Header Area for Playback */}
                  <div className="mt-8 flex items-center justify-center gap-6 px-4">
                    <div className="flex flex-col items-center gap-2 group/play">
                      <button
                        onClick={() => togglePlay('all')}
                        className={`w-22 h-22 flex items-center justify-center border border-tool-audiotrim/50 rounded-4xl transition-all ${
                          isPlaying && playMode === 'all'
                            ? 'bg-tool-audiotrim/80 text-white shadow-lg'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                        title={t.tools.audiotrim.playFull}
                      >
                        {isPlaying && playMode === 'all' ? (
                          <Pause className="w-11 h-11" />
                        ) : (
                          <Play className="w-11 h-11 ml-1 text-tool-audiotrim" />
                        )}
                      </button>
                      <span className="text-[12px] font-black uppercase tracking-widest text-slate-500 group-hover/play:text-slate-400 mt-2">
                        {t.tools.audiotrim.fullTrack}
                      </span>
                      <span className="text-[12px] font-mono text-tool-audiotrim font-bold uppercase tracking-widest mt-1">
                        {formatTime(audioBuffer?.duration || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Controls Panel */}
                <div className="flex flex-col gap-6">
                  
                  <TimeRangeSelector
                    theme="audiotrim"
                    currentTime={currentTime}
                    startTime={startTime}
                    endTime={endTime}
                    maxDuration={audioBuffer?.duration || 100}
                    onStartTimeChange={setStartTime}
                    onEndTimeChange={setEndTime}
                    formatTime={formatTime}
                    labels={{
                      setStart: t.tools.audiotrim.setStart,
                      setEnd: t.tools.audiotrim.setEnd,
                      selectionStart: t.tools.audiotrim.selectionStart,
                      selectionEnd: t.tools.audiotrim.selectionEnd,
                    }}
                    startAddon={
                      <div className="flex flex-col items-center pt-8">
                        <div className="flex flex-col items-center gap-2 group/play">
                          <button
                            onClick={() => togglePlay('selection')}
                            className={`w-22 h-22 flex items-center justify-center border border-tool-audiotrim/50 rounded-4xl transition-all ${
                              isPlaying && playMode === 'selection'
                                ? 'bg-tool-audiotrim text-white shadow-lg shadow-tool-audiotrim/20 ring-2 ring-white/20'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-300 shadow-lg'
                            }`}
                            title={t.tools.audiotrim.playSelection}
                          >
                            {isPlaying && playMode === 'selection' ? (
                              <Pause className="w-11 h-11" />
                            ) : (
                              <RotateCcw className="w-11 h-11 text-tool-audiotrim" />
                            )}
                          </button>
                          <span className="text-[12px] font-black uppercase tracking-widest text-slate-500 group-hover/play:text-slate-400 mt-2 text-center">
                            {t.tools.audiotrim.selection}
                          </span>
                          <span className="text-[12px] font-mono text-tool-audiotrim font-bold uppercase tracking-widest mt-1">
                            {formatTime(Math.max(0, endTime - startTime))}
                          </span>
                        </div>
                      </div>
                    }
                    endAddon={
                      <div className="flex flex-col items-center pt-8">
                        <div className="flex flex-col items-center gap-2 group/play">
                          <button
                            onClick={() => togglePlay('endSelection')}
                            className={`w-22 h-22 flex items-center justify-center border border-tool-audiotrim/50 rounded-4xl transition-all ${
                              isPlaying && playMode === 'endSelection'
                                ? 'bg-tool-audiotrim text-white shadow-lg shadow-tool-audiotrim/20 ring-2 ring-white/20'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-300 shadow-lg'
                            }`}
                            title={t.tools.audiotrim.playEndSelection}
                          >
                            {isPlaying && playMode === 'endSelection' ? (
                              <Pause className="w-11 h-11" />
                            ) : (
                              <Play className="w-11 h-11 ml-1 text-tool-audiotrim" />
                            )}
                          </button>
                          <span className="text-[12px] font-black uppercase tracking-widest text-slate-500 group-hover/play:text-slate-400 mt-2 text-center">
                            {t.tools.audiotrim.playEndSelection}
                          </span>
                          <div className="text-[12px] font-bold tracking-widest flex items-center gap-1.5 mt-1 text-slate-500">
                            <span>{t.tools.audiotrim.playLast}</span>
                            <select
                              className="bg-slate-900 border border-slate-700 text-tool-audiotrim font-mono text-[11px] rounded px-1.5 py-0.5 outline-none cursor-pointer hover:border-tool-audiotrim/50 transition-colors"
                              value={playEndSeconds}
                              onChange={(e) => setPlayEndSeconds(Number(e.target.value))}
                            >
                              {[1, 2, 3, 5, 9].map((sec) => (
                                <option 
                                  key={sec} 
                                  value={sec} 
                                  disabled={(endTime - startTime) < sec}
                                >
                                  {sec}
                                </option>
                              ))}
                            </select>
                            <span>{t.tools.audiotrim.seconds}</span>
                          </div>
                        </div>
                      </div>
                    }
                  />

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
            </div>
          )}
        </div>
      </div>

      {/* Single track delete confirmation */}
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

      {/* Erase project confirmation */}
      <ConfirmationModal
        isOpen={showEraseProjectConfirm}
        onClose={cancelEraseProject}
        onConfirm={confirmEraseProject}
        title={t.tools.audiotrim.eraseProjectTitle}
        message={t.tools.audiotrim.eraseProjectMsg}
        confirmLabel={t.common.yesRemove}
        cancelLabel={t.common.cancel}
        Icon={Trash2}
      />
    </div>
  );
};
