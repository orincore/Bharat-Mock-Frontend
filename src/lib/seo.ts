import { Metadata } from 'next';

const SITE_NAME = 'BharatMock';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bharatmock.com').replace(/\/$/, '');
const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/login_banner_image.jpg`;

export interface SEOProps {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  noIndex?: boolean;
  keywords?: string[];
}

function sanitizeTitle(title: string) {
  return title.replace(/^\s*BharatMock\s*\|\s*/i, '').trim();
}

export function buildMetadata({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  noIndex = false,
  keywords = [],
}: SEOProps): Metadata {
  const normalizedTitle = sanitizeTitle(title);
  const fullTitle = normalizedTitle.endsWith(` | ${SITE_NAME}`)
    ? normalizedTitle
    : `${normalizedTitle} | ${SITE_NAME}`;
  const canonicalUrl = canonical.startsWith('http') ? canonical : `${SITE_URL}${canonical}`;

  return {
    title: fullTitle,
    description,
    ...(keywords.length && { keywords: keywords.join(', ') }),
    authors: [{ name: SITE_NAME }],
    robots: noIndex ? 'noindex, nofollow' : 'index, follow',
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: normalizedTitle,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: normalizedTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: normalizedTitle,
      description,
      images: [ogImage],
      site: '@BharatMock',
    },
  };
}

export function buildExamMetadata(exam: {
  name: string;
  slug: string;
  year?: number;
  description?: string;
  ogImage?: string;
}): Metadata {
  const year = exam.year || new Date().getFullYear();
  return buildMetadata({
    title: `${exam.name} ${year} — Complete Guide, Syllabus & Mock Tests`,
    description:
      exam.description ||
      `Get complete ${exam.name} ${year} details: exam dates, syllabus, eligibility, cut-off, and free mock tests. Prepare smart with BharatMock.`,
    canonical: `/${exam.slug}`,
    ogImage: exam.ogImage,
    keywords: [
      exam.name,
      `${exam.name} ${year}`,
      `${exam.name} syllabus`,
      `${exam.name} mock test`,
      `${exam.name} eligibility`,
    ],
  });
}

export function buildSubTabMetadata(
  exam: { name: string; slug: string },
  tab: { name: string; slug: string; description?: string }
): Metadata {
  const year = new Date().getFullYear();
  return buildMetadata({
    title: `${exam.name} ${tab.name} ${year}`,
    description:
      tab.description ||
      `${exam.name} ${tab.name} ${year}: Latest updates, official information, and preparation tips on BharatMock.`,
    canonical: `/${exam.slug}/${tab.slug}`,
    keywords: [`${exam.name} ${tab.name}`, `${exam.name} ${tab.name} ${year}`],
  });
}
