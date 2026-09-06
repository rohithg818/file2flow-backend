const { z } = require('zod');

// Validate request body against a Zod schema
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req.body = result.data;
    next();
  };
}

// Auth schemas
const verifyTokenSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
});

const setupProfileSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
  displayName: z.string().max(100).optional(),
});

// Conversion schemas
const createConversionSchema = z.object({
  originalFileName: z.string().min(1).max(255),
  originalFormat: z.string().min(1).max(20),
  originalSize: z.number().min(0).optional(),
  outputFormat: z.string().max(20).optional(),
  outputFileName: z.string().max(255).optional(),
  outputSize: z.number().min(0).optional(),
  pageCount: z.number().min(0).optional(),
  downloadUrl: z.string().url().optional().or(z.literal('')),
  conversionTimeMs: z.number().min(0).optional(),
  settings: z.record(z.unknown()).optional(),
});

// Stripe schemas
const checkoutSessionSchema = z.object({
  plan: z.enum(['starter', 'professional', 'enterprise']),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
});

// User schemas
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  photoURL: z.string().url().optional().or(z.literal('')),
});

// Engine convert schema (query params + body validation)
const engineConvertSchema = z.object({
  page_size: z.enum(['A4', 'LETTER', 'LEGAL']).optional(),
  orientation: z.enum(['portrait', 'landscape']).optional(),
  margin: z.enum(['normal', 'narrow', 'wide', 'none']).optional(),
  watermark: z.string().max(200).optional(),
  add_page_numbers: z.enum(['true', 'false']).optional(),
  quality: z.enum(['low', 'medium', 'high']).optional(),
  image_fit: z.enum(['contain', 'cover', 'original']).optional(),
});

// AI proxy schemas
const aiRequestSchema = z.object({
  action: z.enum([
    'detectDocumentType',
    'suggestPdfTemplate',
    'analyzeDocumentQuality',
    'enhanceDocumentContent',
    'generateSummary',
    'generateTableOfContents',
    'generateProfessionalHeader',
    'runFullAnalysis',
    'aiFormatContent',
  ]),
  fileName: z.string().max(255).optional(),
  content: z.string().max(10000).optional(),
  documentType: z.string().max(50).optional(),
  maxLength: z.number().min(50).max(2000).optional(),
  title: z.string().max(200).optional(),
  subtitle: z.string().max(200).optional(),
  companyName: z.string().max(200).optional(),
  format: z.string().max(20).optional(),
});

module.exports = {
  validate,
  verifyTokenSchema,
  setupProfileSchema,
  createConversionSchema,
  checkoutSessionSchema,
  updateProfileSchema,
  engineConvertSchema,
  aiRequestSchema,
};
