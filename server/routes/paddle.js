const express = require('express');
const crypto = require('crypto');
const { paddle, PLANS, getPlanByPriceId } = require('../paddle');
const { getSupabase } = require('../middleware/supabase');

const router = express.Router();

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;

// ============================================================
// WEBHOOK VERIFICATION
// ============================================================

function verifyPaddleWebhook(rawBody, signature) {
  if (!PADDLE_WEBHOOK_SECRET) {
    console.error('PADDLE_WEBHOOK_SECRET not set — cannot verify webhooks');
    return false;
  }

  try {
    // Paddle v2 webhook signature verification
    // Format: timestamp:version:md5hash
    const parts = signature.split(':');
    if (parts.length !== 3) return false;

    const [timestamp, version, hash] = parts;

    // Replay protection: reject if older than 5 minutes
    const timestampMs = parseInt(timestamp, 10) * 1000;
    if (Date.now() - timestampMs > 5 * 60 * 1000) {
      console.warn('Paddle webhook: replay protection triggered, timestamp too old');
      return false;
    }

    // Compute expected hash
    const bodyStr = rawBody.toString('utf8');
    const signedPayload = timestamp + ':' + PADDLE_WEBHOOK_SECRET + ':' + bodyStr + ':' + PADDLE_WEBHOOK_SECRET;
    const expectedHash = crypto.createHash('sha256').update(signedPayload).digest('hex');

    return hash === expectedHash;
  } catch (err) {
    console.error('Paddle webhook verification error:', err.message);
    return false;
  }
}

// ============================================================
// WEBHOOK HANDLER
// ============================================================

// Must use raw body for signature verification — mount this BEFORE express.json()
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['paddle-signature'] || req.headers['x-paddle-signature'] || '';

  // Log all incoming webhooks
  console.log('Paddle webhook received:', {
    event: req.body?.event_type || 'unknown',
    timestamp: new Date().toISOString(),
    hasSignature: !!signature,
  });

  // Verify signature
  if (!verifyPaddleWebhook(req.body, signature)) {
    console.error('Paddle webhook signature verification FAILED');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch (err) {
    console.error('Paddle webhook: failed to parse body:', err.message);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { event_type, data } = event;
  console.log('Paddle webhook verified:', { event_type, data_id: data?.id });

  const supabase = getSupabase();
  if (!supabase) {
    console.error('Paddle webhook: Supabase not available');
    return res.status(500).json({ error: 'Database unavailable' });
  }

  try {
    switch (event_type) {
      // ---- SUBSCRIPTION CREATED ----
      case 'subscription.created':
      case 'subscription.activated': {
        const subscription = data;
        const customerId = subscription.customer_id;
        const customerEmail = subscription.customer?.email || subscription.custom_data?.email || null;
        const priceId = subscription.items?.[0]?.price?.id;
        const planTier = getPlanByPriceId(priceId);

        if (!planTier) {
          console.warn('Paddle webhook: unknown price ID:', priceId);
          break;
        }

        const user = await findUserByPaddleCustomer(supabase, customerId, customerEmail);
        if (!user) {
          console.warn('Paddle webhook: no user found for customer:', customerId, customerEmail);
          break;
        }

        const plan = PLANS[planTier];
        await supabase
          .from('users')
          .update({
            plan: planTier,
            plan_status: 'active',
            subscription_status: 'active',
            subscription_plan: planTier,
            paddle_subscription_id: subscription.id,
            paddle_customer_id: customerId,
            conversions_limit_per_month: plan.limits.conversionsPerMonth,
            storage_limit: plan.limits.storageGB * 1024 * 1024,
            history_retention_days: plan.limits.historyRetentionDays,
            last_activity_at: new Date().toISOString(),
          })
          .eq('uid', user.uid);

        console.log(`Paddle: User ${user.uid} upgraded to ${planTier}`);
        break;
      }

      // ---- SUBSCRIPTION UPDATED ----
      case 'subscription.updated': {
        const subscription = data;
        const customerId = subscription.customer_id;
        const customerEmail = subscription.customer?.email || subscription.custom_data?.email || null;
        const priceId = subscription.items?.[0]?.price?.id;
        const planTier = getPlanByPriceId(priceId);

        if (!planTier) {
          console.warn('Paddle webhook: unknown price ID on update:', priceId);
          break;
        }

        const user = await findUserByPaddleCustomer(supabase, customerId, customerEmail);
        if (!user) {
          console.warn('Paddle webhook: no user found for update:', customerId, customerEmail);
          break;
        }

        const plan = PLANS[planTier];
        const status = subscription.status;
        const isActive = status === 'active' || status === 'trialing';

        await supabase
          .from('users')
          .update({
            plan: isActive ? planTier : 'free',
            plan_status: isActive ? 'active' : 'canceled',
            subscription_status: isActive ? 'active' : 'canceled',
            subscription_plan: isActive ? planTier : null,
            conversions_limit_per_month: isActive ? plan.limits.conversionsPerMonth : 10,
            storage_limit: isActive ? plan.limits.storageGB * 1024 * 1024 : 0,
            history_retention_days: isActive ? plan.limits.historyRetentionDays : 0,
            last_activity_at: new Date().toISOString(),
          })
          .eq('uid', user.uid);

        console.log(`Paddle: User ${user.uid} subscription updated to ${planTier} (${status})`);
        break;
      }

      // ---- SUBSCRIPTION CANCELED ----
      case 'subscription.canceled':
      case 'subscription.deactivated': {
        const subscription = data;
        const customerId = subscription.customer_id;
        const customerEmail = subscription.customer?.email || subscription.custom_data?.email || null;

        const user = await findUserByPaddleCustomer(supabase, customerId, customerEmail);
        if (!user) {
          console.warn('Paddle webhook: no user found for canceled sub:', customerId, customerEmail);
          break;
        }

        await supabase
          .from('users')
          .update({
            plan: 'free',
            plan_status: 'canceled',
            subscription_status: 'canceled',
            subscription_plan: null,
            paddle_subscription_id: null,
            conversions_limit_per_month: 10,
            storage_limit: 0,
            history_retention_days: 0,
            last_activity_at: new Date().toISOString(),
          })
          .eq('uid', user.uid);

        console.log(`Paddle: User ${user.uid} downgraded to free (subscription canceled)`);
        break;
      }

      // ---- PAYMENT SUCCEEDED (log for debugging) ----
      case 'payment.succeeded': {
        console.log('Paddle: Payment succeeded:', data?.id, data?.amount);
        break;
      }

      // ---- PAYMENT FAILED ----
      case 'payment.failed': {
        console.warn('Paddle: Payment failed:', data?.id, data?.failure_reason);
        break;
      }

      // ---- LOG UNHANDLED EVENTS ----
      default:
        console.log('Paddle webhook: unhandled event type:', event_type);
    }
  } catch (err) {
    console.error('Paddle webhook processing error:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  // Always respond 200 to acknowledge receipt
  res.status(200).json({ received: true });
});

// ============================================================
// CHECKOUT SESSION (for frontend to create)
// ============================================================

router.post('/create-checkout', async (req, res) => {
  try {
    const { priceId, email, userId } = req.body;
    if (!priceId || !email) {
      return res.status(400).json({ error: 'priceId and email are required' });
    }

    // Ensure customer exists in Paddle
    let customerId = null;
    try {
      const existing = await paddle.customers.list({ email: [email] });
      if (existing && existing.data && existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const newCustomer = await paddle.customers.create({ email, name: userId || email });
        customerId = newCustomer.id;
      }
    } catch (err) {
      // Customer may already exist with conflicting data - extract ID from error
      if (err.detail && err.detail.includes('conflicts with customer of id')) {
        const match = err.detail.match(/id (ctm_[a-z0-9]+)/);
        if (match) customerId = match[1];
      } else {
        console.warn('Paddle customer lookup/create failed:', err.message);
      }
    }

    // Create a one-time client token for this checkout session
    const clientToken = await paddle.clientTokens.create({
      name: `Checkout for ${email}`,
      description: `One-time client token for ${email} checkout`,
    });

    // Store paddle_customer_id on the user if we found/created one
    if (customerId && userId) {
      const { getSupabase } = require('../middleware/supabase');
      const supabase = getSupabase();
      if (supabase) {
        await supabase
          .from('users')
          .update({ paddle_customer_id: customerId })
          .eq('uid', userId);
      }
    }

    res.json({
      clientToken: clientToken.token,
      customerId,
      priceId,
    });
  } catch (err) {
    console.error('Paddle checkout creation failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// HELPERS
// ============================================================

async function findUserByPaddleCustomer(supabase, paddleCustomerId, email) {
  // Try by paddle_customer_id first
  let { data } = await supabase
    .from('users')
    .select('uid')
    .eq('paddle_customer_id', paddleCustomerId)
    .single();

  if (data) return data;

  // Fallback: find by email (Paddle includes customer email in webhook data)
  if (email) {
    let { data: byEmail } = await supabase
      .from('users')
      .select('uid')
      .eq('email', email)
      .single();

    if (byEmail) {
      // Link the paddle_customer_id for future lookups
      await supabase
        .from('users')
        .update({ paddle_customer_id: paddleCustomerId })
        .eq('uid', byEmail.uid);
      return byEmail;
    }
  }

  return null;
}

module.exports = router;
