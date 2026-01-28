import { apiClient } from './client';

export interface SubcategoryOverview {
  id: string;
  subcategory_id: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_description?: string;
  hero_image_url?: string;
  cta_primary_text?: string;
  cta_primary_url?: string;
  cta_secondary_text?: string;
  cta_secondary_url?: string;
  stats_json?: any;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  created_at: string;
  updated_at: string;
}

export interface SubcategoryUpdate {
  id: string;
  subcategory_id: string;
  title: string;
  description?: string;
  update_type: string;
  update_date: string;
  link_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SubcategoryHighlight {
  id: string;
  subcategory_id: string;
  title: string;
  description?: string;
  icon?: string;
  highlight_type: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubcategoryExamStat {
  id: string;
  subcategory_id: string;
  stat_label: string;
  stat_value: string;
  stat_description?: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubcategorySection {
  id: string;
  subcategory_id: string;
  title: string;
  subtitle?: string;
  content?: string;
  section_type: string;
  media_url?: string;
  button_label?: string;
  button_url?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubcategoryTableRow {
  id: string;
  table_id: string;
  row_data: any;
  display_order: number;
}

export interface SubcategoryTable {
  id: string;
  subcategory_id: string;
  title: string;
  description?: string;
  column_headers?: any;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subcategory_table_rows?: SubcategoryTableRow[];
}

export interface SubcategoryQuestionPaper {
  id: string;
  subcategory_id: string;
  title: string;
  year: number;
  paper_type?: string;
  file_url?: string;
  download_url?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  exam?: {
    id: string;
    title: string;
    slug?: string;
    url_path?: string;
    description?: string;
    total_questions?: number;
    duration?: number;
    total_marks?: number;
    difficulty?: string;
    is_free?: boolean;
    price?: number;
    logo_url?: string;
    thumbnail_url?: string;
    supports_hindi?: boolean;
  };
}

export interface SubcategoryFAQ {
  id: string;
  subcategory_id: string;
  question: string;
  answer: string;
  faq_category?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubcategoryResource {
  id: string;
  subcategory_id: string;
  title: string;
  description?: string;
  resource_type: string;
  resource_url?: string;
  thumbnail_url?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category_id: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const subcategoryService = {
  async getSubcategoryBySlug(categorySlug: string, subcategorySlug: string): Promise<Subcategory | null> {
    try {
      const response = await apiClient.get<ApiResponse<Subcategory>>(
        `/taxonomy/category/${categorySlug}/subcategory/${subcategorySlug}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching subcategory:', error);
      return null;
    }
  },

  async getExamsBySubcategory(
    categorySlug: string,
    subcategorySlug: string,
    params?: { page?: number; limit?: number; difficulty?: string; search?: string }
  ) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
      if (params?.search) queryParams.append('search', params.search);

      const response = await apiClient.get<PaginatedResponse<any>>(
        `/taxonomy/category/${categorySlug}/subcategory/${subcategorySlug}/exams?${queryParams.toString()}`
      );
      return response;
    } catch (error) {
      console.error('Error fetching subcategory exams:', error);
      throw error;
    }
  },

  async getOverview(subcategoryId: string): Promise<SubcategoryOverview | null> {
    try {
      const response = await apiClient.get<ApiResponse<SubcategoryOverview>>(
        `/subcategories/${subcategoryId}/overview`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching overview:', error);
      return null;
    }
  },

  async getUpdates(subcategoryId: string, params?: { page?: number; limit?: number }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await apiClient.get<PaginatedResponse<SubcategoryUpdate>>(
        `/subcategories/${subcategoryId}/updates?${queryParams.toString()}`
      );
      return response;
    } catch (error) {
      console.error('Error fetching updates:', error);
      throw error;
    }
  },

  async getHighlights(subcategoryId: string): Promise<SubcategoryHighlight[]> {
    try {
      const response = await apiClient.get<ApiResponse<SubcategoryHighlight[]>>(
        `/subcategories/${subcategoryId}/highlights`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching highlights:', error);
      return [];
    }
  },

  async getExamStats(subcategoryId: string): Promise<SubcategoryExamStat[]> {
    try {
      const response = await apiClient.get<ApiResponse<SubcategoryExamStat[]>>(
        `/subcategories/${subcategoryId}/exam-stats`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching exam stats:', error);
      return [];
    }
  },

  async getSections(subcategoryId: string): Promise<SubcategorySection[]> {
    try {
      const response = await apiClient.get<ApiResponse<SubcategorySection[]>>(
        `/subcategories/${subcategoryId}/sections`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching sections:', error);
      return [];
    }
  },

  async getTables(subcategoryId: string): Promise<SubcategoryTable[]> {
    try {
      const response = await apiClient.get<ApiResponse<SubcategoryTable[]>>(
        `/subcategories/${subcategoryId}/tables`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching tables:', error);
      return [];
    }
  },

  async getQuestionPapers(subcategoryId: string, params?: { page?: number; limit?: number }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await apiClient.get<PaginatedResponse<SubcategoryQuestionPaper>>(
        `/subcategories/${subcategoryId}/question-papers?${queryParams.toString()}`
      );
      return response;
    } catch (error) {
      console.error('Error fetching question papers:', error);
      throw error;
    }
  },

  async getFAQs(subcategoryId: string): Promise<SubcategoryFAQ[]> {
    try {
      const response = await apiClient.get<ApiResponse<SubcategoryFAQ[]>>(
        `/subcategories/${subcategoryId}/faqs`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      return [];
    }
  },

  async getResources(subcategoryId: string): Promise<SubcategoryResource[]> {
    try {
      const response = await apiClient.get<ApiResponse<SubcategoryResource[]>>(
        `/subcategories/${subcategoryId}/resources`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching resources:', error);
      return [];
    }
  },
};
