import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import BlogDetailClient from './BlogDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bharatmock.com';

// `cache: 'no-store'` only disables Next.js's own Data Cache. The BACKEND also caches
// its responses, so admin edits (e.g. a table's fit/scroll layout) won't appear until
// that cache expires. Mirror the homepage fix: send no-cache headers AND a `?_t=`
// cache-buster so the backend skips its cache and returns fresh content every request.
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
} as const;

async function fetchBlog(slug: string) {
  try {
    const res = await fetch(`${apiBase}/blogs/${slug}?_t=${Date.now()}`, { cache: 'no-store', headers: NO_CACHE_HEADERS });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || json || null;
  } catch { return null; }
}

async function fetchBlogContent(id: string) {
  try {
    const res = await fetch(`${apiBase}/blogs/${id}/content?_t=${Date.now()}`, { cache: 'no-store', headers: NO_CACHE_HEADERS });
    if (!res.ok) return [];
    const json = await res.json();
    const sections = json?.sections || json?.data || [];
    return Array.isArray(sections) ? sections : [];
  } catch { return []; }
}

async function fetchLatestBlogs() {
  try {
    const res = await fetch(`${apiBase}/blogs?limit=6`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.data || json?.data || [];
  } catch { return []; }
}

async function fetchRelatedBlogs(category: string, excludeId: string) {
  try {
    const res = await fetch(`${apiBase}/blogs?category=${encodeURIComponent(category)}&limit=7`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    const blogs = json?.data?.data || json?.data || [];
    return blogs.filter((b: any) => b.id !== excludeId).slice(0, 3);
  } catch { return []; }
}

async function fetchCategories() {
  try {
    const res = await fetch(`${apiBase}/blogs/categories`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data || json || []).slice(0, 8);
  } catch { return []; }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchBlog(slug);
  if (!article) return { title: 'Blog Not Found' };
  const canonicalUrl = `${SITE_URL}/blogs/${slug}`;
  const title = article.meta_title || article.title;
  const description = article.meta_description || article.excerpt;
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: article.og_title || article.title,
      description: article.og_description || article.excerpt,
      url: canonicalUrl,
      type: 'article',
      siteName: 'BharatMock',
      images: article.featured_image_url
        ? [{ url: article.featured_image_url, width: 1200, height: 630, alt: title }]
        : [{ url: `${SITE_URL}/assets/login_banner_image.jpg`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.og_title || article.title,
      description: article.og_description || article.excerpt,
      images: article.featured_image_url
        ? [article.featured_image_url]
        : [`${SITE_URL}/assets/login_banner_image.jpg`],
    },
  };
}

export default async function BlogDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const article = await fetchBlog(slug);

  if (!article) notFound();

  // Redirect current affairs notes
  if (article.is_current_affairs_note) {
    const { redirect } = await import('next/navigation');
    redirect(`/current-affairs/${article.slug}`);
  }

  const [sections, latestBlogs, relatedArticles, categories] = await Promise.all([
    fetchBlogContent(article.id),
    fetchLatestBlogs(),
    article.category ? fetchRelatedBlogs(article.category, article.id) : Promise.resolve([]),
    fetchCategories(),
  ]);

  // Admin-entered structured data: may be a single JSON object, a JSON array,
  // several <script type="application/ld+json"> tags, or several JSON objects
  // pasted one after another. Parse ALL of them so every schema the admin adds
  // is rendered (previously this field was ignored and only the generated
  // Article schema appeared).
  const parseAdminSchemas = (raw: unknown): Record<string, any>[] => {
    if (!raw) return [];
    if (typeof raw === 'object') {
      return Array.isArray(raw) ? raw.filter((s) => s && typeof s === 'object') : [raw as Record<string, any>];
    }
    if (typeof raw !== 'string' || !raw.trim()) return [];

    const tryParse = (text: string): any | null => {
      try { return JSON.parse(text); } catch { /* fall through */ }
      try {
        // eslint-disable-next-line no-control-regex
        return JSON.parse(text.replace(/[\x00-\x1F\x7F]+/g, ' '));
      } catch { return null; }
    };

    // 1. Whole string is valid JSON (object or array)
    const direct = tryParse(raw);
    if (direct) return Array.isArray(direct) ? direct : [direct];

    // 2. Pasted <script type="application/ld+json"> tags
    const scriptRe = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const fromScripts: Record<string, any>[] = [];
    let match: RegExpExecArray | null;
    while ((match = scriptRe.exec(raw)) !== null) {
      const parsed = tryParse(match[1].trim());
      if (parsed) Array.isArray(parsed) ? fromScripts.push(...parsed) : fromScripts.push(parsed);
    }
    if (fromScripts.length) return fromScripts;

    // 3. Multiple JSON objects concatenated back-to-back
    const wrapped = tryParse(`[${raw.trim().replace(/}\s*,?\s*{/g, '},{')}]`);
    if (Array.isArray(wrapped)) return wrapped.filter((s) => s && typeof s === 'object');

    return [];
  };

  const adminSchemas = parseAdminSchemas(article.structured_data);

  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || article.meta_description,
    image: article.featured_image_url,
    author: {
      '@type': 'Person',
      name: article.author?.name || 'Bharat Mock',
    },
    datePublished: article.published_at,
    dateModified: article.updated_at,
    url: `${SITE_URL}/blogs/${slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'Bharat Mock',
      logo: `${SITE_URL}/favicon.jpg`,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blogs/${slug}`,
    },
  };

  // Render every admin schema; keep the generated Article schema only when the
  // admin hasn't provided their own Article-type schema (avoids duplicates).
  const hasAdminArticleSchema = adminSchemas.some((s) =>
    /article|blogposting/i.test(JSON.stringify(s['@type'] ?? ''))
  );
  const schemas = [...(hasAdminArticleSchema ? [] : [jsonLd]), ...adminSchemas];

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <BlogDetailClient
        article={article}
        sections={sections}
        latestBlogs={latestBlogs}
        relatedArticles={relatedArticles}
        categories={categories}
        slug={slug}
      />
    </>
  );
}
