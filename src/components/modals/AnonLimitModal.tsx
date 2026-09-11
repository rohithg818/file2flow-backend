import React from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';

interface AnonLimitModalProps {
  open: boolean;
  onClose: () => void;
  onSignUp: () => void;
}

export function AnonLimitModal({ open, onClose, onSignUp }: AnonLimitModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-purple-50 to-blue-50">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/80 transition"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Free Trials Used</h3>
              <p className="text-sm text-slate-500">You've used all 4 free conversions</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            You've used your 4 free JSON→PDF conversions. Create a free account to keep converting — no credit card needed.
          </p>

          <button
            onClick={onSignUp}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
          >
            Sign Up Free
            <ArrowRight size={16} />
          </button>

          <button
            onClick={onClose}
            className="w-full mt-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
