import type { Metadata } from "next";
import { cache } from "react";
import Index from "@/views/Index";
import { HomepageData } from "@/lib/api/homepageService";

// Render fresh on every request so admin edits to categories / featured exams
// appear on the homepage immediately (no static/ISR HTML cache).
export const dynamic = 'force-dynamic';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const SITE_URL = "https://bharatmock.com";
const DEFAULT_TITLE = "All Govt Exams | Mock Test & Previous Year Papers";
const DEFAULT_DESCRIPTION =
  "Get free online mock tests and previous year papers for all sarkari exams on BharatMock. Practice smarter and boost your exam preparation and results.";
const DEFAULT_KEYWORDS = "All sarkari exam, online exam test, all government exams, govt exam preparation, online exam for govt jobs, online competitive exams, government exams india";
const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/login_banner_image.jpg`;

// Admin edits to categories / featured exams must reflect on the homepage
// instantly. We therefore bypass BOTH caches on these fetches:
//   1. cache: 'no-store'              → skip the Next.js Data Cache (no 1h ISR hold)
//   2. Cache-Control: no-cache header → tell the backend to skip its own cache
//      (same header the admin panel sends to read fresh data)
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
} as const;

// Wrapped in React cache() so generateMetadata() and HomePage() share a single
// backend call within the same request (no-store disables the Data Cache, but
// request-level memoization still dedupes the two callers).
const fetchHomepageData = cache(async (): Promise<HomepageData | null> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${API_BASE_URL}/homepage/data?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: NO_CACHE_HEADERS,
      signal: controller.signal
    });
    clearTimeout(id);
    if (!response.ok) throw new Error(`Failed to load homepage data: ${response.status}`);
    const payload = await response.json();
    return payload?.data ?? null;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      console.warn("Homepage data fetch timed out");
    } else {
      console.error("Failed to fetch homepage data", error);
    }
    return null;
  }
});

async function fetchMostAttemptedExams(): Promise<any[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/exams?limit=8&sortBy=attempts&sortOrder=desc&exam_type=mock_test&_t=${Date.now()}`,
      { cache: 'no-store', headers: NO_CACHE_HEADERS, signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) return [];
    const payload = await response.json();
    return (payload?.data || []).slice(0, 4);
  } catch {
    return [];
  }
}

const parseRobots = (value?: string | null) => {
  if (!value) return { index: true, follow: true };
  const normalized = value.toLowerCase();
  return {
    index: !normalized.includes("noindex"),
    follow: !normalized.includes("nofollow"),
  };
};

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchHomepageData();
  const hero = data?.hero;
  const robots = parseRobots(hero?.robots_meta);

  const title = hero?.meta_title || DEFAULT_TITLE;
  const description = hero?.meta_description || DEFAULT_DESCRIPTION;
  const canonical = hero?.canonical_url || SITE_URL;
  const ogTitle = hero?.og_title || title;
  const ogDescription = hero?.og_description || description;
  const ogImage = hero?.og_image_url || DEFAULT_OG_IMAGE;

  return {
    title: { absolute: title },
    description,
    keywords: DEFAULT_KEYWORDS,
    alternates: { canonical },
    robots,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: canonical,
      type: "website",
      siteName: "BharatMock",
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
    },
  };
}

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "BharatMock",
  url: "https://bharatmock.com/",
  logo: "https://bharatmock.com/logo.png",
  description:
    "India's trusted platform for government exam preparation, mock tests, quizzes, previous year papers, and current affairs.",
  email: "info@bharatmock.com",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-8806727785",
    contactType: "customer support",
    availableLanguage: ["English", "Hindi"],
  },
  sameAs: [
    "https://x.com/bharatmock",
    "https://www.instagram.com/bharatmock",
    "https://www.youtube.com/@bharatmock",
    "https://www.facebook.com/bharatmock",
    "https://linkedin.com/company/bharatmock",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "BharatMock",
  url: "https://bharatmock.com/",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://bharatmock.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default async function HomePage() {
  const [data, mostAttemptedExams] = await Promise.all([
    fetchHomepageData(),
    fetchMostAttemptedExams(),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <Index
        initialHero={data?.hero ?? null}
        initialData={data}
        initialMostAttemptedExams={mostAttemptedExams}
      />
    </>
  );
}
