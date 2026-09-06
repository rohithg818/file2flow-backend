import { FileItem, ConversionSettings, OutputFormat, SupportedFormat } from '../types';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { renderAsync } from 'docx-preview';

export interface ConversionResult {
  blob: Blob;
  blobUrl: string;
  size: number;
  pageCount: number;
  conversionTimeMs: number;
}

const ENGINE_URL = import.meta.env.VITE_ENGINE_URL || 'http://localhost:5000';
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/^\uFEFF/, '');
const IS_PROD = !import.meta.env.DEV;

// ============================================================
// GOTENBERG CONVERTER (DOCX/XLSX/PPTX/HTML → PDF via LibreOffice/Chromium)
// ============================================================

const GOTENBERG_MIME_TYPES: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  html: 'text/html',
};

async function convertViaGotenberg(
  fileItem: FileItem,
  settings: ConversionSettings,
  onProgress?: (progress: number, stage: string) => void
): Promise<ConversionResult | null> {
  const startTime = performance.now();

  try {
    const mimeType = GOTENBERG_MIME_TYPES[fileItem.format];
    if (!mimeType) return null;

    onProgress?.(10, 'Connecting to Gotenberg...');

    const formData = new FormData();
    formData.append('file', fileItem.file, fileItem.name);

    onProgress?.(25, 'Converting with LibreOffice/Chromium...');

    const response = await fetch(`${API_URL}/api/convert`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Gotenberg error' }));
      throw new Error(error.error || 'Gotenberg conversion failed');
    }

    onProgress?.(85, 'Downloading PDF...');

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const elapsed = Math.round(performance.now() - startTime);
    const pageCount = Math.max(1, Math.ceil(blob.size / 50000));

    onProgress?.(100, 'Done');

    return { blob, blobUrl, size: blob.size, pageCount, conversionTimeMs: elapsed };
  } catch (err) {
    console.warn('Gotenberg unavailable, falling back to client-side:', err);
    return null;
  }
}

// ============================================================
// PYTHON ENGINE CONVERTER (primary)
// ============================================================

async function convertViaPythonEngine(
  fileItem: FileItem,
  settings: ConversionSettings,
  onProgress?: (progress: number, stage: string) => void
): Promise<ConversionResult | null> {
  const startTime = performance.now();

  try {
    onProgress?.(15, 'Connecting to engine...');

    // Check if engine is available
    const healthCheck = await fetch(`${API_URL}/api/engine/health`, { signal: AbortSignal.timeout(3000) });
    const health = await healthCheck.json();
    if (health.status !== 'ok') throw new Error('Engine offline');

    onProgress?.(25, 'Uploading to Python engine...');

    const formData = new FormData();
    formData.append('file', fileItem.file, fileItem.name);
    formData.append('page_size', settings.pageSize);
    formData.append('orientation', settings.orientation);
    formData.append('margin', settings.margin);
    formData.append('watermark', settings.watermarkText || '');
    formData.append('add_page_numbers', String(settings.addPageNumbers));
    formData.append('quality', settings.quality);
    formData.append('image_fit', settings.imageFit || 'contain');

    onProgress?.(40, 'Converting with Python engine...');

    const response = await fetch(`${API_URL}/api/engine/convert`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Engine error' }));
      throw new Error(error.error || 'Conversion failed');
    }

    onProgress?.(85, 'Downloading PDF...');

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const elapsed = Math.round(performance.now() - startTime);

    // Estimate page count from file size (rough estimate)
    const pageCount = Math.max(1, Math.ceil(blob.size / 50000));

    onProgress?.(100, 'Done');

    return { blob, blobUrl, size: blob.size, pageCount, conversionTimeMs: elapsed };
  } catch (err) {
    console.warn('Python engine unavailable, falling back to client-side:', err);
    return null;
  }
}

// ============================================================
// DOCX → PDF via docx-preview (faithful layout rendering)
// ============================================================

async function docxToPdf(
  file: File,
  settings: ConversionSettings,
  onProgress?: (progress: number, stage: string) => void
): Promise<{ blob: Blob; url: string; size: number; pageCount: number }> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  onProgress?.(25, 'Rendering DOCX layout...');

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-99999px;top:0;border:none;width:0;height:0;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow!.document;
  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; margin: 0; padding: 0; }
  html, body { color: #000; }
</style></head><body>
<div id="docx-root" style="width:210mm;background:#fff;overflow:visible;"></div>
</body></html>`);
  iframeDoc.close();

  const container = iframeDoc.getElementById('docx-root')!;

  try {
    await renderAsync(file, container, undefined, {
      className: 'docx-render',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
      experimental: true,
      trimXmlDeclaration: true,
      useBase64URL: true,
    });
  } catch (e) {
    console.warn('docx-preview render error:', e);
  }

  await new Promise(r => setTimeout(r, 1200));

  onProgress?.(45, 'Capturing rendered content...');

  const DPI = 3;
  const canvas = await html2canvas(container, {
    scale: DPI,
    useCORS: true,
    logging: false,
    allowTaint: true,
    backgroundColor: '#ffffff',
    windowWidth: container.scrollWidth,
    width: container.scrollWidth,
  });

  onProgress?.(65, 'Building PDF pages...');

  const pdfDoc = new jsPDF({
    orientation: settings.orientation,
    unit: 'mm',
    format: settings.pageSize,
    compress: settings.quality === 'high',
  });

  const pageWidth = pdfDoc.internal.pageSize.getWidth();
  const pageHeight = pdfDoc.internal.pageSize.getHeight();
  const mmToPx = (mm: number) => Math.round(mm * (96 / 25.4) * DPI);
  const pageWidthPx = mmToPx(pageWidth);
  const marginMm = { narrow: 12, normal: 22, wide: 32, none: 8 }[settings.margin] || 22;

  const contentWidthPx = canvas.width;
  const scaleX = pageWidthPx / contentWidthPx;
  const scaledPageHeightPx = Math.round(pageHeight / scaleX * DPI);
  const totalPages = Math.max(1, Math.ceil(canvas.height / scaledPageHeightPx));

  onProgress?.(75, `Rendering ${totalPages} page(s)...`);

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) pdfDoc.addPage();

    const srcY = p * scaledPageHeightPx;
    const srcH = Math.min(scaledPageHeightPx, canvas.height - srcY);

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = contentWidthPx;
    pageCanvas.height = srcH;
    const ctx = pageCanvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, contentWidthPx, srcH);
    ctx.drawImage(canvas, 0, srcY, contentWidthPx, srcH, 0, 0, contentWidthPx, srcH);

    const imgData = pageCanvas.toDataURL('image/png');
    const imgHeight = (srcH / contentWidthPx) * pageWidth;

    pdfDoc.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
  }

  if (settings.watermarkText) {
    for (let p = 1; p <= totalPages; p++) {
      pdfDoc.setPage(p);
      pdfDoc.setTextColor(220, 220, 220);
      pdfDoc.setFontSize(40);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text(settings.watermarkText, pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
      pdfDoc.setTextColor(0);
    }
  }

  if (settings.addPageNumbers) {
    for (let p = 1; p <= totalPages; p++) {
      pdfDoc.setPage(p);
      pdfDoc.setFontSize(9);
      pdfDoc.setTextColor(150);
      pdfDoc.text(`Page ${p} of ${totalPages}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
      pdfDoc.setTextColor(0);
    }
  }

  document.body.removeChild(iframe);

  const arrayBuffer = pdfDoc.output('arraybuffer');
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  onProgress?.(100, 'Done');
  return { blob, url, size: blob.size, pageCount: totalPages };
}

// ============================================================
// MAIN CONVERTER (tries Python engine first, falls back to client-side)
// ============================================================

export async function convertFile(
  fileItem: FileItem,
  settings: ConversionSettings,
  onProgress?: (progress: number, stage: string) => void
): Promise<ConversionResult> {
  const startTime = performance.now();

  // Try Gotenberg first for PDF conversions of office documents
  if (settings.outputFormat === 'pdf') {
    const gotenbergResult = await convertViaGotenberg(fileItem, settings, onProgress);
    if (gotenbergResult) return gotenbergResult;
  }

  // Try Python engine next (dev only)
  if (settings.outputFormat === 'pdf' && !IS_PROD) {
    const engineResult = await convertViaPythonEngine(fileItem, settings, onProgress);
    if (engineResult) return engineResult;
  }

  onProgress?.(10, 'Reading file...');

  if (settings.outputFormat === 'pdf') {
    try {
      if (fileItem.format === 'docx') {
        onProgress?.(20, 'Rendering DOCX...');
        const r = await docxToPdf(fileItem.file, settings, onProgress);
        const elapsed = Math.round(performance.now() - startTime);
        return { blob: r.blob, blobUrl: r.url, size: r.size, pageCount: r.pageCount, conversionTimeMs: elapsed };
      }
      onProgress?.(20, 'Extracting content...');
      const html = await convertToHtml(fileItem, settings);
      onProgress?.(50, 'Rendering PDF...');
      const r = await htmlToPdf(html, settings, onProgress);
      const elapsed = Math.round(performance.now() - startTime);
      return { blob: r.blob, blobUrl: r.url, size: r.size, pageCount: r.pageCount, conversionTimeMs: elapsed };
    } catch (pdfErr) {
      console.error('PDF conversion error:', pdfErr);
      throw new Error(`PDF conversion failed: ${pdfErr instanceof Error ? pdfErr.message : 'Unknown error'}`);
    }
  }

  let outputContent: string;
  let mimeType: string;

  switch (settings.outputFormat) {
    case 'html': {
      outputContent = await convertToHtml(fileItem, settings);
      mimeType = 'text/html';
      break;
    }
    case 'md': {
      outputContent = await convertToMarkdown(fileItem);
      mimeType = 'text/markdown';
      break;
    }
    case 'txt': {
      outputContent = await convertToPlainText(fileItem);
      mimeType = 'text/plain';
      break;
    }
    case 'docx': {
      outputContent = await convertToHtml(fileItem, settings);
      mimeType = 'text/html';
      break;
    }
    default: {
      outputContent = await convertToPlainText(fileItem);
      mimeType = 'text/plain';
    }
  }

  onProgress?.(90, 'Finalizing...');
  await new Promise((r) => setTimeout(r, 80));

  const blob = new Blob([outputContent], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);
  const elapsed = Math.round(performance.now() - startTime);

  onProgress?.(100, 'Done');
  return { blob, blobUrl, size: blob.size, pageCount: 1, conversionTimeMs: elapsed };
}

// ============================================================
// BATCH ZIP
// ============================================================

export async function zipConversionResults(
  results: Array<{ name: string; blob: Blob; ext: string }>
): Promise<{ blob: Blob; blobUrl: string; size: number }> {
  const zip = new JSZip();
  for (const r of results) {
    const safeName = r.name.replace(/\.[^/.]+$/, '') + '.' + r.ext;
    zip.file(safeName, r.blob);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const blobUrl = URL.createObjectURL(blob);
  return { blob, blobUrl, size: blob.size };
}

// ============================================================
// HTML CONVERSION (core — all formats produce styled HTML)
// ============================================================

async function convertToHtml(fileItem: FileItem, settings: ConversionSettings): Promise<string> {
  const name = fileItem.name.replace(/\.[^/.]+$/, '');
  const pageSizeCSS = getPageSizeCSS(settings);

  switch (fileItem.format) {
    case 'docx': return docxToHtml(fileItem.file, name, pageSizeCSS, settings);
    case 'xlsx':
    case 'csv': return spreadsheetToHtml(fileItem.file, fileItem.name, pageSizeCSS);
    case 'pptx': return pptxToHtml(fileItem.file, name, pageSizeCSS);
    case 'json': return jsonToHtml(fileItem.file, name, pageSizeCSS);
    case 'markdown': return markdownToHtml(fileItem.file, name, pageSizeCSS);
    case 'html': return rawHtmlToStyledHtml(fileItem.file, name, pageSizeCSS);
    case 'image': return imageToHtml(fileItem, name, pageSizeCSS);
    default: return plainTextToHtml(fileItem.file, name, pageSizeCSS);
  }
}

function getPageSizeCSS(settings: ConversionSettings): string {
  const margins = { narrow: '12mm', normal: '22mm', wide: '32mm', none: '8mm' };
  const m = margins[settings.margin] || '22mm';
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; background: #fff; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
      @page { margin: ${m}; }
      h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
      ul, ol, table, pre, blockquote { break-inside: avoid; page-break-inside: avoid; }
      li, tr, .slide { break-inside: avoid; page-break-inside: avoid; }
      p { orphans: 3; widows: 3; }
      thead { display: table-header-group; }
    }
  `;
}

// ============================================================
// DOCX → HTML (uses mammoth for real formatting)
// ============================================================

async function docxToHtml(file: File, name: string, pageSizeCSS: string, settings: ConversionSettings): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({
    arrayBuffer,
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Title'] => h1.title:fresh",
      "p[style-name='Subtitle'] => p.subtitle:fresh",
      "u => u",
    ],
  });
  const bodyHtml = result.value || '<p>No content found.</p>';

  const margins = { narrow: '15mm', normal: '25mm', wide: '35mm', none: '10mm' };
  const m = margins[settings.margin] || '25mm';

  return wrapHtml(name, pageSizeCSS, `
    <div class="docx-content">${bodyHtml}</div>
    <style>
      @page { size: ${settings.pageSize === 'letter' ? 'letter' : settings.pageSize === 'legal' ? 'legal' : 'A4'} ${settings.orientation}; margin: ${m}; }
      .docx-content {
        font-family: 'Calibri', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        color: #000;
        line-height: 1.15;
        font-size: 11pt;
        max-width: 100%;
        margin: 0 auto;
        padding: 0;
      }
      .docx-content h1 {
        font-size: 18pt;
        font-weight: 700;
        color: #000;
        margin: 12pt 0 6pt;
        line-height: 1.2;
      }
      .docx-content h1.title {
        font-size: 24pt;
        text-align: center;
        margin: 0 0 4pt;
      }
      .docx-content h2 {
        font-size: 13pt;
        font-weight: 700;
        color: #000;
        margin: 10pt 0 4pt;
        line-height: 1.3;
        border-bottom: 1px solid #ccc;
        padding-bottom: 6pt;
      }
      .docx-content h3 {
        font-size: 11pt;
        font-weight: 700;
        color: #000;
        margin: 8pt 0 3pt;
        line-height: 1.3;
      }
      .docx-content h4 {
        font-size: 11pt;
        font-weight: 700;
        font-style: italic;
        color: #000;
        margin: 6pt 0 3pt;
      }
      .docx-content p {
        margin: 3pt 0;
        text-align: left;
        line-height: 1.15;
      }
      .docx-content p.subtitle {
        text-align: center;
        color: #555;
        font-size: 11pt;
        margin: 2pt 0 8pt;
      }
      .docx-content ul, .docx-content ol {
        margin: 3pt 0 3pt 18pt;
        padding-left: 12pt;
      }
      .docx-content li {
        margin: 2pt 0;
        line-height: 1.15;
      }
      .docx-content ul li { list-style: disc; }
      .docx-content ol li { list-style: decimal; }
      .docx-content table {
        border-collapse: collapse;
        width: 100%;
        margin: 6pt 0;
        font-size: 10pt;
      }
      .docx-content th, .docx-content td {
        border: 1px solid #999;
        padding: 4pt 6pt;
        text-align: left;
        vertical-align: top;
      }
      .docx-content th {
        background: #f0f0f0;
        font-weight: 700;
      }
      .docx-content blockquote {
        border-left: 3pt solid #ccc;
        margin: 6pt 0;
        padding: 4pt 10pt;
        color: #333;
        font-style: italic;
      }
      .docx-content pre {
        background: #f5f5f5;
        border: 1px solid #ddd;
        padding: 8pt;
        margin: 6pt 0;
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: 9pt;
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .docx-content code {
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: 9.5pt;
        background: #f0f0f0;
        padding: 1pt 3pt;
      }
      .docx-content pre code {
        background: transparent;
        padding: 0;
      }
      .docx-content img {
        max-width: 100%;
        height: auto;
      }
      .docx-content a {
        color: #0563c1;
        text-decoration: underline;
      }
      .docx-content hr {
        border: none;
        border-top: 1px solid #ccc;
        margin: 8pt 0;
      }
      .docx-content strong { font-weight: 700; }
      .docx-content em { font-style: italic; }
      .docx-content u { text-decoration: underline; }
    </style>
  `);
}

// ============================================================
// SPREADSHEET → HTML (proper styled tables)
// ============================================================

async function spreadsheetToHtml(file: File, fileName: string, pageSizeCSS: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const name = fileName.replace(/\.[^/.]+$/, '');
  let tablesHtml = '';

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    if (jsonData.length === 0) continue;

    const maxCols = Math.max(...jsonData.map(r => r.length));
    const rows = jsonData.map(row => {
      const cells = Array.from({ length: maxCols }, (_, i) => row[i] ?? '');
      return cells;
    });

    tablesHtml += `<h2 class="sheet-title">${workbook.SheetNames.length > 1 ? sheetName : 'Data'}</h2>`;
    tablesHtml += '<table class="spreadsheet"><thead><tr>';
    for (let c = 0; c < maxCols; c++) {
      tablesHtml += `<th>${escapeHtml(String(rows[0][c]))}</th>`;
    }
    tablesHtml += '</tr></thead><tbody>';
    for (let r = 1; r < rows.length; r++) {
      tablesHtml += '<tr>';
      for (let c = 0; c < maxCols; c++) {
        const val = String(rows[r][c]);
        const isNumeric = /^[\d,.$€£¥%+\-()]+$/.test(val);
        tablesHtml += `<td class="${isNumeric ? 'num' : ''}">${escapeHtml(val)}</td>`;
      }
      tablesHtml += '</tr>';
    }
    tablesHtml += '</tbody></table>';
  }

  return wrapHtml(name, pageSizeCSS, `
    ${tablesHtml || '<p style="color:#999;font-style:italic;">No data found.</p>'}
    <style>
      .sheet-title { font-size:14px; font-weight:700; color:#333; margin:16px 0 8px; }
      .meta { font-size:11px; color:#888; margin-bottom:12px; }
      .spreadsheet { border-collapse:collapse; width:100%; margin:8px 0 16px; font-size:11px; }
      .spreadsheet th { background:#333; color:#fff; font-weight:600; padding:6px 10px; text-align:left; white-space:nowrap; }
      .spreadsheet td { padding:5px 10px; border:1px solid #ddd; }
      .spreadsheet tr:nth-child(even) td { background:#f9f9f9; }
      .spreadsheet td.num { text-align:right; font-family:'Consolas',monospace; font-size:10px; }
    </style>
  `);
}

// ============================================================
// PPTX → HTML
// ============================================================

async function pptxToHtml(file: File, name: string, pageSizeCSS: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const zipData = await JSZip.loadAsync(arrayBuffer);
  const slideFiles = Object.keys(zipData.files).filter(n => n.match(/ppt\/slides\/slide\d+\.xml/)).sort();
  let slidesHtml = '';

  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zipData.file(slideFiles[i])!.async('text');
    const matches = xml.match(/<a:t>([^<]+)<\/a:t>/g);
    const slideText = matches ? matches.map(m => m.replace(/<\/?a:t>/g, '')).join(' ') : '';
    if (slideText.trim()) {
      slidesHtml += `
        <div class="slide">
          <div class="slide-number">Slide ${i + 1}</div>
          <div class="slide-content">${escapeHtml(slideText).replace(/\n/g, '<br>')}</div>
        </div>`;
    }
  }

  return wrapHtml(name, pageSizeCSS, `
    ${slidesHtml || '<p style="color:#999;font-style:italic;">No text content found in slides.</p>'}
    <style>
      .slide { border:1px solid #ddd; border-radius:6px; padding:16px; margin:10px 0; background:#fafafa; page-break-inside:avoid; }
      .slide-number { font-size:10px; font-weight:700; color:#666; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
      .slide-content { font-size:13px; line-height:1.6; color:#222; }
    </style>
  `);
}

// ============================================================
// JSON → HTML (beautiful syntax-highlighted-like output)
// ============================================================

async function jsonToHtml(file: File, name: string, pageSizeCSS: string): Promise<string> {
  const raw = await file.text();
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { parsed = null; }

  let contentHtml: string;
  if (parsed !== null && typeof parsed === 'object') {
    contentHtml = renderJsonValue(parsed, 0);
    // If it's an array of objects, render as a table too
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
      const tableHtml = renderJsonTable(parsed);
      contentHtml += `<h2>Table View</h2>${tableHtml}`;
    }
  } else {
    contentHtml = `<pre class="code-block">${escapeHtml(raw)}</pre>`;
  }

  return wrapHtml(name, pageSizeCSS, `
    ${contentHtml}
    <style>
      .json-obj { margin:6px 0; }
      .json-key { color:#0563c1; font-weight:600; }
      .json-string { color:#059669; }
      .json-number { color:#d97706; }
      .json-bool { color:#7c3aed; }
      .json-null { color:#999; font-style:italic; }
      .json-bracket { color:#555; }
      .json-indent { border-left:2px solid #ddd; margin-left:8px; padding-left:10px; }
      .code-block { background:#f5f5f5; border:1px solid #ddd; color:#333; padding:12px 16px; border-radius:4px; font-family:'Consolas','Courier New',monospace; font-size:10px; line-height:1.5; overflow-x:auto; white-space:pre-wrap; word-break:break-all; margin:8px 0; }
      table.json-table { border-collapse:collapse; width:100%; margin:10px 0; font-size:10px; }
      table.json-table th { background:#333; color:#fff; padding:6px 10px; text-align:left; font-weight:600; white-space:nowrap; }
      table.json-table td { padding:4px 10px; border:1px solid #ddd; max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      table.json-table tr:nth-child(even) td { background:#f9f9f9; }
    </style>
  `);
}

function renderJsonValue(val: any, depth: number): string {
  if (val === null) return '<span class="json-null">null</span>';
  if (typeof val === 'boolean') return `<span class="json-bool">${val}</span>`;
  if (typeof val === 'number') return `<span class="json-number">${val}</span>`;
  if (typeof val === 'string') return `<span class="json-string">"${escapeHtml(val)}"</span>`;
  if (Array.isArray(val)) {
    if (val.length === 0) return '<span class="json-bracket">[]</span>';
    const items = val.map(v => `${'  '.repeat(depth + 1)}${renderJsonValue(v, depth + 1)}`).join(',\n');
    return `<span class="json-bracket">[</span>\n<div class="json-indent">${items}\n${'  '.repeat(depth)}</div><span class="json-bracket">]</span>`;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '<span class="json-bracket">{}</span>';
    const entries = keys.map(k => `${'  '.repeat(depth + 1)}<span class="json-key">"${escapeHtml(k)}"</span>: ${renderJsonValue(val[k], depth + 1)}`).join(',\n');
    return `<span class="json-bracket">{</span>\n<div class="json-indent">${entries}\n${'  '.repeat(depth)}</div><span class="json-bracket">}</span>`;
  }
  return String(val);
}

function renderJsonTable(items: Record<string, any>[]): string {
  const allKeys = new Set<string>();
  items.forEach(item => { if (typeof item === 'object' && item !== null) Object.keys(item).forEach(k => allKeys.add(k)); });
  const cols = Array.from(allKeys);
  if (cols.length === 0 || items.length === 0) return '';

  let html = '<table class="json-table"><thead><tr>';
  cols.forEach(c => { html += `<th>${escapeHtml(c)}</th>`; });
  html += '</tr></thead><tbody>';
  items.slice(0, 200).forEach(item => {
    html += '<tr>';
    cols.forEach(c => {
      const v = item?.[c];
      const display = v === null ? 'null' : v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
      html += `<td title="${escapeHtml(display)}">${escapeHtml(display.substring(0, 80))}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

// ============================================================
// MARKDOWN → HTML
// ============================================================

async function markdownToHtml(file: File, name: string, pageSizeCSS: string): Promise<string> {
  const raw = await file.text();
  let html = raw
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^---+$/gm, '<hr>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+[.)] (.+)$/gm, '<li class="num">$1</li>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return wrapHtml(name, pageSizeCSS, `
    <div class="markdown-body"><p>${html}</p></div>
    <style>
      .markdown-body h1 { font-size:20px; font-weight:700; color:#000; margin:16px 0 6px; border-bottom:1px solid #ccc; padding-bottom:6px; }
      .markdown-body h2 { font-size:16px; font-weight:700; color:#333; margin:14px 0 6px; }
      .markdown-body h3 { font-size:13px; font-weight:600; margin:10px 0 4px; }
      .markdown-body p { margin:4px 0; }
      .markdown-body li { margin:2px 0 2px 16px; list-style:disc; }
      .markdown-body li.num { list-style:decimal; }
      .markdown-body code { background:#f0f0f0; padding:1px 4px; border-radius:3px; font-family:'Consolas',monospace; font-size:10px; }
      .markdown-body strong { font-weight:700; }
      .markdown-body em { font-style:italic; }
      .markdown-body hr { border:none; border-top:1px solid #ccc; margin:10px 0; }
      .markdown-body a { color:#0563c1; }
    </style>
  `);
}

// ============================================================
// RAW HTML → styled HTML
// ============================================================

async function rawHtmlToStyledHtml(file: File, name: string, pageSizeCSS: string): Promise<string> {
  const raw = await file.text();
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : raw;
  const cleaned = body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');

  return wrapHtml(name, pageSizeCSS, `
    <div class="html-content">${cleaned}</div>
    <style>
      .html-content { font-size:12px; line-height:1.6; }
      .html-content img { max-width:100%; height:auto; }
      .html-content table { border-collapse:collapse; width:100%; margin:8px 0; }
      .html-content th, .html-content td { border:1px solid #ccc; padding:5px 8px; text-align:left; }
      .html-content th { background:#f0f0f0; font-weight:600; }
    </style>
  `);
}

// ============================================================
// PLAIN TEXT → HTML
// ============================================================

async function plainTextToHtml(file: File, name: string, pageSizeCSS: string): Promise<string> {
  const text = await file.text();
  const escaped = escapeHtml(text).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');

  return wrapHtml(name, pageSizeCSS, `
    <div class="plain-text"><p>${escaped}</p></div>
    <style>
      .plain-text { font-family:'Consolas','Courier New',monospace; font-size:10px; line-height:1.5; background:#fafafa; padding:12px; border:1px solid #ddd; border-radius:3px; white-space:pre-wrap; word-break:break-word; }
    </style>
  `);
}

// ============================================================
// IMAGE → HTML
// ============================================================

async function imageToHtml(fileItem: FileItem, name: string, pageSizeCSS: string): Promise<string> {
  const blob = fileItem.file;
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  return wrapHtml(name, pageSizeCSS, `
    <div class="img-container">
      <img src="${dataUrl}" alt="${escapeHtml(name)}" />
      <p class="img-info">${fileItem.type} • ${(fileItem.size / 1024).toFixed(1)} KB</p>
    </div>
    <style>
      .img-container { text-align:center; margin:12px 0; }
      .img-container img { max-width:100%; max-height:800px; border:1px solid #ddd; }
      .img-info { font-size:10px; color:#888; margin-top:6px; }
    </style>
  `);
}

// ============================================================
// HTML HELPERS
// ============================================================

function wrapHtml(title: string, pageSizeCSS: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  ${pageSizeCSS}
  @media print {
    h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
    ul, ol, table, pre, blockquote, .sheet-title { break-inside: avoid; page-break-inside: avoid; }
    li, tr, .slide { break-inside: avoid; page-break-inside: avoid; }
    p { orphans: 3; widows: 3; }
    thead { display: table-header-group; }
  }
</style>
</head>
<body style="background:white;">
${bodyContent}
</body>
</html>`;
}

function generateTitleBlock(name: string, format: string): string {
  return '';
}

// ============================================================
// HTML → PDF via canvas (html2canvas + jsPDF)
// ============================================================

async function htmlToPdf(
  htmlContent: string,
  settings: ConversionSettings,
  onProgress?: (progress: number, stage: string) => void
): Promise<{ blob: Blob; url: string; size: number; pageCount: number }> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  onProgress?.(55, 'Creating render frame...');

  const pdfDoc = new jsPDF({
    orientation: settings.orientation,
    unit: 'mm',
    format: settings.pageSize,
    compress: settings.quality === 'high',
  });

  const pageWidth = pdfDoc.internal.pageSize.getWidth();
  const pageHeight = pdfDoc.internal.pageSize.getHeight();
  const DPI = 3;
  const mmToPx = (mm: number) => Math.round(mm * (96 / 25.4) * DPI);
  const pageWidthPx = mmToPx(pageWidth);
  const marginMm = { narrow: 12, normal: 22, wide: 32, none: 8 }[settings.margin] || 22;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-99999px;top:0;border:none;width:0;height:0;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow!.document;
  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; font-family: 'Calibri', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; }
  </style></head><body>`);
  iframeDoc.write(htmlContent);
  iframeDoc.write('</body></html>');
  iframeDoc.close();

  await new Promise(r => setTimeout(r, 800));

  const body = iframeDoc.body;
  const contentWidth = pageWidth - marginMm * 2;
  body.style.width = `${contentWidth}mm`;

  onProgress?.(65, 'Rendering to canvas...');

  const canvas = await html2canvas(body, {
    scale: DPI,
    useCORS: true,
    logging: false,
    width: body.scrollWidth,
    windowWidth: body.scrollWidth,
    allowTaint: true,
    backgroundColor: '#ffffff',
  });

  onProgress?.(75, 'Splitting into pages...');

  const contentWidthPx = canvas.width;
  const scaleX = pageWidthPx / contentWidthPx;
  const scaledPageHeightPx = Math.round(pageHeight / scaleX * DPI);
  const totalPages = Math.max(1, Math.ceil(canvas.height / scaledPageHeightPx));

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) pdfDoc.addPage();

    const srcY = p * scaledPageHeightPx;
    const srcH = Math.min(scaledPageHeightPx, canvas.height - srcY);

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = contentWidthPx;
    pageCanvas.height = srcH;
    const ctx = pageCanvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, contentWidthPx, srcH);
    ctx.drawImage(canvas, 0, srcY, contentWidthPx, srcH, 0, 0, contentWidthPx, srcH);

    const imgData = pageCanvas.toDataURL('image/png');
    const imgHeight = (srcH / contentWidthPx) * pageWidth;

    pdfDoc.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
  }

  onProgress?.(85, 'Adding finishing touches...');

  if (settings.watermarkText) {
    for (let p = 1; p <= totalPages; p++) {
      pdfDoc.setPage(p);
      pdfDoc.setTextColor(220, 220, 220);
      pdfDoc.setFontSize(40);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text(settings.watermarkText, pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
      pdfDoc.setTextColor(0);
    }
  }

  if (settings.addPageNumbers) {
    for (let p = 1; p <= totalPages; p++) {
      pdfDoc.setPage(p);
      pdfDoc.setFontSize(9);
      pdfDoc.setTextColor(150);
      pdfDoc.text(`Page ${p} of ${totalPages}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
      pdfDoc.setTextColor(0);
    }
  }

  document.body.removeChild(iframe);

  const arrayBuffer = pdfDoc.output('arraybuffer');
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  onProgress?.(100, 'Done');
  return { blob, url, size: blob.size, pageCount: totalPages };
}

// ============================================================
// TEXT EXTRACTION for non-PDF outputs
// ============================================================

async function convertToPlainText(fileItem: FileItem): Promise<string> {
  const name = fileItem.name.replace(/\.[^/.]+$/, '');
  switch (fileItem.format) {
    case 'docx': {
      const buf = await fileItem.file.arrayBuffer();
      const r = await mammoth.extractRawText({ arrayBuffer: buf });
      return `=== ${name} ===\n${r.value}`;
    }
    case 'xlsx':
    case 'csv': {
      const buf = await fileItem.file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      let out = `=== ${name} ===\n\n`;
      for (const sn of wb.SheetNames) {
        out += `--- ${sn} ---\n${XLSX.utils.sheet_to_csv(wb.Sheets[sn])}\n\n`;
      }
      return out.trim();
    }
    default: return await fileItem.file.text();
  }
}

async function convertToMarkdown(fileItem: FileItem): Promise<string> {
  const name = fileItem.name.replace(/\.[^/.]+$/, '');
  switch (fileItem.format) {
    case 'docx': {
      const buf = await fileItem.file.arrayBuffer();
      const r = await mammoth.convertToHtml({ arrayBuffer: buf });
      return `# ${name}\n\n${htmlToMarkdown(r.value)}`;
    }
    case 'json': {
      const raw = await fileItem.file.text();
      try {
        const parsed = JSON.parse(raw);
        return `# ${name}\n\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
      } catch { return `# ${name}\n\n${raw}`; }
    }
    default: return await fileItem.file.text();
  }
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
