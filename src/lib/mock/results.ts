import { Result } from '@/types';

export const mockResults: Result[] = [
  {
    id: 'r1',
    examId: '1',
    examTitle: 'JEE Main 2024 - Mock Test',
    userId: 'user1',
    score: 185,
    totalMarks: 300,
    percentage: 61.67,
    correctAnswers: 52,
    wrongAnswers: 18,
    unattempted: 20,
    timeTaken: 10200, // 170 minutes in seconds
    submittedAt: '2024-01-20T14:30:00Z',
    rank: 1234,
    totalParticipants: 15234,
    sectionWiseAnalysis: [
      {
        sectionId: 'physics',
        sectionName: 'Physics',
        score: 68,
        totalMarks: 120,
        correctAnswers: 18,
        wrongAnswers: 5,
        unattempted: 7,
        accuracy: 78.26,
        timeTaken: 3400
      },
      {
        sectionId: 'chemistry',
        sectionName: 'Chemistry',
        score: 56,
        totalMarks: 120,
        correctAnswers: 15,
        wrongAnswers: 7,
        unattempted: 8,
        accuracy: 68.18,
        timeTaken: 3200
      },
      {
        sectionId: 'mathematics',
        sectionName: 'Mathematics',
        score: 61,
        totalMarks: 120,
        correctAnswers: 19,
        wrongAnswers: 6,
        unattempted: 5,
        accuracy: 76.00,
        timeTaken: 3600
      }
    ],
    status: 'pass'
  },
  {
    id: 'r2',
    examId: '2',
    examTitle: 'NEET 2024 - Full Length Test',
    userId: 'user1',
    score: 520,
    totalMarks: 720,
    percentage: 72.22,
    correctAnswers: 135,
    wrongAnswers: 25,
    unattempted: 20,
    timeTaken: 11400, // 190 minutes
    submittedAt: '2024-01-18T16:00:00Z',
    rank: 856,
    totalParticipants: 23456,
    sectionWiseAnalysis: [
      {
        sectionId: 'physics',
        sectionName: 'Physics',
        score: 130,
        totalMarks: 180,
        correctAnswers: 34,
        wrongAnswers: 6,
        unattempted: 5,
        accuracy: 85.00,
        timeTaken: 2800
      },
      {
        sectionId: 'chemistry',
        sectionName: 'Chemistry',
        score: 140,
        totalMarks: 180,
        correctAnswers: 37,
        wrongAnswers: 5,
        unattempted: 3,
        accuracy: 88.10,
        timeTaken: 2600
      },
      {
        sectionId: 'biology',
        sectionName: 'Biology',
        score: 250,
        totalMarks: 360,
        correctAnswers: 64,
        wrongAnswers: 14,
        unattempted: 12,
        accuracy: 82.05,
        timeTaken: 6000
      }
    ],
    status: 'pass'
  }
];

export const getResultById = (id: string): Result | undefined => {
  return mockResults.find(result => result.id === id);
};

export const getResultsByUserId = (userId: string): Result[] => {
  return mockResults.filter(result => result.userId === userId);
};

export const getResultByExamId = (examId: string, userId: string): Result | undefined => {
  return mockResults.find(result => result.examId === examId && result.userId === userId);
};
