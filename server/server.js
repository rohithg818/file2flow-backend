require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const fetch = require('node-fetch').default || require('node-fetch');
const FormData = require('form-data');

const authRoutes = require('./routes/auth');
const conversionRoutes = require('./routes/conversions');
const paddleRoutes = require('./routes/paddle');
const userRoutes = require('./routes/user');
const aiRoutes = require('./routes/ai');
const pdfToolsRoutes = require('./routes/pdf-tools');

const { convertViaGotenberg, checkGotenbergHealth, GOTENBERG_URL } = require('./gotenberg');
const { convertFile, getSupportedConversions, getAllConversions } = require('./converter');
const { jsonToPdf } = require('./json-to-pdf');
const { enforcePlanLimits, incrementConversionCount } = require('./middleware/plan-enforcement');
const { apiLimiter, authLimiter, engineLimiter } = require('./middleware/rateLimit');
const { errorHandler, requestLogger, logger } = require('./middleware/errorHandler');
const { retryFetch } = require('./retryFetch');
const { maybeWatermark } = require('./watermark');

const app = express();
const PORT = process.env.PORT || 3001;
const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:5000';

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(requestLogger);

// Paddle webhook needs raw body (BEFORE JSON parser)
app.use('/api/webhooks/paddle/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/engine', engineLimiter);

// Multer for file uploads (50MB max)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversions', conversionRoutes);
app.use('/api/webhooks/paddle', paddleRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/pdf', pdfToolsRoutes);

// ============================================================
// GOTENBERG CONVERSION (DOCX/XLSX/PPTX/HTML → PDF)
// ============================================================

app.get('/api/gotenberg/health', async (req, res) => {
  try {
    const healthy = await checkGotenbergHealth();
    res.json({ status: healthy ? 'ok' : 'offline', url: GOTENBERG_URL });
  } catch (err) {
    res.status(503).json({ status: 'offline', error: err.message });
  }
});

app.post('/api/convert', upload.single('file'), enforcePlanLimits, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info('Gotenberg conversion request', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    const pdfBuffer = await convertViaGotenberg(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const filename = req.file.originalname.replace(/\.[^/.]+$/, '.pdf');
    const output = await maybeWatermark(pdfBuffer, req.userPlan);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(output);
    if (req.user?.uid) incrementConversionCount(req.user.uid);
  } catch (err) {
    logger.error('Gotenberg conversion failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// JSON → PDF (via Groq + Gotenberg)
// ============================================================

app.post('/api/convert/json', upload.single('file'), enforcePlanLimits, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    if (req.file.mimetype !== 'application/json') {
      return res.status(400).json({ error: 'File must be JSON' });
    }

    logger.info('JSON → PDF conversion request', { size: req.file.size });

    const pdfBuffer = await jsonToPdf(req.file.buffer);
    const filename = req.file.originalname.replace(/\.json$/i, '') + '.pdf';
    const output = await maybeWatermark(pdfBuffer, req.userPlan);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(output);
    if (req.user?.uid) incrementConversionCount(req.user.uid);
  } catch (err) {
    logger.error('JSON → PDF conversion failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// HUB CONVERSION (any format → any format)
// ============================================================

app.get('/api/tools/supported', (req, res) => {
  res.json({ conversions: getAllConversions() });
});

app.get('/api/tools/from/:format', (req, res) => {
  const format = req.params.format.toLowerCase();
  res.json({ from: format, to: getSupportedConversions(format) });
});

app.post('/api/convert/file', upload.single('file'), enforcePlanLimits, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const targetFormat = (req.body.targetFormat || req.query.target || '').toLowerCase().replace('.', '');
    if (!targetFormat) {
      return res.status(400).json({ error: 'targetFormat is required (e.g. pdf, docx, xlsx, html)' });
    }

    const sourceFormat = req.file.originalname.split('.').pop().toLowerCase();

    logger.info('Hub conversion request', {
      filename: req.file.originalname,
      sourceFormat,
      targetFormat,
      size: req.file.size,
    });

    const result = await convertFile(
      req.file.buffer,
      sourceFormat,
      targetFormat,
      req.file.originalname,
      req.file.mimetype
    );

    const outputBuffer = result.contentType === 'application/pdf'
      ? await maybeWatermark(result.buffer, req.userPlan)
      : result.buffer;

    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'X-Lossy-Conversion': result.lossy ? 'true' : 'false',
    });
    res.send(outputBuffer);
    if (req.user?.uid) incrementConversionCount(req.user.uid);
  } catch (err) {
    logger.error('Hub conversion failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PYTHON ENGINE PROXY
// ============================================================

app.get('/api/engine/health', async (req, res) => {
  try {
    const response = await retryFetch(`${ENGINE_URL}/api/engine/health`, { timeout: 30_000 }, 1);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(503).json({ status: 'offline', error: 'Python engine not running.' });
  }
});

app.post('/api/engine/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const fields = ['page_size', 'orientation', 'margin', 'watermark', 'add_page_numbers', 'quality', 'image_fit'];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        form.append(field, req.body[field]);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000); // 5 min timeout

    const response = await fetch(`${ENGINE_URL}/api/engine/convert`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      logger.error('Engine conversion failed', { status: response.status, error });
      return res.status(response.status).json({ error });
    }

    const pdfBuffer = await response.buffer();
    const filename = req.file.originalname.replace(/\.[^/.]+$/, '.pdf');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(408).json({ error: 'Conversion timed out. File may be too complex.' });
    }
    logger.error('Engine proxy error', { error: err.message });
    res.status(500).json({ error: 'Conversion failed.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`FileFlow backend running on port ${PORT}`);
  logger.info(`Python engine proxy: ${ENGINE_URL}`);
});
