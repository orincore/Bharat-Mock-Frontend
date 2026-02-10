"use client";

import { useEffect, useState } from 'react';
import { Exam } from '@/types';
import Link from 'next/link';
import { Clock, FileText, Users, TrendingUp, ArrowRight, Languages } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatExamSummary } from '@/lib/utils/examSummary';

interface ExamCardProps {
  exam: Exam;
}

export const getCountdownLabel = (startDate?: string | null) => {
  if (!startDate) return null;
  const target = new Date(startDate);
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return 'Live now';
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [
    days > 0 ? `${days}d` : null,
    hours > 0 || days > 0 ? `${hours}h` : null,
    `${minutes}m`,
    `${seconds}s`
  ].filter(Boolean);

  return parts.join(' ');
};

export function ExamCard({ exam }: ExamCardProps) {
  const examUrl = exam.url_path || `/exams/${exam.slug || exam.id}`;
  const summary = formatExamSummary(exam);
  const supportsHindi = Boolean(exam.supports_hindi);
  const languageLabel = supportsHindi ? 'English + हिंदी' : 'English only';
  const languageDescriptor = supportsHindi ? 'Bilingual attempts' : 'Single-language';
  
  const statusColors = {
    upcoming: 'bg-warning/10 text-warning border-warning/30',
    ongoing: 'bg-success/10 text-success border-success/30',
    completed: 'bg-muted text-muted-foreground border-muted',
  };

  const difficultyColors = {
    easy: 'bg-success/10 text-success',
    medium: 'bg-warning/10 text-warning',
    hard: 'bg-destructive/10 text-destructive',
  };

  const difficultyKey = (exam.difficulty || 'medium') as keyof typeof difficultyColors;
  const difficultyLabel = difficultyKey.charAt(0).toUpperCase() + difficultyKey.slice(1);

  const [countdown, setCountdown] = useState<string | null>(() => getCountdownLabel(exam.start_date));

  useEffect(() => {
    if (exam.status !== 'upcoming' || !exam.start_date) {
      setCountdown(null);
      return;
    }
    const updateCountdown = () => setCountdown(getCountdownLabel(exam.start_date));
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [exam.start_date, exam.status]);

  return (
    <div className="card-interactive group flex flex-col border border-border/80 rounded-2xl overflow-hidden bg-background">
      <div className="bg-gradient-to-br from-primary/10 via-background to-background px-5 pt-5 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${statusColors[exam.status]} text-xs`}>{exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}</Badge>
            <Badge className={`${difficultyColors[difficultyKey]} text-xs`}>{difficultyLabel}</Badge>
          </div>
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-card text-muted-foreground border border-border">
            {exam.category}
          </span>
        </div>
        <div>
          <h3 className="font-display text-xl font-semibold text-foreground mb-1 leading-snug group-hover:text-primary transition-colors">
            {exam.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{summary}</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-dashed border-border px-3 py-1 text-[12px] text-muted-foreground">
            <Languages className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground/80">{languageLabel}</span>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{languageDescriptor}</span>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>{exam.duration} mins</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span>{exam.total_questions} Qs</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>{exam.total_marks} Marks</span>
          </div>
          {exam.attempts !== undefined && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>{exam.attempts.toLocaleString()} attempts</span>
            </div>
          )}
        </div>

        {countdown && exam.status === 'upcoming' && (
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-secondary">
            <Clock className="h-3.5 w-3.5" />
            <span>Starts in {countdown}</span>
          </div>
        )}

        <div className="mt-auto">
          <Link href={examUrl}>
            <Button className="w-full group/btn" variant="secondary">
              View Details
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
