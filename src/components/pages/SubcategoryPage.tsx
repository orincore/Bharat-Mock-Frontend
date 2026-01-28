'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Calendar, 
  Download, 
  FileText, 
  HelpCircle, 
  TrendingUp,
  ChevronRight,
  ExternalLink,
  Clock,
  Users,
  Award,
  Target
} from 'lucide-react';
import { examPdfService } from '@/lib/api/examPdfService';
import { generateExamPDF } from '@/lib/utils/pdfGenerator';
import { toast } from 'sonner';
import { subcategoryService, type Subcategory, type SubcategoryOverview, type SubcategoryUpdate, type SubcategoryHighlight, type SubcategoryExamStat, type SubcategorySection, type SubcategoryTable, type SubcategoryQuestionPaper, type SubcategoryFAQ, type SubcategoryResource } from '@/lib/api/subcategoryService';
import { getExamUrl } from '@/lib/utils/examUrl';

interface SubcategoryPageProps {
  categorySlug: string;
  subcategorySlug: string;
}

interface Exam {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  total_marks?: number;
  total_questions?: number;
  difficulty?: string;
  status?: string;
  is_free: boolean;
  price?: number;
  logo_url?: string;
  thumbnail_url?: string;
  slug: string;
  url_path?: string;
  download_url?: string;
  supports_hindi?: boolean;
}

export default function SubcategoryPage({ categorySlug, subcategorySlug }: SubcategoryPageProps) {
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [overview, setOverview] = useState<SubcategoryOverview | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [updates, setUpdates] = useState<SubcategoryUpdate[]>([]);
  const [highlights, setHighlights] = useState<SubcategoryHighlight[]>([]);
  const [examStats, setExamStats] = useState<SubcategoryExamStat[]>([]);
  const [sections, setSections] = useState<SubcategorySection[]>([]);
  const [tables, setTables] = useState<SubcategoryTable[]>([]);
  const [questionPapers, setQuestionPapers] = useState<SubcategoryQuestionPaper[]>([]);
  const [faqs, setFaqs] = useState<SubcategoryFAQ[]>([]);
  const [resources, setResources] = useState<SubcategoryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'exams', label: 'Mock Tests', icon: FileText },
    { id: 'updates', label: 'Latest Updates', icon: TrendingUp },
    { id: 'papers', label: 'Question Papers', icon: Download },
    { id: 'preparation', label: 'Preparation', icon: BookOpen },
    { id: 'faqs', label: 'FAQs', icon: HelpCircle }
  ];

  const overviewStats = useMemo(() => {
    if (!overview?.stats_json) return [];

    if (Array.isArray(overview.stats_json)) {
      return overview.stats_json.map((stat: any, index: number) => ({
        label: stat.label || stat.stat_label || `Stat ${index + 1}`,
        value: stat.value || stat.stat_value || '',
        description: stat.description || stat.stat_description || ''
      }));
    }

    if (typeof overview.stats_json === 'object') {
      return Object.entries(overview.stats_json).map(([label, value]) => ({
        label,
        value: typeof value === 'object' ? JSON.stringify(value) : value,
        description: ''
      }));
    }

    return [];
  }, [overview]);

  const heroSubtitle = overview?.hero_subtitle || subcategory?.description || '';
  const heroDescription = overview?.hero_description || subcategory?.description || '';

  useEffect(() => {
    fetchSubcategoryData();
  }, [categorySlug, subcategorySlug]);

  const fetchSubcategoryData = async () => {
    try {
      setLoading(true);
      
      const subcategoryData = await subcategoryService.getSubcategoryBySlug(categorySlug, subcategorySlug);
      if (!subcategoryData) {
        setLoading(false);
        return;
      }
      
      setSubcategory(subcategoryData);

      const [
        overviewData,
        examsResponse,
        updatesResponse,
        highlightsData,
        statsData,
        sectionsData,
        tablesData,
        papersResponse,
        faqsData,
        resourcesData
      ] = await Promise.all([
        subcategoryService.getOverview(subcategoryData.id),
        subcategoryService.getExamsBySubcategory(categorySlug, subcategorySlug, { limit: 50 }),
        subcategoryService.getUpdates(subcategoryData.id, { limit: 10 }),
        subcategoryService.getHighlights(subcategoryData.id),
        subcategoryService.getExamStats(subcategoryData.id),
        subcategoryService.getSections(subcategoryData.id),
        subcategoryService.getTables(subcategoryData.id),
        subcategoryService.getQuestionPapers(subcategoryData.id, { limit: 20 }),
        subcategoryService.getFAQs(subcategoryData.id),
        subcategoryService.getResources(subcategoryData.id)
      ]);

      setOverview(overviewData);
      setExams(examsResponse.data || []);
      setUpdates(updatesResponse.data || []);
      setHighlights(highlightsData);
      setExamStats(statsData);
      setSections(sectionsData);
      setTables(tablesData);
      setQuestionPapers(papersResponse.data || []);
      setFaqs(faqsData);
      setResources(resourcesData);
    } catch (error) {
      console.error('Error fetching subcategory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (examId: string) => {
    try {
      setDownloadingPdf(examId);
      toast.loading('Preparing exam PDF...', { id: 'pdf-download' });

      const examData = await examPdfService.getExamForPDF(examId);
      
      toast.loading('Generating PDF document...', { id: 'pdf-download' });
      await generateExamPDF(examData);
      
      toast.success('PDF downloaded successfully!', { id: 'pdf-download' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.', { id: 'pdf-download' });
    } finally {
      setDownloadingPdf(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!subcategory) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Subcategory Not Found</h1>
          <p className="text-gray-600">The requested subcategory could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[conic-gradient(at_top,_#f8fbff,_#f0f4ff,_#edf5ff,_#f9fbff)]">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f92ff] via-[#437cff] to-[#0047c5] text-white">
        <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 55%)' }}></div>
        <div className="relative max-w-screen-2xl mx-auto px-6 lg:px-12 py-16 flex flex-col lg:flex-row gap-10">
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <nav className="flex items-center justify-center lg:justify-start gap-2 text-sm text-white/80">
              <Link href="/" className="hover:underline">Home</Link>
              <ChevronRight className="w-4 h-4" />
              <Link href={`/${categorySlug}`} className="hover:underline capitalize">
                {subcategory.category?.name || categorySlug}
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="capitalize text-white">{subcategory.name}</span>
            </nav>
            <div className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.4em] uppercase text-white/80">
              <span className="w-2 h-2 rounded-full bg-white/80"></span>
              Curated Exam Guide
            </div>
            <h1 className="text-4xl lg:text-5xl font-semibold leading-tight">
              {overview?.hero_title || `${subcategory.name} Exam`}
            </h1>
            <div className="grid lg:grid-cols-2 gap-4">
              {heroSubtitle && (
                <p className="text-base text-white/85 max-w-2xl mx-auto lg:mx-0">
                  {heroSubtitle}
                </p>
              )}
              {(overview?.cta_primary_text || overview?.cta_secondary_text) && (
                <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
                  {overview?.cta_primary_text && overview?.cta_primary_url && (
                    <Link
                      href={overview.cta_primary_url}
                      className="inline-flex items-center justify-center px-6 py-3 bg-white text-primary font-semibold rounded-full shadow-2xl shadow-blue-900/30 hover:-translate-y-0.5 transition"
                    >
                      {overview.cta_primary_text}
                    </Link>
                  )}
                  {overview?.cta_secondary_text && overview?.cta_secondary_url && (
                    <Link
                      href={overview.cta_secondary_url}
                      className="inline-flex items-center justify-center px-6 py-3 border border-white/40 text-white font-semibold rounded-full hover:bg-white/10 transition"
                    >
                      {overview.cta_secondary_text}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
          {overview?.hero_image_url && (
            <div className="flex-1 w-full max-w-xl mx-auto lg:mx-0">
              <div className="rounded-[32px] border border-white/30 bg-white/5 backdrop-blur p-4 shadow-[0_45px_120px_-40px_rgba(0,0,0,0.8)]">
                <img
                  src={overview.hero_image_url}
                  alt={subcategory.name}
                  className="w-full h-64 lg:h-80 rounded-[28px] object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
        <div className="relative">
          <div className="absolute inset-x-0 -top-8 z-30 flex justify-center px-4">
            <div className="inline-flex w-full max-w-5xl overflow-x-auto rounded-full bg-white/95 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.7)] ring-1 ring-black/5 px-4 sm:px-6 py-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 px-4 sm:px-6 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-x-2 -bottom-1 h-1 rounded-full bg-primary"></span>
                    )}
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-12">
        {activeTab === 'overview' && (
          <div className="space-y-8">

            {overviewStats.length > 0 && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {overviewStats.map((stat, index) => (
                  <div key={`${stat.label}-${index}`} className="rounded-[28px] bg-white shadow-[0_30px_60px_-45px_rgba(15,23,42,0.85)] ring-1 ring-black/5 p-5">
                    <p className="text-sm text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className="text-3xl font-semibold mt-2">{stat.value}</p>
                    {stat.description && (
                      <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {examStats.length > 0 && (
              <div className="rounded-[32px] bg-white shadow-[0_45px_120px_-55px_rgba(15,23,42,0.8)] ring-1 ring-black/5 p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Exam Insights
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {examStats.map((stat) => (
                    <div key={stat.id} className="rounded-2xl ring-1 ring-black/5 bg-slate-50/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.9)]">
                      <p className="text-sm text-muted-foreground uppercase tracking-wide">
                        {stat.stat_label}
                      </p>
                      <p className="text-3xl font-semibold mt-2">{stat.stat_value}</p>
                      {stat.stat_description && (
                        <p className="text-sm text-muted-foreground mt-2">{stat.stat_description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {highlights.length > 0 && (
              <div className="rounded-[32px] bg-white shadow-[0_45px_120px_-55px_rgba(15,23,42,0.8)] ring-1 ring-black/5 p-6">
                <h2 className="text-2xl font-bold mb-6">Key Highlights</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {highlights.map((highlight) => (
                    <div key={highlight.id} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Award className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{highlight.title}</h3>
                        {highlight.description && (
                          <p className="text-sm text-gray-600">{highlight.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sections.map((section) => (
              <div key={section.id} className="rounded-[32px] bg-white shadow-[0_45px_120px_-55px_rgba(15,23,42,0.8)] ring-1 ring-black/5 p-6">
                <h2 className="text-2xl font-bold mb-4">{section.title}</h2>
                {section.subtitle && (
                  <p className="text-lg text-gray-600 mb-4">{section.subtitle}</p>
                )}
                {section.content && (
                  <div className="prose max-w-none mb-4" dangerouslySetInnerHTML={{ __html: section.content }} />
                )}
                {section.media_url && (
                  <img src={section.media_url} alt={section.title} className="rounded-lg mb-4" />
                )}
                {section.button_label && section.button_url && (
                  <Link
                    href={section.button_url}
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <span>{section.button_label}</span>
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}
              </div>
            ))}

            {tables.map((table) => (
              <div key={table.id} className="rounded-[32px] bg-white shadow-[0_45px_120px_-55px_rgba(15,23,42,0.8)] ring-1 ring-black/5 p-6">
                <h2 className="text-2xl font-bold mb-4">{table.title}</h2>
                {table.description && (
                  <p className="text-gray-600 mb-4">{table.description}</p>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    {table.column_headers && (
                      <thead className="bg-gray-50">
                        <tr>
                          {table.column_headers.map((header: string, idx: number) => (
                            <th
                              key={idx}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody className="bg-white divide-y divide-gray-200">
                      {table.subcategory_table_rows?.map((row) => (
                        <tr key={row.id}>
                          {Array.isArray(row.row_data) ? (
                            row.row_data.map((cell: any, idx: number) => (
                              <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {cell}
                              </td>
                            ))
                          ) : (
                            <td className="px-6 py-4 text-sm text-gray-900">{JSON.stringify(row.row_data)}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="rounded-[28px] bg-white shadow-[0_40px_100px_-55px_rgba(15,23,42,0.85)] ring-1 ring-black/5 p-5">
            <h2 className="text-xl font-semibold mb-4">Available Mock Tests</h2>
            {exams.length === 0 ? (
              <p className="text-sm text-gray-600">No mock tests available at the moment.</p>
            ) : (
              <div className="space-y-3">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="rounded-2xl ring-1 ring-black/5 bg-slate-50/70 p-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.85)] flex flex-col md:flex-row gap-3 md:gap-6"
                  >
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        {exam.logo_url && (
                          <img src={exam.logo_url} alt={exam.title} className="w-12 h-12 rounded-lg object-cover" />
                        )}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-base text-gray-900">{exam.title}</h3>
                          {exam.description && (
                            <p className="text-xs text-gray-600 line-clamp-2">{exam.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                            {exam.total_questions && (
                              <span className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                {exam.total_questions} Qs
                              </span>
                            )}
                            {exam.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {exam.duration} min
                              </span>
                            )}
                            {exam.total_marks && (
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5" />
                                {exam.total_marks} Marks
                              </span>
                            )}
                            {exam.difficulty && (
                              <span className="px-2.5 py-0.5 rounded-full bg-white text-[10px] font-semibold text-slate-600">
                                {exam.difficulty}
                              </span>
                            )}
                            {exam.supports_hindi && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                <span role="img" aria-label="Language">🌐</span>
                                English + हिंदी
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[180px]">
                      <div className="text-right text-xs font-semibold text-blue-600">
                        {exam.is_free ? 'Free Mock Test' : `₹${exam.price ?? 0}`}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => handleDownloadPDF(exam.id)}
                          disabled={downloadingPdf === exam.id}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-primary text-primary font-semibold px-3 py-1.5 hover:bg-primary/5 text-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Download className="w-4 h-4" />
                          {downloadingPdf === exam.id ? 'Generating...' : 'Download Paper'}
                        </button>
                        <Link
                          href={getExamUrl(exam)}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-white font-semibold px-3 py-1.5 text-xs shadow-md hover:-translate-y-0.5 transition"
                        >
                          <FileText className="w-4 h-4" />
                          Attempt Now
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'updates' && (
          <div className="rounded-[32px] bg-white shadow-[0_45px_120px_-55px_rgba(15,23,42,0.8)] ring-1 ring-black/5 p-6">
            <h2 className="text-2xl font-bold mb-6">Latest Updates</h2>
            {updates.length === 0 ? (
              <p className="text-gray-600">No updates available.</p>
            ) : (
              <div className="space-y-4">
                {updates.map((update) => (
                  <div key={update.id} className="rounded-2xl bg-slate-50/80 ring-1 ring-blue-100 px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{update.title}</h3>
                        {update.description && (
                          <p className="text-sm text-gray-600 mb-2">{update.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(update.update_date).toLocaleDateString()}</span>
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {update.update_type}
                          </span>
                        </div>
                      </div>
                      {update.link_url && (
                        <Link
                          href={update.link_url}
                          className="text-blue-600 hover:text-blue-700 ml-4"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'papers' && (
          <div className="rounded-[32px] bg-white shadow-[0_45px_120px_-55px_rgba(15,23,42,0.8)] ring-1 ring-black/5 p-6">
            <h2 className="text-2xl font-bold mb-6">Previous Year Question Papers</h2>
            {questionPapers.length === 0 ? (
              <p className="text-gray-600">No question papers available.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {questionPapers.map((paper) => (
                  <div key={paper.id} className="rounded-2xl ring-1 ring-black/5 bg-slate-50 p-5 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.8)]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{paper.title}</h3>
                        {paper.description && (
                          <p className="text-sm text-gray-600 mb-2">{paper.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Year: {paper.year}</span>
                          {paper.paper_type && (
                            <span className="px-2 py-1 bg-gray-100 rounded">{paper.paper_type}</span>
                          )}
                          {paper.exam?.supports_hindi && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded">
                              <span role="img" aria-label="Language">🌐</span>
                              English + हिंदी
                            </span>
                          )}
                        </div>
                      </div>
                      {paper.download_url && (
                        <a
                          href={paper.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'preparation' && (
          <div className="space-y-6">
            {resources.length > 0 && (
              <div className="rounded-[32px] bg-white shadow-[0_45px_120px_-55px_rgba(15,23,42,0.8)] ring-1 ring-black/5 p-6">
                <h2 className="text-2xl font-bold mb-6">Study Resources</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resources.map((resource) => (
                  <div key={resource.id} className="rounded-2xl ring-1 ring-black/5 bg-slate-50 p-4 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.8)]">
                      {resource.thumbnail_url && (
                        <img src={resource.thumbnail_url} alt={resource.title} className="w-full h-32 object-cover rounded mb-4" />
                      )}
                      <h3 className="font-semibold text-gray-900 mb-2">{resource.title}</h3>
                      {resource.description && (
                        <p className="text-sm text-gray-600 mb-3">{resource.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-1 bg-white rounded-full shadow-sm text-slate-600">{resource.resource_type}</span>
                        {resource.resource_url && (
                          <a
                            href={resource.resource_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            View <ExternalLink className="w-3 h-3 inline ml-1" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'faqs' && (
          <div className="rounded-[32px] bg-white shadow-[0_45px_120px_-55px_rgba(15,23,42,0.8)] ring-1 ring-black/5 p-6">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            {faqs.length === 0 ? (
              <p className="text-gray-600">No FAQs available.</p>
            ) : (
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <details key={faq.id} className="rounded-2xl ring-1 ring-black/5 bg-slate-50/80 p-4">
                    <summary className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600">
                      {faq.question}
                    </summary>
                    <div className="mt-3 text-gray-600 prose max-w-none" dangerouslySetInnerHTML={{ __html: faq.answer }} />
                  </details>
                ))}
              </div>
            )}
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
