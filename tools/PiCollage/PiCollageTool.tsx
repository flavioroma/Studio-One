import React, { useState, useRef, useEffect } from 'react';
import { PiCollagePicture, AspectRatio, BorderSize, FilterMode, TextColor, FramingSettings, CaptionSettings, WatermarkSettings, TextPosition, TextSize } from '../../types';
import { PersistenceService } from '../../services/PersistenceService';
import { PiCollageSidebar } from './PiCollageSidebar';
import { PiCollageFooter } from './PiCollageFooter';
import { PiCollageSettingsBar } from './PiCollageSettingsBar';
import { PiCollageCanvas } from './PiCollageCanvas';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Trash2, Check, Download } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useApplyToAll } from '../../hooks/useApplyToAll';
import { calculateCaptionMetrics, calculateCaptionPosition, calculateWatermarkPosition } from '../../utils/captionUtils';

export const PiCollageTool: React.FC = () => {
  const { t } = useLanguage();
  const [pictures, setPictures] = useState<PiCollagePicture[]>([]);
  const [activePictureId, setActivePictureId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.Landscape_16_9);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg'>('png');
  const [showEraseConfirm, setShowEraseConfirm] = useState(false);
  const [hasSlideSyncSlides, setHasSlideSyncSlides] = useState(false);
  const [hasPhotoverlayItems, setHasPhotoverlayItems] = useState(false);

  const activePicture = pictures.find((p) => p.id === activePictureId) || null;

  const overlayApply = useApplyToAll<PiCollagePicture>({
    items: pictures,
    selectedItem: activePicture,
    onApply: (selected) => {
      setPictures((prev) =>
        prev.map((p) => ({
          ...p,
          captionSettings: { ...selected.captionSettings },
          watermarkSettings: { ...selected.watermarkSettings },
        }))
      );
    },
    isCustomized: (item, selected) =>
      (item.captionSettings.text && item.captionSettings.text !== selected.captionSettings.text) ||
      (!!item.watermarkSettings.file && item.watermarkSettings.file !== selected.watermarkSettings.file),
  });

  const filterApply = useApplyToAll<PiCollagePicture>({
    items: pictures,
    selectedItem: activePicture,
    onApply: (selected) => {
      setPictures((prev) =>
        prev.map((p) => ({
          ...p,
          filterSettings: selected.filterSettings,
        }))
      );
    },
    isCustomized: (item, selected) => item.filterSettings !== selected.filterSettings,
  });

  const borderApply = useApplyToAll<PiCollagePicture>({
    items: pictures,
    selectedItem: activePicture,
    onApply: (selected) => {
      setPictures((prev) =>
        prev.map((p) => ({
          ...p,
          borderSettings: {
            size: selected.borderSettings.size,
            color: selected.borderSettings.color,
          },
        }))
      );
    },
    isCustomized: (item, selected) =>
      item.borderSettings.size !== selected.borderSettings.size || item.borderSettings.color !== selected.borderSettings.color,
  });

  const isLoadedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const state = await PersistenceService.loadPiCollageState();
      if (state) {
        const restored = state.pictures.map((p) => {
          // Estimate height percentage if possible, or use a safe range
          // The exact canvas ratio might change, so we use a conservative range
          return {
            ...p,
            previewUrl: URL.createObjectURL(p.file),
            zIndex: Math.max(1, p.zIndex || 1),
            x: Math.max(-p.width + 10, Math.min(90, p.x)),
            y: Math.max(-100, Math.min(90, p.y)), // Safety clamp
            // Handle structure migration (even if user says they don't care, it's safer)
            framingSettings: p.framingSettings || {
              zoom: (p as any).zoom || 1,
              offsetX: (p as any).offsetX || 0,
              offsetY: (p as any).offsetY || 0,
            },
            captionSettings: p.captionSettings || {
              text: '',
              color: TextColor.White,
              position: TextPosition.BottomLeft,
              textSize: TextSize.Small,
            },
            watermarkSettings: p.watermarkSettings || {
              file: null,
              position: TextPosition.TopRight,
              opacity: 0.2,
              scale: 0.2,
            },
          };
        });
        setPictures(restored);
        setAspectRatio(state.aspectRatio);
        setExportFormat(state.exportFormat);
        if (restored.length > 0) setActivePictureId(restored[0].id);
      }

      const ssState = await PersistenceService.loadSlideSyncState();
      if (ssState && ssState.slides && ssState.slides.length > 0) {
        setHasSlideSyncSlides(true);
      }

      const poState = await PersistenceService.loadPhotoverlayState();
      if (poState && poState.items && poState.items.length > 0) {
        setHasPhotoverlayItems(true);
      }

      isLoadedRef.current = true;
    };
    load();
  }, []);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    const timeout = setTimeout(() => {
      PersistenceService.savePiCollageState({ pictures, aspectRatio, exportFormat });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [pictures, aspectRatio, exportFormat]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newPics: PiCollagePicture[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const previewUrl = URL.createObjectURL(file);

        // Measure image
        const img = new Image();
        img.src = previewUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const ar = img.width / img.height;
        const maxZ = Math.max(0, ...pictures.map((p) => p.zIndex), ...newPics.map((p) => p.zIndex));

        newPics.push({
          id: Math.random().toString(36).substring(7),
          file,
          previewUrl,
          aspectRatio: ar,
          x: 20 + (pictures.length + i) * 5,
          y: 20 + (pictures.length + i) * 5,
          width: 30, // Base width percentage
          height: 30 / ar, // Adjust height based on AR to start non-stretched
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          framingSettings: {
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
          },
          borderSettings: {
            size: BorderSize.Small,
            color: TextColor.White,
          },
          filterSettings: FilterMode.Normal,
          captionSettings: {
            text: '',
            color: TextColor.White,
            position: TextPosition.BottomLeft,
            textSize: TextSize.Small,
          },
          watermarkSettings: {
            file: null,
            position: TextPosition.TopRight,
            opacity: 0.2,
            scale: 0.2,
          },
          zIndex: maxZ + 1,
          isVisible: true,
        });
      }

      setPictures((prev) => [...prev, ...newPics]);
      if (newPics.length > 0) setActivePictureId(newPics[0].id);
    }
  };

  const handleImportFromSlideSync = async () => {
    const ssState = await PersistenceService.loadSlideSyncState();
    if (!ssState || !ssState.slides || ssState.slides.length === 0) return;

    const newPics: PiCollagePicture[] = [];
    for (let i = 0; i < ssState.slides.length; i++) {
        const slide = ssState.slides[i];
        const previewUrl = URL.createObjectURL(slide.file);
        const img = new Image();
        img.src = previewUrl;
        await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
        const imgWidth = img.width || 800;
        const imgHeight = img.height || 600;
        const ar = imgWidth / imgHeight;
        const maxZ = Math.max(0, ...pictures.map((p) => p.zIndex), ...newPics.map((p) => p.zIndex));

        newPics.push({
          id: Math.random().toString(36).substring(7),
          file: slide.file,
          previewUrl,
          aspectRatio: ar,
          x: 20 + (pictures.length + i) * 5,
          y: 20 + (pictures.length + i) * 5,
          width: 30,
          height: 30 / ar,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          framingSettings: slide.framingSettings || { zoom: 1, offsetX: 0, offsetY: 0 },
          borderSettings: { size: slide.borderSettings?.size || BorderSize.None, color: slide.borderSettings?.color || TextColor.White },
          filterSettings: slide.filterSettings || FilterMode.Normal,
          captionSettings: {
            text: slide.captionSettings?.text || '',
            color: slide.captionSettings?.color || TextColor.White,
            position: slide.captionSettings?.position || TextPosition.BottomLeft,
            textSize: slide.captionSettings?.textSize || TextSize.Small,
            isItalic: slide.captionSettings?.isItalic || false,
          },
          watermarkSettings: {
            file: slide.watermarkSettings?.file || null,
            position: slide.watermarkSettings?.position || TextPosition.TopRight,
            opacity: 0.2, scale: 0.2,
          },
          zIndex: maxZ + 1,
          isVisible: true,
        });
    }
    setPictures((prev) => [...prev, ...newPics]);
    if (newPics.length > 0) setActivePictureId(newPics[0].id);
  };

  const handleImportFromPhotoverlay = async () => {
    const poState = await PersistenceService.loadPhotoverlayState();
    if (!poState || !poState.items || poState.items.length === 0) return;

    const newPics: PiCollagePicture[] = [];
    for (let i = 0; i < poState.items.length; i++) {
        const item = poState.items[i];
        const previewUrl = URL.createObjectURL(item.file);
        const img = new Image();
        img.src = previewUrl;
        await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
        const imgWidth = img.width || 800;
        const imgHeight = img.height || 600;
        const ar = imgWidth / imgHeight;
        const maxZ = Math.max(0, ...pictures.map((p) => p.zIndex), ...newPics.map((p) => p.zIndex));

        newPics.push({
          id: Math.random().toString(36).substring(7),
          file: item.file,
          previewUrl,
          aspectRatio: ar,
          x: 20 + (pictures.length + i) * 5,
          y: 20 + (pictures.length + i) * 5,
          width: 30,
          height: 30 / ar,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          framingSettings: item.framingSettings || { zoom: 1, offsetX: 0, offsetY: 0 },
          borderSettings: item.borderSettings || { size: BorderSize.None, color: TextColor.White },
          filterSettings: item.filterSettings || FilterMode.Normal,
          captionSettings: item.captionSettings || {
            text: '',
            color: TextColor.White,
            position: TextPosition.BottomLeft,
            textSize: TextSize.Small,
            isItalic: false,
          },
          watermarkSettings: item.watermarkSettings || {
            file: null,
            position: TextPosition.TopRight,
            opacity: 0.2, 
            scale: 0.2,
          },
          zIndex: maxZ + 1,
          isVisible: true,
        });
    }
    setPictures((prev) => [...prev, ...newPics]);
    if (newPics.length > 0) setActivePictureId(newPics[0].id);
  };

  const updatePicture = (id: string, updates: Partial<PiCollagePicture>) => {
    setPictures((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deletePicture = (id: string) => {
    setPictures((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activePictureId === id) {
        setActivePictureId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  };

  const handleCaptionUpdate = (updates: Partial<CaptionSettings>) => {
    setPictures((prev) =>
      prev.map((p) => {
        if (overlayApply.applyToAll || p.id === activePictureId) {
          return { ...p, captionSettings: { ...p.captionSettings, ...updates } };
        }
        return p;
      })
    );
  };

  const handleWatermarkUpdate = (updates: Partial<WatermarkSettings>) => {
    setPictures((prev) =>
      prev.map((p) => {
        if (overlayApply.applyToAll || p.id === activePictureId) {
          return { ...p, watermarkSettings: { ...p.watermarkSettings, ...updates } };
        }
        return p;
      })
    );
  };

  const handleFramingUpdate = (updates: Partial<FramingSettings>) => {
    if (!activePictureId) return;
    updatePicture(activePictureId, {
      framingSettings: {
        ...pictures.find((p) => p.id === activePictureId)!.framingSettings,
        ...updates,
      },
    });
  };

  const handleFilterUpdate = (filter: FilterMode) => {
    setPictures((prev) =>
      prev.map((p) => {
        if (filterApply.applyToAll || p.id === activePictureId) {
          return { ...p, filterSettings: filter };
        }
        return p;
      })
    );
  };

  const handleBorderUpdate = (updates: Partial<{ borderSize: BorderSize; borderColor: TextColor }>) => {
    setPictures((prev) =>
      prev.map((p) => {
        if (borderApply.applyToAll || p.id === activePictureId) {
          return { 
            ...p, 
            borderSettings: { ...p.borderSettings, 
              size: updates.borderSize !== undefined ? updates.borderSize : p.borderSettings.size,
              color: updates.borderColor !== undefined ? updates.borderColor : p.borderSettings.color
            } 
          };
        }
        return p;
      })
    );
  };

  const getCanvasDimensions = () => {
    switch (aspectRatio) {
      case AspectRatio.Landscape_16_9:
        return { w: 3840, h: 2160 };
      case AspectRatio.Portrait_9_16:
        return { w: 2160, h: 3840 };
      case AspectRatio.Portrait_3_4:
        return { w: 2160, h: 2880 };
      case AspectRatio.Square_1_1:
        return { w: 2160, h: 2160 };
      default:
        return { w: 3840, h: 2160 };
    }
  };

  const handleExport = async () => {
    try {
      const { w, h } = getCanvasDimensions();
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get context');

      // white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      // Draw sorted visible pictures
      const sorted = [...pictures].filter((p) => p.isVisible).sort((a, b) => a.zIndex - b.zIndex);

      for (const pic of sorted) {
        // Compute pixel dimensions
        // IMPORTANT: Width is the driver, height is calculated from AR to avoid stretching
        const pxW = (pic.width / 100) * w;
        const pxH = pxW / pic.aspectRatio;
        const pxX = (pic.x / 100) * w;
        const pxY = (pic.y / 100) * h;

        ctx.save();

        // Translation and Rotation
        ctx.translate(pxX + pxW / 2, pxY + pxH / 2);
        ctx.rotate((pic.rotation * Math.PI) / 180);

        // Apply filters
        let filterStr = '';
        if (pic.filterSettings === FilterMode.Grayscale) filterStr += 'grayscale(100%) ';
        if (pic.filterSettings === FilterMode.Sepia) filterStr += 'sepia(100%) ';
        if (filterStr) ctx.filter = filterStr.trim();

        // Apply framing (zoom and offsets)
        const zoom = pic.framingSettings.zoom || 1.0;
        const offsetX = (pic.framingSettings.offsetX || 0) * (pxW / 100);
        const offsetY = (pic.framingSettings.offsetY || 0) * (pxH / 100);

        const drawWidth = pxW * zoom;
        const drawHeight = pxH * zoom;
        const drawX = (pxW - drawWidth) / 2 + offsetX;
        const drawY = (pxH - drawHeight) / 2 + offsetY;

        // Draw Border
        if (pic.borderSettings.size > 0) {
          ctx.fillStyle = pic.borderSettings.color || '#ffffff';
          ctx.fillRect(drawX - pxW / 2, drawY - pxH / 2, drawWidth, drawHeight);
        }

        // Clip area for image contents inside border
        // Scale border size for 4K
        const bSize = pic.borderSettings.size * 2;
        const clipX = drawX - pxW / 2 + bSize;
        const clipY = drawY - pxH / 2 + bSize;
        const clipW = drawWidth - 2 * bSize;
        const clipH = drawHeight - 2 * bSize;

        ctx.save();
        ctx.beginPath();
        ctx.rect(clipX, clipY, clipW, clipH);
        ctx.clip();

        // Load image
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = pic.previewUrl;
        });

        // Draw Image
        ctx.drawImage(img, drawX - pxW / 2, drawY - pxH / 2, drawWidth, drawHeight);
        ctx.restore();

        // Watermark
        if (pic.watermarkSettings?.file) {
          const wImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const tempImg = new Image();
            tempImg.onload = () => resolve(tempImg);
            tempImg.onerror = reject;
            tempImg.src = URL.createObjectURL(pic.watermarkSettings.file!);
          });

          const w = pxW * pic.watermarkSettings.scale;
          const imgAR = wImg.width / wImg.height;
          const h = w / imgAR;
          const pos = calculateWatermarkPosition(pxW, pxH, w, h, pic.watermarkSettings.position);

          ctx.save();
          ctx.globalAlpha = pic.watermarkSettings.opacity;
          ctx.drawImage(wImg, pos.x - pxW / 2, pos.y - pxH / 2, w, h);
          ctx.restore();
          URL.revokeObjectURL(wImg.src);
        }

        // Caption
        if (pic.captionSettings?.text) {
          const metrics = calculateCaptionMetrics(pxW, pxH, {
            text: pic.captionSettings.text,
            textSize: pic.captionSettings.textSize,
          });
          const position = calculateCaptionPosition(pxW, pxH, metrics, pic.captionSettings.position);

          const fontStyle = pic.captionSettings.isItalic ? 'italic' : 'normal';
          ctx.save();
          ctx.font = `${fontStyle} bold ${metrics.fontSize}px Inter, sans-serif`;
          ctx.fillStyle = pic.captionSettings.color;
          ctx.textAlign = position.textAlign as CanvasTextAlign;
          ctx.textBaseline = 'alphabetic';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = metrics.fontSize * 0.15;
          ctx.shadowOffsetX = metrics.fontSize * 0.04;
          ctx.shadowOffsetY = metrics.fontSize * 0.04;

          metrics.lines.forEach((line, i) => {
            ctx.fillText(line, position.x - pxW / 2, position.y - pxH / 2 + i * metrics.lineHeight);
          });
          ctx.restore();
        }

        ctx.restore();
      }

      const formatString = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(formatString, 0.9);
      const link = document.createElement('a');
      link.download = `picollage-export.${exportFormat}`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
      alert(t.tools.picollage.exportFailed);
    }
  };

  // Settings bar actions
  const moveActive = (dx: number, dy: number) => {
    if (!activePictureId) return;
    const p = pictures.find((p) => p.id === activePictureId);
    if (!p) return;

    const { w, h } = getCanvasDimensions();
    const heightPerc = (p.width / p.aspectRatio) * (w / h);

    const nextX = Math.max(-p.width + 10, Math.min(90, p.x + dx));
    const nextY = Math.max(-heightPerc + 10, Math.min(90, p.y + dy));

    updatePicture(activePictureId, { x: nextX, y: nextY });
  };

  const rotateActive = (deg: number) => {
    if (!activePictureId) return;
    const p = pictures.find((p) => p.id === activePictureId);
    if (!p) return;
    updatePicture(activePictureId, { rotation: p.rotation + deg });
  };

  const reorderZ = (dir: 1 | -1) => {
    if (!activePictureId) return;
    
    // 1. Sort pictures by current zIndex
    const sorted = [...pictures].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((p) => p.id === activePictureId);
    
    if (idx === -1) return;
    
    // 2. Identify the target index for swapping
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= sorted.length) return;

    // 3. Swap the elements in the sorted copy
    const newSortOrder = [...sorted];
    const current = newSortOrder[idx];
    const neighbor = newSortOrder[nextIdx];
    newSortOrder[idx] = neighbor;
    newSortOrder[nextIdx] = current;

    // 4. Re-assign zIndex values (1..N) to all pictures based on the new visual order.
    // This keeps the zIndex state clean and ensures 1 click always = 1 visual swap.
    setPictures((prev) =>
      prev.map((p) => {
        const newPos = newSortOrder.findIndex((o) => o.id === p.id);
        return { ...p, zIndex: newPos + 1 };
      })
    );
  };

  return (
    <div className="flex h-full bg-slate-900 overflow-hidden">
      {/* Sidebar Setting */}
      <div className="w-[340px] border-r border-slate-700 bg-slate-800 flex flex-col p-4 z-30 shadow-2xl shrink-0 overflow-y-auto">
        <PiCollageSidebar
          pictures={pictures}
          activePictureId={activePictureId}
          aspectRatio={aspectRatio}
          onImageUpload={handleImageUpload}
          onAspectRatioChange={setAspectRatio}
          onUpdatePicture={updatePicture}
          onCaptionUpdate={handleCaptionUpdate}
          onWatermarkUpdate={handleWatermarkUpdate}
          onFramingUpdate={handleFramingUpdate}
          onFilterUpdate={handleFilterUpdate}
          onBorderUpdate={handleBorderUpdate}
          applyToAll={overlayApply.applyToAll}
          onApplyToAllChange={overlayApply.handleApplyToAllChange}
          applyFilterToAll={filterApply.applyToAll}
          onApplyFilterToAllChange={filterApply.handleApplyToAllChange}
          applyBorderToAll={borderApply.applyToAll}
          onApplyBorderToAllChange={borderApply.handleApplyToAllChange}
          onDeleteProject={() => setShowEraseConfirm(true)}
          hasSlideSyncSlides={hasSlideSyncSlides}
          onImportFromSlideSync={handleImportFromSlideSync}
          hasPhotoverlayItems={hasPhotoverlayItems}
          onImportFromPhotoverlay={handleImportFromPhotoverlay}
        />
      </div>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Canvas Area */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden">
          {pictures.length > 0 && (
            <PiCollageCanvas
              pictures={pictures}
              activePictureId={activePictureId}
              aspectRatio={aspectRatio}
              onSelectPicture={setActivePictureId}
              onUpdatePicture={updatePicture}
            />
          )}

          {/* Settings Bar */}
          {activePictureId && pictures.some((p) => p.id === activePictureId && p.isVisible) && (
            <PiCollageSettingsBar
              onMoveUp={() => moveActive(0, -5)}
              onMoveDown={() => moveActive(0, 5)}
              onMoveLeft={() => moveActive(-5, 0)}
              onMoveRight={() => moveActive(5, 0)}
              onRotateCw={() => rotateActive(15)}
              onRotateCcw={() => rotateActive(-15)}
              onBringForward={() => reorderZ(1)}
              onSendBackward={() => reorderZ(-1)}
            />
          )}

          {/* Export Controls Overlay */}
          <div className="absolute right-6 bottom-6 z-20 flex flex-col items-end gap-2">
            <div className="flex bg-slate-800/50 backdrop-blur-md rounded-xl p-1 border border-slate-700/50 shadow-lg">
              <button
                onClick={() => setExportFormat('png')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  exportFormat === 'png'
                    ? 'bg-tool-picollage text-slate-900 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                PNG
              </button>
              <button
                onClick={() => setExportFormat('jpg')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  exportFormat === 'jpg'
                    ? 'bg-tool-picollage text-slate-900 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                JPG
              </button>
            </div>
            <button
              onClick={handleExport}
              disabled={pictures.length === 0}
              className="flex items-center justify-center gap-3 px-8 py-3 bg-tool-picollage hover:bg-tool-picollage/90 text-slate-900 rounded-full text-xs font-black uppercase tracking-widest transition-transform hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(234,179,8,0.3)] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none min-w-[180px]"
            >
              <Download className="w-4 h-4" /> {t.tools.picollage.exportCollage}
            </button>
          </div>
        </div>

        {/* Footer Area */}
        <div className="h-36 shrink-0 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 p-4">
          <PiCollageFooter
            pictures={pictures}
            activePictureId={activePictureId}
            onSelectPicture={setActivePictureId}
            onToggleVisibility={(id) => {
              const p = pictures.find((x) => x.id === id);
              if (p) updatePicture(id, { isVisible: !p.isVisible });
            }}
            onRemovePicture={deletePicture}
            onAddMoreClick={() => {
              document.getElementById('picollage-add-more')?.click();
            }}
          />
        </div>

        {/* Hidden Add More Input connected to the footer */}
        <input
          id="picollage-add-more"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      <ConfirmationModal
        isOpen={showEraseConfirm}
        onClose={() => setShowEraseConfirm(false)}
        onConfirm={() => {
          setPictures([]);
          setActivePictureId(null);
          setShowEraseConfirm(false);
          PersistenceService.savePiCollageState({ pictures: [], aspectRatio, exportFormat });
        }}
        title={t.tools.slidesync.removeAllDataTitle}
        message={t.tools.slidesync.removeAllDataMsg}
        confirmLabel={t.tools.slidesync.yesRemoveAll}
        cancelLabel={t.common.cancel}
        Icon={Trash2}
      />

      <ConfirmationModal
        isOpen={overlayApply.showConfirm}
        onClose={() => overlayApply.setShowConfirm(false)}
        onConfirm={() => overlayApply.confirmApply(true)}
        title={t.tools.photoverlay.applyToAllTitle}
        message={t.tools.photoverlay.applyToAllMsg}
        confirmLabel={t.tools.photoverlay.yesApply}
        cancelLabel={t.common.cancel}
        Icon={Check}
        iconColor="text-tool-picollage"
        confirmButtonClass="bg-tool-picollage hover:opacity-90"
      />

      <ConfirmationModal
        isOpen={filterApply.showConfirm}
        onClose={() => filterApply.setShowConfirm(false)}
        onConfirm={() => filterApply.confirmApply(true)}
        title={t.tools.photoverlay.applyFilterToAllTitle}
        message={t.tools.photoverlay.applyFilterToAllMsg}
        confirmLabel={t.tools.photoverlay.yesApply}
        cancelLabel={t.common.cancel}
        Icon={Check}
        iconColor="text-tool-picollage"
        confirmButtonClass="bg-tool-picollage hover:opacity-90"
      />

      <ConfirmationModal
        isOpen={borderApply.showConfirm}
        onClose={() => borderApply.setShowConfirm(false)}
        onConfirm={() => borderApply.confirmApply(true)}
        title={t.tools.photoverlay.applyToAllTitle}
        message={t.tools.photoverlay.applyToAllMsg}
        confirmLabel={t.tools.photoverlay.yesApply}
        cancelLabel={t.common.cancel}
        Icon={Check}
        iconColor="text-tool-picollage"
        confirmButtonClass="bg-tool-picollage hover:opacity-90"
      />
    </div>
  );
};
