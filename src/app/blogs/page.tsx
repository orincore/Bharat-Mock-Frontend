"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Calendar, Clock, Eye, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArticleCard } from '@/components/article/ArticleCard';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { blogService, Blog } from '@/lib/api/blogService';

export default function BlogsPage() {
  const [articles, setArticles] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filters, setFilters] = useState({
    search: '',
    category: ''
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchCategories();
    fetchPopularTags();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [filters, pagination.page]);

  const fetchCategories = async () => {
    try {
      const data = await blogService.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchPopularTags = async () => {
    try {
      const data = await blogService.getPopularTags();
      setPopularTags(data);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  const fetchArticles = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await blogService.getBlogs({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      
      setArticles(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to load blogs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchArticles();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero Section */}
      <section className="gradient-hero py-16">
        <div className="container-main">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-background mb-4">
              Latest Blogs
            </h1>
            <p className="text-lg text-background/80 mb-8">
              Stay updated with exam tips, study guides, and educational insights
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search blogs..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10 bg-background"
                />
              </div>
              <Button type="submit" size="lg">
                Search
              </Button>
            </form>
          </div>
        </div>
      </section>

      <div className="container-main py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="space-y-6">
              {/* Categories */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">
                  Categories
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, category: '' }))}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      !filters.category
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    All Blogs
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setFilters(prev => ({ ...prev, category }))}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        filters.category === category
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular Tags */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Popular Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setFilters(prev => ({ ...prev, search: tag }))}
                      className="px-3 py-1 bg-muted hover:bg-primary/10 text-sm rounded-full transition-colors"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {filters.category || filters.search ? 'Filtered Results' : 'All Blogs'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Showing {articles.length} of {pagination.total} blogs
                </p>
              </div>
              {(filters.category || filters.search) && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
                <p className="text-destructive">{error}</p>
                <Button onClick={fetchArticles} variant="outline" className="mt-4">
                  Try Again
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && articles.length === 0 && (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  No blogs found
                </h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your filters or search query
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            )}

            {/* Articles Grid */}
            {!isLoading && !error && articles.length > 0 && (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  {articles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-12">
                    <Button
                      variant="outline"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={pagination.page === pageNum ? 'default' : 'outline'}
                            onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
