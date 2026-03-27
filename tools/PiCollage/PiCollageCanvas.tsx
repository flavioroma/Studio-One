import React, { useRef, useState, useEffect } from 'react';
import { PiCollagePicture, AspectRatio, BorderSize, FilterMode, TextPosition, TextSize } from '../../types';
import { RotateCw } from 'lucide-react';
import { calculateCaptionMetrics } from '../../utils/captionUtils';

interface PiCollageCanvasProps {
  pictures: PiCollagePicture[];
  activePictureId: string | null;
  aspectRatio: AspectRatio;
  onSelectPicture: (id: string | null) => void;
  onUpdatePicture: (id: string, updates: Partial<PiCollagePicture>) => void;
}

export const PiCollageCanvas: React.FC<PiCollageCanvasProps> = ({
  pictures,
  activePictureId,
  aspectRatio,
  onSelectPicture,
  onUpdatePicture,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
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
  }, []);

  const getCanvasStyle = () => {
    // Calculate aspect ratio decimal
    let ratio = 16 / 9;
    switch (aspectRatio) {
      case AspectRatio.Landscape_16_9:
        ratio = 16 / 9;
        break;
      case AspectRatio.Portrait_9_16:
        ratio = 9 / 16;
        break;
      case AspectRatio.Portrait_3_4:
        ratio = 3 / 4;
        break;
      case AspectRatio.Square_1_1:
        ratio = 1 / 1;
        break;
    }

    const availableW = containerSize.width;
    const availableH = containerSize.height;

    if (availableW === 0 || availableH === 0) return { width: '100%', height: '100%' };

    const containerRatio = availableW / availableH;

    let finalW, finalH;
    if (containerRatio > ratio) {
      // Container is wider than canvas ratio -> fit to height
      finalH = availableH;
      finalW = finalH * ratio;
    } else {
      // Container is taller than canvas ratio -> fit to width
      finalW = availableW;
      finalH = finalW / ratio;
    }

    return {
      width: `${finalW}px`,
      height: `${finalH}px`,
    };
  };

  const [interaction, setInteraction] = useState<{
    id: string;
    type: 'move' | 'resize' | 'rotate' | null;
    handle?: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    initialRotation: number;
  } | null>(null);

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

  const getBorderStyle = (size: BorderSize) => {
    switch (size) {
      case BorderSize.Small:
        return '8px solid';
      case BorderSize.Medium:
        return '16px solid';
      case BorderSize.Large:
        return '32px solid';
      default:
        return 'none';
    }
  };

  const getFilterStyle = (filter: FilterMode) => {
    switch (filter) {
      case FilterMode.Grayscale:
        return 'grayscale(100%)';
      case FilterMode.Sepia:
        return 'sepia(100%)';
      default:
        return 'none';
    }
  };

  const activePicture = pictures.find((p) => p.id === activePictureId);

  // Interaction handlers
  const handlePointerDown = (
    e: React.PointerEvent,
    id: string,
    type: 'move' | 'resize' | 'rotate',
    handle?: string
  ) => {
    e.stopPropagation();
    onSelectPicture(id);
    const pic = pictures.find((p) => p.id === id);
    if (!pic || !containerRef.current) return;

    // Use export area rect for accurate coordinate calculations
    const canvasArea = document.getElementById('picollage-export-area');
    if (!canvasArea) return;
    const rect = canvasArea.getBoundingClientRect();

    // Use setPointerCapture on the container to track movement robustly even for huge images
    containerRef.current.setPointerCapture(e.pointerId);

    // Calculate height as a percentage of the canvas height
    const currentHeight = (pic.width / pic.aspectRatio) * (rect.width / rect.height);

    setInteraction({
      id,
      type,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialX: pic.x,
      initialY: pic.y,
      initialWidth: pic.width,
      initialHeight: currentHeight,
      initialRotation: pic.rotation,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interaction || !containerRef.current) return;

    // Use dimensions of the actual export area for coordinate calculations
    const canvasArea = document.getElementById('picollage-export-area');
    if (!canvasArea) return;
    const rect = canvasArea.getBoundingClientRect();

    const dx = ((e.clientX - interaction.startX) / rect.width) * 100;
    const dy = ((e.clientY - interaction.startY) / rect.height) * 100;

    let updates: Partial<PiCollagePicture> = {};

    if (interaction.type === 'move') {
      let newX = interaction.initialX + dx;
      let newY = interaction.initialY + dy;

      const pic = pictures.find((p) => p.id === interaction.id);
      if (pic) {
        const currentHeightPerc = (pic.width / pic.aspectRatio) * (rect.width / rect.height);
        newX = Math.max(-pic.width + 10, Math.min(90, newX));
        newY = Math.max(-currentHeightPerc + 10, Math.min(90, newY));
      }

      updates = { x: newX, y: newY };
    } else if (interaction.type === 'resize' && interaction.handle) {
      const pic = pictures.find((p) => p.id === interaction.id);
      if (!pic) return;

      let newW = interaction.initialWidth;
      let newX = interaction.initialX;
      let newY = interaction.initialY;

      // Handle horizontal growth/shrinkage
      if (interaction.handle.includes('e')) newW += dx;
      if (interaction.handle.includes('w')) {
        newW -= dx;
        newX += dx;
      }

      // Handle vertical growth/shrinkage by also influencing width if strictly vertical handles
      if (interaction.handle === 'n') {
        const dy_w = dy * pic.aspectRatio; // proportional dx
        newW -= dy_w;
        newY += dy;
        newX += dy_w / 2; // Keep centered-ish if only top pulled
      }
      if (interaction.handle === 's') {
        const dy_w = dy * pic.aspectRatio;
        newW += dy_w;
      }

      // Handle corners (diagonal) - prioritize DX for width calculation
      if (interaction.handle.length === 2) {
        // dx already influenced newW above for 'e'/'w' parts
        // but we might want to pick the larger movement to feel more natural
        if (Math.abs(dy) > Math.abs(dx)) {
          // dy is primary
          const sign = interaction.handle.includes('s') ? 1 : -1;
          newW = (interaction.initialHeight + dy * sign) * pic.aspectRatio;
          if (interaction.handle.includes('w')) {
            newX = interaction.initialX + (interaction.initialWidth - newW);
          }
          if (interaction.handle.includes('n')) {
            newY = interaction.initialY + dy;
          }
        }
      }

      // Minimum size
      if (newW < 5) newW = 5;

      // Height is always derived from width * AR in state or handled by CSS aspect-ratio
      // Since we use CSS aspect-ratio on the div, we only need to update width and x/y
      updates = { x: newX, y: newY, width: newW };
    } else if (interaction.type === 'rotate') {
      // Use pixel coordinates for rotation to avoid skewing on non-square canvases
      const cx = rect.left + (interaction.initialX + interaction.initialWidth / 2) * (rect.width / 100);
      const cy = rect.top + (interaction.initialY + (interaction.initialHeight || 0) / 2) * (rect.height / 100);

      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
      updates = { rotation: angle + 90 }; // +90 because top handle is at -90deg
    }

    onUpdatePicture(interaction.id, updates);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (interaction && containerRef.current) {
      try {
        containerRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore if capture was already released
      }
      setInteraction(null);
    }
  };

  const renderHandles = (pic: PiCollagePicture) => {
    const isSelected = activePictureId === pic.id;
    if (!isSelected) return null;

    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    const handleStyle: React.CSSProperties = {
      position: 'absolute',
      width: '12px',
      height: '12px',
      backgroundColor: 'white',
      border: '2px solid #eab308', // tool-picollage
      borderRadius: '50%',
      transform: 'translate(-50%, -50%)',
    };

    return (
      <>
        {handles.map((h) => {
          let top = '50%',
            left = '50%';
          if (h.includes('n')) top = '0%';
          if (h.includes('s')) top = '100%';
          if (h.includes('w')) left = '0%';
          if (h.includes('e')) left = '100%';

          return (
            <div
              key={h}
              style={{ ...handleStyle, top, left, cursor: `${h}-resize` }}
              onPointerDown={(e) => handlePointerDown(e, pic.id, 'resize', h)}
            />
          );
        })}
        {/* Rotate Handle */}
        <div
          data-testid="rotate-handle"
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-6 h-6 bg-tool-picollage rounded-full flex items-center justify-center cursor-alias shadow-lg border-2 border-white"
          onPointerDown={(e) => handlePointerDown(e, pic.id, 'rotate')}
        >
          <RotateCw className="w-3 h-3 text-white" />
        </div>
        {/* Connection line for rotation */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-10 bg-tool-picollage -translate-y-full" />
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center p-4 md:p-8 overflow-hidden touch-none select-none"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onSelectPicture(null);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        id="picollage-export-area"
        data-testid="picollage-export-area"
        className="relative bg-white shadow-2xl flex-shrink-0 touch-none select-none"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) onSelectPicture(null);
        }}
        style={{
          ...getCanvasStyle(),
        }}
      >
        {/* Sort by zIndex */}
        {[...pictures]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((pic) => {
            if (!pic.isVisible) return null;

            return (
              <div
                key={pic.id}
                className={`absolute transform-gpu select-none`}
                style={{
                  left: `${pic.x}%`,
                  top: `${pic.y}%`,
                  width: `${pic.width}%`,
                  // Height is auto-calculated based on aspect ratio to prevent stretching
                  aspectRatio: `${pic.aspectRatio}`,
                  height: 'auto',
                  transform: `rotate(${pic.rotation}deg)`,
                  transformOrigin: '50% 50%',
                  zIndex: pic.zIndex,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPicture(pic.id);
                }}
              >
                <div
                  data-testid="image-move-handle"
                  className={`w-full h-full relative group ${activePictureId === pic.id ? 'ring-2 ring-tool-picollage ring-offset-2' : ''}`}
                  onPointerDown={(e) => handlePointerDown(e, pic.id, 'move')}
                  style={{ cursor: interaction && interaction.id === pic.id ? 'grabbing' : 'grab', containerType: 'inline-size' }}
                >
                  {/* Border wrapper: fixed at tile edges, not affected by zoom/pan */}
                  <div
                    className="w-full h-full overflow-hidden pointer-events-none"
                    style={{
                      border: getBorderStyle(pic.borderSettings.size),
                      borderColor: pic.borderSettings.color,
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Filter + image: filter applies only inside the border */}
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ filter: getFilterStyle(pic.filterSettings) }}
                    >
                      <img
                        src={pic.previewUrl}
                        alt="Collage Piece"
                        className="max-w-none pointer-events-none"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: `translate(${pic.framingSettings.offsetX}%, ${pic.framingSettings.offsetY}%) scale(${pic.framingSettings.zoom})`,
                        }}
                        draggable={false}
                      />
                    </div>
                  </div>

                  {/* Watermark Preview */}
                  {pic.watermarkSettings?.file && (
                    <img
                      src={URL.createObjectURL(pic.watermarkSettings.file)}
                      alt="Watermark"
                      className="absolute pointer-events-none"
                      style={{
                        width: `${pic.watermarkSettings.scale * 100}%`,
                        opacity: pic.watermarkSettings.opacity,
                        zIndex: 20,
                        ...(pic.watermarkSettings.position === TextPosition.TopLeft && { top: '5%', left: '5%' }),
                        ...(pic.watermarkSettings.position === TextPosition.TopRight && { top: '5%', right: '5%' }),
                        ...(pic.watermarkSettings.position === TextPosition.BottomLeft && { bottom: '5%', left: '5%' }),
                        ...(pic.watermarkSettings.position === TextPosition.BottomRight && { bottom: '5%', right: '5%' }),
                        ...(pic.watermarkSettings.position === TextPosition.Center && { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
                        ...(pic.watermarkSettings.position === TextPosition.TopCenter && { top: '5%', left: '50%', transform: 'translate(-50%, 0)' }),
                        ...(pic.watermarkSettings.position === TextPosition.BottomCenter && { bottom: '5%', left: '50%', transform: 'translate(-50%, 0)' }),
                      }}
                    />
                  )}

                  {/* Caption Preview */}
                  {pic.captionSettings?.text && (
                    <div
                      className="absolute inset-0 pointer-events-none flex"
                      style={{
                        color: pic.captionSettings.color,
                        textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
                        fontWeight: 'bold',
                        fontStyle: pic.captionSettings.isItalic ? 'italic' : 'normal',
                        fontFamily: 'Inter, sans-serif',
                        padding: '5%',
                        justifyContent: pic.captionSettings.position.includes('Left') ? 'flex-start' : pic.captionSettings.position.includes('Right') ? 'flex-end' : 'center',
                        alignItems: pic.captionSettings.position.includes('Top') ? 'flex-start' : pic.captionSettings.position.includes('Bottom') ? 'flex-end' : 'center',
                        textAlign: pic.captionSettings.position.includes('Left') ? 'left' : pic.captionSettings.position.includes('Right') ? 'right' : 'center',
                        fontSize: pic.captionSettings.textSize === TextSize.Large ? '8cqi' : '4cqi', // Dynamic font size based on container width
                      }}
                    >
                      {pic.captionSettings.text}
                    </div>
                  )}
                </div>

                {renderHandles(pic)}
              </div>
            );
          })}
      </div>
    </div>
  );
};
