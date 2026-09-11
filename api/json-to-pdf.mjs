import { createClient } from '@supabase/supabase-js';
import { initializePaddle, type Paddle } from '@paddle/paddle-js';

const MISTRAL_MODEL = 'mistral-small-latest';
const MISTRAL_API = 'https://api.mistral.ai/v1/chat/completions';
const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://gotenberg-31r8.onrender.com';

const ANON_LIMIT = 4;
const FREE_DAILY_LIMIT = 8;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-anon-id, Authorization',
};

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
}

function getSupabase() {
  const url = (process.env.SUPABASE_URL || '').replace(/^\uFEFF/, '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/^\uFEFF/, '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function checkUsageGate(req, uid, anonId, ip) {
  const supabase = getSupabase();
  if (!supabase) return { allowed: true };

  const today = new Date().toISOString().split('T')[0];

  // Logged-in user: daily limit
  if (uid) {
    const { data: row } = await supabase
      .from('daily_usage')
      .select('use_count')
      .eq('user_id', uid)
      .eq('feature', 'json_to_pdf')
      .eq('use_date', today)
      .single();

    const used = row?.use_count || 0;
    if (used >= FREE_DAILY_LIMIT) {
      return {
        allowed: false,
        status: 429,
        body: {
          error: 'Daily limit reached',
          code: 'DAILY_LIMIT_REACHED',
          message: `You've used ${FREE_DAILY_LIMIT} JSON→PDF conversions today. Resets at midnight UTC, or upgrade for unlimited access.`,
          used, limit: FREE_DAILY_LIMIT,
        },
      };
    }

    await supabase.from('daily_usage').upsert({
      user_id: uid, feature: 'json_to_pdf', use_date: today,
      use_count: used + 1, last_used_at: new Date().toISOString(),
    }, { onConflict: 'user_id,feature,use_date' });

    return { allowed: true, used: used + 1, limit: FREE_DAILY_LIMIT };
  }

  // Anonymous: total limit
  if (anonId) {
    const { data: row } = await supabase
      .from('anon_usage')
      .select('use_count')
      .eq('anon_id', anonId)
      .eq('feature', 'json_to_pdf')
      .single();

    const used = row?.use_count || 0;
    if (used >= ANON_LIMIT) {
      return {
        allowed: false,
        status: 429,
        body: {
          error: 'Free trial limit reached',
          code: 'ANON_LIMIT_REACHED',
          message: `You've used all ${ANON_LIMIT} free JSON→PDF conversions. Sign up free to keep converting.`,
          used, limit: ANON_LIMIT,
        },
      };
    }

    if (row) {
      await supabase.from('anon_usage').update({
        use_count: used + 1, last_used_at: new Date().toISOString(), ip_address: ip,
      }).eq('anon_id', anonId).eq('feature', 'json_to_pdf');
    } else {
      await supabase.from('anon_usage').insert({
        anon_id: anonId, ip_address: ip, feature: 'json_to_pdf', use_count: 1,
      });
    }

    return { allowed: true, used: used + 1, limit: ANON_LIMIT };
  }

  return { allowed: true };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonRes({ error: 'Method not allowed' }, 405);

  try {
    const contentType = req.headers.get('content-type') || '';
    const anonId = req.headers.get('x-anon-id') || '';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const authHeader = req.headers.get('authorization') || '';

    let uid = null;
    // Extract uid from Bearer token if present (basic decode, no full verification for Vercel edge)
    if (authHeader.startsWith('Bearer ')) {
      try {
        const payload = JSON.parse(Buffer.from(authHeader.split('.')[1], 'base64url').toString());
        uid = payload.user_id || payload.sub || null;
      } catch {}
    }

    // Usage gate
    const gate = await checkUsageGate(req, uid, anonId, ip);
    if (!gate.allowed) {
      return jsonRes(gate.body, gate.status);
    }

    // Parse JSON file from multipart form
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return jsonRes({ error: 'No file uploaded' }, 400);

    const text = await file.text();
    let jsonData;
    try {
      jsonData = JSON.parse(text);
    } catch {
      return jsonRes({ error: 'Invalid JSON data' }, 400);
    }

    // Import classify and render from the ESM-compatible inline code
    // For the Vercel function, we just forward to Gotenberg with basic HTML
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:24px;font-size:12px;color:#1f2937;}table{border-collapse:collapse;width:100%;margin:8px 0;}th{background:#1e40af;color:white;padding:6px 8px;text-align:left;}td{padding:4px 8px;border:1px solid #e5e7eb;}h1{font-size:22px;margin-bottom:12px;}h2{font-size:16px;color:#1e40af;margin:12px 0 6px;}</style></head><body><h1>JSON Report</h1><pre style="white-space:pre-wrap;font-size:11px;">${JSON.stringify(jsonData, null, 2).replace(/</g, '&lt;')}</pre></body></html>`;

    const FormDataModule = (await import('form-data')).default;
    const form = new FormDataModule();
    form.append('files', Buffer.from(html, 'utf-8'), { filename: 'index.html', contentType: 'text/html' });

    const gotRes = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      signal: AbortSignal.timeout(120000),
    });

    if (!gotRes.ok) {
      const err = await gotRes.text().catch(() => 'No body');
      return jsonRes({ error: `PDF generation failed: ${err.substring(0, 300)}` }, 502);
    }

    const pdfBuffer = Buffer.from(await gotRes.arrayBuffer());
    const filename = (file.name || 'report.json').replace(/\.json$/i, '') + '.pdf';

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        ...CORS_HEADERS,
      },
    });
  } catch (err) {
    return jsonRes({ error: err.message || 'JSON→PDF conversion failed' }, 500);
  }
}

export const config = { maxDuration: 120 };
