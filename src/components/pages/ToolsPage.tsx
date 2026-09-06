import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileDown,
  FileUp,
  Scissors,
  Merge,
  RotateCw,
  Lock,
  ArrowRightLeft,
  FileJson,
  FileSpreadsheet,
  FileText,
  Image,
  File,
  Zap,
  Shield,
  FileCode,
  Type,
  Code,
  Presentation,
} from 'lucide-react';

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}

function ToolCard({ icon, title, description, color, onClick }: ToolCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-3 p-6 rounded-2xl border hover:border-blue-400 hover:shadow-lg transition-all duration-200 cursor-pointer text-center"
      style={{ background: 'rgba(255,255,255,0.8)', borderColor: '#E2E8F0', backdropFilter: 'blur(20px)' }}
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
        style={{ backgroundColor: color + '15', color }}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-sm" style={{ color: '#0F172A' }}>{title}</h3>
        <p className="text-xs mt-1" style={{ color: '#64748B' }}>{description}</p>
      </div>
    </button>
  );
}

function ToolSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
        <div className="w-1.5 h-5 rounded-full" style={{ background: '#2563EB' }} />
        {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {children}
      </div>
    </div>
  );
}

export function ToolsPage() {
  const { setActivePage } = useApp();

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3" style={{ color: '#0F172A' }}>
          All PDF & Document Tools
        </h1>
        <p className="max-w-xl mx-auto" style={{ color: '#64748B' }}>
          Free online tools to convert, compress, merge, split, and edit your documents.
          Any format to any format — powered by LibreOffice and Chromium.
        </p>
      </div>

      {/* Organize PDF */}
      <ToolSection title="Organize PDF">
        <ToolCard
          icon={<Merge size={28} />}
          title="Merge PDF"
          description="Combine multiple PDFs"
          color="#2563eb"
          onClick={() => setActivePage('tools-pdf-merge')}
        />
        <ToolCard
          icon={<Scissors size={28} />}
          title="Split PDF"
          description="Extract pages from PDF"
          color="#dc2626"
          onClick={() => setActivePage('tools-pdf-split')}
        />
        <ToolCard
          icon={<RotateCw size={28} />}
          title="Rotate PDF"
          description="Rotate or reorder pages"
          color="#7c3aed"
          onClick={() => setActivePage('tools-pdf-rotate')}
        />
      </ToolSection>

      {/* Optimize PDF */}
      <ToolSection title="Optimize PDF">
        <ToolCard
          icon={<Zap size={28} />}
          title="Compress PDF"
          description="Reduce file size"
          color="#059669"
          onClick={() => setActivePage('tools-pdf-compress')}
        />
        <ToolCard
          icon={<Lock size={28} />}
          title="Protect PDF"
          description="Add or remove password"
          color="#d97706"
          onClick={() => setActivePage('tools-pdf-protect')}
        />
      </ToolSection>

      {/* Convert to PDF */}
      <ToolSection title="Convert to PDF">
        <ToolCard
          icon={<FileText size={28} />}
          title="DOCX → PDF"
          description="Word to PDF"
          color="#2563eb"
          onClick={() => setActivePage('tools-convert--docx-to-pdf')}
        />
        <ToolCard
          icon={<FileSpreadsheet size={28} />}
          title="XLSX → PDF"
          description="Excel to PDF"
          color="#059669"
          onClick={() => setActivePage('tools-convert--xlsx-to-pdf')}
        />
        <ToolCard
          icon={<FileDown size={28} />}
          title="PPTX → PDF"
          description="PowerPoint to PDF"
          color="#dc2626"
          onClick={() => setActivePage('tools-convert--pptx-to-pdf')}
        />
        <ToolCard
          icon={<File size={28} />}
          title="HTML → PDF"
          description="Web page to PDF"
          color="#7c3aed"
          onClick={() => setActivePage('tools-convert--html-to-pdf')}
        />
        <ToolCard
          icon={<FileText size={28} />}
          title="CSV → PDF"
          description="Spreadsheet to PDF"
          color="#0891b2"
          onClick={() => setActivePage('tools-convert--csv-to-pdf')}
        />
        <ToolCard
          icon={<FileCode size={28} />}
          title="MD → PDF"
          description="Markdown to PDF"
          color="#6366f1"
          onClick={() => setActivePage('tools-convert--md-to-pdf')}
        />
        <ToolCard
          icon={<Type size={28} />}
          title="TXT → PDF"
          description="Plain text to PDF"
          color="#64748b"
          onClick={() => setActivePage('tools-convert--txt-to-pdf')}
        />
        <ToolCard
          icon={<Image size={28} />}
          title="Image → PDF"
          description="JPG/PNG to PDF"
          color="#c2410c"
          onClick={() => setActivePage('tools-convert--image-to-pdf')}
        />
      </ToolSection>

      {/* Convert from PDF */}
      <ToolSection title="Convert from PDF">
        <ToolCard
          icon={<File size={28} />}
          title="PDF → HTML"
          description="PDF to web page"
          color="#7c3aed"
          onClick={() => setActivePage('tools-convert--pdf-to-html')}
        />
        <ToolCard
          icon={<Type size={28} />}
          title="PDF → TXT"
          description="PDF to plain text"
          color="#64748b"
          onClick={() => setActivePage('tools-convert--pdf-to-txt')}
        />
        <ToolCard
          icon={<FileCode size={28} />}
          title="PDF → MD"
          description="PDF to Markdown"
          color="#6366f1"
          onClick={() => setActivePage('tools-convert--pdf-to-md')}
        />
      </ToolSection>

      {/* Document Conversion */}
      <ToolSection title="Document Conversion">
        <ToolCard
          icon={<FileText size={28} />}
          title="DOCX → HTML"
          description="Word to web page"
          color="#2563eb"
          onClick={() => setActivePage('tools-convert--docx-to-html')}
        />
        <ToolCard
          icon={<FileCode size={28} />}
          title="DOCX → MD"
          description="Word to Markdown"
          color="#6366f1"
          onClick={() => setActivePage('tools-convert--docx-to-md')}
        />
        <ToolCard
          icon={<Type size={28} />}
          title="DOCX → TXT"
          description="Word to plain text"
          color="#64748b"
          onClick={() => setActivePage('tools-convert--docx-to-txt')}
        />
        <ToolCard
          icon={<FileSpreadsheet size={28} />}
          title="XLSX → CSV"
          description="Excel to CSV"
          color="#059669"
          onClick={() => setActivePage('tools-convert--xlsx-to-csv')}
        />
        <ToolCard
          icon={<File size={28} />}
          title="XLSX → HTML"
          description="Excel to web page"
          color="#7c3aed"
          onClick={() => setActivePage('tools-convert--xlsx-to-html')}
        />
        <ToolCard
          icon={<FileCode size={28} />}
          title="XLSX → MD"
          description="Excel to Markdown"
          color="#6366f1"
          onClick={() => setActivePage('tools-convert--xlsx-to-md')}
        />
        <ToolCard
          icon={<Type size={28} />}
          title="XLSX → TXT"
          description="Excel to plain text"
          color="#64748b"
          onClick={() => setActivePage('tools-convert--xlsx-to-txt')}
        />
        <ToolCard
          icon={<ArrowRightLeft size={28} />}
          title="CSV → XLSX"
          description="CSV to Excel"
          color="#059669"
          onClick={() => setActivePage('tools-convert--csv-to-xlsx')}
        />
        <ToolCard
          icon={<File size={28} />}
          title="CSV → HTML"
          description="CSV to web table"
          color="#7c3aed"
          onClick={() => setActivePage('tools-convert--csv-to-html')}
        />
        <ToolCard
          icon={<FileCode size={28} />}
          title="CSV → MD"
          description="CSV to Markdown table"
          color="#6366f1"
          onClick={() => setActivePage('tools-convert--csv-to-md')}
        />
        <ToolCard
          icon={<Presentation size={28} />}
          title="PPTX → HTML"
          description="Slides to web page"
          color="#dc2626"
          onClick={() => setActivePage('tools-convert--pptx-to-html')}
        />
        <ToolCard
          icon={<Type size={28} />}
          title="PPTX → TXT"
          description="Slides to plain text"
          color="#64748b"
          onClick={() => setActivePage('tools-convert--pptx-to-txt')}
        />
        <ToolCard
          icon={<FileCode size={28} />}
          title="PPTX → MD"
          description="Slides to Markdown"
          color="#6366f1"
          onClick={() => setActivePage('tools-convert--pptx-to-md')}
        />
      </ToolSection>

      {/* Text & Markup */}
      <ToolSection title="Text & Markup">
        <ToolCard
          icon={<File size={28} />}
          title="HTML → TXT"
          description="Strip HTML tags"
          color="#7c3aed"
          onClick={() => setActivePage('tools-convert--html-to-txt')}
        />
        <ToolCard
          icon={<FileCode size={28} />}
          title="HTML → MD"
          description="HTML to Markdown"
          color="#6366f1"
          onClick={() => setActivePage('tools-convert--html-to-md')}
        />
        <ToolCard
          icon={<FileCode size={28} />}
          title="MD → HTML"
          description="Markdown to web page"
          color="#6366f1"
          onClick={() => setActivePage('tools-convert--md-to-html')}
        />
        <ToolCard
          icon={<Type size={28} />}
          title="MD → TXT"
          description="Markdown to plain text"
          color="#64748b"
          onClick={() => setActivePage('tools-convert--md-to-txt')}
        />
        <ToolCard
          icon={<File size={28} />}
          title="TXT → HTML"
          description="Text to web page"
          color="#7c3aed"
          onClick={() => setActivePage('tools-convert--txt-to-html')}
        />
        <ToolCard
          icon={<FileCode size={28} />}
          title="TXT → MD"
          description="Text to Markdown"
          color="#6366f1"
          onClick={() => setActivePage('tools-convert--txt-to-md')}
        />
      </ToolSection>

      {/* Data Tools */}
      <ToolSection title="Data Tools">
        <ToolCard
          icon={<FileJson size={28} />}
          title="JSON → PDF"
          description="AI-powered report"
          color="#7c3aed"
          onClick={() => setActivePage('tools-json')}
        />
        <ToolCard
          icon={<FileJson size={28} />}
          title="JSON → HTML"
          description="JSON to styled table"
          color="#d97706"
          onClick={() => setActivePage('tools-convert--json-to-html')}
        />
        <ToolCard
          icon={<FileJson size={28} />}
          title="JSON → TXT"
          description="JSON to formatted text"
          color="#64748b"
          onClick={() => setActivePage('tools-convert--json-to-txt')}
        />
      </ToolSection>

      {/* CTA */}
      <div className="text-center mt-12 p-8 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
        <Shield size={32} className="mx-auto mb-3 opacity-80" />
        <h3 className="text-xl font-bold mb-2">Need batch conversion?</h3>
        <p className="text-blue-100 mb-4 text-sm">
          Use the full converter for batch processing, custom settings, and all 45+ format combinations.
        </p>
        <button
          onClick={() => setActivePage('convert')}
          className="px-6 py-2.5 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
        >
          Open Converter
        </button>
      </div>
    </div>
  );
}
