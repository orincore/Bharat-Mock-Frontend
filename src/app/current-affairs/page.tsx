import type { Metadata } from 'next';
import CurrentAffairsClient from './CurrentAffairsClient';
import ServerCurrentAffairs from './ServerCurrentAffairs';
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
    title: "Daily Current Affairs 2026 | BharatMock",
    description: "Daily GK capsules, quizzes, notes and video explainers for SSC, Banking, Railway & UPSC exam preparation.",
    url: `${SITE_URL}/current-affairs`,
    type: "website",
    siteName: "BharatMock",
    images: [{ url: `${SITE_URL}/assets/login_banner_image.jpg`, width: 1200, height: 630, alt: "BharatMock Current Affairs" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Current Affairs 2026 | BharatMock",
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Daily Current Affairs — BharatMock',
    description: 'Daily GK capsules, quizzes, notes and video explainers for competitive exam preparation.',
    url: `${SITE_URL}/current-affairs`,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Current Affairs', item: `${SITE_URL}/current-affairs` },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ServerCurrentAffairs data={data} />
      <CurrentAffairsClient initialData={data} />
      <CurrentAffairsFAQ />
    </>
  );
}
