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
import { PageSeoSections } from '@/components/sections/PageSeoSections';

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
    is_premium: '',
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
  }, [filters.category, filters.subcategory, filters.difficulty, filters.status, filters.is_premium, pagination.page, debouncedSearch]);

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
      if (filters.is_premium.trim()) params.is_premium = filters.is_premium.trim();

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
    setFilters({ search: '', category: '', subcategory: '', difficulty: '', status: '', is_premium: '', exam_type: QUIZ_EXAM_TYPE });
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setSelectedDifficultyId('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleAccessFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, is_premium: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const filteredSubcategories = selectedCategoryId
    ? subcategories.filter((s) => s.category_id === selectedCategoryId)
    : subcategories;

  const isFilterDataLoading = categoriesLoading || difficultiesLoading || subcategoriesLoading;
  const hasCustomFilters = Boolean(filters.search || selectedCategoryId || selectedSubcategoryId || selectedDifficultyId || filters.is_premium);

  const FiltersPanel = () => (
    <div className="bg-card rounded-xl border border-border p-6 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
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
            <div className="border border-border rounded-lg p-3 space-y-2 lg:max-h-48 lg:overflow-y-auto">
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
            <div className="border border-border rounded-lg p-3 space-y-2 lg:max-h-48 lg:overflow-y-auto">
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
            <div className="border border-border rounded-lg p-3 space-y-2 lg:max-h-40 lg:overflow-y-auto">
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
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Access</label>
            <div className="border border-border rounded-lg p-3 space-y-2">
              {[{ label: 'All', value: '' }, { label: 'Free', value: 'false' }, { label: 'Premium', value: 'true' }].map(({ label, value }) => (
                <label key={value} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="quiz-access" className="h-4 w-4 accent-primary"
                    checked={filters.is_premium === value}
                    onChange={() => handleAccessFilter(value)} />
                  <span>{label}</span>
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
      <section className="relative gradient-hero py-10">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />
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
              className="flex flex-col sm:flex-row gap-3 sm:items-stretch" suppressHydrationWarning>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" suppressHydrationWarning />
                <Input type="text" placeholder="Search quizzes by name or category..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="pl-10 bg-background" suppressHydrationWarning />
              </div>
              <Button type="submit" className="h-10 px-6 text-base font-semibold" suppressHydrationWarning>Search</Button>
            </form>
          </div>
        </div>
      </section>

      <div className="container-main py-12">
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
                <Button variant="outline" size="sm" onClick={clearFilters} suppressHydrationWarning>Reset filters</Button>
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
                  onClick={() => setPagination((p) => ({ ...p, page: Math.max(p.page - 1, 1) }))} suppressHydrationWarning>
                  Previous
                </Button>
                <Button variant="outline"
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} suppressHydrationWarning>
                  Next
                </Button>
              </div>
            </div>
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
          suppressHydrationWarning
        >
          <Filter className="h-4 w-4" suppressHydrationWarning />
          Filters
        </button>
      )}

      <div className="container-main">
        <PageSeoSections
          whyTitle="Why take Bharat Mock Quizzes?"
          whySubtitle="Short, sharp, and exam-focused—Bharat Mock quizzes are engineered to sharpen your speed and accuracy across every topic that matters."
          faqTitle="Quizzes FAQ"
          faqSubtitle="Everything you need to know about our quiz format, scoring, and how to get the most out of every session."
          testimonialsDescription="Real feedback from toppers and serious contenders who used Bharat Mock quizzes to sharpen their preparation."
          seoContent={
            <section className="bg-card border border-border rounded-3xl p-8 space-y-6">
              <header className="space-y-2">
                <p className="text-sm uppercase tracking-[0.3em] text-primary font-semibold">Long-form playbook</p>
                <h2 className="font-display text-3xl font-bold">Why Bharat Mock Quizzes are the sharpest tool in your exam prep arsenal</h2>
                <p className="text-base" style={{ color: '#1a1a1a' }}>
                  A deep dive into how short, focused quizzes build the speed, accuracy, and mental stamina that separate toppers from the rest in every competitive exam.
                </p>
              </header>
              <div className="space-y-4 leading-relaxed text-base md:text-lg" style={{ color: '#1a1a1a' }}>
                <p>The human brain learns best in short, intense bursts followed by immediate feedback. This is the science behind Bharat Mock's quiz format—10 to 20 carefully calibrated questions delivered in a timed window that forces you to think fast, eliminate wrong options, and commit to answers under pressure. Unlike full-length mocks that demand two to three hours of uninterrupted focus, quizzes slot into the gaps in your day: the 15 minutes between coaching lectures, the commute home, or the quiet half-hour before dinner. Consistency across these micro-sessions compounds into a measurable accuracy advantage by exam day.</p>
                <p>Every quiz on this platform is tagged by subject, difficulty, and exam category so that your preparation stays targeted rather than scattered. If you are preparing for SSC CGL, you can run a daily Quantitative Aptitude sprint and a separate English Comprehension drill without ever touching irrelevant content. If your target is IBPS PO, the Reasoning and Data Interpretation filters surface exactly the question types that appear in the prelims. This surgical specificity means every minute you spend on a quiz is a minute invested in your actual exam, not in generic practice that may never appear on your paper.</p>
                <p>The leaderboard and percentile overlay after each quiz is more than a vanity metric—it is a calibration tool. When you score 14 out of 20 and discover that the national average for that quiz was 11, you know you are ahead of the curve on that topic. When you score 8 and the average is 13, you have identified a gap before the exam does. This real-time benchmarking against thousands of aspirants gives you a live pulse on your competitive standing, something that self-study with textbooks can never replicate. The data accumulates across attempts, building a personal accuracy trendline that reveals whether your preparation is moving in the right direction.</p>
                <p>Negative marking is one of the most psychologically challenging aspects of competitive exams, and quizzes are the ideal training ground for mastering it. When every wrong answer costs you a fraction of a mark, the decision to attempt or skip becomes a strategic calculation rather than a guess. Regular quiz practice trains your brain to assess confidence levels quickly—to distinguish between "I know this" and "I think this might be right"—and to act accordingly. Aspirants who have attempted hundreds of quizzes before their exam walk into the hall with a calibrated risk appetite that untrained candidates simply do not possess.</p>
                <p>The bilingual support across quizzes is a significant equalizer for aspirants who are more comfortable in Hindi. Many government exams offer bilingual question papers, and practicing in both languages simultaneously builds the cognitive flexibility to switch between them without losing time. The Bharat Mock quiz engine renders questions in both English and Hindi side by side, so you can verify your understanding of terminology in both languages and build the dual-language fluency that state PSC and central government exams increasingly demand.</p>
                <p>Beyond individual performance, quizzes serve as a diagnostic engine for your overall preparation strategy. If you consistently underperform on Current Affairs quizzes, that is a signal to increase your daily GK reading. If your Reasoning scores plateau despite regular practice, the topic-level breakdown will show you exactly which question types are dragging your average down—seating arrangements, blood relations, coding-decoding—so you can target remedial practice with precision. This feedback loop between quiz performance and study planning is what transforms random practice into structured preparation.</p>
                <p>The streak system embedded in the quiz interface is a behavioral design choice rooted in habit formation research. Maintaining a daily quiz streak for 30 days does not just improve your scores—it rewires your relationship with preparation. You stop thinking of studying as a chore and start treating it as a daily ritual, as automatic as brushing your teeth. The aspirants who appear in merit lists year after year are not necessarily the most talented; they are the most consistent. Bharat Mock's quiz streak tracker is a small but powerful nudge toward that consistency.</p>
                <p>Finally, the quiz archive means that no session is ever wasted. Every quiz you attempt is saved to your profile, and you can revisit any question, review the explanation, and reattempt the full set whenever you want. This creates a personal question bank of your weak areas—a curated revision resource built entirely from your own performance data. In the final days before an exam, when time is too precious for full-length mocks, targeted reattempts of your weakest quiz sets deliver maximum revision value in minimum time.</p>
              </div>
            </section>
          }
        />
      </div>
    </div>
  );
}
