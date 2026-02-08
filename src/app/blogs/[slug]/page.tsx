"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Eye, Tag, User, ChevronRight, ChevronLeft, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/common/LoadingStates';
import { blogService, Blog, BlogSection } from '@/lib/api/blogService';
import { BlockRenderer } from '@/components/PageEditor/BlockRenderer';

export default function BlogDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [article, setArticle] = useState<Blog | null>(null);
  const [sections, setSections] = useState<BlogSection[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchArticleDetails();
  }, [slug]);

  const fetchArticleDetails = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await blogService.getBlogBySlug(slug);
      if (!data) {
        setError('Blog not found');
        return;
      }
      setArticle(data);
      
      // Fetch blog content (sections and blocks)
      const content = await blogService.getBlogContent(data.id);
      setSections(content);
      
      // Optionally fetch related blogs by category
      if (data.category) {
        const related = await blogService.getBlogs({ category: data.category, limit: 3 });
        setRelatedArticles(related.data.filter(b => b.id !== data.id));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load blog');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingPage message="Loading blog..." />;
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container-main">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              {error || 'Blog not found'}
            </h2>
            <Link href="/blogs">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blogs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  const featuredRelated = relatedArticles[0];
  const remainingRelated = relatedArticles.slice(1);
  const layoutContainer = "mx-auto w-full max-w-[1400px] px-3 sm:px-4 md:px-6";

  return (
    <div className="min-h-screen bg-[#f9fafc]">
      {/* Breadcrumb + Title */}
      <section className="bg-[#f3f6ff] border-b border-border/60">
        <div className={`${layoutContainer} py-8 space-y-6`}>
          <div className="flex items-center text-xs uppercase tracking-wide text-slate-500 gap-2">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/blogs?category=${article.category || ''}`} className="hover:text-primary transition-colors">
              {article.category || 'Blogs'}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span>News</span>
          </div>

          <div className="space-y-4">
            <h1 className="font-display text-3xl md:text-[38px] font-bold leading-tight text-slate-900">
              {article.title}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              {article.author?.raw_user_meta_data?.name && (
                <span className="font-semibold text-primary">{article.author.raw_user_meta_data.name}</span>
              )}
              {publishedDate && (
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {publishedDate}
                </span>
              )}
              {article.read_time && (
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {article.read_time} min read
                </span>
              )}
              <span className="inline-flex items-center gap-2 text-slate-500">
                <Eye className="h-4 w-4 text-slate-400" />
                {article.view_count?.toLocaleString() || 0} views
              </span>
            </div>
            {article.excerpt && (
              <p className="text-base md:text-lg text-slate-700 leading-relaxed max-w-3xl">
                {article.excerpt}
              </p>
            )}
          </div>

          <div className="h-px w-full bg-border/60" />
        </div>
      </section>

      {/* Content */}
      <section id="content" className="py-10">
        <div className={`${layoutContainer} grid lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-8`}>
          {/* Main Content */}
          <div className="space-y-8">
            {sections.length > 0 ? (
              sections.map((section) => (
                <article
                  key={section.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm p-6"
                  style={{
                    backgroundColor: section.background_color || undefined,
                    color: section.text_color || undefined
                  }}
                >
                  {section.title && (
                    <h2 className="text-xl font-semibold text-slate-900 mb-4">{section.title}</h2>
                  )}
                  {section.subtitle && (
                    <p className="text-slate-600 mb-6">{section.subtitle}</p>
                  )}
                  <div className="space-y-5">
                    {section.blocks.map((block) => (
                      <div key={block.id}>
                        <BlockRenderer block={block} />
                      </div>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 text-center text-slate-500">
                No content available yet.
              </div>
            )}

            {article.tags && article.tags.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
                <div className="flex items-center gap-2 text-slate-500 mb-3">
                  <Tag className="h-4 w-4" />
                  Tags
                </div>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag, index) => (
                    <Link
                      key={index}
                      href={`/blogs?search=${tag}`}
                      className="px-3 py-1 rounded-full bg-slate-100 text-sm text-slate-600 hover:bg-slate-200"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {article.author?.raw_user_meta_data?.bio && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex gap-4">
                {article.author.raw_user_meta_data.avatar_url && (
                  <img
                    src={article.author.raw_user_meta_data.avatar_url}
                    alt={article.author.raw_user_meta_data.name || 'Author'}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-xs uppercase text-slate-500">Author</p>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {article.author.raw_user_meta_data.name || 'Author'}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">{article.author.raw_user_meta_data.bio}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            {featuredRelated && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
                <p className="text-xs uppercase font-semibold text-slate-500">{featuredRelated.category || 'Featured'}</p>
                <h3 className="text-lg font-semibold text-slate-900 mt-2">
                  {featuredRelated.title}
                </h3>
                {featuredRelated.excerpt && (
                  <p className="text-sm text-slate-600 mt-2 line-clamp-3">
                    {featuredRelated.excerpt}
                  </p>
                )}
                <Button asChild className="mt-4 bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold">
                  <Link href={`/blogs/${featuredRelated.slug}`}>Attempt Now</Link>
                </Button>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Quizzes</h3>
                <div className="flex items-center gap-2">
                  <button className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                {(remainingRelated.length ? remainingRelated : relatedArticles).slice(0, 2).map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/blogs/${entry.slug}`}
                    className="block rounded-lg border border-slate-100 p-4 hover:border-primary/40"
                  >
                    <p className="text-xs text-emerald-600 font-semibold">Free</p>
                    <h4 className="text-sm font-semibold text-slate-900 mt-1 line-clamp-2">{entry.title}</h4>
                    <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-wide text-slate-500 mt-3">
                      <span>{entry.read_time || 5} Minutes</span>
                      <span>{entry.view_count?.toLocaleString() || 0} Views</span>
                      <span>{entry.category || 'General'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Share this article</h3>
              <div className="flex flex-col gap-2">
                {['Twitter', 'Facebook', 'LinkedIn', 'Copy Link'].map((network) => (
                  <Button key={network} variant="outline" size="sm" className="justify-start">
                    <Share2 className="h-4 w-4 mr-2 text-slate-500" /> {network}
                  </Button>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {relatedArticles.length > 0 && (
          <div className={`${layoutContainer} mt-12`}>
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">Related Blogs</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedArticles.map((relatedArticle) => (
                <Link
                  key={relatedArticle.id}
                  href={`/blogs/${relatedArticle.slug}`}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm hover:-translate-y-1 transition-transform"
                >
                  {relatedArticle.featured_image_url && (
                    <img
                      src={relatedArticle.featured_image_url}
                      alt={relatedArticle.title}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-5 space-y-2">
                    <span className="text-xs font-semibold uppercase text-primary/80">
                      {relatedArticle.category || 'General'}
                    </span>
                    <h3 className="text-base font-semibold text-slate-900 line-clamp-2">{relatedArticle.title}</h3>
                    {relatedArticle.excerpt && (
                      <p className="text-sm text-slate-600 line-clamp-2">{relatedArticle.excerpt}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
