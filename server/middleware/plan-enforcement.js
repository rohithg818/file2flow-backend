const { getSupabase } = require('./supabase');
const { getPlanLimits } = require('../paddle');

/**
 * Middleware to enforce plan conversion limits.
 * Checks conversions_used_this_month against the user's plan quota.
 * Call AFTER verifyToken middleware.
 */
async function enforcePlanLimits(req, res, next) {
  const supabase = getSupabase();
  if (!supabase) {
    // If Supabase is unavailable, allow the request (fail open)
    console.warn('Plan enforcement: Supabase unavailable, allowing request');
    return next();
  }

  const uid = req.user?.uid;
  if (!uid) {
    // No user = unauthenticated request, allow without limit check
    return next();
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('plan, conversions_used_this_month, monthly_reset_date')
      .eq('uid', uid)
      .single();

    if (error || !user) {
      console.warn('Plan enforcement: user not found in Supabase:', uid);
      return next(); // Fail open if user record missing
    }

    const plan = user.plan || 'free';
    const limits = getPlanLimits(plan);
    const used = user.conversions_used_this_month || 0;

    // Check if monthly reset is needed
    if (user.monthly_reset_date) {
      const resetDate = new Date(user.monthly_reset_date);
      const now = new Date();
      if (now > resetDate) {
        // Reset the counter
        await supabase
          .from('users')
          .update({
            conversions_used_this_month: 0,
            monthly_reset_date: getNextMonthlyReset(),
          })
          .eq('uid', uid);
        // Allow the request
        return next();
      }
    }

    if (used >= limits.conversionsPerMonth) {
      return res.status(429).json({
        error: 'Monthly conversion limit reached',
        message: `Your ${plan} plan allows ${limits.conversionsPerMonth} conversions per month. You've used ${used}. Upgrade your plan for more.`,
        used,
        limit: limits.conversionsPerMonth,
        plan,
      });
    }

    // Attach plan info to request for downstream use
    req.userPlan = plan;
    req.planLimits = limits;

    next();
  } catch (err) {
    console.error('Plan enforcement error:', err.message);
    next(); // Fail open
  }
}

/**
 * Increment the user's conversion counter after successful conversion.
 */
async function incrementConversionCount(uid) {
  const supabase = getSupabase();
  if (!supabase || !uid) return;

  try {
    await supabase.rpc('increment_user_quot', {
      p_uid: uid,
      p_conversions: 1,
      p_storage: 0,
    });
  } catch (err) {
    console.error('Failed to increment conversion count:', err.message);
  }
}

function getNextMonthlyReset() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0).toISOString();
}

module.exports = { enforcePlanLimits, incrementConversionCount };
