import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { AiTemplateSuggestion, AiQualityAnalysis } from '../../types';
import { suggestPdfTemplate, analyzeDocumentQuality } from '../../services/mistralService';

interface Props {
  file: File;
  fileName: string;
  onSelectTemplate: (template: string) => void;
}

const TEMPLATE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  professional_report: { label: 'Professional Report', icon: '📊', color: '#2563EB' },
  academic: { label: 'Academic Paper', icon: '🎓', color: '#7C3AED' },
  resume: { label: 'Resume / CV', icon: '📄', color: '#059669' },
  invoice: { label: 'Invoice / Bill', icon: '💰', color: '#D97706' },
  minimal: { label: 'Minimal & Clean', icon: '✨', color: '#DB2777' },
  modern: { label: 'Modern Layout', icon: '🚀', color: '#4F46E5' },
};

export default function TemplateSelector({ file, fileName, onSelectTemplate }: Props) {
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<AiTemplateSuggestion | null>(null);
  const [quality, setQuality] = useState<AiQualityAnalysis | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const preview = text.substring(0, 2000);
      const [t, q] = await Promise.all([suggestPdfTemplate(fileName, preview), analyzeDocumentQuality(preview)]);
      setTemplate(t); setQuality(q); setSelected(t.template);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setLoading(false); }
  }, [file, fileName]);

  useEffect(() => { analyze(); }, [analyze]);

  if (loading) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-center gap-3 mb-3">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-5 h-5 rounded-full border-2 border-t-transparent" style={{ borderColor: '#2563EB', borderTopColor: 'transparent' }} />
          <span className="text-sm font-medium" style={{ color: '#334155' }}>Analyzing your document...</span>
        </div>
        <p className="text-xs" style={{ color: '#94A3B8' }}>Detecting type, structure, and best template</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
        <p className="text-sm font-medium" style={{ color: '#DC2626' }}>{error}</p>
        <button onClick={analyze} className="mt-2 text-xs font-semibold underline" style={{ color: '#2563EB' }}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: '#E2E8F0' }}>
        <h4 className="text-sm font-bold" style={{ color: '#0F172A' }}>AI Template Suggestions</h4>
      </div>
      <div className="p-4 space-y-4">
        {/* Template Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(TEMPLATE_LABELS).map(([key, meta]) => {
            const isActive = selected === key;
            const isRecommended = template?.template === key;
            return (
              <motion.button key={key} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(key)}
                className="relative rounded-xl p-3 text-left transition-all"
                style={{ border: `1px solid ${isActive ? meta.color : '#E2E8F0'}`, background: isActive ? `${meta.color}10` : '#FAFBFC' }}>
                {isRecommended && (
                  <span className="absolute -top-1.5 -right-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white"
                    style={{ background: meta.color }}>AI Pick</span>
                )}
                <span className="text-lg">{meta.icon}</span>
                <p className="text-xs font-semibold mt-1" style={{ color: isActive ? meta.color : '#334155' }}>{meta.label}</p>
              </motion.button>
            );
          })}
        </div>

        {template && (
          <div className="rounded-xl p-3 text-xs" style={{ background: '#F8FAFC', color: '#64748B' }}>
            <span className="font-semibold" style={{ color: '#334155' }}>Why: </span>{template.reason}
          </div>
        )}

        {template && template.suggestions.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: '#64748B' }}>Suggestions:</p>
            <ul className="space-y-1">
              {template.suggestions.map((s, i) => (
                <li key={i} className="text-xs flex items-start gap-2" style={{ color: '#334155' }}>
                  <span style={{ color: '#2563EB' }}>→</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {quality && quality.qualityScore > 0 && (
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl p-3 text-center" style={{ background: '#F8FAFC' }}>
              <p className="text-2xl font-bold" style={{ color: quality.qualityScore >= 70 ? '#059669' : quality.qualityScore >= 40 ? '#D97706' : '#DC2626' }}>{quality.qualityScore}</p>
              <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: '#94A3B8' }}>Quality</p>
            </div>
            <div className="flex-1 rounded-xl p-3 text-center" style={{ background: '#F8FAFC' }}>
              <p className="text-2xl font-bold" style={{ color: quality.readabilityScore >= 70 ? '#059669' : quality.readabilityScore >= 40 ? '#D97706' : '#DC2626' }}>{quality.readabilityScore}</p>
              <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: '#94A3B8' }}>Readability</p>
            </div>
          </div>
        )}

        {template && (
          <div className="rounded-xl p-3" style={{ background: '#F8FAFC' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#64748B' }}>Recommended Styling</p>
            <div className="flex flex-wrap gap-3 text-xs" style={{ color: '#334155' }}>
              <span><span className="font-semibold">Colors: </span>{template.style.colors.join(', ')}</span>
              <span><span className="font-semibold">Fonts: </span>{template.style.fonts}</span>
              <span><span className="font-semibold">Layout: </span>{template.style.layout}</span>
            </div>
          </div>
        )}

        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          onClick={() => selected && onSelectTemplate(selected)} disabled={!selected}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
          style={{ background: selected ? '#2563EB' : '#E2E8F0', color: selected ? '#fff' : '#94A3B8', cursor: selected ? 'pointer' : 'not-allowed' }}>
          Apply {TEMPLATE_LABELS[selected ?? '']?.label ?? 'Template'}
        </motion.button>
      </div>
    </motion.div>
  );
}
