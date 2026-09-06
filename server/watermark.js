/**
 * Free-tier watermark overlay for PDFs.
 * Adds a diagonal "File2Flow — Upgrade to remove" text on every page
 * to encourage free users to subscribe.
 */

const { PDFDocument, rgb, degrees } = require('pdf-lib');

const WATERMARK_TEXT = 'File2Flow — Upgrade to remove';
const WATERMARK_OPACITY = 0.12;
const WATERMARK_FONT_SIZE = 40;
const WATERMARK_COLOR = rgb(0.4, 0.4, 0.4);

/**
 * Apply a diagonal watermark to every page of a PDF buffer.
 * @param {Buffer} pdfBuffer - Original PDF
 * @returns {Buffer} Watermarked PDF buffer
 */
async function applyWatermark(pdfBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont('Helvetica-Bold');
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();

    const textWidth = font.widthOfTextAtSize(WATERMARK_TEXT, WATERMARK_FONT_SIZE);
    const textHeight = font.heightAtSize(WATERMARK_FONT_SIZE);

    const x = (width - textWidth) / 2;
    const y = (height - textHeight) / 2;

    page.drawText(WATERMARK_TEXT, {
      x,
      y,
      size: WATERMARK_FONT_SIZE,
      font,
      color: WATERMARK_COLOR,
      opacity: WATERMARK_OPACITY,
      rotate: degrees(45),
    });
  }

  return Buffer.from(await pdfDoc.save());
}

/**
 * Conditionally apply watermark based on user plan.
 * Free-tier users get the watermark; paid users get the original.
 * @param {Buffer} pdfBuffer - Generated PDF
 * @param {string} plan - User's plan tier ('free', 'starter', 'business', etc.)
 * @returns {Buffer} PDF with or without watermark
 */
async function maybeWatermark(pdfBuffer, plan) {
  if (plan && plan !== 'free') return pdfBuffer;
  try {
    return await applyWatermark(pdfBuffer);
  } catch (err) {
    console.warn('Watermark failed, returning original:', err.message);
    return pdfBuffer;
  }
}

module.exports = { applyWatermark, maybeWatermark, WATERMARK_TEXT };
