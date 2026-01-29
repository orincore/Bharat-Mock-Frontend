"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Clock,
  Flame,
  ArrowRight,
  Trophy,
  Filter,
  Search,
  Tag,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { examService } from '@/lib/api/examService';
import { taxonomyService } from '@/lib/api/taxonomyService';
import { Exam } from '@/types';
import { ExamCard, getCountdownLabel } from '@/components/exam/ExamCard';

const STATUS_TABS: { label: string; value: 'upcoming' | 'ongoing' | 'completed'; helper: string }[] = [
  { label: 'Upcoming Tests', value: 'upcoming', helper: 'Reserve a slot before it fills up' },
  { label: 'Live Now', value: 'ongoing', helper: 'Jump into the live window right away' },
  { label: 'Recently Completed', value: 'completed', helper: 'Analyze previous live tests' }
];

const QUICK_METRICS = [
  { label: 'Live Test Formats', value: '45+', icon: BookOpen },
  { label: 'Average Participants', value: '12k+', icon: Trophy },
  { label: 'Weekend Fixtures', value: '18', icon: CalendarDays }
];

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
  const params = new URLSearchParams({
    text: exam.title,
    dates: `${start}/${end}`,
    details: exam.description || 'Mock test scheduled via Bharat Mock',
    location: 'Bharat Mock portal'
  });
  return `${base}&${params.toString()}`;
};

export default function LiveTestsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'upcoming' | 'ongoing' | 'completed'>('upcoming');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [heroSearch, setHeroSearch] = useState('');
  const [activeCalendarExam, setActiveCalendarExam] = useState<Exam | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoryData = await taxonomyService.getCategories();
        const names = categoryData.map((cat) => cat.name).filter(Boolean) as string[];
        setCategories(names);
      } catch (catError) {
        console.error('Failed to load categories', catError);
      }
    };
    loadCategories();
  }, []);

  const fetchScheduledExams = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await examService.getExams({
        status: selectedStatus,
        category: selectedCategory,
        search
      });
      const scheduledOnly = response.data.filter((exam) => !exam.allow_anytime && exam.status !== 'anytime');
      setExams(scheduledOnly);
    } catch (err: any) {
      setError(err.message || 'Failed to load live tests');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, search, selectedStatus]);

  useEffect(() => {
    fetchScheduledExams();
  }, [fetchScheduledExams]);

  const featuredExam = exams[0];
  const scheduleList = useMemo(() => {
    return exams
      .slice(1)
      .sort((a, b) => getScheduleTimestamp(a.start_date) - getScheduleTimestamp(b.start_date));
  }, [exams]);

  const nextUpcomingExam = useMemo(() => {
    return exams
      .filter((exam) => exam.status === 'upcoming' && !!exam.start_date)
      .sort((a, b) => getScheduleTimestamp(a.start_date) - getScheduleTimestamp(b.start_date))[0];
  }, [exams]);

  const filteredForTimeline = scheduleList.slice(0, 6);
  const featuredCalendarWindow = useMemo(() => buildCalendarWindow(featuredExam), [featuredExam]);
  const featuredGoogleUrl = useMemo(() => (featuredExam ? getGoogleCalendarUrl(featuredExam) : ''), [featuredExam]);

  const handleAddToCalendar = useCallback((exam: Exam) => {
    const window = buildCalendarWindow(exam);
    if (!window) {
      alert('Schedule window not available yet.');
      return;
    }

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
      `DESCRIPTION:${escapeICSValue(exam.description || 'Scheduled via Bharat Mock')}`,
      'LOCATION:Online',
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
      <section className="gradient-hero py-16">
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-20 2xl:px-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="uppercase text-sm tracking-[0.4em] text-background/70 mb-3">Weekly Live Fixtures</p>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-background mb-4">
                Join the <span className="text-secondary">scheduled</span> live tests curated by Bharat Mock
              </h1>
              <p className="text-lg text-background/80 mb-6">
                Reserve your slot, compete with thousands of aspirants in real time, and receive instant analytics after every live test.
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                {QUICK_METRICS.map((metric) => (
                  <div key={metric.label} className="bg-background/15 backdrop-blur border border-background/20 rounded-2xl px-5 py-4 flex items-center gap-3">
                    <metric.icon className="h-6 w-6 text-secondary" />
                    <div>
                      <p className="text-xl font-bold text-background">{metric.value}</p>
                      <p className="text-sm text-background/80">{metric.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleHeroSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                  <Input
                    type="text"
                    placeholder="Search live tests, e.g., SSC CHSL"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>
                <Button type="submit" size="lg">
                  Explore Schedule
                </Button>
              </form>
            </div>

            <div>
              <div className="bg-background rounded-3xl p-6 shadow-2xl border border-border/40">
                <p className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
                  <Flame className="h-4 w-4" /> Trending Live Windows
                </p>
                <div className="space-y-4">
                  {STATUS_TABS.map((tab) => (
                    <div key={tab.value} className={`p-4 rounded-2xl border ${selectedStatus === tab.value ? 'border-secondary bg-secondary/10' : 'border-border'}`}>
                      <p className="text-sm text-muted-foreground mb-1">{tab.helper}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-display text-lg text-foreground">{tab.label}</span>
                        <Button
                          variant={selectedStatus === tab.value ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedStatus(tab.value)}
                        >
                          {selectedStatus === tab.value ? 'Selected' : 'View'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 bg-secondary text-secondary-foreground rounded-2xl p-4 shadow-lg">
                <p className="text-sm uppercase tracking-wide">Next mega slot</p>
                {nextUpcomingExam ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">
                      {getScheduleMeta(nextUpcomingExam.start_date).full}
                    </p>
                    <p className="text-sm font-semibold line-clamp-1">{nextUpcomingExam.title}</p>
                    <p className="text-xs text-secondary-foreground/80 flex items-center gap-2">
                      Limited seats • Starts in {getCountdownLabel(nextUpcomingExam.start_date)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold">Schedule TBA</p>
                    <p className="text-xs text-secondary-foreground/80">Stay tuned for the next live slot</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-12 space-y-12">
        {/* Filters */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-primary font-semibold mb-1 flex items-center gap-2">
                <Filter className="h-4 w-4" /> Schedule Filters
              </p>
              <h2 className="font-display text-3xl font-bold text-foreground">Curate your live test calendar</h2>
            </div>
            <div className="flex gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 rounded-lg border border-border bg-background text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <Button variant="ghost" onClick={() => setSelectedCategory('')} disabled={!selectedCategory}>
                Reset
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSelectedStatus(tab.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedStatus === tab.value
                    ? 'bg-secondary text-secondary-foreground shadow'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

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
        ) : exams.length === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-12 text-center">
            <CalendarDays className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h3 className="font-display text-2xl font-bold mb-2">No live tests found for this filter</h3>
            <p className="text-muted-foreground mb-6">Try switching the category or status to discover more scheduled windows.</p>
            <Button onClick={() => setSelectedStatus('upcoming')}>Back to Upcoming</Button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Featured */}
            {featuredExam && (
              <div className="grid gap-6 lg:grid-cols-5">
                <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-sm">
                  <p className="text-sm uppercase tracking-wide text-primary font-semibold mb-2">Featured Slot</p>
                  <h3 className="font-display text-3xl font-bold text-foreground mb-3">{featuredExam.title}</h3>
                  <p className="text-muted-foreground mb-4 line-clamp-3">{featuredExam.description}</p>
                  {(() => {
                    const meta = getScheduleMeta(featuredExam.start_date);
                    const countdown = featuredExam.status === 'upcoming' ? getCountdownLabel(featuredExam.start_date) : null;
                    return (
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-secondary" /> {meta.full}</div>
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-secondary" /> Duration: {featuredExam.duration ?? '--'} mins</div>
                        <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-secondary" /> {featuredExam.category}</div>
                        {countdown && (
                          <div className="flex items-center gap-2 text-secondary font-semibold text-xs">
                            <Clock className="h-3.5 w-3.5" /> Starts in {countdown}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="mt-6 flex gap-3">
                    <Link href={`/exams/${featuredExam.slug}`}>
                      <Button>
                        View Details <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => handleAddToCalendar(featuredExam)}
                      disabled={!featuredCalendarWindow}
                    >
                      Add to Calendar
                    </Button>
                  </div>
                  {featuredCalendarWindow && featuredGoogleUrl && (
                    <Button
                      variant="ghost"
                      asChild
                      className="mt-3 text-primary"
                    >
                      <a href={featuredGoogleUrl} target="_blank" rel="noreferrer">
                        Sync via Google Calendar
                      </a>
                    </Button>
                  )}
                </div>
                <div className="lg:col-span-3 bg-card border border-border rounded-3xl p-6">
                  <p className="text-sm font-semibold text-muted-foreground mb-4">Timeline</p>
                  <div className="space-y-6">
                    {filteredForTimeline.map((exam) => {
                      const meta = getScheduleMeta(exam.start_date);
                      const countdown = exam.status === 'upcoming' ? getCountdownLabel(exam.start_date) : null;
                      return (
                        <div key={exam.id} className="flex gap-4 items-start">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-primary">{meta.date}</p>
                            <p className="text-xs text-muted-foreground">{meta.time}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                          <div className="flex-1 border border-border rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-foreground">{exam.title}</h4>
                              <Button asChild variant="ghost" size="sm" className="text-primary">
                                <Link href={`/exams/${exam.slug}`}>Register</Link>
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{exam.description}</p>
                            {countdown && (
                              <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-secondary">
                                <Clock className="h-3 w-3" /> Starts in {countdown}
                              </div>
                            )}
                            <div className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-4">
                              <span>Category: {exam.category}</span>
                              <span>Tier: {exam.difficulty || 'General'}</span>
                              <span>Marks: {exam.total_marks ?? exam.totalMarks ?? '—'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-2xl font-bold">All scheduled live tests</h3>
                <Link href="/exams">
                  <Button variant="outline">
                    Browse Anytime Exams
                  </Button>
                </Link>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {exams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
