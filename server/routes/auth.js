const express = require('express');
const { auth } = require('../firebaseAdmin');
const { getSupabase } = require('../middleware/supabase');
const { validate, verifyTokenSchema, setupProfileSchema } = require('../middleware/validation');
const { asyncHandler, logger } = require('../middleware/errorHandler');

const router = express.Router();

router.post('/verify', validate(verifyTokenSchema), asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  const decoded = await auth.verifyIdToken(idToken);
  const sb = getSupabase();

  if (sb) {
    const { data } = await sb.from('users').select('*').eq('uid', decoded.uid).single();
    return res.json({
      uid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name || decoded.email?.split('@')[0] || 'User',
      photoURL: decoded.picture || null,
      emailVerified: decoded.email_verified,
      plan: data?.plan || 'free',
      storageUsedBytes: data?.storage_used || 0,
      conversionsCount: data?.conversions_count || 0,
      apiKey: data?.api_key || null,
      createdAt: data?.created_at || new Date().toISOString(),
    });
  }

  return res.json({
    uid: decoded.uid,
    email: decoded.email,
    displayName: decoded.name || decoded.email?.split('@')[0] || 'User',
    photoURL: decoded.picture || null,
    emailVerified: decoded.email_verified,
    plan: 'free',
    storageUsedBytes: 0,
    conversionsCount: 0,
    apiKey: null,
    createdAt: new Date().toISOString(),
  });
}));

router.post('/setup-profile', validate(setupProfileSchema), asyncHandler(async (req, res) => {
  const { idToken, displayName } = req.body;
  const decoded = await auth.verifyIdToken(idToken);
  const sb = getSupabase();

  if (sb) {
    const { data: existing } = await sb.from('users').select('uid').eq('uid', decoded.uid).single();

    if (!existing) {
      const apiKey = `ff_live_${Buffer.from(decoded.uid).toString('base64url').slice(0, 20)}_${Date.now().toString(36)}`;
      const { error } = await sb.from('users').insert({
        uid: decoded.uid,
        email: decoded.email,
        display_name: displayName || decoded.name || decoded.email?.split('@')[0] || 'User',
        photo_url: decoded.picture || '',
        plan: 'free',
        conversions_limit_per_month: 10,
        storage_limit: 0,
        history_retention_days: 0,
        is_permanent_storage: false,
        api_key: apiKey,
      });
      if (error) logger.error('Failed to create user profile', { error: error.message, uid: decoded.uid });
    }

    const { data } = await sb.from('users').select('*').eq('uid', decoded.uid).single();
    return res.json(data || { uid: decoded.uid, email: decoded.email });
  }

  // Fallback if no Supabase
  const apiKey = `ff_live_${Buffer.from(decoded.uid).toString('base64url').slice(0, 20)}_${Date.now().toString(36)}`;
  return res.json({
    uid: decoded.uid,
    email: decoded.email,
    displayName: displayName || decoded.name || decoded.email?.split('@')[0] || 'User',
    plan: 'free',
    apiKey,
  });
}));

module.exports = router;
