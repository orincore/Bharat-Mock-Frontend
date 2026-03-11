import { apiClient } from './client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  duration_days: number;
  price_cents: number;
  normal_price_cents: number;
  sale_price_cents?: number | null;
  currency_code: string;
  features?: string[];
  is_active?: boolean;
}

export interface CheckoutInitialization {
  orderId: string;
  amount: number;
  currency: string;
  razorpayKey: string;
  subscriptionId: string;
  adjustedAmount?: number;
  promoDescription?: string | null;
}

export interface CheckoutPreview {
  plan: SubscriptionPlan;
  amount_cents: number;
  adjusted_amount_cents: number;
  promo?: {
    id: string;
    code: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
  } | null;
  promoDescription?: string | null;
}

const asData = <T>(response: { success: boolean; data: T }): T => response.data;

export const subscriptionService = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    console.log('[subscriptionService] Calling GET /subscriptions/plans');
    const response = await apiClient.get<{ success: boolean; data: SubscriptionPlan[] }>(
      '/subscriptions/plans'
    );
    console.log('[subscriptionService] Response:', response);
    return asData(response);
  },

  async startCheckout(payload: { plan_id: string; promo_code?: string; auto_renew?: boolean }) {
    const response = await apiClient.post<{ success: boolean; data: CheckoutInitialization }>(
      '/subscriptions/checkout/start',
      payload,
      true
    );
    return asData(response);
  },

  async previewCheckout(payload: { plan_id: string; promo_code?: string; auto_renew?: boolean }) {
    const response = await apiClient.post<{ success: boolean; data: CheckoutPreview }>(
      '/subscriptions/checkout/preview',
      payload,
      true
    );
    return asData(response);
  },

  async confirmPayment(payload: { order_id: string; payment_id: string; signature: string }) {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/subscriptions/checkout/confirm',
      payload,
      true
    );
    return response;
  },

  async toggleAutoRenew(enable: boolean) {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/subscriptions/auto-renew',
      { enable },
      true
    );
    return response;
  },

  async cancelSubscription() {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/subscriptions/cancel',
      {},
      true
    );
    return response;
  }
};
