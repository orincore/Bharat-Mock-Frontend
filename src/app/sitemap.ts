import { MetadataRoute } from 'next';

const BASE_URL = 'https://bharatmock.com';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface SitemapResponse {
  success: boolean;
  data?: {
    blogs: { url: string; lastModified: string; changeFrequency: string; priority: number }[];
    testSeries: { url: string; lastModified: string; changeFrequency: string; priority: number }[];
    categories: { url: string; lastModified: string; changeFrequency: string; priority: number }[];
    subcategories: { url: string; lastModified: string; changeFrequency: string; priority: number }[];
    exams: { url: string; lastModified: string; changeFrequency: string; priority: number }[];
    subcategoryTabs: { url: string; lastModified: string; changeFrequency: string; priority: number }[];
    pdfs: { url: string; lastModified: string; changeFrequency: string; priority: number }[];
  };
}

async function fetchSitemapData(): Promise<SitemapResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/sitemap`, {
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

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/mock-test-series`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/blogs`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/live-tests`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/current-affairs`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/quizzes`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/previous-year-papers`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/courses`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/privacy-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/refund-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/disclaimer`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Fetch all dynamic data from optimized single endpoint
  const sitemapData = await fetchSitemapData();

  if (!sitemapData?.success || !sitemapData.data) {
    // Fallback to static pages only if API fails
    return staticPages;
  }

  const data = sitemapData.data;

  // Transform relative URLs to absolute URLs
  const transformUrl = (item: { url: string; lastModified: string; changeFrequency: string; priority: number }): MetadataRoute.Sitemap[0] => ({
    url: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    lastModified: item.lastModified,
    changeFrequency: item.changeFrequency as 'daily' | 'weekly' | 'monthly' | 'yearly',
    priority: item.priority,
  });

  return [
    ...staticPages,
    ...data.blogs.map(transformUrl),
    ...data.testSeries.map(transformUrl),
    ...data.categories.map(transformUrl),
    ...data.subcategories.map(transformUrl),
    ...data.exams.map(transformUrl),
    ...data.subcategoryTabs.map(transformUrl),
    ...data.pdfs.map(transformUrl),
  ];
}
