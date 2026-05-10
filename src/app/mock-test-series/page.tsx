import MockTestSeriesClient from './MockTestSeriesClient';
import type { TestSeries } from '@/lib/api/testSeriesService';
import type { Category, Subcategory } from '@/lib/api/taxonomyService';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : 'http://localhost:8000/api/v1';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

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
