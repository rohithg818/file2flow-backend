import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, Loader2, Copy, Check, Languages } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/^\uFEFF/, '');

interface Lang {
  code: string;
  name: string;
}

export function TranslatePage() {
  const { setActivePage } = useApp();
  const [languages, setLanguages] = useState<Lang[]>([]);
  const [sourceLang, setSourceLang] = useState('');
  const [targetLang, setTargetLang] = useState('es');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/translate/languages`)
      .then(r => r.json())
      .then(d => setLanguages(d.languages || []))
      .catch(() => {
        setLanguages([
          { code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' },
          { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
          { code: 'it', name: 'Italian' }, { code: 'pt', name: 'Portuguese' },
          { code: 'zh', name: 'Chinese' }, { code: 'ja', name: 'Japanese' },
          { code: 'ko', name: 'Korean' }, { code: 'ar', name: 'Arabic' },
          { code: 'hi', name: 'Hindi' }, { code: 'ru', name: 'Russian' },
        ]);
      });
  }, []);

  const handleTranslate = async () => {
    if (!inputText.trim() || !targetLang) return;
    setStatus('processing');
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/translate/translate`, {
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
        <h1 className="text-2xl font-bold text-slate-900">Translate Text</h1>
        <p className="text-sm text-slate-500 mt-1">
          Translate text between 30+ languages using AI. Powered by Mistral.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        {/* Language selectors */}
        <div className="flex items-center gap-3 mb-4">
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Auto-detect</option>
            {languages.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>

          <button
            onClick={handleSwap}
            className="px-3 py-2 text-slate-400 hover:text-blue-600 transition"
            title="Swap languages"
          >
            ⇄
          </button>

          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {languages.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* Text areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to translate..."
              className="w-full h-64 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{inputText.length} characters</p>
          </div>
          <div className="relative">
            <textarea
              value={outputText}
              readOnly
              placeholder="Translation will appear here..."
              className="w-full h-64 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none bg-slate-50"
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

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            {status === 'error' && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
          <button
            onClick={handleTranslate}
            disabled={!inputText.trim() || !targetLang || status === 'processing'}
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
