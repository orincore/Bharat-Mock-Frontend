import type { Metadata } from 'next';
import PreviousYearPapersClient from './PreviousYearPapersClient';
import ServerPreviousYearPapers from './ServerPreviousYearPapers';
import { PreviousYearPapersFAQ } from './PreviousYearPapersFAQ';
import type { Exam } from '@/types';
import type { Category, Subcategory } from '@/lib/api/taxonomyService';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Latest Previous Year Question Papers for All Government Exams",
  description: "Practice previous year question papers for SSC, Banking, Railway & Police exams with detailed solutions to improve accuracy & understand exam patterns.",
  keywords: "SSC previous year question paper, bank previous year question paper railway previous year question paper, bank exam previous year question paper police bharti previous year question paper, ssc exam previous year question paper",
  alternates: {
    canonical: "https://bharatmock.com/previous-year-papers",
  },
  openGraph: {
    title: "Previous Year Question Papers | BharatMock",
    description: "Practice previous year question papers for 100+ government exams including SSC, Banking, Railway and Police.",
    url: "https://bharatmock.com/previous-year-papers",
    type: "website",
    siteName: "BharatMock",
    images: [{ url: "/assets/login_banner_image.jpg", width: 1200, height: 630, alt: "BharatMock Previous Year Papers" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Previous Year Question Papers | BharatMock",
    description: "Practice previous year papers for SSC, Banking, Railway & Police exams. Understand real exam patterns.",
    images: ["/assets/login_banner_image.jpg"],
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : '';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bharatmock.com';

async function fetchInitialData() {
  try {
    const [examsRes, categoriesRes, subcategoriesRes] = await Promise.all([
      fetch(`${API_BASE}/exams?exam_type=past_paper&page=1&limit=30`, {
        cache: 'no-store',
      }),
      fetch(`${API_BASE}/taxonomy/categories`, {
        cache: 'no-store',
      }),
      fetch(`${API_BASE}/taxonomy/subcategories`, {
        cache: 'no-store',
      }),
    ]);

    const [examsData, categoriesData, subcategoriesData] = await Promise.all([
      examsRes.ok ? examsRes.json() : { data: [], total: 0, totalPages: 0 },
      categoriesRes.ok ? categoriesRes.json() : { data: [] },
      subcategoriesRes.ok ? subcategoriesRes.json() : { data: [] },
    ]);

    const rawExams: Exam[] = Array.isArray(examsData?.data) ? examsData.data : [];
    const exams = [...rawExams].sort(
      (a, b) =>
        new Date(b.created_at || b.updated_at || '').getTime() -
        new Date(a.created_at || a.updated_at || '').getTime()
    );

    const rawCategories: Category[] = Array.isArray(categoriesData?.data)
      ? categoriesData.data
      : [];
    const categories = rawCategories
      .filter((c) => c.is_active !== false)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    const subcategories: Subcategory[] = (
      Array.isArray(subcategoriesData?.data) ? subcategoriesData.data : []
    ).filter((s: Subcategory) => s.name);

    return {
      exams,
      categories,
      subcategories,
      total: examsData?.total ?? 0,
      totalPages: examsData?.totalPages ?? 1,
    };
  } catch {
    return { exams: [], categories: [], subcategories: [], total: 0, totalPages: 1 };
  }
}

export default async function PreviousYearPapersPage() {
  const initialData = await fetchInitialData();

  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Previous Year Papers - Bharat Mock',
    description: 'Practice with previous year question papers for competitive exams. SSC, Banking, Railways, UPSC and more.',
    url: `${SITE_URL}/previous-year-papers`,
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
          name: 'Previous Year Papers',
          item: `${SITE_URL}/previous-year-papers`,
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
      <ServerPreviousYearPapers
        exams={initialData.exams}
        categories={initialData.categories}
        subcategories={initialData.subcategories}
        total={initialData.total}
      />
      <PreviousYearPapersClient initialData={initialData} />
      <PreviousYearPapersFAQ />
    </>
  );
}
