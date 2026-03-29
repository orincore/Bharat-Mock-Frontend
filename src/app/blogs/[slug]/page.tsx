import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import BlogDetailClient from './BlogDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');

async function fetchBlog(slug: string) {
  try {
    const res = await fetch(`${apiBase}/blogs/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || json || null;
  } catch { return null; }
}

async function fetchBlogContent(id: string) {
  try {
    const res = await fetch(`${apiBase}/blogs/${id}/content`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json?.data || json || [];
    return Array.isArray(data) ? data : [];
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
  return {
    title: article.meta_title || article.title,
    description: article.meta_description || article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: article.featured_image_url ? [article.featured_image_url] : [],
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

  return (
    <BlogDetailClient
      article={article}
      sections={sections}
      latestBlogs={latestBlogs}
      relatedArticles={relatedArticles}
      categories={categories}
      slug={slug}
    />
  );
}
