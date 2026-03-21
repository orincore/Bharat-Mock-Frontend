"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PageBlockRenderer } from "@/components/PageEditor/PageBlockRenderer";
import { examPdfService } from "@/lib/api/examPdfService";
import { generateExamPDF } from "@/lib/utils/pdfGenerator";
import { toast } from "sonner";
import { Download, Lock, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from "@/context/AuthContext";
import { StandardExamCard } from "@/components/exam/StandardExamCard";

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
  tocOrder?: Record<string, number>;
  tabHeadings?: Record<string, string>;
  tabSeo?: Record<string, { meta_title?: string; meta_description?: string; meta_keywords?: string }>;
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

const extractTierFromTitle = (title?: string | null): string | null => {
  if (!title) return null;
  const tierMatch = title.match(/tier[-\s]?([ivx]+|\d)/i);
  if (tierMatch && tierMatch[1]) {
    const raw = tierMatch[1].toUpperCase();
    const numberMap: Record<string, string> = {
      '1': 'I',
      '2': 'II',
      '3': 'III',
      '4': 'IV',
      '5': 'V'
    };
    const normalized = numberMap[raw] || raw.replace(/[^IVX]/g, '') || raw;
    return `Tier-${normalized}`;
  }

  if (/prelims?/i.test(title)) return 'Tier-I';
  if (/mains?/i.test(title)) return 'Tier-II';
  return null;
};

const getExamTierLabel = (exam: any): string | null => {
  if (!exam) return null;
  if (exam.tier_label) return exam.tier_label;
  if (typeof exam.tier === 'string' && exam.tier.trim()) return exam.tier.trim();

  if (exam.exam) {
    if (exam.exam.tier_label) return exam.exam.tier_label;
    if (typeof exam.exam.tier === 'string' && exam.exam.tier.trim()) return exam.exam.tier.trim();
  }

  return extractTierFromTitle(exam.title || exam.exam?.title || '');
};

const MobileTOC = ({
  tableOfContents,
  scrollToAnchor,
}: {
  tableOfContents: TableOfContentsEntry[];
  scrollToAnchor: (id: string) => void;
}) => (
  <section className="lg:hidden mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
    <div className="p-4 border-b border-slate-100">
      <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">On this page</p>
      <p className="text-sm text-slate-500 mt-1">Jump to a section</p>
    </div>
    <div className="divide-y">
      {tableOfContents.map((entry, idx) => (
        <button
          key={`${entry.id || 'toc'}-${idx}`}
          type="button"
          onClick={() => scrollToAnchor(entry.id)}
          className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50"
        >
          {entry.label}
        </button>
      ))}
    </div>
  </section>
);

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
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingExamId, setDownloadingExamId] = useState<string | null>(null);
  const [isTabListOpen, setIsTabListOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const tabScrollRef = useRef<HTMLDivElement>(null);

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
  const isInitialTabLoad = useRef(true);

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

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (!basePath || !tabDescriptors.length) return;
      const pathParts = window.location.pathname.replace(/^\//, '').split('/');
      const tabSlugFromUrl = pathParts.length >= 2 ? pathParts[pathParts.length - 1] : 'overview';
      const match = tabDescriptors.find((t) => t.slug === tabSlugFromUrl) || tabDescriptors[0];
      if (match && match.id !== activeTab) {
        setActiveTab(match.id);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [basePath, tabDescriptors, activeTab]);

  useEffect(() => {
    if (!basePath || !hasAppliedInitialTab || typeof window === 'undefined') return;
    const normalizedTab = currentTabDescriptor?.slug || 'overview';
    const targetPath = normalizedTab === 'overview' ? `/${basePath}` : `/${basePath}/${normalizedTab}`;
    if (window.location.pathname === targetPath) {
      isInitialTabLoad.current = false;
      return;
    }
    const nextUrl = `${targetPath}${window.location.search}${window.location.hash}`;
    if (isInitialTabLoad.current) {
      window.history.replaceState(window.history.state, '', nextUrl);
      isInitialTabLoad.current = false;
    } else {
      window.history.pushState(window.history.state, '', nextUrl);
    }
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

  // Update document title when active tab or heroTitle changes
  useEffect(() => {
    if (!heroTitle) return;
    const tabId = currentTabDescriptor?.id;
    const tabOverride = tabId ? pageContent?.tabSeo?.[tabId] : undefined;
    if (tabOverride?.meta_title) {
      document.title = tabOverride.meta_title;
      return;
    }
    const customHeading = tabId ? pageContent?.tabHeadings?.[tabId] : null;
    const tabLabel = tabId && tabId !== 'overview'
      ? (customHeading || currentTabDescriptor?.label)
      : null;
    document.title = tabLabel ? `${tabLabel} - ${heroTitle}` : heroTitle;
  }, [currentTabDescriptor?.id, currentTabDescriptor?.label, heroTitle, pageContent?.tabHeadings, pageContent?.tabSeo]);

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
      const examData = exam?.exam ?? exam;
      if (!examData) return;
      const key =
        fallbackKey ||
        examData.id ||
        examData.slug ||
        examData.exam_id ||
        `${examData.title || 'exam'}-${uniqueMap.size}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, examData);
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

  const availableMockTestTiers = useMemo(() => {
    const tiers = new Set<string>();
    extendedMockTests.forEach((exam) => {
      const tierLabel = getExamTierLabel(exam);
      if (tierLabel) tiers.add(tierLabel);
    });
    return Array.from(tiers).sort();
  }, [extendedMockTests]);

  const availablePreviousPaperYears = useMemo(() => {
    const years = new Set<string>();
    combinedQuestionPapers.forEach((exam) => {
      const year = extractYearFromTitle(exam.title);
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [combinedQuestionPapers]);

  const availablePreviousPaperTiers = useMemo(() => {
    const tiers = new Set<string>();
    combinedQuestionPapers.forEach((exam) => {
      const tierLabel = getExamTierLabel(exam) || getExamTierLabel(exam.exam);
      if (tierLabel) tiers.add(tierLabel);
    });
    return Array.from(tiers).sort();
  }, [combinedQuestionPapers]);

  const filteredMockTests = useMemo(() => {
    return extendedMockTests.filter((exam) => {
      const year = extractYearFromTitle(exam.title);
      const tierLabel = getExamTierLabel(exam);
      const matchesYear = selectedYears.length === 0 || (year && selectedYears.includes(year));
      const matchesTier = selectedTiers.length === 0 || (tierLabel && selectedTiers.includes(tierLabel));
      return matchesYear && matchesTier;
    });
  }, [extendedMockTests, selectedYears, selectedTiers]);

  const filteredPreviousPapers = useMemo(() => {
    return combinedQuestionPapers.filter((exam) => {
      const year = extractYearFromTitle(exam.title);
      const tierLabel = getExamTierLabel(exam) || getExamTierLabel(exam.exam);
      const matchesYear = selectedYears.length === 0 || (year && selectedYears.includes(year));
      const matchesTier = selectedTiers.length === 0 || (tierLabel && selectedTiers.includes(tierLabel));
      return matchesYear && matchesTier;
    });
  }, [combinedQuestionPapers, selectedYears, selectedTiers]);

  const toggleYear = (year: string) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const clearYearFilters = () => setSelectedYears([]);

  const toggleTier = (tier: string) => {
    setSelectedTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]
    );
  };

  const clearTierFilters = () => setSelectedTiers([]);

  const isFilterTab = activeTab === 'mock-tests' || activeTab === 'previous-papers';
  const currentYearOptions = activeTab === 'mock-tests' ? availableMockTestYears : availablePreviousPaperYears;
  const hasYearFilters = isFilterTab && currentYearOptions.length > 0;
  const tierOptions = isFilterTab
    ? activeTab === 'mock-tests'
      ? availableMockTestTiers
      : availablePreviousPaperTiers
    : [];
  const hasTierFilters = isFilterTab && tierOptions.length > 0;

  const FiltersPanel = ({ className = '' }: { className?: string }) => {
    if (!hasYearFilters && !hasTierFilters) return null;
    return (
      <div className={`rounded-2xl border border-slate-200 bg-white/90 shadow-sm p-5 space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs  tracking-wide text-blue-600 font-semibold">Filters</p>
              <p className="text-sm text-slate-500">Refine the list by year or tier</p>
            </div>
          </div>
          {(selectedYears.length > 0 || selectedTiers.length > 0) && (
            <button
              type="button"
              onClick={() => {
                clearYearFilters();
                clearTierFilters();
              }}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Reset
            </button>
          )}
        </div>

        {hasYearFilters && (
          <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Year</p>
                <p className="text-xs text-slate-500">Select multiple years</p>
              </div>
              {selectedYears.length > 0 && (
                <button
                  type="button"
                  onClick={clearYearFilters}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {currentYearOptions.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => toggleYear(year)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    selectedYears.includes(year)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasTierFilters && (
          <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-900">Tier</p>
                <p className="text-xs text-emerald-600">Choose exam tiers</p>
              </div>
              {selectedTiers.length > 0 && (
                <button
                  type="button"
                  onClick={clearTierFilters}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {tierOptions.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => toggleTier(tier)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    selectedTiers.includes(tier)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-emerald-200 text-emerald-700 hover:border-emerald-400 hover:text-emerald-600'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

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
      .map((section) => {
        const rawLabel = section.title || 'Untitled Section';
        // Strip HTML tags so TOC shows plain text
        const plainLabel = rawLabel.replace(/<[^>]*>/g, '').trim() || 'Untitled Section';
        return {
          id: buildSectionAnchor(section),
          label: plainLabel,
        };
      })
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
          {(() => {
            const tabId = currentTabDescriptor?.id;
            const tabOverride = tabId ? pageContent.tabSeo?.[tabId] : undefined;
            const effectiveTitle = tabOverride?.meta_title
              || (tabId && tabId !== 'overview'
                ? `${pageContent.tabHeadings?.[tabId] || currentTabDescriptor?.label} - ${pageContent.seo.meta_title || heroTitle}`
                : (pageContent.seo.meta_title || heroTitle));
            const effectiveDesc = tabOverride?.meta_description || pageContent.seo.meta_description;
            const effectiveKeywords = tabOverride?.meta_keywords || pageContent.seo.meta_keywords;
            return (
              <>
                <title>{effectiveTitle}</title>
                {effectiveDesc && <meta name="description" content={effectiveDesc} />}
                {effectiveKeywords && <meta name="keywords" content={effectiveKeywords} />}
                {pageContent.seo.canonical_url && <link rel="canonical" href={pageContent.seo.canonical_url} />}
              </>
            );
          })()}
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
        <div className="container-main relative z-10">
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
              <h1 className="text-2xl md:text-3xl font-bold mb-3 leading-tight">
                {(currentTabDescriptor && pageContent?.tabHeadings?.[currentTabDescriptor.id])
                  ? pageContent.tabHeadings[currentTabDescriptor.id]
                  : heroTitle}
              </h1>
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
        <div className="container-main">
          <div className="flex items-center py-4" style={{ gap: "8px" }}>
            {/* Left scroll arrow */}
            <button
              type="button"
              aria-label="Scroll tabs left"
              className="tab-scroll-arrow flex-shrink-0 items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors shadow-sm"
              onClick={() => tabScrollRef.current?.scrollBy({ left: -160, behavior: "smooth" })}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div ref={tabScrollRef} className="flex-1 overflow-x-auto hide-scrollbar">
              <div className="flex items-center space-x-6">
                {tabItems.map((tab) => {
                  const tabDescriptor = tabDescriptors.find((t) => t.id === tab.id);
                  const tabHref = tabDescriptor?.slug === 'overview' || !tabDescriptor?.slug
                    ? `/${basePath}`
                    : `/${basePath}/${tabDescriptor.slug}`;
                  return (
                    <a
                      key={tab.id}
                      href={tabHref}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey) return; // let browser open new tab
                        e.preventDefault();
                        setActiveTab(tab.id);
                      }}
                      className={`whitespace-nowrap text-sm font-medium transition-colors ${
                        activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-700 hover:text-blue-600'
                      }`}
                    >
                      {tab.label}
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Right scroll arrow */}
            <button
              type="button"
              aria-label="Scroll tabs right"
              className="tab-scroll-arrow flex-shrink-0 items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors shadow-sm"
              onClick={() => tabScrollRef.current?.scrollBy({ left: 160, behavior: "smooth" })}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Mobile "More" button */}
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

      <div className="container-main py-10">
        {isFilterTab && (hasYearFilters || hasTierFilters) && (
          <div className="mb-6 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(prev => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600"
            >
              <Filter className="h-4 w-4" />
              {mobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}
            </button>
            {mobileFiltersOpen && <FiltersPanel className="mt-4" />}
          </div>
        )}
        {/* Tab heading is shown in the hero h1 above */}
        {/* Mobile TOC and content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            {isContentTab && (
              <>
                {pageContent?.orphanBlocks?.map((block) => (
                  <div key={block.id} className="mb-6">
                    <PageBlockRenderer block={block} />
                  </div>
                ))}

                {/* Mobile TOC — rendered inline at the position set in admin */}
                {tableOfContents.length > 0 && (() => {
                  const tocPos = pageContent?.tocOrder?.[activeTab] ?? 0;
                  return tocPos === 0 ? (
                    <MobileTOC key="toc-mobile" tableOfContents={tableOfContents} scrollToAnchor={scrollToAnchor} />
                  ) : null;
                })()}

                {visibleSections.length === 0 && (!pageContent?.orphanBlocks || pageContent.orphanBlocks.length === 0) && !isSpecialTab ? (
                  <div className="bg-white rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
                    No Content Yet! Come again later...
                  </div>
                ) : (
                  <>
                    {visibleSections.map((section, sectionIndex) => {
                      const sectionAnchor = buildSectionAnchor(section);
                      const renderReservedBefore = isSpecialTab && sectionIndex === reservedPosition;
                      // Insert mobile TOC after section at index (tocPos - 1)
                      const tocPos = pageContent?.tocOrder?.[activeTab] ?? 0;
                      const renderTocAfter = tableOfContents.length > 0 && tocPos > 0 && sectionIndex === tocPos - 1;
                      const reservedContent = activeTab === 'mock-tests' ? (
                        <div key="reserved-area" className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                          <h2 className="text-xl font-semibold mb-4">Mock Tests</h2>
                          {mockTestsLoading ? (
                            <p className="text-sm text-gray-500">Loading mock tests...</p>
                          ) : filteredMockTests.length === 0 ? (
                            <p className="text-sm text-gray-600">{selectedYears.length > 0 ? 'No mock tests found for selected years.' : 'No mock tests available yet.'}</p>
                          ) : (
                            <div className="space-y-4">
                              {filteredMockTests.map((rawExam, examIndex) => {
                                const examData = rawExam?.exam ?? rawExam;
                                if (!examData) return null;
                                const examKey = examData.id || examData.slug || `mock-exam-${examIndex}`;
                                const canAccess = examData.is_free || user?.is_premium;
                                const hasPdfEn = Boolean(examData.pdf_url_en);
                                const hasPdfHi = Boolean(examData.pdf_url_hi);
                                const fallbackPdf = examData.download_url || examData.pdf_url || examData.file_url;
                                return (
                                  <div key={examKey} className="border rounded-xl p-4 flex flex-col gap-3">
                                    <h3 className="text-base font-semibold text-gray-900">{examData.title}</h3>
                                    <div className="flex items-end justify-between gap-3 flex-wrap">
                                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                        {examData.total_questions && <span>{examData.total_questions} Questions</span>}
                                        {examData.duration && <span>{examData.duration} mins</span>}
                                        {examData.total_marks && <span>{examData.total_marks} Marks</span>}
                                        {examData.is_free && <span className="text-green-600 font-semibold">Free</span>}
                                      </div>
                                      <div className="flex flex-wrap gap-2 flex-shrink-0">
                                        {hasPdfEn && (
                                          <a href={examData.pdf_url_en} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            English
                                          </a>
                                        )}
                                        {hasPdfHi && (
                                          <a href={examData.pdf_url_hi} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            Hindi
                                          </a>
                                        )}
                                        {!hasPdfEn && !hasPdfHi && fallbackPdf && (
                                          <a href={fallbackPdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            Download PDF
                                          </a>
                                        )}
                                        <Link
                                          href={examData.url_path || `/exams/${examData.slug || examData.id}`}
                                          className={`inline-flex items-center justify-center px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${canAccess ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                                        >
                                          {!canAccess && <Lock className="w-3.5 h-3.5 mr-1.5" />}
                                          {canAccess ? 'Attempt Now' : 'Unlock Premium'}
                                        </Link>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div key="reserved-area" className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                          <h2 className="text-xl font-semibold mb-4">Previous Year Question Papers</h2>
                          {questionPapersLoading || pastPaperLoading ? (
                            <p className="text-sm text-gray-500">Loading question papers...</p>
                          ) : filteredPreviousPapers.length === 0 ? (
                            <p className="text-sm text-gray-600">{selectedYears.length > 0 ? 'No question papers found for selected years.' : 'No question papers available yet.'}</p>
                          ) : (
                            <div className="space-y-4">
                              {filteredPreviousPapers.map((paper) => {
                                const examData = paper.exam ?? paper;
                                if (!examData) return null;
                                const paperKey = paper.id || examData.id;
                                const canAccess = examData.is_free || user?.is_premium;
                                const pdfEn = paper.pdf_url_en || examData.pdf_url_en;
                                const pdfHi = paper.pdf_url_hi || examData.pdf_url_hi;
                                const fallbackPdf = paper.download_url || paper.file_url;
                                const mergedExam = {
                                  ...examData,
                                  title: paper.title || examData.title,
                                  total_questions: paper.total_questions ?? examData.total_questions,
                                  duration: paper.duration ?? examData.duration,
                                  total_marks: paper.total_marks ?? examData.total_marks,
                                  url_path: paper.url_path || examData.url_path,
                                  pdf_url_en: pdfEn,
                                  pdf_url_hi: pdfHi,
                                  download_url: fallbackPdf,
                                };
                                const hasPdfEn = Boolean(pdfEn);
                                const hasPdfHi = Boolean(pdfHi);
                                return (
                                  <div key={paperKey} className="border rounded-xl p-4 flex flex-col gap-3">
                                    <h3 className="text-base font-semibold text-gray-900">{mergedExam.title}</h3>
                                    <div className="flex items-end justify-between gap-3 flex-wrap">
                                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                        {mergedExam.total_questions && <span>{mergedExam.total_questions} Questions</span>}
                                        {mergedExam.duration && <span>{mergedExam.duration} mins</span>}
                                        {mergedExam.total_marks && <span>{mergedExam.total_marks} Marks</span>}
                                        {mergedExam.is_free && <span className="text-green-600 font-semibold">Free</span>}
                                      </div>
                                      <div className="flex flex-wrap gap-2 flex-shrink-0">
                                        {hasPdfEn && (
                                          <a href={pdfEn} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            English
                                          </a>
                                        )}
                                        {hasPdfHi && (
                                          <a href={pdfHi} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            Hindi
                                          </a>
                                        )}
                                        {!hasPdfEn && !hasPdfHi && fallbackPdf && (
                                          <a href={fallbackPdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            Download PDF
                                          </a>
                                        )}
                                        <Link
                                          href={mergedExam.url_path || `/exams/${mergedExam.slug || mergedExam.id}`}
                                          className={`inline-flex items-center justify-center px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${canAccess ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                                        >
                                          {!canAccess && <Lock className="w-3.5 h-3.5 mr-1.5" />}
                                          {canAccess ? 'Attempt Now' : 'Unlock Premium'}
                                        </Link>
                                      </div>
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
                            key={section.id}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6 last:mb-0"
                            id={sectionAnchor}
                            style={{
                              backgroundColor: section.background_color || 'white',
                              color: section.text_color || 'inherit'
                            }}
                          >
                            <div className="p-4 sm:p-6">
                              {section.blocks.map((block) => (
                                <div key={block.id} className="mb-4">
                                  <PageBlockRenderer block={block} />
                                </div>
                              ))}
                            </div>
                          </section>
                          {renderTocAfter && (
                            <MobileTOC key="toc-mobile" tableOfContents={tableOfContents} scrollToAnchor={scrollToAnchor} />
                          )}
                        </React.Fragment>
                      );
                    })}
                    {/* TOC at end: when tocPos >= sections count */}
                    {tableOfContents.length > 0 && (() => {
                      const tocPos = pageContent?.tocOrder?.[activeTab] ?? 0;
                      return tocPos > 0 && tocPos >= visibleSections.length ? (
                        <MobileTOC key="toc-mobile-end" tableOfContents={tableOfContents} scrollToAnchor={scrollToAnchor} />
                      ) : null;
                    })()}

                    {isSpecialTab && reservedPosition === visibleSections.length && (
                      activeTab === 'mock-tests' ? (
                        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                          <h2 className="text-xl font-semibold mb-4">Mock Tests</h2>
                          {mockTestsLoading ? (
                            <p className="text-sm text-gray-500">Loading mock tests...</p>
                          ) : filteredMockTests.length === 0 ? (
                            <p className="text-sm text-gray-600">{selectedYears.length > 0 ? 'No mock tests found for selected years.' : 'No mock tests available yet.'}</p>
                          ) : (
                            <div className="space-y-4">
                              {filteredMockTests.map((rawExam, examIndex) => {
                                const examData = rawExam?.exam ?? rawExam;
                                if (!examData) return null;
                                const examKey = examData.id || examData.slug || `mock-exam-${examIndex}`;
                                const canAccess = examData.is_free || user?.is_premium;
                                const hasPdfEn = Boolean(examData.pdf_url_en);
                                const hasPdfHi = Boolean(examData.pdf_url_hi);
                                const fallbackPdf = examData.download_url || examData.pdf_url || examData.file_url;
                                return (
                                  <div key={examKey} className="border rounded-xl p-4 flex flex-col gap-3">
                                    <h3 className="text-base font-semibold text-gray-900">{examData.title}</h3>
                                    <div className="flex items-end justify-between gap-3 flex-wrap">
                                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                        {examData.total_questions && <span>{examData.total_questions} Questions</span>}
                                        {examData.duration && <span>{examData.duration} mins</span>}
                                        {examData.total_marks && <span>{examData.total_marks} Marks</span>}
                                        {examData.is_free && <span className="text-green-600 font-semibold">Free</span>}
                                      </div>
                                      <div className="flex flex-wrap gap-2 flex-shrink-0">
                                        {hasPdfEn && (
                                          <a href={examData.pdf_url_en} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            English
                                          </a>
                                        )}
                                        {hasPdfHi && (
                                          <a href={examData.pdf_url_hi} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            Hindi
                                          </a>
                                        )}
                                        {!hasPdfEn && !hasPdfHi && fallbackPdf && (
                                          <a href={fallbackPdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            Download PDF
                                          </a>
                                        )}
                                        <Link
                                          href={examData.url_path || `/exams/${examData.slug || examData.id}`}
                                          className={`inline-flex items-center justify-center px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${canAccess ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                                        >
                                          {!canAccess && <Lock className="w-3.5 h-3.5 mr-1.5" />}
                                          {canAccess ? 'Attempt Now' : 'Unlock Premium'}
                                        </Link>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                          <h2 className="text-xl font-semibold mb-4">Previous Year Question Papers</h2>
                          {questionPapersLoading || pastPaperLoading ? (
                            <p className="text-sm text-gray-500">Loading question papers...</p>
                          ) : filteredPreviousPapers.length === 0 ? (
                            <p className="text-sm text-gray-600">{selectedYears.length > 0 ? 'No question papers found for selected years.' : 'No question papers available yet.'}</p>
                          ) : (
                            <div className="space-y-4">
                              {filteredPreviousPapers.map((paper) => {
                                const examData = paper.exam ?? paper;
                                if (!examData) return null;
                                const paperKey = paper.id || examData.id;
                                const canAccess = examData.is_free || user?.is_premium;
                                const pdfEn = paper.pdf_url_en || examData.pdf_url_en;
                                const pdfHi = paper.pdf_url_hi || examData.pdf_url_hi;
                                const fallbackPdf = paper.download_url || paper.file_url;
                                const mergedExam = {
                                  ...examData,
                                  title: paper.title || examData.title,
                                  total_questions: paper.total_questions ?? examData.total_questions,
                                  duration: paper.duration ?? examData.duration,
                                  total_marks: paper.total_marks ?? examData.total_marks,
                                  url_path: paper.url_path || examData.url_path,
                                };
                                const hasPdfEn = Boolean(pdfEn);
                                const hasPdfHi = Boolean(pdfHi);
                                return (
                                  <div key={paperKey} className="border rounded-xl p-4 flex flex-col gap-3">
                                    <h3 className="text-base font-semibold text-gray-900">{mergedExam.title}</h3>
                                    <div className="flex items-end justify-between gap-3 flex-wrap">
                                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                        {mergedExam.total_questions && <span>{mergedExam.total_questions} Questions</span>}
                                        {mergedExam.duration && <span>{mergedExam.duration} mins</span>}
                                        {mergedExam.total_marks && <span>{mergedExam.total_marks} Marks</span>}
                                        {mergedExam.is_free && <span className="text-green-600 font-semibold">Free</span>}
                                      </div>
                                      <div className="flex flex-wrap gap-2 flex-shrink-0">
                                        {hasPdfEn && (
                                          <a href={pdfEn} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            English
                                          </a>
                                        )}
                                        {hasPdfHi && (
                                          <a href={pdfHi} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            Hindi
                                          </a>
                                        )}
                                        {!hasPdfEn && !hasPdfHi && fallbackPdf && (
                                          <a href={fallbackPdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            Download PDF
                                          </a>
                                        )}
                                        <Link
                                          href={mergedExam.url_path || `/exams/${mergedExam.slug || mergedExam.id}`}
                                          className={`inline-flex items-center justify-center px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${canAccess ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                                        >
                                          {!canAccess && <Lock className="w-3.5 h-3.5 mr-1.5" />}
                                          {canAccess ? 'Attempt Now' : 'Unlock Premium'}
                                        </Link>
                                      </div>
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-xl font-semibold mb-4">Previous Year Question Papers</h2>
                {questionPapersLoading || pastPaperLoading ? (
                  <p className="text-sm text-gray-500">Loading question papers...</p>
                ) : combinedQuestionPapers.length === 0 ? (
                  <p className="text-sm text-gray-600">No question papers available yet.</p>
                ) : (
                  <div className="space-y-4">
                    {combinedQuestionPapers.map((paper) => {
                      const paperExamId = paper.exam_id || paper.exam?.id;
                      const canAccess = (paper.exam?.is_free ?? true) || user?.is_premium;
                      const pdfEn = paper.pdf_url_en || paper.exam?.pdf_url_en;
                      const pdfHi = paper.pdf_url_hi || paper.exam?.pdf_url_hi;
                      const fallbackPdf = paper.download_url || paper.file_url;
                      const hasPdfEn = Boolean(pdfEn);
                      const hasPdfHi = Boolean(pdfHi);
                      return (
                        <div key={paper.id} className="border rounded-xl p-4 flex flex-col gap-3">
                          <h3 className="text-base font-semibold text-gray-900">{paper.title || paper.exam?.title}</h3>
                          <div className="flex items-end justify-between gap-3 flex-wrap">
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                              {paper.exam?.total_questions && <span>{paper.exam.total_questions} Questions</span>}
                              {paper.exam?.duration && <span>{paper.exam.duration} mins</span>}
                              {paper.exam?.total_marks && <span>{paper.exam.total_marks} Marks</span>}
                              {(paper.exam?.is_free ?? true) && <span className="text-green-600 font-semibold">Free</span>}
                            </div>
                            <div className="flex flex-wrap gap-2 flex-shrink-0">
                              {hasPdfEn && (
                                <a href={pdfEn} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                  <Download className="w-3.5 h-3.5 mr-1.5" />
                                  English
                                </a>
                              )}
                              {hasPdfHi && (
                                <a href={pdfHi} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                  <Download className="w-3.5 h-3.5 mr-1.5" />
                                  Hindi
                                </a>
                              )}
                              {!hasPdfEn && !hasPdfHi && fallbackPdf && (
                                <a href={fallbackPdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 transition-colors">
                                  <Download className="w-3.5 h-3.5 mr-1.5" />
                                  Download PDF
                                </a>
                              )}
                              {!hasPdfEn && !hasPdfHi && !fallbackPdf && paperExamId && (
                                <button
                                  onClick={() => handleDownloadExamPDF(paperExamId)}
                                  disabled={downloadingExamId === paperExamId}
                                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full border text-blue-600 border-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5 mr-1.5" />
                                  {downloadingExamId === paperExamId ? 'Preparing…' : 'Download PDF'}
                                </button>
                              )}
                              {paper.exam?.url_path && (
                                <Link
                                  href={paper.exam.url_path}
                                  className={`inline-flex items-center justify-center px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${canAccess ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                                >
                                  {!canAccess && <Lock className="w-3.5 h-3.5 mr-1.5" />}
                                  {canAccess ? 'Attempt Now' : 'Unlock Premium'}
                                </Link>
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
                  <section className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-900">Table of Contents</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Jump to any section on this tab.
                      </p>
                    </div>
                    <div className="divide-y">
                      {tableOfContents.map((entry, tocIndex) => (
                        <button
                          key={`${entry.id || 'toc-entry'}-${tocIndex}`}
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
                {isFilterTab && <FiltersPanel className="hidden lg:block" />}
                {sidebarSections.map((section, sectionIndex) => {
                  const sidebarAnchor = buildSectionAnchor(section);
                  return (
                    <section
                      key={section.id}
                      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${sectionIndex !== sidebarSections.length - 1 ? 'mb-6' : ''}`}
                      id={sidebarAnchor}
                      style={{
                        backgroundColor: section.background_color || 'white',
                        color: section.text_color || 'inherit'
                      }}
                    >
                      <div className="p-4 sm:p-5 space-y-4">
                        {section.blocks.map((block) => (
                          <PageBlockRenderer key={block.id} block={block} />
                        ))}
                      </div>
                    </section>
                  );
                })}
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
