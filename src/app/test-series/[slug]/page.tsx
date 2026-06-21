import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import TestSeriesDetailClient from './TestSeriesDetailClient';
import type { TestSeries } from '@/lib/api/testSeriesService';
import type { PageBanner } from '@/lib/api/pageBannersService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bharatmock.com';

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
    if (!res.ok) return { sections: [], orphanBlocks: [], customTabs: [], seo: null };
    const data = await res.json();
    return {
      sections: data.sections || [],
      orphanBlocks: data.orphanBlocks || [],
      customTabs: Array.isArray(data.customTabs) ? data.customTabs : [],
      seo: data.seo || null,
    };
  } catch { return { sections: [], orphanBlocks: [], customTabs: [], seo: null }; }
}

// structured_data is an overloaded JSONB column: it holds the admin's public JSON-LD
// schema AND internal page config (toc_order/tab_headings/tab_seo/pdf_url). Extract only
// a usable JSON-LD object from the admin's "Structured Data Notes" field. Returns null
// when nothing usable is present so the caller can fall back to the generated schema.
const SCHEMA_INTERNAL_KEYS = ['tab_headings', 'toc_order', 'tab_seo', 'pdf_url'];

function parseAdminSchema(
  raw?: string | Record<string, any> | null
): Record<string, any> | Record<string, any>[] | null {
  if (!raw) return null;

  // Object (admin editor parsed it before saving)
  if (typeof raw === 'object') {
    if (Array.isArray(raw)) return raw.length ? raw : null;
    if (!('@context' in raw || '@type' in raw)) return null; // internal config only
    const schema: Record<string, any> = { ...raw };
    SCHEMA_INTERNAL_KEYS.forEach((k) => delete schema[k]);
    return Object.keys(schema).length ? schema : null;
  }

  // String: try direct JSON, then control-char-stripped JSON, then pasted <script> blocks
  try { return JSON.parse(raw); } catch { /* fall through */ }
  try {
    // eslint-disable-next-line no-control-regex
    return JSON.parse(raw.replace(/[\x00-\x1F\x7F]+/g, ' '));
  } catch { /* fall through */ }

  const scriptRe = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const extracted: Record<string, any>[] = [];
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(raw)) !== null) {
    const content = match[1].trim();
    try {
      extracted.push(JSON.parse(content));
    } catch {
      try {
        // eslint-disable-next-line no-control-regex
        extracted.push(JSON.parse(content.replace(/[\x00-\x1F\x7F]+/g, ' ')));
      } catch { /* skip this block */ }
    }
  }
  if (extracted.length === 1) return extracted[0];
  if (extracted.length > 1) return extracted;

  return null;
}

async function fetchSidebarContent(slug: string) {
  try {
    const [seriesRes, bannersRes] = await Promise.all([
      fetch(`${apiBase}/test-series?limit=50&is_published=true&exclude_hidden=true`, { cache: 'no-store' }),
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
  const canonicalUrl = `${SITE_URL}/test-series/${slug}`;
  return {
    title: testSeries.title,
    description: testSeries.description || `Practice with ${testSeries.title} test series on Bharat Mock`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: testSeries.title,
      description: testSeries.description,
      url: canonicalUrl,
      type: 'website',
      siteName: 'BharatMock',
      images: testSeries.image_url ? [{ url: testSeries.image_url, width: 1200, height: 630, alt: testSeries.title }] : [{ url: `${SITE_URL}/assets/login_banner_image.jpg`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: testSeries.title,
      description: testSeries.description,
      images: testSeries.image_url ? [testSeries.image_url] : [`${SITE_URL}/assets/login_banner_image.jpg`],
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

  // Prefer the admin-provided JSON-LD ("Structured Data Notes" in the editor, saved to
  // page_seo.structured_data) over the generated Product schema. Fall back to generated
  // schema only when the admin hasn't configured a valid one.
  const generatedJsonLd = {
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

  const adminSchema = parseAdminSchema(pageContent.seo?.structured_data);
  const jsonLd = adminSchema ?? generatedJsonLd;

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
