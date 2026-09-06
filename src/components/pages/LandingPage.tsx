import React from 'react';
import {
  ArrowRight, FileText, Image as ImageIcon, Layers, Lock,
  Upload, Settings, Download, FileJson, FileType, Sparkles,
  Palette, BarChart3, FileSpreadsheet, Wand2, Zap, Clock,
  Crown, ShieldCheck, Ban,
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
              { icon: Palette, color: '#DB2777', bg: '#FDF2F8', title: 'Auto Template', desc: 'AI detects your document type and picks the perfect PDF template — report, resume, invoice, or minimal.' },
              { icon: BarChart3, color: '#2563EB', bg: '#EFF6FF', title: 'Quality Scoring', desc: 'Get instant readability and quality scores with actionable suggestions before converting.' },
              { icon: FileSpreadsheet, color: '#059669', bg: '#F0FDF4', title: 'Smart Summary', desc: 'Auto-generate executive summaries, table of contents, and professional headers for any document.' },
              { icon: Wand2, color: '#7C3AED', bg: '#F5F3FF', title: 'Content Enhance', desc: 'AI suggests improvements to formatting, structure, and readability tailored to your file type.' },
            ].map((feat, i) => (
              <div key={i} className="p-6 rounded-2xl transition-all hover:shadow-md"
                style={{ background: '#FAFBFC', border: '1px solid #E2E8F0' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: feat.bg }}>
                  <feat.icon className="w-5 h-5" style={{ color: feat.color }} />
                </div>
                <h3 className="text-base font-bold mt-3 mb-2" style={{ color: '#0F172A' }}>{feat.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY UPGRADE — USP */}
      <section className="py-20 lg:py-28" style={{ background: 'linear-gradient(180deg, #F0F7FF 0%, #FFFFFF 100%)' }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold uppercase tracking-wider px-4 py-1.5 rounded-xl inline-block mb-3"
              style={{ background: '#FEF3C7', color: '#D97706' }}>
              <Crown className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />Why Upgrade
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight" style={{ color: '#0F172A' }}>
              Free gets you started. Pro gets you further.
            </h2>
            <p className="text-base mt-3 max-w-xl mx-auto" style={{ color: '#64748B' }}>
              Basic conversions and PDF tools are free and clean. AI Smart JSON Reports include a watermark on the free plan — upgrade to remove it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Ban,
                color: '#DC2626',
                bg: '#FEF2F2',
                border: '#FECACA',
                title: 'Watermark-free AI reports',
                desc: 'Free plans include a watermark on AI Smart JSON Reports only. All basic conversions and PDF tools are clean. Paid plans remove the watermark entirely.',
                badge: 'Popular',
              },
              {
                icon: FileJson,
                color: '#D97706',
                bg: '#FFFBEB',
                border: '#FDE68A',
                title: 'JSON → PDF reports',
                desc: 'Paste or upload JSON data and get a professionally formatted PDF — tables, charts, headings, and smart summaries generated instantly.',
                badge: 'AI-Powered',
              },
              {
                icon: Zap,
                color: '#2563EB',
                bg: '#EFF6FF',
                border: '#BFDBFE',
                title: 'Higher file-size limits',
                desc: 'Free users are capped at 10 MB per file. Starter unlocks 50 MB, and Business goes up to 200 MB per upload.',
                badge: null,
              },
              {
                icon: Clock,
                color: '#059669',
                bg: '#F0FDF4',
                border: '#BBF7D0',
                title: 'Longer file retention',
                desc: 'Free output expires in 1 hour. Starter keeps files for 30 days. Business stores them permanently.',
                badge: null,
              },
              {
                icon: Layers,
                color: '#7C3AED',
                bg: '#F5F3FF',
                border: '#DDD6FE',
                title: 'Unlimited conversions',
                desc: 'Free accounts are limited to 10 conversions per month. Starter removes the cap for everyday use.',
                badge: null,
              },
              {
                icon: ShieldCheck,
                color: '#D97706',
                bg: '#FFFBEB',
                border: '#FDE68A',
                title: 'Priority support',
                desc: 'Paid plans include direct email support with faster response times and early access to new features.',
                badge: null,
              },
              {
                icon: Crown,
                color: '#DB2777',
                bg: '#FDF2F8',
                border: '#FBCFE8',
                title: 'Batch & advanced tools',
                desc: 'Merge, split, compress, and protect PDFs at full quality without processing caps.',
                badge: 'New',
              },
            ].map((feat, i) => (
              <div key={i} className="relative p-7 rounded-2xl transition-all hover:shadow-lg"
                style={{ background: '#FFFFFF', border: `1.5px solid ${feat.border}` }}>
                {feat.badge && (
                  <span className="absolute -top-3 right-5 px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: feat.color }}>
                    {feat.badge}
                  </span>
                )}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: feat.bg }}>
                  <feat.icon className="w-6 h-6" style={{ color: feat.color }} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: '#0F172A' }}>{feat.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{feat.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button onClick={() => setActivePage('pricing')}
              className="px-8 py-3.5 rounded-full font-semibold text-white transition-all hover:brightness-110 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)', boxShadow: '0 4px 14px rgba(217,119,6,0.35)' }}>
              Compare plans &amp; pricing
            </button>
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
            Try File2Flow today. Free accounts include 10 conversions every month — all basic conversions and PDF tools are clean. Upgrade for AI Smart Reports without watermarks and unlimited use.
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
