const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  timeout?: number;
  retries?: number;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

const LS_CACHE_PREFIX = 'bm_api_';
const LS_CACHE_INDEX = 'bm_api_index';
const MAX_LS_ENTRIES = 150;

// Lightweight localStorage cache — survives page refreshes
const lsCache = {
  get(key: string): unknown | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(LS_CACHE_PREFIX + key);
      if (!raw) return null;
      const entry: CacheEntry = JSON.parse(raw);
      if (Date.now() - entry.timestamp > entry.ttl) {
        localStorage.removeItem(LS_CACHE_PREFIX + key);
        return null;
      }
      return entry.data;
    } catch { return null; }
  },

  set(key: string, data: unknown, ttl: number): void {
    if (typeof window === 'undefined') return;
    try {
      const entry: CacheEntry = { data, timestamp: Date.now(), ttl };
      localStorage.setItem(LS_CACHE_PREFIX + key, JSON.stringify(entry));
      // Track index for eviction
      const index: string[] = JSON.parse(localStorage.getItem(LS_CACHE_INDEX) || '[]');
      const updated = [...index.filter(k => k !== key), key];
      if (updated.length > MAX_LS_ENTRIES) {
        // Evict oldest
        const toRemove = updated.splice(0, updated.length - MAX_LS_ENTRIES);
        toRemove.forEach(k => localStorage.removeItem(LS_CACHE_PREFIX + k));
      }
      localStorage.setItem(LS_CACHE_INDEX, JSON.stringify(updated));
    } catch { /* storage full — skip */ }
  },

  cleanup(): void {
    if (typeof window === 'undefined') return;
    try {
      const index: string[] = JSON.parse(localStorage.getItem(LS_CACHE_INDEX) || '[]');
      const now = Date.now();
      const valid = index.filter(key => {
        const raw = localStorage.getItem(LS_CACHE_PREFIX + key);
        if (!raw) return false;
        try {
          const entry: CacheEntry = JSON.parse(raw);
          if (now - entry.timestamp > entry.ttl) {
            localStorage.removeItem(LS_CACHE_PREFIX + key);
            return false;
          }
          return true;
        } catch { return false; }
      });
      localStorage.setItem(LS_CACHE_INDEX, JSON.stringify(valid));
    } catch { /* ignore */ }
  }
};

class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<boolean> | null = null;
  // In-memory cache for same-session deduplication (fast path)
  private requestCache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, Promise<unknown>>();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    setInterval(() => { this.cleanupCache(); lsCache.cleanup(); }, 60000);
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
    // Dispatch event so AuthContext can react and clear user state
    window.dispatchEvent(new CustomEvent('auth:session-expired'));
  }

  private getCacheKey(url: string, options: RequestOptions): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    // Include auth state in cache key so authenticated and unauthenticated
    // responses for the same endpoint are cached separately
    const authSuffix = options.requiresAuth ? ':auth' : ':noauth';
    return `${method}:${url}:${body}${authSuffix}`;
  }

  private getCachedResponse(cacheKey: string): unknown | null {
    // 1. Check in-memory first (fastest)
    const entry = this.requestCache.get(cacheKey);
    if (entry) {
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.requestCache.delete(cacheKey);
      } else {
        return entry.data;
      }
    }
    // 2. Fall back to localStorage (survives refresh)
    return lsCache.get(cacheKey);
  }

  private setCachedResponse(cacheKey: string, data: unknown, ttl: number = 300000): void {
    const entry: CacheEntry = { data, timestamp: Date.now(), ttl };
    // Write to both layers
    this.requestCache.set(cacheKey, entry);
    // Only persist non-auth, non-sensitive data to localStorage
    // Skip user-specific endpoints — /init contains profile data
    if (
      !cacheKey.includes('/auth') &&
      !cacheKey.includes('/profile') &&
      !cacheKey.includes('/results') &&
      !cacheKey.includes('/init')
    ) {
      lsCache.set(cacheKey, data, ttl);
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.requestCache.entries()) {
      if (now - entry.timestamp > entry.ttl) this.requestCache.delete(key);
    }
  }

  private getTTLForEndpoint(endpoint: string): number {
    // Static/rarely-changing data — cache for longer
    if (endpoint.includes('/categories') || endpoint.includes('/subcategories')) return 6 * 3600000;   // 6h
    if (endpoint.includes('/taxonomy')) return 6 * 3600000;                                            // 6h
    if (endpoint.includes('/navigation')) return 6 * 3600000;                                          // 6h
    if (endpoint.includes('/footer')) return 6 * 3600000;                                              // 6h
    if (endpoint.includes('/homepage')) return 3600000;                                                 // 1h
    if (endpoint.includes('/testimonials')) return 3600000;                                             // 1h
    if (endpoint.includes('/popular-tests')) return 1800000;                                            // 30m
    if (endpoint.includes('/page-banners')) return 1800000;                                             // 30m
    if (endpoint.includes('/blogs') || endpoint.includes('/articles')) return 1800000;                  // 30m
    if (endpoint.includes('/current-affairs')) return 900000;                                           // 15m
    if (endpoint.includes('/test-series')) return 900000;                                               // 15m
    if (endpoint.includes('/exams')) return 600000;                                                     // 10m
    if (endpoint.includes('/subscription')) return 600000;                                              // 10m
    if (endpoint.includes('/paper-sections') || endpoint.includes('/paper-topics')) return 3600000;     // 1h
    return 300000;                                                                                       // 5m default
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

  private async fetchWithTimeout(url: string, options: RequestOptions, timeout: number = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async retryRequest<T>(url: string, options: RequestOptions, maxRetries: number = 2): Promise<T> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options, options.timeout);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return await response.json() as T;
      } catch (error) {
        lastError = error as Error;
        // Don't retry auth errors (401/403) — let executeRequest handle token refresh
        // Don't retry other 4xx client errors
        if (error instanceof Error && error.message.match(/HTTP 4\d\d/)) {
          throw error;
        }
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 5000)));
        }
      }
    }

    throw lastError;
  }

  private async executeRequest<T>(url: string, options: RequestOptions): Promise<T> {
    const { requiresAuth, headers = {}, timeout, retries, ...restOptions } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    };

    if (requiresAuth) {
      const token = this.getAuthToken();
      if (token) requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    try {
      return await this.retryRequest<T>(url, { ...restOptions, headers: requestHeaders, timeout }, retries);
    } catch (error) {
      // Handle 401 (unauthorized) and 403 (forbidden/token expired) — attempt token refresh
      if (
        error instanceof Error &&
        (error.message.includes('HTTP 401') || error.message.includes('HTTP 403')) &&
        requiresAuth
      ) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          const newToken = this.getAuthToken();
          if (newToken) {
            requestHeaders['Authorization'] = `Bearer ${newToken}`;
            return await this.retryRequest<T>(url, { ...restOptions, headers: requestHeaders, timeout }, retries);
          }
        }
        // Refresh failed — clear tokens so user gets logged out cleanly
        this.clearTokens();
      }
      throw error;
    }
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { requiresAuth = false, headers = {}, timeout = 10000, retries = 2, ...restOptions } = options;
    const url = `${this.baseUrl}${endpoint}`;
    const method = restOptions.method || 'GET';

    if (method === 'GET') {
      const cacheKey = this.getCacheKey(url, { ...restOptions, requiresAuth });

      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) return cachedResponse as T;

      const pendingRequest = this.pendingRequests.get(cacheKey);
      if (pendingRequest) return pendingRequest as Promise<T>;

      const requestPromise = this.executeRequest<T>(url, { requiresAuth, headers, timeout, retries, ...restOptions });
      this.pendingRequests.set(cacheKey, requestPromise);

      try {
        const result = await requestPromise;
        this.setCachedResponse(cacheKey, result, this.getTTLForEndpoint(endpoint));
        return result;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    }

    return this.executeRequest<T>(url, { requiresAuth, headers, timeout, retries, ...restOptions });
  }

  async get<T>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', requiresAuth });
  }

  async post<T>(endpoint: string, body?: unknown, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body), requiresAuth });
  }

  async put<T>(endpoint: string, body?: unknown, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body), requiresAuth });
  }

  async patch<T>(endpoint: string, body?: unknown, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body), requiresAuth });
  }

  async delete<T>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', requiresAuth });
  }

  async postFormData<T>(endpoint: string, formData: FormData, requiresAuth = false): Promise<T> {
    const config: RequestInit = { method: 'POST', body: formData };
    if (requiresAuth) {
      const token = this.getAuthToken();
      if (token) config.headers = { Authorization: `Bearer ${token}` };
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'API request failed');
    return data;
  }

  async putFormData<T>(endpoint: string, formData: FormData, requiresAuth = false): Promise<T> {
    const config: RequestInit = { method: 'PUT', body: formData };
    if (requiresAuth) {
      const token = this.getAuthToken();
      if (token) config.headers = { Authorization: `Bearer ${token}` };
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'API request failed');
    return data;
  }

  clearAuthCache(): void {
    if (typeof window === 'undefined') return;
    try {
      // Clear in-memory cache for all user-sensitive endpoints
      for (const key of this.requestCache.keys()) {
        if (
          key.includes('/init') ||
          key.includes('/auth') ||
          key.includes('/profile') ||
          key.includes('/subscription')
        ) {
          this.requestCache.delete(key);
        }
      }
      // Clear localStorage cache for the same
      const index: string[] = JSON.parse(localStorage.getItem(LS_CACHE_INDEX) || '[]');
      const toRemove = index.filter(key =>
        key.includes('/init') ||
        key.includes('/auth') ||
        key.includes('/profile') ||
        key.includes('/subscription')
      );
      toRemove.forEach(key => localStorage.removeItem(LS_CACHE_PREFIX + key));
      const remaining = index.filter(k => !toRemove.includes(k));
      localStorage.setItem(LS_CACHE_INDEX, JSON.stringify(remaining));
    } catch { /* ignore */ }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
