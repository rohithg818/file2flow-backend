const { PDFDocument } = require('pdf-lib');
const fetch = require('node-fetch').default || require('node-fetch');
const FormData = require('form-data');
const XLSX = require('xlsx');
const mammoth = require('mammoth');
const JSZip = require('jszip');
const { jsonToPdf } = require('./json-to-pdf');
const { retryFetch } = require('./retryFetch');

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://gotenberg-31r8.onrender.com';

// ============================================================
// CONVERSION MAP (Hub Model — any-to-any)
// ============================================================

const CONTENT_TYPES = {
  pdf:  'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv:  'text/csv',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  html: 'text/html',
  md:   'text/markdown',
  txt:  'text/plain',
  json: 'application/json',
  image:'image/png',
};

const CONVERSION_MAP = {
  // === TO PDF (via Gotenberg) ===
  'docx:pdf':   { engine: 'docx-to-pdf' },
  'xlsx:pdf':   { engine: 'gotenberg-libreoffice' },
  'pptx:pdf':   { engine: 'pptx-to-pdf' },
  'odt:pdf':    { engine: 'gotenberg-libreoffice' },
  'ods:pdf':    { engine: 'gotenberg-libreoffice' },
  'odp:pdf':    { engine: 'gotenberg-libreoffice' },
  'rtf:pdf':    { engine: 'gotenberg-libreoffice' },
  'md:pdf':     { engine: 'markdown-to-pdf' },
  'html:pdf':   { engine: 'html-to-pdf' },
  'csv:pdf':    { engine: 'csv-to-html-table' },
  'image:pdf':  { engine: 'image-to-pdf' },
  'png:pdf':    { engine: 'image-to-pdf' },
  'jpg:pdf':    { engine: 'image-to-pdf' },
  'jpeg:pdf':   { engine: 'image-to-pdf' },
  'webp:pdf':   { engine: 'image-to-pdf' },
  'gif:pdf':    { engine: 'image-to-pdf' },
  'svg:pdf':    { engine: 'image-to-pdf' },
  'bmp:pdf':    { engine: 'image-to-pdf' },
  'tiff:pdf':   { engine: 'image-to-pdf' },
  'tif:pdf':    { engine: 'image-to-pdf' },
  'json:pdf':   { engine: 'json-to-pdf' },
  'txt:pdf':    { engine: 'text-to-pdf' },

  // === FROM PDF ===
  'pdf:html':   { engine: 'pdf-to-html' },
  'pdf:txt':    { engine: 'pdf-to-text' },
  'pdf:md':     { engine: 'pdf-to-text' },

  // === DOCX ===
  'docx:html':  { engine: 'docx-to-html' },
  'docx:md':    { engine: 'docx-to-markdown' },
  'docx:txt':   { engine: 'docx-to-text' },

  // === XLSX ===
  'xlsx:csv':   { engine: 'xlsx-to-csv' },
  'xlsx:html':  { engine: 'xlsx-to-html' },
  'xlsx:txt':   { engine: 'xlsx-to-text' },
  'xlsx:md':    { engine: 'xlsx-to-markdown' },

  // === PPTX ===
  'pptx:html':  { engine: 'pptx-to-html' },
  'pptx:txt':   { engine: 'pptx-to-text' },
  'pptx:md':    { engine: 'pptx-to-text' },

  // === CSV ===
  'csv:xlsx':   { engine: 'csv-to-xlsx' },
  'csv:html':   { engine: 'csv-to-html-table' },
  'csv:txt':    { engine: 'csv-to-text' },
  'csv:md':     { engine: 'csv-to-markdown' },

  // === HTML ===
  'html:txt':   { engine: 'html-to-text' },
  'html:md':    { engine: 'html-to-markdown' },
  'html:docx':  { engine: 'html-to-docx' },

  // === MARKDOWN ===
  'md:html':    { engine: 'markdown-to-html' },
  'md:txt':     { engine: 'markdown-to-text' },
  'md:docx':    { engine: 'html-to-docx', via: 'markdown-to-html' },

  // === JSON ===
  'json:html':  { engine: 'json-to-html' },
  'json:txt':   { engine: 'json-to-text' },

  // === TXT ===
  'txt:html':   { engine: 'text-to-html' },
  'txt:md':     { engine: 'text-to-markdown' },
  'txt:docx':   { engine: 'html-to-docx', via: 'text-to-html' },
  'txt:pdf':    { engine: 'text-to-pdf' },

  // === IMAGE ===
  'image:html': { engine: 'image-to-html' },
  'image:txt':  { engine: 'image-to-html' },
  'png:html':   { engine: 'image-to-html' },
  'png:txt':    { engine: 'image-to-html' },
  'jpg:html':   { engine: 'image-to-html' },
  'jpg:txt':    { engine: 'image-to-html' },
  'jpeg:html':  { engine: 'image-to-html' },
  'jpeg:txt':   { engine: 'image-to-html' },
  'webp:html':  { engine: 'image-to-html' },
  'webp:txt':   { engine: 'image-to-html' },
  'gif:html':   { engine: 'image-to-html' },
  'gif:txt':    { engine: 'image-to-html' },
  'svg:html':   { engine: 'image-to-html' },
  'svg:txt':    { engine: 'image-to-html' },
  'bmp:html':   { engine: 'image-to-html' },
  'bmp:txt':    { engine: 'image-to-html' },
};

// Extension → MIME type (authoritative source for Gotenberg)
const EXT_TO_MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc:  'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls:  'application/vnd.ms-excel',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt:  'application/vnd.ms-powerpoint',
  odt:  'application/vnd.oasis.opendocument.text',
  ods:  'application/vnd.oasis.opendocument.spreadsheet',
  odp:  'application/vnd.oasis.opendocument.presentation',
  rtf:  'text/rtf',
  html: 'text/html',
  htm:  'text/html',
  md:   'text/markdown',
  txt:  'text/plain',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif:  'image/gif',
  svg:  'image/svg+xml',
  pdf:  'application/pdf',
  csv:  'text/csv',
  json: 'application/json',
};

// MIME type to Gotenberg endpoint mapping
const GOTENBERG_MIME_MAP = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '/forms/libreoffice/convert',
  'application/msword': '/forms/libreoffice/convert',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '/forms/libreoffice/convert',
  'application/vnd.ms-excel': '/forms/libreoffice/convert',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '/forms/libreoffice/convert',
  'application/vnd.ms-powerpoint': '/forms/libreoffice/convert',
  'application/vnd.oasis.opendocument.text': '/forms/libreoffice/convert',
  'application/vnd.oasis.opendocument.spreadsheet': '/forms/libreoffice/convert',
  'application/vnd.oasis.opendocument.presentation': '/forms/libreoffice/convert',
  'text/rtf': '/forms/libreoffice/convert',
  'text/html': '/forms/chromium/convert/html',
  'text/markdown': '/forms/chromium/convert/html',
  'text/plain': '/forms/chromium/convert/html',
  'image/png': '/forms/libreoffice/convert',
  'image/jpeg': '/forms/libreoffice/convert',
  'image/webp': '/forms/libreoffice/convert',
  'image/gif': '/forms/libreoffice/convert',
  'image/svg+xml': '/forms/chromium/convert/html',
};

// ============================================================
// ENGINE: Gotenberg LibreOffice (forward)
// ============================================================

async function gotenbergLibreOffice(buffer, filename, mimeType) {
  const ext = filename.split('.').pop().toLowerCase();
  const resolvedMime = EXT_TO_MIME[ext] || mimeType;
  const endpoint = GOTENBERG_MIME_MAP[resolvedMime];
  if (!endpoint) throw new Error(`Unsupported MIME type for Gotenberg: ${resolvedMime} (ext: ${ext})`);

  const form = new FormData();
  form.append('files', buffer, { filename, contentType: resolvedMime });

  const response = await retryFetch(`${GOTENBERG_URL}${endpoint}`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
    timeout: 120_000,
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'No body');
    throw new Error(`Gotenberg LibreOffice failed [${response.status}]: ${err.substring(0, 500)}`);
  }

  const result = await response.buffer();
  if (result.slice(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Gotenberg returned non-PDF output');
  }
  return result;
}

// ============================================================
// ENGINE: Gotenberg Chromium (HTML → PDF)
// ============================================================

async function gotenbergChromium(htmlBuffer, filename) {
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

  const result = await response.buffer();
  if (result.slice(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Gotenberg returned non-PDF output');
  }
  return result;
}

// ============================================================
// ENGINE: HTML → PDF (via Chromium)
// ============================================================

async function htmlToPdf(htmlBuffer, filename) {
  return gotenbergChromium(htmlBuffer, filename);
}

// ============================================================
// ENGINE: Image → PDF (via pdf-lib)
// ============================================================

async function imageToPdf(imageBuffer, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  let image;
  const pdfDoc = await PDFDocument.create();

  if (ext === 'png') {
    image = await pdfDoc.embedPng(imageBuffer);
  } else if (['jpg', 'jpeg'].includes(ext)) {
    image = await pdfDoc.embedJpg(imageBuffer);
  } else {
    // For other formats (webp, gif, bmp, tiff), wrap in HTML and use Gotenberg Chromium
    const base64 = imageBuffer.toString('base64');
    const mimeExt = { webp: 'webp', gif: 'gif', svg: 'svg+xml', bmp: 'bmp', tiff: 'tiff', tif: 'tiff' };
    const mime = `image/${mimeExt[ext] || ext}`;
    const html = `<!DOCTYPE html><html><head><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff}img{max-width:100%;max-height:100vh}</style></head><body><img src="data:${mime};base64,${base64}" /></body></html>`;
    return gotenbergChromium(Buffer.from(html, 'utf-8'), 'image.html');
  }

  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

  return Buffer.from(await pdfDoc.save());
}

// ============================================================
// ENGINE: Text → PDF (via Chromium)
// ============================================================

async function textToPdf(textBuffer) {
  const text = textBuffer.toString('utf-8');
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; line-height: 1.6; padding: 40px; white-space: pre-wrap; word-break: break-word; color: #1f2937; }
  @media print { body { padding: 0; } }
</style></head><body>${escapeHtml(text)}</body></html>`;
  return gotenbergChromium(Buffer.from(html, 'utf-8'), 'output.html');
}

// ============================================================
// ENGINE: DOCX → PDF (via mammoth → HTML → Chromium)
// ============================================================

const DOCX_PDF_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
    color: #1a1a1a;
    width: 100%;
    overflow: hidden;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  @page { size: letter; margin: 0.4in 0.5in 0.4in 0.5in; }
  body { padding: 0; }
  h1 { font-size: 16pt; font-weight: 700; color: #111; margin: 10pt 0 4pt; padding-bottom: 4pt; border-bottom: 1.5pt solid #2563eb; break-after: avoid; }
  h2 { font-size: 12pt; font-weight: 700; color: #111; margin: 8pt 0 3pt; padding-bottom: 3pt; border-bottom: 0.5pt solid #ccc; break-after: avoid; }
  h3 { font-size: 11pt; font-weight: 700; color: #333; margin: 6pt 0 2pt; break-after: avoid; }
  h4 { font-size: 10.5pt; font-weight: 700; font-style: italic; color: #333; margin: 5pt 0 2pt; break-after: avoid; }
  p { margin: 2pt 0; text-align: left; line-height: 1.45; orphans: 3; widows: 3; }
  ul, ol { padding-left: 18pt; margin: 2pt 0; }
  li { margin: 1pt 0; break-inside: avoid; page-break-inside: avoid; }
  table { border-collapse: collapse; width: 100%; margin: 4pt 0; break-inside: avoid; page-break-inside: avoid; font-size: 9.5pt; }
  th { background: #2563eb; color: white; padding: 4pt 6pt; text-align: left; font-weight: 600; font-size: 9pt; }
  td { padding: 3pt 6pt; border: 0.5pt solid #d1d5db; font-size: 9.5pt; }
  tr:nth-child(even) td { background: #f9fafb; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  u { text-decoration: underline; }
  a { color: #2563eb; text-decoration: underline; }
  hr { border: none; border-top: 0.5pt solid #d1d5db; margin: 6pt 0; }
  blockquote { border-left: 3pt solid #2563eb; padding-left: 10pt; color: #555; margin: 4pt 0; }
  @media print {
    body { padding: 0; overflow: visible; }
    h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
    ul, ol, table, blockquote { break-inside: avoid; page-break-inside: avoid; }
    li, tr { break-inside: avoid; page-break-inside: avoid; }
    p { orphans: 3; widows: 3; }
    thead { display: table-header-group; }
  }
`;

async function docxToPdf(buffer) {
  const htmlResult = await mammoth.convertToHtml({ buffer });
  let bodyHtml = htmlResult.value || '<p>No content found.</p>';

  // Strip empty paragraphs that cause massive gaps
  bodyHtml = bodyHtml
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<p>(?:<br\s*\/?>)\s*<\/p>/gi, '')
    .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, '')
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '');

  // Also strip sections with only whitespace/nbsp
  bodyHtml = bodyHtml.replace(/<p>(\s|&nbsp;|&#160;|<br\s*\/?>)*<\/p>/gi, '');

  const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>${DOCX_PDF_STYLES}</style>
</head><body>${bodyHtml}</body></html>`;

  return gotenbergChromium(Buffer.from(fullHtml, 'utf-8'), 'output.html');
}

// ============================================================
// ENGINE: PPTX → PDF (via JSZip → HTML → Chromium)
// ============================================================

async function pptxToPdf(buffer) {
  const html = await pptxToHtml(buffer);
  const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; padding: 30px; }
  .slide { border: 1px solid #ddd; border-radius: 6px; padding: 20px; margin: 12px 0; background: #fafafa; page-break-inside: avoid; break-inside: avoid; }
  .slide-number { font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .slide-content { font-size: 13px; line-height: 1.6; color: #222; }
  @media print { body { padding: 0; } .slide { border: none; } }
</style></head><body>${html.toString('utf-8')}</body></html>`;

  return gotenbergChromium(Buffer.from(fullHtml, 'utf-8'), 'output.html');
}

// ============================================================
// ENGINE: Markdown → HTML → PDF (via Chromium)
// ============================================================

async function markdownToPdf(mdBuffer) {
  const md = mdBuffer.toString('utf-8');
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #333; }
  h1 { font-size: 28px; font-weight: 700; color: #1e40af; margin: 20px 0 6px; padding-bottom: 8px; border-bottom: 2px solid #2563eb; }
  h2 { font-size: 22px; font-weight: 700; color: #1e40af; margin: 20px 0 6px; padding-bottom: 6px; border-bottom: 1px solid #d1d5db; }
  h3 { font-size: 18px; font-weight: 700; color: #374151; margin: 16px 0 4px; }
  p { margin: 10px 0; }
  ul, ol { padding-left: 24px; margin: 10px 0; }
  li { margin: 4px 0; }
  code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
  pre { background: #1f2937; color: #e5e7eb; padding: 16px; border-radius: 8px; overflow-x: auto; }
  pre code { background: transparent; padding: 0; color: inherit; }
  blockquote { border-left: 4px solid #2563eb; padding-left: 16px; color: #6b7280; margin: 12px 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
  th { background: #2563eb; color: white; }
  tr:nth-child(even) td { background: #f9fafb; }
  hr { border: none; border-top: 1px solid #d1d5db; margin: 24px 0; }
  a { color: #2563eb; text-decoration: none; }
  strong { color: #111827; }
  @media print {
    body { padding: 0; }
    h1, h2, h3 { break-after: avoid; }
    ul, ol, table, blockquote, pre { break-inside: avoid; page-break-inside: avoid; }
    li { break-inside: avoid; page-break-inside: avoid; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    p { orphans: 3; widows: 3; }
  }
</style></head><body>
${simpleMarkdownToHtml(md)}
</body></html>`;
  return gotenbergChromium(Buffer.from(html, 'utf-8'), 'output.html');
}

function simpleMarkdownToHtml(md) {
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^\|(.+)\|$/gm, (match, content) => {
      const cells = content.split('|').map(c => c.trim());
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return `<p>${html}</p>`;
}

// ============================================================
// ENGINE: CSV → HTML table (inline or PDF via Chromium)
// ============================================================

async function csvToHtmlTable(csvBuffer) {
  const csvText = csvBuffer.toString('utf-8');
  const workbook = XLSX.read(csvText, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (data.length === 0) throw new Error('CSV file is empty');

  const headers = data[0] || [];
  const rows = data.slice(1);

  let html = '<table><thead><tr>';
  headers.forEach(h => { html += `<th>${escapeHtml(String(h ?? ''))}</th>`; });
  html += '</tr></thead><tbody>';
  rows.forEach(row => {
    html += '<tr>';
    headers.forEach((_, i) => { html += `<td>${escapeHtml(String(row[i] ?? ''))}</td>`; });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

// ============================================================
// ENGINE: XLSX → CSV / HTML / Text / Markdown (SheetJS)
// ============================================================

function xlsxToWorkbook(buffer) {
  return XLSX.read(buffer, { type: 'buffer' });
}

function xlsxToCsv(buffer) {
  const wb = xlsxToWorkbook(buffer);
  const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
  return Buffer.from(csv, 'utf-8');
}

function xlsxToText(buffer) {
  const wb = xlsxToWorkbook(buffer);
  let text = '';
  for (const name of wb.SheetNames) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
    if (wb.SheetNames.length > 1) text += `=== ${name} ===\n`;
    data.forEach(row => { text += row.map(c => String(c ?? '')).join('\t') + '\n'; });
    text += '\n';
  }
  return Buffer.from(text.trim(), 'utf-8');
}

function xlsxToMarkdown(buffer) {
  const wb = xlsxToWorkbook(buffer);
  let md = '';
  for (const name of wb.SheetNames) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
    if (data.length === 0) continue;
    if (wb.SheetNames.length > 1) md += `## ${name}\n\n`;
    const headers = data[0];
    md += '| ' + headers.map(h => String(h ?? '')).join(' | ') + ' |\n';
    md += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
    data.slice(1).forEach(row => {
      md += '| ' + row.map(c => String(c ?? '')).join(' | ') + ' |\n';
    });
    md += '\n';
  }
  return Buffer.from(md.trim(), 'utf-8');
}

function xlsxToHtmlTable(buffer) {
  const wb = xlsxToWorkbook(buffer);
  let tablesHtml = '<style>table{border-collapse:collapse;width:100%;margin:10px 0}th{background:#2563eb;color:white;padding:8px 12px;text-align:left;font-weight:600}td{padding:6px 12px;border:1px solid #e5e7eb}tr:nth-child(even) td{background:#f9fafb}.sheet-title{font-size:14px;font-weight:700;color:#333;margin:16px 0 8px}</style>';
  for (const name of wb.SheetNames) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
    if (data.length === 0) continue;
    if (wb.SheetNames.length > 1) tablesHtml += `<div class="sheet-title">${escapeHtml(name)}</div>`;
    tablesHtml += '<table><thead><tr>';
    data[0].forEach(h => { tablesHtml += `<th>${escapeHtml(String(h ?? ''))}</th>`; });
    tablesHtml += '</tr></thead><tbody>';
    data.slice(1).forEach(row => {
      tablesHtml += '<tr>';
      data[0].forEach((_, i) => { tablesHtml += `<td>${escapeHtml(String(row[i] ?? ''))}</td>`; });
      tablesHtml += '</tr>';
    });
    tablesHtml += '</tbody></table>';
  }
  return tablesHtml;
}

// ============================================================
// ENGINE: DOCX → HTML / Text / Markdown (mammoth)
// ============================================================

async function docxToHtml(buffer) {
  const result = await mammoth.convertToHtml({ buffer });
  return Buffer.from(result.value || '<p>No content found.</p>', 'utf-8');
}

async function docxToText(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return Buffer.from(result.value || '', 'utf-8');
}

async function docxToMarkdown(buffer) {
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const html = htmlResult.value || '';
  const md = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return Buffer.from(md, 'utf-8');
}

// ============================================================
// ENGINE: PPTX → HTML / Text (JSZip + XML)
// ============================================================

async function pptxToText(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files).filter(n => n.match(/ppt\/slides\/slide\d+\.xml/)).sort();
  let text = '';
  for (const f of slideFiles) {
    const xml = await zip.file(f).async('text');
    const matches = xml.match(/<a:t>([^<]+)<\/a:t>/g);
    if (matches) {
      text += matches.map(m => m.replace(/<\/?a:t>/g, '')).join(' ') + '\n\n';
    }
  }
  return Buffer.from(text.trim() || 'No text content found.', 'utf-8');
}

async function pptxToHtml(buffer) {
  const text = (await pptxToText(buffer)).toString('utf-8');
  const lines = text.split('\n').filter(l => l.trim());
  let html = '<style>.slide{border:1px solid #ddd;border-radius:6px;padding:16px;margin:10px 0;background:#fafafa;page-break-inside:avoid;}.slide-number{font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}.slide-content{font-size:13px;line-height:1.6;color:#222}</style>';
  let slideNum = 1;
  let currentSlide = '';
  for (const line of lines) {
    if (line.trim() === '' && currentSlide) {
      html += `<div class="slide"><div class="slide-number">Slide ${slideNum}</div><div class="slide-content">${escapeHtml(currentSlide).replace(/\n/g, '<br>')}</div></div>`;
      slideNum++;
      currentSlide = '';
    } else {
      currentSlide += (currentSlide ? '\n' : '') + line;
    }
  }
  if (currentSlide) {
    html += `<div class="slide"><div class="slide-number">Slide ${slideNum}</div><div class="slide-content">${escapeHtml(currentSlide).replace(/\n/g, '<br>')}</div></div>`;
  }
  return Buffer.from(html || '<p>No text content found in slides.</p>', 'utf-8');
}

// ============================================================
// ENGINE: CSV → XLSX / Text / Markdown
// ============================================================

async function csvToXlsx(csvBuffer) {
  const csvText = csvBuffer.toString('utf-8');
  const workbook = XLSX.read(csvText, { type: 'string' });
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

function csvToText(csvBuffer) {
  return csvBuffer;
}

function csvToMarkdown(csvBuffer) {
  const csvText = csvBuffer.toString('utf-8');
  const workbook = XLSX.read(csvText, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (data.length === 0) return Buffer.from('', 'utf-8');
  let md = '| ' + data[0].map(h => String(h ?? '')).join(' | ') + ' |\n';
  md += '| ' + data[0].map(() => '---').join(' | ') + ' |\n';
  data.slice(1).forEach(row => {
    md += '| ' + data[0].map((_, i) => String(row[i] ?? '')).join(' | ') + ' |\n';
  });
  return Buffer.from(md.trim(), 'utf-8');
}

// ============================================================
// ENGINE: HTML → Text / Markdown / DOCX
// ============================================================

function htmlToText(htmlBuffer) {
  const text = htmlBuffer.toString('utf-8')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return Buffer.from(text, 'utf-8');
}

function htmlToMarkdown(htmlBuffer) {
  const html = htmlBuffer.toString('utf-8');
  const md = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return Buffer.from(md, 'utf-8');
}

async function htmlToDocx(htmlBuffer) {
  const result = await mammoth.convertToHtml({ buffer: htmlBuffer });
  return Buffer.from(result.value || '<p>No content.</p>', 'utf-8');
}

// ============================================================
// ENGINE: Markdown → HTML / Text
// ============================================================

function markdownToHtml(mdBuffer) {
  const html = simpleMarkdownToHtml(mdBuffer.toString('utf-8'));
  return Buffer.from(`<html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;padding:20px;line-height:1.6}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}th{background:#2563eb;color:white}</style></head><body>${html}</body></html>`, 'utf-8');
}

function markdownToText(mdBuffer) {
  const text = mdBuffer.toString('utf-8')
    .replace(/^#{1,6} /gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^- /gm, '- ')
    .replace(/^\|(.+)\|$/gm, (m, c) => c.split('|').map(s => s.trim()).join('\t'))
    .replace(/^---$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return Buffer.from(text, 'utf-8');
}

// ============================================================
// ENGINE: JSON → HTML / Text
// ============================================================

function jsonToHtml(jsonBuffer) {
  let data;
  try { data = JSON.parse(jsonBuffer.toString('utf-8')); } catch { return Buffer.from('<p>Invalid JSON</p>', 'utf-8'); }

  let html = '<style>table{border-collapse:collapse;width:100%;margin:10px 0}th{background:#2563eb;color:white;padding:8px 12px;text-align:left}td{padding:6px 12px;border:1px solid #e5e7eb}tr:nth-child(even) td{background:#f9fafb}.kv{margin:4px 0}.kv strong{color:#1e40af}.json-block{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin:8px 0;font-family:monospace;font-size:11px;white-space:pre-wrap;word-break:break-all}</style>';

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object') {
      const keys = Object.keys(data[0]);
      html += '<table><thead><tr>' + keys.map(k => `<th>${escapeHtml(k)}</th>`).join('') + '</tr></thead><tbody>';
      data.forEach(item => {
        html += '<tr>' + keys.map(k => `<td>${escapeHtml(String(item[k] ?? ''))}</td>`).join('') + '</tr>';
      });
      html += '</tbody></table>';
    } else {
      html += '<ul>' + data.map(v => `<li>${escapeHtml(String(v))}</li>`).join('') + '</ul>';
    }
  } else if (typeof data === 'object' && data !== null) {
    html += Object.entries(data).map(([k, v]) =>
      `<div class="kv"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''))}</div>`
    ).join('');
  } else {
    html += `<div class="json-block">${escapeHtml(String(data))}</div>`;
  }

  return Buffer.from(html, 'utf-8');
}

function jsonToText(jsonBuffer) {
  let data;
  try { data = JSON.parse(jsonBuffer.toString('utf-8')); } catch { return jsonBuffer; }
  return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================================
// ENGINE: Text → HTML / Markdown
// ============================================================

function textToHtml(textBuffer) {
  const text = escapeHtml(textBuffer.toString('utf-8'));
  const html = `<html><head><meta charset="UTF-8"><style>body{font-family:monospace;font-size:12px;line-height:1.6;padding:20px;white-space:pre-wrap;word-break:break-word}</style></head><body>${text}</body></html>`;
  return Buffer.from(html, 'utf-8');
}

function textToMarkdown(textBuffer) {
  return textBuffer;
}

// ============================================================
// ENGINE: PDF → DOCX/XLSX (Gotenberg reverse — lossy)
// ============================================================

async function gotenbergLibreOfficeReverse(pdfBuffer, filename, targetFormat) {
  const form = new FormData();
  form.append('files', pdfBuffer, { filename, contentType: 'application/pdf' });
  form.append('outputFilename', targetFormat === 'docx' ? 'output.docx' : 'output.xlsx');

  const response = await retryFetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
    timeout: 120_000,
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'No body');
    throw new Error(`Gotenberg reverse conversion failed [${response.status}]: ${err.substring(0, 500)}`);
  }

  return await response.buffer();
}

// ============================================================
// ENGINE: PDF → HTML (pdf-lib page overview)
// ============================================================

async function pdfToHtml(pdfBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  let html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; padding: 20px; }
  .page { border: 1px solid #ddd; padding: 16px; margin: 10px 0; }
  .page-number { color: #666; font-size: 12px; margin-bottom: 8px; }
  @media print {
    body { padding: 0; }
    .page { border: none; margin: 0; padding: 0; break-inside: avoid; page-break-inside: avoid; }
    .page + .page { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
  }
</style></head><body>`;

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    html += `<div class="page"><div class="page-number">Page ${i + 1} of ${pageCount}</div>`;
    html += `<p>[Page ${i + 1} — ${Math.round(width)}x${Math.round(height)} points]</p>`;
    html += `<p><em>Full text extraction requires a dedicated PDF parser. This is a structural overview.</em></p>`;
    html += `</div>`;
  }

  html += '</body></html>';
  return Buffer.from(html, 'utf-8');
}

// ============================================================
// ENGINE: PDF → Text
// ============================================================

async function pdfToText(pdfBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  let text = '';
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    text += `=== Page ${i + 1} (${Math.round(width)}x${Math.round(height)} points) ===\n\n`;
    text += `[Page ${i + 1} — full text extraction requires a dedicated PDF parser]\n\n`;
  }
  return Buffer.from(text.trim(), 'utf-8');
}

// ============================================================
// ENGINE: Image → HTML
// ============================================================

async function imageToHtml(buffer, filename, mimeType) {
  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f0f0f0}img{max-width:100%;max-height:100vh;box-shadow:0 2px 12px rgba(0,0,0,0.1)}</style></head><body>
<img src="${dataUrl}" alt="${escapeHtml(filename)}">
</body></html>`;
  return Buffer.from(html, 'utf-8');
}

// ============================================================
// MAIN: convertFile (unified entry point — any-to-any)
// ============================================================

async function convertFile(fileBuffer, sourceFormat, targetFormat, filename, mimeType) {
  if (sourceFormat === targetFormat) {
    return { buffer: fileBuffer, contentType: mimeType, filename };
  }

  const key = `${sourceFormat}:${targetFormat}`;
  const route = CONVERSION_MAP[key];

  if (!route) {
    throw new Error(
      `Conversion from ${sourceFormat} to ${targetFormat} is not supported. ` +
      `Available: ${Object.keys(CONVERSION_MAP).join(', ')}`
    );
  }

  let resultBuffer;
  let resultContentType = CONTENT_TYPES[targetFormat] || 'application/octet-stream';

  switch (route.engine) {
    // === Gotenberg routes ===
    case 'gotenberg-libreoffice':
      resultBuffer = await gotenbergLibreOffice(fileBuffer, filename, mimeType);
      break;
    case 'gotenberg-chromium':
      resultBuffer = await gotenbergChromium(fileBuffer, filename);
      break;
    case 'html-to-pdf':
      resultBuffer = await htmlToPdf(fileBuffer, filename);
      break;
    case 'text-to-pdf':
      resultBuffer = await textToPdf(fileBuffer);
      break;
    case 'markdown-to-pdf':
      resultBuffer = await markdownToPdf(fileBuffer);
      break;
    case 'docx-to-pdf':
      resultBuffer = await docxToPdf(fileBuffer);
      break;
    case 'pptx-to-pdf':
      resultBuffer = await pptxToPdf(fileBuffer);
      break;
    case 'image-to-pdf':
      resultBuffer = await imageToPdf(fileBuffer, filename);
      break;
    case 'json-to-pdf':
      resultBuffer = await jsonToPdf(fileBuffer);
      break;
    case 'csv-to-html-table': {
      if (targetFormat === 'pdf') {
        const htmlTable = await csvToHtmlTable(fileBuffer);
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%;margin:10px 0}th{background:#2563eb;color:white;padding:8px 12px;text-align:left;font-weight:600}td{padding:6px 12px;border:1px solid #e5e7eb}tr:nth-child(even) td{background:#f9fafb}</style></head><body>${htmlTable}</body></html>`;
        resultBuffer = await gotenbergChromium(Buffer.from(fullHtml, 'utf-8'), filename);
      } else if (targetFormat === 'html') {
        const htmlTable = await csvToHtmlTable(fileBuffer);
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%;margin:10px 0}th{background:#2563eb;color:white;padding:8px 12px;text-align:left;font-weight:600}td{padding:6px 12px;border:1px solid #e5e7eb}tr:nth-child(even) td{background:#f9fafb}</style></head><body>${htmlTable}</body></html>`;
        resultBuffer = Buffer.from(fullHtml, 'utf-8');
      }
      break;
    }

    // === SheetJS routes ===
    case 'csv-to-xlsx':
      resultBuffer = await csvToXlsx(fileBuffer);
      break;
    case 'xlsx-to-csv':
      resultBuffer = xlsxToCsv(fileBuffer);
      resultContentType = 'text/csv';
      break;
    case 'xlsx-to-html': {
      const htmlTable = xlsxToHtmlTable(fileBuffer);
      resultBuffer = Buffer.from(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%;margin:10px 0}th{background:#2563eb;color:white;padding:8px 12px;text-align:left;font-weight:600}td{padding:6px 12px;border:1px solid #e5e7eb}tr:nth-child(even) td{background:#f9fafb}.sheet-title{font-size:14px;font-weight:700;color:#333;margin:16px 0 8px}</style></head><body>${htmlTable}</body></html>`, 'utf-8');
      break;
    }
    case 'xlsx-to-text':
      resultBuffer = xlsxToText(fileBuffer);
      break;
    case 'xlsx-to-markdown':
      resultBuffer = xlsxToMarkdown(fileBuffer);
      break;

    // === DOCX routes ===
    case 'docx-to-html': {
      const html = await docxToHtml(fileBuffer);
      resultBuffer = Buffer.from(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:20px;line-height:1.5}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px 10px}</style></head><body>${html.toString('utf-8')}</body></html>`, 'utf-8');
      break;
    }
    case 'docx-to-text':
      resultBuffer = await docxToText(fileBuffer);
      break;
    case 'docx-to-markdown':
      resultBuffer = await docxToMarkdown(fileBuffer);
      break;

    // === PPTX routes ===
    case 'pptx-to-text':
      resultBuffer = await pptxToText(fileBuffer);
      break;
    case 'pptx-to-html': {
      const html = await pptxToHtml(fileBuffer);
      resultBuffer = Buffer.from(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px 10px}</style></head><body>${html.toString('utf-8')}</body></html>`, 'utf-8');
      break;
    }

    // === CSV text/markdown routes ===
    case 'csv-to-text':
      resultBuffer = csvToText(fileBuffer);
      break;
    case 'csv-to-markdown':
      resultBuffer = csvToMarkdown(fileBuffer);
      break;

    // === HTML routes ===
    case 'html-to-text':
      resultBuffer = htmlToText(fileBuffer);
      break;
    case 'html-to-markdown':
      resultBuffer = htmlToMarkdown(fileBuffer);
      break;
    case 'html-to-docx':
      resultBuffer = await htmlToDocx(fileBuffer);
      break;

    // === Markdown routes ===
    case 'markdown-to-html':
      resultBuffer = markdownToHtml(fileBuffer);
      break;
    case 'markdown-to-text':
      resultBuffer = markdownToText(fileBuffer);
      break;

    // === JSON routes ===
    case 'json-to-html': {
      const html = jsonToHtml(fileBuffer);
      resultBuffer = Buffer.from(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th{background:#2563eb;color:white;padding:8px 12px;text-align:left}td{padding:6px 12px;border:1px solid #e5e7eb}tr:nth-child(even) td{background:#f9fafb}.kv{margin:4px 0}.kv strong{color:#1e40af}</style></head><body>${html.toString('utf-8')}</body></html>`, 'utf-8');
      break;
    }
    case 'json-to-text':
      resultBuffer = jsonToText(fileBuffer);
      break;

    // === Text routes ===
    case 'text-to-html':
      resultBuffer = textToHtml(fileBuffer);
      break;
    case 'text-to-markdown':
      resultBuffer = textToMarkdown(fileBuffer);
      break;

    // === PDF reverse ===
    case 'gotenberg-libreoffice-reverse':
      resultBuffer = await gotenbergLibreOfficeReverse(fileBuffer, filename, targetFormat);
      break;
    case 'pdf-to-html':
      resultBuffer = await pdfToHtml(fileBuffer);
      break;
    case 'pdf-to-text':
      resultBuffer = await pdfToText(fileBuffer);
      break;

    // === Image ===
    case 'image-to-html':
      resultBuffer = await imageToHtml(fileBuffer, filename, mimeType);
      break;

    default:
      throw new Error(`Unknown conversion engine: ${route.engine}`);
  }

  const outputFilename = filename.replace(/\.[^/.]+$/, `.${targetFormat}`);

  return {
    buffer: resultBuffer,
    contentType: resultContentType,
    filename: outputFilename,
    lossy: route.lossy || false,
  };
}

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getSupportedConversions(sourceFormat) {
  return Object.keys(CONVERSION_MAP)
    .filter(k => k.startsWith(`${sourceFormat}:`))
    .map(k => k.split(':')[1]);
}

function getAllConversions() {
  return Object.entries(CONVERSION_MAP).map(([key, val]) => ({
    from: key.split(':')[0],
    to: key.split(':')[1],
    lossy: val.lossy || false,
  }));
}

module.exports = {
  convertFile,
  getSupportedConversions,
  getAllConversions,
  CONVERSION_MAP,
  CONTENT_TYPES,
};
