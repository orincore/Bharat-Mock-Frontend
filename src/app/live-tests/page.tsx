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

async function fetchInitialData() {
  try {
    const [examsRes, categoriesRes, bannersRes] = await Promise.all([
      fetch(`${API_BASE}/exams?exam_type=all&limit=100`, { cache: 'no-store' }),
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
  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Live Tests',
    url: 'https://bharatmock.com/live-tests',
    description:
      'BharatMock Live Test offers real exam-like mock tests, performance analysis, and smart practice for SSC, Banking, Railway, police, & other competitive exams.',
    publisher: {
      '@type': 'Organization',
      name: 'BharatMock',
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://bharatmock.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Live Tests',
        item: 'https://bharatmock.com/live-tests',
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Can I retake a Live Test after it has ended?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, you can attempt Live Tests again in practice mode after the live window closes. This enables you to rework and compare your two attempts and measure progress over time.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the difference between a Live Test and a Normal Mock Test?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "You can take a regular mock test at your own pace anytime. A Live Test is scheduled, has real-time competition with other aspirants and a live leaderboard that keeps updating as you attempt. It's the real exam-day adrenaline that a solo mock simply can't give you.",
        },
      },
      {
        '@type': 'Question',
        name: 'What exams are covered under Bharat Mock Live Tests?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our mock tests are available for SSC, Banking, Railways, UPSC, State PSC, CTET, Defence, Insurance and many more exams.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are Live Tests available in Hindi and English both?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. The Live Tests are bilingual so that students from all the regions of India can attempt the tests easily in their own preferred language.',
        },
      },
      {
        '@type': 'Question',
        name: 'What if I miss a scheduled Live Test?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Certain tests may be re-attempted at a later date. But you will not be included in the live leaderboard. It is best to take the test during the live window for a competitive experience.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do live tests follow the real exam pattern?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, Live tests are based on the exam format, so you can get an experience of the actual exam.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I stop a live test once it starts?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, you can pause or exit a live test, but the timer continues running. It is advised to complete the test in one sitting for accurate results.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I give paid Live Tests on both mobile and laptop?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, your plan works on all devices. Just log in with your account to take tests anywhere.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is it possible to share my Bharat Mock account after purchasing a plan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Accounts are not shareable. If you share your account, you may be blocked from accessing your account.',
        },
      },
      {
        '@type': 'Question',
        name: 'How to buy a paid Live Test plan on Bharat Mock?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sign in to your account, go to the Plans or Subscription page, choose your plan and pay the amount. You can access your account immediately with a successful payment.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is it possible to upgrade my plan later?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, you can upgrade anytime. It will be calculated based on your plan and validity.',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <LiveTestsClient initialData={initialData} initialBanner={initialBanner} />
      <LiveTestsFAQ />
    </>
  );
}
