import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import TestSeriesDetailClient from './TestSeriesDetailClient';
import type { TestSeries } from '@/lib/api/testSeriesService';
import type { PageBanner } from '@/lib/api/pageBannersService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (apiBase) {
    return `${apiBase}${normalizedPath}`;
  }
  return `/api/v1${normalizedPath}`;
};

const SIDEBAR_BANNER_IDENTIFIER = 'test_series_sidebar';

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function fetchTestSeriesBySlug(slug: string) {
  try {
    const res = await fetch(`${apiBase}/test-series/slug/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || json || null;
  } catch { return null; }
}

async function fetchPageContent(testSeriesId: string) {
  try {
    const res = await fetch(buildApiUrl(`/test-series-page-content/${testSeriesId}`), { cache: 'no-store' });
    if (!res.ok) return { sections: [], orphanBlocks: [] };
    const data = await res.json();
    return {
      sections: data.sections || [],
      orphanBlocks: data.orphanBlocks || [],
      customTabs: Array.isArray(data.customTabs) ? data.customTabs : [],
    };
  } catch { return { sections: [], orphanBlocks: [], customTabs: [] }; }
}

async function fetchSidebarContent(slug: string) {
  try {
    const [seriesRes, bannersRes] = await Promise.all([
      fetch(`${apiBase}/test-series?limit=50&is_published=true`, { cache: 'no-store' }),
      fetch(`${apiBase}/page-banners?identifier=${SIDEBAR_BANNER_IDENTIFIER}`, { cache: 'no-store' }),
    ]);

    const seriesData = seriesRes.ok ? await seriesRes.json() : { data: [] };
    const bannersData = bannersRes.ok ? await bannersRes.json() : [];

    const allSeries: TestSeries[] = seriesData?.data || [];
    const otherSeries = allSeries.filter((series: TestSeries) => series.slug !== slug);
    const sidebarSeries: TestSeries[] = shuffleArray(otherSeries).slice(0, 5);

    const activeBanner = bannersData.find((banner: PageBanner) => banner.is_active) || bannersData[0] || null;

    return { sidebarSeries, sidebarBanner: activeBanner };
  } catch {
    return { sidebarSeries: [], sidebarBanner: null };
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const testSeries = await fetchTestSeriesBySlug(slug);
  if (!testSeries) return { title: 'Test Series Not Found' };
  return {
    title: testSeries.title,
    description: testSeries.description || `Practice with ${testSeries.title} test series on Bharat Mock`,
    openGraph: {
      title: testSeries.title,
      description: testSeries.description,
      images: testSeries.image_url ? [testSeries.image_url] : [],
    },
  };
}

export default async function TestSeriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const testSeries = await fetchTestSeriesBySlug(slug);

  if (!testSeries) notFound();

  const [pageContent, { sidebarSeries, sidebarBanner }] = await Promise.all([
    fetchPageContent(testSeries.id),
    fetchSidebarContent(slug),
  ]);

  const initialData = {
    testSeries,
    pageContent,
    customTabs: pageContent.customTabs,
    sidebarSeries,
    sidebarBanner,
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: testSeries.title,
    description: testSeries.description,
    image: testSeries.image_url,
    url: `${SITE_URL}/test-series/${slug}`,
    brand: {
      '@type': 'Organization',
      name: 'Bharat Mock',
      logo: `${SITE_URL}/favicon.jpg`,
    },
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      price: testSeries.is_free ? '0' : undefined,
      priceCurrency: testSeries.is_free ? undefined : 'INR',
    },
    aggregateRating: testSeries.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: testSeries.rating,
          reviewCount: testSeries.total_attempts || 1,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TestSeriesDetailClient initialData={initialData} slug={slug} />
    </>
  );
}
