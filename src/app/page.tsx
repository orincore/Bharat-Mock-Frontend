import type { Metadata } from "next";
import Index from "@/views/Index";
import { HomepageHero, HomepageData } from "@/lib/api/homepageService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
const DEFAULT_TITLE = "BharatMock All Govt exams  |  Mock Test & Previous Year Papers";
const DEFAULT_DESCRIPTION =
  "Get free mock tests and previous year papers for all sarkari exams on BharatMock. Practice smarter and boost your exam preparation and results.";

async function fetchHomepageData(): Promise<HomepageData | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const response = await fetch(`${API_BASE_URL}/homepage/data`, {
      cache: 'no-store',
      next: { revalidate: 0 },
      signal: controller.signal
    });
    clearTimeout(id);
    
    if (!response.ok) {
      throw new Error(`Failed to load homepage data: ${response.status}`);
    }
    const payload = await response.json();
    return payload?.data ?? null;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      console.warn("Homepage data fetch timed out - API might be slow or down");
    } else {
      console.error("Failed to fetch homepage data", error);
    }
    return null;
  }
}

const parseRobots = (value?: string | null) => {
  // Treat null/undefined/empty as index,follow — never block the homepage by default
  if (!value) return { index: true, follow: true };
  const normalized = value.toLowerCase();
  const index = !normalized.includes("noindex");
  const follow = !normalized.includes("nofollow");
  return { index, follow };
};

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchHomepageData();
  const hero = data?.hero;
  const robots = parseRobots(hero?.robots_meta);

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    keywords: "All sarkari exam, online exam test, all government exams, govt exam preparation, online exam for govt jobs, online competitive exams, government exams india",
    alternates: { canonical: hero?.canonical_url || "https://bharatmock.com" },
    robots,
    openGraph: {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      url: hero?.canonical_url || "https://bharatmock.com",
      type: "website",
      images: hero?.og_image_url ? [hero.og_image_url] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      images: hero?.og_image_url ? [hero.og_image_url] : undefined
    }
  };
}

export default async function HomePage() {
  const data = await fetchHomepageData();
  return <Index initialHero={data?.hero ?? null} initialData={data} />;
}
