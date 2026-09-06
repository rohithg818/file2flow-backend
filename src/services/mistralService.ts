import {
  AiTemplateSuggestion,
  AiQualityAnalysis,
  AiEnhancements,
  AiTableOfContents,
  SupportedFormat,
} from '../types';

// Use relative URL on Vercel (serverless function), localhost for dev
const API_URL = import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '';

// All AI calls go through the backend proxy (keys stay server-side)
async function aiRequest(action: string, params: Record<string, unknown> = {}): Promise<any> {
  const res = await fetch(`${API_URL}/api/ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...params }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'AI request failed' }));
    throw new Error(err.error || 'AI request failed');
  }

  return res.json();
}

// ------------------------------------------------------------------
// 1. Detect document type
// ------------------------------------------------------------------
export async function detectDocumentType(fileName: string, content: string): Promise<string> {
  try {
    const result = await aiRequest('detectDocumentType', { fileName, content });
    return result.documentType || 'other';
  } catch {
    return 'other';
  }
}

// ------------------------------------------------------------------
// 2. Suggest PDF template
// ------------------------------------------------------------------
export async function suggestPdfTemplate(fileName: string, content: string): Promise<AiTemplateSuggestion> {
  try {
    return await aiRequest('suggestPdfTemplate', { fileName, content });
  } catch {
    return {
      template: 'professional_report',
      reason: 'Unable to analyze — using default template',
      suggestions: [],
      style: { colors: ['#1a1a2e', '#00AEEF'], fonts: 'sans-serif', layout: 'single-column' },
    };
  }
}

// ------------------------------------------------------------------
// 3. Analyze document quality
// ------------------------------------------------------------------
export async function analyzeDocumentQuality(content: string): Promise<AiQualityAnalysis> {
  try {
    return await aiRequest('analyzeDocumentQuality', { content });
  } catch {
    return {
      qualityScore: 0,
      issues: [],
      improvements: [],
      grammarCheck: 'Analysis unavailable',
      readabilityScore: 0,
    };
  }
}

// ------------------------------------------------------------------
// 4. Enhance document content
// ------------------------------------------------------------------
export async function enhanceDocumentContent(content: string, documentType: string): Promise<AiEnhancements> {
  try {
    return await aiRequest('enhanceDocumentContent', { content, documentType });
  } catch {
    return { improvements: [], suggestedStructure: [], formatRecommendations: [] };
  }
}

// ------------------------------------------------------------------
// 5. Generate professional summary
// ------------------------------------------------------------------
export async function generateSummary(content: string, maxLength = 300): Promise<string> {
  try {
    const result = await aiRequest('generateSummary', { content, maxLength });
    return result.summary || '';
  } catch {
    return '';
  }
}

// ------------------------------------------------------------------
// 6. Generate table of contents
// ------------------------------------------------------------------
export async function generateTableOfContents(content: string, title: string): Promise<AiTableOfContents> {
  try {
    return await aiRequest('generateTableOfContents', { content, title });
  } catch {
    return { tableOfContents: [] };
  }
}

// ------------------------------------------------------------------
// 7. Generate professional header
// ------------------------------------------------------------------
export async function generateProfessionalHeader(
  title: string,
  subtitle: string,
  companyName: string
): Promise<{ headerText: string; styling: string; layout: string }> {
  try {
    return await aiRequest('generateProfessionalHeader', { title, subtitle, companyName });
  } catch {
    return {
      headerText: `${title} — ${companyName}`,
      styling: 'font-size: 24px; font-weight: bold; color: #1a1a2e',
      layout: 'centered',
    };
  }
}

// ------------------------------------------------------------------
// 8. Full analysis (combined call)
// ------------------------------------------------------------------
export interface FullAnalysisResult {
  documentType: string;
  template: AiTemplateSuggestion;
  quality: AiQualityAnalysis;
}

export async function runFullAnalysis(fileName: string, content: string): Promise<FullAnalysisResult> {
  try {
    return await aiRequest('runFullAnalysis', { fileName, content });
  } catch {
    return {
      documentType: 'other',
      template: { template: 'professional_report', reason: 'Analysis failed', suggestions: [], style: { colors: ['#1a1a2e', '#00AEEF'], fonts: 'sans-serif', layout: 'single-column' } },
      quality: { qualityScore: 0, issues: [], improvements: [], grammarCheck: 'Unavailable', readabilityScore: 0 },
    };
  }
}

// ------------------------------------------------------------------
// 9. AI Content Formatter
// ------------------------------------------------------------------
export interface AiFormattedContent {
  title: string;
  subtitle: string;
  sections: Array<{
    heading: string;
    headingLevel: 1 | 2 | 3;
    content: string;
    isList: boolean;
    items: string[];
  }>;
  tables: Array<{
    headers: string[];
    rows: string[][];
  }>;
  metadata: Record<string, string>;
}

export async function aiFormatContent(fileName: string, rawContent: string, format: string): Promise<AiFormattedContent> {
  try {
    const result = await aiRequest('aiFormatContent', { fileName, content: rawContent, format });
    return {
      title: result.title || fileName.replace(/\.[^/.]+$/, ''),
      subtitle: result.subtitle || `Formatted ${format} document`,
      sections: Array.isArray(result.sections) ? result.sections : [],
      tables: Array.isArray(result.tables) ? result.tables : [],
      metadata: result.metadata || {},
    };
  } catch {
    return {
      title: fileName.replace(/\.[^/.]+$/, ''),
      subtitle: `${format} document`,
      sections: [],
      tables: [],
      metadata: {},
    };
  }
}
