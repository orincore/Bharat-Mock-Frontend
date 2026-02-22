import { apiClient } from './client';

export interface TestimonialUser {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface Testimonial {
  id: string;
  userId: string;
  title?: string | null;
  content: string;
  rating: number;
  highlight: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  user?: TestimonialUser | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const testimonialsService = {
  async getPublicTestimonials(limit?: number): Promise<Testimonial[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiClient.get<ApiResponse<Testimonial[]>>(
      `/testimonials${params}`
    );
    return response.data;
  },

  async getMyTestimonial(): Promise<Testimonial | null> {
    const response = await apiClient.get<ApiResponse<Testimonial | null>>(
      '/testimonials/me',
      true
    );
    return response.data;
  },

  async createTestimonial(payload: { title?: string; content: string; rating: number }): Promise<Testimonial> {
    const response = await apiClient.post<ApiResponse<Testimonial>>(
      '/testimonials',
      payload,
      true
    );
    return response.data;
  },

  async updateTestimonial(id: string, payload: Partial<{ title: string; content: string; rating: number }>): Promise<Testimonial> {
    const response = await apiClient.put<ApiResponse<Testimonial>>(
      `/testimonials/${id}`,
      payload,
      true
    );
    return response.data;
  },

  async deleteTestimonial(id: string): Promise<void> {
    await apiClient.delete(`/testimonials/${id}`, true);
  },

  async adminList(): Promise<Testimonial[]> {
    const response = await apiClient.get<ApiResponse<Testimonial[]>>(
      '/testimonials/admin/list',
      true
    );
    return response.data;
  },

  async adminUpdate(id: string, payload: Partial<{ highlight: boolean; isPublished: boolean }>): Promise<Testimonial> {
    const response = await apiClient.patch<ApiResponse<Testimonial>>(
      `/testimonials/admin/${id}`,
      payload,
      true
    );
    return response.data;
  }
};
