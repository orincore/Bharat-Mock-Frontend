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

  // Step 1: email a 6-digit OTP to the logged-in user's registered address.
  async sendChangePasswordOtp(): Promise<{ email?: string }> {
    const response = await apiClient.post<{ success: boolean; message: string; email?: string }>(
      '/auth/change-password/send-otp', {}, true
    );
    return { email: response.email };
  },

  // Step 2: verify the OTP and set the new password. The backend revokes all sessions
  // and returns fresh tokens for THIS session — store them so the current user stays
  // logged in while every other device is signed out.
  async changePassword(otp: string, newPassword: string): Promise<void> {
    const response = await apiClient.post<{ success: boolean; data?: { token: string; refreshToken: string } }>(
      '/auth/change-password', { otp, newPassword }, true
    );
    if (response.data?.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('refresh_token', response.data.refreshToken);
    }
  },

  async getPublicProfile(id: string): Promise<{ id: string; name: string; avatar_url?: string; bio?: string; role: string; created_at: string; blog_count: number }> {
    const response = await apiClient.get<{ success: boolean; data: any }>(`/auth/author/${id}`);
    return response.data;
  },

  async completeOnboarding(data: { phone: string; password?: string }): Promise<void> {
    await apiClient.post('/auth/onboarding', data, true);
  },

  // Creates a brand-new Google account from the pre-registration onboarding token.
  // No account exists until this succeeds, so it returns fresh login tokens.
  async completeGoogleRegistration(data: {
    pendingToken: string;
    phone: string;
    password: string;
  }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/google/complete-registration', data, false);
    if (response.success && response.data?.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('refresh_token', response.data.refreshToken);
      // Clear any stale cached user so AuthProvider hydrates the fresh profile.
      localStorage.removeItem('auth_user');
    }
    return response;
  },

  async deleteAccount(): Promise<void> {
    await apiClient.delete('/auth/account', true);
  },

  logout(): void {
    // Best-effort: tell the backend to bust this user's cached profile + app-init so
    // the DB isn't hit on the next load and no stale session data is served.
    // Fired BEFORE clearing the token (the request captures the auth header
    // synchronously), and never awaited/thrown — local logout must always succeed.
    try {
      void apiClient.post('/auth/logout', {}, true).catch(() => {});
    } catch {
      /* ignore — logout proceeds regardless */
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    // Legacy key some admin pages still fall back to reading; never written anymore
    // but must be cleared here or a stale value silently outlives every re-login.
    localStorage.removeItem('token');
    apiClient.clearAuthCache();
  }
};
