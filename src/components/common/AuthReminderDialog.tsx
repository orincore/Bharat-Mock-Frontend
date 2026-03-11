"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { subscriptionService, SubscriptionPlan } from '@/lib/api/subscriptionService';

const STORAGE_KEY = 'auth_reminder_dismissed';
const GUEST_DISMISS_KEY = 'login_reminder_dismissed';
const GUEST_REMINDER_DELAY_MS = 30_000; // 30 seconds

type DialogVariant = 'guest' | 'upsell' | null;

export function AuthReminderDialog() {
  const { user, isAuthenticated } = useAuth();
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

    openDialog('upsell');
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
    return (
      <button
        key={plan.id}
        onClick={() => setSelectedPlanId(plan.id)}
        className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
          isSelected
            ? 'border-amber-400 bg-amber-50 shadow-[0_0_0_2px_rgba(251,191,36,0.25)]'
            : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/30'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
            <p className="text-xs text-gray-500">Valid for {plan.duration_days} days</p>
            {discount !== null && (
              <p className="text-[11px] font-semibold text-emerald-600 mt-1">Saving {discount}%</p>
            )}
          </div>
          <div className="text-right">
            {plan.sale_price_cents && plan.sale_price_cents < plan.normal_price_cents && (
              <p className="text-xs text-gray-400 line-through">{formatCurrency(plan.normal_price_cents)}</p>
            )}
            <p className="text-lg font-bold text-gray-900">{formatCurrency(effectivePrice)}</p>
          </div>
        </div>
        {isSelected && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Best choice
          </div>
        )}
      </button>
    );
  };

  const renderUpsellContent = () => (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(300px,1fr)]">
      <div className="hidden lg:block bg-white overflow-hidden">
        <Image
          src="/assets/subscription_banner.jpg"
          alt="Premium"
          width={1500}
          height={900}
          priority
          className="w-full h-full object-contain"
        />
      </div>

      <div className="bg-white px-5 py-5 sm:px-6 sm:py-6 space-y-4 text-gray-900">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">All Plans</p>
          <h4 className="text-xl font-semibold mt-1">Choose your access</h4>
        </div>

        <div className="space-y-2.5">
          {loadingPlans ? (
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="h-18 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : sortedPlans.length ? (
            sortedPlans.slice(0, 4).map(renderPlanCard)
          ) : (
            <p className="text-sm text-gray-500">Plans are unavailable right now. Please try again later.</p>
          )}
        </div>

        {selectedPlan && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs sm:text-sm text-gray-700 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span>Selected plan</span>
              <span className="text-gray-900 font-semibold text-sm">{selectedPlan.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Valid for</span>
              <span>{Math.round(selectedPlan.duration_days / 30)} months</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total payable</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(selectedPlan.sale_price_cents ?? selectedPlan.price_cents ?? selectedPlan.normal_price_cents)}</span>
            </div>
          </div>
        )}

        <div>
          <Button
            className="w-full bg-amber-400 text-black hover:bg-amber-300 text-sm py-5"
            asChild
            onClick={handleActionClick}
          >
            <Link href="/subscriptions">Go to Subscriptions</Link>
          </Button>
        </div>

        <p className="text-[11px] text-gray-500 text-center">Already premium? Enjoy uninterrupted access anytime.</p>
      </div>
    </div>
  );

  const renderGuestContent = () => (
    <div className="px-5 py-5 space-y-4">
      <div className="-mx-5 -mt-5">
        <Image
          src="/assets/login_banner_image.png"
          alt="Login reminder"
          width={1536}
          height={1024}
          className="w-full h-auto object-cover"
          priority
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

  const dialogMaxWidth = variant === 'upsell' ? 'max-w-[900px]' : 'max-w-md';
  const dialogThemeClasses = 'bg-white text-gray-900';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`w-full ${dialogMaxWidth} overflow-hidden border-0 p-0 ${dialogThemeClasses}`}>
        <DialogTitle className="sr-only">
          {variant === 'upsell' ? 'Unlock the full Bharat Mock experience' : 'Login or signup to Bharat Mock'}
        </DialogTitle>
        {variant === 'upsell' ? renderUpsellContent() : renderGuestContent()}
      </DialogContent>
    </Dialog>
  );
}
