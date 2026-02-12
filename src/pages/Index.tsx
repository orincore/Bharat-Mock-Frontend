"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getExamUrl } from '@/lib/utils/examUrl';
import { 
  ArrowRight, BookOpen, Users, Award, CheckCircle,
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
import { HomepageHero, HomepageHeroMediaItem, HomepageData } from '@/lib/api/homepageService';

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
    if (heroData?.media_items?.length) {
      return heroData.media_items;
    }
    return fallbackHero.media;
  }, [heroData]);

  const heroMediaLayout = heroData?.media_layout || fallbackHero.mediaLayout;
  const heroMediaCount = heroMedia.length;
  const backgroundVideoUrl = heroData?.background_video_url || '';
  const heroHasMedia = heroMediaCount > 0;
  const showSlider = heroMediaLayout === 'slideshow' && heroMediaCount > 1;
  const primaryMediaIndex = showSlider ? activeHeroMedia : 0;
  const heroMediaPrimary = heroHasMedia ? heroMedia[Math.min(primaryMediaIndex, heroMediaCount - 1)] : undefined;
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

  const renderMediaAsset = (asset?: HomepageHeroMediaItem, className = 'w-full h-80 md:h-96 rounded-[28px] object-cover') => {
    if (!asset) return null;
    if (asset.asset_type === 'video') {
      return (
        <video
          src={asset.url}
          className={`${className} shadow-[0_25px_80px_-40px_rgba(15,23,42,0.9)]`}
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
        className={`${className} shadow-[0_25px_80px_-40px_rgba(15,23,42,0.9)]`}
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
  const visibleSubcategories = showAllSubcategories
    ? selectedCategorySubcategories
    : selectedCategorySubcategories.slice(0, 8);
  const remainingSubcategoryCount = Math.max(selectedCategorySubcategories.length - visibleSubcategories.length, 0);

  return (
    <div className="min-h-screen">
      {/* Dynamic Hero Section */}
      <section className="relative w-full min-h-[100svh] overflow-hidden bg-[#020617] text-white">
        {backgroundVideoUrl ? (
          <video
            className="absolute inset-0 w-full h-full object-cover object-center"
            src={backgroundVideoUrl}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          heroMediaPrimary && (
            <img
              src={heroMediaPrimary.url}
              alt={heroMediaPrimary.alt_text || heroTitle}
              className="absolute inset-0 w-full h-full object-cover object-center"
              aria-hidden="true"
            />
          )
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-[#01030d]/60 via-[#010718]/55 to-[#030b1f]/60" />
        <div className="relative z-10 flex flex-col justify-center min-h-[100svh] px-6 py-16 md:px-12">
          <div className="max-w-5xl">
            <div className="space-y-6">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {heroTitle}
              </h1>
              {heroSubtitle && (
                <p className="text-lg text-white/80 max-w-2xl">{heroSubtitle}</p>
              )}
              <div className="space-y-4">
                {heroDescriptions.map((paragraph, idx) => (
                  <p key={idx} className="text-lg md:text-xl text-white/80 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                {heroPrimaryCta && (
                  <Link href={heroPrimaryCta.url} className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-white text-[#0f172a] hover:bg-white/90 shadow-xl shadow-white/20"
                    >
                      {heroPrimaryCta.text}
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                )}
                {heroSecondaryCta && (
                  <Link href={heroSecondaryCta.url} className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto border-white/70 text-white bg-transparent hover:bg-white/15"
                    >
                      {heroSecondaryCta.text}
                    </Button>
                  </Link>
                )}
              </div>
            </div>

          </div>

          <div className="mt-12">
            {heroHasMedia && showSlider && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleHeroMediaNav('prev')}
                  className="p-2 rounded-full bg-white/15 text-white hover:bg-white/30 transition"
                  aria-label="Previous hero media"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleHeroMediaNav('next')}
                  className="p-2 rounded-full bg-white/15 text-white hover:bg-white/30 transition"
                  aria-label="Next hero media"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  {heroMedia.map((_, index) => (
                    <span
                      key={index}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === activeHeroMedia ? 'w-10 bg-white' : 'w-4 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {heroMediaSecondary.length > 0 && (
            <div className="relative z-10 mt-16 grid sm:grid-cols-2 gap-4 max-w-4xl">
              {heroMediaSecondary.map((asset, index) => (
                <div key={asset.url + index} className="rounded-3xl bg-white/10 p-4 border border-white/20 backdrop-blur">
                  {renderMediaAsset(asset, 'w-full h-48 rounded-2xl object-cover')}
                </div>
              ))}
            </div>
          )}
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
              <div className="flex gap-2 overflow-x-auto pb-2">
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
                      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
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
                      {remainingSubcategoryCount > 0 && (
                        <div className="flex justify-center">
                          <Button
                            variant="secondary"
                            className="mt-4"
                            onClick={() => setShowAllSubcategories(true)}
                          >
                            View {remainingSubcategoryCount} More
                          </Button>
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
      <section className="py-20 bg-background">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-foreground mb-4">
              Why Choose <span className="text-primary">BharatMock</span>?
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Choosing BharatMock means choosing reliability, proven strategies, and mentorship from experts who have successfully guided thousands of students.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {whyChooseFeatures.map((feature, index) => (
              <div key={index} className="text-center p-8 bg-card rounded-2xl border border-border hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-6">
                  <feature.icon className="h-10 w-10" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Benefits List */}
          <div className="max-w-4xl mx-auto space-y-8">
            <h3 className="font-display text-3xl font-bold text-foreground mb-8">
              Why you chose BharatMock
            </h3>
            {benefits.map((benefit) => (
              <div key={benefit.number} className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                  {benefit.number}
                </div>
                <div>
                  <h4 className="font-display text-xl font-bold text-foreground mb-2">
                    {benefit.title}
                  </h4>
                  <p className="text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Learning Journey CTA */}
      <section className="py-16 bg-background">
        <div className="container-main text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Start preparing for your dream government job
          </h2>
          <p className="text-lg text-muted-foreground mb-2">
            Learn • Practice • Analyze • Improve • Succeed
          </p>
          <Link href="/exams">
            <Button size="lg" className="mt-4">
              Get Free Mock
            </Button>
          </Link>
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
