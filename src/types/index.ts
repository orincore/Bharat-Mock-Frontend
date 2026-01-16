// Exam Types
export interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  totalMarks: number;
  totalQuestions: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'upcoming' | 'ongoing' | 'completed';
  startDate: string;
  endDate: string;
  syllabus: string[];
  pattern: ExamPattern;
  image?: string;
  attempts?: number;
  passPercentage: number;
}

export interface ExamPattern {
  sections: Section[];
  negativeMarking: boolean;
  negativeMarkValue?: number;
}

export interface Section {
  id: string;
  name: string;
  totalQuestions: number;
  marksPerQuestion: number;
  duration?: number;
}

// Question Types
export type QuestionType = 'single' | 'multiple' | 'truefalse' | 'numerical';

export interface Question {
  id: string;
  examId: string;
  sectionId: string;
  type: QuestionType;
  text: string;
  options?: Option[];
  correctAnswer: string | string[] | number;
  marks: number;
  negativeMarks?: number;
  explanation?: string;
  image?: string;
}

export interface Option {
  id: string;
  text: string;
}

export interface UserAnswer {
  questionId: string;
  answer: string | string[] | number | null;
  markedForReview: boolean;
  timeTaken: number; // in seconds
}

// Result Types
export interface Result {
  id: string;
  examId: string;
  examTitle: string;
  userId: string;
  score: number;
  totalMarks: number;
  percentage: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  timeTaken: number; // in seconds
  submittedAt: string;
  rank?: number;
  totalParticipants?: number;
  sectionWiseAnalysis: SectionAnalysis[];
  status: 'pass' | 'fail';
}

export interface SectionAnalysis {
  sectionId: string;
  sectionName: string;
  score: number;
  totalMarks: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  accuracy: number;
  timeTaken: number;
}

// College Types
export interface College {
  id: string;
  name: string;
  location: string;
  type: 'government' | 'private' | 'deemed';
  ranking: number;
  rating: number;
  image: string;
  logo?: string;
  established: number;
  accreditation: string[];
  courses: string[];
  overview: string;
  fees: FeeStructure;
  eligibility: string[];
  cutoffs: Cutoff[];
  placements: Placement;
  facilities: string[];
  website?: string;
}

export interface FeeStructure {
  minFee: number;
  maxFee: number;
  currency: string;
  details: { course: string; fee: number }[];
}

export interface Cutoff {
  exam: string;
  year: number;
  category: string;
  rank: number;
}

export interface Placement {
  averagePackage: number;
  highestPackage: number;
  placementPercentage: number;
  topRecruiters: string[];
}

// Course Types
export interface Course {
  id: string;
  name: string;
  duration: string;
  level: 'undergraduate' | 'postgraduate' | 'diploma' | 'certificate';
  description: string;
  eligibility: string[];
  careerProspects: string[];
  averageSalary: number;
  topColleges: string[];
  image?: string;
}

// Article Types
export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: Author;
  category: string;
  tags: string[];
  image: string;
  publishedAt: string;
  readTime: number;
  views?: number;
}

export interface Author {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  dateOfBirth?: string;
  education?: Education;
  preferences?: UserPreferences;
  createdAt: string;
}

export interface Education {
  level: string;
  institution: string;
  year: number;
  percentage?: number;
}

export interface UserPreferences {
  notifications: boolean;
  newsletter: boolean;
  examReminders: boolean;
}

// Common Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterOptions {
  search?: string;
  category?: string;
  status?: string;
  difficulty?: string;
  location?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
