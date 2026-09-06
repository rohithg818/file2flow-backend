const express = require('express');
const multer = require('multer');
const {
  compressPdf,
  splitPdf,
  extractPages,
  mergePdf,
  rotatePdf,
  reorderPdf,
  addPassword,
  removePassword,
} = require('../pdf-tools');
const { maybeWatermark } = require('../watermark');
const { getSupabase } = require('../middleware/supabase');

const router = express.Router();

// Optional plan resolver — extracts user plan from Authorization header if present
// so maybeWatermark can skip watermark for paid users
async function resolveUserPlan(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return next();

    const { auth } = require('../firebaseAdmin');
    const idToken = header.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(idToken);
    req.user = decoded;

    const supabase = getSupabase();
    if (supabase && decoded.uid) {
      const { data } = await supabase
        .from('users')
        .select('plan')
        .eq('uid', decoded.uid)
        .single();
      req.userPlan = data?.plan || 'free';
    }
  } catch {
    // Auth failed or user not found — treat as free (watermark applied)
  }
  next();
}

router.use(resolveUserPlan);

// Multer for PDF uploads (100MB max for PDF tools)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Multi-file upload for merge
const uploadMulti = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// ============================================================
// COMPRESS PDF
// ============================================================
router.post('/compress', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const level = req.body.level || 'medium';
    if (!['low', 'medium', 'high'].includes(level)) {
      return res.status(400).json({ error: 'Level must be low, medium, or high' });
    }

    const originalSize = req.file.size;
    const result = await compressPdf(req.file.buffer, level);
    const output = await maybeWatermark(result, req.userPlan);
    const filename = req.file.originalname.replace(/\.pdf$/i, '') + '-compressed.pdf';

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Original-Size': String(originalSize),
      'X-Compressed-Size': String(output.length),
      'X-Compression-Ratio': ((1 - output.length / originalSize) * 100).toFixed(1) + '%',
    });
    res.send(output);
  } catch (err) {
    console.error('Compress error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// SPLIT PDF
// ============================================================
router.post('/split', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ranges = req.body.ranges;
    if (!ranges) return res.status(400).json({ error: 'No page ranges specified (e.g. "1-3,5,7-10")' });

    const results = await splitPdf(req.file.buffer, ranges);

    if (results.length === 1) {
      const output = await maybeWatermark(results[0], req.userPlan);
      const filename = req.file.originalname.replace(/\.pdf$/i, '') + '-split.pdf';
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      return res.send(output);
    }

    // Multiple ranges: return as JSON with page info (client can download individually)
    const PDFDocument = require('pdf-lib').PDFDocument;
    const pageInfo = [];
    for (let i = 0; i < results.length; i++) {
      const doc = await PDFDocument.load(results[i]);
      pageInfo.push({
        index: i,
        pages: doc.getPageCount(),
        size: results[i].length,
      });
    }

    // For simplicity, return first result; client should use ranges one at a time
    const filename = req.file.originalname.replace(/\.pdf$/i, '') + '-split.pdf';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Split-Count': String(results.length),
    });
    res.send(await maybeWatermark(results[0], req.userPlan));
  } catch (err) {
    console.error('Split error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// EXTRACT PAGES
// ============================================================
router.post('/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const results = await extractPages(req.file.buffer);

    // Return first page as single PDF; for full extraction, client can iterate
    const filename = req.file.originalname.replace(/\.pdf$/i, '') + '-page1.pdf';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Total-Pages': String(results.length),
    });
    res.send(await maybeWatermark(results[0], req.userPlan));
  } catch (err) {
    console.error('Extract error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// MERGE PDFs
// ============================================================
router.post('/merge', uploadMulti.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: 'At least 2 PDF files are required' });
    }

    const buffers = req.files.map(f => f.buffer);
    const result = await mergePdf(buffers);
    const output = await maybeWatermark(result, req.userPlan);

    const filename = req.files[0].originalname.replace(/\.pdf$/i, '') + '-merged.pdf';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Merged-Count': String(req.files.length),
    });
    res.send(output);
  } catch (err) {
    console.error('Merge error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ROTATE PDF
// ============================================================
router.post('/rotate', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const rotation = parseInt(req.body.rotation || req.body.angle, 10);
    if (![90, 180, 270].includes(rotation)) {
      return res.status(400).json({ error: 'Rotation must be 90, 180, or 270' });
    }

    const pages = req.body.pages
      ? req.body.pages.split(',').map(Number).filter(n => !isNaN(n))
      : undefined;

    const result = await rotatePdf(req.file.buffer, rotation, pages);
    const output = await maybeWatermark(result, req.userPlan);
    const filename = req.file.originalname.replace(/\.pdf$/i, '') + '-rotated.pdf';

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(output);
  } catch (err) {
    console.error('Rotate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// REORDER PDF
// ============================================================
router.post('/reorder', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const order = req.body.order;
    if (!order) return res.status(400).json({ error: 'No page order specified (e.g. "3,1,2")' });

    const newOrder = order.split(',').map(Number).filter(n => !isNaN(n));
    if (newOrder.length === 0) {
      return res.status(400).json({ error: 'Invalid page order' });
    }

    const result = await reorderPdf(req.file.buffer, newOrder);
    const output = await maybeWatermark(result, req.userPlan);
    const filename = req.file.originalname.replace(/\.pdf$/i, '') + '-reordered.pdf';

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(output);
  } catch (err) {
    console.error('Reorder error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ADD PASSWORD
// ============================================================
router.post('/protect', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const userPassword = req.body.password || req.body.userPassword;
    if (!userPassword) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const ownerPassword = req.body.ownerPassword;
    const result = await addPassword(req.file.buffer, userPassword, ownerPassword);
    const output = await maybeWatermark(result, req.userPlan);
    const filename = req.file.originalname.replace(/\.pdf$/i, '') + '-protected.pdf';

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(output);
  } catch (err) {
    console.error('Protect error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// REMOVE PASSWORD
// ============================================================
router.post('/unlock', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const password = req.body.password;
    if (!password) {
      return res.status(400).json({ error: 'Password is required to unlock' });
    }

    const result = await removePassword(req.file.buffer, password);
    const output = await maybeWatermark(result, req.userPlan);
    const filename = req.file.originalname.replace(/\.pdf$/i, '') + '-unlocked.pdf';

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(output);
  } catch (err) {
    console.error('Unlock error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET PDF INFO
// ============================================================
router.post('/info', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { PDFDocument } = require('pdf-lib');
    const pdfDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true });

    const pages = pdfDoc.getPageCount();
    const title = pdfDoc.getTitle();
    const author = pdfDoc.getAuthor();
    const subject = pdfDoc.getSubject();
    const creator = pdfDoc.getCreator();
    const producer = pdfDoc.getProducer();
    const creationDate = pdfDoc.getCreationDate();
    const modDate = pdfDoc.getModificationDate();

    const pageDetails = [];
    for (let i = 0; i < Math.min(pages, 100); i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();
      pageDetails.push({
        index: i + 1,
        width: Math.round(width * 100) / 100,
        height: Math.round(height * 100) / 100,
        rotation: page.getRotation().angle,
      });
    }

    res.json({
      pages,
      title,
      author,
      subject,
      creator,
      producer,
      creationDate: creationDate?.toISOString(),
      modificationDate: modDate?.toISOString(),
      fileSize: req.file.size,
      pageDetails,
    });
  } catch (err) {
    console.error('Info error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
