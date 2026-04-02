const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  timeout?: number;
  retries?: number;
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
    window.dispatchEvent(new CustomEvent('auth:session-expired'));
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const data = await response.json();
        if (!response.ok || !data?.success || !data?.data?.token) {
          this.clearTokens();
          return false;
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', data.data.token);
          if (data.data.refreshToken) localStorage.setItem('refresh_token', data.data.refreshToken);
        }
        return true;
      } catch {
        this.clearTokens();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async fetchWithTimeout(url: string, options: RequestOptions, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  private async executeRequest<T>(url: string, options: RequestOptions): Promise<T> {
    const { requiresAuth, headers = {}, timeout = 10000, retries: _retries, ...rest } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    };

    if (requiresAuth) {
      const token = this.getAuthToken();
      if (token) requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await this.fetchWithTimeout(url, { ...rest, headers: requestHeaders }, timeout);

    if (!response.ok) {
      // Attempt token refresh on 401/403
      if ((response.status === 401 || response.status === 403) && requiresAuth) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          const newToken = this.getAuthToken();
          if (newToken) {
            requestHeaders['Authorization'] = `Bearer ${newToken}`;
            const retryResponse = await this.fetchWithTimeout(url, { ...rest, headers: requestHeaders }, timeout);
            if (!retryResponse.ok) {
              if (retryResponse.status === 401 || retryResponse.status === 403) {
                this.clearTokens();
              }
              throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
            }
            return retryResponse.json() as Promise<T>;
          }
        }
        this.clearTokens();
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async get<T>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.executeRequest<T>(`${this.baseUrl}${endpoint}`, { method: 'GET', requiresAuth });
  }

  async post<T>(endpoint: string, body?: unknown, requiresAuth = false): Promise<T> {
    return this.executeRequest<T>(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(body),
      requiresAuth,
    });
  }

  async put<T>(endpoint: string, body?: unknown, requiresAuth = false): Promise<T> {
    return this.executeRequest<T>(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      requiresAuth,
    });
  }

  async patch<T>(endpoint: string, body?: unknown, requiresAuth = false): Promise<T> {
    return this.executeRequest<T>(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      requiresAuth,
    });
  }

  async delete<T>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.executeRequest<T>(`${this.baseUrl}${endpoint}`, { method: 'DELETE', requiresAuth });
  }

  async postFormData<T>(endpoint: string, formData: FormData, requiresAuth = false): Promise<T> {
    const headers: Record<string, string> = {};
    if (requiresAuth) {
      const token = this.getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      body: formData,
      headers,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  async putFormData<T>(endpoint: string, formData: FormData, requiresAuth = false): Promise<T> {
    const headers: Record<string, string> = {};
    if (requiresAuth) {
      const token = this.getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      body: formData,
      headers,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  // Kept for compatibility — no-op since caching is removed
  clearAuthCache(): void {}
}

export const apiClient = new ApiClient(API_BASE_URL);
