"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Eye, Tag, User } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <section className="bg-background py-12 border-b border-border">
        <div className="container-main max-w-4xl">
          <Link href="/blogs" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blogs
          </Link>

          <div className="mb-6">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              {article.category}
            </span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="text-xl text-muted-foreground mb-6">
              {article.excerpt}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            {article.author?.raw_user_meta_data?.name && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{article.author.raw_user_meta_data.name}</span>
              </div>
            )}
            {article.published_at && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(article.published_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
            )}
            {article.read_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{article.read_time} min read</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span>{article.view_count?.toLocaleString() || 0} views</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      {article.featured_image_url && (
        <section className="bg-background border-b border-border">
          <div className="container-main max-w-4xl py-8">
            <img 
              src={article.featured_image_url}
              alt={article.title}
              className="w-full h-auto max-h-[500px] object-cover rounded-xl"
            />
          </div>
        </section>
      )}

      {/* Content */}
      <section className="py-12">
        <div className="container-main">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {sections.length > 0 ? (
                <div className="space-y-8">
                  {sections.map((section) => (
                    <section
                      key={section.id}
                      className="bg-card rounded-xl border border-border p-8 md:p-12"
                      style={{
                        backgroundColor: section.background_color || undefined,
                        color: section.text_color || undefined
                      }}
                    >
                      {section.title && (
                        <h2 className="text-2xl font-bold mb-4">{section.title}</h2>
                      )}
                      {section.subtitle && (
                        <p className="text-muted-foreground mb-6">{section.subtitle}</p>
                      )}
                      <div className="space-y-6">
                        {section.blocks.map((block) => (
                          <div key={block.id}>
                            <BlockRenderer block={block} />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="bg-card rounded-xl border border-border p-8 md:p-12">
                  <p className="text-muted-foreground text-center">No content available yet.</p>
                </div>
              )}

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    {article.tags.map((tag, index) => (
                      <Link 
                        key={index}
                        href={`/blogs?search=${tag}`}
                        className="px-3 py-1 bg-muted hover:bg-primary/10 text-sm rounded-full transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Author Bio */}
              {article.author?.raw_user_meta_data?.bio && (
                <div className="mt-8 bg-card rounded-xl border border-border p-6">
                  <div className="flex items-start gap-4">
                    {article.author.raw_user_meta_data.avatar_url && (
                      <img 
                        src={article.author.raw_user_meta_data.avatar_url}
                        alt={article.author.raw_user_meta_data.name || 'Author'}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-display text-lg font-bold text-foreground mb-2">
                        About {article.author.raw_user_meta_data.name || 'Author'}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {article.author.raw_user_meta_data.bio}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-6">
                {/* Share */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-4">
                    Share Blog
                  </h3>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      Share on Twitter
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      Share on Facebook
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      Share on LinkedIn
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      Copy Link
                    </Button>
                  </div>
                </div>

                {/* Article Info */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-4">
                    Blog Info
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Category</span>
                      <span className="font-semibold text-foreground">{article.category}</span>
                    </div>
                    {article.published_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Published</span>
                        <span className="font-semibold text-foreground">
                          {new Date(article.published_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {article.read_time && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Read Time</span>
                        <span className="font-semibold text-foreground">{article.read_time} min</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Views</span>
                      <span className="font-semibold text-foreground">{article.view_count?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-primary-foreground">
                  <h3 className="font-display text-lg font-bold mb-2">
                    Stay Updated
                  </h3>
                  <p className="text-sm opacity-90 mb-4">
                    Get the latest blogs and exam tips delivered to your inbox.
                  </p>
                  <Button variant="secondary" className="w-full">
                    Subscribe
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Related Blogs */}
          {relatedArticles.length > 0 && (
            <div className="mt-16">
              <h2 className="font-display text-3xl font-bold text-foreground mb-8">
                Related Blogs
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedArticles.map((relatedArticle) => (
                  <Link 
                    key={relatedArticle.id}
                    href={`/blogs/${relatedArticle.slug}`}
                    className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {relatedArticle.featured_image_url && (
                      <img 
                        src={relatedArticle.featured_image_url}
                        alt={relatedArticle.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-6">
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                        {relatedArticle.category}
                      </span>
                      <h3 className="font-display font-bold text-foreground mt-3 mb-2 line-clamp-2">
                        {relatedArticle.title}
                      </h3>
                      {relatedArticle.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {relatedArticle.excerpt}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
