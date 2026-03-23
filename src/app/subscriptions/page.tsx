
"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { Crown, CheckCircle2, Shield, Loader2, Sparkles, Star, Users, TrendingUp, Award, BookOpen, Target, Zap, Trophy, ChevronDown, ChevronUp, ExternalLink, GraduationCap, BarChart3, Clock, MessageSquare } from 'lucide-react';
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
import { taxonomyService, Category } from '@/lib/api/taxonomyService';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const FEATURED_PARTNERS = [
  { name: 'Aaj Tak', url: 'https://logowik.com/content/uploads/images/aaj-tak1841.jpg' },
  { name: 'The Times of India', url: 'https://twoheadmarketing.wordpress.com/wp-content/uploads/2020/07/1546517908_1bhj7d_time-of-india.jpg' },
  { name: 'NDTV', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/NDTV_logo.svg/2560px-NDTV_logo.svg.png' },
  { name: 'Hindustan Times', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Hindustan_Times_logo.svg/2560px-Hindustan_Times_logo.svg.png' },
  { name: 'India Today', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/India_Today_logo.svg/2560px-India_Today_logo.svg.png' },
  { name: 'Zee News', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Zee_News_logo.svg/2560px-Zee_News_logo.svg.png' },
];

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
    icon: BookOpen,
    title: 'Guided Learning',
    description: 'Through Better Prepared Mock Tests and Qualified Professors Insights'
  },
  {
    icon: Target,
    title: 'Free Mock Tests',
    description: 'Your Expert Learning Guides to the Best Exam and Content Based Material with Test Quality Mix'
  },
  {
    icon: Users,
    title: 'Faculty Members',
    description: 'We have Team of Highly Experienced and Exam and More Certified Professors to Guides for Best Career'
  },
  {
    icon: Award,
    title: 'Expert Designed Prep',
    description: 'Study plans curated by exam experts so every mock, note, and quiz follows the actual syllabus pattern'
  }
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const activeCategories = useMemo(() => categories, [categories]);


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
        const [plansData, contentData, categoriesData] = await Promise.all([
          subscriptionService.getPlans(),
          subscriptionPageService.getPageContent(),
          taxonomyService.getCategories()
        ]);
        setPlans(plansData);
        setPageContent(contentData);
        const normalizedCategories = (categoriesData || [])
          .filter((cat) => cat.is_active !== false)
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
        setCategories(normalizedCategories);
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
        setCategoriesLoading(false);
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
  
  const getEffectivePrice = (plan: SubscriptionPlan) => {
    return plan.sale_price_cents ?? plan.price_cents;
  };
  
  const hasDiscount = (plan: SubscriptionPlan) => {
    return plan.sale_price_cents !== null && 
           plan.sale_price_cents !== undefined && 
           plan.sale_price_cents < plan.normal_price_cents;
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

  const heroImageUrl = heroSection?.settings?.hero_image_url as string | undefined;
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Head>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={metaKeywords} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={canonicalUrl} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:site" content="@BharatMock" />

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productStructuredData }} />
      </Head>

      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="w-full max-w-6xl mx-auto px-4 relative z-10">
          <Breadcrumbs 
            items={[
              HomeBreadcrumb(),
              { label: 'Subscriptions' }
            ]}
            variant="dark"
            className="mb-8"
          />
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="text-center lg:text-left space-y-6 max-w-3xl mx-auto">
              {heroSection?.settings?.show_badge && (
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-sm px-4 py-1 inline-flex w-auto">
                  {heroSection.settings.badge_text || heroSection.subtitle || 'Premium Learning'}
                </Badge>
              )}
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                {heroSection?.title || 'Level up with Bharat Mock Premium'}
              </h1>
              <p className="text-xl text-blue-100 leading-relaxed">
                {heroSection?.description || 'Unlock advanced analytics, unlimited practice tests, and exclusive exam resources curated by experts. Pick a plan and start preparing smarter today.'}
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 pt-4">
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
            {heroImageUrl && (
              <div className="relative w-full max-w-2xl lg:ml-auto">
                <div className="absolute inset-0 rounded-3xl bg-white/10 blur-3xl"></div>
                <div className="relative rounded-3xl border border-white/20 bg-white/5 shadow-2xl backdrop-blur">
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

      <div className="w-full max-w-6xl mx-auto px-4 py-12 space-y-12">

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

        {(categoriesSection || categoriesLoading || activeCategories.length > 0) && (
          <section className="py-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                {categoriesSection.title || 'Exam Categories'}
              </h2>
              {categoriesSection.subtitle && (
                <p className="text-gray-600 text-lg max-w-3xl mx-auto">{categoriesSection.subtitle}</p>
              )}
            </div>
            {categoriesLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div key={idx} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : activeCategories.length === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-500 max-w-4xl mx-auto">
                No categories available yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {activeCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/${category.slug}`}
                    className="border border-gray-200/80 rounded-2xl px-4 py-3 bg-white hover:border-blue-500/60 hover:shadow-lg transition flex items-center gap-3 h-20"
                  >
                    {category.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={category.logo_url} alt={category.name} className="w-10 h-10 object-contain" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{category.name}</p>
                      {category.description && <p className="text-xs text-gray-500 line-clamp-1">{category.description}</p>}
                    </div>
                    <span className="text-blue-600 text-xs font-semibold whitespace-nowrap">Explore</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Choose Your Plan</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your exam preparation journey. All plans include premium features.
          </p>
        </section>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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

        <div className="grid gap-8 lg:grid-cols-[2fr,1fr] items-start">
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
              {curriculumSection.blocks.map((block) => (
                <div key={block.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedCurriculum(expandedCurriculum === block.id ? null : block.id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-left">{block.title}</h3>
                    </div>
                    {expandedCurriculum === block.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  {expandedCurriculum === block.id && block.content && (
                    <div className="px-5 py-4 bg-gray-50 border-t border-gray-200">
                      <p className="text-sm text-gray-700 leading-relaxed">{block.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {curriculumBannersSection && curriculumBannersSection.blocks && curriculumBannersSection.blocks.length > 0 && (
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
                const isSingle = curriculumBannersSection.blocks.length === 1;
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
                {(whyUsSection?.title && whyUsSection.title.trim().length > 0) ? whyUsSection.title : 'Why students pick '}<span className="text-primary">{(whyUsSection?.title && whyUsSection.title.trim().length > 0) ? '' : 'BharatMock'}</span>
              </h2>
              <p className="text-slate-600">
                {whyUsSection?.subtitle || 'Simple, reliable prep blocks— curated tests, instant analytics, and fast revision loops.'}
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
                    <img src={partner.url} alt={partner.name} className="h-full w-auto max-w-[240px] object-contain" loading="lazy" />
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
            }
          `}</style>
        </section>

        <TestimonialsSection
          className="py-6"
          eyebrow="Social Proof"
          title="Aspirants can't stop talking about Bharat Mock"
          description="Real feedback from toppers and serious contenders—curated from app reviews and our student community—to show how premium subscriptions translate into real selection stories."
        />

        {faqSection && faqSection.blocks && faqSection.blocks.length > 0 && (
          <section className="py-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                {faqSection.title || 'Frequently Asked Questions'}
              </h2>
              {faqSection.subtitle && (
                <p className="text-gray-600 text-lg max-w-3xl mx-auto">{faqSection.subtitle}</p>
              )}
            </div>
            <div className="max-w-3xl mx-auto space-y-3">
              {faqSection.blocks.map((block) => (
                <div key={block.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === block.id ? null : block.id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <h3 className="font-semibold text-gray-900 pr-4">{block.title}</h3>
                    {expandedFaq === block.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {expandedFaq === block.id && block.content && (
                    <div className="px-5 py-4 bg-gray-50 border-t border-gray-200">
                      <p className="text-sm text-gray-700 leading-relaxed">{block.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
