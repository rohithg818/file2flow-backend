const { getSupabase } = require('./supabase');

const ANON_LIMIT = 4;
const FREE_DAILY_LIMIT = 8;
const PAID_TIERS = ['starter', 'professional', 'enterprise'];

/**
 * Three-tier usage gate for premium features (JSON→PDF).
 *
 * Tier 1: Anonymous — 4 total uses via anon_id (localStorage UUID)
 * Tier 2: Logged-in free — 8 uses per day (UTC midnight reset)
 * Tier 3: Paid tiers — no limits
 *
 * Expects req.body or req.headers to contain x-anon-id for anonymous users.
 * Expects req.user (from verifyToken) for logged-in users.
 * Sets req.userPlan from enforcePlanLimits upstream.
 */

async function checkJsonUsageGate(req, res, next) {
  const supabase = getSupabase();
  const plan = req.userPlan || 'free';

  // Paid tiers: skip everything
  if (PAID_TIERS.includes(plan)) {
    return next();
  }

  // No Supabase: fail open
  if (!supabase) {
    return next();
  }

  const uid = req.user?.uid;
  const anonId = req.headers['x-anon-id'] || req.body?.anonId;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

  // --- LOGGED-IN FREE USER: daily limit ---
  if (uid) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get today's usage
      const { data: dailyRow } = await supabase
        .from('daily_usage')
        .select('use_count')
        .eq('user_id', uid)
        .eq('feature', 'json_to_pdf')
        .eq('use_date', today)
        .single();

      const usedToday = dailyRow?.use_count || 0;

      if (usedToday >= FREE_DAILY_LIMIT) {
        return res.status(429).json({
          error: 'Daily limit reached',
          code: 'DAILY_LIMIT_REACHED',
          message: `You've used ${FREE_DAILY_LIMIT} JSON→PDF conversions today. Resets at midnight UTC, or upgrade for unlimited access.`,
          used: usedToday,
          limit: FREE_DAILY_LIMIT,
          resetAt: `${today}T23:59:59Z`,
        });
      }

      // Increment usage
      const { error: upsertErr } = await supabase
        .from('daily_usage')
        .upsert({
          user_id: uid,
          feature: 'json_to_pdf',
          use_date: today,
          use_count: usedToday + 1,
          last_used_at: new Date().toISOString(),
        }, { onConflict: 'user_id,feature,use_date' });

      if (upsertErr) {
        console.warn('Daily usage upsert failed:', upsertErr.message);
      }

      req.dailyUsage = { used: usedToday + 1, limit: FREE_DAILY_LIMIT };
      return next();
    } catch (err) {
      console.error('Daily usage check failed:', err.message);
      return next(); // Fail open
    }
  }

  // --- ANONYMOUS USER: total limit ---
  if (anonId) {
    try {
      const { data: anonRow } = await supabase
        .from('anon_usage')
        .select('use_count')
        .eq('anon_id', anonId)
        .eq('feature', 'json_to_pdf')
        .single();

      const used = anonRow?.use_count || 0;

      if (used >= ANON_LIMIT) {
        return res.status(429).json({
          error: 'Free trial limit reached',
          code: 'ANON_LIMIT_REACHED',
          message: `You've used all ${ANON_LIMIT} free JSON→PDF conversions. Sign up free to keep converting.`,
          used,
          limit: ANON_LIMIT,
        });
      }

      // Upsert usage
      if (anonRow) {
        await supabase
          .from('anon_usage')
          .update({
            use_count: used + 1,
            last_used_at: new Date().toISOString(),
            ip_address: ip,
          })
          .eq('anon_id', anonId)
          .eq('feature', 'json_to_pdf');
      } else {
        await supabase
          .from('anon_usage')
          .insert({
            anon_id: anonId,
            ip_address: ip,
            feature: 'json_to_pdf',
            use_count: 1,
          });
      }

      req.anonUsage = { used: used + 1, limit: ANON_LIMIT };
      return next();
    } catch (err) {
      console.error('Anonymous usage check failed:', err.message);
      return next(); // Fail open
    }
  }

  // No anon ID and no user: allow (fail open, but this shouldn't happen)
  return next();
}

module.exports = { checkJsonUsageGate, ANON_LIMIT, FREE_DAILY_LIMIT };
