import type { Metadata } from 'next';
import MockTestSeriesClient from './MockTestSeriesClient';
import type { TestSeries } from '@/lib/api/testSeriesService';
import type { Category, Subcategory } from '@/lib/api/taxonomyService';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Free Mock Test Series 2026 — SSC, Banking, Railway & Police | BharatMock",
  description: "Practice with 5000+ free mock tests for SSC CGL, IBPS PO, RRB NTPC, UP Police and 100+ govt exams. Topic-wise, chapter-wise & full-length test series with detailed analytics.",
  keywords: "free mock test series, SSC CGL mock test 2026, IBPS PO mock test, RRB NTPC mock test, UP Police mock test, government exam practice tests",
  alternates: {
    canonical: "https://bharatmock.com/mock-test-series",
  },
  openGraph: {
    title: "Free Mock Test Series 2026 — SSC, Banking, Railway & Police | BharatMock",
    description: "Practice with 5000+ free mock tests for SSC CGL, IBPS PO, RRB NTPC, UP Police and 100+ govt exams. Start free today!",
    url: "https://bharatmock.com/mock-test-series",
    type: "website",
    siteName: "BharatMock",
    images: [{ url: "/assets/login_banner_image.jpg", width: 1200, height: 630, alt: "BharatMock Mock Test Series" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Mock Test Series 2026 — SSC, Banking, Railway & Police | BharatMock",
    description: "Practice with 5000+ free mock tests for 100+ govt exams. Start free today!",
    images: ["/assets/login_banner_image.jpg"],
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : 'http://localhost:8000/api/v1';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bharatmock.com';

async function fetchInitialData() {
  try {
    const [seriesRes, categoriesRes, subcategoriesRes] = await Promise.all([
      fetch(`${API_BASE}/test-series?page=1&limit=12&is_published=true`, {
        cache: 'no-store',
      }),
      fetch(`${API_BASE}/taxonomy/categories`, {
        cache: 'no-store',
      }),
      fetch(`${API_BASE}/taxonomy/subcategories`, {
        cache: 'no-store',
      }),
    ]);

    const [seriesData, categoriesData, subcategoriesData] = await Promise.all([
      seriesRes.ok ? seriesRes.json() : { data: [], total: 0, totalPages: 0 },
      categoriesRes.ok ? categoriesRes.json() : { data: [] },
      subcategoriesRes.ok ? subcategoriesRes.json() : { data: [] },
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

    return {
      testSeries,
      categories,
      subcategories,
      total: seriesData?.total ?? 0,
      totalPages: seriesData?.totalPages ?? 1,
    };
  } catch {
    return { testSeries: [], categories: [], subcategories: [], total: 0, totalPages: 1 };
  }
}

export default async function MockTestSeriesPage() {
  const initialData = await fetchInitialData();

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
      <MockTestSeriesClient initialData={initialData} />
    </>
  );
}
