"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Filter, BookOpen, Crown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExamCard } from '@/components/exam/ExamCard';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';
import { examService } from '@/lib/api/examService';
import { taxonomyService, Difficulty, Category, Subcategory } from '@/lib/api/taxonomyService';
import { Exam } from '@/types';

const PAPER_EXAM_TYPE = 'past_paper';

type PremiumTab = 'all' | 'premium';
type ExamWithDerivedYear = Exam & { derivedYear?: string | null };

const extractYearFromTitle = (title: string): string | null => {
  if (!title) return null;
  const match = title.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : null;
};

export default function PrevPapersPage() {
  const [exams, setExams] = useState<ExamWithDerivedYear[]>([]);
  const [allExams, setAllExams] = useState<ExamWithDerivedYear[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(true);
  const [difficultyOptions, setDifficultyOptions] = useState<Difficulty[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [difficultiesLoading, setDifficultiesLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<PremiumTab>('all');
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    subcategory: '',
    difficulty: '',
    status: '',
    exam_type: PAPER_EXAM_TYPE,
    is_premium: 'false' as string,
  });
  const [selectedDifficultyIds, setSelectedDifficultyIds] = useState<string[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const activeRequestRef = useRef(0);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
    fetchDifficulties();
  }, []);

  useEffect(() => {
    fetchExams();
  }, [filters.category, filters.subcategory, filters.difficulty, filters.status, filters.is_premium, pagination.page, debouncedSearch]);

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
        .filter((category) => category.is_active !== false)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setCategories(sorted);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchSubcategories = async () => {
    setSubcategoriesLoading(true);
    try {
      const data = await taxonomyService.getSubcategories();
      setSubcategories(data.filter((sub) => sub.name));
    } catch (err) {
      console.error('Failed to fetch subcategories:', err);
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

  const applyYearFilter = (dataset: ExamWithDerivedYear[], years: string[]) => {
    if (!years.length) {
      setExams(dataset);
      return;
    }
    const filtered = dataset.filter((exam) => exam.derivedYear && years.includes(exam.derivedYear));
    setExams(filtered);
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
        limit: pagination.limit,
      });

      if (requestId !== activeRequestRef.current) return;

      const enrichedExams: ExamWithDerivedYear[] = [...response.data].map((exam) => ({
        ...exam,
        derivedYear: extractYearFromTitle(exam.title),
      }));

      const sortedExams = enrichedExams.sort((a, b) => {
        const aDate = a.created_at || a.updated_at || '';
        const bDate = b.created_at || b.updated_at || '';
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

      const uniqueYears = Array.from(
        new Set(sortedExams.map((exam) => exam.derivedYear).filter((year): year is string => Boolean(year)))
      ).sort((a, b) => Number(b) - Number(a));

      setYearOptions(uniqueYears);
      setAllExams(sortedExams);
      applyYearFilter(sortedExams, selectedYears);
      setPagination((prev) => ({
        ...prev,
        total: response.total,
        totalPages: Math.max(response.totalPages, 1),
      }));
    } catch (err: any) {
      if (requestId !== activeRequestRef.current) return;
      setError(err.message || 'Failed to load previous papers');
    } finally {
      if (requestId !== activeRequestRef.current) return;
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const buildCategoryFilterValue = (ids: string[]) =>
    ids
      .map((id) => categories.find((category) => category.id === id))
      .map((category) => category?.slug || category?.name || '')
      .filter(Boolean)
      .join(',');

  const buildSubcategoryFilterValue = (ids: string[]) =>
    ids
      .map((id) => subcategories.find((subcategory) => subcategory.id === id))
      .map((subcategory) => subcategory?.slug || subcategory?.name || '')
      .filter(Boolean)
      .join(',');

  const buildDifficultyFilterValue = (ids: string[]) =>
    ids
      .map((id) => difficultyOptions.find((option) => option.id === id))
      .map((option) => option?.slug || option?.name || '')
      .filter(Boolean)
      .join(',');

  const toggleCategory = (categoryId: string) => {
    let nextCategoryIds: string[];
    if (!categoryId) {
      nextCategoryIds = [];
    } else if (selectedCategoryIds.includes(categoryId)) {
      nextCategoryIds = selectedCategoryIds.filter((id) => id !== categoryId);
    } else {
      nextCategoryIds = [...selectedCategoryIds, categoryId];
    }

    setSelectedCategoryIds(nextCategoryIds);
    handleFilterChange('category', buildCategoryFilterValue(nextCategoryIds));

    if (nextCategoryIds.length > 0) {
      const allowedCategoryIds = new Set(nextCategoryIds);
      const filteredSubcategories = selectedSubcategoryIds.filter((subId) => {
        const subcategory = subcategories.find((sub) => sub.id === subId);
        return subcategory && allowedCategoryIds.has(subcategory.category_id);
      });

      if (filteredSubcategories.length !== selectedSubcategoryIds.length) {
        setSelectedSubcategoryIds(filteredSubcategories);
        handleFilterChange('subcategory', buildSubcategoryFilterValue(filteredSubcategories));
      }
    }
  };

  const toggleSubcategory = (subcategoryId: string) => {
    let nextSubcategoryIds: string[];
    if (!subcategoryId) {
      nextSubcategoryIds = [];
    } else if (selectedSubcategoryIds.includes(subcategoryId)) {
      nextSubcategoryIds = selectedSubcategoryIds.filter((id) => id !== subcategoryId);
    } else {
      nextSubcategoryIds = [...selectedSubcategoryIds, subcategoryId];
    }

    setSelectedSubcategoryIds(nextSubcategoryIds);
    handleFilterChange('subcategory', buildSubcategoryFilterValue(nextSubcategoryIds));

    if (subcategoryId) {
      const targetSubcategory = subcategories.find((sub) => sub.id === subcategoryId);
      if (targetSubcategory && !selectedCategoryIds.includes(targetSubcategory.category_id)) {
        const updatedCategoryIds = [...selectedCategoryIds, targetSubcategory.category_id];
        setSelectedCategoryIds(updatedCategoryIds);
        handleFilterChange('category', buildCategoryFilterValue(updatedCategoryIds));
      }
    }
  };

  const toggleDifficulty = (difficultyId: string) => {
    let nextDifficultyIds: string[];
    if (!difficultyId) {
      nextDifficultyIds = [];
    } else if (selectedDifficultyIds.includes(difficultyId)) {
      nextDifficultyIds = selectedDifficultyIds.filter((id) => id !== difficultyId);
    } else {
      nextDifficultyIds = [...selectedDifficultyIds, difficultyId];
    }

    setSelectedDifficultyIds(nextDifficultyIds);
    handleFilterChange('difficulty', buildDifficultyFilterValue(nextDifficultyIds));
  };

  const handleTabChange = (tab: PremiumTab) => {
    setActiveTab(tab);
    setFilters((prev) => ({
      ...prev,
      exam_type: PAPER_EXAM_TYPE,
      is_premium: tab === 'premium' ? 'true' : 'false',
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  useEffect(() => {
    applyYearFilter(allExams, selectedYears);
  }, [selectedYears, allExams]);

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      subcategory: '',
      difficulty: '',
      status: '',
      exam_type: PAPER_EXAM_TYPE,
      is_premium: activeTab === 'premium' ? 'true' : 'false',
    });
    setSelectedCategoryIds([]);
    setSelectedSubcategoryIds([]);
    setSelectedDifficultyIds([]);
    setSelectedYears([]);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const isFilterDataLoading = categoriesLoading || difficultiesLoading || subcategoriesLoading;
  const hasCustomFilters = Boolean(
    filters.search ||
    selectedCategoryIds.length ||
    selectedSubcategoryIds.length ||
    selectedDifficultyIds.length ||
    selectedYears.length
  );

  const handleYearToggle = (year: string) => {
    setSelectedYears((prev) => {
      if (prev.includes(year)) {
        return prev.filter((y) => y !== year);
      }
      return [...prev, year];
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const filteredSubcategories = selectedCategoryIds.length
    ? subcategories.filter((sub) => selectedCategoryIds.includes(sub.category_id))
    : subcategories;

  return (
    <div className="min-h-screen bg-muted/30">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a1833] via-[#0f2347] to-[#1a3a6b] text-white py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,153,51,0.12),_transparent_55%)]" />
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />
        <div className="relative w-full px-4 sm:px-8 lg:px-12 xl:px-20 2xl:px-32">
          <div className="max-w-3xl">
            <Breadcrumbs
              items={[HomeBreadcrumb(), { label: 'Previous Year Papers' }]}
              variant="dark"
              className="mb-6"
            />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-widest text-white/80 mb-4">
              <FileText className="h-3.5 w-3.5" />
              Previous Year Papers
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-4">
              Previous Year Question Papers
            </h1>
            <p className="text-lg text-white/80 mb-8">
              Practice with authentic previous year exam papers. Solve real questions to understand patterns and boost your preparation.
            </p>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:items-stretch">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search papers by name or category..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="pl-10 bg-background text-foreground"
                />
              </div>
              <Button type="submit" className="h-10 px-6 text-base font-semibold">
                Search
              </Button>
            </form>
          </div>
        </div>
      </section>

      <div className="relative w-full px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
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
                          onChange={() => toggleCategory('')}
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
                            checked={selectedSubcategoryIds.length === 0}
                            onChange={() => toggleSubcategory('')}
                            disabled={filteredSubcategories.length === 0}
                          />
                          <span>All Sub-categories</span>
                        </label>
                        {filteredSubcategories.map((subcategory) => (
                          <label key={subcategory.id} className="flex items-center gap-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-primary"
                              checked={selectedSubcategoryIds.includes(subcategory.id)}
                              onChange={() => toggleSubcategory(subcategory.id)}
                            />
                            <span>{subcategory.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Difficulty
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={selectedDifficultyIds.length === 0}
                          onChange={() => toggleDifficulty('')}
                        />
                        <span>All Difficulties</span>
                      </label>
                      {difficultyOptions.map((difficulty) => (
                        <label key={difficulty.id} className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={selectedDifficultyIds.includes(difficulty.id)}
                            onChange={() => toggleDifficulty(difficulty.id)}
                          />
                          <span>{difficulty.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Year
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={selectedYears.length === 0}
                          onChange={() => setSelectedYears([])}
                        />
                        <span>All Years</span>
                      </label>
                      {yearOptions.length === 0 && (
                        <p className="text-xs text-muted-foreground">Year data will appear once papers load.</p>
                      )}
                      {yearOptions.map((year) => (
                        <label key={year} className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={selectedYears.includes(year)}
                            onChange={() => handleYearToggle(year)}
                          />
                          <span>{year}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-6">
              <div className="flex border-b border-border">
                <button
                  type="button"
                  onClick={() => handleTabChange('all')}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === 'all'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  All Previous Papers
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('premium')}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === 'premium'
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Crown className="h-4 w-4" />
                  Bharat Mock Premium
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {activeTab === 'premium' ? 'Premium Previous Papers' : 'Previous Papers'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Showing {exams.length} of {pagination.total} {activeTab === 'premium' ? 'premium ' : ''}papers
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Reset filters
                </Button>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <BookOpen className="h-4 w-4" />
                  <span>{pagination.total} papers</span>
                </div>
              </div>
            </div>

            {activeTab === 'premium' && (
              <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50/60">
                <div className="flex items-start gap-3">
                  <Crown className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Bharat Mock Premium Papers</p>
                    <p className="text-xs text-amber-700 mt-1">
                      These are curated, high-quality previous year papers with detailed solutions available exclusively for premium members.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 mb-6 text-destructive">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-2xl border border-border">
                <h3 className="font-display text-2xl font-bold mb-2">
                  {activeTab === 'premium' ? 'No premium papers found' : 'No previous papers found'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {activeTab === 'premium'
                    ? 'Premium previous papers will appear here once added.'
                    : 'Try adjusting your filters or search term to find more papers.'}
                </p>
                <Button onClick={clearFilters}>Clear filters</Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {exams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} variant={activeTab === 'premium' ? 'premium' : 'default'} />
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-12">
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              </span>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  disabled={pagination.page === 1 || isLoading}
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
