"use client";

import { useEffect, useState } from 'react';
import { Exam } from '@/types';
import Link from 'next/link';
import { Clock, FileText, Users, TrendingUp, ArrowRight, Languages, Crown, Gift, Download, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatExamSummary } from '@/lib/utils/examSummary';

interface ExamCardProps {
  exam: Exam;
  variant?: 'default' | 'premium';
  size?: 'default' | 'compact';
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

export function ExamCard({ exam, variant = 'default', size = 'default' }: ExamCardProps) {
  const examUrl = exam.url_path || `/exams/${exam.slug || exam.id}`;
  const summary = formatExamSummary(exam);
  const supportsHindi = Boolean(exam.supports_hindi);
  const languageLabel = supportsHindi ? 'English + हिंदी' : 'English only';
  const languageDescriptor = supportsHindi ? 'Bilingual attempts' : 'Single-language';
  const isPremiumVariant = variant === 'premium';
  const isCompact = size === 'compact';
  const pricingDescriptor = exam.is_free ? 'Free access' : 'Premium only';
  const pricingBadgeClasses = exam.is_free
    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
    : 'bg-amber-50 text-amber-600 border-amber-200';
  const pricingLabel = exam.is_free ? 'Free' : 'Premium';
  const normalizedStatus = (exam.status || '').toLowerCase().trim();
  const rawExamType = (exam.exam_type || '').toLowerCase().trim();
  const startDate = exam.start_date ? new Date(exam.start_date) : null;
  const endDate = exam.end_date ? new Date(exam.end_date) : null;
  const nowTs = Date.now();
  const windowStarted = Boolean(startDate && !Number.isNaN(startDate.getTime()) && startDate.getTime() <= nowTs);
  const windowEnded = Boolean(endDate && !Number.isNaN(endDate.getTime()) && endDate.getTime() < nowTs);
  const derivedExamType = (() => {
    if (rawExamType === 'short_quiz') return 'short_quiz';
    if (rawExamType === 'past_paper') return 'past_paper';
    if (rawExamType === 'mock_test') return 'mock_test';
    if (normalizedStatus === 'ongoing' || normalizedStatus === 'live' || normalizedStatus === 'live now') return 'live_window';
    if (exam.allow_anytime) return 'mock_test';
    return 'mock_test';
  })();
  const isQuizType = derivedExamType === 'short_quiz';
  const isPastPaper = derivedExamType === 'past_paper';
  const isLiveExam =
    normalizedStatus === 'ongoing' ||
    normalizedStatus.includes('live') ||
    derivedExamType === 'live_window' ||
    (windowStarted && !windowEnded && !isQuizType && !isPastPaper);
  const isEndedWindow = windowEnded && !normalizedStatus.includes('live');
  
  const statusColors = {
    upcoming: 'bg-warning/10 text-warning border-warning/30',
    ongoing: 'bg-success/10 text-success border-success/30',
    live: 'bg-success/10 text-success border-success/30',
    completed: 'bg-muted text-muted-foreground border-muted',
    anytime: 'bg-primary/10 text-primary border-primary/30'
  } as const;
  type StatusColorKey = keyof typeof statusColors;
  const normalizedStatusKey: StatusColorKey = normalizedStatus.includes('live') ? 'live' : (normalizedStatus as StatusColorKey);
  const statusColorKey: StatusColorKey = (Object.keys(statusColors) as StatusColorKey[]).includes(normalizedStatusKey)
    ? normalizedStatusKey
    : 'upcoming';

  const difficultyColors = {
    easy: 'bg-success/10 text-success',
    medium: 'bg-warning/10 text-warning',
    hard: 'bg-destructive/10 text-destructive',
  };

  const difficultyKey = (exam.difficulty || 'medium') as keyof typeof difficultyColors;
  const difficultyLabel = difficultyKey.charAt(0).toUpperCase() + difficultyKey.slice(1);

  const [countdown, setCountdown] = useState<string | null>(() => getCountdownLabel(exam.start_date));
  const pdfEn = exam.pdf_url_en || exam.download_url || exam.file_url;
  const pdfHi = exam.pdf_url_hi;
  const hasDownloads = Boolean(pdfEn || pdfHi);

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

  const cardBorder = isPremiumVariant
    ? 'border-amber-200/80 shadow-[0_0_0_1px_rgba(245,158,11,0.08)] hover:border-amber-300 hover:shadow-amber-100/40'
    : 'border-border/80';
  const headerGradient = isPremiumVariant
    ? 'bg-gradient-to-tr from-amber-50 via-orange-50/60 to-white'
    : isQuizType
      ? 'bg-gradient-to-tr from-pink-50 via-rose-50 to-white'
      : isPastPaper
        ? 'bg-gradient-to-tr from-slate-50 via-stone-50 to-white'
        : 'bg-gradient-to-tr from-sky-50 via-white to-white';
  const accentColor = isPremiumVariant ? 'text-amber-500' : 'text-primary';
  const titleHoverColor = isPremiumVariant ? 'group-hover:text-amber-600' : 'group-hover:text-primary';

  return (
    <div
      className={`card-interactive group flex flex-col border rounded-2xl overflow-hidden bg-background ${cardBorder} ${
        isCompact ? 'text-sm max-w-[260px]' : 'text-base min-h-[320px] sm:min-h-[340px] lg:min-h-[360px]'
      }`}
    >
      {isPremiumVariant && (
        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
      )}
      <div className={`${headerGradient} ${isCompact ? 'px-4 pt-3 pb-2' : 'px-4 pt-4 pb-3'} flex flex-col gap-3`}>
        <div className="flex flex-wrap items-center gap-2">
          {isPremiumVariant && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs px-2.5 py-0.5 gap-1">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          )}
          <Badge className={`${statusColors[statusColorKey]} text-xs px-2.5 py-0.5`}>
            {(exam.status || 'Upcoming').replace(/_/g, ' ').replace(/(^|\s)\w/g, (c) => c.toUpperCase())}
          </Badge>
          {isLiveExam && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300/60 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 uppercase tracking-wide">
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-3 w-3 rounded-full bg-red-400/70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              Live
            </span>
          )}
          {isQuizType && (
            <Badge className="bg-pink-100 text-pink-700 border-pink-200 text-xs px-2.5 py-0.5">
              Quiz Mode
            </Badge>
          )}
          {isPastPaper && (
            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs px-2.5 py-0.5">
              Previous Paper
            </Badge>
          )}
          <Badge className={`${difficultyColors[difficultyKey]} text-xs px-2.5 py-0.5`}>{difficultyLabel}</Badge>
        </div>
        
        <div className="flex items-start justify-between gap-2">
          {!isPremiumVariant && (
            <Badge className={`${pricingBadgeClasses} border text-xs px-2.5 py-0.5`}>{pricingLabel}</Badge>
          )}
          {exam.category && (
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-card text-muted-foreground border border-border ml-auto">
              {exam.category}
            </span>
          )}
          
        </div>

        {isPremiumVariant && exam.is_free && !isCompact && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/60">
            <Gift className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">This premium exam is free for you!</span>
          </div>
        )}
        {isQuizType && !isCompact && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-50 border border-pink-200/60 text-pink-800 text-xs">
            <Play className="h-3.5 w-3.5" /> Rapid quiz • Instant scoring
          </div>
        )}
        {isPastPaper && !isCompact && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-700 text-xs">
            <FileText className="h-3.5 w-3.5" /> Authentic previous year paper
          </div>
        )}

        <div className="min-h-[3rem] sm:min-h-[3.5rem] flex items-start">
          <h3
            className={`font-display font-semibold text-foreground leading-tight ${titleHoverColor} transition-colors ${
              isCompact 
                ? 'text-xs sm:text-sm' 
                : 'text-sm sm:text-base lg:text-lg xl:text-base'
            }`}
          >
            {exam.title}
          </h3>
        </div>
      </div>

      <div className={`${isCompact ? 'p-3' : 'p-4'} flex-1 flex flex-col gap-3`}>
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Languages className={`h-3.5 w-3.5 ${accentColor}`} />
          <span className="font-medium">{languageLabel}</span>
        </div>
        
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground ${isCompact ? 'text-xs' : 'text-xs'}`}>
          <div className="flex items-center gap-1">
            <Clock className={`h-3.5 w-3.5 ${accentColor}`} />
            <span>{exam.duration} mins</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className={`h-3.5 w-3.5 ${accentColor}`} />
            <span>{exam.total_questions} Qs</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className={`h-3.5 w-3.5 ${accentColor}`} />
            <span>{exam.total_marks} Marks</span>
          </div>
          {exam.attempts !== undefined && !isCompact && (
            <div className="flex items-center gap-2">
              <Users className={`h-4 w-4 ${accentColor}`} />
              <span>{exam.attempts.toLocaleString()} attempts</span>
            </div>
          )}
        </div>

        {countdown && exam.status === 'upcoming' && !isCompact && (
          <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
            <Clock className="h-3.5 w-3.5" />
            <span>Starts in {countdown}</span>
          </div>
        )}

        <div className="mt-auto">
          <Link href={examUrl}>
            <Button
              className={`w-full group/btn rounded-full relative overflow-hidden ${
                isLiveExam
                  ? 'bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:to-red-800 text-white border-0 shadow-[0_12px_30px_-15px_rgba(239,68,68,0.8)]'
                  : isPremiumVariant
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0'
                    : ''
              } ${isCompact ? 'h-9 text-sm' : ''}`}
              variant={isPremiumVariant || isLiveExam ? 'default' : 'secondary'}
              size={isCompact ? 'sm' : 'default'}
              disabled={isEndedWindow}
            >
              {isEndedWindow ? (
                <span className="inline-flex items-center gap-2 font-semibold text-slate-600">
                  Attempt Window Closed
                </span>
              ) : isLiveExam ? (
                <span className="relative flex items-center justify-center gap-2 font-semibold uppercase">
                  <span className="relative flex h-4 w-4 items-center justify-center">
                    <span className="absolute inline-flex h-4 w-4 rounded-full bg-white/40 animate-ping" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                  </span>
                  Join Live Attempt
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  Attempt Now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </span>
              )}
            </Button>
          </Link>
        </div>

        {hasDownloads && (
          <div className="mt-3 space-y-2">
            {pdfEn && (
              <a
                href={pdfEn}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download English PDF
              </a>
            )}
            {pdfHi && (
              <a
                href={pdfHi}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Hindi PDF
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
