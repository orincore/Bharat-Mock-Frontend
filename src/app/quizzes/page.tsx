import type { Metadata } from 'next';
import QuizzesClient from './QuizzesClient';
import { QuizzesFAQ } from './QuizzesFAQ';
import type { Exam } from '@/types';

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

async function fetchInitialData() {
  try {
    const [examsRes, difficultiesRes] = await Promise.all([
      // Quizzes enriched with their Test Series section/topic names so the client
      // can group them (Section tabs → Topic pills, pooled across series).
      fetch(`${API_BASE}/exams/quizzes-grouped?limit=1000`, { cache: 'no-store' }),
      fetch(`${API_BASE}/taxonomy/difficulties`, { cache: 'no-store' }),
    ]);

    const [examsData, difficultiesData] = await Promise.all([
      examsRes.ok ? examsRes.json() : { data: [] },
      difficultiesRes.ok ? difficultiesRes.json() : undefined,
    ]);

    const exams: Exam[] = Array.isArray(examsData?.data) ? examsData.data : [];

    // undefined if fetch failed → client will fetch its own difficulties
    const difficulties = difficultiesData === undefined
      ? undefined
      : (Array.isArray(difficultiesData?.data) ? difficultiesData.data : (Array.isArray(difficultiesData) ? difficultiesData : []));

    return { exams, difficulties, total: exams.length };
  } catch {
    return { exams: [], total: 0 };
  }
}

export default async function QuizzesPage() {
  const { difficulties, ...initialData } = await fetchInitialData();

  // Generate JSON-LD structured data
  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Quizzes',
    url: 'https://bharatmock.com/quizzes',
    description:
      'Practice quizzes for SSC, Banking, Railway, Police, UPSC, and more with instant results, detailed solutions, rankings, and smart performance analysis.',
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
        name: 'Quizzes',
        item: 'https://bharatmock.com/quizzes',
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How is a quiz different from a full mock test?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A mock test covers the full paper in one go. A quiz is shorter, more specific to one topic or subject and gives you faster feedback.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I filter quizzes by exam and difficulty?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. You can pick quizzes by type of exam, topic, difficulty and language. From a basic railway quiz to a complex banking quiz on Data Interpretation, you can choose the quiz you want.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are there quizzes for current affairs and GK?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Current Affairs Quizzes are published every day, so you can keep up-to-date with news and events without having to read a newspaper.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are police quiz questions based on state-specific patterns?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. We offer state paper pattern police quizzes for various topics like General knowledge, reasoning, current affairs, in the same pattern you will get in your state exam.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are quizzes updated after every official exam notification?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Whenever a new notification is released or an exam pattern changes, our team updates the relevant quiz sets within a few days. This ensures your practice always matches the latest exam trends.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I attempt quizzes on my mobile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'All quizzes are mobile-friendly. You can take any quiz on any device, anywhere and anytime you want.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I get answers and explanations after the quiz?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. With all quizzes, explanations are provided to understand the concepts, and hence improve your performance.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are quizzes available in Hindi and English?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, all quizzes are in Hindi and English. This ensures students are well prepared for bilingual exams.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are SSC quiz questions based on previous year papers?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. SSC quiz questions are set according to previous year papers of SSC CGL, CHSL, and MTS, so you get to practice actual exam questions.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I prepare for multiple exams at the same time on Bharat Mock?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. You can practice the SSC quiz, the banking quiz, and the railway quiz in one account, and it will track your score.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are quizzes enough, or do I need mock tests too?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Both are important. Practice quizzes help to learn new things fast, while mock tests give you an idea of how ready you are for the exam. Both are best.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I attempt quizzes without creating an account?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "You can view the quizzes, but to save time and progress to track your improvement and build your own personal weak area list while you revise, you will need to register (it's free).",
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
      <QuizzesClient initialData={initialData} initialDifficulties={difficulties} />
      <QuizzesFAQ />
    </>
  );
}
