"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Eye, ChevronRight, BookOpen, TrendingUp, Mail, ArrowLeft, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { blogService, Blog, BlogSection } from '@/lib/api/blogService';
import { PageBlockRenderer } from '@/components/PageEditor/PageBlockRenderer';
import { useToast } from '@/hooks/use-toast';
import { SocialShare } from '@/components/ui/social-share';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

const formatDateShort = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '';

const toAnchorId = (s: string) =>
  'toc-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const firstHeadingText = (html: string): string | null => {
  const m = html.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, '').trim() || null;
};

interface Props {
  article: Blog;
  sections: BlogSection[];
  latestBlogs: Blog[];
  relatedArticles: Blog[];
  categories: string[];
  slug: string;
}

export default function BlogDetailClient({ article, sections, latestBlogs, relatedArticles, categories, slug }: Props) {
  const [email, setEmail] = useState('');
  const [tocOpen, setTocOpen] = useState(false);
  const { toast } = useToast();

  const tocItems = useMemo(() => {
    const items: { id: string; label: string; level: number }[] = [];
    if (!Array.isArray(sections)) return items;
    
    sections.forEach((section, si) => {
      if (section?.title) {
        items.push({ id: toAnchorId(`section-${si}`), label: section.title, level: 2 });
      }
      if (Array.isArray(section?.blocks)) {
        section.blocks.forEach((block, bi) => {
          let label: string | null = null;
          let level = 2;
          if (block.block_type === 'heading') {
            label = (block.content?.text || '').replace(/<[^>]+>/g, '').trim() || null;
            level = parseInt(block.content?.level || '2');
          } else if (block.block_type === 'rich_text' || block.block_type === 'html') {
            label = firstHeadingText(block.content?.html || '');
          }
          if (label) items.push({ id: toAnchorId(`block-${si}-${bi}`), label, level });
        });
      }
    });
    return items;
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
    setTocOpen(false);
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: 'Subscribed!', description: 'You have been subscribed to our newsletter.' });
    setEmail('');
  };

  const shareUrl = `https://bharatmock.com/blogs/${slug}`;
  const displayRelated = relatedArticles.length > 0
    ? relatedArticles
    : latestBlogs.filter(b => b.id !== article.id).slice(0, 3);

  const TocNav = () => (
    <nav className="p-3 space-y-0.5">
      {tocItems.map((item) => (
        <button key={item.id} onClick={() => scrollTo(item.id)}
          className={`w-full flex items-start gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted hover:text-primary transition text-left group ${item.level === 3 ? 'pl-5' : ''}`}>
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0 group-hover:bg-primary" />
          <span className="text-foreground group-hover:text-primary leading-snug">{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 md:py-8">
        <div className="container-home">
          <Breadcrumbs items={[HomeBreadcrumb(), { label: 'Blogs', href: '/blogs' }, { label: article.category || 'Article' }]} variant="dark" className="mb-2 md:mb-3" />
          {article.category && (
            <span className="inline-block bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm mb-2 md:mb-3">{article.category}</span>
          )}
          <h1 className="text-xl md:text-4xl font-bold leading-tight mb-3 md:mb-4 max-w-3xl">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-blue-100">
            {(() => {
              const authorName = article.author?.name || 'BharatMock Editorial Team';
              const authorAvatar = article.author?.avatar_url;
              const authorId = article.author?.id;
              return (
                <div className="flex items-center gap-2">
                  {authorAvatar
                    ? <img src={authorAvatar} alt="" className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border-2 border-white/40" />
                    : <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{authorName[0]}</div>}
                  {authorId
                    ? <Link href={`/author/${authorId}`} className="font-semibold text-white hover:text-white/80 transition">{authorName}</Link>
                    : <span className="font-semibold text-white">{authorName}</span>}
                </div>
              );
            })()}
            {article.published_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3 md:h-3.5 md:w-3.5" />{formatDate(article.published_at)}</span>}
            {article.read_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3 md:h-3.5 md:w-3.5" />{article.read_time} min read</span>}
            <span className="flex items-center gap-1"><Eye className="h-3 w-3 md:h-3.5 md:w-3.5" />{(article.view_count || 0).toLocaleString()} views</span>
          </div>
        </div>
      </div>

      {/* Share bar */}
      <div className="bg-muted/40 border-b border-border">
        <div className="container-home py-2 flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium hidden sm:block">Share this article</span>
          <SocialShare title={article.title} description={article.excerpt} url={shareUrl} variant="compact" size="sm" showLabel={false} />
        </div>
      </div>

      {/* Main */}
      <div className="container-home py-5 md:py-7">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_290px] gap-5 lg:gap-4">
          <main className="space-y-4 min-w-0">
            {article.featured_image_url && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img src={article.featured_image_url} alt={article.title} className="w-full h-auto object-cover" />
              </div>
            )}
            {article.excerpt && (
              <p className="text-base text-muted-foreground leading-relaxed border-l-4 border-primary pl-4 italic">{article.excerpt}</p>
            )}
            {Array.isArray(sections) && sections.length > 0 ? sections.map((section, si) => (
              <div key={section.id}>
                {section.title && <span id={toAnchorId(`section-${si}`)} className="block" />}
                <div className="bg-card border border-border rounded-lg p-4 md:p-5 rich-text-content"
                  style={{ backgroundColor: section.background_color || undefined, color: section.text_color || undefined }}>
                  {section.title && <h2 className="text-xl font-bold text-foreground mb-3">{section.title}</h2>}
                  {section.subtitle && <p className="text-muted-foreground mb-3">{section.subtitle}</p>}
                  <div className="space-y-3">
                    {section.blocks.map((block, bi) => {
                      const anchorId = toAnchorId(`block-${si}-${bi}`);
                      const hasAnchor = block.block_type === 'heading' ||
                        ((block.block_type === 'rich_text' || block.block_type === 'html') && !!firstHeadingText(block.content?.html || ''));
                      return (
                        <div key={block.id}>
                          {hasAnchor && <span id={anchorId} className="block" style={{ marginTop: '-80px', paddingTop: '80px' }} />}
                          <PageBlockRenderer block={block} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )) : (
              <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground">No content available yet.</div>
            )}

            {/* Author */}
            {(() => {
              const authorName = article.author?.name || 'BharatMock Editorial Team';
              const authorAvatar = article.author?.avatar_url;
              const authorBio = article.author?.bio;
              const authorId = article.author?.id;
              return (
                <div className="bg-card border border-border rounded-lg p-4 flex gap-3 md:gap-4 items-start">
                  {authorAvatar
                    ? <img src={authorAvatar} alt={authorName} className="w-11 h-11 md:w-12 md:h-12 rounded-full object-cover flex-shrink-0 border-2 border-border" />
                    : <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center text-base font-bold text-primary flex-shrink-0">{authorName[0]}</div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase text-muted-foreground font-semibold mb-0.5">Written by</p>
                    {authorId
                      ? <Link href={`/author/${authorId}`} className="font-bold text-foreground hover:text-primary transition">{authorName}</Link>
                      : <p className="font-bold text-foreground">{authorName}</p>}
                    {authorBio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{authorBio}</p>}
                  </div>
                </div>
              );
            })()}
            <div className="bg-card border border-border rounded-lg p-3 md:p-4 flex items-center justify-between gap-3">
              <p className="text-xs md:text-sm font-semibold text-foreground">Share this article</p>
              <SocialShare title={article.title} description={article.excerpt} url={shareUrl} variant="compact" size="sm" showLabel={false} />
            </div>
          </main>

          {/* Sidebar */}
          <aside className="hidden lg:block space-y-4">
            {tocItems.length > 0 && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                  <List className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-wide text-foreground">Table of Contents</h3>
                </div>
                <TocNav />
              </div>
            )}
            {latestBlogs.length > 0 && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-wide text-foreground">Latest Posts</h3>
                </div>
                <div className="p-3 space-y-2">
                  {latestBlogs.map(blog => (
                    <Link key={blog.id} href={`/blogs/${blog.slug}`} className="flex gap-3 group hover:bg-muted/40 rounded p-1.5 -mx-1.5 transition">
                      {blog.featured_image_url
                        ? <img src={blog.featured_image_url} alt={blog.title} className="w-14 h-12 rounded object-cover flex-shrink-0 border border-border" />
                        : <div className="w-14 h-12 rounded bg-primary/10 flex-shrink-0 border border-border" />}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-primary transition leading-snug">{blog.title}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDateShort(blog.published_at)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {categories.length > 0 && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-wide text-foreground">Categories</h3>
                </div>
                <div className="p-2 space-y-0.5">
                  {categories.map((cat, i) => (
                    <Link key={i} href={`/blogs?category=${cat}`} className="flex items-center justify-between px-3 py-1.5 rounded text-sm text-foreground hover:bg-muted hover:text-primary transition group">
                      <span>{cat}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-gradient-to-br from-primary to-indigo-700 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-1.5"><Mail className="h-4 w-4" /><h3 className="font-bold text-sm uppercase tracking-wide">Newsletter</h3></div>
              <p className="text-xs text-white/80 mb-3">Get latest exam updates, tips, and exclusive content in your inbox.</p>
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <Input type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white/15 border-white/30 text-white placeholder:text-white/50 text-sm" />
                <Button type="submit" className="w-full bg-white text-primary hover:bg-white/90 font-semibold text-sm">Subscribe</Button>
              </form>
            </div>
            {displayRelated.length > 0 && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-wide text-foreground">{relatedArticles.length > 0 ? 'Related Articles' : 'More Articles'}</h3>
                  </div>
                  <Link href="/blogs" className="text-xs text-primary hover:underline flex items-center gap-0.5">View all <ChevronRight className="h-3 w-3" /></Link>
                </div>
                <div className="p-3 space-y-2">
                  {displayRelated.map(rel => (
                    <Link key={rel.id} href={`/blogs/${rel.slug}`} className="flex gap-3 group hover:bg-muted/40 rounded p-1.5 -mx-1.5 transition">
                      {rel.featured_image_url
                        ? <img src={rel.featured_image_url} alt={rel.title} className="w-14 h-12 rounded object-cover flex-shrink-0 border border-border" />
                        : <div className="w-14 h-12 rounded bg-primary/10 flex-shrink-0 border border-border" />}
                      <div className="flex-1 min-w-0">
                        {rel.category && <span className="text-[10px] font-bold uppercase text-primary tracking-wide">{rel.category}</span>}
                        <h4 className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-primary transition leading-snug">{rel.title}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDateShort(rel.published_at)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg p-4 text-white text-center">
              <h3 className="font-bold mb-1">Premium Mock Tests</h3>
              <p className="text-xs text-orange-100 mb-3">1000+ mock tests with detailed analytics and solutions.</p>
              <Button asChild className="w-full bg-white text-orange-600 hover:bg-orange-50 font-semibold text-sm">
                <Link href="/subscriptions">Explore Plans</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile TOC */}
      {tocItems.length > 0 && (
        <div className="lg:hidden">
          {tocOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setTocOpen(false)} />}
          <div className={`fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl transition-transform duration-300 ${tocOpen ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2"><List className="h-4 w-4 text-primary" /><span className="font-bold text-sm text-foreground">Table of Contents</span></div>
              <button onClick={() => setTocOpen(false)} className="p-1 rounded hover:bg-muted transition"><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] pb-safe"><TocNav /></div>
          </div>
          <button onClick={() => setTocOpen(true)} className="fixed bottom-5 left-4 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold">
            <List className="h-4 w-4" />Contents
          </button>
        </div>
      )}
    </div>
  );
}
