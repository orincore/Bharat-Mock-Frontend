import { apiClient } from './client';
import { RefundPolicyData } from '@/types';

export const refundService = {
  async getRefundPolicy(): Promise<RefundPolicyData> {
    const response = await apiClient.get<{ success: boolean; data: RefundPolicyData }>('/refund-policy');
    return response.data;
  }
};