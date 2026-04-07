'use client';

import React, { useEffect, useState } from 'react';
import { StandardExamCard } from '@/components/exam/StandardExamCard';
import { examService } from '@/lib/api/examService';
import { Exam } from '@/types';
import { GraduationCap, Loader2 } from 'lucide-react';

interface LiveExamCardsBlockProps {
  content: {
    examIds?: string[];
    title?: string;
    headingTag?: string;
    layout?: 'grid' | 'list' | 'carousel';
    columns?: number;
  };
}

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
type HeadingTag = (typeof HEADING_TAGS)[number];

const resolveHeadingTag = (value?: string | null, fallback: HeadingTag = 'h3'): HeadingTag =>
  HEADING_TAGS.includes((value || '').toLowerCase() as HeadingTag)
    ? ((value || '').toLowerCase() as HeadingTag)
    : fallback;

export const LiveExamCardsBlock: React.FC<LiveExamCardsBlockProps> = ({ content }) => {
  const { examIds = [], title, headingTag, layout = 'grid', columns = 2 } = content || {};
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examIds.length) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchExams = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          examIds.map((id) => examService.getExamById(id).catch(() => null))
        );
        if (!cancelled) {
          setExams(results.filter((e): e is Exam => e !== null));
        }
      } catch (err) {
        console.error('[LiveExamCardsBlock] Failed to fetch exams', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchExams();
    return () => { cancelled = true; };
  }, [examIds.join(',')]);

  if (!examIds.length) return null;

  if (loading) {
    return (
      <div className="block-exam-cards">
        <Header title={title} headingTag={headingTag} />
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Loading exams...</span>
        </div>
      </div>
    );
  }

  if (!exams.length) {
    return (
      <div className="block-exam-cards">
        <Header title={title} headingTag={headingTag} />
        <div className="p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center text-gray-500">
          <GraduationCap className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No exams found for the given IDs.</p>
        </div>
      </div>
    );
  }

  const normalizedColumns = Math.min(Math.max(Number(columns) || 1, 1), 4);
  const minCardWidth = normalizedColumns >= 3 ? 200 : 240;
  const gridStyle = layout === 'list'
    ? undefined
    : ({
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${minCardWidth}px, 100%), 1fr))`
      } as React.CSSProperties);
  const gridClass = layout === 'list'
    ? 'flex flex-col gap-4'
    : 'grid gap-5';

  return (
    <div className="block-exam-cards min-w-0 overflow-hidden">
      <Header title={title} headingTag={headingTag} />
      <div className={gridClass} style={gridStyle}>
      {exams.map((exam) => (
          <div key={exam.id} className="min-w-0 overflow-hidden">
            <StandardExamCard
              exam={{
                ...exam,
                category_logo_url: exam.exam_categories?.logo_url,
                category_icon: exam.exam_categories?.icon,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const Header = ({ title, headingTag }: { title?: string; headingTag?: string }) => {
  const Tag = resolveHeadingTag(headingTag, 'h3');
  return (
  <div className="flex items-center justify-between mb-5">
    <Tag className="text-2xl font-bold text-slate-900">
      {title || 'Exams'}
    </Tag>
    <div className="hidden sm:flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-blue-500 font-semibold">
      <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
      Curated
    </div>
  </div>
  );
};
