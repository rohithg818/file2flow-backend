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
      className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer text-center"
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
        style={{ backgroundColor: color + '15', color }}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
    </button>
  );
}

function ToolSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <div className="w-1.5 h-5 rounded-full bg-blue-500" />
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          All PDF & Document Tools
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          Free online tools to convert, compress, merge, split, and edit your documents.
          Powered by LibreOffice and Chromium for iLovePDF-level quality.
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
          onClick={() => setActivePage('tools-convert')}
        />
        <ToolCard
          icon={<FileSpreadsheet size={28} />}
          title="XLSX → PDF"
          description="Excel to PDF"
          color="#059669"
          onClick={() => setActivePage('tools-convert')}
        />
        <ToolCard
          icon={<FileDown size={28} />}
          title="PPTX → PDF"
          description="PowerPoint to PDF"
          color="#dc2626"
          onClick={() => setActivePage('tools-convert')}
        />
        <ToolCard
          icon={<File size={28} />}
          title="HTML → PDF"
          description="Web page to PDF"
          color="#7c3aed"
          onClick={() => setActivePage('tools-convert')}
        />
        <ToolCard
          icon={<FileText size={28} />}
          title="CSV → PDF"
          description="Spreadsheet to PDF"
          color="#0891b2"
          onClick={() => setActivePage('tools-convert')}
        />
        <ToolCard
          icon={<Image size={28} />}
          title="Image → PDF"
          description="JPG/PNG to PDF"
          color="#c2410c"
          onClick={() => setActivePage('tools-convert')}
        />
      </ToolSection>

      {/* Convert from PDF */}
      <ToolSection title="Convert from PDF">
        <ToolCard
          icon={<FileUp size={28} />}
          title="PDF → DOCX"
          description="PDF to Word (lossy)"
          color="#2563eb"
          onClick={() => setActivePage('tools-convert')}
        />
        <ToolCard
          icon={<FileUp size={28} />}
          title="PDF → XLSX"
          description="PDF to Excel (lossy)"
          color="#059669"
          onClick={() => setActivePage('tools-convert')}
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
          icon={<ArrowRightLeft size={28} />}
          title="CSV → XLSX"
          description="Convert spreadsheet"
          color="#059669"
          onClick={() => setActivePage('tools-convert')}
        />
      </ToolSection>

      {/* CTA */}
      <div className="text-center mt-12 p-8 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
        <Shield size={32} className="mx-auto mb-3 opacity-80" />
        <h3 className="text-xl font-bold mb-2">Need batch conversion?</h3>
        <p className="text-blue-100 mb-4 text-sm">
          Use the full converter for batch processing, custom settings, and more formats.
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
