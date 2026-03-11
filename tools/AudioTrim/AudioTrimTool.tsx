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
import * as lamejs from '@breezystack/lamejs';

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
  const [playMode, setPlayMode] = useState<'selection' | 'all'>('selection');
  const [isExporting, setIsExporting] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('wav');
  const [audioDataOffset, setAudioDataOffset] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEraseProjectConfirm, setShowEraseProjectConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startMins, setStartMins] = useState('0');
  const [startSecs, setStartSecs] = useState('0');
  const [startCents, setStartCents] = useState('0');
  const [endMins, setEndMins] = useState('0');
  const [endSecs, setEndSecs] = useState('0');
  const [endCents, setEndCents] = useState('0');

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

  const syncStartInputs = (time: number) => {
    setStartMins(Math.floor(time / 60).toString());
    setStartSecs(Math.floor(time % 60).toString());
    setStartCents(Math.floor((time % 1) * 100).toString());
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
      const state = await PersistenceService.loadAudioTrimState();
      if (state && state.tracks.length > 0) {
        setTracks(state.tracks);
        const initialId = state.selectedId || state.tracks[0].id;
        setSelectedId(initialId);

        // Process the initially selected track
        const initialTrack = state.tracks.find((t) => t.id === initialId) || state.tracks[0];
        const buffer = await processAudio(initialTrack.file);
        if (buffer) {
          setStartTime(initialTrack.startTime);
          setEndTime(initialTrack.endTime);
          setExportFormat(initialTrack.exportFormat);
          syncStartInputs(initialTrack.startTime);
          syncEndInputs(initialTrack.endTime);
        }
      }
      isLoadedRef.current = true;
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
      if (id === selectedId) return;

      stopAudio();

      // Save current track's state
      saveCurrentTrackState();

      isSwitchingRef.current = true;

      const track = tracks.find((t) => t.id === id);
      if (!track) return;

      setSelectedId(id);
      const buffer = await processAudio(track.file);
      if (buffer) {
        setStartTime(track.startTime);
        setEndTime(track.endTime);
        setExportFormat(track.exportFormat);
        setCurrentTime(0);
        syncStartInputs(track.startTime);
        syncEndInputs(track.endTime);
      }

      isSwitchingRef.current = false;
    },
    [selectedId, tracks, startTime, endTime, exportFormat]
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
    const buffer = await processAudio(firstTrack.file);
    if (buffer) {
      const duration = buffer.duration;
      setStartTime(0);
      setEndTime(duration);
      setCurrentTime(0);
      syncStartInputs(0);
      syncEndInputs(duration);

      // Update the track with the actual duration
      setTracks((prev) =>
        prev.map((track) =>
          track.id === firstTrack.id ? { ...track, endTime: duration } : track
        )
      );
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) { }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const startPlayback = (time: number, mode: 'selection' | 'all') => {
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

  const togglePlay = (mode: 'selection' | 'all') => {
    if (isPlaying && mode === playMode) {
      stopAudio();
    } else {
      let startPosition = mode === 'selection' ? Math.max(startTime, currentTime) : currentTime;
      if (mode === 'selection' && startPosition >= endTime) {
        startPosition = startTime;
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

        if (playMode === 'selection' && elapsed >= endTime) {
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

  const handleSetStart = () => {
    const newStart = Math.min(currentTime, endTime - 0.01);
    setStartTime(newStart);
    syncStartInputs(newStart);
  };

  const handleSetEnd = () => {
    const newEnd = Math.max(currentTime, startTime + 0.01);
    setEndTime(newEnd);
    syncEndInputs(newEnd);
  };

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
      processAudio(nextTrack.file).then((buffer) => {
        if (buffer) {
          setStartTime(nextTrack.startTime);
          setEndTime(nextTrack.endTime);
          setExportFormat(nextTrack.exportFormat);
          syncStartInputs(nextTrack.startTime);
          syncEndInputs(nextTrack.endTime);
        }
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
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <div className="flex-1 relative flex flex-col items-center justify-center p-8 overflow-y-auto">
          {!selectedTrack ? (
            <div className="flex flex-col items-center gap-4 text-slate-600 animate-pulse">
              <Music className="w-24 h-24 stroke-[1px]" />
              <p className="font-bold uppercase tracking-[0.3em] text-xs">
                {t.tools.audiotrim.noTracksHint}
              </p>
            </div>
          ) : !file ? (
            <div className="flex flex-col items-center gap-4 text-slate-600 animate-pulse">
              <Music className="w-24 h-24 stroke-[1px]" />
              <p className="font-bold uppercase tracking-[0.3em] text-xs">
                {t.tools.audiotrim.noTracksHint}
              </p>
            </div>
          ) : (
            <div className="max-w-5xl w-full mx-auto space-y-8">
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
                    <div className="flex flex-col items-center gap-1 group/play">
                      <button
                        onClick={() => togglePlay('all')}
                        className={`w-22 h-22 flex items-center justify-center border border-tool-audiotrim/50 rounded-4xl transition-all ${isPlaying && playMode === 'all'
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
                      <span className="text-[12px] font-black uppercase tracking-widest text-slate-500 group-hover/play:text-slate-400">
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
                  <div className="bg-slate-800/80 backdrop-blur-sm p-8 rounded-3xl border border-slate-700">
                    {/* Marker and Current Time Row */}
                    <div className="flex items-center justify-between mb-10 gap-6">
                      <button
                        onClick={handleSetStart}
                        className="flex-1 group/btn flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 text-tool-audiotrim hover:bg-tool-audiotrim/20 border border-tool-audiotrim/50 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                      >
                        <Flag className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform text-tool-audiotrim" />{' '}
                        {t.tools.audiotrim.setStart}
                      </button>

                      <div className="font-mono text-md text-tool-audiotrim bg-black/40 px-8 py-2 rounded-2xl border border-black/40 tabular-nums shadow-inner ring-1 ring-white/5 shrink-0">
                        {formatTime(currentTime)}
                      </div>

                      <button
                        onClick={handleSetEnd}
                        className="flex-1 group/btn flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 text-tool-audiotrim hover:bg-tool-audiotrim/20 border border-tool-audiotrim/50 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                      >
                        <Flag className="w-3.5 h-3.5 fill-current group-hover/btn:scale-110 transition-transform text-tool-audiotrim" />{' '}
                        {t.tools.audiotrim.setEnd}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {/* Start Marker Column */}
                      <div className="space-y-6">

                        <div className="space-y-4">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[12px] font-black uppercase tracking-widest text-slate-500">
                              {t.tools.audiotrim.selectionStart}
                            </label>
                            <div className="flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/50">
                              <input
                                type="text"
                                className="w-8 bg-transparent text-center text-xs font-mono text-tool-audiotrim focus:outline-none"
                                value={startMins}
                                onChange={(e) => setStartMins(e.target.value)}
                                placeholder="00"
                              />
                              <span className="text-slate-600 font-mono">:</span>
                              <input
                                type="text"
                                className="w-8 bg-transparent text-center text-xs font-mono text-tool-audiotrim focus:outline-none"
                                value={startSecs}
                                onChange={(e) => setStartSecs(e.target.value)}
                                placeholder="00"
                              />
                              <span className="text-slate-600 font-mono">.</span>
                              <input
                                type="text"
                                className="w-8 bg-transparent text-center text-xs font-mono text-tool-audiotrim focus:outline-none"
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
                                    setStartTime(final);
                                    syncStartInputs(final);
                                  }
                                }}
                                className="ml-2 px-2 py-1 bg-tool-audiotrim text-[10px] text-white font-black uppercase rounded transition-opacity hover:opacity-90"
                              >
                                Set
                              </button>
                            </div>
                          </div>

                          <div className="relative flex items-center gap-2">
                            <button
                              onClick={() => {
                                const next = Math.max(0, startTime - 0.1);
                                setStartTime(next);
                                syncStartInputs(next);
                              }}
                              className="p-1 hover:text-white text-slate-500 transition-colors"
                            >
                              <ChevronsLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const next = Math.max(0, startTime - 0.01);
                                setStartTime(next);
                                syncStartInputs(next);
                              }}
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
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const final = Math.min(val, endTime - 0.01);
                                setStartTime(final);
                                syncStartInputs(final);
                              }}
                              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-tool-audiotrim [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-tool-audiotrim [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-tool-audiotrim [&::-moz-range-thumb]:border-none"
                            />
                            <button
                              onClick={() => {
                                const next = Math.min(endTime - 0.01, startTime + 0.01);
                                setStartTime(next);
                                syncStartInputs(next);
                              }}
                              className="p-1 hover:text-white text-slate-500 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const next = Math.min(endTime - 0.01, startTime + 0.1);
                                setStartTime(next);
                                syncStartInputs(next);
                              }}
                              className="p-1 hover:text-white text-slate-500 transition-colors"
                            >
                              <ChevronsRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* End Marker Column */}
                      <div className="space-y-6">

                        <div className="space-y-4">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[12px] font-black uppercase tracking-widest text-slate-500">
                              {t.tools.audiotrim.selectionEnd}
                            </label>
                            <div className="flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/50">
                              <input
                                type="text"
                                className="w-8 bg-transparent text-center text-xs font-mono text-tool-audiotrim focus:outline-none"
                                value={endMins}
                                onChange={(e) => setEndMins(e.target.value)}
                                placeholder="00"
                              />
                              <span className="text-slate-600 font-mono">:</span>
                              <input
                                type="text"
                                className="w-8 bg-transparent text-center text-xs font-mono text-tool-audiotrim focus:outline-none"
                                value={endSecs}
                                onChange={(e) => setEndSecs(e.target.value)}
                                placeholder="00"
                              />
                              <span className="text-slate-600 font-mono">.</span>
                              <input
                                type="text"
                                className="w-8 bg-transparent text-center text-xs font-mono text-tool-audiotrim focus:outline-none"
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
                                    const final = Math.min(audioBuffer?.duration || 100, Math.max(val, startTime + 0.01));
                                    setEndTime(final);
                                    syncEndInputs(final);
                                  }
                                }}
                                className="ml-2 px-2 py-1 bg-tool-audiotrim text-[10px] text-white font-black uppercase rounded transition-opacity hover:opacity-90"
                              >
                                Set
                              </button>
                            </div>
                          </div>

                          <div className="relative flex items-center gap-2">
                            <button
                              onClick={() => {
                                const next = Math.max(startTime + 0.01, endTime - 0.1);
                                setEndTime(next);
                                syncEndInputs(next);
                              }}
                              className="p-1 hover:text-white text-slate-500 transition-colors"
                            >
                              <ChevronsLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const next = Math.max(startTime + 0.01, endTime - 0.01);
                                setEndTime(next);
                                syncEndInputs(next);
                              }}
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
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const final = Math.max(val, startTime + 0.01);
                                setEndTime(final);
                                syncEndInputs(final);
                              }}
                              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-tool-audiotrim [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-tool-audiotrim [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-tool-audiotrim [&::-moz-range-thumb]:border-none"
                            />
                            <button
                              onClick={() => {
                                const next = Math.min(audioBuffer?.duration || 0, endTime + 0.01);
                                setEndTime(next);
                                syncEndInputs(next);
                              }}
                              className="p-1 hover:text-white text-slate-500 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const next = Math.min(audioBuffer?.duration || 0, endTime + 0.1);
                                setEndTime(next);
                                syncEndInputs(next);
                              }}
                              className="p-1 hover:text-white text-slate-500 transition-colors"
                            >
                              <ChevronsRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center pt-6 mt-6">
                      <div className="flex flex-col items-center gap-2 group/play mb-4">
                        <button
                          onClick={() => togglePlay('selection')}
                          className={`w-22 h-22 flex items-center justify-center border border-tool-audiotrim/50 rounded-4xl transition-all ${isPlaying && playMode === 'selection'
                            ? 'bg-tool-audiotrim text-white shadow-lg shadow-tool-audiotrim/20 ring-2 ring-white/20'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300 shadow-lg'
                            }`}
                          title={t.tools.audiotrim.playSelection}
                        >
                          {isPlaying && playMode === 'selection' ? (
                            <Pause className="w-11 h-11" />
                          ) : !isPlaying && (currentTime < startTime || currentTime > endTime) ? (
                            <RotateCcw className="w-11 h-11 text-tool-audiotrim" />
                          ) : (
                            <Play className="w-11 h-11 ml-1 text-tool-audiotrim" />
                          )}
                        </button>
                        <span className="text-[12px] font-black uppercase tracking-widest text-slate-500 group-hover/play:text-slate-400">
                          {t.tools.audiotrim.selection}
                        </span>
                        <span className="text-[12px] font-mono text-tool-audiotrim font-bold uppercase tracking-widest mt-1">
                          {formatTime(endTime - startTime)}
                        </span>
                      </div>
                    </div>
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
