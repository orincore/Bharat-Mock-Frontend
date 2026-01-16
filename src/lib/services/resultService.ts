import { Result, UserAnswer, Question } from '@/types';
import { mockResults, getResultById, getResultsByUserId, getResultByExamId } from '@/lib/mock/results';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const resultService = {
  async getResultById(id: string): Promise<Result | null> {
    await delay(200);
    return getResultById(id) || null;
  },
  
  async getResultsByUserId(userId: string): Promise<Result[]> {
    await delay(300);
    return getResultsByUserId(userId);
  },
  
  async getResultByExamId(examId: string, userId: string): Promise<Result | null> {
    await delay(200);
    return getResultByExamId(examId, userId) || null;
  },
  
  async calculateResult(
    examId: string,
    questions: Question[],
    userAnswers: UserAnswer[],
    timeTaken: number
  ): Promise<Result> {
    await delay(500);
    
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let totalScore = 0;
    
    const sectionScores: Record<string, {
      correct: number;
      wrong: number;
      unattempted: number;
      score: number;
      totalMarks: number;
      timeTaken: number;
    }> = {};
    
    questions.forEach(question => {
      const userAnswer = userAnswers.find(ua => ua.questionId === question.id);
      
      if (!sectionScores[question.sectionId]) {
        sectionScores[question.sectionId] = {
          correct: 0,
          wrong: 0,
          unattempted: 0,
          score: 0,
          totalMarks: 0,
          timeTaken: 0
        };
      }
      
      sectionScores[question.sectionId].totalMarks += question.marks;
      
      if (!userAnswer || userAnswer.answer === null) {
        sectionScores[question.sectionId].unattempted++;
      } else {
        sectionScores[question.sectionId].timeTaken += userAnswer.timeTaken;
        
        const isCorrect = checkAnswer(question, userAnswer.answer);
        
        if (isCorrect) {
          correctAnswers++;
          totalScore += question.marks;
          sectionScores[question.sectionId].correct++;
          sectionScores[question.sectionId].score += question.marks;
        } else {
          wrongAnswers++;
          if (question.negativeMarks) {
            totalScore -= question.negativeMarks;
            sectionScores[question.sectionId].score -= question.negativeMarks;
          }
          sectionScores[question.sectionId].wrong++;
        }
      }
    });
    
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const unattempted = questions.length - correctAnswers - wrongAnswers;
    const percentage = (totalScore / totalMarks) * 100;
    
    const sectionWiseAnalysis = Object.entries(sectionScores).map(([sectionId, data]) => ({
      sectionId,
      sectionName: sectionId.charAt(0).toUpperCase() + sectionId.slice(1),
      score: Math.max(0, data.score),
      totalMarks: data.totalMarks,
      correctAnswers: data.correct,
      wrongAnswers: data.wrong,
      unattempted: data.unattempted,
      accuracy: data.correct + data.wrong > 0 
        ? (data.correct / (data.correct + data.wrong)) * 100 
        : 0,
      timeTaken: data.timeTaken
    }));
    
    const result: Result = {
      id: `r${Date.now()}`,
      examId,
      examTitle: 'Mock Exam',
      userId: 'user1',
      score: Math.max(0, totalScore),
      totalMarks,
      percentage: Math.max(0, percentage),
      correctAnswers,
      wrongAnswers,
      unattempted,
      timeTaken,
      submittedAt: new Date().toISOString(),
      rank: Math.floor(Math.random() * 5000) + 1,
      totalParticipants: Math.floor(Math.random() * 10000) + 5000,
      sectionWiseAnalysis,
      status: percentage >= 40 ? 'pass' : 'fail'
    };
    
    return result;
  }
};

function checkAnswer(
  question: Question, 
  userAnswer: string | string[] | number
): boolean {
  if (question.type === 'multiple') {
    if (!Array.isArray(userAnswer) || !Array.isArray(question.correctAnswer)) {
      return false;
    }
    const sortedUser = [...userAnswer].sort();
    const sortedCorrect = [...question.correctAnswer].sort();
    return JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
  }
  
  if (question.type === 'numerical') {
    return Number(userAnswer) === Number(question.correctAnswer);
  }
  
  return userAnswer === question.correctAnswer;
}
