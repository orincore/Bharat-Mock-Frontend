import { Article, FilterOptions, PaginatedResponse } from '@/types';
import { mockArticles, getArticleBySlug, getArticlesByCategory, getArticlesByTag } from '@/lib/mock/articles';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const articleService = {
  async getArticles(options?: FilterOptions): Promise<PaginatedResponse<Article>> {
    await delay(300);
    
    let filteredArticles = [...mockArticles];
    
    if (options?.search) {
      const search = options.search.toLowerCase();
      filteredArticles = filteredArticles.filter(article => 
        article.title.toLowerCase().includes(search) ||
        article.excerpt.toLowerCase().includes(search) ||
        article.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }
    
    if (options?.category) {
      filteredArticles = filteredArticles.filter(article => 
        article.category.toLowerCase() === options.category?.toLowerCase()
      );
    }
    
    // Sort by date (newest first by default)
    filteredArticles.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      data: filteredArticles.slice(startIndex, endIndex),
      total: filteredArticles.length,
      page,
      limit,
      totalPages: Math.ceil(filteredArticles.length / limit)
    };
  },
  
  async getArticleBySlug(slug: string): Promise<Article | null> {
    await delay(200);
    return getArticleBySlug(slug) || null;
  },
  
  async getFeaturedArticles(): Promise<Article[]> {
    await delay(200);
    return mockArticles.slice(0, 3);
  },
  
  async getCategories(): Promise<string[]> {
    await delay(100);
    return [...new Set(mockArticles.map(article => article.category))];
  },
  
  async getPopularTags(): Promise<string[]> {
    await delay(100);
    const allTags = mockArticles.flatMap(article => article.tags);
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  },
  
  async getRelatedArticles(articleId: string): Promise<Article[]> {
    await delay(200);
    const article = mockArticles.find(a => a.id === articleId);
    if (!article) return [];
    
    return mockArticles
      .filter(a => a.id !== articleId && a.category === article.category)
      .slice(0, 3);
  }
};
