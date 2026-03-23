"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Search, ChevronRight, ChevronLeft, TrendingUp, ArrowRight, X } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { blogService, Blog } from '@/lib/api/blogService';
import { stripLineBreakTags } from '@/lib/utils';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const CategoryBadge = ({ label }: { label?: string | null }) =>
  label ? (
    <span className="inline-block bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm">
      {label}
    </span>
  ) : null;

// Large hero card (left column)
const HeroCard = ({ article }: { article: Blog }) => (
  <Link href={`/blogs/${article.slug}`} className="group relative block overflow-hidden rounded-xl h-full min-h-[220px] sm:min-h-[340px]">
    {article.featured_image_url ? (
      <img src={article.featured_image_url} alt={article.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
    ) : (
      <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-indigo-700" />
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
      <CategoryBadge label={article.category} />
      <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold leading-snug group-hover:text-primary-foreground/90 transition line-clamp-3">
        {article.title}
      </h2>
      <p className="mt-1 text-xs text-white/70">{article.author?.name && <span>{article.author.name} · </span>}{formatDate(article.published_at)}</p>
    </div>
  </Link>
);

// Medium card (top-right)
const MediumCard = ({ article }: { article: Blog }) => (
  <Link href={`/blogs/${article.slug}`} className="group relative block overflow-hidden rounded-xl h-full min-h-[160px]">
    {article.featured_image_url ? (
      <img src={article.featured_image_url} alt={article.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
    ) : (
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-primary/70" />
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
      <CategoryBadge label={article.category} />
      <h3 className="mt-1 font-display text-sm font-bold leading-snug line-clamp-2 group-hover:text-white/90 transition">
        {article.title}
      </h3>
    </div>
  </Link>
);

// Horizontal list card
const ListCard = ({ article }: { article: Blog }) => (
  <Link href={`/blogs/${article.slug}`} className="group flex gap-3 items-start hover:bg-muted/40 rounded-lg p-2 -mx-2 transition">
    {article.featured_image_url ? (
      <img src={article.featured_image_url} alt={article.title} className="w-16 h-12 sm:w-20 sm:h-16 object-cover rounded-lg flex-shrink-0 border border-border" />
    ) : (
      <div className="w-16 h-12 sm:w-20 sm:h-16 rounded-lg flex-shrink-0 bg-primary/10 border border-border" />
    )}
    <div className="flex-1 min-w-0">
      <h4 className="font-semibold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition">{article.title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{formatDate(article.published_at)}</p>
    </div>
  </Link>
);

// Standard article card for grid
const ArticleCard = ({ article, featured }: { article: Blog; featured?: boolean }) => (
  <article className={`bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-md transition group ${featured ? 'md:col-span-2' : ''}`}>
    {article.featured_image_url && (
      <Link href={`/blogs/${article.slug}`}>
        <div className={`overflow-hidden ${featured ? 'h-40 sm:h-56' : 'h-36 sm:h-44'}`}>
          <img src={article.featured_image_url} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      </Link>
    )}
    <div className="p-4 space-y-2">
      <CategoryBadge label={article.category} />
      <Link href={`/blogs/${article.slug}`}>
        <h3 className={`font-display font-bold text-foreground group-hover:text-primary transition leading-snug ${featured ? 'text-xl' : 'text-base'} line-clamp-2`}>
          {article.title}
        </h3>
      </Link>
      {article.excerpt && (
        <p className="text-sm text-muted-foreground line-clamp-2">{stripLineBreakTags(article.excerpt)}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
        {article.published_at && (
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(article.published_at)}</span>
        )}
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{article.read_time || 5} min</span>
      </div>
    </div>
  </article>
);

export default function BlogsPage() {
  const [articles, setArticles] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const searchRef = useRef<HTMLInputElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [tabScroll, setTabScroll] = useState({ canLeft: false, canRight: false });

  // Search dropdown
  const [dropdownResults, setDropdownResults] = useState<Blog[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setDropdownResults([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setDropdownLoading(true);
      setShowDropdown(true);
      try {
        const res = await blogService.getBlogs({ search: value.trim(), limit: 6 });
        setDropdownResults(res.data.filter(b => !b.is_current_affairs_note));
      } catch { setDropdownResults([]); }
      finally { setDropdownLoading(false); }
    }, 300);
  };

  const handleDropdownSelect = () => {
    setShowDropdown(false);
  };

  const updateTabScroll = useCallback(() => {
    const el = tabBarRef.current;
    if (!el) return;
    setTabScroll({ canLeft: el.scrollLeft > 4, canRight: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateTabScroll);
    window.addEventListener('resize', updateTabScroll);
    return () => { el.removeEventListener('scroll', updateTabScroll); window.removeEventListener('resize', updateTabScroll); };
  }, [updateTabScroll]);

  // Re-check after categories render into the DOM
  useEffect(() => {
    const t = setTimeout(updateTabScroll, 50);
    return () => clearTimeout(t);
  }, [categories, updateTabScroll]);

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchArticles(); }, [activeCategory, search, pagination.page]);

  const fetchCategories = async () => {
    try { setCategories(await blogService.getCategories()); } catch {}
  };

  const fetchArticles = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await blogService.getBlogs({
        search: search || undefined,
        categories: activeCategory !== 'All' ? [activeCategory] : undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setArticles(response.data);
      setPagination(prev => ({ ...prev, total: response.pagination.total, totalPages: response.pagination.totalPages }));
    } catch (err: any) {
      setError(err.message || 'Failed to load blogs');
    } finally {
      setIsLoading(false);
    }
  };

  const visibleArticles = useMemo(() => articles.filter(a => !a.is_current_affairs_note), [articles]);

  const [hero, ...rest] = visibleArticles;
  const heroRight = rest.slice(0, 3);   // top-right grid (up to 3)
  const mainArticles = rest.slice(3);   // below-the-fold grid

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const allCategories = ['All', ...categories];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-6 md:py-10">
        <div className="container-home">
          <Breadcrumbs items={[HomeBreadcrumb(), { label: 'Blogs' }]} variant="dark" className="mb-3 md:mb-6" />
          <h1 className="text-2xl md:text-5xl font-bold mb-2 md:mb-4">Blog & Articles</h1>
          <p className="text-sm md:text-xl text-blue-100 max-w-2xl">Insights, tips, and updates to help you excel in your exam preparation</p>
        </div>
      </div>

      {/* Top bar */}
      <div className="bg-foreground text-background text-xs py-1.5">
        <div className="container-home flex items-center justify-between gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span>{pagination.total} articles published</span>
          </div>
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <div ref={searchWrapperRef} className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-background/60 z-10" />
              <input
                ref={searchRef}
                type="text"
                value={searchInput}
                onChange={e => handleSearchInput(e.target.value)}
                onFocus={() => { if (searchInput.trim() && dropdownResults.length > 0) setShowDropdown(true); }}
                placeholder="Search articles..."
                className="bg-white/10 text-background placeholder:text-background/50 text-xs rounded-full pl-8 pr-7 py-1 border border-white/20 focus:outline-none focus:border-primary w-full sm:w-48"
                autoComplete="off"
              />
              {searchInput && (
                <button type="button" onClick={() => { setSearchInput(''); setDropdownResults([]); setShowDropdown(false); setSearch(''); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-background/50 hover:text-background transition">
                  <X className="h-3 w-3" />
                </button>
              )}

              {/* Dropdown */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[280px] sm:min-w-[320px]">
                  {dropdownLoading ? (
                    <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted-foreground">
                      <LoadingSpinner size="sm" />Searching...
                    </div>
                  ) : dropdownResults.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">No results found</div>
                  ) : (
                    <>
                      <div className="px-3 py-2 border-b border-border bg-muted/30">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{dropdownResults.length} result{dropdownResults.length !== 1 ? 's' : ''}</span>
                      </div>
                      <ul>
                        {dropdownResults.map(blog => (
                          <li key={blog.id}>
                            <Link href={`/blogs/${blog.slug}`} onClick={handleDropdownSelect}
                              className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 transition group">
                              {blog.featured_image_url
                                ? <img src={blog.featured_image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-border" />
                                : <div className="w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0 border border-border" />
                              }
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition line-clamp-2 leading-snug">{blog.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {blog.category && <span className="text-[10px] text-primary font-semibold">{blog.category}</span>}
                                  <span className="text-[10px] text-muted-foreground">{formatDate(blog.published_at)}</span>
                                </div>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <div className="border-t border-border">
                        <button type="submit" onClick={() => { setSearch(searchInput); setPagination(p => ({ ...p, page: 1 })); setShowDropdown(false); }}
                          className="w-full py-2 text-xs text-primary font-semibold hover:bg-muted/40 transition text-center">
                          See all results for "{searchInput}"
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <button type="submit" onClick={() => setShowDropdown(false)} className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-semibold hover:bg-primary/90 transition flex-shrink-0">Go</button>
          </form>
        </div>
      </div>

      {/* Masthead — hidden on mobile to save space */}
      <div className="hidden sm:block border-b border-border bg-card">
        <div className="container-home py-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-foreground tracking-tight">Bharat Mock <span className="text-primary">Blog</span></h2>
            <p className="text-xs text-muted-foreground mt-0.5">Exam strategies · Paper analysis · Current affairs · Daily briefs</p>
          </div>
        </div>
      </div>

      {/* Category tab bar */}
      <div className="sticky top-0 z-30 bg-card border-b border-border shadow-sm">
        <div className="container-home relative">
          {/* Left arrow — desktop only */}
          <button
            onClick={() => { tabBarRef.current?.scrollBy({ left: -200, behavior: 'smooth' }); }}
            aria-label="Scroll left"
            disabled={!tabScroll.canLeft}
            className="hidden sm:flex absolute left-0 top-0 bottom-0 z-10 items-center justify-center w-8 bg-gradient-to-r from-card via-card/80 to-transparent disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>

          <div
            ref={tabBarRef}
            className="flex items-center gap-0.5 overflow-x-auto hide-scrollbar py-0 sm:px-8"
          >
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`flex-shrink-0 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                  activeCategory === cat
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Right arrow — desktop only */}
          <button
            onClick={() => { tabBarRef.current?.scrollBy({ left: 200, behavior: 'smooth' }); }}
            aria-label="Scroll right"
            disabled={!tabScroll.canRight}
            className="hidden sm:flex absolute right-0 top-0 bottom-0 z-10 items-center justify-center w-8 bg-gradient-to-l from-card via-card/80 to-transparent disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </div>

      <div className="container-home py-5 sm:py-8 space-y-6 sm:space-y-10">
        {isLoading && (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        )}

        {error && !isLoading && (
          <div className="bg-destructive/10 border border-destructive rounded-xl p-6 text-center">
            <p className="text-destructive mb-3">{error}</p>
            <button onClick={fetchArticles} className="text-sm underline text-primary">Try again</button>
          </div>
        )}

        {!isLoading && !error && visibleArticles.length === 0 && (
          <div className="py-20 text-center">
            <p className="font-semibold text-foreground mb-2">No articles found</p>
            <p className="text-sm text-muted-foreground mb-4">Try a different category or search term</p>
            <button onClick={() => { setActiveCategory('All'); setSearch(''); setSearchInput(''); }} className="text-sm text-primary underline">Reset filters</button>
          </div>
        )}

        {!isLoading && !error && visibleArticles.length > 0 && (
          <>
            {/* Hero grid — only show when not filtered/searched */}
            {hero && (
              <section>
                {/* Mobile: just the hero card */}
                <div className="lg:hidden">
                  <HeroCard article={hero} />
                </div>
                {/* Desktop: hero + right grid */}
                <div className="hidden lg:grid grid-cols-[3fr_2fr] gap-4 h-[420px]">
                  <HeroCard article={hero} />
                  <div className={`grid gap-4 ${heroRight.length >= 3 ? 'grid-rows-2' : 'grid-rows-1'}`}>
                    {heroRight.length >= 1 && (
                      <div className={heroRight.length >= 3 ? 'row-span-1' : 'h-full'}>
                        <MediumCard article={heroRight[0]} />
                      </div>
                    )}
                    {heroRight.length >= 2 && (
                      <div className={`grid gap-4 ${heroRight.length >= 3 ? 'grid-cols-2' : ''}`}>
                        {heroRight.slice(1).map(a => <MediumCard key={a.id} article={a} />)}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Don't Miss / main content + sidebar */}
            {mainArticles.length > 0 && (
              <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 lg:gap-8">
                {/* Main articles */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-sm">Don't Miss</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {mainArticles.map((article, i) => (
                      <ArticleCard key={article.id} article={article} featured={i === 0} />
                    ))}
                  </div>
                </div>

                {/* Sidebar — full width on mobile, fixed width on desktop */}
                <aside className="space-y-4 lg:space-y-6">
                  {/* Latest posts */}
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                      <h3 className="font-display font-bold text-sm uppercase tracking-wide text-foreground">Latest Posts</h3>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                      {visibleArticles.slice(0, 5).map(a => <ListCard key={a.id} article={a} />)}
                    </div>
                  </div>

                  {/* Categories — horizontal scroll on mobile */}
                  {categories.length > 0 && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                        <h3 className="font-display font-bold text-sm uppercase tracking-wide text-foreground">Categories</h3>
                      </div>
                      {/* Mobile: horizontal pill scroll */}
                      <div className="lg:hidden flex gap-2 overflow-x-auto hide-scrollbar p-3">
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => handleCategoryClick(cat)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      {/* Desktop: vertical list */}
                      <div className="hidden lg:block p-4 space-y-1">
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => handleCategoryClick(cat)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${activeCategory === cat ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}
                          >
                            <span>{cat}</span>
                            <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </aside>
              </section>
            )}
          </>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && !isLoading && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-40 hover:bg-muted transition"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPagination(prev => ({ ...prev, page: p }))}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition ${pagination.page === p ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-40 hover:bg-muted transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
