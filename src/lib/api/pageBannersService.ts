const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : '/api/v1';

const buildApiUrl = (path: string) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
};

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || localStorage.getItem('auth_token');
};

const authFetch = async (input: RequestInfo, init: RequestInit = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {})
    }
  });

  return response;
};

export interface PageBanner {
  id: string;
  page_identifier: string;
  image_url: string;
  link_url?: string | null;
  alt_text?: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const pageBannersService = {
  async getBanners(pageIdentifier: string): Promise<PageBanner[]> {
    const response = await fetch(buildApiUrl(`/page-banners/${pageIdentifier}`));
    
    if (!response.ok) {
      throw new Error('Failed to fetch banners');
    }
    
    const data = await response.json();
    return data.data || [];
  },

  async getAdminBanners(pageIdentifier: string): Promise<PageBanner[]> {
    const response = await authFetch(
      buildApiUrl(`/page-banners/admin/${pageIdentifier}`)
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch banners');
    }
    
    const data = await response.json();
    return data.data || [];
  },

  async createBanner(payload: {
    pageIdentifier: string;
    imageUrl: string;
    linkUrl?: string;
    altText?: string;
    displayOrder?: number;
    isActive?: boolean;
  }): Promise<PageBanner> {
    const response = await authFetch(
      buildApiUrl('/page-banners'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create banner');
    }
    
    const data = await response.json();
    return data.data;
  },

  async updateBanner(id: string, payload: {
    imageUrl?: string;
    linkUrl?: string;
    altText?: string;
    displayOrder?: number;
    isActive?: boolean;
  }): Promise<PageBanner> {
    const response = await authFetch(
      buildApiUrl(`/page-banners/${id}`),
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to update banner');
    }
    
    const data = await response.json();
    return data.data;
  },

  async deleteBanner(id: string): Promise<void> {
    const response = await authFetch(
      buildApiUrl(`/page-banners/${id}`),
      {
        method: 'DELETE',
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to delete banner');
    }
  },

  async reorderBanners(orderedIds: string[]): Promise<void> {
    const response = await authFetch(
      buildApiUrl('/page-banners/reorder'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: orderedIds }),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to reorder banners');
    }
  },

  async uploadBannerImage(file: File): Promise<{ url: string; key: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await authFetch(
      buildApiUrl('/page-banners/upload'),
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to upload banner image');
    }
    
    const data = await response.json();
    return data.data;
  },
};
