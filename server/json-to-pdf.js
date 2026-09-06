const crypto = require('crypto');
const fetch = require('node-fetch').default || require('node-fetch');
const FormData = require('form-data');
const { getSupabase } = require('./middleware/supabase');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://gotenberg-31r8.onrender.com';

// ============================================================
// STRUCTURAL HASHING
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

function extractAllKeys(data, prefix = '') {
  const keys = [];
  if (data === null || typeof data !== 'object') return keys;

  if (Array.isArray(data)) {
    for (const item of data.slice(0, 5)) {
      keys.push(...extractAllKeys(item, prefix));
    }
    return [...new Set(keys)];
  }

  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...extractAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return [...new Set(keys)];
}

// ============================================================
// SYSTEM/INTERNAL FIELD DETECTION (pattern-based)
// ============================================================

const SYSTEM_FIELD_PATTERNS = [
  /^_/,                    // leading underscore
  /^id$/i,                 // id fields
  /^uuid$/i,
  /^owner/i,
  /^created_/i,
  /^modified_/i,
  /^updated_/i,
  /^deleted_/i,
  /^docstatus$/i,
  /^status$/i,
  /^type$/i,
  /^_metadata$/i,
  /^_confidence$/i,
  /^_version$/i,
  /^revision$/i,
  /^checksum$/i,
  /^hash$/i,
  /^etag$/i,
];

function isSystemField(key) {
  const lower = key.toLowerCase();
  return SYSTEM_FIELD_PATTERNS.some(p => p.test(lower));
}

// ============================================================
// STRUCTURAL ANALYSIS (classify each key)
// ============================================================

function analyzeStructure(data, maxDepth = 3) {
  if (maxDepth <= 0) return { type: 'scalar' };
  if (data === null || data === undefined) return { type: 'scalar' };

  if (Array.isArray(data)) {
    if (data.length === 0) return { type: 'array', childType: 'empty' };
    const first = data[0];
    if (typeof first !== 'object' || first === null) {
      return { type: 'array', childType: 'scalar' };
    }
    // Check if objects have long text fields (>100 chars)
    const keys = Object.keys(first);
    const hasLongText = keys.some(k => {
      const val = first[k];
      return typeof val === 'string' && val.length > 100;
    });
    if (hasLongText) {
      return { type: 'array', childType: 'longtext', keys, childShape: analyzeStructure(first, maxDepth - 1) };
    }
    return { type: 'array', childType: 'object', keys, childShape: analyzeStructure(first, maxDepth - 1) };
  }

  if (typeof data === 'object') {
    const entries = {};
    for (const [key, value] of Object.entries(data)) {
      entries[key] = analyzeStructure(value, maxDepth - 1);
    }
    return { type: 'object', fields: entries };
  }

  return { type: 'scalar' };
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
// GROQ API CALL (structure-aware, domain-agnostic)
// ============================================================

async function callGroqForTemplate(jsonData, structuralHash) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  // Analyze structure locally
  const structure = analyzeStructure(jsonData);
  const keys = extractAllKeys(jsonData).filter(k => !isSystemField(k.split('.').pop()));

  // Build compact structural description for Groq
  const sample = JSON.stringify(jsonData).slice(0, 3000);
  const structureDesc = JSON.stringify(structure, null, 0);

  const systemPrompt = `You are a document template generator. Analyze the JSON structure and generate a COMPLETE HTML document that renders it as a professional report.

RULES (structure-based, NOT domain-based):
1. Classify each top-level key by its structural role:
   - SHORT STRING (< 100 chars, not a date/ID) → render as a labeled value: <div class="kv"><strong>Label:</strong> value</div>
   - NUMBER → render as a labeled value with formatting
   - BOOLEAN → render as Yes/No
   - ARRAY OF SCALARS → render as a bulleted list
   - ARRAY OF OBJECTS WITH SHORT FIELDS → render as a TABLE
   - ARRAY OF OBJECTS WITH LONG TEXT (>100 chars) → render as HEADED SECTIONS (heading from a "name"/"title"/"label"/"subject" field, body from the long text field)
   - NESTED OBJECT → render as a SUB-SECTION with its own heading
   - NULL → skip

2. FILTER OUT system/internal fields (leading underscore, id, owner, created_*, modified_*, status, type, _metadata, _confidence, etc.) — do NOT render them

3. PICK the best "title" field: look for a key whose value is a short descriptive string that names the document (not an ID). Use it as the page title.

4. CSS requirements:
   - Font: 'Segoe UI', Arial, sans-serif
   - A4 page size with 20mm margins
   - h1 for title, h2 for sections, h3 for sub-sections
   - Tables: border-collapse, alternating row colors
   - Print-friendly: break-inside: avoid on tables and sections
   - Professional blue (#2563eb) accent color

5. Return ONLY the complete HTML document (with <!DOCTYPE html>, <head>, <style>, <body>). No explanation, no markdown fences.

6. DO NOT use placeholders like {{DATA}} or {{TABLE_ROWS}}. Render the actual data from the JSON into the HTML.`;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Structure analysis:\n${structureDesc}\n\nJSON data:\n${sample}` },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'No body');
    throw new Error(`Groq API error [${response.status}]: ${err.substring(0, 500)}`);
  }

  const result = await response.json();
  const html = result.choices?.[0]?.message?.content;

  if (!html) throw new Error('Groq returned empty response');

  // Clean up markdown fences if present
  let cleaned = html.replace(/```html\n?/gi, '').replace(/```\n?/gi, '').trim();

  // Validate it looks like HTML
  if (!cleaned.toLowerCase().includes('<html') && !cleaned.toLowerCase().includes('<!doctype')) {
    cleaned = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${cleaned}</body></html>`;
  }

  return cleaned;
}

// ============================================================
// SMART DATA RENDERER (structure-based, domain-agnostic)
// ============================================================

function renderJsonData(data, depth = 0) {
  if (data === null || data === undefined) return '';
  if (typeof data === 'boolean') return data ? 'Yes' : 'No';
  if (typeof data === 'number') return escapeHtml(String(data));
  if (typeof data === 'string') return escapeHtml(data);

  // Array
  if (Array.isArray(data)) {
    if (data.length === 0) return '<p style="color:#999;font-style:italic;">No data</p>';

    const first = data[0];

    // Array of scalars
    if (typeof first !== 'object' || first === null) {
      return '<ul>' + data.map(item => `<li>${escapeHtml(String(item ?? ''))}</li>`).join('') + '</ul>';
    }

    // Array of objects — check for long text fields
    const keys = Object.keys(first);
    const systemKeys = keys.filter(k => isSystemField(k));
    const displayKeys = keys.filter(k => !isSystemField(k));
    const hasLongText = displayKeys.some(k => {
      const val = first[k];
      return typeof val === 'string' && val.length > 100;
    });

    if (hasLongText) {
      // Render as headed sections
      return data.map((item, i) => {
        // Find heading field: first key with "name", "title", "label", "subject", "heading"
        const headingKey = displayKeys.find(k => /name|title|label|subject|heading/i.test(k)) || displayKeys[0];
        const bodyKey = displayKeys.find(k => k !== headingKey && typeof item[k] === 'string' && item[k].length > 50) || displayKeys.find(k => k !== headingKey);

        const heading = item[headingKey] ? escapeHtml(String(item[headingKey])) : `Section ${i + 1}`;
        let body = '';
        if (bodyKey && bodyKey !== headingKey) {
          body = `<p>${escapeHtml(String(item[bodyKey] ?? ''))}</p>`;
        }
        // Add other scalar fields
        const otherFields = displayKeys.filter(k => k !== headingKey && k !== bodyKey && typeof item[k] !== 'object');
        if (otherFields.length > 0) {
          body += otherFields.map(k =>
            `<div class="kv"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(item[k] ?? ''))}</div>`
          ).join('');
        }

        return `<div class="section-block"><h3>${heading}</h3>${body}</div>`;
      }).join('\n');
    }

    // Render as table
    let html = '<table><thead><tr>';
    displayKeys.forEach(k => { html += `<th>${escapeHtml(k)}</th>`; });
    html += '</tr></thead><tbody>';
    data.forEach(item => {
      html += '<tr>';
      displayKeys.forEach(k => {
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

  // Object
  if (typeof data === 'object') {
    const entries = Object.entries(data).filter(([k]) => !isSystemField(k));
    return entries.map(([key, val]) => {
      if (val && typeof val === 'object') {
        const childHtml = renderJsonData(val, depth + 1);
        return `<div class="subsection"><h3>${escapeHtml(key)}</h3>${childHtml}</div>`;
      }
      if (val === null || val === undefined) return '';
      return `<div class="kv"><strong>${escapeHtml(key)}:</strong> ${escapeHtml(String(val))}</div>`;
    }).join('\n');
  }

  return escapeHtml(String(data));
}

// ============================================================
// DATA INJECTION
// ============================================================

function injectDataIntoTemplate(template, jsonData) {
  let html = template;

  // If template has {{DATA}}, inject rendered data
  if (html.includes('{{DATA}}')) {
    const rendered = renderJsonData(jsonData);
    html = html.replace(/\{\{DATA\}\}/g, rendered);
  }

  // If template has {{TABLE_ROWS}}, generate table rows
  if (html.includes('{{TABLE_ROWS}}') && Array.isArray(jsonData)) {
    const rows = jsonData.map(item => {
      if (typeof item !== 'object' || item === null) {
        return `<tr><td>${escapeHtml(String(item))}</td></tr>`;
      }
      const cells = Object.values(item)
        .filter((_, i) => !isSystemField(Object.keys(item)[i]))
        .map(val => {
          if (val && typeof val === 'object') return `<td>${escapeHtml(JSON.stringify(val))}</td>`;
          return `<td>${escapeHtml(String(val ?? ''))}</td>`;
        }).join('');
      return `<tr>${cells}</tr>`;
    }).join('\n');
    html = html.replace(/\{\{TABLE_ROWS\}\}/g, rows);

    if (Array.isArray(jsonData) && jsonData.length > 0 && typeof jsonData[0] === 'object') {
      const headers = Object.keys(jsonData[0])
        .filter(k => !isSystemField(k))
        .map(k => `<th>${escapeHtml(k)}</th>`)
        .join('');
      html = html.replace(/\{\{TABLE_HEADERS\}\}/g, headers);
    }
  }

  // If no placeholder found, append rendered data
  if (!html.includes('{{DATA}}') && !html.includes('{{TABLE_ROWS}}')) {
    const rendered = renderJsonData(jsonData);
    html = html.replace('</body>', `${rendered}</body>`);
  }

  return html;
}

// ============================================================
// FALLBACK TEMPLATE (when Groq fails)
// ============================================================

function getFallbackTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1f2937; background: #fff; }
  h1 { font-size: 22px; color: #111827; font-weight: 700; margin: 16px 0 6px; padding-bottom: 8px; border-bottom: 2px solid #2563eb; }
  h2 { font-size: 16px; color: #374151; font-weight: 700; margin: 12px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
  h3 { font-size: 14px; color: #374151; font-weight: 700; margin: 10px 0 4px; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0 16px; font-size: 12px; }
  th { background: #1e40af; color: white; padding: 8px 12px; text-align: left; font-weight: 600; }
  td { padding: 6px 12px; border: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f3f4f6; }
  .kv { margin: 4px 0; line-height: 1.6; }
  .kv strong { color: #1e40af; }
  .section-block { margin: 12px 0; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
  .section-block h3 { margin-bottom: 6px; }
  .subsection { margin: 8px 0 8px 12px; }
  .report-title { font-size: 28px; color: #111827; margin-bottom: 4px; }
  .report-subtitle { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
  ul { padding-left: 20px; margin: 4px 0; }
  li { margin: 2px 0; }
  @media print {
    body { padding: 0; }
    h1, h2, h3 { break-after: avoid; }
    table, .section-block { break-inside: avoid; page-break-inside: avoid; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    p { orphans: 3; widows: 3; }
  }
</style>
</head>
<body>
  <div class="report-title">Data Report</div>
  <div class="report-subtitle">Generated from JSON</div>
  {{DATA}}
</body>
</html>`;
}

// ============================================================
// MAIN: JSON → PDF
// ============================================================

async function jsonToPdf(jsonBuffer) {
  let jsonData;
  try {
    jsonData = JSON.parse(jsonBuffer.toString('utf-8'));
  } catch {
    throw new Error('Invalid JSON data');
  }

  const hash = computeStructuralHash(jsonData);

  // Check cache
  let template = null;
  const cached = await getCachedTemplate(hash);
  if (cached) {
    template = cached.template;
  }

  // Cache miss: call Groq
  if (!template) {
    try {
      template = await callGroqForTemplate(jsonData, hash);
      const keys = extractAllKeys(jsonData);
      await saveTemplate(hash, template, keys);
    } catch (err) {
      console.warn('Groq template generation failed, using fallback:', err.message);
      template = getFallbackTemplate();
    }
  }

  // Inject data into template
  let html = injectDataIntoTemplate(template, jsonData);

  // Validate HTML
  if (!html.toLowerCase().includes('<html')) {
    html = getFallbackTemplate().replace('{{DATA}}', renderJsonData(jsonData));
  }

  // Convert HTML → PDF via Gotenberg Chromium
  const htmlBuffer = Buffer.from(html, 'utf-8');
  const form = new FormData();
  form.append('files', htmlBuffer, { filename: 'index.html', contentType: 'text/html' });

  const response = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
    signal: AbortSignal.timeout(120_000),
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

module.exports = { jsonToPdf, analyzeStructure, isSystemField, renderJsonData };
