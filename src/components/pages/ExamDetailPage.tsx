"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Clock, Calendar, BookOpen, Award, TrendingUp, 
  CheckCircle, AlertCircle, Play, ArrowLeft, FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/common/LoadingStates';
import { examService } from '@/lib/api/examService';
import { useAuth } from '@/context/AuthContext';
import { Exam } from '@/types';

interface ExamDetailPageProps {
  urlPath: string;
}

export function ExamDetailPage({ urlPath }: ExamDetailPageProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi'>('en');
  const [languageSelected, setLanguageSelected] = useState(false);

  useEffect(() => {
    fetchExamDetails();
  }, [urlPath]);

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
        setSelectedLanguage('en');
        setLanguageSelected(false);
      } else {
        setSelectedLanguage('en');
        setLanguageSelected(true);
      }
    } catch (err: any) {
      setExam(null);
      setError(err?.message || 'Failed to load exam details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageSelect = (lang: 'en' | 'hi') => {
    setSelectedLanguage(lang);
    setLanguageSelected(true);
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

      const attempt = await examService.startExam(targetExamId, selectedLanguage);
      const langParam = selectedLanguage || 'en';
      router.push(`/exams/${targetExamId}/attempt/${attempt.attemptId}?lang=${langParam}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start exam');
    }
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
            <Link href="/exams">
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

  const isUpcoming = exam?.status === 'upcoming';
  const isOngoing = exam?.status === 'ongoing';
  const isCompleted = exam?.status === 'completed';
  const isAnytime = exam?.status === 'anytime' || exam?.allow_anytime;
  const statusLabel = (isAnytime || isUpcoming)
    ? 'Anytime'
    : (exam?.status ? exam.status.charAt(0).toUpperCase() + exam.status.slice(1) : 'Upcoming');
  const canStartExam = isOngoing || isAnytime;

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-[#0a1833] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_55%)]" />
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />
        <div className="relative container-main py-10">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.25em] text-white/70">
            <Link href="/exams" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition">
              <ArrowLeft className="h-4 w-4" /> Back to Exams
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
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  (isAnytime || isUpcoming) ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40' :
                  isOngoing ? 'bg-blue-500/15 text-blue-200 border border-blue-300/40' :
                  'bg-slate-600/40 text-slate-200 border border-slate-400/30'
                }`}>
                  {statusLabel}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold border border-white/20 flex items-center gap-2">
                  <span role="img" aria-label="language">🗣️</span>
                  {exam.supports_hindi ? 'English + हिंदी' : 'English Only'}
                </span>
              </div>

              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-white/70 mb-2">Official mock examination</p>
                <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight">
                  {exam.title}
                </h1>
              </div>

              <p className="text-base text-white/80 max-w-3xl">
                {exam.description}
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Duration', value: `${exam.duration} Minutes`, icon: Clock },
                  { label: 'Total Questions', value: `${exam.total_questions}`, icon: FileText },
                  { label: 'Total Marks', value: `${exam.total_marks}`, icon: Award },
                  { label: 'Difficulty', value: exam.difficulty, icon: TrendingUp }
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                    <div className="flex items-center gap-3">
                      <stat.icon className="h-5 w-5 text-amber-300" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-white/70">{stat.label}</p>
                        <p className="text-lg font-semibold">{stat.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/70 backdrop-blur rounded-2xl border border-white/10 p-6 space-y-6">
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
                  {!exam.is_free && (
                    <div className="flex items-start justify-between">
                      <span>Registration Fee</span>
                      <span className="font-semibold">₹{exam.price}</span>
                    </div>
                  )}
                </div>
              </div>

              {exam.supports_hindi && (
                <div className="border border-white/10 rounded-xl p-4 bg-white/[0.04]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">Select Attempt Language</p>
                    <span className="text-[10px] tracking-widest uppercase bg-white/10 px-2 py-0.5 rounded-full">Required</span>
                  </div>
                  <p className="text-xs text-white/70 mb-3">Language cannot be changed once the attempt begins.</p>
                  <div className="grid gap-3">
                    {[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिंदी' }].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleLanguageSelect(option.value as 'en' | 'hi')}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          selectedLanguage === option.value
                            ? 'border-white bg-white/10 text-white'
                            : 'border-white/20 text-white/70 hover:border-white/40'
                        }`}
                      >
                        <span>{option.label}</span>
                        <span className={`w-3 h-3 rounded-full border ${selectedLanguage === option.value ? 'bg-white border-white' : 'border-white/40'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                {canStartExam ? (
                  <Button 
                    onClick={handleStartExam}
                    className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white shadow-[0_15px_35px_-20px_rgba(16,185,129,0.9)] transition-all duration-200 disabled:from-slate-500 disabled:to-slate-600"
                    size="lg"
                    disabled={exam.supports_hindi && !languageSelected}
                  >
                    <span className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_white,_transparent_45%)]" />
                    <span className="relative flex items-center justify-center gap-2 font-semibold tracking-wide uppercase text-sm">
                      <Play className="h-5 w-5" />
                      {exam.supports_hindi && !languageSelected ? 'Select language to start' : 'Begin Attempt'}
                    </span>
                  </Button>
                ) : isUpcoming ? (
                  <Button disabled className="w-full bg-white/10 text-white" size="lg">
                    <Calendar className="h-5 w-5 mr-2" />
                    Registration Opens Soon
                  </Button>
                ) : (
                  <Button disabled className="w-full bg-white/10 text-white" size="lg">
                    Examination Closed
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-main py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-display text-2xl font-bold text-foreground mb-6">
                Exam Pattern
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

              {exam.negative_marking && (
                <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive">Negative Marking</p>
                      <p className="text-sm text-destructive/80">
                        {exam.negative_mark_value} marks will be deducted for each wrong answer
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                  <h2 className="font-display text-2xl font-bold text-slate-900">General Instructions</h2>
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

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-display text-lg font-bold text-slate-900 mb-4">Quick Stats</h3>
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
                  <span className={`font-semibold ${
                    (isAnytime || isUpcoming) ? 'text-emerald-600' : isOngoing ? 'text-emerald-600' : 'text-slate-500'
                  }`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <img src="/favicon.jpg" alt="Bharat Mock" className="h-10 w-10 rounded" />
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
