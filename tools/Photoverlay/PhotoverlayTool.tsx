import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Download,
  Trash2,
  Loader2,
  Calendar,
  MapPin,
  Monitor,
  Plus,
  Check,
} from 'lucide-react';
import {
  TextPosition,
  TextColor,
  TextSize,
  PhotoItem,
  CaptionSettings,
  WatermarkSettings,
  NamingSettings,
  FramingSettings,
} from '../../types';
import { PersistenceService } from '../../services/PersistenceService';
import {
  calculateCaptionMetrics,
  calculateCaptionPosition,
  calculateWatermarkPosition,
} from '../../utils/captionUtils';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { MetadataService, PhotoMetadata } from '../../services/MetadataService';
import { useLanguage } from '../../contexts/LanguageContext';
import { PhotoverlaySidebar } from './PhotoverlaySidebar';
import JSZip from 'jszip';

export const PhotoverlayTool: React.FC = () => {
  const { t } = useLanguage();
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applyToAll, setApplyToAll] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showApplyAllConfirm, setShowApplyAllConfirm] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [namingSettings, setNamingSettings] = useState<NamingSettings>({
    keepOriginal: true,
    type: 'prefix',
    value: '',
  });
  const [preserveMetadata, setPreserveMetadata] = useState(true);

  // Preview Sizing
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((item) => item.id === selectedId) || null;

  // ResizeObserver to track container size
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [selectedItem?.imageUrl]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (items.length === 0 || !selectedId) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const currentIndex = items.findIndex((item) => item.id === selectedId);

      if (e.key === 'ArrowLeft') {
        const nextIndex = Math.max(0, currentIndex - 1);
        setSelectedId(items[nextIndex].id);
      } else if (e.key === 'ArrowRight') {
        const nextIndex = Math.min(items.length - 1, currentIndex + 1);
        setSelectedId(items[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedId]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (selectedId && scrollRef.current) {
      const element = document.getElementById(`photo-thumb-${selectedId}`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [selectedId]);

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const processFiles = async (files: FileList) => {
    const newItems: PhotoItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const id = Math.random().toString(36).substr(2, 9);

      let exif: PhotoMetadata | null = null;
      try {
        exif = await MetadataService.getPhotoMetadata(file);
      } catch (err) {
        console.warn('Could not read metadata', err);
      }

      // Create temporary image to get dimensions
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.src = url;
      });

      newItems.push({
        id,
        file,
        imageUrl: url,
        captionSettings:
          applyToAll && selectedItem
            ? { ...selectedItem.captionSettings }
            : {
                text: '',
                color: TextColor.White,
                position: TextPosition.BottomLeft,
                textSize: TextSize.Small,
                isItalic: false,
              },
        watermarkSettings:
          applyToAll && selectedItem
            ? { ...selectedItem.watermarkSettings }
            : {
                file: null,
                position: TextPosition.TopRight,
                opacity: 0.2,
                scale: 0.2,
              },
        framingSettings: {
          zoom: 1.0,
          offsetX: 0,
          offsetY: 0,
        },
        metadata: dimensions,
        exifData: exif,
      });
    }

    setItems((prev) => {
      const updated = [...prev, ...newItems];
      if (!selectedId && updated.length > 0) {
        setSelectedId(updated[0].id);
      }
      return updated;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Persistence logic
  const isLoadedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const state = await PersistenceService.loadPhotoverlayState();
      if (state && state.items.length > 0) {
        const hydratedItems = state.items.map((item) => ({
          ...item,
          imageUrl: URL.createObjectURL(item.file),
          captionSettings: {
            text: item.caption,
            color: item.color,
            position: item.position,
            textSize: item.textSize,
            isItalic: item.isItalic || false,
          },
          watermarkSettings: {
            file: item.watermarkFile || null,
            position: item.watermarkPosition || TextPosition.TopRight,
            opacity: 0.2,
            scale: 0.2,
          },
          framingSettings: (item as any).framingSettings || {
            zoom: 1.0,
            offsetX: 0,
            offsetY: 0,
          },
          metadata: null,
          exifData: null,
        }));

        // Fetch metadata/dimensions for all
        const finalItems = await Promise.all(
          hydratedItems.map(async (item) => {
            let exif = null;
            try {
              exif = await MetadataService.getPhotoMetadata(item.file);
            } catch (e) {}

            const dimensions = await new Promise<{ width: number; height: number } | null>(
              (resolve) => {
                const img = new Image();
                img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
                img.onerror = () => resolve(null);
                img.src = item.imageUrl;
              }
            );

            return {
              id: item.id,
              file: item.file,
              imageUrl: item.imageUrl,
              captionSettings: item.captionSettings,
              watermarkSettings: item.watermarkSettings,
              framingSettings: item.framingSettings,
              metadata: dimensions,
              exifData: exif,
            };
          })
        );

        setItems(finalItems);
        setSelectedId(state.selectedId || finalItems[0].id);
        setApplyToAll(state.applyToAll || false);
        if (state.namingSettings) {
          setNamingSettings(state.namingSettings);
        }
        if (state.preserveMetadata !== undefined) {
          setPreserveMetadata(state.preserveMetadata);
        }
      }
      isLoadedRef.current = true;
    };
    load();
  }, []);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    const timeoutId = setTimeout(() => {
      PersistenceService.savePhotoverlayState({
        items: items.map((item) => ({
          id: item.id,
          file: item.file,
          caption: item.captionSettings.text,
          color: item.captionSettings.color,
          position: item.captionSettings.position,
          textSize: item.captionSettings.textSize,
          isItalic: item.captionSettings.isItalic,
          watermarkFile: item.watermarkSettings.file,
          watermarkPosition: item.watermarkSettings.position,
          framingSettings: item.framingSettings,
        })),
        selectedId,
        applyToAll,
        namingSettings,
        preserveMetadata,
      });
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [items, selectedId, applyToAll, namingSettings, preserveMetadata]);

  const handleCaptionUpdate = (updates: Partial<CaptionSettings>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (applyToAll || item.id === selectedId) {
          return { ...item, captionSettings: { ...item.captionSettings, ...updates } };
        }
        return item;
      })
    );
  };

  const handleWatermarkUpdate = (updates: Partial<WatermarkSettings>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (applyToAll || item.id === selectedId) {
          return { ...item, watermarkSettings: { ...item.watermarkSettings, ...updates } };
        }
        return item;
      })
    );
  };
  const handleFramingUpdate = (updates: Partial<FramingSettings>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (applyToAll || item.id === selectedId) {
          return { ...item, framingSettings: { ...item.framingSettings, ...updates } };
        }
        return item;
      })
    );
  };

  const handleApplyToAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    if (newValue) {
      // Check if there are other photos with different settings
      const hasOtherCustomSettings = items.some(
        (item) =>
          item.id !== selectedId &&
          (item.captionSettings.text !== selectedItem?.captionSettings.text ||
            item.watermarkSettings.file !== selectedItem?.watermarkSettings.file ||
            item.framingSettings.zoom !== selectedItem?.framingSettings.zoom ||
            item.framingSettings.offsetX !== selectedItem?.framingSettings.offsetX ||
            item.framingSettings.offsetY !== selectedItem?.framingSettings.offsetY)
      );

      if (hasOtherCustomSettings && items.length > 1) {
        setShowApplyAllConfirm(true);
      } else {
        confirmApplyToAll(true);
      }
    } else {
      setApplyToAll(false);
    }
  };

  const confirmApplyToAll = (value: boolean) => {
    if (value && selectedItem) {
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          captionSettings: { ...selectedItem.captionSettings },
          watermarkSettings: { ...selectedItem.watermarkSettings },
          framingSettings: { ...selectedItem.framingSettings },
        }))
      );
      setApplyToAll(true);
    } else {
      // If rejected, don't set applyToAll to true
      setApplyToAll(false);
    }
    setShowApplyAllConfirm(false);
  };

  const handleExport = async () => {
    if (items.length === 0) return;
    setIsExporting(true);
    const zip = new JSZip();

    try {
      for (const item of items) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx || !item.metadata) continue;

        canvas.width = item.metadata.width;
        canvas.height = item.metadata.height;

        // Load image correctly for canvas
        const imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = item.imageUrl;
        });

        // Apply framing (zoom and offsets)
        const zoom = item.framingSettings?.zoom || 1.0;
        const offsetX = (item.framingSettings?.offsetX || 0) * (canvas.width / 100);
        const offsetY = (item.framingSettings?.offsetY || 0) * (canvas.height / 100);

        const drawWidth = canvas.width * zoom;
        const drawHeight = canvas.height * zoom;
        const drawX = (canvas.width - drawWidth) / 2 + offsetX;
        const drawY = (canvas.height - drawHeight) / 2 + offsetY;

        ctx.drawImage(imgElement, drawX, drawY, drawWidth, drawHeight);

        // Watermark
        if (item.watermarkSettings.file) {
          const wImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(item.watermarkSettings.file!);
          });

          const w = item.metadata.width * item.watermarkSettings.scale;
          const aspectRatio = wImg.width / wImg.height;
          const h = w / aspectRatio;
          const pos = calculateWatermarkPosition(
            item.metadata.width,
            item.metadata.height,
            w,
            h,
            item.watermarkSettings.position
          );

          ctx.globalAlpha = item.watermarkSettings.opacity;
          ctx.drawImage(wImg, pos.x, pos.y, w, h);
          ctx.globalAlpha = 1.0;
          URL.revokeObjectURL(wImg.src);
        }

        // Caption
        const metrics = calculateCaptionMetrics(item.metadata.width, item.metadata.height, {
          text: item.captionSettings.text,
          textSize: item.captionSettings.textSize,
        });
        const position = calculateCaptionPosition(
          item.metadata.width,
          item.metadata.height,
          metrics,
          item.captionSettings.position
        );

        const fontStyle = item.captionSettings.isItalic ? 'italic' : 'normal';
        ctx.font = `${fontStyle} bold ${metrics.fontSize}px Inter, sans-serif`;
        ctx.fillStyle = item.captionSettings.color;
        ctx.textAlign = position.textAlign as CanvasTextAlign;
        ctx.textBaseline = 'alphabetic';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = metrics.fontSize * 0.15;
        ctx.shadowOffsetX = metrics.fontSize * 0.04;
        ctx.shadowOffsetY = metrics.fontSize * 0.04;

        metrics.lines.forEach((line, i) => {
          ctx.fillText(line, position.x, position.y + i * metrics.lineHeight);
        });

        // Export blob
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.95)
        );
        if (blob) {
          let finalBlob = blob;
          if (preserveMetadata) {
            try {
              finalBlob = await MetadataService.transferPhotoMetadata(item.file, blob);
            } catch (e) {
              console.warn('Failed to transfer metadata', e);
            }
          }

          const originalName =
            item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
          const finalName = namingSettings.keepOriginal
            ? `${originalName}.jpg`
            : namingSettings.type === 'prefix'
              ? `${namingSettings.value}${originalName}.jpg`
              : `${originalName}${namingSettings.value}.jpg`;

          if (items.length > 1) {
            zip.file(finalName, finalBlob);
          } else {
            const url = URL.createObjectURL(finalBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = finalName;
            a.click();
            URL.revokeObjectURL(url);
          }
        }
      }

      if (items.length > 1) {
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `photoverlay-archive-${new Date().getTime()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(t.tools.photoverlay.exportFailed);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      if (selectedId === id) {
        setSelectedId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
    // Clear object URL
    const itemToRemove = items.find((item) => item.id === id);
    if (itemToRemove) URL.revokeObjectURL(itemToRemove.imageUrl);
  };

  const handleDeleteItemRequest = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const isCustomized = !!item.captionSettings.text || !!item.watermarkSettings.file;
    if (isCustomized) {
      setItemToDeleteId(id);
    } else {
      handleDeleteItem(id);
    }
  };

  const confirmDeleteAll = () => {
    items.forEach((item) => URL.revokeObjectURL(item.imageUrl));
    setItems([]);
    setSelectedId(null);
    setShowDeleteConfirm(false);

    PersistenceService.savePhotoverlayState({
      items: [],
      selectedId: null,
      applyToAll: false,
    });
  };

  const getPreviewStyle = (): React.CSSProperties => {
    if (!selectedItem || containerSize.height === 0 || containerSize.width === 0)
      return { display: 'none' };

    const metrics = calculateCaptionMetrics(containerSize.width, containerSize.height, {
      text: selectedItem.captionSettings.text,
      textSize: selectedItem.captionSettings.textSize,
    });

    return {
      color: selectedItem.captionSettings.color,
      textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
      fontSize: `${metrics.fontSize}px`,
      lineHeight: `${metrics.lineHeight}px`,
      fontWeight: 'bold',
      fontStyle: selectedItem.captionSettings.isItalic ? 'italic' : 'normal',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      width: '100%',
      height: '100%',
      padding: `${metrics.padding}px`,
      justifyContent: selectedItem.captionSettings.position.includes('Left')
        ? 'flex-start'
        : selectedItem.captionSettings.position.includes('Right')
          ? 'flex-end'
          : 'center',
      alignItems: selectedItem.captionSettings.position.includes('Top')
        ? 'flex-start'
        : selectedItem.captionSettings.position.includes('Bottom')
          ? 'flex-end'
          : 'center',
      textAlign: selectedItem.captionSettings.position.includes('Left')
        ? 'left'
        : selectedItem.captionSettings.position.includes('Right')
          ? 'right'
          : 'center',
    };
  };

  const getWatermarkStyle = (): React.CSSProperties => {
    if (!selectedItem?.watermarkSettings.file || containerSize.width === 0)
      return { display: 'none' };

    const widthPercent = selectedItem.watermarkSettings.scale * 100 + '%';
    const paddingPercent = '5%';

    const style: React.CSSProperties = {
      position: 'absolute',
      width: widthPercent,
      height: 'auto',
      pointerEvents: 'none',
      zIndex: 20,
      opacity: selectedItem.watermarkSettings.opacity,
    };

    switch (selectedItem.watermarkSettings.position) {
      case TextPosition.TopLeft:
        style.top = paddingPercent;
        style.left = paddingPercent;
        break;
      case TextPosition.TopRight:
        style.top = paddingPercent;
        style.right = paddingPercent;
        break;
      case TextPosition.BottomLeft:
        style.bottom = paddingPercent;
        style.left = paddingPercent;
        break;
      case TextPosition.BottomRight:
        style.bottom = paddingPercent;
        style.right = paddingPercent;
        break;
      case TextPosition.Center:
        style.top = '50%';
        style.left = '50%';
        style.transform = 'translate(-50%, -50%)';
        break;
      case TextPosition.TopCenter:
        style.top = paddingPercent;
        style.left = '50%';
        style.transform = 'translate(-50%, 0)';
        break;
      case TextPosition.BottomCenter:
        style.bottom = paddingPercent;
        style.left = '50%';
        style.transform = 'translate(-50%, 0)';
        break;
    }

    return style;
  };

  return (
    <div className="h-full flex bg-slate-900 overflow-hidden">
      <PhotoverlaySidebar
        itemsCount={items.length}
        selectedItem={selectedItem}
        applyToAll={applyToAll}
        onApplyToAllChange={handleApplyToAllChange}
        onFileChange={handleFileChange}
        onCaptionUpdate={handleCaptionUpdate}
        onWatermarkUpdate={handleWatermarkUpdate}
        onFramingUpdate={handleFramingUpdate}
        namingSettings={namingSettings}
        onNamingUpdate={(updates) => setNamingSettings((prev) => ({ ...prev, ...updates }))}
        preserveMetadata={preserveMetadata}
        onPreserveMetadataChange={setPreserveMetadata}
        onDeleteAll={() => setShowDeleteConfirm(true)}
      />

      {/* Main Preview / Viewport */}

      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <div className="flex-1 relative flex flex-col items-center justify-center pt-8 px-4 pb-0 overflow-hidden">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-4 text-slate-600 animate-pulse">
              <ImageIcon className="w-24 h-24 stroke-[1px]" />
              <p className="font-bold uppercase tracking-[0.3em] text-xs">
                {t.tools.photoverlay.awaitingSource}
              </p>
            </div>
          ) : (
            <>
              <div
                ref={containerRef}
                className="relative group shadow-2xl rounded-2xl overflow-hidden border-4 border-slate-800 max-h-[60vh] mb-14"
                style={{
                  aspectRatio: selectedItem?.metadata
                    ? `${selectedItem.metadata.width} / ${selectedItem.metadata.height}`
                    : 'auto',
                }}
              >
                <img
                  ref={imageRef}
                  src={selectedItem?.imageUrl}
                  className="max-h-[60vh] w-auto pointer-events-none object-contain"
                  alt="Preview"
                  style={{
                    transform: `translate(${selectedItem?.framingSettings?.offsetX || 0}%, ${selectedItem?.framingSettings?.offsetY || 0}%) scale(${selectedItem?.framingSettings?.zoom || 1})`,
                    transition: 'transform 0.2s ease-out',
                  }}
                />

                {selectedItem?.watermarkSettings.file && (
                  <img
                    src={URL.createObjectURL(selectedItem.watermarkSettings.file)}
                    style={getWatermarkStyle()}
                    alt="watermark"
                    onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                  />
                )}

                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 z-10" style={getPreviewStyle()}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedItem?.captionSettings.text}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thumbnails Bar */}
              <div className="w-full px-6 pb-4">
                <div
                  ref={scrollRef}
                  onWheel={handleWheel}
                  className="flex items-center gap-6 overflow-x-auto py-4 px-4 hide-scrollbar select-none"
                >
                  <style>{`
                                        .hide-scrollbar::-webkit-scrollbar {
                                          display: none;
                                        }
                                        .hide-scrollbar {
                                          -ms-overflow-style: none;
                                          scrollbar-width: none;
                                        }
                                    `}</style>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      id={`photo-thumb-${item.id}`}
                      onClick={() => setSelectedId(item.id)}
                      className={`relative group h-24 aspect-square flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedId === item.id
                          ? 'border-tool-photoverlay shadow-lg shadow-tool-photoverlay/20 scale-105 z-10'
                          : 'border-slate-600 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={item.imageUrl}
                        className="w-full h-full object-cover pointer-events-none"
                        alt="Thumb"
                      />

                      {(item.captionSettings.text || item.watermarkSettings.file) && (
                        <div className="absolute top-2 right-2 z-10">
                          <div
                            className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                            title={t.tools.slidesync.hasText}
                          ></div>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItemRequest(item.id);
                        }}
                        className="absolute bottom-1 right-1 p-1.5 bg-red-500/90 text-white rounded-md hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 z-30 shadow-sm hover:scale-110"
                        title={t.common.removeFile}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex-shrink-0 h-24 aspect-square rounded-lg border-2 border-slate-700 hover:border-tool-photoverlay/50 hover:bg-slate-800/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all">
                    <Plus className="w-5 h-5 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                      {t.common.addMore}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Controls Bar */}
        {selectedItem && (
          <div className="bg-slate-800/80 backdrop-blur-md border-t border-slate-700 p-6 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                  <Monitor className="w-3 h-3" /> {t.common.resolution}
                </p>
                <p className="text-sm font-bold text-white">
                  {selectedItem.metadata
                    ? `${selectedItem.metadata.width} x ${selectedItem.metadata.height}`
                    : '...'}
                </p>
              </div>

              {selectedItem.exifData?.creationTime && (
                <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> {t.common.mediaCreated}
                  </p>
                  <p className="text-sm font-bold text-white">
                    {selectedItem.exifData.creationTime.toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              )}

              {selectedItem.exifData?.latitude && selectedItem.exifData?.longitude && (
                <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> {t.tools.photoverlay.location}
                  </p>
                  <p className="text-sm font-bold text-white">
                    {selectedItem.exifData.latitude.toFixed(4)},{' '}
                    {selectedItem.exifData.longitude.toFixed(4)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-3 px-8 py-3.5 bg-tool-photoverlay hover:opacity-90 text-white font-black rounded-2xl transition-all shadow-xl shadow-tool-photoverlay/10 active:scale-95 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t.tools.photoverlay.exporting}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>
                      {items.length > 1
                        ? t.tools.photoverlay.exportAllPhotos
                        : t.tools.photoverlay.exportPhoto}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global Modals */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteAll}
        title={t.tools.photoverlay.removeAllPhotosTitle}
        message={t.tools.photoverlay.removeAllPhotosMsg}
        confirmLabel={t.tools.photoverlay.yesRemoveAll}
        cancelLabel={t.common.cancel}
        Icon={Trash2}
      />

      <ConfirmationModal
        isOpen={showApplyAllConfirm}
        onClose={() => confirmApplyToAll(false)}
        onConfirm={() => confirmApplyToAll(true)}
        title={t.tools.photoverlay.applyToAllTitle}
        message={t.tools.photoverlay.applyToAllMsg}
        confirmLabel={t.tools.photoverlay.yesApply}
        cancelLabel={t.common.cancel}
        Icon={Check}
      />

      <ConfirmationModal
        isOpen={!!itemToDeleteId}
        onClose={() => setItemToDeleteId(null)}
        onConfirm={() => {
          if (itemToDeleteId) {
            handleDeleteItem(itemToDeleteId);
            setItemToDeleteId(null);
          }
        }}
        title={t.tools.photoverlay.removePhotoTitle}
        message={t.tools.photoverlay.removePhotoMsg}
        confirmLabel={t.common.yesRemove}
        cancelLabel={t.common.cancel}
        Icon={Trash2}
      />
    </div>
  );
};
