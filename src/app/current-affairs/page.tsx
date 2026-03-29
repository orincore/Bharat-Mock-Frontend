"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Play, Sparkles, BookOpen, CalendarDays, ArrowRight, Video, Layers, ShieldCheck, Loader2 } from 'lucide-react';
import { currentAffairsService, CurrentAffairsPayload, CurrentAffairsQuizLink, CurrentAffairsVideo, CurrentAffairsNoteSummary } from '@/lib/api/currentAffairsService';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ExamCard } from '@/components/exam/ExamCard';
import { Exam } from '@/types';
import { PageSeoSections } from '@/components/sections/PageSeoSections';

const DEFAULT_FILTERS = [
  { label: 'All Capsules', value: 'all' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' }
];

const getTagValue = (value?: string | null) => (value || '').toLowerCase() || 'uncategorized';

export default function CurrentAffairsPage() {
  const [data, setData] = useState<CurrentAffairsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const payload = await currentAffairsService.getPageData();
        setData(payload);
      } catch (err: any) {
        console.error('Failed to load current affairs data', err);
        setError(err.message || 'Failed to load current affairs data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const dynamicFilters = useMemo(() => {
    if (!data) return DEFAULT_FILTERS;
    const quizTags = data.quizzes.map((quiz) => getTagValue(quiz.tag));
    const videoTags = data.videos.map((video) => getTagValue(video.tag));
    const uniqueTags = Array.from(new Set([...quizTags, ...videoTags].filter(Boolean))).filter((tag) => !['', 'uncategorized'].includes(tag));

    const extraFilters = uniqueTags
      .filter((tag) => !DEFAULT_FILTERS.some((preset) => preset.value === tag))
      .map((tag) => ({ label: tag.replace(/\b\w/g, (char) => char.toUpperCase()), value: tag }));

    return [...DEFAULT_FILTERS, ...extraFilters];
  }, [data]);

  const filteredQuizzes = useMemo<CurrentAffairsQuizLink[]>(() => {
    if (!data) return [];
    if (activeFilter === 'all') return data.quizzes;
    return data.quizzes.filter((quiz) => getTagValue(quiz.tag) === activeFilter);
  }, [data, activeFilter]);

  const filteredVideos = useMemo<CurrentAffairsVideo[]>(() => {
    if (!data) return [];
    if (activeFilter === 'all') return data.videos;
    return data.videos.filter((video) => getTagValue(video.tag) === activeFilter);
  }, [data, activeFilter]);

  const featuredNotes = useMemo<CurrentAffairsNoteSummary[]>(() => {
    if (!data) return [];
    return data.notes.slice(0, 6);
  }, [data]);

  const quickStats = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: 'Quizzes live',
        value: data.quizzes.length,
        icon: Layers
      },
      {
        label: 'Video explainers',
        value: data.videos.length,
        icon: Video
      },
      {
        label: 'Notes updated weekly',
        value: data.notes.length,
        icon: BookOpen
      }
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry loading</Button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { settings } = data;

  return (
    <div className="bg-muted/20">
      <section className="relative gradient-hero py-10 text-white">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />
        <div className="container-main">
          <Breadcrumbs
            items={[HomeBreadcrumb(), { label: 'Current Affairs' }]}
            variant="dark"
            className="mb-6"
          />
          <div className="max-w-3xl space-y-4">
            {settings.heroBadge && (
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1 rounded-full text-xs font-semibold tracking-[0.3em] uppercase">
                <Sparkles className="w-4 h-4" />
                {settings.heroBadge}
              </div>
            )}
            <p className="uppercase text-sm tracking-[0.4em] text-white/70">Daily GK Capsules</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
              {settings.heroTitle || 'Current Affairs Videos, Notes & Quizzes'}
            </h1>
            {settings.heroSubtitle && <p className="text-lg text-white/80">{settings.heroSubtitle}</p>}
          </div>
        </div>
      </section>

      <div className="container-main py-12">
        {/* Mobile filter bar */}
        <div className="lg:hidden flex flex-wrap gap-2 mb-8">
          {dynamicFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition border ${
                activeFilter === filter.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-16">
        <section className="space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-primary font-semibold">Quizzes</p>
              <h2 className="font-display text-3xl font-bold">Current Affairs Quick Challenges</h2>
              <p className="text-muted-foreground">Attach the capsule to your practice session. Each quiz is linked with live leaderboard and analytics.</p>
            </div>
            <Link href="/live-tests">
              <Button variant="outline" className="gap-2">
                View all live tests
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </header>

          {filteredQuizzes.length === 0 ? (
            <div className="p-8 rounded-3xl border border-border text-center text-muted-foreground">
              No quizzes found for this filter.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredQuizzes.map((quiz) => {
                if (!quiz.exam) return null;
                const exam = quiz.exam as Exam;
                return (
                  <ExamCard key={quiz.id} exam={exam} size="default" hideCategory />
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-primary font-semibold">Notes</p>
              <h2 className="font-display text-3xl font-bold">Editor curated notes</h2>
              <p className="text-muted-foreground">These are powered by the blogs block editor. Mark any article as a current affairs note to publish it here.</p>
            </div>
            <Link href="/current-affairs#notes">
              <Button variant="ghost" className="gap-2">
                See all notes
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </header>
          {featuredNotes.length === 0 ? (
            <div className="p-8 rounded-3xl border border-border text-center text-muted-foreground">No notes published yet.</div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featuredNotes.map((note) => (
                <Link key={note.id} href={`/current-affairs/${note.slug}`} className="group rounded-3xl border border-border bg-card flex flex-col overflow-hidden">
                  {note.featuredImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={note.featuredImageUrl} alt={note.title} className="w-full object-contain max-h-52 bg-black" />
                  ) : (
                    <div className="h-44 w-full bg-muted flex items-center justify-center text-muted-foreground text-sm">Illustration pending</div>
                  )}
                  <div className="p-5 space-y-3 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BookOpen className="w-4 h-4" />
                      {note.tag || 'General Awareness'}
                    </div>
                    <h3 className="font-semibold text-lg group-hover:text-primary line-clamp-2">{note.title}</h3>
                    {note.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{note.excerpt}</p>}
                    <p className="text-xs text-muted-foreground">Updated {note.publishedAt ? new Date(note.publishedAt).toLocaleDateString() : 'recently'}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-primary font-semibold">Videos</p>
              <h2 className="font-display text-3xl font-bold">Explainer videos</h2>
              <p className="text-muted-foreground">Short capsules to revise budget pointers, government schemes, appointments, and science & tech.</p>
            </div>
          </header>
          {filteredVideos.length === 0 ? (
            <div className="p-8 rounded-3xl border border-border text-center text-muted-foreground">No videos for this filter yet.</div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-3 md:grid-cols-2">
              {filteredVideos.map((video) => (
                <a
                  key={video.id}
                  href={video.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-3xl border border-border bg-card overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
                >
                  <div className="relative bg-black">
                    {video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full object-contain max-h-56"
                      />
                    ) : (
                      <div className="h-48 w-full bg-muted flex items-center justify-center text-muted-foreground">Thumbnail pending</div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                      <div className="w-14 h-14 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transition-colors">
                        <Play className="w-6 h-6 text-gray-900 ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-5 space-y-2 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Video className="w-4 h-4" />
                      {video.tag || 'Daily'}
                    </div>
                    <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">{video.title}</h3>
                    {video.description && <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>}
                    <p className="text-xs text-muted-foreground">{video.durationSeconds ? `${Math.round(video.durationSeconds / 60)} min` : 'Short capsule'}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

          </div>

          {/* Sticky sidebar - desktop only */}
          <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
              {/* Stats */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">Content at a glance</p>
                {quickStats.map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <stat.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold leading-none">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filter capsules */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">Filter capsules</p>
                <div className="flex flex-wrap gap-2">
                  {dynamicFilters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setActiveFilter(filter.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                        activeFilter === filter.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:border-primary hover:text-primary'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editorial info */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Curated by Bharat Mock editorial desk</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <CalendarDays className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Updated every morning before 7am IST</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <div className="container-main">
        <section className="bg-card border border-border rounded-3xl p-8 space-y-6 mt-10">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-primary font-semibold">Long-form playbook</p>
            <h2 className="font-display text-3xl font-bold">Why Daily Current Affairs is your competitive edge in every govt exam</h2>
            <p className="text-base" style={{ color: '#1a1a1a' }}>
              A deep dive into how staying updated with current events transforms your preparation strategy and directly impacts your score in SSC, Banking, UPSC, Railways, and State PSC exams.
            </p>
          </header>
          <div className="space-y-4 leading-relaxed text-base md:text-lg" style={{ color: '#1a1a1a' }}>
            <p>Every competitive exam in India reserves a significant portion of its question paper for General Awareness and Current Affairs. Whether it is the SSC CGL Tier-I, IBPS PO Prelims, UPSC Prelims, or any State PSC, the GK section is often the differentiator between candidates who clear the cutoff and those who fall just short. Bharat Mock's Current Affairs page is engineered to close that gap by delivering daily, weekly, and monthly capsules that are directly mapped to the question patterns observed in recent exam cycles.</p>
            <p>The architecture of this page mirrors the way toppers actually consume current affairs. They do not read everything—they read strategically. The category filters on this page let you zero in on National, International, Economy, Science & Technology, Sports, Environment, and Defence topics in seconds.</p>
            <p>Consistency is the single most underrated factor in current affairs preparation. A candidate who reads 15 minutes of current affairs every day for six months will outperform someone who crammed three months of news in the final week before the exam.</p>
            <p>The integration between current affairs content and mock tests on this platform is a force multiplier. When you read about a new government scheme in the morning capsule and then encounter a question about it in an afternoon mock test, the neural pathway for that fact becomes significantly stronger.</p>
            <p>Language accessibility is another dimension that sets this platform apart. A large percentage of government exam aspirants are more comfortable in Hindi than in English, and the bilingual support on this page ensures that the language barrier never becomes a preparation barrier.</p>
            <p>Beyond individual articles, the monthly compilations serve as revision anchors. In the final weeks before an exam, when time is scarce and anxiety is high, a well-structured monthly PDF or on-screen digest lets you review three hundred events in under two hours.</p>
            <p>The quiz component embedded within this section is perhaps the most powerful tool for converting passive reading into active recall. After consuming a week's worth of current affairs, attempting a 20-question quiz on those exact topics reveals your retention gaps with surgical precision.</p>
            <p>Ultimately, the Current Affairs page is not just a content repository—it is a preparation ecosystem. It connects the news you read today with the mock tests you attempt this week, the revision you do next month, and the confidence you carry into the exam hall.</p>
          </div>
        </section>
      </div>
      <div className="container-main">
        <PageSeoSections
          whyTitle="Why use Bharat Mock for Current Affairs?"
          whySubtitle="Daily capsules, bilingual support, and quiz-based recall—Bharat Mock's current affairs ecosystem is built to convert news into exam marks."
          faqTitle="Current Affairs FAQ"
          faqSubtitle="Everything you need to know about our daily GK updates, quiz integration, and how to stay consistent with your preparation."
          testimonialsDescription="Real feedback from aspirants who made current affairs a daily habit with Bharat Mock and saw it reflect in their scores."
        />
      </div>
    </div>
  );
}
