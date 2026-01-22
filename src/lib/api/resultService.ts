import { apiClient } from './client';
import { Result, PaginatedResponse } from '@/types';

interface ResultsResponse {
  success: boolean;
  data: Result[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SingleResultResponse {
  success: boolean;
  data: Result;
}

interface AnswerReviewResponse {
  success: boolean;
  data: any[];
}

export const resultService = {
  async getResults(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Result>> {
    const response = await apiClient.get<ResultsResponse>(
      `/results?page=${page}&limit=${limit}`,
      true
    );

    return {
      data: response.data,
      total: response.pagination.total,
      page: response.pagination.page,
      limit: response.pagination.limit,
      totalPages: response.pagination.totalPages
    };
  },

  async getResultById(id: string): Promise<Result | null> {
    try {
      const response = await apiClient.get<SingleResultResponse>(`/results/${id}`, true);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async getAnswerReview(resultId: string): Promise<any[]> {
    const response = await apiClient.get<AnswerReviewResponse>(
      `/results/${resultId}/review`,
      true
    );
    return response.data;
  }
};
