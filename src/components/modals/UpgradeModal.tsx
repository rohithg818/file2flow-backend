import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Sparkles,
  CreditCard,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PRICING_PLANS } from '../../data/plans';
import { PlanTier } from '../../types';
import { initializePaddle, type Paddle } from '@paddle/paddle-js';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/^\uFEFF/, '');

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

export const UpgradeModal: React.FC = () => {
  const {
    upgradeModalOpen,
    setUpgradeModalOpen,
    user,
  } = useApp();

  const [selectedPlanId, setSelectedPlanId] = useState<PlanTier>(
    user?.plan === 'free' ? 'starter' : (user?.plan || 'starter')
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paddle, setPaddle] = useState<Paddle | null>(null);

  useEffect(() => {
    const clientToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
    const environment = (import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox').replace(/^\uFEFF/, '');
    if (clientToken) {
      initializePaddle({
        token: clientToken,
        environment: environment as 'sandbox' | 'production',
      }).then(setPaddle).catch(console.error);
    }
  }, []);

  if (!upgradeModalOpen) return null;

  const currentPlan = PRICING_PLANS.find((p) => p.id === selectedPlanId) || PRICING_PLANS[1];
  const price = billingCycle === 'yearly'
    ? (currentPlan.priceYearly / 12).toFixed(0)
    : currentPlan.priceMonthly;

  const handleCheckout = async () => {
    if (!user) return;
    setIsProcessing(true);

    const isStarter = selectedPlanId === 'starter';
    const priceId = isStarter
      ? (billingCycle === 'yearly' ? PADDLE_PRICES.starter.yearly : PADDLE_PRICES.starter.monthly)
      : (billingCycle === 'yearly' ? PADDLE_PRICES.business.yearly : PADDLE_PRICES.business.monthly);

    if (!priceId) {
      setIsProcessing(false);
      return;
    }

    try {
      if (paddle) {
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
        const res = await fetch(`${API_URL}/api/webhooks/paddle/create-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId, email: user.email, userId: user.uid }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error(data.error || 'Checkout failed');
        }
      }
      setUpgradeModalOpen(false);
    } catch {
      // Error handled by toast
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/30 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-[#EFF6FF] via-white to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-[#2563EB]/20">
                <Sparkles className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Upgrade Subscription
                </h3>
                <p className="text-xs text-slate-500">
                  Unlock more conversions, larger files, and API access
                </p>
              </div>
            </div>
            <button
              onClick={() => setUpgradeModalOpen(false)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Billing Toggle */}
          <div className="mt-4 flex items-center justify-center">
            <div className="p-1 rounded-xl bg-slate-100 flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Annual
                <span className="text-[10px] uppercase font-black bg-orange-400 text-slate-950 px-1.5 py-0.5 rounded-full">
                  2 Mo Free
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Plan Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRICING_PLANS.filter((p) => p.id !== 'free' && p.id !== 'enterprise').map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const planPrice = billingCycle === 'yearly' ? (plan.priceYearly / 12).toFixed(0) : plan.priceMonthly;

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#2563EB] bg-[#2563EB]/10 shadow-md shadow-[#2563EB]/10'
                      : 'border-slate-200 bg-white/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      {plan.name}
                    </span>
                    {plan.popular && (
                      <span className="text-[10px] font-black uppercase bg-[#2563EB]/10 text-[#2563EB] px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 my-2">
                    <span className="text-2xl font-black text-slate-900">
                      {planPrice === 0 ? 'Free' : `$${Math.round((plan.priceMonthly || 0) / 100)}`}
                    </span>
                    <span className="text-[10px] text-slate-500">/ mo</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {plan.tagline}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Features */}
          <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#2563EB]" />
              Included in {currentPlan.name}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              {currentPlan.features.map((feat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="pt-2 space-y-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleCheckout}
              className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm shadow-md shadow-[#2563EB]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Subscribe to {currentPlan.name} ({price === '0' ? 'Free' : `$${price}/mo`})
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" /> Secure via Paddle
              </span>
              <span>•</span>
              <span>Cancel anytime</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
