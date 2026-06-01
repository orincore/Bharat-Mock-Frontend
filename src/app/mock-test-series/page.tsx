import type { Metadata } from 'next';
import MockTestSeriesClient from './MockTestSeriesClient';
import { MockTestSeriesFAQ } from './MockTestSeriesFAQ';
import type { TestSeries } from '@/lib/api/testSeriesService';
import type { Category, Subcategory } from '@/lib/api/taxonomyService';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: "Mock Test Series with Chapter and Topic Wise Papers" },
  description: "Free online Mock Tests for SSC, Banking, Railway, Police & All Govt Exams 2026. Practice full-length, chapter-wise tests & previous year papers to boost your score.",
  keywords: "SSC mock test, bank mock test, railway mock test, police test question paper ssc test series, online mock test for ssc, bank test series, ssc mock test in hindi,  police bharti question paper online test",
  alternates: {
    canonical: "https://bharatmock.com/mock-test-series",
  },
  openGraph: {
    title: "Mock Test Series with Chapter and Topic Wise Papers",
    description: "Free online Mock Tests for SSC, Banking, Railway, Police & All Govt Exams 2026. Practice full-length, chapter-wise tests & previous year papers to boost your score.",
    url: "https://bharatmock.com/mock-test-series",
    type: "website",
    siteName: "BharatMock",
    images: [{ url: "/assets/login_banner_image.jpg", width: 1200, height: 630, alt: "BharatMock Mock Test Series" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mock Test Series with Chapter and Topic Wise Papers",
    description: "Free online Mock Tests for SSC, Banking, Railway, Police & All Govt Exams 2026. Practice full-length, chapter-wise tests & previous year papers to boost your score.",
    images: ["/assets/login_banner_image.jpg"],
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : '';

async function fetchInitialData() {
  try {
    const [seriesRes, categoriesRes, subcategoriesRes, popularRes, newSeriesRes, bannersRes, testimonialsRes] = await Promise.all([
      fetch(`${API_BASE}/test-series?page=1&limit=12&is_published=true`, { cache: 'no-store' }),
      fetch(`${API_BASE}/taxonomy/categories`, { cache: 'no-store' }),
      fetch(`${API_BASE}/taxonomy/subcategories`, { cache: 'no-store' }),
      fetch(`${API_BASE}/page-popular-tests/exam_page`, { cache: 'no-store' }),
      fetch(`${API_BASE}/page-popular-tests/new_test_series`, { cache: 'no-store' }),
      fetch(`${API_BASE}/page-banners/exam_page`, { cache: 'no-store' }),
      fetch(`${API_BASE}/testimonials?limit=20`, { cache: 'no-store' }),
    ]);

    const [seriesData, categoriesData, subcategoriesData, popularData, newSeriesData, bannersData, testimonialsData] = await Promise.all([
      seriesRes.ok ? seriesRes.json() : { data: [], total: 0, totalPages: 0 },
      categoriesRes.ok ? categoriesRes.json() : { data: [] },
      subcategoriesRes.ok ? subcategoriesRes.json() : { data: [] },
      // undefined on failure → client component sees undefined → falls back to own fetch
      popularRes.ok ? popularRes.json() : undefined,
      newSeriesRes.ok ? newSeriesRes.json() : undefined,
      bannersRes.ok ? bannersRes.json() : undefined,
      testimonialsRes.ok ? testimonialsRes.json() : undefined,
    ]);

    const rawSeries: TestSeries[] = Array.isArray(seriesData?.data) ? seriesData.data : [];
    const testSeries = [...rawSeries].sort(
      (a, b) =>
        new Date(b.created_at || b.updated_at || '').getTime() -
        new Date(a.created_at || a.updated_at || '').getTime()
    );

    const rawCategories: Category[] = Array.isArray(categoriesData?.data)
      ? categoriesData.data
      : [];
    const categories = rawCategories
      .filter((c) => c.is_active !== false)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    const subcategories: Subcategory[] = (
      Array.isArray(subcategoriesData?.data) ? subcategoriesData.data : []
    ).filter((s: Subcategory) => s.name);

    // Convert API response to array; returns undefined if original was undefined (fetch failed)
    const toArray = (val: any) => val === undefined ? undefined : (Array.isArray(val) ? val : (val?.data ?? []));

    // Transform popular test items to match PopularTest interface (camelCase)
    const toPopularTests = (val: any) => {
      const items = toArray(val);
      if (items === undefined) return undefined;
      return (items as any[])
        .map((item: any) => ({
          id: item.id,
          displayOrder: item.displayOrder ?? item.display_order ?? 0,
          exam: item.exam ?? item.exams,
        }))
        .filter((item: any) => Boolean(item.exam));
    };

    return {
      testSeries,
      categories,
      subcategories,
      popularTests: toPopularTests(popularData),
      newTestSeries: toPopularTests(newSeriesData),
      banners: toArray(bannersData),
      testimonials: toArray(testimonialsData),
      total: seriesData?.total ?? 0,
      totalPages: seriesData?.totalPages ?? 1,
    };
  } catch {
    // Only return core fields; optional fields are omitted (undefined) → client falls back
    return { testSeries: [], categories: [], subcategories: [], total: 0, totalPages: 1 };
  }
}

export default async function MockTestSeriesPage() {
  const { popularTests, newTestSeries, banners, testimonials, ...initialData } = await fetchInitialData();

  // Generate JSON-LD structured data
  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Mock Test Series',
    url: 'https://bharatmock.com/mock-test-series',
    description:
      'Attempt SSC, Railway, Banking, Defence, and other competitive exam mock tests with detailed solutions and performance analysis.',
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
        name: 'Mock Test Series',
        item: 'https://bharatmock.com/mock-test-series',
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Why are mock tests important for competitive exams?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A mock test is an exam you take that simulates a similar pattern, level and duration of the real exam. It can be an SSC mock test, a bank exam mock test or any other mock test; it will help improve speed, accuracy, and boost exam confidence.',
        },
      },
      {
        '@type': 'Question',
        name: 'How many mock tests should I attempt before my exam?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Take at least 15-20 mock tests prior to the exam. It can also help you perform better by familiarising yourself with the exam format.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are the mock tests based on the latest exam pattern?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, all mock tests are updated as per the latest pattern and syllabus, so you can practise the latest questions.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a bank mock test for all major exams?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, mock tests are available for IBPS PO, Clerk, SBI PO, SBI Clerk, RBI Assistant and others, which are as per the actual exam difficulty level.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a railway mock test available?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, you can find railway mock tests for RRB NTPC, Group D, ALP, JE, RPF and other exams as per the latest pattern.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I attempt the railway mock test in Hindi?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, a railway mock test in Hindi is available (as well as English), so you can select the language before attempting the test.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are mock tests available in police exam format?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, you can attempt mock tests on the basis of police test question papers for GK, Reasoning, Maths and Current Affairs as per the syllabus.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are all mock tests free on this platform?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Unfortunately, only some mock tests are available for free. Full mock tests are covered by a plan that offers access to all exams.',
        },
      },
      {
        '@type': 'Question',
        name: 'Why are most mock tests paid?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our mock tests are developed by experts, regularly updated, with solutions and analysis. This quality preparation system is sustained by paid plans.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I purchase a mock test plan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Visit the Plans section, select your exam plan and make the payment. You can access your plan immediately after payment.',
        },
      },
      {
        '@type': 'Question',
        name: 'What payment methods are accepted?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can choose to pay with UPI, Credit & Debit card, Net banking or using wallets - Paytm or PhonePe.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I share my account with others?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No, each account is for individual use only. Sharing may lead to suspension without refund.',
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
      <MockTestSeriesClient
        initialData={initialData}
        initialPopularTests={popularTests}
        initialNewTestSeries={newTestSeries}
        initialBanners={banners}
        initialTestimonials={testimonials}
      />
      <MockTestSeriesFAQ />
    </>
  );
}
