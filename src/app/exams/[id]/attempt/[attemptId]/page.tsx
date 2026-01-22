"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  AlertCircle, Clock, ChevronLeft, ChevronRight, Flag, 
  CheckCircle2, Circle, AlertTriangle, FileText, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/common/LoadingStates';
import { examService } from '@/lib/api/examService';
import { Exam, Question, Section } from '@/types';

type QuestionStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked' | 'answered-marked';

interface QuestionWithStatus extends Question {
  userAnswer?: {
    answer: string | string[] | null;
    marked_for_review: boolean;
    time_taken: number;
  } | null;
  status: QuestionStatus;
}

interface SectionWithQuestions {
  id: string;
  name: string;
  totalQuestions: number;
  marksPerQuestion: number;
  duration?: number;
  sectionOrder: number;
  questions: QuestionWithStatus[];
}

export default function ExamAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.id as string;
  const attemptId = params?.attemptId as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [sections, setSections] = useState<SectionWithQuestions[]>([]);
  const [questions, setQuestions] = useState<QuestionWithStatus[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null);
  const [markedForReview, setMarkedForReview] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasSelectedAnswer = (() => {
    if (selectedAnswer === null || selectedAnswer === undefined) return false;
    if (Array.isArray(selectedAnswer)) return selectedAnswer.length > 0;
    if (typeof selectedAnswer === 'string') return selectedAnswer.trim().length > 0;
    return true;
  })();

  useEffect(() => {
    const fetchData = async () => {
      if (!examId || !attemptId) {
        setError('Invalid exam attempt reference');
        setIsLoading(false);
        return;
      }

      try {
        const [examData, questionsResponse] = await Promise.all([
          examService.getExamById(examId),
          examService.getExamQuestions(examId, attemptId)
        ]);
        
        setExam(examData);
        setTimeRemaining(examData.duration * 60);
        
        const allQuestions: QuestionWithStatus[] = questionsResponse.questions.map((q: any) => ({
          ...q,
          status: q.userAnswer?.answer 
            ? (q.userAnswer.marked_for_review ? 'answered-marked' : 'answered')
            : (q.userAnswer?.marked_for_review ? 'marked' : 'not-visited')
        }));

        if (process.env.NODE_ENV !== 'production') {
          console.log('[ExamAttempt] Sample option payload:', allQuestions[0]?.options?.[0]);
        }
        
        const sectionsData: SectionWithQuestions[] = questionsResponse.sections.map((s: any) => ({
          ...s,
          questions: allQuestions.filter(q => q.section_id === s.id)
        }));
        
        setSections(sectionsData);
        setQuestions(allQuestions);
      } catch (err: any) {
        setError(err.message || 'Failed to load exam');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [examId, attemptId]);

  useEffect(() => {
    if (showInstructions || isLoading || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showInstructions, isLoading, timeRemaining]);

  useEffect(() => {
    const globalIndex = getGlobalQuestionIndex();
    if (questions.length > globalIndex && !showInstructions) {
      const currentQuestion = questions[globalIndex];
      setSelectedAnswer(currentQuestion?.userAnswer?.answer || null);
      setMarkedForReview(currentQuestion?.userAnswer?.marked_for_review || false);
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestionIndex, currentSectionIndex, questions, showInstructions]);

  const refreshSections = useCallback((questionList: QuestionWithStatus[]) => {
    setSections(prevSections => prevSections.map(section => ({
      ...section,
      questions: questionList.filter(q => q.section_id === section.id)
    })));
  }, []);

  const saveAnswer = useCallback(async (answer: string | string[] | null, marked: boolean) => {
    const globalIndex = getGlobalQuestionIndex();
    const targetQuestion = questions[globalIndex];
    if (!targetQuestion) return;
    
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);
    const questionId = targetQuestion.id;

    setIsSaving(true);
    try {
      await examService.saveAnswer(attemptId, questionId, {
        answer,
        markedForReview: marked,
        timeTaken
      });

      setQuestions(prev => {
        const updated = prev.map((q, idx) => {
          if (idx === globalIndex) {
            let newStatus: QuestionStatus = 'not-answered';
            if (answer) {
              newStatus = marked ? 'answered-marked' : 'answered';
            } else if (marked) {
              newStatus = 'marked';
            }
            
            return {
              ...q,
              userAnswer: { answer, marked_for_review: marked, time_taken: timeTaken },
              status: newStatus
            };
          }
          return q;
        });
        refreshSections(updated);
        return updated;
      });
    } catch (err: any) {
      console.error('Failed to save answer:', err);
    } finally {
      setIsSaving(false);
    }
  }, [attemptId, currentSectionIndex, currentQuestionIndex, questions, questionStartTime, refreshSections]);

  const handleAnswerChange = (optionId: string) => {
    const currentQuestion = getCurrentSectionQuestions()[currentQuestionIndex];
    
    if (currentQuestion.type === 'multiple') {
      const currentAnswers = Array.isArray(selectedAnswer) ? selectedAnswer : [];
      const newAnswers = currentAnswers.includes(optionId)
        ? currentAnswers.filter(id => id !== optionId)
        : [...currentAnswers, optionId];
      setSelectedAnswer(newAnswers.length > 0 ? newAnswers : null);
    } else {
      setSelectedAnswer(optionId);
    }
  };

  const handleSaveAndNext = async () => {
    await saveAnswer(selectedAnswer, markedForReview);
    const sectionQuestions = sections[currentSectionIndex]?.questions || [];

    if (currentQuestionIndex < sectionQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
    }
  };

  const handleSaveAndSubmitPrompt = async () => {
    await saveAnswer(selectedAnswer, markedForReview);
    setShowSubmitConfirm(true);
  };

  const handleMarkForReview = async () => {
    const newMarked = !markedForReview;
    setMarkedForReview(newMarked);
    await saveAnswer(selectedAnswer, newMarked);
  };

  const handleClearResponse = () => {
    setSelectedAnswer(null);
  };

  const handleAutoSubmit = async () => {
    await saveAnswer(selectedAnswer, markedForReview);
    await handleSubmitExam();
  };

  const handleSubmitExam = async () => {
    setIsSubmitting(true);
    try {
      await examService.submitExam(attemptId);
      router.push(`/results/${attemptId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit exam');
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: QuestionStatus) => {
    switch (status) {
      case 'answered':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'marked':
      case 'answered-marked':
        return <Flag className="h-4 w-4 text-purple-600" />;
      case 'not-answered':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getQuestionCounts = (sectionQuestions?: QuestionWithStatus[]) => {
    const questionsToCount = sectionQuestions || questions;
    return {
      answered: questionsToCount.filter(q => q.status === 'answered' || q.status === 'answered-marked').length,
      notAnswered: questionsToCount.filter(q => q.status === 'not-answered').length,
      marked: questionsToCount.filter(q => q.status === 'marked' || q.status === 'answered-marked').length,
      notVisited: questionsToCount.filter(q => q.status === 'not-visited').length
    };
  };

  const getCurrentSection = () => sections[currentSectionIndex];
  const getCurrentSectionQuestions = () => getCurrentSection()?.questions || [];
  const getGlobalQuestionIndex = () => {
    let index = 0;
    for (let i = 0; i < currentSectionIndex; i++) {
      index += sections[i].questions.length;
    }
    return index + currentQuestionIndex;
  };

  const resolveOptionImage = (option: { image_url?: string; imageUrl?: string; image?: string }) =>
    option.image_url || option.imageUrl || option.image || '';

  useEffect(() => {
    if (showInstructions || questions.length === 0) return;
    const globalIndex = getGlobalQuestionIndex();
    setQuestions(prev => {
      const current = prev[globalIndex];
      if (!current || current.status !== 'not-visited') return prev;
      const updated = prev.map((q, idx) =>
        idx === globalIndex
          ? { ...q, status: 'not-answered' as QuestionStatus }
          : q
      );
      refreshSections(updated);
      return updated;
    });
  }, [currentQuestionIndex, currentSectionIndex, showInstructions, refreshSections, sections.length, questions.length]);

  if (isLoading) {
    return <LoadingPage message="Preparing your exam..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center py-12">
        <div className="max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Unable to load exam</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => router.push(`/exams/${examId}`)}>Back to exam</Button>
        </div>
      </div>
    );
  }

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container-main max-w-4xl">
          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="font-display text-3xl font-bold">Exam Instructions</h1>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="font-semibold text-lg mb-2">General Instructions</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Total Questions: <strong className="text-foreground">{exam?.total_questions}</strong></li>
                  <li>Total Marks: <strong className="text-foreground">{exam?.total_marks}</strong></li>
                  <li>Duration: <strong className="text-foreground">{exam?.duration} minutes</strong></li>
                  <li>Negative Marking: <strong className="text-foreground">{exam?.negative_marking ? `Yes (-${exam.negative_mark_value} marks)` : 'No'}</strong></li>
                </ul>
              </div>

              <div>
                <h2 className="font-semibold text-lg mb-2">Navigation</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Click on question numbers to navigate between questions</li>
                  <li>Use "Save & Next" to save your answer and move to the next question</li>
                  <li>Use "Mark for Review" to flag questions you want to revisit</li>
                  <li>Use "Clear Response" to remove your selected answer</li>
                </ul>
              </div>

              <div>
                <h2 className="font-semibold text-lg mb-2">Question Status Legend</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-green-100 border-2 border-green-600 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm">Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-orange-100 border-2 border-orange-600 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="text-sm">Not Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-purple-100 border-2 border-purple-600 flex items-center justify-center">
                      <Flag className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-sm">Marked for Review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-muted border-2 border-border flex items-center justify-center">
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm">Not Visited</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Important:</strong> The exam will auto-submit when the timer runs out. Make sure to save your answers regularly.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <Button variant="outline" onClick={() => router.push(`/exams/${examId}`)}>Cancel</Button>
              <Button onClick={() => setShowInstructions(false)} size="lg">Start Exam</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentSection = getCurrentSection();
  const currentSectionQuestions = getCurrentSectionQuestions();
  const currentQuestion = currentSectionQuestions[currentQuestionIndex];
  const globalQuestionIndex = getGlobalQuestionIndex();
  const counts = getQuestionCounts();
  const sectionCounts = getQuestionCounts(currentSectionQuestions);
  const isLastQuestion =
    currentSectionIndex === sections.length - 1 &&
    currentQuestionIndex === currentSectionQuestions.length - 1;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container-main py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold">{exam?.title}</h1>
              <p className="text-sm text-muted-foreground">
                {currentSection?.name} - Question {currentQuestionIndex + 1} of {currentSectionQuestions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${
                timeRemaining < 300 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
              }`}>
                <Clock className="h-5 w-5" />
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-main py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {sections.map((section, idx) => {
                  const sectionStats = getQuestionCounts(section.questions);
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        saveAnswer(selectedAnswer, markedForReview);
                        setCurrentSectionIndex(idx);
                        setCurrentQuestionIndex(0);
                      }}
                      className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all ${
                        idx === currentSectionIndex
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-semibold text-sm">{section.name}</p>
                        <p className="text-xs opacity-80">
                          {sectionStats.answered}/{section.totalQuestions} answered
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="mb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Question {currentQuestionIndex + 1}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {currentQuestion?.marks} {currentQuestion?.marks === 1 ? 'Mark' : 'Marks'}
                      </span>
                      {exam?.negative_marking && currentQuestion?.negative_marks > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                          -{currentQuestion.negative_marks} Negative
                        </span>
                      )}
                    </div>
                    <p className="text-lg leading-relaxed">{currentQuestion?.text}</p>
                  </div>
                </div>
                {currentQuestion?.image_url && (
                  <img 
                    src={currentQuestion.image_url} 
                    alt="Question" 
                    className="max-w-full h-auto rounded-lg border border-border mt-4"
                  />
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground mb-3">Options:</p>
                {currentQuestion?.options?.map((option, idx) => {
                  const isSelected = currentQuestion.type === 'multiple'
                    ? Array.isArray(selectedAnswer) && selectedAnswer.includes(option.id)
                    : selectedAnswer === option.id;

                  return (
                    <label
                      key={option.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type={currentQuestion.type === 'multiple' ? 'checkbox' : 'radio'}
                        name={`question-${currentQuestion.id}`}
                        value={option.id}
                        checked={isSelected}
                        onChange={() => handleAnswerChange(option.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm text-muted-foreground">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          <span>{option.option_text}</span>
                        </div>
                        {resolveOptionImage(option) && (
                          <img
                            src={resolveOptionImage(option)}
                            alt={`Option ${String.fromCharCode(65 + idx)}`}
                            className="max-h-40 rounded-lg border border-border object-contain"
                          />
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentQuestionIndex > 0) {
                      setCurrentQuestionIndex(prev => prev - 1);
                    } else if (currentSectionIndex > 0) {
                      setCurrentSectionIndex(prev => prev - 1);
                      setCurrentQuestionIndex(sections[currentSectionIndex - 1].questions.length - 1);
                    }
                  }}
                  disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentQuestionIndex < currentSectionQuestions.length - 1) {
                      setCurrentQuestionIndex(prev => prev + 1);
                    } else if (currentSectionIndex < sections.length - 1) {
                      setCurrentSectionIndex(prev => prev + 1);
                      setCurrentQuestionIndex(0);
                    }
                  }}
                  disabled={currentSectionIndex === sections.length - 1 && currentQuestionIndex === currentSectionQuestions.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClearResponse} disabled={!selectedAnswer}>
                  Clear Response
                </Button>
                <Button
                  variant={markedForReview ? 'default' : 'outline'}
                  onClick={handleMarkForReview}
                  disabled={isSaving}
                >
                  <Flag className="h-4 w-4 mr-2" />
                  {markedForReview ? 'Marked' : 'Mark for Review'}
                </Button>
                <Button
                  onClick={isLastQuestion ? handleSaveAndSubmitPrompt : handleSaveAndNext}
                  disabled={isSaving || !hasSelectedAnswer}
                  className={!hasSelectedAnswer && !isSaving ? 'opacity-60 cursor-not-allowed' : undefined}
                >
                  {isSaving ? 'Saving...' : isLastQuestion ? 'End Exam' : 'Save & Next'}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 sticky top-24">
              <h3 className="font-semibold mb-4">Question Palette</h3>
              
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">{currentSection?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {sectionCounts.answered} answered • {sectionCounts.notAnswered} not answered • {sectionCounts.marked} marked
                </p>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-6">
                {currentSectionQuestions.map((q, idx) => {
                  const statusColors = {
                    'answered': 'bg-green-100 border-green-600 text-green-900',
                    'answered-marked': 'bg-purple-100 border-purple-600 text-purple-900',
                    'marked': 'bg-purple-100 border-purple-600 text-purple-900',
                    'not-answered': 'bg-orange-100 border-orange-600 text-orange-900',
                    'not-visited': 'bg-muted border-border text-muted-foreground'
                  };

                  const globalIdx = sections.slice(0, currentSectionIndex).reduce((sum, s) => sum + s.questions.length, 0) + idx;
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        saveAnswer(selectedAnswer, markedForReview);
                        setCurrentQuestionIndex(idx);
                      }}
                      className={`aspect-square rounded-lg border-2 font-medium text-sm transition-all ${
                        idx === currentQuestionIndex
                          ? 'ring-2 ring-primary ring-offset-2'
                          : ''
                      } ${statusColors[q.status]}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 text-sm mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-600" />
                    <span>Answered</span>
                  </div>
                  <span className="font-medium">{counts.answered}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-orange-100 border-2 border-orange-600" />
                    <span>Not Answered</span>
                  </div>
                  <span className="font-medium">{counts.notAnswered}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-purple-100 border-2 border-purple-600" />
                    <span>Marked</span>
                  </div>
                  <span className="font-medium">{counts.marked}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-muted border-2 border-border" />
                    <span>Not Visited</span>
                  </div>
                  <span className="font-medium">{counts.notVisited}</span>
                </div>
              </div>

              <Button 
                className="w-full" 
                variant="destructive"
                onClick={() => setShowSubmitConfirm(true)}
              >
                Submit Exam
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-amber-600" />
              <h3 className="font-display text-xl font-bold">Confirm Submission</h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <p className="text-muted-foreground">Are you sure you want to submit the exam? You won't be able to change your answers after submission.</p>
              
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Answered:</span>
                  <span className="font-medium">{counts.answered}</span>
                </div>
                <div className="flex justify-between">
                  <span>Not Answered:</span>
                  <span className="font-medium text-orange-600">{counts.notAnswered}</span>
                </div>
                <div className="flex justify-between">
                  <span>Marked for Review:</span>
                  <span className="font-medium text-purple-600">{counts.marked}</span>
                </div>
                <div className="flex justify-between">
                  <span>Not Visited:</span>
                  <span className="font-medium text-muted-foreground">{counts.notVisited}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={handleSubmitExam}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Exam'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
