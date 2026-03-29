import { Metadata } from 'next';
import { Suspense } from 'react';
import DynamicPageWrapper from './DynamicPageWrapper';

const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const buildApiUrl = (path: string) => `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;

async function fetchSeoForSlug(slugArray: string[]): Promise<{
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  canonical_url?: string;
  tab_seo?: Record<string, { meta_title?: string; meta_description?: string; meta_keywords?: string }>;
} | null> {
  try {
    const [first] = slugArray;
    if (!first) return null;

    const subRes = await fetch(buildApiUrl(`/taxonomy/subcategory/${first.toLowerCase()}`), { next: { revalidate: 300 } });
    if (subRes.ok) {
      const subData = await subRes.json();
      const subcategoryId = subData?.data?.id;
      if (subcategoryId) {
        const contentRes = await fetch(buildApiUrl(`/page-content/${subcategoryId}`), { next: { revalidate: 300 } });
        if (contentRes.ok) {
          const content = await contentRes.json();
          return {
            meta_title: content.seo?.meta_title,
            meta_description: content.seo?.meta_description,
            meta_keywords: content.seo?.meta_keywords,
            canonical_url: content.seo?.canonical_url,
            tab_seo: content.tabSeo || {}
          };
        }
      }
    }

    const catRes = await fetch(buildApiUrl(`/taxonomy/category/${first.toLowerCase()}`), { next: { revalidate: 300 } });
    if (catRes.ok) {
      const catData = await catRes.json();
      const categoryId = catData?.data?.id;
      if (categoryId) {
        const contentRes = await fetch(buildApiUrl(`/category-page-content/${categoryId}`), { next: { revalidate: 300 } });
        if (contentRes.ok) {
          const content = await contentRes.json();
          return {
            meta_title: content.seo?.meta_title,
            meta_description: content.seo?.meta_description,
            meta_keywords: content.seo?.meta_keywords,
            canonical_url: content.seo?.canonical_url,
            tab_seo: content.tabSeo || {}
          };
        }
      }
    }
  } catch { /* ignore */ }
  return null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string[] }> }
): Promise<Metadata> {
  const { slug } = await params;
  const slugArray = Array.isArray(slug) ? slug : [slug];
  const seo = await fetchSeoForSlug(slugArray);

  const tabSlug = slugArray.length === 2 ? slugArray[1] : undefined;
  const tabOverride = tabSlug && seo?.tab_seo ? seo.tab_seo[tabSlug] : undefined;

  const title = tabOverride?.meta_title || seo?.meta_title;
  const description = tabOverride?.meta_description || seo?.meta_description;
  const keywords = tabOverride?.meta_keywords || seo?.meta_keywords;
  const canonical = seo?.canonical_url;

  return {
    ...(title && { title }),
    ...(description && { description }),
    ...(keywords && { keywords }),
    ...(canonical && { alternates: { canonical } }),
    ...(title || description ? {
      openGraph: {
        ...(title && { title }),
        ...(description && { description }),
      }
    } : {}),
  };
}

export default async function DynamicPage(
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const slugArray = Array.isArray(slug) ? slug : [slug];

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
      </div>
    }>
      <DynamicPageWrapper slugArray={slugArray} />
    </Suspense>
  );
}
