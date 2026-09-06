import React, { useState, useCallback, useRef } from 'react';
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
    accept: '.docx,.xlsx,.pptx,.html,.csv,.json,.pdf,.odt,.ods,.odp,.rtf',
    endpoint: '/api/convert/file',
    fields: [
      {
        name: 'targetFormat',
        label: 'Convert to',
        type: 'select',
        defaultValue: 'pdf',
        options: [
          { value: 'pdf', label: 'PDF' },
          { value: 'docx', label: 'DOCX (Word)' },
          { value: 'xlsx', label: 'XLSX (Excel)' },
          { value: 'html', label: 'HTML' },
        ],
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
  const [fields, setFields] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = TOOLS[activePage];
  if (!config) return null;

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

      // Add form fields
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
      const filename = filenameMatch?.[1] || files[0].name.replace(/\.[^/.]+$/, '') + '.pdf';

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
      {/* Header */}
      <button
        onClick={() => setActivePage('tools')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6 text-sm"
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{config.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{config.description}</p>
      </div>

      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          files.length > 0
            ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={config.accept}
          multiple={config.multiple}
          onChange={handleFileChange}
          className="hidden"
        />
        {files.length > 0 ? (
          <div>
            <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
            <p className="font-medium text-gray-900 dark:text-white">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {files.map(f => f.name).join(', ')}
            </p>
          </div>
        ) : (
          <div>
            <Upload size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="font-medium text-gray-900 dark:text-white">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {config.accept.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')}
            </p>
          </div>
        )}
      </div>

      {/* Form Fields */}
      {config.fields && config.fields.length > 0 && (
        <div className="mt-6 space-y-4">
          {config.fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select
                  value={fields[field.name] || field.defaultValue || ''}
                  onChange={e => setFields(prev => ({ ...prev, [field.name]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Process Button */}
      <button
        onClick={handleProcess}
        disabled={files.length === 0 || status === 'processing'}
        className="mt-6 w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ backgroundColor: config.color }}
      >
        {status === 'processing' ? (
          <>
            <Loader2 size={20} className="animate-spin" /> Processing...
          </>
        ) : (
          <>
            <Upload size={20} /> Process {files.length > 1 ? `${files.length} Files` : 'File'}
          </>
        )}
      </button>

      {/* Result */}
      {status === 'done' && result && (
        <div className="mt-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-green-500" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Done!</p>
                <p className="text-sm text-green-600 dark:text-green-400">{result.filename}</p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
            >
              <Download size={16} /> Download
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">Failed</p>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
