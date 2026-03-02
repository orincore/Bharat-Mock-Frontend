"use client";

import { useState, useEffect, useMemo } from 'react';
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
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { testSeriesService, TestSeries } from '@/lib/api/testSeriesService';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';
import { ExamCard } from '@/components/exam/ExamCard';
import { Exam } from '@/types';

type NormalizedEntry = {
  raw: any;
  card: Exam;
};

export default function TestSeriesDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [testSeries, setTestSeries] = useState<TestSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (slug) {
      fetchTestSeries();
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

                  <div className="flex flex-wrap gap-3 mt-4">
                    {heroStats.map((stat) => (
                      <div
                        key={stat.label}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-2xl"
                      >
                        {stat.icon}
                        <div>
                          <p className="text-base font-semibold text-slate-900">{stat.value}</p>
                          <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 mt-4">
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
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3">
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
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 pb-3">
            {sectionFilters.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={`relative pb-2 text-sm font-semibold transition-colors ${
                  activeTab === section.id ? 'text-blue-600' : 'text-slate-500'
                }`}
              >
                {section.name} ({section.count})
                {activeTab === section.id && (
                  <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {currentSection ? (
            <>
              <div className="flex flex-wrap gap-3">
                {(sectionTopicFilters.get(currentSection.id) || []).map(topic => (
                  <button
                    key={topic.id}
                    onClick={() =>
                      setSelectedTopicId(prev => (prev === topic.id ? null : topic.id))
                    }
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                      selectedTopicId === topic.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {topic.name} ({topic.count})
                  </button>
                ))}
                {sectionTopicFilters.get(currentSection.id)?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No topics available for this section.</p>
                )}
              </div>

              {searchedSectionEntries.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {searchedSectionEntries.map(entry => (
                    <ExamCard key={entry.raw.id} exam={entry.card} />
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
                <ExamCard key={entry.raw.id} exam={entry.card} />
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
    </div>
  );
}
