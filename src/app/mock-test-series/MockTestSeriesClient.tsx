"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Filter, BookOpen, Clock, Award, ChevronRight, Flame, Star, StarOff, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { StandardExamCard } from '@/components/exam/StandardExamCard';
import { TestSeriesCard } from '@/components/exam/TestSeriesCard';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { testSeriesService, TestSeries } from '@/lib/api/testSeriesService';
import type { Category, Subcategory } from '@/lib/api/taxonomyService';
import { pagePopularTestsService, PopularTest } from '@/lib/api/pagePopularTestsService';
import { pageBannersService, PageBanner } from '@/lib/api/pageBannersService';
import { testimonialsService, Testimonial } from '@/lib/api/testimonialsService';
import { Exam } from '@/types';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const DEFAULT_STATUS = 'anytime';

interface InitialData {
  testSeries: TestSeries[];
  categories: Category[];
  subcategories: Subcategory[];
  total: number;
  totalPages: number;
}

interface SSRExtras {
  initialPopularTests?: PopularTest[];
  initialNewTestSeries?: PopularTest[];
  initialBanners?: PageBanner[];
  initialTestimonials?: Testimonial[];
}

function ExamsPageContent({ initialData, initialPopularTests, initialNewTestSeries, initialBanners, initialTestimonials }: { initialData: InitialData } & SSRExtras) {
  const searchParams = useSearchParams();
  const urlCategory = searchParams?.get('category') || '';
  const urlSubcategory = searchParams?.get('subcategory') || '';
  const urlSearch = searchParams?.get('search') || '';
  const { user, isAuthenticated } = useAuth();
  const [testSeries, setTestSeries] = useState<TestSeries[]>(initialData.testSeries);
  const [popularTests, setPopularTests] = useState<PopularTest[]>(initialPopularTests ?? []);
  const [popularTestsLoading, setPopularTestsLoading] = useState(initialPopularTests === undefined);
  const [newTestSeries, setNewTestSeries] = useState<PopularTest[]>(initialNewTestSeries ?? []);
  const [newTestSeriesLoading, setNewTestSeriesLoading] = useState(initialNewTestSeries === undefined);
  const [banners, setBanners] = useState<PageBanner[]>(initialBanners ?? []);
  const [bannersLoading, setBannersLoading] = useState(initialBanners === undefined);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials ?? []);
  const [testimonialsLoading, setTestimonialsLoading] = useState(initialTestimonials === undefined);
  const [testimonialsPaused, setTestimonialsPaused] = useState(false);
  const [categories, setCategories] = useState<Category[]>(initialData.categories);
  const [subcategories, setSubcategories] = useState<Subcategory[]>(initialData.subcategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const isInitialMount = useRef(true);
  const popularTestsScrollRef = useRef<HTMLDivElement>(null);
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const newTestSeriesScrollRef = useRef<HTMLDivElement>(null);
  const testimonialsScrollRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [pageReady, setPageReady] = useState(initialData.testSeries.length > 0);

  const [filters, setFilters] = useState({
    search: urlSearch,
    category: urlCategory,
    subcategory: urlSubcategory,
    status: DEFAULT_STATUS
  });
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const activeRequestRef = useRef(0);

  useEffect(() => {
    if (categories.length > 0 && filters.category) {
      const match = categories.find(c => c.slug === filters.category || c.name === filters.category);
      if (match && selectedCategoryId !== match.id) setSelectedCategoryId(match.id);
    }
  }, [categories, filters.category]);

  useEffect(() => {
    if (subcategories.length > 0 && filters.subcategory) {
      const match = subcategories.find(c => c.slug === filters.subcategory || c.name === filters.subcategory);
      if (match && selectedSubcategoryId !== match.id) setSelectedSubcategoryId(match.id);
    }
  }, [subcategories, filters.subcategory]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: initialData.total,
    totalPages: initialData.totalPages
  });

  useEffect(() => {
    // Only fetch client-side when server didn't provide the data (undefined = server failed)
    if (initialPopularTests === undefined) fetchPopularTests();
    if (initialNewTestSeries === undefined) fetchNewTestSeries();
    if (initialBanners === undefined) fetchBanners();
    if (initialTestimonials === undefined) fetchTestimonials();
  }, [initialPopularTests, initialNewTestSeries, initialBanners, initialTestimonials]);

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

  // Auto-scroll testimonials
  useEffect(() => {
    if (testimonialsLoading || testimonials.length === 0) return;

    const scrollContainer = testimonialsScrollRef.current;
    if (!scrollContainer) return;

    const scrollSpeed = 2;
    const interval = 50;
    let intervalId: number;

    const timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        if (!testimonialsPaused && scrollContainer) {
          const currentScroll = scrollContainer.scrollLeft;
          const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
          
          if (maxScroll > 0) {
            const newScroll = currentScroll + scrollSpeed;
            
            if (newScroll >= maxScroll) {
              scrollContainer.scrollLeft = 0;
            } else {
              scrollContainer.scrollLeft = newScroll;
            }
          }
        }
      }, interval);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [testimonialsLoading, testimonials, testimonialsPaused]);


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

  useEffect(() => {
    // Skip first render — initial data fetched server-side
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchFilteredSeries();
  }, [filters.category, filters.subcategory, filters.status, pagination.page, debouncedSearch]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, 400);
    return () => clearTimeout(handle);
  }, [filters.search]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileFiltersOpen]);


  const fetchFilteredSeries = async () => {
    const requestId = ++activeRequestRef.current;
    setIsLoading(true);
    setError('');
    try {
      const params: any = { page: pagination.page, limit: pagination.limit, is_published: true };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (filters.category.trim()) params.category = filters.category.trim();
      if (filters.subcategory.trim()) params.subcategory = filters.subcategory.trim();

      const response = await testSeriesService.getTestSeries(params);
      if (requestId !== activeRequestRef.current) return;

      const sortedSeries = [...response.data].sort((a, b) =>
        new Date(b.created_at || b.updated_at || '').getTime() -
        new Date(a.created_at || a.updated_at || '').getTime()
      );
      setTestSeries(sortedSeries);
      setPagination((prev) => ({ ...prev, total: response.total, totalPages: response.totalPages }));
    } catch (err: any) {
      if (requestId !== activeRequestRef.current) return;
      setError(err.message || 'Failed to load test series');
    } finally {
      if (requestId !== activeRequestRef.current) return;
      setIsLoading(false);
      setPageReady(true);
      
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const buildCategoryValue = (id: string) => {
    const c = categories.find((c) => c.id === id);
    return c ? (c.slug || c.name || '') : '';
  };

  const buildSubcategoryValue = (id: string) => {
    const s = subcategories.find((s) => s.id === id);
    return s ? (s.slug || s.name || '') : '';
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    handleFilterChange('category', buildCategoryValue(categoryId));
    if (selectedSubcategoryId) {
      const sub = subcategories.find((s) => s.id === selectedSubcategoryId);
      if (!categoryId || (sub && sub.category_id !== categoryId)) {
        setSelectedSubcategoryId('');
        handleFilterChange('subcategory', '');
      }
    }
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    setSelectedSubcategoryId(subcategoryId);
    handleFilterChange('subcategory', buildSubcategoryValue(subcategoryId));
    if (subcategoryId) {
      const sub = subcategories.find((s) => s.id === subcategoryId);
      if (sub && selectedCategoryId !== sub.category_id) {
        setSelectedCategoryId(sub.category_id);
        handleFilterChange('category', buildCategoryValue(sub.category_id));
      }
    }
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', subcategory: '', status: DEFAULT_STATUS });
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const filteredSubcategories = selectedCategoryId
    ? subcategories.filter((s) => s.category_id === selectedCategoryId)
    : subcategories;

  const isFilterDataLoading = categoriesLoading || subcategoriesLoading;
  const hasCustomFilters = Boolean(filters.search || selectedCategoryId || selectedSubcategoryId);

  const filtersPanelContent = (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <p className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          Filters
        </p>
        {hasCustomFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
        )}
      </div>

      {isFilterDataLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Category</label>
            <div className="border border-border rounded-lg p-3 space-y-2 lg:max-h-48 lg:overflow-y-auto">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="radio" name="ts-category" className="h-4 w-4 accent-primary"
                  checked={selectedCategoryId === ''} onChange={() => handleCategoryChange('')} />
                <span>All Categories</span>
              </label>
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="ts-category" className="h-4 w-4 accent-primary"
                    checked={selectedCategoryId === category.id}
                    onChange={() => handleCategoryChange(category.id)} />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sub-category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Sub-category</label>
            <div className="border border-border rounded-lg p-3 space-y-2 lg:max-h-48 lg:overflow-y-auto">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="radio" name="ts-subcategory" className="h-4 w-4 accent-primary"
                  checked={selectedSubcategoryId === ''}
                  onChange={() => handleSubcategoryChange('')}
                  disabled={filteredSubcategories.length === 0} />
                <span>{selectedCategoryId ? 'All Sub-categories' : 'Select category first'}</span>
              </label>
              {filteredSubcategories.map((sub) => (
                <label key={sub.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="ts-subcategory" className="h-4 w-4 accent-primary"
                    checked={selectedSubcategoryId === sub.id}
                    onChange={() => handleSubcategoryChange(sub.id)} />
                  <span>{sub.name}</span>
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

  const scrollLeft = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Full-page skeleton shown until first data load completes
  if (!pageReady) {
    return (
      <div className="min-h-screen bg-muted/30 animate-pulse">
        {/* Hero skeleton */}
        <div className="gradient-hero py-10">
          <div className="container-main space-y-4">
            <Skeleton className="h-4 w-32 bg-white/20 rounded-full" />
            <Skeleton className="h-10 w-2/3 bg-white/20 rounded-lg" />
            <Skeleton className="h-5 w-1/2 bg-white/20 rounded-lg" />
            <div className="flex gap-3 mt-6 max-w-2xl">
              <Skeleton className="h-10 flex-1 bg-white/20 rounded-lg" />
              <Skeleton className="h-10 w-24 bg-white/20 rounded-lg" />
            </div>
          </div>
        </div>
        {/* Popular tests skeleton */}
        <div className="bg-white border-b border-border">
          <div className="container-main py-12">
            <Skeleton className="h-7 w-56 mb-2 rounded-lg" />
            <Skeleton className="h-4 w-40 mb-6 rounded-lg" />
            <div className="flex gap-3 sm:gap-4 lg:gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl flex-shrink-0 w-72 sm:w-80 md:w-[calc(50%-12px)] lg:w-[calc(33.333%-14px)] xl:w-[calc(25%-15px)]" />
              ))}
            </div>
          </div>
        </div>
        {/* Categories skeleton */}
        <div className="bg-slate-900 border-b border-slate-800">
          <div className="container-main py-6">
            <Skeleton className="h-7 w-64 mb-4 bg-white/10 rounded-lg mx-auto" />
            <div className="flex gap-5 justify-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-32 flex flex-col items-center gap-3">
                  <Skeleton className="w-24 h-24 rounded-2xl bg-white/10" />
                  <Skeleton className="h-3 w-20 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Grid skeleton */}
        <div className="container-main py-8">
          <div className="flex gap-8">
            <Skeleton className="hidden lg:block lg:w-60 xl:w-64 h-64 rounded-xl flex-shrink-0" />
            <div className="flex-1 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border border-border rounded-xl overflow-hidden">
                  <Skeleton className="h-32 w-full" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <div className="grid grid-cols-2 gap-3">
                      <Skeleton className="h-14 rounded-lg" />
                      <Skeleton className="h-14 rounded-lg" />
                    </div>
                    <Skeleton className="h-9 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-muted/30 transition-opacity duration-300 ${pageReady ? 'opacity-100' : 'opacity-0'}`}>

      <section className="relative gradient-hero py-4 md:py-10">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />
        <div className="container-main">
          <div className="space-y-2 md:space-y-4">
            <Breadcrumbs
              items={[
                HomeBreadcrumb(),
                { label: 'Mock Test Series' }
              ]}
              variant="dark"
              className="mb-2 md:mb-6"
            />
            <h1 className="font-display text-2xl md:text-5xl font-bold text-background">Boost Your Score with Smart Mock Test Practice</h1>
            <p className="text-sm md:text-lg text-background/80 max-w-3xl">Experience real exam pressure and improve performance with regular mock tests.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setPagination(prev => ({ ...prev, page: 1 })); }} className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-6 max-w-2xl">
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

      {/* Popular Mock Test Series Section - Hide when searching */}
      {!debouncedSearch && popularTests.length > 0 && (
        <section className="bg-white border-b border-border">
          <div className="container-main py-8 sm:py-12">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Popular Mock Test Series</h2>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">Trending tests chosen by our experts</p>
              </div>
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
            </div>

            {popularTestsLoading ? (
              <div className="flex gap-3 sm:gap-4 lg:gap-6 overflow-x-auto pb-4 hide-scrollbar">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex-shrink-0 w-72 sm:w-80">
                    <Skeleton className="h-64 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative group">
                <button
                  onClick={() => scrollLeft(popularTestsScrollRef)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white border border-slate-200 shadow-lg items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50 hidden sm:flex"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-700" />
                </button>
                <div ref={popularTestsScrollRef} className="flex gap-3 sm:gap-4 lg:gap-5 overflow-x-auto px-4 -mx-4 sm:px-0 sm:mx-0 pb-6 snap-x snap-mandatory hide-scrollbar scroll-smooth mobile-scroll-snap mobile-scroll-container">
                  {popularTests.filter(pt => pt?.exam).map((popularTest) => (
                    <div key={popularTest.id} className="flex-shrink-0 snap-start w-[17rem] sm:w-80 md:w-[calc(50%-12px)] lg:w-[calc(33.333%-14px)] xl:w-[calc(25%-15px)]">
                      <StandardExamCard
                        exam={{
                          ...popularTest.exam,
                          category_logo_url: popularTest.exam?.exam_categories?.logo_url,
                          category_icon: popularTest.exam?.exam_categories?.icon,
                        }}
                        ctaLabel="Attempt Now"
                        showAttemptsTop={true}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => scrollRight(popularTestsScrollRef)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white border border-slate-200 shadow-lg items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50 hidden sm:flex"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-5 w-5 text-slate-700" />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Government exams by categories - Hide when searching */}
      {!debouncedSearch && (
        <section className="bg-slate-900 text-white border-b border-slate-800">
          <div className="container-main py-6 space-y-3">
            <div className="flex flex-col gap-2">

              <div className="flex flex-wrap items-center gap-3 justify-center text-center">
                <h2 className="text-m md:text-xl font-bold">Government exams by categories</h2>

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
                  className="absolute left-0 inset-y-0 my-auto z-10 h-11 w-10 rounded-full bg-white/90 border border-white/30 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-700" />
                </button>
                <div ref={categoriesScrollRef} className="flex gap-4 md:gap-5 overflow-x-auto hide-scrollbar pb-4 justify-start md:justify-center px-4 pr-12 md:pr-0">
                  {categories.map((category, index) => {
                    const isSelected = selectedCategoryId === category.id;
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
                        className="flex-shrink-0 w-16 md:w-32 text-center group"
                      >
                        <div
                          className={`w-14 h-14 md:w-20 md:h-20 mx-auto rounded-2xl border border-white/30 bg-gradient-to-br ${cardBg} flex items-center justify-center shadow-lg shadow-slate-900/10 transition-transform duration-200 ${isSelected ? 'ring-2 ring-white scale-105' : 'group-hover:scale-95'
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
                            <span className="text-[10px] md:text-lg font-semibold text-slate-700">
                              {category.name.slice(0, 3).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span
                          className={`mt-1 md:mt-3 block text-[9px] md:text-sm font-medium leading-tight ${isSelected ? 'text-white' : 'text-white/80'
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
      )}

      <div className="container-main pt-8 pb-0">
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
                  {debouncedSearch ? `Search Results for "${debouncedSearch}"` : 'Test Series'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {debouncedSearch
                    ? `Found ${testSeries.length} test series matching your search`
                    : `Showing ${testSeries.length} test series`
                  }
                </p>
              </div>
              {debouncedSearch && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters(prev => ({ ...prev, search: '' }));
                    setDebouncedSearch('');
                  }}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Browse
                </Button>
              )}
            </div>

            {/* Initial skeleton load — only shown before pageReady, kept here as fallback */}
            {!pageReady && (
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
            {error && !isLoading && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
                <p className="text-destructive">{error}</p>
                <Button onClick={fetchFilteredSeries} variant="outline" className="mt-4">
                  Try Again
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && testSeries.length === 0 && (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  {debouncedSearch ? 'No test series found' : 'No test series available'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {debouncedSearch
                    ? `No test series match "${debouncedSearch}". Try different keywords or browse categories below.`
                    : 'Check back soon for new test series'
                  }
                </p>
                {debouncedSearch && (
                  <Button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, search: '' }));
                      setDebouncedSearch('');
                    }}
                    variant="outline"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}

            {/* Test Series Grid — with overlay spinner when filter fetch is in progress */}
            {!error && testSeries.length > 0 && (
              <div className="relative">
                {isLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/85">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <span className="text-sm text-muted-foreground font-medium">Filtering…</span>
                    </div>
                  </div>
                )}
                <div className={`grid gap-3 sm:gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-200 ${isLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                  {testSeries.map((series) => (
                    <TestSeriesCard key={series.id} testSeries={series} />
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background">
          <div className="flex h-full flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-4">
              <div>
                <p className="font-display text-xl font-bold text-foreground">Filters</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                onClick={() => setMobileFiltersOpen(false)}
              >
                Close
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="rounded-none border-0 bg-transparent p-0">
                {filtersPanelContent}
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-border bg-background px-4 py-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
                  onClick={() => {
                    clearFilters();
                    setMobileFiltersOpen(false);
                  }}
                >
                  Clear All
                </Button>
                <Button className="flex-1" onClick={() => setMobileFiltersOpen(false)}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!mobileFiltersOpen && (
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="lg:hidden fixed bottom-5 left-4 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold"
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>
      )}

      {/* Dynamic Banner Section - Hide when searching */}
      {!debouncedSearch && !bannersLoading && banners.length > 0 && (
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

      {/* Why Take Test Series Section - Hide when searching */}
      {!debouncedSearch && (
        <div className="container-main mt-12 mb-8">
          <div className="rounded-3xl border border-border/60 bg-white shadow-sm p-6 sm:p-8 lg:p-10">
            <h2 className="font-display text-3xl font-bold text-foreground mb-6 text-center">
              Why take Bharat Mock Test Series?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1 - Real Exam Experience */}
              <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-6 sm:p-8 border border-blue-100 dark:border-blue-900/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 lg:gap-6">
                  <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
                      Real Exam Experience
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Practice mock tests designed to match the real exam pattern and difficulty, so you feel fully prepared before the actual exam.
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Card 2 - Improve Speed & Accuracy */}
              <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-2xl p-6 sm:p-8 border border-purple-100 dark:border-purple-900/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 lg:gap-6">
                  <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
                      Improve Speed & Accuracy
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Strengthen your problem-solving skills with regular practice and improve your speed, accuracy, and confidence step by step.
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Card 3 - In-depth Analysis */}
              <div className="group relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-2xl p-6 sm:p-8 border border-amber-100 dark:border-amber-900/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 lg:gap-6">
                  <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
                      In-depth Analysis
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Analyse your performance after every test, identify weak areas, and improve continuously with detailed insights.
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Test Series For You Section - Hide when searching */}
      {!debouncedSearch && newTestSeries.length > 0 && (
        <div className="container-main mt-8 sm:mt-12 mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs sm:text-sm text-orange-600 dark:text-orange-300 mb-2">
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                New
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">New Test Series For You</h2>
              <p className="text-sm text-muted-foreground mt-1">Fresh test series tailored for your preparation</p>
            </div>
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          </div>

          {newTestSeriesLoading ? (
            <div className="flex gap-3 sm:gap-4 lg:gap-6 overflow-x-auto pb-4 hide-scrollbar">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex-shrink-0 w-72 sm:w-80">
                  <Skeleton className="h-64 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <div className="relative group">
              <button
                onClick={() => scrollLeft(newTestSeriesScrollRef)}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white border border-slate-200 shadow-lg items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50 hidden sm:flex"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5 text-slate-700" />
              </button>
              <div ref={newTestSeriesScrollRef} className="flex gap-3 sm:gap-4 lg:gap-5 overflow-x-auto px-4 -mx-4 sm:px-0 sm:mx-0 pb-6 snap-x snap-mandatory hide-scrollbar scroll-smooth mobile-scroll-snap mobile-scroll-container">
                {newTestSeries.filter(t => t?.exam).map((test) => (
                  <div key={test.id} className="flex-shrink-0 snap-start w-[17rem] sm:w-80 md:w-[calc(50%-12px)] lg:w-[calc(33.333%-14px)] xl:w-[calc(25%-15px)]">
                    <StandardExamCard
                      exam={{
                        ...test.exam,
                        category_logo_url: test.exam?.exam_categories?.logo_url,
                        category_icon: test.exam?.exam_categories?.icon,
                      }}
                      ctaLabel="Attempt Now"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => scrollRight(newTestSeriesScrollRef)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white border border-slate-200 shadow-lg items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50 hidden sm:flex"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5 text-slate-700" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Testimonials Section - Hide when searching */}
      {!debouncedSearch && (
        <section className="container-main mt-16">
          <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top,_#fef3c7,_#fdf2f8_50%,_#f5f3ff)] p-8 md:p-10">
            <div className="pointer-events-none absolute inset-0 opacity-70">
              <div className="absolute -top-16 -right-24 h-64 w-64 rounded-full bg-orange-200 blur-3xl" />
              <div className="absolute bottom-0 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-pink-200 blur-3xl" />
            </div>

            <div className="relative z-10 space-y-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">
                    View Reviews
                  </div>
                  <h2 className="font-display text-4xl font-semibold text-slate-900 whitespace-nowrap">
                    Trusted by Aspirants
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
                  <div className="relative group" onMouseEnter={() => setTestimonialsPaused(true)} onMouseLeave={() => setTestimonialsPaused(false)}>
                    <button
                      onClick={() => scrollLeft(testimonialsScrollRef)}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="h-5 w-5 text-slate-700" />
                    </button>
                    <div
                      ref={testimonialsScrollRef}
                      className="flex gap-6 overflow-x-auto px-4 -mx-4 sm:px-0 sm:mx-0 pb-6 hide-scrollbar"
                    >
                      {testimonials.map((item) => (
                        <div key={item.id} className="flex-shrink-0 w-[17rem] sm:w-[22rem] max-w-[85vw] snap-start">
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
      )}

      {/* Access Steps Section - Hide when searching */}
      {!debouncedSearch && (
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
      )}

      {/* SEO Content Block - Hide when searching */}
      {!debouncedSearch && (
        <div className="container-main">
          <section className="mt-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-10 shadow-2xl">
            <div className="max-w-5xl mx-auto space-y-8">
              <h2 className="font-display text-3xl sm:text-4xl font-bold leading-tight">
                How Bharat Mock Test Series Helps You Prepare Better for Exams
              </h2>
              <div className="space-y-4 text-slate-100 text-base leading-relaxed">
                <p>Bharat Mock Mock Test Series gives you practice tests for SSC, Banking, Railway, Police, and other competitive exams.</p>
                <p>You can practice questions based on the latest exam pattern and improve your speed, accuracy, and confidence in a real exam-like setup.</p>
                <p>Here, you can find organised mock tests with simple filters by category and difficulty, to help you plan your preparation and improve your performance.</p>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-white">Why Practice Mock Tests on Bharat Mock?</h2>
                <div className="space-y-4 text-slate-100 text-base leading-relaxed">
                  <p>Most students read, revise and then skip the most important step, which is testing under real exam pressure. A good mock test is not only a test of your knowledge. It builds your time management, shows the weak areas and trains you to perform on the actual day.</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-blue-200">Here is what makes this platform different:</h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-100 text-base">
                    <li>Tests are designed to closely replicate the real exam interface so you feel at home on exam day</li>
                    <li>AI-powered performance analysis makes your rank transparent and makes your improvement trackable</li>
                    <li>Added new tests regularly to be in tune with the latest exam pattern for 2026</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-white">What Mock Tests Will You Find Here?</h2>
                <p className="text-slate-100 text-base leading-relaxed">Here you will find the latest mock tests, practice sets, and test series for almost all major competitive exams in India. This includes exam-specific practice for SSC, Banking, Railway, Police, and State exams.</p>
                <ul className="list-disc pl-6 space-y-1 text-slate-100 text-base">
                  <li><strong>SSC Exams:</strong> SSC CGL, CHSL, MTS, GD Constable, CPO, Stenographer, SSC JE, and more.</li>
                  <li><strong>Banking Exams:</strong> IBPS PO, IBPS Clerk, SBI PO, SBI Clerk, RBI Grade B, RBI Assistant, NABARD, LIC AAO, etc.</li>
                  <li><strong>Railway Exams:</strong> RRB NTPC, RPF constable, Group D, ALP, Technician, and other railway exams.</li>
                  <li><strong>Police & Defence Exams:</strong> Police Bharti, Constable, SI, Army, CAPF, and other defence exams.</li>
                  <li><strong>State-Level Exams:</strong> CET, Patwari, State Public Service Commission (PSC), Gram Sevak, Talathi, and more.</li>
                </ul>
                <p className="text-slate-100 text-base leading-relaxed">You will get subject-wise tests, full mock tests, and <Link href="/previous-year-papers" className="text-blue-200 hover:text-white hover:underline">previous year question papers</Link> to enhance your speed, accuracy, and confidence.</p>
                <p className="text-slate-100 text-base leading-relaxed">The best part is, you can either take a quick 20-minute <Link href="/quizzes" className="text-blue-200 hover:text-white hover:underline">sectional quiz</Link> or attempt a full 3-hour mock test based on your schedule.</p>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-white">Quick Look: Popular Mock Test Categories</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-white/20">
                    <thead>
                      <tr className="bg-white/10">
                        <th className="border border-white/20 px-4 py-3 text-left font-semibold">Exam Category</th>
                        <th className="border border-white/20 px-4 py-3 text-left font-semibold">Test Type</th>
                        <th className="border border-white/20 px-4 py-3 text-left font-semibold">Difficulty Options</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-white/20 px-4 py-3">SSC Mock Test</td>
                        <td className="border border-white/20 px-4 py-3">Full-length + Sectional</td>
                        <td className="border border-white/20 px-4 py-3">Easy / Medium / Hard</td>
                      </tr>
                      <tr className="bg-white/5">
                        <td className="border border-white/20 px-4 py-3">Bank Exam Mock Test</td>
                        <td className="border border-white/20 px-4 py-3">IBPS, SBI, RBI Series</td>
                        <td className="border border-white/20 px-4 py-3">Easy / Medium / Hard</td>
                      </tr>
                      <tr>
                        <td className="border border-white/20 px-4 py-3">Railway Mock Test</td>
                        <td className="border border-white/20 px-4 py-3">NTPC, Group D, ALP</td>
                        <td className="border border-white/20 px-4 py-3">Easy / Medium / Hard</td>
                      </tr>
                      <tr className="bg-white/5">
                        <td className="border border-white/20 px-4 py-3">Police Bharti Test</td>
                        <td className="border border-white/20 px-4 py-3">State + Central Level</td>
                        <td className="border border-white/20 px-4 py-3">Easy / Medium / Hard</td>
                      </tr>
                      <tr>
                        <td className="border border-white/20 px-4 py-3">Online Test Series</td>
                        <td className="border border-white/20 px-4 py-3">Weekly Anytime Exams</td>
                        <td className="border border-white/20 px-4 py-3">Adaptive Difficulty</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-white">Updated as per the Latest Exam Pattern</h2>
                <ul className="list-disc pl-6 space-y-2 text-slate-100 text-base">
                  <li>Regular updates as per the latest exam trends and syllabus updates</li>
                  <li>Copies the difficulty and question style of the real exam</li>
                  <li>Makes sure that practice is always relevant and up to date</li>
                </ul>
                <p className="text-slate-100 text-base leading-relaxed">Mock tests are regularly updated to be in sync with the latest exam pattern and syllabus changes. In other words, you are always working on the most relevant and up-to-date questions.</p>
                <p className="text-slate-100 text-base leading-relaxed">The tests are adapted as exam trends change, so you're always up-to-date with your preparation. You will be exposed to the same level of difficulty and style of questions that appear in the real exams.</p>
                <p className="text-slate-100 text-base leading-relaxed">This way, you are aligned with what examiners are actually asking for. Your preparation remains relevant, practical, and exam-ready at all times.</p>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-white">Start Where You Are, Get Where You Want to Be</h2>
                <div className="space-y-4 text-slate-100 text-base leading-relaxed">
                  <p>It does not matter whether you are starting from scratch or are already 60% through your preparation.</p>
                  <p>The filter system lets you pick up right where you left off. Filter by exam status to find tests you haven't taken yet, or look back at older sets to see how much you've improved.</p>
                  <p>Every year, more than 5 million aspirants apply for SSC, Banking and Railway jobs. The people who crack it aren't necessarily the brightest. They are the most regular ones.</p>
                  <p>The difference between selection and rejection is the habit of taking one mock test daily, analysing your mistakes and re-attempting the weak areas.</p>
                  <p>Your next mock test is a click away. Select your difficulty, filter by category and get started today.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

    </div>
  );
}

export default function MockTestSeriesClient({ initialData, ...ssrExtras }: { initialData: InitialData } & SSRExtras) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/30 animate-pulse" />}>
      <ExamsPageContent initialData={initialData} {...ssrExtras} />
    </Suspense>
  );
}
