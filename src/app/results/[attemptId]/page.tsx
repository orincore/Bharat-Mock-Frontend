"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Award, Clock, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, Target, BarChart3, ArrowLeft, Trophy, Users, ClipboardList, RotateCcw
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/common/LoadingStates';
import { examService } from '@/lib/api/examService';

interface ResultData {
  id: string;
  attempt_id: string;
  exam_id: string;
  score: number;
  total_marks: number;
  percentage: number;
  correct_answers: number;
  wrong_answers: number;
  unattempted: number;
  time_taken: number;
  status: 'pass' | 'fail';
  exam: {
    id?: string;
    title: string;
    pass_percentage: number;
    total_questions: number;
    duration?: number;
    slug?: string;
    url_path?: string;
  };
  rank?: number | null;
  total_participants?: number | null;
  comparison?: {
    averageScore?: number | null;
    bestScore?: number | null;
    percentileAchieved?: number | null;
    questionsAttempted?: number;
    accuracyAchieved?: number;
    totalParticipants?: number | null;
  };
  sectionWiseAnalysis?: Array<{
    sectionId: string;
    sectionName: string;
    score: number;
    totalMarks: number;
    correctAnswers: number;
    wrongAnswers: number;
    unattempted: number;
    accuracy: number;
    timeTaken: number;
  }>;
  created_at: string;
  language?: 'en' | 'hi';
}

const RICH_TEXT_SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['font', 'code'],
  ADD_ATTR: ['style', 'class', 'color', 'face', 'size', 'target', 'rel', 'data-inline-break']
};

const sanitizeRichText = (html?: string) => DOMPurify.sanitize(html || '', RICH_TEXT_SANITIZE_CONFIG);

const createRichTextMarkup = (html?: string) => ({ __html: sanitizeRichText(html) });

const stripHtmlTags = (html?: string) => {
  if (!html) return '';
  if (typeof window === 'undefined') {
    return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
};

interface ReviewQuestion {
  id: string;
  sectionId: string;
  sectionName: string;
  type: 'single' | 'multiple' | 'truefalse' | 'numerical';
  text: string;
  marks: number;
  negativeMarks: number;
  explanation?: string;
  imageUrl?: string;
  options: Array<{
    id: string;
    option_text: string;
    option_order: number;
    image_url?: string;
    imageUrl?: string;
    image?: string;
  }>;
  correctAnswer: string | string[];
  userAnswer: string | string[] | null;
  isCorrect: boolean;
  marksObtained: number;
  timeTaken: number;
}

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params?.attemptId as string;

  const [result, setResult] = useState<ResultData | null>(null);
  const [reviewData, setReviewData] = useState<ReviewQuestion[]>([]);
  const [isReviewLoading, setIsReviewLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [examDetailUrl, setExamDetailUrl] = useState<string | null>(null);
  const [examUrlLoading, setExamUrlLoading] = useState(false);
  const [isReattempting, setIsReattempting] = useState(false);

  const buildExamDetailUrl = useCallback(async (examId: string, examMeta?: ResultData['exam']) => {
    if (!examId) return null;

    const sanitizePath = (path?: string | null) => {
      if (!path) return null;
      const trimmed = path.replace(/^\/+/, '');
      return trimmed ? `/${trimmed}` : null;
    };

    const urlFromMeta = sanitizePath(examMeta?.url_path) || (examMeta?.slug ? `/exams/${examMeta.slug}` : null);
    if (urlFromMeta) return urlFromMeta;

    try {
      const examDetails = await examService.getExamById(examId);
      return (
        sanitizePath(examDetails?.url_path) ||
        (examDetails?.slug ? `/exams/${examDetails.slug}` : null) ||
        `/exams/${examId}`
      );
    } catch (err) {
      console.error('Failed to resolve exam URL from result page:', err);
      return `/exams/${examId}`;
    }
  }, []);

  useEffect(() => {
    const fetchResult = async () => {
      if (!attemptId) {
        setError('Invalid attempt reference');
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        let response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/results/attempt/${attemptId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (response.status === 404) {
          response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/results/${attemptId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.status === 401) {
            router.push('/login');
            return;
          }
        }

        if (!response.ok) {
          throw new Error('Failed to fetch result');
        }

        const data = await response.json();
        setResult(data.data);

        setExamUrlLoading(true);
        const derivedUrl = await buildExamDetailUrl(data.data.exam_id, data.data.exam);
        setExamDetailUrl(derivedUrl);
        setExamUrlLoading(false);

        const reviewResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/results/${data.data.id}/review`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (reviewResponse.status === 401) {
          router.push('/login');
          return;
        }

        if (!reviewResponse.ok) {
          throw new Error('Failed to fetch review data');
        }

        const reviewJson = await reviewResponse.json();
        if (process.env.NODE_ENV !== 'production') {
        }
        setReviewData(reviewJson.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load result');
      } finally {
        setIsLoading(false);
        setIsReviewLoading(false);
      }
    };

    fetchResult();
  }, [attemptId, router, buildExamDetailUrl]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatScoreValue = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'N/A';
    }

    const hasFraction = Math.abs(value % 1) > 0.001;
    return hasFraction ? value.toFixed(2) : value.toFixed(0);
  };

  const reviewBySection = useMemo(() => {
    return reviewData.reduce<Record<string, { sectionName: string; questions: ReviewQuestion[] }>>((acc, question) => {
      if (!acc[question.sectionId]) {
        acc[question.sectionId] = {
          sectionName: question.sectionName,
          questions: []
        };
      }
      acc[question.sectionId].questions.push(question);
      return acc;
    }, {});
  }, [reviewData]);

  const handleReattempt = useCallback(async () => {
    if (!result) return;
    setIsReattempting(true);
    try {
      const nextAttempt = await examService.startExam(result.exam_id, (result.language === 'hi' ? 'hi' : 'en'));
      router.push(`/exams/${result.exam_id}/attempt/${nextAttempt.attemptId}?lang=${nextAttempt.language || result.language || 'en'}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start a new attempt');
    } finally {
      setIsReattempting(false);
    }
  }, [result, router]);

  const resolveOptionImage = (option: { image_url?: string; imageUrl?: string; image?: string }) =>
    option.image_url || option.imageUrl || option.image || '';

  if (isLoading) {
    return <LoadingPage message="Loading your results..." />;
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center py-12">
        <div className="max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Unable to load results</h2>
          <p className="text-muted-foreground mb-6">{error || 'Result not found'}</p>
          <Button onClick={() => router.push('/exams')}>Browse Exams</Button>
        </div>
      </div>
    );
  }

  const isPassed = result.status === 'pass';
  const accuracy = result.correct_answers + result.wrong_answers > 0
    ? (result.correct_answers / (result.correct_answers + result.wrong_answers)) * 100
    : 0;
  const examTitle = result.exam?.title ?? 'Exam details unavailable';
  const examPassRequirement = result.exam?.pass_percentage ?? 0;
  const totalQuestions = result.exam?.total_questions
    ?? (result.correct_answers + result.wrong_answers + result.unattempted);
  const attemptLanguageLabel = result.language === 'hi' ? 'हिंदी' : 'English';
  const questionsAttempted = result.comparison?.questionsAttempted ?? (result.correct_answers + result.wrong_answers);
  const percentileAchieved = result.comparison?.percentileAchieved ?? null;
  const averageScore = result.comparison?.averageScore ?? null;
  const bestScore = result.comparison?.bestScore ?? null;
  const rankDisplay = result.rank && result.total_participants
    ? `${result.rank}/${result.total_participants}`
    : 'N/A';
  const scoreProgress = result.total_marks > 0 ? Math.max(0, Math.min(100, (result.score / result.total_marks) * 100)) : 0;
  const sectionWiseAnalysis = result.sectionWiseAnalysis || [];
  const strengthBuckets = sectionWiseAnalysis.reduce<{
    weak: typeof sectionWiseAnalysis;
    strong: typeof sectionWiseAnalysis;
    uncategorized: typeof sectionWiseAnalysis;
  }>((acc, section) => {
    if (section.accuracy >= 70) {
      acc.strong.push(section);
    } else if (section.accuracy > 0 && section.accuracy < 40) {
      acc.weak.push(section);
    } else {
      acc.uncategorized.push(section);
    }
    return acc;
  }, { weak: [], strong: [], uncategorized: [] });

  const parseAnswerIds = (answer: string | string[] | null) => {
    if (!answer) return [];
    if (Array.isArray(answer)) return answer;
    try {
      const parsed = JSON.parse(answer);
      return Array.isArray(parsed) ? parsed : [answer];
    } catch {
      return [answer];
    }
  };

  const getOptionClass = (optionId: string, question: ReviewQuestion) => {
    const correctIds = parseAnswerIds(question.correctAnswer as any);
    const userIds = parseAnswerIds(question.userAnswer);
    const isCorrect = correctIds.includes(optionId);
    const isSelected = userIds.includes(optionId);

    if (isCorrect && isSelected) {
      return 'border-green-600 bg-green-50';
    }

    if (isCorrect) {
      return 'border-green-500 bg-green-50';
    }

    if (isSelected && !isCorrect) {
      return 'border-destructive bg-destructive/5';
    }

    return 'border-border';
  };

  const renderAnswerSummary = (question: ReviewQuestion) => {
    const userIds = parseAnswerIds(question.userAnswer);
    const correctIds = parseAnswerIds(question.correctAnswer as any);

    if (!userIds.length) {
      return 'Not Answered';
    }

    const resolveAnswerLabel = (id: string) => {
      const normalizedId = String(id);
      const optionIndex = question.options.findIndex(opt => String(opt.id) === normalizedId);
      if (optionIndex !== -1) {
        const option = question.options[optionIndex];
        const localizedText = option.option_text || (option as any).option_text_hi || '';
        const plain = stripHtmlTags(localizedText);
        const optionLetter = String.fromCharCode(65 + optionIndex);
        const hasImage = Boolean(resolveOptionImage(option));
        if (hasImage) {
          const imageLabel = `Image Option ${optionLetter}`;
          return plain ? `${plain} ${imageLabel}` : imageLabel;
        }
        return plain || `Option ${optionLetter}`;
      }
      return stripHtmlTags(normalizedId) || normalizedId;
    };

    const optionText = (ids: string[]) => ids
      .map(resolveAnswerLabel)
      .join(', ');

    return question.isCorrect
      ? `Correct (${optionText(userIds)})`
      : `Your Answer: ${optionText(userIds)} | Correct: ${optionText(correctIds)}`;
  };

  if (isLoading) {
    return <LoadingPage message="Loading your results..." />;
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center py-12">
        <div className="max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Unable to load results</h2>
          <p className="text-muted-foreground mb-6">{error || 'Result not found'}</p>
          <Button onClick={() => router.push('/exams')}>Browse Exams</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4">
      <div className="container-main max-w-6xl space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/mock-test-series">
              <Button variant="ghost" size="sm" className="-ml-3 mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Exams
              </Button>
            </Link>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900">{examTitle}</h1>
            <p className="mt-1 text-sm text-slate-500">Generated result summary with real attempt and section analytics.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleReattempt} disabled={isReattempting} size="sm" className="h-8">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              {isReattempting ? 'Starting...' : 'Reattempt'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={async () => {
                if (!result) return;
                setExamUrlLoading(true);
                try {
                  const destination = examDetailUrl || (await buildExamDetailUrl(result.exam_id, result.exam)) || `/exams/${result.exam_id}`;
                  setExamDetailUrl(destination);
                  router.push(destination);
                } finally {
                  setExamUrlLoading(false);
                }
              }}
            >
              {examUrlLoading ? 'Opening…' : 'Go To Test Series'}
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById('solutions-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Solutions
            </Button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6 text-slate-900">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-4">Overall Performance Summary</h2>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
            {/* Left Column: Score Achieved */}
            <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col h-full">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
                <Award className="h-3.5 w-3.5 text-emerald-600" />
                Score Achieved
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center gap-6 mb-2">
                {/* Circular Progress Container - Smaller size */}
                <div className="relative h-44 w-44 shrink-0">
                  <svg viewBox="0 0 120 120" className="h-44 w-44 -rotate-90">
                    <circle cx="60" cy="60" r="48" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke={isPassed ? '#10b981' : '#f59e0b'}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={(1 - scoreProgress / 100) * 2 * Math.PI * 48}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="text-4xl font-black tracking-tight text-slate-900">
                      {formatScoreValue(result.score)}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1 text-slate-400">
                      <span className="text-[8px] font-bold uppercase tracking-tighter">out of</span>
                      <span className="text-sm font-bold text-slate-600 tracking-tight">{formatScoreValue(result.total_marks)}</span>
                    </div>
                    <div className={`mt-2 rounded-full px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isPassed ? 'bg-emerald-100/80 text-emerald-700' : 'bg-amber-100/80 text-amber-700'}`}>
                      {isPassed ? 'Passed' : 'Needs work'}
                    </div>
                  </div>
                </div>

                {/* Horizontal Stats Breakdown - Compacted */}
                <div className="w-full space-y-1.5">
                  {[
                    { label: 'Correct', value: result.correct_answers, tone: 'bg-green-500', desc: 'Accurate' },
                    { label: 'Incorrect', value: result.wrong_answers, tone: 'bg-rose-500', desc: 'Mistakes' },
                    { label: 'Unattempted', value: result.unattempted, tone: 'bg-slate-400', desc: 'Skipped' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl bg-white border border-slate-100 px-3 py-2 shadow-sm transition-all hover:bg-slate-50/50">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-2 w-2 rounded-full ${item.tone}`} />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-tight">{item.label}</span>
                          <span className="text-[8px] font-medium text-slate-400 leading-tight">{item.desc}</span>
                        </div>
                      </div>
                      <span className="text-lg font-black text-slate-900">{item.value}</span>
                    </div>
                  ))}

                  {/* Group Comparison Stats (Integrated here) */}
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-slate-100 bg-white p-2 shadow-sm hover:border-slate-200 transition-all">
                      <p className="text-[7px] uppercase font-bold tracking-[0.2em] text-slate-400">Average</p>
                      <p className="mt-0.5 text-sm font-black text-slate-900">{formatScoreValue(averageScore)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white p-2 shadow-sm hover:border-slate-200 transition-all">
                      <p className="text-[7px] uppercase font-bold tracking-[0.2em] text-slate-400">Best</p>
                      <p className="mt-0.5 text-sm font-black text-slate-900">{formatScoreValue(bestScore)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column */}
            <div className="flex flex-col gap-3 h-full">
              <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <Trophy className="h-3 w-3 text-amber-500" />
                  Current Rank
                </div>
                <p className="text-2xl font-black text-slate-900 leading-none">{rankDisplay}</p>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                  {result.rank ? 'Rank among active students.' : 'TBD'}
                </p>
              </div>

              <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <ClipboardList className="h-3 w-3 text-sky-500" />
                  Questions Attempted
                </div>
                <p className="text-2xl font-black text-slate-900 leading-none">{questionsAttempted}</p>
                <div className="mt-3 h-1.5 rounded-full bg-slate-50 overflow-hidden">
                  <div className="h-full rounded-full bg-sky-500 transition-all duration-1000" style={{ width: `${totalQuestions > 0 ? (questionsAttempted / totalQuestions) * 100 : 0}%` }} />
                </div>
                <p className="mt-1.5 text-[9px] font-medium text-slate-400 uppercase tracking-widest leading-none">{questionsAttempted} / {totalQuestions}</p>
              </div>

              <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <Clock className="h-3 w-3 text-orange-500" />
                  Time Taken
                </div>
                <p className="text-2xl font-black text-slate-900 leading-none">{formatTime(result.time_taken)}</p>
                <div className="mt-3 h-1.5 rounded-full bg-slate-50 overflow-hidden">
                  <div className="h-full rounded-full bg-orange-500 transition-all duration-1000" style={{ width: '45%' }} />
                </div>
                <p className="mt-1.5 text-[9px] font-medium text-slate-400 uppercase tracking-widest leading-none">Limit: {result.exam?.duration || 0} mins</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-3 h-full">
              <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <Users className="h-3 w-3 text-emerald-500" />
                  Percentile Achieved
                </div>
                <p className="text-2xl font-black text-slate-900 leading-none">
                  {percentileAchieved !== null ? `${percentileAchieved}%` : 'N/A'}
                </p>
                <div className="mt-3 h-1.5 rounded-full bg-slate-50 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-emerald-500 transition-all duration-1000" 
                    style={{ width: `${percentileAchieved ?? 0}%` }} 
                  />
                </div>
                <p className="mt-1.5 text-[9px] font-medium text-slate-400 uppercase tracking-widest leading-none">{result.total_participants || 0} Students</p>
              </div>

              <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <Target className="h-3 w-3 text-violet-500" />
                  Overall Accuracy
                </div>
                <p className="text-2xl font-black text-slate-900 leading-none">{accuracy.toFixed(2)}%</p>
                <div className="mt-3 h-1.5 rounded-full bg-slate-50 overflow-hidden">
                  <div className="h-full rounded-full bg-violet-500 transition-all duration-1000" style={{ width: `${accuracy}%` }} />
                </div>
                <p className="mt-1.5 text-[9px] font-medium text-slate-400 uppercase tracking-widest leading-none">Consistency tracker</p>
              </div>

              <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-center border-l-4 border-l-slate-900">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <TrendingUp className="h-3 w-3 text-slate-900" />
                  Result Status
                </div>
                <p className={`text-3xl font-black leading-none ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isPassed ? 'PASS' : 'FAIL'}
                </p>
                <p className="mt-3 text-[9px] font-medium text-slate-400 uppercase tracking-widest leading-none">Req: {examPassRequirement}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <h2 className="font-display text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Sectional Summary</h2>
          {sectionWiseAnalysis.length === 0 ? (
            <p className="text-sm text-slate-500">Section-wise analysis is not available for this result yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-0 overflow-hidden rounded-2xl border border-slate-200">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Subject Name</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Score</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Questions Attempted</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Time Taken</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionWiseAnalysis.map(section => (
                    <tr key={section.sectionId} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-xs font-semibold text-slate-800">{section.sectionName}</td>
                      <td className="px-3 py-2 text-center text-xs text-slate-600 font-medium">{section.score}</td>
                      <td className="px-3 py-2 text-center text-xs text-slate-600 font-medium">{section.correctAnswers + section.wrongAnswers}</td>
                      <td className="px-3 py-2 text-center text-xs text-slate-600 font-medium">{formatTime(section.timeTaken)}</td>
                      <td className="px-3 py-2 text-center text-xs text-slate-600 font-medium">{section.accuracy.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <h2 className="font-display text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Graphical Analysis</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-tight">Strength Breakdown</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-[10px] font-bold">Weak {strengthBuckets.weak.length}</span>
                <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">Strong {strengthBuckets.strong.length}</span>
                <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-[10px] font-bold">Pending {strengthBuckets.uncategorized.length}</span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: 'Weak', items: strengthBuckets.weak, tone: 'border-blue-100 bg-blue-50/50', text: 'text-blue-800' },
                { label: 'Strong', items: strengthBuckets.strong, tone: 'border-emerald-100 bg-emerald-50/50', text: 'text-emerald-800' },
                { label: 'Pending', items: strengthBuckets.uncategorized, tone: 'border-slate-100 bg-slate-50/50', text: 'text-slate-800' }
              ].map(bucket => (
                <div key={bucket.label} className={`rounded-xl border p-3 ${bucket.tone}`}>
                  <h4 className={`text-[10px] font-black uppercase tracking-widest ${bucket.text}`}>{bucket.label}</h4>
                  {bucket.items.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">No sections in this bucket.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {bucket.items.map(section => (
                        <div key={section.sectionId} className="rounded-xl bg-white/80 border border-white px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-slate-900">{section.sectionName}</p>
                            <span className="text-xs font-semibold text-slate-500">{section.accuracy.toFixed(1)}%</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${bucket.label === 'Strong' ? 'bg-emerald-500' : bucket.label === 'Weak' ? 'bg-blue-500' : 'bg-slate-400'}`}
                              style={{ width: `${Math.max(0, Math.min(100, section.accuracy))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-4 w-4 text-sky-600" />
            <h2 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wider">Exam Details</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 col-span-2 md:col-span-1">
              <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Exam Title</p>
              <p className="mt-1 text-xs font-bold text-slate-800 line-clamp-1">{examTitle}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
              <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Submitted</p>
              <p className="mt-1 text-xs font-bold text-slate-800">{new Date(result.created_at).toLocaleDateString()}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
              <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Lang</p>
              <p className="mt-1 text-xs font-bold text-slate-800">{attemptLanguageLabel}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
              <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400">ID</p>
              <p className="mt-1 text-[8px] font-mono text-slate-500 truncate">{result.attempt_id.substring(0, 8)}...</p>
            </div>
          </div>
        </div>

        <div id="solutions-section" className="bg-card border border-border rounded-2xl p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Detailed Question Review</h2>
            {isReviewLoading && <span className="text-sm text-muted-foreground">Loading review...</span>}
          </div>

          {Object.keys(reviewBySection).length === 0 && !isReviewLoading ? (
            <p className="text-muted-foreground text-sm">Review data unavailable for this attempt.</p>
          ) : (
            <div className="space-y-8">
              {Object.values(reviewBySection).map(section => (
                <div key={section.sectionName}>
                  <h3 className="font-semibold text-lg mb-3">{section.sectionName}</h3>
                  <div className="space-y-4">
                    {section.questions.map((question, idx) => {
                      const statusBadge = question.userAnswer
                        ? question.isCorrect ? 'Correct' : 'Incorrect'
                        : 'Skipped';
                      const statusColor = question.userAnswer
                        ? question.isCorrect ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-red-100 text-red-600 border-red-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200';

                      return (
                        <div key={question.id} className="border border-border rounded-xl p-4">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Question {idx + 1}</p>
                              <div
                                className="font-medium text-base rich-text-content"
                                dangerouslySetInnerHTML={createRichTextMarkup(question.text)}
                              />
                            </div>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusColor}`}>
                              {statusBadge}
                            </span>
                          </div>

                          {question.imageUrl && (
                            <img
                              src={question.imageUrl}
                              alt={`Question image for question ${idx + 1}`}
                              className="max-h-64 rounded-lg border border-border object-contain mb-4"
                            />
                          )}

                          <div className="space-y-2 mb-3">
                            {question.options.map((option, idx) => (
                              <div
                                key={option.id}
                                className={`p-4 rounded-lg border space-y-2 ${getOptionClass(option.id, question)}`}
                              >
                                <div className="flex items-start gap-3">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {String.fromCharCode(65 + idx)}.
                                  </span>
                                  <div
                                    className="flex-1 rich-text-content text-sm"
                                    dangerouslySetInnerHTML={createRichTextMarkup(option.option_text)}
                                  />
                                </div>
                                {resolveOptionImage(option) && (
                                  <img
                                    src={resolveOptionImage(option)}
                                    alt={`Option ${String.fromCharCode(65 + idx)}`}
                                    className="max-h-32 rounded-lg border border-border object-contain"
                                  />
                                )}
                              </div>
                            ))}
                          </div>

                          <p className="text-sm text-muted-foreground mb-1">
                            {renderAnswerSummary(question)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Marks: {question.marksObtained} / {question.marks}
                            {question.negativeMarks > 0 && ` (Negative: -${question.negativeMarks})`}
                          </p>
                          {question.explanation && (
                            <details className="mt-4">
                              <summary className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 font-semibold text-sm rounded-lg border border-blue-200 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md select-none">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                View Explanation
                                <svg className="w-4 h-4 ml-1 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </summary>
                              <div
                                className="text-sm text-muted-foreground mt-2 rich-text-content"
                                dangerouslySetInnerHTML={createRichTextMarkup(question.explanation)}
                              />
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-6">
          <Button onClick={() => router.push('/exams')} className="flex-1">
            Browse More Exams
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={examUrlLoading}
            onClick={async () => {
              if (!result) return;
              setExamUrlLoading(true);
              try {
                const destination = examDetailUrl || (await buildExamDetailUrl(result.exam_id, result.exam)) || `/exams/${result.exam_id}`;
                setExamDetailUrl(destination);
                router.push(destination);
              } finally {
                setExamUrlLoading(false);
              }
            }}
          >
            {examUrlLoading ? 'Opening…' : 'View Exam Details'}
          </Button>
        </div>
      </div>
    </div>
  );
}
