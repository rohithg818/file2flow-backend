const { PDFDocument, rgb, degrees } = require('pdf-lib');
const fetch = require('node-fetch').default || require('node-fetch');
const FormData = require('form-data');

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://gotenberg-31r8.onrender.com';

// ============================================================
// COMPRESS PDF
// ============================================================

/**
 * Compress a PDF by re-encoding with pdf-lib.
 * Offers 3 levels: low (minimal change), medium (strip metadata + compress), high (aggressive)
 */
async function compressPdf(pdfBuffer, level = 'medium') {
  // Use Gotenberg's qpdf optimizer for medium/high (real compression engine)
  if ((level === 'medium' || level === 'high') && GOTENBERG_URL) {
    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('files', pdfBuffer, {
        filename: 'input.pdf',
        contentType: 'application/pdf',
      });

      if (level === 'medium') {
        form.append('qpdfOptimize', 'true');
        form.append('removeMetadata', 'false');
        form.append('collapseDuplicateStreams', 'true');
      } else {
        form.append('qpdfOptimize', 'true');
        form.append('removeMetadata', 'true');
        form.append('collapseDuplicateStreams', 'true');
      }

      const response = await fetch(`${GOTENBERG_URL}/forms/pdfengines/optimize`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
        signal: AbortSignal.timeout(120_000),
      });

      if (response.ok) {
        const resultBuffer = Buffer.from(await response.arrayBuffer());
        if (resultBuffer.slice(0, 5).toString('ascii') === '%PDF-' && resultBuffer.length < pdfBuffer.length) {
          return resultBuffer;
        }
      }
    } catch {
      // Fall through to pdf-lib fallback
    }
  }

  // Fallback: pdf-lib re-save
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

  if (level === 'medium' || level === 'high') {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
  }

  const options = {
    useObjectStreams: level !== 'low',
    addDefaultPage: false,
    objectsPerTick: level === 'high' ? 50 : 100,
  };

  const compressedBytes = await pdfDoc.save(options);
  return Buffer.from(compressedBytes);
}

// ============================================================
// SPLIT PDF
// ============================================================

/**
 * Split a PDF by page ranges.
 * @param {Buffer} pdfBuffer
 * @param {string} ranges - e.g. "1-3,5,7-10" (1-indexed)
 * @returns {Buffer[]} Array of PDF buffers, one per range
 */
async function splitPdf(pdfBuffer, ranges) {
  const sourceDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = sourceDoc.getPageCount();
  const rangeList = parsePageRanges(ranges, totalPages);
  const results = [];

  for (const range of rangeList) {
    const newDoc = await PDFDocument.create();
    const indices = [];
    for (let i = range.start; i <= range.end; i++) {
      indices.push(i - 1); // 0-indexed
    }
    const copiedPages = await newDoc.copyPages(sourceDoc, indices);
    copiedPages.forEach(page => newDoc.addPage(page));
    const bytes = await newDoc.save();
    results.push(Buffer.from(bytes));
  }

  return results;
}

/**
 * Extract individual pages as separate PDFs.
 */
async function extractPages(pdfBuffer) {
  const sourceDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = sourceDoc.getPageCount();
  const results = [];

  for (let i = 0; i < totalPages; i++) {
    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(sourceDoc, [i]);
    newDoc.addPage(copiedPage);
    const bytes = await newDoc.save();
    results.push(Buffer.from(bytes));
  }

  return results;
}

// ============================================================
// MERGE PDF
// ============================================================

/**
 * Merge multiple PDFs into one.
 * @param {Buffer[]} pdfBuffers
 * @returns {Buffer}
 */
async function mergePdf(pdfBuffers) {
  const mergedDoc = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
    copiedPages.forEach(page => mergedDoc.addPage(page));
  }

  const bytes = await mergedDoc.save();
  return Buffer.from(bytes);
}

// ============================================================
// ROTATE/REORDER PAGES
// ============================================================

/**
 * Rotate specific pages or all pages.
 * @param {Buffer} pdfBuffer
 * @param {Object} options - { rotation: 90|180|270, pages?: number[] } (1-indexed)
 */
async function rotatePdf(pdfBuffer, rotation, pages) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const degreesVal = degrees(rotation);
  const pageIndices = pages
    ? pages.map(p => p - 1)
    : pdfDoc.getPageIndices();

  for (const idx of pageIndices) {
    const page = pdfDoc.getPage(idx);
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + rotation));
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

/**
 * Reorder pages by a new order array.
 * @param {Buffer} pdfBuffer
 * @param {number[]} newOrder - e.g. [3,1,2] puts page 3 first (1-indexed)
 */
async function reorderPdf(pdfBuffer, newOrder) {
  const sourceDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  const copiedPages = await newDoc.copyPages(
    sourceDoc,
    newOrder.map(p => p - 1)
  );
  copiedPages.forEach(page => newDoc.addPage(page));

  const bytes = await newDoc.save();
  return Buffer.from(bytes);
}

// ============================================================
// ADD/REMOVE PASSWORD
// ============================================================

/**
 * Add password protection to a PDF.
 * @param {Buffer} pdfBuffer
 * @param {string} userPassword - Password to open
 * @param {string} ownerPassword - Password for full control (optional)
 */
async function addPassword(pdfBuffer, userPassword, ownerPassword) {
  const form = new FormData();
  form.append('files', pdfBuffer, { filename: 'input.pdf', contentType: 'application/pdf' });
  form.append('userPassword', userPassword);
  if (ownerPassword) form.append('ownerPassword', ownerPassword);

  const response = await fetch(`${GOTENBERG_URL}/forms/pdfengines/encrypt`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'No body');
    throw new Error(`Gotenberg encrypt failed [${response.status}]: ${err.substring(0, 500)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Remove password from a PDF (if you know the password).
 */
async function removePassword(pdfBuffer, password) {
  const form = new FormData();
  form.append('files', pdfBuffer, {
    filename: 'input.pdf',
    contentType: 'application/pdf',
  });
  form.append('password', password);

  const response = await fetch(`${GOTENBERG_URL}/forms/pdfengines/decrypt`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'No body');
    throw new Error(`Failed to unlock PDF: ${err.substring(0, 300)}`);
  }

  const result = Buffer.from(await response.arrayBuffer());
  if (result.slice(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Unlock produced non-PDF output');
  }
  return result;
}

// ============================================================
// HELPERS
// ============================================================

function parsePageRanges(rangesStr, totalPages) {
  const ranges = rangesStr.split(',').map(r => r.trim());
  const result = [];

  for (const range of ranges) {
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number);
      result.push({
        start: Math.max(1, Math.min(start, totalPages)),
        end: Math.max(1, Math.min(end, totalPages)),
      });
    } else {
      const page = parseInt(range, 10);
      if (page >= 1 && page <= totalPages) {
        result.push({ start: page, end: page });
      }
    }
  }

  return result;
}

module.exports = {
  compressPdf,
  splitPdf,
  extractPages,
  mergePdf,
  rotatePdf,
  reorderPdf,
  addPassword,
  removePassword,
};
