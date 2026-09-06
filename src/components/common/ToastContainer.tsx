import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ToastContainer: React.FC = () => {
 const { toasts, removeToast } = useApp();

 if (toasts.length === 0) return null;

 return (
 <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
 {toasts.map((toast) => {
 const icons = {
 success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
 error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
 warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
 info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
 };

 const borders = {
 success: 'border-emerald-200 bg-emerald-50/95/95 text-emerald-950',
 error: 'border-rose-200 bg-rose-50/95/95 text-rose-950',
 warning: 'border-amber-200 bg-amber-50/95/95 text-amber-950',
 info: 'border-blue-200 bg-blue-50/95/95 text-blue-950',
 };

 return (
 <div
 key={toast.id}
 id={`toast-${toast.id}`}
 className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 duration-200 ${borders[toast.type]}`}
 >
 {icons[toast.type]}
 <div className="flex-1 text-xs">
 <p className="font-bold leading-tight">{toast.title}</p>
 {toast.message && (
 <p className="mt-1 text-slate-600 leading-snug">
 {toast.message}
 </p>
 )}
 </div>
 <button
 onClick={() => removeToast(toast.id)}
 className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
 aria-label="Dismiss toast"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 );
 })}
 </div>
 );
};
