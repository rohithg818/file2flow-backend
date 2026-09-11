const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const { asyncHandler, logger } = require('../middleware/errorHandler');
const { retryFetch } = require('../retryFetch');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr';

router.post('/ocr', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.endsWith('.pdf');
  const isImage = req.file.mimetype.startsWith('image/');

  if (!isPdf && !isImage) {
    return res.status(400).json({ error: 'Only PDF and image files are supported for OCR' });
  }

  if (!MISTRAL_API_KEY) {
    return res.status(500).json({ error: 'Mistral API key not configured' });
  }

  logger.info('OCR request', { filename: req.file.originalname, size: req.file.size });

  const base64Data = req.file.buffer.toString('base64');
  const mimeType = isPdf ? 'application/pdf' : req.file.mimetype;
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const pages = req.body.pages || undefined;

  const body = {
    model: 'mistral-ocr-latest',
    document: {
      type: isPdf ? 'document_url' : 'image_url',
      documentUrl: dataUrl,
    },
    table_format: 'html',
  };

  if (pages) body.pages = pages;

  const response = await retryFetch(MISTRAL_OCR_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    timeout: 120_000,
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'No body');
    logger.error('Mistral OCR failed', { status: response.status, error: err.substring(0, 300) });
    return res.status(502).json({ error: `OCR failed: ${err.substring(0, 300)}` });
  }

  const data = await response.json();

  const pagesResult = (data.pages || []).map(p => ({
    index: p.index,
    markdown: p.markdown || '',
    images: p.images || [],
    tables: p.tables || [],
    dimensions: p.dimensions || {},
  }));

  const fullMarkdown = pagesResult.map(p => p.markdown).join('\n\n---\n\n');

  logger.info('OCR completed', { pages: pagesResult.length, model: data.model });

  res.json({
    pages: pagesResult,
    markdown: fullMarkdown,
    model: data.model,
    usage: data.usage_info || {},
  });
}));

module.exports = router;
