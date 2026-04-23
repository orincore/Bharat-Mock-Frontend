import { MetadataRoute } from 'next';

const BASE_URL = 'https://bharatmock.com';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/exams`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/test-series`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/blogs`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/current-affairs`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/mock-test-series`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/previous-year-papers`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/quizzes`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/live-tests`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/subscriptions`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/privacy-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/refund-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/disclaimer`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const [blogsData, testSeriesData, categoriesData] = await Promise.all([
    fetchJson<{ data?: { items?: { slug: string; updated_at?: string }[] } }>(`${API_BASE_URL}/blogs?limit=1000&published=true`),
    fetchJson<{ data?: { items?: { slug: string; updated_at?: string }[] } }>(`${API_BASE_URL}/test-series?limit=1000`),
    fetchJson<{ data?: { items?: { slug: string; updated_at?: string }[] } }>(`${API_BASE_URL}/categories?limit=500`),
  ]);

  const blogUrls: MetadataRoute.Sitemap = (blogsData?.data?.items || []).map((blog) => ({
    url: `${BASE_URL}/blogs/${blog.slug}`,
    lastModified: blog.updated_at ? new Date(blog.updated_at).toISOString() : now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const testSeriesUrls: MetadataRoute.Sitemap = (testSeriesData?.data?.items || []).map((series) => ({
    url: `${BASE_URL}/test-series/${series.slug}`,
    lastModified: series.updated_at ? new Date(series.updated_at).toISOString() : now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const categoryUrls: MetadataRoute.Sitemap = (categoriesData?.data?.items || []).map((cat) => ({
    url: `${BASE_URL}/${cat.slug}`,
    lastModified: cat.updated_at ? new Date(cat.updated_at).toISOString() : now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...blogUrls, ...testSeriesUrls, ...categoryUrls];
}
