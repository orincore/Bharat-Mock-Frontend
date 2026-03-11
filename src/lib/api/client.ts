const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  private clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        const data = await response.json();

        if (!response.ok || !data?.success || !data?.data?.token) {
          this.clearTokens();
          return false;
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', data.data.token);
          if (data.data.refreshToken) {
            localStorage.setItem('refresh_token', data.data.refreshToken);
          }
        }

        return true;
      } catch (error) {
        console.error('[ApiClient] Refresh token error:', error);
        this.clearTokens();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requiresAuth = false, headers = {}, ...restOptions } = options;

    const config: RequestInit = {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (requiresAuth) {
      const token = this.getAuthToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    const fullUrl = `${this.baseUrl}${endpoint}`;
    console.log('[ApiClient] Request:', { method: config.method || 'GET', url: fullUrl, requiresAuth });

    try {
      const response = await fetch(fullUrl, config);
      let data: any = null;
      try {
        data = await response.json();
      } catch (error) {
        console.warn('[ApiClient] Failed to parse JSON response:', error);
      }

      console.log('[ApiClient] Response:', { url: fullUrl, status: response.status, ok: response.ok, data });

      if (!response.ok) {
          if (requiresAuth && response.status === 401) {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
              return this.request<T>(endpoint, options);
            }
          }

        const message = data?.message || 'API request failed';
        throw new Error(message);
      }

      return data;
    } catch (error) {
      console.error('[ApiClient] Error:', { url: fullUrl, error });
      throw error;
    }
  }

  async get<T>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', requiresAuth });
  }

  async post<T>(
    endpoint: string,
    body?: any,
    requiresAuth = false
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      requiresAuth,
    });
  }

  async put<T>(
    endpoint: string,
    body?: any,
    requiresAuth = false
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      requiresAuth,
    });
  }

  async patch<T>(
    endpoint: string,
    body?: any,
    requiresAuth = false
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      requiresAuth,
    });
  }

  async delete<T>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', requiresAuth });
  }

  async postFormData<T>(
    endpoint: string,
    formData: FormData,
    requiresAuth = false
  ): Promise<T> {
    const config: RequestInit = {
      method: 'POST',
      body: formData,
    };

    if (requiresAuth) {
      const token = this.getAuthToken();
      if (token) {
        config.headers = {
          Authorization: `Bearer ${token}`,
        };
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async putFormData<T>(
    endpoint: string,
    formData: FormData,
    requiresAuth = false
  ): Promise<T> {
    const config: RequestInit = {
      method: 'PUT',
      body: formData,
    };

    if (requiresAuth) {
      const token = this.getAuthToken();
      if (token) {
        config.headers = {
          Authorization: `Bearer ${token}`,
        };
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
