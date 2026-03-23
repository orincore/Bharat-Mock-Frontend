"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Megaphone, X } from 'lucide-react';
import { subscriptionService, SubscriptionPlan } from '@/lib/api/subscriptionService';

const FALLBACK_NORMAL_PRICE_CENTS = 0;
const FALLBACK_SALE_PRICE_CENTS = 0;
const SHOULD_FETCH_PLANS = true;

const formatPrice = (amountCents?: number | null, currency = 'INR') => {
  if (typeof amountCents !== 'number' || Number.isNaN(amountCents)) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(FALLBACK_SALE_PRICE_CENTS / 100);
  }
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amountCents / 100);
  } catch (error) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(FALLBACK_SALE_PRICE_CENTS / 100);
  }
};

const getEffectivePriceCents = (plan?: SubscriptionPlan | null) => {
  if (!plan) return null;
  if (plan.sale_price_cents !== null && plan.sale_price_cents !== undefined) {
    return plan.sale_price_cents;
  }
  if (typeof plan.price_cents === 'number') {
    return plan.price_cents;
  }
  return plan.normal_price_cents ?? null;
};

export function SubscriptionPromoBanner() {
  const [visible, setVisible] = useState<boolean>(true);
  const [plans, setPlans] = useState<SubscriptionPlan[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!SHOULD_FETCH_PLANS) {
      console.log('[SubscriptionPromoBanner] Plan fetching disabled');
      return;
    }

    let mounted = true;
    const loadPlans = async () => {
      try {
        console.log('[SubscriptionPromoBanner] Fetching plans...');
        const fetched = await subscriptionService.getPlans();
        console.log('[SubscriptionPromoBanner] Fetched plans:', fetched);
        if (!mounted) return;
        if (fetched.length) {
          setPlans(fetched);
          console.log('[SubscriptionPromoBanner] Plans set:', fetched);
        } else {
          console.warn('[SubscriptionPromoBanner] No plans returned from API');
        }
      } catch (error) {
        console.error('[SubscriptionPromoBanner] Failed to fetch plans:', error);
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
    const sorted = [...plans].sort((a, b) => {
      const priceA = getEffectivePriceCents(a) ?? Number.MAX_SAFE_INTEGER;
      const priceB = getEffectivePriceCents(b) ?? Number.MAX_SAFE_INTEGER;
      return priceA - priceB;
    });
    return sorted[0];
  }, [plans]);

  const currencyCode = highlightedPlan?.currency_code || 'INR';
  const normalPriceFromPlan = highlightedPlan?.normal_price_cents ?? null;
  const salePriceFromPlan = highlightedPlan?.sale_price_cents ?? null;
  
  console.log('[SubscriptionPromoBanner] Price resolution:', {
    highlightedPlan,
    normalPriceFromPlan,
    salePriceFromPlan,
    price_cents: highlightedPlan?.price_cents
  });
  
  const resolvedNormalPriceCents = normalPriceFromPlan || FALLBACK_NORMAL_PRICE_CENTS;
  const resolvedSalePriceCents = (() => {
    if (
      salePriceFromPlan !== null &&
      salePriceFromPlan !== undefined &&
      salePriceFromPlan > 0 &&
      salePriceFromPlan < resolvedNormalPriceCents
    ) {
      console.log('[SubscriptionPromoBanner] Using sale price from plan:', salePriceFromPlan);
      return salePriceFromPlan;
    }
    const effective = getEffectivePriceCents(highlightedPlan);
    if (effective && effective < resolvedNormalPriceCents) {
      console.log('[SubscriptionPromoBanner] Using effective price:', effective);
      return effective;
    }
    console.log('[SubscriptionPromoBanner] Using fallback sale price:', FALLBACK_SALE_PRICE_CENTS);
    return FALLBACK_SALE_PRICE_CENTS;
  })();

  const hasDiscount = resolvedNormalPriceCents > resolvedSalePriceCents;
  
  console.log('[SubscriptionPromoBanner] Final prices:', {
    resolvedNormalPriceCents,
    resolvedSalePriceCents,
    hasDiscount
  });

  const priceStack = (
    <span className="inline-flex items-baseline gap-1.5">
      {hasDiscount && (
        <span className="text-[10px] sm:text-base text-white/70 line-through">
          {formatPrice(resolvedNormalPriceCents, currencyCode)}
        </span>
      )}
      <span className="text-xs sm:text-lg font-semibold text-amber-200">
        {formatPrice(resolvedSalePriceCents, currencyCode)}
      </span>
    </span>
  );

  const handleClose = () => {
    setVisible(false);
  };

  const handleEnrollClick = (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('show-upsell-dialog'));
      router.push('/subscriptions');
    }
  };

  if (!visible) return null;

  return (
    <>
      <div className="text-white shadow-lg">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#07142c] via-[#0f1f44] to-[#112b5f]">
          <div className="absolute inset-0 animate-banner-sheen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_50%)] opacity-60" />
          <div className="container-main relative py-1.5 sm:py-2">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-base pr-8">
              <div className="flex items-center gap-2 sm:gap-3 flex-none">
                <span className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white animate-bounce-subtle flex-shrink-0">
                  <Megaphone className="h-5 w-5" />
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 min-w-0">
                  <p className="hidden sm:block text-[9px] uppercase tracking-[0.35em] text-white/70 whitespace-nowrap">Flash Offer</p>
                  <div className="font-semibold whitespace-nowrap sm:whitespace-normal leading-tight space-y-0.5">
                    <span className="sm:hidden inline-flex flex-wrap items-center gap-2">
                      <span className="text-[11px]">Buy Premium @</span>
                      {priceStack}
                      <span className="text-[11px]">only</span>
                    </span>
                    <span className="hidden sm:inline-flex flex-wrap items-center gap-2">
                      <span>All Exams Test series for 1 year @</span>
                      {priceStack}
                      <span>only</span>
                    </span>
                  </div>
                </div>
              </div>
              <Link
                href="/subscriptions"
                className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] sm:text-sm font-semibold text-[#0b1d3c] shadow-lg shadow-black/20 transition transform hover:-translate-y-0.5 hover:shadow-2xl whitespace-nowrap flex-none"
                onClick={handleEnrollClick}
              >
                Enroll Now
              </Link>
            </div>
            <button
              type="button"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border border-white/40 text-white/80 hover:bg-white/10"
              onClick={handleClose}
              aria-label="Dismiss subscription banner"
            >
              <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
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
