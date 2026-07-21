"use client";

// Everything on the homepage BELOW the hero + stats strip, split out of
// views/Index.tsx into its own chunk (loaded via next/dynamic). The hero is
// the LCP element; keeping these ~500 lines (plus StandardExamCard and the
// data services) out of the critical bundle shrinks the JS that competes with
// the hero's first paint on slow mobile connections. SSR output is unchanged —
// next/dynamic with default ssr renders this on the server, so crawlers and
// the first paint still get the full HTML.

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from '@/components/common/Image';
import { FEATURED_PARTNERS } from '@/lib/constants/featuredPartners';
import {
  ArrowRight, Award, BookOpen, Sparkles, Target, TrendingUp, Shield,
  ChevronRight, LineChart, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StandardExamCard } from '@/components/exam/StandardExamCard';
import { examService } from '@/lib/api/examService';
import { blogService, Blog } from '@/lib/api/blogService';
import { taxonomyService, Category, Subcategory } from '@/lib/api/taxonomyService';
import { Exam, Article } from '@/types';
import { HomepageData, HomepageBanner } from '@/lib/api/homepageService';

// Isolated client component — does not call useAuth to avoid SSR prerender issues.
// Reads localStorage after mount as a lightweight proxy for auth state.
function GetStartedButton() {
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsAuthenticated(!!localStorage.getItem('auth_token'));
  }, []);

  // Server: always /mock-test-series (stable across SSR and hydration).
  // Client + authenticated: /mock-test-series.
  // Client + guest: /register.
  const href = !mounted || isAuthenticated
    ? '/mock-test-series'
    : `/register?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;

  return (
    <Link href={href}>
      <Button
        size="xl"
        className="bg-white text-cyan-700 hover:bg-white/90 shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-0.5"
      >
        Get Started Free <ArrowRight className="h-5 w-5 ml-2" />
      </Button>
    </Link>
  );
}

const whyChooseFeatures = [
  {
    icon: FileText,
    title: 'Mock Tests',
    description: 'Practice with full-length government exam mock tests built on real exam patterns - timed, realistic, and score-accurate.'
  },
  {
    icon: LineChart,
    title: 'Deep Performance Analytics',
    description: 'Get clear insights after every test, understand mistakes, track progress, and turn your online exam practice into real results.'
  },
  {
    icon: Sparkles,
    title: 'Daily Current Affairs & Updates',
    description: 'Stay updated with daily GK quizzes, exam notifications, and syllabus updates – so you\'re always ready for your next online exam.'
  },
  {
    icon: Target,
    title: 'Sectional Practice',
    description: 'Target weak areas with focused topic-wise sessions. Ideal for online exam preparation when you want to improve specific subjects fast.'
  }
];

const passStats = [
  { label: 'EXAMS COVERED', value: '100+' },
  { label: 'TESTS ATTEMPTED', value: '25k+' },
  { label: 'AVG. SCORE BOOST', value: '15%' }
];

const featuredPartners = FEATURED_PARTNERS;

const passHighlights = [
  {
    icon: LineChart,
    title: 'Smart Learning Flow',
    description: 'A structured study path that helps you stay consistent and cover your syllabus step by step - no confusion, no gaps in govt exam preparation.',
    accent: 'bg-amber-50 text-amber-600'
  },
  {
    icon: Target,
    title: 'Focused Practice Sessions',
    description: 'Short, goal-based sessions that keep you engaged. Great for online exam practice when you have limited time but still want to improve daily.',
    accent: 'bg-indigo-50 text-indigo-600'
  },
  {
    icon: TrendingUp,
    title: 'Consistent Progress',
    description: 'Stay consistent with your daily study routine and focus on small improvements. Over time, this is what helps toppers crack all sarkari exams.',
    accent: 'bg-emerald-50 text-emerald-600'
  },
  {
    icon: Award,
    title: 'Exam Mindset',
    description: 'Train yourself to stay calm and confident under pressure. The right mindset is what separates toppers from the rest in any online competitive exam.',
    accent: 'bg-sky-50 text-sky-600'
  }
];

const learningJourneySteps = [
  {
    label: 'Learn',
    pillClass: 'border-emerald-200 bg-emerald-50/80 text-emerald-700',
    arrowClass: 'text-emerald-400'
  },
  {
    label: 'Practice',
    pillClass: 'border-sky-200 bg-sky-50/80 text-sky-700',
    arrowClass: 'text-sky-400'
  },
  {
    label: 'Analyze',
    pillClass: 'border-indigo-200 bg-indigo-50/80 text-indigo-700',
    arrowClass: 'text-indigo-400'
  },
  {
    label: 'Improve',
    pillClass: 'border-purple-200 bg-purple-50/80 text-purple-700',
    arrowClass: 'text-purple-400'
  },
  {
    label: 'Succeed',
    pillClass: 'border-amber-200 bg-amber-50/80 text-amber-700',
    arrowClass: 'text-amber-400'
  }
];

type HomeBelowFoldProps = {
  initialData?: HomepageData | null;
  initialMostAttemptedExams?: Exam[];
};

export default function HomeBelowFold({ initialData, initialMostAttemptedExams }: HomeBelowFoldProps) {
  const [exams, setExams] = useState<Exam[]>(initialData?.featuredExams || []);
  const [articles, setArticles] = useState<(Article | Blog)[]>(initialData?.featuredArticles || []);
  const heroBanners: HomepageBanner[] = initialData?.banners?.filter((banner) => banner.is_active) ?? [];
  const resolvePlacement = (banner: HomepageBanner) =>
    banner.placement?.toLowerCase?.() === 'mid' ? 'mid' : 'top';
  const topBanners = heroBanners.filter((banner) => resolvePlacement(banner) === 'top');
  const midBanners = heroBanners.filter((banner) => resolvePlacement(banner) === 'mid');
  const hasInitialData = Boolean(initialData?.categories?.length);
  const initialCategories = useMemo((): Category[] => {
    if (!initialData?.categories) return [];
    return initialData.categories
      .filter((c) => c.is_active !== false && c.name !== 'Current Affairs')
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((c) => ({ ...c, created_at: '', updated_at: '' } as Category));
  }, [initialData]);
  const initialSubMap = useMemo((): Record<string, Subcategory[]> => {
    if (!initialData?.categories) return {};
    const map: Record<string, Subcategory[]> = {};
    for (const cat of initialData.categories) {
      if (cat.subcategories?.length) {
        map[cat.id] = cat.subcategories.map((s) => ({ ...s, created_at: '', updated_at: '' } as Subcategory));
      }
    }
    return map;
  }, [initialData]);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isLoading, setIsLoading] = useState(!hasInitialData);
  const [categoriesLoading, setCategoriesLoading] = useState(!hasInitialData);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialCategories[0]?.id || null);
  const [subcategoryMap, setSubcategoryMap] = useState<Record<string, Subcategory[]>>(initialSubMap);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [showAllSubcategories, setShowAllSubcategories] = useState(false);
  const [mostAttemptedExams, setMostAttemptedExams] = useState<Exam[]>(initialMostAttemptedExams || []);
  const [mostAttemptedLoading, setMostAttemptedLoading] = useState(!initialMostAttemptedExams?.length);
  const categoryPillsScrollRef = useRef<HTMLDivElement>(null);

  const isCategorySectionLoading = categoriesLoading || subcategoriesLoading;

  useEffect(() => {
    if (hasInitialData) return;
    const fetchData = async () => {
      try {
        const [curatedExams, blogsResponse, categoriesData] = await Promise.all([
          examService.getCuratedFeaturedExams(),
          blogService.getBlogs({ limit: 10 }),
          taxonomyService.getCategories()
        ]);
        const examsData = curatedExams.length > 0 ? curatedExams : await examService.getFeaturedExams();
        setExams(examsData);
        setArticles(blogsResponse.data || []);
        const visibleCategories = categoriesData
          .filter((category) => category.is_active !== false && category.name !== 'Current Affairs')
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
        setCategories(visibleCategories);
        if (visibleCategories.length > 0) {
          setSelectedCategoryId(visibleCategories[0].id);
        }
      } finally {
        setIsLoading(false);
        setCategoriesLoading(false);
      }
    };
    fetchData();
  }, [hasInitialData]);

  useEffect(() => {
    if (selectedCategoryId && !subcategoryMap[selectedCategoryId]) {
      fetchSubcategories(selectedCategoryId);
    }
  }, [selectedCategoryId, subcategoryMap]);

  useEffect(() => {
    if (initialMostAttemptedExams?.length) return;
    const fetchMostAttempted = async () => {
      setMostAttemptedLoading(true);
      try {
        const response = await examService.getExams({
          limit: 8,
          sortBy: 'attempts',
          sortOrder: 'desc',
          exam_type: 'mock_test'
        });
        const sorted = (response.data || []).slice(0, 4);
        setMostAttemptedExams(sorted);
      } catch (error) {
        console.error('Failed to fetch most attempted exams:', error);
        setMostAttemptedExams([]);
      } finally {
        setMostAttemptedLoading(false);
      }
    };

    fetchMostAttempted();
  }, [initialMostAttemptedExams]);

  useEffect(() => {
    setShowAllSubcategories(false);
  }, [selectedCategoryId]);

  const fetchSubcategories = async (categoryId: string) => {
    setSubcategoriesLoading(true);
    try {
      const data = await taxonomyService.getSubcategories(categoryId);
      const filtered = (data || [])
        .filter((sub) => sub.name && sub.slug)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setSubcategoryMap((prev) => ({
        ...prev,
        [categoryId]: filtered
      }));
    } catch (error) {
      console.error('Failed to load subcategories:', error);
    } finally {
      setSubcategoriesLoading(false);
    }
  };

  const selectedCategory = selectedCategoryId
    ? categories.find((category) => category.id === selectedCategoryId)
    : null;
  const selectedCategorySubcategories = selectedCategoryId
    ? subcategoryMap[selectedCategoryId] || []
    : [];
  const visibleSubcategories = selectedCategorySubcategories.slice(0, 10);
  const remainingSubcategoryCount = Math.max(selectedCategorySubcategories.length - visibleSubcategories.length, 0);

  return (
    <>
      {/* Categories Section */}
      <section className="py-14 bg-background border-b border-border">
        <div className="container-home space-y-6">
          <h2 className="font-display text-2xl font-bold">Choose your exam</h2>

          {isCategorySectionLoading ? (
            <div className="space-y-6" aria-live="polite" aria-busy="true">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-9 w-24 rounded-full" />
                ))}
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="border border-border rounded-xl h-16 p-3">
                    <Skeleton className="h-full w-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground">
              Categories will appear here once added from the admin panel.
            </div>
          ) : (
            <>
              <div className="relative">
                <div
                  ref={categoryPillsScrollRef}
                  className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 px-6 -mx-6 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:flex lg:flex-wrap lg:overflow-visible"
                >
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`px-5 py-2 rounded-full text-sm font-semibold transition border flex-shrink-0 ${
                        selectedCategoryId === category.id
                          ? 'bg-cyan-700 text-white border-cyan-700 shadow-sm'
                          : 'bg-muted text-slate-700 border-transparent hover:bg-muted/80'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedCategory ? (
                <div className="space-y-4">
                  {subcategoriesLoading && !selectedCategorySubcategories.length ? (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3" aria-live="polite" aria-busy="true">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <Skeleton key={index} className="h-20 rounded-2xl" />
                      ))}
                    </div>
                  ) : selectedCategorySubcategories.length === 0 ? (
                    <div className="border border-border rounded-2xl p-8 text-center text-muted-foreground">
                      No exams yet for this category.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                        {visibleSubcategories.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/${sub.slug}`}
                            className="border border-border rounded-2xl px-3 py-2 bg-card hover:border-primary/60 transition flex items-center gap-2 h-16"
                          >
                            {sub.logo_url ? (
                              // alt="" — decorative: the subcategory name is the adjacent
                              // text, so a name alt would be read twice by screen readers.
                              // next/image + sizes="32px": the source logos are ~300px/20KB
                              // each; this serves ~64px (~2KB) variants and lazy-loads them
                              // so they stop competing with the hero for slow-4G bandwidth.
                              <Image
                                src={sub.logo_url}
                                alt=""
                                width={32}
                                height={32}
                                sizes="32px"
                                className="w-8 h-8 object-contain"
                              />
                            ) : selectedCategory.logo_url ? (
                              <Image
                                src={selectedCategory.logo_url}
                                alt=""
                                width={32}
                                height={32}
                                sizes="32px"
                                className="w-8 h-8 object-contain"
                              />
                            ) : (
                              <BookOpen className="h-5 w-5 text-primary" />
                            )}
                            <span className="font-semibold text-sm text-foreground line-clamp-1">{sub.name}</span>
                          </Link>
                        ))}
                      </div>
                      {remainingSubcategoryCount > 0 && selectedCategory && (
                        <div className="flex justify-center">
                          <Link href={`/${selectedCategory.slug}`}>
                            <Button
                              variant="secondary"
                              className="mt-4"
                            >
                              View {remainingSubcategoryCount} More
                            </Button>
                          </Link>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="border border-border rounded-2xl p-8 text-center text-muted-foreground">
                  Select a category to preview its exams.
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {topBanners.length > 0 && (
        <section className="py-10 bg-background border-b border-border">
          <div className="container-home space-y-6">
            <div className="space-y-6">
              {topBanners.map((banner) => {
                const card = (
                  <div
                    className="group relative block overflow-hidden"
                  >
                    {/* next/image + sizes: source banners are ~1536px; phones get a
                        ~750px variant instead of the full-size original */}
                    <Image
                      src={banner.image_url}
                      alt={banner.title || 'Featured banner'}
                      width={1200}
                      height={400}
                      sizes="(min-width: 1280px) 1200px, 100vw"
                      className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </div>
                );

                return banner.link_url ? (
                  <Link key={banner.id} href={banner.link_url} aria-label={banner.title || 'Featured banner'}>
                    {card}
                  </Link>
                ) : (
                  <div key={banner.id}>{card}</div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {(mostAttemptedLoading || mostAttemptedExams.length > 0) && (
        <section className="py-12 bg-background border-b border-border">
          <div className="container-home space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-700">Community Pulse</p>
                <h2 className="font-display text-3xl font-bold text-slate-900 mt-2">Most Attempted Exams</h2>
                <p className="text-muted-foreground mt-2">Find the most popular exams in India and get all the practice tests you need to clear them.</p>
              </div>
              <Link href="/mock-test-series" className="inline-flex">
                <Button variant="secondary" className="gap-2 bg-slate-100 text-slate-800 hover:bg-slate-200">
                  Browse all exams
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {mostAttemptedLoading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border border-border bg-card p-4">
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4 mt-4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </div>
                ))}
              </div>
            ) : mostAttemptedExams.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
                Attempt stats will appear here as soon as students start attempting exams this week.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {mostAttemptedExams.map((exam) => (
                  <StandardExamCard
                    key={exam.id}
                    exam={{
                      ...exam,
                      category_logo_url: exam.exam_categories?.logo_url,
                      category_icon: exam.exam_categories?.icon,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

       {/* Learning Journey CTA */}
      <section className="py-6 -mt-6 bg-background">
        <div className="container-home">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-blue-100 to-sky-50 border border-primary/15 px-5 py-9 sm:px-8 text-center shadow-lg">
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
            <div className="relative space-y-5 sm:space-y-6">
              <h2 className="font-display text-xl leading-tight md:text-3xl font-bold text-slate-900">
                Your 5-Step Journey to Crack Any Govt Exam
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                {learningJourneySteps.map((step, index) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <div
                      className={`rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold shadow-sm flex items-center gap-1.5 sm:gap-2 border ${step.pillClass}`}
                    >
                      {step.label}
                    </div>
                    {index < learningJourneySteps.length - 1 && (
                      <ChevronRight className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${step.arrowClass}`} />
                    )}
                  </div>
                ))}
              </div>

              <Link href="/mock-test-series" className="inline-flex">
                {/* bg-cyan-700: brand --primary is 2.4:1 vs white text (fails WCAG AA) */}
                <Button size="sm" className="rounded-full px-6 shadow-xl bg-cyan-700 hover:bg-cyan-800">
                  Get Free Mock
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose BharatMock - Sixth Section */}
      <section className="py-12 bg-background">
        <div className="container-home">
          <div className="rounded-3xl border border-slate-200 bg-white/90 shadow-sm px-6 py-10 sm:px-10">
            <div className="flex flex-col gap-4 text-center max-w-3xl mx-auto">
              <span className="inline-flex items-center justify-center gap-2 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700">
                <Shield className="h-4 w-4" /> TRUSTED BY TOP PERFORMERS
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900">
                Why students choose <span className="text-cyan-700">BharatMock</span>
              </h2>
              <p className="text-slate-600">
                Smart tools, clear insights, and everything built for proper online exam preparation.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {whyChooseFeatures.slice(0, 4).map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 text-left hover:border-primary/30 hover:bg-white transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

{/* Featured On */}
      <section className="py-2 border-b border-slate-100 bg-background">
        <div className="container-home">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 sm:px-6 sm:py-4 overflow-hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-600">Featured On</p>
                <h3 className="font-display text-lg font-semibold text-slate-800">Trusted by India’s leading media and hiring partners</h3>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-r from-white via-slate-50 to-primary/5 px-2 py-2">
              <div
                className="flex gap-8 animate-featured-marquee"
                style={{
                  animationDuration: `${featuredPartners.length * 8}s`,
                  width: 'max-content'
                }}
              >
                {[...featuredPartners, ...featuredPartners].map((partner, index) => (
                  <div
                    key={`${partner.name}-${index}`}
                    className="h-16 sm:h-20 flex items-center opacity-95 hover:opacity-100 transition drop-shadow-sm"
                  >
                    <img
                      src={partner.url}
                      alt={partner.name}
                      width={240}
                      height={80}
                      className="h-full w-auto max-w-[240px] object-contain"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <style jsx>{`
          @keyframes featured-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-featured-marquee {
            width: max-content;
            animation: featured-marquee 25s linear infinite;
            will-change: transform;
            transform: translateZ(0);
          }
        `}</style>
      </section>

      {/* BharatMock Pass Feature Section */}
      <section className="py-12 bg-background border-y border-slate-100">
        <div className="container-home">
          <div className="relative isolate overflow-hidden rounded-[44px] bg-white shadow-[0_40px_80px_-60px_rgba(15,23,42,0.8)]">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-transparent to-white" />
            <div className="absolute -top-10 -right-4 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] items-center p-6 sm:p-10 lg:p-14 relative z-10">
              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.4em] text-cyan-700">
                    <Sparkles className="h-4 w-4" /> BUILT FOR SERIOUS ASPIRANTS
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight">
                    Enroll In Test Series for <span className="text-primary">100+ Exams</span> With Bharatmock Pass
                  </h2>
                  <p className="text-slate-600 max-w-2xl">
                    Stop paying separately. Get all your online exam preparation in one place, featuring mock tests and tools for every government exam in one simple plan.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {passStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center shadow-sm"
                    >
                      <p className="font-display text-2xl lg:text-3xl font-bold text-slate-900">{stat.value}</p>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {passHighlights.map((perk) => (
                    <div
                      key={perk.title}
                      className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm flex gap-3"
                    >
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${perk.accent}`}>
                        <perk.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{perk.title}</p>
                        <p className="text-sm text-slate-500">{perk.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link href="/subscriptions">
                    <Button size="lg" className="gap-2 rounded-full px-8 shadow-lg bg-cyan-700 hover:bg-cyan-800">
                      Explore BharatMock Pass
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/subscriptions">
                    <Button variant="ghost" size="lg" className="rounded-full text-slate-500 hover:text-slate-900">
                      View plan comparison
                    </Button>
                  </Link>
                </div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Unlimited attempts • Instant activation • Cancel anytime</p>
              </div>

              <div className="relative">
                <div className="absolute -top-6 right-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                <div className="relative mx-auto max-w-sm rounded-[36px] bg-gradient-to-b from-white via-slate-50 to-sky-50 p-6 shadow-2xl">
                  <div className="rounded-[28px] bg-white p-4 border border-gray-100">
                    <Image
                      src="/assets/image1.png"
                      alt="Learner reviewing BharatMock pass dashboard"
                      width={640}
                      height={480}
                      className="w-full h-auto"
                      sizes="(min-width: 640px) 384px, 90vw"
                      loading="lazy"
                    />
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
                      <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center">
                        <p className="text-lg font-semibold text-cyan-700">24</p>
                        <p>Mock sets unlocked</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center">
                        <p className="text-lg font-semibold text-emerald-700">92%</p>
                        <p>Accuracy streak</p>
                      </div>
                      <div className="col-span-2 rounded-2xl border border-dashed border-slate-200 p-4 text-center">
                        <p className="text-sm font-semibold text-slate-800">Daily revision track ready • 4 subjects pending</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Featured Exams */}
      <section className="section-padding bg-background">
        <div className="container-home">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground mb-2">Popular Government Exams</h2>
              <p className="text-muted-foreground">Attempt our most popular mock tests and get exam-ready today.</p>
            </div>


          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" aria-live="polite" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
                  <Skeleton className="h-4 w-32 mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-20 w-full mt-4" />
                  <Skeleton className="h-10 w-full mt-6 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {exams.map((exam) => (
                <StandardExamCard
                  key={exam.id}
                  exam={{
                    ...exam,
                    category_logo_url: exam.exam_categories?.logo_url,
                    category_icon: exam.exam_categories?.icon,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {midBanners.length > 0 && (
        <section className="py-10 bg-background border-b border-border">
          <div className="container-home space-y-6">
            <div className="space-y-6">
              {midBanners.map((banner) => {
                const card = (
                  <div className="group relative block overflow-hidden">
                    <Image
                      src={banner.image_url}
                      alt={banner.title || 'Featured banner'}
                      width={1200}
                      height={400}
                      sizes="(min-width: 1280px) 1200px, 100vw"
                      className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </div>
                );

                return banner.link_url ? (
                  <Link key={banner.id} href={banner.link_url} aria-label={banner.title || 'Featured banner'}>
                    {card}
                  </Link>
                ) : (
                  <div key={banner.id}>{card}</div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA Section */}
      <section className="py-10 bg-gradient-to-r from-primary via-indigo-600 to-sky-500 text-white">
        <div className="container-home text-center space-y-2">
          <div className="flex justify-center">

          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            Your selection starts with one mock test.
          </h2>
          <p className="text-white/90 max-w-2xl mx-auto">
            Start your preparation today and move closer to success.
          </p>
          <GetStartedButton />
        </div>
      </section>
    </>
  );
}
