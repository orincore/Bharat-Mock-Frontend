"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageBlockRenderer } from "@/components/PageEditor/PageBlockRenderer";
import { getCleanContentLabel } from "@/lib/utils";
import { Download, ChevronRight, ChevronLeft, ArrowRight, BookOpen, List, X } from "lucide-react";
import { toast } from "sonner";

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
  category_custom_tab_id?: string | null;
  settings?: Record<string, any>;
  blocks: Block[];
}

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
type HeadingTag = (typeof HEADING_TAGS)[number];

const resolveHeadingTag = (value?: string | null, fallback: HeadingTag = 'h2'): HeadingTag =>
  HEADING_TAGS.includes((value || '').toLowerCase() as HeadingTag)
    ? ((value || '').toLowerCase() as HeadingTag)
    : fallback;

const shouldSkipSectionHeading = (section: Section) => {
  const sectionTitleText = getCleanContentLabel(section.title).toLowerCase();
  if (!sectionTitleText || sectionTitleText === 'untitled section') return true;

  return (section.blocks || []).some((block) => {
    if (!block?.content) return false;

    if (block.block_type === 'heading') {
      return getCleanContentLabel(block.content?.text).toLowerCase() === sectionTitleText;
    }

    if (block.block_type === 'paragraph') {
      return getCleanContentLabel(block.content?.text).toLowerCase().includes(sectionTitleText);
    }

    return false;
  });
};

const getSectionTocLabel = (section: Section): string => {
  const directTitle = getCleanContentLabel(section.title);
  if (directTitle) {
    return directTitle;
  }

  for (const block of section.blocks || []) {
    const candidate = getCleanContentLabel(block?.content?.text);
    if (candidate) {
      return candidate;
    }
  }

  return (section.section_key || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

interface CustomTab {
  id: string;
  title: string;
  tab_key: string;
  description?: string | null;
  display_order: number;
}

type TabDescriptor = {
  id: string;
  label: string;
  slug: string;
};

interface PageContentResponse {
  sections: Section[];
  orphanBlocks: Block[];
  seo?: {
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    canonical_url?: string;
    author_name?: string;
    updated_at?: string;
  };
  customTabs?: CustomTab[];
  tabSeo?: Record<string, { meta_title?: string; meta_description?: string; meta_keywords?: string }>;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  icon: string | null;
}

interface SubcategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
}

interface NewCategoryPageProps {
  categorySlug: string;
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

const sanitizeTabSlug = (value: string | null | undefined) => {
  if (!value) return "";
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to convert image to data URL"));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });

const inlineImagesForPdf = async (root: HTMLElement | null) => {
  if (!root) {
    return () => {};
  }

  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  const replacements: { img: HTMLImageElement; originalSrc: string }[] = [];

  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return;

      try {
        const response = await fetch(src, { mode: "cors" });
        if (!response.ok) throw new Error("Failed to fetch image");
        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        replacements.push({ img, originalSrc: src });
        img.src = dataUrl;
      } catch (error) {
        console.warn("[NewCategoryPage] Failed to inline image for PDF", error);
      }
    })
  );

  return () => {
    replacements.forEach(({ img, originalSrc }) => {
      img.src = originalSrc;
    });
  };
};

export default function NewCategoryPage({
  categorySlug,
  initialTabSlug,
}: NewCategoryPageProps) {
  const router = useRouter();
  const overviewRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [pageContent, setPageContent] = useState<PageContentResponse | null>(null);
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTabListOpen, setIsTabListOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Fetch category info + subcategories
  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const categoryRes = await fetch(
          buildApiUrl(`/taxonomy/category/${categorySlug}`)
        );
        if (!categoryRes.ok) {
          throw new Error("Category not found");
        }
        const categoryData = await categoryRes.json();
        const cat = categoryData.data || categoryData;
        if (!cat?.id) {
          throw new Error("Category not found");
        }
        setCategory(cat);

        // Fetch subcategories
        const subRes = await fetch(
          buildApiUrl(`/taxonomy/subcategories?category_id=${cat.id}`)
        );
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubcategories(subData.data || []);
        }

        // Fetch page content for this category
        const contentRes = await fetch(
          buildApiUrl(`/category-page-content/${cat.id}`)
        );
        if (contentRes.ok) {
          const contentData = await contentRes.json();
          setPageContent(contentData);
          const nextTabs = Array.isArray(contentData.customTabs)
            ? contentData.customTabs
            : [];
          setCustomTabs(nextTabs);
        } else {
          setPageContent({ sections: [], orphanBlocks: [] });
        }
      } catch (err: any) {
        setError(err.message || "Unable to load category");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategory();
  }, [categorySlug]);

  // Tab descriptors: Overview + custom tabs + Exam Categories (subcategories)
  const tabDescriptors: TabDescriptor[] = useMemo(() => {
    const staticTabs: TabDescriptor[] = [
      { id: "overview", label: "Overview", slug: "overview" },
    ];

    const customDescriptors: TabDescriptor[] = customTabs.map((tab) => ({
      id: tab.id,
      label: tab.title,
      slug: sanitizeTabSlug(tab.tab_key || tab.title || tab.id),
    }));

    return [...staticTabs, ...customDescriptors];
  }, [customTabs]);

  // Handle initial tab from URL
  const normalizedInitialTabSlug = useMemo(
    () => sanitizeTabSlug(initialTabSlug),
    [initialTabSlug]
  );
  const [hasAppliedInitialTab, setHasAppliedInitialTab] = useState(
    !initialTabSlug
  );

  useEffect(() => {
    if (hasAppliedInitialTab) return;
    if (!initialTabSlug || !normalizedInitialTabSlug) {
      setHasAppliedInitialTab(true);
      return;
    }
    const match = tabDescriptors.find(
      (tab) => tab.slug === normalizedInitialTabSlug
    );
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
  }, [
    initialTabSlug,
    normalizedInitialTabSlug,
    tabDescriptors,
    activeTab,
    hasAppliedInitialTab,
    pageContent,
  ]);

  const currentTabDescriptor =
    tabDescriptors.find((tab) => tab.id === activeTab) || tabDescriptors[0];

  // URL sync
  useEffect(() => {
    if (!categorySlug || !hasAppliedInitialTab || typeof window === "undefined")
      return;
    const normalizedTab = currentTabDescriptor?.slug || "overview";
    const targetPath =
      normalizedTab === "overview"
        ? `/${categorySlug}`
        : `/${categorySlug}/${normalizedTab}`;
    if (window.location.pathname === targetPath) return;
    const nextUrl = `${targetPath}${window.location.search}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [currentTabDescriptor?.slug, categorySlug, hasAppliedInitialTab]);

  // PDF download for overview tab
  const handleDownloadOverviewPdf = async () => {
    if (!overviewRef.current) return;
    try {
      setDownloadingPdf(true);
      toast.loading("Generating PDF...", { id: "category-pdf" });

      const html2pdf = (await import("html2pdf.js")).default;
      const element = overviewRef.current;
      const restoreImages = await inlineImagesForPdf(element);
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${category?.name || categorySlug}-overview.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(element).save();
      restoreImages();
      toast.success("PDF downloaded!", { id: "category-pdf" });
    } catch (err) {
      console.error("[NewCategoryPage] PDF generation failed", err);
      toast.error("Failed to generate PDF. Please try again.", {
        id: "category-pdf",
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Derived data
  const heroTitle = category?.name || categorySlug?.toUpperCase();
  const heroSubtitle = (category?.description || "").trim();

  const breadcrumbs = useMemo(() => {
    const items = [{ label: "Home", href: "/" }];
    if (category?.name) {
      items.push({ label: category.name, href: `/${categorySlug}` });
    }
    if (currentTabDescriptor && currentTabDescriptor.id !== "overview") {
      items.push({
        label: currentTabDescriptor.label,
        href: `/${categorySlug}/${currentTabDescriptor.slug}`,
      });
    }
    return items;
  }, [category, categorySlug, currentTabDescriptor]);

  // Update all meta tags (title, description, keywords, canonical) when active tab or content changes
  useEffect(() => {
    if (!pageContent) return;
    const tabId = currentTabDescriptor?.id;
    const tabOverride = tabId ? pageContent?.tabSeo?.[tabId] : undefined;

    console.log('[Tab SEO Debug - Category]', { tabId, tabOverride, allTabSeo: pageContent?.tabSeo, globalSeo: pageContent?.seo });

    // --- Title ---
    if (tabOverride?.meta_title) {
      document.title = tabOverride.meta_title;
    } else {
      const tabLabel = tabId && tabId !== 'overview' ? currentTabDescriptor?.label : null;
      document.title = tabLabel ? `${tabLabel} - ${heroTitle}` : (pageContent?.seo?.meta_title || heroTitle);
    }

    const setMeta = (name: string, content: string | undefined) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (content) {
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute('name', name);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      } else if (el) {
        el.remove();
      }
    };

    const setCanonical = (url: string | undefined) => {
      let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (url) {
        if (!el) {
          el = document.createElement('link');
          el.setAttribute('rel', 'canonical');
          document.head.appendChild(el);
        }
        el.setAttribute('href', url);
      } else if (el) {
        el.remove();
      }
    };

    setMeta('description', tabOverride?.meta_description || pageContent?.seo?.meta_description);
    setMeta('keywords', tabOverride?.meta_keywords || pageContent?.seo?.meta_keywords);
    setCanonical(pageContent?.seo?.canonical_url);
  }, [currentTabDescriptor?.id, currentTabDescriptor?.label, heroTitle, pageContent]);

  const sections = pageContent?.sections ?? [];
  const sidebarSections = sections.filter((s) => s.is_sidebar);
  const hasSidebar = sidebarSections.length > 0;
  const containerClass = "w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12";

  const getSectionsForTab = (tabId: string) => {
    if (tabId === "overview") {
      return sections.filter(
        (s) => !s.is_sidebar && !s.category_custom_tab_id && !s.custom_tab_id
      );
    }
    if (customTabs.some((tab) => tab.id === tabId)) {
      return sections.filter(
        (s) =>
          !s.is_sidebar &&
          (s.category_custom_tab_id === tabId || s.custom_tab_id === tabId)
      );
    }
    return [];
  };

  const visibleSections = getSectionsForTab(activeTab);
  const tabItems = tabDescriptors.map(({ id, label }) => ({ id, label }));
  const isContentTab = true;

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 90;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const tableOfContents = useMemo(() => {
    return visibleSections
      .filter(s => !s.is_sidebar)
      .map(section => {
        const decoded = getSectionTocLabel(section);
        return { id: section.section_key, label: decoded };
      })
      .filter(e => Boolean(e.id) && Boolean(e.label));
  }, [visibleSections]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading category...</p>
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-2xl font-semibold text-gray-800">
          Category not found
        </p>
        <p className="text-gray-500 mt-2">{error}</p>
        <button
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg"
          onClick={() => router.push("/")}
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className={containerClass}>
          <div className="text-left">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              {heroTitle}
            </h1>
            {heroSubtitle && (
              <p className="text-xl md:text-2xl text-blue-100 mb-4 max-w-3xl">
                {heroSubtitle}
              </p>
            )}
            {(pageContent?.seo?.author_name || pageContent?.seo?.updated_at) && (
              <div className="flex flex-wrap items-center gap-3 mb-3 text-sm text-blue-100/80">
                {pageContent.seo.author_name && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    {pageContent.seo.author_name}
                  </span>
                )}
                {pageContent.seo.author_name && pageContent.seo.updated_at && <span className="text-blue-200/40">·</span>}
                {pageContent.seo.updated_at && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Updated {new Date(pageContent.seo.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>
            )}
            <nav className="flex flex-wrap items-center gap-2 text-sm text-blue-100/80">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={`${crumb.label}-${index}`}>
                  {index > 0 && (
                    <span className="text-blue-200/60">/</span>
                  )}
                  <Link href={crumb.href} className="hover:underline">
                    {crumb.label}
                  </Link>
                </React.Fragment>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className={containerClass}>
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
                {tabItems.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
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

      {/* Content */}
      <div className={`${containerClass} py-10`}>
        <div
          className={`grid grid-cols-1 gap-8 ${
            hasSidebar
              ? "lg:grid-cols-[minmax(0,2.6fr)_minmax(280px,1fr)] xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]"
              : ""
          }`}
        >
          <div>
            {/* Download PDF button for overview */}
            {activeTab === "overview" && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleDownloadOverviewPdf}
                  disabled={downloadingPdf}
                  className="inline-flex items-center px-4 py-2 rounded-full border text-sm font-semibold text-blue-600 border-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {downloadingPdf ? "Generating..." : "Download PDF"}
                </button>
              </div>
            )}

            {/* Content tabs (overview + custom) */}
            {isContentTab && (
              <div ref={activeTab === "overview" ? overviewRef : undefined}>
                {activeTab === "overview" && subcategories.length > 0 && (
                  <div className="mb-8">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Exam Categories
                        </p>
                        <div className="text-2xl font-bold text-gray-900">
                          Pick your exact exam category
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 max-w-xl">
                        Select any exam below to jump into its dedicated page with syllabus, mock tests, previous year papers, and more.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                      {subcategories.map((sub) => {
                        const logoUrl = sub.logo_url || category?.logo_url || null;
                        return (
                          <Link
                            key={sub.id}
                            href={`/${sub.slug}`}
                            className="group flex flex-col items-center justify-center p-3 md:p-5 bg-white border border-slate-200 rounded-xl md:rounded-2xl hover:border-blue-300 hover:shadow-md transition-all duration-200 text-center min-h-[100px] md:min-h-[140px]"
                          >
                            <div className="w-12 h-12 md:w-20 md:h-20 flex items-center justify-center overflow-hidden mb-2 md:mb-3 group-hover:scale-110 transition-transform">
                              {logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={logoUrl}
                                  alt={sub.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <BookOpen className="h-8 w-8 text-blue-600" />
                              )}
                            </div>
                            <div className="flex-1 w-full">
                              <p className="text-[10px] md:text-sm font-bold text-slate-800 leading-[1.3] line-clamp-2 md:line-clamp-none">
                                {sub.name}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {pageContent?.orphanBlocks?.map((block) => (
                  <div key={block.id} className="mb-6">
                    <PageBlockRenderer block={block} />
                  </div>
                ))}

                {visibleSections.length === 0 &&
                (!pageContent?.orphanBlocks ||
                  pageContent.orphanBlocks.length === 0) ? (
                  <div className="bg-white rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
                    No content yet. Check back later or explore the exam
                    cards above.
                  </div>
                ) : (
                  visibleSections.map((section) => (
                    <section
                      key={section.id}
                      id={section.section_key}
                      className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                      style={{
                        backgroundColor:
                          section.background_color || "white",
                        color: section.text_color || "inherit",
                      }}
                    >
                      {/* Section titles hidden to match subcategory page design */}
                      <div className="p-6">
                        {section.blocks.map((block) => (
                          <div key={block.id} className="mb-4">
                            <PageBlockRenderer block={block} />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>
            )}

            {/* Exam categories moved inside overview tab */}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            {(sidebarSections.length > 0 || tableOfContents.length > 0) && (
              <div className="sticky top-24 space-y-6 max-h-[calc(100vh-7rem)] overflow-y-auto">
                {tableOfContents.length > 0 && (
                  <section className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <div className="text-lg font-bold text-gray-900">Table of Contents</div>
                      <p className="mt-1 text-sm text-gray-600">Jump to any section on this tab.</p>
                    </div>
                    <div className="divide-y">
                      {tableOfContents.map((entry, idx) => (
                        <button
                          key={`${entry.id}-${idx}`}
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
                {sidebarSections.map((section) => (
                  <section
                    key={section.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                    style={{
                      backgroundColor:
                        section.background_color || "white",
                      color: section.text_color || "inherit",
                    }}
                  >
                    {/* Sidebar section titles hidden to match subcategory page design */}
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

      {/* Mobile TOC — floating button + bottom drawer */}
      {tableOfContents.length > 0 && (() => {
        const MobileTocDrawer = () => {
          const [open, setOpen] = React.useState(false);
          return (
            <div className="lg:hidden">
              {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />}
              <div className={`fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm text-foreground">Table of Contents</span>
                  </div>
                  <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted transition">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <nav className="overflow-y-auto max-h-[60vh] pb-safe p-3 space-y-0.5">
                  {tableOfContents.map((entry, idx) => (
                    <button
                      key={`${entry.id}-${idx}`}
                      type="button"
                      onClick={() => { scrollToAnchor(entry.id); setOpen(false); }}
                      className="w-full flex items-start gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted hover:text-primary transition text-left group"
                    >
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0 group-hover:bg-primary" />
                      <span className="text-foreground group-hover:text-primary leading-snug">{entry.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
              <button
                onClick={() => setOpen(true)}
                className="fixed bottom-5 left-4 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold"
              >
                <List className="h-4 w-4" />
                Contents
              </button>
            </div>
          );
        };
        return <MobileTocDrawer />;
      })()}

      {/* Mobile tab list overlay */}
      {isTabListOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 md:hidden">
          <div className="absolute inset-0 bg-white text-gray-900 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="text-lg font-bold text-gray-900 mb-4 px-2">All Sections</div>
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
                        activeTab === tab.id
                          ? "text-blue-600 bg-blue-50"
                          : "text-gray-800"
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
