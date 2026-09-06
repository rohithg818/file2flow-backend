import React from 'react';
import {
  ArrowRight, FileText, Image as ImageIcon, Layers, Lock,
  Upload, Settings, Download, FileJson, FileType, Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DocStreamHero } from '../ui/doc-stream-hero';

export const LandingPage: React.FC = () => {
  const { setActivePage } = useApp();

  return (
    <div className="w-full" style={{ background: 'var(--color-body)', color: 'var(--color-text)' }}>

      {/* HERO with floating document cards */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #DBEAFE 0%, #F0F7FF 60%, #FFFFFF 100%)' }}>
        <DocStreamHero className="h-[600px] sm:h-[640px] w-full" cards={10} speed={22} axis={52}>
          <div className="relative z-10 flex h-full flex-col items-center justify-center py-10 text-center px-6">
            <span className="inline-block px-5 py-2 rounded-full text-sm font-semibold mb-6"
              style={{ background: '#FFFFFF', color: '#2563EB', border: '1px solid #BFDBFE', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              AI-Powered Document Conversion
            </span>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-display tracking-tight leading-[1.08] mb-6"
              style={{ color: '#0F172A' }}>
              Files in.<br />
              <span style={{ color: '#2563EB' }}>Any format out.</span>
            </h1>

            <p className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10" style={{ color: '#64748B' }}>
              Convert documents, spreadsheets, images, JSON, Markdown, and HTML into clean output — quickly and without the hassle.
              <span className="font-semibold" style={{ color: '#2563EB' }}> AI-powered</span> formatting for every file type.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
              <button onClick={() => setActivePage('convert')}
                className="px-8 py-4 rounded-full font-semibold text-base text-white transition-all hover:brightness-110 group cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
                <span className="flex items-center gap-2">
                  Convert a file <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <a href="#how-it-works"
                className="px-8 py-4 rounded-full font-semibold text-base transition-colors text-center"
                style={{ color: '#334155', background: 'rgba(255,255,255,0.8)', border: '1.5px solid #CBD5E1', backdropFilter: 'blur(8px)' }}>
                See how it works
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-sm">
              <span className="font-medium" style={{ color: '#64748B' }}>Supported:</span>
              {['DOCX', 'XLSX', 'PPTX', 'JSON', 'MD', 'HTML', 'CSV', 'Images'].map((fmt) => (
                <span key={fmt} className="px-2.5 py-1 rounded-lg font-mono text-xs"
                  style={{ background: 'rgba(255,255,255,0.7)', color: '#64748B', border: '1px solid #E2E8F0' }}>{fmt}</span>
              ))}
            </div>
          </div>
        </DocStreamHero>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative py-16 lg:py-24" style={{ background: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold uppercase tracking-wider px-4 py-1.5 rounded-xl inline-block mb-4"
              style={{ background: '#EFF6FF', color: '#2563EB' }}>
              Simple Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight mt-1" style={{ color: '#0F172A' }}>
              How File2Flow works
            </h2>
            <p className="text-base mt-3 max-w-lg mx-auto" style={{ color: '#64748B' }}>
              Three straightforward steps to turn any document into a clean, ready-to-share output file.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Upload, title: "Drop your file", desc: "Upload Word documents, spreadsheets, Markdown, JSON, HTML, or images directly from your browser." },
              { icon: Settings, title: "Adjust output options", desc: "Choose page size, orientation, margins, custom output filename, or format-specific appearance settings." },
              { icon: Download, title: "Preview & download", desc: "Check the rendered preview instantly in your browser and download the generated file with one click." },
            ].map((step, i) => (
              <div key={i} className="p-8 rounded-2xl transition-all hover:shadow-md"
                style={{ background: '#FAFBFC', border: '1px solid #E2E8F0' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <step.icon className="w-6 h-6" style={{ color: '#2563EB' }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 lg:py-28" style={{ background: '#F0F7FF' }}>
        <div className="max-w-7xl mx-auto px-8 space-y-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider px-4 py-1.5 rounded-xl inline-block mb-3"
                style={{ background: '#EFF6FF', color: '#2563EB' }}>Capabilities</span>
              <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight" style={{ color: '#0F172A' }}>
                Formatted for each file type
              </h2>
            </div>
            <button onClick={() => setActivePage('convert')}
              className="text-sm font-semibold flex items-center gap-1.5 transition-colors hover:opacity-80" style={{ color: '#2563EB' }}>
              <span>Go to converter</span><ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: FileText, title: "Office Documents", desc: "Converts DOCX, PPTX, and XLSX files while preserving layout structure, headings, and clean tables.", color: '#2563EB' },
              { icon: FileJson, title: "JSON & Data", desc: "Choose between Clean Report view, Formatted Code, Table Grid, or optional Smart Summary report.", color: '#D97706' },
              { icon: FileType, title: "Markdown & HTML", desc: "Preserves heading hierarchy, bullet lists, monospace code blocks, and markdown table grids.", color: '#7C3AED' },
              { icon: ImageIcon, title: "Images & Photos", desc: "Supports PNG, JPG, WEBP, GIF, and SVG. Scale with Fit to Page, Fill Page, or Original Proportions.", color: '#DB2777' },
              { icon: Layers, title: "Batch Queue", desc: "Upload multiple files at once, convert all with one click, and download individually or as ZIP.", color: '#059669' },
              { icon: Lock, title: "Browser-First Privacy", desc: "Client-side document rendering keeps your files fast, responsive, and under your control.", color: '#64748B' },
            ].map((feat, i) => (
              <div key={i} className="p-7 rounded-2xl transition-all hover:shadow-md"
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: '#F8FAFC' }}>
                  <feat.icon className="w-6 h-6" style={{ color: feat.color }} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: '#0F172A' }}>{feat.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI-POWERED */}
      <section className="py-20 lg:py-28 relative overflow-hidden" style={{ background: '#FFFFFF' }}>
        <div className="absolute right-0 top-0 w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #818CF8 0%, transparent 70%)', filter: 'blur(80px)' }} />

        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold uppercase tracking-wider px-4 py-1.5 rounded-xl inline-block mb-3"
              style={{ background: '#EDE9FE', color: '#7C3AED' }}>
              <Sparkles className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />AI-Powered
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight" style={{ color: '#0F172A' }}>
              Smart formatting, zero effort
            </h2>
            <p className="text-base mt-3 max-w-lg mx-auto" style={{ color: '#64748B' }}>
              AI analyzes your document structure and suggests the best template, layout, and styling automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '🎨', title: 'Auto Template', desc: 'AI detects your document type and picks the perfect PDF template — report, resume, invoice, or minimal.' },
              { icon: '📊', title: 'Quality Scoring', desc: 'Get instant readability and quality scores with actionable suggestions before converting.' },
              { icon: '📝', title: 'Smart Summary', desc: 'Auto-generate executive summaries, table of contents, and professional headers for any document.' },
              { icon: '✨', title: 'Content Enhance', desc: 'AI suggests improvements to formatting, structure, and readability tailored to your file type.' },
            ].map((feat, i) => (
              <div key={i} className="p-6 rounded-2xl transition-all hover:shadow-md"
                style={{ background: '#FAFBFC', border: '1px solid #E2E8F0' }}>
                <span className="text-2xl">{feat.icon}</span>
                <h3 className="text-base font-bold mt-3 mb-2" style={{ color: '#0F172A' }}>{feat.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 relative overflow-hidden" style={{ background: '#FFFFFF' }}>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #93C5FD 0%, transparent 70%)', filter: 'blur(80px)' }} />

        <div className="max-w-4xl mx-auto px-8 text-center space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight" style={{ color: '#0F172A' }}>
            Ready to convert your files?
          </h2>
          <p className="text-lg max-w-lg mx-auto" style={{ color: '#64748B' }}>
            Try File2Flow today. Free accounts include 10 conversions every month — with AI-powered formatting on every one.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => setActivePage('convert')}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-base text-white transition-all hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
              <span>Start converting</span><ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => setActivePage('pricing')}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-base transition-colors"
              style={{ color: '#334155', border: '1.5px solid #CBD5E1' }}>
              View pricing
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
