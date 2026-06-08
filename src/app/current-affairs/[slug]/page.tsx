import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CurrentAffairsDetailClient from './CurrentAffairsDetailClient';
import { decodeHtmlEntities } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bharatmock.com').replace(/\/$/, '');
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

// Fetch a blog article by slug using a direct server-side fetch (avoids the
// client-side apiClient which relies on localStorage and may fail on the server).
async function fetchArticleBySlug(slug: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/blogs/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

// Fetch blog content (sections + blocks) by blog ID.
async function fetchArticleContent(blogId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/blogs/${encodeURIComponent(blogId)}/content`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.sections ?? [];
  } catch {
    return [];
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await fetchArticleBySlug(slug);
    if (!article) return { title: 'Current Affairs' };
    const canonicalUrl = `${SITE_URL}/current-affairs/${slug}`;
    const title = article.meta_title || article.title;
    const description = article.meta_description || article.excerpt;
    const ogTitle = article.og_title || article.title;
    const ogDescription = article.og_description || article.excerpt;

    const decodedTitle = decodeHtmlEntities(title);
    const decodedDescription = decodeHtmlEntities(description);
    const decodedOgTitle = decodeHtmlEntities(ogTitle);
    const decodedOgDescription = decodeHtmlEntities(ogDescription);

    return {
      title: decodedTitle,
      description: decodedDescription,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: decodedOgTitle,
        description: decodedOgDescription,
        url: canonicalUrl,
        type: 'article',
        siteName: 'BharatMock',
        images: article.featured_image_url
          ? [{ url: article.featured_image_url, width: 1200, height: 630, alt: decodedTitle }]
          : [{ url: `${SITE_URL}/assets/login_banner_image.jpg`, width: 1200, height: 630 }],
      },
      twitter: {
        card: 'summary_large_image',
        title: decodedOgTitle,
        description: decodedOgDescription,
        images: article.featured_image_url
          ? [article.featured_image_url]
          : [`${SITE_URL}/assets/login_banner_image.jpg`],
      },
    };
  } catch {
    return { title: 'Current Affairs' };
  }
}

export default async function CurrentAffairsDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Fetch article server-side via direct fetch (not apiClient) so this works
  // correctly in the server component environment.
  const article = await fetchArticleBySlug(slug);

  // These notFound() calls must be OUTSIDE any try/catch — Next.js's notFound()
  // throws a special error internally that gets silently swallowed by catch blocks.
  // Previously, both checks were inside a try/catch which caused the page to render
  // with null data (then fail on the client) instead of showing a clean 404.
  if (!article) notFound();
  if (!article.is_current_affairs_note) notFound();

  // Fetch sections; falls through to empty array on failure (client will show placeholder).
  const sections = await fetchArticleContent(article.id);

  return (
    <CurrentAffairsDetailClient
      slug={slug}
      initialArticle={article}
      initialSections={sections}
    />
  );
}
