import React, { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  UploadCloud, Sparkles, Settings2, CheckCircle2, Download, Eye, RefreshCw,
  Trash2, ArrowRight, Plus, File, ChevronDown, ChevronUp, Mail, ShieldCheck,
  Archive, FileText, Check, X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBytes, formatDuration } from '../../utils/formatters';
import { FileItem, SupportedFormat, OutputFormat } from '../../types';
import { PRICING_PLANS } from '../../data/plans';
import { RefreshCw as RefreshCwIcon } from 'lucide-react';
import TemplateSelector from '../ai/TemplateSelector';
import AIEnhancementPanel from '../ai/AIEnhancementPanel';
import { AiEnhancements, AiTableOfContents } from '../../types';
import { zipConversionResults } from '../../services/converter';

function getOutputExt(fmt: OutputFormat): string {
  switch (fmt) {
    case 'pdf': return 'pdf';
    case 'docx': return 'docx';
    case 'html': return 'html';
    case 'md': return 'md';
    case 'txt': return 'txt';
    case 'xlsx': return 'xlsx';
    case 'csv': return 'csv';
    default: return 'pdf';
  }
}

const EXAMPLE_FILES = [
  {
    name: 'Invoice_Sample.docx', label: 'Invoice', desc: 'Document with line items',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    format: 'docx' as SupportedFormat, outputFormat: 'pdf', size: 24500,
    content: 'TAX INVOICE\n\nInvoice #: INV-2026-104\nDate: August 24, 2026\n\nBilled To:\nAcme Global Services\n100 Market Street, San Francisco, CA\n\nLine Items:\n1. Cloud Workspace Subscription — $1,200.00\n2. Document API Processing — $450.00\n3. Priority Onboarding — $350.00\n\nSubtotal: $2,000.00\nTax (8.5%): $170.00\nTotal Due: $2,170.00\n\nThank you for your business!'
  },
  {
    name: 'Financial_Report.xlsx', label: 'Financial Report', desc: 'Quarterly revenue breakdown',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    format: 'xlsx' as SupportedFormat, outputFormat: 'pdf', size: 38200,
    content: 'QUARTER,REVENUE,EXPENSES,NET_PROFIT,STATUS\nQ1-2026,$1,450,000,$920,000,$530,000,Completed\nQ2-2026,$1,820,000,$1,050,000,$770,000,Completed\nQ3-2026,$2,290,000,$1,180,000,$1,110,000,Active'
  },
  {
    name: 'Meeting_Notes.md', label: 'Meeting Notes', desc: 'Formatted notes & tasks',
    type: 'text/markdown', format: 'markdown' as SupportedFormat, outputFormat: 'pdf', size: 11200,
    content: '# Product Strategy & Roadmap\n\n## Objective\nShip a fast, clean document-to-PDF workflow.\n\n### Key Deliverables\n- Clean UI with high contrast typography\n- Accurate previews with page counts\n- Direct downloads with custom naming\n\n### Next Steps\n- Run usability testing\n- Finalize print stylesheets'
  },
  {
    name: 'Customer_Order.json', label: 'JSON Data', desc: 'Structured order record',
    type: 'application/json', format: 'json' as SupportedFormat, outputFormat: 'pdf', size: 6800,
    content: JSON.stringify({ orderId: "ORD-99824", status: "Confirmed", customer: { name: "Sarah Jenkins", tier: "Gold" }, items: [{ sku: "DSK-01", qty: 1, price: 799 }], total: 1337.04 }, null, 2)
  },
];

export const ConvertPage: React.FC = () => {
  const {
    user, activeFiles, selectedFile, setSelectedFile, isBatchMode, settings,
    updateSettings, isConverting, addFilesToQueue, removeFileFromQueue, clearQueue,
    convertSingleFile, convertAllActiveFiles, setPreviewModalFile,
    handleResendVerification, handleCheckVerification,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [outputFileNameInput, setOutputFileNameInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [zipEnabled, setZipEnabled] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [aiAppliedSummary, setAiAppliedSummary] = useState<string | null>(null);
  const [aiAppliedEnhancements, setAiAppliedEnhancements] = useState<AiEnhancements | null>(null);

  const planTier = user?.plan || 'free';
  const planInfo = PRICING_PLANS.find((p) => p.id === planTier) || PRICING_PLANS[0];
  const currentTargetFile = selectedFile || activeFiles[0] || null;

  useEffect(() => {
    if (currentTargetFile) {
      const base = currentTargetFile.name.replace(/\.[^/.]+$/, '');
      const ext = getOutputExt(settings.outputFormat);
      setOutputFileNameInput(`${base}.${ext}`);
      updateSettings({ outputFileName: `${base}.${ext}` });
    }
  }, [currentTargetFile?.id, currentTargetFile?.name, settings.outputFormat]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    if (e.dataTransfer.files?.length) addFilesToQueue(Array.from(e.dataTransfer.files));
  };
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) { addFilesToQueue(Array.from(e.target.files)); e.target.value = ''; }
  };
  const handleLoadExample = (ex: typeof EXAMPLE_FILES[0]) => {
    const blob = new Blob([ex.content], { type: ex.type });
    const file = new (window as any).File([blob], ex.name, { type: ex.type });
    addFilesToQueue([file]);
  };

  const handleConvert = async (fileItem: FileItem) => {
    await convertSingleFile(fileItem);
    try { confetti({ particleCount: 35, spread: 55, origin: { y: 0.7 }, colors: ['#2563EB', '#3B82F6', '#10B981', '#F59E0B'] }); } catch {}
  };

  const handleConvertAll = async () => {
    await convertAllActiveFiles();
    try { confetti({ particleCount: 60, spread: 75, origin: { y: 0.7 }, colors: ['#2563EB', '#3B82F6', '#10B981', '#F59E0B'] }); } catch {}
  };

  const completedCount = activeFiles.filter((f) => f.status === 'completed').length;
  const allCompleted = activeFiles.length > 0 && completedCount === activeFiles.length;

  const handleBulkDownload = async () => {
    if (zipEnabled && activeFiles.length > 1) {
      setIsZipping(true);
      try {
        const results = activeFiles
          .filter((f) => f.status === 'completed' && f.outputBlobUrl)
          .map((f) => ({
            name: f.name.replace(/\.[^/.]+$/, ''),
            blob: f.outputBlob!,
            ext: getOutputExt(f.outputFormat),
          }));
        const zip = await zipConversionResults(results);
        const a = document.createElement('a');
        a.href = zip.blobUrl;
        a.download = `File2Flow_Batch_${activeFiles.length}files.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e) {
        console.error('Zip error:', e);
      }
      setIsZipping(false);
    } else {
      activeFiles.forEach((item) => {
        if (item.outputBlobUrl) {
          const a = document.createElement('a');
          a.href = item.outputBlobUrl;
          a.download = item.name.replace(/\.[^/.]+$/, '') + '.' + getOutputExt(item.outputFormat);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      });
    }
  };

  const handleSelectAiTemplate = (template: string) => {
    const styles: Record<string, { margin: 'normal' | 'narrow' | 'wide'; orientation: 'portrait' | 'landscape'; quality: 'high' | 'standard' }> = {
      professional_report: { margin: 'normal', orientation: 'portrait', quality: 'high' },
      academic: { margin: 'wide', orientation: 'portrait', quality: 'high' },
      resume: { margin: 'narrow', orientation: 'portrait', quality: 'high' },
      invoice: { margin: 'normal', orientation: 'portrait', quality: 'standard' },
      minimal: { margin: 'wide', orientation: 'portrait', quality: 'standard' },
      modern: { margin: 'normal', orientation: 'landscape', quality: 'high' },
    };
    const s = styles[template];
    if (s) updateSettings(s);
  };

  const handleApplyAiEnhancements = (data: { summary?: string; enhancements?: AiEnhancements }) => {
    if (data.summary) setAiAppliedSummary(data.summary);
    if (data.enhancements) setAiAppliedEnhancements(data.enhancements);
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #F0F7FF 0%, #FFFFFF 50%, #F0F7FF 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        <input ref={fileInputRef} type="file" multiple onChange={handleFileInputChange} className="hidden"
          accept=".docx,.doc,.pptx,.ppt,.xlsx,.xls,.json,.png,.jpg,.jpeg,.webp,.gif,.svg,.md,.markdown,.html,.htm,.txt,.csv" />

        {/* Email Verification Banner */}
        {user && user.emailVerified === false && (
          <div className="p-4 rounded-xl flex items-center justify-between gap-4" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 shrink-0" style={{ color: '#D97706' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#92400E' }}>Verify your email</p>
                <p className="text-xs" style={{ color: '#B45309' }}>Check your inbox for a verification link.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleResendVerification} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ border: '1px solid #D97706', color: '#92400E' }}>
                <Mail className="w-3.5 h-3.5 inline mr-1" />Resend
              </button>
              <button onClick={handleCheckVerification} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ border: '1px solid #059669', color: '#047857' }}>
                <RefreshCwIcon className="w-3.5 h-3.5 inline mr-1" />Check
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display" style={{ color: '#0F172A' }}>Convert File</h1>
            <p className="text-base mt-1" style={{ color: '#64748B' }}>
              Upload, configure, and download — all in one place.
            </p>
          </div>
          {activeFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ border: '1px solid #E2E8F0', background: '#fff', color: '#334155' }}>
                <Plus className="w-5 h-5" /> Add Files
              </button>
              <button onClick={clearQueue} className="p-2 rounded-xl" style={{ color: '#94A3B8' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.backgroundColor = 'transparent'; }}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* STEP 1: UPLOAD */}
        {activeFiles.length === 0 && (
          <div className="space-y-6">
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="relative cursor-pointer p-16 rounded-2xl border-2 border-dashed transition-all text-center"
              style={{
                borderColor: isDragOver ? '#2563EB' : '#CBD5E1',
                background: isDragOver ? '#EFF6FF' : '#FFFFFF',
                boxShadow: isDragOver ? '0 0 0 4px rgba(37,99,235,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
              }}>
              <div className="max-w-lg mx-auto space-y-5">
                <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <UploadCloud className="w-10 h-10" style={{ color: '#2563EB' }} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold font-display" style={{ color: '#0F172A' }}>
                    {isDragOver ? 'Drop files here' : 'Drop your files here'}
                  </h3>
                  <p className="text-base" style={{ color: '#64748B' }}>
                    or <span className="font-semibold" style={{ color: '#2563EB' }}>click to browse</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {['DOCX', 'PPTX', 'XLSX', 'JSON', 'CSV', 'MD', 'HTML', 'PNG', 'JPG'].map((fmt) => (
                    <span key={fmt} className="px-3 py-1 rounded-md text-xs font-mono" style={{ background: '#F1F5F9', color: '#64748B' }}>{fmt}</span>
                  ))}
                </div>
                <p className="text-sm" style={{ color: '#94A3B8' }}>Up to {planInfo.maxFileSizeMB} MB per file</p>
              </div>
            </div>

            {/* Quick Examples */}
            <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>Try an example</h4>
                <span className="text-sm" style={{ color: '#94A3B8' }}>Click to test</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {EXAMPLE_FILES.map((ex) => (
                  <button key={ex.name} onClick={() => handleLoadExample(ex)}
                    className="p-4 rounded-xl text-left transition-all group flex items-start justify-between"
                    style={{ border: '1px solid #E2E8F0', background: '#FAFBFC' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.background = '#EFF6FF'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FAFBFC'; }}>
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-bold truncate" style={{ color: '#0F172A' }}>{ex.label}</p>
                      <p className="text-xs line-clamp-1 mt-1" style={{ color: '#64748B' }}>{ex.desc}</p>
                      <span className="inline-block text-xs font-mono uppercase mt-1.5" style={{ color: '#94A3B8' }}>
                        .{ex.format} · {formatBytes(ex.size)}
                      </span>
                    </div>
                    <Plus className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#94A3B8' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 & 3: WORKSPACE */}
        {activeFiles.length > 0 && (
          <div className="space-y-8">

            {/* Batch Bar */}
            {activeFiles.length > 1 && (
              <div className="p-5 rounded-2xl space-y-3" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                      {activeFiles.length} files
                    </span>
                    <span className="text-sm" style={{ color: '#64748B' }}>{completedCount} ready</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Zip toggle */}
                    <button onClick={() => setZipEnabled(!zipEnabled)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{
                        background: zipEnabled ? '#EFF6FF' : 'transparent',
                        color: zipEnabled ? '#2563EB' : '#64748B',
                        border: `1px solid ${zipEnabled ? '#BFDBFE' : '#E2E8F0'}`,
                      }}>
                      <Archive className="w-4 h-4" />
                      {zipEnabled ? 'ZIP On' : 'ZIP Off'}
                    </button>
                    {!allCompleted ? (
                      <button disabled={isConverting} onClick={handleConvertAll}
                        className="px-5 py-2.5 rounded-xl text-white text-sm font-bold flex items-center gap-1.5 transition-all"
                        style={{ background: '#2563EB' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#1D4ED8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#2563EB'; }}>
                        <Sparkles className="w-4 h-4" /> Convert all
                      </button>
                    ) : (
                      <button onClick={handleBulkDownload} disabled={isZipping}
                        className="px-5 py-2.5 rounded-xl text-white text-sm font-bold flex items-center gap-1.5 transition-all"
                        style={{ background: '#10B981' }}>
                        {isZipping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {isZipping ? 'Zipping...' : zipEnabled ? `Download ZIP (${completedCount})` : `Download all (${completedCount})`}
                      </button>
                    )}
                  </div>
                </div>

                {/* File list */}
                <div className="border-t pt-2" style={{ borderColor: '#F1F5F9' }}>
                  {activeFiles.map((fi) => {
                    const isSelected = selectedFile?.id === fi.id;
                    const isDone = fi.status === 'completed';
                    const isRunning = fi.status === 'converting';
                    return (
                      <div key={fi.id} onClick={() => setSelectedFile(fi)}
                        className="py-3 px-4 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all"
                        style={{ background: isSelected ? '#EFF6FF' : 'transparent', border: isSelected ? '1px solid #BFDBFE' : '1px solid transparent' }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-bold uppercase px-2.5 py-1 rounded font-mono" style={{ background: '#F1F5F9', color: '#64748B' }}>
                            {fi.format}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{fi.name}</p>
                            <span className="text-xs" style={{ color: '#94A3B8' }}>{formatBytes(fi.size)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          {fi.status === 'idle' && <span className="text-sm" style={{ color: '#94A3B8' }}>Waiting</span>}
                          {isRunning && (
                            <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#2563EB' }}>
                              <RefreshCw className="w-4 h-4 animate-spin" /> {fi.progress}%
                            </span>
                          )}
                          {isDone && (
                            <span className="text-sm font-semibold flex items-center gap-1" style={{ color: '#10B981' }}>
                              <CheckCircle2 className="w-4 h-4" /> Done
                            </span>
                          )}
                          {isDone && fi.outputBlobUrl && (
                            <a href={fi.outputBlobUrl} download={fi.name.replace(/\.[^/.]+$/, '') + '.' + getOutputExt(fi.outputFormat)}
                              onClick={(e) => e.stopPropagation()} className="p-2 rounded-lg" style={{ color: '#64748B' }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#10B981'; e.currentTarget.style.backgroundColor = '#F0FDF4'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.backgroundColor = 'transparent'; }}>
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); removeFileFromQueue(fi.id); }}
                            className="p-2 rounded-lg" style={{ color: '#94A3B8' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.backgroundColor = 'transparent'; }}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Main Workspace — 2 columns */}
            {currentTargetFile && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* LEFT: File Card + Convert */}
                <div className="lg:col-span-7 space-y-6 lg:sticky lg:top-28">
                  {/* File Card */}
                  <div className="p-6 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                          <File className="w-6 h-6" style={{ color: '#2563EB' }} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold truncate" style={{ color: '#0F172A' }}>{currentTargetFile.name}</h3>
                          <p className="text-sm" style={{ color: '#64748B' }}>
                            {formatBytes(currentTargetFile.size)} · <span className="uppercase font-semibold">{currentTargetFile.format}</span>
                          </p>
                        </div>
                      </div>
                      <button onClick={() => removeFileFromQueue(currentTargetFile.id)} className="p-2 rounded-lg" style={{ color: '#94A3B8' }}>
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Output Format Row */}
                    <div className="flex items-center gap-4 mb-5">
                      <span className="text-sm font-bold" style={{ color: '#334155' }}>Output:</span>
                      <div className="flex gap-2">
                        {(['pdf', 'html', 'md', 'txt', 'docx', 'xlsx', 'csv'] as const)
                          .filter((fmt) => {
                            const inputFmt = currentTargetFile.format;
                            if (fmt === inputFmt) return false;
                            if (fmt === 'md' && inputFmt === 'markdown') return false;
                            if (fmt === 'txt' && inputFmt === 'txt') return false;
                            if (fmt === 'html' && inputFmt === 'html') return false;
                            if (fmt === 'xlsx' && (inputFmt === 'xlsx' || inputFmt === 'csv')) return false;
                            if (fmt === 'csv' && inputFmt === 'csv') return false;
                            if (fmt === 'docx' && inputFmt === 'docx') return false;
                            return true;
                          })
                          .map((fmt) => (
                          <button key={fmt} onClick={() => updateSettings({ outputFormat: fmt })}
                            className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                            style={{
                              background: settings.outputFormat === fmt ? '#2563EB' : '#F1F5F9',
                              color: settings.outputFormat === fmt ? '#fff' : '#64748B',
                            }}>
                            {fmt.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Output Filename */}
                    <div className="mb-5">
                      <label className="block text-sm font-bold mb-1.5" style={{ color: '#334155' }}>Output filename</label>
                      <input type="text" value={outputFileNameInput}
                        onChange={(e) => { setOutputFileNameInput(e.target.value); updateSettings({ outputFileName: e.target.value }); }}
                        className="w-full px-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2"
                        style={{ borderColor: '#E2E8F0', background: '#FAFBFC', color: '#0F172A', '--tw-ring-color': '#2563EB40' } as any} />
                    </div>

                    {/* Progress */}
                    {currentTargetFile.status === 'converting' && (
                      <div className="p-4 rounded-xl mb-5" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                        <div className="flex items-center justify-between text-sm font-semibold mb-2" style={{ color: '#2563EB' }}>
                          <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Converting...</span>
                          <span>{currentTargetFile.progress}%</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: '#DBEAFE' }}>
                          <motion.div className="h-full rounded-full" style={{ background: '#2563EB', width: `${currentTargetFile.progress}%` }}
                            animate={{ width: `${currentTargetFile.progress}%` }} transition={{ duration: 0.3 }} />
                        </div>
                      </div>
                    )}

                    {/* Completed */}
                    {currentTargetFile.status === 'completed' && (
                      <div className="p-4 rounded-xl flex items-center justify-between mb-5" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                        <span className="text-sm font-semibold flex items-center gap-2" style={{ color: '#059669' }}>
                          <CheckCircle2 className="w-5 h-5" /> Ready · {currentTargetFile.pageCount} page{currentTargetFile.pageCount === 1 ? '' : 's'} · {formatBytes(currentTargetFile.outputSize || 0)}
                        </span>
                        {currentTargetFile.outputBlobUrl && (
                          <a href={currentTargetFile.outputBlobUrl}
                            download={outputFileNameInput || (currentTargetFile.name.replace(/\.[^/.]+$/, '') + '.' + getOutputExt(currentTargetFile.outputFormat))}
                            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold flex items-center gap-1.5"
                            style={{ background: '#10B981' }}>
                            <Download className="w-4 h-4" /> Download
                          </a>
                        )}
                      </div>
                    )}

                    {/* Convert Button */}
                    {currentTargetFile.status === 'idle' && (
                      <button disabled={isConverting} onClick={() => handleConvert(currentTargetFile)}
                        className="w-full py-4 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all"
                        style={{ background: '#2563EB' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#1D4ED8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#2563EB'; }}>
                        Convert to {settings.outputFormat.toUpperCase()} <ArrowRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Settings Toggle */}
                  <button onClick={() => setShowSettings(!showSettings)}
                    className="w-full flex items-center justify-between p-5 rounded-2xl transition-all"
                    style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center gap-2.5">
                      <Settings2 className="w-5 h-5" style={{ color: '#2563EB' }} />
                      <span className="text-sm font-bold" style={{ color: '#0F172A' }}>Output Settings</span>
                      <span className="text-xs" style={{ color: '#94A3B8' }}>
                        {settings.pageSize.toUpperCase()} · {settings.orientation} · {settings.quality}
                      </span>
                    </div>
                    {showSettings ? <ChevronUp className="w-5 h-5" style={{ color: '#94A3B8' }} /> : <ChevronDown className="w-5 h-5" style={{ color: '#94A3B8' }} />}
                  </button>

                  {/* Collapsible Settings */}
                  <AnimatePresence>
                    {showSettings && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                        <div className="p-6 space-y-5">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-bold mb-1.5" style={{ color: '#334155' }}>Page Size</label>
                              <div className="flex gap-1.5">
                                {(['a4', 'letter', 'legal'] as const).map((s) => (
                                  <button key={s} onClick={() => updateSettings({ pageSize: s })}
                                    className="flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all"
                                    style={{ background: settings.pageSize === s ? '#2563EB' : '#F1F5F9', color: settings.pageSize === s ? '#fff' : '#64748B' }}>
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-bold mb-1.5" style={{ color: '#334155' }}>Orientation</label>
                              <div className="flex gap-1.5">
                                {(['portrait', 'landscape'] as const).map((o) => (
                                  <button key={o} onClick={() => updateSettings({ orientation: o })}
                                    className="flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all"
                                    style={{ background: settings.orientation === o ? '#2563EB' : '#F1F5F9', color: settings.orientation === o ? '#fff' : '#64748B' }}>
                                    {o}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-bold mb-1.5" style={{ color: '#334155' }}>Margins</label>
                              <div className="flex gap-1.5">
                                {(['normal', 'narrow', 'wide'] as const).map((m) => (
                                  <button key={m} onClick={() => updateSettings({ margin: m })}
                                    className="flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all"
                                    style={{ background: settings.margin === m ? '#2563EB' : '#F1F5F9', color: settings.margin === m ? '#fff' : '#64748B' }}>
                                    {m}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-bold mb-1.5" style={{ color: '#334155' }}>Quality</label>
                              <div className="flex gap-1.5">
                                {(['high', 'standard'] as const).map((q) => (
                                  <button key={q} onClick={() => updateSettings({ quality: q })}
                                    className="flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all"
                                    style={{ background: settings.quality === q ? '#2563EB' : '#F1F5F9', color: settings.quality === q ? '#fff' : '#64748B' }}>
                                    {q}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <label className="block text-sm font-bold mb-1.5" style={{ color: '#334155' }}>Watermark</label>
                              <input type="text" placeholder="e.g. DRAFT" value={settings.watermarkText || ''}
                                onChange={(e) => updateSettings({ watermarkText: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1"
                                style={{ borderColor: '#E2E8F0', background: '#FAFBFC', color: '#0F172A', '--tw-ring-color': '#2563EB40' } as any} />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold pt-4" style={{ color: '#334155' }}>
                              <input type="checkbox" checked={settings.addPageNumbers}
                                onChange={(e) => updateSettings({ addPageNumbers: e.target.checked })}
                                className="rounded" style={{ accentColor: '#2563EB' }} />
                              Page numbers
                            </label>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* RIGHT: Preview + AI */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Preview */}
                  <div className="p-6 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold" style={{ color: '#0F172A' }}>Preview</h3>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setShowAiPanel(!showAiPanel)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                          style={{ background: showAiPanel ? '#2563EB' : '#EFF6FF', color: showAiPanel ? '#fff' : '#2563EB', border: `1px solid ${showAiPanel ? '#2563EB' : '#BFDBFE'}` }}>
                          <Sparkles className="w-4 h-4" /> AI
                        </button>
                        {currentTargetFile.status === 'completed' && (
                          <button onClick={() => setPreviewModalFile(currentTargetFile)} className="p-2 rounded-lg" style={{ color: '#64748B' }}>
                            <Eye className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="h-[400px] rounded-xl overflow-hidden flex items-center justify-center"
                      style={{ border: '1px solid #E2E8F0', background: '#FAFBFC' }}>
                      {currentTargetFile.status === 'completed' && currentTargetFile.outputBlobUrl ? (
                        <iframe src={`${currentTargetFile.outputBlobUrl}#toolbar=0&navpanes=0`}
                          title="Preview" className="w-full h-full border-0" />
                      ) : (
                        <div className="text-center p-8 space-y-3">
                          <Eye className="w-10 h-10 mx-auto" style={{ color: '#CBD5E1' }} />
                          <p className="text-sm font-semibold" style={{ color: '#64748B' }}>
                            {currentTargetFile.status === 'converting' ? 'Rendering...' : 'Preview after conversion'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Stats when done */}
                    {currentTargetFile.status === 'completed' && (
                      <div className="grid grid-cols-3 gap-3 text-center text-sm mt-4 p-3 rounded-xl" style={{ background: '#F8FAFC' }}>
                        <div><span className="block text-xs uppercase" style={{ color: '#94A3B8' }}>Pages</span><span className="font-bold" style={{ color: '#0F172A' }}>{currentTargetFile.pageCount || 1}</span></div>
                        <div><span className="block text-xs uppercase" style={{ color: '#94A3B8' }}>Size</span><span className="font-bold" style={{ color: '#0F172A' }}>{formatBytes(currentTargetFile.outputSize || 0)}</span></div>
                        <div><span className="block text-xs uppercase" style={{ color: '#94A3B8' }}>Time</span><span className="font-bold" style={{ color: '#0F172A' }}>{formatDuration(currentTargetFile.conversionTimeMs || 0)}</span></div>
                      </div>
                    )}
                  </div>

                  {/* AI Panels */}
                  {showAiPanel && currentTargetFile.status !== 'converting' && (
                    <TemplateSelector file={currentTargetFile.file} fileName={currentTargetFile.name} onSelectTemplate={handleSelectAiTemplate} />
                  )}
                  {showAiPanel && currentTargetFile.status !== 'converting' && (
                    <AIEnhancementPanel file={currentTargetFile.file} fileName={currentTargetFile.name} onApplyEnhancements={handleApplyAiEnhancements} />
                  )}

                  {/* AI Applied Tags */}
                  {(aiAppliedSummary || aiAppliedEnhancements) && (
                    <div className="p-4 rounded-xl flex items-center gap-2.5" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                      <Sparkles className="w-4 h-4" style={{ color: '#2563EB' }} />
                      <span className="text-sm font-semibold" style={{ color: '#2563EB' }}>AI enhancements applied</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
