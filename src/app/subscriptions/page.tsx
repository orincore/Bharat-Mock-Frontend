"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Crown, CheckCircle2, Shield, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { subscriptionService, SubscriptionPlan } from '@/lib/api/subscriptionService';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const formatCurrency = (amountCents: number, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency
    }).format(amountCents / 100);
  } catch (error) {
    return `₹ ${(amountCents / 100).toFixed(2)}`;
  }
};

const loadRazorpayScript = () =>
  new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (document.getElementById('razorpay-checkout-script')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function SubscriptionLandingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading, refreshProfile } = useAuth();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [error, setError] = useState('');
  const [discountedAmount, setDiscountedAmount] = useState<number | null>(null);
  const [promoStatus, setPromoStatus] = useState<'idle' | 'applied' | 'invalid'>('idle');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoValidationLoading, setPromoValidationLoading] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );
  const currentPlanId = user?.subscription_plan_id ?? null;
  const isCurrentPlanSelected = Boolean(currentPlanId && selectedPlanId === currentPlanId);

  useEffect(() => {
    const loadPlans = async () => {
      setLoadingPlans(true);
      setError('');
      try {
        const data = await subscriptionService.getPlans();
        setPlans(data);
        if (data.length > 0) {
          const defaultPlan = data.find((plan) => plan.id !== currentPlanId) ?? data[0];
          setSelectedPlanId(defaultPlan?.id ?? null);
        }
      } catch (err: any) {
        console.error('Failed to load plans', err);
        setError(err.message || 'Unable to load plans. Please try again later.');
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlans();
  }, [currentPlanId]);

  useEffect(() => {
    // Whenever user edits promo, mark status as idle until checkout validates
    if (!promoCode) {
      setPromoStatus('idle');
      setPromoMessage('');
      setDiscountedAmount(null);
    } else {
      setPromoStatus('idle');
      setPromoMessage('Tap “Apply” to validate this code.');
    }
  }, [promoCode]);

  useEffect(() => {
    // Reset discount when plan or auto-renew state changes
    setDiscountedAmount(null);
    setPromoStatus(promoCode ? 'idle' : 'idle');
    setPromoMessage(promoCode ? 'Tap “Apply” to validate this code.' : '');
  }, [selectedPlanId, autoRenew]);

  const handleApplyPromo = useCallback(async () => {
    if (!selectedPlanId) {
      toast({
        title: 'Select a plan',
        description: 'Choose a plan before applying a promocode.',
        variant: 'destructive'
      });
      return;
    }

    if (!promoCode.trim()) {
      toast({
        title: 'Enter promocode',
        description: 'Add a promocode before applying.',
        variant: 'destructive'
      });
      return;
    }

    setPromoValidationLoading(true);
    try {
      const preview = await subscriptionService.previewCheckout({
        plan_id: selectedPlanId,
        promo_code: promoCode.trim(),
        auto_renew: autoRenew
      });
      setDiscountedAmount(preview.adjusted_amount_cents);
      setPromoStatus('applied');
      setPromoMessage(preview.promoDescription || 'Promocode applied successfully.');
    } catch (previewError: any) {
      console.error('Promo preview failed', previewError);
      setPromoStatus('invalid');
      setPromoMessage(previewError.message || 'Promocode invalid for this plan.');
      setDiscountedAmount(null);
    } finally {
      setPromoValidationLoading(false);
    }
  }, [autoRenew, promoCode, selectedPlanId, toast]);

  const handleCheckout = useCallback(async () => {
    if (!selectedPlanId) {
      toast({
        title: 'Select a plan',
        description: 'Please choose a plan before continuing.',
        variant: 'destructive'
      });
      return;
    }

    if (currentPlanId && selectedPlanId === currentPlanId && user?.is_premium) {
      toast({
        title: 'Plan already active',
        description: 'You cannot purchase the same plan again. Pick another plan to upgrade.',
        variant: 'destructive'
      });
      return;
    }

    if (!isAuthenticated) {
      router.push(`/login?redirect=/subscriptions`);
      return;
    }

    setProcessingCheckout(true);
    setError('');

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay SDK. Please refresh and try again.');
      }

      const checkout = await subscriptionService.startCheckout({
        plan_id: selectedPlanId,
        promo_code: promoCode.trim() || undefined,
        auto_renew: autoRenew
      });

      if (checkout.adjustedAmount) {
        setDiscountedAmount(checkout.adjustedAmount);
        setPromoStatus('applied');
        setPromoMessage(checkout.promoDescription || 'Promocode applied successfully.');
      }

      const rzp = new window.Razorpay({
        key: checkout.razorpayKey,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'Bharat Mock',
        description: selectedPlan?.name || 'Subscription',
        order_id: checkout.orderId,
        handler: async (response: any) => {
          try {
            await subscriptionService.confirmPayment({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });
            await refreshProfile();
            toast({
              title: 'Subscription activated',
              description: 'Enjoy your premium access!'
            });
            router.push('/profile');
          } catch (confirmError: any) {
            console.error('Confirm payment failed', confirmError);
            toast({
              title: 'Payment captured but confirmation failed',
              description: confirmError.message || 'Contact support with your payment details.',
              variant: 'destructive'
            });
          } finally {
            setProcessingCheckout(false);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        notes: {
          subscriptionId: checkout.subscriptionId
        },
        theme: {
          color: '#2563eb'
        }
      });

      rzp.on('payment.failed', (response: any) => {
        setProcessingCheckout(false);
        toast({
          title: 'Payment failed',
          description: response.error?.description || 'Please try again or use another payment method.',
          variant: 'destructive'
        });
      });

      rzp.open();
    } catch (checkoutError: any) {
      console.error('Checkout failed', checkoutError);
      setProcessingCheckout(false);
      setError(checkoutError.message || 'Unable to start checkout. Please try again.');
      toast({
        title: 'Checkout failed',
        description: checkoutError.message || 'Unable to start checkout. Please try again.',
        variant: 'destructive'
      });
    }
  }, [autoRenew, isAuthenticated, promoCode, router, selectedPlan, selectedPlanId, toast, user]);

  const displayAmount = discountedAmount ?? (selectedPlan ? selectedPlan.price_cents : 0);
  const perks = [
    'Unlimited access to premium mock tests',
    'Personalized performance analytics',
    'Priority support and early content drops',
    'Detailed answer explanations and review mode'
  ];

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container-main space-y-10">
        <div className="text-center space-y-4">
          <Badge className="bg-primary/10 text-primary border-primary/20">Premium Learning</Badge>
          <h1 className="font-display text-4xl font-bold text-foreground">
            Level up with Bharat Mock Premium
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Unlock advanced analytics, unlimited practice tests, and exclusive exam resources curated by experts. Pick a plan and start preparing smarter today.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {loadingPlans ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx} className="animate-pulse">
                <CardHeader>
                  <CardTitle className="h-6 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 4 }).map((__, subIdx) => (
                    <div key={subIdx} className="h-3 bg-muted rounded" />
                  ))}
                </CardContent>
              </Card>
            ))
          ) : plans.length === 0 ? (
            <Card className="lg:col-span-3">
              <CardContent className="py-12 text-center text-muted-foreground">
                No subscription plans are available right now. Please check back soon.
              </CardContent>
            </Card>
          ) : (
            plans.map((plan) => {
              const isSelected = plan.id === selectedPlanId;
              const isCurrentPlan = plan.id === currentPlanId && Boolean(user?.is_premium);
              return (
                <Card
                  key={plan.id}
                  className={`border-2 transition-all ${
                    isSelected ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'
                  } ${isCurrentPlan ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => {
                    if (isCurrentPlan) {
                      toast({
                        title: 'Plan already active',
                        description: 'Select a different plan to upgrade your subscription.',
                        variant: 'destructive'
                      });
                      return;
                    }
                    setSelectedPlanId(plan.id);
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {plan.name}
                          {plan.slug?.toLowerCase().includes('pro') ? (
                            <Badge variant="secondary" className="text-xs">
                              Popular
                            </Badge>
                          ) : null}
                          {isCurrentPlan ? (
                            <Badge variant="outline" className="text-xs border-amber-200 text-amber-600">
                              Current Plan
                            </Badge>
                          ) : null}
                        </CardTitle>
                        <CardDescription>{plan.description || 'Premium access'}</CardDescription>
                      </div>
                      {isSelected && <CheckCircle2 className="h-6 w-6 text-primary" />}
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-foreground">
                        {formatCurrency(plan.price_cents, plan.currency_code)}
                      </p>
                      <p className="text-sm text-muted-foreground">{plan.duration_days} days access</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(plan.features && plan.features.length > 0 ? plan.features : perks.slice(0, 3)).map((feature) => (
                      <div key={`${plan.id}-${feature}`} className="flex items-start gap-2 text-sm">
                        <Shield className="h-4 w-4 text-primary mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={isSelected ? 'default' : 'outline'}
                      disabled={isCurrentPlan}
                    >
                      {isCurrentPlan ? 'Current Plan' : isSelected ? 'Selected' : 'Choose Plan'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr] items-start">
          <Card>
            <CardHeader>
              <CardTitle>Why go Premium?</CardTitle>
              <CardDescription>Every plan unlocks these pro-only benefits.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {perks.map((perk) => (
                <div key={perk} className="rounded-2xl border border-border/80 bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <Sparkles className="h-4 w-4" />
                    Premium edge
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{perk}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
              <CardDescription>Select a plan and enter a promocode if you have one.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Promocode</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="PROMO2026"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    disabled={processingCheckout || promoValidationLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyPromo}
                    disabled={processingCheckout || promoValidationLoading || !promoCode.trim()}
                  >
                    {promoValidationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/80 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Enable auto-renew</p>
                  <p className="text-xs text-muted-foreground">Turn on to keep premium active without interruption.</p>
                </div>
                <Switch checked={autoRenew} onCheckedChange={setAutoRenew} disabled={processingCheckout} />
              </div>
              <div className="rounded-xl bg-muted/40 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Selected Plan</span>
                  <span className="font-medium">{selectedPlan?.name || 'None'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{selectedPlan?.duration_days ? `${selectedPlan.duration_days} days` : '—'}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>
                    {selectedPlan ? formatCurrency(displayAmount, selectedPlan.currency_code) : '—'}
                  </span>
                </div>
                {promoStatus === 'applied' && promoMessage && (
                  <p className="text-xs text-emerald-600">{promoMessage}</p>
                )}
                {promoStatus === 'invalid' && promoMessage && (
                  <p className="text-xs text-destructive">{promoMessage}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={processingCheckout || !selectedPlan || isCurrentPlanSelected}
              >
                {processingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                <span className="ml-2">{processingCheckout ? 'Processing...' : 'Upgrade Now'}</span>
              </Button>
              {!authLoading && !isAuthenticated && (
                <p className="text-xs text-muted-foreground text-center">
                  You need to be logged in to subscribe.{' '}
                  <Link href="/login" className="text-primary underline">
                    Sign in
                  </Link>
                  {' '}or{' '}
                  <Link href="/register" className="text-primary underline">
                    create an account
                  </Link>
                  .
                </p>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
