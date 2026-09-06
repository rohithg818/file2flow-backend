import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { AiEnhancements, AiTableOfContents } from '../../types';
import { enhanceDocumentContent, generateSummary, generateTableOfContents, generateProfessionalHeader } from '../../services/mistralService';

interface Props {
  file: File;
  fileName: string;
  onApplyEnhancements: (data: { summary?: string; enhancements?: AiEnhancements; toc?: AiTableOfContents; header?: { headerText: string; styling: string; layout: string } }) => void;
}

export default function AIEnhancementPanel({ file, fileName, onApplyEnhancements }: Props) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'enhance' | 'summary' | 'toc' | 'header'>('enhance');
  const [enhancements, setEnhancements] = useState<AiEnhancements | null>(null);
  const [summary, setSummary] = useState('');
  const [toc, setToc] = useState<AiTableOfContents | null>(null);
  const [header, setHeader] = useState<{ headerText: string; styling: string; layout: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getPreview = useCallback(async () => (await file.text()).substring(0, 3000), [file]);

  const run = async (fn: () => Promise<void>) => { setLoading(true); setError(null); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setLoading(false); } };

  const tabs = [
    { key: 'enhance' as const, label: 'Enhance', icon: '✨' },
    { key: 'summary' as const, label: 'Summary', icon: '📝' },
    { key: 'toc' as const, label: 'TOC', icon: '📑' },
    { key: 'header' as const, label: 'Header', icon: '🏷️' },
  ];

  const btnStyle = (active: boolean) => ({
    background: active ? '#EFF6FF' : 'transparent',
    color: active ? '#2563EB' : '#64748B',
    border: `1px solid ${active ? '#BFDBFE' : 'transparent'}`,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: '#E2E8F0' }}>
        <h4 className="text-sm font-bold" style={{ color: '#0F172A' }}>AI Content Enhancement</h4>
      </div>

      <div className="flex border-b" style={{ borderColor: '#F1F5F9' }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            style={{ ...btnStyle(activeTab === tab.key), borderBottom: activeTab === tab.key ? '2px solid #2563EB' : '2px solid transparent' }}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === 'enhance' && (
          !enhancements ? (
            <button onClick={() => run(async () => { const c = await getPreview(); setEnhancements(await enhanceDocumentContent(c, 'document')); })}
              disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
              {loading ? 'Analyzing...' : '✨ Get Suggestions'}
            </button>
          ) : (
            <div className="space-y-3">
              {enhancements.improvements.length > 0 && (
                <ul className="space-y-1">
                  {enhancements.improvements.map((item, i) => (
                    <li key={i} className="text-xs flex items-start gap-2" style={{ color: '#334155' }}>
                      <span style={{ color: '#059669' }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
              )}
              {enhancements.addParagraph && (
                <div className="rounded-xl p-3 text-xs" style={{ background: '#F8FAFC', color: '#334155' }}>
                  <span className="font-semibold" style={{ color: '#2563EB' }}>Suggested: </span>{enhancements.addParagraph}
                </div>
              )}
              <button onClick={() => onApplyEnhancements({ enhancements })}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#2563EB' }}>
                Apply Enhancements
              </button>
            </div>
          )
        )}

        {activeTab === 'summary' && (
          !summary ? (
            <button onClick={() => run(async () => { setSummary(await generateSummary(await getPreview())); })}
              disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
              {loading ? 'Generating...' : '📝 Generate Summary'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: '#F8FAFC', color: '#334155' }}>{summary}</div>
              <button onClick={() => onApplyEnhancements({ summary })}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#2563EB' }}>
                Prepend Summary
              </button>
            </div>
          )
        )}

        {activeTab === 'toc' && (
          !toc ? (
            <button onClick={() => run(async () => { setToc(await generateTableOfContents(await getPreview(), fileName.replace(/\.[^/.]+$/, ''))); })}
              disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
              {loading ? 'Generating...' : '📑 Generate Table of Contents'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl p-3" style={{ background: '#F8FAFC' }}>
                {toc.tableOfContents.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs py-1" style={{ color: '#334155' }}>
                    <span>{item.section}</span><span style={{ color: '#94A3B8' }}>...{item.pageNumber}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => onApplyEnhancements({ toc })}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#2563EB' }}>
                Insert TOC
              </button>
            </div>
          )
        )}

        {activeTab === 'header' && (
          !header ? (
            <button onClick={() => run(async () => { setHeader(await generateProfessionalHeader(fileName.replace(/\.[^/.]+$/, ''), 'Generated by FileFlow', 'FileFlow')); })}
              disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
              {loading ? 'Generating...' : '🏷️ Generate Header'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl p-4 text-center" style={{ background: '#F8FAFC' }}>
                <p className="text-lg font-bold" style={{ color: '#0F172A' }}>{header.headerText}</p>
                <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>{header.styling}</p>
                <p className="text-xs mt-1" style={{ color: '#2563EB' }}>Layout: {header.layout}</p>
              </div>
              <button onClick={() => onApplyEnhancements({ header })}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#2563EB' }}>
                Use as Header
              </button>
            </div>
          )
        )}

        {error && (
          <div className="mt-3 rounded-xl p-3 text-xs" style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</div>
        )}
      </div>
    </motion.div>
  );
}
