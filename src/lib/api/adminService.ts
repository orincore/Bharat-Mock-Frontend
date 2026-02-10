import { apiClient } from './client';
import {
  Exam,
  User,
  FilterOptions,
  PaginatedResponse,
  NavigationLink,
  NavigationLinkInput,
  FooterLink,
  FooterLinkInput,
  ContactInfo,
  ContactInfoInput,
  AboutPageData,
  AboutPageContent,
  AboutValue,
  AboutStat,
  AboutOffering,
  PrivacyPolicyData,
  PrivacyPolicySection,
  PrivacyPolicyPoint,
  PrivacyPolicyContent,
  DisclaimerData,
  DisclaimerSection,
  DisclaimerPoint,
  DisclaimerContent
} from '@/types';

interface AboutPayload extends Partial<AboutPageContent> {
  values?: AboutValue[];
  stats?: AboutStat[];
  offerings?: AboutOffering[];
  deleted_value_ids?: string[];
  deleted_stat_ids?: string[];
  deleted_offering_ids?: string[];
}

interface PrivacyPolicyPayload extends Partial<PrivacyPolicyContent> {
  sections?: PrivacyPolicySection[];
  points?: (PrivacyPolicyPoint & { section_title?: string })[];
  deleted_section_ids?: string[];
  deleted_point_ids?: string[];
}

interface DisclaimerPayload extends Partial<DisclaimerContent> {
  sections?: DisclaimerSection[];
  points?: (DisclaimerPoint & { section_title?: string })[];
  deleted_section_ids?: string[];
  deleted_point_ids?: string[];
}

export interface AdminUserStats {
  totalExamsTaken: number;
  averageScore: number;
  bestScore: number;
  lastActive: string | null;
  totalMarksEarned: number;
  totalMarksPossible: number;
}

export interface AdminUserDetails {
  user: User;
  stats: AdminUserStats;
  recentResults: Array<{
    id: string;
    score: number;
    total_marks: number;
    percentage: number;
    status: string;
    created_at: string;
    exam_id: string;
    exam: {
      id: string;
      title: string;
      category?: string;
      difficulty?: string;
    } | null;
  }>;
  recentAttempts: Array<{
    id: string;
    exam_id: string;
    started_at: string;
    submitted_at: string | null;
    time_taken: number | null;
    is_submitted: boolean;
    exam: {
      id: string;
      title: string;
      category?: string;
      difficulty?: string;
    } | null;
  }>;
}

interface CreateExamData {
  title: string;
  duration: number;
  total_marks: number;
  total_questions: number;
  category?: string;
  category_id?: string;
  subcategory?: string;
  subcategory_id?: string;
  difficulty?: string;
  difficulty_id?: string;
  slug?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'anytime';
  start_date: string;
  end_date: string;
  pass_percentage: number;
  is_free: boolean;
  negative_marking: boolean;
  negative_mark_value: number;
  is_published?: boolean;
  syllabus?: string[];
}

interface CreateSectionData {
  exam_id: string;
  name: string;
  total_questions: number;
  marks_per_question: number;
  duration?: number;
  section_order: number;
}

interface CreateQuestionData {
  exam_id: string;
  section_id: string;
  type: 'single' | 'multiple' | 'truefalse' | 'numerical';
  text: string;
  marks: number;
  negative_marks: number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_order?: number;
}

interface CreateOptionData {
  question_id: string;
  option_text: string;
  is_correct: boolean;
  option_order: number;
}

export const adminService = {
  async getExams(options?: FilterOptions): Promise<PaginatedResponse<Exam>> {
    const params = new URLSearchParams();

    params.append('page', (options?.page || 1).toString());
    params.append('limit', (options?.limit || 10).toString());
    if (options?.search) params.append('search', options.search);
    if (options?.status) params.append('status', options.status);
    if (options?.category) params.append('category', options.category);
    if (options?.difficulty) params.append('difficulty', options.difficulty);

    const response = await apiClient.get<{
      success: boolean;
      data: Exam[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/admin/exams?${params.toString()}`, true);

    return {
      data: response.data,
      total: response.pagination.total,
      page: response.pagination.page,
      limit: response.pagination.limit,
      totalPages: response.pagination.totalPages
    };
  },

  async getExamById(id: string): Promise<Exam> {
    const response = await apiClient.get<{ success: boolean; data: Exam }>(`/admin/exams/${id}`, true);
    return response.data;
  },

  async getExamSectionsAndQuestions(examId: string): Promise<{
    sections: Array<{
      id: string;
      name: string;
      total_questions: number;
      marks_per_question: number;
      duration?: number;
      section_order: number;
      questions: Array<{
        id: string;
        type: string;
        text: string;
        marks: number;
        negative_marks: number;
        explanation?: string;
        difficulty: string;
        image_url?: string;
        question_order?: number;
        options: Array<{
          id: string;
          option_text: string;
          is_correct: boolean;
          option_order: number;
          image_url?: string;
        }>;
      }>;
    }>;
  }> {
    const response = await apiClient.get<{
      success: boolean;
      data: any[];
    }>(`/admin/exams/${examId}/sections-questions`, true);

    return { sections: response.data };
  },

  async createExam(data: CreateExamData, logo?: File, thumbnail?: File): Promise<Exam> {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'syllabus' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (typeof value === 'boolean') {
          formData.append(key, value ? 'true' : 'false');
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    if (logo) formData.append('logo', logo);
    if (thumbnail) formData.append('thumbnail', thumbnail);

    const response = await apiClient.postFormData<{ success: boolean; data: Exam }>('/admin/exams', formData, true);
    return response.data;
  },

  async updateExam(id: string, data: Partial<CreateExamData>, logo?: File, thumbnail?: File): Promise<Exam> {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'syllabus' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (typeof value === 'boolean') {
          formData.append(key, value ? 'true' : 'false');
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    if (logo) formData.append('logo', logo);
    if (thumbnail) formData.append('thumbnail', thumbnail);

    const response = await apiClient.putFormData<{ success: boolean; data: Exam }>(`/admin/exams/${id}`, formData, true);
    return response.data;
  },

  async deleteExam(id: string): Promise<void> {
    await apiClient.delete(`/admin/exams/${id}`, true);
  },

  async bulkCreateExamWithContent(examData: any, sections: any[], logo?: File, thumbnail?: File): Promise<any> {
    const formData = new FormData();
    
    formData.append('exam', JSON.stringify(examData));
    formData.append('sections', JSON.stringify(sections));

    if (logo) formData.append('logo', logo);
    if (thumbnail) formData.append('thumbnail', thumbnail);

    const response = await apiClient.postFormData<{ success: boolean; data: any }>('/admin/exams/bulk', formData, true);
    return response.data;
  },

  async updateExamWithContent(examId: string, examData: any, sections: any[], logo?: File, thumbnail?: File): Promise<any> {
    const formData = new FormData();

    formData.append('exam', JSON.stringify(examData));
    formData.append('sections', JSON.stringify(sections));

    if (logo) formData.append('logo', logo);
    if (thumbnail) formData.append('thumbnail', thumbnail);

    const response = await apiClient.putFormData<{ success: boolean; data: any }>(`/admin/exams/${examId}/content`, formData, true);
    return response.data;
  },


  async saveDraftExam(examData: any, sections: any[], logo?: File, thumbnail?: File): Promise<any> {
    const formData = new FormData();
    
    formData.append('exam', JSON.stringify(examData));
    formData.append('sections', JSON.stringify(sections));

    if (logo) formData.append('logo', logo);
    if (thumbnail) formData.append('thumbnail', thumbnail);

    const response = await apiClient.postFormData<{ success: boolean; data: any }>('/admin/exams/draft', formData, true);
    return response.data;
  },

  async createSection(data: CreateSectionData) {
    const response = await apiClient.post<{ success: boolean; data: any }>('/admin/sections', data, true);
    return response.data;
  },

  async updateSection(id: string, data: Partial<CreateSectionData>) {
    const response = await apiClient.put<{ success: boolean; data: any }>(`/admin/sections/${id}`, data, true);
    return response.data;
  },

  async deleteSection(id: string): Promise<void> {
    await apiClient.delete(`/admin/sections/${id}`, true);
  },

  async createQuestion(data: CreateQuestionData, image?: File) {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    if (image) formData.append('image', image);

    const response = await apiClient.postFormData<{ success: boolean; data: any }>('/admin/questions', formData, true);
    return response.data;
  },

  async updateQuestion(id: string, data: Partial<CreateQuestionData>, image?: File) {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    if (image) formData.append('image', image);

    const response = await apiClient.putFormData<{ success: boolean; data: any }>(`/admin/questions/${id}`, formData, true);
    return response.data;
  },

  async uploadQuestionImage(questionId: string, image: File) {
    const formData = new FormData();
    formData.append('image', image);

    const response = await apiClient.postFormData<{ success: boolean; data: { image_url: string }; message: string }>(`/admin/questions/${questionId}/upload-image`, formData, true);
    return response.data;
  },

  async removeQuestionImage(questionId: string) {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/admin/questions/${questionId}/remove-image`, true);
    return response;
  },

  async deleteQuestion(id: string): Promise<void> {
    await apiClient.delete(`/admin/questions/${id}`, true);
  },

  async createOption(data: CreateOptionData, image?: File) {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    if (image) formData.append('image', image);

    const response = await apiClient.postFormData<{ success: boolean; data: any }>('/admin/options', formData, true);
    return response.data;
  },

  async updateOption(id: string, data: Partial<CreateOptionData>, image?: File) {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    if (image) formData.append('image', image);

    const response = await apiClient.putFormData<{ success: boolean; data: any }>(`/admin/options/${id}`, formData, true);
    return response.data;
  },

  async uploadOptionImage(optionId: string, image: File) {
    const formData = new FormData();
    formData.append('image', image);

    const response = await apiClient.postFormData<{ success: boolean; data: { image_url: string }; message: string }>(`/admin/options/${optionId}/upload-image`, formData, true);
    return response.data;
  },

  async removeOptionImage(optionId: string) {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/admin/options/${optionId}/remove-image`, true);
    return response;
  },

  async deleteOption(id: string): Promise<void> {
    await apiClient.delete(`/admin/options/${id}`, true);
  },

  async getAllUsers(page = 1, limit = 20, search = '', role = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(role && { role })
    });

    const response = await apiClient.get<{
      success: boolean;
      data: User[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`/admin/users?${params}`, true);
    
    return response;
  },

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<User> {
    const response = await apiClient.put<{ success: boolean; data: User }>(`/admin/users/${userId}/role`, { role }, true);
    return response.data;
  },

  async toggleUserBlock(userId: string): Promise<User> {
    const response = await apiClient.put<{ success: boolean; data: User }>(`/admin/users/${userId}/toggle-block`, {}, true);
    return response.data;
  },

  async getUserDetails(userId: string): Promise<AdminUserDetails> {
    const response = await apiClient.get<{ success: boolean; data: AdminUserDetails }>(`/admin/users/${userId}`, true);
    return response.data;
  },

  async getNavigationLinksAdmin(): Promise<NavigationLink[]> {
    const response = await apiClient.get<{ success: boolean; data: NavigationLink[] }>('/admin/navigation', true);
    return response.data;
  },

  async createNavigationLink(payload: NavigationLinkInput): Promise<NavigationLink> {
    const response = await apiClient.post<{ success: boolean; data: NavigationLink }>('/admin/navigation', payload, true);
    return response.data;
  },

  async updateNavigationLink(id: string, payload: NavigationLinkInput): Promise<NavigationLink> {
    const response = await apiClient.put<{ success: boolean; data: NavigationLink }>(`/admin/navigation/${id}`, payload, true);
    return response.data;
  },

  async deleteNavigationLink(id: string): Promise<void> {
    await apiClient.delete(`/admin/navigation/${id}`, true);
  },

  async reorderNavigationLinks(order: Array<{ id: string; display_order: number }>): Promise<NavigationLink[]> {
    const response = await apiClient.post<{ success: boolean; data: NavigationLink[] }>(
      '/admin/navigation/reorder',
      { order },
      true
    );
    return response.data;
  },

  async getFooterLinksAdmin(): Promise<FooterLink[]> {
    const response = await apiClient.get<{ success: boolean; data: FooterLink[] }>('/admin/footer', true);
    return response.data;
  },

  async createFooterLink(payload: FooterLinkInput): Promise<FooterLink> {
    const response = await apiClient.post<{ success: boolean; data: FooterLink }>('/admin/footer', payload, true);
    return response.data;
  },

  async updateFooterLink(id: string, payload: FooterLinkInput): Promise<FooterLink> {
    const response = await apiClient.put<{ success: boolean; data: FooterLink }>(`/admin/footer/${id}`, payload, true);
    return response.data;
  },

  async deleteFooterLink(id: string): Promise<void> {
    await apiClient.delete(`/admin/footer/${id}`, true);
  },

  async reorderFooterLinks(order: Array<{ id: string; section_order: number; display_order: number }>): Promise<FooterLink[]> {
    const response = await apiClient.post<{ success: boolean; data: FooterLink[] }>(
      '/admin/footer/reorder',
      { order },
      true
    );
    return response.data;
  },

  async getContactInfoAdmin(): Promise<ContactInfo | null> {
    const response = await apiClient.get<{ success: boolean; data: ContactInfo | null }>('/admin/contact', true);
    return response.data;
  },

  async upsertContactInfo(payload: ContactInfoInput): Promise<ContactInfo | null> {
    const response = await apiClient.put<{ success: boolean; data: ContactInfo | null }>('/admin/contact', payload, true);
    return response.data;
  },

  async getAboutContentAdmin(): Promise<AboutPageData> {
    const response = await apiClient.get<{ success: boolean; data: AboutPageData }>('/admin/about', true);
    return response.data;
  },

  async upsertAboutContent(payload: AboutPayload): Promise<AboutPageData> {
    const response = await apiClient.put<{ success: boolean; data: AboutPageData }>('/admin/about', payload, true);
    return response.data;
  },

  async getPrivacyPolicyAdmin(): Promise<PrivacyPolicyData> {
    const response = await apiClient.get<{ success: boolean; data: PrivacyPolicyData }>('/admin/privacy', true);
    return response.data;
  },

  async upsertPrivacyPolicy(payload: PrivacyPolicyPayload): Promise<PrivacyPolicyData> {
    const response = await apiClient.put<{ success: boolean; data: PrivacyPolicyData }>('/admin/privacy', payload, true);
    return response.data;
  },

  async getDisclaimerAdmin(): Promise<DisclaimerData> {
    const response = await apiClient.get<{ success: boolean; data: DisclaimerData }>('/admin/disclaimer', true);
    return response.data;
  },

  async upsertDisclaimer(payload: DisclaimerPayload): Promise<DisclaimerData> {
    const response = await apiClient.put<{ success: boolean; data: DisclaimerData }>('/admin/disclaimer', payload, true);
    return response.data;
  }
};
