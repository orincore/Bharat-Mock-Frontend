"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Award, Clock, CheckCircle2, XCircle, AlertCircle, 
  TrendingUp, Target, BarChart3, ArrowLeft, Download 
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/common/LoadingStates';

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
    title: string;
    pass_percentage: number;
    total_questions: number;
  };
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
          console.log('[ResultPage] Sample option payload:', reviewJson.data?.[0]?.options?.[0]);
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
  }, [attemptId, router]);

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
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container-main max-w-5xl">
        <div className="mb-6">
          <Link href="/exams">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Exams
            </Button>
          </Link>
        </div>

        <div className={`bg-gradient-to-br ${
          isPassed 
            ? 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20' 
            : 'from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20'
        } border ${isPassed ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'} rounded-2xl p-8 mb-6`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full ${
                isPassed ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
              } flex items-center justify-center`}>
                {isPassed ? (
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold mb-1">
                  {isPassed ? 'Congratulations!' : 'Keep Practicing!'}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {isPassed ? 'You have passed the exam' : 'You can try again to improve your score'}
                </p>
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Attempt Language:</span>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                    {attemptLanguageLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Score</span>
              </div>
              <p className="text-2xl font-bold">{result.score}/{result.total_marks}</p>
              <p className="text-sm text-muted-foreground">{result.percentage.toFixed(2)}%</p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Accuracy</span>
              </div>
              <p className="text-2xl font-bold">{accuracy.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">
                {result.correct_answers}/{result.correct_answers + result.wrong_answers} correct
              </p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Time Taken</span>
              </div>
              <p className="text-2xl font-bold">{formatTime(result.time_taken)}</p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Status</span>
              </div>
              <p className={`text-2xl font-bold ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
                {isPassed ? 'PASS' : 'FAIL'}
              </p>
              <p className="text-sm text-muted-foreground">
                Required: {examPassRequirement}%
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold">Question Analysis</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Correct</p>
                    <p className="text-sm text-muted-foreground">Well done!</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-600">{result.correct_answers}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">Incorrect</p>
                    <p className="text-sm text-muted-foreground">Review these</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-600">{result.wrong_answers}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-900/20 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">Unattempted</p>
                    <p className="text-sm text-muted-foreground">Skipped questions</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-600">{result.unattempted}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Questions</span>
                <span className="font-medium">{totalQuestions}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold mb-6">Performance Breakdown</h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Correct Answers</span>
                  <span className="font-medium">
                    {totalQuestions > 0 ? ((result.correct_answers / totalQuestions) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600 rounded-full transition-all"
                    style={{ width: `${totalQuestions > 0 ? (result.correct_answers / totalQuestions) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Incorrect Answers</span>
                  <span className="font-medium">
                    {totalQuestions > 0 ? ((result.wrong_answers / totalQuestions) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-600 rounded-full transition-all"
                    style={{ width: `${totalQuestions > 0 ? (result.wrong_answers / totalQuestions) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Unattempted</span>
                  <span className="font-medium">
                    {totalQuestions > 0 ? ((result.unattempted / totalQuestions) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gray-600 rounded-full transition-all"
                    style={{ width: `${totalQuestions > 0 ? (result.unattempted / totalQuestions) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Overall Performance</p>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    isPassed ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-red-600 to-orange-600'
                  }`}
                  style={{ width: `${result.percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {result.percentage.toFixed(2)}% of total marks
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold mb-4">Exam Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exam Title</span>
              <span className="font-medium">{examTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted At</span>
              <span className="font-medium">
                {new Date(result.created_at).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Attempt ID</span>
              <span className="font-mono text-xs">{result.attempt_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Result ID</span>
              <span className="font-mono text-xs">{result.id}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mt-6">
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
                              alt="Question"
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
                            <details className="mt-3">
                              <summary className="text-sm font-semibold cursor-pointer">View Explanation</summary>
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
          <Button variant="outline" onClick={() => router.push(`/exams/${result.exam_id}`)} className="flex-1">
            View Exam Details
          </Button>
        </div>
      </div>
    </div>
  );
}
