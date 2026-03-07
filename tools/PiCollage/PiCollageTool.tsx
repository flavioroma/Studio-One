import React, { useState, useRef, useEffect } from 'react';
import { PiCollagePicture, AspectRatio, BorderSize, FilterMode, TextColor } from '../../types';
import { PersistenceService } from '../../services/PersistenceService';
import { PiCollageSidebar } from './PiCollageSidebar';
import { PiCollageFooter } from './PiCollageFooter';
import { PiCollageSettingsBar } from './PiCollageSettingsBar';
import { PiCollageCanvas } from './PiCollageCanvas';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const PiCollageTool: React.FC = () => {
  const { t } = useLanguage();
  const [pictures, setPictures] = useState<PiCollagePicture[]>([]);
  const [activePictureId, setActivePictureId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.Landscape_16_9);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg'>('png');
  const [showEraseConfirm, setShowEraseConfirm] = useState(false);

  const isLoadedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const state = await PersistenceService.loadPiCollageState();
      if (state) {
        const restored = state.pictures.map((p) => ({
          ...p,
          previewUrl: URL.createObjectURL(p.file),
        }));
        setPictures(restored);
        setAspectRatio(state.aspectRatio);
        setExportFormat(state.exportFormat);
        if (restored.length > 0) setActivePictureId(restored[0].id);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newPics: PiCollagePicture[] = files.map((file, i) => {
        const maxZ = pictures.length > 0 ? Math.max(...pictures.map((p) => p.zIndex)) : 0;
        return {
          id: Math.random().toString(36).substring(7),
          file,
          previewUrl: URL.createObjectURL(file),
          x: 20 + i * 5,
          y: 20 + i * 5,
          width: 30,
          height: 40,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
          borderSize: BorderSize.Small,
          borderColor: TextColor.White,
          filter: FilterMode.Normal,
          zIndex: maxZ + 1 + i,
          isVisible: true,
        };
      });
      setPictures((prev) => [...prev, ...newPics]);
      setActivePictureId(newPics[0].id);
    }
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

  const getCanvasDimensions = () => {
    switch (aspectRatio) {
      case AspectRatio.Landscape_16_9:
        return { w: 1920, h: 1080 };
      case AspectRatio.Portrait_9_16:
        return { w: 1080, h: 1920 };
      case AspectRatio.Portrait_4_5:
        return { w: 1080, h: 1350 };
      case AspectRatio.Square_1_1:
        return { w: 1080, h: 1080 };
      default:
        return { w: 1920, h: 1080 };
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
        const pxX = (pic.x / 100) * w;
        const pxY = (pic.y / 100) * h;
        const pxW = (pic.width / 100) * w;
        const pxH = (pic.height / 100) * h;

        ctx.save();

        // Translation and Rotation
        ctx.translate(pxX + pxW / 2, pxY + pxH / 2);
        ctx.rotate((pic.rotation * Math.PI) / 180);

        // Apply filters
        let filterStr = '';
        if (pic.filter === FilterMode.Grayscale) filterStr += 'grayscale(100%) ';
        if (pic.filter === FilterMode.Sepia) filterStr += 'sepia(100%) ';
        if (filterStr) ctx.filter = filterStr.trim();

        // Draw Border
        if (pic.borderSize > 0) {
          ctx.fillStyle = pic.borderColor;
          ctx.fillRect(-pxW / 2, -pxH / 2, pxW, pxH);
        }

        // Clip area for image contents inside border
        const bSize = pic.borderSize;
        ctx.beginPath();
        // The internal area
        ctx.rect(-pxW / 2 + bSize, -pxH / 2 + bSize, pxW - 2 * bSize, pxH - 2 * bSize);
        ctx.clip(); // clip to inside border

        // Load image
        const img = new Image();
        img.src = pic.previewUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        // Calculate object-fit: cover with zoom and offset
        const iw = img.width;
        const ih = img.height;
        const bw = pxW - 2 * bSize;
        const bh = pxH - 2 * bSize;

        const imgRatio = iw / ih;
        const boxRatio = bw / bh;

        let drawW = bw;
        let drawH = bh;

        if (imgRatio > boxRatio) {
          drawW = bh * imgRatio;
        } else {
          drawH = bw / imgRatio;
        }

        // Apply zoom
        drawW *= pic.zoom;
        drawH *= pic.zoom;

        // Apply Pan Offset
        const tX = -drawW / 2 + (pic.offsetX / 100) * drawW;
        const tY = -drawH / 2 + (pic.offsetY / 100) * drawH;

        // Draw Image
        ctx.drawImage(img, tX, tY, drawW, drawH);

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
    updatePicture(activePictureId, { x: p.x + dx, y: p.y + dy });
  };

  const rotateActive = (deg: number) => {
    if (!activePictureId) return;
    const p = pictures.find((p) => p.id === activePictureId);
    if (!p) return;
    updatePicture(activePictureId, { rotation: p.rotation + deg });
  };

  const reorderZ = (dir: 1 | -1) => {
    if (!activePictureId) return;
    const p = pictures.find((p) => p.id === activePictureId);
    if (!p) return;
    updatePicture(activePictureId, { zIndex: p.zIndex + dir });
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
          onDeleteProject={() => setShowEraseConfirm(true)}
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
            exportFormat={exportFormat}
            onFormatChange={setExportFormat}
            onExport={handleExport}
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
    </div>
  );
};
