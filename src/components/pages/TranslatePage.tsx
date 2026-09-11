import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, Loader2, Copy, Check, Languages, Upload, FileText, ArrowRightLeft, X } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/^\uFEFF/, '');

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'cs', name: 'Czech' },
  { code: 'ro', name: 'Romanian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'el', name: 'Greek' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'tl', name: 'Filipino' },
  { code: 'he', name: 'Hebrew' },
];

export function TranslatePage() {
  const { setActivePage } = useApp();
  const [sourceLang, setSourceLang] = useState('');
  const [targetLang, setTargetLang] = useState('es');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [file, setFile] = useState<File | null>(null);
  const [fileText, setFileText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setExtracting(true);
    setError('');

    try {
      if (f.type === 'text/plain' || f.name.endsWith('.txt') || f.name.endsWith('.md')) {
        const text = await f.text();
        setFileText(text);
        setInputText(text);
      } else {
        const formData = new FormData();
        formData.append('file', f);
        const res = await fetch(`${API_URL}/api/ocr`, { method: 'POST', body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to read file' }));
          throw new Error(data.error || 'Failed to extract text from file');
        }
        const data = await res.json();
        const text = data.markdown || '';
        setFileText(text);
        setInputText(text);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to read file');
    } finally {
      setExtracting(false);
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim() || !targetLang) return;
    setStatus('processing');
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          targetLanguage: targetLang,
          sourceLanguage: sourceLang || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Translation failed' }));
        throw new Error(data.error || `Translation failed (${res.status})`);
      }

      const data = await res.json();
      setOutputText(data.translatedText);
      setStatus('done');
    } catch (err: any) {
      setError(err.message || 'Translation failed');
      setStatus('error');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwap = () => {
    if (sourceLang && outputText) {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
      setInputText(outputText);
      setOutputText('');
      setStatus('idle');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => setActivePage('tools')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6 transition"
      >
        <ArrowLeft size={16} /> Back to Tools
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-4">
          <Languages size={32} className="text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Translate</h1>
        <p className="text-sm text-slate-500 mt-1">
          Translate text or files to 30+ languages. Powered by Mistral AI.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        {/* Mode toggle */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setMode('text')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === 'text' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Paste Text
          </button>
          <button
            onClick={() => setMode('file')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === 'file' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Upload File
          </button>
        </div>

        {/* Language selectors */}
        <div className="flex items-center gap-3 mb-4">
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Auto-detect</option>
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>

          <button
            onClick={handleSwap}
            className="p-2 text-slate-400 hover:text-blue-600 transition rounded-lg hover:bg-blue-50"
            title="Swap languages"
          >
            <ArrowRightLeft size={18} />
          </button>

          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* Input area */}
        {mode === 'text' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text to translate..."
                className="w-full h-56 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{inputText.length} characters</p>
            </div>
            <div className="relative">
              <textarea
                value={outputText}
                readOnly
                placeholder="Translation will appear here..."
                className="w-full h-56 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none bg-slate-50"
              />
              {outputText && (
                <button
                  onClick={handleCopy}
                  className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 transition"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.md,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload size={36} className="mx-auto text-slate-400 mb-3" />
                <p className="font-semibold text-slate-700">Drop a file here</p>
                <p className="text-sm text-slate-400 mt-1">PDF, images, TXT, MD, DOCX — text will be extracted automatically</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">{file.name}</span>
                    <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button
                    onClick={() => { setFile(null); setFileText(''); setInputText(''); setOutputText(''); setStatus('idle'); }}
                    className="p-1 text-slate-400 hover:text-slate-700 transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                {extracting && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 size={16} className="animate-spin" />
                    Extracting text from file...
                  </div>
                )}

                {fileText && !extracting && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Extracted text</p>
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="w-full h-56 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="relative">
                      <p className="text-xs font-medium text-slate-500 mb-1">Translation</p>
                      <textarea
                        value={outputText}
                        readOnly
                        placeholder="Translation will appear here..."
                        className="w-full h-56 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none bg-slate-50"
                      />
                      {outputText && (
                        <button
                          onClick={handleCopy}
                          className="absolute top-7 right-3 p-1.5 text-slate-400 hover:text-slate-700 transition"
                        >
                          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            {status === 'error' && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
          <button
            onClick={handleTranslate}
            disabled={!inputText.trim() || !targetLang || status === 'processing' || extracting}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {status === 'processing' ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Translating...
              </>
            ) : (
              'Translate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
