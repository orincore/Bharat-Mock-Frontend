import { apiClient } from './client';

export interface Testimonial {
  id: string;
  name: string;
  profilePhotoUrl?: string;
  review: string;
  exam?: string;
  highlight: boolean;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestimonialData {
  name: string;
  review: string;
  exam?: string;
  displayOrder?: number;
}

export interface UpdateTestimonialData {
  name?: string;
  review?: string;
  exam?: string;
  highlight?: boolean;
  isPublished?: boolean;
  displayOrder?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const testimonialsService = {
  async getPublicTestimonials(limit = 12): Promise<Testimonial[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await apiClient.get<ApiResponse<Testimonial[]>>(`/testimonials?${params}`, false);
    return response.data;
  },

  async adminList(highlight?: boolean): Promise<Testimonial[]> {
    const params = highlight !== undefined ? `?highlight=${highlight}` : '';
    const response = await apiClient.get<ApiResponse<Testimonial[]>>(`/testimonials/admin/list${params}`, true);
    return response.data;
  },

  async adminCreate(data: CreateTestimonialData, profilePhoto?: File): Promise<Testimonial> {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('review', data.review);
    if (data.exam) formData.append('exam', data.exam);
    if (data.displayOrder !== undefined) formData.append('displayOrder', String(data.displayOrder));
    if (profilePhoto) formData.append('profilePhoto', profilePhoto);

    const response = await apiClient.postFormData<ApiResponse<Testimonial>>('/testimonials/admin', formData, true);
    return response.data;
  },

  async adminUpdate(id: string, data: UpdateTestimonialData, profilePhoto?: File): Promise<Testimonial> {
    const formData = new FormData();
    if (data.name) formData.append('name', data.name);
    if (data.review) formData.append('review', data.review);
    if (data.exam !== undefined) formData.append('exam', data.exam || '');
    if (data.highlight !== undefined) formData.append('highlight', String(data.highlight));
    if (data.isPublished !== undefined) formData.append('isPublished', String(data.isPublished));
    if (data.displayOrder !== undefined) formData.append('displayOrder', String(data.displayOrder));
    if (profilePhoto) formData.append('profilePhoto', profilePhoto);

    const response = await apiClient.putFormData<ApiResponse<Testimonial>>(`/testimonials/admin/${id}`, formData, true);
    return response.data;
  },

  async adminDelete(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(`/testimonials/admin/${id}`, true);
  }
};
