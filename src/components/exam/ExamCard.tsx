"use client";

import { useEffect, useState } from 'react';
import { Exam } from '@/types';
import Link from 'next/link';
import { Clock, FileText, Users, TrendingUp, ArrowRight, Languages, Crown, Gift } from 'lucide-react';
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

  const cardBorder = isPremiumVariant
    ? 'border-amber-200/80 shadow-[0_0_0_1px_rgba(245,158,11,0.08)] hover:border-amber-300 hover:shadow-amber-100/40'
    : 'border-border/80';
  const headerGradient = isPremiumVariant
    ? 'bg-gradient-to-tr from-amber-50 via-orange-50/60 to-white'
    : 'bg-gradient-to-tr from-sky-50 via-white to-white';
  const accentColor = isPremiumVariant ? 'text-amber-500' : 'text-primary';
  const titleHoverColor = isPremiumVariant ? 'group-hover:text-amber-600' : 'group-hover:text-primary';

  return (
    <div
      className={`card-interactive group flex flex-col border rounded-2xl overflow-hidden bg-background ${cardBorder} ${
        isCompact ? 'text-sm max-w-[260px]' : 'text-base'
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
          <Badge className={`${statusColors[exam.status]} text-xs px-2.5 py-0.5`}>
            {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
          </Badge>
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

        <div>
          <h3
            className={`font-display ${isCompact ? 'text-base' : 'text-lg'} font-semibold text-foreground leading-tight ${titleHoverColor} transition-colors line-clamp-2`}
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
              className={`w-full group/btn rounded-full ${
                isPremiumVariant
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0'
                  : ''
              } ${isCompact ? 'h-9 text-sm' : ''}`}
              variant={isPremiumVariant ? 'default' : 'secondary'}
              size={isCompact ? 'sm' : 'default'}
            >
              View Details
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
