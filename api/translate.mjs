const MISTRAL_API = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-small-latest';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
}

const LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' }, { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' }, { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' }, { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' }, { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' }, { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' }, { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' }, { code: 'fi', name: 'Finnish' },
  { code: 'no', name: 'Norwegian' }, { code: 'uk', name: 'Ukrainian' },
  { code: 'cs', name: 'Czech' }, { code: 'ro', name: 'Romanian' },
  { code: 'hu', name: 'Hungarian' }, { code: 'el', name: 'Greek' },
  { code: 'th', name: 'Thai' }, { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' }, { code: 'ms', name: 'Malay' },
  { code: 'tl', name: 'Filipino' }, { code: 'he', name: 'Hebrew' },
];

function splitText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) { chunks.push(remaining); break; }
    let sp = remaining.lastIndexOf('\n\n', maxLen);
    if (sp <= 0) sp = remaining.lastIndexOf('\n', maxLen);
    if (sp <= 0) sp = remaining.lastIndexOf('. ', maxLen);
    if (sp <= 0) sp = maxLen; else sp += 1;
    chunks.push(remaining.substring(0, sp));
    remaining = remaining.substring(sp);
  }
  return chunks;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  if (req.method === 'GET' && (path === 'languages' || path === 'translate-languages')) {
    return jsonRes({ languages: LANGUAGES });
  }

  if (req.method !== 'POST') return jsonRes({ error: 'Method not allowed' }, 405);

  const apiKey = (process.env.MISTRAL_API_KEY || '').replace(/^\uFEFF/, '').trim();
  if (!apiKey) return jsonRes({ error: 'Mistral API key not configured' }, 500);

  try {
    const { text, targetLanguage, sourceLanguage } = await req.json();

    if (!text || typeof text !== 'string') return jsonRes({ error: 'Text is required' }, 400);
    if (!targetLanguage) return jsonRes({ error: 'Target language is required' }, 400);

    const targetLang = LANGUAGES.find(l => l.code === targetLanguage);
    if (!targetLang) return jsonRes({ error: `Unsupported language: ${targetLanguage}` }, 400);

    const sourceHint = sourceLanguage ? ` from ${LANGUAGES.find(l => l.code === sourceLanguage)?.name || sourceLanguage}` : '';
    const chunks = splitText(text, 4000);
    const translatedChunks = [];

    for (const chunk of chunks) {
      const res = await fetch(MISTRAL_API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MISTRAL_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the following text${sourceHint} to ${targetLang.name}.\n\nRules:\n- Preserve the original meaning, tone, and formatting exactly\n- Keep technical terms, proper nouns, URLs, and code as-is\n- Maintain paragraph breaks, bullet points, and structure\n- Do NOT add any explanations, notes, or commentary\n- Return ONLY the translated text`,
            },
            { role: 'user', content: chunk },
          ],
          temperature: 0.1,
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const err = await res.text();
        return jsonRes({ error: `Translation failed: ${err.substring(0, 300)}` }, 502);
      }

      const data = await res.json();
      translatedChunks.push(data.choices?.[0]?.message?.content || '');
    }

    return jsonRes({
      translatedText: translatedChunks.join('\n\n'),
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage,
      targetLanguageName: targetLang.name,
    });
  } catch (err) {
    return jsonRes({ error: err.message || 'Translation failed' }, 500);
  }
}

export const config = { maxDuration: 60 };
