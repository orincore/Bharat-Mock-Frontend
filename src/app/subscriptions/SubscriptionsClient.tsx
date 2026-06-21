"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Crown, CheckCircle2, Shield, Loader2, Sparkles, Star, Users, TrendingUp, Award, BookOpen, Target, ChevronDown, ChevronUp, ExternalLink, GraduationCap, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { subscriptionService, SubscriptionPlan } from '@/lib/api/subscriptionService';
import { SubscriptionPageContent } from '@/lib/api/subscriptionPageService';
import { Category } from '@/lib/api/taxonomyService';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { FEATURED_PARTNERS } from '@/lib/constants/featuredPartners';

interface SubscriptionsClientProps {
  initialPlans: SubscriptionPlan[];
  initialContent: SubscriptionPageContent | null;
  initialCategories: Category[];
}

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

const whyChooseFeatures = [
  {
    icon: TrendingUp,
    title: 'Scheduled live exams',
    description: 'Live competitive exams with instant rankings and results'
  },
  {
    icon: BookOpen,
    title: 'Previous year papers',
    description: 'Practice real previous year question papers in actual exam format'
  },
  {
    icon: Target,
    title: 'Daily current affairs',
    description: 'Daily important news updates for government exam preparation'
  },
  {
    icon: GraduationCap,
    title: 'Chapter-wise practice',
    description: 'Practice weak subjects section by section with detailed questions'
  }
];

const STATIC_FAQS = [
  {
    id: 'faq-1',
    title: 'Q1. What is the difference between Free, Super, and Premium plans?',
    content: 'Free offers limited tests and current affairs. Super unlocks unlimited mocks, papers, and live exams. Premium includes everything plus AIR, leaderboards, bilingual tests, and priority support.',
  },
  {
    id: 'faq-2',
    title: 'Q2. How do I upgrade from Free to a paid plan?',
    content: 'Click on "Get Started" or "Get Premium" for your preferred plan. Complete the secure payment process, and your account will be upgraded instantly after successful payment.',
  },
  {
    id: 'faq-3',
    title: 'Q3. When does my subscription start?',
    content: 'Your subscription starts immediately after successful payment. The validity period begins from the purchase date itself.',
  },
  {
    id: 'faq-4',
    title: 'Q4. Can I upgrade from Super to Premium anytime?',
    content: 'Yes, you can upgrade anytime during your active subscription. Your remaining Super plan validity will be adjusted during the upgrade process.',
  },
  {
    id: 'faq-5',
    title: 'Q5. What payment methods are accepted?',
    content: 'You can pay using UPI apps like GPay, PhonePe, and Paytm, along with debit cards, credit cards, and net banking from major Indian banks.',
  },
  {
    id: 'faq-7',
    title: 'Q7. Will my subscription renew automatically?',
    content: 'No, subscriptions do not auto-renew. Once your plan expires, your account automatically shifts back to the Free plan.',
  },
  {
    id: 'faq-8',
    title: 'Q8. Can I share my subscription with others?',
    content: 'No, each subscription is valid for one user only. Sharing accounts or simultaneous multiple-device access may lead to account restrictions.',
  },
];

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

export default function SubscriptionsClient({ initialPlans, initialContent, initialCategories }: SubscriptionsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading, refreshProfile } = useAuth();

  const [plans, setPlans] = useState<SubscriptionPlan[]>(initialPlans);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => {
    if (!initialPlans.length) return null;
    return initialPlans[0]?.id ?? null;
  });
  const [promoCode, setPromoCode] = useState('');
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [error, setError] = useState('');
  const [discountedAmount, setDiscountedAmount] = useState<number | null>(null);
  const [promoStatus, setPromoStatus] = useState<'idle' | 'applied' | 'invalid'>('idle');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoValidationLoading, setPromoValidationLoading] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [showPromoField, setShowPromoField] = useState(false);
  const [pageContent, setPageContent] = useState<SubscriptionPageContent | null>(initialContent);
  const [loadingContent, setLoadingContent] = useState(false);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const activeCategories = useMemo(() => categories, [categories]);


  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );
  const currentPlanId = user?.subscription_plan_id ?? null;
  const isCurrentPlanSelected = Boolean(currentPlanId && selectedPlanId === currentPlanId);

  useEffect(() => {
    // Update selected plan when user's current plan is known (after auth loads)
    if (plans.length > 0 && currentPlanId) {
      const defaultPlan = plans.find((plan) => plan.id !== currentPlanId) ?? plans[0];
      setSelectedPlanId(defaultPlan?.id ?? null);
    }
  }, [currentPlanId, plans]);

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
    // Reset discount when plan changes
    setDiscountedAmount(null);
    setPromoStatus(promoCode ? 'idle' : 'idle');
    setPromoMessage(promoCode ? 'Tap “Apply” to validate this code.' : '');
  }, [selectedPlanId]);

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
        promo_code: promoCode.trim()
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
  }, [promoCode, selectedPlanId, toast]);

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
      const returnTo = typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : '/subscriptions';
      router.push(`/login?next=${encodeURIComponent(returnTo)}`);
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
        promo_code: promoCode.trim() || undefined
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
            setCheckoutDialogOpen(false);
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

      setCheckoutDialogOpen(false);
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
  }, [isAuthenticated, promoCode, router, selectedPlan, selectedPlanId, toast, user]);

  const openCheckoutForPlan = useCallback((planId: string) => {
    setSelectedPlanId(planId);
    setPromoCode('');
    setPromoStatus('idle');
    setPromoMessage('');
    setDiscountedAmount(null);
    setShowPromoField(false);
    setCheckoutDialogOpen(true);
  }, []);

  const displayAmount = discountedAmount ?? (selectedPlan ? selectedPlan.price_cents : 0);

  const getEffectivePrice = (plan: SubscriptionPlan) => {
    return plan.sale_price_cents ?? plan.price_cents;
  };

  const hasDiscount = (plan: SubscriptionPlan) => {
    return plan.sale_price_cents !== null &&
      plan.sale_price_cents !== undefined &&
      plan.sale_price_cents < plan.normal_price_cents;
  };

  const getStaticFeaturesForPlan = (plan: SubscriptionPlan): string[] => {
    const slug = (plan.slug || plan.name || '').toLowerCase();
    if (slug.includes('free') || slug.includes('basic')) {
      return [
        'No Live Test',
        'Limited Mock Test',
        'Limited Previous Year Papers',
        'Limited Current Affairs & Quizzes',
      ];
    }
    if (slug.includes('super') || slug.includes('elite') || slug.includes('gold')) {
      return [
        'Unlimited Live Tests',
        'Unlimited Mock tests',
        'Unlimited Previous Year Papers',
        'Unlimited Current Affairs & Quizzes',
        'Priority Support & Huge Discount',
      ];
    }
    return [
      'Unlimited Live Tests',
      'Unlimited Mock tests',
      'Unlimited Previous Year Papers',
      'Unlimited Current Affairs & Quizzes',
    ];
  };
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [expandedCurriculum, setExpandedCurriculum] = useState<string | null>(null);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bharatmock.com';

  const perks = [
    'Unlimited access to premium mock tests',
    'Personalized performance analytics',
    'Priority support and early content drops',
    'Detailed answer explanations and review mode'
  ];

  const heroSection = pageContent?.sections.find(s => s.section_type === 'hero');
  const featuredSection = pageContent?.sections.find(s => s.section_type === 'featured');
  const categoriesSection = pageContent?.sections.find(s => s.section_type === 'categories');
  const curriculumSection = pageContent?.sections.find(s => s.section_type === 'curriculum');
  const curriculumBannersSection = pageContent?.sections.find(s => s.section_type === 'curriculum_banners');
  const bannersSection = pageContent?.sections.find(s => s.section_type === 'banners');
  const whyUsSection = pageContent?.sections.find(s => s.section_type === 'why_us');
  const faqSection = pageContent?.sections.find(s => s.section_type === 'faq');

  // Fall back to the bundled hero illustration when the CMS has no hero image set.
  const DEFAULT_HERO_IMAGE = '/assets/bharatmock-subscription.webp';
  const heroImageUrl = (heroSection?.settings?.hero_image_url as string | undefined) || DEFAULT_HERO_IMAGE;
  const heroImageAlt = heroSection?.settings?.hero_image_alt as string | undefined;

  const metaTitle = pageContent?.meta?.meta_title || 'Bharat Mock Premium Subscriptions | Unlimited Mock Tests & Analytics';
  const metaDescription = pageContent?.meta?.meta_description || 'Unlock Bharat Mock Premium to access unlimited mock tests, in-depth performance analytics, expert-crafted study plans, and live exam simulations.';
  const metaKeywords = pageContent?.meta?.meta_keywords || 'bharat mock, premium subscriptions, mock tests, exam prep, analytics';
  const canonicalUrl = pageContent?.meta?.canonical_url || `${siteUrl}/subscriptions`;
  const ogTitle = pageContent?.meta?.og_title || metaTitle;
  const ogDescription = pageContent?.meta?.og_description || metaDescription;
  const ogImage = pageContent?.meta?.og_image || `${siteUrl}/images/subscriptions-social-card.jpg`;

  const primaryPlan = useMemo(() => plans[0], [plans]);
  const productStructuredData = useMemo(() => {
    const offers = primaryPlan
      ? {
        '@type': 'Offer',
        priceCurrency: primaryPlan.currency_code || 'INR',
        price: ((primaryPlan.sale_price_cents ?? primaryPlan.normal_price_cents) || 0) / 100,
        availability: 'https://schema.org/InStock',
        url: canonicalUrl,
      }
      : undefined;

    return JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: metaTitle,
        description: metaDescription,
        brand: {
          '@type': 'Brand',
          name: 'Bharat Mock',
        },
        image: ogImage,
        offers,
        url: canonicalUrl,
      },
      null,
      2
    );
  }, [canonicalUrl, metaDescription, metaTitle, ogImage, primaryPlan]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white py-6 md:py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="w-full max-w-6xl mx-auto px-4 relative z-10">
          <Breadcrumbs
            items={[
              HomeBreadcrumb(),
              { label: 'Subscriptions' }
            ]}
            variant="dark"
            className="mb-4 md:mb-8"
          />
          <div className="grid gap-6 lg:gap-10 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1 text-center lg:text-left space-y-3 md:space-y-6 max-w-3xl mx-auto">
              {heroSection?.settings?.show_badge && (
                <Badge className="bg-white/25 text-white border-white/30 text-sm px-4 py-1 inline-flex w-auto">
                  {heroSection.settings.badge_text || heroSection.subtitle || 'Premium Learning'}
                </Badge>
              )}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight break-words">
                {heroSection?.title || 'Level up with Bharat Mock Premium'}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-blue-100 leading-relaxed">
                {heroSection?.description || 'Unlock advanced analytics, unlimited practice tests, and exclusive exam resources curated by experts. Pick a plan and start preparing smarter today.'}
              </p>
            </div>
            {heroImageUrl && (
              <div className="order-1 lg:order-2 relative w-full max-w-2xl lg:ml-auto">
                <div className="absolute inset-0 rounded-3xl bg-white/10 blur-3xl"></div>
                <div className="relative rounded-3xl border border-white/20 bg-white/10 shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImageUrl}
                    alt={heroImageAlt || heroSection?.title || 'Bharat Mock premium illustration'}
                    className="w-full rounded-3xl object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-4 py-4 md:py-12 space-y-6 md:space-y-12">

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {featuredSection && featuredSection.blocks && featuredSection.blocks.length > 0 && (
          <section className="py-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                {featuredSection.title || 'Featured Benefits'}
              </h2>
              {featuredSection.subtitle && (
                <p className="text-gray-600 text-lg max-w-3xl mx-auto">{featuredSection.subtitle}</p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {featuredSection.blocks.map((block) => (
                <div key={block.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mb-3">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">{block.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{block.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="py-3 md:py-8">
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="rounded-lg md:rounded-2xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-50/50 p-2 md:p-6 text-center">
              <div className="flex justify-center mb-1 md:mb-3">
                <Users className="h-4 md:h-8 w-4 md:w-8 text-blue-600" />
              </div>
              <p className="text-[10px] leading-tight md:text-sm text-gray-600 mb-0.5 md:mb-1">Active Learners</p>
              <p className="text-sm md:text-2xl font-bold text-gray-900">10,000+</p>
            </div>
            <div className="rounded-lg md:rounded-2xl border border-yellow-200/50 bg-gradient-to-br from-yellow-50 to-yellow-50/50 p-2 md:p-6 text-center">
              <div className="flex justify-center mb-1 md:mb-3">
                <Star className="h-4 md:h-8 w-4 md:w-8 text-yellow-500" />
              </div>
              <p className="text-[10px] leading-tight md:text-sm text-gray-600 mb-0.5 md:mb-1">Average Rating</p>
              <p className="text-sm md:text-2xl font-bold text-gray-900">4.8/5</p>
            </div>
            <div className="rounded-lg md:rounded-2xl border border-green-200/50 bg-gradient-to-br from-green-50 to-green-50/50 p-2 md:p-6 text-center">
              <div className="flex justify-center mb-1 md:mb-3">
                <TrendingUp className="h-4 md:h-8 w-4 md:w-8 text-green-600" />
              </div>
              <p className="text-[10px] leading-tight md:text-sm text-gray-600 mb-0.5 md:mb-1">Success Rate</p>
              <p className="text-sm md:text-2xl font-bold text-gray-900">95%</p>
            </div>
          </div>
        </section>

        {(categoriesSection || categoriesLoading || activeCategories.length > 0) && (
          <section className="py-3 md:py-6">
            <div className="text-center mb-4 md:mb-8">
              <h2 className="text-xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-3">
                {categoriesSection?.title || 'Exam Categories'}
              </h2>
              {categoriesSection?.subtitle && (
                <p className="text-gray-600 text-sm md:text-lg max-w-3xl mx-auto">{categoriesSection.subtitle}</p>
              )}
            </div>
            {categoriesLoading ? (
              <div className="grid grid-cols-2 gap-2 md:gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div key={idx} className="h-14 sm:h-20 rounded-xl md:rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : activeCategories.length === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-500 max-w-4xl mx-auto">
                No categories available yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 md:gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {activeCategories.map((category) => (
                  <div
                    key={category.id}
                    className="border border-gray-200/80 rounded-xl md:rounded-2xl px-2 sm:px-4 py-1.5 sm:py-3 bg-white flex items-center gap-1.5 sm:gap-3 min-h-[3.25rem] sm:h-20"
                  >
                    {category.logo_url ? (
                      <div className="w-6 h-6 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={category.logo_url} alt={category.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[11px] leading-tight sm:text-sm text-gray-900 truncate sm:whitespace-normal sm:line-clamp-2">{category.name}</p>
                      {category.description && <p className="hidden sm:block text-[10px] sm:text-xs text-gray-500 line-clamp-1">{category.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="text-center space-y-1 md:space-y-3">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Choose Your Plan</h2>
          <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your exam preparation journey.
          </p>
        </section>

        <div className="grid gap-4 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* ── Hardcoded Free plan ── */}
          <Card className="relative border-2 border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-2xl flex items-center gap-2">
                  Free
                  {!user?.is_premium && isAuthenticated && (
                    <Badge variant="outline" className="text-xs border-green-200 bg-green-50 text-green-700">
                      Active
                    </Badge>
                  )}
                </CardTitle>
              </div>
              <CardDescription className="text-base">Get started at no cost</CardDescription>
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900">₹0</span>
                  <span className="text-gray-500">/ forever</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-6">
              {['No Live Test', 'Limited Mock Test', 'Limited Previous Year Papers', 'Limited Current Affairs & Quizzes'].map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">{feature}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter className="pt-0">
              {isAuthenticated ? (
                <Button className="w-full h-12 text-base font-semibold" variant="outline" disabled>
                  <Award className="h-5 w-5 mr-2" />
                  {!user?.is_premium ? 'Current Plan' : 'Free Plan'}
                </Button>
              ) : (
                <Link
                  href={`/register?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/subscriptions')}`}
                  className="w-full"
                >
                  <Button className="w-full h-12 text-base font-semibold" variant="outline">
                    Start Trial Free
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>

          {/* ── API plans ── */}
          {loadingPlans ? (
            Array.from({ length: 2 }).map((_, idx) => (
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
          ) : plans.length === 0 ? null : (
            plans.map((plan) => {
              const isSelected = plan.id === selectedPlanId;
              const isCurrentPlan = plan.id === currentPlanId && Boolean(user?.is_premium);
              const isPro = plan.slug?.toLowerCase().includes('pro');
              return (
                <Card
                  key={plan.id}
                  className={`relative border-2 transition-all hover:shadow-xl ${isSelected ? 'border-blue-500 shadow-xl shadow-blue-500/20 scale-105' : 'border-gray-200'
                    } ${isCurrentPlan ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${isPro ? 'ring-2 ring-blue-400 ring-offset-2' : ''
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
                    openCheckoutForPlan(plan.id);
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
                      <div className="flex flex-col gap-2">
                        {hasDiscount(plan) ? (
                          <>
                            <div className="flex items-baseline gap-3">
                              <span className="text-2xl font-semibold text-gray-400 line-through">
                                {formatCurrency(plan.normal_price_cents, plan.currency_code)}
                              </span>
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                Save {Math.round(((plan.normal_price_cents - (plan.sale_price_cents ?? 0)) / plan.normal_price_cents) * 100)}%
                              </Badge>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-bold text-green-600">
                                {formatCurrency(plan.sale_price_cents ?? 0, plan.currency_code)}
                              </span>
                              <span className="text-gray-500">/ {plan.duration_days} days</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-gray-900">
                              {formatCurrency(plan.normal_price_cents, plan.currency_code)}
                            </span>
                            <span className="text-gray-500">/ {plan.duration_days} days</span>
                          </div>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          {(getEffectivePrice(plan) / plan.duration_days / 100).toFixed(2)} per day
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-6">
                    {(plan.features && plan.features.length > 0 ? plan.features : getStaticFeaturesForPlan(plan)).map((feature) => (
                      <div key={`${plan.id}-${feature}`} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button
                      className={`w-full h-12 text-base font-semibold ${isSelected
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                        : ''
                        }`}
                      variant={isSelected ? 'default' : 'outline'}
                      disabled={isCurrentPlan}
                      size="lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCurrentPlan) return;
                        openCheckoutForPlan(plan.id);
                      }}
                    >
                      {isCurrentPlan ? (
                        <>
                          <Award className="h-5 w-5 mr-2" />
                          Current Plan
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

        <Dialog
          open={checkoutDialogOpen}
          onOpenChange={(open) => {
            if (!processingCheckout) setCheckoutDialogOpen(open);
          }}
        >
          <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
            <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-br from-blue-50 to-indigo-50 text-left">
              <DialogTitle className="text-xl">Complete Your Purchase</DialogTitle>
              <DialogDescription>
                {selectedPlan ? `${selectedPlan.name} · ${selectedPlan.duration_days} days` : 'Review your plan'}
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-5 space-y-5">
              {/* Price */}
              <div className="flex items-end justify-between">
                <div>
                  {selectedPlan && hasDiscount(selectedPlan) && (
                    <span className="text-sm text-gray-400 line-through mr-2">
                      {formatCurrency(selectedPlan.normal_price_cents, selectedPlan.currency_code)}
                    </span>
                  )}
                  <span className="text-3xl font-bold text-gray-900">
                    {selectedPlan ? formatCurrency(displayAmount, selectedPlan.currency_code) : '—'}
                  </span>
                </div>
                {selectedPlan && hasDiscount(selectedPlan) && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Save {Math.round(((selectedPlan.normal_price_cents - (selectedPlan.sale_price_cents ?? 0)) / selectedPlan.normal_price_cents) * 100)}%
                  </Badge>
                )}
              </div>

              {/* Promo code (collapsible) */}
              {!showPromoField ? (
                <button
                  type="button"
                  onClick={() => setShowPromoField(true)}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Tag className="h-4 w-4" />
                  Have a promo code?
                </button>
              ) : (
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" /> Promo code
                  </Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Enter code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      disabled={processingCheckout || promoValidationLoading}
                      className="h-10"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyPromo}
                      disabled={processingCheckout || promoValidationLoading || !promoCode.trim()}
                      className="h-10 px-4"
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
              )}

              {/* Total */}
              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-blue-600">
                  {selectedPlan ? formatCurrency(displayAmount, selectedPlan.currency_code) : '—'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield className="h-4 w-4 text-blue-600 flex-shrink-0" />
                Secure payment via Razorpay · cards, UPI &amp; net banking
              </div>

              <Button
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
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
                  <Link href={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="text-blue-600 hover:text-blue-700 font-medium underline">
                    Sign in
                  </Link>
                  {' '}or{' '}
                  <Link href={`/register?next=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="text-blue-600 hover:text-blue-700 font-medium underline">
                    create an account
                  </Link>
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {curriculumSection && curriculumSection.blocks && curriculumSection.blocks.length > 0 && (
          <section className="py-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                {curriculumSection.title || 'Course Curriculum'}
              </h2>
              {curriculumSection.subtitle && (
                <p className="text-gray-600 text-lg max-w-3xl mx-auto">{curriculumSection.subtitle}</p>
              )}
            </div>
            <div className="max-w-4xl mx-auto space-y-3">
              {curriculumSection.blocks.map((block) => {
                const isOpen = expandedCurriculum === block.id;
                return (
                  <div key={block.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setExpandedCurriculum(isOpen ? null : block.id)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-left">{block.title}</h3>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    {/* Content always in DOM for crawlers; visibility via max-height */}
                    <div
                      className="bg-gray-50 border-t border-gray-200 overflow-hidden transition-[max-height] duration-300 ease-in-out"
                      style={{ maxHeight: isOpen ? '1000px' : '0px' }}
                      aria-hidden={!isOpen}
                    >
                      {block.content && (
                        <p className="px-5 py-4 text-sm text-gray-700 leading-relaxed">{block.content}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {curriculumBannersSection?.blocks && curriculumBannersSection.blocks.length > 0 && (
          <section className="py-4">
            {curriculumBannersSection.blocks.length === 1 && (
              <div className="text-center text-sm text-muted-foreground mb-4">
                Featuring spotlight banner
              </div>
            )}
            {curriculumBannersSection.title && (
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{curriculumBannersSection.title}</h3>
                {curriculumBannersSection.subtitle && (
                  <p className="text-gray-600 mt-2 max-w-3xl mx-auto">{curriculumBannersSection.subtitle}</p>
                )}
              </div>
            )}
            <div className="space-y-4">
              {curriculumBannersSection.blocks.map((block, idx) => {
                const isSingle = curriculumBannersSection.blocks?.length === 1;
                const containerClasses = isSingle
                  ? 'relative w-full max-w-5xl mx-auto overflow-hidden rounded-3xl border border-gray-200 bg-gray-900/5'
                  : 'relative w-full overflow-hidden rounded-3xl border border-gray-200 bg-gray-900/5';
                const imageClasses = isSingle
                  ? 'w-full h-auto max-h-[640px] object-contain mx-auto'
                  : 'w-full h-auto max-h-[420px] object-contain mx-auto';
                return (
                  <div key={block.id} className={containerClasses}>
                    {block.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={block.image_url}
                        alt={block.title || `Curriculum banner ${idx + 1}`}
                        className={imageClasses}
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-[240px] md:h-[320px] w-full bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                    )}
                    {(block.title || block.content || block.link_url) && (
                      <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/70 via-black/30 to-transparent text-white">
                        {block.title && <h4 className="text-2xl font-semibold mb-2">{block.title}</h4>}
                        {block.content && <p className="text-sm md:text-base text-white/90 mb-3 max-w-4xl">{block.content}</p>}
                        {block.link_url && (
                          <a
                            href={block.link_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 bg-white/90 text-gray-900 px-4 py-2 rounded-full font-semibold hover:bg-white"
                          >
                            {block.link_text || 'Explore more'}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {bannersSection && bannersSection.blocks && bannersSection.blocks.length > 0 && (
          <section className="py-6">
            <div className="grid gap-6 md:grid-cols-2">
              {bannersSection.blocks.map((block) => (
                <div
                  key={block.id}
                  className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow"
                  style={{
                    backgroundImage: block.image_url ? `url(${block.image_url})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-white mb-3">{block.title}</h3>
                    {block.content && <p className="text-blue-100 mb-4 leading-relaxed">{block.content}</p>}
                    {block.link_url && (
                      <a
                        href={block.link_url}
                        className="inline-flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                      >
                        {block.link_text || 'Learn More'}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  {!block.image_url && (
                    <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="py-10">
          <div className="w-full rounded-3xl border border-slate-200 bg-white/90 shadow-sm px-6 py-10 sm:px-10">
            <div className="flex flex-col gap-4 text-center max-w-3xl mx-auto">
              <span className="inline-flex items-center justify-center gap-2 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
                <Shield className="h-4 w-4" /> Trusted by toppers
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900">
                {whyUsSection?.title?.trim() || 'What BharatMock offers'}
              </h2>
              <p className="text-slate-600">
                {whyUsSection?.subtitle || 'Everything you need to crack government exams'}
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {whyChooseFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 text-left hover:border-primary/30 hover:bg-white transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-2 border-b border-slate-100 bg-background">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 sm:px-6 sm:py-4 overflow-hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Featured On</p>
                <h3 className="font-display text-lg font-semibold text-slate-800">Trusted by India's leading media and hiring partners</h3>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-r from-white via-slate-50 to-primary/5 px-2 py-2">
              <div className="flex gap-8 animate-featured-marquee-sub">
                {[...FEATURED_PARTNERS, ...FEATURED_PARTNERS].map((partner, index) => (
                  <div key={`${partner.name}-${index}`} className="h-16 sm:h-20 flex items-center opacity-95 hover:opacity-100 transition drop-shadow-sm">
                    <img src={partner.url} alt={partner.name} width={240} height={80} className="h-full w-auto max-w-[240px] object-contain" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <style jsx>{`
            @keyframes featured-marquee-sub {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-featured-marquee-sub {
              width: max-content;
              animation: featured-marquee-sub 25s linear infinite;
              will-change: transform;
              transform: translateZ(0);
            }
          `}</style>
        </section>

        <TestimonialsSection
          className="py-6"
          eyebrow="View Reviews"
          title="Trusted by Aspirants"
          description="Real feedback from toppers and serious contenders—curated from app reviews and our student community—to show how premium subscriptions translate into real selection stories."
        />

        {(() => {
          const faqBlocks = (faqSection?.blocks && faqSection.blocks.length > 0)
            ? faqSection.blocks
            : STATIC_FAQS;
          const faqTitle = faqSection?.title || 'Frequently Asked Questions';
          const faqSubtitle = faqSection?.subtitle || 'Everything you need to know about plans, payments, and access.';
          return (
            <section className="py-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{faqTitle}</h2>
                <p className="text-gray-600 text-lg max-w-3xl mx-auto">{faqSubtitle}</p>
              </div>
              <div className="max-w-3xl mx-auto space-y-3">
                {faqBlocks.map((block) => {
                  const isOpen = expandedFaq === block.id;
                  return (
                    <div key={block.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => setExpandedFaq(isOpen ? null : block.id)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                        aria-expanded={isOpen}
                      >
                        <h3 className="font-semibold text-gray-900 pr-4">{block.title}</h3>
                        {isOpen ? (
                          <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                      {/* Answer always in DOM for Google; visibility via max-height */}
                      <div
                        className="border-t border-gray-200 bg-gray-50 overflow-hidden transition-[max-height] duration-300 ease-in-out"
                        style={{ maxHeight: isOpen ? '1000px' : '0px' }}
                        aria-hidden={!isOpen}
                      >
                        {block.content && (
                          <p className="px-5 py-4 text-sm text-slate-700 leading-relaxed">{block.content}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

      </div>
    </div>
  );
}
