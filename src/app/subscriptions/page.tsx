import type { Metadata } from 'next';
import SubscriptionsClient from './SubscriptionsClient';
import type { SubscriptionPlan } from '@/lib/api/subscriptionService';
import type { SubscriptionPageContent } from '@/lib/api/subscriptionPageService';
import type { Category } from '@/lib/api/taxonomyService';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Premium Subscriptions — Unlimited Mock Tests & Analytics | BharatMock',
  description: 'Unlock BharatMock Premium to access unlimited mock tests, in-depth performance analytics, expert-crafted study plans, and live exam simulations. Choose a plan and start preparing smarter.',
  alternates: {
    canonical: 'https://bharatmock.com/subscriptions',
  },
  openGraph: {
    title: 'BharatMock Premium Subscriptions',
    description: 'Unlimited mock tests, analytics, and live exam simulations for all government exams.',
    url: 'https://bharatmock.com/subscriptions',
    type: 'website',
    siteName: 'BharatMock',
    images: [{ url: '/assets/login_banner_image.jpg', width: 1200, height: 630, alt: 'BharatMock Premium' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BharatMock Premium Subscriptions',
    description: 'Unlimited mock tests, analytics, and live exam simulations for all government exams.',
    images: ['/assets/login_banner_image.jpg'],
    site: '@BharatMock',
  },
};

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

async function fetchServerData(): Promise<{
  plans: SubscriptionPlan[];
  content: SubscriptionPageContent | null;
  categories: Category[];
}> {
  try {
    const [plansRes, contentRes, categoriesRes] = await Promise.all([
      fetch(`${API_BASE}/subscriptions/plans`, { cache: 'no-store' }),
      fetch(`${API_BASE}/subscription-page`, { cache: 'no-store' }),
      fetch(`${API_BASE}/taxonomy/categories`, { cache: 'no-store' }),
    ]);

    const [plansData, contentData, categoriesData] = await Promise.all([
      plansRes.ok ? plansRes.json() : { data: [] },
      contentRes.ok ? contentRes.json() : null,
      categoriesRes.ok ? categoriesRes.json() : { data: [] },
    ]);

    const plans: SubscriptionPlan[] = Array.isArray(plansData?.data)
      ? plansData.data.filter((p: SubscriptionPlan) => p.is_active !== false)
      : [];

    const content: SubscriptionPageContent | null = contentData ?? null;

    const rawCategories: Category[] = Array.isArray(categoriesData?.data) ? categoriesData.data : [];
    const categories = rawCategories
      .filter((c) => c.is_active !== false)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    return { plans, content, categories };
  } catch {
    return { plans: [], content: null, categories: [] };
  }
}

export default async function SubscriptionsPage() {
  const { plans, content, categories } = await fetchServerData();

  return (
    <SubscriptionsClient
      initialPlans={plans}
      initialContent={content}
      initialCategories={categories}
    />
  );
}
