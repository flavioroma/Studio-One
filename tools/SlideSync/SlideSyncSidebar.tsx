import React, { useRef, useState, useEffect } from 'react';
import { Slide, AspectRatio, TextPosition, FilterMode, BorderSize, TextColor } from '../../types';
import { AudioTrackItem } from '../../services/PersistenceService';
import { calculateCaptionMetrics, calculateCaptionPosition } from '../../utils/captionUtils';
import {
  Plus,
  Music,
  Trash2,
  Monitor,
  Smartphone,
  Square,
  Image as ImageIcon,
  ChevronDown,
  Tablet,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { OverlaySettingsPanel } from '../../components/OverlaySettingsPanel';
import { FramingSettingsPanel } from '../../components/FramingSettingsPanel';
import { FilterSettingsPanel } from '../../components/FilterSettingsPanel';
import { BorderSettingsPanel } from '../../components/BorderSettingsPanel';

interface SlideSyncSidebarProps {
  slide: Slide | null; // Allow null for when no slide is selected
  onUpdate: (updates: Partial<Slide>) => void;
  onAutoCaption: () => void;
  isProcessing: boolean;
  aspectRatio: AspectRatio;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  audioFile: File | null;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAudio: () => void;
  audioTrimTracks: AudioTrackItem[];
  onSelectAudioTrimTrack: (track: AudioTrackItem) => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  isAudioRendering?: boolean;
  hasContent: boolean;
  onDeleteAll: () => void;
  applyToAll?: boolean;
  onApplyToAllChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  applyFilterToAll?: boolean;
  onApplyFilterToAllChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  applyBorderToAll?: boolean;
  onApplyBorderToAllChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasPhotoverlayItems?: boolean;
  onImportFromPhotoverlay?: () => void;
}

export const SlideSyncSidebar: React.FC<SlideSyncSidebarProps> = ({
  slide,
  onUpdate,
  onAutoCaption,
  isProcessing,
  aspectRatio,
  onImageUpload,
  audioFile,
  onAudioUpload,
  onRemoveAudio,
  audioTrimTracks,
  onSelectAudioTrimTrack,
  onAspectRatioChange,
  isAudioRendering = false,
  hasContent,
  onDeleteAll,
  applyToAll = false,
  onApplyToAllChange,
  applyFilterToAll = false,
  onApplyFilterToAllChange,
  applyBorderToAll = false,
  onApplyBorderToAllChange,
  hasPhotoverlayItems = false,
  onImportFromPhotoverlay,
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showAudioTrimMenu, setShowAudioTrimMenu] = useState(false);

  const formatOptions = [
    { id: AspectRatio.Landscape_16_9, label: '16:9', icon: Monitor },
    { id: AspectRatio.Portrait_9_16, label: '9:16', icon: Smartphone },
    { id: AspectRatio.Portrait_3_4, label: '3:4', icon: Tablet },
    { id: AspectRatio.Square_1_1, label: '1:1', icon: Square },
  ];

  // Track container dimensions to scale the caption preview perfectly
  useEffect(() => {
    if (!containerRef.current || !slide) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [aspectRatio, slide?.id]);

  const getAspectStyle = () => {
    switch (aspectRatio) {
      case AspectRatio.Landscape_16_9:
        return '16 / 9';
      case AspectRatio.Portrait_9_16:
        return '9 / 16';
      case AspectRatio.Portrait_3_4:
        return '3 / 4';
      case AspectRatio.Square_1_1:
        return '1 / 1';
      default:
        return '16 / 9';
    }
  };


  // Improved Caption Preview Logic to match Canvas Rendering exactly
  const getCaptionStyle = (): React.CSSProperties => {
    // If we don't have dimensions yet, hide or default
    if (containerSize.width === 0 || !slide) return { display: 'none' };

    const metrics = calculateCaptionMetrics(containerSize.width, containerSize.height, slide.captionSettings);
    const pos = calculateCaptionPosition(
      containerSize.width,
      containerSize.height,
      metrics,
      slide.captionSettings.position
    );

    const topY = pos.y - metrics.fontSize;

    let transformX = '0%';
    if (pos.textAlign === 'center') transformX = '-50%';
    else if (pos.textAlign === 'right') transformX = '-100%';

    const style: React.CSSProperties = {
      color: slide.captionSettings.color,
      fontSize: `${metrics.fontSize}px`,
      lineHeight: '1.2',
      fontWeight: 'bold',
      fontStyle: slide.captionSettings.isItalic ? 'italic' : 'normal',
      fontFamily: 'Inter, sans-serif',
      position: 'absolute',
      left: `${pos.x}px`,
      top: `${topY}px`,
      textAlign: pos.textAlign,
      transform: `translateX(${transformX})`,
      whiteSpace: 'pre-wrap',
      pointerEvents: 'none',
      textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
      zIndex: 20,
    };

    return style;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 flex flex-col h-full mt-2">
      <div className="flex items-center justify-center">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest text-center">
          {t.tools.slidesync.mediaSettings}
        </h3>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold text-slate-400">
            {t.tools.slidesync.backgroundMusic}
            <br />
            {t.tools.slidesync.backgroundMusicDesc}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="audio/*"
              onChange={onAudioUpload}
              className="hidden"
              id="audio-upload"
            />
            <label
              htmlFor="audio-upload"
              className={`flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-slate-600 hover:border-tool-slidesync/40 bg-slate-700/50 cursor-pointer transition-all text-slate-300 hover:text-tool-slidesync ${audioFile ? 'bg-tool-slidesync/10 border-tool-slidesync/40 text-tool-slidesync/80' : ''}`}
            >
              <Music className="w-4 h-4" />
              <span className="text-sm truncate max-w-[120px]">
                {audioFile ? audioFile.name : t.tools.slidesync.selectAudio}
              </span>
            </label>
            {audioFile && (
              <button
                onClick={onRemoveAudio}
                className="p-3 text-red-400 hover:bg-red-900/20 rounded-xl"
                title={t.tools.slidesync.removeAudio}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {audioTrimTracks.length > 0 && !audioFile && (
            <div className="text-xs font-semibold text-slate-400 text-center">---{t.common.or}---</div>
          )}
          {audioTrimTracks.length > 0 && !audioFile && (
            <div className="relative">
              <button
                onClick={() => {
                  if (audioTrimTracks.length === 1) {
                    onSelectAudioTrimTrack(audioTrimTracks[0]);
                  } else {
                    setShowAudioTrimMenu(!showAudioTrimMenu);
                  }
                }}
                disabled={isAudioRendering}
                className={`flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-slate-600 hover:border-tool-slidesync/40 bg-slate-700/50 transition-all text-slate-300 hover:text-tool-slidesync ${isAudioRendering ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Music className="w-4 h-4" />
                <span className="text-sm">
                  {isAudioRendering ? t.captions.thinking : t.tools.slidesync.selectFromAudioTrim}
                </span>
                {audioTrimTracks.length > 1 && <ChevronDown className="w-3 h-3" />}
              </button>

              {showAudioTrimMenu && audioTrimTracks.length > 1 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAudioTrimMenu(false)} />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                    <div className="max-h-48 overflow-y-auto py-1">
                      {audioTrimTracks.map((track) => (
                        <button
                          key={track.id}
                          onClick={() => {
                            onSelectAudioTrimTrack(track);
                            setShowAudioTrimMenu(false);
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-xs text-slate-300 hover:bg-tool-slidesync/10 hover:text-tool-slidesync border-b border-slate-700 last:border-0 transition-colors"
                          title={track.file.name}
                        >
                          <span className="truncate mr-4">{track.file.name}</span>
                          <span className="shrink-0 text-slate-500 font-mono">
                            {formatDuration(track.endTime - track.startTime)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 mb-8">
          <label className="text-sm font-semibold text-slate-400">
            {t.tools.slidesync.uploadImages}
          </label>
          <div className="relative group">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={onImageUpload}
              className="hidden"
              id="img-upload"
            />
            <label
              htmlFor="img-upload"
              className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-slate-600 hover:border-tool-slidesync/40 bg-slate-700/50 cursor-pointer transition-all text-slate-300 hover:text-tool-slidesync"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-medium">{t.tools.slidesync.addImages}</span>
            </label>
          </div>
          {hasPhotoverlayItems && onImportFromPhotoverlay && (
            <button
              onClick={onImportFromPhotoverlay}
              className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-tool-photoverlay/40 hover:border-tool-photoverlay/60 bg-tool-photoverlay/10 hover:bg-tool-photoverlay/20 transition-all text-tool-photoverlay"
            >
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm font-medium">{t.tools.slidesync.importFromPhotoverlay}</span>
            </button>
          )}
        </div>
        <hr className="border-slate-700 my-2 pt-4" />
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest text-center">
            {t.common.aspectRatio}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {formatOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onAspectRatioChange(opt.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                  aspectRatio === opt.id
                    ? 'bg-tool-slidesync/20 border-tool-slidesync text-tool-slidesync shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                    : 'bg-slate-700/50 border-slate-600 hover:border-tool-slidesync/40 text-slate-300 hover:text-tool-slidesync'
                }`}
              >
                <opt.icon className="w-4 h-4 mb-1" />
                <span className="text-[10px] font-bold uppercase">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <hr className="border-slate-700 my-2 pt-4" />

      {slide ? (
        <div className="space-y-6 animate-fadeIn pb-8">
          <div className="flex items-center justify-center">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest text-center">
              {t.tools.slidesync.slideProperties}
            </h3>
          </div>
          <div ref={containerRef}>
            <FramingSettingsPanel
              key={`framing-${slide.id}`}
              imageUrl={slide.previewUrl}
              settings={slide.framingSettings}
              onUpdate={(updates) => onUpdate({ framingSettings: { ...slide.framingSettings, ...updates } })}
              aspectRatio={aspectRatio}
              themeColor="tool-slidesync"
              defaultExpanded={
                slide.framingSettings.zoom !== 1 ||
                slide.framingSettings.offsetX !== 0 ||
                slide.framingSettings.offsetY !== 0
              }
            />
          </div>

          <FilterSettingsPanel
            key={`filter-${slide.id}`}
            currentFilter={slide.filterSettings}
            onChange={(filterSettings) => onUpdate({ filterSettings })}
            themeColor="tool-slidesync"
            collapsible={true}
            applyToAll={applyFilterToAll}
            onApplyToAllChange={onApplyFilterToAllChange}
            defaultExpanded={
              !!slide.filterSettings && slide.filterSettings !== FilterMode.Normal
            }
          />

          <BorderSettingsPanel
            key={`border-${slide.id}`}
            borderSize={slide.borderSettings.size || BorderSize.None}
            borderColor={slide.borderSettings.color || TextColor.White}
            onSizeChange={(size) => onUpdate({ borderSettings: { ...slide.borderSettings, size } })}
            onColorChange={(color) => onUpdate({ borderSettings: { ...slide.borderSettings, color } })}
            themeColor="tool-slidesync"
            applyToAll={applyBorderToAll}
            onApplyToAllChange={onApplyBorderToAllChange}
            defaultExpanded={!!slide.borderSettings.size}
          />

          <OverlaySettingsPanel
            key={`overlay-${slide.id}`}
            applyToAll={applyToAll}
            onApplyToAllChange={onApplyToAllChange}
            captionSettings={slide.captionSettings}
            onCaptionUpdate={(updates) => onUpdate({ captionSettings: { ...slide.captionSettings, ...updates } })}
            watermarkSettings={
              slide.watermarkSettings || {
                file: null,
                position: TextPosition.TopRight,
                opacity: 0.2,
                scale: 0.2,
              }
            }
            onWatermarkUpdate={(updates) =>
              onUpdate({
                watermarkSettings: {
                  ...(slide.watermarkSettings || {
                    file: null,
                    position: TextPosition.TopRight,
                    opacity: 0.2,
                    scale: 0.2,
                  }),
                  ...updates,
                },
              })
            }
            onAutoCaption={onAutoCaption}
            isProcessing={isProcessing}
            themeColor="tool-slidesync"
            defaultExpanded={
              (slide.captionSettings.text && slide.captionSettings.text !== '') ||
              !!slide.watermarkSettings?.file
            }
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center opacity-40">
          <ImageIcon className="w-12 h-12 mb-4" />
          <p className="text-sm font-medium">{t.tools.slidesync.noSlideSelected}</p>
        </div>
      )}
      {hasContent && (
        <div className="pt-6 pb-4 mt-auto border-t border-slate-700">
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
