import { apiClient } from './client';

export interface PaperSection {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaperTopic {
  id: string;
  section_id: string; // DB column name is section_id
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePaperSectionData {
  name: string;
  description?: string;
  display_order?: number;
}

export interface CreatePaperTopicData {
  paper_section_id: string; // sent to backend which maps to section_id in DB
  name: string;
  description?: string;
  display_order?: number;
}

export const paperSectionsService = {
  // Public endpoints
  async getSections(): Promise<PaperSection[]> {
    const response = await apiClient.get<{ success: boolean; data: PaperSection[] }>('/paper-sections');
    return response.data;
  },

  async getTopics(): Promise<PaperTopic[]> {
    const response = await apiClient.get<{ success: boolean; data: PaperTopic[] }>('/paper-sections/topics');
    return response.data;
  },

  async getTopicsBySection(sectionId: string): Promise<PaperTopic[]> {
    const response = await apiClient.get<{ success: boolean; data: PaperTopic[] }>(`/paper-sections/${sectionId}/topics`);
    return response.data;
  },

  // Admin endpoints
  async createSection(data: CreatePaperSectionData): Promise<PaperSection> {
    const response = await apiClient.post<{ success: boolean; data: PaperSection }>('/paper-sections', data, true);
    return response.data;
  },

  async updateSection(id: string, data: Partial<CreatePaperSectionData>): Promise<PaperSection> {
    const response = await apiClient.put<{ success: boolean; data: PaperSection }>(`/paper-sections/${id}`, data, true);
    return response.data;
  },

  async deleteSection(id: string): Promise<void> {
    await apiClient.delete(`/paper-sections/${id}`, true);
  },

  async reorderSections(sectionIds: string[]): Promise<PaperSection[]> {
    const response = await apiClient.post<{ success: boolean; data: PaperSection[] }>(
      '/paper-sections/reorder',
      { orderedIds: sectionIds },
      true
    );
    return response.data;
  },

  async createTopic(data: CreatePaperTopicData): Promise<PaperTopic> {
    const response = await apiClient.post<{ success: boolean; data: PaperTopic }>('/paper-sections/topics', data, true);
    return response.data;
  },

  async updateTopic(id: string, data: Partial<CreatePaperTopicData>): Promise<PaperTopic> {
    const response = await apiClient.put<{ success: boolean; data: PaperTopic }>(`/paper-sections/topics/${id}`, data, true);
    return response.data;
  },

  async deleteTopic(id: string): Promise<void> {
    await apiClient.delete(`/paper-sections/topics/${id}`, true);
  },

  async reorderTopics(topicIds: string[]): Promise<PaperTopic[]> {
    const response = await apiClient.post<{ success: boolean; data: PaperTopic[] }>(
      '/paper-sections/topics/reorder',
      { orderedIds: topicIds },
      true
    );
    return response.data;
  }
};
