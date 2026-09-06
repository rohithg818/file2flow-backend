const Stripe = require('stripe');

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
} else {
  console.warn('STRIPE_SECRET_KEY not set. Stripe routes will not work.');
}

const PLANS = {
  individual: {
    monthly: { priceId: process.env.STRIPE_INDIVIDUAL_MONTHLY_PRICE_ID, amount: 299 },
    yearly: { priceId: process.env.STRIPE_INDIVIDUAL_YEARLY_PRICE_ID, amount: 2990 },
  },
  company: {
    monthly: { priceId: process.env.STRIPE_COMPANY_MONTHLY_PRICE_ID, amount: 999 },
    yearly: { priceId: process.env.STRIPE_COMPANY_YEARLY_PRICE_ID, amount: 9990 },
  },
};

module.exports = { stripe, PLANS };
