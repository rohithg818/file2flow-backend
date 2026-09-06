const { Paddle } = require('@paddle/paddle-node-sdk');

const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_ENVIRONMENT = process.env.PADDLE_ENVIRONMENT || 'sandbox';

let paddle = null;

if (PADDLE_API_KEY) {
  paddle = new Paddle(PADDLE_API_KEY, {
    environment: PADDLE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production',
  });
} else {
  console.warn('PADDLE_API_KEY not set. Paddle billing routes will not work.');
}

// ============================================================
// PLAN CATALOG
// ============================================================

const PLANS = {
  starter: {
    name: 'Starter',
    description: 'For individuals and small projects',
    prices: {
      monthly: {
        priceId: process.env.PADDLE_PRICE_ID_STARTER_MONTHLY,
        amount: 299, // $2.99/mo
        currency: 'USD',
        interval: 'month',
      },
      yearly: {
        priceId: process.env.PADDLE_PRICE_ID_STARTER_YEARLY,
        amount: 2990, // $29.90/yr
        currency: 'USD',
        interval: 'year',
      },
    },
    limits: {
      conversionsPerMonth: 500,
      maxFileSizeMB: 250,
      maxBatchSize: 20,
      storageGB: 10,
      historyRetentionDays: 30,
      isPermanentStorage: false,
      apiAccess: false,
      ocrSupported: true,
    },
  },
  business: {
    name: 'Business',
    description: 'For teams and power users',
    prices: {
      monthly: {
        priceId: process.env.PADDLE_PRICE_ID_BUSINESS_MONTHLY,
        amount: 999, // $9.99/mo
        currency: 'USD',
        interval: 'month',
      },
      yearly: {
        priceId: process.env.PADDLE_PRICE_ID_BUSINESS_YEARLY,
        amount: 9990, // $99.90/yr
        currency: 'USD',
        interval: 'year',
      },
    },
    limits: {
      conversionsPerMonth: 5000,
      maxFileSizeMB: 1024,
      maxBatchSize: 50,
      storageGB: 100,
      historyRetentionDays: 90,
      isPermanentStorage: false,
      apiAccess: true,
      ocrSupported: true,
    },
  },
};

// Map Paddle price IDs back to plan tier
function getPlanByPriceId(priceId) {
  for (const [tier, plan] of Object.entries(PLANS)) {
    if (plan.prices.monthly.priceId === priceId || plan.prices.yearly.priceId === priceId) {
      return tier;
    }
  }
  return null;
}

function getPlanLimits(tier) {
  if (tier === 'free') {
    return {
      conversionsPerMonth: 10,
      maxFileSizeMB: 25,
      maxBatchSize: 1,
      storageGB: 0,
      historyRetentionDays: 0,
      isPermanentStorage: false,
      apiAccess: false,
      ocrSupported: false,
    };
  }
  return PLANS[tier]?.limits || PLANS.starter.limits;
}

module.exports = { paddle, PLANS, getPlanByPriceId, getPlanLimits };
