import { MetadataRoute } from 'next';

const BASE_URL = 'https://bharatmock.com';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function fetchJson<T>(url: string, timeout = 10000): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      cache: 'no-store',
      next: { revalidate: 3600 }, // Cache for 1 hour to reduce API load
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const STATIC_TAB_SLUGS = ['mock-tests', 'previous-papers'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

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

  const [blogsData, testSeriesData, categoriesData, subcategoriesData, examsData, collegesData] = await Promise.all([
    fetchJson<{ success?: boolean; data?: { slug: string; updated_at?: string; is_current_affairs_note?: boolean }[] }>(`${API_BASE_URL}/blogs?limit=1000&published=true`, 8000),
    fetchJson<{ data?: { slug: string; updated_at?: string }[] }>(`${API_BASE_URL}/test-series?limit=1000`, 8000),
    fetchJson<{ success?: boolean; data?: { slug: string; updated_at?: string }[] }>(`${API_BASE_URL}/taxonomy/categories?limit=500`, 8000),
    fetchJson<{ data?: { id: string; slug: string; updated_at?: string }[] }>(`${API_BASE_URL}/taxonomy/subcategories?limit=1000`, 8000),
    fetchJson<{ success?: boolean; data?: { url_path: string; updated_at?: string }[] }>(`${API_BASE_URL}/exams?limit=1000`, 8000),
    fetchJson<{ success?: boolean; data?: { id: string; slug?: string; updated_at?: string; name?: string }[] }>(`${API_BASE_URL}/colleges?limit=500`, 5000),
  ]);

  const blogUrls: MetadataRoute.Sitemap = (blogsData?.data || [])
    .filter((blog) => !blog.is_current_affairs_note)
    .map((blog) => ({
      url: `${BASE_URL}/blogs/${blog.slug}`,
      lastModified: blog.updated_at ? new Date(blog.updated_at).toISOString() : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

  const currentAffairsUrls: MetadataRoute.Sitemap = (blogsData?.data || [])
    .filter((blog) => blog.is_current_affairs_note)
    .map((blog) => ({
      url: `${BASE_URL}/current-affairs/${blog.slug}`,
      lastModified: blog.updated_at ? new Date(blog.updated_at).toISOString() : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

  const testSeriesUrls: MetadataRoute.Sitemap = (testSeriesData?.data || []).map((series) => ({
    url: `${BASE_URL}/test-series/${series.slug}`,
    lastModified: series.updated_at ? new Date(series.updated_at).toISOString() : now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const categoryUrls: MetadataRoute.Sitemap = (categoriesData?.data || []).map((cat) => ({
    url: `${BASE_URL}/${cat.slug}`,
    lastModified: cat.updated_at ? new Date(cat.updated_at).toISOString() : now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const subcategoryItems = subcategoriesData?.data || [];

  const subcategoryUrls: MetadataRoute.Sitemap = subcategoryItems.map((sub) => ({
    url: `${BASE_URL}/${sub.slug}`,
    lastModified: sub.updated_at ? new Date(sub.updated_at).toISOString() : now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const examUrls: MetadataRoute.Sitemap = (examsData?.data || [])
    .filter((exam) => exam.url_path && exam.url_path.startsWith('/'))
    .map((exam) => ({
      url: `${BASE_URL}${exam.url_path}`,
      lastModified: exam.updated_at ? new Date(exam.updated_at).toISOString() : now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

  const collegeUrls: MetadataRoute.Sitemap = (collegesData?.data || [])
    .filter((college) => college.slug)
    .map((college) => ({
      url: `${BASE_URL}/colleges/${college.slug}`,
      lastModified: college.updated_at ? new Date(college.updated_at).toISOString() : now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

  // Generate static tab URLs for ALL subcategories (no expensive API calls)
  // Skip custom tabs to avoid 503 errors - just include the known static tabs
  const subcategoryTabUrls: MetadataRoute.Sitemap = [];

  for (const sub of subcategoryItems) {
    const lastMod = sub.updated_at ? new Date(sub.updated_at).toISOString() : now;

    // Static tabs (mock-tests, previous-papers) for every subcategory
    for (const tabSlug of STATIC_TAB_SLUGS) {
      subcategoryTabUrls.push({
        url: `${BASE_URL}/${sub.slug}/${tabSlug}`,
        lastModified: lastMod,
        changeFrequency: 'weekly' as const,
        priority: 0.65,
      });
    }
  }

  return [...staticPages, ...blogUrls, ...currentAffairsUrls, ...testSeriesUrls, ...categoryUrls, ...subcategoryUrls, ...examUrls, ...collegeUrls, ...subcategoryTabUrls];
}
