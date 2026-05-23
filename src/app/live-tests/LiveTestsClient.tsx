"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Clock,
  ArrowRight,
  Filter,
  Search,
  Tag,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { examService } from '@/lib/api/examService';
import type { Category } from '@/lib/api/taxonomyService';
import { pageBannersService, PageBanner } from '@/lib/api/pageBannersService';
import { Exam } from '@/types';
import { ExamCard, getCountdownLabel } from '@/components/exam/ExamCard';
import { StandardExamCard } from '@/components/exam/StandardExamCard';
import { formatExamSummary } from '@/lib/utils/examSummary';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';

const STATUS_TABS: { label: string; value: 'upcoming' | 'ongoing' | 'completed'; helper: string }[] = [
  { label: 'Upcoming Tests', value: 'upcoming', helper: '' },
  { label: 'Live Now', value: 'ongoing', helper: '' },
  { label: 'Recently Completed', value: 'completed', helper: '' }
];

interface FiltersContentProps {
  categories: { id: string; name: string }[];
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  selectedStatus: 'upcoming' | 'ongoing' | 'completed';
  setSelectedStatus: (s: 'upcoming' | 'ongoing' | 'completed') => void;
  resetFilters: () => void;
  setMobileFiltersOpen: (open: boolean) => void;
  closeOnSelect?: boolean;
}

function FiltersContent({
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  selectedStatus,
  setSelectedStatus,
  resetFilters,
  setMobileFiltersOpen,
  closeOnSelect = false,
}: FiltersContentProps) {
  const hasCustomFilters = selectedCategoryId !== '' || selectedStatus !== 'upcoming';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          Filters
        </p>
        {hasCustomFilters && <Button variant="ghost" size="sm" onClick={resetFilters}>Clear</Button>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Status</label>
        <div className="border border-border rounded-lg p-3 space-y-2">
          {STATUS_TABS.map((tab) => (
            <label key={tab.value} className="flex items-start gap-3 text-sm text-foreground">
              <input
                type="radio"
                name="live-status"
                className="mt-0.5 h-4 w-4 accent-primary"
                checked={selectedStatus === tab.value}
                onChange={() => {
                  setSelectedStatus(tab.value);
                  if (closeOnSelect) setMobileFiltersOpen(false);
                }}
              />
              <span className="flex flex-col">
                <span>{tab.label}</span>
                <span className="text-xs text-muted-foreground">{tab.helper}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Category</label>
        <div className="border border-border rounded-lg p-3 space-y-2 lg:max-h-48 lg:overflow-y-auto">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="radio"
              name="live-category"
              className="h-4 w-4 accent-primary"
              checked={selectedCategoryId === ''}
              onChange={() => {
                setSelectedCategoryId('');
                if (closeOnSelect) setMobileFiltersOpen(false);
              }}
            />
            <span>All Categories</span>
          </label>
          {categories.map((category) => (
            <label key={category.id} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="live-category"
                className="h-4 w-4 accent-primary"
                checked={selectedCategoryId === category.id}
                onChange={() => {
                  setSelectedCategoryId(category.id);
                  if (closeOnSelect) setMobileFiltersOpen(false);
                }}
              />
              <span>{category.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
const SCHEDULE_FALLBACK = {
  full: 'Schedule TBA',
  date: 'Date TBA',
  time: '--:--'
};

const getScheduleMeta = (value?: string | null) => {
  if (!value) return SCHEDULE_FALLBACK;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return SCHEDULE_FALLBACK;

  return {
    full: parsed.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    date: parsed.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    }),
    time: parsed.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  };
};

const getScheduleTimestamp = (value?: string | null) => {
  const parsed = value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

const formatCalendarDate = (date: Date) =>
  date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

const escapeICSValue = (value: string) =>
  (value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

const buildCalendarWindow = (exam?: Exam | null) => {
  if (!exam?.start_date) return null;
  const start = new Date(exam.start_date);
  if (Number.isNaN(start.getTime())) return null;
  const durationMinutes = Number(exam.duration) || 60;
  const end = exam.end_date ? new Date(exam.end_date) : new Date(start.getTime() + durationMinutes * 60000);
  return { start, end };
};

const getGoogleCalendarUrl = (exam: Exam) => {
  const window = buildCalendarWindow(exam);
  if (!window) return '';
  const start = formatCalendarDate(window.start);
  const end = formatCalendarDate(window.end);
  const base = 'https://www.google.com/calendar/render?action=TEMPLATE';
  const summary = formatExamSummary(exam);
  const params = new URLSearchParams({
    text: exam.title,
    dates: `${start}/${end}`,
    details: summary,
    location: 'Bharat Mock portal'
  });
  return `${base}&${params.toString()}`;
};

const HERO_BANNER_IDENTIFIER = 'live_tests_hero';

interface InitialData {
  exams: Exam[];
  categories: Category[];
}

export default function LiveTestsClient({ initialData }: { initialData: InitialData }) {
  const [exams, setExams] = useState<Exam[]>(initialData.exams);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'upcoming' | 'ongoing' | 'completed'>('upcoming');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>(initialData.categories);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const isInitialMount = useRef(true);
  const [heroSearch, setHeroSearch] = useState('');
  const [activeCalendarExam, setActiveCalendarExam] = useState<Exam | null>(null);
  const [heroBanner, setHeroBanner] = useState<PageBanner | null>(null);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeFaqTab, setActiveFaqTab] = useState<'All' | 'Payments'>('All');
  const activeRequestRef = useRef(0);

  const faqItems = useMemo(
    () => [
      {
        q: 'Can I retake a Live Test after it has ended?',
        a: 'Yes, you can attempt Live Tests again in practice mode after the live window closes. This enables you to rework and compare your two attempts and measure progress over time.'
      },
      {
        q: 'What is the difference between a Live Test and a Normal Mock Test?',
        a: 'You can take a regular mock test at your own pace anytime. A Live Test is scheduled, has real-time competition with other aspirants and a live leaderboard that keeps updating as you attempt. It\'s the real exam-day adrenaline that a solo mock simply can\'t give you.'
      },
      {
        q: 'How to join a Live Test on Bharat Mock?',
        a: 'To join the live test, log in to Bharat Mock, click on the Live Tests, select your exam category and then click on Join.'
      },
      {
        q: 'What exams are covered under Bharat Mock Live Tests?',
        a: 'Our mock tests are available for SSC, Banking, Railways, UPSC, State PSC, CTET, Defence, Insurance and many more exams.'
      },
      {
        q: 'Are Live Tests available in Hindi and English both?',
        a: 'Yes. The Live Tests are bilingual so that students from all the regions of India can attempt the tests easily in their own preferred language.'
      },
      {
        q: 'What if I miss a scheduled Live Test?',
        a: 'Certain tests may be re-attempted at a later date. But you will not be included in the live leaderboard. It is best to take the test during the live window for a competitive experience.'
      },
      {
        q: 'Do live tests follow the real exam pattern?',
        a: 'Yes, Live tests are based on the exam format, so you can get an experience of the actual exam.'
      },
      {
        q: 'How many Live Tests are held in a week on Bharat Mock?',
        a: 'We have several live tests every week in different categories. Your dashboard will have a calendar where you can plan to take the Live tests.'
      },
      {
        q: 'Will I get a performance report after each Live Test?',
        a: 'Yes. Along with every test, you will get a report containing your marks, accuracy, question-wise time, topic-wise score, hesitation report and your percentile among the best candidates.'
      }
    ],
    []
  );

  const paymentFaqItems = useMemo(
    () => [
      { q: 'Can I stop a live test once it starts?', a: 'Yes, you can use your plan on all devices. Simply log in to your account to access the tests on any device.' },
      { q: 'Can I give paid Live Tests on both mobile and laptop?', a: 'Yes, your plan works on all devices. Just log in with your account to take tests anywhere.' },
      { q: 'Is it possible to share my Bharat Mock account after purchasing a plan?', a: 'No. Accounts are not shareable. If you share your account, you may be blocked from accessing your account.' },
      { q: 'How to buy a paid Live Test plan on Bharat Mock?', a: 'Sign in to your account, go to the Plans or Subscription page, choose your plan and pay the amount. You can access your account immediately with a successful payment.' },
      { q: 'How long is my paid Live Test plan valid for?', a: 'The duration of the plan depends on which plan you buy. It\'s displayed on the plan page.' },
      { q: 'Is it possible to upgrade my plan later?', a: 'Yes, you can upgrade anytime. It will be calculated based on your plan and validity.' },
      { q: 'What do I do if my internet drops during the test?', a: 'You will be able to rejoin a test, but time will continue to be counted.' },
      { q: 'Which Live Tests are free and which are paid?', a: 'You can spot Free Live Tests on the Live Tests page - they are clearly marked as "Free". Other tests require a plan. Register and then filter by free, premium or browse the schedule.' },
    ],
    []
  );


  // Debounce search input
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    const fetchHeroBanner = async () => {
      setBannerLoading(true);
      try {
        const banners = await pageBannersService.getBanners(HERO_BANNER_IDENTIFIER);
        const active = banners.find((banner) => banner.is_active) || banners[0] || null;
        setHeroBanner(active ?? null);
        if (!active) setHeroImageLoaded(true); // no image to wait for
      } catch (err) {
        console.error('Failed to load live tests hero banner', err);
        setHeroImageLoaded(true); // show hero even if banner fails
      } finally {
        setBannerLoading(false);
      }
    };

    fetchHeroBanner();
  }, []);

  const fetchScheduledExams = useCallback(async () => {
    const requestId = ++activeRequestRef.current;
    setIsLoading(true);
    setError('');
    try {
      const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
      const params: any = {
        status: selectedStatus,
        exam_type: 'all',
        limit: 100,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedCategory) params.category = selectedCategory.slug || selectedCategory.name;

      const response = await examService.getExams(params);
      if (requestId !== activeRequestRef.current) return;

      // Keep only scheduled (windowed) exams — exclude anytime/open exams
      const scheduledOnly = response.data.filter(
        (exam) => !exam.allow_anytime && exam.status !== 'anytime'
      );
      setExams(scheduledOnly);
    } catch (err: any) {
      if (requestId !== activeRequestRef.current) return;
      setError(err.message || 'Failed to load live tests');
    } finally {
      if (requestId !== activeRequestRef.current) return;
      setIsLoading(false);
    }
  }, [selectedCategoryId, debouncedSearch, selectedStatus, categories]);

  useEffect(() => {
    // Skip first render — initial data fetched server-side
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchScheduledExams();
  }, [fetchScheduledExams]);

  const resetFilters = useCallback(() => {
    setSelectedCategoryId('');
    setSelectedStatus('upcoming');
  }, []);

  const nextUpcomingExam = useMemo(() => {
    return exams
      .filter((exam) => exam.status === 'upcoming' && !!exam.start_date)
      .sort((a, b) => getScheduleTimestamp(a.start_date) - getScheduleTimestamp(b.start_date))[0];
  }, [exams]);

  const [activeTab, setActiveTab] = useState<'mock' | 'quiz'>('mock');

  const mockExams = useMemo(() => {
    return exams.filter((exam) => {
      const type = exam.exam_type?.toLowerCase();
      return type === 'mock_test' || type === 'past_paper';
    });
  }, [exams]);

  const quizExams = useMemo(() => {
    return exams.filter((exam) => {
      const type = exam.exam_type?.toLowerCase();
      return type === 'short_quiz';
    });
  }, [exams]);

  const handleAddToCalendar = useCallback((exam: Exam) => {
    const window = buildCalendarWindow(exam);
    if (!window) {
      alert('Schedule window not available yet.');
      return;
    }

    const summary = formatExamSummary(exam);
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Bharat Mock//Exam Scheduler//EN',
      'BEGIN:VEVENT',
      `UID:${exam.id}@bharatmock.com`,
      `DTSTAMP:${formatCalendarDate(new Date())}`,
      `DTSTART:${formatCalendarDate(window.start)}`,
      `DTEND:${formatCalendarDate(window.end)}`,
      `SUMMARY:${escapeICSValue(exam.title)}`,
      `DESCRIPTION:${escapeICSValue(summary)}`,
      `LOCATION:${escapeICSValue('Bharat Mock portal')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exam.slug || exam.id}-bharat-mock.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, []);

  const renderLoadingState = () => (
    <div className="space-y-8">
      <Skeleton className="h-72 w-full rounded-2xl" />
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="p-6 border border-border rounded-2xl space-y-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-24 rounded-full" />
              <Skeleton className="h-10 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(heroSearch);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero */}
      <section className="relative gradient-hero py-6 md:py-10">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />
        <div className="container-main">
          {/* Skeleton hero — shown until banner image loads */}
          {!heroImageLoaded && (
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-4">
                <Skeleton className="h-4 w-40 bg-white/20" />
                <Skeleton className="h-4 w-32 bg-white/20" />
                <Skeleton className="h-10 w-3/4 bg-white/20" />
                <Skeleton className="h-10 w-2/3 bg-white/20" />
                <Skeleton className="h-6 w-full bg-white/20" />
                <Skeleton className="h-6 w-5/6 bg-white/20" />
                <div className="flex gap-3 pt-2">
                  <Skeleton className="h-11 flex-1 bg-white/20" />
                  <Skeleton className="h-11 w-36 bg-white/20" />
                </div>
              </div>
              <div className="space-y-4">
                <Skeleton className="h-64 w-full rounded-3xl bg-white/20" />
                <Skeleton className="h-20 w-full rounded-2xl bg-white/20" />
              </div>
            </div>
          )}

          {/* Real hero — fades in once image loaded */}
          <div
            className="grid lg:grid-cols-2 gap-12 items-center"
            style={{ opacity: heroImageLoaded ? 1 : 0, transition: 'opacity 0.4s ease', position: heroImageLoaded ? 'static' : 'absolute', pointerEvents: heroImageLoaded ? 'auto' : 'none' }}
          >
            <div>
              <Breadcrumbs
                items={[HomeBreadcrumb(), { label: 'Live Tests' }]}
                variant="dark"
                className="mb-6"
              />
              <h1 className="font-display text-2xl md:text-5xl font-bold text-background mb-3">
                Join the <span className="text-secondary">scheduled</span> live tests curated by Bharat Mock
              </h1>
              <p className="text-sm md:text-lg text-background/80 mb-5">
                Reserve your slot, compete with thousands of aspirants in real time, and receive instant analytics after every live test.
              </p>
              <form onSubmit={handleHeroSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search live tests, e.g., SSC CHSL"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    className="h-11 pl-10 bg-background"
                  />
                </div>
                <Button type="submit" className="h-11 px-6 font-semibold">
                  Explore Schedule
                </Button>
              </form>
            </div>

            <div>
              <div className="bg-background rounded-3xl shadow-2xl border border-border/40 overflow-hidden">
                <div className="relative bg-slate-100" suppressHydrationWarning>
                  {heroBanner ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroBanner.image_url}
                      alt={heroBanner.alt_text || 'Live tests highlight banner'}
                      className="w-full h-auto object-contain"
                      loading="eager"
                      onLoad={() => setHeroImageLoaded(true)}
                    />
                  ) : !bannerLoading ? (
                    <div className="border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                      No live tests banner uploaded yet.
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-6 bg-secondary text-secondary-foreground rounded-2xl p-3 shadow-md">
                <p className="text-xs uppercase tracking-wide text-secondary-foreground/80">Next mega slot</p>
                {nextUpcomingExam ? (
                  <div className="space-y-0.5">
                    <p className="text-xl font-semibold">
                      {getScheduleMeta(nextUpcomingExam.start_date).full}
                    </p>
                    <p className="text-xs font-medium line-clamp-1 text-secondary-foreground/90">{nextUpcomingExam.title}</p>
                    <p className="text-[11px] text-secondary-foreground/80 flex items-center gap-2">
                      Limited seats • Starts in {getCountdownLabel(nextUpcomingExam.start_date)}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-xl font-semibold">Schedule TBA</p>
                    <p className="text-[11px] text-secondary-foreground/80">Stay tuned for the next live slot</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-main py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <aside className="hidden lg:block lg:w-60 xl:w-64 flex-shrink-0">
            <div className="sticky top-20 bg-card rounded-2xl border border-border p-6 space-y-4">
              <FiltersContent
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                setSelectedCategoryId={setSelectedCategoryId}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
                resetFilters={resetFilters}
                setMobileFiltersOpen={setMobileFiltersOpen}
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0 space-y-12">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6">
                <p className="text-destructive">{error}</p>
                <Button variant="outline" onClick={fetchScheduledExams} className="mt-4">
                  Retry Loading
                </Button>
              </div>
            )}

            {isLoading ? (
              renderLoadingState()
            ) : (
              <div className="space-y-6">
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'mock' | 'quiz')} className="w-full">
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="mock">Live Mock Tests</TabsTrigger>
                    <TabsTrigger value="quiz">Live Quizzes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="mock">
                    {mockExams.length === 0 ? (
                      <div className="bg-card border border-border rounded-3xl p-12 text-center">
                        <h3 className="font-display text-xl font-bold mb-2">No live mock tests</h3>
                        <p className="text-muted-foreground mb-6">Switch to Live Quizzes to see other fixtures.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display text-2xl font-bold">Live Mock Tests</h3>
                          <Link href="/mock-test-series">
                            <Button variant="outline">Browse Anytime Exams</Button>
                          </Link>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                          {mockExams.map((exam) => (
                            <StandardExamCard key={exam.id} exam={exam} hideAttempts={true} isLive={
                              (exam.status || '').toLowerCase().includes('live') ||
                              (exam.status || '').toLowerCase() === 'ongoing'
                            } />
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="quiz">
                    {quizExams.length === 0 ? (
                      <div className="bg-card border border-border rounded-3xl p-12 text-center">
                        <h3 className="font-display text-xl font-bold mb-2">No live quizzes</h3>
                        <p className="text-muted-foreground mb-6">Switch to Live Mock Tests to see other fixtures.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display text-2xl font-bold">Live Quizzes</h3>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                          {quizExams.map((exam) => (
                            <StandardExamCard key={exam.id} exam={exam} hideAttempts={true} isLive={
                              (exam.status || '').toLowerCase().includes('live') ||
                              (exam.status || '').toLowerCase() === 'ongoing'
                            } />
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isLoading && (
        <div className="container-main pb-20 space-y-20 overflow-hidden">
          <section className="bg-background border border-border/60 rounded-3xl shadow-sm p-6 sm:p-8 lg:p-10 space-y-8">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 text-center">
              Why Take Bharat Live Test Series
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1 - Real Exam Feel */}
              <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 sm:p-8 border border-blue-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 lg:gap-6">
                  <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-gray-900">
                    <h3 className="font-display text-lg sm:text-xl font-bold mb-1 sm:mb-2">Real Exam Feel</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Experience real exam pressure with timed tests and authentic question experience.
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Card 2 - Topic-Wise Tests */}
              <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 sm:p-8 border border-purple-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 lg:gap-6">
                  <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="flex-1 text-gray-900">
                    <h3 className="font-display text-lg sm:text-xl font-bold mb-1 sm:mb-2">Topic-Wise Tests</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Master every topic with focused tests designed for deeper concept clarity.
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Card 3 - Performance Analysis */}
              <div className="group relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 sm:p-8 border border-amber-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 lg:gap-6">
                  <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-amber-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-gray-900">
                    <h3 className="font-display text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-gray-900">Performance Analysis</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Unlock smart insights to track progress and improve weak areas instantly.
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>
          </section>

          <TestimonialsSection
            description="Real feedback from toppers and serious contenders—curated from app reviews and our student community—to remind you that live fixtures here translate into real selection stories."
          />

          <section className="bg-card border border-border rounded-3xl p-8 space-y-8">
            <header className="space-y-4 text-center mb-6">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Plan Better Preparation with Scheduled Live Tests</h2>
              <p className="text-muted-foreground max-w-4xl mx-auto text-lg leading-relaxed">
                Bharat Mock Live Test Series is the closest to a real exam you will get without stepping into a centre. Each test is designed to sharpen your speed, accuracy, and confidence so that when the day of the exam comes, you are ready for it.
              </p>
            </header>

            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-foreground">Exam-Standard Practice</h2>
                <div className="space-y-4 leading-relaxed text-gray-800">
                  <p>Most students work hard, but then "freeze" on exam day. That's because reading notes and actually performing under pressure are two completely different skills.</p>
                  <p>With Bharat Mock, you get the real experience of an exam on your screen. Every timer, leaderboard change and checkpoint is designed for you to feel the actual exam pressure. It builds your exam practice and confidence before the actual test.</p>
                  <p>When you try a live test here, you are not only practising. You are in a real-time competition with lakhs of students where every mark you save from negative marking brings you closer to your cut-off.</p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-800">
                    <li>Live leaderboard updates keep you on your toes and in the game</li>
                    <li>Sectional timing trains you to distribute time like a topper</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-foreground">Topic-Wise Tests</h2>
                <div className="space-y-4 leading-relaxed text-gray-800">
                  <p>You can't fix what you can't find. Topic-wise tests help you identify your exact weak spots before they cost you marks in the final paper.</p>
                  <p>In Bharat Mock, each live mock test is supported with micro-details such as sectional accuracy benchmarks, average scores of recent test-takers, and suggested revision slots. You are not attempting a test. You are building a custom study plan, one subject at a time.</p>
                  <p>Maybe you start with a 30-minute reasoning session on Tuesday, tack on a bilingual GS sprint on Thursday, and round out the week with a full live exam mock test on Sunday. This is what makes practice performance.</p>
                  <p>Short live quizzes are part of the practice. 10-15 questions in 10 minutes builds real exam speed and pressure. They keep you consistent, since studying a little every day is more effective than putting in effort only occasionally. <Link href="/quizzes" className="text-primary hover:underline">Try short live quizzes</Link>.</p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-foreground">Smart Performance Insights</h2>
                <div className="space-y-4 leading-relaxed text-gray-800">
                  <p>Completing a test is only the start. What you do with your result is what really moves your rank. After taking a live online quiz or <Link href="/mock-test-series" className="text-primary hover:underline">mock test series</Link>, the platform shows your performance in detail.</p>
                  <p>Compare it to overall averages, highlight time-loss points, and get guidance on areas for improvement.</p>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border px-4 py-3 text-left font-semibold">Insight</th>
                        <th className="border border-border px-4 py-3 text-left font-semibold">Benefit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-border px-4 py-3">Score Comparison</td>
                        <td className="border border-border px-4 py-3">See how you perform vs the overall average</td>
                      </tr>
                      <tr className="bg-muted/50">
                        <td className="border border-border px-4 py-3">Topic Accuracy</td>
                        <td className="border border-border px-4 py-3">Find weak and strong areas easily</td>
                      </tr>
                      <tr>
                        <td className="border border-border px-4 py-3">Time Analysis</td>
                        <td className="border border-border px-4 py-3">Improve speed on tough questions</td>
                      </tr>
                      <tr className="bg-muted/50">
                        <td className="border border-border px-4 py-3">Performance Report</td>
                        <td className="border border-border px-4 py-3">Get clear guidance for better practice</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 leading-relaxed text-gray-800">
                  <p>Your feed gets updated as soon as a new exam is launched. For <Link href="/ssc" className="text-primary hover:underline">SSC</Link>, <Link href="/railway" className="text-primary hover:underline">Railway</Link>, <Link href="/banking" className="text-primary hover:underline">Banking</Link> and <Link href="/police" className="text-primary hover:underline">Police</Link> students, practice is rotated to cover all important topics regularly.</p>
                  <p>The outcome? A prep cycle that feels personal, not generic.</p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-foreground">Why This Approach Works</h2>
                <div className="space-y-4 leading-relaxed text-gray-800">
                  <p>Toppers have one thing in common: practise with a strategy is more effective than passive learning.</p>
                  <p>The Bharat Mock Test Series doesn't just test you, it highlights your weaknesses, benchmarks your scores and tracks your improvement over time so you can build a study habit.</p>
                  <p>The nation's toughest exams are waiting. Let Bharat Mock be the system that keeps you driving towards them, one live test at a time.</p>
                </div>
              </div>
            </div>
          </section>

        </div>
      )}

      {mobileFiltersOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background">
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
                <FiltersContent
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  setSelectedCategoryId={setSelectedCategoryId}
                  selectedStatus={selectedStatus}
                  setSelectedStatus={setSelectedStatus}
                  resetFilters={resetFilters}
                  setMobileFiltersOpen={setMobileFiltersOpen}
                  closeOnSelect
                />
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-border bg-background px-4 py-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
                  onClick={() => {
                    resetFilters();
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
          className="md:hidden fixed bottom-5 left-4 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold"
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>
      )}
    </div>
  );
}
