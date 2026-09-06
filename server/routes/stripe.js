const express = require('express');
const { stripe, PLANS } = require('../stripe');
const { getSupabase } = require('../middleware/supabase');
const { verifyToken } = require('../middleware/auth');
const { validate, checkoutSessionSchema } = require('../middleware/validation');
const { asyncHandler, logger } = require('../middleware/errorHandler');

const router = express.Router();

router.post('/create-checkout-session', verifyToken, validate(checkoutSessionSchema), asyncHandler(async (req, res) => {
  const { plan, billingCycle = 'monthly' } = req.body;
  const sb = getSupabase();

  let customerId = null;

  if (sb) {
    const { data: userData } = await sb.from('users').select('stripe_customer_id').eq('uid', req.user.uid).single();
    customerId = userData?.stripe_customer_id;
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      metadata: { firebaseUID: req.user.uid },
    });
    customerId = customer.id;

    if (sb) {
      await sb.from('users').update({ stripe_customer_id: customerId }).eq('uid', req.user.uid);
    }
  }

  const planConfig = PLANS[plan][billingCycle];
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.FRONTEND_URL}/account?session_id={CHECKOUT_SESSION_ID}&status=success`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing?status=cancelled`,
    metadata: { firebaseUID: req.user.uid, plan },
  });

  return res.json({ sessionId: session.id, url: session.url });
}));

router.post('/create-portal-session', verifyToken, asyncHandler(async (req, res) => {
  const sb = getSupabase();
  let customerId = null;

  if (sb) {
    const { data } = await sb.from('users').select('stripe_customer_id').eq('uid', req.user.uid).single();
    customerId = data?.stripe_customer_id;
  }

  if (!customerId) {
    return res.status(400).json({ error: 'No Stripe customer found' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL}/account`,
  });

  return res.json({ url: session.url });
}));

router.post('/webhook', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const sb = getSupabase();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const uid = session.metadata.firebaseUID;
      const plan = session.metadata.plan;
      if (uid && plan && sb) {
        await sb.from('users').update({
          plan,
          stripe_subscription_id: session.subscription,
        }).eq('uid', uid);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);
      const uid = customer.metadata.firebaseUID;
      if (uid && sb) {
        const planId = subscription.items.data[0]?.price?.id;
        let planTier = 'free';
        for (const [tier, config] of Object.entries(PLANS)) {
          if (config.monthly.priceId === planId || config.yearly.priceId === planId) {
            planTier = tier;
            break;
          }
        }
        await sb.from('users').update({ plan: planTier }).eq('uid', uid);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);
      const uid = customer.metadata.firebaseUID;
      if (uid && sb) {
        await sb.from('users').update({
          plan: 'free',
          stripe_subscription_id: null,
        }).eq('uid', uid);
      }
      break;
    }
  }

  return res.json({ received: true });
}));

module.exports = router;
