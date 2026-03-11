"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen, Clock, Award, ChevronRight, Flame, Star, StarOff, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ExamCard } from '@/components/exam/ExamCard';
import { TestSeriesCard } from '@/components/exam/TestSeriesCard';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { testSeriesService, TestSeries } from '@/lib/api/testSeriesService';
import { taxonomyService, Category } from '@/lib/api/taxonomyService';
import { pagePopularTestsService, PopularTest } from '@/lib/api/pagePopularTestsService';
import { pageBannersService, PageBanner } from '@/lib/api/pageBannersService';
import { testimonialsService, Testimonial } from '@/lib/api/testimonialsService';
import { Exam } from '@/types';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const DEFAULT_STATUS = 'anytime';

export default function ExamsPage() {
  const { user, isAuthenticated } = useAuth();
  const [testSeries, setTestSeries] = useState<TestSeries[]>([]);
  const [testSeriesLoading, setTestSeriesLoading] = useState(true);
  const [popularTests, setPopularTests] = useState<PopularTest[]>([]);
  const [popularTestsLoading, setPopularTestsLoading] = useState(true);
  const [newTestSeries, setNewTestSeries] = useState<PopularTest[]>([]);
  const [newTestSeriesLoading, setNewTestSeriesLoading] = useState(true);
  const [banners, setBanners] = useState<PageBanner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const popularTestsScrollRef = useRef<HTMLDivElement>(null);
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const newTestSeriesScrollRef = useRef<HTMLDivElement>(null);
  const testimonialsScrollRef = useRef<HTMLDivElement>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: DEFAULT_STATUS
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const activeRequestRef = useRef(0);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchCategories();
    fetchPopularTests();
    fetchNewTestSeries();
    fetchBanners();
    fetchTestimonials();
    fetchTestSeriesData();
  }, []);

  const fetchPopularTests = async () => {
    setPopularTestsLoading(true);
    try {
      const data = await pagePopularTestsService.getPopularTests('exam_page');
      setPopularTests(data);
    } catch (err) {
      console.error('Failed to fetch popular tests:', err);
    } finally {
      setPopularTestsLoading(false);
    }
  };

  const fetchTestimonials = async () => {
    setTestimonialsLoading(true);
    try {
      const data = await testimonialsService.getPublicTestimonials();
      setTestimonials(data);
    } catch (err) {
      console.error('Failed to fetch testimonials:', err);
    } finally {
      setTestimonialsLoading(false);
    }
  };


  const fetchNewTestSeries = async () => {
    setNewTestSeriesLoading(true);
    try {
      const data = await pagePopularTestsService.getPopularTests('new_test_series');
      setNewTestSeries(data);
    } catch (err) {
      console.error('Failed to fetch new test series:', err);
    } finally {
      setNewTestSeriesLoading(false);
    }
  };

  const fetchBanners = async () => {
    setBannersLoading(true);
    try {
      const data = await pageBannersService.getBanners('exam_page');
      setBanners(data);
    } catch (err) {
      console.error('Failed to fetch banners:', err);
    } finally {
      setBannersLoading(false);
    }
  };

  const fetchTestSeriesData = async () => {
    setTestSeriesLoading(true);
    try {
      const response = await testSeriesService.getTestSeries({
        is_published: true,
        limit: 12,
        page: 1
      });
      setTestSeries(response.data);
    } catch (err) {
      console.error('Failed to fetch test series:', err);
    } finally {
      setTestSeriesLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredSeries();
  }, [filters.category, filters.status, pagination.page, debouncedSearch]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, 400);
    return () => clearTimeout(handle);
  }, [filters.search]);

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

  const fetchFilteredSeries = async () => {
    const requestId = ++activeRequestRef.current;
    setIsLoading(true);
    setError('');
    
    try {
      const categoryIds = filters.category ? filters.category.split(',').map(id => id.trim()).filter(Boolean) : [];
      const response = await testSeriesService.getTestSeries({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        category: categoryIds[0],
        is_published: true
      });

      if (requestId !== activeRequestRef.current) {
        return;
      }

      const sortedSeries = [...response.data].sort((a, b) => {
        const aDate = a.created_at || a.updated_at || '';
        const bDate = b.created_at || b.updated_at || '';
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

      setTestSeries(sortedSeries);
      setPagination(prev => ({
        ...prev,
        total: response.total,
        totalPages: response.totalPages
      }));
    } catch (err: any) {
      if (requestId !== activeRequestRef.current) {
        return;
      }
      setError(err.message || 'Failed to load test series');
    } finally {
      if (requestId !== activeRequestRef.current) {
        return;
      }
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const syncCategoryFilters = (ids: string[]) => {
    if (ids.length === 0) {
      handleFilterChange('category', '');
      return;
    }

    const idString = ids.join(',');
    handleFilterChange('category', idString);
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds(prev => {
      const exists = prev.includes(categoryId);
      const next = exists ? [] : [categoryId];
      syncCategoryFilters(next);
      return next;
    });
  };

  const clearCategorySelection = () => {
    setSelectedCategoryIds([]);
    syncCategoryFilters([]);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      status: DEFAULT_STATUS
    });
    setSelectedCategoryIds([]);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const isFilterDataLoading = categoriesLoading;
  const hasCustomFilters = Boolean(
    filters.search ||
    filters.category ||
    filters.status !== DEFAULT_STATUS
  );

  const filtersPanelContent = (
    <div className="bg-card rounded-xl border border-border p-6">
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
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={selectedCategoryIds.length === 0}
                  onChange={clearCategorySelection}
                />
                <span>All Categories</span>
              </label>
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={selectedCategoryIds.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const getWordCount = (content: string) => {
    if (!content.trim()) return 0;
    return content.trim().split(/\s+/).length;
  };

  const limitWords = (content: string, limit = 100) => {
    if (!content) return '';
    const words = content.trim().split(/\s+/);
    if (words.length <= limit) {
      return content.trim();
    }
    return words.slice(0, limit).join(' ');
  };

  const formatTestimonialContent = (content: string, limit = 100) => {
    const limited = limitWords(content, limit);
    if (!content) return '';
    const originalWords = content.trim().split(/\s+/);
    return originalWords.length > limit ? `${limited}…` : limited;
  };

  const scrollLeft = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      <section className="border-b border-border bg-white/80">
        <div className="container-main py-10 flex flex-col gap-4">
          <div className="space-y-2">
            <Breadcrumbs 
            items={[
              HomeBreadcrumb(),
              { label: 'Mock Test Series' }
            ]}
            variant="light"
            className="mb-6"
          />
            <p className="text-xs uppercase tracking-wide text-primary font-semibold">Bharat Mock Exams</p>
            <h1 className="font-display text-3xl font-bold text-slate-900">Practice with thousands of mock tests</h1>
            <p className="text-slate-600 max-w-3xl">Filter by category, difficulty, and status to find the perfect exam for your preparation.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setPagination(prev => ({ ...prev, page: 1 })); }} className="flex flex-col sm:flex-row gap-3">
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
            <Button type="submit" className="h-10 px-6 text-base font-semibold">
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* Popular Mock Test Series Section */}
      {popularTests.length > 0 && (
        <section className="bg-white border-b border-border">
          <div className="container-main py-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Popular Mock Test Series</h2>
                <p className="text-gray-600 mt-1">Trending tests chosen by our experts</p>
              </div>
              <ChevronRight className="h-6 w-6 text-gray-400" />
            </div>
            
            {popularTestsLoading ? (
              <div className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex-shrink-0 w-80">
                    <Skeleton className="h-64 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative group">
                <button
                  onClick={() => scrollLeft(popularTestsScrollRef)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-700" />
                </button>
                <div ref={popularTestsScrollRef} className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar scroll-smooth">
                  {popularTests.map((popularTest) => (
                    <div key={popularTest.id} className="flex-shrink-0 w-72 snap-start">
                      <ExamCard exam={popularTest.exam} size="compact" />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => scrollRight(popularTestsScrollRef)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-5 w-5 text-slate-700" />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="bg-slate-900 text-white border-b border-slate-800">
        <div className="container-main py-6 space-y-3">
          <div className="flex flex-col gap-2">
            
            <div className="flex flex-wrap items-center gap-3 justify-center text-center">
              <h2 className="text-2xl font-bold">Government exams by categories</h2>
              
            </div>
            
          </div>

          {categoriesLoading ? (
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex-shrink-0 w-28">
                  <div className="w-24 h-24 rounded-2xl bg-white/10 animate-pulse" />
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p className="text-white/60 text-sm">No categories available right now. Please check back later.</p>
          ) : (
            <div className="relative group">
              <button
                onClick={() => scrollLeft(categoriesScrollRef)}
                className="absolute left-0 inset-y-0 my-auto z-10 h-10 w-10 rounded-full bg-white/90 border border-white/30 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5 text-slate-700" />
              </button>
              <div ref={categoriesScrollRef} className="flex gap-5 overflow-x-auto hide-scrollbar pb-3">
                {categories.map((category, index) => {
                const isSelected = selectedCategoryIds.includes(category.id);
                const badgeBackgrounds = [
                  'from-[#E6FBFF] to-[#F8FFFF]',
                  'from-[#FFF5E1] to-[#FFFDF3]',
                  'from-[#F3E5F5] to-[#FEF6FF]',
                  'from-[#E8F5E9] to-[#F9FFFB]',
                  'from-[#FDEDED] to-[#FFF9F9]',
                  'from-[#E3F2FD] to-[#F5FBFF]'
                ];
                const cardBg = badgeBackgrounds[index % badgeBackgrounds.length];
                const categoryHref = category.slug ? `/${category.slug}` : `/category/${category.id}`;

                return (
                  <Link
                    key={category.id}
                    href={categoryHref}
                    className="flex-shrink-0 w-32 text-center group"
                  >
                    <div
                      className={`w-24 h-24 mx-auto rounded-2xl border border-white/30 bg-gradient-to-br ${cardBg} flex items-center justify-center shadow-lg shadow-slate-900/10 transition-transform duration-200 ${
                        isSelected ? 'ring-2 ring-white scale-105' : 'group-hover:scale-105'
                      }`}
                    >
                      {category.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={category.logo_url}
                          alt={category.name}
                          className="h-full w-full object-cover rounded-2xl p-2"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-slate-700">
                          {category.name.slice(0, 3).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span
                      className={`mt-3 block text-sm font-medium ${
                        isSelected ? 'text-white' : 'text-white/80'
                      }`}
                    >
                      {category.name}
                    </span>
                  </Link>
                );
                })}
              </div>
              <button
                onClick={() => scrollRight(categoriesScrollRef)}
                className="absolute right-0 inset-y-0 my-auto z-10 h-10 w-10 rounded-full bg-white/90 border border-white/30 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5 text-slate-700" />
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="container-main py-8">
        <div className="lg:hidden mb-6">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 w-full rounded-full border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600"
          >
            <Filter className="h-4 w-4" />
            {mobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}
          </button>
          {mobileFiltersOpen && <div className="mt-4">{filtersPanelContent}</div>}
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="hidden lg:block lg:w-60 xl:w-64 flex-shrink-0">
            {filtersPanelContent}
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Test Series
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Showing {testSeries.length} test series
                </p>
              </div>
            </div>

            {/* Loading State */}
            {testSeriesLoading && (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite" aria-busy="true">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="card-interactive overflow-hidden h-full flex flex-col border border-border rounded-xl">
                    <Skeleton className="h-32 w-full" />
                    <div className="p-5 space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <div className="grid grid-cols-2 gap-3">
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                      </div>
                      <Skeleton className="h-10 w-full rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && !testSeriesLoading && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
                <p className="text-destructive">{error}</p>
                <Button onClick={fetchTestSeriesData} variant="outline" className="mt-4">
                  Try Again
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!testSeriesLoading && !error && testSeries.length === 0 && (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  No test series found
                </h3>
                <p className="text-muted-foreground mb-6">
                  Check back soon for new test series
                </p>
              </div>
            )}

            {/* Test Series Grid */}
            {!testSeriesLoading && !error && testSeries.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {testSeries.map((series) => (
                  <TestSeriesCard key={series.id} testSeries={series} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Dynamic Banner Section */}
      {!bannersLoading && banners.length > 0 && (
        <div className="container-main mt-8">
          <div className="rounded-2xl overflow-hidden">
            {banners.map((banner) => (
              <div key={banner.id} className="w-full">
                {banner.link_url ? (
                  <Link href={banner.link_url} className="block w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={banner.image_url}
                      alt={banner.alt_text || 'Banner'}
                      className="w-full h-auto object-cover"
                    />
                  </Link>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={banner.image_url}
                    alt={banner.alt_text || 'Banner'}
                    className="w-full h-auto object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why Take Test Series Section */}
      <div className="container-main mt-12 mb-8">
            <div className="rounded-3xl border border-border/60 bg-white shadow-sm p-6 sm:p-8 lg:p-10">
              <h2 className="font-display text-3xl font-bold text-foreground mb-6 text-center">
                Why take Bharat Mock Test Series?
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Card 1 - Latest Exam Patterns */}
                <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-8 border border-blue-100 dark:border-blue-900/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                  <div className="absolute top-6 right-6">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                      <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="absolute -top-2 -right-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-lg">
                        NEW
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-20">
                    <h3 className="font-display text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                      Latest Exam Patterns
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Prepare for the level expected in the upcoming exams with our updated question patterns.
                    </p>
                  </div>
                  
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>

                {/* Card 2 - Save Tests & Questions */}
                <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-2xl p-8 border border-purple-100 dark:border-purple-900/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                  <div className="absolute top-6 right-6">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                      <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="mt-20">
                    <h3 className="font-display text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                      Save Tests & Questions
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Save important Tests & Questions to revise or reattempt them later at your convenience.
                    </p>
                  </div>
                  
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>

                {/* Card 3 - Performance Analysis */}
                <div className="group relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-2xl p-8 border border-amber-100 dark:border-amber-900/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                  <div className="absolute top-6 right-6">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                      <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="mt-20">
                    <h3 className="font-display text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                      In-depth Performance Analysis
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Get insights on your Strengths & Weaknesses, All India Rank & Performance Comparison with the Topper.
                    </p>
                  </div>
                  
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </div>
            </div>
      </div>

      {/* New Test Series For You Section */}
      {newTestSeries.length > 0 && (
        <div className="container-main mt-12 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-sm text-orange-600 dark:text-orange-300 mb-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      New
                    </div>
                    <h2 className="font-display text-2xl font-bold text-foreground">New Test Series For You</h2>
                    <p className="text-sm text-muted-foreground mt-1">Fresh test series tailored for your preparation</p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground" />
                </div>
                
                {newTestSeriesLoading ? (
                  <div className="flex gap-0 overflow-x-auto pb-4 hide-scrollbar">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex-shrink-0 w-80">
                        <Skeleton className="h-64 w-full rounded-xl" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative group">
                    <button
                      onClick={() => scrollLeft(newTestSeriesScrollRef)}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="h-5 w-5 text-slate-700" />
                    </button>
                    <div ref={newTestSeriesScrollRef} className="flex gap-0 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar scroll-smooth">
                      {newTestSeries.map((test) => (
                        <div key={test.id} className="flex-shrink-0 w-72 snap-start">
                          <ExamCard exam={test.exam} size="compact" />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => scrollRight(newTestSeriesScrollRef)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="h-5 w-5 text-slate-700" />
                    </button>
                  </div>
                )}
        </div>
      )}

      {/* Testimonials Section */}
      <section className="container-main mt-16">
        <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top,_#fef3c7,_#fdf2f8_50%,_#f5f3ff)] p-8 md:p-10">
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute -top-16 -right-24 h-64 w-64 rounded-full bg-orange-200 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-pink-200 blur-3xl" />
          </div>

          <div className="relative z-10 space-y-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">
                  Social Proof
                </div>
                <h2 className="font-display text-4xl font-semibold text-slate-900">
                  Aspirants can't stop talking about Bharat Mock
                </h2>
                
                <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                  
                </div>
              </div>

              
            </div>

            <div className="relative">
              {testimonialsLoading ? (
                <div className="flex gap-4 overflow-x-auto hide-scrollbar">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="flex-shrink-0 w-80">
                      <Skeleton className="h-56 w-full rounded-2xl bg-white/60" />
                    </div>
                  ))}
                </div>
              ) : testimonials.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/70 bg-white/70 p-10 text-center">
                  <h3 className="font-display text-2xl font-semibold text-slate-900 mb-2">No stories yet</h3>
                  <p className="text-slate-600">New testimonials will appear here as admins publish them.</p>
                </div>
              ) : (
                <div className="relative group">
                  <button
                    onClick={() => scrollLeft(testimonialsScrollRef)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-700" />
                  </button>
                  <div
                    ref={testimonialsScrollRef}
                    className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar scroll-smooth"
                  >
                    {testimonials.map((item) => (
                      <div key={item.id} className="flex-shrink-0 w-[22rem] snap-start">
                        <div className="relative h-full rounded-3xl bg-gradient-to-br from-white via-white to-white/80 p-[1px] shadow-lg">
                          <div className="h-full rounded-[calc(1.5rem-1px)] bg-white/95 p-6 space-y-4">
                            <div className="flex items-center gap-3">
                              {item.profilePhotoUrl ? (
                                <img
                                  src={item.profilePhotoUrl}
                                  alt={item.name}
                                  className="h-12 w-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-base font-semibold text-orange-600">
                                  {item.name?.slice(0, 1) || 'A'}
                                </div>
                              )}
                              <div>
                                <p className="text-base font-semibold text-slate-900">{item.name}</p>
                                {item.exam && (
                                  <p className="text-xs font-medium uppercase tracking-wide text-orange-500">{item.exam}</p>
                                )}
                              </div>
                              {item.highlight && (
                                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">
                                  Featured
                                </span>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                              “{formatTestimonialContent(item.review || '')}”
                            </p>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                              
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => scrollRight(testimonialsScrollRef)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="h-5 w-5 text-slate-700" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Access Steps Section */}
      <div className="container-main mt-16 mb-12">
              <div className="text-center mb-10">
                <p className="text-sm uppercase tracking-[0.35em] text-blue-500 font-semibold">Get Started Fast</p>
                <h2 className="font-display text-3xl font-bold text-foreground mt-2">
                  How to access free mock tests in 6 easy steps
                </h2>
                <p className="text-muted-foreground mt-1 max-w-3xl mx-auto">
                  Follow this quick flow to start practicing today. Every step is optimized for speed and clarity so you can focus on learning.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {[
                  {
                    step: 1,
                    title: 'Create or log in',
                    description: 'Use your email/mobile to register in seconds. Existing aspirants can sign in directly.'
                  },
                  {
                    step: 2,
                    title: 'Navigate to mock tests',
                    description: 'Head to the Exams page and open our curated mock test collections.'
                  },
                  {
                    step: 3,
                    title: 'Select exam category',
                    description: 'Pick your target like SSC, Banking, Defense, or State exams to filter relevant tests.'
                  },
                  {
                    step: 4,
                    title: 'Choose your test',
                    description: 'Browse curated series, anytime exams, or popular tests and tap the one you want to attempt.'
                  },
                  {
                    step: 5,
                    title: 'Start attempting',
                    description: 'Read the instructions, configure attempt settings, and begin the live mock interface.'
                  },
                  {
                    step: 6,
                    title: 'Review smart analytics',
                    description: 'Get AI-powered insights, accuracy metrics, and AIR comparisons to refine your prep.'
                  }
                ].map((item) => (
                  <div
                    key={item.step}
                    className="relative bg-white border border-border rounded-2xl p-6 shadow-[0_10px_30px_-15px_rgba(15,23,42,0.3)] hover:-translate-y-1 transition-transform"
                  >
                    <div className="absolute -top-4 left-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-semibold shadow-lg">
                      {item.step}
                    </div>
                    <h3 className="mt-4 font-display text-xl font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
      </div>

      {/* SEO Content Block */}
      <div className="container-main">
        <section className="mt-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-10 shadow-2xl">
              <div className="max-w-5xl mx-auto space-y-4">
                <p className="text-xs uppercase tracking-[0.4em] text-blue-300">Master your exams</p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold leading-tight">
                  Conquer 2026 exams with Bharat Mock’s free mock test universe
                </h2>
                <p className="text-slate-100 text-base leading-relaxed">
                  Each year more than five million aspirants compete for coveted roles across SSC, Banking, Railways, Defence, and State services. The ones who succeed build a habit of attempting calibrated <strong className="text-blue-200">mock tests that mirror the exact exam interface</strong>. Bharat Mock curates 100% free test sets mapped to RBI Grade B, IBPS PO, SBI Clerk, SEBI Grade A, SSC CGL, NTPC, and 70+ other competitive tracks so you stay exam-ready without guesswork.
                </p>
                <p className="text-slate-100 text-base leading-relaxed">
                  Our experts reverse-engineer the latest TCS/NTA blueprints, replicate adaptive difficulty, and plug in AI-driven performance analytics. That means you master time management, accuracy, and question selection before the real paper. Whether you’re looking for weekly Anytime Exams, deep-dive sectional quizzes, or full-length practice sets, Bharat Mock’s free test series ensures you’re always preparing on the most recent <em className="text-blue-200">exam pattern for 2026</em>.
                </p>
                <div className="grid sm:grid-cols-3 gap-4 text-sm text-slate-200">
                  <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                    <p className="text-3xl font-bold text-blue-200">80+</p>
                    <p className="mt-1">exam categories with detailed mock coverage</p>
                  </div>
                  <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                    <p className="text-3xl font-bold text-blue-200">2M+</p>
                    <p className="mt-1">attempts analyzed using smart ranking algorithms</p>
                  </div>
                  <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                    <p className="text-3xl font-bold text-blue-200">99.7%</p>
                    <p className="mt-1">accuracy with TCS/NTA CBT interface simulation</p>
                  </div>
                </div>
              </div>
        </section>
      </div>

      {/* FAQ Section */}
      <section className="py-10">
        <div className="container-main">
                <div className="max-w-4xl mx-auto">
                  <h2 className="font-display text-4xl font-bold text-foreground mb-12 text-center">
                    FAQ's
                  </h2>
                  <div className="space-y-4">
                    {[
                      {
                        q: 'Are Bharat Mock tests really free to attempt?',
                        a: 'Yes. Every registered user gets instant access to curated free tests across SSC, IBPS, SBI, Railways, NDA, and more. Premium series exist for deeper analytics, but the entry tier is always free.'
                      },
                      {
                        q: 'How often are exam patterns updated?',
                        a: 'Our content team refreshes question banks every time TCS/NTA updates the blueprint or releases a new notification, ensuring alignment with 2026 exam trends.'
                      },
                      {
                        q: 'Can I attempt tests anytime on mobile?',
                        a: 'Absolutely. The platform is responsive and supports Android/iOS browsers. You can attempt, pause, and resume on any device with stable internet.'
                      },
                      {
                        q: 'Do I get AIR (All India Rank) after each mock?',
                        a: 'Yes. After submitting, you receive All India Rank, percentile, accuracy, and topic-level insights driven by our analytics engine.'
                      },
                      {
                        q: 'How many exams are covered right now?',
                        a: 'We cover 80+ central and state exams—from SSC CGL, CHSL, JE to SBI PO, IBPS Clerk, Railway NTPC, Group D, CDS, AFCAT, and more.'
                      },
                      {
                        q: 'Can I download solutions or explanations?',
                        a: 'Each question carries explainers, shortcuts, and PDF exports so you can revise offline and share notes with friends.'
                      },
                      {
                        q: 'Is there sectional timing like the actual CBT?',
                        a: 'Yes, our mock engine simulates sectional timing, negative marking, and auto-submit behavior exactly like SSC and Banking CBTs.'
                      },
                      {
                        q: 'How do I track progress across attempts?',
                        a: 'Navigate to your dashboard to view attempt history, accuracy trendlines, and topic heatmaps that highlight weak zones.'
                      },
                      {
                        q: 'Can I retake the same mock?',
                        a: 'You can retake most free tests multiple times. Scores are stored separately so you can benchmark improvement.'
                      },
                      {
                        q: 'Do you provide bilingual tests?',
                        a: 'Yes. Most of our mock tests support English and Hindi, and we continue to add more regional language support based on demand.'
                      }
                    ].map((item, index) => (
                      <div 
                        key={item.q}
                        className="bg-card border border-border rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-medium text-foreground">
                            {index + 1}. {item.q}
                          </span>
                          {expandedFaq === index ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </button>
                        {expandedFaq === index && (
                          <div className="px-6 py-4 bg-muted/30 border-t border-border">
                            <p className="text-muted-foreground">
                              {item.a}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
        </div>
      </section>
    </div>
  );
}
