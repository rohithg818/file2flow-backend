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

/**
 * Compute a structural hash of JSON data.
 * Hashes keys + types + nesting shape, NOT values.
 * This means two JSONs with the same shape but different values share a template.
 */
function computeStructuralHash(data) {
  const shape = extractShape(data);
  return crypto.createHash('sha256').update(JSON.stringify(shape)).digest('hex').slice(0, 32);
}

function extractShape(data) {
  if (data === null || data === undefined) return 'null';
  if (Array.isArray(data)) {
    if (data.length === 0) return 'array:empty';
    // Use the first element's shape (arrays are homogeneous in reports)
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
  return typeof data; // "string", "number", "boolean"
}

/**
 * Extract all unique keys from JSON data (flattened).
 */
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

    // Update usage stats
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
// GROQ API CALL
// ============================================================

async function callGroqForTemplate(jsonData, structuralHash) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  // Send a compact sample (max 500 chars) so Groq understands the shape
  const sample = JSON.stringify(jsonData).slice(0, 2000);

  const systemPrompt = `You are a document template generator. Convert the provided JSON data into clean, semantic HTML suitable for a professional PDF report.

RULES:
- Use <table> for arrays of objects (each object = row, keys = column headers)
- Use <h1>, <h2>, <h3> for nested object keys
- Use <ul>/<li> for nested objects within a row
- Use <p> for string values, <strong> for numbers
- Include basic CSS styling inline (fonts, colors, borders, padding)
- Make it look professional — like a business report
- Return ONLY the HTML, no explanation, no markdown fences, no code blocks
- The HTML should include <!DOCTYPE html>, <head> with <style>, and <body>
- Use a placeholder like {{DATA}} where the actual data rows will be injected
- For arrays, use {{TABLE_ROWS}} as the placeholder`;

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
        { role: 'user', content: `Generate an HTML template for this JSON structure:\n\n${sample}` },
      ],
      temperature: 0.3,
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

  // Clean up: remove markdown fences if present
  let cleaned = html.replace(/```html\n?/gi, '').replace(/```\n?/gi, '').trim();

  // Validate it looks like HTML
  if (!cleaned.toLowerCase().includes('<html') && !cleaned.toLowerCase().includes('<!doctype')) {
    cleaned = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${cleaned}</body></html>`;
  }

  return cleaned;
}

// ============================================================
// DATA INJECTION
// ============================================================

/**
 * Inject actual JSON data into an HTML template.
 * Handles {{DATA}}, {{TABLE_ROWS}}, and auto-detects array rendering.
 */
function injectDataIntoTemplate(template, jsonData) {
  let html = template;

  // If template has {{TABLE_ROWS}}, generate table rows from array data
  if (html.includes('{{TABLE_ROWS}}') && Array.isArray(jsonData)) {
    const rows = jsonData.map(item => {
      if (typeof item !== 'object' || item === null) {
        return `<tr><td>${escapeHtml(String(item))}</td></tr>`;
      }
      const cells = Object.values(item).map(val => {
        if (val && typeof val === 'object') {
          return `<td>${escapeHtml(JSON.stringify(val))}</td>`;
        }
        return `<td>${escapeHtml(String(val ?? ''))}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('\n');

    html = html.replace(/\{\{TABLE_ROWS\}\}/g, rows);

    // Also replace {{TABLE_HEADERS}} if present
    if (Array.isArray(jsonData) && jsonData.length > 0 && typeof jsonData[0] === 'object') {
      const headers = Object.keys(jsonData[0]).map(k =>
        `<th>${escapeHtml(k)}</th>`
      ).join('');
      html = html.replace(/\{\{TABLE_HEADERS\}\}/g, headers);
    }
  }

  // If template has {{DATA}}, inject the full JSON as a formatted block
  if (html.includes('{{DATA}}')) {
    const formatted = formatJsonForDisplay(jsonData);
    html = html.replace(/\{\{DATA\}\}/g, formatted);
  }

  // If neither placeholder exists, append data at the end of body
  if (!html.includes('{{TABLE_ROWS}}') && !html.includes('{{DATA}}')) {
    const dataBlock = Array.isArray(jsonData)
      ? generateFallbackTable(jsonData)
      : `<pre style="font-family: monospace; white-space: pre-wrap;">${escapeHtml(JSON.stringify(jsonData, null, 2))}</pre>`;

    html = html.replace('</body>', `${dataBlock}</body>`);
  }

  return html;
}

function formatJsonForDisplay(data) {
  if (Array.isArray(data)) {
    return generateFallbackTable(data);
  }
  if (typeof data === 'object' && data !== null) {
    return Object.entries(data).map(([key, val]) =>
      `<div style="margin:4px 0;"><strong>${escapeHtml(key)}:</strong> ${escapeHtml(String(val ?? ''))}</div>`
    ).join('');
  }
  return escapeHtml(String(data));
}

function generateFallbackTable(items) {
  if (items.length === 0) return '<p>No data</p>';

  const firstItem = items[0];
  if (typeof firstItem !== 'object' || firstItem === null) {
    return `<ul>${items.map(i => `<li>${escapeHtml(String(i))}</li>`).join('')}</ul>`;
  }

  const keys = Object.keys(firstItem);
  let html = '<table style="border-collapse:collapse;width:100%;font-size:12px;"><thead><tr>';
  keys.forEach(k => { html += `<th style="background:#1e40af;color:white;padding:8px 12px;text-align:left;">${escapeHtml(k)}</th>`; });
  html += '</tr></thead><tbody>';

  items.forEach(item => {
    html += '<tr>';
    keys.forEach(k => {
      const val = item[k];
      const display = val === null ? 'null' : val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
      html += `<td style="padding:6px 12px;border:1px solid #e5e7eb;">${escapeHtml(display)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
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
  h1 { font-size: 22px; color: #111827; margin: 16px 0 10px; border-bottom: 2px solid #2563eb; padding-bottom: 6px; }
  h2 { font-size: 16px; color: #374151; margin: 12px 0 8px; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0 16px; font-size: 12px; }
  th { background: #1e40af; color: white; padding: 8px 12px; text-align: left; font-weight: 600; }
  td { padding: 6px 12px; border: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f3f4f6; }
  .json-block { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin: 8px 0; font-family: monospace; font-size: 11px; white-space: pre-wrap; word-break: break-all; }
  .kv { margin: 4px 0; }
  .kv strong { color: #1e40af; }
  .report-title { font-size: 28px; color: #111827; margin-bottom: 4px; }
  .report-subtitle { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
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
  // Parse JSON
  let jsonData;
  try {
    jsonData = JSON.parse(jsonBuffer.toString('utf-8'));
  } catch {
    throw new Error('Invalid JSON data');
  }

  // Compute structural hash
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
    html = getFallbackTemplate().replace('{{DATA}}',
      Array.isArray(jsonData) ? generateFallbackTable(jsonData) : escapeHtml(JSON.stringify(jsonData, null, 2))
    );
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

  const pdfBuffer = await response.buffer();
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

module.exports = { jsonToPdf, computeStructuralHash, extractAllKeys };
