import React, { useRef, useState, useEffect } from 'react';
import { PiCollagePicture, AspectRatio, BorderSize, FilterMode } from '../../types';
import { RotateCw } from 'lucide-react';

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
      case AspectRatio.Portrait_4_5:
        return '4 / 5';
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

    // Use setPointerCapture to track movement outside element
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setInteraction({
      id,
      type,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialX: pic.x,
      initialY: pic.y,
      initialWidth: pic.width,
      initialHeight: pic.height,
      initialRotation: pic.rotation,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interaction || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - interaction.startX) / rect.width) * 100;
    const dy = ((e.clientY - interaction.startY) / rect.height) * 100;

    let updates: Partial<PiCollagePicture> = {};

    if (interaction.type === 'move') {
      updates = {
        x: interaction.initialX + dx,
        y: interaction.initialY + dy,
      };
    } else if (interaction.type === 'resize' && interaction.handle) {
      // Basic resize logic (doesn't fully account for rotation center offset perfectly without math overhead,
      // but good enough for simple bounding box constraints without matrix math)
      let newW = interaction.initialWidth;
      let newH = interaction.initialHeight;
      let newX = interaction.initialX;
      let newY = interaction.initialY;

      if (interaction.handle.includes('e')) newW += dx;
      if (interaction.handle.includes('s')) newH += dy;
      if (interaction.handle.includes('w')) {
        newW -= dx;
        newX += dx;
      }
      if (interaction.handle.includes('n')) {
        newH -= dy;
        newY += dy;
      }

      // Keep aspect ratio for corners
      if (interaction.handle.length === 2) {
        // simple proportional scale (can be improved)
        const ratio = interaction.initialWidth / interaction.initialHeight;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (interaction.handle.includes('n')) newH = newW / ratio;
          else newH = newW / ratio;
        } else {
          if (interaction.handle.includes('w')) newW = newH * ratio;
          else newW = newH * ratio;
        }
      }

      // Minimum size
      if (newW < 5) newW = 5;
      if (newH < 5) newH = 5;

      updates = { x: newX, y: newY, width: newW, height: newH };
    } else if (interaction.type === 'rotate') {
      // Calculate angle from center of image
      const cx = interaction.initialX + interaction.initialWidth / 2;
      const cy = interaction.initialY + interaction.initialHeight / 2;

      const pxX = ((e.clientX - rect.left) / rect.width) * 100;
      const pxY = ((e.clientY - rect.top) / rect.height) * 100;

      const angle = Math.atan2(pxY - cy, pxX - cx) * (180 / Math.PI);
      updates = { rotation: angle + 90 }; // +90 because top handle is at -90deg
    }

    onUpdatePicture(interaction.id, updates);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (interaction) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
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
      className="relative w-full h-full flex items-center justify-center p-8"
      onClick={() => onSelectPicture(null)}
    >
      <div
        ref={containerRef}
        id="picollage-export-area"
        className="relative bg-white shadow-2xl overflow-hidden max-h-full max-w-full"
        style={{ aspectRatio: getAspectStyle(), width: '100%', maxHeight: '100%' }}
      >
        {/* Sort by zIndex */}
        {[...pictures]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((pic) => {
            if (!pic.isVisible) return null;

            return (
              <div
                key={pic.id}
                className={`absolute transform-gpu`}
                style={{
                  left: `${pic.x}%`,
                  top: `${pic.y}%`,
                  width: `${pic.width}%`,
                  height: `${pic.height}%`,
                  transform: `rotate(${pic.rotation}deg)`,
                  transformOrigin: '50% 50%',
                  zIndex: pic.zIndex,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPicture(pic.id);
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <div
                  className={`w-full h-full relative group ${activePictureId === pic.id ? 'ring-2 ring-tool-picollage ring-offset-2' : ''}`}
                  onPointerDown={(e) => handlePointerDown(e, pic.id, 'move')}
                  style={{ cursor: interaction && interaction.id === pic.id ? 'grabbing' : 'grab' }}
                >
                  {/* Content Box with border/filter */}
                  <div
                    className="w-full h-full overflow-hidden flex items-center justify-center pointer-events-none"
                    style={{
                      border: getBorderStyle(pic.borderSize),
                      borderColor: pic.borderColor,
                      filter: getFilterStyle(pic.filter),
                      backgroundColor: 'transparent',
                    }}
                  >
                    {/* Image with scaling and offset */}
                    <img
                      src={pic.previewUrl}
                      alt="Collage Piece"
                      className="max-w-none pointer-events-none"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: `translate(${pic.offsetX}%, ${pic.offsetY}%) scale(${pic.zoom})`,
                      }}
                      draggable={false}
                    />
                  </div>
                </div>

                {renderHandles(pic)}
              </div>
            );
          })}
      </div>
    </div>
  );
};
