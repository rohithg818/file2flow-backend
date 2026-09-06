const crypto = require('crypto');
const fetch = require('node-fetch').default || require('node-fetch');
const FormData = require('form-data');
const { getSupabase } = require('./middleware/supabase');
const { retryFetch } = require('./retryFetch');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://gotenberg-31r8.onrender.com';

// ============================================================
// SYSTEM FIELD DETECTION (pattern-based, deterministic)
// ============================================================

const SYSTEM_FIELD_PATTERNS = [
  /^_/,
  /^id$/i,
  /^uuid$/i,
  /^owner/i,
  /^created_/i,
  /^modified_/i,
  /^updated_/i,
  /^deleted_/i,
  /^docstatus$/i,
  /^revision$/i,
  /^checksum$/i,
  /^hash$/i,
  /^etag$/i,
  /^__v$/i,
  /^version$/i,
];

function isSystemField(key) {
  return SYSTEM_FIELD_PATTERNS.some(p => p.test(key));
}

// ============================================================
// STEP 1: DETERMINISTIC STRUCTURAL CLASSIFIER
// ============================================================

const HEADING_KEY_PATTERNS = [
  /^name$/i,
  /^title$/i,
  /^label$/i,
  /^subject$/i,
  /^heading$/i,
  /^clause[_\s]?title$/i,
  /^section[_\s]?title$/i,
  /^item[_\s]?name$/i,
  /^description$/i,
  /^summary$/i,
  /^topic$/i,
  /^question$/i,
];

const LONG_TEXT_THRESHOLD = 100;

function isLongText(value) {
  return typeof value === 'string' && value.length > LONG_TEXT_THRESHOLD;
}

function isDateField(key, value) {
  if (typeof value !== 'string') return false;
  return /date|time|created|updated|modified|timestamp/i.test(key) ||
    /^\d{4}-\d{2}-\d{2}/.test(value);
}

function isLikelyTitle(key) {
  return HEADING_KEY_PATTERNS.some(p => p.test(key));
}

function findHeadingKey(keys, sample) {
  const preferred = keys.find(k => isLikelyTitle(k));
  if (preferred) return preferred;
  const shortString = keys.find(k =>
    typeof sample[k] === 'string' &&
    sample[k].length > 0 &&
    sample[k].length < 200 &&
    !isSystemField(k) &&
    !isDateField(k, sample[k])
  );
  return shortString || keys[0];
}

function findBodyKey(keys, headingKey, sample) {
  return keys.find(k =>
    k !== headingKey &&
    typeof sample[k] === 'string' &&
    sample[k].length > LONG_TEXT_THRESHOLD
  );
}

// Classify a JSON value into a block type
function classifyValue(key, value) {
  if (value === null || value === undefined) return { type: 'noise', reason: 'null' };
  if (isSystemField(key)) return { type: 'noise', reason: 'system_field' };

  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'noise', reason: 'empty_array' };

    const first = value[0];
    if (first === null || first === undefined) return { type: 'noise', reason: 'empty_elements' };

    if (typeof first !== 'object') {
      return { type: 'scalar-list', data: value };
    }

    const objKeys = Object.keys(first).filter(k => !isSystemField(k));
    const hasLongText = objKeys.some(k => isLongText(first[k]));

    if (hasLongText) {
      return {
        type: 'longtext-list',
        data: value,
        headingKey: findHeadingKey(objKeys, first),
        bodyKey: findBodyKey(objKeys, findHeadingKey(objKeys, first), first),
        displayKeys: objKeys,
      };
    }

    return {
      type: 'table',
      data: value,
      columns: objKeys,
    };
  }

  if (typeof value === 'object') {
    const childKeys = Object.keys(value).filter(k => !isSystemField(k));
    if (childKeys.length === 0) return { type: 'noise', reason: 'empty_object' };

    const hasLongText = childKeys.some(k => isLongText(value[k]));
    if (hasLongText) {
      return { type: 'longtext-block', data: value, keys: childKeys };
    }

    return { type: 'sub-section', data: value, keys: childKeys };
  }

  return { type: 'scalar', data: value, key };
}

// Main classifier: walks JSON, returns array of classified blocks
function classifyJson(data) {
  if (data === null || data === undefined) {
    return { title: 'Data Report', intro: '', blocks: [] };
  }

  if (typeof data !== 'object') {
    return {
      title: 'Data Report',
      intro: '',
      blocks: [{ key: 'value', classification: { type: 'scalar', data, key: 'value' } }],
    };
  }

  // If root is an array
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { title: 'Data Report', intro: '', blocks: [] };
    }
    const first = data[0];
    if (typeof first !== 'object' || first === null) {
      return {
        title: 'Data Report',
        intro: '',
        blocks: [{ key: 'data', classification: { type: 'scalar-list', data } }],
      };
    }
    const objKeys = Object.keys(first).filter(k => !isSystemField(k));
    const hasLongText = objKeys.some(k => isLongText(first[k]));
    if (hasLongText) {
      return {
        title: 'Data Report',
        intro: '',
        blocks: [{
          key: 'data',
          classification: {
            type: 'longtext-list',
            data,
            headingKey: findHeadingKey(objKeys, first),
            bodyKey: findBodyKey(objKeys, findHeadingKey(objKeys, first), first),
            displayKeys: objKeys,
          },
        }],
      };
    }
    return {
      title: 'Data Report',
      intro: '',
      blocks: [{ key: 'data', classification: { type: 'table', data, columns: objKeys } }],
    };
  }

  // Root is object — classify each top-level key
  const blocks = [];
  let title = '';
  let intro = '';

  const entries = Object.entries(data);
  for (const [key, value] of entries) {
    const classification = classifyValue(key, value);
    if (classification.type === 'noise') continue;

    blocks.push({ key, classification });
  }

  // Try to infer title from first short scalar string
  for (const block of blocks) {
    if (block.classification.type === 'scalar' && typeof block.classification.data === 'string') {
      const val = block.classification.data;
      if (val.length > 2 && val.length < 200 && !isDateField(block.key, val)) {
        title = val;
        break;
      }
    }
  }

  return { title: title || 'Data Report', intro, blocks };
}

// ============================================================
// STEP 1b: DETERMINISTIC BLOCK RENDERER (no AI)
// ============================================================

function renderScalarList(data) {
  return '<ul>' + data.map(item =>
    `<li>${escapeHtml(String(item ?? ''))}</li>`
  ).join('') + '</ul>';
}

function renderTable(data, columns) {
  if (columns.length === 0) return '';
  let html = '<table><thead><tr>';
  columns.forEach(k => { html += `<th>${escapeHtml(k)}</th>`; });
  html += '</tr></thead><tbody>';
  data.forEach(item => {
    html += '<tr>';
    columns.forEach(k => {
      const val = item[k];
      if (val && typeof val === 'object') {
        html += `<td>${escapeHtml(JSON.stringify(val))}</td>`;
      } else {
        html += `<td>${escapeHtml(String(val ?? ''))}</td>`;
      }
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

function renderLongTextList(block) {
  const { data, headingKey, bodyKey, displayKeys } = block.classification;
  return data.map((item, i) => {
    const heading = item[headingKey] ? escapeHtml(String(item[headingKey])) : `Section ${i + 1}`;
    let body = '';
    if (bodyKey && bodyKey !== headingKey) {
      body = `<p>${escapeHtml(String(item[bodyKey] ?? ''))}</p>`;
    }
    const otherFields = displayKeys.filter(k =>
      k !== headingKey && k !== bodyKey && typeof item[k] !== 'object'
    );
    if (otherFields.length > 0) {
      body += '<div class="kv-list">' + otherFields.map(k =>
        `<div class="kv"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(item[k] ?? ''))}</div>`
      ).join('') + '</div>';
    }
    return `<div class="section-block"><h3>${heading}</h3>${body}</div>`;
  }).join('\n');
}

function renderLongTextBlock(block) {
  const { data, keys } = block.classification;
  return keys.map(k => {
    const val = data[k];
    if (typeof val === 'string') {
      return `<div class="text-block"><h4>${escapeHtml(k)}</h4><p>${escapeHtml(val)}</p></div>`;
    }
    if (val && typeof val === 'object') {
      return `<div class="text-block"><h4>${escapeHtml(k)}</h4>${renderBlockData(val)}</div>`;
    }
    if (val === null || val === undefined) return '';
    return `<div class="kv"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(val))}</div>`;
  }).join('\n');
}

function renderSubSection(block) {
  const { data, keys } = block.classification;
  return keys.map(k => {
    const val = data[k];
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      return `<div class="subsection"><h4>${escapeHtml(k)}</h4>${renderBlockData(val)}</div>`;
    }
    return `<div class="kv"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(val))}</div>`;
  }).join('\n');
}

function renderBlockData(data) {
  if (data === null || data === undefined) return '';
  if (typeof data === 'boolean') return data ? 'Yes' : 'No';
  if (typeof data === 'number') return escapeHtml(String(data));
  if (typeof data === 'string') return escapeHtml(data);
  if (Array.isArray(data)) {
    if (data.length === 0) return '<em>No data</em>';
    const first = data[0];
    if (typeof first !== 'object' || first === null) return renderScalarList(data);
    const keys = Object.keys(first).filter(k => !isSystemField(k));
    return renderTable(data, keys);
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data).filter(([k]) => !isSystemField(k));
    return entries.map(([k, v]) => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return `<div class="subsection"><h4>${escapeHtml(k)}</h4>${renderBlockData(v)}</div>`;
      return `<div class="kv"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</div>`;
    }).join('\n');
  }
  return escapeHtml(String(data));
}

function renderBlock(block) {
  const c = block.classification;
  switch (c.type) {
    case 'scalar':
      return `<div class="kv"><strong>${escapeHtml(block.key)}:</strong> ${escapeHtml(String(c.data ?? ''))}</div>`;
    case 'scalar-list':
      return `<div class="block"><h3>${escapeHtml(block.key)}</h3>${renderScalarList(c.data)}</div>`;
    case 'table':
      return `<div class="block"><h3>${escapeHtml(block.key)}</h3>${renderTable(c.data, c.columns)}</div>`;
    case 'longtext-list':
      return renderLongTextList(block);
    case 'longtext-block':
      return `<div class="block"><h3>${escapeHtml(block.key)}</h3>${renderLongTextBlock(block)}</div>`;
    case 'sub-section':
      return `<div class="block"><h3>${escapeHtml(block.key)}</h3>${renderSubSection(block)}</div>`;
    default:
      return '';
  }
}

function renderAllBlocks(blocks) {
  return blocks.map(renderBlock).filter(Boolean).join('\n');
}

// ============================================================
// STEP 2: GROQ — TITLE/INTRO + PER-BLOCK HTML (minimal)
// ============================================================

async function groqTitleAndIntro(classified) {
  const apiKey = MISTRAL_API_KEY || GROQ_API_KEY;
  const apiUrl = MISTRAL_API_KEY ? MISTRAL_API_URL : GROQ_API_URL;
  const model = MISTRAL_API_KEY ? 'mistral-small-latest' : 'openai/gpt-oss-120b';

  if (!apiKey) {
    return { title: classified.title, intro: '' };
  }

  const sampleKeys = classified.blocks.map(b => b.key).slice(0, 20);
  const sample = JSON.stringify(classified.blocks.slice(0, 5).map(b => ({
    key: b.key,
    type: b.classification.type,
    sample: typeof b.classification.data === 'object'
      ? JSON.stringify(b.classification.data).slice(0, 200)
      : String(b.classification.data).slice(0, 200),
  })));

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You generate a title and 1-line intro for a document from its JSON structure. Return ONLY valid JSON: {"title":"...","intro":"..."} — no explanation, no markdown fences. Title should be descriptive (max 60 chars). Intro should be one sentence describing what this data contains.`,
          },
          {
            role: 'user',
            content: `Keys: [${sampleKeys.join(', ')}]\n\nSample data:\n${sample}\n\nCurrent title guess: "${classified.title}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 100,
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

  // STEP 1: Deterministic classification (free, instant)
  const classified = classifyJson(jsonData);

  if (classified.blocks.length === 0) {
    throw new Error('JSON contains no displayable data (all fields are system/internal)');
  }

  // Check cache for this structural shape
  const hash = computeStructuralHash(jsonData);
  let htmlBody;

  const cached = await getCachedTemplate(hash);
  if (cached) {
    htmlBody = renderAllBlocks(classified.blocks);
  } else {
    // STEP 2: Groq picks title/intro (small, targeted call)
    const meta = await groqTitleAndIntro(classified);
    classified.title = meta.title;
    classified.intro = meta.intro;

    // Render all blocks deterministically (type was already assigned in Step 1)
    htmlBody = renderAllBlocks(classified.blocks);

    // Cache the rendered body for this structural shape
    await saveTemplate(hash, htmlBody, classified.blocks.map(b => b.key));
  }

  // Assemble final document
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

  // Convert HTML → PDF via Gotenberg Chromium
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

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  jsonToPdf,
  classifyJson,
  isSystemField,
  renderBlock,
  renderAllBlocks,
  renderBlockData,
};
