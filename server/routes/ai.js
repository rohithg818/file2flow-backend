const express = require('express');
const Groq = require('groq-sdk');
const { verifyToken } = require('../middleware/auth');
const { validate, aiRequestSchema } = require('../middleware/validation');
const { aiLimiter } = require('../middleware/rateLimit');
const { asyncHandler, logger } = require('../middleware/errorHandler');

const router = express.Router();

const GROQ_MODEL = 'openai/gpt-oss-120b';
const MISTRAL_MODEL = 'mistral-small-latest';

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq API key not configured on server');
  return new Groq({ apiKey });
}

function getMistralClient() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey, baseURL: 'https://api.mistral.ai/v1' });
}

async function chatCompletion(messages, maxTokens = 1024) {
  const mistral = getMistralClient();
  const client = mistral || getGroqClient();
  const model = mistral ? MISTRAL_MODEL : GROQ_MODEL;
  const res = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature: 0.3,
    messages,
  });
  return res.choices[0]?.message?.content ?? '';
}

function parseJsonResponse(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in LLM response');
  return JSON.parse(match[0]);
}

// All AI routes require auth + rate limiting
router.use(verifyToken);
router.use(aiLimiter);

router.post('/', validate(aiRequestSchema), asyncHandler(async (req, res) => {
  const { action, fileName, content, documentType, maxLength, title, subtitle, companyName, format } = req.body;

  logger.info('AI request', { action, userId: req.user.uid, fileName });

  let result;

  switch (action) {
    case 'detectDocumentType': {
      const text = await chatCompletion([{
        role: 'user',
        content: `What type of document is this? Respond with ONLY the type.\n\nFile: ${fileName}\nContent: ${content?.substring(0, 400) || ''}\n\nTypes: report, resume, invoice, proposal, article, guide, contract, presentation, data, other`,
      }], 64);
      result = { documentType: text.trim().toLowerCase().replace(/[^a-z]/g, '') };
      break;
    }

    case 'suggestPdfTemplate': {
      const text = await chatCompletion([{
        role: 'user',
        content: `Analyze this document and suggest the BEST PDF template.\n\nFile name: ${fileName}\nContent preview: ${content?.substring(0, 600) || ''}\n\nRespond in this JSON format ONLY:\n{"template":"professional_report | academic | resume | invoice | minimal | modern","reason":"brief reason","suggestions":["s1","s2","s3"],"style":{"colors":["#hex1","#hex2"],"fonts":"font suggestions","layout":"single-column | two-column | sidebar"}}`,
      }], 512);
      result = parseJsonResponse(text);
      break;
    }

    case 'analyzeDocumentQuality': {
      const text = await chatCompletion([{
        role: 'user',
        content: `Analyze this document for quality and provide feedback.\n\nDocument:\n${content?.substring(0, 2000) || ''}\n\nRespond in JSON format:\n{"qualityScore":0-100,"issues":["issue1"],"improvements":["imp1"],"grammarCheck":"issues","readabilityScore":0-100}`,
      }], 512);
      result = parseJsonResponse(text);
      break;
    }

    case 'enhanceDocumentContent': {
      const text = await chatCompletion([{
        role: 'user',
        content: `Enhance this ${documentType || 'document'} document for professional PDF output.\n\nOriginal content:\n${content?.substring(0, 2000) || ''}\n\nProvide suggestions in JSON format:\n{"improvements":["imp1"],"suggestedStructure":["s1"],"formatRecommendations":["rec1"],"addParagraph":"optional summary"}`,
      }], 768);
      result = parseJsonResponse(text);
      break;
    }

    case 'generateSummary': {
      result = { summary: await chatCompletion([{
        role: 'user',
        content: `Generate a professional summary (max ${maxLength || 300} words) of this content:\n\n${content?.substring(0, 2000) || ''}\n\nSummary should be concise, impactful, and suitable for a PDF cover page.`,
      }], 256) };
      break;
    }

    case 'generateTableOfContents': {
      const text = await chatCompletion([{
        role: 'user',
        content: `Generate a table of contents for this document.\n\nTitle: ${title}\nContent: ${content?.substring(0, 1500) || ''}\n\nRespond as JSON:\n{"tableOfContents":[{"section":"1. Introduction","pageNumber":"1"}]}`,
      }], 512);
      result = parseJsonResponse(text);
      break;
    }

    case 'generateProfessionalHeader': {
      const text = await chatCompletion([{
        role: 'user',
        content: `Generate professional header text for a document.\n\nTitle: ${title}\nSubtitle: ${subtitle}\nCompany: ${companyName}\n\nRespond in JSON:\n{"headerText":"professional header","styling":"CSS suggestions","layout":"centered | left-aligned | split"}`,
      }], 256);
      result = parseJsonResponse(text);
      break;
    }

    case 'runFullAnalysis': {
      const [docType, template, quality] = await Promise.all([
        chatCompletion([{
          role: 'user',
          content: `What type of document is this? Respond with ONLY the type.\n\nFile: ${fileName}\nContent: ${content?.substring(0, 400) || ''}\n\nTypes: report, resume, invoice, proposal, article, guide, contract, presentation, data, other`,
        }], 64),
        chatCompletion([{
          role: 'user',
          content: `Analyze this document and suggest the BEST PDF template.\n\nFile name: ${fileName}\nContent preview: ${content?.substring(0, 600) || ''}\n\nRespond in JSON:\n{"template":"professional_report","reason":"reason","suggestions":[],"style":{"colors":["#1a1a2e","#00AEEF"],"fonts":"sans-serif","layout":"single-column"}}`,
        }], 512),
        chatCompletion([{
          role: 'user',
          content: `Analyze this document for quality.\n\n${content?.substring(0, 2000) || ''}\n\nRespond in JSON:\n{"qualityScore":0-100,"issues":[],"improvements":[],"grammarCheck":"","readabilityScore":0-100}`,
        }], 512),
      ]);
      result = {
        documentType: docType.trim().toLowerCase().replace(/[^a-z]/g, ''),
        template: parseJsonResponse(template),
        quality: parseJsonResponse(quality),
      };
      break;
    }

    case 'aiFormatContent': {
      const text = await chatCompletion([
        {
          role: 'system',
          content: `You are a document formatting expert. Analyze the raw content and restructure it into a professional document layout. Return ONLY valid JSON, no markdown fences.\n\nFormat: ${format}\nFilename: ${fileName}`,
        },
        {
          role: 'user',
          content: `Analyze this ${format} content and return a structured JSON document:\n\n\`\`\`\n${content?.substring(0, 3000) || ''}\n\`\`\`\n\nReturn JSON:\n{"title":"Doc title","subtitle":"Description","sections":[{"heading":"Section","headingLevel":2,"content":"text","isList":false,"items":[]}],"tables":[{"headers":["Col1"],"rows":[["val1"]]}],"metadata":{"type":"doc type"}}`,
        },
      ], 2048);
      result = parseJsonResponse(text);
      break;
    }

    default:
      return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  return res.json(result);
}));

module.exports = router;
