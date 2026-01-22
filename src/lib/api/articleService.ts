import { apiClient } from './client';
import { Article, FilterOptions, PaginatedResponse } from '@/types';

interface ArticlesResponse {
  success: boolean;
  data: Article[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SingleArticleResponse {
  success: boolean;
  data: Article;
}

interface CategoriesResponse {
  success: boolean;
  data: string[];
}

interface TagsResponse {
  success: boolean;
  data: string[];
}

export const articleService = {
  async getArticles(options?: FilterOptions): Promise<PaginatedResponse<Article>> {
    const params = new URLSearchParams();
    
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.category) params.append('category', options.category);

    const response = await apiClient.get<ArticlesResponse>(
      `/articles?${params.toString()}`
    );

    return {
      data: response.data,
      total: response.pagination.total,
      page: response.pagination.page,
      limit: response.pagination.limit,
      totalPages: response.pagination.totalPages
    };
  },

  async getArticleBySlug(slug: string): Promise<Article | null> {
    try {
      const response = await apiClient.get<SingleArticleResponse>(`/articles/${slug}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async getFeaturedArticles(): Promise<Article[]> {
    const response = await apiClient.get<ArticlesResponse>('/articles?limit=3');
    return response.data;
  },

  async getCategories(): Promise<string[]> {
    const response = await apiClient.get<CategoriesResponse>('/articles/categories');
    return response.data;
  },

  async getPopularTags(): Promise<string[]> {
    const response = await apiClient.get<TagsResponse>('/articles/tags');
    return response.data;
  },

  async getArticlesByCategory(category: string): Promise<Article[]> {
    const response = await apiClient.get<ArticlesResponse>(`/articles?category=${category}`);
    return response.data;
  },

  async getArticlesByTag(tag: string): Promise<Article[]> {
    const response = await apiClient.get<ArticlesResponse>(`/articles?search=${tag}`);
    return response.data;
  },

  async getRelatedArticles(articleId: string): Promise<Article[]> {
    return [];
  }
};
