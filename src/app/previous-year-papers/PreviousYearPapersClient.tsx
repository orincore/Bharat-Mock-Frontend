"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen, Crown, FileText, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StandardExamCard } from '@/components/exam/StandardExamCard';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';
import { examService } from '@/lib/api/examService';
import { taxonomyService, Difficulty, Category, Subcategory } from '@/lib/api/taxonomyService';
import { paperSectionsService, PaperSection, PaperTopic } from '@/lib/api/paperSectionsService';
import { Exam } from '@/types';
import { PageSeoSections } from '@/components/sections/PageSeoSections';

const PAPER_EXAM_TYPE = 'past_paper';

type PremiumTab = 'all' | 'premium';
type ExamWithDerivedYear = Exam & { derivedYear?: string | null };

const deriveYear = (exam: Exam): string | null => {
  if (typeof exam.exam_year === 'number') {
    return String(exam.exam_year);
  }

  if (!exam.exam_date) return null;
  const parsed = new Date(exam.exam_date);
  if (Number.isNaN(parsed.getTime())) return null;
  return String(parsed.getFullYear());
};

// Cards in descending order: newest paper year first, then newest created.
const sortPapersDesc = (list: ExamWithDerivedYear[]): ExamWithDerivedYear[] =>
  [...list].sort((a, b) => {
    const yearDiff = Number(b.derivedYear || 0) - Number(a.derivedYear || 0);
    if (yearDiff !== 0) return yearDiff;
    const aDate = a.created_at || a.updated_at || '';
    const bDate = b.created_at || b.updated_at || '';
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

interface InitialData {
  exams: Exam[];
  categories: Category[];
  subcategories: Subcategory[];
  total: number;
  totalPages: number;
}

interface SSRData {
  initialDifficulties?: Difficulty[];
  initialSections?: PaperSection[];
  initialTopics?: PaperTopic[];
}

export default function PreviousYearPapersClient({ initialData, initialDifficulties, initialSections, initialTopics }: { initialData: InitialData } & SSRData) {
  const [exams, setExams] = useState<ExamWithDerivedYear[]>(
    sortPapersDesc(initialData.exams.map(e => ({ ...e, derivedYear: deriveYear(e) })))
  );
  const [categories, setCategories] = useState<Category[]>(initialData.categories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [subcategories, setSubcategories] = useState<Subcategory[]>(initialData.subcategories);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [difficultyOptions, setDifficultyOptions] = useState<Difficulty[]>(initialDifficulties ?? []);
  const [selectedDifficultyId, setSelectedDifficultyId] = useState<string>('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [difficultiesLoading, setDifficultiesLoading] = useState(initialDifficulties === undefined);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialMount = useRef(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<PremiumTab>('all');
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Paper sections and topics
  const [paperSections, setPaperSections] = useState<PaperSection[]>(
    (initialSections ?? []).filter(s => s.is_active !== false)
  );
  const [paperTopics, setPaperTopics] = useState<PaperTopic[]>(
    (initialTopics ?? []).filter(t => t.is_active !== false)
  );
  const [sectionsLoading, setSectionsLoading] = useState(initialSections === undefined);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [sectionCounts, setSectionCounts] = useState<Record<string, number>>({});
  const [allPapersTotal, setAllPapersTotal] = useState<number>(0);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const sectionsScrollRef = useRef<HTMLDivElement>(null);
  const topicsScrollRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    subcategory: '',
    difficulty: '',
    status: '',
    exam_type: PAPER_EXAM_TYPE,
    is_premium: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const activeRequestRef = useRef(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 30,
    total: initialData.total,
    totalPages: initialData.totalPages,
  });

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    ref.current?.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  useEffect(() => {
    if (initialDifficulties === undefined) fetchDifficulties();
    if (initialSections === undefined) fetchPaperSections();
  }, [initialDifficulties, initialSections]);

  useEffect(() => {
    // Skip first render — initial data fetched server-side
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchExams();
  }, [
    filters.category,
    filters.subcategory,
    filters.difficulty,
    filters.status,
    filters.is_premium,
    pagination.page,
    debouncedSearch,
    selectedYear,
    activeSectionId,
    selectedTopicId
  ]);

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

  const fetchPaperSections = async () => {
    setSectionsLoading(true);
    try {
      const sections = await paperSectionsService.getSections();
      const topics = await paperSectionsService.getTopics();
      const activeSections = sections.filter(s => s.is_active !== false);
      const activeTopics = topics.filter(t => t.is_active !== false);
      setPaperSections(activeSections);
      setPaperTopics(activeTopics);

      // Keep "All Papers" selected by default — do not auto-select first section
      if (sections.length > 0 && !activeSectionId) {
        setActiveSectionId('');
      }

      // Fetch total count for "All Papers" and per-section counts in parallel
      const [allRes, ...countEntries] = await Promise.all([
        examService.getExams({ exam_type: PAPER_EXAM_TYPE, limit: 1, page: 1 } as any),
        ...activeSections.map(async (section) => {
          try {
            const res = await examService.getExams({ exam_type: PAPER_EXAM_TYPE, paper_section_id: section.id, limit: 1, page: 1 } as any);
            return [section.id, res.total ?? 0] as [string, number];
          } catch {
            return [section.id, 0] as [string, number];
          }
        })
      ]);
      setAllPapersTotal(allRes.total ?? 0);
      setSectionCounts(Object.fromEntries(countEntries as [string, number][]));

      // Fetch counts for each topic in parallel
      const topicCountEntries = await Promise.all(
        activeTopics.map(async (topic) => {
          try {
            const res = await examService.getExams({ exam_type: PAPER_EXAM_TYPE, paper_topic_id: topic.id, limit: 1, page: 1 } as any);
            return [topic.id, res.total ?? 0] as [string, number];
          } catch {
            return [topic.id, 0] as [string, number];
          }
        })
      );
      setTopicCounts(Object.fromEntries(topicCountEntries));
    } catch (err) {
      console.error('Failed to fetch paper sections:', err);
    } finally {
      setSectionsLoading(false);
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
      const requestParams: any = {
        page: pagination.page,
        limit: pagination.limit,
        exam_type: PAPER_EXAM_TYPE,
      };

      if (debouncedSearch.trim()) requestParams.search = debouncedSearch.trim();
      if (filters.category.trim()) requestParams.category = filters.category.trim();
      if (filters.subcategory.trim()) requestParams.subcategory = filters.subcategory.trim();
      if (filters.difficulty.trim()) requestParams.difficulty = filters.difficulty.trim();
      if (filters.status.trim()) requestParams.status = filters.status.trim();
      if (filters.is_premium.trim()) requestParams.is_premium = filters.is_premium.trim();
      if (selectedYear) requestParams.year = selectedYear;
      if (activeSectionId) requestParams.paper_section_id = activeSectionId;
      if (selectedTopicId) requestParams.paper_topic_id = selectedTopicId;

      const response = await examService.getExams(requestParams);

      if (requestId !== activeRequestRef.current) return;

      const enrichedExams: ExamWithDerivedYear[] = [...response.data].map((exam) => ({
        ...exam,
        derivedYear: deriveYear(exam),
      }));

      const sortedExams = sortPapersDesc(enrichedExams);

      const backendYearOptions = (response.years || [])
        .filter((year) => typeof year === 'number')
        .map((year) => String(year))
        .sort((a, b) => Number(b) - Number(a));

      setYearOptions(backendYearOptions);
      setExams(sortedExams);

      setPagination((prev) => ({
        ...prev,
        total: response.total,
        totalPages: Math.max(response.totalPages, 1),
      }));
    } catch (err: any) {
      if (requestId !== activeRequestRef.current) return;
      console.error('Error fetching exams:', err);
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

  const buildCategoryFilterValue = (id: string) => {
    const category = categories.find((category) => category.id === id);
    return category ? (category.slug || category.name || '') : '';
  };

  const buildSubcategoryFilterValue = (id: string) => {
    const subcategory = subcategories.find((subcategory) => subcategory.id === id);
    return subcategory ? (subcategory.slug || subcategory.name || '') : '';
  };

  const buildDifficultyFilterValue = (id: string) => {
    const difficulty = difficultyOptions.find((option) => option.id === id);
    return difficulty ? (difficulty.slug || difficulty.name || '') : '';
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    handleFilterChange('category', buildCategoryFilterValue(categoryId));

    if (categoryId && selectedSubcategoryId) {
      const subcategory = subcategories.find((sub) => sub.id === selectedSubcategoryId);
      if (subcategory && subcategory.category_id !== categoryId) {
        setSelectedSubcategoryId('');
        handleFilterChange('subcategory', '');
      }
    } else if (!categoryId) {
      setSelectedSubcategoryId('');
      handleFilterChange('subcategory', '');
    }
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    setSelectedSubcategoryId(subcategoryId);
    handleFilterChange('subcategory', buildSubcategoryFilterValue(subcategoryId));

    if (subcategoryId) {
      const targetSubcategory = subcategories.find((sub) => sub.id === subcategoryId);
      if (targetSubcategory && selectedCategoryId !== targetSubcategory.category_id) {
        setSelectedCategoryId(targetSubcategory.category_id);
        handleFilterChange('category', buildCategoryFilterValue(targetSubcategory.category_id));
      }
    }
  };

  const handleDifficultyChange = (difficultyId: string) => {
    setSelectedDifficultyId(difficultyId);
    handleFilterChange('difficulty', buildDifficultyFilterValue(difficultyId));
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleAccessFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, is_premium: value }));
    // Keep activeTab in sync
    setActiveTab(value === 'true' ? 'premium' : 'all');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleTabChange = (tab: PremiumTab) => {
    setActiveTab(tab);
    setFilters((prev) => ({
      ...prev,
      exam_type: PAPER_EXAM_TYPE,
      is_premium: tab === 'premium' ? 'true' : '',
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSectionId(sectionId);
    // Auto-select first topic of the new section
    const firstTopic = paperTopics.find(t => t.section_id === sectionId && t.is_active !== false);
    setSelectedTopicId(firstTopic?.id ?? '');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleTopicChange = (topicId: string) => {
    setSelectedTopicId(topicId === selectedTopicId ? '' : topicId);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      subcategory: '',
      difficulty: '',
      status: '',
      exam_type: PAPER_EXAM_TYPE,
      is_premium: '',
    });
    setActiveTab('all');
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setSelectedDifficultyId('');
    setSelectedYear('');
    setSelectedTopicId('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const filteredSubcategories = selectedCategoryId
    ? subcategories.filter((sub) => sub.category_id === selectedCategoryId)
    : subcategories;

  const currentSectionTopics = useMemo(() => {
    if (!activeSectionId) return [];
    const topics = paperTopics.filter(topic => topic.section_id === activeSectionId);
    return topics;
  }, [activeSectionId, paperTopics]);

  const isFilterDataLoading = categoriesLoading || difficultiesLoading || subcategoriesLoading;
  const hasCustomFilters = Boolean(
    filters.search ||
    selectedCategoryId ||
    selectedSubcategoryId ||
    selectedDifficultyId ||
    selectedYear ||
    filters.is_premium
  );

  const FiltersPanel = () => (
    // Compact spacing + short scrollable option lists so all five filter groups
    // (Category, Sub-category, Difficulty, Year, Access) stay visible on desktop.
    <div className="bg-card rounded-xl border border-border p-5 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <p className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          Filters
        </p>
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
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <div className="border border-border rounded-lg p-3 space-y-2 lg:max-h-36 lg:overflow-y-auto">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="category"
                  className="h-4 w-4 accent-primary"
                  checked={selectedCategoryId === ''}
                  onChange={() => handleCategoryChange('')}
                />
                <span>All Categories</span>
              </label>
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="category"
                    className="h-4 w-4 accent-primary"
                    checked={selectedCategoryId === category.id}
                    onChange={() => handleCategoryChange(category.id)}
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
              <div className="border border-border rounded-lg p-3 space-y-2 lg:max-h-36 lg:overflow-y-auto">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="subcategory"
                    className="h-4 w-4 accent-primary"
                    checked={selectedSubcategoryId === ''}
                    onChange={() => handleSubcategoryChange('')}
                    disabled={filteredSubcategories.length === 0}
                  />
                  <span>All Sub-categories</span>
                </label>
                {filteredSubcategories.map((subcategory) => (
                  <label key={subcategory.id} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="subcategory"
                      className="h-4 w-4 accent-primary"
                      checked={selectedSubcategoryId === subcategory.id}
                      onChange={() => handleSubcategoryChange(subcategory.id)}
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
            <div className="border border-border rounded-lg p-3 space-y-2 lg:max-h-36 lg:overflow-y-auto">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="difficulty"
                  className="h-4 w-4 accent-primary"
                  checked={selectedDifficultyId === ''}
                  onChange={() => handleDifficultyChange('')}
                />
                <span>All Difficulties</span>
              </label>
              {difficultyOptions.map((difficulty) => (
                <label key={difficulty.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="difficulty"
                    className="h-4 w-4 accent-primary"
                    checked={selectedDifficultyId === difficulty.id}
                    onChange={() => handleDifficultyChange(difficulty.id)}
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
            <div className="border border-border rounded-lg p-3 space-y-2 lg:max-h-36 lg:overflow-y-auto">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="year"
                  className="h-4 w-4 accent-primary"
                  checked={selectedYear === ''}
                  onChange={() => handleYearChange('')}
                />
                <span>All Years</span>
              </label>
              {yearOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">Year data will appear once papers load.</p>
              )}
              {yearOptions.map((year) => (
                <label key={year} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="year"
                    className="h-4 w-4 accent-primary"
                    checked={selectedYear === year}
                    onChange={() => handleYearChange(year)}
                  />
                  <span>{year}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Access
            </label>
            <div className="border border-border rounded-lg p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="access"
                  className="h-4 w-4 accent-primary"
                  checked={filters.is_premium === ''}
                  onChange={() => handleAccessFilter('')}
                />
                <span>All</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="access"
                  className="h-4 w-4 accent-primary"
                  checked={filters.is_premium === 'false'}
                  onChange={() => handleAccessFilter('false')}
                />
                <span>Free</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="access"
                  className="h-4 w-4 accent-primary"
                  checked={filters.is_premium === 'true'}
                  onChange={() => handleAccessFilter('true')}
                />
                <span>Premium</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 overflow-x-hidden">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a1833] via-[#0f2347] to-[#1a3a6b] text-white py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,153,51,0.12),_transparent_55%)]" />
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />
        <div className="relative container-main">
          <div className="max-w-3xl">
            <Breadcrumbs
              items={[HomeBreadcrumb(), { label: 'Previous Year Papers' }]}
              variant="dark"
              className="mb-6"
            />
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-4">
              Previous Year Question Papers
            </h1>
            <p className="text-lg text-white/80 mb-8">
              Find Previous Year Question Papers for UPSC, SSC, Banking, and All Govt Exams
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

      <div className="container-main py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="hidden lg:block lg:w-72 xl:w-80 flex-shrink-0">
            <div className="sticky top-20">
              <FiltersPanel />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <div className="flex border-b border-border">
                <button
                  type="button"
                  onClick={() => handleTabChange('all')}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${activeTab === 'all'
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
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${activeTab === 'premium'
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

            {/* Sections and Topics Tabs */}
            {paperSections.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5 mb-6 min-w-0 overflow-hidden">
                {/* Sections */}
                <div className="border-b border-slate-200 pb-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => scroll(sectionsScrollRef, 'left')}
                      className="hidden md:flex shrink-0 self-center h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors mb-3"
                      aria-label="Scroll sections left"
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-600" />
                    </button>
                    <div
                      ref={sectionsScrollRef}
                      className="flex items-center gap-4 overflow-x-auto pb-3 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth -mx-5 px-5"
                    >
                      <button
                        onClick={() => handleSectionChange('')}
                        className={`relative shrink-0 pb-2 text-sm font-semibold transition-colors whitespace-nowrap ${activeSectionId === '' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        All Papers ({allPapersTotal})
                        {activeSectionId === '' && (
                          <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-blue-600 rounded-full" />
                        )}
                      </button>
                      {paperSections.map(section => (
                        <button
                          key={section.id}
                          onClick={() => handleSectionChange(section.id)}
                          className={`relative shrink-0 pb-2 text-sm font-semibold transition-colors whitespace-nowrap ${activeSectionId === section.id ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                          {section.name} ({sectionCounts[section.id] || 0})
                          {activeSectionId === section.id && (
                            <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-blue-600 rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => scroll(sectionsScrollRef, 'right')}
                      className="hidden md:flex shrink-0 self-center h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors mb-3"
                      aria-label="Scroll sections right"
                    >
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                </div>

                {/* Topics */}
                {currentSectionTopics.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => scroll(topicsScrollRef, 'left')}
                      className="hidden md:flex shrink-0 h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                      aria-label="Scroll topics left"
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-600" />
                    </button>
                    <div
                      ref={topicsScrollRef}
                      className="flex items-center gap-3 overflow-x-auto pb-1 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth -mx-5 px-5"
                    >
                      {currentSectionTopics.map(topic => (
                        <button
                          key={topic.id}
                          onClick={() => handleTopicChange(topic.id)}
                          className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ${selectedTopicId === topic.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                          {topic.name} ({topicCounts[topic.id] ?? 0})
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => scroll(topicsScrollRef, 'right')}
                      className="hidden md:flex shrink-0 h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                      aria-label="Scroll topics right"
                    >
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="text-destructive">⚠️</div>
                  <div>
                    <p className="text-destructive font-medium">Error loading papers</p>
                    <p className="text-destructive/80 text-sm mt-1">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setError('');
                        fetchExams();
                      }}
                      className="mt-2"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl border border-border">
                <div className="max-w-md mx-auto">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-2xl font-bold mb-2">
                    {activeTab === 'premium' ? 'No premium papers found' : 'No previous papers found'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {activeTab === 'premium'
                      ? 'Premium previous papers will appear here once added.'
                      : hasCustomFilters
                        ? 'No papers match your current filters. Try adjusting your search criteria.'
                        : 'Previous year papers are being added. Please check back later.'}
                  </p>
                  {hasCustomFilters && (
                    <Button onClick={clearFilters} className="mb-4">
                      Clear all filters
                    </Button>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <p>Looking for specific exams like CHSL, CGL, or Banking?</p>
                    <p>Use the category filters above to narrow your search.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {exams.map((exam) => (
                  <StandardExamCard key={exam.id} exam={{ ...exam, category_logo_url: exam.exam_categories?.logo_url, category_icon: exam.exam_categories?.icon }} />
                ))}
              </div>
            )}

            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t border-border">
                <span className="text-sm text-muted-foreground order-2 sm:order-1">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} papers
                </span>
                <div className="flex items-center gap-1.5 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1 || isLoading}
                    onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="hidden sm:flex items-center gap-1">
                    {(() => {
                      const pages: (number | string)[] = [];
                      const total = pagination.totalPages;
                      const current = pagination.page;
                      const size = total > 7 ? 1 : 2;

                      for (let i = 1; i <= total; i++) {
                        if (i === 1 || i === total || (i >= current - size && i <= current + size)) {
                          pages.push(i);
                        } else if (pages[pages.length - 1] !== '...') {
                          pages.push('...');
                        }
                      }

                      return pages.map((page, idx) => (
                        <React.Fragment key={idx}>
                          {page === '...' ? (
                            <span className="px-2 text-muted-foreground">...</span>
                          ) : (
                            <Button
                              variant={pagination.page === page ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => typeof page === 'number' && setPagination(p => ({ ...p, page }))}
                              className={`h-9 w-9 p-0 ${pagination.page === page ? 'shadow-md' : 'hover:bg-muted'}`}
                            >
                              {page}
                            </Button>
                          )}
                        </React.Fragment>
                      ));
                    })()}
                  </div>

                  <div className="sm:hidden flex items-center px-4 text-sm font-medium">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages || isLoading}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
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
                <FiltersPanel />
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
                  View Results
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
      <div className="container-main">
        <PageSeoSections
          showFaq={false}
          whyTitle="Why Practice with Bharat Mock Previous Year Papers?"
          whySubtitle="Solving real past papers is the single most effective way to understand exam patterns, manage time, and build the confidence to clear cutoffs."
          whyContent={
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 sm:p-8 border border-blue-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 lg:gap-6">
                  <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Real Exam Questions</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Stop studying blindly. Every paper on Bharat Mock is sourced from actual government exams, so you practice what truly matters and walk in prepared.</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 sm:p-8 border border-purple-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 lg:gap-6">
                  <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-5.414 5.414a1 1 0 00-.293.707V19a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Subject-Wise Filters</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Easily find exactly what you need. Filter papers by exam, year, or subject and jump straight into focused, targeted practice.</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              <div className="group relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 sm:p-8 border border-amber-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 lg:gap-6">
                  <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-amber-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Updated Regularly</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Latest exam papers added as soon as they are available. Always stay up to date with the most recent questions and patterns.</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>
          }
          faqTitle="FAQ's"
          faqSubtitle="All your doubts about previous year question papers, solutions, and exam prep are explained clearly in one place."
          faqItems={[
            { q: 'Where can I find previous year question papers for all government exams?', a: 'You can find previous year question papers for government exams on Bharat Mock. Some papers are free to access, while others are premium.' },
            { q: 'How often are new papers added to Bharat Mock?', a: 'New papers are added regularly, especially after major government exams are conducted. In addition, the archive is kept updated, so aspirants always have access to the latest papers.' },
            { q: 'Which exams are covered on Bharat Mock?', a: 'We cover 70+ government exams. For example, SSC CGL, SSC CHSL, SSC MTS, IBPS PO, SBI Clerk, RBI Grade B, Railway NTPC, Railway Group D, Police Bharti, and many more.' },
            { q: 'Are SSC previous year question papers available with solutions?', a: 'Yes, they are. In fact, all SSC previous year question papers come with full solutions and detailed explanations, so you understand the concept, not just the answer.' },
            { q: 'Can I get the bank\'s previous year question papers on Bharat Mock?', a: 'Yes, absolutely. You can access the bank\'s previous year question papers for IBPS PO, SBI Clerk, SBI PO, RBI Grade B, IBPS Clerk, and other banking exams in one place.' },
            { q: 'Is there an SSC previous year question paper in Hindi PDF available?', a: 'Yes. We provide SSC previous year question papers in both Hindi and English. So, if you are preparing in Hindi medium, you can easily access bilingual papers and solutions.' },
            { q: 'How many years of previous year papers are available on Bharat Mock?', a: 'For the most popular exams, we offer multiple years of papers. In fact, for exams such as SSC CGL, you can find papers from the last 5-6 years, and for IBPS PO, you can find papers from the last 5 years.' },
            { q: 'How do previous year papers help in government exam preparation?', a: 'Previous year papers help you understand the exam pattern, identify important topics, improve time management, and build confidence. That is why they are one of the most effective tools for exam preparation.' },
            { q: 'Are the railway\'s previous year question papers available on Bharat Mock?', a: 'Yes, they are. You can find Railway NTPC, Railway Group D, and ALP previous year question papers with complete solutions in both Hindi and English.' },
            { q: 'Can I practice section-wise from previous year papers?', a: 'Yes, you can. In fact, all papers are organised section-wise and topic-wise. So you can easily practice Quantitative Aptitude, Reasoning, or English based on your weak areas.' },
          ]}
          mostAskedItems={[
            { q: 'Are all previous year question papers free on Bharat Mock?', a: 'No, not all PYQs are free. You can find both free and paid papers, so you can get started with your preparation and also purchase the paid papers for better preparation.' },
            { q: 'Why are some PYQs paid?', a: 'Some PYQs are paid as they are more organised and have verified solutions. This allows serious students to practice in a more structured manner.' },
            { q: 'What do I get in paid PYQs?', a: 'With paid PYQs, you get well-organised question papers, detailed solutions, and exam-focused practice sets that make your preparation clearer and more effective.' },
            { q: 'Can I prepare with free PYQs only?', a: 'Yes, you can. Free PYQs are sufficient to start with your preparation. But paid papers allow you to learn more.' },
            { q: 'Is it worth buying paid PYQs?', a: 'Yes, it is. Paid PYQs give you better practice quality and help you understand real exam patterns more clearly, which improves your preparation.' },
            { q: 'How do I access paid question papers?', a: 'Once your payment is completed, the paid PYQs are unlocked instantly. After that, you can access them anytime from your account.' },
            { q: 'Can I use both free and paid PYQs together?', a: 'Yes, and that\'s a good idea. Free papers give you some basic preparation, and paid papers enhance your practice and understanding.' },
            { q: 'Are paid PYQs updated regularly?', a: 'Yes, they are regularly updated with the latest exam pattern and trends, so you don\'t miss out on any important information.' },
            { q: 'Do paid PYQs include solutions?', a: 'Yes, most paid PYQs come with clear and detailed solutions so you can understand the concepts properly.' },
            { q: 'Is payment safe on Bharat Mock?', a: 'Yes, all payments are completely secure and processed through trusted payment gateways.' },
          ]}
          testimonialsDescription="Real feedback from aspirants who cracked govt exams by consistently practising previous year papers on Bharat Mock."
          seoContent={
            <>

              <section className="mt-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-10 shadow-2xl">
                <div className="max-w-5xl mx-auto space-y-8">
                  <h2 className="font-display text-3xl sm:text-4xl font-bold leading-tight">
                    Prepare Smarter for 2026 Exams with Bharat Mock Previous Year Papers
                  </h2>
                  <div className="space-y-4 text-slate-100 text-base leading-relaxed">
                    <p>Bharat Mock will give you free access to previous year question papers for SSC, Banking, Railway, Police, and 70+ other government exams in one place. Along with the questions come with simple explanations and are updated for 2026.</p>
                    <p>Every year, over five million students compete for limited government jobs. However, the ones who clear the cutoff are not always the smartest.</p>
                    <p>Instead, they are the most prepared. So, the best way to prepare is by solving previous year papers.</p>
                  </div>

                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-bold text-white">Why Previous Year Papers Work Better Than Any Textbook</h2>
                    <div className="space-y-4 text-slate-100 text-base leading-relaxed">
                      <p>Most students spend months learning theory that never appears on the exam. But that's fixed by previous year papers.</p>
                      <p>So, by solving previous years' question papers for SSC, Banking and Railway exams, you get to know the actual exam pattern, topics and types of questions asked in the exam, making you smarter and more confident.</p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg text-blue-200">And you will learn three things that no textbook can teach you:</h3>
                      <ul className="list-disc pl-6 space-y-2 text-slate-100 text-base">
                        <li>You will also see which topics repeat every year and which ones you can focus less on.</li>
                        <li>You will know how questions are asked, and you can identify patterns faster in the exam.</li>
                        <li>So you can improve your score by 15-20 marks.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-bold text-white">Section-Wise Previous Year Question Papers</h2>
                    <p className="text-slate-100 text-base leading-relaxed">We have categorised previous year question papers for SSC, railway, bank, police and other government exams chapter-wise and topic-wise so that you can easily get what you need.</p>
                    <p className="text-slate-100 text-base leading-relaxed">Here is all that you need to prepare. Question papers and simple, easy-to-understand solutions.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-white/20">
                      <thead>
                        <tr className="bg-white/10">
                          <th className="border border-white/20 px-4 py-3 text-left font-semibold">Exam Category</th>
                          <th className="border border-white/20 px-4 py-3 text-left font-semibold">Papers Covered</th>
                          <th className="border border-white/20 px-4 py-3 text-left font-semibold">Solution Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-white/20 px-4 py-3"><Link href="/ssc" className="text-blue-200 hover:text-white hover:underline">SSC Exams</Link></td>
                          <td className="border border-white/20 px-4 py-3">Full Syllabus Papers</td>
                          <td className="border border-white/20 px-4 py-3">Detailed Solutions</td>
                        </tr>
                        <tr className="bg-white/5">
                          <td className="border border-white/20 px-4 py-3"><Link href="/banking" className="text-blue-200 hover:text-white hover:underline">Banking Exams</Link></td>
                          <td className="border border-white/20 px-4 py-3">Pre + Mains Papers</td>
                          <td className="border border-white/20 px-4 py-3">Step-by-step Solutions</td>
                        </tr>
                        <tr>
                          <td className="border border-white/20 px-4 py-3"><Link href="/railway" className="text-blue-200 hover:text-white hover:underline">Railway Exams</Link></td>
                          <td className="border border-white/20 px-4 py-3">NTPC, Group D, ALP Papers</td>
                          <td className="border border-white/20 px-4 py-3">Explained Solutions</td>
                        </tr>
                        <tr className="bg-white/5">
                          <td className="border border-white/20 px-4 py-3"><Link href="/police" className="text-blue-200 hover:text-white hover:underline">Police Bharti</Link></td>
                          <td className="border border-white/20 px-4 py-3">State + Central Papers</td>
                          <td className="border border-white/20 px-4 py-3">Answered Papers</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-bold text-white">What Makes Bharat Mock Different</h2>
                    <div className="space-y-4 text-slate-100 text-base leading-relaxed">
                      <p>We don't just provide the PDFs. We prepare you the right way. For each paper, you will get clear explanations that not only give you the answer, but also explain why it is the answer, and why the other choices are not.</p>
                      <p>This is the thing that helps you improve your accuracy over time.</p>
                      <p>We track your performance, so you know what is improving and what still needs work. Over time, you get better at time management, accuracy, and choosing the right questions.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-bold text-white">Built for Hindi and English Medium Students</h2>
                    <div className="space-y-4 text-slate-100 text-base leading-relaxed">
                      <p>Not everyone prefers English, and that is completely okay. So, we provide bilingual practice sets, so you can prepare in Hindi with the same quality and clarity.</p>
                      <p>If you are looking for SSC, banking, railway, or other government exam previous year question papers in Hindi or your preferred language, we have you covered.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-bold text-white">Start With the Papers That Matter Most</h2>
                    <div className="space-y-4 text-slate-100 text-base leading-relaxed">
                      <p>If you are just getting started, let us show you a simple approach that works.</p>
                      <p>If you are just getting started, let us show you a simple approach that works.</p>
                      <p>First, select the exam you wish to prepare for and solve the past 3 years of papers.</p>
                      <p>As you solve, see which topics are repeated the most. Those should be your priority.</p>
                      <p>Then go year by year, so you can understand patterns better and improve your speed over time.</p>
                      <p>You can use this method for SSC, Banking, Railway, and Police exams. It is simple and works well if you stay consistent.</p>
                      <p>Our Previous Year Papers are designed to give every serious student a fair chance at clearing their exam. In fact, there is no fluff or filler. Instead, you will get the most authentic exam preparation resource available online.</p>
                      <p>Start now, take it one paper at a time, and move closer to your 2026 goal.</p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          }
        />
      </div>
    </div>
  );
}
