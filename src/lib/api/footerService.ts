import { apiClient } from './client';
import { FooterLink } from '@/types';

export const footerService = {
  async getFooterLinks(): Promise<FooterLink[]> {
    const response = await apiClient.get<{ success: boolean; data: FooterLink[] }>('/footer');
    return response.data;
  }
};
