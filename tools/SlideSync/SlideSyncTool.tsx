import React, { useState, useRef, useEffect } from 'react';
import { PlayCircle, Trash2 } from 'lucide-react';
import { Slide, TextPosition, TextColor, AspectRatio, TextSize, FilterMode, BorderSize } from '../../types';
import { generateCaptionForImage } from '../../services/geminiService';
import { PersistenceService, AudioTrackItem } from '../../services/PersistenceService';
import { SlideSyncSidebar } from './SlideSyncSidebar';
import { Timeline } from './Timeline';
import { VideoPreview } from './VideoPreview';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { renderTrimmedAudioToFile } from '../../utils/audioUtils';
import { useApplyToAll } from '../../hooks/useApplyToAll';

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
  const [slideToDeleteId, setSlideToDeleteId] = useState<string | null>(null);
  const [audioTrimTracks, setAudioTrimTracks] = useState<AudioTrackItem[]>([]);
  const [showApplyAllConfirm, setShowApplyAllConfirm] = useState(false);
  const [showApplyFilterAllConfirm, setShowApplyFilterAllConfirm] = useState(false);
  const [showApplyBorderAllConfirm, setShowApplyBorderAllConfirm] = useState(false);

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
      const state = await PersistenceService.loadSlideSyncState();
      if (state) {
        // Restore slides with new Object URLs
        const restoredSlides = state.slides.map((s) => ({
          ...s,
          previewUrl: URL.createObjectURL(s.file),
        }));

        setSlides(restoredSlides);
        if (restoredSlides.length > 0) setActiveSlideId(restoredSlides[0].id);

        if (state.aspectRatio) {
          setAspectRatio(state.aspectRatio);
        }
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
  const saveState = () => {
    PersistenceService.saveSlideSyncState({
      slides,
      audioFile,
      aspectRatio,
    });
  };

  useEffect(() => {
    if (!isLoadedRef.current) return;

    const timeoutId = setTimeout(saveState, 1000); // 1 second debounce

    return () => {
      clearTimeout(timeoutId);
      // If unmounting, attempt one final save
      saveState();
    };
  }, [slides, audioFile, aspectRatio]);

  // Handle browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isLoadedRef.current) {
        saveState();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [slides, audioFile, aspectRatio]);

  const activeSlide = slides.find((s) => s.id === activeSlideId);

  const overlayApply = useApplyToAll<Slide>({
    items: slides,
    selectedItem: activeSlide || null,
    onApply: (selected) => {
      setSlides((prev) =>
        prev.map((s) => ({
          ...s,
          text: selected.text,
          color: selected.color,
          position: selected.position,
          textSize: selected.textSize,
          isItalic: selected.isItalic,
          watermarkSettings: selected.watermarkSettings
            ? { ...selected.watermarkSettings }
            : undefined,
        }))
      );
    },
    isCustomized: (item, selected) =>
      (item.text && item.text !== selected.text) ||
      (item.watermarkSettings?.file &&
        item.watermarkSettings.file !== selected.watermarkSettings?.file),
  });

  const filterApply = useApplyToAll<Slide>({
    items: slides,
    selectedItem: activeSlide || null,
    onApply: (selected) => {
      setSlides((prev) => prev.map((s) => ({ ...s, filter: selected.filter })));
    },
    isCustomized: (item, selected) => item.filter !== selected.filter,
  });
  const borderApply = useApplyToAll<Slide>({
    items: slides,
    selectedItem: activeSlide || null,
    onApply: (selected) => {
      setSlides((prev) =>
        prev.map((s) => ({
          ...s,
          borderSize: selected.borderSize,
          borderColor: selected.borderColor,
        }))
      );
    },
    isCustomized: (item, selected) =>
      item.borderSize !== selected.borderSize || item.borderColor !== selected.borderColor,
  });
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
        text: overlayApply.applyToAll && activeSlide ? activeSlide.text : '',
        color: overlayApply.applyToAll && activeSlide ? activeSlide.color : TextColor.White,
        position:
          overlayApply.applyToAll && activeSlide ? activeSlide.position : TextPosition.BottomLeft,
        textSize: overlayApply.applyToAll && activeSlide ? activeSlide.textSize : TextSize.Small,
        isItalic: overlayApply.applyToAll && activeSlide ? !!activeSlide.isItalic : false,
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        filter: filterApply.applyToAll && activeSlide ? activeSlide.filter : FilterMode.Normal,
        borderSize: borderApply.applyToAll && activeSlide ? activeSlide.borderSize : BorderSize.None,
        borderColor: borderApply.applyToAll && activeSlide ? activeSlide.borderColor : TextColor.White,
        watermarkSettings:
          overlayApply.applyToAll && activeSlide
            ? activeSlide.watermarkSettings
              ? { ...activeSlide.watermarkSettings }
              : undefined
            : undefined,
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
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return { ...s, ...updates };
        }
        // If updating overlay properties and applyToAll is active
        const overlayProps = [
          'text',
          'color',
          'position',
          'textSize',
          'isItalic',
          'watermarkSettings',
        ];
        if (overlayApply.applyToAll && overlayProps.some((p) => p in updates)) {
          return { ...s, ...updates };
        }
        // If updating filter and applyFilterToAll is active
        if (filterApply.applyToAll && 'filter' in updates) {
          return { ...s, ...updates };
        }
        // If updating border and applyBorderToAll is active
        const borderProps = ['borderSize', 'borderColor'];
        if (borderApply.applyToAll && borderProps.some((p) => p in updates)) {
          return { ...s, ...updates };
        }
        return s;
      })
    );
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

  const handleDeleteSlideRequest = (id: string) => {
    const slide = slides.find((s) => s.id === id);
    if (!slide) return;

    const isCustomized =
      !!slide.text || slide.zoom !== 1 || slide.offsetX !== 0 || slide.offsetY !== 0;

    if (isCustomized) {
      setSlideToDeleteId(id);
    } else {
      deleteSlide(id);
    }
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


  const handleEraseProject = () => {
    slides.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setSlides([]);
    setActiveSlideId(null);
    setAudioFile(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setShowEraseConfirm(false);
    PersistenceService.saveSlideSyncState({ slides: [], audioFile: null, aspectRatio });
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
          applyToAll={overlayApply.applyToAll}
          onApplyToAllChange={overlayApply.handleApplyToAllChange}
          applyFilterToAll={filterApply.applyToAll}
          onApplyFilterToAllChange={filterApply.handleApplyToAllChange}
          applyBorderToAll={borderApply.applyToAll}
          onApplyBorderToAllChange={borderApply.handleApplyToAllChange}
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
            onDelete={handleDeleteSlideRequest}
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

      <ConfirmationModal
        isOpen={!!slideToDeleteId}
        onClose={() => setSlideToDeleteId(null)}
        onConfirm={() => {
          if (slideToDeleteId) {
            deleteSlide(slideToDeleteId);
            setSlideToDeleteId(null);
          }
        }}
        title={t.tools.slidesync.removeSlideTitle}
        message={t.tools.slidesync.removeSlideMsg}
        confirmLabel={t.common.yesRemove}
        cancelLabel={t.common.cancel}
        Icon={Trash2}
      />

      <ConfirmationModal
        isOpen={overlayApply.showConfirm}
        onClose={() => overlayApply.setShowConfirm(false)}
        onConfirm={() => overlayApply.confirmApply(true)}
        title={t.tools.slidesync.applyToAllTitle}
        message={t.tools.slidesync.applyToAllMsg}
        confirmLabel={t.tools.photoverlay.yesApply}
        cancelLabel={t.common.cancel}
        Icon={PlayCircle}
      />

      <ConfirmationModal
        isOpen={filterApply.showConfirm}
        onClose={() => filterApply.setShowConfirm(false)}
        onConfirm={() => filterApply.confirmApply(true)}
        title={t.tools.slidesync.applyFilterToAllTitle}
        message={t.tools.slidesync.applyFilterToAllMsg}
        confirmLabel={t.tools.photoverlay.yesApply}
        cancelLabel={t.common.cancel}
        Icon={PlayCircle}
      />
      <ConfirmationModal
        isOpen={borderApply.showConfirm}
        onClose={() => borderApply.setShowConfirm(false)}
        onConfirm={() => borderApply.confirmApply(true)}
        title={t.tools.slidesync.applyToAllTitle}
        message={t.tools.slidesync.applyToAllMsg}
        confirmLabel={t.tools.photoverlay.yesApply}
        cancelLabel={t.common.cancel}
        Icon={PlayCircle}
      />
    </div>
  );
};
