"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Calendar, Tag, Bookmark, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { blogService, Blog } from '@/lib/api/blogService';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';

export default function BlogsPage() {
  const [articles, setArticles] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    categories: [] as string[]
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchCategories();
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

  const fetchArticles = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await blogService.getBlogs({
        search: filters.search || undefined,
        categories: filters.categories.length ? filters.categories : undefined,
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
      categories: []
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const listArticles = articles;

  const toggleCategory = (category: string) => {
    setFilters((prev) => {
      const exists = prev.categories.includes(category);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((item) => item !== category)
          : [...prev.categories, category]
      };
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const allSelected = useMemo(() => filters.categories.length === categories.length && categories.length > 0, [filters.categories, categories]);

  const handleSelectAll = (checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      categories: checked ? [...categories] : []
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="container mx-auto px-4">
          <Breadcrumbs 
            items={[
              HomeBreadcrumb(),
              { label: 'Blogs' }
            ]}
            variant="dark"
            className="mb-6"
          />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Blog & Articles</h1>
          <p className="text-xl text-blue-100 max-w-2xl">Insights, tips, and updates to help you excel in your exam preparation</p>
        </div>
      </div>
      <section className="border-b border-border bg-white/80">
        <div className="container-main py-10 flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-primary font-semibold">Bharat Mock Blogs</p>
            <h1 className="font-display text-3xl font-bold text-slate-900">Read exam strategies, paper analysis, news and daily briefs</h1>
            <p className="text-slate-600 max-w-3xl">Pick the categories you want to follow and we’ll show only those stories. All blogs come directly from our editorial team.</p>
          </div>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input
                type="text"
                placeholder="Search by keyword, exam or author"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Button type="submit" size="lg">
              Search
            </Button>
          </form>
        </div>
      </section>

      <div className="container-main py-10 grid lg:grid-cols-[320px_minmax(0,1fr)] gap-8">
        <aside className="bg-white border border-border rounded-2xl p-6 space-y-6 h-fit">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-slate-900">Categories</h3>
              <Button variant="ghost" size="sm" className="text-xs" onClick={clearFilters}>
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-700 mb-4">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                id="all-categories"
              />
              <label htmlFor="all-categories" className="cursor-pointer">Select all ({categories.length})</label>
            </div>
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {categories.map((category) => {
                const checkboxId = `category-${category}`;
                return (
                  <div key={category} className="flex items-center gap-3 text-sm text-slate-700">
                    <Checkbox
                      id={checkboxId}
                      checked={filters.categories.includes(category)}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    <label htmlFor={checkboxId} className="flex-1 cursor-pointer">
                      {category}
                    </label>
                  </div>
                );
              })}
              {categories.length === 0 && (
                <p className="text-xs text-muted-foreground">No categories yet.</p>
              )}
            </div>
          </div>

          {filters.categories.length > 0 && (
            <div className="bg-primary/5 rounded-xl p-4">
              <p className="text-xs uppercase font-semibold text-primary mb-2">Active filters</p>
              <div className="flex flex-wrap gap-2">
                {filters.categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="px-3 py-1 rounded-full bg-white text-primary border border-primary text-sm"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main className="space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-2xl font-bold text-slate-900">{filters.categories.length ? 'Filtered blogs' : 'All blogs'}</h2>
            <p className="text-sm text-slate-500">Showing {articles.length} of {pagination.total} entries</p>
          </div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          )}

          {error && !isLoading && (
            <div className="bg-destructive/10 border border-destructive rounded-xl p-6">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchArticles}>Try again</Button>
            </div>
          )}

          {!isLoading && !error && listArticles.length === 0 && (
            <div className="bg-white border border-dashed border-border rounded-2xl py-12 text-center">
              <p className="font-semibold text-slate-900 mb-2">No blogs found</p>
              <p className="text-sm text-muted-foreground mb-4">Adjust your search or category filters</p>
              <Button variant="outline" onClick={clearFilters}>Reset filters</Button>
            </div>
          )}

          {!isLoading && !error && listArticles.length > 0 && (
            <div className="space-y-4">
              {listArticles.map((article) => (
                <article key={article.id} className="bg-white border border-border rounded-2xl p-6 flex flex-col md:flex-row gap-5 hover:border-primary/40 transition">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-primary">
                      <span className="px-2 py-1 bg-primary/10 rounded-full">{article.category || 'General'}</span>
                      {article.tags?.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-slate-500">#{tag}</span>
                      ))}
                    </div>
                    <Link href={`/blogs/${article.slug}`}>
                      <h3 className="font-display text-xl font-semibold text-slate-900 hover:text-primary transition">
                        {article.title}
                      </h3>
                    </Link>
                    {article.excerpt && <p className="text-sm text-slate-600 line-clamp-3">{article.excerpt}</p>}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      {article.published_at && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Bookmark className="h-4 w-4" />
                        {article.read_time || 5} min read
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 justify-between">
                    {article.featured_image_url && (
                      <img
                        src={article.featured_image_url}
                        alt={article.title}
                        className="w-48 h-32 object-cover rounded-xl border border-border"
                      />
                    )}
                    <Button asChild variant="secondary">
                      <Link href={`/blogs/${article.slug}`} className="inline-flex items-center gap-2">
                        Read article
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && !isLoading && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
              <Button
                variant="outline"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }).slice(0, 5).map((_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <Button
                      key={pageNumber}
                      variant={pagination.page === pageNumber ? 'default' : 'outline'}
                      onClick={() => setPagination(prev => ({ ...prev, page: pageNumber }))}
                      className="w-10"
                    >
                      {pageNumber}
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
        </main>
      </div>
    </div>
  );
}
