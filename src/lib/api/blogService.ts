import { apiClient } from './client';

export interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image_url?: string;
  author_id?: string;
  author?: {
    id: string;
    email: string;
    raw_user_meta_data?: {
      name?: string;
      avatar_url?: string;
      bio?: string;
    };
  };
  category?: string;
  tags?: string[];
  is_published: boolean;
  is_featured: boolean;
  published_at?: string;
  view_count: number;
  read_time?: number;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  canonical_url?: string;
  created_at: string;
  updated_at: string;
}

export interface BlogSection {
  id: string;
  blog_id: string;
  section_key?: string;
  title: string;
  subtitle?: string;
  display_order: number;
  is_collapsible: boolean;
  is_expanded: boolean;
  background_color?: string;
  text_color?: string;
  settings: any;
  blocks: BlogBlock[];
}

export interface BlogBlock {
  id: string;
  section_id: string;
  block_type: string;
  content: any;
  settings: any;
  display_order: number;
}

export interface BlogsResponse {
  success: boolean;
  data: Blog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleBlogResponse {
  success: boolean;
  data: Blog;
}

export interface BlogContentResponse {
  success: boolean;
  sections: BlogSection[];
}

export const blogService = {
  async getBlogs(options?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    featured?: boolean;
  }): Promise<BlogsResponse> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.category) params.append('category', options.category);
    if (options?.search) params.append('search', options.search);
    if (options?.featured) params.append('featured', 'true');

    const response = await apiClient.get<BlogsResponse>(
      `/blogs?${params.toString()}`
    );

    return response;
  },

  async getBlogBySlug(slug: string): Promise<Blog | null> {
    try {
      const response = await apiClient.get<SingleBlogResponse>(`/blogs/${slug}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async getBlogContent(blogId: string): Promise<BlogSection[]> {
    try {
      const response = await apiClient.get<BlogContentResponse>(`/blogs/${blogId}/content`);
      return response.sections || [];
    } catch (error) {
      console.error('Failed to fetch blog content:', error);
      return [];
    }
  },

  async getFeaturedBlogs(): Promise<Blog[]> {
    const response = await apiClient.get<BlogsResponse>('/blogs?featured=true&limit=3');
    return response.data;
  },

  async getCategories(): Promise<string[]> {
    try {
      // For now, return static categories. Can be made dynamic later
      return ['Exam Tips', 'Study Guides', 'Career Advice', 'Success Stories', 'News & Updates'];
    } catch (error) {
      return [];
    }
  },

  async getPopularTags(): Promise<string[]> {
    try {
      // For now, return static tags. Can be made dynamic later
      return ['JEE', 'NEET', 'UPSC', 'SSC', 'Banking', 'Preparation', 'Tips', 'Strategy'];
    } catch (error) {
      return [];
    }
  }
};
