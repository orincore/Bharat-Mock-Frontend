import { apiClient } from './client';
import { AboutPageData } from '@/types';

export const aboutService = {
  async getAbout(): Promise<AboutPageData> {
    const response = await apiClient.get<{ success: boolean; data: AboutPageData }>('/about');
    return response.data;
  }
};
