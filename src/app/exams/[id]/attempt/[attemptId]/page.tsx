"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  AlertCircle, Clock, ChevronLeft, ChevronRight, Flag,
  CheckCircle2, Circle, AlertTriangle, FileText, X, CheckCheck, List, Pause,
  Maximize2, Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/common/LoadingStates';
import { examService } from '@/lib/api/examService';
import { Exam, Question, Section } from '@/types';
import { MathRenderer } from '@/components/common/MathRenderer';
import { getOptimizedImageUrl } from '@/lib/utils/imageUrl';

type QuestionStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked' | 'answered-marked';


const requestDomFullscreen = () => {
  if (typeof document === 'undefined') return;
  const docEl = document.documentElement;
  if (!docEl.requestFullscreen || document.fullscreenElement) return;
  docEl.requestFullscreen().catch(() => { });
};

const exitDomFullscreen = () => {
  if (typeof document === 'undefined') return;
  if (!document.fullscreenElement || !document.exitFullscreen) return;
  document.exitFullscreen().catch(() => { });
};


const normalizeImageSource = (value?: string | null) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${trimmed}`;
    }
    return trimmed;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/${trimmed.replace(/^\.?\//, '')}`;
  }

  return trimmed;
};

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

const ExamTimer = ({
  initialTime,
  isRunning,
  onAutoSubmit
}: {
  initialTime: number;
  isRunning: boolean;
  onAutoSubmit: () => void;
}) => {
  const [time, setTime] = useState(initialTime);
  const onAutoSubmitRef = useRef(onAutoSubmit);

  useEffect(() => { onAutoSubmitRef.current = onAutoSubmit; }, [onAutoSubmit]);

  useEffect(() => { if (initialTime > 0 && time === 0) setTime(initialTime); }, [initialTime]);

  useEffect(() => {
    if (!isRunning || time === 0) return;
    const interval = setInterval(() => {
      setTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onAutoSubmitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const h = Math.floor(time / 3600);
  const m = Math.floor((time % 3600) / 60);
  const s = time % 60;
  const fTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${time < 300 && time > 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
      }`}>
      <Clock className="h-5 w-5" />
      {fTime}
    </div>
  );
};
const MobileExamTimer = ({ initialTime, isRunning }: { initialTime: number, isRunning: boolean }) => {
  const [time, setTime] = useState(initialTime);

  useEffect(() => { if (initialTime > 0 && time === 0) setTime(initialTime); }, [initialTime]);

  useEffect(() => {
    if (!isRunning || time === 0) return;
    const interval = setInterval(() => {
      setTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const h = Math.floor(time / 3600);
  const m = Math.floor((time % 3600) / 60);
  const s = time % 60;
  const fTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return <>{fTime}</>;
};

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
  const [initialTime, setInitialTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi'>('en');
  const [languageSelectionMade, setLanguageSelectionMade] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('Submitting your exam...');
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);
  const [questionTimer, setQuestionTimer] = useState(0);
  const [paletteViewMode, setPaletteViewMode] = useState<'section' | 'overall'>('section');

  // Refs to always have latest values inside intervals/callbacks without stale closures
  const selectedAnswerRef = useRef<string | string[] | null>(null);
  const markedForReviewRef = useRef(false);
  const questionsRef = useRef<QuestionWithStatus[]>([]);
  const currentSectionIndexRef = useRef(0);
  const currentQuestionIndexRef = useRef(0);
  const questionStartTimeRef = useRef(Date.now());
  const isSavingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { selectedAnswerRef.current = selectedAnswer; }, [selectedAnswer]);
  useEffect(() => { markedForReviewRef.current = markedForReview; }, [markedForReview]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { currentSectionIndexRef.current = currentSectionIndex; }, [currentSectionIndex]);
  useEffect(() => { currentQuestionIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);
  useEffect(() => { questionStartTimeRef.current = questionStartTime; }, [questionStartTime]);

  const orderValue = (question: Question | QuestionWithStatus) => (
    typeof question.question_number === 'number'
      ? question.question_number
      : typeof question.question_order === 'number'
        ? question.question_order
        : Number.MAX_SAFE_INTEGER
  );

  const sortQuestionsByNumber = <T extends Question | QuestionWithStatus>(items: T[]): T[] =>
    [...items].sort((a, b) => orderValue(a) - orderValue(b));

  const getQuestionSectionId = useCallback((question?: Partial<Question> | Partial<QuestionWithStatus> | null) => (
    question?.section_id || question?.sectionId || ''
  ), []);

  const getSectionQuestions = useCallback((section?: SectionWithQuestions, sourceQuestions: QuestionWithStatus[] = questions) => {
    if (!section) return [];
    const sectionQuestions = sourceQuestions.filter(q => getQuestionSectionId(q) === section.id);
    if (sectionQuestions.length > 0) {
      return sortQuestionsByNumber(sectionQuestions);
    }
    return section.questions || [];
  }, [getQuestionSectionId, questions, sortQuestionsByNumber]);

  const getCurrentSection = useCallback(() => sections[currentSectionIndex], [currentSectionIndex, sections]);

  const getCurrentSectionQuestions = useCallback(() => getSectionQuestions(getCurrentSection()), [getCurrentSection, getSectionQuestions]);

  const getQuestionAtPosition = useCallback((
    sectionIndex = currentSectionIndex,
    questionIndex = currentQuestionIndex,
    sourceQuestions: QuestionWithStatus[] = questions
  ) => {
    const section = sections[sectionIndex];
    if (!section) return null;
    return getSectionQuestions(section, sourceQuestions)[questionIndex] || null;
  }, [currentQuestionIndex, currentSectionIndex, getSectionQuestions, questions, sections]);

  const hasContentForLanguage = useCallback((question: QuestionWithStatus, language: 'en' | 'hi') => {
    const hasText = language === 'hi'
      ? (question.text_hi && question.text_hi.trim())
      : (question.text && question.text.trim());
    const hasExplanation = language === 'hi'
      ? (question.explanation_hi && question.explanation_hi.trim())
      : (question.explanation && question.explanation.trim());
    const hasImage = question.image_url && question.image_url.trim();
    const hasOptions = language === 'hi'
      ? (question.options || []).some(opt => (opt.option_text_hi && opt.option_text_hi.trim()) || (opt.image_url && opt.image_url.trim()))
      : (question.options || []).some(opt => (opt.option_text && opt.option_text.trim()) || (opt.image_url && opt.image_url.trim()));

    const result = Boolean(hasText || hasExplanation || hasImage || hasOptions);

    if (!result) {

    }

    return result;
  }, []);

  const filterContentByLanguage = useCallback((language: 'en' | 'hi', sourceSections: SectionWithQuestions[], sourceQuestions: QuestionWithStatus[]) => {
    const sectionsForLanguage = sourceSections.filter(section => (section.language || 'en') === language);
    const allowedSectionIds = new Set(sectionsForLanguage.map(section => section.id));

    const filteredQuestions = sourceQuestions.filter(question => {
      const sectionId = getQuestionSectionId(question);
      if (!sectionId || !allowedSectionIds.has(sectionId)) {
        return false;
      }
      return hasContentForLanguage(question, language);
    });

    const filteredSections = sectionsForLanguage
      .map(section => {
        const sectionQuestions = sortQuestionsByNumber(filteredQuestions.filter(q => getQuestionSectionId(q) === section.id));
        return {
          ...section,
          totalQuestions: sectionQuestions.length,
          questions: sectionQuestions
        };
      })
      .filter(section => section.questions.length > 0);

    return { filteredSections, filteredQuestions };
  }, [getQuestionSectionId, hasContentForLanguage]);

  useEffect(() => {
    if (!attemptId) return;
    router.prefetch(`/results/${attemptId}`);
  }, [attemptId, router]);


  useEffect(() => {
    const fetchData = async () => {
      if (!examId || !attemptId) {
        setError('Invalid exam attempt reference');
        setIsLoading(false);
        return;
      }

      try {
        const examData = await examService.getExamById(examId);

        if (!examData) {
          throw new Error('Exam not found');
        }

        setExam(examData);
        const requestedLanguage = searchParams?.get('lang') === 'hi' ? 'hi' : 'en';
        setSelectedLanguage(requestedLanguage);
        setLanguageSelectionMade(true);
        setInitialTime((examData.duration || 0) * 60);

        const questionsResponse = await examService.getExamQuestions(examId, attemptId);



        const normalizedQuestions = sortQuestionsByNumber(questionsResponse.questions);
        const allQuestions: QuestionWithStatus[] = normalizedQuestions.map((q: any) => {
          const hasAnswer = hasAnswerValue(q.userAnswer?.answer);
          const isMarked = q.userAnswer?.marked_for_review || false;

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
          questions: sortQuestionsByNumber(allQuestions.filter(q => getQuestionSectionId(q) === s.id))
        }));


        setAllSections(sectionsData);
        setAllQuestions(allQuestions);

        if (examData.supports_hindi) {
          setSections(sectionsData);
          setQuestions(allQuestions);
          setSelectedLanguage(requestedLanguage);
        } else {
          let { filteredSections, filteredQuestions } = filterContentByLanguage(requestedLanguage, sectionsData, allQuestions);

          if (filteredSections.length === 0) {
            const fallback = filterContentByLanguage('en', sectionsData, allQuestions);
            if (fallback.filteredSections.length === 0) {
              setError('No questions available for the selected language.');
              setIsLoading(false);
              return;
            }
            filteredSections = fallback.filteredSections;
            filteredQuestions = fallback.filteredQuestions;
            setSelectedLanguage('en');
          }
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
  }, [examId, attemptId, getQuestionSectionId, searchParams, filterContentByLanguage]);

  useEffect(() => {
    if (showInstructions) return;
    const qs = questionsRef.current;
    const currentQuestion = getQuestionAtPosition(currentSectionIndex, currentQuestionIndex, qs);
    if (currentQuestion) {
      setSelectedAnswer(currentQuestion?.userAnswer?.answer || null);
      setMarkedForReview(currentQuestion?.userAnswer?.marked_for_review || false);
      setQuestionStartTime(Date.now());
      setQuestionTimer(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, currentSectionIndex, showInstructions, sections]);

  useEffect(() => {
    if (showInstructions || isLoading) return;
    const interval = setInterval(() => {
      setQuestionTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [showInstructions, isLoading]);

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
      questions: sortQuestionsByNumber(questionList.filter(q => getQuestionSectionId(q) === section.id))
    })));
  }, [getQuestionSectionId, sortQuestionsByNumber]);

  const deriveStatus = useCallback((value: string | string[] | null | undefined, marked: boolean): QuestionStatus => {
    if (hasAnswerValue(value)) {
      return marked ? 'answered-marked' : 'answered';
    }
    if (marked) {
      return 'marked';
    }
    return 'not-answered';
  }, [hasAnswerValue]);

  const updateCurrentQuestionLocally = useCallback((
    answer: string | string[] | null,
    marked: boolean,
    extraUserAnswer: Partial<NonNullable<QuestionWithStatus['userAnswer']>> = {}
  ) => {
    const targetQuestion = getQuestionAtPosition(currentSectionIndex, currentQuestionIndex, questionsRef.current);
    if (!targetQuestion) return;

    setQuestions(prev => {
      const updated = prev.map((question) => {
        if (question.id !== targetQuestion.id) return question;

        return {
          ...question,
          userAnswer: {
            answer,
            marked_for_review: marked,
            time_taken: question.userAnswer?.time_taken || 0,
            ...extraUserAnswer,
          },
          status: deriveStatus(answer, marked),
        };
      });

      questionsRef.current = updated;
      refreshSections(updated);
      return updated;
    });
  }, [currentQuestionIndex, currentSectionIndex, deriveStatus, getQuestionAtPosition, refreshSections]);

  const saveAnswer = useCallback(async (answer: string | string[] | null, marked: boolean, skipStateUpdate = false) => {
    const qs = questionsRef.current;
    const targetQuestion = getQuestionAtPosition(currentSectionIndexRef.current, currentQuestionIndexRef.current, qs);
    if (!targetQuestion) return;

    const timeTaken = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    const questionId = targetQuestion.id;

    setIsSaving(true);
    isSavingRef.current = true;
    try {
      await examService.saveAnswer(attemptId, questionId, {
        answer,
        markedForReview: marked,
        timeTaken
      });

      // Only update state if not skipped (to avoid duplicate updates)
      if (!skipStateUpdate) {
        setQuestions(prev => {
          const updated = prev.map((q) => {
            if (q.id === targetQuestion.id) {
              const newStatus = deriveStatus(answer, marked);
              return {
                ...q,
                userAnswer: { answer, marked_for_review: marked, time_taken: timeTaken },
                status: newStatus
              };
            }
            return q;
          });
          questionsRef.current = updated;
          refreshSections(updated);
          return updated;
        });
      }
    } catch (err: any) {
      console.error('Failed to save answer:', err);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [attemptId, deriveStatus, getQuestionAtPosition, refreshSections]);

  // Silent background auto-save using refs — no state updates, no UI flicker
  const silentSave = useCallback(async () => {
    if (isSavingRef.current) return;
    const qs = questionsRef.current;
    const targetQuestion = getQuestionAtPosition(currentSectionIndexRef.current, currentSectionIndexRef.current, qs);
    if (!targetQuestion) return;
    const answer = selectedAnswerRef.current;
    const marked = markedForReviewRef.current;
    const timeTaken = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    try {
      isSavingRef.current = true;
      await examService.saveAnswer(attemptId, targetQuestion.id, {
        answer,
        markedForReview: marked,
        timeTaken,
      });
    } catch {
      // silent — don't disrupt the user
    } finally {
      isSavingRef.current = false;
    }
  }, [attemptId, getQuestionAtPosition]);

  const handleAnswerChange = (optionId: string) => {
    const currentQuestion = getCurrentSectionQuestions()[currentQuestionIndex];
    if (!currentQuestion) return;

    if (currentQuestion.type === 'multiple') {
      const currentAnswers = Array.isArray(selectedAnswer) ? selectedAnswer : [];
      const newAnswers = currentAnswers.includes(optionId)
        ? currentAnswers.filter(id => id !== optionId)
        : [...currentAnswers, optionId];
      const nextAnswer = newAnswers.length > 0 ? newAnswers : null;
      setSelectedAnswer(nextAnswer);
    } else {
      setSelectedAnswer(optionId);
    }
  };

  const handleSaveAndNext = async () => {
    const targetQuestion = getQuestionAtPosition(currentSectionIndex, currentQuestionIndex, questionsRef.current);
    if (!targetQuestion) return;

    // Capture current answer state before navigating
    const answerToSave = selectedAnswer;
    const markedToSave = markedForReview;
    const newStatus = deriveStatus(answerToSave, markedToSave);
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);

    // Update the question in state immediately
    setQuestions(prev => {
      const updated = prev.map((q) => {
        if (q.id === targetQuestion.id) {
          return {
            ...q,
            userAnswer: { answer: answerToSave, marked_for_review: markedToSave, time_taken: timeTaken },
            status: newStatus
          };
        }
        return q;
      });
      // Also sync questionsRef eagerly so the navigation effect reads fresh data
      questionsRef.current = updated;
      refreshSections(updated);
      return updated;
    });

    // Navigate to next question BEFORE the async save so the UI updates instantly
    const sectionQs = getSectionQuestions(sections[currentSectionIndex]);
    if (currentQuestionIndex < sectionQs.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
    }

    // Save to backend in background (skip state update since we already did it)
    saveAnswer(answerToSave, markedToSave, true);
  };

  const handleSaveAndSubmitPrompt = async () => {
    updateCurrentQuestionLocally(selectedAnswer, markedForReview);
    await saveAnswer(selectedAnswer, markedForReview, true);
    setShowSubmitConfirm(true);
  };

  const handleMarkForReview = async () => {
    const newMarked = !markedForReview;
    setMarkedForReview(newMarked);
    updateCurrentQuestionLocally(selectedAnswer, newMarked);
    // skipStateUpdate=true because updateCurrentQuestionLocally already set the correct state
    await saveAnswer(selectedAnswer, newMarked, true);
  };

  const handleClearResponse = () => {
    setSelectedAnswer(null);
  };

  const handleAutoSubmit = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionMessage('Time is up. Submitting your exam and preparing results...');
    setShowSubmissionModal(true);
    try {
      updateCurrentQuestionLocally(selectedAnswer, markedForReview);
      await saveAnswer(selectedAnswer, markedForReview, true);
      await examService.submitExam(attemptId);
      router.push(`/results/${attemptId}`);
    } catch (error: any) {
      setError('Failed to auto-submit exam');
      setIsSubmitting(false);
      setShowSubmissionModal(false);
    }
  }, [attemptId, isSubmitting, markedForReview, router, saveAnswer, selectedAnswer]);

  const handleSubmitExam = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionMessage('Submitting your exam and generating results. Please wait...');
    setShowSubmissionModal(true);
    try {
      await examService.submitExam(attemptId);
      router.push(`/results/${attemptId}`);
    } catch (error: any) {
      setError(error.message || 'Failed to submit exam');
      setIsSubmitting(false);
      setShowSubmissionModal(false);
    }
  }, [attemptId, isSubmitting, router]);

  const handlePauseExam = async () => {
    try {
      setIsSaving(true);
      // Save current question's state before pausing
      await silentSave();

      // Navigate to the full exam details path /category-id/exam-slug
      const targetPath = exam?.slug ? `/${params.id}/${exam.slug}` : `/${params.id}`;
      router.push(targetPath);
    } catch (error) {
      console.error('Failed to pause exam:', error);
      const targetPath = exam?.slug ? `/${params.id}/${exam.slug}` : `/${params.id}`;
      router.push(targetPath);
    } finally {
      setIsSaving(false);
    }
  };

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

  // Auto-save every 30 seconds silently in the background
  useEffect(() => {
    if (showInstructions || isLoading) return;
    const interval = setInterval(() => {
      silentSave();
    }, 30_000);
    return () => clearInterval(interval);
  }, [showInstructions, isLoading, silentSave]);

  useEffect(() => {
    if (showInstructions) {
      exitDomFullscreen();
      return;
    }
    requestDomFullscreen();
    return () => {
      exitDomFullscreen();
    };
  }, [showInstructions]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSmallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const resolveOptionImage = (option: { image_url?: string; imageUrl?: string; image?: string }) =>
    getOptimizedImageUrl(normalizeImageSource(option.image_url || option.imageUrl || option.image || ''));

  const resolveQuestionImage = (question?: QuestionWithStatus | null) =>
    getOptimizedImageUrl(
      normalizeImageSource(
        question?.image_url ||
        (question as (QuestionWithStatus & { imageUrl?: string; image?: string }) | undefined)?.imageUrl ||
        (question as (QuestionWithStatus & { image?: string }) | undefined)?.image ||
        ''
      )
    );

  const getLiveQuestions = () => questions;

  useEffect(() => {
    if (showInstructions || questions.length === 0) return;
    const activeQuestion = getQuestionAtPosition(currentSectionIndex, currentQuestionIndex, questions);
    if (!activeQuestion) return;

    setQuestions(prev => {
      const current = prev.find(question => question.id === activeQuestion.id);
      if (!current || current.status !== 'not-visited') return prev;
      const updated = prev.map((q) =>
        q.id === activeQuestion.id
          ? { ...q, status: 'not-answered' as QuestionStatus }
          : q
      );
      questionsRef.current = updated;
      refreshSections(updated);
      return updated;
    });
  }, [currentQuestionIndex, currentSectionIndex, getQuestionAtPosition, questions, refreshSections, showInstructions]);

  if (isLoading) {
    return <LoadingPage message="Preparing your exam..." />;
  }

  if (error) {
    const isAlreadySubmitted = error.toLowerCase().includes('already submitted');

    if (isAlreadySubmitted) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
              <CheckCheck className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Exam Already Submitted
            </h2>
            <p className="text-gray-500 mb-8">
              You have already completed this exam. Head to your results to review your performance.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => router.push(`/results/${attemptId}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                View Results
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(exam?.url_path || `/exams/${examId}`)}
              >
                Back to Exam
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center py-12">
        <div className="max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Unable to load exam</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => router.push(exam?.url_path || `/exams/${examId}`)}>Back to exam</Button>
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
      <div className="min-h-screen bg-muted/30 py-4">
        <div className="container-main space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Exam Instructions</p>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{exam?.title}</h1>
              <p className="text-xs text-muted-foreground">Review the instructions below before you begin.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full border border-border bg-card text-xs font-medium">
                {languageLabel}
              </span>
              <span className="px-3 py-1 rounded-full border border-border bg-card text-xs font-medium">
                {exam?.duration} min
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold text-foreground">Exam Summary</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <p className="text-muted-foreground text-xs">Total Questions</p>
                  <p className="text-xl font-semibold text-foreground">{exam?.total_questions}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <p className="text-muted-foreground text-xs">Total Marks</p>
                  <p className="text-xl font-semibold text-foreground">{exam?.total_marks}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <p className="text-muted-foreground text-xs">Negative Marking</p>
                  <p className="text-sm font-semibold text-foreground">{exam?.negative_marking ? `Yes (-${exam?.negative_mark_value})` : 'No'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <p className="text-muted-foreground text-xs">Attempt Mode</p>
                  <p className="text-sm font-semibold text-foreground">Online</p>
                </div>
              </div>

              <div>
                <h2 className="font-semibold text-sm mb-1.5 text-foreground">Navigation & Conduct</h2>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• Use the palette to switch between sections or questions.</li>
                  <li>• “Save & Next” stores your response and advances ahead.</li>
                  <li>• “Mark for Review” keeps your answer (if any) but flags it.</li>
                  <li>• “Clear Response” erases the current selection.</li>
                </ul>
              </div>

              <div>
                <h2 className="font-semibold text-sm mb-1.5 text-foreground">Status Legend</h2>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[{
                    label: 'Attempted',
                    color: 'bg-green-100 border-green-300 text-green-900',
                    icon: <CheckCircle2 className="h-4 w-4" />
                  }, {
                    label: 'Not Attempted',
                    color: 'bg-orange-100 border-orange-300 text-orange-900',
                    icon: <AlertTriangle className="h-4 w-4" />
                  }, {
                    label: 'Marked for Review',
                    color: 'bg-purple-100 border-purple-300 text-purple-900',
                    icon: <Flag className="h-4 w-4" />
                  }, {
                    label: 'Not Visited',
                    color: 'bg-muted border-border text-muted-foreground',
                    icon: <Circle className="h-4 w-4" />
                  }].map(status => (
                    <div key={status.label} className={`flex items-center gap-2 rounded-lg border ${status.color} px-2 py-1.5`}>
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg border border-current">
                        {status.icon}
                      </span>
                      <span>{status.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 text-xs">
                <strong>Important:</strong> The exam auto-submits when the timer reaches zero. Save responses regularly to avoid loss.
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="font-semibold text-sm mb-2 text-foreground">Before You Begin</h2>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• Ensure a stable internet connection.</li>
                  <li>• Keep your admit card or candidate ID handy.</li>
                  <li>• Avoid refreshing the page during the attempt.</li>
                  <li>• Headphones, extra devices or text material are not permitted.</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="flex-1 text-sm sm:text-base" size="default" onClick={() => router.push(`/exams/${examId}`)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleStartExamFlow}
                  className="flex-1 text-sm sm:text-base"
                  size="default"
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

  const liveQuestions = getLiveQuestions();
  const currentSection = getCurrentSection();
  const currentSectionQuestions = getSectionQuestions(currentSection, liveQuestions);
  const currentQuestion = currentSectionQuestions[currentQuestionIndex];
  const counts = getQuestionCounts(liveQuestions);
  const sectionCounts = getQuestionCounts(currentSectionQuestions);
  const isLastQuestion =
    currentSectionIndex === sections.length - 1 &&
    currentQuestionIndex === currentSectionQuestions.length - 1;

  const navigatePrevious = async () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
      setCurrentQuestionIndex(sections[currentSectionIndex - 1].questions.length - 1);
    }
  };

  const navigateNext = async () => {
    if (currentQuestionIndex < currentSectionQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
    }
  };

  const statusColors = {
    'answered': 'bg-green-100 border-green-600 text-green-900',
    'answered-marked': 'bg-purple-100 border-purple-600 text-purple-900',
    'marked': 'bg-purple-100 border-purple-600 text-purple-900',
    'not-answered': 'bg-orange-100 border-orange-600 text-orange-900',
    'not-visited': 'bg-muted border-border text-muted-foreground'
  } as const;

  return (
    <div className="min-h-screen bg-muted/30 relative">
      {showSubmissionModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center space-y-4 shadow-2xl border border-primary/20">
            <div className="mx-auto h-16 w-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <h2 className="text-2xl font-display font-semibold text-primary">Submitting Exam</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{submissionMessage}</p>
            <p className="text-xs text-muted-foreground/80">Do not close this window or refresh the page.</p>
          </div>
        </div>
      )}
      <div className="hidden md:block bg-card border-b border-border sticky top-0 z-50">
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
                <div className="hidden md:flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullScreen}
                    className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-all mr-1"
                    title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  >
                    {isFullScreen ? (
                      <Minimize2 className="h-4.5 w-4.5" />
                    ) : (
                      <Maximize2 className="h-4.5 w-4.5" />
                    )}
                  </Button>
                  <div className="w-px h-4 bg-slate-300 mx-2 shrink-0" />
                </div>
                <span className="text-muted-foreground mr-1">Language:</span>
                {exam?.supports_hindi ? (
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as 'en' | 'hi')}
                    className="bg-transparent uppercase font-semibold text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी</option>
                  </select>
                ) : (
                  <span className="uppercase">{selectedLanguage === 'hi' ? 'हिंदी' : 'English'}</span>
                )}
              </div>
              <ExamTimer
                initialTime={initialTime}
                isRunning={!showInstructions && !isLoading}
                onAutoSubmit={handleAutoSubmit}
              />
              <button
                onClick={handlePauseExam}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 hover:border-red-300 transition-all active:scale-95 disabled:opacity-50"
              >
                <Pause className="h-3.5 w-3.5 fill-current" />
                {isSaving ? 'Saving...' : 'Pause & Exit'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Mobile Palette Trigger */}
      <div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
        <Button
          onClick={() => setShowMobilePalette(true)}
          className="h-10 px-5 rounded-full bg-slate-900 border border-slate-700 text-white shadow-2xl flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-black/20"
        >
          <List className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Question List</span>
        </Button>
      </div>

      <div className="md:hidden sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="px-3 pt-3 pb-2 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <Clock className="h-6 w-6 text-primary shrink-0" />
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <h1 className="text-[15px] font-bold text-slate-900 leading-none mb-1">
                  Time <span className="font-mono"><MobileExamTimer initialTime={initialTime} isRunning={!showInstructions && !isLoading} /></span>
                </h1>
                <p className="text-[10px] text-slate-500 font-medium truncate leading-none">
                  {getLocalizedSectionName(currentSection)} <span className="mx-1 opacity-50">•</span> {exam?.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {exam?.supports_hindi && (
                <div className="flex items-center gap-2 text-slate-600">
                  <button
                    type="button"
                    onClick={() => setShowTranslateMenu((prev) => !prev)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white"
                    aria-label="Open language options"
                  >
                    <span className="text-xs font-bold uppercase">{selectedLanguage}</span>
                  </button>
                  {showTranslateMenu && (
                    <div className="absolute right-3 top-12 z-50 w-32 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                      {[
                        { code: 'en', label: 'English' },
                        { code: 'hi', label: 'हिंदी (Hindi)' },
                      ].map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setSelectedLanguage(lang.code as 'en' | 'hi');
                            setShowTranslateMenu(false);
                          }}
                          className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm ${selectedLanguage === lang.code
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowMobilePalette(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
                aria-label="Open question palette"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handlePauseExam}
                disabled={isSaving}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-100 text-red-600 active:scale-90 transition-all shadow-sm"
                aria-label="Pause and exit"
              >
                <Pause className="h-3.5 w-3.5 fill-current" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {sections.map((section, idx) => (
              <button
                key={section.id}
                onClick={() => {
                  silentSave();
                  setCurrentSectionIndex(idx);
                  setCurrentQuestionIndex(0);
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[13px] font-medium transition-colors whitespace-nowrap ${idx === currentSectionIndex
                  ? 'border-blue-400 text-blue-500 bg-blue-50'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
              >
                {getLocalizedSectionName(section)}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-slate-900">
                Ques {currentQuestion?.question_number ?? currentQuestionIndex + 1}
              </span>
              <span className="inline-flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                +{currentQuestion?.marks ?? 0}
              </span>
              {exam?.negative_marking && (currentQuestion?.negative_marks || exam?.negative_mark_value) > 0 && (
                <span className="text-rose-500">-{currentQuestion?.negative_marks || exam?.negative_mark_value}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-rose-500 font-medium">
              <Clock className="h-3.5 w-3.5" />
              {formatSmallTime(questionTimer)}
            </div>
          </div>
        </div>
      </div>

      <div className="container-main md:py-6 md:pb-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="hidden md:block bg-card border border-border rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {sections.map((section, idx) => {
                  const sectionQuestions = getSectionQuestions(section, liveQuestions);
                  const sectionStats = getQuestionCounts(sectionQuestions);
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        silentSave();
                        setCurrentSectionIndex(idx);
                        setCurrentQuestionIndex(0);
                      }}
                      className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all ${idx === currentSectionIndex
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

            <div className="bg-white md:bg-card border-0 md:border border-slate-200 md:border-border rounded-none md:rounded-2xl p-4 sm:p-6 overflow-hidden">
              <div className="mb-3">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="hidden md:flex items-center gap-1.5 flex-wrap mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Question {currentQuestion?.question_number ?? (currentQuestionIndex + 1)}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {currentQuestion?.marks} {currentQuestion?.marks === 1 ? 'Mark' : 'Marks'}
                      </span>
                      {exam?.negative_marking && (currentQuestion?.negative_marks || exam?.negative_mark_value) > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                          -{currentQuestion?.negative_marks || exam?.negative_mark_value} Negative
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-rose-50 text-rose-500 font-semibold ml-auto">
                        <Clock className="h-3 w-3" />
                        {formatSmallTime(questionTimer)}
                      </div>
                    </div>
                    <MathRenderer
                      html={getLocalizedQuestionText(currentQuestion)}
                      className="rich-text-content exam-question-text leading-relaxed text-[15px] md:text-base text-slate-700"
                    />
                  </div>
                </div>
                {resolveQuestionImage(currentQuestion) && (
                  <img
                    src={resolveQuestionImage(currentQuestion)}
                    alt="Question"
                    className="max-w-full h-auto rounded-lg border border-border mt-4"
                  />
                )}
              </div>

              <div className="space-y-3">
                <p className="hidden md:block text-xs font-medium text-muted-foreground mb-2">Options:</p>
                {currentQuestion?.options?.map((option, idx) => {
                  const isSelected = currentQuestion.type === 'multiple'
                    ? Array.isArray(selectedAnswer) && selectedAnswer.includes(option.id)
                    : selectedAnswer === option.id;

                  return (
                    <label
                      key={option.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-primary/50'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <span className={`shrink-0 flex items-center justify-center w-7 h-7 mt-0.5 rounded-lg text-sm font-bold transition-all ${isSelected
                            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                            : 'bg-slate-100/80 text-slate-600 border border-slate-200/60'
                            }`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <MathRenderer
                            html={getLocalizedOptionText(option)}
                            className="flex-1 exam-option-text rich-text-content text-[15px] text-slate-700 pt-1"
                          />
                        </div>
                        {resolveOptionImage(option) && (
                          <img
                            src={resolveOptionImage(option)}
                            alt={`Option ${String.fromCharCode(65 + idx)}`}
                            className="max-h-40 rounded-lg border border-border object-contain mt-1"
                          />
                        )}
                      </div>
                      <input
                        type={currentQuestion.type === 'multiple' ? 'checkbox' : 'radio'}
                        name={`question-${currentQuestion.id}`}
                        value={option.id}
                        checked={isSelected}
                        onChange={() => handleAnswerChange(option.id)}
                        className="shrink-0 accent-primary"
                      />
                    </label>
                  );
                })}
              </div>
              <div className="md:hidden mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleClearResponse}
                  disabled={!selectedAnswer}
                  className="text-sm font-medium text-slate-500 disabled:opacity-40"
                >
                  Clear Response
                </button>
              </div>
            </div>

            <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              {/* Row 1 on mobile: Prev / Next + Clear + Mark */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigatePrevious();
                  }}
                  disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigateNext();
                  }}
                  disabled={currentSectionIndex === sections.length - 1 && currentQuestionIndex === currentSectionQuestions.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearResponse} disabled={!selectedAnswer}>
                  Clear
                </Button>
                <Button
                  variant={markedForReview ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleMarkForReview}
                  disabled={isSaving}
                >
                  <Flag className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{markedForReview ? 'Marked' : 'Mark for Review'}</span>
                  <span className="sm:hidden">{markedForReview ? 'Marked' : 'Review'}</span>
                </Button>
              </div>

              {/* Save & Next always visible */}
              <Button
                size="sm"
                onClick={isLastQuestion ? handleSaveAndSubmitPrompt : handleSaveAndNext}
                disabled={isSaving || !hasSelectedAnswer}
                className={`w-full sm:w-auto${!hasSelectedAnswer && !isSaving ? ' opacity-60 cursor-not-allowed' : ''}`}
              >
                {isSaving ? 'Saving...' : isLastQuestion ? 'End Exam' : 'Save & Next'}
              </Button>
            </div>
          </div>

          <div className="hidden lg:block space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 sticky top-24">
              <h3 className="font-semibold mb-4">Question Palette</h3>

              <div className="flex p-1 bg-muted/50 rounded-xl mb-6">
                <button
                  onClick={() => setPaletteViewMode('section')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${paletteViewMode === 'section' ? 'bg-white text-primary shadow-sm border border-slate-200' : 'text-muted-foreground'
                    }`}
                >
                  Section-wise
                </button>
                <button
                  onClick={() => setPaletteViewMode('overall')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${paletteViewMode === 'overall' ? 'bg-white text-primary shadow-sm border border-slate-200' : 'text-muted-foreground'
                    }`}
                >
                  Overall
                </button>
              </div>

              {paletteViewMode === 'section' ? (
                <>
                  <div className="mb-4">
                    <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{getLocalizedSectionName(currentSection)}</p>
                    <p className="text-xs text-muted-foreground">
                      {sectionCounts.answered} Attempted • {sectionCounts.notAnswered} Unattempted • {sectionCounts.marked} Marked
                    </p>
                  </div>

                  <div className="grid grid-cols-5 gap-2.5 mb-6">
                    {currentSectionQuestions.map((q, idx) => {
                      const paletteStatus = q.status;

                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            silentSave();
                            setCurrentQuestionIndex(idx);
                          }}
                          className={`aspect-square rounded-lg border-2 font-medium text-sm transition-all ${idx === currentQuestionIndex
                            ? 'ring-2 ring-primary ring-offset-2'
                            : ''
                            } ${statusColors[paletteStatus]}`}
                        >
                          {q.question_number ?? (idx + 1)}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-7 mb-6 max-h-[420px] overflow-y-auto px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {sections.map((section, sIdx) => {
                    const sectionQs = getSectionQuestions(section, liveQuestions);
                    if (sectionQs.length === 0) return null;

                    return (
                      <div key={section.id} className="space-y-4">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
                          {getLocalizedSectionName(section)}
                        </p>
                        <div className="grid grid-cols-5 gap-3">
                          {sectionQs.map((q, qIdx) => {
                            const paletteStatus = q.status;
                            const isCurrent = sIdx === currentSectionIndex && qIdx === currentQuestionIndex;

                            return (
                              <button
                                key={q.id}
                                onClick={() => {
                                  silentSave();
                                  setCurrentSectionIndex(sIdx);
                                  setCurrentQuestionIndex(qIdx);
                                }}
                                className={`aspect-square rounded-lg border-2 font-medium text-sm transition-all focus:outline-none ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''
                                  } ${statusColors[paletteStatus]}`}
                              >
                                {q.question_number ?? qIdx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2 text-sm mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-600" />
                    <span>Attempted</span>
                  </div>
                  <span className="font-medium">{counts.answered}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-orange-100 border-2 border-orange-600" />
                    <span>Unattempted</span>
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
                className="w-full h-11 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold shadow-lg shadow-orange-100 transition-all active:scale-[0.98]"
                onClick={() => setShowSubmitConfirm(true)}
              >
                Submit Exam
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showMobilePalette && (
        <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
            <button
              onClick={() => setShowMobilePalette(false)}
              className="rounded-full p-2 hover:bg-slate-100 -ml-2"
            >
              <ChevronLeft className="h-5 w-5 text-slate-700" />
            </button>
            <h2 className="text-[17px] font-bold text-slate-900">Filters</h2>
          </div>

          <div className="p-3 bg-slate-50 border-b border-slate-100">
            <div className="flex p-1 bg-slate-200/60 rounded-xl">
              <button
                onClick={() => setPaletteViewMode('section')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${paletteViewMode === 'section' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'
                  }`}
              >
                Section-wise
              </button>
              <button
                onClick={() => setPaletteViewMode('overall')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${paletteViewMode === 'overall' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'
                  }`}
              >
                Overall
              </button>
            </div>
          </div>

          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between text-[13px] font-medium text-slate-500 overflow-x-auto gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span> Attempted
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span> Unattempted
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span> Unseen
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Marked
            </div>
          </div>

          <div className="flex-1 overflow-y-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {paletteViewMode === 'section' ? (
              sections.map((section, sectionIdx) => {
                const mobileQuestions = getSectionQuestions(section, liveQuestions);
                const sectionStats = getQuestionCounts(mobileQuestions);

                return (
                  <details key={section.id} open={sectionIdx === currentSectionIndex} className="group border-b border-slate-100">
                    <summary className="flex flex-col gap-3 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-[15px]">{getLocalizedSectionName(section)}</span>
                        <ChevronLeft className="h-4 w-4 text-slate-500 rotate-180 group-open:rotate-90 transition-transform" />
                      </div>
                      <div className="flex items-center gap-6 text-sm font-semibold">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="w-2 h-2 rounded-full bg-green-600"></span> {sectionStats.answered}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="w-2 h-2 rounded-full bg-orange-600"></span> {sectionStats.notAnswered}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="w-2 h-2 rounded-full bg-slate-200"></span> {sectionStats.notVisited}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="w-2 h-2 rounded-full bg-purple-600"></span> {sectionStats.marked}
                        </div>
                      </div>
                    </summary>
                    <div className="px-4 pb-5 pt-1">
                      <div className="grid grid-cols-5 gap-2.5">
                        {mobileQuestions.map((q, idx) => {
                          const paletteStatus = q.status;
                          return (
                            <button
                              key={q.id}
                              onClick={() => {
                                setCurrentSectionIndex(sectionIdx);
                                setCurrentQuestionIndex(idx);
                                setShowMobilePalette(false);
                              }}
                              className={`aspect-square rounded-lg border text-sm font-medium ${statusColors[paletteStatus]} ${sectionIdx === currentSectionIndex && idx === currentQuestionIndex ? 'ring-2 ring-primary ring-offset-1' : ''
                                }`}
                            >
                              {q.question_number ?? idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                );
              })
            ) : (
              <div className="flex flex-col pb-24">
                {sections.map((section, sectionIdx) => {
                  const mobileQuestions = getSectionQuestions(section, liveQuestions);
                  if (mobileQuestions.length === 0) return null;

                  return (
                    <div key={section.id} className="border-b border-slate-100 last:border-0 p-5">
                      <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-4 px-0.5">
                        {getLocalizedSectionName(section)}
                      </h3>
                      <div className="grid grid-cols-5 gap-3">
                        {mobileQuestions.map((q, idx) => {
                          const paletteStatus = q.status;
                          return (
                            <button
                              key={q.id}
                              onClick={() => {
                                setCurrentSectionIndex(sectionIdx);
                                setCurrentQuestionIndex(idx);
                                setShowMobilePalette(false);
                              }}
                              className={`aspect-square rounded-lg border text-sm font-medium ${statusColors[paletteStatus]} ${sectionIdx === currentSectionIndex && idx === currentQuestionIndex ? 'ring-2 ring-primary ring-offset-1' : ''
                                }`}
                            >
                              {q.question_number ?? idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}



      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={navigatePrevious}
            disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleMarkForReview}
            disabled={isSaving}
            className={`flex-1 h-10 rounded-xl border text-sm font-medium ${markedForReview
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-slate-200 bg-white text-slate-600'
              }`}
          >
            {markedForReview ? 'Marked for Review' : 'Mark as Review'}
          </button>
          <button
            type="button"
            onClick={isLastQuestion ? handleSaveAndSubmitPrompt : handleSaveAndNext}
            disabled={isSaving}
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : isLastQuestion ? 'Save & Submit' : 'Save & Next'}
          </button>
          <button
            type="button"
            onClick={navigateNext}
            disabled={currentSectionIndex === sections.length - 1 && currentQuestionIndex === currentSectionQuestions.length - 1}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 pt-6 pb-4 md:px-10 md:pt-10 md:pb-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900 leading-none">Confirm Submission</h3>
                  <p className="text-slate-500 text-xs mt-1 font-medium italic">Please review your performance before finalizing.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="rounded-full bg-blue-500 p-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                  </div>
                  <p className="text-[13px] text-blue-800 leading-relaxed font-medium">
                    Are you sure you want to submit the exam? You won't be able to change your answers after submission.
                  </p>
                </div>

                <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar px-1">
                  {sections.map((section) => {
                    const sectionQs = getSectionQuestions(section, liveQuestions);
                    const stats = getQuestionCounts(sectionQs);

                    return (
                      <div key={section.id} className="rounded-xl border border-slate-100 bg-slate-50/50 flex items-center hover:bg-slate-100/50 transition-colors py-2.5">
                        {/* Section Name - Aligns with first overview box (Total Questions) */}
                        <div className="w-1/5 shrink-0 pl-4 border-r border-slate-200/50">
                          <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest truncate leading-none">
                            {getLocalizedSectionName(section)}
                          </p>
                          <span className="text-[9px] font-bold text-slate-500 mt-1 block">
                            {sectionQs.length} Questions
                          </span>
                        </div>

                        {/* Status Grid - Aligns with 2nd, 3rd, 4th, 5th boxes */}
                        <div className="flex-1 flex items-center">
                          <div className="w-1/4 flex flex-col items-center justify-center border-r border-slate-200/50">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              <span className="text-sm font-black text-slate-900">{stats.answered}</span>
                            </div>
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Attempted</span>
                          </div>

                          <div className="w-1/4 flex flex-col items-center justify-center border-r border-slate-200/50">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                              <span className="text-sm font-black text-slate-900">{stats.notAnswered}</span>
                            </div>
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Unattempted</span>
                          </div>

                          <div className="w-1/4 flex flex-col items-center justify-center border-r border-slate-200/50">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                              <span className="text-sm font-black text-slate-900">{stats.marked}</span>
                            </div>
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Marked</span>
                          </div>

                          <div className="w-1/4 flex flex-col items-center justify-center">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span className="text-sm font-black text-slate-900">{stats.notVisited}</span>
                            </div>
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Not Seen</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-5 gap-3 py-1">
                  <div className="flex flex-col items-center p-2.5 bg-blue-50/80 rounded-xl border border-blue-100 shadow-sm">
                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">Total Questions</span>
                    <span className="text-lg font-black text-blue-700 leading-none mt-1">{questions.length}</span>
                  </div>
                  <div className="flex flex-col items-center p-2.5 bg-green-50/80 rounded-xl border border-green-100 shadow-sm">
                    <span className="text-[9px] font-bold text-green-600 uppercase tracking-tighter">Total Attempted</span>
                    <span className="text-lg font-black text-green-700 leading-none mt-1">{counts.answered}</span>
                  </div>
                  <div className="flex flex-col items-center p-2.5 bg-orange-50/80 rounded-xl border border-orange-100 shadow-sm">
                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tighter">Total Unattempted</span>
                    <span className="text-lg font-black text-orange-700 leading-none mt-1">{counts.notAnswered + counts.notVisited}</span>
                  </div>
                  <div className="flex flex-col items-center p-2.5 bg-purple-50/80 rounded-xl border border-purple-100 shadow-sm">
                    <span className="text-[9px] font-bold text-purple-600 uppercase tracking-tighter">Total Marked</span>
                    <span className="text-lg font-black text-purple-700 leading-none mt-1">{counts.marked}</span>
                  </div>
                  <div className="flex flex-col items-center p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Not Seen</span>
                    <span className="text-lg font-black text-slate-700 leading-none mt-1">{counts.notVisited}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-5 md:px-8 md:py-6 flex gap-4 border-t border-slate-100">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-white hover:border-slate-300 shadow-sm"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={isSubmitting}
              >
                <X className="h-4.5 w-4.5 mr-2 stroke-[2.5px]" />
                Go Back
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold shadow-lg shadow-orange-200 transition-all active:scale-[0.98]"
                onClick={handleSubmitExam}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="h-4.5 w-4.5 mr-2 stroke-[2.5px]" />
                {isSubmitting ? 'Submitting...' : 'Submit Exam'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
