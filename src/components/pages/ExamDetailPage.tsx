"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock, Calendar, BookOpen, Award, TrendingUp,
  CheckCircle, AlertCircle, Play, ArrowLeft, FileText, Lock,
  Flag, CheckCircle2, ChevronLeft, ChevronRight, HelpCircle
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

          <div className="mt-8 max-w-4xl">
            <div className="space-y-6">
              <div className="inline-flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold border border-white/20">
                  {exam?.category}
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
                  {exam?.supports_hindi ? 'English + हिंदी' : 'English Only'}
                </span>
              </div>

              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-white/70 mb-2 font-medium">
                  {isQuiz ? 'Concept Booster Quiz' : 'Official mock examination'}
                </p>
                <h1 className="font-display text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">
                  {exam?.title}
                </h1>
              </div>

              <p className="text-lg text-white/80 max-w-3xl leading-relaxed">
                {exam ? formatExamSummary(exam) : 'No summary available.'}
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                {[
                  { label: isQuiz ? 'Quiz Length' : 'Duration', value: `${exam?.duration} Minutes`, icon: Clock, color: 'text-amber-300' },
                  { label: 'Questions', value: `${exam?.total_questions}`, icon: FileText, color: 'text-blue-300' },
                  { label: isQuiz ? 'Avg Score Weight' : 'Total Marks', value: `${exam?.total_marks}`, icon: Award, color: 'text-emerald-300' }
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-white backdrop-blur-sm transition-all hover:bg-white/10"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20">
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div className="leading-tight">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold">{stat.label}</p>
                      <p className="text-base font-bold text-white mt-0.5">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-main py-12 pb-32">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="space-y-8">
            {exam?.syllabus && exam.syllabus.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6 font-medium">
                <h2 className="font-display text-2xl font-bold text-foreground mb-6">
                  Syllabus Highlights
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {exam.syllabus.map((topic, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-slate-700 leading-tight">{topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 leading-none">General Instructions</h3>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8 text-[15px] leading-relaxed text-slate-700">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <span className="font-bold text-slate-900 shrink-0">1.</span>
                    <p>The exam timer runs on the server — not your device. The countdown displayed in the top-right corner of your screen reflects the exact remaining time. When the timer hits zero, your exam will be submitted automatically. You do not need to click Submit manually.</p>
                  </div>

                  <div className="flex gap-4">
                    <span className="font-bold text-slate-900 shrink-0">2.</span>
                    <div className="space-y-4">
                      <p>The Question Palette on the right side of the screen tracks the real-time status of every question. Each question is marked with one of the following color-coded symbols:</p>
                      
                      <div className="grid sm:grid-cols-2 gap-3 ml-2">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded bg-white border border-slate-300 flex items-center justify-center shrink-0 shadow-sm text-xs font-bold text-slate-400">01</div>
                          <p className="text-sm font-medium">You have not visited the question yet.</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded bg-orange-100 border border-orange-500 flex items-center justify-center shrink-0 shadow-sm text-xs font-bold text-orange-700">01</div>
                          <p className="text-sm font-medium">You have not answered the question.</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded bg-green-100 border border-green-600 flex items-center justify-center shrink-0 shadow-sm text-xs font-bold text-green-700">01</div>
                          <p className="text-sm font-medium">You have answered the question.</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded bg-purple-100 border border-purple-500 flex items-center justify-center shrink-0 shadow-sm">
                            <Flag className="h-4 w-4 text-purple-600" />
                          </div>
                          <p className="text-sm font-medium">Marked for Review (Unanswered) — Flagged for later but no answer saved yet.</p>
                        </div>
                        <div className="flex items-center gap-4 sm:col-span-2">
                          <div className="w-8 h-8 rounded bg-purple-100 border border-purple-500 flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
                            <Flag className="h-4 w-4 text-purple-600 z-10" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 flex items-center justify-center">
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            </div>
                          </div>
                          <p className="text-sm font-medium">You have answered the question, but marked it for review.</p>
                        </div>
                      </div>
                      
                      <p className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-800 text-sm">
                        Marking for review doesn't change your answer—it just flags it for a second look. Answered questions marked for review count toward your score unless you edit them.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <span className="font-bold text-slate-900 shrink-0">3.</span>
                    <div className="space-y-4">
                      <p className="font-bold text-slate-900 uppercase text-sm tracking-wide">Navigating to a question:</p>
                      <p>To answer a question, do the following:</p>
                      <ul className="space-y-3 pl-2 list-disc list-outside ml-4">
                        <li>Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.</li>
                        <li>Click on <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs">Save & Next</span> to save your current answer and move to the next question.</li>
                        <li>Click on <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs">Mark for Review & Next</span> to mark the question for review (with or without answering) and proceed to the next question.</li>
                      </ul>
                      <p className="text-rose-600 font-bold p-3 bg-rose-50 rounded-lg text-sm border border-rose-100">
                        Important Reminder: If you move to another question without clicking Save & Next or Mark for Review & Next, your current answer will NOT be saved.
                      </p>
                      <p>You can also click on the <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs">Question Paper</span> button to view all questions at once for quick navigation and overview.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <span className="font-bold text-slate-900 shrink-0">4.</span>
                    <div className="space-y-4">
                      <p className="font-bold text-slate-900 uppercase text-sm tracking-wide">Answering a Question:</p>
                      <p>Steps for answering Multiple Choice Questions (MCQ):</p>
                      <ul className="space-y-3 pl-2 list-decimal list-outside ml-4">
                        <li>Select one correct option from the given choices (A, B, C, D) by clicking on the corresponding option.</li>
                        <li>To remove your selected answer, click on the selected option again or use the <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs">Clear Response</span> button.</li>
                        <li>To change your answer, simply click on a different option.</li>
                        <li>After selecting your answer, click <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs">Save & Next</span> to confirm and proceed.</li>
                      </ul>
                    </div>
                  </div>

                  {exam.id && (
                    <div className="flex gap-4">
                      <span className="font-bold text-slate-900 shrink-0">5.</span>
                      <div className="space-y-4">
                        <p className="font-bold text-slate-900 uppercase text-sm tracking-wide">Procedure for answering a numerical answer type question :</p>
                        <ul className="space-y-3 pl-2 list-decimal list-outside ml-4">
                          <li>To enter a number as your answer, use the virtual numerical keypad.</li>
                          <li>A fraction (e.g. -0.3 or -. 3) can be entered as an answer with or without "0" before the decimal point. As many as four decimal points, e.g. 12.5435 or 0.003 or -932.6711 or 12.82 can be entered.</li>
                          <li>To clear your answer, click on the <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs">Clear Response</span> button</li>
                          <li>To save your answer, you MUST click on the <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs">Save & Next</span></li>
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <span className="font-bold text-slate-900 shrink-0">6.</span>
                    <p>To mark a question for review, click on the <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs">Mark for Review & Next</span> button. If an answer is selected (for MCQ/MCAQ) entered (for numerical answer type) for a question that is Marked for Review, that answer will be considered in the evaluation unless the status is modified by the candidate.</p>
                  </div>

                  <div className="flex gap-4">
                    <span className="font-bold text-slate-900 shrink-0">7.</span>
                    <p>To change your answer to a question that has already been answered, first select that question for answering and then follow the procedure for answering that type of question.</p>
                  </div>

                  <div className="flex gap-4">
                    <span className="font-bold text-slate-900 shrink-0">8.</span>
                    <p>Note that ONLY Questions for which answers are saved or marked for review after answering will be considered for evaluation.</p>
                  </div>

                  <div className="flex gap-4">
                    <span className="font-bold text-slate-900 shrink-0">9.</span>
                    <p>Sections in this question paper are displayed on the top bar of the screen. Questions in a Section can be viewed by clicking on the name of that Section. The Section you are currently viewing will be highlighted.</p>
                  </div>

                  <div className="flex gap-4">
                    <span className="font-bold text-slate-900 shrink-0">10.</span>
                    <p>After clicking the <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs">Save & Next</span> button for the last question in a Section, you will automatically be taken to the first question of the next Section in sequence.</p>
                  </div>

                  <div className="flex gap-4">
                    <span className="font-bold text-slate-900 shrink-0">11.</span>
                    <p>You can move the mouse cursor over the name of a Section to view the answering status for that Section.</p>
                  </div>

                  <div className="flex gap-4 text-red-600">
                    <span className="font-bold shrink-0">12.</span>
                    <p className="font-medium">Do not refresh the page or press the browser's Back button during the exam — this may cause loss of your current answer.</p>
                  </div>

                  <div className="flex gap-4 text-red-600">
                    <span className="font-bold shrink-0">13.</span>
                    <p className="font-bold">No sharing screens, notes, or devices— violations lead to disqualification.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Sticky Bottom CTA Bar - Visible on all devices when exam is startable */}
      {(showAttemptCta || requiresUnlock) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 md:py-4 px-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-300">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden md:flex flex-col">
              <h4 className="text-sm font-bold text-slate-900 truncate max-w-[250px]">{exam.title}</h4>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{statusLabel} • {exam.duration} Mins</p>
            </div>

            <div className="flex-1 md:flex-none flex items-center gap-3">
              {topResumeAttempt && (
                <Button
                  variant="outline"
                  onClick={() => handleResumeExam(topResumeAttempt)}
                  className="flex-1 md:flex-none h-11 md:h-12 px-6 rounded-full border-amber-200 bg-amber-50 text-amber-700 font-bold hover:bg-amber-100 transition-all active:scale-95"
                >
                  <Play className="h-4 w-4 mr-2 fill-amber-600" />
                  Resume
                </Button>
              )}

              {requiresUnlock ? (
                <Button
                  onClick={handleUnlockExam}
                  className="flex-1 md:flex-none h-11 md:h-12 px-8 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 font-bold shadow-lg hover:shadow-amber-200/50 transition-all active:scale-95 border-b-2 border-amber-700/20"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Unlock Now
                </Button>
              ) : (
                <Button
                  onClick={handleStartExam}
                  className={`flex-1 md:flex-none h-11 md:h-12 px-10 rounded-full font-bold text-white transition-all active:scale-95 shadow-xl ${
                    isLiveExam 
                      ? 'bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 shadow-red-200/50' 
                      : 'bg-gradient-to-r from-[#00aeef] to-[#0086b8] hover:from-[#0099d4] shadow-blue-200/50'
                  }`}
                >
                  {isLiveExam ? 'Enter Exam Hall' : topResumeAttempt ? 'Start Fresh' : 'Attempt Now'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
