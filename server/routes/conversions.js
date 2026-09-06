const express = require('express');
const { getSupabase } = require('../middleware/supabase');
const { verifyToken } = require('../middleware/auth');
const { validate, createConversionSchema } = require('../middleware/validation');
const { asyncHandler, logger } = require('../middleware/errorHandler');

const router = express.Router();

router.use(verifyToken);

router.get('/', asyncHandler(async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);

  const { data, error } = await sb
    .from('conversions')
    .select('*')
    .eq('user_id', req.user.uid)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    logger.error('Failed to fetch conversions', { error: error.message, userId: req.user.uid });
    return res.status(500).json({ error: 'Failed to fetch conversions' });
  }

  return res.json(data || []);
}));

router.post('/', validate(createConversionSchema), asyncHandler(async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Database not configured' });

  const {
    originalFileName, originalFormat, originalSize, outputFormat,
    outputFileName, outputSize, pageCount, downloadUrl, conversionTimeMs, settings,
  } = req.body;

  const { data, error } = await sb.from('conversions').insert({
    user_id: req.user.uid,
    original_file_name: originalFileName,
    original_format: originalFormat,
    original_size: originalSize || 0,
    output_format: outputFormat || 'pdf',
    output_file_name: outputFileName || originalFileName.replace(/\.[^/.]+$/, '.pdf'),
    output_size: outputSize || 0,
    page_count: pageCount || 1,
    status: 'completed',
    download_url: downloadUrl || '',
    conversion_time_ms: conversionTimeMs || 0,
    settings: settings || {},
  }).select('id').single();

  if (error) {
    logger.error('Failed to create conversion', { error: error.message, userId: req.user.uid });
    return res.status(500).json({ error: 'Failed to save conversion record' });
  }

  // Update user quotas
  await sb.rpc('increment_user_quot', {
    p_uid: req.user.uid,
    p_conversions: 1,
    p_storage: outputSize || 0,
  }).catch(() => {
    // Fallback: manual update
    sb.from('users').select('conversions_used_this_month, storage_used')
      .eq('uid', req.user.uid).single()
      .then(({ data: userData }) => {
        if (userData) {
          sb.from('users').update({
            conversions_used_this_month: (userData.conversions_used_this_month || 0) + 1,
            storage_used: (userData.storage_used || 0) + (outputSize || 0),
            last_activity_at: new Date().toISOString(),
          }).eq('uid', req.user.uid).catch(() => {});
        }
      }).catch(() => {});
  });

  return res.json({ id: data?.id, message: 'Conversion record saved' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Database not configured' });

  const { data: doc } = await sb
    .from('conversions')
    .select('user_id')
    .eq('id', req.params.id)
    .single();

  if (!doc || doc.user_id !== req.user.uid) {
    return res.status(404).json({ error: 'Record not found' });
  }

  await sb.from('conversions').update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
  }).eq('id', req.params.id);

  return res.json({ message: 'Record deleted' });
}));

router.delete('/', asyncHandler(async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Database not configured' });

  await sb.from('conversions').update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
  }).eq('user_id', req.user.uid).eq('is_deleted', false);

  return res.json({ message: 'All records cleared' });
}));

module.exports = router;
