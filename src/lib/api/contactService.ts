import { apiClient } from './client';
import { ContactInfo } from '@/types';

export const contactService = {
  async getContactInfo(): Promise<ContactInfo | null> {
    const response = await apiClient.get<{ success: boolean; data: ContactInfo | null }>('/contact');
    return response.data;
  }
};
