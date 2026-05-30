import type { Metadata } from 'next';
import QuizzesClient from './QuizzesClient';
import { QuizzesFAQ } from './QuizzesFAQ';
import type { Exam } from '@/types';
import type { Category, Subcategory } from '@/lib/api/taxonomyService';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Attempt and Practice Topic Wise Quizzes for All Government Exams",
  description: "Practice topic-wise quizzes for all government exams. Improve accuracy, strengthen concepts, and track your performance with smart practice.",
  keywords: "SSC quiz, banking quiz, ssc english quiz banking quiz questions, Railway quiz, Police quiz",
  alternates: {
    canonical: "https://bharatmock.com/quizzes",
  },
  openGraph: {
    title: "Free Daily Quizzes 2026",
    description: "Short daily quizzes on GK, current affairs and aptitude for SSC, Banking, Railway & Police exam preparation.",
    url: "https://bharatmock.com/quizzes",
    type: "website",
    siteName: "BharatMock",
    images: [{ url: "/assets/login_banner_image.jpg", width: 1200, height: 630, alt: "BharatMock Daily Quizzes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Daily Quizzes 2026",
    description: "Practice daily GK and aptitude quizzes for government exam preparation. Free and targeted.",
    images: ["/assets/login_banner_image.jpg"],
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : '';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bharatmock.com';

async function fetchInitialData() {
  try {
    const [examsRes, categoriesRes, subcategoriesRes, difficultiesRes] = await Promise.all([
      fetch(`${API_BASE}/exams?exam_type=short_quiz&page=1&limit=12`, { cache: 'no-store' }),
      fetch(`${API_BASE}/taxonomy/categories`, { cache: 'no-store' }),
      fetch(`${API_BASE}/taxonomy/subcategories`, { cache: 'no-store' }),
      fetch(`${API_BASE}/taxonomy/difficulties`, { cache: 'no-store' }),
    ]);

    const [examsData, categoriesData, subcategoriesData, difficultiesData] = await Promise.all([
      examsRes.ok ? examsRes.json() : { data: [], pagination: { total: 0, totalPages: 0 } },
      categoriesRes.ok ? categoriesRes.json() : { data: [] },
      subcategoriesRes.ok ? subcategoriesRes.json() : { data: [] },
      difficultiesRes.ok ? difficultiesRes.json() : undefined,
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

    // undefined if fetch failed → client will fetch its own difficulties
    const difficulties = difficultiesData === undefined
      ? undefined
      : (Array.isArray(difficultiesData?.data) ? difficultiesData.data : (Array.isArray(difficultiesData) ? difficultiesData : []));

    return {
      exams,
      categories,
      subcategories,
      difficulties,
      total: examsData?.pagination?.total ?? 0,
      totalPages: examsData?.pagination?.totalPages ?? 1,
    };
  } catch {
    return { exams: [], categories: [], subcategories: [], total: 0, totalPages: 1 };
  }
}

export default async function QuizzesPage() {
  const { difficulties, ...initialData } = await fetchInitialData();

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
      <QuizzesClient initialData={initialData} initialDifficulties={difficulties} />
      <QuizzesFAQ />
    </>
  );
}
