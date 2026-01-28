"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { 
  Search, Clock, BookOpen, TrendingUp, ArrowRight, 
  Bell, Calendar, FileText, Award, Download, ExternalLink,
  BookMarked, Target, Lightbulb, ChevronRight, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { getExamUrl } from '@/lib/utils/examUrl';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface CategoryPageProps {
  categorySlug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  icon: string | null;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number;
  total_marks: number;
  total_questions: number;
  difficulty: string;
  status: string;
  start_date: string;
  end_date: string;
  is_free: boolean;
  price: number;
  logo_url: string | null;
  thumbnail_url: string | null;
  slug: string;
  url_path: string | null;
  subcategory: string | null;
  supports_hindi?: boolean;
}

interface CategoryNotification {
  id: string;
  title: string;
  notification_type: string;
  notification_date: string;
  description?: string | null;
  link_url?: string | null;
}

interface SyllabusTopic {
  id: string;
  topic_name: string;
}

interface SyllabusSection {
  id: string;
  subject_name: string;
  description?: string | null;
  category_syllabus_topics: SyllabusTopic[];
}

interface Cutoff {
  id: string;
  year: string;
  cutoff_category: string;
  marks: number;
  exam_name?: string | null;
}

interface ImportantDate {
  id: string;
  event_name: string;
  event_date: string | null;
  event_date_text: string | null;
  link_url?: string | null;
}

interface PreparationTip {
  id: string;
  title: string;
  description: string;
  tip_type: string;
}

interface SubcategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  exam_categories?: {
    name: string;
    slug: string;
  };
}

export function CategoryPage({ categorySlug }: CategoryPageProps) {
  const [activeTab, setActiveTab] = useState('examCategories');
  const [category, setCategory] = useState<Category | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [notifications, setNotifications] = useState<CategoryNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [syllabus, setSyllabus] = useState<SyllabusSection[]>([]);
  const [cutoffs, setCutoffs] = useState<Cutoff[]>([]);
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [preparationTips, setPreparationTips] = useState<PreparationTip[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState('');
  const [contentLoadedFor, setContentLoadedFor] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);

  useEffect(() => {
    fetchCategoryData();
  }, [categorySlug, page, difficulty, subcategory, search]);

  const fetchCategoryData = async () => {
    setLoading(true);
    try {
      const categoryRes = await fetch(`${API_BASE}/taxonomy/category/${categorySlug}`);
      const categoryData = await categoryRes.json();
      if (categoryData.success) {
        setCategory(categoryData.data);
        if (categoryData.data?.id) {
          fetchSubcategories(categoryData.data.id);
        }
      }

      const examsRes = await fetch(
        `${API_BASE}/taxonomy/category/${categorySlug}/exams?page=${page}&limit=12${difficulty ? `&difficulty=${difficulty}` : ''}${subcategory ? `&subcategory=${subcategory}` : ''}${search ? `&search=${search}` : ''}`
      );
      const examsData = await examsRes.json();
      
      if (examsData.success) {
        setExams(examsData.data);
        setTotalPages(examsData.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch category data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategories = async (categoryId: string) => {
    if (!API_BASE) {
      return;
    }
    setSubcategoriesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/taxonomy/subcategories?category_id=${categoryId}`);
      const data = await res.json();
      if (data.success) {
        setSubcategories(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
    } finally {
      setSubcategoriesLoading(false);
    }
  };

  const fetchContentData = async (categoryId: string) => {
    if (!API_BASE) {
      return;
    }
    setContentLoading(true);
    setContentError('');
    setNotificationsLoading(true);
    try {
      const fetchEndpoint = async (path: string) => {
        const res = await fetch(`${API_BASE}${path}`);
        const data = await res.json();
        if (!res.ok || data.success === false) {
          throw new Error(data.message || 'Failed to load content');
        }
        return data.data;
      };

      const [notificationsData, syllabusData, cutoffsData, datesData, tipsData] = await Promise.all([
        fetchEndpoint(`/taxonomy/categories/${categoryId}/notifications`),
        fetchEndpoint(`/taxonomy/categories/${categoryId}/syllabus`),
        fetchEndpoint(`/taxonomy/categories/${categoryId}/cutoffs`),
        fetchEndpoint(`/taxonomy/categories/${categoryId}/dates`),
        fetchEndpoint(`/taxonomy/categories/${categoryId}/tips`)
      ]);

      setNotifications(notificationsData || []);
      setSyllabus(syllabusData || []);
      setCutoffs(cutoffsData || []);
      setImportantDates(datesData || []);
      setPreparationTips(tipsData || []);
      setContentLoadedFor(categoryId);
    } catch (error: any) {
      console.error(error);
      setContentError(error.message || 'Failed to load section content');
    } finally {
      setNotificationsLoading(false);
      setContentLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      upcoming: 'bg-blue-100 text-blue-700',
      ongoing: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700'
    };
    return badges[status as keyof typeof badges] || badges.upcoming;
  };

  const getDifficultyBadge = (diff: string) => {
    const badges = {
      easy: 'bg-emerald-100 text-emerald-700',
      medium: 'bg-amber-100 text-amber-700',
      hard: 'bg-red-100 text-red-700'
    };
    return badges[diff as keyof typeof badges] || badges.medium;
  };

  useEffect(() => {
    fetchCategoryData();
  }, [categorySlug, page, difficulty, subcategory, search]);

  useEffect(() => {
    if (category?.id && category.id !== contentLoadedFor) {
      fetchContentData(category.id);
    }
  }, [category?.id, contentLoadedFor]);

  const formattedDates = useMemo(() => {
    return importantDates.map((item) => ({
      id: item.id,
      event: item.event_name,
      displayDate: item.event_date_text || (item.event_date ? new Date(item.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBA'),
      link: item.link_url || undefined,
    }));
  }, [importantDates]);

  const summaryStats = useMemo(() => {
    const totalExams = exams.length;
    const freeExams = exams.filter((exam) => exam.is_free).length;
    const avgQuestions = totalExams ? Math.round(exams.reduce((sum, exam) => sum + (exam.total_questions || 0), 0) / totalExams) : 0;
    return [
      { label: 'Exam Categories', value: subcategories.length || '—' },
      { label: 'Mock Tests', value: totalExams || '—' },
      { label: 'Free Tests', value: freeExams || '—' },
      { label: 'Avg. Questions', value: avgQuestions || '—' }
    ];
  }, [exams, subcategories]);

  if (loading && !category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <Button onClick={() => window.location.href = '/exams'}>Browse All Exams</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b border-border bg-primary text-white">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-16 flex flex-col lg:flex-row gap-12 items-center">
          {category.logo_url && (
            <div className="w-32 h-32 rounded-3xl bg-white/10 shadow-xl flex items-center justify-center overflow-hidden border border-white/30">
              <img src={category.logo_url} alt={category.name} className="w-full h-full object-contain" />
            </div>
          )}
          <div className="flex-1 text-center lg:text-left space-y-6">
            <nav className="flex items-center justify-center lg:justify-start gap-2 text-sm text-white/80">
              <Link href="/" className="hover:underline">Home</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="capitalize text-white">{category.name}</span>
            </nav>
            <h1 className="text-4xl lg:text-5xl font-semibold leading-tight">
              {category.name} Exam
            </h1>
            {category.description && (
              <p className="text-lg text-white/80 max-w-3xl mx-auto lg:mx-0">
                {category.description}
              </p>
            )}
            <div className="hidden" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-border bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'examCategories', label: 'Exam Categories', icon: Layers },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'syllabus', label: 'Syllabus', icon: FileText },
              { id: 'cutoffs', label: 'Cutoffs', icon: Award },
              { id: 'dates', label: 'Important Dates', icon: Calendar },
              { id: 'tips', label: 'Preparation Tips', icon: Lightbulb },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-10" id="examCategories">
        {activeTab === 'examCategories' && (
          <div className="space-y-6">
            {subcategoriesLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : subcategories.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <Layers className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No exam categories configured</h3>
                <p className="text-muted-foreground">Add exam categories in the admin panel to showcase them here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/${category.slug}/${sub.slug}`}
                    className="group bg-white border border-slate-200 rounded-3xl p-6 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col gap-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Exam Category</span>
                        <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                          {sub.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3">
                        {category.logo_url && (
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden">
                            <img src={category.logo_url} alt={`${category.name} logo`} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <ChevronRight className="h-6 w-6" />
                        </div>
                      </div>
                    </div>
                    {sub.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{sub.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm text-primary font-medium">
                      <span>Open detailed page</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Exams Tab */}
        {activeTab === 'exams' && (
          <div>
            <div className="bg-card rounded-xl border border-border p-6 mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search exams..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                <select
                  value={difficulty}
                  onChange={(e) => {
                    setDifficulty(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : exams.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No exams found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {exams.map((exam) => (
                    <Link
                      key={exam.id}
                      href={getExamUrl(exam)}
                      className="group bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden"
                    >
                      {exam.thumbnail_url && (
                        <div className="aspect-video w-full overflow-hidden bg-muted">
                          <img
                            src={exam.thumbnail_url}
                            alt={exam.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                            {exam.title}
                          </h3>
                          {exam.logo_url && (
                            <img src={exam.logo_url} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {exam.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(exam.status)}`}>
                            {exam.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyBadge(exam.difficulty)}`}>
                            {exam.difficulty}
                          </span>
                          {exam.subcategory && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              {exam.subcategory}
                            </span>
                          )}
                          {exam.supports_hindi && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 flex items-center gap-1">
                              <span>🌐</span>
                              <span>English + हिंदी</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{exam.duration} min</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              <span>{exam.total_questions} Qs</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" />
                              <span>{exam.total_marks} marks</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-lg">
                            {exam.is_free ? 'Free' : `₹${exam.price}`}
                          </span>
                          <Button variant="ghost" size="sm" className="group-hover:text-primary">
                            View Details
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? 'default' : 'outline'}
                            onClick={() => setPage(pageNum)}
                            size="sm"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Latest Notifications</h2>
            {contentLoading && notifications.length === 0 ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : contentError && notifications.length === 0 ? (
              <p className="text-center text-sm text-destructive">{contentError}</p>
            ) : notifications.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No notifications found.</p>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div key={notification.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Bell className="h-5 w-5 text-primary" />
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            notification.notification_type === 'exam' ? 'bg-blue-100 text-blue-700' :
                            notification.notification_type === 'result' ? 'bg-green-100 text-green-700' :
                            notification.notification_type === 'admit_card' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {notification.notification_type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{notification.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(notification.notification_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        {notification.description && (
                          <p className="text-sm text-muted-foreground mt-2">{notification.description}</p>
                        )}
                      </div>
                      {notification.link_url ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={notification.link_url} target="_blank" rel="noreferrer">
                            View Details
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Syllabus Tab */}
        {activeTab === 'syllabus' && (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Exam Syllabus</h2>
            <div className="grid gap-6">
              {contentLoading && syllabus.length === 0 ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : syllabus.length === 0 ? (
                <p className="text-sm text-muted-foreground">Syllabus details will be published soon.</p>
              ) : syllabus.map((section) => (
                <div key={section.id} className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BookMarked className="h-5 w-5 text-primary" />
                    {section.subject_name}
                  </h3>
                  {section.description && (
                    <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
                  )}
                  <div className="grid md:grid-cols-2 gap-3">
                    {(section.category_syllabus_topics || []).map((topic) => (
                      <div key={topic.id} className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{topic.topic_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cutoffs Tab */}
        {activeTab === 'cutoffs' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Previous Year Cutoffs</h2>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 font-semibold">Year</th>
                    <th className="text-left p-4 font-semibold">Category</th>
                    <th className="text-left p-4 font-semibold">Cutoff Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {contentLoading && cutoffs.length === 0 ? (
                    <tr>
                      <td className="p-4 text-center text-muted-foreground" colSpan={3}>
                        <LoadingSpinner />
                      </td>
                    </tr>
                  ) : cutoffs.length === 0 ? (
                    <tr>
                      <td className="p-4 text-center text-muted-foreground" colSpan={3}>
                        Cutoff data will be available soon.
                      </td>
                    </tr>
                  ) : (
                    cutoffs.map((cutoff) => (
                      <tr key={cutoff.id} className="border-t border-border hover:bg-muted/50">
                        <td className="p-4">{cutoff.year}</td>
                        <td className="p-4">{cutoff.cutoff_category}</td>
                        <td className="p-4 font-semibold text-primary">{cutoff.marks}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Important Dates Tab */}
        {activeTab === 'dates' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Important Dates</h2>
            <div className="space-y-4">
              {contentLoading && formattedDates.length === 0 ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : formattedDates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Important dates will be announced soon.</p>
              ) : (
                formattedDates.map((item) => (
                  <div key={item.id} className="bg-card border border-border rounded-lg p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{item.event}</h3>
                        <p className="text-sm text-muted-foreground">Mark your calendar</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">{item.displayDate}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Preparation Tips Tab */}
        {activeTab === 'tips' && (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Preparation Tips & Strategy</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {contentLoading && preparationTips.length === 0 ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : preparationTips.length === 0 ? (
                <p className="text-sm text-muted-foreground">Preparation tips will be available soon.</p>
              ) : (
                preparationTips.map((tip) => (
                  <div key={tip.id} className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{tip.title}</h3>
                        <p className="text-sm text-muted-foreground">{tip.description}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
