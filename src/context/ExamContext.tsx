"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Question, Exam } from '@/types';

type LocalUserAnswer = {
  questionId: string;
  answer: string | string[] | number | null;
  markedForReview: boolean;
  timeTaken: number;
};

interface ExamContextType {
  currentExam: Exam | null;
  questions: Question[];
  userAnswers: LocalUserAnswer[];
  currentQuestionIndex: number;
  currentSectionId: string | null;
  timeRemaining: number;
  isExamStarted: boolean;
  isExamSubmitted: boolean;
  setCurrentExam: (exam: Exam) => void;
  setQuestions: (questions: Question[]) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setCurrentSectionId: (sectionId: string) => void;
  setTimeRemaining: (time: number) => void;
  setAnswer: (questionId: string, answer: string | string[] | number | null) => void;
  toggleMarkForReview: (questionId: string) => void;
  startExam: () => void;
  submitExam: () => void;
  resetExam: () => void;
  getQuestionStatus: (questionId: string) => 'unanswered' | 'answered' | 'marked' | 'answered-marked';
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export function ExamProvider({ children }: { children: ReactNode }) {
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<LocalUserAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [isExamSubmitted, setIsExamSubmitted] = useState(false);

  const setAnswer = useCallback((questionId: string, answer: string | string[] | number | null) => {
    setUserAnswers(prev => {
      const existingIndex = prev.findIndex(ua => ua.questionId === questionId);
      const existing = prev[existingIndex];

      const newAnswer: LocalUserAnswer = {
        questionId,
        answer,
        markedForReview: existing?.markedForReview || false,
        timeTaken: existing?.timeTaken || 0
      };
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newAnswer;
        return updated;
      }
      
      return [...prev, newAnswer];
    });
  }, []);

  const toggleMarkForReview = useCallback((questionId: string) => {
    setUserAnswers(prev => {
      const existingIndex = prev.findIndex(ua => ua.questionId === questionId);
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          markedForReview: !updated[existingIndex].markedForReview
        };
        return updated;
      }
      
      return [...prev, {
        questionId,
        answer: null,
        markedForReview: true,
        timeTaken: 0
      }];
    });
  }, []);

  const startExam = useCallback(() => {
    setIsExamStarted(true);
    setIsExamSubmitted(false);
    if (currentExam) {
      setTimeRemaining(currentExam.duration * 60);
    }
  }, [currentExam]);

  const submitExam = useCallback(() => {
    setIsExamSubmitted(true);
    setIsExamStarted(false);
  }, []);

  const resetExam = useCallback(() => {
    setCurrentExam(null);
    setQuestions([]);
    setUserAnswers([]);
    setCurrentQuestionIndex(0);
    setCurrentSectionId(null);
    setTimeRemaining(0);
    setIsExamStarted(false);
    setIsExamSubmitted(false);
  }, []);

  const getQuestionStatus = useCallback((questionId: string): 'unanswered' | 'answered' | 'marked' | 'answered-marked' => {
    const answer = userAnswers.find(ua => ua.questionId === questionId);
    
    if (!answer) return 'unanswered';
    
    const hasAnswer = answer.answer !== null && 
      (Array.isArray(answer.answer) ? answer.answer.length > 0 : true);
    
    if (hasAnswer && answer.markedForReview) return 'answered-marked';
    if (hasAnswer) return 'answered';
    if (answer.markedForReview) return 'marked';
    
    return 'unanswered';
  }, [userAnswers]);

  return (
    <ExamContext.Provider
      value={{
        currentExam,
        questions,
        userAnswers,
        currentQuestionIndex,
        currentSectionId,
        timeRemaining,
        isExamStarted,
        isExamSubmitted,
        setCurrentExam,
        setQuestions,
        setCurrentQuestionIndex,
        setCurrentSectionId,
        setTimeRemaining,
        setAnswer,
        toggleMarkForReview,
        startExam,
        submitExam,
        resetExam,
        getQuestionStatus
      }}
    >
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  const context = useContext(ExamContext);
  if (context === undefined) {
    throw new Error('useExam must be used within an ExamProvider');
  }
  return context;
}
