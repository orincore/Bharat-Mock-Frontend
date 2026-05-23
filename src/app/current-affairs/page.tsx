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
  title: "Daily Current Affairs 2026 — GK Quizzes, Notes & Videos | BharatMock",
  description: "Stay updated with daily current affairs for SSC, Banking, Railway & UPSC exams. Read today's GK capsules, take daily quizzes, and download monthly PDFs — all free on BharatMock.",
  keywords: "daily current affairs, current affairs 2026, current affairs for SSC, current affairs for IBPS, GK quiz today, monthly current affairs PDF",
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
      <CurrentAffairsClient initialData={data} />
      <CurrentAffairsFAQ />
    </>
  );
}
