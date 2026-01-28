// Exam Types
export interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number;
  total_marks: number;
  total_questions: number;
  category: string;
  category_id?: string;
  subcategory?: string;
  subcategory_id?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  difficulty_id?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'anytime';
  start_date?: string | null;
  end_date?: string | null;
  pass_percentage: number;
  is_free: boolean;
  price: number;
  image_url?: string;
  logo_url?: string;
  thumbnail_url?: string;
  negative_marking: boolean;
  negative_mark_value: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  slug?: string;
  url_path?: string;
  syllabus?: string[];
  attempts?: number;
  allow_anytime?: boolean;
  exam_type?: 'past_paper' | 'mock_test' | 'short_quiz';
  show_in_mock_tests?: boolean;
  supports_hindi?: boolean;
}

export interface ExamHistoryEntry {
  attemptId: string;
  examId: string;
  examTitle: string;
  category: string;
  status: 'in-progress' | 'completed' | 'upcoming';
  startedAt: string;
  updatedAt: string;
  score?: number;
  totalMarks?: number;
  percentage?: number;
  timeSpent?: number;
  resumeAllowed?: boolean;
}

export interface Section {
  id: string;
  exam_id: string;
  name: string;
  name_hi?: string;
  total_questions: number;
  marks_per_question: number;
  duration?: number;
  section_order: number;
  created_at: string;
  updated_at: string;
}

// Question Types
export type QuestionType = 'single' | 'multiple' | 'truefalse' | 'numerical';

export interface Question {
  id: string;
  exam_id: string;
  section_id: string;
  type: QuestionType;
  text: string;
  text_hi?: string;
  marks: number;
  negative_marks: number;
  explanation?: string;
  explanation_hi?: string;
  image_url?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_order?: number;
  options?: Option[];
  created_at: string;
  updated_at: string;
}

export interface Option {
  id: string;
  question_id: string;
  option_text: string;
  option_text_hi?: string;
  is_correct: boolean;
  option_order: number;
  image_url?: string;
  imageUrl?: string;
  created_at: string;
}

export interface UserAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer: string | null;
  is_correct?: boolean;
  marks_obtained: number;
  time_taken: number;
  marked_for_review: boolean;
  created_at: string;
  updated_at: string;
}

// Result Types
export interface Result {
  id: string;
  attempt_id: string;
  exam_id: string;
  user_id: string;
  score: number;
  total_marks: number;
  percentage: number;
  correct_answers: number;
  wrong_answers: number;
  unattempted: number;
  time_taken: number;
  rank?: number;
  total_participants?: number;
  status: 'pass' | 'fail';
  is_published: boolean;
  created_at: string;
  updated_at: string;
  examTitle?: string;
  submittedAt?: string;
}

export interface SectionAnalysis {
  id: string;
  result_id: string;
  section_id: string;
  score: number;
  total_marks: number;
  correct_answers: number;
  wrong_answers: number;
  unattempted: number;
  accuracy: number;
  time_taken: number;
  created_at: string;
  sectionName?: string;
}

// College Types
export interface College {
  id: string;
  name: string;
  location: string;
  type: 'government' | 'private' | 'deemed';
  ranking?: number;
  rating?: number;
  image_url?: string;
  logo_url?: string;
  established?: number;
  overview?: string;
  website?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  accreditations?: string[];
  facilities?: string[];
  fees?: CollegeFee[];
  cutoffs?: Cutoff[];
  placements?: Placement;
}

export interface CollegeFee {
  id: string;
  college_id: string;
  course: string;
  fee: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Cutoff {
  id: string;
  college_id: string;
  exam: string;
  year: number;
  category: string;
  rank: number;
  created_at: string;
}

export interface Placement {
  id: string;
  college_id: string;
  average_package?: number;
  highest_package?: number;
  placement_percentage?: number;
  top_recruiters?: string[];
  created_at: string;
  updated_at: string;
}

// Course Types
export interface Course {
  id: string;
  name: string;
  duration: string;
  level: 'undergraduate' | 'postgraduate' | 'diploma' | 'certificate';
  description?: string;
  average_salary?: number;
  image_url?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  eligibility?: string[];
  career_prospects?: string[];
  top_colleges?: string[];
}

// Article Types
export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  author_id: string;
  category: string;
  image_url?: string;
  read_time?: number;
  views: number;
  is_published: boolean;
  published_at?: string;
  meta_title?: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
  author?: Author;
  tags?: string[];
}

export interface Author {
  id: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  date_of_birth?: string;
  role: 'user' | 'admin';
  is_verified: boolean;
  is_blocked: boolean;
  is_onboarded?: boolean;
  auth_provider?: 'email' | 'google';
  password_hash?: string;
  created_at: string;
  updated_at: string;
  education?: Education;
  preferences?: UserPreferences;
}

export interface Education {
  id: string;
  user_id: string;
  level?: string;
  institution?: string;
  year?: number;
  percentage?: number;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  notifications: boolean;
  newsletter: boolean;
  exam_reminders: boolean;
  created_at: string;
  updated_at: string;
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
  level?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
