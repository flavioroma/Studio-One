import React, { useState, useRef, useEffect } from 'react';
import { Plus, Music, Trash2, Image as ImageIcon, Smartphone, Monitor, Square, Smartphone as SmartphoneIcon } from 'lucide-react';
import { Slide, TextPosition, TextColor, AspectRatio, TextSize } from '../../types';
import { generateCaptionForImage } from '../../services/geminiService';
import { PersistenceService } from '../../services/PersistenceService';
import { EditorSidebar } from '../../components/EditorSidebar';
import { Timeline } from '../../components/Timeline';
import { VideoPreview } from '../../components/VideoPreview';
import { useLanguage } from '../../contexts/LanguageContext';

export const SlideSyncTool: React.FC = () => {
  const { t } = useLanguage();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.Landscape_16_9);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (slides.length === 0 || !activeSlideId) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const currentIndex = slides.findIndex(s => s.id === activeSlideId);

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
          }
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
        const restoredSlides = state.slides.map(s => ({
          ...s,
          previewUrl: URL.createObjectURL(s.file)
        }));

        setSlides(restoredSlides);
        if (restoredSlides.length > 0) setActiveSlideId(restoredSlides[0].id);

        setAspectRatio(state.aspectRatio);
        setAudioFile(state.audioFile);
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
        aspectRatio
      });
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(timeoutId);
  }, [slides, audioFile, aspectRatio]);
  useEffect(() => {
    if (!activeSlideId || slides.length === 0 || audioDuration === 0) return;

    const index = slides.findIndex(s => s.id === activeSlideId);
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
      console.error("Failed to generate caption", error);
      alert(t.tools.slidesync.captionError);
    } finally {
      setIsProcessing(false);
    }
  };

  const activeSlide = slides.find((s) => s.id === activeSlideId);

  const formatOptions = [
    { id: AspectRatio.Landscape_16_9, label: '16:9', icon: Monitor },
    { id: AspectRatio.Portrait_9_16, label: '9:16', icon: Smartphone },
    { id: AspectRatio.Portrait_4_5, label: '4:5', icon: SmartphoneIcon },
    { id: AspectRatio.Square_1_1, label: '1:1', icon: Square },
  ];

  return (
    <div className="flex h-full bg-slate-900 overflow-hidden">
      {/* Left Sidebar: Settings */}
      <div className="w-80 border-r border-slate-700 bg-slate-800 flex flex-col p-4 overflow-y-auto z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-100 uppercase tracking-tight">
            {t.tools.slidesync.editorPanel}
          </h2>
        </div>

        <div className="mb-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-400">{t.tools.slidesync.uploadPhotos}</label>
            <div className="relative group">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="img-upload"
              />
              <label
                htmlFor="img-upload"
                className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border-2 border-dashed border-slate-600 hover:border-blue-400 hover:bg-slate-700/50 cursor-pointer transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="text-sm font-medium">{t.tools.slidesync.addMedia}</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-400">{t.tools.slidesync.backgroundMusic}</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="hidden"
                id="audio-upload"
              />
              <label
                htmlFor="audio-upload"
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-600 cursor-pointer hover:bg-slate-700/50 transition-all ${audioFile ? 'bg-blue-600/10 border-blue-400 text-blue-300' : ''}`}
              >
                <Music className="w-4 h-4" />
                <span className="text-sm truncate max-w-[120px]">{audioFile ? audioFile.name : t.tools.slidesync.selectAudio}</span>
              </label>
              {audioFile && (
                <button
                  onClick={() => setAudioFile(null)}
                  className="p-3 text-red-400 hover:bg-red-900/20 rounded-xl"
                  title={t.tools.slidesync.removeAudio}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-400">{t.tools.slidesync.videoFormat}</label>
            <div className="grid grid-cols-2 gap-2">
              {formatOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setAspectRatio(opt.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${aspectRatio === opt.id
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                >
                  <opt.icon className="w-4 h-4 mb-1" />
                  <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <hr className="border-slate-700 my-4" />

        {activeSlide ? (
          <EditorSidebar
            slide={activeSlide}
            onUpdate={(updates) => updateSlide(activeSlide.id, updates)}
            onAutoCaption={() => autoCaptionSlide(activeSlide.id)}
            isProcessing={isProcessing}
            aspectRatio={aspectRatio}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center opacity-40">
            <ImageIcon className="w-12 h-12 mb-4" />
            <p className="text-sm font-medium">{t.tools.slidesync.noSlideSelected}</p>
          </div>
        )}
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t.tools.slidesync.timelineSequence}</span>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{slides.length} {t.tools.slidesync.slidesCount}</span>
              <span className="text-[10px] text-slate-400 italic">{t.tools.slidesync.timelineTip}</span>
            </div>
          </div>
          <Timeline
            slides={slides}
            activeSlideId={activeSlideId}
            onSelectSlide={setActiveSlideId}
            onReorder={reorderSlides}
            onDelete={deleteSlide}
          />
        </div>
      </div>
    </div>
  );
};