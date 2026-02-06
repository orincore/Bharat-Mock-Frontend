"use client";

import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BlockRenderer } from "@/components/PageEditor/BlockRenderer";
import { examPdfService } from "@/lib/api/examPdfService";
import { generateExamPDF } from "@/lib/utils/pdfGenerator";
import { toast } from "sonner";
import { Calendar, Users, FileText, TrendingUp, Download } from "lucide-react";

interface Block {
  id: string;
  block_type: string;
  content: any;
  settings?: any;
  display_order: number;
}

interface Section {
  id: string;
  section_key: string;
  title: string;
  subtitle?: string;
  icon?: string;
  background_color?: string;
  text_color?: string;
  display_order: number;
  is_collapsible?: boolean;
  is_expanded?: boolean;
  is_sidebar?: boolean;
  custom_tab_id?: string | null;
  blocks: Block[];
}

interface CustomTab {
  id: string;
  title: string;
  tab_key: string;
  description?: string | null;
  display_order: number;
}

interface PageContentResponse {
  sections: Section[];
  orphanBlocks: Block[];
  seo?: {
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    canonical_url?: string;
  };
  customTabs?: CustomTab[];
}

interface ModernSubcategoryPageProps {
  categorySlug: string;
  subcategorySlug: string;
}

const apiBase = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
  : "";

const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (apiBase) {
    return `${apiBase}${normalizedPath}`;
  }
  return `/api/v1${normalizedPath}`;
};

const extractYearFromTitle = (title?: string | null): number | null => {
  if (!title) {
    return null;
  }
  const matches = title.match(/(20\d{2}|19\d{2})/g);
  if (!matches || matches.length === 0) {
    return null;
  }
  return parseInt(matches[matches.length - 1], 10) || null;
};

const resolvePaperYear = (paper: any): number | null => {
  if (paper?.year) {
    return paper.year;
  }

  if (paper?.exam?.start_date) {
    const parsed = new Date(paper.exam.start_date);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getFullYear();
    }
  }

  return extractYearFromTitle(paper?.title || paper?.exam?.title || null);
};

export default function ModernSubcategoryPage({ categorySlug, subcategorySlug }: ModernSubcategoryPageProps) {
  const normalizedCategory = categorySlug?.toLowerCase();
  const normalizedSubcategory = subcategorySlug?.toLowerCase();
  const router = useRouter();

  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [subcategoryInfo, setSubcategoryInfo] = useState<any>(null);
  const [pageContent, setPageContent] = useState<PageContentResponse | null>(null);
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [questionPapers, setQuestionPapers] = useState<any[]>([]);
  const [pastPaperExams, setPastPaperExams] = useState<any[]>([]);
  const [mockTestsLoading, setMockTestsLoading] = useState(false);
  const [questionPapersLoading, setQuestionPapersLoading] = useState(false);
  const [pastPaperLoading, setPastPaperLoading] = useState(false);
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingExamId, setDownloadingExamId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubcategory = async () => {
      if (!normalizedCategory || !normalizedSubcategory) {
        setError("Missing category or subcategory slug");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const endpoints = [
          buildApiUrl(`/taxonomy/category/${normalizedCategory}/subcategory/${normalizedSubcategory}`),
          buildApiUrl(`/taxonomy/subcategory-id/${normalizedSubcategory}`)
        ];

        let resolved: any = null;
        for (const endpoint of endpoints) {
          if (process.env.NODE_ENV !== "production") {
            console.log("[ModernSubcategory] Resolving subcategory", { endpoint, normalizedCategory, normalizedSubcategory });
          }
          const res = await fetch(endpoint);
          if (res.ok) {
            const data = await res.json();
            if (data?.id || data?.data?.id) {
              resolved = data.data || data;
              break;
            }
          }
        }

        if (!resolved?.id) {
          throw new Error("Subcategory not found");
        }

        setSubcategoryId(resolved.id);
        setSubcategoryInfo(resolved);
      } catch (err: any) {
        setError(err.message || "Unable to load subcategory content");
        setIsLoading(false);
      }
    };

    fetchSubcategory();
  }, [normalizedCategory, normalizedSubcategory]);

  useEffect(() => {
    const fetchPageContent = async () => {
      if (!subcategoryId) return;
      try {
        const endpoint = buildApiUrl(`/page-content/${subcategoryId}`);
        if (process.env.NODE_ENV !== "production") {
          console.log("[ModernSubcategory] Fetching page content", { endpoint, subcategoryId });
        }
        const res = await fetch(endpoint);
        if (!res.ok) {
          throw new Error("Failed to fetch page content");
        }
        const data = await res.json();
        setPageContent(data);
        const nextTabs = Array.isArray(data.customTabs) ? data.customTabs : [];
        setCustomTabs(nextTabs);
        setActiveTab((prev) => {
          if (prev === 'overview' || prev === 'mock-tests' || prev === 'question-papers') {
            return prev;
          }
          return nextTabs.some((tab) => tab.id === prev) ? prev : 'overview';
        });
      } catch (err: any) {
        setError(err.message || "Unable to load page content");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPageContent();
  }, [subcategoryId]);

  const handleDownloadExamPDF = async (examId: string) => {
    try {
      setDownloadingExamId(examId);
      toast.loading('Preparing exam PDF...', { id: `pdf-${examId}` });
      const examData = await examPdfService.getExamForPDF(examId);
      toast.loading('Generating PDF document...', { id: `pdf-${examId}` });
      await generateExamPDF(examData);
      toast.success('PDF downloaded successfully!', { id: `pdf-${examId}` });
    } catch (err) {
      console.error('[ModernSubcategory] exam PDF generation failed', err);
      toast.error('Failed to download exam PDF. Please try again.', { id: `pdf-${examId}` });
    } finally {
      setDownloadingExamId(null);
    }
  };

  useEffect(() => {
    const fetchMockTests = async () => {
      if (!normalizedCategory || !normalizedSubcategory) return;
      try {
        setMockTestsLoading(true);
        const params = new URLSearchParams({ limit: '6', exam_type: 'mock_test' });
        const endpoint = buildApiUrl(`/taxonomy/category/${normalizedCategory}/subcategory/${normalizedSubcategory}/exams?${params.toString()}`);
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Failed to load mock tests');
        }
        const payload = await response.json();
        setMockTests(Array.isArray(payload?.data) ? payload.data : payload?.data?.data || []);
      } catch (err) {
        console.error('[ModernSubcategory] mock tests fetch failed', err);
        setMockTests([]);
      } finally {
        setMockTestsLoading(false);
      }
    };

    fetchMockTests();
  }, [normalizedCategory, normalizedSubcategory]);

  useEffect(() => {
    const fetchQuestionPapers = async () => {
      if (!subcategoryId) return;
      try {
        setQuestionPapersLoading(true);
        const params = new URLSearchParams({ limit: '12' });
        const endpoint = buildApiUrl(`/subcategories/${subcategoryId}/question-papers?${params.toString()}`);
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Failed to load question papers');
        }
        const payload = await response.json();
        setQuestionPapers(Array.isArray(payload?.data) ? payload.data : payload?.data?.data || []);
      } catch (err) {
        console.error('[ModernSubcategory] question papers fetch failed', err);
        setQuestionPapers([]);
      } finally {
        setQuestionPapersLoading(false);
      }
    };

    fetchQuestionPapers();
  }, [subcategoryId]);

  useEffect(() => {
    const fetchPastPaperExams = async () => {
      if (!normalizedCategory || !normalizedSubcategory) return;
      try {
        setPastPaperLoading(true);
        const params = new URLSearchParams({ limit: '20', exam_type: 'past_paper' });
        const endpoint = buildApiUrl(`/taxonomy/category/${normalizedCategory}/subcategory/${normalizedSubcategory}/exams?${params.toString()}`);
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Failed to load past papers');
        }
        const payload = await response.json();
        setPastPaperExams(Array.isArray(payload?.data) ? payload.data : payload?.data?.data || []);
      } catch (err) {
        console.error('[ModernSubcategory] past papers fetch failed', err);
        setPastPaperExams([]);
      } finally {
        setPastPaperLoading(false);
      }
    };

    fetchPastPaperExams();
  }, [normalizedCategory, normalizedSubcategory]);

  const combinedQuestionPapers = useMemo(() => {
    if (!subcategoryId) {
      return questionPapers;
    }
    const existingExamIds = new Set(
      questionPapers
        .map((paper) => paper.exam_id)
        .filter((id): id is string => Boolean(id))
    );

    const derivedFromExams = pastPaperExams
      .filter((exam) => !existingExamIds.has(exam.id))
      .map((exam) => ({
        id: `exam-${exam.id}`,
        subcategory_id: subcategoryId,
        title: exam.title,
        description: exam.description,
        year: exam.start_date ? new Date(exam.start_date).getFullYear() : extractYearFromTitle(exam.title),
        paper_type: exam.exam_type === 'past_paper' ? 'Past Paper' : null,
        exam_id: exam.id,
        exam,
        download_url: exam.download_url || exam.pdf_url || exam.file_url || null,
        is_active: true,
        display_order: 0
      }));

    return [...questionPapers, ...derivedFromExams];
  }, [questionPapers, pastPaperExams, subcategoryId]);

  const heroTitle = useMemo(
    () => subcategoryInfo?.name || normalizedSubcategory?.toUpperCase(),
    [subcategoryInfo, normalizedSubcategory]
  );
  const heroSubtitle = useMemo(
    () => subcategoryInfo?.description || "Latest details, notifications, and preparation guidance",
    [subcategoryInfo]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading category content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-2xl font-semibold text-gray-800">Unable to load this section.</p>
        <p className="text-gray-500 mt-2">{error}</p>
        <button className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg" onClick={() => router.refresh()}>
          Retry
        </button>
      </div>
    );
  }

  const sections = pageContent?.sections ?? [];
  const sidebarSections = sections.filter((section) => section.is_sidebar);

  const getSectionsForTab = (tabId: string) => {
    if (tabId === 'overview') {
      return sections.filter((section) => !section.is_sidebar && !section.custom_tab_id);
    }
    if (customTabs.some((tab) => tab.id === tabId)) {
      return sections.filter((section) => !section.is_sidebar && section.custom_tab_id === tabId);
    }
    return [];
  };

  const visibleSections = getSectionsForTab(activeTab);
  const tabItems = [
    { id: 'overview', label: 'Overview' },
    ...customTabs.map((tab) => ({ id: tab.id, label: tab.title })),
    { id: 'mock-tests', label: 'Mock Tests' },
    { id: 'question-papers', label: 'Previous Papers' }
  ];
  const isContentTab = activeTab === 'overview' || customTabs.some((tab) => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      {pageContent.seo && (
        <Head>
          <title>{pageContent.seo.meta_title || heroTitle}</title>
          {pageContent.seo.meta_description && (
            <meta name="description" content={pageContent.seo.meta_description} />
          )}
          {pageContent.seo.meta_keywords && (
            <meta name="keywords" content={pageContent.seo.meta_keywords} />
          )}
          {pageContent.seo.canonical_url && <link rel="canonical" href={pageContent.seo.canonical_url} />}
        </Head>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{heroTitle}</h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-6">{heroSubtitle}</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <HeroBadge
                icon={<Calendar className="w-5 h-5 mr-2" />}
                label="Exam Cycle"
                value={subcategoryInfo?.exam_cycle || "2024"}
              />
              <HeroBadge icon={<Users className="w-5 h-5 mr-2" />} label="Vacancies" value={subcategoryInfo?.vacancies || "TBA"} />
              <HeroBadge
                icon={<FileText className="w-5 h-5 mr-2" />}
                label="Application"
                value={subcategoryInfo?.application_mode || "Online"}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto py-4 space-x-6">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {isContentTab && (
              <>
                {pageContent?.orphanBlocks?.map((block) => (
                  <div key={block.id} className="mb-6">
                    <BlockRenderer block={block} />
                  </div>
                ))}

                {visibleSections.length === 0 && (!pageContent?.orphanBlocks || pageContent.orphanBlocks.length === 0) ? (
                  <div className="bg-white rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
                    No Content Yet! Come again later...
                  </div>
                ) : (
                  visibleSections.map((section) => (
                    <section
                      key={section.id}
                      id={section.section_key}
                      className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                      style={{
                        backgroundColor: section.background_color || "white",
                        color: section.text_color || "inherit"
                      }}
                    >
                      <div className="p-6 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                        {section.subtitle && <p className="mt-2 text-gray-600">{section.subtitle}</p>}
                      </div>
                      <div className="p-6">
                        {section.blocks.map((block) => (
                          <div key={block.id} className="mb-4">
                            <BlockRenderer block={block} />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </>
            )}

            {activeTab === 'mock-tests' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">Mock Tests</h2>
                {mockTestsLoading ? (
                  <p className="text-sm text-gray-500">Loading mock tests...</p>
                ) : mockTests.length === 0 ? (
                  <p className="text-sm text-gray-600">No mock tests available yet.</p>
                ) : (
                  <div className="space-y-4">
                    {mockTests.map((exam) => (
                      <div key={exam.id} className="border rounded-xl p-4 flex flex-col gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                          {exam.description && <p className="text-sm text-gray-600 mt-1">{exam.description}</p>}
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                            {exam.total_questions && <span>{exam.total_questions} Questions</span>}
                            {exam.duration && <span>{exam.duration} mins</span>}
                            {exam.total_marks && <span>{exam.total_marks} Marks</span>}
                            {exam.is_free ? <span className="text-green-600 font-semibold">Free</span> : exam.price ? <span>₹{exam.price}</span> : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Link
                            href={exam.url_path || `/exams/${exam.slug || exam.id}`}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                          >
                            Attempt Now
                          </Link>
                          <button
                            onClick={() => handleDownloadExamPDF(exam.id)}
                            disabled={downloadingExamId === exam.id}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold text-blue-600 border-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {downloadingExamId === exam.id ? 'Preparing...' : 'Download PDF'}
                          </button>
                          {(exam.download_url || exam.pdf_url || exam.file_url) && (
                            <a
                              href={exam.download_url || exam.pdf_url || exam.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold text-blue-600 border-blue-600 hover:bg-blue-50"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'question-papers' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">Last Year Question Papers</h2>
                {questionPapersLoading || pastPaperLoading ? (
                  <p className="text-sm text-gray-500">Loading question papers...</p>
                ) : combinedQuestionPapers.length === 0 ? (
                  <p className="text-sm text-gray-600">No question papers available yet.</p>
                ) : (
                  <div className="space-y-4">
                    {combinedQuestionPapers.map((paper) => {
                      const paperExamId = paper.exam_id || paper.exam?.id;
                      const isDownloading = paperExamId && downloadingExamId === paperExamId;
                      const resolvedYear = resolvePaperYear(paper);

                      return (
                        <div key={paper.id} className="border rounded-xl p-4">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <p className="text-sm text-gray-500">{resolvedYear || '—'}</p>
                              <h3 className="text-lg font-semibold text-gray-900">{paper.title || paper.exam?.title}</h3>
                              {paper.description && <p className="text-sm text-gray-600 mt-1">{paper.description}</p>}
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {paper.exam?.url_path && (
                                <Link
                                  href={paper.exam.url_path}
                                  className="inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold text-blue-600 border-blue-600 hover:bg-blue-50"
                                >
                                  Attempt Online
                                </Link>
                              )}
                              {paperExamId && (
                                <button
                                  onClick={() => handleDownloadExamPDF(paperExamId)}
                                  disabled={isDownloading}
                                  className="inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold text-blue-600 border-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  {isDownloading ? 'Preparing…' : 'Download PDF'}
                                </button>
                              )}
                              {!paperExamId && (paper.download_url || paper.file_url) && (
                                <a
                                  href={paper.download_url || paper.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold text-blue-600 border-blue-600 hover:bg-blue-50"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download PDF
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="lg:col-span-1">
            {sidebarSections.length > 0 && (
              <div className="sticky top-24 space-y-6">
                {sidebarSections.map((section) => (
                  <section
                    key={section.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                    style={{
                      backgroundColor: section.background_color || 'white',
                      color: section.text_color || 'inherit'
                    }}
                  >
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                      {section.subtitle && <p className="mt-1 text-sm text-gray-600">{section.subtitle}</p>}
                    </div>
                    <div className="p-4 space-y-4">
                      {section.blocks.map((block) => (
                        <div key={block.id}>
                          <BlockRenderer block={block} />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

const HeroBadge = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center bg-blue-700 px-4 py-2 rounded-lg">
    {icon}
    <div>
      <p className="text-blue-200 text-xs uppercase tracking-wide">{label}</p>
      <span className="font-semibold">{value}</span>
    </div>
  </div>
);

const DefaultModernPage = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="min-h-screen bg-gray-50">
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-6">{subtitle}</p>
          <p className="text-blue-100">Content is being configured. Please check back soon.</p>
        </div>
      </div>
    </div>
  </div>
);
