import type { Metadata } from 'next';
import PreviousYearPapersClient from './PreviousYearPapersClient';
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
    title: "Previous Year Question Papers",
    description: "Practice previous year question papers for 100+ government exams including SSC, Banking, Railway and Police.",
    url: "https://bharatmock.com/previous-year-papers",
    type: "website",
    siteName: "BharatMock",
    images: [{ url: "/assets/login_banner_image.jpg", width: 1200, height: 630, alt: "BharatMock Previous Year Papers" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Previous Year Question Papers",
    description: "Practice previous year papers for SSC, Banking, Railway & Police exams. Understand real exam patterns.",
    images: ["/assets/login_banner_image.jpg"],
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : '';

async function fetchInitialData() {
  try {
    const [examsRes, categoriesRes, subcategoriesRes, sectionsRes, topicsRes] = await Promise.all([
      fetch(`${API_BASE}/exams?exam_type=past_paper&page=1&limit=30`, { cache: 'no-store' }),
      fetch(`${API_BASE}/taxonomy/categories`, { cache: 'no-store' }),
      fetch(`${API_BASE}/taxonomy/subcategories`, { cache: 'no-store' }),
      fetch(`${API_BASE}/paper-sections`, { cache: 'no-store' }),
      fetch(`${API_BASE}/paper-sections/topics`, { cache: 'no-store' }),
    ]);

    const [examsData, categoriesData, subcategoriesData, sectionsData, topicsData] = await Promise.all([
      examsRes.ok ? examsRes.json() : { data: [], total: 0, totalPages: 0 },
      categoriesRes.ok ? categoriesRes.json() : { data: [] },
      subcategoriesRes.ok ? subcategoriesRes.json() : { data: [] },
      sectionsRes.ok ? sectionsRes.json() : undefined,
      topicsRes.ok ? topicsRes.json() : undefined,
    ]);

    // The exams endpoint returns a "difficulties" facet scoped to the current query
    // (here: the unfiltered past_paper listing) — no more separate global
    // /taxonomy/difficulties call, which used to return every difficulty on the
    // platform regardless of category/subcategory.
    const difficultiesData = Array.isArray(examsData?.difficulties) ? examsData.difficulties : undefined;

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

    const toArr = (val: any) => val === undefined ? undefined : (Array.isArray(val?.data) ? val.data : (Array.isArray(val) ? val : []));

    return {
      exams,
      categories,
      subcategories,
      difficulties: toArr(difficultiesData),
      sections: toArr(sectionsData),
      topics: toArr(topicsData),
      total: examsData?.total ?? 0,
      totalPages: examsData?.totalPages ?? 1,
    };
  } catch {
    return { exams: [], categories: [], subcategories: [], total: 0, totalPages: 1 };
  }
}

export default async function PreviousYearPapersPage() {
  const { difficulties, sections, topics, ...initialData } = await fetchInitialData();

  // Generate JSON-LD structured data
  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Previous Year Papers',
    url: 'https://bharatmock.com/previous-year-papers',
    description:
      'Download the latest SSC, Railway, Banking, Police, Defence, and other competitive exam previous year question papers with solutions and practice PDFs.',
    publisher: {
      '@type': 'Organization',
      name: 'BharatMock',
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://bharatmock.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Previous Year Papers',
        item: 'https://bharatmock.com/previous-year-papers',
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Where can I find previous year question papers for all government exams?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can find previous year question papers for government exams on Bharat Mock. Some papers are free to access, while others are premium.',
        },
      },
      {
        '@type': 'Question',
        name: 'How often are new papers added to Bharat Mock?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'New papers are added regularly, especially after major government exams are conducted. In addition, the archive is kept updated, so aspirants always have access to the latest papers.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which exams are covered on Bharat Mock?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We cover 70+ government exams. For example, SSC CGL, SSC CHSL, SSC MTS, IBPS PO, SBI Clerk, RBI Grade B, Railway NTPC, Railway Group D, Police Bharti, and many more.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are SSC previous year question papers available with solutions?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, they are. In fact, all SSC previous year question papers come with full solutions and detailed explanations, so you understand the concept, not just the answer.',
        },
      },
      {
        '@type': 'Question',
        name: "Can I get the bank's previous year question papers on Bharat Mock?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Yes, absolutely. You can access the bank's previous year question papers for IBPS PO, SBI Clerk, SBI PO, RBI Grade B, IBPS Clerk, and other banking exams in one place.",
        },
      },
      {
        '@type': 'Question',
        name: 'Is there an SSC previous year question paper in Hindi PDF available?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. We provide SSC previous year question papers in both Hindi and English. So, if you are preparing in Hindi medium, you can easily access bilingual papers and solutions.',
        },
      },
      {
        '@type': 'Question',
        name: 'How many years of previous year papers are available on Bharat Mock?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'For the most popular exams, we offer multiple years of papers. In fact, for exams such as SSC CGL, you can find papers from the last 5-6 years, and for IBPS PO, you can find papers from the last 5 years.',
        },
      },
      {
        '@type': 'Question',
        name: "Are the railway's previous year question papers available on Bharat Mock?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, they are. You can find Railway NTPC, Railway Group D, and ALP previous year question papers with complete solutions in both Hindi and English.',
        },
      },
      {
        '@type': 'Question',
        name: 'Why are some PYQs paid?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Some PYQs are paid as they are more organised and have verified solutions. This allows serious students to practice in a more structured manner.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is it worth buying paid PYQs?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, it is. Paid PYQs give you better practice quality and help you understand real exam patterns more clearly, which improves your preparation.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I use both free and paid PYQs together?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Yes, and that's a good idea. Free papers give you some basic preparation, and paid papers enhance your practice and understanding.",
        },
      },
      {
        '@type': 'Question',
        name: 'Are paid PYQs updated regularly?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Yes, they are regularly updated with the latest exam pattern and trends, so you don't miss out on any important information.",
        },
      },
      {
        '@type': 'Question',
        name: 'How do I access paid question papers?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Once your payment is completed, the paid PYQs are unlocked instantly. After that, you can access them anytime from your account.',
        },
      },
      {
        '@type': 'Question',
        name: 'What do I get in paid PYQs?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'With paid PYQs, you get well-organised question papers, detailed solutions, and exam-focused practice sets that make your preparation clearer and more effective.',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PreviousYearPapersClient initialData={initialData} initialDifficulties={difficulties} initialSections={sections} initialTopics={topics} />
      <PreviousYearPapersFAQ />
    </>
  );
}
