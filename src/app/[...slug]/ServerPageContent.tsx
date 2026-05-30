import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, BookOpen, List } from 'lucide-react';
import { PageBlockRenderer } from '@/components/PageEditor/PageBlockRenderer';
import type { ServerPageData, FirstSegmentType } from './page';
import TabNavigation from './TabNavigation';
import MobileTOC from './MobileTOC';
import DownloadPdfButton from './DownloadPdfButton';

const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const buildApiUrl = (path: string) => `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;

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
  testSeries_custom_tab_id?: string | null;
  settings?: Record<string, any>;
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
    author_name?: string;
    updated_at?: string;
  };
  customTabs?: CustomTab[];
  tocOrder?: Record<string, number>;
  tabHeadings?: Record<string, string>;
  tabSeo?: Record<string, { meta_title?: string; meta_description?: string; meta_keywords?: string; canonical_url?: string }>;
}

interface SubcategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
}

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  icon: string | null;
}

interface ServerPageContentProps {
  slugArray: string[];
  firstSegmentType: FirstSegmentType;
  serverPageData: ServerPageData | null;
  activeTabSlug?: string;
}

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

const stripHtmlForToc = (html?: string | null): string => {
  if (!html) return '';
  
  let text = html;
  
  // Check if this looks like raw HTML with CSS - if so, try to extract just the text content
  if (text.includes('style=') && text.includes('--tw-')) {
    // The content has inline Tailwind styles - extract text between tags only
    // Match text content between > and <
    const matches = text.match(/>([^<]*?)</g);
    if (matches && matches.length > 0) {
      // Extract text from between tags and join
      text = matches
        .map(m => m.slice(1, -1)) // Remove > and <
        .filter(m => m.trim()) // Remove empty
        .join(' ');
    }
  }
  
  // Decode HTML entities
  const entities: Record<string, string> = {
    '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
    '&nbsp;': ' ', '&amp;': '&', '&#39;': "'"
  };
  Object.entries(entities).forEach(([entity, char]) => {
    text = text.split(entity).join(char);
  });
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  
  // Remove all style attributes and their content
  text = text.replace(/\s*style\s*=\s*"[^"]*"/gi, ' ');
  text = text.replace(/\s*style\s*=\s*'[^']*'/gi, ' ');
  
  // Remove ALL HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Remove CSS variable patterns and other CSS remnants
  text = text.replace(/--tw-[a-zA-Z0-9-]+/g, ' ');
  text = text.replace(/:\s*[^;\s]+/g, ' '); // Remove CSS values like "--tw-scale-x: 1"
  text = text.replace(/;+/g, ' ');
  text = text.replace(/{[^}]*}/g, ' '); // Remove any CSS blocks
  
  // Clean up
  text = text.replace(/[<>]/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  
  // Final check - if it still looks like garbage, filter it out
  if (text.match(/--tw-|style=|#[a-f0-9]{3,8}|\d+px/)) {
    // It still contains CSS-like content, try once more
    text = text.replace(/--tw-[a-zA-Z0-9-]+/g, ' ');
    text = text.replace(/:\s*[^\s]+/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();
  }
  
  return text;
};

const getSectionTocLabel = (section: Section): string => {
  // Try section title first
  const directTitle = stripHtmlForToc(section.title);
  if (directTitle) return directTitle;
  
  // Fall back to first block content
  for (const block of section.blocks || []) {
    if (block?.content?.text) {
      const candidate = stripHtmlForToc(block.content.text);
      if (candidate) return candidate;
    }
  }
  
  // Final fallback to section key
  return (section.section_key || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Fetch only tab-specific sections
async function fetchTabContent(
  entityId: string,
  entityType: 'subcategory' | 'category',
  activeTabId: string | null,
  customTabs: CustomTab[]
): Promise<{ sections: Section[]; orphanBlocks: Block[] }> {
  try {
    const endpoint = entityType === 'subcategory' 
      ? buildApiUrl(`/page-content/${entityId}`)
      : buildApiUrl(`/category-page-content/${entityId}`);
    
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) return { sections: [], orphanBlocks: [] };
    
    const data: PageContentResponse = await res.json();
    
    // Filter sections based on active tab
    let filteredSections: Section[] = [];
    let orphanBlocks: Block[] = [];
    
    if (!activeTabId || activeTabId === 'overview') {
      // Overview tab: show sections without custom_tab_id
      filteredSections = (data.sections || []).filter(
        (s) => !s.is_sidebar && !s.category_custom_tab_id && !s.custom_tab_id && !s.testSeries_custom_tab_id
      );
      orphanBlocks = data.orphanBlocks || [];
    } else {
      // Custom tab: show sections with matching custom_tab_id
      filteredSections = (data.sections || []).filter(
        (s) =>
          !s.is_sidebar &&
          (s.category_custom_tab_id === activeTabId || s.custom_tab_id === activeTabId || s.testSeries_custom_tab_id === activeTabId)
      );
      orphanBlocks = []; // Don't show orphan blocks on custom tabs
    }
    
    return { sections: filteredSections, orphanBlocks };
  } catch (e) {
    console.error('[ServerPageContent] Failed to fetch tab content:', e);
    return { sections: [], orphanBlocks: [] };
  }
}

// Fetch subcategories for a category
async function fetchSubcategories(categoryId: string): Promise<SubcategoryItem[]> {
  try {
    const res = await fetch(buildApiUrl(`/taxonomy/subcategories?category_id=${categoryId}`), { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    return [];
  }
}

// Note: This is an async Server Component that renders the full page HTML server-side
// This ensures complete HTML is available in view source for SEO
export default async function ServerPageContent({
  slugArray,
  firstSegmentType,
  serverPageData,
  activeTabSlug,
}: ServerPageContentProps) {
  // If no server data, we can't render properly
  if (!serverPageData || !firstSegmentType) {
    notFound();
  }

  const isTabPage = slugArray.length >= 2;
  const first = slugArray[0];
  const second = slugArray[1];
  
  // Get custom tabs from page content (available on all pages)
  const pageContent = serverPageData?.pageContentData;
  const customTabs: CustomTab[] = pageContent?.customTabs || [];
  
  // Determine active tab
  let activeTabId: string | null = null;
  
  if (isTabPage) {
    // Map slug to tab ID
    const normalize = (value: string) =>
      value.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    const targetSlug = normalize(second);
    
    // Check for known static tabs
    if (targetSlug === 'overview') {
      activeTabId = 'overview';
    } else {
      // Find matching custom tab
      const matchedTab = customTabs.find((tab: CustomTab) => {
        const tabSlug = normalize(tab.tab_key || tab.title || '');
        return tabSlug === targetSlug;
      });
      activeTabId = matchedTab?.id || 'overview';
    }
  }
  
  // Use pre-fetched page content from the server (already fetched in page.tsx fetchSeoForSlug)
  // Only fall back to a fresh fetch if pageContentData is missing.
  let contentData: { sections: Section[]; orphanBlocks: Block[] } = { sections: [], orphanBlocks: [] };
  let subcategories: SubcategoryItem[] = [];

  const rawPageContent: PageContentResponse | null = pageContent || null;

  const filterContentForTab = (data: PageContentResponse): { sections: Section[]; orphanBlocks: Block[] } => {
    if (!activeTabId || activeTabId === 'overview') {
      return {
        sections: (data.sections || []).filter(
          (s) => !s.is_sidebar && !s.category_custom_tab_id && !s.custom_tab_id && !s.testSeries_custom_tab_id
        ),
        orphanBlocks: data.orphanBlocks || [],
      };
    }
    return {
      sections: (data.sections || []).filter(
        (s) =>
          !s.is_sidebar &&
          (s.category_custom_tab_id === activeTabId || s.custom_tab_id === activeTabId || s.testSeries_custom_tab_id === activeTabId)
      ),
      orphanBlocks: [],
    };
  };

  if ((firstSegmentType === 'subcategory' || firstSegmentType === 'combined-subcategory') && serverPageData?.subcategoryId) {
    if (rawPageContent) {
      contentData = filterContentForTab(rawPageContent);
    } else {
      contentData = await fetchTabContent(serverPageData.subcategoryId, 'subcategory', activeTabId, customTabs);
    }
  } else if (firstSegmentType === 'category' && serverPageData?.categoryId) {
    if (rawPageContent) {
      contentData = filterContentForTab(rawPageContent);
    } else {
      contentData = await fetchTabContent(serverPageData.categoryId, 'category', activeTabId, customTabs);
    }
    // Use pre-fetched subcategories from page.tsx; only fall back to API if missing
    subcategories = serverPageData.subcategories?.length
      ? serverPageData.subcategories
      : await fetchSubcategories(serverPageData.categoryId);
  }
  
  // Get page info
  const isSubcategory = firstSegmentType === 'subcategory' || firstSegmentType === 'combined-subcategory';
  const pageInfo = isSubcategory 
    ? serverPageData?.subcategoryInfo 
    : serverPageData?.categoryInfo;
  
  const heroTitle = pageInfo?.name || first;
  const heroSubtitle = pageInfo?.description || '';
  const logoUrl = pageInfo?.logo_url;
  
  // Build breadcrumbs
  const breadcrumbs = [{ label: 'Home', href: '/' }];
  if (pageInfo?.name) {
    breadcrumbs.push({ label: pageInfo.name, href: `/${first}` });
  }
  if (isTabPage && activeTabId !== 'overview') {
    const tabLabel = customTabs.find(t => t.id === activeTabId)?.title || second;
    breadcrumbs.push({ label: tabLabel, href: `/${first}/${second}` });
  }
  
  // Build table of contents
  const tableOfContents = contentData.sections
    .filter(s => !s.is_sidebar)
    .map((section) => ({
      id: sanitizeAnchor(section.section_key || section.title || section.id),
      label: getSectionTocLabel(section),
    }))
    .filter(entry => {
      // Must have both id and label
      if (!entry.id || !entry.label) return false;
      // Hide entries that still contain CSS-like garbage
      const hasGarbage = entry.label.match(/--tw-|style=|#[a-f0-9]{6}|\d+px/);
      return !hasGarbage;
    });
  
  // Get sidebar sections
  const sidebarSections = (contentData.sections || []).filter((s) => s.is_sidebar);
  
  return (
    <>
      {/* ── Static HTML for Google indexing ─────────────────────────────── */}
      <div className="sr-only" aria-hidden="false">
        <h1 dangerouslySetInnerHTML={{ __html: heroTitle }} />
        {heroSubtitle && <p dangerouslySetInnerHTML={{ __html: heroSubtitle }} />}

        <section>
          <h2>Page Information</h2>
          <p>Category: {first}</p>
          {isSubcategory && <p>Subcategory: {second}</p>}
        </section>

        {subcategories.length > 0 && (
          <section>
            <h2>Subcategories</h2>
            <ul>
              {subcategories.map((sub: any, i: number) => (
                <li key={i}>{sub.name}</li>
              ))}
            </ul>
          </section>
        )}

        {contentData.sections.length > 0 && (
          <section>
            <h2>Content Sections</h2>
            <ul>
              {contentData.sections.slice(0, 10).map((section: any, i: number) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: section.title || section.section_key }} />
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* ── Visible UI ─────────────────────────────────────────────────────── */}
      <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 sm:py-6 relative overflow-hidden">
        {/* Decorative logo — mobile only; hidden once the left logo appears at sm */}
        {logoUrl && (
          <div className="sm:hidden absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none select-none z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt=""
              className="w-24 h-24 object-contain opacity-20"
            />
          </div>
        )}
        <div className="container-main relative z-10">
          <div className="flex items-start justify-between gap-3">
            {/* Left: logo + text */}
            <div className="flex items-center gap-5 min-w-0 flex-1">
              {logoUrl && (
                <div className="flex-shrink-0 hidden sm:block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt={heroTitle || ''}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl bg-white/10 p-2 border border-white/20"
                  />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight mb-2">
                  {heroTitle}
                </h1>
                {heroSubtitle && (
                  <p className="text-base md:text-lg text-blue-100 mb-3 max-w-3xl">
                    {heroSubtitle}
                  </p>
                )}
                <nav className="flex flex-wrap items-center gap-2 text-sm text-blue-100/80">
                  {breadcrumbs.map((crumb, index) => (
                    <span key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                      {index > 0 && <span className="text-blue-200/60">/</span>}
                      <Link href={crumb.href} className="hover:underline">
                        {crumb.label}
                      </Link>
                    </span>
                  ))}
                </nav>
              </div>
            </div>
            {/* Download PDF — category pages only */}
            {!isSubcategory && (!activeTabId || activeTabId === 'overview') && (
              <DownloadPdfButton
                filename={heroTitle || first}
                contentId="page-pdf-content"
              />
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      {customTabs.length > 0 && (
        <TabNavigation 
          customTabs={customTabs} 
          activeTabId={activeTabId} 
          first={first} 
        />
      )}

      {/* Content */}
      <div className="container-main pb-4 lg:pb-6">
        <div className={`flex flex-col lg:flex-row items-start ${!isSubcategory ? 'gap-8' : 'lg:gap-8'}`}>
          <div id="page-pdf-content" className="flex-1 min-w-0 w-full order-2 lg:order-1">
            <div className="space-y-8 sm:space-y-10">
              {/* Subcategories - only on overview tab for categories */}
              {!isSubcategory && (!activeTabId || activeTabId === 'overview') && subcategories.length > 0 && (
                <div className="mb-8 sm:mb-10 mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-1">Exam Categories</p>
                      <h2 className="text-2xl font-bold text-gray-900">Pick your exact exam category</h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {subcategories.map((sub) => {
                      const subLogoUrl = sub.logo_url || logoUrl || null;
                      return (
                        <Link
                          key={sub.id}
                          href={`/${sub.slug}`}
                          className="group border border-border rounded-xl px-3 py-2 bg-white hover:border-primary/60 hover:shadow-md transition-all duration-300 flex items-center gap-2"
                        >
                          {subLogoUrl ? (
                            <div className="w-8 h-8 flex-shrink-0 bg-slate-50 rounded-lg border border-slate-100 p-0.5 flex items-center justify-center overflow-hidden">
                              <img src={subLogoUrl} alt="" width={32} height={32} className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 flex-shrink-0 bg-blue-50 rounded-lg flex items-center justify-center text-primary">
                              <BookOpen className="h-4 w-4" />
                            </div>
                          )}
                          <span className="font-semibold text-sm text-slate-900 leading-tight group-hover:text-primary transition-colors line-clamp-1">
                            {sub.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mobile TOC — floating button visible on mobile/tablet */}
              {tableOfContents.length > 0 && (
                <MobileTOC tableOfContents={tableOfContents} />
              )}

              {/* Orphan Blocks */}
              {contentData.orphanBlocks?.map((block) => (
                <div key={block.id} className="mb-8 sm:mb-10">
                  <PageBlockRenderer block={block} />
                </div>
              ))}

              {/* Sections */}
              {contentData.sections.length === 0 && contentData.orphanBlocks.length === 0 ? (
                <div className="bg-white rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
                  No content yet. Check back later or explore the exam cards above.
                </div>
              ) : (
                <>
                  {contentData.sections.map((section) => {
                    const sectionAnchor = sanitizeAnchor(section.section_key || section.title || section.id);
                    return (
                      <section
                        key={section.id}
                        id={sectionAnchor}
                        className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8 sm:mb-10"
                        style={{
                          backgroundColor: section.background_color || 'white',
                          color: section.text_color || 'inherit',
                        }}
                      >
                        <div className="p-2 sm:p-3 lg:p-4">
                          {section.blocks.map((block) => (
                            <div key={block.id} className="mb-2 last:mb-0">
                              <PageBlockRenderer block={block} />
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 flex-shrink-0 order-1 lg:order-2 lg:sticky lg:top-20">
            <div className="space-y-4 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto hide-scrollbar">
              {/* Table of Contents */}
              {tableOfContents.length > 0 && (
                <div className="hidden lg:block bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <List className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-sm text-foreground">Table of Contents</h3>
                  </div>
                  <nav className="flex flex-col space-y-1">
                    {tableOfContents.map((entry, idx) => (
                      <a
                        key={`${entry.id}-${idx}`}
                        href={`#${entry.id}`}
                        className="text-left text-xs font-medium text-muted-foreground hover:text-primary py-1.5 px-2 rounded-lg hover:bg-muted transition-colors flex items-start gap-2 group"
                      >
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/40 flex-shrink-0 group-hover:bg-primary" />
                        <span className="leading-relaxed">{entry.label}</span>
                      </a>
                    ))}
                  </nav>
                </div>
              )}
              
              {/* Sidebar Sections */}
              {sidebarSections.map((section) => (
                <div
                  key={section.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                  style={{
                    backgroundColor: section.background_color || 'white',
                    color: section.text_color || 'inherit',
                  }}
                >
                  <div className="p-5">
                    {section.blocks.map((block) => (
                      <div key={block.id} className="mb-4 last:mb-0">
                        <PageBlockRenderer block={block} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
    </>
  );
}
