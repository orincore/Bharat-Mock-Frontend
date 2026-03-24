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
      <section className="gradient-hero py-10 text-white">
        <div className="container-main space-y-8">
          <Breadcrumbs
            items={[HomeBreadcrumb(), { label: 'Current Affairs' }]}
            variant="dark"
            className="text-white/80"
          />
          <div className="grid gap-8 lg:grid-cols-[3fr_2fr] items-center">
            <div className="space-y-6">
              {settings.heroBadge && (
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1 rounded-full text-xs font-semibold tracking-[0.3em] uppercase">
                  <Sparkles className="w-4 h-4" />
                  {settings.heroBadge}
                </div>
              )}
              <div className="space-y-4">
                <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
                  {settings.heroTitle || 'Current Affairs Videos, Notes & Quizzes'}
                </h1>
                {settings.heroSubtitle && <p className="text-lg text-white/80">{settings.heroSubtitle}</p>}
                {settings.heroDescription && <p className="text-base text-white/70">{settings.heroDescription}</p>}
              </div>
              <div className="flex flex-wrap gap-3" />
              <div className="grid sm:grid-cols-3 gap-4 pt-4">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur">
                    <stat.icon className="w-5 h-5 text-white mb-3" />
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="text-sm text-white/80">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-3xl p-6 space-y-6">
              <p className="text-sm uppercase tracking-[0.3em] text-white/80">Filter capsules</p>
              <div className="flex flex-wrap gap-3">
                {dynamicFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setActiveFilter(filter.value)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                      activeFilter === filter.value ? 'bg-white text-primary' : 'bg-white/10 text-white/80'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="space-y-3 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Curated by Bharat Mock editorial desk
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Updated every morning before 7am IST
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-main py-12 space-y-16">
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
                    <img src={note.featuredImageUrl} alt={note.title} className="h-44 w-full object-cover" />
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
                <article key={video.id} className="rounded-3xl border border-border bg-card overflow-hidden flex flex-col">
                  <div className="relative">
                    {video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={video.thumbnailUrl} alt={video.title} className="h-48 w-full object-cover" />
                    ) : (
                      <div className="h-48 w-full bg-muted flex items-center justify-center text-muted-foreground">Thumbnail pending</div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <div className="p-5 space-y-3 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Video className="w-4 h-4" />
                      {video.tag || 'Daily' }
                    </div>
                    <h3 className="font-semibold text-lg line-clamp-2">{video.title}</h3>
                    {video.description && <p className="text-sm text-muted-foreground line-clamp-3">{video.description}</p>}
                    <div className="text-xs text-muted-foreground">{video.durationSeconds ? `${Math.round(video.durationSeconds / 60)} min` : 'Short capsule'}</div>
                  </div>
                  <div className="p-5 pt-0">
                    <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full gap-2">
                        Watch
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-3xl p-8 space-y-6">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-primary font-semibold">Why this matters</p>
            <h2 className="font-display text-3xl font-bold">A single destination for Daily GK</h2>
          </header>
          <div className="grid gap-6 md:grid-cols-2">
            <article className="space-y-3">
              <h3 className="text-xl font-semibold">Stay consistent with playlists + notes + quizzes</h3>
              <p className="text-muted-foreground leading-relaxed">
                Reading punchlines without validation is risky. Bharat Mock combines three mediums so that you read (notes), watch (videos), and attempt (quizzes) on the same topic within minutes. Every block is tagged by day/week so you can jump straight to the recency window demanded by SSC, Banking, UPSC, and State PSC papers.
              </p>
            </article>
            <article className="space-y-3">
              <h3 className="text-xl font-semibold">Powered by the same editorial desk as our mock tests</h3>
              <p className="text-muted-foreground leading-relaxed">
                The content team that reverse-engineers exam patterns also curates these current affairs capsules. Expect budget highlights, PIB releases, government schemes, defence exercises, appointments, awards, summits, and science & tech in crisp bullet notes—each tied back to quizzes and analytics. Nothing feels random; everything points to probable exam questions.
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
