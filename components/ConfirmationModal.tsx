import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  Icon: LucideIcon;
  iconColor?: string; // e.g. "text-red-500"
  confirmButtonClass?: string; // e.g. "bg-red-500 hover:bg-red-600"
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  Icon,
  iconColor = 'text-red-500',
  confirmButtonClass = 'bg-red-500 hover:bg-red-600',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-[150] flex flex-col items-center justify-center p-8 animate-fadeIn">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-sm w-full text-center space-y-6 animate-scaleIn">
        <Icon className={`w-12 h-12 mx-auto ${iconColor}`} />
        <div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-slate-400 text-sm">{message}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`py-3 px-4 rounded-xl text-white font-bold transition-all ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
