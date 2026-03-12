import React, { useState, useRef, useEffect } from 'react';
import { PlayCircle, Trash2 } from 'lucide-react';
import { Slide, TextPosition, TextColor, AspectRatio, TextSize } from '../../types';
import { generateCaptionForImage } from '../../services/geminiService';
import { PersistenceService, AudioTrackItem } from '../../services/PersistenceService';
import { SlideSyncSidebar } from './SlideSyncSidebar';
import { Timeline } from './Timeline';
import { VideoPreview } from '../../components/VideoPreview';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { renderTrimmedAudioToFile } from '../../utils/audioUtils';

export const SlideSyncTool: React.FC = () => {
  const { t } = useLanguage();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAudioRendering, setIsAudioRendering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.Landscape_16_9);
  const [showEraseConfirm, setShowEraseConfirm] = useState(false);
  const [audioTrimTracks, setAudioTrimTracks] = useState<AudioTrackItem[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (slides.length === 0 || !activeSlideId) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const currentIndex = slides.findIndex((s) => s.id === activeSlideId);

      if (e.key === 'ArrowLeft') {
        const nextIndex = Math.max(0, currentIndex - 1);
        setActiveSlideId(slides[nextIndex].id);
      } else if (e.key === 'ArrowRight') {
        const nextIndex = Math.min(slides.length - 1, currentIndex + 1);
        setActiveSlideId(slides[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides, activeSlideId]);

  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        if (audio.duration === Infinity || isNaN(audio.duration)) {
          audio.currentTime = 1e101;
          audio.ontimeupdate = () => {
            audio.ontimeupdate = null;
            audio.currentTime = 0;
            setAudioDuration(audio.duration);
          };
        } else {
          setAudioDuration(audio.duration);
        }
      };
      audioRef.current = audio;
      return () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
    } else {
      setAudioDuration(0);
      audioRef.current = null;
    }
  }, [audioFile]);

  // Persistence Logic
  const isLoadedRef = useRef(false);

  // Load State on Mount
  useEffect(() => {
    const load = async () => {
      const state = await PersistenceService.loadState();
      if (state) {
        // Restore slides with new Object URLs
        const restoredSlides = state.slides.map((s) => ({
          ...s,
          previewUrl: URL.createObjectURL(s.file),
        }));

        setSlides(restoredSlides);
        if (restoredSlides.length > 0) setActiveSlideId(restoredSlides[0].id);

        setAspectRatio(state.aspectRatio);
        setAudioFile(state.audioFile);
      }

      const trimState = await PersistenceService.loadAudioTrimState();
      if (trimState) {
        setAudioTrimTracks(trimState.tracks);
      }

      isLoadedRef.current = true;
    };
    load();
  }, []);

  // Save State with Debounce
  useEffect(() => {
    if (!isLoadedRef.current) return;

    const timeoutId = setTimeout(() => {
      PersistenceService.saveState({
        slides,
        audioFile,
        aspectRatio,
      });
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(timeoutId);
  }, [slides, audioFile, aspectRatio]);
  useEffect(() => {
    if (!activeSlideId || slides.length === 0 || audioDuration === 0) return;

    const index = slides.findIndex((s) => s.id === activeSlideId);
    if (index !== -1) {
      const slideDuration = audioDuration / slides.length;
      const startTime = index * slideDuration;

      setCurrentTime(startTime);
      if (audioRef.current) {
        audioRef.current.currentTime = startTime;
      }
    }
  }, [activeSlideId, audioDuration, slides.length]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newSlides: Slide[] = Array.from(e.target.files).map((file) => ({
        id: Math.random().toString(36).substring(7),
        file: file as File,
        previewUrl: URL.createObjectURL(file as File),
        text: '',
        color: TextColor.White,
        position: TextPosition.BottomLeft,
        textSize: TextSize.Small,
        isItalic: false,
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
      }));
      setSlides((prev) => [...prev, ...newSlides]);
      if (!activeSlideId && newSlides.length > 0) {
        setActiveSlideId(newSlides[0].id);
      }
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  const updateSlide = (id: string, updates: Partial<Slide>) => {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteSlide = (id: string) => {
    setSlides((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (activeSlideId === id) {
        setActiveSlideId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
  };

  const reorderSlides = (fromIndex: number, toIndex: number) => {
    setSlides((prev) => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  };

  const autoCaptionSlide = async (id: string) => {
    const slide = slides.find((s) => s.id === id);
    if (!slide) return;

    setIsProcessing(true);
    try {
      const caption = await generateCaptionForImage(slide.file);
      updateSlide(id, { text: caption });
    } catch (error) {
      console.error('Failed to generate caption', error);
      alert(t.tools.slidesync.captionError);
    } finally {
      setIsProcessing(false);
    }
  };

  const activeSlide = slides.find((s) => s.id === activeSlideId);

  const handleEraseProject = () => {
    slides.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setSlides([]);
    setActiveSlideId(null);
    setAudioFile(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setShowEraseConfirm(false);
    PersistenceService.saveState({ slides: [], audioFile: null, aspectRatio });
  };

  const handleSelectAudioTrimTrack = async (track: AudioTrackItem) => {
    setIsAudioRendering(true);
    try {
      const renderedFile = await renderTrimmedAudioToFile(
        track.file,
        track.startTime,
        track.endTime
      );
      setAudioFile(renderedFile);
    } catch (error) {
      console.error('Failed to render trimmed audio', error);
      alert(t.tools.audiotrim.exportFailed);
    } finally {
      setIsAudioRendering(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-900 overflow-hidden">
      {/* Sidebar: Settings */}
      <div className="w-80 border-r border-slate-700 bg-slate-800 flex flex-col p-4 overflow-y-auto z-10 shadow-2xl">
        <SlideSyncSidebar
          slide={activeSlide || null}
          onUpdate={(updates) => activeSlide && updateSlide(activeSlide.id, updates)}
          onAutoCaption={() => activeSlide && autoCaptionSlide(activeSlide.id)}
          isProcessing={isProcessing}
          aspectRatio={aspectRatio}
          onImageUpload={handleImageUpload}
          audioFile={audioFile}
          onAudioUpload={handleAudioUpload}
          onRemoveAudio={() => setAudioFile(null)}
          audioTrimTracks={audioTrimTracks}
          onSelectAudioTrimTrack={handleSelectAudioTrimTrack}
          onAspectRatioChange={setAspectRatio}
          isAudioRendering={isAudioRendering}
          hasContent={slides.length > 0 || audioFile !== null}
          onDeleteAll={() => setShowEraseConfirm(true)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 bg-slate-950 relative flex items-center justify-center p-8 overflow-hidden">
          <VideoPreview
            slides={slides}
            audioRef={audioRef}
            audioDuration={audioDuration}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            aspectRatio={aspectRatio}
          />
        </div>

        <div className="h-48 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-500">
              {t.tools.slidesync.timelineSequence}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-500">
                {slides.length} {t.tools.slidesync.slidesCount}
                {audioDuration > 0 && slides.length > 0 && (
                  <span className="ml-2 text-tool-slidesync lowercase tracking-normal font-bold">
                    ({(audioDuration / slides.length).toFixed(2)}s / {t.tools.slidesync.slide})
                  </span>
                )}
              </span>
              <span className="text-[12px] text-slate-400 italic">
                {t.tools.slidesync.timelineTip}
              </span>
            </div>
          </div>
          <Timeline
            slides={slides}
            activeSlideId={activeSlideId}
            onSelectSlide={setActiveSlideId}
            onReorder={reorderSlides}
            onDelete={deleteSlide}
            onImageUpload={handleImageUpload}
          />
        </div>
      </div>

      <ConfirmationModal
        isOpen={showEraseConfirm}
        onClose={() => setShowEraseConfirm(false)}
        onConfirm={handleEraseProject}
        title={t.tools.slidesync.removeAllDataTitle}
        message={t.tools.slidesync.removeAllDataMsg}
        confirmLabel={t.tools.slidesync.yesRemoveAll}
        cancelLabel={t.common.cancel}
        Icon={Trash2}
      />
    </div>
  );
};
