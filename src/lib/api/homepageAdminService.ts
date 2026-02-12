import { HomepageHero, HomepageBanner } from './homepageService';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000/api/v1';

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

const authFetch = async (path: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

const authFormFetch = async (path: string, formData: FormData, method: 'POST' | 'PUT' = 'POST') => {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Upload failed');
  }

  return data;
};

export const homepageAdminService = {
  async getHero(slug = 'default'): Promise<HomepageHero | null> {
    const data = await authFetch(`/homepage/hero/${slug}`);
    return data.data || null;
  },

  async upsertHero(payload: HomepageHero): Promise<HomepageHero> {
    const data = await authFetch(`/homepage/hero`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return data.data;
  },

  async uploadMedia(file: File, slug = 'default') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('slug', slug);

    const data = await authFormFetch(`/homepage/hero/media`, formData, 'POST');
    return data.data as {
      url: string;
      key: string;
      mime_type: string;
      size: number;
      original_name: string;
      asset_type: 'image' | 'video';
    };
  },

  async getBanners(includeInactive = true): Promise<HomepageBanner[]> {
    const query = includeInactive ? '?include_inactive=true' : '';
    const data = await authFetch(`/homepage/banners${query}`);
    return data.data || [];
  },

  async createBanner(payload: Partial<HomepageBanner>): Promise<HomepageBanner> {
    const data = await authFetch(`/homepage/banners`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.data;
  },

  async updateBanner(id: string, payload: Partial<HomepageBanner>): Promise<HomepageBanner> {
    const data = await authFetch(`/homepage/banners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return data.data;
  },

  async deleteBanner(id: string): Promise<void> {
    await authFetch(`/homepage/banners/${id}`, {
      method: 'DELETE'
    });
  },

  async reorderBanners(ids: string[]): Promise<void> {
    await authFetch(`/homepage/banners/reorder`, {
      method: 'POST',
      body: JSON.stringify({ order: ids })
    });
  },

  async uploadBannerImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const data = await authFormFetch(`/homepage/banners/upload`, formData, 'POST');
    return data.data as {
      url: string;
      key: string;
      mime_type: string;
      size: number;
      original_name: string;
    };
  }
};
