import { apiClient } from './client';
import { NavigationLink } from '@/types';

export const navigationService = {
  async getNavigationLinks(): Promise<NavigationLink[]> {
    const response = await apiClient.get<{ success: boolean; data: NavigationLink[] }>('/navigation');
    return response.data;
  }
};
