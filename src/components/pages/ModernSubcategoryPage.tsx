"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PageBlockRenderer } from "@/components/PageEditor/PageBlockRenderer";
import { examPdfService } from "@/lib/api/examPdfService";
import { generateExamPDF } from "@/lib/utils/pdfGenerator";
import { toast } from "sonner";
import { Download, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

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
  settings?: Record<string, any>;
}

interface CustomTab {
  id: string;
  title: string;
  tab_key: string;
  description?: string | null;
  display_order: number;
}

interface TableOfContentsEntry {
  id: string;
  label: string;
}

type TabDescriptor = {
  id: string;
  label: string;
  slug: string;
  type: 'content' | 'special';
};

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
  categorySlug?: string;
  subcategorySlug?: string;
  combinedSlug?: string;
  initialTabSlug?: string;
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

const sanitizeAnchor = (value?: string | null) => {
  if (!value) return '';
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
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

export default function ModernSubcategoryPage({ categorySlug, subcategorySlug, combinedSlug, initialTabSlug }: ModernSubcategoryPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const extractYearFromTitle = (title: string): string | null => {
    const yearMatch = title.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : null;
  };

  const [resolvedCategorySlug, setResolvedCategorySlug] = useState<string | null>(categorySlug?.toLowerCase() || null);
  const [resolvedSubcategorySlug, setResolvedSubcategorySlug] = useState<string | null>(subcategorySlug?.toLowerCase() || null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [subcategoryInfo, setSubcategoryInfo] = useState<any>(null);
  const [pageContent, setPageContent] = useState<PageContentResponse | null>(null);
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [questionPapers, setQuestionPapers] = useState<any[]>([]);
  const [pastPaperExams, setPastPaperExams] = useState<any[]>([]);
  const [mockTestsLoading, setMockTestsLoading] = useState(false);
  const [questionPapersLoading, setQuestionPapersLoading] = useState(false);
  const [pastPaperLoading, setPastPaperLoading] = useState(false);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingExamId, setDownloadingExamId] = useState<string | null>(null);
  const [isTabListOpen, setIsTabListOpen] = useState(false);

  useEffect(() => {
    const fetchSubcategory = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let resolved: any = null;

        // Primary: look up subcategory by its own independent slug
        if (resolvedSubcategorySlug) {
          const res = await fetch(buildApiUrl(`/taxonomy/subcategory/${resolvedSubcategorySlug}`));
          if (res.ok) {
            const data = await res.json();
            if (data?.data?.id) {
              resolved = data.data;
              setResolvedCategorySlug(resolved.category?.slug ? resolved.category.slug.toLowerCase() : null);
              setResolvedSubcategorySlug(resolved.slug ? resolved.slug.toLowerCase() : null);
            }
          }
        }

        // Legacy fallback: combined slug resolution
        if (!resolved && combinedSlug) {
          const resolveEndpoint = buildApiUrl(`/taxonomy/resolve/${combinedSlug.toLowerCase()}`);
          const res = await fetch(resolveEndpoint);
          if (res.ok) {
            const data = await res.json();
            if (data?.data?.id) {
              resolved = data.data;
              setResolvedCategorySlug(resolved.category?.slug ? resolved.category.slug.toLowerCase() : null);
              setResolvedSubcategorySlug(resolved.slug ? resolved.slug.toLowerCase() : null);
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
  }, [combinedSlug, resolvedSubcategorySlug]);

  const sanitizeTabSlug = (value: string | null | undefined) => {
    if (!value) return '';
    return value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/--+/g, '-');
  };

  const tabDescriptors: TabDescriptor[] = useMemo(() => {
    const staticTabs: TabDescriptor[] = [
      { id: 'overview', label: 'Overview', slug: 'overview', type: 'content' },
      { id: 'mock-tests', label: 'Mock Tests', slug: 'mock-tests', type: 'special' },
      { id: 'previous-papers', label: 'Previous Papers', slug: 'previous-papers', type: 'special' }
    ];

    const customDescriptors: TabDescriptor[] = customTabs.map((tab) => ({
      id: tab.id,
      label: tab.title,
      slug: sanitizeTabSlug(tab.tab_key || tab.title || tab.id),
      type: 'content'
    }));

    return [
      staticTabs[0],
      ...customDescriptors,
      staticTabs[1],
      staticTabs[2]
    ];
  }, [customTabs]);

  const normalizedInitialTabSlug = useMemo(() => sanitizeTabSlug(initialTabSlug), [initialTabSlug]);
  const [hasAppliedInitialTab, setHasAppliedInitialTab] = useState(!initialTabSlug);

  useEffect(() => {
    if (hasAppliedInitialTab) {
      return;
    }

    if (!initialTabSlug || !normalizedInitialTabSlug) {
      setHasAppliedInitialTab(true);
      return;
    }

    const match = tabDescriptors.find((tab) => tab.slug === normalizedInitialTabSlug);

    if (match) {
      if (match.id !== activeTab) {
        setActiveTab(match.id);
      }
      setHasAppliedInitialTab(true);
      return;
    }

    if (pageContent) {
      setHasAppliedInitialTab(true);
    }
  }, [initialTabSlug, normalizedInitialTabSlug, tabDescriptors, activeTab, hasAppliedInitialTab, pageContent]);

  const currentTabDescriptor = tabDescriptors.find((tab) => tab.id === activeTab) || tabDescriptors[0];

  const basePath = useMemo(() => {
    if (resolvedSubcategorySlug) {
      return resolvedSubcategorySlug;
    }
    if (combinedSlug) {
      return combinedSlug.toLowerCase();
    }
    return null;
  }, [combinedSlug, resolvedSubcategorySlug]);

  useEffect(() => {
    if (!basePath || !hasAppliedInitialTab || typeof window === 'undefined') return;
    const normalizedTab = currentTabDescriptor?.slug || 'overview';
    const targetPath = normalizedTab === 'overview' ? `/${basePath}` : `/${basePath}/${normalizedTab}`;
    if (window.location.pathname === targetPath) {
      return;
    }
    const nextUrl = `${targetPath}${window.location.search}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [currentTabDescriptor?.slug, basePath, hasAppliedInitialTab]);

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
      if (!resolvedSubcategorySlug) return;
      try {
        setMockTestsLoading(true);
        const params = new URLSearchParams({ limit: '50', exam_type: 'mock_test' });
        const endpoint = buildApiUrl(`/taxonomy/subcategory/${resolvedSubcategorySlug}/exams?${params.toString()}`);
        const response = await fetch(endpoint);
        if (!response.ok) {
          setMockTests([]);
          return;
        }
        const payload = await response.json();
        console.log('[DEBUG] Mock tests API payload:', payload);
        console.log('[DEBUG] payload.data:', payload?.data);
        console.log('[DEBUG] payload.data.data:', payload?.data?.data);
        const mockTestsData = Array.isArray(payload?.data) ? payload.data : payload?.data?.data || [];
        console.log('[DEBUG] Setting mockTests to:', mockTestsData);
        setMockTests(mockTestsData);
      } catch (err) {
        console.error('[ModernSubcategory] mock tests fetch failed', err);
        setMockTests([]);
      } finally {
        setMockTestsLoading(false);
      }
    };

    fetchMockTests();
  }, [resolvedSubcategorySlug]);

  useEffect(() => {
    const fetchQuestionPapers = async () => {
      if (!subcategoryId) return;
      try {
        setQuestionPapersLoading(true);
        const params = new URLSearchParams({ limit: '50' });
        const endpoint = buildApiUrl(`/subcategories/${subcategoryId}/question-papers?${params.toString()}`);
        const response = await fetch(endpoint);
        if (!response.ok) {
          setQuestionPapers([]);
          return;
        }
        const payload = await response.json();
        if (process.env.NODE_ENV !== 'production') {
          console.log('[ModernSubcategory] question papers payload', payload);
        }
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
      if (!resolvedSubcategorySlug) return;
      try {
        setPastPaperLoading(true);
        const params = new URLSearchParams({ limit: '50', exam_type: 'past_paper' });
        const endpoint = buildApiUrl(`/taxonomy/subcategory/${resolvedSubcategorySlug}/exams?${params.toString()}`);
        const response = await fetch(endpoint);
        if (!response.ok) {
          setPastPaperExams([]);
          return;
        }
        const payload = await response.json();
        const parsedData = Array.isArray(payload?.data) ? payload.data : payload?.data?.data || [];
        if (process.env.NODE_ENV !== 'production') {
          console.log('[ModernSubcategory] past paper exams payload', payload);
          console.log('[ModernSubcategory] past paper exams parsed data count:', parsedData.length);
          console.log('[ModernSubcategory] past paper exams with show_in_mock_tests:', 
            parsedData.filter((exam: any) => exam?.show_in_mock_tests).map((exam: any) => ({
              id: exam.id,
              title: exam.title,
              show_in_mock_tests: exam.show_in_mock_tests
            }))
          );
        }
        setPastPaperExams(parsedData);
      } catch (err) {
        console.error('[ModernSubcategory] past papers fetch failed', err);
        setPastPaperExams([]);
      } finally {
        setPastPaperLoading(false);
      }
    };

    fetchPastPaperExams();
  }, [resolvedSubcategorySlug]);

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
        description: null,
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
    () => subcategoryInfo?.name || resolvedSubcategorySlug?.toUpperCase(),
    [subcategoryInfo, resolvedSubcategorySlug]
  );
  const heroSubtitle = useMemo(
    () => (subcategoryInfo?.description || '').trim(),
    [subcategoryInfo]
  );

  const breadcrumbs = useMemo(() => {
    const items = [{ label: 'Home', href: '/' }];
    if (subcategoryInfo?.category?.name && resolvedCategorySlug) {
      items.push({
        label: subcategoryInfo.category.name,
        href: `/${resolvedCategorySlug}`
      });
    }
    if (heroTitle && resolvedSubcategorySlug) {
      const baseHref = `/${resolvedSubcategorySlug}`;
      items.push({
        label: heroTitle,
        href: baseHref
      });

      if (currentTabDescriptor && currentTabDescriptor.id !== 'overview') {
        const tabHref = currentTabDescriptor.slug ? `${baseHref}/${currentTabDescriptor.slug}` : baseHref;
        items.push({ label: currentTabDescriptor.label, href: tabHref });
      }
    }
    return items;
  }, [heroTitle, resolvedCategorySlug, resolvedSubcategorySlug, subcategoryInfo, currentTabDescriptor]);

  const sections = pageContent?.sections ?? [];
  const buildSectionAnchor = useCallback(
    (section: Section) => sanitizeAnchor(section.section_key || section.title || section.id),
    []
  );

  const scrollToAnchor = useCallback((anchorId: string) => {
    if (!anchorId) return;
    const element = document.getElementById(anchorId);
    if (!element) return;
    const headerOffset = 90;
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - headerOffset;
    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
  }, []);

  const extendedMockTests = useMemo(() => {
    const uniqueMap = new Map<string, any>();
    const registerExam = (exam: any, fallbackKey?: string) => {
      if (!exam) return;
      const key = fallbackKey || exam.id || exam.slug || exam.exam_id || `${exam.title || 'exam'}-${uniqueMap.size}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, exam);
      }
    };

    mockTests.forEach((exam) => registerExam(exam));

    pastPaperExams
      .filter((exam) => Boolean(exam?.show_in_mock_tests))
      .forEach((exam) => registerExam(exam));

    const showFromSections = sections
      .filter((section) => section.settings?.special_tab_type === 'mock-tests' && Array.isArray(section.blocks))
      .flatMap((section) => section.blocks)
      .filter((block) => block.block_type === 'exam_list' && block.settings?.show_in_mock_tests)
      .flatMap((block) => block.content?.exams || []);
    showFromSections.forEach((exam) => registerExam(exam));

    combinedQuestionPapers.forEach((paper, paperIndex) => {
      const paperExam = paper.exam || pastPaperExams.find((exam) => exam.id === paper.exam_id);
      const shouldInclude = paper?.show_in_mock_tests || paperExam?.show_in_mock_tests;
      if (!shouldInclude) {
        return;
      }
      if (paperExam) {
        registerExam(paperExam);
        return;
      }
      registerExam(
        {
          id: paper.exam_id || paper.id,
          title: paper.title,
          total_questions: paper.total_questions,
          total_marks: paper.total_marks,
          duration: paper.duration,
          is_free: paper.is_free,
          slug: paper.slug,
          url_path: paper.url_path || paper.download_url,
          show_in_mock_tests: true
        },
        paper.exam_id || paper.id || `paper-${paperIndex}`
      );
    });

    const result = Array.from(uniqueMap.values());

    if (process.env.NODE_ENV !== 'production') {
      const flaggedPastPapers = pastPaperExams.filter((exam) => Boolean(exam?.show_in_mock_tests)).map((exam) => exam.id);
      const sectionExams = showFromSections.map((exam: any) => exam.id || exam.slug).filter(Boolean);
      const combinedFlags = combinedQuestionPapers
        .filter((paper) => paper?.show_in_mock_tests || paper.exam?.show_in_mock_tests)
        .map((paper) => paper.exam_id || paper.id);
      console.log('[ModernSubcategory] extendedMockTests summary', {
        mockTestsCount: mockTests.length,
        flaggedPastPapers,
        sectionExamIds: sectionExams,
        combinedFlaggedIds: combinedFlags,
        resultCount: result.length,
        resultIds: result.map((exam) => exam.id || exam.slug || 'unknown')
      });
    }

    return result;
  }, [mockTests, pastPaperExams, sections, combinedQuestionPapers]);

  const availableMockTestYears = useMemo(() => {
    const years = new Set<string>();
    extendedMockTests.forEach((exam) => {
      const year = extractYearFromTitle(exam.title);
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [extendedMockTests]);

  const availablePreviousPaperYears = useMemo(() => {
    const years = new Set<string>();
    combinedQuestionPapers.forEach((exam) => {
      const year = extractYearFromTitle(exam.title);
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [combinedQuestionPapers]);

  const filteredMockTests = useMemo(() => {
    if (selectedYears.length === 0) return extendedMockTests;
    return extendedMockTests.filter((exam) => {
      const year = extractYearFromTitle(exam.title);
      return year && selectedYears.includes(year);
    });
  }, [extendedMockTests, selectedYears]);

  const filteredPreviousPapers = useMemo(() => {
    if (selectedYears.length === 0) return combinedQuestionPapers;
    return combinedQuestionPapers.filter((exam) => {
      const year = extractYearFromTitle(exam.title);
      return year && selectedYears.includes(year);
    });
  }, [combinedQuestionPapers, selectedYears]);

  const toggleYear = (year: string) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const clearYearFilters = () => setSelectedYears([]);

  const isYearFilterTab = activeTab === 'mock-tests' || activeTab === 'previous-papers';
  const currentYearOptions = activeTab === 'mock-tests' ? availableMockTestYears : availablePreviousPaperYears;
  const hasYearFilters = isYearFilterTab && currentYearOptions.length > 0;

  const yearFilterPanel = hasYearFilters ? (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex flex-col gap-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Filter by Year</h3>
          <p className="text-sm text-gray-500">Select one or more years to refine the list.</p>
        </div>
        {selectedYears.length > 0 && (
          <button
            type="button"
            onClick={clearYearFilters}
            className="self-start text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {currentYearOptions.map((year) => (
          <label key={year} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedYears.includes(year)}
              onChange={() => toggleYear(year)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{year}</span>
          </label>
        ))}
      </div>
    </div>
  ) : null;

  const getSidebarSectionsForTab = (tabId: string) => {
    return sections.filter((section) => {
      if (!section.is_sidebar) return false;
      
      // If sidebar_tab_id is null or undefined, it's shared across all tabs (backward compatible)
      const sidebarTabId = (section as any).sidebar_tab_id;
      if (sidebarTabId === null || sidebarTabId === undefined) return true;
      
      // Match sidebar to specific tab
      return sidebarTabId === tabId;
    });
  };

  const sidebarSections = getSidebarSectionsForTab(activeTab);

  const getSectionsForTab = (tabId: string) => {
    if (tabId === 'overview') {
      return sections.filter((section) => !section.is_sidebar && !section.custom_tab_id && !section.settings?.special_tab_type);
    }
    if (tabId === 'mock-tests' || tabId === 'previous-papers') {
      return sections.filter((section) => !section.is_sidebar && section.settings?.special_tab_type === tabId);
    }
    if (customTabs.some((tab) => tab.id === tabId)) {
      return sections.filter((section) => !section.is_sidebar && section.custom_tab_id === tabId);
    }
    return [];
  };

  const getReservedPosition = (tabId: string) => {
    if (tabId !== 'mock-tests' && tabId !== 'previous-papers') return 0;
    const tabSections = sections.filter((section) => section.settings?.special_tab_type === tabId);
    if (tabSections.length > 0 && tabSections[0].settings?.reserved_position !== undefined) {
      return tabSections[0].settings.reserved_position;
    }
    return 0;
  };

  const visibleSections = getSectionsForTab(activeTab);
  const tabItems = tabDescriptors.map(({ id, label }) => ({ id, label }));
  const isSpecialTab = activeTab === 'mock-tests' || activeTab === 'previous-papers';
  const isContentTab = currentTabDescriptor?.type === 'content' || isSpecialTab;
  const reservedPosition = getReservedPosition(activeTab);
  const tableOfContents = useMemo<TableOfContentsEntry[]>(() => {
    if (!isContentTab) return [];
    return visibleSections
      .map((section) => ({
        id: buildSectionAnchor(section),
        label: section.title || 'Untitled Section'
      }))
      .filter((entry) => Boolean(entry.id));
  }, [visibleSections, isContentTab, buildSectionAnchor]);

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

      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12 relative overflow-hidden">
        {subcategoryInfo?.logo_url && (
          <div className="absolute right-4 sm:right-12 lg:right-24 top-1/2 -translate-y-1/2 pointer-events-none select-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={subcategoryInfo.logo_url}
              alt=""
              className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 object-contain opacity-15"
            />
          </div>
        )}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 relative z-10">
          <div className="text-left flex items-center gap-5">
            {subcategoryInfo?.logo_url && (
              <div className="flex-shrink-0 hidden sm:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={subcategoryInfo.logo_url}
                  alt={heroTitle || ''}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl bg-white/10 p-2 border border-white/20"
                />
              </div>
            )}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">{heroTitle}</h1>
              {heroSubtitle && <p className="text-xl md:text-2xl text-blue-100 mb-4 max-w-3xl">{heroSubtitle}</p>}
              <nav className="flex flex-wrap items-center gap-2 text-sm text-blue-100/80">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={`${crumb.label}-${index}`}>
                    {index > 0 && <span className="text-blue-200/60">/</span>}
                    <Link href={crumb.href} className="hover:underline">
                      {crumb.label}
                    </Link>
                  </React.Fragment>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-3 py-4">
            <div className="flex-1 overflow-x-auto hide-scrollbar">
              <div className="flex items-center space-x-6">
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
            <button
              type="button"
              className="md:hidden whitespace-nowrap text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 flex-shrink-0"
              onClick={() => setIsTabListOpen(true)}
            >
              More
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {isContentTab && (
              <>
                {pageContent?.orphanBlocks?.map((block) => (
                  <div key={block.id} className="mb-6">
                    <PageBlockRenderer block={block} />
                  </div>
                ))}

                {visibleSections.length === 0 && (!pageContent?.orphanBlocks || pageContent.orphanBlocks.length === 0) && !isSpecialTab ? (
                  <div className="bg-white rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
                    No Content Yet! Come again later...
                  </div>
                ) : (
                  <>
                    {visibleSections.map((section, sectionIndex) => {
                      const renderReservedBefore = isSpecialTab && sectionIndex === reservedPosition;
                      const reservedContent = activeTab === 'mock-tests' ? (
                        <div key="reserved-area" className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                          <h2 className="text-xl font-semibold mb-4">Mock Tests</h2>
                          {mockTestsLoading ? (
                            <p className="text-sm text-gray-500">Loading mock tests...</p>
                          ) : filteredMockTests.length === 0 ? (
                            <p className="text-sm text-gray-600">{selectedYears.length > 0 ? 'No mock tests found for selected years.' : 'No mock tests available yet.'}</p>
                          ) : (
                            <div className="space-y-4">
                              {filteredMockTests.map((exam, examIndex) => {
                                const examKey = exam.id || exam.slug || `mock-exam-${examIndex}`;
                                const canAccess = exam.is_free || user?.is_premium;
                                return (
                                  <div key={examKey} className="border rounded-xl p-4 flex flex-col gap-4">
                                    <div className="flex-1">
                                      <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                                        {exam.total_questions && <span>{exam.total_questions} Questions</span>}
                                        {exam.duration && <span>{exam.duration} mins</span>}
                                        {exam.total_marks && <span>{exam.total_marks} Marks</span>}
                                        {exam.is_free && <span className="text-green-600 font-semibold">Free</span>}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                      <Link
                                        href={exam.url_path || `/exams/${exam.slug || exam.id}`}
                                        className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold transition-colors ${canAccess ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                                      >
                                        {!canAccess && <Lock className="w-4 h-4 mr-2" />}
                                        {canAccess ? 'Attempt Now' : 'Unlock Premium'}
                                      </Link>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div key="reserved-area" className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                          <h2 className="text-xl font-semibold mb-4">Previous Year Question Papers</h2>
                          {questionPapersLoading || pastPaperLoading ? (
                            <p className="text-sm text-gray-500">Loading question papers...</p>
                          ) : filteredPreviousPapers.length === 0 ? (
                            <p className="text-sm text-gray-600">{selectedYears.length > 0 ? 'No question papers found for selected years.' : 'No question papers available yet.'}</p>
                          ) : (
                            <div className="space-y-4">
                              {filteredPreviousPapers.map((exam) => {
                                const canAccess = exam.is_free || exam.exam?.is_free || user?.is_premium;
                                return (
                                <div key={exam.id} className="border rounded-xl p-4 flex flex-col gap-4">
                                  <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                                      {exam.total_questions && <span>{exam.total_questions} Questions</span>}
                                      {exam.duration && <span>{exam.duration} mins</span>}
                                      {exam.total_marks && <span>{exam.total_marks} Marks</span>}
                                      {exam.is_free && <span className="text-green-600 font-semibold">Free</span>}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    <Link
                                      href={exam.url_path || `/exams/${exam.slug || exam.id}`}
                                      className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold transition-colors ${canAccess ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                                    >
                                      {!canAccess && <Lock className="w-4 h-4 mr-2" />}
                                      {canAccess ? 'Attempt Now' : 'Unlock Premium'}
                                    </Link>
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );

                      return (
                        <React.Fragment key={section.id}>
                          {renderReservedBefore && reservedContent}
                          <section
                            id={buildSectionAnchor(section)}
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
                                  <PageBlockRenderer block={block} />
                                </div>
                              ))}
                            </div>
                          </section>
                        </React.Fragment>
                      );
                    })}
                    {isSpecialTab && reservedPosition === visibleSections.length && (
                      activeTab === 'mock-tests' ? (
                        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                          <h2 className="text-xl font-semibold mb-4">Mock Tests</h2>
                          {mockTestsLoading ? (
                            <p className="text-sm text-gray-500">Loading mock tests...</p>
                          ) : filteredMockTests.length === 0 ? (
                            <p className="text-sm text-gray-600">{selectedYears.length > 0 ? 'No mock tests found for selected years.' : 'No mock tests available yet.'}</p>
                          ) : (
                            <div className="space-y-4">
                              {filteredMockTests.map((exam, examIndex) => {
                                const examKey = exam.id || exam.slug || `mock-exam-${examIndex}`;
                                const canAccess = exam.is_free || user?.is_premium;
                                return (
                                  <div key={examKey} className="border rounded-xl p-4 flex flex-col gap-4">
                                    <div className="flex-1">
                                      <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                                        {exam.total_questions && <span>{exam.total_questions} Questions</span>}
                                        {exam.duration && <span>{exam.duration} mins</span>}
                                        {exam.total_marks && <span>{exam.total_marks} Marks</span>}
                                        {exam.is_free && <span className="text-green-600 font-semibold">Free</span>}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                      <Link
                                        href={exam.url_path || `/exams/${exam.slug || exam.id}`}
                                        className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold transition-colors ${canAccess ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                                      >
                                        {!canAccess && <Lock className="w-4 h-4 mr-2" />}
                                        {canAccess ? 'Attempt Now' : 'Unlock Premium'}
                                      </Link>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                          <h2 className="text-xl font-semibold mb-4">Previous Year Question Papers</h2>
                          {questionPapersLoading || pastPaperLoading ? (
                            <p className="text-sm text-gray-500">Loading question papers...</p>
                          ) : filteredPreviousPapers.length === 0 ? (
                            <p className="text-sm text-gray-600">{selectedYears.length > 0 ? 'No question papers found for selected years.' : 'No question papers available yet.'}</p>
          ) : (
                            <div className="space-y-4">
                              {filteredPreviousPapers.map((exam) => {
                                const canAccess = exam.is_free || exam.exam?.is_free || user?.is_premium;
                                return (
                                  <div key={exam.id} className="border rounded-xl p-4 flex flex-col gap-4">
                                    <div className="flex-1">
                                      <h3 className="text-lg font-semibold text-gray-900">{exam.title || exam.exam?.title}</h3>
                                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                                        {exam.total_questions && <span>{exam.total_questions} Questions</span>}
                                        {exam.duration && <span>{exam.duration} mins</span>}
                                        {exam.total_marks && <span>{exam.total_marks} Marks</span>}
                                        {exam.is_free && <span className="text-green-600 font-semibold">Free</span>}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                      <Link
                                        href={exam.url_path || exam.exam?.url_path || `/exams/${exam.slug || exam.id}`}
                                        className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold transition-colors ${canAccess ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                                      >
                                        {!canAccess && <Lock className="w-4 h-4 mr-2" />}
                                        {canAccess ? 'Attempt Now' : 'Unlock Premium'}
                                      </Link>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </>
                )}
              </>
            )}

            {!isContentTab && activeTab === 'previous-papers' && (
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
                                  className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold transition-colors ${(paper.exam?.is_free ?? true) ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                                >
                                  {!(paper.exam?.is_free ?? true) && <Lock className="w-4 h-4 mr-2" />}
                                  {(paper.exam?.is_free ?? true) ? 'Attempt Now' : 'Unlock Now'}
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
            {(sidebarSections.length > 0 || hasYearFilters || tableOfContents.length > 0) && (
              <div className="sticky top-24 space-y-6 max-h-[calc(100vh-7rem)] overflow-y-auto">
                {tableOfContents.length > 0 && (
                  <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-900">Table of Contents</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Jump to any section on this tab.
                      </p>
                    </div>
                    <div className="divide-y">
                      {tableOfContents.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => scrollToAnchor(entry.id)}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50"
                        >
                          {entry.label}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {hasYearFilters && yearFilterPanel}
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
                          <PageBlockRenderer block={block} />
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

      {isTabListOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 md:hidden">
          <div className="absolute inset-0 bg-white text-gray-900 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-lg font-semibold">All Sections</h2>
              <button
                type="button"
                className="text-sm font-medium text-blue-600"
                onClick={() => setIsTabListOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ul className="divide-y">
                {tabDescriptors.map((tab) => (
                  <li key={tab.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsTabListOpen(false);
                      }}
                      className={`w-full text-left px-5 py-4 text-base font-medium ${
                        activeTab === tab.id ? 'text-blue-600 bg-blue-50' : 'text-gray-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
