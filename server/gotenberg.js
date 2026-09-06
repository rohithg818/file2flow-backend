const fetch = require('node-fetch').default || require('node-fetch');
const FormData = require('form-data');
const { retryFetch } = require('./retryFetch');

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://gotenberg-31r8.onrender.com';

// Cold-start timeout: Render free tier sleeps after 15 min inactivity, takes 30-60s to wake
const GOTENBERG_TIMEOUT_MS = 120_000;

const MIME_TO_GOTENBERG_ENDPOINT = {
  // LibreOffice conversions (DOCX, XLSX, PPTX, ODT, etc.)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '/forms/libreoffice/convert',
  'application/msword': '/forms/libreoffice/convert',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '/forms/libreoffice/convert',
  'application/vnd.ms-excel': '/forms/libreoffice/convert',
  'text/csv': '/forms/libreoffice/convert',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '/forms/libreoffice/convert',
  'application/vnd.ms-powerpoint': '/forms/libreoffice/convert',
  'application/vnd.oasis.opendocument.text': '/forms/libreoffice/convert',
  'application/vnd.oasis.opendocument.spreadsheet': '/forms/libreoffice/convert',
  'application/vnd.oasis.opendocument.presentation': '/forms/libreoffice/convert',
  'text/rtf': '/forms/libreoffice/convert',
  // Chromium conversions (HTML)
  'text/html': '/forms/chromium/convert/html',
};

/**
 * Convert a file to PDF using Gotenberg.
 * @param {Buffer} fileBuffer - The file content as a buffer
 * @param {string} filename - Original filename
 * @param {string} mimeType - MIME type of the file
 * @returns {Buffer} PDF buffer
 * @throws {Error} if conversion fails
 */
async function convertViaGotenberg(fileBuffer, filename, mimeType) {
  const endpoint = MIME_TO_GOTENBERG_ENDPOINT[mimeType];

  if (!endpoint) {
    throw new Error(
      `Gotenberg does not support MIME type: ${mimeType}. Supported: ${Object.keys(MIME_TO_GOTENBERG_ENDPOINT).join(', ')}`
    );
  }

  const form = new FormData();
  form.append('files', fileBuffer, {
    filename,
    contentType: mimeType,
  });

  try {
    const response = await retryFetch(`${GOTENBERG_URL}${endpoint}`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      timeout: GOTENBERG_TIMEOUT_MS,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No response body');
      console.error(`Gotenberg conversion failed [${response.status}]:`, errorBody);
      throw new Error(
        `Gotenberg returned ${response.status}: ${errorBody.substring(0, 500)}`
      );
    }

    const pdfBuffer = await response.buffer();

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Gotenberg returned an empty PDF buffer');
    }

    // Validate PDF header
    const header = pdfBuffer.slice(0, 5).toString('ascii');
    if (header !== '%PDF-') {
      throw new Error('Gotenberg returned a non-PDF response');
    }

    return pdfBuffer;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        'Gotenberg conversion timed out. The service is cold-starting — please try again in 30 seconds.'
      );
    }
    if (err.message?.includes('socket hang up') || err.message?.includes('ECONNRESET')) {
      throw new Error(
        'Gotenberg is waking up from sleep. Please try again in 30 seconds.'
      );
    }
    throw err;
  }
}

/**
 * Check if Gotenberg is healthy.
 * @returns {boolean}
 */
async function checkGotenbergHealth() {
  try {
    const response = await retryFetch(`${GOTENBERG_URL}/health`, {
      timeout: 15_000,
    }, 1);
    return response.ok;
  } catch {
    return false;
  }
}

module.exports = { convertViaGotenberg, checkGotenbergHealth, GOTENBERG_URL };
