import { apiClient } from './client';
import { PrivacyPolicyData } from '@/types';

export const privacyService = {
  async getPrivacyPolicy(): Promise<PrivacyPolicyData> {
    const response = await apiClient.get<{ success: boolean; data: PrivacyPolicyData }>('/privacy');
    return response.data;
  }
};
