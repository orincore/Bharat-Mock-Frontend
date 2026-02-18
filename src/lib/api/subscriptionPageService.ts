import { apiClient } from './client';

export interface SubscriptionPageSection {
  id: string;
  section_key: string;
  section_type: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  background_color?: string | null;
  text_color?: string | null;
  display_order: number;
  is_active: boolean;
  settings?: Record<string, any>;
  blocks?: SubscriptionPageBlock[];
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPageBlock {
  id: string;
  section_id: string;
  block_type: string;
  title?: string | null;
  content?: string | null;
  icon?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  link_text?: string | null;
  display_order: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPageMeta {
  id: string;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  canonical_url?: string | null;
  structured_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPageContent {
  sections: SubscriptionPageSection[];
  meta: SubscriptionPageMeta | null;
}

const asData = <T>(response: { success: boolean; data: T }): T => response.data;

export const subscriptionPageService = {
  async getPageContent(): Promise<SubscriptionPageContent> {
    const response = await apiClient.get<{ success: boolean; data: SubscriptionPageContent }>(
      '/subscription-page/content'
    );
    return asData(response);
  },

  async updateSection(id: string, data: Partial<SubscriptionPageSection>): Promise<SubscriptionPageSection> {
    const response = await apiClient.put<{ success: boolean; data: SubscriptionPageSection }>(
      `/subscription-page/sections/${id}`,
      data,
      true
    );
    return asData(response);
  },

  async createSection(data: Partial<SubscriptionPageSection>): Promise<SubscriptionPageSection> {
    const response = await apiClient.post<{ success: boolean; data: SubscriptionPageSection }>(
      '/subscription-page/sections',
      data,
      true
    );
    return asData(response);
  },

  async deleteSection(id: string): Promise<void> {
    await apiClient.delete(`/subscription-page/sections/${id}`, true);
  },

  async updateBlock(id: string, data: Partial<SubscriptionPageBlock>): Promise<SubscriptionPageBlock> {
    const response = await apiClient.put<{ success: boolean; data: SubscriptionPageBlock }>(
      `/subscription-page/blocks/${id}`,
      data,
      true
    );
    return asData(response);
  },

  async createBlock(data: Partial<SubscriptionPageBlock>): Promise<SubscriptionPageBlock> {
    const response = await apiClient.post<{ success: boolean; data: SubscriptionPageBlock }>(
      '/subscription-page/blocks',
      data,
      true
    );
    return asData(response);
  },

  async deleteBlock(id: string): Promise<void> {
    await apiClient.delete(`/subscription-page/blocks/${id}`, true);
  },

  async updateMeta(data: Partial<SubscriptionPageMeta>): Promise<SubscriptionPageMeta> {
    const response = await apiClient.put<{ success: boolean; data: SubscriptionPageMeta }>(
      '/subscription-page/meta',
      data,
      true
    );
    return asData(response);
  }
};
