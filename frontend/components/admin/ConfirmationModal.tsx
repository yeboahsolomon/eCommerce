import React from "react";
import { AlertTriangle, CheckCircle, X } from "lucide-react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
  children?: React.ReactNode;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isDangerous = false,
  children,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDangerous ? "text-red-400" : "text-white"}`}>
            {isDangerous ? <AlertTriangle className="w-5 h-5" /> : null}
            {title}
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {message && <p className="text-sm text-slate-300 mb-6">{message}</p>}
        
        {children && <div className="mb-6">{children}</div>}

        <div className="flex gap-3 justify-end">
          <button 
            onClick={onCancel} 
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-lg flex items-center gap-2 ${
              isDangerous 
                ? "bg-red-600 hover:bg-red-700 shadow-red-600/20" 
                : "bg-green-600 hover:bg-green-700 shadow-green-600/20"
            }`}
          >
            {isDangerous && <AlertTriangle className="w-4 h-4" />}
            {!isDangerous && <CheckCircle className="w-4 h-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
