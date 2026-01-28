import { apiClient } from './client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string | null;
  icon?: string | null;
  display_order?: number;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Difficulty {
  id: string;
  name: string;
  slug: string;
  description?: string;
  level_order: number;
  created_at: string;
  updated_at: string;
}

export const taxonomyService = {
  async getCategories(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await apiClient.get<{ success: boolean; data: Category[] }>(`/taxonomy/categories${params}`);
    return response.data;
  },

  async createCategory(data: { name: string; description?: string; slug?: string }) {
    const response = await apiClient.post<{ success: boolean; data: Category }>('/taxonomy/categories', data, true);
    return response.data;
  },

  async updateCategory(id: string, data: { name: string; description?: string; slug?: string }) {
    const response = await apiClient.put<{ success: boolean; data: Category }>(`/taxonomy/categories/${id}`, data, true);
    return response.data;
  },

  async getSubcategories(categoryId?: string, search?: string) {
    const params = new URLSearchParams();
    if (categoryId) params.append('category_id', categoryId);
    if (search) params.append('search', search);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<{ success: boolean; data: Subcategory[] }>(`/taxonomy/subcategories${queryString}`);
    return response.data;
  },

  async createSubcategory(data: { category_id: string; name: string; description?: string; slug?: string }) {
    const response = await apiClient.post<{ success: boolean; data: Subcategory }>('/taxonomy/subcategories', data, true);
    return response.data;
  },

  async getDifficulties() {
    const response = await apiClient.get<{ success: boolean; data: Difficulty[] }>('/taxonomy/difficulties');
    return response.data;
  },

  async createDifficulty(data: { name: string; description?: string; slug?: string; level_order?: number }) {
    const response = await apiClient.post<{ success: boolean; data: Difficulty }>('/taxonomy/difficulties', data, true);
    return response.data;
  }
};
