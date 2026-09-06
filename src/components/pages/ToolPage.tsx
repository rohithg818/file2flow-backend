import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Upload, Download, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/^\uFEFF/, '');

interface ToolConfig {
  id: string;
  title: string;
  description: string;
  color: string;
  accept: string;
  endpoint: string;
  multiple?: boolean;
  fields?: Array<{
    name: string;
    label: string;
    type: 'text' | 'select' | 'number';
    options?: Array<{ value: string; label: string }>;
    defaultValue?: string;
    placeholder?: string;
  }>;
}

const ACCEPT_BY_FORMAT: Record<string, string> = {
  pdf: '.pdf',
  docx: '.docx,.doc',
  xlsx: '.xlsx,.xls',
  pptx: '.pptx,.ppt',
  html: '.html,.htm',
  csv: '.csv',
  md: '.md',
  txt: '.txt',
  json: '.json',
  image: '.jpg,.jpeg,.png,.gif,.webp,.bmp',
};

const ALL_CONVERT_ACCEPT = '.pdf,.docx,.xlsx,.pptx,.html,.csv,.json,.odt,.ods,.odp,.rtf,.txt,.md,.jpg,.jpeg,.png,.gif,.webp';

const ALL_CONVERT_TARGETS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX (Word)' },
  { value: 'xlsx', label: 'XLSX (Excel)' },
  { value: 'html', label: 'HTML' },
  { value: 'txt', label: 'TXT (Plain text)' },
  { value: 'md', label: 'Markdown' },
  { value: 'csv', label: 'CSV' },
  { value: 'pptx', label: 'PPTX (PowerPoint)' },
];

const TOOLS: Record<string, ToolConfig> = {
  'tools-pdf-compress': {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Reduce PDF file size while maintaining quality',
    color: '#059669',
    accept: '.pdf',
    endpoint: '/api/pdf/compress',
    fields: [
      {
        name: 'level',
        label: 'Compression Level',
        type: 'select',
        defaultValue: 'medium',
        options: [
          { value: 'low', label: 'Low — Minimal compression, best quality' },
          { value: 'medium', label: 'Medium — Balanced (recommended)' },
          { value: 'high', label: 'High — Maximum compression' },
        ],
      },
    ],
  },
  'tools-pdf-split': {
    id: 'split',
    title: 'Split PDF',
    description: 'Extract specific pages from a PDF',
    color: '#dc2626',
    accept: '.pdf',
    endpoint: '/api/pdf/split',
    fields: [
      {
        name: 'ranges',
        label: 'Page Ranges',
        type: 'text',
        placeholder: 'e.g. 1-3,5,7-10',
      },
    ],
  },
  'tools-pdf-merge': {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine multiple PDFs into one document',
    color: '#2563eb',
    accept: '.pdf',
    endpoint: '/api/pdf/merge',
    multiple: true,
  },
  'tools-pdf-rotate': {
    id: 'rotate',
    title: 'Rotate PDF',
    description: 'Rotate pages by 90°, 180°, or 270°',
    color: '#7c3aed',
    accept: '.pdf',
    endpoint: '/api/pdf/rotate',
    fields: [
      {
        name: 'rotation',
        label: 'Rotation',
        type: 'select',
        defaultValue: '90',
        options: [
          { value: '90', label: '90° Clockwise' },
          { value: '180', label: '180°' },
          { value: '270', label: '270° Clockwise' },
        ],
      },
      {
        name: 'pages',
        label: 'Pages (optional)',
        type: 'text',
        placeholder: 'e.g. 1,3,5 (leave empty for all)',
      },
    ],
  },
  'tools-pdf-protect': {
    id: 'protect',
    title: 'Protect PDF',
    description: 'Add password protection to a PDF',
    color: '#d97706',
    accept: '.pdf',
    endpoint: '/api/pdf/protect',
    fields: [
      {
        name: 'password',
        label: 'Password',
        type: 'text',
        placeholder: 'Enter password',
      },
    ],
  },
  'tools-convert': {
    id: 'convert',
    title: 'Convert to/from PDF',
    description: 'Convert any document format to PDF or vice versa',
    color: '#2563eb',
    accept: ALL_CONVERT_ACCEPT,
    endpoint: '/api/convert/file',
    fields: [
      {
        name: 'targetFormat',
        label: 'Convert to',
        type: 'select',
        defaultValue: 'pdf',
        options: ALL_CONVERT_TARGETS,
      },
    ],
  },
  'tools-json': {
    id: 'json',
    title: 'JSON → PDF',
    description: 'Convert JSON data into a professional PDF report',
    color: '#7c3aed',
    accept: '.json',
    endpoint: '/api/convert/json',
  },
};

export function ToolPage() {
  const { activePage, setActivePage } = useApp();
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'processing') {
      setElapsed(0);
      setProgress(5);
      setStage('Uploading...');
      timerRef.current = setInterval(() => {
        setElapsed(e => e + 1);
        setProgress(p => {
          const sec = elapsed + 1;
          if (sec < 5) { setStage('Uploading...'); return Math.min(p + 8, 20); }
          if (sec < 15) { setStage('Server cold-starting (warming up)...'); return Math.min(p + 2, 40); }
          if (sec < 30) { setStage('Converting...'); return Math.min(p + 3, 70); }
          setStage('Finalizing...'); return Math.min(p + 1, 95);
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (status === 'done') { setProgress(100); setStage('Done!'); }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const pageKey = activePage.includes('--') ? activePage.split('--')[0] : activePage;
  const convertPreset = (() => {
    if (!activePage.includes('--')) return null;
    const suffix = activePage.split('--')[1];
    if (!suffix) return null;
    const parts = suffix.split('-to-');
    if (parts.length === 2) return { from: parts[0], to: parts[1] };
    return null;
  })();

  const [fields, setFields] = useState<Record<string, string>>(() => {
    const cfg = TOOLS[pageKey];
    const initial: Record<string, string> = {};
    cfg?.fields?.forEach(f => {
      if (convertPreset?.to && f.name === 'targetFormat') {
        initial[f.name] = convertPreset.to;
      } else if (f.defaultValue) {
        initial[f.name] = f.defaultValue;
      }
    });
    return initial;
  });

  const config = TOOLS[pageKey];
  if (!config) return null;

  const acceptFilter = convertPreset?.from
    ? ACCEPT_BY_FORMAT[convertPreset.from] || config.accept
    : config.accept;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    setStatus('idle');
    setResult(null);
    setError('');
  };

  const handleProcess = useCallback(async () => {
    if (files.length === 0) return;

    setStatus('processing');
    setError('');

    try {
      const formData = new FormData();

      if (config.multiple) {
        files.forEach(f => formData.append('files', f));
      } else {
        formData.append('file', files[0]);
      }

      for (const [key, value] of Object.entries(fields)) {
        if (value) formData.append(key, value);
      }

      const response = await fetch(`${API_URL}${config.endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Processing failed' }));
        throw new Error(err.error || `Server returned ${response.status}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const targetFmt = fields.targetFormat || 'pdf';
      const filename = filenameMatch?.[1] || files[0].name.replace(/\.[^/.]+$/, '') + '.' + targetFmt;

      setResult({ blob, filename });
      setStatus('done');
    } catch (err: any) {
      setError(err.message || 'Processing failed');
      setStatus('error');
    }
  }, [files, fields, config]);

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <button
        onClick={() => setActivePage('tools')}
        className="flex items-center gap-2 mb-6 text-sm"
        style={{ color: '#64748B' }}
      >
        <ArrowLeft size={16} /> Back to Tools
      </button>

      <div className="text-center mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: config.color + '15', color: config.color }}
        >
          <Upload size={32} />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>{config.title}</h1>
        <p className="mt-1" style={{ color: '#64748B' }}>{config.description}</p>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all"
        style={{
          borderColor: files.length > 0 ? '#34D399' : '#CBD5E1',
          background: files.length > 0 ? '#F0FDF4' : '#FFFFFF',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptFilter}
          multiple={config.multiple}
          onChange={handleFileChange}
          className="hidden"
        />
        {files.length > 0 ? (
          <div>
            <CheckCircle size={32} className="mx-auto mb-2" style={{ color: '#10B981' }} />
            <p className="font-medium" style={{ color: '#0F172A' }}>
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </p>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>
              {files.map(f => f.name).join(', ')}
            </p>
          </div>
        ) : (
          <div>
            <Upload size={32} className="mx-auto mb-2" style={{ color: '#94A3B8' }} />
            <p className="font-medium" style={{ color: '#0F172A' }}>
              Click to upload or drag and drop
            </p>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>
              {convertPreset?.from
                ? `${convertPreset.from.toUpperCase()} files`
                : config.accept.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')
              }
            </p>
          </div>
        )}
      </div>

      {config.fields && config.fields.length > 0 && (
        <div className="mt-6 space-y-4">
          {config.fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1" style={{ color: '#334155' }}>
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select
                  value={fields[field.name] || field.defaultValue || ''}
                  onChange={e => setFields(prev => ({ ...prev, [field.name]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ borderColor: '#E2E8F0', background: '#FFFFFF', color: '#0F172A' }}
                >
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={fields[field.name] || ''}
                  onChange={e => setFields(prev => ({ ...prev, [field.name]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ borderColor: '#E2E8F0', background: '#FFFFFF', color: '#0F172A' }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleProcess}
        disabled={files.length === 0 || status === 'processing'}
        className="mt-6 w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1"
        style={{ backgroundColor: config.color }}
      >
        {status === 'processing' ? (
          <>
            <div className="flex items-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              <span>{stage} {elapsed}s</span>
            </div>
            <div className="w-full max-w-xs bg-white/20 rounded-full h-1.5 mt-1">
              <div className="bg-white rounded-full h-1.5 transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs opacity-80">{progress}%</span>
          </>
        ) : (
          <>
            <Upload size={20} /> Process {files.length > 1 ? `${files.length} Files` : 'File'}
          </>
        )}
      </button>

      {status === 'done' && result && (
        <div className="mt-6 p-4 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} style={{ color: '#10B981' }} />
              <div>
                <p className="font-medium" style={{ color: '#065F46' }}>Done!</p>
                <p className="text-sm" style={{ color: '#059669' }}>{result.filename}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setStatus('idle'); setResult(null); setFiles([]); setError(''); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium"
                style={{ background: '#E0E7FF', color: '#3730A3' }}
              >
                <Upload size={16} /> Convert another
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition text-sm font-medium"
                style={{ background: '#10B981' }}
              >
                <Download size={16} /> Download
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-6 p-4 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div className="flex items-center gap-3">
            <AlertCircle size={20} style={{ color: '#EF4444' }} />
            <div>
              <p className="font-medium" style={{ color: '#991B1B' }}>Failed</p>
              <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
