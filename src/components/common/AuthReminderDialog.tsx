"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Crown, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { subscriptionService, SubscriptionPlan } from '@/lib/api/subscriptionService';
import { useRazorpayCheckout } from '@/lib/hooks/useRazorpayCheckout';

const STORAGE_KEY = 'auth_reminder_dismissed';
const GUEST_DISMISS_KEY = 'login_reminder_dismissed';
const GUEST_REMINDER_DELAY_MS = 60_000;   // 60 seconds
const UPSELL_REMINDER_DELAY_MS = 45_000;  // 45 seconds

type DialogVariant = 'guest' | 'upsell' | null;

export function AuthReminderDialog() {
  const { user, isAuthenticated } = useAuth();
  const { startCheckout, processing } = useRazorpayCheckout();
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<DialogVariant>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const upsellDismissKey = useMemo(() => (user?.id ? `${STORAGE_KEY}_${user.id}` : null), [user?.id]);
  const guestResetRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const openDialog = (nextVariant: Exclude<DialogVariant, null>) => {
    setVariant(nextVariant);
    setOpen(true);
  };

  // Guest login reminder after delay
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (user) {
      guestResetRef.current = false;
      return;
    }

    if (!guestResetRef.current) {
      sessionStorage.removeItem(GUEST_DISMISS_KEY);
      guestResetRef.current = true;
    }

    const dismissed = sessionStorage.getItem(GUEST_DISMISS_KEY) === 'true';
    if (dismissed) return;

    const timer = window.setTimeout(() => {
      openDialog('guest');
    }, GUEST_REMINDER_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [user]);

  // Reset upsell dismissal when user logs out or switches accounts
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (user?.id && user.id !== lastUserIdRef.current) {
      const userKey = `${STORAGE_KEY}_${user.id}`;
      sessionStorage.removeItem(userKey);
      lastUserIdRef.current = user.id;
    }

    if (!user?.id && lastUserIdRef.current) {
      sessionStorage.removeItem(`${STORAGE_KEY}_${lastUserIdRef.current}`);
      lastUserIdRef.current = null;
    }
  }, [user?.id]);

  // Upsell reminder for logged-in non-premium users
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!user || user.is_premium) {
      setOpen(false);
      setVariant((current) => (current === 'upsell' ? null : current));
      return;
    }

    if (upsellDismissKey && sessionStorage.getItem(upsellDismissKey) === 'true') {
      return;
    }

    const timer = window.setTimeout(() => {
      openDialog('upsell');
    }, UPSELL_REMINDER_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [user, upsellDismissKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleForcedOpen = () => {
      if (user?.is_premium) return;

      if (user) {
        if (upsellDismissKey) {
          sessionStorage.removeItem(upsellDismissKey);
        }
        openDialog('upsell');
      } else {
        sessionStorage.removeItem(GUEST_DISMISS_KEY);
        openDialog('guest');
      }
    };

    window.addEventListener('show-upsell-dialog', handleForcedOpen);
    return () => {
      window.removeEventListener('show-upsell-dialog', handleForcedOpen);
    };
  }, [user, upsellDismissKey]);

  useEffect(() => {
    let mounted = true;
    const loadPlans = async () => {
      try {
        const fetched = await subscriptionService.getPlans();
        if (!mounted) return;
        if (fetched.length) {
          setPlans(fetched);
          const highlight = fetched.find((plan) => plan.duration_days >= 360) ?? fetched[0];
          setSelectedPlanId(highlight?.id ?? null);
        }
      } catch (error) {
        console.error('Failed to load subscription plans', error);
      } finally {
        setLoadingPlans(false);
      }
    };
    loadPlans();
    return () => {
      mounted = false;
    };
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (typeof window !== 'undefined' && !nextOpen) {
      if (variant === 'guest') {
        sessionStorage.setItem(GUEST_DISMISS_KEY, 'true');
      } else if (variant === 'upsell' && upsellDismissKey) {
        sessionStorage.setItem(upsellDismissKey, 'true');
      }
      setVariant(null);
    }
    setOpen(nextOpen);
  };

  const handleActionClick = () => handleOpenChange(false);

  const sortedPlans = useMemo(() => {
    if (!plans.length) return [];
    return [...plans].sort((a, b) => {
      const priceA = (a.sale_price_cents ?? a.price_cents ?? a.normal_price_cents) || Number.MAX_SAFE_INTEGER;
      const priceB = (b.sale_price_cents ?? b.price_cents ?? b.normal_price_cents) || Number.MAX_SAFE_INTEGER;
      return priceA - priceB;
    });
  }, [plans]);

  const selectedPlan = sortedPlans.find((plan) => plan.id === selectedPlanId) ?? sortedPlans[0] ?? null;

  const formatCurrency = (valueCents?: number | null, currency = 'INR') => {
    if (typeof valueCents !== 'number' || Number.isNaN(valueCents)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(valueCents / 100);
  };

  const savingsPercent = (plan: SubscriptionPlan) => {
    if (!plan.sale_price_cents || plan.sale_price_cents >= plan.normal_price_cents) return null;
    return Math.round(((plan.normal_price_cents - plan.sale_price_cents) / plan.normal_price_cents) * 100);
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isSelected = plan.id === selectedPlan?.id;
    const effectivePrice = plan.sale_price_cents ?? plan.price_cents ?? plan.normal_price_cents;
    const discount = savingsPercent(plan);
    const months = Math.round(plan.duration_days / 30);
    const isYearly = plan.duration_days >= 360;

    return (
      <button
        key={plan.id}
        onClick={() => setSelectedPlanId(plan.id)}
        className={`relative w-full rounded-2xl border-2 px-4 py-3.5 text-left transition-all duration-200 ${
          isSelected
            ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg shadow-amber-100'
            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
        }`}
      >
        {isYearly && (
          <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2.5 py-0.5 text-[10px] font-bold text-black uppercase tracking-wide shadow">
            <Sparkles className="h-2.5 w-2.5" /> Best Value
          </span>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={`text-sm font-bold ${isSelected ? 'text-gray-900' : 'text-white'}`}>{plan.name}</p>
            <p className={`text-xs mt-0.5 ${isSelected ? 'text-gray-500' : 'text-white/50'}`}>
              {months} {months === 1 ? 'month' : 'months'} access
            </p>
            {discount !== null && (
              <span className={`mt-1 inline-block text-[11px] font-semibold ${isSelected ? 'text-emerald-600' : 'text-emerald-400'}`}>
                Save {discount}%
              </span>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            {plan.sale_price_cents && plan.sale_price_cents < plan.normal_price_cents && (
              <p className={`text-xs line-through ${isSelected ? 'text-gray-400' : 'text-white/30'}`}>
                {formatCurrency(plan.normal_price_cents)}
              </p>
            )}
            <p className={`text-xl font-extrabold ${isSelected ? 'text-gray-900' : 'text-white'}`}>
              {formatCurrency(effectivePrice)}
            </p>
          </div>
        </div>
        {isSelected && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            <CheckCircle2 className="h-3 w-3" /> Selected
          </div>
        )}
      </button>
    );
  };

  const renderUpsellContent = () => (
    <div className="flex flex-col sm:flex-row w-full">

      {/* Left — image, exactly half the dialog width, hidden on mobile */}
      <div className="relative hidden sm:block sm:w-1/2 flex-shrink-0 overflow-hidden bg-[#0a1628]">
        <Image
          src="/assets/subimg.jpg"
          alt="Bharat Mock Premium"
          width={500}
          height={600}
          priority
          className="w-full h-full object-cover object-center"
          style={{ display: 'block' }}
        />
        {/* subtle dark overlay at bottom for badge readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* badge pinned to bottom-left */}
        <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-black/50 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-amber-300">
          <Crown className="h-3.5 w-3.5" />
          Bharat Mock Premium
        </div>
      </div>

      {/* Right — plan selector, exactly same width as left on desktop, full width on mobile */}
      <div className="flex flex-col bg-white px-4 pt-10 pb-5 sm:px-6 sm:py-7 w-full sm:w-1/2 flex-shrink-0 relative">
        {/* On mobile, we need extra top padding (pt-10) because the Close (X) button 
            is absolutely positioned in the top-right of the DialogContent. */}

        <div className="mb-3 sm:mb-4">
          {/* mobile-only badge since image is hidden */}
          <div className="sm:hidden mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <Crown className="h-3 w-3" />
            Bharat Mock Premium
          </div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-gray-400 font-semibold">Choose a plan</p>
          <h4 className="mt-1 text-lg sm:text-xl font-bold text-gray-900">Unlock your full potential</h4>
          <p className="mt-0.5 text-xs text-gray-500">Join lakhs of aspirants preparing with Bharat Mock.</p>
        </div>

        {/* plan cards */}
        <div className="space-y-2 sm:space-y-2.5 rounded-2xl bg-[#0f1e3a] p-2.5 sm:p-3">
          {loadingPlans ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/10 animate-pulse" />
            ))
          ) : sortedPlans.length ? (
            sortedPlans.slice(0, 4).map(renderPlanCard)
          ) : (
            <p className="py-4 text-center text-sm text-white/50">Plans unavailable right now.</p>
          )}
        </div>

        {/* summary */}
        {selectedPlan && !loadingPlans && (
          <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Plan</span>
              <span className="font-semibold text-gray-800">{selectedPlan.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Duration</span>
              <span className="font-semibold text-gray-800">{Math.round(selectedPlan.duration_days / 30)} months</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-2">
              <span className="text-sm font-medium text-gray-700">Total payable</span>
              <span className="text-xl font-extrabold text-gray-900">
                {formatCurrency(selectedPlan.sale_price_cents ?? selectedPlan.price_cents ?? selectedPlan.normal_price_cents)}
              </span>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 space-y-2">
          <Button
            className="w-full h-12 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold text-base shadow-lg shadow-amber-200 hover:from-amber-300 hover:to-orange-400 transition-all"
            disabled={!selectedPlan || processing}
            onClick={() => {
              if (!selectedPlan) return;
              startCheckout({
                plan: selectedPlan,
                onSuccess: () => handleActionClick(),
              });
            }}
          >
            <Crown className="mr-2 h-4 w-4" />
            {processing ? 'Processing…' : 'Unlock Premium Now'}
          </Button>
          <button
            onClick={handleActionClick}
            className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            Maybe later — continue with free access
          </button>
        </div>
      </div>
    </div>
  );

  const renderGuestContent = () => (
    <div className="px-5 pt-10 pb-5 space-y-4">
      <div className="-mx-5 -mt-10">
        <Image
          src="/assets/login_banner_image.jpg"
          alt="Login reminder"
          width={800}
          height={534}
          className="w-full h-auto object-cover"
          priority
          quality={80}
        />
      </div>
      <DialogHeader className="text-left space-y-2">
        <DialogTitle className="text-xl font-semibold text-gray-900">
          Unlock the full Bharat Mock experience
        </DialogTitle>
        <DialogDescription className="text-sm text-gray-600">
          Log in or create a free account to view all premium content and attempt any exam on the platform.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <Link href="/login" className="block" onClick={handleActionClick}>
          <Button className="w-full" size="lg">
            Log in
          </Button>
        </Link>
        <Link href="/register" className="block" onClick={handleActionClick}>
          <Button className="w-full" size="lg" variant="secondary">
            Sign up for free
          </Button>
        </Link>
        <p className="text-xs text-gray-500 text-center">
          Continue browsing freely, but you&apos;ll need an account to access premium material and attempt exams.
        </p>
      </div>
    </div>
  );

  if (user?.is_premium || !variant) {
    return null;
  }

  const dialogMaxWidth = variant === 'upsell' ? 'max-w-[860px]' : 'max-w-md';
  const dialogThemeClasses = variant === 'upsell' ? 'bg-white' : 'bg-white text-gray-900';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`w-full ${dialogMaxWidth} max-h-[92vh] overflow-y-auto border-0 p-0 ${dialogThemeClasses}`}>
        <DialogTitle className="sr-only">
          {variant === 'upsell' ? 'Unlock the full Bharat Mock experience' : 'Login or signup to Bharat Mock'}
        </DialogTitle>
        {variant === 'upsell' ? renderUpsellContent() : renderGuestContent()}
      </DialogContent>
    </Dialog>
  );
}
