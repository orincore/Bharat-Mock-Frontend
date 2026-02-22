import { Exam } from '@/types';

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

export interface PopularTest {
  id: string;
  displayOrder: number;
  exam: Exam;
}

export interface PopularTestAdmin {
  id: string;
  pageIdentifier: string;
  examId: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  exam: Exam;
}

export const pagePopularTestsService = {
  async getPopularTests(pageIdentifier: string): Promise<PopularTest[]> {
    const response = await fetch(
      buildApiUrl(`/page-popular-tests/${pageIdentifier}`)
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch popular tests');
    }
    
    const data = await response.json();
    return data.data || [];
  },

  async getPopularTestsAdmin(pageIdentifier: string): Promise<PopularTestAdmin[]> {
    const response = await authFetch(
      buildApiUrl(`/page-popular-tests/admin/${pageIdentifier}`)
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch popular tests');
    }
    
    const data = await response.json();
    return data.data || [];
  },

  async addPopularTest(pageIdentifier: string, examId: string): Promise<PopularTestAdmin> {
    const response = await authFetch(
      buildApiUrl('/page-popular-tests'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageIdentifier, examId }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add popular test');
    }
    
    const data = await response.json();
    return data.data;
  },

  async removePopularTest(id: string): Promise<void> {
    const response = await authFetch(
      buildApiUrl(`/page-popular-tests/${id}`),
      {
        method: 'DELETE',
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to remove popular test');
    }
  },

  async reorderPopularTests(pageIdentifier: string, orderedIds: string[]): Promise<void> {
    const response = await authFetch(
      buildApiUrl(`/page-popular-tests/${pageIdentifier}/reorder`),
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderedIds }),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to reorder popular tests');
    }
  },

  async togglePopularTestStatus(id: string, isActive: boolean): Promise<void> {
    const response = await authFetch(
      buildApiUrl(`/page-popular-tests/${id}/toggle`),
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to toggle popular test status');
    }
  },
};
