import { apiClient } from './client';
import { Exam, Question, FilterOptions, PaginatedResponse, ExamHistoryEntry } from '@/types';

interface ExamResponse {
  success: boolean;
  data: Exam[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ExamHistoryResponse {
  success: boolean;
  data: ExamHistoryEntry[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics?: {
    totalAttempts: number;
    completed: number;
    inProgress: number;
  };
}

interface SingleExamResponse {
  success: boolean;
  data: Exam;
}

interface CategoriesResponse {
  success: boolean;
  data: string[];
}

interface StartExamResponse {
  success: boolean;
  data: {
    attemptId: string;
    startedAt: string;
  };
  message: string;
}

interface QuestionsResponse {
  success: boolean;
  data: {
    sections: Array<{
      id: string;
      name: string;
      totalQuestions: number;
      marksPerQuestion: number;
      duration?: number;
      sectionOrder: number;
      questions: Question[];
    }>;
    questions: Question[];
  };
}

export const examService = {
  async getExams(options?: FilterOptions): Promise<PaginatedResponse<Exam>> {
    const params = new URLSearchParams();
    
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.category) params.append('category', options.category);
    if (options?.status) params.append('status', options.status);
    if (options?.difficulty) params.append('difficulty', options.difficulty);

    const response = await apiClient.get<ExamResponse>(
      `/exams?${params.toString()}`
    );

    return {
      data: response.data,
      total: response.pagination.total,
      page: response.pagination.page,
      limit: response.pagination.limit,
      totalPages: response.pagination.totalPages
    };
  },

  async getExamById(id: string, options?: { attemptId?: string }): Promise<Exam | null> {
    try {
      const trimmedId = id?.trim();
      if (!trimmedId) {
        throw new Error('Invalid exam identifier');
      }

      const isUrlPath = trimmedId.includes('/');
      const encodePathSegments = (value: string) =>
        value
          .split('/')
          .filter(Boolean)
          .map(segment => encodeURIComponent(segment))
          .join('/');

      const appendQuery = (base: string) => {
        if (!options?.attemptId) return base;
        const separator = base.includes('?') ? '&' : '?';
        return `${base}${separator}attemptId=${encodeURIComponent(options.attemptId)}`;
      };

      const path = appendQuery(
        isUrlPath
          ? `/exams/path/${encodePathSegments(trimmedId)}`
          : `/exams/${encodeURIComponent(trimmedId)}`
      );

      const response = await apiClient.get<SingleExamResponse>(path, true);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async getExamCategories(): Promise<string[]> {
    const response = await apiClient.get<CategoriesResponse>('/exams/categories');
    return response.data;
  },

  async getExamHistory(options?: { page?: number; status?: string }): Promise<{
    entries: ExamHistoryEntry[];
    pagination?: ExamHistoryResponse['pagination'];
    metrics?: ExamHistoryResponse['metrics'];
  }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.status) params.append('status', options.status);

    const query = params.toString();
    const url = `/exams/history${query ? `?${query}` : ''}`;

    const response = await apiClient.get<ExamHistoryResponse>(url, true);
    return {
      entries: response.data,
      pagination: response.pagination,
      metrics: response.metrics
    };
  },

  async getFeaturedExams(): Promise<Exam[]> {
    const response = await apiClient.get<ExamResponse>('/exams?limit=4&status=ongoing');
    return response.data;
  },

  async getExamsByStatus(status: Exam['status']): Promise<Exam[]> {
    const response = await apiClient.get<ExamResponse>(`/exams?status=${status}`);
    return response.data;
  },

  async startExam(examId: string): Promise<{ attemptId: string; startedAt: string }> {
    const response = await apiClient.post<StartExamResponse>(
      `/exams/${examId}/start`,
      {},
      true
    );
    return response.data;
  },

  async getExamQuestions(examId: string, attemptId: string): Promise<{
    sections: Array<{
      id: string;
      name: string;
      totalQuestions: number;
      marksPerQuestion: number;
      duration?: number;
      sectionOrder: number;
      questions: Question[];
    }>;
    questions: Question[];
  }> {
    const response = await apiClient.get<QuestionsResponse>(
      `/exams/${examId}/attempts/${attemptId}/questions`,
      true
    );
    return response.data;
  },

  async saveAnswer(
    attemptId: string,
    questionId: string,
    payload: {
      answer: string | string[] | null;
      markedForReview: boolean;
      timeTaken: number;
    }
  ): Promise<void> {
    await apiClient.post(
      `/exams/${attemptId}/questions/${questionId}/answer`,
      payload,
      true
    );
  },

  async submitExam(attemptId: string): Promise<void> {
    await apiClient.post(`/exams/${attemptId}/submit`, {}, true);
  }
};
