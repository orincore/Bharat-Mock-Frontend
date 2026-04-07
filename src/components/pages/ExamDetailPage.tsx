"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock, Calendar, BookOpen, Award, TrendingUp,
  CheckCircle, AlertCircle, Play, ArrowLeft, FileText, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/common/LoadingStates';
import { examService } from '@/lib/api/examService';
import { useAuth } from '@/context/AuthContext';
import { Exam, ExamHistoryEntry } from '@/types';
import { formatExamSummary } from '@/lib/utils/examSummary';

interface ExamDetailPageProps {
  urlPath: string;
}

export function ExamDetailPage({ urlPath }: ExamDetailPageProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi' | null>(null);
  const [languageSelected, setLanguageSelected] = useState(false);
  const [resumeAttempts, setResumeAttempts] = useState<ExamHistoryEntry[]>([]);

  useEffect(() => {
    fetchExamDetails();
  }, [urlPath, isAuthenticated]);

  const fetchExamDetails = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await examService.getExamById(urlPath);
      if (!data) {
        throw new Error('Exam not found');
      }
      setExam(data);
      if (data.supports_hindi) {
        setSelectedLanguage(null);
        setLanguageSelected(false);
      } else {
        setSelectedLanguage('en');
        setLanguageSelected(true);
      }

      // If authenticated, check for existing in-progress attempt to offer Resume
      if (isAuthenticated && data.id) {
        try {
          const history = await examService.getExamHistory({ status: 'in-progress' });
          const matchingAttempts = history.entries
            .filter(entry => entry.examId === data.id && entry.resumeAllowed !== false)
            .sort((a, b) => {
              const answeredDiff = (b.answeredQuestions || 0) - (a.answeredQuestions || 0);
              if (answeredDiff !== 0) return answeredDiff;

              const updatedA = new Date(a.updatedAt || a.startedAt || 0).getTime();
              const updatedB = new Date(b.updatedAt || b.startedAt || 0).getTime();
              return updatedB - updatedA;
            });

          setResumeAttempts(matchingAttempts);
        } catch (err) {
          console.error('Failed to fetch attempt history:', err);
        }
      } else {
        setResumeAttempts([]);
      }
    } catch (err: any) {
      setExam(null);
      setError(err?.message || 'Failed to load exam details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockExam = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/subscriptions');
      return;
    }
    router.push('/subscriptions');
  };

  const formatCalendarDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const escapeICSValue = (value: string) =>
    (value || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');

  const calendarWindow = useMemo(() => {
    if (!exam?.start_date) return null;
    const start = new Date(exam.start_date);
    const durationMinutes = Number(exam.duration) || 60;
    const end = exam.end_date ? new Date(exam.end_date) : new Date(start.getTime() + durationMinutes * 60000);
    return { start, end };
  }, [exam?.start_date, exam?.end_date, exam?.duration]);

  const googleCalendarUrl = useMemo(() => {
    if (!calendarWindow || !exam) return '';
    const start = formatCalendarDate(calendarWindow.start);
    const end = formatCalendarDate(calendarWindow.end);
    const base = 'https://www.google.com/calendar/render?action=TEMPLATE';
    const params = new URLSearchParams({
      text: exam.title,
      dates: `${start}/${end}`,
      details: formatExamSummary(exam),
      location: 'Bharat Mock portal'
    });
    return `${base}&${params.toString()}`;
  }, [calendarWindow, exam]);

  const handleAddToCalendar = () => {
    if (!calendarWindow || !exam) {
      alert('Schedule window not available yet.');
      return;
    }

    if (googleCalendarUrl) {
      window.open(googleCalendarUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleLanguageSelect = (lang: 'en' | 'hi' | null) => {
    setSelectedLanguage(lang);
    setLanguageSelected(Boolean(lang));
  };

  const handleStartExam = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    try {
      const targetExamId = exam?.id;
      if (!targetExamId) {
        throw new Error('Invalid exam identifier');
      }

      const attempt = await examService.startExam(targetExamId, selectedLanguage || 'en');
      const langParam = selectedLanguage || 'en';
      router.push(`/exams/${targetExamId}/attempt/${attempt.attemptId}?lang=${langParam}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start exam');
    }
  };

  const handleResumeExam = (attempt: ExamHistoryEntry) => {
    if (!exam) return;
    const langParam = attempt.language || selectedLanguage || 'en';
    router.push(`/exams/${exam.id}/attempt/${attempt.attemptId}?lang=${langParam}`);
  };

  if (isLoading) {
    return <LoadingPage message="Loading exam details..." />;
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container-main">
          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              {error || 'Exam not found'}
            </h2>
            <p className="text-muted-foreground mb-6">
              The exam you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/mock-test-series">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Exams
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isQuiz = exam?.exam_type === 'short_quiz';
  const isUpcoming = exam?.status === 'upcoming';
  const isOngoing = exam?.status === 'ongoing';
  const isCompleted = exam?.status === 'completed';
  const isAnytime = isQuiz || exam?.status === 'anytime' || exam?.allow_anytime;
  const startDate = exam?.start_date ? new Date(exam.start_date) : null;
  const endDate = exam?.end_date ? new Date(exam.end_date) : null;
  const nowTs = Date.now();
  const windowStarted = Boolean(startDate && startDate.getTime() <= nowTs);
  const windowEnded = Boolean(endDate && endDate.getTime() < nowTs);
  const isWithinWindow = windowStarted && !windowEnded;
  const statusLabel = (() => {
    if (isQuiz) return 'Short Quiz';
    if (isAnytime) return 'Anytime';
    if (isOngoing) return 'Live Now';
    if (isCompleted) return 'Completed';
    if (isUpcoming) return 'Upcoming';
    return exam?.status ? exam.status.charAt(0).toUpperCase() + exam.status.slice(1) : 'Upcoming';
  })();
  const isLiveExam = !isQuiz && (isOngoing || (isUpcoming && isWithinWindow));
  const canStartExam = isOngoing || isAnytime || isWithinWindow;
  const userHasPremium = !!user?.is_premium;
  const requiresUnlock = !exam.is_free && !userHasPremium;
  const showAttemptCta = canStartExam && !requiresUnlock;
  const showUpcomingNotice = isUpcoming && !windowStarted;
  const showEndedNotice = windowEnded && !isLiveExam;
  const topResumeAttempt = resumeAttempts[0] || null;
  const attemptButtonGradient = isLiveExam
    ? 'bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:to-red-800 shadow-[0_15px_35px_-20px_rgba(239,68,68,0.95)]'
    : topResumeAttempt
      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-[0_15px_35px_-20px_rgba(245,158,11,0.9)]'
      : 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 shadow-[0_15px_35px_-20px_rgba(16,185,129,0.9)]';

  return (
    <div className="min-h-screen bg-slate-50">
      <section className={`relative overflow-hidden ${isQuiz ? 'bg-[#0b1a2b]' : 'bg-[#0a1833]'} text-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_55%)]" />
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />
        <div className="relative container-main py-10">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.25em] text-white/70">
            <Link href={isQuiz ? '/quizzes' : '/exams'} className="inline-flex items-center gap-2 text-white/70 hover:text-white transition">
              <ArrowLeft className="h-4 w-4" /> Back to {isQuiz ? 'Quizzes' : 'Exams'}
            </Link>
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Bharat Mock Public Examination Cell
            </span>
          </div>

          <div className="mt-6 grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
            <div className="space-y-6">
              <div className="inline-flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold border border-white/20">
                  {exam.category}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold border border-white/30">
                  {statusLabel}
                </span>
                {isLiveExam && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-50 border border-red-400/40 font-semibold text-xs uppercase tracking-wide">
                    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                      <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-red-400/70 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-300" />
                    </span>
                    Live
                  </span>
                )}
                {isQuiz && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 text-pink-100 border border-pink-400/30 font-semibold text-xs uppercase tracking-wide">
                    Quiz Mode
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold border border-white/20 flex items-center gap-2">
                  <span role="img" aria-label="language">🗣️</span>
                  {exam.supports_hindi ? 'English + हिंदी' : 'English Only'}
                </span>
              </div>

              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-white/70 mb-2">
                  {isQuiz ? 'Concept Booster Quiz' : 'Official mock examination'}
                </p>
                <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight">
                  {exam.title}
                </h1>
              </div>

              <p className="text-base text-white/80 max-w-3xl">
                {formatExamSummary(exam)}
              </p>

              <div className="flex flex-wrap gap-2.5 md:gap-3">
                {[
                  { label: isQuiz ? 'Quiz Length' : 'Duration', value: `${exam.duration} Minutes`, icon: Clock },
                  { label: 'Questions', value: `${exam.total_questions}`, icon: FileText },
                  { label: isQuiz ? 'Avg Score Weight' : 'Total Marks', value: `${exam.total_marks}`, icon: Award }
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-white shadow-[0_8px_25px_-20px_rgba(255,255,255,0.9)]"
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 border border-white/30">
                      <stat.icon className="h-3.5 w-3.5 text-amber-200" />
                    </span>
                    <div className="leading-tight">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/70">{stat.label}</p>
                      <p className="text-sm font-semibold text-white">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/70 backdrop-blur rounded-2xl border border-white/10 p-6 space-y-6">
              {isQuiz ? (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-1">Quiz Insights</p>
                  <div className="space-y-3 text-sm text-white/90">
                    <div className="flex items-start justify-between">
                      <span>Estimated time</span>
                      <span className="font-semibold">{exam.duration} mins</span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span>Attempts Allowed</span>
                      <span className="font-semibold">Unlimited</span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span>Scoring</span>
                      <span className="font-semibold">Instant feedback</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-1">Attempt Window</p>
                  <div className="space-y-4 text-sm text-white/90">
                    <div className="flex items-start justify-between">
                      <span>Start Date</span>
                      <span className="font-semibold">
                        {isAnytime ? 'Available Anytime' : (exam.start_date ? new Date(exam.start_date).toLocaleDateString() : 'TBA')}
                      </span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span>End Date</span>
                      <span className="font-semibold">
                        {isAnytime ? 'No Deadline' : (exam.end_date ? new Date(exam.end_date).toLocaleDateString() : 'TBA')}
                      </span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span>Pass Percentage</span>
                      <span className="font-semibold">{exam.pass_percentage}%</span>
                    </div>
                  </div>
                </div>
              )}

              {exam.supports_hindi && (
                <div className="border border-white/10 rounded-xl p-4 bg-white/[0.04]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">Select Attempt Language</p>
                    <span className="text-[10px] tracking-widest uppercase bg-white/10 px-2 py-0.5 rounded-full">Required</span>
                  </div>
                  <p className="text-xs text-white/70 mb-3">Language cannot be changed once the attempt begins.</p>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-white/60">Preferred Language</label>
                    <select
                      value={selectedLanguage ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!value) {
                          setSelectedLanguage(null);
                          return;
                        }
                        handleLanguageSelect(value as 'en' | 'hi');
                      }}
                      className="w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                    >
                      <option value="">
                        Select language
                      </option>
                      <option value="en">English</option>
                      <option value="hi">हिंदी (Hindi)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {requiresUnlock ? (
                  <div className="space-y-2">
                    <Button
                      onClick={handleUnlockExam}
                      className="w-full relative overflow-hidden bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-900 font-semibold shadow-[0_15px_35px_-20px_rgba(245,158,11,0.9)]"
                      size="lg"
                    >
                      <span className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_white,_transparent_45%)]" />
                      <span className="relative flex items-center justify-center gap-2 uppercase text-sm tracking-wide">
                        <Lock className="h-5 w-5" /> Unlock Exam
                      </span>
                    </Button>
                    <p className="text-xs text-white/70 text-center">
                      Unlock included with Bharat Mock Premium. Get instant access to all paid exams.
                    </p>
                  </div>
                ) : showAttemptCta ? (
                  <div className="space-y-3">
                    {resumeAttempts.length > 0 && (
                      <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 space-y-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-100/80">Paused Attempts</p>
                          <p className="mt-1 text-sm font-semibold text-white">Choose any previous paused exam to continue</p>
                        </div>

                        <div className="space-y-3">
                          {resumeAttempts.map((attempt, index) => {
                            const progress = (attempt.totalQuestions || 0) > 0
                              ? Math.round(((attempt.answeredQuestions || 0) / (attempt.totalQuestions || 1)) * 100)
                              : 0;
                            const attemptNumber = resumeAttempts.length - index;

                            return (
                              <div
                                key={attempt.attemptId}
                                className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 space-y-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-semibold text-white">
                                      Attempt #{attemptNumber}
                                    </p>
                                    <p className="mt-1 text-[11px] text-white/65">
                                      Started {new Date(attempt.startedAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <span className="rounded-full border border-sky-300/30 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-100">
                                    {attempt.language === 'hi' ? 'Hindi' : 'English'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs text-white/80">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Answered</p>
                                    <p className="mt-1 text-sm font-semibold text-white">
                                      {attempt.answeredQuestions || 0}/{attempt.totalQuestions || exam.total_questions}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Progress</p>
                                    <p className="mt-1 text-sm font-semibold text-white">{progress}%</p>
                                  </div>
                                </div>

                                <div>
                                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/70">
                                    <span>Attempt progress</span>
                                    <span>{progress}%</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300 transition-all duration-300"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>

                                <Button
                                  onClick={() => handleResumeExam(attempt)}
                                  className="w-full relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold shadow-lg transition-all duration-200"
                                  size="lg"
                                >
                                  <span className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_white,_transparent_45%)]" />
                                  <span className="relative flex items-center justify-center gap-2 font-semibold tracking-wide uppercase text-sm">
                                    <Play className="h-5 w-5 fill-current" />
                                    Resume
                                  </span>
                                </Button>
                              </div>
                            );
                          })}
                        </div>


                      </div>
                    )}

                    <Button
                      onClick={handleStartExam}
                      className={`w-full relative overflow-hidden text-white ${attemptButtonGradient} transition-all duration-200 disabled:from-slate-500 disabled:to-slate-600`}
                      size="lg"
                      disabled={exam.supports_hindi && !languageSelected}
                    >
                      <span className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_white,_transparent_45%)]" />
                      <span className="relative flex items-center justify-center gap-2 font-semibold tracking-wide uppercase text-sm">
                        {isLiveExam ? (
                          <span className="relative flex h-4 w-4 items-center justify-center">
                            <span className="absolute inline-flex h-4 w-4 rounded-full bg-white/40 animate-ping" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                          </span>
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                        {exam.supports_hindi && !languageSelected
                          ? 'Select language to start'
                          : topResumeAttempt
                            ? 'New Attempt'
                            : isLiveExam
                              ? 'Join Live Attempt'
                              : isQuiz
                                ? 'Start Quiz'
                                : 'Attempt Now'}
                      </span>
                    </Button>
                  </div>
                ) : showUpcomingNotice ? (
                  <Button disabled className="w-full bg-white/10 text-white" size="lg">
                    <Calendar className="h-5 w-5 mr-2" />
                    Registration Opens Soon
                  </Button>
                ) : showEndedNotice ? (
                  <Button disabled className="w-full bg-white/10 text-white" size="lg">
                    <Calendar className="h-5 w-5 mr-2" />
                    Attempt Window Closed
                  </Button>
                ) : (
                  <Button disabled className="w-full bg-white/10 text-white" size="lg">
                    Examination Closed
                  </Button>
                )}
                {isUpcoming && !windowStarted && !isQuiz && (
                  <>
                    <Button
                      onClick={handleAddToCalendar}
                      disabled={!calendarWindow}
                      className="w-full bg-amber-400 text-slate-900 hover:bg-amber-300 disabled:bg-slate-400 disabled:text-slate-700 border-none"
                    >
                      <Calendar className="h-5 w-5 mr-2" /> Add to Calendar
                    </Button>
                    {calendarWindow && googleCalendarUrl && (
                      <Button
                        variant="ghost"
                        asChild
                        className="w-full text-white/80 hover:text-white"
                      >
                        <a href={googleCalendarUrl} target="_blank" rel="noreferrer">
                          Sync via Google Calendar
                        </a>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-main py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8 order-2 lg:order-1">
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-display text-2xl font-bold text-foreground mb-6">
                {isQuiz ? 'Quiz Overview' : 'Exam Pattern'}
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Total Questions</p>
                    <p className="text-2xl font-bold text-primary">{exam.total_questions}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <Award className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Total Marks</p>
                    <p className="text-2xl font-bold text-success">{exam.total_marks}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Duration</p>
                    <p className="text-2xl font-bold text-warning">{exam.duration} min</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Difficulty</p>
                    <p className="text-2xl font-bold text-info capitalize">{exam.difficulty}</p>
                  </div>
                </div>
              </div>


            </div>

            {exam.syllabus && exam.syllabus.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-6">
                  Syllabus
                </h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {exam.syllabus.map((topic, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                      <span className="text-foreground">{topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Exam Hall Advisory</p>
                  {/* Header removed for SEO deduplication */}
                </div>
                <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
                  Must Read
                </span>
              </div>
              <div className="space-y-4 text-slate-700">
                {[
                  'Read every question carefully before marking your response.',
                  'Use the navigation panel to move between sections/questions.',
                  'Mark for review to revisit doubtful questions later.',
                  'Submit the paper before the timer expires to preserve responses.'
                ].map((text, index) => (
                  <div key={text} className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-emerald-700">{index + 1}</span>
                    </div>
                    <p>{text}</p>
                  </div>
                ))}
                {exam.negative_marking && (
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-red-600">!</span>
                    </div>
                    <p className="text-red-700">
                      Negative marking is applicable; refrain from random guessing.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 order-1 lg:order-2">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="font-display text-lg font-bold text-slate-900 mb-4">Quick Stats</div>
              <div className="space-y-4 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Category</span>
                  <span className="font-semibold text-slate-900">{exam.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Type</span>
                  <span className="font-semibold text-slate-900">{exam.is_free ? 'Free' : 'Paid'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span className={`font-semibold ${(isAnytime || isUpcoming) ? 'text-emerald-600' : isOngoing ? 'text-emerald-600' : 'text-slate-500'
                    }`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <img src="/favicon.jpg" alt="Bharat Mock" width={40} height={40} className="h-10 w-10 rounded" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Helpdesk</p>
                  <p className="font-semibold text-slate-900">Bharat Mock Support Cell</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                India’s leading platform for exam preparation and personalized learning support. Reach out for any assistance during your attempt.
              </p>
              <div className="space-y-2 text-sm text-slate-700">
                <p>support@bharatmock.com</p>
                <p>+91 1800-123-4567</p>
                <p>Bangalore, Karnataka, India</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
