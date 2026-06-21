const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

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

  // Force the user to the onboarding page when the backend reports an incomplete
  // profile. Keeps the session intact (tokens are valid) — only the profile is missing.
  private redirectToOnboarding() {
    if (typeof window === 'undefined') return;
    if (window.location.pathname.replace(/^\/(en|hi)(?=\/|$)/, '').startsWith('/onboarding')) return;
    window.location.assign('/onboarding');
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
      const separator = url.includes('?') ? '&' : '?';
      const bustUrl = `${url}${separator}_t=${Date.now()}`;
      
      const response = await fetch(bustUrl, { 
        ...options, 
        cache: 'no-store',
        signal: controller.signal 
      });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  private async executeRequest<T>(url: string, options: RequestOptions): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    // Retry transient failures (network blips, API cold-start 5xx, request timeouts)
    // for idempotent GET requests, so a single hiccup doesn't surface to the user as
    // "unable to load page — try again". Non-GET (POST/PUT/DELETE) are never retried.
    const maxRetries = options.retries ?? (method === 'GET' ? 2 : 0);
    let lastErr: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeRequestOnce<T>(url, options);
      } catch (err: any) {
        lastErr = err;
        // No `.status` ⇒ network/abort (timeout) error; `.status >= 500` ⇒ transient server error.
        const transient = !err?.status || err.status >= 500;
        if (transient && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  private async executeRequestOnce<T>(url: string, options: RequestOptions): Promise<T> {
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
      let errorBody: any = {};
      try { errorBody = await response.json(); } catch { /* ignore */ }

      // Server-side onboarding gate. The session is valid — the profile is just
      // incomplete — so we must NOT refresh or clear tokens (that would log the user
      // out). Bounce them to the onboarding page instead.
      if (response.status === 403 && errorBody.code === 'PROFILE_INCOMPLETE') {
        this.redirectToOnboarding();
        const incompleteErr = new Error(errorBody.message || 'Please complete your profile') as any;
        incompleteErr.code = 'PROFILE_INCOMPLETE';
        incompleteErr.status = 403;
        throw incompleteErr;
      }

      // Attempt token refresh on 401/403
      if ((response.status === 401 || response.status === 403) && requiresAuth) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          const newToken = this.getAuthToken();
          if (newToken) {
            requestHeaders['Authorization'] = `Bearer ${newToken}`;
            const retryResponse = await this.fetchWithTimeout(url, { ...rest, headers: requestHeaders }, timeout);
            if (!retryResponse.ok) {
              let retryBody: any = {};
              try { retryBody = await retryResponse.json(); } catch { /* ignore */ }
              // The onboarding gate can also surface on the retry — handle identically.
              if (retryResponse.status === 403 && retryBody.code === 'PROFILE_INCOMPLETE') {
                this.redirectToOnboarding();
                const e = new Error(retryBody.message || 'Please complete your profile') as any;
                e.code = 'PROFILE_INCOMPLETE';
                e.status = 403;
                throw e;
              }
              if (retryResponse.status === 401 || retryResponse.status === 403) {
                this.clearTokens();
              }
              const retryErr = new Error(retryBody.message || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`) as any;
              if (retryBody.code) retryErr.code = retryBody.code;
              retryErr.status = retryResponse.status;
              throw retryErr;
            }
            return retryResponse.json() as Promise<T>;
          }
        }
        this.clearTokens();
      }
      const err = new Error(errorBody.message || `HTTP ${response.status}: ${response.statusText}`) as any;
      err.code = errorBody.code;
      err.status = response.status;
      if (errorBody.block_reason !== undefined) err.block_reason = errorBody.block_reason;
      throw err;
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
