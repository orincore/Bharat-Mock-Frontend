import { Blog, BlogsResponse, BlogSection } from './blogService';

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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
  }

  return response;
};

export interface BlogFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  published?: boolean;
  status?: 'draft' | 'pending' | 'published';
}

export interface BlogPayload {
  title?: string;
  slug?: string;
  excerpt?: string;
  featured_image_url?: string;
  category?: string;
  tags?: string[];
  is_published?: boolean;
  is_featured?: boolean;
  status?: 'draft' | 'pending' | 'published';
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  canonical_url?: string;
}

export const blogAdminService = {
  async getBlogs(filters: BlogFilters = {}): Promise<BlogsResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.search) params.set('search', filters.search);
    if (filters.category) params.set('category', filters.category);
    if (filters.published !== undefined) params.set('published', String(filters.published));
    if (filters.status) params.set('status', filters.status);

    const response = await authFetch(buildApiUrl(`/blogs/admin/list?${params.toString()}`));
    return response.json();
  },

  async createBlog(payload: BlogPayload): Promise<Blog> {
    const response = await authFetch(buildApiUrl('/blogs'), {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return data.data;
  },

  async getBlogById(blogId: string): Promise<Blog> {
    const response = await authFetch(buildApiUrl(`/blogs/id/${blogId}`));
    const data = await response.json();
    return data.data;
  },

  async updateBlog(blogId: string, payload: BlogPayload): Promise<Blog> {
    const response = await authFetch(buildApiUrl(`/blogs/${blogId}`), {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return data.data;
  },

  async deleteBlog(blogId: string): Promise<void> {
    await authFetch(buildApiUrl(`/blogs/${blogId}`), {
      method: 'DELETE'
    });
  },

  async getBlogContent(blogId: string): Promise<BlogSection[]> {
    const response = await authFetch(buildApiUrl(`/blogs/${blogId}/content`));
    const data = await response.json();
    return data.sections || [];
  },

  async bulkSyncBlogContent(blogId: string, sections: any[]): Promise<void> {
    await authFetch(buildApiUrl(`/blogs/${blogId}/bulk-sync`), {
      method: 'POST',
      body: JSON.stringify({ sections })
    });
  },

  async uploadMedia(blogId: string, file: File, folder?: string): Promise<{ file_url: string; file_name: string }> {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication required');

    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
      formData.append('folder', folder);
    }

    const response = await fetch(buildApiUrl(`/blogs/${blogId}/media`), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Upload failed');
    }

    return response.json();
  }
};
