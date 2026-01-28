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
    } catch (err: any) {
      setExam(null);
      setError(err?.message || 'Failed to load exam details');
    } finally {
      setIsLoading(false);
    }
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

      const attempt = await examService.startExam(targetExamId);
      router.push(`/exams/${targetExamId}/attempt/${attempt.attemptId}`);
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
  const canStartExam = isOngoing || isAnytime;

  return (
    <div className="min-h-screen bg-muted/30">
      <section className="gradient-hero py-12">
        <div className="container-main">
          <Link href="/exams" className="inline-flex items-center text-background/80 hover:text-background mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exams
          </Link>
          
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isAnytime ? 'bg-primary/20 text-primary' :
                  isUpcoming ? 'bg-info/20 text-info' :
                  isOngoing ? 'bg-success/20 text-success' :
                  'bg-muted/20 text-muted-foreground'
                }`}>
                  {isAnytime ? 'Anytime' : exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                </span>
                <span className="px-3 py-1 rounded-full bg-background/20 text-background text-sm">
                  {exam.category}
                </span>
                {exam.supports_hindi && (
                  <span className="px-3 py-1 rounded-full bg-orange-500/20 text-background text-sm flex items-center gap-1">
                    <span>🌐</span>
                    <span>English + हिंदी</span>
                  </span>
                )}
              </div>

              <h1 className="font-display text-3xl md:text-4xl font-bold text-background mb-4">
                {exam.title}
              </h1>
              
              <p className="text-lg text-background/80 mb-6">
                {exam.description}
              </p>

              <div className="flex flex-wrap gap-4 text-background/90">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>{exam.duration} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span>{exam.total_questions} questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  <span>{exam.total_marks} marks</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <span className="capitalize">{exam.difficulty}</span>
                </div>
              </div>
            </div>

            <div className="lg:w-80">
              <div className="bg-background/10 backdrop-blur-sm rounded-xl p-6 border border-background/20">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-background">
                    <span className="text-sm">Start Date</span>
                    <span className="font-semibold">
                      {isAnytime ? 'Available anytime' : (exam.start_date ? new Date(exam.start_date).toLocaleDateString() : 'TBA')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-background">
                    <span className="text-sm">End Date</span>
                    <span className="font-semibold">
                      {isAnytime ? 'No deadline' : (exam.end_date ? new Date(exam.end_date).toLocaleDateString() : 'TBA')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-background">
                    <span className="text-sm">Pass Percentage</span>
                    <span className="font-semibold">{exam.pass_percentage}%</span>
                  </div>
                  {!exam.is_free && (
                    <div className="flex items-center justify-between text-background">
                      <span className="text-sm">Price</span>
                      <span className="font-semibold">₹{exam.price}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-background/20">
                  {canStartExam ? (
                    <Button 
                      onClick={handleStartExam}
                      className="w-full"
                      size="lg"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Start Exam
                    </Button>
                  ) : isUpcoming ? (
                    <Button disabled className="w-full" size="lg">
                      <Calendar className="h-5 w-5 mr-2" />
                      Coming Soon
                    </Button>
                  ) : (
                    <Button disabled className="w-full" size="lg">
                      Exam Completed
                    </Button>
                  )}
                </div>
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

            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-display text-2xl font-bold text-foreground mb-6">
                Instructions
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p>Read all questions carefully before answering.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p>You can navigate between questions using the navigation panel.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p>Mark questions for review if you want to revisit them later.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">4</span>
                  </div>
                  <p>Submit your exam before the timer runs out to save your answers.</p>
                </div>
                {exam.negative_marking && (
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-destructive">!</span>
                    </div>
                    <p className="text-destructive">
                      Be careful with your answers as there is negative marking for wrong answers.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display text-lg font-bold text-foreground mb-4">
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <span className="font-semibold text-foreground">{exam.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="font-semibold text-foreground">
                    {exam.is_free ? 'Free' : 'Paid'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={`font-semibold capitalize ${
                    isOngoing ? 'text-success' : 
                    isUpcoming ? 'text-info' : 
                    'text-muted-foreground'
                  }`}>
                    {exam.status}
                  </span>
                </div>
              </div>
            </div>

            {isOngoing && (
              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-primary-foreground">
                <h3 className="font-display text-xl font-bold mb-2">
                  Ready to Start?
                </h3>
                <p className="text-sm opacity-90 mb-4">
                  Test your knowledge and compete with thousands of students.
                </p>
                <Button 
                  onClick={handleStartExam}
                  variant="secondary"
                  className="w-full"
                  size="lg"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Begin Exam
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
