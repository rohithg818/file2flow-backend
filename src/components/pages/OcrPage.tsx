import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Upload, ArrowLeft, Loader2, Copy, Check, FileText } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/^\uFEFF/, '');

export function OcrPage() {
  const { setActivePage } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ markdown: string; pages: Array<{ index: number; markdown: string }> } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcess = async () => {
    if (!file) return;
    setStatus('processing');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/api/ocr`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'OCR failed' }));
        throw new Error(data.error || `OCR failed (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
      setStatus('done');
    } catch (err: any) {
      setError(err.message || 'OCR failed');
      setStatus('error');
    }
  };

  const handleCopy = async () => {
    if (!result?.markdown) return;
    await navigator.clipboard.writeText(result.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    if (!result?.markdown) return;
    const blob = new Blob([result.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (file?.name?.replace(/\.[^/.]+$/, '') || 'ocr') + '.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxt = () => {
    if (!result?.markdown) return;
    const blob = new Blob([result.markdown], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (file?.name?.replace(/\.[^/.]+$/, '') || 'ocr') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => setActivePage('tools')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6 transition"
      >
        <ArrowLeft size={16} /> Back to Tools
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-100 mb-4">
          <FileText size={32} className="text-purple-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">OCR — Extract Text</h1>
        <p className="text-sm text-slate-500 mt-1">
          Extract text from PDFs and images using Mistral AI OCR. Supports 170+ languages.
        </p>
      </div>

      {status === 'idle' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />

          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-12 cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition"
            >
              <Upload size={40} className="mx-auto text-slate-400 mb-3" />
              <p className="font-semibold text-slate-700">Drop a PDF or image here</p>
              <p className="text-sm text-slate-400 mt-1">or click to browse</p>
            </div>
          ) : (
            <div>
              <p className="font-medium text-slate-800 mb-1">{file.name}</p>
              <p className="text-sm text-slate-400 mb-4">{(file.size / 1024).toFixed(1)} KB</p>
              <button
                onClick={handleProcess}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition"
              >
                Extract Text
              </button>
              <button
                onClick={() => { setFile(null); setResult(null); }}
                className="ml-3 px-4 py-3 text-slate-500 hover:text-slate-800 transition"
              >
                Choose different file
              </button>
            </div>
          )}
        </div>
      )}

      {status === 'processing' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Loader2 size={40} className="mx-auto text-purple-600 animate-spin mb-4" />
          <p className="font-semibold text-slate-700">Running OCR...</p>
          <p className="text-sm text-slate-400 mt-1">This may take a moment for large documents</p>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center">
          <p className="font-semibold text-red-600 mb-2">Error</p>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button
            onClick={() => { setStatus('idle'); setResult(null); setError(''); }}
            className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium hover:bg-slate-200 transition"
          >
            Try Again
          </button>
        </div>
      )}

      {status === 'done' && result && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-slate-600">
                {result.pages.length} page{result.pages.length !== 1 ? 's' : ''} extracted
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 rounded-lg hover:bg-slate-200 transition"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownloadMd}
                className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg hover:bg-slate-200 transition"
              >
                Download .md
              </button>
              <button
                onClick={handleDownloadTxt}
                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Download .txt
              </button>
            </div>
          </div>

          {result.pages.map((page) => (
            <div key={page.index} className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Page {page.index + 1}</h3>
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {page.markdown}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
