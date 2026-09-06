import React from 'react';
import { X, Download, FileText, CheckCircle2, Clock, HardDrive, Layers, ShieldCheck, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBytes, formatDuration } from '../../utils/formatters';

export const OutputPreviewModal: React.FC = () => {
 const { previewModalFile, setPreviewModalFile } = useApp();

 if (!previewModalFile) return null;

 const pdfUrl = previewModalFile.outputBlobUrl;
 const outputFmt = previewModalFile.outputFormat;
 const ext = outputFmt === 'pdf' ? 'pdf' : outputFmt === 'docx' ? 'docx' : outputFmt === 'html' ? 'html' : outputFmt === 'md' ? 'md' : 'txt';
 const downloadFileName = previewModalFile.name.replace(/\.[^/.]+$/, '') + '.' + ext;
 const isPdf = outputFmt === 'pdf';

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 font-sans">
 <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
 
 {/* Header */}
 <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between font-mono-code">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-[#2563EB]/80 flex items-center justify-center shadow-md shadow-[#2563EB]/20 border border-[#2563EB]/30">
 <FileText className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display truncate max-w-md">
 {downloadFileName}
 </h3>
 <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
 {isPdf && (
 <>
 <span className="flex items-center gap-1 text-emerald-600 font-bold">
 <CheckCircle2 className="w-3.5 h-3.5" /> ISO 32000-2 Ready
 </span>
 <span>•</span>
 </>
 )}
 <span className="flex items-center gap-1">
 <Layers className="w-3.5 h-3.5 text-[#2563EB]" /> {previewModalFile.pageCount || 1} Page(s)
 </span>
 <span>•</span>
 <span className="flex items-center gap-1">
 <HardDrive className="w-3.5 h-3.5 text-orange-500" /> {formatBytes(previewModalFile.outputSize || 0)}
 </span>
 {previewModalFile.conversionTimeMs && (
 <>
 <span>•</span>
 <span className="flex items-center gap-1 text-slate-400">
 <Clock className="w-3.5 h-3.5" /> {formatDuration(previewModalFile.conversionTimeMs)}
 </span>
 </>
 )}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {pdfUrl && (
 <a
 href={pdfUrl}
 download={downloadFileName}
 className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-sm transition-all"
 >
 <Download className="w-3.5 h-3.5" />
 Download {outputFmt.toUpperCase()}
 </a>
 )}
 <button
 onClick={() => setPreviewModalFile(null)}
 className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>

 {/* Content Body: Embedded IFrame / Previewer */}
 <div className="flex-1 bg-slate-100/80 relative overflow-hidden flex items-center justify-center p-2 sm:p-4">
 {pdfUrl ? (
 <iframe
 src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
  title={`${outputFmt.toUpperCase()} Document Preview`}
 className="w-full h-full rounded-xl border border-slate-200 bg-white shadow-inner"
 />
 ) : (
 <div className="text-center space-y-3 p-8 font-mono-code">
 <FileText className="w-12 h-12 text-slate-300 mx-auto" />
 <p className="text-sm text-slate-500">Preview buffer unavailable for this payload format.</p>
 </div>
 )}
 </div>

 {/* Footer info bar */}
 <div className="px-6 py-3 border-t border-slate-200 bg-white text-xs font-mono-code text-slate-500 flex items-center justify-between">
 <span>Source: <strong className="text-slate-700">{previewModalFile.name}</strong> ({formatBytes(previewModalFile.size)})</span>
 <span className="text-[11px] text-[#2563EB] font-bold">Clean Document Output</span>
 </div>

 </div>
 </div>
 );
};
