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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bharatmock.com';

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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Mock Test Series - Bharat Mock',
    description: 'Practice with our comprehensive mock test series for competitive exams. SSC, Banking, Railways, UPSC and more.',
    url: `${SITE_URL}/mock-test-series`,
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
          name: 'Mock Test Series',
          item: `${SITE_URL}/mock-test-series`,
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
