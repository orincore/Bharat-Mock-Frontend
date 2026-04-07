"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, FileText, TrendingUp, Languages, ArrowRight, Lock, Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logoUrl } from '@/lib/utils/imageUrl';

interface StandardExamCardProps {
  exam: {
    id?: string | number;
    slug?: string;
    title: string;
    status?: string;
    difficulty?: string;
    is_free?: boolean;
    category?: string;
    logo_url?: string;
    image_url?: string;
    thumbnail_url?: string;
    category_logo_url?: string;
    category_icon?: string;
    supports_hindi?: boolean;
    duration?: number | string;
    total_questions?: number | string;
    total_marks?: number | string;
    url_path?: string;
    pdf_url_en?: string;
    pdf_url_hi?: string;
    download_url?: string;
    pdf_url?: string;
    file_url?: string;
    start_date?: string | null;
    end_date?: string | null;
    allow_anytime?: boolean;
    attempts?: number | string;
  };
  pdfMode?: boolean;
  isLocked?: boolean;
  isLive?: boolean;
  hideAttempts?: boolean;
  showAttemptsTop?: boolean;
  ctaLabel?: string;
  onDownloadPDF?: (id: string) => void;
  isDownloading?: boolean;
}

export function StandardExamCard({
  exam,
  pdfMode = false,
  isLocked = false,
  isLive = false,
  hideAttempts = false,
  showAttemptsTop = false,
  ctaLabel,
  onDownloadPDF,
  isDownloading = false,
}: StandardExamCardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const showStatusPill = exam.status && exam.status !== 'ongoing' && exam.status !== 'anytime';

  // Derive live state if not explicitly passed
  const nowTs = mounted ? Date.now() : 0;
  const startDate = exam.start_date ? new Date(exam.start_date) : null;
  const endDate = exam.end_date ? new Date(exam.end_date) : null;
  const windowStarted = Boolean(startDate && !Number.isNaN(startDate.getTime()) && startDate.getTime() <= nowTs);
  const windowEnded = Boolean(endDate && !Number.isNaN(endDate.getTime()) && endDate.getTime() < nowTs);
  const normalizedStatus = (exam.status || '').toLowerCase().trim();
  const derivedIsLive = isLive ||
    normalizedStatus === 'ongoing' ||
    normalizedStatus.includes('live') ||
    (mounted && windowStarted && !windowEnded && !exam.allow_anytime);
  const isEndedWindow = mounted && windowEnded && !normalizedStatus.includes('live');
  const difficultyLabel = exam.difficulty
    ? exam.difficulty.charAt(0).toUpperCase() + exam.difficulty.slice(1)
    : 'Medium';
  const difficultyColor =
    exam.difficulty === 'easy'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
      : exam.difficulty === 'hard'
      ? 'bg-red-50 text-red-700 border-red-200/70'
      : 'bg-amber-50 text-amber-700 border-amber-200/70';

  const languageLabel = exam.supports_hindi ? 'English + हिंदी' : 'English only';
  const examUrl = exam.url_path || `/exams/${exam.slug || exam.id}`;

  const hasPdfEn = Boolean(exam.pdf_url_en);
  const hasPdfHi = Boolean(exam.pdf_url_hi);
  const fallbackPdf = exam.download_url || exam.pdf_url || exam.file_url;

  const defaultCta = isLocked ? 'Unlock Premium' : (ctaLabel || 'Attempt Now');

  const logoSrc = logoUrl(exam.logo_url || exam.image_url || exam.thumbnail_url || exam.category_logo_url || exam.category_icon || '');

  return (
    <div className={`group relative flex h-full flex-col rounded-2xl border bg-white overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 ${
      derivedIsLive
        ? 'border-red-200/80 hover:shadow-[0_8px_24px_rgba(239,68,68,0.15)] hover:border-red-300'
        : 'border-slate-200/80 hover:shadow-[0_8px_24px_rgba(15,23,42,0.12)] hover:border-blue-200'
    }`}>
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
        derivedIsLive
          ? 'from-red-400 via-rose-500 to-red-600'
          : 'from-sky-400 via-blue-500 to-indigo-500'
      }`} />

      <div className={`p-3 sm:p-4 pt-4 sm:pt-5 bg-gradient-to-br ${
        derivedIsLive ? 'from-red-50/60 via-white to-white' : 'from-slate-50/60 via-white to-white'
      }`}>
        {/* Free/Premium + Category row */}
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {logoSrc && (
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt={exam.title}
                  className="h-7 w-7 sm:h-8 sm:w-8 object-contain p-0.5"
                  loading="lazy"
                  decoding="async"
                  width={32}
                  height={32}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wide border ${
              exam.is_free
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                : 'bg-violet-50 text-violet-700 border-violet-200/70'
            }`}>
              {exam.is_free ? 'Free' : 'Premium'}
            </span>
            {showAttemptsTop && exam.attempts != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-orange-600 border border-orange-200/70">
                <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {exam.attempts}
              </span>
            )}
            {/* Live badge */}
            {derivedIsLive && (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-red-300/60 bg-red-500/10 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-red-600 uppercase tracking-wide">
                <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 items-center justify-center">
                  <span className="absolute inline-flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-red-400/70 animate-ping" />
                  <span className="relative inline-flex h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-red-500" />
                </span>
                Live
              </span>
            )}
          </div>
          {exam.category && (
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] sm:text-[11px] font-medium truncate max-w-[100px] sm:max-w-[130px]">
              {exam.category}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm sm:text-[15px] leading-snug text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-2 sm:mb-3 min-h-[2.2rem] sm:min-h-[2.5rem]">
          {exam.title}
        </h3>

        {/* Difficulty + Status + Language pills */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border ${difficultyColor}`}>
            {difficultyLabel}
          </span>
          {showStatusPill && (
            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/70">
              {exam.status!.charAt(0).toUpperCase() + exam.status!.slice(1)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200/70">
            <Languages className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="hidden sm:inline">{languageLabel}</span>
            <span className="sm:hidden">{exam.supports_hindi ? 'EN+HI' : 'EN'}</span>
          </span>
        </div>
      </div>

      <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col gap-2 sm:gap-3 flex-1">
        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 text-xs text-slate-600 py-1.5 sm:py-2 border-t border-slate-100">
          {exam.duration && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-sky-50">
                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-sky-500" />
              </div>
              <span className="font-medium text-[11px] sm:text-xs">{exam.duration} mins</span>
            </div>
          )}
          {exam.total_questions && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-sky-50">
                <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-sky-500" />
              </div>
              <span className="font-medium text-[11px] sm:text-xs">{exam.total_questions} Qs</span>
            </div>
          )}
          {exam.total_marks && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-sky-50">
                <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-sky-500" />
              </div>
              <span className="font-medium text-[11px] sm:text-xs">{exam.total_marks} Marks</span>
            </div>
          )}
          {exam.attempts != null && !hideAttempts && !showAttemptsTop && (
            <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
              <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-orange-50">
                <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-500" />
              </div>
              <span className="font-bold text-orange-600 text-[11px] sm:text-xs">{exam.attempts} Attempts</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-auto flex flex-col gap-1.5 sm:gap-2">
          <Link href={examUrl} className="inline-flex w-full">
            <Button
              className={`w-full rounded-xl font-semibold shadow-lg transition-all duration-300 group/btn text-sm sm:text-base ${
                isEndedWindow
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                  : derivedIsLive
                    ? 'bg-gradient-to-r from-red-500 via-red-600 to-rose-600 text-white shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:from-red-600 hover:to-rose-700'
                    : isLocked
                      ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:from-orange-500 hover:to-orange-700'
                      : 'bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 text-white shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:from-amber-500 hover:via-orange-600 hover:to-orange-700'
              }`}
              size="sm"
              disabled={isEndedWindow}
            >
              {isEndedWindow ? (
                'Window Closed'
              ) : derivedIsLive ? (
                <span className="relative flex items-center justify-center gap-1.5 sm:gap-2 font-semibold uppercase tracking-wide">
                  <span className="relative flex h-3 w-3 sm:h-3.5 sm:w-3.5 items-center justify-center">
                    <span className="absolute inline-flex h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-white/40 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white" />
                  </span>
                  Join Live
                </span>
              ) : (
                <>
                  {isLocked && <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />}
                  {defaultCta}
                  {!isLocked && <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1 transition-transform group-hover/btn:translate-x-0.5" />}
                </>
              )}
            </Button>
          </Link>

          {/* PDF buttons */}
          {pdfMode && (
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {onDownloadPDF && exam.id && (
                <button
                  onClick={() => onDownloadPDF(String(exam.id))}
                  disabled={isDownloading}
                  className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg border border-slate-200 text-slate-600 bg-slate-50 text-[10px] sm:text-[11px] font-semibold px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {isDownloading ? 'Preparing...' : 'Download PDF'}
                </button>
              )}
              {hasPdfEn && (
                <a
                  href={exam.pdf_url_en}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg border border-slate-200 text-slate-600 bg-slate-50 text-[10px] sm:text-[11px] font-semibold px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-slate-100 transition"
                >
                  <Download className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  EN PDF
                </a>
              )}
              {hasPdfHi && (
                <a
                  href={exam.pdf_url_hi}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg border border-slate-200 text-slate-600 bg-slate-50 text-[10px] sm:text-[11px] font-semibold px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-slate-100 transition"
                >
                  <Download className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  HI PDF
                </a>
              )}
              {!hasPdfEn && !hasPdfHi && fallbackPdf && (
                <a
                  href={fallbackPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg border border-slate-200 text-slate-600 bg-slate-50 text-[10px] sm:text-[11px] font-semibold px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-slate-100 transition"
                >
                  <Download className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  Download PDF
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
