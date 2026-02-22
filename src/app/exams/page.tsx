"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen, Clock, Award, ChevronRight, Flame, Star, StarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ExamCard } from '@/components/exam/ExamCard';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { examService } from '@/lib/api/examService';
import { taxonomyService, Difficulty, Category, Subcategory } from '@/lib/api/taxonomyService';
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
  const [exams, setExams] = useState<Exam[]>([]);
  const [popularTests, setPopularTests] = useState<PopularTest[]>([]);
  const [popularTestsLoading, setPopularTestsLoading] = useState(true);
  const [newTestSeries, setNewTestSeries] = useState<PopularTest[]>([]);
  const [newTestSeriesLoading, setNewTestSeriesLoading] = useState(true);
  const [banners, setBanners] = useState<PageBanner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [myTestimonial, setMyTestimonial] = useState<Testimonial | null>(null);
  const [myTestimonialLoading, setMyTestimonialLoading] = useState(true);
  const [testimonialForm, setTestimonialForm] = useState({
    title: '',
    content: '',
    rating: 5
  });
  const [testimonialSaving, setTestimonialSaving] = useState(false);
  const [testimonialDeleting, setTestimonialDeleting] = useState(false);
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
  const [selectedDifficultyId, setSelectedDifficultyId] = useState('');
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
    fetchDifficulties();
    fetchPopularTests();
    fetchNewTestSeries();
    fetchBanners();
    fetchTestimonials();
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

  useEffect(() => {
    if (!isAuthenticated) {
      setMyTestimonial(null);
      setMyTestimonialLoading(false);
      return;
    }

    const loadOwn = async () => {
      setMyTestimonialLoading(true);
      try {
        const data = await testimonialsService.getMyTestimonial();
        setMyTestimonial(data);
        setTestimonialForm({
          title: data?.title || '',
          content: data?.content || '',
          rating: data?.rating || 5
        });
      } catch (err) {
        console.error('Failed to fetch my testimonial:', err);
      } finally {
        setMyTestimonialLoading(false);
      }
    };

    loadOwn();
  }, [isAuthenticated]);

  const handleTestimonialFormChange = (field: 'title' | 'content' | 'rating', value: string | number) => {
    setTestimonialForm(prev => ({
      ...prev,
      [field]: field === 'rating' ? Number(value) : value
    }));
  };

  const handleSubmitTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    if (!testimonialForm.content.trim()) {
      alert('Please share a quick note about your experience.');
      return;
    }

    setTestimonialSaving(true);
    try {
      if (myTestimonial) {
        const updated = await testimonialsService.updateTestimonial(myTestimonial.id, testimonialForm);
        setMyTestimonial(updated);
        setTestimonials(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      } else {
        const created = await testimonialsService.createTestimonial(testimonialForm);
        setMyTestimonial(created);
        setTestimonials(prev => [created, ...prev]);
      }
    } catch (err: any) {
      console.error('Failed to save testimonial:', err);
      alert(err.message || 'Failed to save testimonial');
    } finally {
      setTestimonialSaving(false);
    }
  };

  const handleDeleteTestimonial = async () => {
    if (!myTestimonial) return;
    if (!confirm('Delete your testimonial?')) return;

    setTestimonialDeleting(true);
    try {
      await testimonialsService.deleteTestimonial(myTestimonial.id);
      setTestimonials(prev => prev.filter(t => t.id !== myTestimonial.id));
      setMyTestimonial(null);
      setTestimonialForm({ title: '', content: '', rating: 5 });
    } catch (err: any) {
      console.error('Failed to delete testimonial:', err);
      alert(err.message || 'Failed to delete testimonial');
    } finally {
      setTestimonialDeleting(false);
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
  }, [filters.category, filters.subcategory, filters.difficulty, filters.status, pagination.page, debouncedSearch]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, 400);
    return () => clearTimeout(handle);
  }, [filters.search]);

  useEffect(() => {
    if (!filters.difficulty) {
      setSelectedDifficultyId('');
      return;
    }
    const matched = difficultyOptions.find(option => option.name === filters.difficulty);
    setSelectedDifficultyId(matched ? matched.id : '');
  }, [filters.difficulty, difficultyOptions]);

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
    const requestId = ++activeRequestRef.current;
    setIsLoading(true);
    setError('');
    
    try {
      const response = await examService.getExams({
        ...filters,
        search: debouncedSearch,
        page: pagination.page,
        limit: pagination.limit
      });

      if (requestId !== activeRequestRef.current) {
        return;
      }

      const sortedExams = [...response.data].sort((a, b) => {
        const aDate = a.created_at || a.updated_at || '';
        const bDate = b.created_at || b.updated_at || '';
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

      setExams(sortedExams);
      setPagination(prev => ({
        ...prev,
        total: response.total,
        totalPages: response.totalPages
      }));
    } catch (err: any) {
      if (requestId !== activeRequestRef.current) {
        return;
      }
      setError(err.message || 'Failed to load exams');
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

  const handleCategorySelect = (value: string) => {
    setSelectedCategoryId(value);
    const selectedCategory = categories.find(category => category.id === value);
    handleFilterChange('category', selectedCategory ? selectedCategory.name : '');
    setSelectedSubcategoryId('');
    handleFilterChange('subcategory', '');
  };

  const toggleCategory = (categoryId: string) => {
    if (selectedCategoryId === categoryId) {
      handleCategorySelect('');
    } else {
      handleCategorySelect(categoryId);
    }
  };

  const handleSubcategorySelect = (value: string) => {
    setSelectedSubcategoryId(value);
    const selectedSubcategory = subcategories.find(sub => sub.id === value);
    handleFilterChange('subcategory', selectedSubcategory ? selectedSubcategory.name : '');
  };

  const toggleSubcategory = (subcategoryId: string) => {
    if (selectedSubcategoryId === subcategoryId) {
      handleSubcategorySelect('');
    } else {
      handleSubcategorySelect(subcategoryId);
    }
  };

  const toggleDifficulty = (difficultyId: string) => {
    if (selectedDifficultyId === difficultyId) {
      setSelectedDifficultyId('');
      handleFilterChange('difficulty', '');
      return;
    }
    setSelectedDifficultyId(difficultyId);
    const selectedDifficulty = difficultyOptions.find(option => option.id === difficultyId);
    handleFilterChange('difficulty', selectedDifficulty ? selectedDifficulty.name : '');
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
    setSelectedDifficultyId('');
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="container mx-auto px-4">
          <Breadcrumbs 
            items={[
              HomeBreadcrumb(),
              { label: 'Exams' }
            ]}
            variant="dark"
            className="mb-6"
          />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Explore Exams</h1>
          <p className="text-xl text-blue-100 max-w-2xl">Find and attempt mock tests from various categories and difficulty levels</p>
        </div>
      </div>
      <section className="border-b border-border bg-white/80">
        <div className="container-main py-10 flex flex-col gap-4">
          <div className="space-y-2">
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
          <div className="container mx-auto px-4 py-12">
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
              <div className="relative">
                <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar scroll-smooth">
                  {popularTests.map((popularTest) => (
                    <div key={popularTest.id} className="flex-shrink-0 w-80 snap-start">
                      <ExamCard exam={popularTest.exam} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="bg-slate-900 text-white border-b border-slate-800">
        <div className="container mx-auto px-4 py-12 space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-white/70 font-semibold">Browse</p>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold">Government exams by categories</h2>
              <span className="text-sm text-white/60">Explore {categories.length}+ niche tracks</span>
            </div>
            <p className="text-white/70 max-w-3xl text-sm">
              Jump straight into the domain you care about. These quick filters instantly tighten the exam list below.
            </p>
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
            <div className="flex gap-5 overflow-x-auto hide-scrollbar pb-3">
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
                    className="flex-shrink-0 w-36 text-center group"
                  >
                    <div
                      className={`w-28 h-28 mx-auto rounded-2xl border border-white/30 bg-gradient-to-br ${cardBg} flex items-center justify-center shadow-lg shadow-slate-900/10 transition-transform duration-200 ${
                        isSelected ? 'ring-2 ring-white scale-105' : 'group-hover:scale-105'
                      }`}
                    >
                      {category.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={category.logo_url}
                          alt={category.name}
                          className="h-full w-full object-cover rounded-2xl p-3"
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
          )}
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
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
                      <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
                        <label className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={selectedCategoryId === ''}
                            onChange={() => handleCategorySelect('')}
                          />
                          <span>All Categories</span>
                        </label>
                        {categories.map((category) => (
                          <label key={category.id} className="flex items-center gap-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-primary"
                              checked={selectedCategoryId === category.id}
                              onChange={() => toggleCategory(category.id)}
                            />
                            <span>{category.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Subcategory Filter */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Sub-category
                      </label>
                      {subcategoriesLoading ? (
                        <Skeleton className="h-10 w-full rounded-lg" />
                      ) : (
                        <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
                          <label className="flex items-center gap-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-primary"
                              checked={selectedSubcategoryId === ''}
                              onChange={() => handleSubcategorySelect('')}
                              disabled={!selectedCategoryId || subcategories.length === 0}
                            />
                            <span>{selectedCategoryId ? 'All Sub-categories' : 'Select category first'}</span>
                          </label>
                          {subcategories.map((subcategory) => (
                            <label key={subcategory.id} className="flex items-center gap-2 text-sm text-foreground">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-primary"
                                checked={selectedSubcategoryId === subcategory.id}
                                onChange={() => toggleSubcategory(subcategory.id)}
                                disabled={!selectedCategoryId}
                              />
                              <span>{subcategory.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Difficulty Filter */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Tier
                      </label>
                      <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
                        <label className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={selectedDifficultyId === ''}
                            onChange={() => toggleDifficulty('')}
                          />
                          <span>All Tiers</span>
                        </label>
                        {difficultyOptions.map((difficulty) => (
                          <label key={difficulty.id} className="flex items-center gap-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-primary"
                              checked={selectedDifficultyId === difficulty.id}
                              onChange={() => toggleDifficulty(difficulty.id)}
                            />
                            <span>{difficulty.name}</span>
                          </label>
                        ))}
                      </div>
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
          <main className="flex-1 min-w-0">
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

            {/* Dynamic Banner Section */}
            {!bannersLoading && banners.length > 0 && (
              <div className="mt-8">
                {banners.map((banner) => (
                  <div key={banner.id} className="w-full">
                    {banner.link_url ? (
                      <Link href={banner.link_url} className="block w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={banner.image_url}
                          alt={banner.alt_text || 'Banner'}
                          className="w-full h-auto rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                        />
                      </Link>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={banner.image_url}
                        alt={banner.alt_text || 'Banner'}
                        className="w-full h-auto rounded-lg shadow-md"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Why Take Test Series Section */}
            <div className="mt-12 mb-8">
              <h2 className="font-display text-3xl font-bold text-foreground mb-8 text-center">
                Why take Bharat Mock Test Series?
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {/* New Test Series For You Section */}
            {newTestSeries.length > 0 && (
              <div className="mt-12 mb-8">
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
                  <div className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex-shrink-0 w-80">
                        <Skeleton className="h-64 w-full rounded-xl" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar scroll-smooth">
                      {newTestSeries.map((test) => (
                        <div key={test.id} className="flex-shrink-0 w-80 snap-start">
                          <ExamCard exam={test.exam} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Testimonials Section */}
            <div className="mt-12">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-orange-500 font-semibold">Social Proof</p>
                  <h2 className="font-display text-3xl font-bold text-foreground mt-2">
                    Loved by serious aspirants
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Highest-rated experiences show up first. Share yours once you try Bharat Mock.
                  </p>
                </div>

                {isAuthenticated && !myTestimonialLoading && (
                  <Button variant="outline" onClick={() => {
                    const formAnchor = document.getElementById('testimonial-form');
                    formAnchor?.scrollIntoView({ behavior: 'smooth' });
                  }}>
                    Share Your Experience
                  </Button>
                )}
              </div>

              <div className="relative">
                {testimonialsLoading ? (
                  <div className="flex gap-4 overflow-x-auto hide-scrollbar">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="flex-shrink-0 w-80">
                        <Skeleton className="h-48 w-full rounded-2xl" />
                      </div>
                    ))}
                  </div>
                ) : testimonials.length === 0 ? (
                  <div className="border border-dashed border-border rounded-2xl p-10 text-center">
                    <h3 className="font-display text-xl font-semibold text-foreground mb-2">No testimonials yet</h3>
                    <p className="text-muted-foreground">
                      Be the first to talk about your preparation journey with Bharat Mock.
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar scroll-smooth">
                    {testimonials.map((item) => (
                      <div
                        key={item.id}
                        className="flex-shrink-0 w-[22rem] snap-start bg-white border border-border rounded-2xl p-6 shadow-sm"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div>
                            <p className="text-base font-semibold text-foreground">
                              {item.user?.name || 'Anonymous Aspirant'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="ml-auto flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, idx) =>
                              idx < item.rating ? (
                                <Star key={idx} className="w-4 h-4 text-amber-400 fill-current" />
                              ) : (
                                <StarOff key={idx} className="w-4 h-4 text-gray-300" />
                              )
                            )}
                          </div>
                        </div>
                        {item.title && (
                          <p className="text-sm font-semibold text-foreground mb-1">{item.title}</p>
                        )}
                        <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-5">
                          {item.content}
                        </p>
                        {item.highlight && (
                          <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full">
                            <Flame className="w-3.5 h-3.5" />
                            Featured
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-12" id="testimonial-form">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Share your testimonial</h3>
                      <p className="text-sm text-muted-foreground">
                        Only logged-in aspirants can post. You can update or delete it anytime.
                      </p>
                    </div>
                    {!isAuthenticated && (
                      <Link href="/login" className="text-blue-600 text-sm font-semibold">
                        Log in to share
                      </Link>
                    )}
                  </div>

                  {isAuthenticated ? (
                    <form onSubmit={handleSubmitTestimonial} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground">Title (optional)</label>
                        <Input
                          value={testimonialForm.title}
                          onChange={(e) => handleTestimonialFormChange('title', e.target.value)}
                          placeholder="e.g. Perfect mock experience"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-foreground">Your experience</label>
                        <Textarea
                          value={testimonialForm.content}
                          onChange={(e) => handleTestimonialFormChange('content', e.target.value)}
                          placeholder="Share how Bharat Mock helped in your preparation"
                          rows={4}
                          required
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-foreground">Rating</label>
                        <div className="flex items-center gap-2 mt-1">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => handleTestimonialFormChange('rating', idx + 1)}
                              className="focus:outline-none"
                            >
                              {idx < testimonialForm.rating ? (
                                <Star className="w-6 h-6 text-amber-400 fill-current" />
                              ) : (
                                <StarOff className="w-6 h-6 text-gray-300" />
                              )}
                            </button>
                          ))}
                          <span className="text-sm text-muted-foreground">{testimonialForm.rating} / 5</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" disabled={testimonialSaving}>
                          {testimonialSaving ? 'Saving...' : myTestimonial ? 'Update testimonial' : 'Submit testimonial'}
                        </Button>
                        {myTestimonial && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleDeleteTestimonial}
                            disabled={testimonialDeleting}
                          >
                            {testimonialDeleting ? 'Deleting...' : 'Delete testimonial'}
                          </Button>
                        )}
                      </div>
                    </form>
                  ) : (
                    <div className="border border-dashed border-border rounded-lg p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Please log in to post your testimonial and help other aspirants.
                      </p>
                      <Button asChild className="mt-4">
                        <Link href="/login">Log in to share</Link>
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
            </div>

            {/* Access Steps Section */}
            <div className="mt-16 mb-12">
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

            {/* FAQ Section */}
            <section className="mt-16 mb-20">
              <div className="text-center mb-10">
                <p className="text-sm uppercase tracking-[0.35em] text-emerald-500 font-semibold">FAQs</p>
                <h2 className="font-display text-3xl font-bold text-foreground mt-2">
                  Everything about Bharat Mock free test series
                </h2>
                <p className="text-muted-foreground mt-1 max-w-4xl mx-auto">
                  We’ve compiled answers to the most searched questions from aspirants preparing for SSC, Banking, Railways, Defence, and State exams.
                </p>
              </div>

              <div className="grid gap-4">
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
                  <div key={item.q} className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="text-emerald-600 font-semibold">{String(index + 1).padStart(2, '0')}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{item.q}</h3>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{item.a}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
