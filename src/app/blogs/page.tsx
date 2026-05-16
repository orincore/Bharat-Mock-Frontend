import type { Metadata } from 'next';
import BlogsClient from './BlogsClient';
import type { Blog } from '@/lib/api/blogService';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Exam Preparation Blog — SSC, Banking & Railway Tips | BharatMock",
  description: "Read expert tips, exam strategies, current affairs updates and study guides for SSC CGL, IBPS PO, RRB NTPC and all govt exams on BharatMock Blog.",
  alternates: {
    canonical: "https://bharatmock.com/blogs",
  },
  openGraph: {
    title: "Exam Preparation Blog | BharatMock",
    description: "Read expert tips, exam strategies, current affairs updates and study guides for SSC CGL, IBPS PO, RRB NTPC and all govt exams on BharatMock Blog.",
    url: "https://bharatmock.com/blogs",
    type: "website",
    siteName: "BharatMock",
    images: [{ url: "/assets/login_banner_image.jpg", width: 1200, height: 630, alt: "BharatMock Blog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Exam Preparation Blog | BharatMock",
    description: "Read expert tips, exam strategies, current affairs updates and study guides for SSC CGL, IBPS PO, RRB NTPC and all govt exams.",
    images: ["/assets/login_banner_image.jpg"],
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : 'http://localhost:8000/api/v1';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bharatmock.com';

async function fetchInitialData() {
  try {
    const [articlesRes, categoriesRes] = await Promise.all([
      fetch(`${API_BASE}/blogs?page=1&limit=12`, {
        cache: 'no-store',
      }),
      fetch(`${API_BASE}/blogs/categories`, {
        cache: 'no-store',
      }),
    ]);

    const [articlesData, categoriesData] = await Promise.all([
      articlesRes.ok ? articlesRes.json() : { data: [], pagination: { total: 0, totalPages: 0 } },
      categoriesRes.ok ? categoriesRes.json() : [],
    ]);

    const rawArticles: Blog[] = Array.isArray(articlesData?.data) ? articlesData.data : [];
    // Filter out current affairs notes from the main blog listing
    const articles = rawArticles.filter((b) => !b.is_current_affairs_note);

    const categories: string[] = Array.isArray(categoriesData) ? categoriesData : [];

    return {
      articles,
      categories,
      total: articlesData?.pagination?.total ?? 0,
      totalPages: articlesData?.pagination?.totalPages ?? 1,
    };
  } catch {
    return { articles: [], categories: [], total: 0, totalPages: 1 };
  }
}

export default async function BlogsPage() {
  const initialData = await fetchInitialData();

  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Blogs - Bharat Mock',
    description: 'Read the latest articles, study tips, and exam preparation guides. SSC, Banking, Railways, UPSC and more.',
    url: `${SITE_URL}/blogs`,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blogs',
          item: `${SITE_URL}/blogs`,
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogsClient initialData={initialData} />
    </>
  );
}
