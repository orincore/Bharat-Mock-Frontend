"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Megaphone, X } from 'lucide-react';
import { subscriptionService, SubscriptionPlan } from '@/lib/api/subscriptionService';

const FALLBACK_PRICE = '₹349';
const SHOULD_FETCH_PLANS = process.env.NODE_ENV === 'production';

const formatCurrency = (plan: SubscriptionPlan | null) => {
  if (!plan) return FALLBACK_PRICE;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: plan.currency_code || 'INR',
      maximumFractionDigits: 0
    }).format(plan.price_cents / 100);
  } catch (error) {
    return FALLBACK_PRICE;
  }
};

export function SubscriptionPromoBanner() {
  const [visible, setVisible] = useState<boolean>(true);
  const [plans, setPlans] = useState<SubscriptionPlan[] | null>(null);

  useEffect(() => {
    if (!SHOULD_FETCH_PLANS) return;

    let mounted = true;
    const loadPlans = async () => {
      try {
        const fetched = await subscriptionService.getPlans();
        if (!mounted) return;
        if (fetched.length) {
          setPlans(fetched);
        }
      } catch (error) {
        console.warn('Subscription plans API unavailable, using fallback pricing');
      }
    };
    loadPlans();
    return () => {
      mounted = false;
    };
  }, []);

  const highlightedPlan = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    const yearly = plans.find((plan) => plan.duration_days >= 360);
    if (yearly) return yearly;
    const sorted = [...plans].sort((a, b) => a.price_cents - b.price_cents);
    return sorted[0];
  }, [plans]);

  const priceText = formatCurrency(highlightedPlan);

  const handleClose = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="text-white shadow-lg">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#07142c] via-[#0f1f44] to-[#112b5f]">
          <div className="absolute inset-0 animate-banner-sheen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_50%)] opacity-60" />
          <div className="container-main relative py-2">
            <div className="flex flex-wrap items-center gap-3 text-sm sm:text-base">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white animate-bounce-subtle flex-shrink-0">
                  <Megaphone className="h-5 w-5" />
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-white/70 whitespace-nowrap">Flash Offer</p>
                  <p className="font-semibold whitespace-nowrap sm:whitespace-normal leading-tight">
                    <span className="sm:hidden">Buy Premium @ ₹199 only</span>
                    <span className="hidden sm:inline">All Exams Test series for 1 year @ ₹199 only</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <Link
                  href="/subscriptions"
                  className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#0b1d3c] shadow-lg shadow-black/20 transition transform hover:-translate-y-0.5 hover:shadow-2xl whitespace-nowrap"
                >
                  Enroll Now
                </Link>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/40 text-white/80 hover:bg-white/10"
                  onClick={handleClose}
                  aria-label="Dismiss subscription banner"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes banner-sheen {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(50%); }
        }
        .animate-banner-sheen {
          animation: banner-sheen 8s linear infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2.4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
