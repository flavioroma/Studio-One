import React from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  RotateCcw,
  CopyPlus,
  SquareStack,
  SquareDashedBottom,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface PiCollageSettingsBarProps {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRotateCw: () => void;
  onRotateCcw: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
}

export const PiCollageSettingsBar: React.FC<PiCollageSettingsBarProps> = ({
  onMoveUp,
  onMoveDown,
  onMoveLeft,
  onMoveRight,
  onRotateCw,
  onRotateCcw,
  onBringForward,
  onSendBackward,
}) => {
  const { t } = useLanguage();

  const buttonClass =
    'p-2 rounded-xl bg-slate-700 hover:bg-tool-picollage/20 text-slate-300 hover:text-tool-picollage transition-all border border-transparent hover:border-tool-picollage/50';

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-700 shadow-2xl z-20">
      {/* Move group */}
      <div className="flex items-center gap-1 border-r border-slate-700 pr-4">
        <button onClick={onMoveUp} className={buttonClass} title={t.tools.picollage.moveUp}>
          <ArrowUp className="w-4 h-4" />
        </button>
        <button onClick={onMoveDown} className={buttonClass} title={t.tools.picollage.moveDown}>
          <ArrowDown className="w-4 h-4" />
        </button>
        <button onClick={onMoveLeft} className={buttonClass} title={t.tools.picollage.moveLeft}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={onMoveRight} className={buttonClass} title={t.tools.picollage.moveRight}>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Rotate group */}
      <div className="flex items-center gap-1 border-r border-slate-700 pr-4">
        <button onClick={onRotateCcw} className={buttonClass} title={t.tools.picollage.rotateCcw}>
          <RotateCcw className="w-4 h-4" />
        </button>
        <button onClick={onRotateCw} className={buttonClass} title={t.tools.picollage.rotateCw}>
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Layer group */}
      <div className="flex items-center gap-1">
        <button
          onClick={onBringForward}
          className={buttonClass}
          title={t.tools.picollage.bringForward}
        >
          <SquareStack className="w-4 h-4" />
        </button>
        <button
          onClick={onSendBackward}
          className={buttonClass}
          title={t.tools.picollage.sendBackward}
        >
          <SquareDashedBottom className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
