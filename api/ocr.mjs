const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonRes({ error: 'Method not allowed' }, 405);

  const apiKey = (process.env.MISTRAL_API_KEY || '').replace(/^\uFEFF/, '').trim();
  if (!apiKey) return jsonRes({ error: 'Mistral API key not configured' }, 500);

  try {
    const contentType = req.headers.get('content-type') || '';
    let documentPayload;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file) return jsonRes({ error: 'No file provided' }, 400);

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      const mime = file.type || 'application/pdf';
      documentPayload = { type: 'document_url', documentUrl: `data:${mime};base64,${base64}` };
    } else {
      const body = await req.json();
      documentPayload = body.document;
      if (!documentPayload) return jsonRes({ error: 'No document provided' }, 400);
    }

    const ocrRes = await fetch(MISTRAL_OCR_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: documentPayload,
        table_format: 'html',
      }),
    });

    if (!ocrRes.ok) {
      const err = await ocrRes.text();
      return jsonRes({ error: `OCR failed: ${err.substring(0, 300)}` }, 502);
    }

    const data = await ocrRes.json();
    const pages = (data.pages || []).map(p => ({
      index: p.index,
      markdown: p.markdown || '',
      images: p.images || [],
      tables: p.tables || [],
      dimensions: p.dimensions || {},
    }));

    const markdown = pages.map(p => p.markdown).join('\n\n---\n\n');
    return jsonRes({ pages, markdown, model: data.model, usage: data.usage_info || {} });
  } catch (err) {
    return jsonRes({ error: err.message || 'OCR processing failed' }, 500);
  }
}

export const config = { maxDuration: 120 };
