import QuizzesClient from './QuizzesClient';
import type { Exam } from '@/types';
import type { Category, Subcategory } from '@/lib/api/taxonomyService';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : 'http://localhost:8000/api/v1';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function fetchInitialData() {
  try {
    const [examsRes, categoriesRes, subcategoriesRes] = await Promise.all([
      fetch(`${API_BASE}/exams?exam_type=short_quiz&page=1&limit=12`, {
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
      examsRes.ok ? examsRes.json() : { data: [], pagination: { total: 0, totalPages: 0 } },
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
      total: examsData?.pagination?.total ?? 0,
      totalPages: examsData?.pagination?.totalPages ?? 1,
    };
  } catch {
    return { exams: [], categories: [], subcategories: [], total: 0, totalPages: 1 };
  }
}

export default async function QuizzesPage() {
  const initialData = await fetchInitialData();

  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Daily Quizzes - Bharat Mock',
    description: 'Practice with daily quizzes for competitive exams. SSC, Banking, Railways, UPSC and more.',
    url: `${SITE_URL}/quizzes`,
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
          name: 'Quizzes',
          item: `${SITE_URL}/quizzes`,
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
      <QuizzesClient initialData={initialData} />
    </>
  );
}
