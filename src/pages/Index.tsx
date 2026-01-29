"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getExamUrl } from '@/lib/utils/examUrl';
import Image from 'next/image';
import { 
  ArrowRight, BookOpen, Users, Award, CheckCircle,
  Smartphone, Download, Apple, Play, Target, TrendingUp, Shield,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExamCard } from '@/components/exam/ExamCard';
import { ArticleCard } from '@/components/article/ArticleCard';
import { examService } from '@/lib/api/examService';
import { articleService } from '@/lib/api/articleService';
import { taxonomyService, Category, Subcategory } from '@/lib/api/taxonomyService';
import { Exam, Article } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingStates';

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

export default function Index() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [subcategoryMap, setSubcategoryMap] = useState<Record<string, Subcategory[]>>({});
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const isCategorySectionLoading = categoriesLoading || subcategoriesLoading;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examsData, articlesData, categoriesData] = await Promise.all([
          examService.getFeaturedExams(),
          articleService.getFeaturedArticles(),
          taxonomyService.getCategories()
        ]);
        setExams(examsData);
        setArticles(articlesData);
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
  }, []);

  useEffect(() => {
    if (selectedCategoryId && !subcategoryMap[selectedCategoryId]) {
      fetchSubcategories(selectedCategoryId);
    }
  }, [selectedCategoryId, subcategoryMap]);

  const fetchSubcategories = async (categoryId: string) => {
    setSubcategoriesLoading(true);
    try {
      const data = await taxonomyService.getSubcategories(categoryId);
      const filtered = (data || []).filter((sub) => sub.name && sub.slug);
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

  return (
    <div className="min-h-screen">
      {/* Hero Section - First Section */}
      <section className="relative gradient-hero overflow-hidden">
        <div className="container-main relative py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-background mb-6 animate-slide-up">
                Your Personal Government Exam Guide
              </h1>
              <p className="text-lg text-background/90 mb-4">
                Start Your Journey With Us! Your Test, Exams, Quizzes, & Information About Latest Government Exams.
              </p>
              <p className="text-base text-background/80 mb-8">
                Learn, Practice & Crack Government Exams Today
              </p>
              <p className="text-base text-background/80 mb-8">
                Start Preparing For Government Jobs Today With Free Mock Tests, Practice Tests, Notes, Quizzes & Exam Resources!
              </p>
              
              <Link href="/exams">
                <Button
                  size="xl"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-xl shadow-secondary/30 transition-all duration-300 hover:-translate-y-0.5"
                >
                  Get Free Mock
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="hidden lg:block">
              <div>
                <div className="relative w-full h-[500px]">
                  <Image
                    src="/assets/image1.png"
                    alt="Exam preparation dashboard"
                    fill
                    sizes="(min-width: 1024px) 480px"
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-background border-b border-border">
        <div className="container-main">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
            <div>
              <p className="text-sm uppercase tracking-wide text-primary font-semibold mb-2">Choose your exam</p>
              <h2 className="font-display text-4xl font-bold text-foreground mb-3">
                Browse categories curated for every ambition
              </h2>
              <p className="text-muted-foreground max-w-2xl">
                Discover structured preparation paths for UPSC, Banking, Railways, Defence, Engineering, and more—each with tailored exams, timelines, and resources inspired by the Prepp experience.
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
              {isCategorySectionLoading && (
                <div className="inline-flex items-center gap-2" aria-live="polite" aria-busy="true">
                  <Skeleton className="h-4 w-32 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <span className="sr-only">Loading curated tracks…</span>
                </div>
              )}
              <Link href="/exams" className="w-full md:w-auto">
                <Button variant="outline" className="w-full md:w-auto">
                  View all exams
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {categoriesLoading ? (
            <div className="space-y-8" aria-live="polite" aria-busy="true">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-28 rounded-full" />
                ))}
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
              <p className="text-muted-foreground">No categories available yet. Add them from the admin panel to showcase curated exam journeys here.</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`px-5 py-2 rounded-full border whitespace-nowrap text-sm font-medium transition-all ${
                      selectedCategoryId === category.id
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card border-border hover:border-primary/40'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                {selectedCategory ? (
                  <>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                      <div>
                        <p className="text-sm uppercase tracking-wide text-muted-foreground">Explore tracks</p>
                        <h3 className="font-display text-2xl font-bold text-foreground">
                          {selectedCategory.name}
                        </h3>
                        {selectedCategory.description && (
                          <p className="text-muted-foreground mt-1 max-w-2xl">
                            {selectedCategory.description}
                          </p>
                        )}
                      </div>
                      <Link href={`/${selectedCategory.slug}`}>
                        <Button variant="outline">
                          Visit category
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>

                    {subcategoriesLoading && !selectedCategorySubcategories.length ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-live="polite" aria-busy="true">
                        {Array.from({ length: 8 }).map((_, index) => (
                          <div key={index} className="border border-border rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <Skeleton className="h-4 w-24" />
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        ))}
                      </div>
                    ) : selectedCategorySubcategories.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">No subcategories available yet.</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {selectedCategorySubcategories.slice(0, 8).map((sub) => (
                            <Link
                              key={sub.id}
                              href={`/${selectedCategory.slug}/${sub.slug}`}
                              className="border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all"
                            >
                              <div className="flex items-center gap-3 mb-2">
                                {selectedCategory.logo_url ? (
                                  <img src={selectedCategory.logo_url} alt="" className="w-10 h-10 object-contain" />
                                ) : (
                                  <BookOpen className="h-5 w-5 text-primary" />
                                )}
                                <p className="font-semibold text-foreground">{sub.name}</p>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                {sub.description || 'Focused coverage, updates, and resources.'}
                              </p>
                            </Link>
                          ))}
                        </div>
                        {selectedCategorySubcategories.length > 8 && (
                          <div className="flex justify-center mt-6">
                            <Link href={`/${selectedCategory.slug}`}>
                              <Button variant="secondary">
                                View more
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Select a category to view subcategories.</p>
                  </div>
                )}
              </div>
            </div>
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
            <Link href="/articles">
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
