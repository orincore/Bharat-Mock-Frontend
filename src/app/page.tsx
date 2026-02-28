import type { Metadata } from "next";
import Index from "@/pages/Index";
import { HomepageHero, HomepageData } from "@/lib/api/homepageService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
const DEFAULT_TITLE = "Bharat Mock — India's Smart Exam Companion";
const DEFAULT_DESCRIPTION =
  "Practice adaptive mock tests, explore govt exam resources, and stay ahead with Bharat Mock.";

async function fetchHomepageData(): Promise<HomepageData | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/homepage/data`, {
      cache: 'no-store',
      next: { revalidate: 0 }
    });
    if (!response.ok) {
      throw new Error(`Failed to load homepage data: ${response.status}`);
    }
    const payload = await response.json();
    return payload?.data ?? null;
  } catch (error) {
    console.error("Failed to fetch homepage data", error);
    return null;
  }
}

const parseRobots = (value?: string) => {
  const normalized = value?.toLowerCase?.() ?? "index,follow";
  const index = !normalized.includes("noindex");
  const follow = !normalized.includes("nofollow");
  return { index, follow };
};

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchHomepageData();
  const hero = data?.hero;
  const robots = parseRobots(hero?.robots_meta);

  return {
    title: hero?.meta_title || hero?.title || DEFAULT_TITLE,
    description: hero?.meta_description || hero?.description || DEFAULT_DESCRIPTION,
    alternates: hero?.canonical_url ? { canonical: hero.canonical_url } : undefined,
    robots,
    openGraph: {
      title: hero?.og_title || hero?.meta_title || hero?.title || DEFAULT_TITLE,
      description: hero?.og_description || hero?.meta_description || hero?.description || DEFAULT_DESCRIPTION,
      url: hero?.canonical_url || "https://bharatmock.com",
      type: "website",
      images: hero?.og_image_url ? [hero.og_image_url] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title: hero?.og_title || hero?.meta_title || hero?.title || DEFAULT_TITLE,
      description: hero?.og_description || hero?.meta_description || hero?.description || DEFAULT_DESCRIPTION,
      images: hero?.og_image_url ? [hero.og_image_url] : undefined
    }
  };
}

export default async function HomePage() {
  const data = await fetchHomepageData();
  return <Index initialHero={data?.hero ?? null} initialData={data} />;
}
