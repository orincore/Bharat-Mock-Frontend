import type { Metadata } from 'next';
import LiveTestsClient from './LiveTestsClient';
import ServerLiveTests from './ServerLiveTests';
import { LiveTestsFAQ } from './LiveTestsFAQ';
import type { Exam } from '@/types';
import type { Category } from '@/lib/api/taxonomyService';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Free Live Mock Tests 2026 — SSC, Banking, Railway & Police | BharatMock",
  description: "Attempt scheduled live mock tests with real-time leaderboards for SSC CGL, IBPS PO, RRB NTPC, UP Police and 100+ government exams. Join thousands of aspirants competing live.",
  keywords: "live mock test, live test SSC, live test banking, online live exam, real-time mock test",
  alternates: {
    canonical: "https://bharatmock.com/live-tests",
  },
  openGraph: {
    title: "Free Live Mock Tests 2026 | BharatMock",
    description: "Attempt scheduled live mock tests with real-time leaderboards for 100+ government exams. Join the competition.",
    url: "https://bharatmock.com/live-tests",
    type: "website",
    siteName: "BharatMock",
    images: [{ url: "/assets/login_banner_image.jpg", width: 1200, height: 630, alt: "BharatMock Live Tests" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Live Mock Tests 2026 | BharatMock",
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
    const [examsRes, categoriesRes] = await Promise.all([
      fetch(`${API_BASE}/exams?status=upcoming&exam_type=all&limit=100`, {
        cache: 'no-store',
      }),
      fetch(`${API_BASE}/taxonomy/categories`, {
        cache: 'no-store',
      }),
    ]);

    const [examsData, categoriesData] = await Promise.all([
      examsRes.ok ? examsRes.json() : { data: [] },
      categoriesRes.ok ? categoriesRes.json() : { data: [] },
    ]);

    const rawExams: Exam[] = Array.isArray(examsData?.data) ? examsData.data : [];
    // Keep only scheduled (windowed) exams — exclude anytime/open exams
    const exams = rawExams.filter((exam) => !exam.allow_anytime && exam.status !== 'anytime');

    const rawCategories: Category[] = Array.isArray(categoriesData?.data)
      ? categoriesData.data
      : [];
    const categories = rawCategories
      .filter((c) => c.is_active !== false)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    return { exams, categories };
  } catch {
    return { exams: [], categories: [] };
  }
}

export default async function LiveTestsPage() {
  const initialData = await fetchInitialData();

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
      <ServerLiveTests
        exams={initialData.exams}
        categories={initialData.categories}
      />
      <LiveTestsClient initialData={initialData} />
      <LiveTestsFAQ />
    </>
  );
}
