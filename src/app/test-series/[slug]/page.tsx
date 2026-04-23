
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  FileText,
  Users,
  Award,
  Calendar,
  Search,
  Share2,
  Globe,
  BookOpen,
  Layers,
  History,
  Target,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { testSeriesService, TestSeries } from '@/lib/api/testSeriesService';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';
import { StandardExamCard } from '@/components/exam/StandardExamCard';
import { Exam } from '@/types';
import { pageBannersService, PageBanner } from '@/lib/api/pageBannersService';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type NormalizedEntry = {
  raw: any;
  card: Exam;
};

const SIDEBAR_BANNER_IDENTIFIER = 'test_series_sidebar';

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function TestSeriesDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const [testSeries, setTestSeries] = useState<TestSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarSeries, setSidebarSeries] = useState<TestSeries[]>([]);
  const [sidebarBanner, setSidebarBanner] = useState<PageBanner | null>(null);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const sectionsScrollRef = useRef<HTMLDivElement>(null);
  const topicsScrollRef = useRef<HTMLDivElement>(null);

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    ref.current?.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  useEffect(() => {
    if (slug) {
      fetchTestSeries();
      fetchSidebarContent();
    }
  }, [slug]);

  const fetchTestSeries = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await testSeriesService.getTestSeriesBySlug(slug);
      setTestSeries(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load test series');
    } finally {
      setLoading(false);
    }
  };

    const faqItems = useMemo(
    () => [
      {
        question: 'How often should I attempt a Bharat Mock test series exam?',
        answer:
          'For most competitive exams, we recommend attempting one full-length mock test every 3 to 4 days. This cadence gives you enough time to analyse results, revise weak topics, and maintain momentum without burning out.'
      },
      {
        question: 'Can I pause a test series attempt and resume later?',
        answer:
          'Each mock replicates the official exam environment, so pausing is disabled by default. If you need flexible practice, use the custom practice sets or section drills, then return to the timed mock when you are ready for a complete simulation.'
      },
      {
        question: 'What insights do I get after submitting a mock test?',
        answer:
          'Your dashboard highlights accuracy by topic, speed metrics, percentile comparisons, and personalised study nudges. You can also download detailed solutions, bookmark tricky questions, and convert mistakes into revision cards.'
      },
      {
        question: 'Does the test series support bilingual exams?',
        answer:
          'Yes. Many Bharat Mock test series provide both English and Hindi interfaces along with bilingual question explanations. Check the language badges on the test detail cards before starting your attempt.'
      }
    ],
    []
  );

  const fetchSidebarContent = async () => {
    setSidebarLoading(true);
    try {
      const [seriesResponse, banners] = await Promise.all([
        testSeriesService.getTestSeries({ limit: 50, is_published: true }),
        pageBannersService.getBanners(SIDEBAR_BANNER_IDENTIFIER)
      ]);

      const allSeries = seriesResponse?.data || [];
      const otherSeries = allSeries.filter(series => series.slug !== slug);
      setSidebarSeries(shuffleArray(otherSeries).slice(0, 5));

      const activeBanner = banners.find(banner => banner.is_active) || banners[0] || null;
      setSidebarBanner(activeBanner || null);
    } catch (err) {
      console.error('Failed to load sidebar content:', err);
    } finally {
      setSidebarLoading(false);
    }
  };

  const normalizeExamForCard = (exam: any, series: TestSeries): Exam => {
    const now = new Date().toISOString();
    const totalMarks = Number(exam.total_marks ?? exam.totalMarks ?? 0);
    const totalQuestions = Number(exam.total_questions ?? exam.totalQuestions ?? 0);
    const duration = Number(exam.duration ?? 0);

    const normalizedDifficulty = (exam.difficulty === 'easy' || exam.difficulty === 'medium' || exam.difficulty === 'hard')
      ? exam.difficulty
      : 'medium';

    const normalizedStatus = (exam.status === 'upcoming' || exam.status === 'ongoing' || exam.status === 'completed' || exam.status === 'anytime')
      ? exam.status
      : (exam.allow_anytime ? 'anytime' : 'upcoming');

    const normalizedExamType = (exam.exam_type === 'past_paper' || exam.exam_type === 'mock_test' || exam.exam_type === 'short_quiz')
      ? exam.exam_type
      : 'mock_test';

    return {
      id: exam.id,
      title: exam.title || 'Untitled Mock Test',
      duration,
      total_marks: totalMarks,
      total_questions: totalQuestions,
      category: exam.category || series.category?.name || 'Mock Test',
      category_id: exam.category_id,
      subcategory: exam.subcategory,
      subcategory_id: exam.subcategory_id,
      difficulty: normalizedDifficulty,
      difficulty_id: exam.difficulty_id,
      status: normalizedStatus,
      start_date: exam.start_date || null,
      end_date: exam.end_date || null,
      pass_percentage: Number(exam.pass_percentage ?? 0),
      is_free: Boolean(exam.is_free),
      image_url: exam.image_url,
      logo_url: exam.logo_url,
      thumbnail_url: exam.thumbnail_url,
      negative_marking: Boolean(exam.negative_marking),
      negative_mark_value: Number(exam.negative_mark_value ?? 0),
      is_published: exam.is_published !== undefined ? Boolean(exam.is_published) : true,
      created_at: exam.created_at || now,
      updated_at: exam.updated_at || now,
      slug: exam.slug,
      url_path: exam.url_path,
      syllabus: exam.syllabus,
      pattern: exam.pattern,
      attempts: exam.attempts,
      allow_anytime: exam.allow_anytime ?? true,
      exam_type: normalizedExamType,
      show_in_mock_tests: Boolean(exam.show_in_mock_tests),
      is_premium: exam.is_premium ?? !exam.is_free,
      supports_hindi: exam.supports_hindi ?? false,
      totalMarks,
      totalQuestions,
      startDate: exam.startDate,
      endDate: exam.endDate,
      passPercentage: exam.passPercentage,
      exam_categories: exam.exam_categories,
      negativeMarking: exam.negativeMarking,
      negativeMarkValue: exam.negativeMarkValue,
    };
  };

  const normalizedEntries = useMemo<NormalizedEntry[]>(() => {
    if (!testSeries?.exams) return [];
    return testSeries.exams.map(exam => ({
      raw: exam,
      card: normalizeExamForCard(exam, testSeries)
    }));
  }, [testSeries]);

  const groupedData = useMemo(() => {
    if (!testSeries) {
      return { grouped: [], uncategorized: [] };
    }

    const sections = testSeries.sections || [];

    if (sections.length === 0) {
      return { grouped: [], uncategorized: normalizedEntries };
    }

    const grouped = sections.map(section => {
      const sectionEntries = normalizedEntries.filter(entry => entry.raw.test_series_section_id === section.id);
      const topics = (section.topics || []).map(topic => ({
        ...topic,
        entries: sectionEntries.filter(entry => entry.raw.test_series_topic_id === topic.id)
      }));
      const uncategorizedEntries = sectionEntries.filter(entry => !entry.raw.test_series_topic_id);

      return {
        ...section,
        topics,
        uncategorizedEntries
      };
    });

    const uncategorized = normalizedEntries.filter(entry => !entry.raw.test_series_section_id);

    return { grouped, uncategorized };
  }, [normalizedEntries, testSeries]);

  const totalFreeTests = useMemo(() => {
    return normalizedEntries.filter(entry => entry.raw.is_free).length;
  }, [normalizedEntries]);

  const availableLanguages = useMemo(() => {
    if (testSeries?.languages?.length) return testSeries.languages;
    const hasHindi = normalizedEntries.some(entry => entry.raw.supports_hindi);
    const langs = ['English'];
    if (hasHindi) langs.push('Hindi');
    return langs;
  }, [normalizedEntries, testSeries?.languages]);

  const sectionFilters = useMemo(() => {
    return groupedData.grouped.map(section => {
      const sectionCount =
        (section.topics || []).reduce((acc: number, topic: any) => acc + topic.entries.length, 0) +
        section.uncategorizedEntries.length;
      return {
        id: section.id,
        name: section.name,
        count: sectionCount
      };
    });
  }, [groupedData.grouped]);

  useEffect(() => {
    if (!activeTab && sectionFilters.length > 0) {
      setActiveTab(sectionFilters[0].id);
    }
  }, [activeTab, sectionFilters]);

  useEffect(() => {
    setSelectedTopicId(null);
  }, [activeTab]);

  const currentSection = activeTab && activeTab !== 'topics'
    ? groupedData.grouped.find(section => section.id === activeTab)
    : null;

  const sectionTopicFilters = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }[]>();
    groupedData.grouped.forEach(section => {
      const topics = (section.topics || [])
        .filter(topic => topic.entries.length > 0)
        .map(topic => ({ id: topic.id, name: topic.name, count: topic.entries.length }));
      map.set(section.id, topics);
    });
    return map;
  }, [groupedData.grouped]);

  const currentSectionEntries = useMemo(() => {
    if (!currentSection) return [];
    return [
      ...currentSection.uncategorizedEntries,
      ...(currentSection.topics || []).flatMap((topic: any) => topic.entries)
    ];
  }, [currentSection]);

  const filteredSectionEntries = useMemo(() => {
    if (!currentSection) return [];
    if (!selectedTopicId) return currentSectionEntries;
    const topicMatch = (currentSection.topics || []).find(topic => topic.id === selectedTopicId);
    return topicMatch ? topicMatch.entries : [];
  }, [currentSection, currentSectionEntries, selectedTopicId]);

  const searchedSectionEntries = useMemo(() => {
    if (!searchQuery) return filteredSectionEntries;
    const query = searchQuery.toLowerCase();
    return filteredSectionEntries.filter(entry =>
      entry.card.title?.toLowerCase().includes(query)
    );
  }, [filteredSectionEntries, searchQuery]);

  const heroStats = useMemo(() => {
    return [
      {
        icon: <Layers className="h-4 w-4 text-emerald-600" />,
        label: 'Total Tests',
        value: testSeries?.total_tests || normalizedEntries.length
      },
      {
        icon: <Target className="h-4 w-4 text-blue-600" />,
        label: 'Free Tests',
        value: totalFreeTests
      },
      {
        icon: <Users className="h-4 w-4 text-purple-600" />,
        label: 'Attempts',
        value: testSeries?.total_attempts || 0
      },
      {
        icon: <Globe className="h-4 w-4 text-orange-500" />,
        label: 'Languages',
        value: availableLanguages.join(', ')
      }
    ];
  }, [availableLanguages, normalizedEntries.length, testSeries?.total_attempts, testSeries?.total_tests, totalFreeTests]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-10">
          <div className="container-main">
            <Skeleton className="h-6 w-48 mb-6 bg-white/20" />
            <Skeleton className="h-12 w-96 mb-4 bg-white/20" />
            <Skeleton className="h-6 w-64 bg-white/20" />
          </div>
        </div>
        <div className="container-main py-10">
          <div className="grid gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !testSeries) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {error || 'Test series not found'}
          </h1>
          <Button asChild>
            <Link href="/mock-test-series">Back to Test Series</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { grouped, uncategorized } = groupedData;

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      {/* Hero Section */}
      <div className="bg-[#eef4ff] border-b border-blue-100">
        <div className="container-main py-6">
          <Breadcrumbs 
            items={[
              HomeBreadcrumb(),
              { label: 'Test Series', href: '/mock-test-series' },
              { label: testSeries.title }
            ]}
            variant="light"
            className="mb-6"
          />

          <div className="flex flex-col gap-4 items-start">
            <div className="w-full bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="shrink-0">
                  {testSeries.category?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={testSeries.category.logo_url}
                      alt={testSeries.category.name}
                      className="h-20 w-20 rounded-full border border-blue-100 object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full border border-blue-100 bg-blue-50 flex items-center justify-center text-2xl font-bold text-blue-700">
                      {(testSeries.category?.name || testSeries.title).slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-blue-600 uppercase tracking-wide">
                    {testSeries.category?.name && <span>{testSeries.category.name}</span>}
                    {testSeries.difficulty?.name && (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Award className="h-4 w-4" />
                        {testSeries.difficulty.name}
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-1">
                    {testSeries.title}
                  </h1>
                  {testSeries.description && (
                    <p className="text-slate-600 mt-3 max-w-3xl">{testSeries.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    {heroStats.map((stat) => (
                      <div
                        key={stat.label}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                      >
                        <span className="flex items-center gap-1 text-blue-600">
                          <span className="h-3.5 w-3.5 text-blue-500">{stat.icon}</span>
                          {stat.label}
                        </span>
                        <span className="text-slate-900 text-sm">{stat.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 mt-5">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-green-600" />
                      <span>{sectionFilters.length} Sections</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-600" />
                      <span>{Array.from(sectionTopicFilters.values()).reduce((sum, topics) => sum + topics.length, 0)} Topics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-amber-600" />
                      <span>
                        {testSeries.updated_at
                          ? `Last updated ${new Date(testSeries.updated_at).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}`
                          : 'Updated recently'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Test Series Content */}
      <div className="container-main py-6 overflow-hidden">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] items-start">
          <div className="space-y-5 min-w-0 w-full overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-4 items-center bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3 min-w-0 overflow-hidden">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Search className="h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Tests"
                  className="border-0 focus-visible:ring-0 text-base"
                />
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-600">
                  <Layers className="h-3.5 w-3.5" /> {sectionFilters.length} Sections
                </span>
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600">
                  <BookOpen className="h-3.5 w-3.5" /> {normalizedEntries.length} Tests
                </span>
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-600">
                  <Globe className="h-3.5 w-3.5" /> {availableLanguages.join(', ')}
                </span>
              </div>
            </div>

            {/* Section/Topic Tabs & Listings */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5 min-w-0 overflow-hidden">
              {/* Sections — inline arrows on desktop */}
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
                    {sectionFilters.map(section => (
                      <button
                        key={section.id}
                        onClick={() => setActiveTab(section.id)}
                        className={`relative shrink-0 pb-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                          activeTab === section.id ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {section.name} ({section.count})
                        {activeTab === section.id && (
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

              {currentSection ? (
                <>
                  {/* Topics — inline arrows on desktop */}
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
                      {(sectionTopicFilters.get(currentSection.id) || []).map(topic => (
                        <button
                          key={topic.id}
                          onClick={() =>
                            setSelectedTopicId(prev => (prev === topic.id ? null : topic.id))
                          }
                          className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            selectedTopicId === topic.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {topic.name} ({topic.count})
                        </button>
                      ))}
                      {sectionTopicFilters.get(currentSection.id)?.length === 0 && (
                        <p className="text-sm text-muted-foreground">No topics available for this section.</p>
                      )}
                    </div>
                    <button
                      onClick={() => scroll(topicsScrollRef, 'right')}
                      className="hidden md:flex shrink-0 h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                      aria-label="Scroll topics right"
                    >
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>

                  {searchedSectionEntries.length > 0 ? (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {searchedSectionEntries.map(entry => (
                        <StandardExamCard
                          key={entry.raw.id}
                          exam={{
                            ...entry.card,
                            category_logo_url: entry.card.exam_categories?.logo_url,
                            category_icon: entry.card.exam_categories?.icon,
                          }}
                          ctaLabel="Attempt Now"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-10 text-center">
                      <p className="text-muted-foreground">No tests match your filters yet.</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No sections available.</p>
              )}
            </div>

            {/* Uncategorized Exams */}
            {currentSection && activeTab && uncategorized.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Other Tests</h2>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {uncategorized.map((entry) => (
                    <StandardExamCard
                      key={entry.raw.id}
                      exam={{
                        ...entry.card,
                        category_logo_url: entry.card.exam_categories?.logo_url,
                        category_icon: entry.card.exam_categories?.icon,
                      }}
                      ctaLabel="Attempt Now"
                    />
                  ))}
                </div>
              </div>
            )}

            {!currentSection && normalizedEntries.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">No tests available yet</h3>
                <p className="text-muted-foreground">Tests will be added soon to this series</p>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Keep exploring</p>
                  <h3 className="text-lg font-semibold text-slate-900">More Test Series</h3>
                </div>
              </div>
              <div className="space-y-3">
                {sidebarLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={`sidebar-skeleton-${index}`} className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))
                ) : sidebarSeries.length ? (
                  sidebarSeries.map(series => (
                    <Link
                      key={series.id}
                      href={`/test-series/${series.slug}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 hover:border-blue-200 hover:bg-blue-50/40 transition"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 line-clamp-1">{series.title}</p>
                        <p className="text-xs text-slate-500">
                          {series.total_tests || 0} tests · {series.category?.name || 'General'}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-blue-500" />
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Fresh recommendations coming soon.</p>
                )}
              </div>
            </div>

            {sidebarBanner && (
              sidebarBanner.link_url ? (
                <Link
                  href={sidebarBanner.link_url}
                  className="block"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <div className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                    <div className="flex items-center justify-center bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sidebarBanner.image_url}
                        alt={sidebarBanner.alt_text || 'Featured banner'}
                        className="w-full h-auto object-contain"
                        loading="lazy"
                      />
                    </div>
                    
                      
                  </div>
                </Link>
              ) : (
                <div className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <div className="flex items-center justify-center bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sidebarBanner.image_url}
                      alt={sidebarBanner.alt_text || 'Featured banner'}
                      className="w-full h-auto object-contain"
                      loading="lazy"
                    />
                  </div>
                </div>
              )
            )}
          </aside>
        </div>
        <section className="mt-10 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <h2 className="text-2xl font-bold text-slate-900">Mastering Test Series Preparation: Detailed Guide</h2>
          <p className="text-slate-600 leading-relaxed">
            Building momentum with a structured test series is one of the surest ways to move from passive reading to confident performance. When aspirants attempt carefully curated mock exams, they replicate every nuance of the eventual challenge—timing pressure, question diversity, evolving difficulty, and post-exam analysis. The Bharat Mock approach to test series emphasises this end-to-end simulation mindset. Aspirants are encouraged to treat each scheduled test like a rehearsal of the main stage: wake up at the same time, sit in a distraction-free environment, and log every micro-learning immediately after submission. Over weeks, this rhythm transforms assessment anxiety into a familiar companion. It is also the fastest way to expose topic blind spots. Every test highlights a new pattern, whether it is misreading multi-step reasoning problems or hesitating on direct recall questions that demand instant retrieval. Recognising these micro-patterns early prevents knowledge leakage during the final sprint.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Serious aspirants also know that a test series is more than the sum of its question papers. The surrounding ecosystem matters just as much. Quality editorial summaries, exam-wise notes, and community-driven doubt-clearing channels add extra value with minimal effort. Bharat Mock test series weave these elements into each release so learners can double-click into complex solutions, mark them for revision, or bookmark them as collaborative flashcards. The goal is to avoid the trap of passive review. Instead of simply reading answer keys, aspirants should rewrite mistaken solutions in their own words, attach a voice note explaining the concept, or design a short quiz for peers. These activities convert a one-time failure into a portfolio of custom assets. Over 1000+ aspirants reported that this strategy alone improved retention by more than 40%, especially when paired with spaced repetition alerts from the dashboard.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Time management remains the decisive differentiator in competitive exams, so every test series attempt should be monitored with meticulous precision. Before attempting a mock, aspirants should outline mini-goals for each section: number of questions to attempt in the first 15 minutes, buffer time for review, and must-attempt topics. During analysis, they should compare the intended allocation with the actual timeline captured in the submission report. If an aspirant spent ten minutes on a puzzle that typically requires four, the dashboard will surface that anomaly. Bharat Mock analytics not only highlight these deviations but also suggest alternative approaches: skipping heuristics, elimination-first strategies, or partial marking techniques. By reflecting on this timeline after every test, aspirants can calibrate their instincts. Within three weeks, most learners find they can predict completion times with near-perfect accuracy, which reduces panic on the final day.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Strategic syllabus coverage is another pillar of successful test series participation. It is tempting to only focus on familiar subjects, but real progress comes from allocating extra attempts to weak zones. Bharat Mock recommends the 3-2-1 rotation rule: three practice sessions for high-scoring strengths, two for average topics, and one for the weakest area. When this cadence is mirrored inside the test series schedule, aspirants experience a balanced diet of questions. Each test automatically tags sections with colour-coded heat maps so learners can visualise improvement. For example, a candidate preparing for banking exams might see data interpretation turning green over time while descriptive English remains amber. Instead of feeling overwhelmed, they can pause the default schedule, deep-dive into remedial modules, and rejoin the flow once confidence rebounds. This adaptive loop keeps motivation high without compromising overall consistency.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Collaboration plays an underrated role in sustaining long-term preparation. When aspirants discuss mock test experiences with peers, they gain fresh perspectives on question framing, test-taking psychology, and evolving trends. The Bharat Mock community portal encourages sharing personalised debriefs after every exam: what strategy worked, which surprise topic appeared, and how nerves were handled. Over time, these micro-stories form a living knowledge base. Newcomers can read archived debriefs to understand the emotional arc of the journey, while veterans can mentor juniors with targeted advice. This sense of accountability ensures that aspirants do not disappear after one bad test—they re-enter the arena with community backing.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Expert faculty insights further enrich the test series ecosystem. After every major release, Bharat Mock mentors host breakdown sessions where they dissect tricky questions, highlight most probable areas for upcoming exams, and share note-making hacks. Learners are encouraged to revisit these sessions while analysing their own scripts. By cross-referencing faculty reasoning with personal attempts, aspirants develop nuance and recognise subtle cues—like when to skip a question despite knowing the concept, or how to decode pattern shifts in newly introduced sections. These insights accumulate into a mental toolkit that proves priceless during actual exams, especially when patterns deviate from previous years.
          </p>
          <p className="text-slate-600 leading-relaxed">
            It is equally important to build resilience through healthy routines. Test series fatigue is real; constant evaluation can feel draining if not balanced with reflection and rest. Bharat Mock recommends scheduling deliberate downtime after every two mocks. During this window, aspirants should revisit wins, celebrate subtle improvements, and engage in light revision activities like flashcards or short-form quizzes. This prevents burnout and ensures that motivation remains sustainable over the multi-month preparation arc. Data from thousands of aspirants shows that those who followed structured rest cycles maintained higher accuracy rates compared to peers who attempted back-to-back mocks without breathing space.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Finally, aspirants should treat the test series dashboard as a living roadmap. Every insight—accuracy graphs, percentile rankings, or topic mastery indicators—offers a clue about what to prioritise next. Instead of chasing a perfect score in isolation, learners should aim for progressive milestones: consistent 80% accuracy, sub-5 minute review windows, or error-free attempts in critical sections. Bharat Mock surfaces these micro-goals within the UI, nudging users to focus on actionable improvements. Over time, these small wins converge into exam-day readiness. When aspirants eventually sit for the actual test, they carry thousands of simulated decisions, refined strategies, and community-backed confidence. That is the power of a well-designed test series: it converts uncertainty into measurable growth and turns preparation into a decisive competitive edge.
          </p>
        </section>

        <section className="mt-8 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">FAQs</p>
            <h2 className="text-2xl font-bold text-slate-900">Test Series Frequently Asked Questions</h2>
            <p className="text-slate-600">Detailed answers to the most common queries about Bharat Mock test series.</p>
          </div>
          <Accordion type="single" collapsible className="divide-y divide-slate-200">
            {faqItems.map((item, idx) => (
              <AccordionItem key={item.question} value={`faq-${idx}`}>
                <AccordionTrigger className="text-left text-base font-semibold text-slate-800">
                  <h3 className="inline text-base font-semibold text-slate-800 text-left">{item.question}</h3>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-slate-700 leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>
    </div>
  );
}
