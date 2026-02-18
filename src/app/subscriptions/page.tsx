"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { Crown, CheckCircle2, Shield, Loader2, Sparkles, Star, Users, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { subscriptionService, SubscriptionPlan } from '@/lib/api/subscriptionService';
import { subscriptionPageService, SubscriptionPageContent } from '@/lib/api/subscriptionPageService';

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
  const [pageContent, setPageContent] = useState<SubscriptionPageContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );
  const currentPlanId = user?.subscription_plan_id ?? null;
  const isCurrentPlanSelected = Boolean(currentPlanId && selectedPlanId === currentPlanId);

  useEffect(() => {
    const loadData = async () => {
      setLoadingPlans(true);
      setLoadingContent(true);
      setError('');
      try {
        const [plansData, contentData] = await Promise.all([
          subscriptionService.getPlans(),
          subscriptionPageService.getPageContent()
        ]);
        setPlans(plansData);
        setPageContent(contentData);
        if (plansData.length > 0) {
          const defaultPlan = plansData.find((plan) => plan.id !== currentPlanId) ?? plansData[0];
          setSelectedPlanId(defaultPlan?.id ?? null);
        }
      } catch (err: any) {
        console.error('Failed to load data', err);
        setError(err.message || 'Unable to load page content. Please try again later.');
      } finally {
        setLoadingPlans(false);
        setLoadingContent(false);
      }
    };

    loadData();
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

  const heroSection = pageContent?.sections.find(s => s.section_type === 'hero');
  const featuresSection = pageContent?.sections.find(s => s.section_type === 'features');
  const benefitsSection = pageContent?.sections.find(s => s.section_type === 'benefits');
  const testimonialsSection = pageContent?.sections.find(s => s.section_type === 'testimonials');
  const faqSection = pageContent?.sections.find(s => s.section_type === 'faq');
  const ctaSection = pageContent?.sections.find(s => s.section_type === 'cta');

  if (loadingContent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {pageContent?.meta && (
        <Head>
          <title>{pageContent.meta.meta_title || 'Bharat Mock Premium'}</title>
          {pageContent.meta.meta_description && (
            <meta name="description" content={pageContent.meta.meta_description} />
          )}
          {pageContent.meta.meta_keywords && (
            <meta name="keywords" content={pageContent.meta.meta_keywords} />
          )}
          {pageContent.meta.og_title && (
            <meta property="og:title" content={pageContent.meta.og_title} />
          )}
          {pageContent.meta.og_description && (
            <meta property="og:description" content={pageContent.meta.og_description} />
          )}
          {pageContent.meta.og_image && (
            <meta property="og:image" content={pageContent.meta.og_image} />
          )}
          {pageContent.meta.canonical_url && (
            <link rel="canonical" href={pageContent.meta.canonical_url} />
          )}
        </Head>
      )}

      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            {heroSection?.settings?.show_badge && (
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-sm px-4 py-1">
                {heroSection.settings.badge_text || heroSection.subtitle || 'Premium Learning'}
              </Badge>
            )}
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              {heroSection?.title || 'Level up with Bharat Mock Premium'}
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              {heroSection?.description || 'Unlock advanced analytics, unlimited practice tests, and exclusive exam resources curated by experts. Pick a plan and start preparing smarter today.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-200" />
                <span className="text-blue-100">10,000+ Active Learners</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-300" />
                <span className="text-blue-100">4.8/5 Average Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-300" />
                <span className="text-blue-100">95% Success Rate</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 space-y-20">

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <section className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Choose Your Plan</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your exam preparation journey. All plans include premium features.
          </p>
        </section>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
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
              const isPro = plan.slug?.toLowerCase().includes('pro');
              return (
                <Card
                  key={plan.id}
                  className={`relative border-2 transition-all hover:shadow-xl ${
                    isSelected ? 'border-blue-500 shadow-xl shadow-blue-500/20 scale-105' : 'border-gray-200'
                  } ${isCurrentPlan ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${
                    isPro ? 'ring-2 ring-blue-400 ring-offset-2' : ''
                  }`}
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
                  {isPro && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 shadow-lg">
                        <Star className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <CardTitle className="text-2xl flex items-center gap-2">
                        {plan.name}
                        {isCurrentPlan && (
                          <Badge variant="outline" className="text-xs border-green-200 bg-green-50 text-green-700">
                            Active
                          </Badge>
                        )}
                      </CardTitle>
                      {isSelected && <CheckCircle2 className="h-6 w-6 text-blue-600" />}
                    </div>
                    <CardDescription className="text-base">{plan.description || 'Premium access'}</CardDescription>
                    <div className="mt-6 pt-6 border-t">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-gray-900">
                          {formatCurrency(plan.price_cents, plan.currency_code)}
                        </span>
                        <span className="text-gray-500">/ {plan.duration_days} days</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {(plan.price_cents / plan.duration_days / 100).toFixed(2)} per day
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-6">
                    {(plan.features && plan.features.length > 0 ? plan.features : perks.slice(0, 3)).map((feature) => (
                      <div key={`${plan.id}-${feature}`} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button
                      className={`w-full h-12 text-base font-semibold ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                          : ''
                      }`}
                      variant={isSelected ? 'default' : 'outline'}
                      disabled={isCurrentPlan}
                      size="lg"
                    >
                      {isCurrentPlan ? (
                        <>
                          <Award className="h-5 w-5 mr-2" />
                          Current Plan
                        </>
                      ) : isSelected ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          Selected
                        </>
                      ) : (
                        'Choose Plan'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>

        {featuresSection && featuresSection.blocks && featuresSection.blocks.length > 0 && (
          <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {featuresSection.title || 'Why go Premium?'}
                </h2>
                <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                  {featuresSection.subtitle || 'Every plan unlocks these pro-only benefits.'}
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
                {featuresSection.blocks.map((block) => (
                  <div
                    key={block.id}
                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{block.title}</h3>
                    <p className="text-sm text-gray-600">{block.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[2fr,1fr] items-start max-w-6xl mx-auto">
          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
              <CardTitle className="text-2xl">Complete Your Purchase</CardTitle>
              <CardDescription className="text-base">Review your selection and apply any promo codes</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Secure Payment</p>
                    <p className="text-sm text-blue-700">Your payment information is encrypted and secure</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Have a promo code?</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Enter promo code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      disabled={processingCheckout || promoValidationLoading}
                      className="h-12"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyPromo}
                      disabled={processingCheckout || promoValidationLoading || !promoCode.trim()}
                      className="h-12 px-6"
                    >
                      {promoValidationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                  {promoStatus === 'applied' && promoMessage && (
                    <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      {promoMessage}
                    </p>
                  )}
                  {promoStatus === 'invalid' && promoMessage && (
                    <p className="text-sm text-red-600 mt-2">{promoMessage}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 shadow-lg sticky top-24">
            <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardTitle className="text-2xl">Order Summary</CardTitle>
              <CardDescription className="text-base">Review your selection before checkout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Enable auto-renew</p>
                    <p className="text-xs text-gray-500">Keep premium active automatically</p>
                  </div>
                  <Switch checked={autoRenew} onCheckedChange={setAutoRenew} disabled={processingCheckout} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 space-y-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Selected Plan</span>
                  <span className="font-semibold text-gray-900">{selectedPlan?.name || 'None'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Duration</span>
                  <span className="font-semibold text-gray-900">
                    {selectedPlan?.duration_days ? `${selectedPlan.duration_days} days` : '—'}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">Total Amount</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {selectedPlan ? formatCurrency(displayAmount, selectedPlan.currency_code) : '—'}
                    </span>
                  </div>
                </div>
                {promoStatus === 'applied' && promoMessage && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {promoMessage}
                    </p>
                  </div>
                )}
                {promoStatus === 'invalid' && promoMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{promoMessage}</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-6">
              <Button
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                onClick={handleCheckout}
                disabled={processingCheckout || !selectedPlan || isCurrentPlanSelected}
              >
                {processingCheckout ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="h-5 w-5 mr-2" />
                    Proceed to Payment
                  </>
                )}
              </Button>
              {!authLoading && !isAuthenticated && (
                <p className="text-sm text-gray-600 text-center">
                  You need to be logged in to subscribe.{' '}
                  <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium underline">
                    Sign in
                  </Link>
                  {' '}or{' '}
                  <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium underline">
                    create an account
                  </Link>
                </p>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
