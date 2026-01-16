import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Building2, Users, Award, CheckCircle, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExamCard } from '@/components/exam/ExamCard';
import { CollegeCard } from '@/components/college/CollegeCard';
import { ArticleCard } from '@/components/article/ArticleCard';
import { examService } from '@/lib/services/examService';
import { collegeService } from '@/lib/services/collegeService';
import { articleService } from '@/lib/services/articleService';
import { Exam, College, Article } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingStates';

const stats = [
  { icon: BookOpen, value: '500+', label: 'Mock Tests' },
  { icon: Building2, value: '2000+', label: 'Colleges' },
  { icon: Users, value: '1M+', label: 'Students' },
  { icon: Award, value: '95%', label: 'Success Rate' },
];

const features = [
  'Comprehensive mock tests for all major exams',
  'Detailed performance analytics and insights',
  'Expert-curated study materials',
  'Personalized learning paths',
];

export default function Index() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examsData, collegesData, articlesData] = await Promise.all([
          examService.getFeaturedExams(),
          collegeService.getFeaturedColleges(),
          articleService.getFeaturedArticles(),
        ]);
        setExams(examsData);
        setColleges(collegesData);
        setArticles(articlesData);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative gradient-hero overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-50" />
        <div className="container-main relative py-20 md:py-32">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-background mb-6 animate-slide-up">
              Ace Your Exams with{' '}
              <span className="text-primary">Smart Preparation</span>
            </h1>
            <p className="text-lg md:text-xl text-background/80 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Join millions of students preparing for JEE, NEET, CAT, UPSC and more. 
              Practice with our comprehensive mock tests and detailed analytics.
            </p>
            
            <div className="flex flex-wrap gap-4 mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/exams">
                <Button variant="hero" size="xl">
                  Start Practicing
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="heroOutline" size="xl">
                  Create Free Account
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-background/80 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-card border-b border-border">
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

      {/* Featured Exams */}
      <section className="section-padding bg-background">
        <div className="container-main">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground mb-2">Featured Exams</h2>
              <p className="text-muted-foreground">Practice with our top mock tests</p>
            </div>
            <Link to="/exams">
              <Button variant="outline">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {exams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Colleges */}
      <section className="section-padding bg-muted/30">
        <div className="container-main">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground mb-2">Top Colleges</h2>
              <p className="text-muted-foreground">Explore India's best institutions</p>
            </div>
            <Link to="/colleges">
              <Button variant="outline">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {colleges.map((college) => (
                <CollegeCard key={college.id} college={college} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Latest Articles */}
      <section className="section-padding bg-background">
        <div className="container-main">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground mb-2">Latest Articles</h2>
              <p className="text-muted-foreground">Expert tips and preparation strategies</p>
            </div>
            <Link to="/articles">
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

      {/* CTA Section */}
      <section className="py-20 gradient-hero">
        <div className="container-main text-center">
          <GraduationCap className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="font-display text-3xl md:text-4xl font-bold text-background mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-background/80 max-w-2xl mx-auto mb-8">
            Join thousands of successful students who have achieved their dreams with EduPrep.
          </p>
          <Link to="/register">
            <Button variant="hero" size="xl">
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
