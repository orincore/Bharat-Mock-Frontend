"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StandardExamCard } from '@/components/exam/StandardExamCard';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';
import { examService } from '@/lib/api/examService';
import { taxonomyService, Difficulty, Category, Subcategory } from '@/lib/api/taxonomyService';
import { Exam } from '@/types';

const QUIZ_EXAM_TYPE = 'short_quiz';

export default function QuizzesPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(true);
  const [difficultyOptions, setDifficultyOptions] = useState<Difficulty[]>([]);
  const [selectedDifficultyId, setSelectedDifficultyId] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [difficultiesLoading, setDifficultiesLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    subcategory: '',
    difficulty: '',
    status: '',
    exam_type: QUIZ_EXAM_TYPE,
  });
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
  }, [filters.category, filters.subcategory, filters.difficulty, filters.status, pagination.page, debouncedSearch]);

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
      setCategories(
        data
          .filter((c) => c.is_active !== false)
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      );
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
      setSubcategories(data.filter((s) => s.name));
    } catch (err) {
      console.error('Failed to fetch subcategories:', err);
    } finally {
      setSubcategoriesLoading(false);
    }
  };

  const fetchDifficulties = async () => {
    setDifficultiesLoading(true);
    try {
      setDifficultyOptions(await taxonomyService.getDifficulties());
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
      const params: any = { page: pagination.page, limit: pagination.limit, exam_type: QUIZ_EXAM_TYPE };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (filters.category.trim()) params.category = filters.category.trim();
      if (filters.subcategory.trim()) params.subcategory = filters.subcategory.trim();
      if (filters.difficulty.trim()) params.difficulty = filters.difficulty.trim();
      if (filters.status.trim()) params.status = filters.status.trim();

      const response = await examService.getExams(params);
      if (requestId !== activeRequestRef.current) return;

      const sorted = [...response.data].sort((a, b) =>
        new Date(b.created_at || b.updated_at || '').getTime() -
        new Date(a.created_at || a.updated_at || '').getTime()
      );
      setExams(sorted);
      setPagination((prev) => ({ ...prev, total: response.total, totalPages: Math.max(response.totalPages, 1) }));
    } catch (err: any) {
      if (requestId !== activeRequestRef.current) return;
      setError(err.message || 'Failed to load quizzes');
    } finally {
      if (requestId !== activeRequestRef.current) return;
      setIsLoading(false);
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

  const buildDifficultyValue = (id: string) => {
    const d = difficultyOptions.find((d) => d.id === id);
    return d ? (d.slug || d.name || '') : '';
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    handleFilterChange('category', buildCategoryValue(categoryId));
    // clear subcategory if it doesn't belong to new category
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

  const handleDifficultyChange = (difficultyId: string) => {
    setSelectedDifficultyId(difficultyId);
    handleFilterChange('difficulty', buildDifficultyValue(difficultyId));
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', subcategory: '', difficulty: '', status: '', exam_type: QUIZ_EXAM_TYPE });
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setSelectedDifficultyId('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const filteredSubcategories = selectedCategoryId
    ? subcategories.filter((s) => s.category_id === selectedCategoryId)
    : subcategories;

  const isFilterDataLoading = categoriesLoading || difficultiesLoading || subcategoriesLoading;
  const hasCustomFilters = Boolean(filters.search || selectedCategoryId || selectedSubcategoryId || selectedDifficultyId);

  const FiltersPanel = () => (
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
          {Array.from({ length: 3 }).map((_, i) => (
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
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="radio" name="quiz-category" className="h-4 w-4 accent-primary"
                  checked={selectedCategoryId === ''} onChange={() => handleCategoryChange('')} />
                <span>All Categories</span>
              </label>
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="quiz-category" className="h-4 w-4 accent-primary"
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
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="radio" name="quiz-subcategory" className="h-4 w-4 accent-primary"
                  checked={selectedSubcategoryId === ''}
                  onChange={() => handleSubcategoryChange('')}
                  disabled={filteredSubcategories.length === 0} />
                <span>{selectedCategoryId ? 'All Sub-categories' : 'Select category first'}</span>
              </label>
              {filteredSubcategories.map((sub) => (
                <label key={sub.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="quiz-subcategory" className="h-4 w-4 accent-primary"
                    checked={selectedSubcategoryId === sub.id}
                    onChange={() => handleSubcategoryChange(sub.id)} />
                  <span>{sub.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Difficulty</label>
            <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="radio" name="quiz-difficulty" className="h-4 w-4 accent-primary"
                  checked={selectedDifficultyId === ''} onChange={() => handleDifficultyChange('')} />
                <span>All Difficulties</span>
              </label>
              {difficultyOptions.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="quiz-difficulty" className="h-4 w-4 accent-primary"
                    checked={selectedDifficultyId === d.id}
                    onChange={() => handleDifficultyChange(d.id)} />
                  <span>{d.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <section className="gradient-hero py-10">
        <div className="container-main">
          <div className="max-w-3xl">
            <Breadcrumbs items={[HomeBreadcrumb(), { label: 'Quizzes' }]} variant="dark" className="mb-6" />
            <h1 className="font-display text-4xl md:text-5xl font-bold text-background mb-4">
              Practice Quick Quizzes
            </h1>
            <p className="text-lg text-background/80 mb-8">
              Bite-sized Q&A quizzes to strengthen your concepts in minutes.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); setPagination((p) => ({ ...p, page: 1 })); }}
              className="flex flex-col sm:flex-row gap-3 sm:items-stretch">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input type="text" placeholder="Search quizzes by name or category..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="pl-10 bg-background" />
              </div>
              <Button type="submit" className="h-10 px-6 text-base font-semibold">Search</Button>
            </form>
          </div>
        </div>
      </section>

      <div className="container-main py-12">
        {/* Mobile filter toggle */}
        <div className="lg:hidden mb-6">
          <button type="button" onClick={() => setMobileFiltersOpen((p) => !p)}
            className="inline-flex items-center justify-center gap-2 w-full rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">
            <Filter className="h-4 w-4" />
            {mobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}
          </button>
          {mobileFiltersOpen && <div className="mt-4"><FiltersPanel /></div>}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="hidden lg:block lg:w-64 xl:w-72 flex-shrink-0">
            <div className="sticky top-20"><FiltersPanel /></div>
          </aside>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">Quiz Results</h2>
                <p className="text-sm text-muted-foreground">
                  Showing {exams.length} of {pagination.total} short quizzes
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={clearFilters}>Reset filters</Button>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <BookOpen className="h-4 w-4" />
                  <span>{pagination.total} quizzes</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 mb-6 text-destructive">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
            ) : exams.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl border border-border">
                <h3 className="font-display text-2xl font-bold mb-2">No quizzes found</h3>
                <p className="text-muted-foreground mb-6">
                  {hasCustomFilters
                    ? 'No quizzes match your current filters. Try adjusting your search criteria.'
                    : 'Quizzes are being added. Please check back later.'}
                </p>
                {hasCustomFilters && <Button onClick={clearFilters}>Clear filters</Button>}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {exams.map((exam) => (
                  <StandardExamCard key={exam.id} exam={{ ...exam, category_logo_url: exam.exam_categories?.logo_url, category_icon: exam.exam_categories?.icon }} />
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-12">
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              </span>
              <div className="flex gap-3">
                <Button variant="outline"
                  disabled={pagination.page === 1 || isLoading}
                  onClick={() => setPagination((p) => ({ ...p, page: Math.max(p.page - 1, 1) }))}>
                  Previous
                </Button>
                <Button variant="outline"
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>
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
