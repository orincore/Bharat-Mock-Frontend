"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  AlertCircle, Clock, ChevronLeft, ChevronRight, Flag,
  CheckCircle2, Circle, AlertTriangle, FileText, X, CheckCheck, List, Pause,
  Maximize2, Minimize2, Languages,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/common/LoadingStates';
import { examService } from '@/lib/api/examService';
import { Exam, Question, Section } from '@/types';
import { MathRenderer } from '@/components/common/MathRenderer';
import { getOptimizedImageUrl } from '@/lib/utils/imageUrl';
import { useAuth } from '@/context/AuthContext';

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
  onAutoSubmit,
  onTimeUpdate
}: {
  initialTime: number;
  isRunning: boolean;
  onAutoSubmit: () => void;
  onTimeUpdate?: (time: number) => void;
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
        const next = prev - 1;
        if (onTimeUpdate) onTimeUpdate(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const h = Math.floor(time / 3600);
  const m = Math.floor((time % 3600) / 60);
  const s = time % 60;
  const fTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return (
    <div className={`flex items-center gap-2 px-4 h-9 rounded-full font-mono font-bold shadow-sm ${time < 300 && time > 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-50 border border-slate-200 text-slate-700'
      }`}>
      <Clock className="h-4 w-4 shrink-0" />
      <span className="text-[13px] tracking-wide whitespace-nowrap">Time {fTime}</span>
    </div>
  );
};
const MobileExamTimer = ({ initialTime, isRunning, onTimeUpdate }: { initialTime: number, isRunning: boolean, onTimeUpdate?: (time: number) => void }) => {
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
        const next = prev - 1;
        if (onTimeUpdate) onTimeUpdate(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, onTimeUpdate]);

  const h = Math.floor(time / 3600);
  const m = Math.floor((time % 3600) / 60);
  const s = time % 60;
  const fTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return <>{fTime}</>;
};

export default function ExamAttemptPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = params?.id as string;
  const attemptId = params?.attemptId as string;

  const isFastLoad = searchParams?.get('fast') === 'true';

  // Fixed Hydration: Initialize with static server-safe values
  const [exam, setExam] = useState<Exam | null>(null);
  const [resumeAttempts, setResumeAttempts] = useState<any[]>([]);
  const [sections, setSections] = useState<SectionWithQuestions[]>([]);
  const [questions, setQuestions] = useState<QuestionWithStatus[]>([]);
  const [allSections, setAllSections] = useState<SectionWithQuestions[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuestionWithStatus[]>([]);

  const urlSection = parseInt(searchParams?.get('section') || '0');
  const urlQuestion = parseInt(searchParams?.get('question') || '0');
  const isStarted = searchParams?.get('started') === 'true';
  const urlTransLang = searchParams?.get('trans') || '';
  const [googleTranslateLang, setGoogleTranslateLang] = useState(urlTransLang);
  const googleTranslateActive = Boolean(googleTranslateLang);

  const requestedLanguage = searchParams?.get('lang') || 'en';
  const hasLangInUrl = searchParams?.has('lang');

  const [currentSectionIndex, setCurrentSectionIndex] = useState(urlSection);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(urlQuestion);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(requestedLanguage);
  const [isAgreed, setIsAgreed] = useState(false);
  const [languageSelectionMade, setLanguageSelectionMade] = useState(hasLangInUrl);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Restore state from cache silently to avoid hydration flicker where possible
  useEffect(() => {
    if (isFastLoad) {
      const cachedExam = sessionStorage.getItem(`exam_${examId}`);
      const cachedSections = sessionStorage.getItem(`sections_${attemptId}`);
      if (cachedExam && cachedSections) {
        const parsedExam = JSON.parse(cachedExam);
        setExam(parsedExam);
        setSections(JSON.parse(cachedSections));

        // Timer recovery: session time has priority over exam meta duration
        const cachedTime = sessionStorage.getItem(`timer_${attemptId}`);
        const defaultTime = (parsedExam.duration || 0) * 60;
        setInitialTime(cachedTime ? parseInt(cachedTime) : defaultTime);

        // Check if we were in full screen to offer recovery
        const wasFS = sessionStorage.getItem('wasFullScreen') === 'true';
        if (wasFS) {
          // We'll show a recovery overlay since browser needs a click to re-enter FS
          setShowFSRecovery(true);
        }

        // We'll still fetch to be safe, but we set isLoading to false if we have cache
        setIsLoading(false);
      }
    }
  }, [isFastLoad, examId, attemptId]);

  const [showFSRecovery, setShowFSRecovery] = useState(false);

  // Trigger AI Translation on mount or if language changes
  useEffect(() => {
    if (googleTranslateLang) {
      const initTranslation = () => {
        // Force re-scan Google Translate internal state
        if (typeof (window as any).googleTranslateElementInit === 'function') {
          try { (window as any).googleTranslateElementInit(); } catch (e) { }
        }

        const select = document.querySelector('select.goog-te-combo') as HTMLSelectElement;
        if (select) {
          if (select.value !== googleTranslateLang) {
            select.value = googleTranslateLang;
            select.dispatchEvent(new Event('change'));
          }
        } else {
          // Retry loop to catch the widget as it loads
          let attempts = 0;
          const int = setInterval(() => {
            const s = document.querySelector('select.goog-te-combo') as HTMLSelectElement;
            if (s) {
              if (s.value !== googleTranslateLang) {
                s.value = googleTranslateLang;
                s.dispatchEvent(new Event('change'));
              }
              clearInterval(int);
            }
            if (++attempts > 20) clearInterval(int);
          }, 800);
        }
      };
      // Wait for stability
      const timer = setTimeout(initTranslation, 1000);
      return () => clearTimeout(timer);
    }
    // Reset on unmount to prevent translation bleeding into other pages
    return () => {
      if (typeof document !== 'undefined') {
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
      }
    };
  }, [googleTranslateLang]);

  const googleLangs = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'bn', label: 'Bengali' },
    { code: 'te', label: 'Telugu' },
    { code: 'mr', label: 'Marathi' },
    { code: 'ta', label: 'Tamil' },
    { code: 'gu', label: 'Gujarati' },
    { code: 'kn', label: 'Kannada' },
    { code: 'pa', label: 'Punjabi' },
    { code: 'or', label: 'Odia' }
  ];

  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null);
  const [markedForReview, setMarkedForReview] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(!isFastLoad || !exam);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(!isStarted && !isFastLoad);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state to URL for persistence during refreshes
  useEffect(() => {
    if (showInstructions || isLoading) return;
    const params = new URLSearchParams(window.location.search);
    params.set('started', 'true');
    params.set('section', currentSectionIndex.toString());
    params.set('question', currentQuestionIndex.toString());
    params.set('lang', selectedLanguage);
    if (googleTranslateLang) {
      params.set('trans', googleTranslateLang);
    } else {
      params.delete('trans');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
  }, [currentSectionIndex, currentQuestionIndex, showInstructions, isLoading, googleTranslateLang, selectedLanguage]);

  // Load Google Translate widget once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).google?.translate?.TranslateElement) return;
    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);

    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: '',
          autoDisplay: false,
          multilanguage: true
        },
        'google_translate_element'
      );
    };
  }, []);



  useEffect(() => {
    const handleFSChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullScreen(isFS);
      sessionStorage.setItem('wasFullScreen', isFS.toString());
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const toggleFullScreen = () => {
    try {
      if (!document.fullscreenElement) {
        const docElm = document.documentElement;
        if (docElm.requestFullscreen) {
          docElm.requestFullscreen().catch(() => { });
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => { });
        }
      }
    } catch (e) {
      console.error("Fullscreen toggle failed", e);
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

  const hasContentForLanguage = useCallback((question: QuestionWithStatus, language: string) => {
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

  const filterContentByLanguage = useCallback((language: string, sourceSections: SectionWithQuestions[], sourceQuestions: QuestionWithStatus[]) => {
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
        let examData, resumeData;
        try {
          [examData, resumeData] = await Promise.all([
            examService.getExamById(examId),
            examService.getResumeAttempts(examId).catch(() => [])
          ]);
        } catch (e) {
          examData = await examService.getExamById(examId);
          resumeData = [];
        }

        setResumeAttempts(resumeData || []);

        if (!examData) {
          throw new Error('Exam not found');
        }

        setExam(examData);
        setInitialTime((examData.duration || 0) * 60);



        const questionsResponse = await examService.getExamQuestions(examId, attemptId, selectedLanguage);





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

        setSections(sectionsData);
        setQuestions(allQuestions);

        // Cache data for fast reload (translations)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`exam_${examId}`, JSON.stringify(examData));
          sessionStorage.setItem(`sections_${attemptId}`, JSON.stringify(sectionsData));
        }

        // Correct initialization of answer state for the start question from nested sections
        const startSection = sectionsData[urlSection] || sectionsData[0];
        const startQuestion = startSection?.questions[urlQuestion] || startSection?.questions[0];

        if (startQuestion?.userAnswer) {
          setSelectedAnswer(startQuestion.userAnswer.answer || null);
          setMarkedForReview(startQuestion.userAnswer.marked_for_review || false);
        }

      } catch (err: any) {
        setError(err.message || 'Failed to load exam');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [examId, attemptId, getQuestionSectionId, selectedLanguage]);

  // Reactive sync for the current answer state when moving between questions
  // NOTE: 'sections' is intentionally NOT in the dependency array. Adding it creates
  // a feedback loop: refreshSections -> setSections -> this effect fires -> overwrites
  // the just-toggled markedForReview/selectedAnswer state back to stale stored values.
  // This effect should ONLY run when the user navigates to a different question.
  useEffect(() => {
    if (showInstructions || isLoading || !sections.length) return;

    const section = sections[currentSectionIndex];
    if (!section) return;

    const question = section.questions[currentQuestionIndex];
    if (question) {
      setSelectedAnswer(question.userAnswer?.answer || null);
      setMarkedForReview(question.userAnswer?.marked_for_review || false);
      setQuestionStartTime(Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionIndex, currentQuestionIndex, showInstructions, isLoading]);

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
    const targetQuestion = getQuestionAtPosition(currentSectionIndexRef.current, currentQuestionIndexRef.current, qs);
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

  const handleSaveAndNext = async (markedOverride?: boolean) => {
    const targetQuestion = getQuestionAtPosition(currentSectionIndex, currentQuestionIndex, questionsRef.current);
    if (!targetQuestion) return;

    // Capture current answer state before navigating
    // Use markedOverride if provided to avoid stale closure issue when called right after setMarkedForReview
    const answerToSave = selectedAnswer;
    const markedToSave = markedOverride !== undefined ? markedOverride : markedForReview;
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
    // Update ref immediately so silentSave/saveAnswer read the correct value
    // (useEffect-based ref sync is async, so we must update the ref here too)
    markedForReviewRef.current = newMarked;
    setMarkedForReview(newMarked);
    updateCurrentQuestionLocally(selectedAnswer, newMarked);
    // skipStateUpdate=true because updateCurrentQuestionLocally already set the correct state
    await saveAnswer(selectedAnswer, newMarked, true);
    // Return newMarked so callers can pass it to handleSaveAndNext without stale closure issues
    return newMarked;
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

      // Force kill translator and hard-redirect
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
      window.location.href = `/results/${attemptId}`;
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

      // Force kill translator and hard-redirect
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
      window.location.href = `/results/${attemptId}`;
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

      const id = params?.id as string;
      
      // Prioritize url_path for SEO friendly redirection, fallback to id/slug logic
      const targetPath = exam?.url_path 
        ? (exam.url_path.startsWith('/') ? exam.url_path : `/${exam.url_path}`)
        : (exam?.slug ? `/${id}/${exam.slug}` : `/exams/${id}`);

      // Force kill translator on pause
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
      
      window.location.href = targetPath;
    } catch (error) {
      console.error('Failed to pause exam:', error);
      const id = params?.id as string;
      const targetPath = exam?.url_path 
        ? (exam.url_path.startsWith('/') ? exam.url_path : `/${exam.url_path}`)
        : (exam?.slug ? `/${id}/${exam.slug}` : `/exams/${id}`);
      router.push(targetPath);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLanguageSelect = useCallback((lang: 'en' | 'hi') => {
    if (!allSections.length) return;

    // For bilingual exams, we don't filter sections by language
    if (exam?.supports_hindi) {
      setSelectedLanguage(lang);
      setSections(allSections);
      setQuestions(allQuestions);
      setLanguageSelectionMade(true);
      return;
    }

    const { filteredSections, filteredQuestions } = filterContentByLanguage(lang, allSections, allQuestions);

    if (filteredSections.length === 0) {
      setError('Selected language is not available for this exam.');
      return;
    }

    setSelectedLanguage(lang);
    setSections(filteredSections);
    setQuestions(filteredQuestions);
    setLanguageSelectionMade(true);
  }, [allSections, allQuestions, filterContentByLanguage, exam?.supports_hindi]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, currentSectionIndex, showInstructions]);

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

  const handleStartExamFlow = async () => {
    requestDomFullscreen();

    // Set URL flag before dismissing instructions
    const params = new URLSearchParams(window.location.search);
    params.set('started', 'true');
    params.set('section', currentSectionIndex.toString());
    params.set('question', currentQuestionIndex.toString());
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });

    try {
      const questionsResponse = await examService.getExamQuestions(examId, attemptId, selectedLanguage);
      const normalized = sortQuestionsByNumber(questionsResponse.questions);
      const enriched: QuestionWithStatus[] = normalized.map((q: any) => {
        const hasAnswer = hasAnswerValue(q.userAnswer?.answer);
        const isMarked = q.userAnswer?.marked_for_review || false;
        let status: QuestionStatus = 'not-visited';
        if (hasAnswer && isMarked) status = 'answered-marked';
        else if (hasAnswer) status = 'answered';
        else if (isMarked) status = 'marked';
        return { ...q, status };
      });
      const sectionsData: SectionWithQuestions[] = questionsResponse.sections.map((s: any) => ({
        ...s,
        language: s.language || s.language_code || selectedLanguage,
        questions: sortQuestionsByNumber(enriched.filter(q => getQuestionSectionId(q) === s.id))
      }));
      setAllSections(sectionsData);
      setAllQuestions(enriched);
      setSections(sectionsData);
      setQuestions(enriched);
      setCurrentSectionIndex(0);
      setCurrentQuestionIndex(0);
    } catch (e) {
      // fallback — proceed with already-loaded content
    }
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

  const getLocalizedOptionText = (option: any) => {
    if (selectedLanguage === 'hi' && option.option_text_hi) {
      return option.option_text_hi;
    }
    return option.option_text || option.text || '';
  };

  if (showInstructions) {
    return (
      <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
        {/* Header - Official Branding */}
        <header className="h-10 md:h-12 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-6 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <img src="/logo.png" alt="Logo" className="h-6 md:h-7 w-auto shrink-0" />
            <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />
            <h1 className="font-black text-slate-800 tracking-tight text-[14px] md:text-[16px] truncate">Free Full Test : {exam?.title || 'SSC CGL 2025 (Tier-I)'}</h1>
          </div>
        </header>

        {/* Main Content Area - Split Layout */}
        <main className="flex-1 overflow-hidden w-full bg-white flex flex-col">
          <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
            {/* Left Content - Instructions */}
            <div className="flex-1 p-3 md:p-4 lg:p-6 space-y-2 md:space-y-3 lg:border-r lg:border-slate-100 overflow-hidden">
              <div className="max-w-4xl h-full flex flex-col">
                {/* Section Table - High-Density Precision Centered Grid */}
                <div className="w-full mb-3 overflow-x-auto bg-white shrink-0 border border-[#e8e8e8] rounded-lg">
                  <table className="w-full text-[10px] md:text-xs text-left border-collapse min-w-[450px] md:min-w-full">
                    <thead>
                      {/* Desktop header (light blue) */}
                      <tr className="hidden md:table-row bg-[#dbeafe] text-slate-700 font-semibold border-b border-slate-300">
                        <th className="px-3 py-2 border-r border-slate-300 w-12">Sl No.</th>
                        <th className="px-3 py-2 border-r border-slate-300">Section Name</th>
                        <th className="px-3 py-2 border-r border-slate-300 w-24 text-center">No. of Questions</th>
                        <th className="px-3 py-2 w-24 text-center">Maximum Marks</th>
                      </tr>
                      {/* Mobile header (light blue) */}
                      <tr className="table-row md:hidden bg-[#dbeafe] text-slate-700 font-semibold text-[10px]">
                        <th className="px-2 py-2 border border-slate-300 w-10 text-center">Sl No.</th>
                        <th className="px-2 py-2 border border-slate-300">Section Name</th>
                        <th className="px-2 py-2 border border-slate-300 text-center w-[80px]">Questions</th>
                        <th className="px-2 py-2 border border-slate-300 text-center w-[80px]">Marks</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {sections.map((section, idx) => (
                        <tr key={section.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          {/* Desktop cells */}
                          <td className="hidden md:table-cell px-3 py-2 border-b border-r border-slate-300 text-center font-medium">{idx + 1}</td>
                          <td className="hidden md:table-cell px-3 py-2 border-b border-r border-slate-300">{getLocalizedSectionName(section)}</td>
                          <td className="hidden md:table-cell px-3 py-2 border-b border-r border-slate-300 text-center">{section.totalQuestions || 0}</td>
                          <td className="hidden md:table-cell px-3 py-2 border-b border-slate-300 text-center">{(section.totalQuestions || 0) * (section.marksPerQuestion || 2)}</td>
                          {/* Mobile cells */}
                          <td className="table-cell md:hidden px-2 py-2 border border-slate-300 text-center font-semibold">{idx + 1}</td>
                          <td className="table-cell md:hidden px-2 py-2 border border-slate-300 leading-snug break-words">{getLocalizedSectionName(section)}</td>
                          <td className="table-cell md:hidden px-2 py-2 border border-slate-300 text-center">{section.totalQuestions || 0}</td>
                          <td className="table-cell md:hidden px-2 py-2 border border-slate-300 text-center">{(section.totalQuestions || 0) * (section.marksPerQuestion || 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Core Instructions */}
                <div className="space-y-2 text-[13.5px] md:text-[14.5px] text-slate-700 leading-tight">
                  <h2 className="text-[15px] md:text-[16px] font-bold text-slate-900 mb-2 border-b-2 border-[#00aeef] inline-block pb-0.5 uppercase tracking-wide">Read the following instructions carefully.</h2>

                  <div className="space-y-1.5 md:space-y-2">
                    <p className="flex gap-2">
                      <span>1.)</span>
                      <span>The test contains {sections.length} sections having {exam?.total_questions || 100} questions.</span>
                    </p>
                    <p className="flex gap-2">
                      <span>2.)</span>
                      <span>Each question has 4 options out of which only one is correct.</span>
                    </p>
                    <p className="flex gap-2">
                      <span>3.)</span>
                      <span>You have to finish the test in 60 minutes.</span>
                    </p>
                    <p className="flex gap-2">
                      <span>4.)</span>
                      <span>You will be awarded 2 marks for each correct answer and 0.5 will be deducted for each wrong answer.</span>
                    </p>
                    <p className="flex gap-2">
                      <span>5.)</span>
                      <span>There is no negative marking for the questions that you have not attempted.</span>
                    </p>
                    <p className="flex gap-2">
                      <span>6.)</span>
                      <span>You can write this test only once. Make sure that you complete the test before you submit the test and/or close the browser.</span>
                    </p>
                  </div>
                </div>

                {/* Subfooter Actions */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex-none bg-[#f1f5f9]/50 p-4 rounded-xl space-y-3">
                  <div className="space-y-2">
                    <p className="text-[14px] md:text-[15px] font-bold text-slate-900">Choose your default language:</p>
                    <div className="relative">
                      <select
                        className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-10 text-[14px] md:text-[15px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer shadow-sm"
                        value={selectedLanguage}
                        onChange={(e) => {
                          const val = e.target.value as 'en' | 'hi';
                          setSelectedLanguage(val);
                          setLanguageSelectionMade(true);
                        }}
                      >
                        <option value="en">English</option>
                        {supportsHindi && <option value="hi">Hindi</option>}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <List className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <input
                      type="checkbox"
                      id="declaration-final"
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                      checked={isAgreed}
                      onChange={(e) => setIsAgreed(e.target.checked)}
                    />
                    <label htmlFor="declaration-final" className="text-[13px] md:text-[14px] font-medium leading-relaxed text-slate-600 cursor-pointer select-none">
                      I have read all the instructions carefully and have understood them. I agree not to cheat or use unfair means in this examination. I understand that using unfair means of any sort for my own or someone else's advantage will lead to my immediate disqualification.
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Profile (desktop only) */}
            <div className="hidden lg:flex w-64 bg-[#fcfdfe] p-5 flex-col items-center border-l-2 border-[#00aeef]/30">
              <div className="space-y-3 flex flex-col items-center sticky top-6">
                <div className="h-20 w-20 rounded-full border-4 border-[#00aeef]/30 bg-[#00aeef]/10 shadow-md overflow-hidden flex items-center justify-center">
                  <div className="h-full w-full bg-[#00aeef]/10 flex items-center justify-center">
                    <div className="h-14 w-14 rounded-full bg-white flex flex-col items-center justify-center gap-1 shadow-inner relative overflow-hidden">
                      <div className="h-7 w-7 rounded-full bg-[#00aeef]/30" />
                      <div className="h-9 w-14 rounded-t-full bg-[#00aeef]/20 absolute bottom-[-4px]" />
                    </div>
                  </div>
                </div>
                <h3 className="text-[15px] md:text-[16px] font-black text-slate-800 tracking-tight uppercase tracking-widest">{user?.name || 'Candidate'}</h3>
              </div>
            </div>
          </div>
        </main>

        {/* Sticky Footer - Precision Action Buttons */}
        <footer className="h-14 md:h-16 bg-white border-t border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-lg z-20">
          <Button
            variant="outline"
            className="h-11 px-6 md:px-10 border-slate-200 text-slate-600 text-[14px] font-bold rounded-lg hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            onClick={() => router.push(`/exams/${examId}`)}
          >
            Previous
          </Button>

          <div className="flex-grow md:flex-none" />

          <Button
            onClick={handleStartExamFlow}
            disabled={!isAgreed || !languageSelectionMade}
            className={`h-11 px-8 md:px-14 text-[15px] font-black uppercase tracking-widest rounded-lg active:scale-95 transition-all shadow-md ml-6 ${isAgreed && languageSelectionMade
              ? 'bg-[#00aeef] hover:bg-[#0096ce] text-white'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
          >
            I AM READY TO BEGIN
          </Button>
        </footer>
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

  const toggleGoogleTranslate = (targetLang: string) => {
    // 1. Silent save of current progress
    silentSave();

    // 2. Cache current state for recovery (including Timer if possible)
    // The Timer in the header is separate, but we ensure we HAVE the exam data cached.
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`exam_${examId}`, JSON.stringify(exam));
      sessionStorage.setItem(`sections_${attemptId}`, JSON.stringify(sections));
    }

    // 3. Set cookie and hash
    document.cookie = `googtrans=/en/${targetLang}; path=/`;
    window.location.hash = `#googtrans(en|${targetLang})`;

    // 4. Update local state immediately for UI feedback
    const isClearing = targetLang === 'off' || targetLang === 'en' || !targetLang;
    setGoogleTranslateLang(isClearing ? '' : targetLang);

    // 2. Cache current state for recovery
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`exam_${examId}`, JSON.stringify(exam));
      sessionStorage.setItem(`sections_${attemptId}`, JSON.stringify(sections));
      sessionStorage.setItem('wasFullScreen', isFullScreen.toString());
    }

    // 3. Set cookie and hash in multiple formats for maximum compatibility
    const cookieExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toUTCString();
    const sourceLang = selectedLanguage || 'en';
    const cookieVal = `/${sourceLang}/${targetLang}`;

    // Clear potentially conflicting cookies first
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;

    // Set new cookies
    document.cookie = `googtrans=${cookieVal}; expires=${cookieExpiry}; path=/`;
    document.cookie = `googtrans=${cookieVal}; expires=${cookieExpiry}; path=/; domain=${window.location.hostname}`;
    window.location.hash = `#googtrans(${sourceLang}|${targetLang})`;

    // 4. Traditional High-Reliability Reload with slight delay for cookie propagation
    const runTrigger = () => {
      const params = new URLSearchParams(window.location.search);
      params.set('fast', 'true');
      if (!isClearing) params.set('trans', targetLang);
      else params.delete('trans');

      // Use location.replace for a clean session reset
      setTimeout(() => {
        window.location.replace(window.location.pathname + '?' + params.toString());
      }, 500);
    };

    runTrigger();
  };

  return (
    <div className="h-screen overflow-hidden bg-muted/30 relative">
      {/* Hidden Google Translate Element - Persistent outside the soft-refresh container */}
      <div id="google_translate_element" className="hidden" />

      {/* Main Content Wrapper - Controlled by soft-refresh engine to apply localized content */}
      <div className="flex flex-col h-screen overflow-hidden select-none relative bg-[#f8fafc]">
        {isLoading && isFastLoad && (
          <div className="fixed inset-0 z-[100] bg-white/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 p-4 rounded-xl shadow-lg border border-primary/20 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-xs font-bold text-primary uppercase tracking-tighter">AI Translation Syncing...</span>
            </div>
          </div>
        )}

        {showFSRecovery && (
          <div className="fixed inset-0 z-[101] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-500">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl scale-110">
              <Maximize2 className="h-12 w-12 text-primary mx-auto mb-6 animate-bounce" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">Translation Ready!</h2>
              <p className="text-sm text-slate-500 mb-8">Re-enter full screen to continue your distraction-free exam.</p>
              <Button
                onClick={() => {
                  document.documentElement.requestFullscreen();
                  setShowFSRecovery(false);
                  setIsFullScreen(true);
                }}
                className="w-full py-6 rounded-xl text-lg font-bold shadow-lg"
              >
                Resume Exam in Full Screen
              </Button>
            </div>
          </div>
        )}

        <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&family=Noto+Sans+Devanagari:wght@400;700&family=Noto+Sans+Gujarati:wght@400;700&family=Noto+Sans+Kannada:wght@400;700&family=Noto+Sans+Malayalam:wght@400;700&family=Noto+Sans+Oriya:wght@400;700&family=Noto+Sans+Tamil:wght@400;700&family=Noto+Sans+Telugu:wght@400;700&family=Noto+Sans+Gurmukhi:wght@400;700&display=swap');

        :root {
          --font-fallback: 'Noto Sans Devanagari', 'Noto Sans Bengali', 'Noto Sans Telugu', 'Noto Sans Tamil', 'Noto Sans Gujarati', 'Noto Sans Kannada', 'Noto Sans Malayalam', 'Noto Sans Gurmukhi', 'Noto Sans Oriya', sans-serif;
        }

        body {
          font-family: 'Inter', var(--font-fallback) !important;
          top: 0 !important;
        }

        .goog-te-banner-frame.skiptranslate, 
        .goog-te-gadget-icon, 
        .goog-te-gadget-simple span, 
        .goog-te-menu-value span:nth-child(3),
        .goog-te-gadget {
          display: none !important;
        }
        #google_translate_element {
          display: none !important;
        }
        .goog-text-highlight {
          background-color: transparent !important;
          box-shadow: none !important;
        }
        /* Custom scrollbar for better UX */
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>

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
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
            <div className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Exam Title */}
                <div className="min-w-0 flex-1">
                  <h1 className="font-semibold text-[15px] text-slate-800 line-clamp-1">{exam?.title}</h1>
                </div>
                {/* Center: Viewing in language */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-slate-500 font-medium">Language:</span>
                  <div className="flex items-center gap-1.5 border border-slate-300 rounded-full h-9 px-3.5 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
                    <Languages className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <select
                      value={googleTranslateLang || (selectedLanguage === 'hi' ? 'hi' : 'en')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === selectedLanguage) {
                          setGoogleTranslateLang('');
                          toggleGoogleTranslate('en');
                        } else {
                          setGoogleTranslateLang(val);
                          toggleGoogleTranslate(val);
                        }
                      }}
                      className={`appearance-none bg-transparent text-[13px] font-semibold focus:outline-none cursor-pointer notranslate ${googleTranslateLang ? 'text-blue-700' : 'text-slate-700'} pr-1`}
                    >
                      {googleLangs.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>
                {/* Right: Fullscreen + Timer + Pause */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => toggleFullScreen()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-300 bg-white text-slate-700 text-[12px] font-semibold hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
                    title={isFullScreen ? 'Exit Full Screen' : 'View Full Screen'}
                  >
                    {isFullScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    <span>{isFullScreen ? 'Exit Full Screen' : 'View Full Screen'}</span>
                  </button>
                  <ExamTimer
                    initialTime={initialTime}
                    isRunning={!showInstructions && !isLoading}
                    onAutoSubmit={handleAutoSubmit}
                    onTimeUpdate={(t) => sessionStorage.setItem(`timer_${attemptId}`, t.toString())}
                  />
                  <button
                    onClick={handlePauseExam}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#ed1c24] bg-[#ed1c24] text-white text-[12px] font-bold hover:bg-[#d11a1f] transition-all active:scale-95 disabled:opacity-50 shadow-md"
                  >
                    <Pause className="h-3.5 w-3.5 fill-white" />
                    <span>{isSaving ? 'Saving...' : 'Pause & Exit'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Mobile Palette Trigger */}
          <div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
            <Button
              onClick={() => setShowMobilePalette(true)}
              className="h-10 px-5 rounded-full bg-slate-900 border border-slate-700 text-white flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-black/20"
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
                      Time <span className="font-mono"><MobileExamTimer initialTime={initialTime} isRunning={!showInstructions && !isLoading} onTimeUpdate={(t) => sessionStorage.setItem(`timer_${attemptId}`, t.toString())} /></span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-medium truncate leading-none">
                      {getLocalizedSectionName(currentSection)} <span className="mx-1 opacity-50">•</span> {exam?.title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 items-center gap-1.5 bg-blue-50/80 rounded-lg px-2.5 border border-blue-100 shadow-sm active:bg-blue-100 transition-colors">
                    <Languages className="h-4 w-4 text-blue-600 shrink-0" />
                    <select
                      value={googleTranslateLang || (selectedLanguage === 'hi' ? 'hi' : 'en')}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Handle native vs translation properly
                        if (val === selectedLanguage) {
                          setGoogleTranslateLang('');
                          toggleGoogleTranslate('en'); // Reset to native
                        } else {
                          setGoogleTranslateLang(val);
                          toggleGoogleTranslate(val);
                        }
                      }}
                      className={`bg-transparent text-xs font-black uppercase tracking-tight focus:outline-none cursor-pointer max-w-[80px] notranslate ${googleTranslateLang ? 'text-blue-700' : 'text-slate-600'
                        }`}
                    >
                      {googleLangs.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handlePauseExam}
                    disabled={isSaving}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                    aria-label="Pause and exit"
                  >
                    <Pause className="h-4 w-4 fill-current" />
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

          <div className="flex flex-row flex-1 overflow-hidden">
            {/* Left: question content area (flex-col, account for fixed sidebar) */}
            <div className="flex-1 flex flex-col overflow-hidden lg:mr-72">

              {/* STICKY section tabs bar — does NOT scroll */}
              <div className="hidden md:flex items-center gap-2 overflow-x-auto shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                      className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-all text-left ${idx === currentSectionIndex
                        ? 'border-[#00aeef] bg-[#00aeef] text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                    >
                      <p className="font-semibold text-[13px]">{getLocalizedSectionName(section)}</p>
                      <p className="text-[11px] opacity-80">{sectionStats.answered}/{section.totalQuestions} answered</p>
                    </button>
                  );
                })}
              </div>

              {/* SCROLLABLE question + options only */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-4 md:px-6 py-4 md:py-5">
                  <div className="bg-white md:bg-card border-0 md:border border-slate-200 md:border-border rounded-none md:rounded-xl p-4 sm:p-5 md:p-6 shadow-sm">
                    {/* Question header row */}
                    <div className="mb-5">
                      <div className="hidden md:flex items-center gap-3 mb-3">
                        <span className="text-[13px] font-bold text-slate-800">Question {currentQuestion?.question_number ?? (currentQuestionIndex + 1)}</span>
                        {currentQuestion?.marks && currentQuestion.marks > 0 && (
                          <span className="text-[12px] font-semibold text-green-600">&#x2713; +{currentQuestion.marks}</span>
                        )}
                        {exam?.negative_marking && (currentQuestion?.negative_marks || exam?.negative_mark_value) > 0 && (
                          <span className="text-[12px] font-semibold text-red-500">&#x2717; -{currentQuestion?.negative_marks || exam?.negative_mark_value}</span>
                        )}
                        <div className="flex items-center gap-1.5 ml-auto text-[12px] font-medium text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Time {formatSmallTime(questionTimer)}</span>
                        </div>
                      </div>
                      <p className="text-[12px] font-semibold text-slate-700 mb-2 hidden md:block">Direction: <span className="font-normal text-slate-600">Study the question carefully.</span></p>
                      <MathRenderer
                        html={getLocalizedQuestionText(currentQuestion)}
                        className={`rich-text-content exam-question-text leading-relaxed text-[14px] md:text-[15px] font-normal text-slate-800 ${currentSection?.name?.toLowerCase().includes('english') ? 'notranslate' : ''}`}
                      />
                    </div>
                    {resolveQuestionImage(currentQuestion) && (
                      <div className="mt-5 mb-5 p-2 bg-white rounded-lg border border-slate-100 shadow-sm flex justify-center">
                        <img
                          src={resolveQuestionImage(currentQuestion)}
                          alt="Question"
                          className="max-w-3xl w-full h-auto object-contain transition-transform hover:scale-[1.01] duration-300"
                        />
                      </div>
                    )}

                    {/* Answer options - prepp.in plain style */}
                    <div className="space-y-2.5 mt-4">
                      {currentQuestion?.options?.map((option, idx) => {
                        const isSelected = currentQuestion.type === 'multiple'
                          ? Array.isArray(selectedAnswer) && (option.id ? selectedAnswer.includes(option.id) : false)
                          : selectedAnswer === option.id;

                        return (
                          <label
                            key={option.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-sm border cursor-pointer transition-all ${isSelected
                              ? 'border-slate-400 bg-white'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/30'
                              }`}
                          >
                            <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-slate-600 bg-white' : 'border-slate-400 bg-white'
                              }`}>
                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />}
                            </div>
                            <div className="flex-1 flex flex-col gap-2">
                              {resolveOptionImage(option) && (
                                <img
                                  src={resolveOptionImage(option)}
                                  alt={`Option ${String.fromCharCode(65 + idx)}`}
                                  className="max-h-64 object-contain self-start border border-slate-100 rounded p-1 bg-white"
                                />
                              )}
                              <MathRenderer
                                html={getLocalizedOptionText(option)}
                                className={`exam-option-text rich-text-content text-[13px] md:text-[14px] font-normal leading-relaxed ${isSelected ? 'text-slate-900' : 'text-slate-700'
                                  } ${currentSection?.name?.toLowerCase().includes('english') ? 'notranslate' : ''}`}
                              />
                            </div>
                            <input
                              type={currentQuestion.type === 'multiple' ? 'checkbox' : 'radio'}
                              name={`question-${currentQuestion.id}`}
                              value={option.id || ''}
                              checked={isSelected}
                              onChange={() => option.id && handleAnswerChange(option.id)}
                              className="sr-only"
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

                  {/* Essential Spacer: ensures content isn't hidden behind global action bar */}
                  <div className="h-6" aria-hidden="true" />
                </div>
              </div>
            </div>
            {/* Desktop Right Sidebar — Unified Panel like Prepp */}
            <div className="hidden lg:flex flex-col w-72 shrink-0 border-l border-slate-200 bg-white h-screen fixed top-0 right-0 overflow-hidden z-30" style={{ paddingTop: '56px' }}>


              {/* Question Palette header */}
              <div className="px-4 pt-4 border-b border-slate-200 shrink-0">
                <p className="text-[30px] font-bold text-slate-700">Question Palette</p>
              </div>

              {/* Grid / List toggle - curved pill style */}
              <div className="flex items-center justify-center border-b border-slate-200 shrink-0 h-14 px-4 bg-white">
                <div className="flex w-full bg-slate-100 p-1 rounded-full h-10 border border-slate-200 shadow-inner">
                  <button
                    onClick={() => setPaletteViewMode('section')}
                    className={`flex-1 h-full text-[11px] font-bold transition-all rounded-full flex items-center justify-center ${paletteViewMode === 'section'
                      ? 'bg-[#00aeef] text-white shadow-sm ring-1 ring-[#00aeef]/10'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                      }`}
                  >
                    Section-wise
                  </button>
                  <button
                    onClick={() => setPaletteViewMode('overall')}
                    className={`flex-1 h-full text-[11px] font-bold transition-all rounded-full flex items-center justify-center ${paletteViewMode === 'overall'
                      ? 'bg-[#00aeef] text-white shadow-sm ring-1 ring-[#00aeef]/10'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                      }`}
                  >
                    Overall
                  </button>
                </div>
              </div>

              {/* Status legend - matching mobile palette colors */}
              <div className="px-3 py-2 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-3 flex-wrap text-[11px] font-medium text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-green-100 border border-green-600 inline-block" />
                    <span>Attempted</span>
                    <span className="font-bold text-slate-800">{counts.answered}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-600 inline-block" />
                    <span>Unattempted</span>
                    <span className="font-bold text-slate-800">{counts.notAnswered}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300 inline-block" />
                    <span>Unseen</span>
                    <span className="font-bold text-slate-800">{counts.notVisited}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-purple-100 border border-purple-600 inline-block" />
                    <span>Marked</span>
                    <span className="font-bold text-slate-800">{counts.marked}</span>
                  </div>
                </div>
              </div>

              {/* Question grid - scrollable - prepp.in style */}
              <div className="flex-1 overflow-y-auto px-3 py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {paletteViewMode === 'section' ? (
                  <div className="grid grid-cols-6 gap-1.5">
                    {currentSectionQuestions.map((q, idx) => {
                      const paletteStatus = q.status;
                      const qNum = idx + 1;
                      const isCurrent = idx === currentQuestionIndex;
                      const isAnswered = paletteStatus === 'answered' || paletteStatus === 'answered-marked';
                      const isMarked = paletteStatus === 'marked' || paletteStatus === 'answered-marked';
                      const isNotAnswered = paletteStatus === 'not-answered';
                      return (
                        <button
                          key={q.id}
                          onClick={() => { silentSave(); setCurrentQuestionIndex(idx); }}
                          className={`aspect-square rounded-lg text-[12px] font-semibold transition-all flex items-center justify-center border ${isCurrent
                            ? 'bg-[#00aeef] text-white ring-2 ring-[#00aeef] ring-offset-1 border-[#00aeef]'
                            : statusColors[paletteStatus] || 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          {qNum}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {sections.map((section, sIdx) => {
                      const sectionQs = getSectionQuestions(section, liveQuestions);
                      if (sectionQs.length === 0) return null;
                      return (
                        <div key={section.id}>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-0.5">{getLocalizedSectionName(section)}</p>
                          <div className="grid grid-cols-6 gap-1.5">
                            {sectionQs.map((q, qIdx) => {
                              const paletteStatus = q.status;
                              const isCurrent = sIdx === currentSectionIndex && qIdx === currentQuestionIndex;
                              const isAnswered = paletteStatus === 'answered' || paletteStatus === 'answered-marked';
                              const isMarked2 = paletteStatus === 'marked' || paletteStatus === 'answered-marked';
                              const isNotAnswered2 = paletteStatus === 'not-answered';
                              const qNum2 = qIdx + 1;
                              return (
                                <button
                                  key={q.id}
                                  onClick={() => { silentSave(); setCurrentSectionIndex(sIdx); setCurrentQuestionIndex(qIdx); }}
                                  className={`aspect-square rounded-lg text-[12px] font-semibold transition-all flex items-center justify-center border ${isCurrent
                                    ? 'bg-[#00aeef] text-white ring-2 ring-[#00aeef] ring-offset-1 border-[#00aeef]'
                                    : (statusColors as any)[paletteStatus] || 'bg-slate-100 text-slate-600 border-slate-300 hover:border-slate-400'
                                    }`}
                                >
                                  {qNum2}
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

              {/* Instructions / Questions tabs + Submit */}
              <div className="border-t border-slate-200 shrink-0">


                {/* Submit Test - matching height and shadow with global action bar */}
                <div className="px-3 border-t border-slate-200 shrink-0 h-14 flex items-center justify-center bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
                  <Button
                    className="w-full h-9 rounded-lg bg-[#f7941d] hover:bg-[#e6891a] text-white font-bold text-sm shadow-sm"
                    onClick={() => setShowSubmitConfirm(true)}
                  >
                    Submit Exam
                  </Button>
                </div>
              </div>
            </div>
            {/* END flex row */}
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



          {/* Global Action Bar - prepp.in style with 4 buttons - shown on all screens */}
          <div className="fixed bottom-0 left-0 right-0 lg:right-72 z-40 border-t border-slate-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-center h-16 px-2 md:px-6 gap-1.5 md:gap-4">
              {/* Previous */}
              <Button
                onClick={navigatePrevious}
                disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
                className="h-9 px-3 md:px-6 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] disabled:opacity-40 disabled:bg-slate-700 shrink-0 flex items-center justify-center min-w-[40px] md:min-w-[120px]"
              >
                <ChevronLeft className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Previous</span>
                <span className="md:hidden">Prev</span>
              </Button>

              <div className="flex items-center justify-center gap-1.5 md:gap-4 px-0">
                {/* Clear Response */}
                <Button
                  variant="outline"
                  onClick={handleClearResponse}
                  disabled={!selectedAnswer}
                  className="h-9 px-2 md:px-5 rounded-full border border-slate-300 text-slate-700 font-semibold text-[12px] md:text-[13px] hover:bg-slate-50 disabled:opacity-40 shadow-sm flex items-center justify-center min-w-[40px]"
                  title="Clear Response"
                >
                  <X className="h-3.5 w-3.5 md:mr-1.5" />
                  <span className="hidden md:inline">Clear Response</span>
                  <span className="md:hidden">Clear</span>
                </Button>

                {/* Mark for Review */}
                <Button
                  variant="outline"
                  onClick={async () => {
                    const newMarked = await handleMarkForReview();
                    if (newMarked && !isLastQuestion) {
                      await handleSaveAndNext(newMarked);
                    }
                  }}
                  disabled={isSaving}
                  className={`h-9 px-2 md:px-5 rounded-full border font-semibold text-[12px] md:text-[13px] transition-all shadow-sm flex items-center justify-center min-w-[40px] ${markedForReview
                    ? 'border-purple-400 bg-purple-50 text-purple-700 hover:bg-purple-100'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  title="Mark for Review"
                >
                  <Flag className={`h-3.5 w-3.5 md:mr-1.5 ${markedForReview ? 'fill-purple-500 text-purple-500' : ''}`} />
                  <span className="hidden md:inline">Mark for Review</span>
                  <span className="md:hidden">Mark</span>
                </Button>
              </div>

              {/* Next / Save & Next */}
              <Button
                onClick={() => isLastQuestion ? handleSaveAndSubmitPrompt() : handleSaveAndNext()}
                disabled={isSaving}
                className="h-9 px-4 md:px-8 rounded-full bg-[#00aeef] hover:bg-[#0099d4] text-white font-bold text-[12px] md:text-[13px] transition-all active:scale-[0.98] shadow-md hover:shadow-lg disabled:opacity-50 shrink-0 flex items-center justify-center min-w-[80px]"
              >
                <div className="flex items-center">
                  <span className="truncate">
                    {isSaving ? 'Saving...' : isLastQuestion ? 'Submit' : selectedAnswer ? (
                      <>
                        <span className="hidden md:inline">Save & Next</span>
                        <span className="md:hidden">Save & Next</span>
                      </>
                    ) : 'Next'}
                  </span>
                  {!isLastQuestion && <ChevronRight className="h-4 w-4 ml-1" />}
                </div>
              </Button>
            </div>
          </div>

          {showSubmitConfirm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white w-full max-w-4xl rounded-2xl md:rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="px-5 pt-5 pb-3 md:px-10 md:pt-10 md:pb-6 overflow-y-auto">
                  <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-5">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg md:text-xl font-bold text-slate-900 leading-none">Confirm Submission</h3>
                      <p className="text-slate-500 text-[10px] md:text-xs mt-1 font-medium italic">Please review your performance before finalizing.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-3">
                      <div className="rounded-full bg-blue-500 p-0.5 shrink-0">
                        <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                      </div>
                      <p className="text-[12px] md:text-[13px] text-blue-800 leading-relaxed font-medium">
                        Are you sure you want to submit? You won't be able to change your answers after this.
                      </p>
                    </div>

                    <div className="space-y-2 max-h-[300px] md:max-h-[500px] overflow-y-auto pr-2 custom-scrollbar px-1">
                      {sections.map((section) => {
                        const sectionQs = getSectionQuestions(section, liveQuestions);
                        const stats = getQuestionCounts(sectionQs);

                        return (
                          <div key={section.id} className="rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center hover:bg-slate-100/50 transition-colors py-2 md:py-2.5">
                            {/* Section Name */}
                            <div className="w-full md:w-1/5 shrink-0 px-4 py-1.5 md:py-0 md:border-r border-slate-200/50 flex md:flex-col justify-between md:justify-center items-center md:items-start">
                              <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest truncate leading-none">
                                {getLocalizedSectionName(section)}
                              </p>
                              <span className="text-[9px] font-bold text-slate-500 mt-0.5">
                                {sectionQs.length} Questions
                              </span>
                            </div>

                            {/* Status Grid */}
                            <div className="flex-1 flex items-center py-2 md:py-0">
                               <div className="w-1/4 flex flex-col items-center justify-center border-r border-slate-200/50">
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                  <span className="text-[13px] md:text-sm font-black text-slate-900">{stats.answered}</span>
                                </div>
                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Attempted</span>
                              </div>

                              <div className="w-1/4 flex flex-col items-center justify-center border-r border-slate-200/50">
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                  <span className="text-[13px] md:text-sm font-black text-slate-900">{stats.notAnswered}</span>
                                </div>
                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Unanswered</span>
                              </div>

                              <div className="w-1/4 flex flex-col items-center justify-center border-r border-slate-200/50">
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                  <span className="text-[13px] md:text-sm font-black text-slate-900">{stats.marked}</span>
                                </div>
                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Marked</span>
                              </div>

                              <div className="w-1/4 flex flex-col items-center justify-center">
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  <span className="text-[13px] md:text-sm font-black text-slate-900">{stats.notVisited}</span>
                                </div>
                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Not Seen</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 py-1">
                      <div className="flex flex-col items-center p-2 md:p-2.5 bg-blue-50/80 rounded-xl border border-blue-100 shadow-sm">
                        <span className="text-[8px] md:text-[9px] font-bold text-blue-600 uppercase tracking-tighter">Total Questions</span>
                        <span className="text-base md:text-lg font-black text-blue-700 leading-none mt-1">{questions.length}</span>
                      </div>
                      <div className="flex flex-col items-center p-2 md:p-2.5 bg-green-50/80 rounded-xl border border-green-100 shadow-sm">
                        <span className="text-[8px] md:text-[9px] font-bold text-green-600 uppercase tracking-tighter">Total Attempted</span>
                        <span className="text-base md:text-lg font-black text-green-700 leading-none mt-1">{counts.answered}</span>
                      </div>
                      <div className="col-span-1 flex flex-col items-center p-2 md:p-2.5 bg-orange-50/80 rounded-xl border border-orange-100 shadow-sm">
                        <span className="text-[8px] md:text-[9px] font-bold text-orange-600 uppercase tracking-tighter">Total Unattempted</span>
                        <span className="text-base md:text-lg font-black text-orange-700 leading-none mt-1">{counts.notAnswered + counts.notVisited}</span>
                      </div>
                      <div className="flex flex-col items-center p-2 md:p-2.5 bg-purple-50/80 rounded-xl border border-purple-100 shadow-sm">
                        <span className="text-[8px] md:text-[9px] font-bold text-purple-600 uppercase tracking-tighter">Total Marked</span>
                        <span className="text-base md:text-lg font-black text-purple-700 leading-none mt-1">{counts.marked}</span>
                      </div>
                      <div className="col-span-2 md:col-span-1 flex flex-col items-center p-2 md:p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Not Seen</span>
                        <span className="text-base md:text-lg font-black text-slate-700 leading-none mt-1">{counts.notVisited}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 px-5 py-4 md:px-8 md:py-6 flex flex-col sm:flex-row gap-3 md:gap-4 border-t border-slate-100 mt-auto">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 md:h-12 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-white hover:border-slate-300 shadow-sm"
                    onClick={() => setShowSubmitConfirm(false)}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4 mr-2 stroke-[2.5px]" />
                    Go Back
                  </Button>
                  <Button
                    className="flex-1 h-11 md:h-12 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold shadow-lg shadow-orange-200 transition-all active:scale-[0.98]"
                    onClick={handleSubmitExam}
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2 stroke-[2.5px]" />
                    {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

