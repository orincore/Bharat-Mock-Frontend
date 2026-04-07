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
import { taxonomyService, Category } from '@/lib/api/taxonomyService';
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

export default function LiveTestsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'upcoming' | 'ongoing' | 'completed'>('upcoming');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
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
        q: 'What makes a Bharat Mock live test different from standard mocks?',
        a: 'Live tests run in real-time windows with leaderboards, proctored timers, and restriction policies that mirror actual exam centers. You compete alongside thousands of aspirants, so percentile and AIR insights are more representative of the real cutoffs.'
      },
      {
        q: 'Can I revisit a live test after the window closes?',
        a: 'Yes. Once the window closes you can reattempt the same paper as an anytime mock or review the full explanation set. The Save Tests & Questions feature also lets you bookmark specific items for later revision.'
      },
      {
        q: 'How often are new live quizzes or mocks added?',
        a: 'The content team schedules fresh fixtures every week across SSC, banking, railways, defence, and state exams. Tap the filters or search bar to discover upcoming slots relevant to your target category.'
      },
      {
        q: 'Do I need a paid subscription to join live tests?',
        a: 'Most live quizzes are free and rotating mock fixtures are included in standard plans. Premium badges indicate advanced analytics or mentor-led reviews; everything else can be attempted with a free Bharat Mock account.'
      },
      {
        q: 'Will my analytics sync with the main Bharat Mock dashboard?',
        a: 'Absolutely. Every live attempt feeds into your profile. Accuracy, sectional speed, and percentile trends are visible on the analytics tab so you can measure improvements over time.'
      }
    ],
    []
  );

  const paymentFaqItems = useMemo(
    () => [
      { q: 'What payment methods are accepted?', a: 'We accept UPI (GPay, PhonePe, Paytm), Net Banking, Credit/Debit Cards (Visa, Mastercard, RuPay), and popular wallets via Razorpay.' },
      { q: 'Is my payment information secure?', a: 'Yes. All transactions are processed through Razorpay, a PCI-DSS compliant payment gateway. We never store your card details on our servers.' },
      { q: 'Can I get a refund if I am not satisfied?', a: 'We offer a 7-day refund policy for premium subscriptions. If you face any issues, contact support@bharatmock.com within 7 days of purchase.' },
      { q: 'Will I get a receipt or invoice for my payment?', a: 'Yes. A payment confirmation email with a GST invoice is sent to your registered email address immediately after a successful transaction.' },
      { q: 'What happens if my payment fails but money is deducted?', a: 'In case of a failed transaction where money is deducted, it is automatically refunded to your source account within 5–7 business days. Contact us if it takes longer.' },
      { q: 'Are there any hidden charges or auto-renewals?', a: 'No hidden charges. Subscriptions do not auto-renew unless you explicitly enable it. You will always be notified before any renewal.' },
      { q: 'Can I upgrade or downgrade my subscription plan?', a: 'Yes. You can upgrade your plan at any time and pay only the prorated difference. Downgrades take effect at the end of the current billing cycle.' },
      { q: 'Do you offer student discounts or group pricing?', a: 'Yes, we periodically offer discounts for students and group enrollments. Check the Subscriptions page or contact us for bulk pricing.' },
    ],
    []
  );

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await taxonomyService.getCategories();
        setCategories(
          data
            .filter((c) => c.is_active !== false)
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        );
      } catch (catError) {
        console.error('Failed to load categories', catError);
      }
    };
    loadCategories();
  }, []);

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
      <section className="relative gradient-hero py-10">
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
              <p className="uppercase text-sm tracking-[0.4em] text-background/70 mb-3">Weekly Live Fixtures</p>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-background mb-4">
                Join the <span className="text-secondary">scheduled</span> live tests curated by Bharat Mock
              </h1>
              <p className="text-lg text-background/80 mb-6">
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
                <div className="relative min-h-[200px] bg-slate-100" suppressHydrationWarning>
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
                            <StandardExamCard key={exam.id} exam={exam} isLive={
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
                            <StandardExamCard key={exam.id} exam={exam} isLive={
                              (exam.status || '').toLowerCase().includes('live') ||
                              (exam.status || '').toLowerCase() === 'ongoing'
                            } />
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <section className="bg-background border border-border/60 rounded-3xl shadow-sm p-8 md:p-12 space-y-8">
                  <div className="text-center space-y-3">
                    <p className="text-sm uppercase tracking-[0.3em] text-secondary font-semibold">Reasons to trust Bharat Mock</p>
                    <h2 className="font-display text-3xl font-bold text-foreground">Why take Bharat Mock Test Series?</h2>
                    <p className="text-muted-foreground max-w-3xl mx-auto">
                      Whether you attempt a live mock or a rapid-fire quiz, the Bharat Mock ecosystem goes beyond scores. Each pillar below mirrors what you might have seen on the Mock Test Series page, now embedded here so Live Tests aspirants can act on the same advantages without jumping across tabs.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                      <div className="absolute top-6 right-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="absolute -top-2 -right-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-lg">
                            NEW
                          </span>
                        </div>
                      </div>
                      <div className="mt-20 space-y-3">
                        <h3 className="font-display text-xl font-bold">Latest Exam Patterns</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          Live mocks and quizzes replicate the freshest shifts in exam blueprints so that the difficulty you face on test day feels familiar.
                        </p>
                      </div>
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                      <div className="absolute top-6 right-6">
                        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </div>
                      </div>
                      <div className="mt-20 space-y-3">
                        <h3 className="font-display text-xl font-bold">Save Tests & Questions</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          Bookmark clutch attempts, tricky questions, or entire live fixtures to retake them when revision week arrives.
                        </p>
                      </div>
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    <div className="group relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                      <div className="absolute top-6 right-6">
                        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="mt-20 space-y-3">
                        <h3 className="font-display text-xl font-bold">In-depth Performance Analysis</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          Access strength vs. weakness reports, percentile charts, and topper comparisons immediately after every live window.
                        </p>
                      </div>
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                </section>

                <TestimonialsSection
                  className="mt-16"
                  description="Real feedback from toppers and serious contenders—curated from app reviews and our student community—to remind you that live fixtures here translate into real selection stories."
                />

                <section className="mt-16 bg-card border border-border rounded-3xl p-8 space-y-6">
                  <header className="space-y-2">
                    <p className="text-sm uppercase tracking-[0.3em] text-primary font-semibold">Long-form playbook</p>
                    <h2 className="font-display text-3xl font-bold">Why the Live Tests calendar is your competitive advantage</h2>
                    <p className="text-base" style={{ color: '#1a1a1a' }}>
                      Settle in for a detailed narrative that connects the UI you are scrolling through with the discipline, analytics, and accountability needed to ace nationwide exams.
                    </p>
                  </header>
                  <div className="space-y-4 leading-relaxed text-base md:text-lg" style={{ color: '#1a1a1a' }}>
                    <p>
                      Bharat Mock live fixtures are built to replicate the electric tension of center-based exams while still giving you the convenience of attempting from wherever you are. Every timer tick, leaderboard update, and proctored checkpoint is meticulously choreographed so that your muscle memory for actual exam day is forged weeks in advance. Instead of passively reading notes, you are inserted into a vibrant arena where lakhs of aspirants jostle for the same selection and every mark reclaimed from negative marking counts toward a life-changing cutoff. The Live Tests page acts as a central pit lane where you configure your car, refuel, and preview the circuit before another blistering lap of competition.
                    </p>
                    <p>
                      To make those preparations tangible, each live test listing includes micro-details such as sectional timing, average accuracy benchmarks from the last cohort, and suggested buffer slots for revision. When you scroll through the Live Tests page after dinner or between coaching lectures, you are effectively building a personalized tournament bracket. Maybe you begin with a 30 minute reasoning duel on Tuesday, stack a bilingual GS sprint on Thursday, and close the week with a mega mock on Sunday morning. The platform stores these commitments so that reminder notifications and calendar nudges keep you honest even when fatigue tempts you to skip a session. Discipline, once scheduled, becomes simpler to execute.
                    </p>
                    <p>
                      Live quizzes deserve special mention because they weaponize the power of short, intense bursts of cognition. Ten to fifteen carefully balanced questions delivered in a ten minute window create the same adrenaline spike as the rapid-fire sections of SSC, banking, and state PSC prelims. On the quizzes tab you can filter by category, difficulty, or language preference and immediately see how many aspirants are queued for the next slot. The streak tracker sitting beside each card is more than a vanity metric; it is a behavioral nudge reminding you that consistency beats sporadic genius. Miss one day and the streak resets, but keep the chain alive for a month and your subconscious begins expecting victory.
                    </p>
                    <p>
                      Behind the interface sits an orchestration engine that quietly reconciles thousands of constraints pulled from the backend schedule service. When the admin team marks a new exam as live, the cache invalidates, the status propagates to the tabs, and your feed refreshes without needing a hard reload. If you belong to multiple categories—say BPSC and CTET—the recommendation logic alternates fixtures so you never go two weeks without facing pedagogy or reasoning. This dynamic feed is the opposite of a static PDF calendar; it reacts to your filters, search phrases, and completion history, serving up opportunities that match both your ambition and available bandwidth.
                    </p>
                    <p>
                      Preparation is not a solitary pursuit, and the long-form narrative attached to this page serves as a mentor whispering strategies in your ear. Imagine scanning the hero banner and noticing a note about limited seats—that is a cue to assemble your study circle, pick roles, and run a pre-test huddle. One friend might own vocabulary recaps, another could audit the formula sheet, while you simulate the online interface for the group. The moment the live window opens, you are not just answering questions; you are representing a team that will dissect the analytics afterward, celebrate percentile jumps, and draft counterplans for any topics that exposed gaps.
                    </p>
                    <p>
                      Speaking of analytics, Bharat Mock's post-test breakdowns dive deeper than generic scorecards. Once you finish a live mock or quiz, the dashboard overlays your timeline with the national average, highlights segments where hesitation taxes were paid, and points to remedial video lessons curated by faculty. Over time, these insights become a narrative arc: perhaps your accuracy in data interpretation rose from 52% to 71% after three weekend sprints, or your Hindi comprehension climbed once you toggled the bilingual view. The Live Tests page is essentially chapter zero of that arc, reminding you what the next experiment is and why the metrics will matter when the SSC, UPSC, or state board finally presses the bell.
                    </p>
                    <p>
                      Mental resilience is forged not in comfort but in controlled adversity. That is why many fixtures carry tags like High Pressure Window or Adaptive Difficulty. They intentionally stack above-average difficulty questions or shrink buffer times, forcing you to practice composure. When you enter such sessions straight from the Live Tests listing, you are consenting to a laboratory of stress, and that is a good thing. Your heart rate stabilizes faster with each exposure, your breathing returns to rhythm, and you learn to detach from a bad question within seconds instead of spiraling. The paragraph you are reading is a gentle reminder that mindset is as trainable as mathematics.
                    </p>
                    <p>
                      Another dimension worth appreciating is the orchestration between hero search, filters, and notifications. You can search for CHSL mega slot, narrow results to upcoming, and lock the filters so both desktop and mobile interfaces mirror each other. Once that configuration is saved, the backend understands your intent and surfaces similar fixtures near the top of the feed. Pair that with Google Calendar exports or ICS downloads and you suddenly possess a cross-device command center. A quick glance at your phone while commuting lets you know whether tonight's quiz is still scheduled, whether the attempt window shifted, and when to switch from passive note review to active recall drills.
                    </p>
                    <p>
                      The Live Tests ecosystem also integrates with teaching resources scattered across the platform. Each card can link to strategy articles, FAQ snippets, or even masterclass replays so that last-minute doubt clearing sits a single click away. Suppose you are anxious about the new descriptive writing segment; the Live Tests page may recommend a warm-up practice set published under the Teaching tab, ensuring you never face an unfamiliar question format cold. By centralizing knowledge and action, Bharat Mock shortens the lag between thinking you should revise a topic and testing yourself under live conditions right away.
                    </p>
                    <p>
                      In the end, this entire thousand-plus-word section exists to nudge you from passive intent to decisive action. Bookmark the page, build a ritual around reviewing the schedule every Sunday night, and treat each entry as a contract with your future self. Whether you are chasing AIR-1 or simply fighting to clear a stubborn cutoff, the Live Tests page is the arena where habits crystallize, weaknesses surface, and progress becomes visible. Step into the next slot with courage, respect the timer, and remember that every live attempt is simultaneously a rehearsal and a revelation. The nation's toughest exams await; let the Bharat Mock calendar be the drumbeat that keeps you marching.
                    </p>
                  </div>
                </section>

                <section className="mt-16">
                  <div>
                    <div className="text-center space-y-3 mb-8">
                      <p className="text-sm uppercase tracking-[0.35em] text-primary font-semibold">Answers on demand</p>
                      <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Live Tests FAQ</h2>
                      <p className="text-muted-foreground max-w-2xl mx-auto">
                        Everything you need to know about schedules, analytics, and access—compiled from the questions aspirants ask our support mentors most often.
                      </p>
                    </div>

                    {/* FAQ Tabs */}
                    <div className="flex gap-2 mb-8 border-b border-border">
                      {(['All', 'Payments'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => { setExpandedFaq(null); setActiveFaqTab(tab); }}
                          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${activeFaqTab === tab
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          {tab === 'All' ? 'All FAQ' : 'Payment FAQ'}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4">
                      {(activeFaqTab === 'All' ? faqItems : paymentFaqItems).map((item, index) => (
                        <div key={item.q} className="bg-card border border-border rounded-xl overflow-hidden">
                          <button
                            onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                          >
                            <h3 className="font-medium text-foreground text-base">
                              {index + 1}. {item.q}
                            </h3>
                            {expandedFaq === index ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                          </button>
                          {expandedFaq === index && (
                            <div className="px-6 py-4 bg-muted/30 border-t border-border">
                              <p className="text-sm text-slate-700 leading-relaxed">{item.a}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

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
