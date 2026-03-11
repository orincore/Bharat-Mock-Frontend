import { apiClient } from './client';
import { Exam } from '@/types';

export interface CurrentAffairsSettings {
  id: string;
  heroBadge: string | null;
  heroTitle: string;
  heroSubtitle: string | null;
  heroDescription: string | null;
  heroCtaLabel: string | null;
  heroCtaUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  updatedAt: string;
}

export interface CurrentAffairsVideo {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string;
  platform: string | null;
  durationSeconds: number | null;
  tag: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  displayOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CurrentAffairsQuizExam = Partial<Exam> & { id: string; title: string };

export interface CurrentAffairsQuizLink {
  id: string;
  examId: string;
  highlightLabel: string | null;
  summary: string | null;
  badge: string | null;
  tag: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  exam: CurrentAffairsQuizExam | null;
}

export interface CurrentAffairsNoteSummary {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  featuredImageUrl?: string | null;
  publishedAt?: string | null;
  tag?: string | null;
}

export interface CurrentAffairsPayload {
  settings: CurrentAffairsSettings;
  videos: CurrentAffairsVideo[];
  quizzes: CurrentAffairsQuizLink[];
  notes: CurrentAffairsNoteSummary[];
}

export interface CurrentAffairsResponse {
  success: boolean;
  data: CurrentAffairsPayload;
}

export const currentAffairsService = {
  async getPageData(): Promise<CurrentAffairsPayload> {
    const response = await apiClient.get<CurrentAffairsResponse>('/current-affairs');
    return response.data;
  }
};
