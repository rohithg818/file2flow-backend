const express = require('express');
const { auth } = require('../firebaseAdmin');
const { getSupabase } = require('../middleware/supabase');
const { verifyToken } = require('../middleware/auth');
const { validate, updateProfileSchema } = require('../middleware/validation');
const { asyncHandler, logger } = require('../middleware/errorHandler');

const router = express.Router();

router.use(verifyToken);

router.get('/profile', asyncHandler(async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Database not configured' });

  const { data, error } = await sb.from('users').select('*').eq('uid', req.user.uid).single();

  if (error || !data) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json(data);
}));

router.put('/profile', validate(updateProfileSchema), asyncHandler(async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Database not configured' });

  const { displayName, photoURL } = req.body;
  const updates = {};
  if (displayName) updates.display_name = displayName;
  if (photoURL !== undefined) updates.photo_url = photoURL;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  await sb.from('users').update(updates).eq('uid', req.user.uid);

  const { data } = await sb.from('users').select('*').eq('uid', req.user.uid).single();
  return res.json(data);
}));

router.post('/generate-api-key', asyncHandler(async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Database not configured' });

  const newKey = `ff_live_${Buffer.from(req.user.uid).toString('base64url').slice(0, 20)}_${Date.now().toString(36)}`;
  await sb.from('users').update({ api_key: newKey }).eq('uid', req.user.uid);

  return res.json({ apiKey: newKey });
}));

router.get('/usage', asyncHandler(async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Database not configured' });

  const { data, error } = await sb
    .from('users')
    .select('plan, storage_used, conversions_count, created_at')
    .eq('uid', req.user.uid)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({
    plan: data.plan || 'free',
    storageUsedBytes: data.storage_used || 0,
    conversionsCount: data.conversions_count || 0,
    createdAt: data.created_at,
  });
}));

router.delete('/account', asyncHandler(async (req, res) => {
  const sb = getSupabase();

  if (sb) {
    await sb.from('conversions').update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    }).eq('user_id', req.user.uid);

    await sb.from('users').delete().eq('uid', req.user.uid);
  }

  await auth.deleteUser(req.user.uid);

  return res.json({ message: 'Account and all data deleted' });
}));

module.exports = router;
