"use client";

import { useEffect, useState, useCallback } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  AlertCircle, Clock, ChevronLeft, ChevronRight, Flag, 
  CheckCircle2, Circle, AlertTriangle, FileText, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/common/LoadingStates';
import { examService } from '@/lib/api/examService';
import { Exam, Question, Section } from '@/types';

type QuestionStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked' | 'answered-marked';

const RICH_TEXT_SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['font', 'code'],
  ADD_ATTR: ['style', 'class', 'color', 'face', 'size', 'target', 'rel', 'data-inline-break'],
};

const sanitizeRichText = (html?: string) =>
  DOMPurify.sanitize(html || '', RICH_TEXT_SANITIZE_CONFIG);

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
  name_hi?: string;
  language?: 'en' | 'hi' | null;
  totalQuestions: number;
  marksPerQuestion: number;
  duration?: number;
  sectionOrder: number;
  questions: QuestionWithStatus[];
}

export default function ExamAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = params?.id as string;
  const attemptId = params?.attemptId as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [sections, setSections] = useState<SectionWithQuestions[]>([]);
  const [questions, setQuestions] = useState<QuestionWithStatus[]>([]);
  const [allSections, setAllSections] = useState<SectionWithQuestions[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuestionWithStatus[]>([]);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi'>('en');
  const [languageSelectionMade, setLanguageSelectionMade] = useState(false);


  const orderValue = (question: Question | QuestionWithStatus) => (
    typeof question.question_number === 'number'
      ? question.question_number
      : typeof question.question_order === 'number'
        ? question.question_order
        : Number.MAX_SAFE_INTEGER
  );

  const sortQuestionsByNumber = <T extends Question | QuestionWithStatus>(items: T[]): T[] =>
    [...items].sort((a, b) => orderValue(a) - orderValue(b));

  const hasContentForLanguage = useCallback((question: QuestionWithStatus, language: 'en' | 'hi') => {
    if (language === 'hi') {
      return Boolean(
        (question.text_hi && question.text_hi.trim()) ||
        (question.explanation_hi && question.explanation_hi.trim()) ||
        (question.image_url && question.image_url.trim()) ||
        (question.options || []).some(opt => (opt.option_text_hi && opt.option_text_hi.trim()) || (opt.image_url && opt.image_url.trim()))
      );
    }
    return Boolean(
      (question.text && question.text.trim()) ||
      (question.image_url && question.image_url.trim()) ||
      (question.options || []).some(opt => (opt.option_text && opt.option_text.trim()) || (opt.image_url && opt.image_url.trim()))
    );
  }, []);

  const filterContentByLanguage = useCallback((language: 'en' | 'hi', sourceSections: SectionWithQuestions[], sourceQuestions: QuestionWithStatus[]) => {
    const sectionsForLanguage = sourceSections.filter(section => (section.language || 'en') === language);
    const allowedSectionIds = new Set(sectionsForLanguage.map(section => section.id));

    const filteredQuestions = sourceQuestions.filter(question => {
      const sectionId = question.section_id || question.sectionId;
      if (!sectionId || !allowedSectionIds.has(sectionId)) {
        return false;
      }
      return hasContentForLanguage(question, language);
    });

    const filteredSections = sectionsForLanguage
      .map(section => {
        const sectionQuestions = sortQuestionsByNumber(filteredQuestions.filter(q => q.section_id === section.id));
        return {
          ...section,
          totalQuestions: sectionQuestions.length,
          questions: sectionQuestions
        };
      })
      .filter(section => section.questions.length > 0);

    return { filteredSections, filteredQuestions };
  }, [hasContentForLanguage]);

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
        
        if (!examData) {
          throw new Error('Exam not found');
        }

        setExam(examData);
        const requestedLanguage = searchParams?.get('lang') === 'hi' ? 'hi' : 'en';
        setSelectedLanguage(requestedLanguage);
        setLanguageSelectionMade(true);
        setTimeRemaining((examData.duration || 0) * 60);
        
        const normalizedQuestions = sortQuestionsByNumber(questionsResponse.questions);
        const allQuestions: QuestionWithStatus[] = normalizedQuestions.map((q: any) => {
          const hasAnswer = hasAnswerValue(q.userAnswer?.answer);
          const isMarked = q.userAnswer?.marked_for_review || false;
          
          // Debug logging for status assignment
          if (q.question_number === 1) {
            console.log('Question 1 status debug:', {
              questionId: q.id,
              userAnswer: q.userAnswer?.answer,
              hasAnswer,
              isMarked,
              userAnswerObject: q.userAnswer
            });
          }
          
          let status: QuestionStatus;
          if (hasAnswer && isMarked) {
            status = 'answered-marked';
          } else if (hasAnswer) {
            status = 'answered';
          } else if (isMarked) {
            status = 'marked';
          } else {
            status = 'not-visited';
          }
          
          return {
            ...q,
            status
          };
        });

        const sectionsData: SectionWithQuestions[] = questionsResponse.sections.map((s: any) => ({
          ...s,
          language: s.language || s.language_code || 'en',
          questions: sortQuestionsByNumber(allQuestions.filter(q => q.section_id === s.id))
        }));

        setAllSections(sectionsData);
        setAllQuestions(allQuestions);

        const { filteredSections, filteredQuestions } = filterContentByLanguage(requestedLanguage, sectionsData, allQuestions);

        if (filteredSections.length === 0) {
          const fallback = filterContentByLanguage('en', sectionsData, allQuestions);
          if (fallback.filteredSections.length === 0) {
            setError('No questions available for the selected language.');
            setIsLoading(false);
            return;
          }
          setSections(fallback.filteredSections);
          setQuestions(fallback.filteredQuestions);
          setSelectedLanguage('en');
        } else {
          setSections(filteredSections);
          setQuestions(filteredQuestions);
        }
        setCurrentSectionIndex(0);
        setCurrentQuestionIndex(0);
      } catch (err: any) {
        setError(err.message || 'Failed to load exam');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [examId, attemptId, searchParams, filterContentByLanguage]);

  useEffect(() => {
    const visitedBeforeCurrentSection = sections
      .slice(0, currentSectionIndex)
      .reduce((sum, section) => sum + section.questions.length, 0);
    const globalIndex = visitedBeforeCurrentSection + currentQuestionIndex;
    if (questions.length > globalIndex && !showInstructions) {
      const currentQuestion = questions[globalIndex];
      setSelectedAnswer(currentQuestion?.userAnswer?.answer || null);
      setMarkedForReview(currentQuestion?.userAnswer?.marked_for_review || false);
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestionIndex, currentSectionIndex, questions, showInstructions, sections]);

  const hasAnswerValue = useCallback((value: string | string[] | null | undefined) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return Boolean(value);
  }, []);

  const hasSelectedAnswer = hasAnswerValue(selectedAnswer);

  const refreshSections = useCallback((questionList: QuestionWithStatus[]) => {
    setSections(prevSections => prevSections.map(section => ({
      ...section,
      questions: questionList.filter(q => q.section_id === section.id)
    })));
  }, []);

  const deriveStatus = useCallback((value: string | string[] | null | undefined, marked: boolean): QuestionStatus => {
    if (hasAnswerValue(value)) {
      return marked ? 'answered-marked' : 'answered';
    }
    if (marked) {
      return 'marked';
    }
    return 'not-answered';
  }, [hasAnswerValue]);

  const saveAnswer = useCallback(async (answer: string | string[] | null, marked: boolean, skipStateUpdate = false) => {
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

      // Only update state if not skipped (to avoid duplicate updates)
      if (!skipStateUpdate) {
        setQuestions(prev => {
          const updated = prev.map((q, idx) => {
            if (idx === globalIndex) {
              const newStatus = deriveStatus(answer, marked);
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
      }
    } catch (err: any) {
      console.error('Failed to save answer:', err);
    } finally {
      setIsSaving(false);
    }
  }, [attemptId, currentSectionIndex, currentQuestionIndex, questions, questionStartTime, refreshSections]);

  const handleAnswerChange = (optionId: string) => {
    const currentQuestion = getCurrentSectionQuestions()[currentQuestionIndex];
    if (!currentQuestion) return;

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
    const globalIndex = getGlobalQuestionIndex();
    const targetQuestion = questions[globalIndex];
    if (!targetQuestion) return;
    
    // Update the question status immediately before saving
    const newStatus = deriveStatus(selectedAnswer, markedForReview);
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);
    
    // Update local state first
    setQuestions(prev => {
      const updated = prev.map((q, idx) => {
        if (idx === globalIndex) {
          return {
            ...q,
            userAnswer: { answer: selectedAnswer, marked_for_review: markedForReview, time_taken: timeTaken },
            status: newStatus
          };
        }
        return q;
      });
      refreshSections(updated);
      return updated;
    });
    
    // Then save to backend (skip state update since we already did it)
    await saveAnswer(selectedAnswer, markedForReview, true);
    
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

  const handleAutoSubmit = useCallback(async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await saveAnswer(selectedAnswer, markedForReview);
      await examService.submitExam(attemptId);
      router.push(`/results/${attemptId}`);
    } catch (error: any) {
      setError('Failed to auto-submit exam');
      setIsSubmitting(false);
    }
  }, [attemptId, isSubmitting, markedForReview, router, saveAnswer, selectedAnswer]);

  const handleSubmitExam = useCallback(async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await examService.submitExam(attemptId);
      router.push(`/results/${attemptId}`);
    } catch (error: any) {
      setError(error.message || 'Failed to submit exam');
      setIsSubmitting(false);
    }
  }, [attemptId, isSubmitting, router]);

  const handleLanguageSelect = useCallback((lang: 'en' | 'hi') => {
    if (!allSections.length) return;

    const { filteredSections, filteredQuestions } = filterContentByLanguage(lang, allSections, allQuestions);

    if (filteredSections.length === 0) {
      setError('Selected language is not available for this exam.');
      return;
    }

    setSelectedLanguage(lang);
    setSections(filteredSections);
    setQuestions(filteredQuestions);
    setCurrentSectionIndex(0);
    setCurrentQuestionIndex(0);
    setLanguageSelectionMade(true);
  }, [allSections, allQuestions, filterContentByLanguage]);

  useEffect(() => {
    if (showInstructions || isLoading) return;

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
  }, [showInstructions, isLoading, handleAutoSubmit]);

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

  const getSectionQuestions = (section?: SectionWithQuestions) => {
    if (!section) return [];
    const sectionQuestions = questions.filter(q => q.section_id === section.id);
    if (sectionQuestions.length > 0) {
      return sortQuestionsByNumber(sectionQuestions);
    }
    return section.questions || [];
  };

  const getCurrentSection = () => sections[currentSectionIndex];
  const getCurrentSectionQuestions = () => getSectionQuestions(getCurrentSection());
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
    const visitedBeforeCurrentSection = sections
      .slice(0, currentSectionIndex)
      .reduce((sum, section) => sum + section.questions.length, 0);
    const globalIndex = visitedBeforeCurrentSection + currentQuestionIndex;
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
  }, [currentQuestionIndex, currentSectionIndex, showInstructions, refreshSections, sections]);

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

  const supportsHindi = exam?.supports_hindi;

  const handleStartExamFlow = () => {
    setShowInstructions(false);
  };

  const getLocalizedSectionName = (section?: SectionWithQuestions) => {
    if (!section) return '';
    if (selectedLanguage === 'hi' && section.name_hi) {
      return section.name_hi;
    }
    return section.name;
  };

  const getLocalizedQuestionText = (question?: QuestionWithStatus) => {
    if (!question) return '';
    if (selectedLanguage === 'hi' && question.text_hi) {
      return question.text_hi;
    }
    return question.text || '';
  };

  const getLocalizedOptionText = (option: Question['options'][number]) => {
    if (selectedLanguage === 'hi' && option.option_text_hi) {
      return option.option_text_hi;
    }
    return option.option_text || '';
  };

  if (showInstructions) {
    const languageLabel = selectedLanguage === 'hi' ? 'हिंदी (Hindi)' : 'English';
    return (
      <div className="min-h-screen bg-muted/30 py-10">
        <div className="container-main space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">Exam Instructions</p>
              <h1 className="font-display text-3xl font-bold text-foreground">{exam?.title}</h1>
              <p className="text-sm text-muted-foreground">Review the instructions below before you begin your attempt.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-4 py-2 rounded-full border border-border bg-card text-sm font-medium">
                Selected Language: {languageLabel}
              </span>
              <span className="px-4 py-2 rounded-full border border-border bg-card text-sm font-medium">
                Duration: {exam?.duration} min
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Overview</p>
                  <p className="text-lg font-semibold text-foreground">Exam Summary</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-muted border border-border">
                  <p className="text-muted-foreground text-xs">Total Questions</p>
                  <p className="text-2xl font-semibold text-foreground">{exam?.total_questions}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted border border-border">
                  <p className="text-muted-foreground text-xs">Total Marks</p>
                  <p className="text-2xl font-semibold text-foreground">{exam?.total_marks}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted border border-border">
                  <p className="text-muted-foreground text-xs">Negative Marking</p>
                  <p className="text-lg font-semibold text-foreground">{exam?.negative_marking ? `Yes (-${exam?.negative_mark_value})` : 'No'}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted border border-border">
                  <p className="text-muted-foreground text-xs">Attempt Mode</p>
                  <p className="text-lg font-semibold text-foreground">Online</p>
                </div>
              </div>

              <div>
                <h2 className="font-semibold text-lg mb-2 text-foreground">Navigation & Conduct</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Use the palette to switch between sections or questions.</li>
                  <li>• “Save & Next” stores your response and advances ahead.</li>
                  <li>• “Mark for Review” keeps your answer (if any) but flags it.</li>
                  <li>• “Clear Response” erases the current selection.</li>
                </ul>
              </div>

              <div>
                <h2 className="font-semibold text-lg mb-2 text-foreground">Status Legend</h2>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {[{
                    label: 'Answered',
                    color: 'bg-green-100 border-green-300 text-green-900',
                    icon: <CheckCircle2 className="h-4 w-4" />
                  },{
                    label: 'Not Answered',
                    color: 'bg-orange-100 border-orange-300 text-orange-900',
                    icon: <AlertTriangle className="h-4 w-4" />
                  },{
                    label: 'Marked for Review',
                    color: 'bg-purple-100 border-purple-300 text-purple-900',
                    icon: <Flag className="h-4 w-4" />
                  },{
                    label: 'Not Visited',
                    color: 'bg-muted border-border text-muted-foreground',
                    icon: <Circle className="h-4 w-4" />
                  }].map(status => (
                    <div key={status.label} className={`flex items-center gap-3 rounded-xl border ${status.color} px-3 py-2`}>
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg border border-current">
                        {status.icon}
                      </span>
                      <span>{status.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-4 text-sm">
                <strong>Important:</strong> The exam auto-submits when the timer reaches zero. Save responses regularly to avoid loss.
              </div>
            </div>

            <div className="space-y-6">
              {supportsHindi && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground">Select Exam Language</p>
                    <span className="text-[10px] uppercase tracking-[0.3em] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Required</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Your chosen language cannot be changed after you begin.</p>
                  <div className="grid gap-3">
                    {[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिंदी' }].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleLanguageSelect(option.value as 'en' | 'hi')}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          selectedLanguage === option.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-foreground hover:border-primary/40'
                        }`}
                      >
                        <span>{option.label}</span>
                        <span className={`w-3 h-3 rounded-full border ${selectedLanguage === option.value ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-semibold text-lg mb-3 text-foreground">Before You Begin</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Ensure a stable internet connection.</li>
                  <li>• Keep your admit card or candidate ID handy.</li>
                  <li>• Avoid refreshing the page during the attempt.</li>
                  <li>• Headphones, extra devices or text material are not permitted.</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="outline" className="flex-1" size="lg" onClick={() => router.push(`/exams/${examId}`)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleStartExamFlow}
                  className="flex-1"
                  size="lg"
                  disabled={supportsHindi && !languageSelectionMade}
                >
                  {supportsHindi && !languageSelectionMade ? 'Select language to start' : 'Start Exam'}
                </Button>
              </div>
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
                {getLocalizedSectionName(currentSection)} - Question {currentQuestion?.question_number ?? (currentQuestionIndex + 1)} of {currentSectionQuestions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-medium">
                <span className="text-muted-foreground">Language:</span>
                <span className="uppercase">{selectedLanguage === 'hi' ? 'हिंदी' : 'English'}</span>
              </div>
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
                  const sectionQuestions = getSectionQuestions(section);
                  const sectionStats = getQuestionCounts(sectionQuestions);
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
                        <p className="font-semibold text-sm">{getLocalizedSectionName(section)}</p>
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
                      <span className="text-sm font-medium text-muted-foreground">Question {currentQuestion?.question_number ?? (currentQuestionIndex + 1)}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {currentQuestion?.marks} {currentQuestion?.marks === 1 ? 'Mark' : 'Marks'}
                      </span>
                      {exam?.negative_marking && currentQuestion?.negative_marks > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                          -{currentQuestion.negative_marks} Negative
                        </span>
                      )}
                    </div>
                    <div
                      className="text-lg leading-relaxed rich-text-content"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(getLocalizedQuestionText(currentQuestion)) }}
                    />
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
                        <div className="flex items-start gap-2 mb-2">
                          <span className="font-medium text-sm text-muted-foreground">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          <div
                            className="flex-1 rich-text-content"
                            dangerouslySetInnerHTML={{ __html: sanitizeRichText(getLocalizedOptionText(option)) }}
                          />
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
                  const paletteStatus = questions[globalIdx]?.status || q.status;
                  
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
                      } ${statusColors[paletteStatus]}`}
                    >
                      {q.question_number ?? (idx + 1)}
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
