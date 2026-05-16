"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Play, Sparkles, BookOpen, CalendarDays, ArrowRight, Video, Layers, ShieldCheck, Loader2 } from 'lucide-react';
import { currentAffairsService, CurrentAffairsPayload, CurrentAffairsQuizLink, CurrentAffairsVideo, CurrentAffairsNoteSummary } from '@/lib/api/currentAffairsService';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { PageSeoSections } from '@/components/sections/PageSeoSections';
import { ExamCard } from '@/components/exam/ExamCard';
import { Exam } from '@/types';

const DEFAULT_FILTERS = [
  { label: 'All Capsules', value: 'all' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' }
];

const getTagValue = (value?: string | null) => (value || '').toLowerCase() || 'uncategorized';

export default function CurrentAffairsClient({ initialData }: { initialData?: CurrentAffairsPayload | null }) {
  const [data, setData] = useState<CurrentAffairsPayload | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (initialData) return;
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
  }, [initialData]);

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
      { label: 'Quizzes live', value: data.quizzes.length, icon: Layers },
      { label: 'Video explainers', value: data.videos.length, icon: Video },
      { label: 'Notes updated weekly', value: data.notes.length, icon: BookOpen }
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

  if (!data) return null;

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
              {settings.heroTitle || 'Stay Updated with Daily Current Affairs'}
            </h1>
            <p className="text-lg text-white/80">
              {settings.heroDescription || 'Get daily current affairs updates to boost knowledge and better exam preparation'}
            </p>
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
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition border ${activeFilter === filter.value
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
                  <h2 className="font-display text-3xl font-bold">Daily Current Affairs</h2>
                  <p className="text-muted-foreground">Stay informed with important daily news and key current affairs topics</p>
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
                    return <ExamCard key={quiz.id} exam={exam} size="default" hideCategory />;
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
                          <img src={video.thumbnailUrl} alt={video.title} className="w-full object-contain max-h-56" />
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

          {/* Sticky sidebar — desktop only */}
          <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
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

              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">Filter capsules</p>
                <div className="flex flex-wrap gap-2">
                  {dynamicFilters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setActiveFilter(filter.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${activeFilter === filter.value
                        ? 'bg-primary text-white border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary hover:text-primary'
                        }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

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
        <PageSeoSections
          whyTitle="Why BharatMock is Best for Current Affairs"
          whySubtitle="Daily capsules, bilingual support, and quiz-based recall—Bharat Mock's current affairs ecosystem is built to convert news into exam marks."
          whyContent={
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 sm:p-8 border border-blue-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 lg:gap-6">
                  <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Smart Exam Filters</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Easily switch between exam categories to focus only on the most relevant and important current affairs topics.</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 sm:p-8 border border-purple-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 lg:gap-6">
                  <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Daily Current Affairs</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Read important daily current affairs in a clear format to stay informed and improve your overall preparation.</p>
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
                    <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Monthly Current Affairs PDF</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Access all important monthly current affairs in one place for quick revision and better long-term retention.</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>
          }
          faqTitle="FAQ's"
          faqSubtitle="Find answers to common questions about current affairs preparation and daily learning."
          faqItems={[
            { q: 'What is the best way to read daily current affairs for competitive exams?', a: 'The best approach is a focused daily routine instead of reading everything. Spend 15-20 minutes on today\'s current affairs with important topics. Then take a quiz to test what you remember. Consistency beats last-minute revision.' },
            { q: 'How many months of current affairs are important for exams?', a: 'Most competitive exams focus on the last six months of current affairs in India, making it the most important preparation window.' },
            { q: 'Is there a current affairs quiz available for today?', a: 'Yes, a daily quiz is available based on the latest updates. It will allow you to assess your knowledge and prepare you for the exam.' },
            { q: 'How many hours should I spend on current affairs daily?', a: 'You do not need long hours. About 15-20 minutes a day is sufficient if you have a focused mindset and stick with it.' },
            { q: 'How do I remember current affairs for a long time?', a: 'The best way is to read regularly and revise through quizzes or weekly PDFs. This helps improve long-term retention.' },
            { q: 'Is reading current affairs enough, or should I practice questions?', a: 'Reading alone is not enough. Practising questions helps improve recall, speed, and accuracy in exams.' },
            { q: 'What topics are covered in current affairs?', a: 'It covers national and international news, economy, science, sports, government schemes and other major events.' },
            { q: 'How is a current affairs mock test different from a quiz?', a: 'A quiz is a short test, meant for daily practice, while a mock test is a full-length test, meant for exam-like settings.' },
            { q: 'Can I download current affairs PDFs for revision?', a: 'Yes, there are weekly and monthly PDFs. These help with quick and organised revision.' },
            { q: 'What is the difference between the latest and the last six months of current affairs?', a: 'Latest current affairs cover daily updates, while the last six months provide a complete revision set, important for exams.' }
          ]}
          testimonialsDescription="Real feedback from aspirants who made current affairs a daily habit with Bharat Mock and saw it reflect in their scores."
          seoContent={
            <section className="bg-card border border-border rounded-3xl p-8 space-y-6">
              <header className="space-y-2">
                <h2 className="font-display text-3xl font-bold">How daily current affairs improve your exam performance?</h2>
              </header>
              <div className="space-y-4 leading-relaxed text-base md:text-lg" style={{ color: '#1a1a1a' }}>
                <p>Daily current affairs have a direct impact on your score in SSC, Banking, Railway, UPSC, and State PSC exams. The GK and General Awareness section alone can make or break your cutoff. Candidates who read current affairs regularly on a daily basis score much higher than those who do last-minute preparation.</p>
              </div>
              <header className="space-y-2 mt-8">
                <h2 className="font-display text-3xl font-bold">What Makes Current Affairs So Important?</h2>
              </header>
              <div className="space-y-4 leading-relaxed text-base md:text-lg" style={{ color: '#1a1a1a' }}>
                <p>In most government exams in India, general awareness carries 20 to 40 marks. The GK section is the edge for serious aspirants, whether it is SSC CGL Tier-1 or IBPS PO Prelims or any State PSC.</p>
                <p>Often, the difference between clearing the cutoff and missing the cutoff is only 3-5 questions, and these questions are almost always from current affairs.</p>
                <p>BharatMock allows you to focus only on important current affairs so that you can learn faster and remember better for exams.</p>
              </div>
              <h3 className="font-display text-2xl font-bold mt-8 mb-4">Why Smart Revision Matters</h3>
              <div className="space-y-4 leading-relaxed text-base md:text-lg" style={{ color: '#1a1a1a' }}>
                <p>If you study a little every day for six months, it will help you remember it much better than studying at the last minute.</p>
                <p>Weekly PDFs will make revision easy, and you will quickly remember important events.</p>
                <p>With monthly capsules, you will be able to revise hundreds of important topics easily before your exams.</p>
                <p>We also cover current affairs in Hindi for aspirants who are more comfortable preparing in their first language.</p>
              </div>
              <div className="mt-8 overflow-x-auto">
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border px-4 py-3 text-left font-semibold">Feature</th>
                      <th className="border border-border px-4 py-3 text-left font-semibold">What does it help you do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Daily current affairs', 'Stay updated every single day'],
                      ['Weekly current affairs PDF', 'Review the full week at once'],
                      ['Monthly current affairs', 'Deep revision before exams'],
                      ['Current affairs quiz', 'Test what you actually retained'],
                      ['Current affairs mock test', 'Simulate real exam pressure'],
                    ].map(([feature, benefit], i) => (
                      <tr key={feature} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                        <td className="border border-border px-4 py-3">{feature}</td>
                        <td className="border border-border px-4 py-3">{benefit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-8 p-6 bg-primary/10 rounded-2xl border border-primary/20">
                <p className="font-semibold text-lg" style={{ color: '#1a1a1a' }}>
                  Start with today's current affairs. Take the daily quiz. Download the monthly PDF. Repeat every day till exam day.
                </p>
              </div>
            </section>
          }
        />
      </div>
    </div>
  );
}
