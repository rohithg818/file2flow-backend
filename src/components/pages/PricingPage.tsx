import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Star, Zap, Building2, Crown, ArrowRight, CreditCard, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PRICING_PLANS } from '../../data/plans';
import { initializePaddle, type Paddle } from '@paddle/paddle-js';

const API_URL = import.meta.env.VITE_API_URL || '';

// Paddle Price IDs from environment
const PADDLE_PRICES = {
  starter: {
    monthly: import.meta.env.VITE_PADDLE_PRICE_ID_STARTER_MONTHLY || '',
    yearly: import.meta.env.VITE_PADDLE_PRICE_ID_STARTER_YEARLY || '',
  },
  business: {
    monthly: import.meta.env.VITE_PADDLE_PRICE_ID_BUSINESS_MONTHLY || '',
    yearly: import.meta.env.VITE_PADDLE_PRICE_ID_BUSINESS_YEARLY || '',
  },
};

export const PricingPage: React.FC = () => {
  const { user, setActivePage, addToast } = useApp();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize Paddle
  useEffect(() => {
    const vendorId = import.meta.env.VITE_PADDLE_VENDOR_ID;
    const environment = import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox';
    if (vendorId) {
      initializePaddle({
        vendor: parseInt(vendorId, 10),
        environment: environment as 'sandbox' | 'production',
      }).then(setPaddle).catch(console.error);
    }
  }, []);

  // Handle success/cancel from redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      addToast({ type: 'success', title: 'Subscription Active!', message: 'Your plan has been upgraded. Enjoy your new features!' });
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('canceled') === 'true') {
      addToast({ type: 'info', title: 'Checkout Canceled', message: 'No changes were made to your subscription.' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const plans = useMemo(() => {
    return PRICING_PLANS.map(plan => ({
      ...plan,
      price: billingCycle === 'annual'
        ? Math.round(plan.priceMonthly * 0.8)
        : plan.priceMonthly,
    }));
  }, [billingCycle]);

  const handleCheckout = async (planId: string) => {
    if (!user) {
      setActivePage('auth');
      return;
    }

    if (planId === 'free' || planId === 'enterprise') return;

    const isStarter = planId === 'starter';
    const priceId = isStarter
      ? (billingCycle === 'annual' ? PADDLE_PRICES.starter.yearly : PADDLE_PRICES.starter.monthly)
      : (billingCycle === 'annual' ? PADDLE_PRICES.business.yearly : PADDLE_PRICES.business.monthly);

    if (!priceId) {
      addToast({ type: 'error', title: 'Configuration Error', message: 'Paddle Price ID not configured. Contact support.' });
      return;
    }

    setIsProcessing(true);

    try {
      if (paddle) {
        // Use Paddle.js overlay checkout
        paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customer: { email: user.email },
          customData: { userId: user.uid, email: user.email },
          settings: {
            successUrl: `${window.location.origin}/pricing?success=true`,
            cancelUrl: `${window.location.origin}/pricing?canceled=true`,
          },
        });
      } else {
        // Fallback: create checkout via backend and redirect
        const res = await fetch(`${API_URL}/api/webhooks/paddle/create-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId, email: user.email, userId: user.uid }),
        });

        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error(data.error || 'Failed to create checkout');
        }
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Checkout Failed', message: err.message || 'Could not start checkout.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getIcon = (planId: string) => {
    switch (planId) {
      case 'free': return <Star className="w-5 h-5" />;
      case 'starter': return <Zap className="w-5 h-5" />;
      case 'professional': return <Building2 className="w-5 h-5" />;
      case 'enterprise': return <Crown className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--color-body)', color: 'var(--color-text)' }}>
      <div className="absolute left-1/2 top-20 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)', filter: 'blur(100px)' }} />

      <div className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold uppercase tracking-wider px-4 py-1.5 rounded-xl inline-block mb-4" style={{ background: 'rgba(241,245,249,0.05)', color: '#2563EB' }}>
            Pricing
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-[#0F172A] mb-4">
            Upgrade your plan
          </h1>
          <p className="text-lg max-w-lg mx-auto" style={{ color: '#64748B' }}>
            Choose the plan that matches your workflow. Scale up anytime without losing your settings.
          </p>

          {/* Billing Toggle */}
          <div className="mt-6 inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-[#2563EB] text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Annual
              <span className="text-[10px] uppercase font-bold bg-orange-400 text-slate-950 px-1.5 py-0.5 rounded-full">2 Mo Free</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {plans.map((plan, index) => {
            const isPopular = plan.id === 'starter';
            const isCurrentPlan = user && user.plan === plan.id;
            const isPaid = plan.id === 'starter' || plan.id === 'professional';
            const showCheckout = isPaid && !isCurrentPlan;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative p-7 pt-12 rounded-2xl transition-all ${
                  isPopular ? 'border-[#2563EB]' : ''
                }`}
                style={{
                  background: isPopular ? 'rgba(37, 99, 235, 0.05)' : 'var(--color-light)',
                  border: `1px solid ${isPopular ? '#2563EB' : 'var(--color-border)'}`,
                }}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-lg" style={{ background: 'linear-gradient(0deg, #1D4ED8 0%, #2563EB 100%)' }}>
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-7">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: isPopular ? 'rgba(37, 99, 235, 0.15)' : 'rgba(241,245,249,0.05)', color: isPopular ? '#2563EB' : '#64748B' }}>
                      {getIcon(plan.id)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#0F172A]">{plan.name}</h3>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-5xl font-bold text-[#0F172A]">
                      {plan.id === 'enterprise' ? 'Custom' : plan.priceMonthly === 0 ? 'Free' : `$${Math.round(plan.price / 100)}`}
                    </span>
                    {plan.priceMonthly > 0 && plan.id !== 'enterprise' && <span className="text-base" style={{ color: '#64748B' }}>/month</span>}
                  </div>

                  <p className="text-base" style={{ color: '#64748B' }}>{plan.tagline}</p>
                </div>

                <div className="space-y-3.5 mb-9">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#2563EB' }} />
                      <span className="text-base" style={{ color: '#334155' }}>{feature}</span>
                    </div>
                  ))}
                </div>

                {showCheckout ? (
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isProcessing}
                    className="w-full py-4 rounded-full font-semibold text-base transition-all flex items-center justify-center gap-2 hover:brightness-125 cursor-pointer disabled:opacity-50"
                    style={
                      isPopular
                        ? { background: 'linear-gradient(0deg, #1D4ED8 0%, #2563EB 100%)', boxShadow: '0px 0px 20px rgba(0, 144, 204, 0.3)', color: 'white' }
                        : { background: 'rgba(241,245,249,0.05)', border: '1px solid var(--color-border)', color: '#334155' }
                    }
                  >
                    <CreditCard className="w-5 h-5" />
                    Subscribe {isPopular && '(Popular)'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => plan.id === 'free' ? setActivePage('convert') : plan.id === 'enterprise' ? setActivePage('landing') : null}
                    disabled={isCurrentPlan}
                    className={`w-full py-4 rounded-full font-semibold text-base transition-all flex items-center justify-center gap-2 ${
                      isCurrentPlan
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:brightness-125 cursor-pointer'
                    }`}
                    style={
                      isPopular && !isCurrentPlan
                        ? { background: 'linear-gradient(0deg, #1D4ED8 0%, #2563EB 100%)', boxShadow: '0px 0px 20px rgba(0, 144, 204, 0.3)', color: 'white' }
                        : isCurrentPlan
                        ? { background: 'rgba(241,245,249,0.05)', color: '#64748B' }
                        : { background: 'rgba(241,245,249,0.05)', border: '1px solid var(--color-border)', color: '#334155' }
                    }
                  >
                    {isCurrentPlan ? 'Current Plan' : plan.id === 'free' ? 'Get Started' : plan.id === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                    {!isCurrentPlan && plan.id !== 'free' && <ArrowRight className="w-5 h-5" />}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-14 flex items-center justify-center gap-6 text-sm" style={{ color: '#64748B' }}>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#2563EB]" /> Secure checkout via Paddle</span>
          <span>•</span>
          <span>Cancel anytime with 1 click</span>
        </div>
      </div>
    </div>
  );
};
