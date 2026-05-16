import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DynamicPageWrapper from './DynamicPageWrapper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Known static route prefixes — Next.js has dedicated pages for these.
// If the catch-all somehow receives them, return 404 so Next.js falls back correctly.
const STATIC_PREFIXES = new Set([
  'blogs', 'exams', 'mock-test-series', 'live-tests', 'quizzes',
  'previous-year-papers', 'current-affairs', 'subscriptions', 'profile',
  'login', 'register', 'auth', 'admin', 'results', 'test-series',
  'courses', 'colleges', 'about', 'contact', 'privacy', 'privacy-policy',
  'refund-policy', 'disclaimer', 'terms', 'onboarding',
]);

const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const buildApiUrl = (path: string) => `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bharatmock.com').replace(/\/$/, '');

// The slug type resolved by the server — tells the client what component to render
// without needing its own API round-trips on first paint.
export type FirstSegmentType = 'subcategory' | 'combined-subcategory' | 'category' | null;

interface TabSeoEntry {
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  canonical_url?: string;
  robots_meta?: string;
  structured_data?: string;
}

interface CustomTabEntry {
  id: string;
  title: string;
  tab_key: string;
}

interface SlugSeoResult {
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  canonical_url?: string;
  robots_meta?: string;
  tab_seo?: Record<string, TabSeoEntry>;
  custom_tabs?: CustomTabEntry[];
}

// Full data the server pre-fetches and passes to client page components
// so they can render immediately without their own API round-trips.
export interface ServerPageData {
  subcategoryInfo?: any;
  subcategoryId?: string;
  pageContentData?: any;
  categoryInfo?: any;
  categoryId?: string;
}

interface SlugResolution {
  seo: SlugSeoResult | null;
  firstSegmentType: FirstSegmentType;
  serverPageData: ServerPageData | null;
}

async function fetchSeoForSlug(slugArray: string[]): Promise<SlugResolution> {
  const [first] = slugArray;
  if (!first) return { seo: null, firstSegmentType: null, serverPageData: null };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    // 1. Try subcategory first
    const subRes = await fetch(buildApiUrl(`/taxonomy/subcategory/${first.toLowerCase()}`), {
      cache: 'no-store',
      signal: controller.signal
    });
    if (subRes.ok) {
      const subData = await subRes.json();
      const subcategoryId = subData?.data?.id;
      if (subcategoryId) {
        let seo: SlugSeoResult | null = null;
        let pageContentData: any = null;
        try {
          const contentRes = await fetch(buildApiUrl(`/page-content/${subcategoryId}`), {
            cache: 'no-store',
            signal: controller.signal
          });
          if (contentRes.ok) {
            const content = await contentRes.json();
            pageContentData = content;
            seo = {
              meta_title: content.seo?.meta_title,
              meta_description: content.seo?.meta_description,
              meta_keywords: content.seo?.meta_keywords,
              canonical_url: content.seo?.canonical_url,
              robots_meta: content.seo?.robots_meta,
              tab_seo: content.tabSeo || {},
              custom_tabs: content.customTabs || [],
            };
          }
        } catch { /* SEO content fetch failed — still know it's a subcategory */ }
        clearTimeout(timeoutId);
        return {
          seo,
          firstSegmentType: 'subcategory',
          serverPageData: {
            subcategoryInfo: subData.data,
            subcategoryId,
            pageContentData,
          },
        };
      }
    }

    // 2. Try combined-subcategory (slug that merges category+subcategory)
    const combinedRes = await fetch(buildApiUrl(`/taxonomy/resolve/${first.toLowerCase()}`), {
      cache: 'no-store',
      signal: controller.signal
    });
    if (combinedRes.ok) {
      const combinedData = await combinedRes.json();
      if (combinedData?.data?.id) {
        const combinedSubcategoryId = combinedData.data.id;
        let pageContentData: any = null;
        try {
          const contentRes = await fetch(buildApiUrl(`/page-content/${combinedSubcategoryId}`), {
            cache: 'no-store',
            signal: controller.signal
          });
          if (contentRes.ok) pageContentData = await contentRes.json();
        } catch { /* ignore */ }
        clearTimeout(timeoutId);
        return {
          seo: null,
          firstSegmentType: 'combined-subcategory',
          serverPageData: {
            subcategoryInfo: combinedData.data,
            subcategoryId: combinedSubcategoryId,
            pageContentData,
          },
        };
      }
    }

    // 3. Try category
    const catRes = await fetch(buildApiUrl(`/taxonomy/category/${first.toLowerCase()}`), {
      cache: 'no-store',
      signal: controller.signal
    });
    if (catRes.ok) {
      const catData = await catRes.json();
      const categoryId = catData?.data?.id;
      if (categoryId) {
        let seo: SlugSeoResult | null = null;
        let pageContentData: any = null;
        try {
          const contentRes = await fetch(buildApiUrl(`/category-page-content/${categoryId}`), {
            cache: 'no-store',
            signal: controller.signal
          });
          if (contentRes.ok) {
            const content = await contentRes.json();
            pageContentData = content;
            seo = {
              meta_title: content.seo?.meta_title,
              meta_description: content.seo?.meta_description,
              meta_keywords: content.seo?.meta_keywords,
              canonical_url: content.seo?.canonical_url,
              robots_meta: content.seo?.robots_meta,
              tab_seo: content.tabSeo || {},
              custom_tabs: content.customTabs || [],
            };
          }
        } catch { /* SEO content fetch failed — still know it's a category */ }
        clearTimeout(timeoutId);
        return {
          seo,
          firstSegmentType: 'category',
          serverPageData: {
            categoryInfo: catData.data,
            categoryId,
            pageContentData,
          },
        };
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`SEO fetch for slug ${first} timed out.`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
  return { seo: null, firstSegmentType: null, serverPageData: null };
}

// Normalize a slug/title for comparison
const normalizeSlug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Resolve tab SEO override for a URL slug.
// Admin stores tab SEO keyed by tab ID (UUID for custom tabs, or 'overview'/'mock-tests'/'previous-papers').
// Public URL uses the tab's slug (normalized title/tab_key), so we must map slug → ID first.
function resolveTabSeo(
  tabSlug: string | undefined,
  seo: SlugSeoResult | null
): TabSeoEntry | undefined {
  if (!tabSlug || !seo?.tab_seo) return undefined;

  // Direct match — works for 'overview', 'mock-tests', 'previous-papers'
  if (seo.tab_seo[tabSlug]) return seo.tab_seo[tabSlug];

  // Resolve custom tab: match URL slug against tab_key or title, then look up by UUID
  const normalized = normalizeSlug(tabSlug);
  const matched = seo.custom_tabs?.find(
    (tab) => normalizeSlug(tab.tab_key || tab.title || '') === normalized
  );
  if (matched && seo.tab_seo[matched.id]) {
    return seo.tab_seo[matched.id];
  }

  return undefined;
}

const slugToTitle = (s: string) =>
  s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string[] }> }
): Promise<Metadata> {
  const { slug } = await params;
  const slugArray = Array.isArray(slug) ? slug : [slug];

  if (slugArray.length > 0 && STATIC_PREFIXES.has(slugArray[0].toLowerCase())) {
    return {};
  }

  const { seo } = await fetchSeoForSlug(slugArray);

  const isTabPage = slugArray.length >= 2;
  const tabSlug = isTabPage ? slugArray[slugArray.length - 1] : undefined;
  const tabOverride = resolveTabSeo(tabSlug, seo);

  const title = tabOverride?.meta_title || seo?.meta_title || slugToTitle(slugArray[slugArray.length - 1]);
  const description = tabOverride?.meta_description || seo?.meta_description;
  const keywords = tabOverride?.meta_keywords || seo?.meta_keywords;
  const slugPath = slugArray.join('/');

  // Tab pages must have their own canonical, never inherit the parent page canonical.
  // If admin set a tab-specific canonical use it, else fall back to the actual URL.
  const canonical = tabOverride?.canonical_url
    || (isTabPage ? `${SITE_URL}/${slugPath}` : (seo?.canonical_url || `${SITE_URL}/${slugPath}`));

  // Apply tab-level robots override when set
  const robotsMeta = tabOverride?.robots_meta || seo?.robots_meta;
  const robots = robotsMeta
    ? { index: !robotsMeta.includes('noindex'), follow: !robotsMeta.includes('nofollow') }
    : undefined;

  const ogImage = "/assets/login_banner_image.jpg";

  return {
    title,
    ...(description && { description }),
    ...(keywords && { keywords }),
    alternates: { canonical },
    ...(robots && { robots }),
    openGraph: {
      title,
      ...(description && { description }),
      url: canonical,
      type: "website",
      siteName: "BharatMock",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      ...(description && { description }),
      images: [ogImage],
    },
  };
}

export default async function DynamicPage(
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const slugArray = Array.isArray(slug) ? slug : [slug];

  // Prevent catch-all from handling system paths
  if (slugArray.length > 0 && (slugArray[0].startsWith('_') || slugArray[0].startsWith('.'))) {
    notFound();
  }

  // If this is a known static route prefix, it shouldn't be here — show notFound
  if (slugArray.length > 0 && STATIC_PREFIXES.has(slugArray[0].toLowerCase())) {
    notFound();
  }

  // Verify if the slug exists to prevent showing "Category not found" on random URLs
  // fetchSeoForSlug also determines the first-segment type (subcategory / category / etc.)
  // which is passed to the client to skip the client-side slug-resolver spinner.
  const { seo, firstSegmentType, serverPageData } = await fetchSeoForSlug(slugArray);
  if (!seo && firstSegmentType === null) {
    notFound();
  }

  // Resolve tab-level SEO override (same logic as generateMetadata)
  const isTabPage = slugArray.length >= 2;
  const tabSlugForSchema = isTabPage ? slugArray[slugArray.length - 1] : undefined;
  const tabOverrideForSchema = resolveTabSeo(tabSlugForSchema, seo);

  const slugPath = slugArray.join('/');

  // Tab pages must never inherit the parent page canonical — use own URL
  const pageUrl = tabOverrideForSchema?.canonical_url
    || (isTabPage ? `${SITE_URL}/${slugPath}` : (seo?.canonical_url || `${SITE_URL}/${slugPath}`));

  // Use tab-specific title/description when set by admin, fall back to page-level then slug
  const pageTitle = tabOverrideForSchema?.meta_title
    || seo?.meta_title
    || slugToTitle(slugArray[slugArray.length - 1]);
  const pageDescription = tabOverrideForSchema?.meta_description
    || seo?.meta_description
    || `Practice ${slugToTitle(slugArray[0])} mock tests, previous year papers and study material on BharatMock.`;

  // Build full breadcrumb — use page-level meta_title for first segment label
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    ...slugArray.map((segment, i) => ({
      '@type': 'ListItem',
      position: i + 2,
      name: i === 0 && seo?.meta_title
        ? seo.meta_title
        : (i === slugArray.length - 1 && tabOverrideForSchema?.meta_title)
          ? tabOverrideForSchema.meta_title
          : slugToTitle(segment),
      item: `${SITE_URL}/${slugArray.slice(0, i + 1).join('/')}`,
    })),
  ];

  // Course schema for exam pages, WebPage for tab sub-pages
  const jsonLd = isTabPage
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: pageTitle,
        description: pageDescription,
        url: pageUrl,
        isPartOf: { '@type': 'WebSite', url: SITE_URL, name: 'BharatMock' },
        breadcrumb: { '@type': 'BreadcrumbList', itemListElement: breadcrumbItems },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: pageTitle,
        description: pageDescription,
        url: pageUrl,
        provider: {
          '@type': 'Organization',
          name: 'BharatMock',
          url: SITE_URL,
        },
        educationalLevel: 'Government Exam',
        inLanguage: ['en', 'hi'],
        breadcrumb: { '@type': 'BreadcrumbList', itemListElement: breadcrumbItems },
      };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DynamicPageWrapper
        slugArray={slugArray}
        firstSegmentType={firstSegmentType}
        serverPageData={serverPageData}
      />
    </>
  );
}
