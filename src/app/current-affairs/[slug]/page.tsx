"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, BookOpen, Clock, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/common/LoadingStates";
import { blogService, Blog, BlogSection } from "@/lib/api/blogService";
import { PageBlockRenderer } from "@/components/PageEditor/PageBlockRenderer";
import { SocialShare } from "@/components/ui/social-share";

export default function CurrentAffairsNotePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [article, setArticle] = useState<Blog | null>(null);
  const [sections, setSections] = useState<BlogSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNote = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const note = await blogService.getBlogBySlug(slug);
        if (!note) {
          setError("Current affairs note not found");
          return;
        }
        if (!note.is_current_affairs_note) {
          router.replace(`/blogs/${slug}`);
          return;
        }
        setArticle(note);
        const content = await blogService.getBlogContent(note.id);
        setSections(content);
      } catch (err: any) {
        setError(err?.message || "Failed to load note");
      } finally {
        setIsLoading(false);
      }
    };

    loadNote();
  }, [slug, router]);

  if (isLoading) {
    return <LoadingPage message="Loading note..." />;
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container-main">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              {error || "Current affairs note not found"}
            </h2>
            <Link href="/current-affairs">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Current Affairs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : null;

  return (
    <div className="min-h-screen bg-[#f9fafc]">
      <section className="bg-[#f3f6ff] border-b border-border/60">
        <div className="container-main py-8 space-y-6">
          <div className="flex items-center text-xs uppercase tracking-wide text-slate-500 gap-2">
            <Link href="/">
              Home
            </Link>
            <span>/</span>
            <Link href="/current-affairs">
              Current Affairs
            </Link>
            <span>/</span>
            <span>{article.current_affairs_tag || article.category || "Notes"}</span>
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-xs uppercase font-semibold tracking-widest text-primary">
              <BookOpen className="h-4 w-4" />
              {article.current_affairs_tag || "Editorial note"}
            </div>
            <h1 className="font-display text-3xl md:text-[38px] font-bold leading-tight text-slate-900">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="text-base md:text-lg text-slate-700 leading-relaxed max-w-3xl">
                {article.excerpt}
              </p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
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
              {article.tags?.length ? (
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <Tag className="h-4 w-4 text-slate-400" />
                  {article.tags.slice(0, 2).join(", ")}
                </span>
              ) : null}
            </div>
          </div>

          <div className="h-px w-full bg-border/60" />
        </div>
      </section>

      <section className="py-10">
        <div className="container-main grid lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-8">
          <div className="space-y-8">
            {sections.length > 0 ? (
              sections.map((section) => (
                <article
                  key={section.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 rich-text-content"
                  style={{
                    backgroundColor: section.background_color || undefined,
                    color: section.text_color || undefined
                  }}
                >
                  {section.title && (
                    <h2 className="text-xl font-semibold text-slate-900 mb-4">{section.title}</h2>
                  )}
                  {section.subtitle && <p className="text-slate-600 mb-6">{section.subtitle}</p>}
                  <div className="space-y-5">
                    {section.blocks.map((block) => (
                      <div key={block.id}>
                        <PageBlockRenderer block={block} />
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
          </div>

          <aside className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Share this note</h3>
              <SocialShare 
                title={article.title}
                description={article.excerpt}
                url={typeof window !== 'undefined' ? window.location.href : `https://bharatmock.com/current-affairs/${slug}`}
                variant="compact"
                size="sm"
                showLabel={false}
                className="border-0 p-0 bg-transparent"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
              <p className="text-xs uppercase font-semibold text-slate-500">Need a quiz?</p>
              <h3 className="text-lg font-semibold text-slate-900 mt-2">Attempt a quick challenge</h3>
              <p className="text-sm text-slate-600 mt-2">
                Head back to the Current Affairs page and attempt the linked quizzes to reinforce this topic.
              </p>
              <Button asChild className="mt-4">
                <Link href="/current-affairs">Back to Current Affairs</Link>
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
