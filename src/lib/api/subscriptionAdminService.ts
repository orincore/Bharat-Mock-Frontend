import { apiClient } from './client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  duration_days: number;
  price_cents: number;
  currency_code: string;
  is_active: boolean;
  features?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionPlanPayload {
  name: string;
  slug: string;
  description?: string;
  duration_days: number;
  price_cents: number;
  currency_code?: string;
  features?: string[];
}

export interface Promocode {
  id: string;
  code: string;
  description?: string;
  discount_type: 'fixed' | 'percent';
  discount_value: number;
  max_redemptions?: number | null;
  redemptions_count: number;
  min_amount_cents?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  auto_renew_only: boolean;
  applicable_plan_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface PromocodePayload {
  code?: string;
  description?: string;
  discount_type?: 'fixed' | 'percent';
  discount_value?: number;
  max_redemptions?: number | null;
  min_amount_cents?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  auto_renew_only?: boolean;
  plan_ids?: string[];
}

export interface SubscriptionTransaction {
  id: string;
  user_id: string;
  plan_id: string;
  promocode_id?: string | null;
  auto_renew: boolean;
  status: 'active' | 'expired' | 'canceled' | 'pending';
  amount_cents: number;
  currency_code: string;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  created_at?: string;
  started_at?: string | null;
  expires_at?: string | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  plan?: Pick<SubscriptionPlan, 'id' | 'name' | 'price_cents' | 'currency_code'>;
  promocode?: {
    id: string;
    code: string;
    discount_type: 'fixed' | 'percent';
    discount_value: number;
  } | null;
}

export interface TransactionQueryParams {
  status?: string;
  planId?: string;
  search?: string;
  limit?: number;
}

const asData = <T>(response: { success: boolean; data: T }): T => response.data;

export const subscriptionAdminService = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    const response = await apiClient.get<{ success: boolean; data: SubscriptionPlan[] }>(
      '/subscriptions/admin/plans',
      true
    );
    return asData(response);
  },

  async createPlan(payload: SubscriptionPlanPayload): Promise<SubscriptionPlan> {
    const response = await apiClient.post<{ success: boolean; data: SubscriptionPlan }>(
      '/subscriptions/admin/plans',
      payload,
      true
    );
    return asData(response);
  },

  async updatePlan(planId: string, payload: Partial<SubscriptionPlanPayload>): Promise<SubscriptionPlan> {
    const response = await apiClient.put<{ success: boolean; data: SubscriptionPlan }>(
      `/subscriptions/admin/plans/${planId}`,
      payload,
      true
    );
    return asData(response);
  },

  async togglePlan(planId: string, isActive: boolean): Promise<SubscriptionPlan> {
    const response = await apiClient.patch<{ success: boolean; data: SubscriptionPlan }>(
      `/subscriptions/admin/plans/${planId}/toggle`,
      { is_active: isActive },
      true
    );
    return asData(response);
  },

  async getPromocodes(): Promise<Promocode[]> {
    const response = await apiClient.get<{ success: boolean; data: Promocode[] }>(
      '/subscriptions/admin/promocodes',
      true
    );
    return asData(response);
  },

  async createPromocode(payload: Required<PromocodePayload>): Promise<Promocode> {
    const response = await apiClient.post<{ success: boolean; data: Promocode }>(
      '/subscriptions/admin/promocodes',
      payload,
      true
    );
    return asData(response);
  },

  async updatePromocode(promoId: string, payload: PromocodePayload): Promise<Promocode> {
    const response = await apiClient.put<{ success: boolean; data: Promocode }>(
      `/subscriptions/admin/promocodes/${promoId}`,
      payload,
      true
    );
    return asData(response);
  },

  async getTransactions(params: TransactionQueryParams = {}): Promise<SubscriptionTransaction[]> {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') {
      query.set('status', params.status);
    }
    if (params.planId) {
      query.set('plan_id', params.planId);
    }
    if (params.search) {
      query.set('search', params.search);
    }
    if (params.limit) {
      query.set('limit', String(params.limit));
    }

    const qs = query.toString();
    const endpoint = `/subscriptions/admin/transactions${qs ? `?${qs}` : ''}`;
    const response = await apiClient.get<{ success: boolean; data: SubscriptionTransaction[] }>(endpoint, true);
    return asData(response);
  }
};
