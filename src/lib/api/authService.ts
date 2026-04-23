import { apiClient } from './client';
import { User } from '@/types';

interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
    refreshToken: string;
  };
  message: string;
}

interface ProfileResponse {
  success: boolean;
  data: User;
}

export const authService = {
  async register(email: string, password: string, name: string, phone?: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
      phone
    });
    
    if (response.success && response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('refresh_token', response.data.refreshToken);
    }
    
    return response;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password
    });
    
    if (response.success && response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('refresh_token', response.data.refreshToken);
    }
    
    return response;
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get<ProfileResponse>('/auth/profile', true);
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<void> {
    await apiClient.put('/auth/profile', data, true);
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, newPassword });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword
    }, true);
  },

  async getPublicProfile(id: string): Promise<{ id: string; name: string; avatar_url?: string; bio?: string; role: string; created_at: string; blog_count: number }> {
    const response = await apiClient.get<{ success: boolean; data: any }>(`/auth/author/${id}`);
    return response.data;
  },

  async completeOnboarding(data: { phone: string; date_of_birth: string; interested_categories: string[] }): Promise<void> {
    await apiClient.post('/auth/onboarding', data, true);
  },

  async deleteAccount(): Promise<void> {
    await apiClient.delete('/auth/account', true);
  },

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    apiClient.clearAuthCache();
  }
};
