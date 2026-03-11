import { apiClient } from './client';
import { CurrentAffairsPayload, CurrentAffairsSettings, CurrentAffairsVideo, CurrentAffairsQuizLink } from './currentAffairsService';

interface SettingsResponse {
  success: boolean;
  data: CurrentAffairsSettings;
}

interface PageResponse {
  success: boolean;
  data: CurrentAffairsPayload;
}

interface VideoResponse {
  success: boolean;
  data: CurrentAffairsVideo;
}

interface VideoListResponse {
  success: boolean;
  data: CurrentAffairsVideo[];
}

interface UploadResponse {
  success: boolean;
  file_url: string;
  file_key?: string;
}

interface QuizResponse {
  success: boolean;
  data: CurrentAffairsQuizLink;
}

interface QuizListResponse {
  success: boolean;
  data: CurrentAffairsQuizLink[];
}

export const adminCurrentAffairsService = {
  async getPage(): Promise<CurrentAffairsPayload> {
    const response = await apiClient.get<PageResponse>('/current-affairs', true);
    return response.data;
  },

  async getSettings(): Promise<CurrentAffairsSettings> {
    const response = await apiClient.get<SettingsResponse>('/current-affairs/settings', true);
    return response.data;
  },

  async updateSettings(payload: Partial<CurrentAffairsSettings>): Promise<CurrentAffairsSettings> {
    const response = await apiClient.put<SettingsResponse>('/current-affairs/settings', payload, true);
    return response.data;
  },

  async listVideos(): Promise<CurrentAffairsVideo[]> {
    const response = await apiClient.get<VideoListResponse>('/current-affairs/videos', true);
    return response.data;
  },

  async createVideo(payload: Partial<CurrentAffairsVideo>): Promise<CurrentAffairsVideo> {
    const response = await apiClient.post<VideoResponse>('/current-affairs/videos', payload, true);
    return response.data;
  },

  async updateVideo(id: string, payload: Partial<CurrentAffairsVideo>): Promise<CurrentAffairsVideo> {
    const response = await apiClient.put<VideoResponse>(`/current-affairs/videos/${id}`, payload, true);
    return response.data;
  },

  async deleteVideo(id: string): Promise<void> {
    await apiClient.delete(`/current-affairs/videos/${id}`, true);
  },

  async uploadVideoAsset(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('video', file);
    const response = await apiClient.postFormData<UploadResponse>('/current-affairs/videos/upload', formData, true);
    if (!response.success || !response.file_url) {
      throw new Error('Video upload failed');
    }
    return response.file_url;
  },

  async uploadThumbnailAsset(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.postFormData<UploadResponse>('/current-affairs/videos/upload-thumbnail', formData, true);
    if (!response.success || !response.file_url) {
      throw new Error('Thumbnail upload failed');
    }
    return response.file_url;
  },

  async listQuizzes(): Promise<CurrentAffairsQuizLink[]> {
    const response = await apiClient.get<QuizListResponse>('/current-affairs/quizzes', true);
    return response.data;
  },

  async createQuiz(payload: { examId: string; highlightLabel?: string; summary?: string; tag?: string; badge?: string; isPublished?: boolean; displayOrder?: number }): Promise<CurrentAffairsQuizLink> {
    const response = await apiClient.post<QuizResponse>('/current-affairs/quizzes', payload, true);
    return response.data;
  },

  async updateQuiz(id: string, payload: Partial<{ examId: string; highlightLabel: string | null; summary: string | null; tag: string | null; badge: string | null; isPublished: boolean; displayOrder: number }>): Promise<CurrentAffairsQuizLink> {
    const response = await apiClient.put<QuizResponse>(`/current-affairs/quizzes/${id}`, payload, true);
    return response.data;
  },

  async deleteQuiz(id: string): Promise<void> {
    await apiClient.delete(`/current-affairs/quizzes/${id}`, true);
  }
};
