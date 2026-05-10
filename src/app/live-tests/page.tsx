import LiveTestsClient from './LiveTestsClient';
import type { Exam } from '@/types';
import type { Category } from '@/lib/api/taxonomyService';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : 'http://localhost:8000/api/v1';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function fetchInitialData() {
  try {
    const [examsRes, categoriesRes] = await Promise.all([
      fetch(`${API_BASE}/exams?status=upcoming&exam_type=all&limit=100`, {
        cache: 'no-store',
      }),
      fetch(`${API_BASE}/taxonomy/categories`, {
        cache: 'no-store',
      }),
    ]);

    const [examsData, categoriesData] = await Promise.all([
      examsRes.ok ? examsRes.json() : { data: [] },
      categoriesRes.ok ? categoriesRes.json() : { data: [] },
    ]);

    const rawExams: Exam[] = Array.isArray(examsData?.data) ? examsData.data : [];
    // Keep only scheduled (windowed) exams — exclude anytime/open exams
    const exams = rawExams.filter((exam) => !exam.allow_anytime && exam.status !== 'anytime');

    const rawCategories: Category[] = Array.isArray(categoriesData?.data)
      ? categoriesData.data
      : [];
    const categories = rawCategories
      .filter((c) => c.is_active !== false)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    return { exams, categories };
  } catch {
    return { exams: [], categories: [] };
  }
}

export default async function LiveTestsPage() {
  const initialData = await fetchInitialData();

  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Live Tests - Bharat Mock',
    description: 'Join live mock tests with real-time competition and live leaderboards. SSC, Banking, Railways, UPSC and more.',
    url: `${SITE_URL}/live-tests`,
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
          name: 'Live Tests',
          item: `${SITE_URL}/live-tests`,
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
      <LiveTestsClient initialData={initialData} />
    </>
  );
}
