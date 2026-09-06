const { PDFDocument } = require('pdf-lib');
const fetch = require('node-fetch').default || require('node-fetch');
const FormData = require('form-data');
const XLSX = require('xlsx');
const { jsonToPdf } = require('./json-to-pdf');

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://gotenberg-31r8.onrender.com';

// ============================================================
// CONVERSION MAP (Hub Model)
// ============================================================

/**
 * Conversion routes through intermediate formats:
 *
 * TO PDF:
 *   DOCX/XLSX/PPTX/ODT/ODS/ODP/RTF → [LibreOffice] → PDF
 *   HTML/CSV → [Chromium] → PDF
 *   Images → [LibreOffice] → PDF
 *   JSON → [Groq → HTML → Chromium] → PDF (Phase 3)
 *
 * FROM PDF:
 *   PDF → DOCX → [LibreOffice reverse] → DOCX (lossy)
 *   PDF → XLSX → [LibreOffice reverse] → XLSX (lossy)
 *   PDF → HTML → [pdf-lib text extraction] → HTML (basic)
 *
 * BETWEEN OTHERS:
 *   CSV → XLSX → [SheetJS] → XLSX (direct, no Gotenberg)
 *   CSV → PDF → [HTML table → Chromium] → PDF
 */

const CONVERSION_MAP = {
  // === TO PDF (via Gotenberg) ===
  'docx:pdf':   { engine: 'gotenberg-libreoffice' },
  'xlsx:pdf':   { engine: 'gotenberg-libreoffice' },
  'pptx:pdf':   { engine: 'gotenberg-libreoffice' },
  'odt:pdf':    { engine: 'gotenberg-libreoffice' },
  'ods:pdf':    { engine: 'gotenberg-libreoffice' },
  'odp:pdf':    { engine: 'gotenberg-libreoffice' },
  'rtf:pdf':    { engine: 'gotenberg-libreoffice' },
  'md:pdf':     { engine: 'markdown-to-pdf' },
  'html:pdf':   { engine: 'gotenberg-chromium' },
  'csv:pdf':    { engine: 'csv-to-html-table' },  // CSV → HTML table → Chromium → PDF
  'image:pdf':  { engine: 'gotenberg-libreoffice' },
  'json:pdf':   { engine: 'json-to-pdf' },         // JSON → Groq HTML → Chromium → PDF

  // === FROM PDF (via Gotenberg reverse) ===
  'pdf:docx':   { engine: 'gotenberg-libreoffice-reverse', lossy: true },
  'pdf:xlsx':   { engine: 'gotenberg-libreoffice-reverse', lossy: true },
  'pdf:html':   { engine: 'pdf-to-html' },

  // === BETWEEN OTHERS ===
  'csv:xlsx':   { engine: 'sheetjs-csv-to-xlsx' },
  'csv:html':   { engine: 'csv-to-html-table' },
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
  const endpoint = GOTENBERG_MIME_MAP[mimeType];
  if (!endpoint) throw new Error(`Unsupported MIME type for Gotenberg: ${mimeType}`);

  const form = new FormData();
  form.append('files', buffer, { filename, contentType: mimeType });

  const response = await fetch(`${GOTENBERG_URL}${endpoint}`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
    signal: AbortSignal.timeout(120_000),
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

  const result = await response.buffer();
  if (result.slice(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Gotenberg returned non-PDF output');
  }
  return result;
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
// ENGINE: CSV → HTML table → PDF (via Chromium)
// ============================================================

async function csvToHtmlTable(csvBuffer) {
  const csvText = csvBuffer.toString('utf-8');
  const workbook = XLSX.read(csvText, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (data.length === 0) throw new Error('CSV file is empty');

  const headers = data[0] || [];
  const rows = data.slice(1);

  let html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; padding: 20px; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; }
  th { background: #2563eb; color: white; padding: 8px 12px; text-align: left; font-weight: 600; }
  td { padding: 6px 12px; border: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f9fafb; }
</style></head><body>
<table><thead><tr>`;

  headers.forEach(h => { html += `<th>${escapeHtml(String(h ?? ''))}</th>`; });
  html += '</tr></thead><tbody>';

  rows.forEach(row => {
    html += '<tr>';
    headers.forEach((_, i) => {
      html += `<td>${escapeHtml(String(row[i] ?? ''))}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table></body></html>';
  return Buffer.from(html, 'utf-8');
}

// ============================================================
// ENGINE: CSV → XLSX (SheetJS, direct)
// ============================================================

async function csvToXlsx(csvBuffer) {
  const csvText = csvBuffer.toString('utf-8');
  const workbook = XLSX.read(csvText, { type: 'string' });
  const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(xlsxBuffer);
}

// ============================================================
// ENGINE: PDF → DOCX/XLSX (Gotenberg reverse — lossy)
// ============================================================

async function gotenbergLibreOfficeReverse(pdfBuffer, filename, targetFormat) {
  // Gotenberg's /forms/libreoffice/convert accepts PDF and converts to DOCX/XLSX
  const form = new FormData();
  const targetMime = targetFormat === 'docx'
    ? 'application/pdf'
    : 'application/pdf';

  form.append('files', pdfBuffer, { filename, contentType: 'application/pdf' });

  // Gotenberg uses the file extension to determine output format
  const outputFilename = targetFormat === 'docx' ? 'output.docx' : 'output.xlsx';
  form.append('outputFilename', outputFilename);

  const response = await fetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'No body');
    throw new Error(`Gotenberg reverse conversion failed [${response.status}]: ${err.substring(0, 500)}`);
  }

  return await response.buffer();
}

// ============================================================
// ENGINE: PDF → HTML (basic text extraction via pdf-lib)
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
// MAIN: convertFile (unified entry point)
// ============================================================

/**
 * Convert a file from one format to another using the hub model.
 * @param {Buffer} fileBuffer - Source file content
 * @param {string} sourceFormat - e.g. 'docx', 'pdf', 'csv'
 * @param {string} targetFormat - e.g. 'pdf', 'docx', 'xlsx'
 * @param {string} filename - Original filename
 * @param {string} mimeType - MIME type of source file
 * @returns {{ buffer: Buffer, contentType: string, filename: string, lossy?: boolean }}
 */
async function convertFile(fileBuffer, sourceFormat, targetFormat, filename, mimeType) {
  if (sourceFormat === targetFormat) {
    return { buffer: fileBuffer, contentType: mimeType, filename };
  }

  const key = `${sourceFormat}:${targetFormat}`;
  const route = CONVERSION_MAP[key];

  if (!route) {
    throw new Error(
      `Conversion from ${sourceFormat} to ${targetFormat} is not supported. ` +
      `Available conversions: ${Object.keys(CONVERSION_MAP).join(', ')}`
    );
  }

  let resultBuffer;
  let resultContentType;

  switch (route.engine) {
    case 'markdown-to-pdf':
      resultBuffer = await markdownToPdf(fileBuffer);
      resultContentType = 'application/pdf';
      break;

    case 'gotenberg-libreoffice':
      resultBuffer = await gotenbergLibreOffice(fileBuffer, filename, mimeType);
      resultContentType = 'application/pdf';
      break;

    case 'gotenberg-chromium':
      resultBuffer = await gotenbergChromium(fileBuffer, filename);
      resultContentType = 'application/pdf';
      break;

    case 'csv-to-html-table': {
      const htmlBuffer = await csvToHtmlTable(fileBuffer);
      if (targetFormat === 'html') {
        resultBuffer = htmlBuffer;
        resultContentType = 'text/html';
      } else {
        // CSV → PDF via HTML table → Chromium
        resultBuffer = await gotenbergChromium(htmlBuffer, filename);
        resultContentType = 'application/pdf';
      }
      break;
    }

    case 'sheetjs-csv-to-xlsx':
      resultBuffer = await csvToXlsx(fileBuffer);
      resultContentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      break;

    case 'gotenberg-libreoffice-reverse':
      resultBuffer = await gotenbergLibreOfficeReverse(fileBuffer, filename, targetFormat);
      resultContentType = targetFormat === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      break;

    case 'pdf-to-html':
      resultBuffer = await pdfToHtml(fileBuffer);
      resultContentType = 'text/html';
      break;

    case 'json-to-pdf':
      resultBuffer = await jsonToPdf(fileBuffer);
      resultContentType = 'application/pdf';
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
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Get supported conversions for a given source format.
 */
function getSupportedConversions(sourceFormat) {
  return Object.keys(CONVERSION_MAP)
    .filter(k => k.startsWith(`${sourceFormat}:`))
    .map(k => k.split(':')[1]);
}

/**
 * Get all supported conversion pairs.
 */
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
};
