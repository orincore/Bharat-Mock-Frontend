"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getExamUrl } from '@/lib/utils/examUrl';
import { 
  ArrowRight, ArrowUpRight, Award, BookOpen, CheckCircle, Sparkles, Users, 
  Smartphone, Download, Apple, Play, Target, TrendingUp, Shield,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, GraduationCap, BookOpenCheck, LineChart, UserCheck, Zap,
  Flame, BarChart3, Languages, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExamCard } from '@/components/exam/ExamCard';
import { ArticleCard } from '@/components/article/ArticleCard';
import { examService } from '@/lib/api/examService';
import { blogService, Blog } from '@/lib/api/blogService';
import { taxonomyService, Category, Subcategory } from '@/lib/api/taxonomyService';
import { Exam, Article } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { HomepageHero, HomepageHeroMediaItem, HomepageData, HomepageBanner } from '@/lib/api/homepageService';

type IndexProps = {
  initialHero?: HomepageHero | null;
  initialData?: HomepageData | null;
};

const fallbackHero = {
  title: 'Bharat Mock Hero',
  subtitle: '',
  descriptions: [
    'Start Your Journey With Us! Your Tests, Exams, Quizzes, & Information About Latest Government Exams.',
    'Learn, Practice & Crack Government Exams Today.',
    'Start Preparing For Government Jobs Today With Free Mock Tests, Practice Tests, Notes, Quizzes & Exam Resources!'
  ],
  primaryCta: { text: 'Get Free Mock', url: '/exams' },
  secondaryCta: null as { text: string; url: string } | null,
  media: [
    {
      url: '/assets/image1.png',
      asset_type: 'image',
      alt_text: 'Exam preparation dashboard'
    }
  ] as HomepageHeroMediaItem[],
  mediaLayout: 'single'
};

const impactStats = [
  { label: 'Mock Tests', value: '500+', gradient: 'from-[#fed7aa] via-[#fef3c7] to-[#fde68a]', icon: BookOpenCheck },
  { label: 'Study Plans', value: '120+', gradient: 'from-[#bfdbfe] via-[#dbeafe] to-[#eef2ff]', icon: LineChart },
  { label: 'Students', value: '1M+', gradient: 'from-[#e9d5ff] via-[#f5d0fe] to-[#fde2ff]', icon: UserCheck },
  { label: 'Success Rate', value: '95%', gradient: 'from-[#bbf7d0] via-[#dcfce7] to-[#f0fdf4]', icon: Award }
];

const whyChooseFeatures = [
  {
    icon: BookOpen,
    title: 'Guided Learning',
    description: 'Through Better Prepared Mock Tests and Qualified Professors Insights'
  },
  {
    icon: Target,
    title: 'Free Mock Tests',
    description: 'Your Expert Learning Guides to the Best Exam and Content Based Material with Test Quality Mix'
  },
  {
    icon: Users,
    title: 'Faculty Members',
    description: 'We have Team of Highly Experienced and Exam and More Certified Professors to Guides for Best Career'
  },
  {
    icon: Award,
    title: 'Expert Designed Prep',
    description: 'Study plans curated by exam experts so every mock, note, and quiz follows the actual syllabus pattern'
  }
];

const passStats = [
  { label: 'Exams Covered', value: '670+' },
  { label: 'Mock Tests Solved', value: '3.2M+' },
  { label: 'Avg. Score Boost', value: '18%' }
];

const featuredPartners = [
  { name: 'Aaj Tak', url: 'https://logowik.com/content/uploads/images/aaj-tak1841.jpg' },
  { name: 'The Times of India', url: 'https://twoheadmarketing.wordpress.com/wp-content/uploads/2020/07/1546517908_1bhj7d_time-of-india.jpg' },
  { name: 'Mint', url: 'https://logowik.com/content/uploads/images/mint-magazine8794.jpg' },
  { name: 'The Economic Times', url: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/The_Economic_Times_logo.png' },
  { name: 'Startup India', url: 'https://cdn-prod.mybharats.in/events/17052955243640.png' },
  { name: 'YourStory', url: 'https://polarity.in/wp-content/uploads/2020/01/YourStory-Logo.png' }
];

const passHighlights = [
  {
    icon: Shield,
    title: 'All India Rank',
    description: 'Benchmark yourself against lakhs of serious aspirants.',
    accent: 'bg-amber-50 text-amber-600'
  },
  {
    icon: TrendingUp,
    title: 'Latest Exam Patterns',
    description: 'Mocks updated weekly to match SSC, Banking, and State exams.',
    accent: 'bg-indigo-50 text-indigo-600'
  },
  {
    icon: BarChart3,
    title: 'In-depth Performance',
    description: 'Topic heatmaps, speed charts, and accuracy meters.',
    accent: 'bg-emerald-50 text-emerald-600'
  },
  {
    icon: Languages,
    title: 'Multi-lingual Tests',
    description: 'Attempt seamlessly in English and हिंदी with one pass.',
    accent: 'bg-sky-50 text-sky-600'
  }
];

const benefits = [
  {
    number: '1',
    title: 'Reliable Resources',
    description: 'We Provide well-structured study materials with depth analysis questions and Mock Tests that students have used to Score High in Real Exams.'
  },
  {
    number: '2',
    title: 'Trusted by Thousands of Students',
    description: 'We have earned the trust of thousands of Indian students by providing high-quality study materials.'
  },
  {
    number: '3',
    title: 'Designed by Exam Experts',
    description: 'Designed by exam experts with deep knowledge of syllabus, exam patterns, and high-scoring preparation methods.'
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

const faqs = [
  'Which online test series is best for mock test series?',
  'How to use online mock tests?',
  'How can I get a free mock test?',
  'Which is the largest free study platform in India?',
  'Which online mock test is best?',
  'Which test series is best, online or offline?'
];

export default function Index({ initialHero, initialData }: IndexProps = { initialHero: null, initialData: null }) {
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
      .filter((c) => c.is_active !== false)
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
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showAllSubcategories, setShowAllSubcategories] = useState(false);
  const [activeHeroMedia, setActiveHeroMedia] = useState(0);
  const [mostAttemptedExams, setMostAttemptedExams] = useState<Exam[]>([]);
  const [mostAttemptedLoading, setMostAttemptedLoading] = useState(true);
  const heroButtonsScrollRef = useRef<HTMLDivElement>(null);
  const categoryPillsScrollRef = useRef<HTMLDivElement>(null);

  const heroData = initialHero || initialData?.hero || null;
  const heroTitle = heroData?.title ?? fallbackHero.title;
  const heroSubtitle = heroData?.subtitle ?? fallbackHero.subtitle;
  const heroDescriptions = heroData?.description
    ? heroData.description
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : fallbackHero.descriptions;
  const heroPrimaryCta = heroData?.cta_primary_text && heroData?.cta_primary_url
    ? { text: heroData.cta_primary_text, url: heroData.cta_primary_url }
    : fallbackHero.primaryCta;
  const heroSecondaryCta = heroData?.cta_secondary_text && heroData?.cta_secondary_url
    ? { text: heroData.cta_secondary_text, url: heroData.cta_secondary_url }
    : fallbackHero.secondaryCta;

  const heroMedia = useMemo(() => {
    if (heroData?.media_items && heroData.media_items.length > 0) {
      return heroData.media_items;
    }
    return fallbackHero.media;
  }, [heroData]);

  const { buttonCardMedia, heroIllustrationMedia } = useMemo(() => {
    const buttons = heroMedia.filter(item => item.overlay_color !== 'hero-visual');
    const illustration = heroMedia.find(item => item.overlay_color === 'hero-visual');
    return { buttonCardMedia: buttons, heroIllustrationMedia: illustration };
  }, [heroMedia]);

  const heroMediaLayout = heroData?.media_layout || fallbackHero.mediaLayout;
  const heroMediaCount = heroMedia.length;
  const backgroundVideoUrl = heroData?.background_video_url || '';
  const heroHasMedia = heroMediaCount > 0;
  const showSlider = heroMediaLayout === 'slideshow' && heroMediaCount > 1;
  const primaryMediaIndex = showSlider ? activeHeroMedia : 0;
  const heroMediaPrimary = heroIllustrationMedia;
  const heroMediaSecondary = heroMediaLayout === 'split' && heroMediaCount > 1 ? heroMedia.slice(1, 3) : [];

  useEffect(() => {
    setActiveHeroMedia(0);
  }, [heroMediaCount, heroMediaLayout]);

  useEffect(() => {
    if (!showSlider) return undefined;
    const timer = setInterval(() => {
      setActiveHeroMedia((prev) => (prev + 1) % heroMediaCount);
    }, 6000);
    return () => clearInterval(timer);
  }, [showSlider, heroMediaCount]);

  const handleHeroMediaNav = (direction: 'prev' | 'next') => {
    if (!showSlider) return;
    setActiveHeroMedia((prev) => {
      if (direction === 'prev') {
        return (prev - 1 + heroMediaCount) % heroMediaCount;
      }
      return (prev + 1) % heroMediaCount;
    });
  };

  const renderMediaAsset = (
    asset?: HomepageHeroMediaItem,
    className = 'w-full h-80 md:h-96 rounded-[28px] object-cover',
    options: { disableShadow?: boolean } = {}
  ) => {
    if (!asset) return null;
    if (asset.asset_type === 'video') {
      return (
        <video
          src={asset.url}
          className={`${className} ${options.disableShadow ? '' : 'shadow-[0_25px_80px_-40px_rgba(15,23,42,0.9)]'}`.trim()}
          autoPlay
          muted
          loop
          playsInline
          controls={false}
        />
      );
    }
    return (
      <img
        src={asset.url}
        alt={asset.alt_text || heroTitle}
        className={`${className} ${options.disableShadow ? '' : 'shadow-[0_25px_80px_-40px_rgba(15,23,42,0.9)]'}`.trim()}
        loading="lazy"
      />
    );
  };

  const isCategorySectionLoading = categoriesLoading || subcategoriesLoading;

  useEffect(() => {
    if (hasInitialData) return;
    const fetchData = async () => {
      try {
        const [examsData, blogsResponse, categoriesData] = await Promise.all([
          examService.getFeaturedExams(),
          blogService.getBlogs({ limit: 10 }),
          taxonomyService.getCategories()
        ]);
        setExams(examsData);
        setArticles(blogsResponse.data || []);
        const visibleCategories = categoriesData
          .filter((category) => category.is_active !== false)
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
    const fetchMostAttempted = async () => {
      setMostAttemptedLoading(true);
      try {
        const response = await examService.getExams({
          limit: 8,
          status: 'ongoing'
        });
        const sorted = (response.data || [])
          .slice()
          .sort((a, b) => (b.attempts ?? 0) - (a.attempts ?? 0))
          .slice(0, 4);
        setMostAttemptedExams(sorted);
      } catch (error) {
        console.error('Failed to fetch most attempted exams:', error);
        setMostAttemptedExams([]);
      } finally {
        setMostAttemptedLoading(false);
      }
    };

    fetchMostAttempted();
  }, []);

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

  const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (!ref.current) return;
    const delta = direction === 'left' ? -260 : 260;
    ref.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      {/* Dynamic Hero Section */}
      <section className="relative w-full bg-[#e7f1ff]">
        <div className="container-main py-3 md:py-12">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-4 order-2 lg:order-1">
              <h1 className="font-display text-[1.6rem] sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-snug sm:leading-tight">
                {heroTitle}
              </h1>
              <div className="space-y-1.5 text-[0.95rem] sm:text-base">
                {heroDescriptions.map((paragraph, idx) => (
                  <p key={idx} className="text-gray-600 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Exam Buttons Grid */}
              <div className="relative pt-3">
                <div
                  ref={heroButtonsScrollRef}
                  className="flex gap-3 overflow-x-auto pb-2 pr-4 -ml-4 pl-4 hide-scrollbar sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:p-0"
                >
                  {buttonCardMedia.slice(0, 4).map((item, idx) => {
                    const examIcons = ['📋', '📚', '📅', '📊'];
                    const examLabels = item.headline || ['Delhi Police Head Constable', 'RRB Group D', 'Exam Calendar', 'My Test Series'][idx];
                    const examDates = item.description || ['Exam Date: 7th January 2026', 'Exam Date: 8th January 2026', '', ''][idx];
                    
                    return (
                      <Link
                        key={idx}
                        href={item.cta_url || heroPrimaryCta?.url || '/exams'}
                        className="group relative min-w-[200px] flex-shrink-0 bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 sm:min-w-0"
                      >
                        <div className="flex items-start gap-3">
                          {item.url ? (
                          <div className="w-10 h-10 flex-shrink-0">
                            <img src={item.url} alt={item.alt_text || examLabels} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="text-3xl">{examIcons[idx]}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {examLabels}
                          </h3>
                          {examDates && (
                            <p className="text-xs text-gray-500 mt-1">{examDates}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                </div>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="order-1 lg:order-2 flex justify-center lg:justify-end mt-1 sm:mt-4 lg:mt-0">
              <div className="relative w-full max-w-[260px] sm:max-w-md lg:max-w-lg">
                {heroMediaPrimary ? (
                  renderMediaAsset(heroMediaPrimary, 'w-full h-auto object-contain', { disableShadow: true })
                ) : (
                  <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-4 sm:p-8">
                    <div className="bg-white/10 backdrop-blur p-3 sm:p-6 border border-white/20">
                      <h3 className="text-white text-xl font-bold mb-6 text-center">My board</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-white">
                          <div className="text-2xl mb-2">📋</div>
                          <p className="text-sm font-medium">Attempted Tests</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-white">
                          <div className="text-2xl mb-2">📚</div>
                          <p className="text-sm font-medium">My Library</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-white">
                          <div className="text-2xl mb-2">📅</div>
                          <p className="text-sm font-medium">Exam Calendar</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-white">
                          <div className="text-2xl mb-2">📊</div>
                          <p className="text-sm font-medium">My Test Series</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats Strip */}
      <section className="py-6 bg-background">
        <div className="container-main">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {impactStats.map((stat) => (
              <div
                key={stat.label}
                className={`flex items-center gap-3 rounded-2xl border border-white/70 bg-gradient-to-br ${stat.gradient} p-4 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/85 text-primary">
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <p className="font-display text-2xl text-slate-900 leading-none">{stat.value}</p>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-600">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-14 bg-background border-b border-border">
        <div className="container-main space-y-6">
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
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
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
                              <img
                                src={sub.logo_url}
                                alt=""
                                className="w-8 h-8 object-contain"
                              />
                            ) : selectedCategory.logo_url ? (
                              <img
                                src={selectedCategory.logo_url}
                                alt=""
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
          <div className="container-main space-y-6">
            <div className="space-y-6">
              {topBanners.map((banner) => {
                const card = (
                  <div
                    className="group relative block overflow-hidden"
                  >
                    <img
                      src={banner.image_url}
                      alt={banner.title || 'Featured banner'}
                      className="h-[260px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:h-[340px] lg:h-[420px]"
                      loading="lazy"
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
          <div className="container-main space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">Community Pulse</p>
                <h2 className="font-display text-3xl font-bold text-slate-900 mt-2">Most Attempted Exams</h2>
                <p className="text-muted-foreground mt-2">Live ranking of the exams BharatMock students attempt the most.</p>
              </div>
              <Link href="/exams" className="inline-flex">
                <Button variant="secondary" className="gap-2">
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
                {mostAttemptedExams.map((exam, index) => {
                  const statusLabel = exam.status ? exam.status.charAt(0).toUpperCase() + exam.status.slice(1) : 'Ongoing';
                  const difficultyLabel = exam.difficulty ? exam.difficulty.charAt(0).toUpperCase() + exam.difficulty.slice(1) : 'Medium';
                  const languageLabel = exam.supports_hindi ? 'English + हिंदी' : 'English only';
                  const examUrl = exam.url_path || `/exams/${exam.slug || exam.id}`;

                  return (
                    <div
                      key={exam.id || index}
                      className="group relative flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.08)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.12)] hover:border-slate-300 transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />
                      
                      <div className="p-4 bg-gradient-to-br from-slate-50/50 via-white to-white">
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold shadow-sm">{statusLabel}</span>
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-xs font-semibold shadow-sm">{difficultyLabel}</span>
                        </div>

                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200/60 text-xs font-semibold shadow-sm">{exam.is_free ? 'Free' : 'Premium'}</span>
                          {exam.category && (
                            <span className="px-2.5 py-0.5 rounded-md border border-slate-200/60 bg-white text-slate-600 text-xs font-medium shadow-sm">
                              {exam.category}
                            </span>
                          )}
                        </div>

                        <h3 className="font-display text-base font-semibold text-slate-900 leading-snug mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                          {exam.title}
                        </h3>
                      </div>

                      <div className="px-4 pb-4 flex flex-col gap-3 flex-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50/80 border border-sky-100 text-xs text-sky-700 w-fit">
                          <Languages className="h-3.5 w-3.5" />
                          <span className="font-medium">{languageLabel}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50">
                              <Clock className="h-3.5 w-3.5 text-sky-600" />
                            </div>
                            <span className="font-medium">{exam.duration} mins</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50">
                              <FileText className="h-3.5 w-3.5 text-sky-600" />
                            </div>
                            <span className="font-medium">{exam.total_questions} Qs</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50">
                              <TrendingUp className="h-3.5 w-3.5 text-sky-600" />
                            </div>
                            <span className="font-medium">{exam.total_marks} Marks</span>
                          </div>
                        </div>

                        <div className="mt-auto pt-2">
                          <Link href={examUrl} className="inline-flex w-full">
                            <Button className="w-full rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:from-amber-500 hover:via-orange-600 hover:to-orange-700 transition-all duration-300 group/btn" size="sm">
                              View Details
                              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

       {/* Learning Journey CTA */}
      <section className="py-6 -mt-6 bg-background">
        <div className="container-main">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-blue-100 to-sky-50 border border-primary/15 px-5 py-9 sm:px-8 text-center shadow-lg">
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
            <div className="relative space-y-5 sm:space-y-6">
              <h2 className="font-display text-xl leading-tight md:text-3xl font-bold text-slate-900">
                Start preparing for your dream government job
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

              <Link href="/exams" className="inline-flex">
                <Button size="sm" className="rounded-full px-6 shadow-xl">
                  Get Free Mock
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose BharatMock - Sixth Section */}
      <section className="py-12 bg-background">
        <div className="container-main">
          <div className="rounded-3xl border border-slate-200 bg-white/90 shadow-sm px-6 py-10 sm:px-10">
            <div className="flex flex-col gap-4 text-center max-w-3xl mx-auto">
              <span className="inline-flex items-center justify-center gap-2 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
                <Shield className="h-4 w-4" /> Trusted by toppers
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900">
                Why students pick <span className="text-primary">BharatMock</span>
              </h2>
              <p className="text-slate-600">
                Simple, reliable prep blocks— curated tests, instant analytics, and fast revision loops.
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
        <div className="container-main">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 sm:px-6 sm:py-4 overflow-hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Featured On</p>
                <h3 className="font-display text-lg font-semibold text-slate-800">Trusted by India’s leading media and hiring partners</h3>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-r from-white via-slate-50 to-primary/5 px-2 py-2">
              <div className="flex gap-8 animate-featured-marquee">
                {[...featuredPartners, ...featuredPartners].map((partner, index) => (
                  <div
                    key={`${partner.name}-${index}`}
                    className="h-16 sm:h-20 flex items-center opacity-95 hover:opacity-100 transition drop-shadow-sm"
                  >
                    <img
                      src={partner.url}
                      alt={partner.name}
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
          }
        `}</style>
      </section>
      
      {/* BharatMock Pass Feature Section */}
      <section className="py-12 bg-background border-y border-slate-100">
        <div className="container-main">
          <div className="relative isolate overflow-hidden rounded-[44px] bg-white shadow-[0_40px_80px_-60px_rgba(15,23,42,0.8)]">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-transparent to-white" />
            <div className="absolute -top-10 -right-4 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] items-center p-6 sm:p-10 lg:p-14 relative z-10">
              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.4em] text-primary/80">
                    <Sparkles className="h-4 w-4" /> Power Prep Bundle
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight">
                    Enroll in Test Series for <span className="text-primary">670+ exams</span> with BharatMock Pass
                  </h2>
                  <p className="text-slate-600 max-w-2xl">
                    Unlock bilingual mock tests, structured analysis, and guided revision loops built for serious aspirants. One pass, unlimited high-quality attempts.
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
                  <Button size="lg" className="gap-2 rounded-full px-8 shadow-lg">
                    Explore BharatMock Pass
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="lg" className="rounded-full text-slate-500 hover:text-slate-900">
                    View plan comparison
                  </Button>
                </div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Unlimited attempts • Instant activation • Cancel anytime</p>
              </div>

              <div className="relative">
                <div className="absolute -top-6 right-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                <div className="relative mx-auto max-w-sm rounded-[36px] bg-gradient-to-b from-white via-slate-50 to-sky-50 p-6 shadow-2xl">
                  <div className="rounded-[28px] bg-white/90 p-4 border border-white/70 backdrop-blur">
                    <Image
                      src="/assets/image1.png"
                      alt="Learner reviewing BharatMock pass dashboard"
                      width={640}
                      height={480}
                      className="w-full h-auto"
                    />
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
                      <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center">
                        <p className="text-lg font-semibold text-primary">24</p>
                        <p>Mock sets unlocked</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center">
                        <p className="text-lg font-semibold text-emerald-600">92%</p>
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
        <div className="container-main">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground mb-2">Featured Exams</h2>
              <p className="text-muted-foreground">Practice with our top mock tests</p>
            </div>
            <Link href="/exams">
              <Button variant="outline">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
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
              {exams.map((exam) => {
                const statusLabel = exam.status ? exam.status.charAt(0).toUpperCase() + exam.status.slice(1) : 'Ongoing';
                const difficultyLabel = exam.difficulty ? exam.difficulty.charAt(0).toUpperCase() + exam.difficulty.slice(1) : 'Medium';
                const languageLabel = exam.supports_hindi ? 'English + हिंदी' : 'English only';
                const examUrl = exam.url_path || `/exams/${exam.slug || exam.id}`;
                
                return (
                  <div
                    key={exam.id}
                    className="group relative flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.08)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.12)] hover:border-slate-300 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />
                    
                    <div className="p-4 bg-gradient-to-br from-slate-50/50 via-white to-white">
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold shadow-sm">{statusLabel}</span>
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-xs font-semibold shadow-sm">{difficultyLabel}</span>
                      </div>

                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200/60 text-xs font-semibold shadow-sm">{exam.is_free ? 'Free' : 'Premium'}</span>
                        {exam.category && (
                          <span className="px-2.5 py-0.5 rounded-md border border-slate-200/60 bg-white text-slate-600 text-xs font-medium shadow-sm">
                            {exam.category}
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-base font-semibold text-slate-900 leading-snug mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                        {exam.title}
                      </h3>
                    </div>

                    <div className="px-4 pb-4 flex flex-col gap-3 flex-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50/80 border border-sky-100 text-xs text-sky-700 w-fit">
                        <Languages className="h-3.5 w-3.5" />
                        <span className="font-medium">{languageLabel}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50">
                            <Clock className="h-3.5 w-3.5 text-sky-600" />
                          </div>
                          <span className="font-medium">{exam.duration} mins</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50">
                            <FileText className="h-3.5 w-3.5 text-sky-600" />
                          </div>
                          <span className="font-medium">{exam.total_questions} Qs</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50">
                            <TrendingUp className="h-3.5 w-3.5 text-sky-600" />
                          </div>
                          <span className="font-medium">{exam.total_marks} Marks</span>
                        </div>
                      </div>

                      <div className="mt-auto pt-2">
                        <Link href={examUrl} className="inline-flex w-full">
                          <Button className="w-full rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:from-amber-500 hover:via-orange-600 hover:to-orange-700 transition-all duration-300 group/btn" size="sm">
                            View Details
                            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {midBanners.length > 0 && (
        <section className="py-10 bg-background border-b border-border">
          <div className="container-main space-y-6">
            <div className="space-y-6">
              {midBanners.map((banner) => {
                const card = (
                  <div className="group relative block overflow-hidden">
                    <img
                      src={banner.image_url}
                      alt={banner.title || 'Featured banner'}
                      className="h-[240px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:h-[320px] lg:h-[400px]"
                      loading="lazy"
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
        <div className="container-main text-center space-y-2">
          <div className="flex justify-center">
            
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            Ready to Start Your Journey?
          </h2>
          <p className="text-white/90 max-w-2xl mx-auto">
            Join thousands of successful students who have achieved their dreams with Bharat Mock.
          </p>
          <Link href="/register">
            <Button
              size="xl"
              className="bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-0.5"
            >
              Get Started Free <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
