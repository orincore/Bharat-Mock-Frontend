"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getExamUrl } from '@/lib/utils/examUrl';
import { 
  ArrowRight, ArrowUpRight, Award, BookOpen, CheckCircle, Sparkles, Users, 
  Smartphone, Download, Apple, Play, Target, TrendingUp, Shield,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight
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

const stats = [
  { icon: BookOpen, value: '500+', label: 'Mock Tests' },
  { icon: CheckCircle, value: '120+', label: 'Study Plans' },
  { icon: Users, value: '1M+', label: 'Students' },
  { icon: Award, value: '95%', label: 'Success Rate' },
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
    <div className="min-h-screen">
      {/* Dynamic Hero Section */}
      <section className="relative w-full bg-[#e7f1ff]">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6 order-2 lg:order-1">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                {heroTitle}
              </h1>
              <div className="space-y-3">
                {heroDescriptions.map((paragraph, idx) => (
                  <p key={idx} className="text-base sm:text-lg text-gray-600 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Exam Buttons Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-4">
                {buttonCardMedia.slice(0, 4).map((item, idx) => {
                  const examIcons = ['📋', '📚', '📅', '📊'];
                  const examLabels = item.headline || ['Delhi Police Head Constable', 'RRB Group D', 'Exam Calendar', 'My Test Series'][idx];
                  const examDates = item.description || ['Exam Date: 7th January 2026', 'Exam Date: 8th January 2026', '', ''][idx];
                  
                  return (
                    <Link
                      key={idx}
                      href={item.cta_url || heroPrimaryCta?.url || '/exams'}
                      className="group relative bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200"
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

            {/* Right Illustration */}
            <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md lg:max-w-lg">
                {heroMediaPrimary ? (
                  renderMediaAsset(heroMediaPrimary, 'w-full h-auto object-contain', { disableShadow: true })
                ) : (
                  <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-8">
                    <div className="bg-white/10 backdrop-blur p-6 border border-white/20">
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

      {heroBanners.length > 0 && (
        <section className="py-10 bg-background border-b border-border">
          <div className="container-main space-y-6">
            <div className="space-y-6">
              {heroBanners.map((banner) => (
                <div
                  key={banner.id}
                  className="rounded-[36px] bg-muted/40 px-6 py-8 lg:px-10 lg:py-12"
                >
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Featured</p>
                        <h3 className="font-display text-3xl font-bold text-foreground leading-tight">
                          {banner.title}
                        </h3>
                        {banner.subtitle && (
                          <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
                            {banner.subtitle}
                          </p>
                        )}
                      </div>
                      {banner.button_text && banner.link_url && (
                        <Button
                          asChild
                          className="inline-flex items-center gap-2 text-base h-12 px-6 rounded-full"
                        >
                          <Link href={banner.link_url}>
                            {banner.button_text}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                    <div className="flex-1 w-full">
                      <div className="relative w-full h-60 lg:h-72">
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
              <div className="grid grid-cols-2 gap-2 pb-2 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:flex-wrap lg:overflow-x-visible">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition border ${
                      selectedCategoryId === category.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
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

      {/* Why Choose BharatMock - Sixth Section */}
      <section className="py-24">
        <div className="container-main">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-sky-50 via-white to-blue-100 border border-blue-100/70">
            <div className="absolute inset-x-0 -top-10 flex justify-center opacity-40 blur-3xl">
              <div className="w-2/3 h-40 bg-gradient-to-r from-sky-200 via-indigo-200 to-purple-200" />
            </div>

            <div className="relative px-6 py-12 sm:px-10 lg:px-16">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-white/80 text-sky-700 border border-sky-200 shadow-sm">
                  <Shield className="h-4 w-4" /> Built around actual exam patterns
                </span>
                <h2 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 mt-6">
                  Why Choose <span className="text-primary">BharatMock</span>
                </h2>
                <p className="text-lg text-gray-600 mt-4">
                  Reliable preparation, live mentorship, and carefully curated resources that mirror the real exam experience.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7 grid md:grid-cols-2 gap-5">
                  {whyChooseFeatures.map((feature, index) => (
                    <div
                      key={feature.title}
                      className="group relative rounded-2xl border border-slate-100 bg-white/80 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                          <feature.icon className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Advantage #{index + 1}</p>
                          <h3 className="font-display text-xl text-slate-900">{feature.title}</h3>
                        </div>
                      </div>
                      <p className="mt-4 text-slate-600 leading-relaxed">{feature.description}</p>
                      <div className="mt-6 h-1 w-16 rounded-full bg-gradient-to-r from-primary/60 to-sky-400 transition group-hover:w-24" />
                    </div>
                  ))}
                </div>

                <div className="lg:col-span-5">
                  <div className="rounded-3xl bg-white/80 border border-blue-100/60 p-6 shadow-lg backdrop-blur">
                    <h3 className="font-display text-2xl font-bold text-slate-900 mb-4">Why learners stay with us</h3>
                    <p className="text-slate-600 mb-8">
                      A structured journey that blends expert guidance, analytics, and mock drills so you remain ahead of the cut-off curve.
                    </p>
                    <div className="space-y-6">
                      {benefits.map((benefit) => (
                        <div key={benefit.number} className="flex gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary text-white font-semibold flex items-center justify-center shadow">
                            {benefit.number}
                          </div>
                          <div>
                            <p className="text-sm uppercase tracking-wide text-slate-500">Reason {benefit.number}</p>
                            <h4 className="font-display text-lg text-slate-900">{benefit.title}</h4>
                            <p className="text-sm text-slate-600 leading-relaxed">{benefit.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-8 rounded-2xl border border-primary/30 bg-white/70 p-5 flex flex-col gap-3">
                      <p className="text-sm text-slate-600">
                        Ready to dive deeper into guided learning, free mocks, and expert-designed practice? Browse the latest exam-wise mock tests directly from BharatMock.
                      </p>
                      <Link
                        href="/exams"
                        className="inline-flex items-center gap-2 self-start rounded-full bg-primary text-white px-5 py-2 font-semibold shadow hover:bg-primary/90"
                      >
                        Explore mock tests
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Journey CTA */}
      <section className="py-20">
        <div className="container-main">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-primary/15 via-blue-100 to-sky-50 border border-primary/20 px-6 py-12 sm:px-10 text-center shadow-lg">
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900">
                Start preparing for your dream government job
              </h2>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                {learningJourneySteps.map((step, index) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <div
                      className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm flex items-center gap-2 border ${step.pillClass}`}
                    >
                      {step.label}
                    </div>
                    {index < learningJourneySteps.length - 1 && (
                      <ChevronRight className={`h-4 w-4 ${step.arrowClass}`} />
                    )}
                  </div>
                ))}
              </div>

              <Link href="/exams" className="inline-flex mt-10">
                <Button size="lg" className="shadow-xl">
                  Get Free Mock
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Exams */}
      <section className="section-padding bg-muted/30">
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
                <div key={index} className="card-interactive overflow-hidden h-full flex flex-col border border-border rounded-xl p-5 space-y-4">
                  <Skeleton className="h-40 w-full rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Skeleton className="h-8 w-24 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {exams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-background">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-4xl font-bold text-foreground mb-12 text-center">
              FAQ's
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div 
                  key={index}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium text-foreground">
                      {index + 1}. {faq}
                    </span>
                    {expandedFaq === index ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  {expandedFaq === index && (
                    <div className="px-6 py-4 bg-muted/30 border-t border-border">
                      <p className="text-muted-foreground">
                        This is a detailed answer to the question. Our platform provides comprehensive solutions for all your exam preparation needs.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Latest Blogs */}
      <section className="section-padding bg-muted/30">
        <div className="container-main">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground mb-2">Latest Blogs</h2>
              <p className="text-muted-foreground">Expert tips and preparation strategies</p>
            </div>
            <Link href="/blogs">
              <Button variant="outline">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-card border-y border-border">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3">
                  <stat.icon className="h-6 w-6" />
                </div>
                <p className="font-display text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 gradient-hero">
        <div className="container-main text-center">
          <div className="flex justify-center mb-6">
            
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-background mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-background/80 max-w-2xl mx-auto mb-8">
            Join thousands of successful students who have achieved their dreams with Bharat Mock.
          </p>
          <Link href="/register">
            <Button
              size="xl"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-xl shadow-secondary/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              Get Started Free <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
