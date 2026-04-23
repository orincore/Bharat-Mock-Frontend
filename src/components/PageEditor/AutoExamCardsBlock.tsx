'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, GraduationCap, Loader2 } from 'lucide-react';
import { StandardExamCard } from '@/components/exam/StandardExamCard';
import { Exam } from '@/types';

const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const buildUrl = (path: string) => `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;

export type AutoExamCardVariant = 'category' | 'subcategory' | 'quizzes' | 'live';

interface AutoExamCardsBlockProps {
  content: {
    variant: AutoExamCardVariant;
    title?: string;
    headingTag?: string;
    categoryId?: string;
    subcategoryId?: string;
    limit?: number;
    viewMoreUrl?: string;
  };
}

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
type HeadingTag = (typeof HEADING_TAGS)[number];

const resolveHeadingTag = (value?: string | null, fallback: HeadingTag = 'h3'): HeadingTag =>
  HEADING_TAGS.includes((value || '').toLowerCase() as HeadingTag)
    ? ((value || '').toLowerCase() as HeadingTag)
    : fallback;

async function fetchExams(
  variant: AutoExamCardVariant,
  opts: { categoryId?: string; subcategoryId?: string; limit: number }
): Promise<Exam[]> {
  const params = new URLSearchParams({ limit: String(opts.limit), is_published: 'true' });
  switch (variant) {
    case 'category':
      if (opts.categoryId) params.set('category_id', opts.categoryId);
      break;
    case 'subcategory':
      if (opts.subcategoryId) params.set('subcategory_id', opts.subcategoryId);
      break;
    case 'quizzes':
      params.set('exam_type', 'short_quiz');
      break;
    case 'live':
      params.set('status', 'ongoing');
      break;
  }
  const res = await fetch(buildUrl(`/exams?${params}`));
  if (!res.ok) return [];
  const json = await res.json();
  const data: Exam[] = json.data || json.exams || [];
  for (let i = data.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [data[i], data[j]] = [data[j], data[i]];
  }
  return data;
}

const VARIANT_LABELS: Record<AutoExamCardVariant, string> = {
  category: 'Category Exams',
  subcategory: 'Subcategory Exams',
  quizzes: 'Quizzes',
  live: 'Live Exams',
};

const CARDS_PER_PAGE = 2;

export const AutoExamCardsBlock: React.FC<AutoExamCardsBlockProps> = ({ content }) => {
  const { variant, title, headingTag, categoryId, subcategoryId, limit = 10, viewMoreUrl } = content;
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(0);
    fetchExams(variant, { categoryId, subcategoryId, limit })
      .then((data) => { if (!cancelled) { setExams(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [variant, categoryId, subcategoryId, limit]);

  const totalPages = Math.ceil(exams.length / CARDS_PER_PAGE);

  // Slide the track using CSS transform, then snap
  const goTo = (next: number) => {
    if (animatingRef.current || next === page || !trackRef.current) return;
    const dir = next > page ? -1 : 1; // -1 = slide left (next), 1 = slide right (prev)
    animatingRef.current = true;
    const track = trackRef.current;

    // Animate out
    track.style.transition = 'transform 300ms cubic-bezier(0.4,0,0.2,1), opacity 300ms ease';
    track.style.transform = `translateX(${dir * -40}px)`;
    track.style.opacity = '0';

    setTimeout(() => {
      // Snap to new page instantly (no transition)
      track.style.transition = 'none';
      track.style.transform = `translateX(${dir * 40}px)`;
      track.style.opacity = '0';
      setPage(next);

      // Force reflow then animate in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          track.style.transition = 'transform 300ms cubic-bezier(0.4,0,0.2,1), opacity 300ms ease';
          track.style.transform = 'translateX(0)';
          track.style.opacity = '1';
          setTimeout(() => { animatingRef.current = false; }, 310);
        });
      });
    }, 300);
  };

  const visibleExams = exams.slice(page * CARDS_PER_PAGE, page * CARDS_PER_PAGE + CARDS_PER_PAGE);
  const displayTitle = title || VARIANT_LABELS[variant];
  const HeadingTagName = resolveHeadingTag(headingTag, 'h4');

  return (
    <div className="mb-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <HeadingTagName className="text-base font-bold text-gray-900 truncate pr-2">{displayTitle}</HeadingTagName>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => goTo(page - 1)}
            disabled={page === 0}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-150 ${
              page > 0
                ? 'bg-yellow-400 border-yellow-400 text-gray-900 hover:bg-yellow-500 shadow-sm'
                : 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
            }`}
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages - 1}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-150 ${
              page < totalPages - 1
                ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm'
                : 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
            }`}
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : exams.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center text-gray-400">
          <GraduationCap className="w-7 h-7 mx-auto mb-2 opacity-50" />
          <p className="text-xs">No {displayTitle.toLowerCase()} available.</p>
        </div>
      ) : (
        <div className="overflow-hidden">
          <div ref={trackRef} className="space-y-3 w-full">
            {visibleExams.map((exam) => (
              <div key={exam.id} className="w-full min-w-0">
                <StandardExamCard
                  exam={{
                    ...exam,
                    category_logo_url: exam.exam_categories?.logo_url,
                    category_icon: exam.exam_categories?.icon,
                  }}
                  isLive={variant === 'live'}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination dots */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-200 ${
                i === page ? 'w-4 h-1.5 bg-gray-700' : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* View More */}
      {viewMoreUrl && !loading && exams.length > 0 && (
        <div className="text-center mt-3">
          <a href={viewMoreUrl} className="text-sm font-medium text-gray-600 hover:text-gray-900">
            View More &rsaquo;
          </a>
        </div>
      )}
    </div>
  );
};
