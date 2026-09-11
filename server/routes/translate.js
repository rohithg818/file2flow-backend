const express = require('express');
const { asyncHandler, logger } = require('../middleware/errorHandler');

const router = express.Router();

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'cs', name: 'Czech' },
  { code: 'ro', name: 'Romanian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'el', name: 'Greek' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'tl', name: 'Filipino' },
  { code: 'he', name: 'Hebrew' },
];

router.get('/languages', (req, res) => {
  res.json({ languages: LANGUAGES });
});

router.post('/translate', asyncHandler(async (req, res) => {
  const { text, targetLanguage, sourceLanguage } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }
  if (!targetLanguage) {
    return res.status(400).json({ error: 'Target language is required' });
  }

  if (!MISTRAL_API_KEY) {
    return res.status(500).json({ error: 'Mistral API key not configured' });
  }

  const targetLang = LANGUAGES.find(l => l.code === targetLanguage);
  if (!targetLang) {
    return res.status(400).json({ error: `Unsupported language: ${targetLanguage}` });
  }

  const sourceHint = sourceLanguage
    ? ` from ${LANGUAGES.find(l => l.code === sourceLanguage)?.name || sourceLanguage}`
    : '';

  logger.info('Translation request', { targetLanguage, textLength: text.length });

  const chunks = splitText(text, 4000);
  const translatedChunks = [];

  for (const chunk of chunks) {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text${sourceHint} to ${targetLang.name}.

Rules:
- Preserve the original meaning, tone, and formatting exactly
- Keep technical terms, proper nouns, URLs, and code as-is
- Maintain paragraph breaks, bullet points, and structure
- Do NOT add any explanations, notes, or commentary
- Return ONLY the translated text`,
          },
          {
            role: 'user',
            content: chunk,
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => 'No body');
      logger.error('Mistral translation failed', { status: response.status });
      return res.status(502).json({ error: `Translation failed: ${err.substring(0, 300)}` });
    }

    const data = await response.json();
    translatedChunks.push(data.choices?.[0]?.message?.content || '');
  }

  const translatedText = translatedChunks.join('\n\n');

  logger.info('Translation completed', { targetLanguage, inputLength: text.length, outputLength: translatedText.length });

  res.json({
    translatedText,
    sourceLanguage: sourceLanguage || 'auto',
    targetLanguage,
    targetLanguageName: targetLang.name,
  });
}));

function splitText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitPoint = remaining.lastIndexOf('\n\n', maxLen);
    if (splitPoint <= 0) splitPoint = remaining.lastIndexOf('\n', maxLen);
    if (splitPoint <= 0) splitPoint = remaining.lastIndexOf('. ', maxLen);
    if (splitPoint <= 0) splitPoint = maxLen;
    else splitPoint += 1;
    chunks.push(remaining.substring(0, splitPoint));
    remaining = remaining.substring(splitPoint);
  }
  return chunks;
}

module.exports = router;
