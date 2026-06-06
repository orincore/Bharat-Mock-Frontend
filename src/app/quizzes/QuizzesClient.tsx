"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Filter, BookOpen, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StandardExamCard } from '@/components/exam/StandardExamCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';
import { taxonomyService, Difficulty } from '@/lib/api/taxonomyService';
import { Exam } from '@/types';
import { PageSeoSections } from '@/components/sections/PageSeoSections';

// Quizzes carry their Test Series section/topic NAMES (resolved server-side by the
// /exams/quizzes-grouped endpoint). We pool quizzes across all series by section
// name (top tabs) and topic name (pills) — mirroring the test-series Section→Topic UI.
type QuizExam = Exam & {
  section_name?: string | null;
  section_order?: number | null;
  topic_name?: string | null;
  topic_order?: number | null;
};

const UNSECTIONED = '__no_section__';
const UNSECTIONED_LABEL = 'Other Quizzes';

interface InitialData {
  exams: QuizExam[];
  total: number;
}

interface SectionGroup {
  key: string;
  name: string;
  order: number;
  count: number;
}

interface TopicGroup {
  key: string;
  name: string;
  order: number;
  count: number;
}

export default function QuizzesClient({ initialData, initialDifficulties }: { initialData: InitialData; initialDifficulties?: Difficulty[] }) {
  // Full quiz set (fetched server-side). All grouping/filtering happens client-side
  // so the Section → Topic navigation can show accurate counts, mirroring the
  // test-series Section → Topic listing.
  const [exams] = useState<QuizExam[]>(initialData.exams);

  const [difficultyOptions, setDifficultyOptions] = useState<Difficulty[]>(initialDifficulties ?? []);
  const [difficultiesLoading, setDifficultiesLoading] = useState(initialDifficulties === undefined);

  // Filters that narrow the working set (section/topic live in the tabs/pills)
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDifficultyId, setSelectedDifficultyId] = useState('');
  const [accessFilter, setAccessFilter] = useState<'' | 'true' | 'false'>('');

  // Grouped navigation state (keyed by section/topic NAME, pooled across series)
  const [activeSectionKey, setActiveSectionKey] = useState('');
  const [selectedTopicKey, setSelectedTopicKey] = useState('');

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const sectionsScrollRef = useRef<HTMLDivElement>(null);
  const topicsScrollRef = useRef<HTMLDivElement>(null);

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    ref.current?.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  useEffect(() => {
    if (initialDifficulties === undefined) fetchDifficulties();
  }, [initialDifficulties]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileFiltersOpen]);

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

  // Section/topic identity helpers — pooled across series by NAME.
  const sectionKeyOf = (e: QuizExam) => (e.section_name?.trim() || UNSECTIONED);
  const topicKeyOf = (e: QuizExam) => (e.topic_name?.trim() || '');

  // ── Filtering (search / difficulty / access) ───────────────────────────────
  const filteredExams = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return exams.filter((e) => {
      if (q) {
        const hay = `${e.title || ''} ${e.section_name || ''} ${e.topic_name || ''} ${(e.exam_categories as any)?.name || e.category || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (selectedDifficultyId && e.difficulty_id !== selectedDifficultyId) return false;
      if (accessFilter === 'true' && !e.is_premium) return false;
      if (accessFilter === 'false' && e.is_premium) return false;
      return true;
    });
  }, [exams, debouncedSearch, selectedDifficultyId, accessFilter]);

  // ── Section groups (top-level tabs), pooled by section name ────────────────
  const sectionGroups = useMemo<SectionGroup[]>(() => {
    const map = new Map<string, SectionGroup>();
    for (const e of filteredExams) {
      const key = sectionKeyOf(e);
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        if (e.section_order != null) existing.order = Math.min(existing.order, e.section_order);
      } else {
        map.set(key, {
          key,
          name: key === UNSECTIONED ? UNSECTIONED_LABEL : (e.section_name as string),
          order: e.section_order ?? Number.MAX_SAFE_INTEGER,
          count: 1,
        });
      }
    }
    // Sort by admin display order, then name; keep "Other Quizzes" last.
    return [...map.values()].sort((a, b) => {
      if (a.key === UNSECTIONED) return 1;
      if (b.key === UNSECTIONED) return -1;
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
  }, [filteredExams]);

  // Resolve the active section during render (not in a post-mount effect) so the
  // first section's quizzes are present in the server HTML. Falls back to the
  // first available group whenever the stored selection is empty or filtered out.
  const effectiveActiveSectionKey = useMemo(
    () => (activeSectionKey && sectionGroups.some((s) => s.key === activeSectionKey))
      ? activeSectionKey
      : (sectionGroups[0]?.key ?? ''),
    [activeSectionKey, sectionGroups]
  );

  // Reset topic selection whenever the active section changes.
  useEffect(() => { setSelectedTopicKey(''); }, [effectiveActiveSectionKey]);

  // ── Topic groups for the active section (topic pills), pooled by topic name ─
  const topicGroups = useMemo<TopicGroup[]>(() => {
    if (!effectiveActiveSectionKey) return [];
    const inSection = filteredExams.filter((e) => sectionKeyOf(e) === effectiveActiveSectionKey);
    const map = new Map<string, TopicGroup>();
    for (const e of inSection) {
      const key = topicKeyOf(e);
      if (!key) continue; // quizzes without a topic only appear under "All"
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        if (e.topic_order != null) existing.order = Math.min(existing.order, e.topic_order);
      } else {
        map.set(key, { key, name: e.topic_name as string, order: e.topic_order ?? Number.MAX_SAFE_INTEGER, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
  }, [filteredExams, effectiveActiveSectionKey]);

  // ── Quizzes visible in the current Section / Topic selection ───────────────
  const visibleExams = useMemo(() => {
    if (!effectiveActiveSectionKey) return [];
    let list = filteredExams.filter((e) => sectionKeyOf(e) === effectiveActiveSectionKey);
    if (selectedTopicKey) list = list.filter((e) => topicKeyOf(e) === selectedTopicKey);
    return [...list].sort((a, b) =>
      new Date(b.created_at || b.updated_at || '').getTime() -
      new Date(a.created_at || a.updated_at || '').getTime()
    );
  }, [filteredExams, effectiveActiveSectionKey, selectedTopicKey]);

  const activeSectionCount = useMemo(
    () => sectionGroups.find((s) => s.key === effectiveActiveSectionKey)?.count ?? 0,
    [sectionGroups, effectiveActiveSectionKey]
  );

  const hasCustomFilters = Boolean(search || selectedDifficultyId || accessFilter);

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedDifficultyId('');
    setAccessFilter('');
    setSelectedTopicKey('');
  };

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

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Difficulty</label>
          {difficultiesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full rounded" />)}
            </div>
          ) : (
            <div className="border border-border rounded-lg p-3 space-y-2 lg:max-h-40 lg:overflow-y-auto">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="radio" name="quiz-difficulty" className="h-4 w-4 accent-primary"
                  checked={selectedDifficultyId === ''} onChange={() => setSelectedDifficultyId('')} />
                <span>All Difficulties</span>
              </label>
              {difficultyOptions.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="quiz-difficulty" className="h-4 w-4 accent-primary"
                    checked={selectedDifficultyId === d.id}
                    onChange={() => setSelectedDifficultyId(d.id)} />
                  <span>{d.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Access</label>
          <div className="border border-border rounded-lg p-3 space-y-2">
            {[{ label: 'All', value: '' }, { label: 'Free', value: 'false' }, { label: 'Premium', value: 'true' }].map(({ label, value }) => (
              <label key={value} className="flex items-center gap-2 text-sm text-foreground">
                <input type="radio" name="quiz-access" className="h-4 w-4 accent-primary"
                  checked={accessFilter === value}
                  onChange={() => setAccessFilter(value as '' | 'true' | 'false')} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
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
              Practice Smart Quizzes
            </h1>
            <p className="text-lg text-background/80 mb-8">
              Topic-wise short quizzes for all govt exams to improve your accuracy &amp; confidence.
            </p>
            <form onSubmit={(e) => e.preventDefault()}
              className="flex flex-col sm:flex-row gap-3 sm:items-stretch" suppressHydrationWarning>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" suppressHydrationWarning />
                <Input type="text" placeholder="Search quizzes by name or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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

          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">Quiz Results</h2>
                <p className="text-sm text-muted-foreground">
                  Showing {visibleExams.length} of {filteredExams.length} short quizzes
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={clearFilters} suppressHydrationWarning>Reset filters</Button>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <BookOpen className="h-4 w-4" />
                  <span>{filteredExams.length} quizzes</span>
                </div>
              </div>
            </div>

            {sectionGroups.length === 0 ? (
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
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5 min-w-0 overflow-hidden">
                {/* Section tabs */}
                <div className="border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => scroll(sectionsScrollRef, 'left')}
                      className="hidden md:flex shrink-0 self-center h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors mb-3"
                      aria-label="Scroll sections left"
                      suppressHydrationWarning
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-600" />
                    </button>
                    <div
                      ref={sectionsScrollRef}
                      className="flex items-center gap-4 overflow-x-auto pb-3 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth -mx-5 px-5"
                    >
                      {sectionGroups.map((section) => (
                        <button
                          key={section.key}
                          onClick={() => setActiveSectionKey(section.key)}
                          className={`relative shrink-0 pb-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                            effectiveActiveSectionKey === section.key ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                          }`}
                          suppressHydrationWarning
                        >
                          {section.name} ({section.count})
                          {effectiveActiveSectionKey === section.key && (
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

                {/* Topic pills */}
                {topicGroups.length > 0 && (
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
                      <button
                        onClick={() => setSelectedTopicKey('')}
                        className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                          selectedTopicKey === '' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        All ({activeSectionCount})
                      </button>
                      {topicGroups.map((topic) => (
                        <button
                          key={topic.key}
                          onClick={() => setSelectedTopicKey((prev) => (prev === topic.key ? '' : topic.key))}
                          className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            selectedTopicKey === topic.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {topic.name} ({topic.count})
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

                {/* Quiz cards */}
                {visibleExams.length > 0 ? (
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {visibleExams.map((exam) => (
                      <StandardExamCard
                        key={exam.id}
                        exam={{ ...exam, category_logo_url: (exam.exam_categories as any)?.logo_url, category_icon: (exam.exam_categories as any)?.icon }}
                        hideAttempts={true}
                        ctaLabel="Attempt Now"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-10 text-center">
                    <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No quizzes match your filters in this section yet.</p>
                  </div>
                )}
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
                  onClick={() => { clearFilters(); setMobileFiltersOpen(false); }}
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
          showFaq={false}
          whyTitle="Why Choose Bharat Mock Quizzes"
          whySubtitle="Short, sharp, and exam-focused—Bharat Mock quizzes are engineered to sharpen your speed and accuracy across every topic that matters."
          whyContent={
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 sm:p-8 border border-blue-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 lg:gap-6">
                  <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Daily Quizzes</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">New daily quizzes keep your practice fresh, helping you stay consistent and improve your performance every day.</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 sm:p-8 border border-purple-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 lg:gap-6">
                  <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Topic-wise Targeting</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Stop practising everything. Pick the one topic hurting your score and fix it with a focused quiz.</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              <div className="group relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 sm:p-8 border border-amber-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 lg:gap-6">
                  <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-amber-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Latest Exam Patterns</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Every quiz mirrors the latest exam blueprint. What you practice here is exactly what shows up on exam day.</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>
          }
          faqTitle="FAQ's"
          faqSubtitle="Everything you need to know before you attempt your first quiz"
          faqItems={[
            { q: 'Which is the best quiz to start with as a beginner?', a: 'Start with a subject-wise quiz on your strongest subject first. It builds confidence early. Once you are comfortable, try mixed quizzes that have mixed questions from multiple subjects, similar to your actual SSC quiz or banking quiz paper.' },
            { q: 'How is a quiz different from a full mock test?', a: 'A mock test covers the full paper in one go. A quiz is shorter, more specific to one topic or subject and gives you faster feedback.' },
            { q: 'Can I filter quizzes by exam and difficulty?', a: 'Yes. You can pick quizzes by type of exam, topic, difficulty and language. From a basic railway quiz to a complex banking quiz on Data Interpretation, you can choose the quiz you want.' },
            { q: 'Do quizzes follow negative marking like the actual exam?', a: 'Yes, the CBT-style quizzes follow the exact same negative marking as the official pattern, so that you learn to attempt questions confidently before the actual paper.' },
            { q: 'How many quizzes should I attempt in a day?', a: "It's better to attempt two or three quizzes per day rather than ten quizzes. Consistency and quality are key in any govt exam." },
            { q: 'Are there quizzes for current affairs and GK?', a: 'Yes. Current Affairs Quizzes are published every day, so you can keep up-to-date with news and events without having to read a newspaper.' },
            { q: 'Can I attempt quizzes without creating an account?', a: "You can view the quizzes, but to save time and progress to track your improvement and build your own personal weak area list while you revise, you will need to register (it's free)." },
            { q: 'Are police quiz questions based on state-specific patterns?', a: 'Yes. We offer state paper pattern police quizzes for various topics like General knowledge, reasoning, current affairs, in the same pattern you will get in your state exam.' },
            { q: 'What happens if I run out of time during a quiz?', a: 'The quiz will automatically submit when the time is over, as in a CBT paper. Your attempt is evaluated, giving you an instant result.' },
          ]}
          mostAskedItems={[
            { q: 'Are quizzes updated after every official exam notification?', a: 'Yes. Whenever a new notification is released or an exam pattern changes, our team updates the relevant quiz sets within a few days. This ensures your practice always matches the latest exam trends.' },
            { q: 'Can I attempt quizzes on my mobile?', a: 'All quizzes are mobile-friendly. You can take any quiz on any device, anywhere and anytime you want.' },
            { q: 'Do I get answers and explanations after the quiz?', a: 'Yes. With all quizzes, explanations are provided to understand the concepts, and hence improve your performance.' },
            { q: 'Are quizzes available in Hindi and English?', a: 'Yes, all quizzes are in Hindi and English. This ensures students are well prepared for bilingual exams.' },
            { q: 'Are quiz questions repeated in real exams?', a: 'Questions may not be the same, but patterns are quite similar to the actual exams, such as SSC and banking. This lets you know the exam pattern.' },
            { q: 'Are SSC quiz questions based on previous year papers?', a: 'Yes. SSC quiz questions are set according to <Link href="/previous-year-papers" className="text-primary hover:underline">previous year papers</Link> of SSC CGL, CHSL, and MTS, so you get to practice actual exam questions.' },
            { q: 'Can I prepare for multiple exams at the same time on Bharat Mock?', a: 'Yes. You can practice the SSC quiz, the banking quiz, and the railway quiz in one account, and it will track your score.' },
            { q: 'Are quizzes enough, or do I need mock tests too?', a: 'Both are important. Practice quizzes help to learn new things fast, while mock tests give you an idea of how ready you are for the exam. Both are best.' },
            { q: 'How many questions are there in each quiz?', a: "Each quiz has 10 to 20 questions, depending on the level. It's brief enough to finish in a reasonable time, but long enough to practise." },
            { q: 'What happens if I accidentally close the quiz or lose internet connection?', a: 'Your answers are automatically saved. You will be able to start from the last question answered.' },
          ]}
          testimonialsDescription="Real feedback from toppers and serious contenders who used Bharat Mock quizzes to sharpen their preparation."
          seoContent={
            <section className="bg-card border border-border rounded-3xl p-8 space-y-8">
              <header className="space-y-4">
                <h2 className="font-display text-3xl font-bold">Why BharatMock Quizzes Are the Smartest Part of Your Exam Preparation</h2>
                <p className="text-base text-gray-700">
                  An honest look at how short, focused quizzes develop the speed, accuracy and mental sharpness that truly distinguishes selected candidates.
                </p>
              </header>
              <div className="space-y-4 leading-relaxed text-base md:text-lg text-gray-800">
                <p>BharatMock quizzes are small topic-wise practice sets for SSC, Banking, Railway, Police and all government exam aspirants. Each quiz is modeled on real exam patterns, gives instant feedback and tracks your accuracy over time.</p>
                <p>The aim is simple: fix weak areas fast, practice consistently and walk into your exam more prepared than the average candidate. The human brain does not learn well during long, gruelling sessions. It learns in short bursts with immediate feedback.</p>
                <p>Whether it is an SSC quiz or a banking quiz, these are the sessions that will keep your preparation going every day without disturbing your schedule.</p>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-gray-900">What makes short quizzes more effective than long study sessions:</h2>
                <ul className="list-disc pl-6 space-y-2 text-gray-800">
                  <li>They force active recall, which builds memory faster than passive reading.</li>
                  <li>You get immediate feedback on each question, telling you exactly what to fix now.</li>
                </ul>
              </div>

              <div className="space-y-4 text-gray-800 leading-relaxed">
                <p>Every quiz is mapped to a particular exam, topic and difficulty level. An SSC quiz is meant to cover only Tier 1 and Tier 2 question types.</p>
                <p>Banking quiz on Reasoning or Data Interpretation is exactly what comes in IBPS PO and SBI PO prelims. You are not studying for a general exam. You are rehearsing for your exam.</p>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-gray-900">Why targeted quizzes outperform random practice:</h2>
                <ul className="list-disc pl-6 space-y-2 text-gray-800">
                  <li>You only spend time on things that actually show up in your paper</li>
                  <li>Topic-level tagging reveals which concepts require more immediate focus</li>
                </ul>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border px-4 py-3 text-left font-semibold">Quiz Type</th>
                      <th className="border border-border px-4 py-3 text-left font-semibold">Exams Covered</th>
                      <th className="border border-border px-4 py-3 text-left font-semibold">Key Topics</th>
                      <th className="border border-border px-4 py-3 text-left font-semibold">Avg. Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-border px-4 py-3">SSC Quiz</td>
                      <td className="border border-border px-4 py-3">SSC CGL, CHSL, MTS</td>
                      <td className="border border-border px-4 py-3">Quant, English, GK, Reasoning</td>
                      <td className="border border-border px-4 py-3">8 – 12 mins</td>
                    </tr>
                    <tr className="bg-muted/50">
                      <td className="border border-border px-4 py-3">Banking Quiz</td>
                      <td className="border border-border px-4 py-3">IBPS PO, SBI PO, RBI</td>
                      <td className="border border-border px-4 py-3">DI, Reasoning, English, GA</td>
                      <td className="border border-border px-4 py-3">10 – 15 mins</td>
                    </tr>
                    <tr>
                      <td className="border border-border px-4 py-3">Railway Quiz</td>
                      <td className="border border-border px-4 py-3">RRB NTPC, Group D, ALP</td>
                      <td className="border border-border px-4 py-3">Maths, GK, Reasoning, Science</td>
                      <td className="border border-border px-4 py-3">8 – 10 mins</td>
                    </tr>
                    <tr className="bg-muted/50">
                      <td className="border border-border px-4 py-3">Police Quiz</td>
                      <td className="border border-border px-4 py-3">State Police, SSC CPO</td>
                      <td className="border border-border px-4 py-3">GK, Current Affairs, Reasoning</td>
                      <td className="border border-border px-4 py-3">5 – 8 mins</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 text-gray-800 leading-relaxed">
                <p>All questions are categorised by topic, difficulty and exam category. If you answer a question wrong, you know exactly what concept you need to work on and how often it appears in your actual paper.</p>
                <p>Every wrong answer is no longer a disappointment; it is a direction. The only real challenge for the railway aspirants is consistency.</p>
                <p>The RRB syllabus is vast, and it is easy to practice the topics which you are already good at. A daily railway quiz forces you to confront weak areas early, before the exam does it for you.</p>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-gray-900">How a Daily Quiz Habit Pays Off on Exam Day</h2>
                <ul className="list-disc pl-6 space-y-2 text-gray-800">
                  <li>You get accuracy and speed from short, frequent practice sessions that full-length mocks cannot give you.</li>
                  <li>Trying one quiz a day makes you stay active on things you would otherwise keep postponing.</li>
                  <li>Your weak areas surface faster when you practice daily, giving you more time to fix them before exam day.</li>
                  <li>Over time, students who quiz often enter the exam hall with a confidence that last-minute preparation cannot match.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-gray-900">Two things only quizzes can show you:</h2>
                <ul className="list-disc pl-6 space-y-2 text-gray-800">
                  <li>What sub-topics need more attention before the exam day</li>
                  <li>Whether you are truly improving, or it is just random changes</li>
                </ul>
              </div>

              <div className="space-y-4 text-gray-800 leading-relaxed">
                <p>Then, the psychology of negative marking is what most aspirants learn only when it is too late. Timed quizzes train your brain to make quick, confident decisions.</p>
                <p>To differentiate between "I am sure" and "I think so." It is that instinct, built up over hundreds of attempts at quizzes, that separates calm thinking in the exam hall from panic-stricken guessing.</p>
                <p>Last but not least, nothing you do here is wasted. All quizzes are tracked forever to your profile. Return to questions you found difficult, attempt full sets again before your exam and build up a bank of your own weak areas to revise.</p>
              </div>
            </section>
          }
        />
      </div>
    </div>
  );
}
