import { apiClient } from './client';
import { DisclaimerData } from '@/types';

export const disclaimerService = {
  async getDisclaimer(): Promise<DisclaimerData> {
    const response = await apiClient.get<{ success: boolean; data: DisclaimerData }>('/disclaimer');
    return response.data;
  }
};
