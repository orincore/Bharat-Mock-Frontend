import { apiClient } from './client';

export interface ActivityLog {
  id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  user_avatar_url: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ActivityLogsResponse {
  success: boolean;
  logs: ActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ActivityStatsResponse {
  success: boolean;
  stats: {
    total_activities: number;
    active_users: number;
    last_24h: number;
    last_7d: number;
    last_30d: number;
  };
  topActions: Array<{
    action: string;
    count: number;
  }>;
}

export const activityLogService = {
  buildQueryString(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
  }): string {
    if (!params) return '';
    const searchParams = new URLSearchParams();

    if (params.page !== undefined) searchParams.set('page', params.page.toString());
    if (params.limit !== undefined) searchParams.set('limit', params.limit.toString());
    if (params.userId) searchParams.set('userId', params.userId);
    if (params.action) searchParams.set('action', params.action);
    if (params.resourceType) searchParams.set('resourceType', params.resourceType);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);

    const query = searchParams.toString();
    return query ? `?${query}` : '';
  },

  async getActivityLogs(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ActivityLogsResponse> {
    const query = activityLogService.buildQueryString(params);
    return apiClient.get(`/activity/logs${query}`, true);
  },

  async getRecentActivity(limit: number = 10): Promise<{ success: boolean; logs: ActivityLog[] }> {
    const query = activityLogService.buildQueryString({ limit });
    return apiClient.get(`/activity/logs/recent${query}`, true);
  },

  async getActivityStats(): Promise<ActivityStatsResponse> {
    return apiClient.get('/activity/logs/stats', true);
  },

  async cleanupOldLogs(): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/activity/logs/cleanup', undefined, true);
  }
};
