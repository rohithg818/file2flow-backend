const crypto = require('crypto');
const fetch = require('node-fetch').default || require('node-fetch');
const FormData = require('form-data');
const { getSupabase } = require('./middleware/supabase');
const { retryFetch } = require('./retryFetch');
const {
  classifyJson,
  isSystemField,
  isUuidValue,
  escapeHtml,
  renderAllBlocks,
  renderBlock,
  renderBlockData,
} = require('./classify');

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://gotenberg-31r8.onrender.com';

// ============================================================
// STEP 2: MISTRAL — TITLE/INTRO (grounded in classified structure)
// ============================================================

async function mistralTitleAndIntro(classified) {
  const apiKey = MISTRAL_API_KEY;

  if (!apiKey) {
    return { title: classified.title, intro: '' };
  }

  const typeBreakdown = {};
  for (const block of classified.blocks) {
    const t = block.classification.type;
    if (!typeBreakdown[t]) typeBreakdown[t] = 0;
    typeBreakdown[t]++;
  }

  const breakdownStr = Object.entries(typeBreakdown)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');

  const identifiableValues = [];
  for (const block of classified.blocks) {
    if (block.classification.type === 'definition-list') {
      for (const [label, value] of block.classification.pairs) {
        if (typeof value === 'string' && value.length > 1 && value.length < 100 &&
            !/date|time|created|updated|modified|timestamp/i.test(label) && !isUuidValue(value)) {
          identifiableValues.push(`${label}: ${value}`);
        }
        if (identifiableValues.length >= 5) break;
      }
    }
    if (identifiableValues.length >= 5) break;
  }

  let tableRowCount = 0;
  let listItemCount = 0;
  for (const block of classified.blocks) {
    if (block.classification.type === 'table') {
      tableRowCount += block.classification.data.length;
    }
    if (block.classification.type === 'longtext-list') {
      listItemCount += block.classification.data.length;
    }
  }

  const sizeInfo = [];
  if (tableRowCount > 0) sizeInfo.push(`${tableRowCount} table rows`);
  if (listItemCount > 0) sizeInfo.push(`${listItemCount} list items`);
  if (classified.blocks.length > 0) sizeInfo.push(`${classified.blocks.length} sections`);

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: `You generate a title and a 1-2 sentence intro for a document, based on its classified data structure.

Rules:
- Title: max 60 chars, specific and descriptive — name the actual subject of the data if identifiable (e.g. a record name, company name, or document type found in the fields), not a generic label like "Data Report" unless nothing identifiable exists.
- Intro: 1-2 sentences. Mention what kind of data this is and roughly how much (e.g. number of table rows, number of list items) if that's evident from the structure provided.
- Never invent facts not present in the data. If the subject is unclear, default to a neutral but specific description (e.g. "Structured record with 12 fields and 2 data tables") rather than a vague generic title.
- Return ONLY valid JSON: {"title":"...","intro":"..."} — no explanation, no markdown fences, no extra keys.`,
          },
          {
            role: 'user',
            content: `Structure: ${breakdownStr}\n${sizeInfo.length > 0 ? 'Size: ' + sizeInfo.join(', ') + '\n' : ''}${identifiableValues.length > 0 ? 'Identifiable fields:\n' + identifiableValues.join('\n') + '\n' : ''}Current title guess: "${classified.title}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 150,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return { title: classified.title, intro: '' };

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();
    if (!content) return { title: classified.title, intro: '' };

    const cleaned = content.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      title: parsed.title || classified.title,
      intro: parsed.intro || '',
    };
  } catch {
    return { title: classified.title, intro: '' };
  }
}

// ============================================================
// TEMPLATE CSS
// ============================================================

function getDocumentCss() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1f2937;
      padding: 24px;
      max-width: 100%;
      overflow: hidden;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
    .report-title { font-size: 26px; font-weight: 700; color: #111827; margin-bottom: 2px; }
    .report-subtitle { color: #6b7280; font-size: 13px; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 2px solid #2563eb; }
    h3 { font-size: 15px; font-weight: 700; color: #1e40af; margin: 14px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; break-after: avoid; }
    h4 { font-size: 13px; font-weight: 700; color: #374151; margin: 10px 0 4px; break-after: avoid; }
    p { margin: 4px 0; line-height: 1.55; orphans: 3; widows: 3; }
    .kv { margin: 3px 0; line-height: 1.6; }
    .kv strong { color: #1e40af; }
    .kv-list { margin: 4px 0 8px 0; }
    .block { margin: 8px 0; }
    .section-block { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #f3f4f6; break-inside: avoid; }
    .section-block h3 { margin-bottom: 4px; }
    .text-block { margin: 6px 0; }
    .subsection { margin: 6px 0 6px 14px; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 11px; break-inside: avoid; }
    th { background: #1e40af; color: white; padding: 7px 10px; text-align: left; font-weight: 600; font-size: 10px; }
    td { padding: 5px 10px; border: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9fafb; }
    table.def-list td.def-label { font-weight: 600; color: #1e40af; width: 35%; background: #f0f4ff; }
    ul { padding-left: 18px; margin: 4px 0; }
    li { margin: 2px 0; break-inside: avoid; }
    @media print {
      body { padding: 0; overflow: visible; }
      h3, h4 { break-after: avoid; page-break-after: avoid; }
      table, .section-block, .block { break-inside: avoid; page-break-inside: avoid; }
      tr, li { break-inside: avoid; page-break-inside: avoid; }
      p { orphans: 3; widows: 3; }
    }
  `;
}

// ============================================================
// STRUCTURAL HASHING (for cache)
// ============================================================

function computeStructuralHash(data) {
  const shape = extractShape(data);
  return crypto.createHash('sha256').update(JSON.stringify(shape)).digest('hex').slice(0, 32);
}

function extractShape(data) {
  if (data === null || data === undefined) return 'null';
  if (Array.isArray(data)) {
    if (data.length === 0) return 'array:empty';
    return `array:${extractShape(data[0])}`;
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data).sort();
    const shape = {};
    for (const key of keys) {
      shape[key] = extractShape(data[key]);
    }
    return shape;
  }
  return typeof data;
}

// ============================================================
// CACHE LAYER (Supabase)
// ============================================================

async function getCachedTemplate(hash) {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('json_templates')
      .select('html_template, sample_keys')
      .eq('structural_hash', hash)
      .single();
    if (error || !data) return null;
    await supabase
      .from('json_templates')
      .update({ last_used_at: new Date().toISOString(), use_count: data.use_count + 1 })
      .eq('structural_hash', hash);
    return { template: data.html_template, sampleKeys: data.sample_keys };
  } catch {
    return null;
  }
}

async function saveTemplate(hash, htmlTemplate, sampleKeys) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('json_templates').upsert({
      structural_hash: hash,
      html_template: htmlTemplate,
      sample_keys: sampleKeys,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'structural_hash' });
  } catch (err) {
    console.warn('Failed to cache JSON template:', err.message);
  }
}

// ============================================================
// MAIN: JSON → PDF (Two-step pipeline)
// ============================================================

async function jsonToPdf(jsonBuffer) {
  let jsonData;
  try {
    jsonData = JSON.parse(jsonBuffer.toString('utf-8'));
  } catch {
    throw new Error('Invalid JSON data');
  }

  const classified = classifyJson(jsonData);

  if (classified.blocks.length === 0) {
    throw new Error('JSON contains no displayable data (all fields are system/internal)');
  }

  const hash = computeStructuralHash(jsonData);
  let htmlBody;

  const cached = await getCachedTemplate(hash);
  if (cached) {
    htmlBody = renderAllBlocks(classified.blocks);
  } else {
    const meta = await mistralTitleAndIntro(classified);
    classified.title = meta.title;
    classified.intro = meta.intro;

    htmlBody = renderAllBlocks(classified.blocks);

    await saveTemplate(hash, htmlBody, classified.blocks.map(b => b.key));
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">
<style>${getDocumentCss()}</style>
</head>
<body>
  <div class="report-title">${escapeHtml(classified.title)}</div>
  ${classified.intro ? `<div class="report-subtitle">${escapeHtml(classified.intro)}</div>` : '<div style="height:12px"></div>'}
  ${htmlBody}
</body>
</html>`;

  const htmlBuffer = Buffer.from(fullHtml, 'utf-8');
  const form = new FormData();
  form.append('files', htmlBuffer, { filename: 'index.html', contentType: 'text/html' });

  const response = await retryFetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
    timeout: 120_000,
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'No body');
    throw new Error(`Gotenberg Chromium failed [${response.status}]: ${err.substring(0, 500)}`);
  }

  const pdfBuffer = Buffer.from(await response.arrayBuffer());
  if (pdfBuffer.slice(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Gotenberg returned non-PDF output');
  }

  return pdfBuffer;
}

module.exports = {
  jsonToPdf,
  classifyJson,
  isSystemField,
  isUuidValue,
  renderBlock,
  renderAllBlocks,
  renderBlockData,
};
