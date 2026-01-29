"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen, Clock, Award, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExamCard } from '@/components/exam/ExamCard';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { examService } from '@/lib/api/examService';
import { taxonomyService, Difficulty, Category, Subcategory } from '@/lib/api/taxonomyService';
import { Exam } from '@/types';

const DEFAULT_STATUS = 'anytime';

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [difficultyOptions, setDifficultyOptions] = useState<Difficulty[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [difficultiesLoading, setDifficultiesLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    subcategory: '',
    difficulty: '',
    status: DEFAULT_STATUS
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchCategories();
    fetchDifficulties();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchSubcategories(selectedCategoryId);
    } else {
      setSubcategories([]);
      setSelectedSubcategoryId('');
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    fetchExams();
  }, [filters, pagination.page]);

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const data = await taxonomyService.getCategories();
      const sorted = data
        .filter(category => category.is_active !== false)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setCategories(sorted);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchSubcategories = async (categoryId: string) => {
    setSubcategoriesLoading(true);
    try {
      const data = await taxonomyService.getSubcategories(categoryId);
      setSubcategories(data.filter(sub => sub.name));
    } catch (err) {
      console.error('Failed to fetch subcategories:', err);
      setSubcategories([]);
    } finally {
      setSubcategoriesLoading(false);
    }
  };

  const fetchDifficulties = async () => {
    setDifficultiesLoading(true);
    try {
      const response = await taxonomyService.getDifficulties();
      setDifficultyOptions(response);
    } catch (err) {
      console.error('Failed to fetch difficulties:', err);
    } finally {
      setDifficultiesLoading(false);
    }
  };

  const fetchExams = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await examService.getExams({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      
      setExams(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.total,
        totalPages: response.totalPages
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchExams();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCategorySelect = (value: string) => {
    setSelectedCategoryId(value);
    const selectedCategory = categories.find(category => category.id === value);
    handleFilterChange('category', selectedCategory ? selectedCategory.name : '');
    setSelectedSubcategoryId('');
    handleFilterChange('subcategory', '');
  };

  const handleSubcategorySelect = (value: string) => {
    setSelectedSubcategoryId(value);
    const selectedSubcategory = subcategories.find(sub => sub.id === value);
    handleFilterChange('subcategory', selectedSubcategory ? selectedSubcategory.name : '');
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      subcategory: '',
      difficulty: '',
      status: DEFAULT_STATUS
    });
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setSubcategories([]);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const isFilterDataLoading = categoriesLoading || difficultiesLoading;
  const hasCustomFilters = Boolean(
    filters.search ||
    filters.category ||
    filters.subcategory ||
    filters.difficulty ||
    filters.status !== DEFAULT_STATUS
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero Section */}
      <section className="gradient-hero py-16">
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-20 2xl:px-32">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-background mb-4">
              Browse Mock Exams
            </h1>
            <p className="text-lg text-background/80 mb-8">
              Practice with our comprehensive collection of mock tests designed to help you succeed
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search exams by name or category..."
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

      <div className="relative w-full px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 xl:w-72 flex-shrink-0">
            <div className="bg-card rounded-xl border border-border p-6 sticky top-20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  Filters
                </h3>
                {hasCustomFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear
                  </Button>
                )}
              </div>

              {isFilterDataLoading ? (
                <div className="space-y-6" aria-live="polite" aria-busy="true">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  ))}

                  <div className="mt-8 pt-6 border-t border-border space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {/* Category Filter */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Category
                      </label>
                      <select
                        value={selectedCategoryId}
                        onChange={(e) => handleCategorySelect(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">All Categories</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subcategory Filter */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Sub-category
                      </label>
                      {subcategoriesLoading ? (
                        <Skeleton className="h-10 w-full rounded-lg" />
                      ) : (
                        <select
                          value={selectedSubcategoryId}
                          onChange={(e) => handleSubcategorySelect(e.target.value)}
                          disabled={!selectedCategoryId || subcategories.length === 0}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <option value="">{selectedCategoryId ? 'All Sub-categories' : 'Select category first'}</option>
                          {subcategories.map((subcategory) => (
                            <option key={subcategory.id} value={subcategory.id}>
                              {subcategory.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Difficulty Filter */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Tier
                      </label>
                      <select
                        value={filters.difficulty}
                        onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">All Tiers</option>
                        {difficultyOptions.map((difficulty) => (
                          <option key={difficulty.id} value={difficulty.name}>
                            {difficulty.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    
                  </div>

                  {/* Stats */}
                  <div className="mt-8 pt-6 border-t border-border">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Exams</span>
                        <span className="font-semibold text-foreground">{pagination.total}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Categories</span>
                        <span className="font-semibold text-foreground">{categories.length}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {hasCustomFilters ? 'Filtered Results' : 'Anytime Exams'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Showing {exams.length} of {pagination.total} exams
                </p>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-live="polite" aria-busy="true">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="card-interactive overflow-hidden h-full flex flex-col border border-border rounded-xl p-5 space-y-4">
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <Skeleton className="h-8 w-24 rounded-full" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
                <p className="text-destructive">{error}</p>
                <Button onClick={fetchExams} variant="outline" className="mt-4">
                  Try Again
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && exams.length === 0 && (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  No exams found
                </h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your filters or search query
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            )}

            {/* Exams Grid */}
            {!isLoading && !error && exams.length > 0 && (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {exams.map((exam) => (
                    <ExamCard key={exam.id} exam={exam} />
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
                      {pagination.totalPages > 5 && (
                        <>
                          <span className="text-muted-foreground">...</span>
                          <Button
                            variant={pagination.page === pagination.totalPages ? 'default' : 'outline'}
                            onClick={() => setPagination(prev => ({ ...prev, page: pagination.totalPages }))}
                            className="w-10"
                          >
                            {pagination.totalPages}
                          </Button>
                        </>
                      )}
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
