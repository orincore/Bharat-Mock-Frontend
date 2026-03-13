import { apiClient } from './client';

export interface TestSeriesSection {
  id: string;
  test_series_id: string;
  name: string;
  description?: string;
  display_order: number;
  topics?: TestSeriesTopic[];
  created_at: string;
  updated_at: string;
}

export interface TestSeriesTopic {
  id: string;
  section_id: string;
  name: string;
  description?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TestSeriesExamSummary {
  id: string;
  title: string;
  is_free: boolean;
  supports_hindi?: boolean;
  languages?: string[];
  language?: string;
  test_series_section_id?: string;
  test_series_topic_id?: string;
}

export interface TestSeries {
  id: string;
  title: string;
  description?: string;
  slug: string;
  category_id?: string;
  subcategory_id?: string;
  difficulty_id?: string;
  total_tests: number;
  total_attempts: number;
  user_count?: number;
  logo_url?: string;
  thumbnail_url?: string;
  is_published: boolean;
  is_free: boolean;
  price: number;
  display_order: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
  };
  subcategory?: {
    id: string;
    name: string;
    slug: string;
  };
  difficulty?: {
    id: string;
    name: string;
    slug: string;
  };
  sections?: TestSeriesSection[];
  exams?: TestSeriesExamSummary[];
  free_tests?: number;
  languages?: string[];
  language_options?: string[];
  languages_text?: string;
}

export interface TestSeriesFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subcategory?: string;
  difficulty?: string;
  is_published?: boolean;
}

class TestSeriesService {
  private client = apiClient;

  async getTestSeries(filters?: TestSeriesFilters) {
    const params = new URLSearchParams();
    
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.subcategory) params.append('subcategory', filters.subcategory);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.is_published !== undefined) params.append('is_published', filters.is_published.toString());

    const queryString = params.toString();
    const url = `/test-series${queryString ? `?${queryString}` : ''}`;
    
    return this.client.get<{
      data: TestSeries[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(url);
  }

  async getTestSeriesById(id: string) {
    return this.client.get<TestSeries>(`/test-series/${id}`);
  }

  async getTestSeriesBySlug(slug: string) {
    return this.client.get<TestSeries>(`/test-series/slug/${slug}`);
  }

  async createTestSeries(data: Partial<TestSeries>) {
    return this.client.post<TestSeries>('/test-series', data, true);
  }

  async updateTestSeries(id: string, data: Partial<TestSeries>) {
    return this.client.put<TestSeries>(`/test-series/${id}`, data, true);
  }

  async deleteTestSeries(id: string) {
    return this.client.delete(`/test-series/${id}`, true);
  }

  async getSectionsByTestSeries(testSeriesId: string) {
    return this.client.get<TestSeriesSection[]>(`/test-series/${testSeriesId}/sections`);
  }

  async getTopicsBySection(sectionId: string) {
    return this.client.get<TestSeriesTopic[]>(`/test-series/sections/${sectionId}/topics`);
  }

  async createSection(data: Partial<TestSeriesSection>) {
    return this.client.post<TestSeriesSection>('/test-series/sections', data, true);
  }

  async updateSection(id: string, data: Partial<TestSeriesSection>) {
    return this.client.put<TestSeriesSection>(`/test-series/sections/${id}`, data, true);
  }

  async deleteSection(id: string) {
    return this.client.delete(`/test-series/sections/${id}`, true);
  }

  async createTopic(data: Partial<TestSeriesTopic>) {
    return this.client.post<TestSeriesTopic>('/test-series/topics', data, true);
  }

  async updateTopic(id: string, data: Partial<TestSeriesTopic>) {
    return this.client.put<TestSeriesTopic>(`/test-series/topics/${id}`, data, true);
  }

  async deleteTopic(id: string) {
    return this.client.delete(`/test-series/topics/${id}`, true);
  }

  async reorderSections(orderedIds: string[]): Promise<void> {
    await this.client.post('/test-series/sections/reorder', { orderedIds }, true);
  }

  async reorderTopics(orderedIds: string[]): Promise<void> {
    await this.client.post('/test-series/topics/reorder', { orderedIds }, true);
  }

  async reorderExams(orderedIds: string[]): Promise<void> {
    await this.client.post('/test-series/exams/reorder', { orderedIds }, true);
  }
}

export const testSeriesService = new TestSeriesService();
