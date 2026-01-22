import { apiClient } from './client';
import { Course, FilterOptions, PaginatedResponse } from '@/types';

interface CoursesResponse {
  success: boolean;
  data: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SingleCourseResponse {
  success: boolean;
  data: Course;
}

export const courseService = {
  async getCourses(options?: FilterOptions): Promise<PaginatedResponse<Course>> {
    const params = new URLSearchParams();
    
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.level) params.append('level', options.level);

    const response = await apiClient.get<CoursesResponse>(
      `/courses?${params.toString()}`
    );

    return {
      data: response.data,
      total: response.pagination.total,
      page: response.pagination.page,
      limit: response.pagination.limit,
      totalPages: response.pagination.totalPages
    };
  },

  async getCourseById(id: string): Promise<Course | null> {
    try {
      const response = await apiClient.get<SingleCourseResponse>(`/courses/${id}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }
};
