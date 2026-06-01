import type { Metadata } from 'next';
import CurrentAffairsClient from './CurrentAffairsClient';
import { CurrentAffairsFAQ } from './CurrentAffairsFAQ';
import type { CurrentAffairsPayload } from '@/lib/api/currentAffairsService';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : '';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bharatmock.com';

export const metadata: Metadata = {
  title: "Current Affairs 2026 for All Govt Exams: Latest News & Updates",
  description: "Stay updated with daily current affairs for all government exams. Get latest news, important updates, and boost your exam preparation.",
  keywords: "Current affairs, current affairs today, current affairs in india, current affairs in hindi, current affairs quiz, latest current affairs monthly current affairs",
  alternates: {
    canonical: `${SITE_URL}/current-affairs`,
  },
  openGraph: {
    title: "Daily Current Affairs 2026",
    description: "Daily GK capsules, quizzes, notes and video explainers for SSC, Banking, Railway & UPSC exam preparation.",
    url: `${SITE_URL}/current-affairs`,
    type: "website",
    siteName: "BharatMock",
    images: [{ url: `${SITE_URL}/assets/login_banner_image.jpg`, width: 1200, height: 630, alt: "BharatMock Current Affairs" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Current Affairs 2026",
    description: "Daily GK capsules, quizzes, notes and video explainers for competitive exam preparation.",
    images: [`${SITE_URL}/assets/login_banner_image.jpg`],
  },
};

async function fetchCurrentAffairsData(): Promise<CurrentAffairsPayload | null> {
  try {
    const res = await fetch(`${API_BASE}/current-affairs`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export default async function CurrentAffairsPage() {
  const data = await fetchCurrentAffairsData();

  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Current Affairs',
    url: 'https://bharatmock.com/current-affairs',
    description:
      'Stay updated with daily current affairs for SSC, Banking, Police, UPSC, Railway & other exams with important news, GK updates, and exam-focused insights.',
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
        name: 'Current Affairs',
        item: 'https://bharatmock.com/current-affairs',
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the best way to read daily current affairs for competitive exams?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "The best approach is a focused daily routine instead of reading everything. Spend 15-20 minutes on today's current affairs with important topics. Then take a quiz to test what you remember. Consistency beats last-minute revision.",
        },
      },
      {
        '@type': 'Question',
        name: 'How many months of current affairs are important for exams?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Most competitive exams focus on the last six months of current affairs in India, making it the most important preparation window.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a current affairs quiz available for today?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, a daily quiz is available based on the latest updates. It will allow you to assess your knowledge and prepare you for the exam.',
        },
      },
      {
        '@type': 'Question',
        name: 'What topics are covered in current affairs?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'It covers national and international news, economy, science, sports, government schemes and other major events.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the difference between the latest and the last six months of current affairs?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Latest current affairs cover daily updates, while the last six months provide a complete revision set, important for exams.',
        },
      },
      {
        '@type': 'Question',
        name: 'How can I improve speed in solving current affairs questions?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Speed improves with regular practice. Daily quizzes train your brain to recall information faster and help you answer questions within a limited time frame during exams.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I rely only on monthly current affairs PDFs?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No, monthly PDFs are best for revision, but daily learning and quizzes are necessary for continuous understanding and retention.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I practice quizzes based on specific topics?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, you can choose topic-wise quizzes to focus on weak areas and improve your understanding step by step.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do current affairs help in competitive exam selection?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Current affairs enhance your general awareness marks - important for clearing the cut-off of most government exams.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the biggest mistake students make in current affairs preparation?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "The common mistake is to read too much without revising it or quiz questions. If you don't revise or practice quizzes, you will forget the information quickly.",
        },
      },
      {
        '@type': 'Question',
        name: 'How can quizzes improve current affairs preparation?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Quizzes make passive learning active. They instantly test your memory retention and help you identify the gaps, which help focus your revision in a better way.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are current affairs enough for scoring well in the general awareness sections?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Current affairs are very important, but they should be complemented by static GK. They cater to 80 to 90% of the general awareness section of competitive exams.',
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
      <CurrentAffairsClient initialData={data} />
      <CurrentAffairsFAQ />
    </>
  );
}
