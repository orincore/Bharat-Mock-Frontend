import { apiClient } from './client';

export type HeroMediaType = 'image' | 'video';

export interface HomepageHeroMediaItem {
  id?: string;
  url: string;
  asset_type?: HeroMediaType;
  headline?: string;
  description?: string;
  cta_text?: string;
  cta_url?: string;
  overlay_color?: string;
  order?: number;
  alt_text?: string;
}

export interface HomepageHero {
  id?: string;
  slug: string;
  title?: string;
  subtitle?: string;
  description?: string;
  cta_primary_text?: string;
  cta_primary_url?: string;
  cta_secondary_text?: string;
  cta_secondary_url?: string;
  media_layout?: string;
  background_video_url?: string;
  media_items?: HomepageHeroMediaItem[];
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  canonical_url?: string;
  robots_meta?: string;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HomepageSubcategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category_id: string;
  logo_url?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface HomepageCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string | null;
  display_order?: number;
  is_active?: boolean;
  subcategories: HomepageSubcategory[];
}

export type HomepageBannerPlacement = 'top' | 'mid';

export interface HomepageBanner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  button_text?: string;
  display_order: number;
  is_active: boolean;
  placement?: HomepageBannerPlacement;
}

export interface HomepageData {
  hero: HomepageHero | null;
  banners: HomepageBanner[];
  categories: HomepageCategory[];
  featuredExams: any[];
  featuredArticles: any[];
}

export const homepageService = {
  async getHero(slug = 'default'): Promise<HomepageHero | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: HomepageHero }>(`/homepage/hero/${slug}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch homepage hero:', error);
      return null;
    }
  },

  async getHomepageData(force = false): Promise<HomepageData | null> {
    try {
      const url = force ? '/homepage/data?ts=' + Date.now() : '/homepage/data';
      const response = await apiClient.get<{ success: boolean; data: HomepageData }>(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch homepage data:', error);
      return null;
    }
  }
};
