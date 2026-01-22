import { apiClient } from './client';
import { College, FilterOptions, PaginatedResponse } from '@/types';

interface CollegesResponse {
  success: boolean;
  data: College[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SingleCollegeResponse {
  success: boolean;
  data: College;
}

export const collegeService = {
  async getColleges(options?: FilterOptions): Promise<PaginatedResponse<College>> {
    const params = new URLSearchParams();
    
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.location) params.append('location', options.location);
    if (options?.type) params.append('type', options.type);
    if (options?.sortBy) params.append('sortBy', options.sortBy);

    const response = await apiClient.get<CollegesResponse>(
      `/colleges?${params.toString()}`
    );

    return {
      data: response.data,
      total: response.pagination.total,
      page: response.pagination.page,
      limit: response.pagination.limit,
      totalPages: response.pagination.totalPages
    };
  },

  async getCollegeById(id: string): Promise<College | null> {
    try {
      const response = await apiClient.get<SingleCollegeResponse>(`/colleges/${id}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }
};
