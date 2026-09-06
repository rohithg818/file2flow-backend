const MISTRAL_MODEL = 'mistral-small-latest';
const MISTRAL_API = 'https://api.mistral.ai/v1/chat/completions';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

async function chatCompletion(messages, maxTokens = 1024) {
  const apiKey = (process.env.MISTRAL_API_KEY || '').replace(/^\uFEFF/, '').trim();
  if (!apiKey) throw new Error('Mistral API key not configured');

  const res = await fetch(MISTRAL_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mistral API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content ?? '';
}

function parseJsonResponse(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in LLM response');
  return JSON.parse(match[0]);
}

export const config = { runtime: 'nodejs' };

export async function POST(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: JSON_HEADERS });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body;
  try {
    const text = await request.text();
    body = JSON.parse(text);
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  try {
    const { action, fileName, content, documentType, maxLength, title, subtitle, companyName, format } = body;
    if (!action) return jsonResponse({ error: 'Missing action' }, 400);

    let result;

    switch (action) {
      case 'detectDocumentType': {
        const text = await chatCompletion([{
          role: 'user',
          content: `What type of document is this? Respond with ONLY the type.\n\nFile: ${fileName}\nContent: ${(content || '').substring(0, 400)}\n\nTypes: report, resume, invoice, proposal, article, guide, contract, presentation, data, other`,
        }], 64);
        result = { documentType: text.trim().toLowerCase().replace(/[^a-z]/g, '') };
        break;
      }

      case 'suggestPdfTemplate': {
        const text = await chatCompletion([{
          role: 'user',
          content: `Analyze this document and suggest the BEST PDF template.\n\nFile name: ${fileName}\nContent preview: ${(content || '').substring(0, 600)}\n\nRespond in this JSON format ONLY:\n{"template":"professional_report","reason":"brief reason","suggestions":["s1"],"style":{"colors":["#1a1a2e","#00AEEF"],"fonts":"sans-serif","layout":"single-column"}}`,
        }], 512);
        result = parseJsonResponse(text);
        break;
      }

      case 'analyzeDocumentQuality': {
        const text = await chatCompletion([{
          role: 'user',
          content: `Analyze this document for quality and provide feedback.\n\nDocument:\n${(content || '').substring(0, 2000)}\n\nRespond in JSON format:\n{"qualityScore":50,"issues":["issue1"],"improvements":["imp1"],"grammarCheck":"none","readabilityScore":70}`,
        }], 512);
        result = parseJsonResponse(text);
        break;
      }

      case 'enhanceDocumentContent': {
        const text = await chatCompletion([{
          role: 'user',
          content: `Enhance this ${documentType || 'document'} document for professional PDF output.\n\nOriginal content:\n${(content || '').substring(0, 2000)}\n\nProvide suggestions in JSON format:\n{"improvements":["imp1"],"suggestedStructure":["s1"],"formatRecommendations":["rec1"]}`,
        }], 768);
        result = parseJsonResponse(text);
        break;
      }

      case 'generateSummary': {
        result = { summary: await chatCompletion([{
          role: 'user',
          content: `Generate a professional summary (max ${maxLength || 300} words) of this content:\n\n${(content || '').substring(0, 2000)}\n\nSummary should be concise and suitable for a PDF cover page.`,
        }], 256) };
        break;
      }

      case 'generateTableOfContents': {
        const text = await chatCompletion([{
          role: 'user',
          content: `Generate a table of contents for this document.\n\nTitle: ${title}\nContent: ${(content || '').substring(0, 1500)}\n\nRespond as JSON:\n{"tableOfContents":[{"section":"1. Introduction","pageNumber":"1"}]}`,
        }], 512);
        result = parseJsonResponse(text);
        break;
      }

      case 'generateProfessionalHeader': {
        const text = await chatCompletion([{
          role: 'user',
          content: `Generate professional header text for a document.\n\nTitle: ${title}\nSubtitle: ${subtitle}\nCompany: ${companyName}\n\nRespond in JSON:\n{"headerText":"professional header","styling":"font-size: 24px; font-weight: bold; color: #1a1a2e","layout":"centered"}`,
        }], 256);
        result = parseJsonResponse(text);
        break;
      }

      case 'runFullAnalysis': {
        const docType = await chatCompletion([{
          role: 'user',
          content: `What type of document is this? Respond with ONLY the type.\n\nFile: ${fileName}\nContent: ${(content || '').substring(0, 400)}\n\nTypes: report, resume, invoice, proposal, article, guide, contract, presentation, data, other`,
        }], 64);

        const template = await chatCompletion([{
          role: 'user',
          content: `Analyze this document and suggest the BEST PDF template.\n\nFile name: ${fileName}\nContent preview: ${(content || '').substring(0, 600)}\n\nRespond in JSON:\n{"template":"professional_report","reason":"reason","suggestions":[],"style":{"colors":["#1a1a2e","#00AEEF"],"fonts":"sans-serif","layout":"single-column"}}`,
        }], 512);

        const quality = await chatCompletion([{
          role: 'user',
          content: `Analyze this document for quality.\n\n${(content || '').substring(0, 2000)}\n\nRespond in JSON:\n{"qualityScore":50,"issues":[],"improvements":[],"grammarCheck":"","readabilityScore":70}`,
        }], 512);

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
            content: `You are a document formatting expert. Return ONLY valid JSON.\n\nFormat: ${format}\nFilename: ${fileName}`,
          },
          {
            role: 'user',
            content: `Analyze this ${format} content and return a structured JSON document:\n\n\`\`\`\n${(content || '').substring(0, 3000)}\n\`\`\`\n\nReturn JSON:\n{"title":"Doc title","subtitle":"Description","sections":[{"heading":"Section","headingLevel":2,"content":"text","isList":false,"items":[]}],"tables":[],"metadata":{"type":"doc type"}}`,
          },
        ], 2048);
        result = parseJsonResponse(text);
        break;
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }

    return jsonResponse(result);
  } catch (err) {
    console.error('AI API error:', err);
    return jsonResponse({ error: err.message || 'AI request failed' }, 500);
  }
}
