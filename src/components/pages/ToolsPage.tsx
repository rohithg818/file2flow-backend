import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card3DList, type CardData } from '../ui/animated-3d-card';
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

function ToolSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
        <div className="w-1.5 h-5 rounded-full" style={{ background: '#2563EB' }} />
        {title}
      </h2>
      {children}
    </div>
  );
}

export function ToolsPage() {
  const { setActivePage } = useApp();

  const organizeCards: CardData[] = [
    { id: 'pdf-merge', title: 'Merge PDF', description: 'Combine multiple PDFs into one', icon: <Merge size={28} />, theme: 'secondary', onClick: () => setActivePage('tools-pdf-merge') },
    { id: 'pdf-split', title: 'Split PDF', description: 'Extract pages from a PDF', icon: <Scissors size={28} />, theme: 'danger', onClick: () => setActivePage('tools-pdf-split') },
    { id: 'pdf-rotate', title: 'Rotate PDF', description: 'Rotate or reorder pages', icon: <RotateCw size={28} />, theme: 'accent', onClick: () => setActivePage('tools-pdf-rotate') },
  ];

  const optimizeCards: CardData[] = [
    { id: 'pdf-compress', title: 'Compress PDF', description: 'Reduce file size without quality loss', icon: <Zap size={28} />, theme: 'success', onClick: () => setActivePage('tools-pdf-compress') },
    { id: 'pdf-protect', title: 'Protect PDF', description: 'Add or remove password protection', icon: <Lock size={28} />, theme: 'warning', onClick: () => setActivePage('tools-pdf-protect') },
  ];

  const convertToCards: CardData[] = [
    { id: 'docx-pdf', title: 'DOCX → PDF', description: 'Word document to PDF', icon: <FileText size={28} />, theme: 'secondary', onClick: () => setActivePage('tools-convert--docx-to-pdf') },
    { id: 'xlsx-pdf', title: 'XLSX → PDF', description: 'Excel spreadsheet to PDF', icon: <FileSpreadsheet size={28} />, theme: 'success', onClick: () => setActivePage('tools-convert--xlsx-to-pdf') },
    { id: 'pptx-pdf', title: 'PPTX → PDF', description: 'PowerPoint slides to PDF', icon: <FileDown size={28} />, theme: 'danger', onClick: () => setActivePage('tools-convert--pptx-to-pdf') },
    { id: 'html-pdf', title: 'HTML → PDF', description: 'Web page to PDF', icon: <File size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--html-to-pdf') },
    { id: 'csv-pdf', title: 'CSV → PDF', description: 'CSV spreadsheet to PDF', icon: <FileText size={28} />, theme: 'info', onClick: () => setActivePage('tools-convert--csv-to-pdf') },
    { id: 'md-pdf', title: 'MD → PDF', description: 'Markdown document to PDF', icon: <FileCode size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--md-to-pdf') },
    { id: 'txt-pdf', title: 'TXT → PDF', description: 'Plain text to PDF', icon: <Type size={28} />, theme: 'neutral', onClick: () => setActivePage('tools-convert--txt-to-pdf') },
    { id: 'img-pdf', title: 'Image → PDF', description: 'JPG/PNG image to PDF', icon: <Image size={28} />, theme: 'danger', onClick: () => setActivePage('tools-convert--image-to-pdf') },
  ];

  const convertFromCards: CardData[] = [
    { id: 'pdf-html', title: 'PDF → HTML', description: 'PDF to web page', icon: <File size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--pdf-to-html') },
    { id: 'pdf-txt', title: 'PDF → TXT', description: 'PDF to plain text', icon: <Type size={28} />, theme: 'neutral', onClick: () => setActivePage('tools-convert--pdf-to-txt') },
    { id: 'pdf-md', title: 'PDF → MD', description: 'PDF to Markdown', icon: <FileCode size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--pdf-to-md') },
  ];

  const docConvertCards: CardData[] = [
    { id: 'docx-html', title: 'DOCX → HTML', description: 'Word to web page', icon: <FileText size={28} />, theme: 'secondary', onClick: () => setActivePage('tools-convert--docx-to-html') },
    { id: 'docx-md', title: 'DOCX → MD', description: 'Word to Markdown', icon: <FileCode size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--docx-to-md') },
    { id: 'docx-txt', title: 'DOCX → TXT', description: 'Word to plain text', icon: <Type size={28} />, theme: 'neutral', onClick: () => setActivePage('tools-convert--docx-to-txt') },
    { id: 'xlsx-csv', title: 'XLSX → CSV', description: 'Excel to CSV', icon: <FileSpreadsheet size={28} />, theme: 'success', onClick: () => setActivePage('tools-convert--xlsx-to-csv') },
    { id: 'xlsx-html', title: 'XLSX → HTML', description: 'Excel to web page', icon: <File size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--xlsx-to-html') },
    { id: 'xlsx-md', title: 'XLSX → MD', description: 'Excel to Markdown', icon: <FileCode size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--xlsx-to-md') },
    { id: 'xlsx-txt', title: 'XLSX → TXT', description: 'Excel to plain text', icon: <Type size={28} />, theme: 'neutral', onClick: () => setActivePage('tools-convert--xlsx-to-txt') },
    { id: 'csv-xlsx', title: 'CSV → XLSX', description: 'CSV to Excel', icon: <ArrowRightLeft size={28} />, theme: 'success', onClick: () => setActivePage('tools-convert--csv-to-xlsx') },
    { id: 'csv-html', title: 'CSV → HTML', description: 'CSV to web table', icon: <File size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--csv-to-html') },
    { id: 'csv-md', title: 'CSV → MD', description: 'CSV to Markdown table', icon: <FileCode size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--csv-to-md') },
    { id: 'pptx-html', title: 'PPTX → HTML', description: 'Slides to web page', icon: <Presentation size={28} />, theme: 'danger', onClick: () => setActivePage('tools-convert--pptx-to-html') },
    { id: 'pptx-txt', title: 'PPTX → TXT', description: 'Slides to plain text', icon: <Type size={28} />, theme: 'neutral', onClick: () => setActivePage('tools-convert--pptx-to-txt') },
    { id: 'pptx-md', title: 'PPTX → MD', description: 'Slides to Markdown', icon: <FileCode size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--pptx-to-md') },
  ];

  const textMarkupCards: CardData[] = [
    { id: 'html-txt', title: 'HTML → TXT', description: 'Strip HTML tags', icon: <File size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--html-to-txt') },
    { id: 'html-md', title: 'HTML → MD', description: 'HTML to Markdown', icon: <FileCode size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--html-to-md') },
    { id: 'md-html', title: 'MD → HTML', description: 'Markdown to web page', icon: <FileCode size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--md-to-html') },
    { id: 'md-txt', title: 'MD → TXT', description: 'Markdown to plain text', icon: <Type size={28} />, theme: 'neutral', onClick: () => setActivePage('tools-convert--md-to-txt') },
    { id: 'txt-html', title: 'TXT → HTML', description: 'Text to web page', icon: <File size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--txt-to-html') },
    { id: 'txt-md', title: 'TXT → MD', description: 'Text to Markdown', icon: <FileCode size={28} />, theme: 'accent', onClick: () => setActivePage('tools-convert--txt-to-md') },
  ];

  const dataCards: CardData[] = [
    { id: 'json-pdf', title: 'JSON → PDF', description: 'AI-powered structured report from JSON data', icon: <FileJson size={28} />, theme: 'accent', onClick: () => setActivePage('tools-json') },
    { id: 'json-html', title: 'JSON → HTML', description: 'JSON to styled table', icon: <FileJson size={28} />, theme: 'warning', onClick: () => setActivePage('tools-convert--json-to-html') },
    { id: 'json-txt', title: 'JSON → TXT', description: 'JSON to formatted text', icon: <FileJson size={28} />, theme: 'neutral', onClick: () => setActivePage('tools-convert--json-to-txt') },
  ];

  const aiCards: CardData[] = [
    { id: 'ocr', title: 'OCR — Extract Text', description: 'Extract text from PDFs and images using Mistral AI', icon: <FileText size={28} />, theme: 'accent', onClick: () => setActivePage('tools-ocr') },
    { id: 'translate', title: 'Translate', description: 'Translate to 30+ languages with AI', icon: <ArrowRightLeft size={28} />, theme: 'secondary', onClick: () => setActivePage('tools-translate') },
  ];

  const gridCols: 1 | 2 | 3 | 4 = 4;

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

      <ToolSection title="Organize PDF">
        <Card3DList cards={organizeCards} columns={3} size="sm" variant="minimal" />
      </ToolSection>

      <ToolSection title="Optimize PDF">
        <Card3DList cards={optimizeCards} columns={2} size="sm" variant="minimal" />
      </ToolSection>

      <ToolSection title="Convert to PDF">
        <Card3DList cards={convertToCards} columns={gridCols} size="sm" variant="minimal" />
      </ToolSection>

      <ToolSection title="Convert from PDF">
        <Card3DList cards={convertFromCards} columns={3} size="sm" variant="minimal" />
      </ToolSection>

      <ToolSection title="Document Conversion">
        <Card3DList cards={docConvertCards} columns={gridCols} size="sm" variant="minimal" />
      </ToolSection>

      <ToolSection title="Text & Markup">
        <Card3DList cards={textMarkupCards} columns={gridCols} size="sm" variant="minimal" />
      </ToolSection>

      <ToolSection title="Data Tools">
        <Card3DList cards={dataCards} columns={3} size="sm" variant="minimal" />
      </ToolSection>

      <ToolSection title="AI Tools">
        <Card3DList cards={aiCards} columns={2} size="sm" variant="default" />
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
