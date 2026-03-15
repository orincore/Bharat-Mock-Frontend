"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Eye, Tag, User, ChevronRight, ChevronLeft, BookOpen, TrendingUp, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingPage } from '@/components/common/LoadingStates';
import { blogService, Blog, BlogSection } from '@/lib/api/blogService';
import { PageBlockRenderer } from '@/components/PageEditor/PageBlockRenderer';
import { useToast } from '@/hooks/use-toast';
import { SocialShare } from '@/components/ui/social-share';

export default function BlogDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [article, setArticle] = useState<Blog | null>(null);
  const [sections, setSections] = useState<BlogSection[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<Blog[]>([]);
  const [latestBlogs, setLatestBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const sliderRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchArticleDetails();
    fetchLatestBlogs();
    fetchCategories();
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
      if (data.is_current_affairs_note) {
        window.location.replace(`/current-affairs/${data.slug}`);
        return;
      }
      setArticle(data);
      
      // Fetch blog content (sections and blocks)
      const content = await blogService.getBlogContent(data.id);
      setSections(content);
      
      // Fetch related blogs by category
      if (data.category) {
        const related = await blogService.getBlogs({ category: data.category, limit: 6 });
        setRelatedArticles(related.data.filter(b => b.id !== data.id));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load blog');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLatestBlogs = async () => {
    try {
      const response = await blogService.getBlogs({ limit: 8 });
      setLatestBlogs(response.data);
    } catch (err) {
      console.error('Failed to fetch latest blogs:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const cats = await blogService.getCategories();
      setCategories(cats.slice(0, 8));
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Subscribed!',
      description: 'You have been subscribed to our newsletter.',
    });
    setEmail('');
  };

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 320;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
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

  const layoutContainer = "mx-auto w-full max-w-7xl px-4";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Latest Blogs Slider */}
      <section className="bg-white border-b">
        <div className={`${layoutContainer} py-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-1 bg-blue-600 rounded-full" />
              <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Latest News</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => scrollSlider('left')}
                className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={() => scrollSlider('right')}
                className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
          <div
            ref={sliderRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {latestBlogs.map((blog) => (
              <Link
                key={blog.id}
                href={`/blogs/${blog.slug}`}
                className="flex-shrink-0 w-[300px] group"
              >
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition">
                  {blog.featured_image_url && (
                    <div className="h-40 overflow-hidden">
                      <img
                        src={blog.featured_image_url}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <span className="text-xs font-semibold text-blue-600 uppercase">{blog.category || 'News'}</span>
                    <h3 className="text-sm font-semibold text-gray-900 mt-1 line-clamp-2">{blog.title}</h3>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {new Date(blog.published_at || blog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Breadcrumb + Title */}
      <section className="bg-white border-b">
        <div className={`${layoutContainer} py-6`}>
          <div className="flex items-center text-xs text-gray-500 gap-2 mb-4">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/blogs" className="hover:text-blue-600 transition-colors">Blogs</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900">{article.category || 'Article'}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            {article.author?.raw_user_meta_data?.name && (
              <div className="flex items-center gap-2">
                {article.author.raw_user_meta_data.avatar_url && (
                  <img
                    src={article.author.raw_user_meta_data.avatar_url}
                    alt={article.author.raw_user_meta_data.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-xs text-gray-500">Written by</p>
                  <p className="font-semibold text-gray-900">{article.author.raw_user_meta_data.name}</p>
                </div>
              </div>
            )}
            <div className="h-8 w-px bg-gray-300" />
            {publishedDate && (
              <div className="flex items-center gap-1 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{publishedDate}</span>
              </div>
            )}
            {article.read_time && (
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{article.read_time} min read</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-gray-600">
              <Eye className="h-4 w-4" />
              <span>{article.view_count?.toLocaleString() || 0} views</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8">
        <div className={`${layoutContainer} grid lg:grid-cols-[1fr_340px] gap-6`}>
          {/* Main Content */}
          <div className="space-y-6">
            {/* Social Share - Sticky */}
            <SocialShare 
              title={article.title}
              description={article.excerpt}
              url={typeof window !== 'undefined' ? window.location.href : `https://bharatmock.com/blogs/${slug}`}
            />
            {sections.length > 0 ? (
              sections.map((section) => (
                <article
                  key={section.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 rich-text-content"
                  style={{
                    backgroundColor: section.background_color || undefined,
                    color: section.text_color || undefined
                  }}
                >
                  {section.title && (
                    <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title}</h2>
                  )}
                  {section.subtitle && (
                    <p className="text-gray-600 mb-4">{section.subtitle}</p>
                  )}
                  <div className="space-y-4">
                    {section.blocks.map((block) => (
                      <div key={block.id}>
                        <PageBlockRenderer block={block} />
                      </div>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
                No content available yet.
              </div>
            )}

            {article.tags && article.tags.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-700 mb-3 font-semibold">
                  <Tag className="h-4 w-4" />
                  Tags
                </div>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag, index) => (
                    <Link
                      key={index}
                      href={`/blogs?search=${tag}`}
                      className="px-3 py-1 rounded-full bg-blue-50 text-sm text-blue-700 hover:bg-blue-100 transition"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {article.author?.raw_user_meta_data && (
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <p className="text-xs uppercase text-gray-500 font-semibold mb-3">About the Author</p>
                <div className="flex gap-4">
                  {article.author.raw_user_meta_data.avatar_url && (
                    <img
                      src={article.author.raw_user_meta_data.avatar_url}
                      alt={article.author.raw_user_meta_data.name || 'Author'}
                      className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                    />
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {article.author.raw_user_meta_data.name || 'Author'}
                    </h3>
                    {article.author.raw_user_meta_data.bio && (
                      <p className="text-sm text-gray-600 mt-1">{article.author.raw_user_meta_data.bio}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Newsletter */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-5 w-5" />
                <h3 className="text-lg font-bold">Newsletter</h3>
              </div>
              <p className="text-sm text-blue-100 mb-4">
                Subscribe to get latest exam updates, tips, and exclusive content.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white text-gray-900 border-0"
                />
                <Button type="submit" className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold">
                  Subscribe Now
                </Button>
              </form>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-gray-700" />
                  <h3 className="text-base font-bold text-gray-900">Categories</h3>
                </div>
                <div className="space-y-2">
                  {categories.map((cat, idx) => (
                    <Link
                      key={idx}
                      href={`/blogs?category=${cat}`}
                      className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 transition group"
                    >
                      <span className="text-sm text-gray-700 group-hover:text-blue-600">{cat}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Latest Blogs */}
            {latestBlogs.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-gray-700" />
                  <h3 className="text-base font-bold text-gray-900">Latest Blogs</h3>
                </div>
                <div className="space-y-3">
                  {latestBlogs.slice(0, 4).map((blog) => (
                    <Link
                      key={blog.id}
                      href={`/blogs/${blog.slug}`}
                      className="block group"
                    >
                      <div className="flex gap-3">
                        {blog.featured_image_url && (
                          <img
                            src={blog.featured_image_url}
                            alt={blog.title}
                            className="w-16 h-16 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition">
                            {blog.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(blog.published_at || blog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Banner Ad */}
            <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg p-6 text-white text-center">
              <h3 className="text-lg font-bold mb-2">Premium Mock Tests</h3>
              <p className="text-sm text-orange-100 mb-4">
                Get access to 1000+ premium mock tests and detailed analytics.
              </p>
              <Button asChild className="w-full bg-white text-orange-600 hover:bg-orange-50 font-semibold">
                <Link href="/subscriptions">Explore Plans</Link>
              </Button>
            </div>
          </aside>
        </div>

        {relatedArticles.length > 0 && (
          <div className={`${layoutContainer} mt-8`}>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-1 bg-blue-600 rounded-full" />
              <h2 className="text-2xl font-bold text-gray-900">Related Articles</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {relatedArticles.slice(0, 3).map((relatedArticle) => (
                <Link
                  key={relatedArticle.id}
                  href={`/blogs/${relatedArticle.slug}`}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition group"
                >
                  {relatedArticle.featured_image_url && (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={relatedArticle.featured_image_url}
                        alt={relatedArticle.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <span className="text-xs font-semibold text-blue-600 uppercase">
                      {relatedArticle.category || 'General'}
                    </span>
                    <h3 className="text-base font-bold text-gray-900 mt-2 line-clamp-2 group-hover:text-blue-600 transition">
                      {relatedArticle.title}
                    </h3>
                    {relatedArticle.excerpt && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{relatedArticle.excerpt}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                      {relatedArticle.author?.raw_user_meta_data?.name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {relatedArticle.author.raw_user_meta_data.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(relatedArticle.published_at || relatedArticle.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
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
