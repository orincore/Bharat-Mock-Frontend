import type { Metadata } from 'next';
import LiveTestsClient from './LiveTestsClient';
import { LiveTestsFAQ } from './LiveTestsFAQ';
import type { Exam } from '@/types';
import type { Category } from '@/lib/api/taxonomyService';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Practice, Analyze, and Improve with Live Tests for Govt Exams",
  description: "Take live mock tests for government exams and experience a real live exam environment while getting detailed insights to track progress, and improve accuracy.",
  keywords: "live test, live exam, live mock test, online live quiz, ssc live test",
  alternates: {
    canonical: "https://bharatmock.com/live-tests",
  },
  openGraph: {
    title: "Free Live Mock Tests 2026",
    description: "Attempt scheduled live mock tests with real-time leaderboards for 100+ government exams. Join the competition.",
    url: "https://bharatmock.com/live-tests",
    type: "website",
    siteName: "BharatMock",
    images: [{ url: "/assets/login_banner_image.jpg", width: 1200, height: 630, alt: "BharatMock Live Tests" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Live Mock Tests 2026",
    description: "Scheduled live mock tests with real-time leaderboards for SSC, Banking, Railway & Police exams.",
    images: ["/assets/login_banner_image.jpg"],
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : '';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bharatmock.com';

async function fetchInitialData() {
  try {
    const [examsRes, categoriesRes, bannersRes] = await Promise.all([
      fetch(`${API_BASE}/exams?status=upcoming&exam_type=all&limit=100`, { cache: 'no-store' }),
      fetch(`${API_BASE}/taxonomy/categories`, { cache: 'no-store' }),
      fetch(`${API_BASE}/page-banners/live_tests_hero`, { cache: 'no-store' }),
    ]);

    const [examsData, categoriesData, bannersData] = await Promise.all([
      examsRes.ok ? examsRes.json() : { data: [] },
      categoriesRes.ok ? categoriesRes.json() : { data: [] },
      bannersRes.ok ? bannersRes.json() : undefined,  // undefined = failed → client will fetch
    ]);

    const rawExams: Exam[] = Array.isArray(examsData?.data) ? examsData.data : [];
    const exams = rawExams.filter((exam) => !exam.allow_anytime && exam.status !== 'anytime');

    const rawCategories: Category[] = Array.isArray(categoriesData?.data) ? categoriesData.data : [];
    const categories = rawCategories
      .filter((c) => c.is_active !== false)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    // null = server says no banner; undefined = fetch failed → client will try
    let initialBanner: import('@/lib/api/pageBannersService').PageBanner | null | undefined = undefined;
    if (bannersData !== undefined) {
      const banners = Array.isArray(bannersData) ? bannersData : (bannersData?.data ?? []);
      initialBanner = banners.find((b: any) => b.is_active) || banners[0] || null;
    }

    return { exams, categories, initialBanner };
  } catch {
    return { exams: [], categories: [], initialBanner: undefined };
  }
}

export default async function LiveTestsPage() {
  const { exams, categories, initialBanner } = await fetchInitialData();
  const initialData = { exams, categories };

  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Live Tests - Bharat Mock',
    description: 'Join live mock tests with real-time competition and live leaderboards. SSC, Banking, Railways, UPSC and more.',
    url: `${SITE_URL}/live-tests`,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Live Tests',
          item: `${SITE_URL}/live-tests`,
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LiveTestsClient initialData={initialData} initialBanner={initialBanner} />
      <LiveTestsFAQ />
    </>
  );
}
