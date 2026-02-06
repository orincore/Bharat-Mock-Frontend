// Exam Types
export interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number;
  total_marks: number;
  totalMarks?: number;
  total_questions: number;
  totalQuestions?: number;
  category: string;
  category_id?: string;
  subcategory?: string;
  subcategory_id?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  difficulty_id?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'anytime';
  start_date?: string | null;
  end_date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  pass_percentage: number;
  passPercentage?: number;
  is_free: boolean;
  price: number;
  image_url?: string;
  image?: string;
  logo_url?: string;
  thumbnail_url?: string;
  negative_marking: boolean;
  negative_mark_value: number;
  negativeMarking?: boolean;
  negativeMarkValue?: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  slug?: string;
  url_path?: string;
  syllabus?: string[];
  pattern?: ExamPattern;
  attempts?: number;
  allow_anytime?: boolean;
  exam_type?: 'past_paper' | 'mock_test' | 'short_quiz';
  show_in_mock_tests?: boolean;
  supports_hindi?: boolean;
}

export interface ExamPattern {
  sections: ExamPatternSection[];
  negative_marking?: boolean;
  negativeMarking?: boolean;
  negative_mark_value?: number;
  negativeMarkValue?: number;
}

export interface ExamPatternSection {
  id: string;
  name: string;
  name_hi?: string;
  total_questions?: number;
  totalQuestions?: number;
  marks_per_question?: number;
  marksPerQuestion?: number;
  duration?: number;
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
  exam_id?: string;
  examId?: string;
  section_id?: string;
  sectionId?: string;
  type: QuestionType;
  text: string;
  text_hi?: string;
  marks: number;
  negative_marks?: number;
  negativeMarks?: number;
  explanation?: string;
  explanation_hi?: string;
  image_url?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  question_order?: number;
  question_number?: number;
  options?: Option[];
  correctAnswer?: string | string[] | number;
  created_at?: string;
  updated_at?: string;
}

export interface Option {
  id?: string;
  question_id?: string;
  option_text?: string;
  text?: string;
  option_text_hi?: string;
  is_correct?: boolean;
  option_order?: number;
  image_url?: string;
  imageUrl?: string;
  created_at?: string;
}

export interface UserAnswer {
  id: string;
  attempt_id: string;
  attemptId?: string;
  question_id: string;
  questionId?: string;
  answer: string | null;
  is_correct?: boolean;
  isCorrect?: boolean;
  marks_obtained: number;
  marksObtained?: number;
  time_taken: number;
  timeTaken?: number;
  marked_for_review: boolean;
  markedForReview?: boolean;
  created_at: string;
  updated_at: string;
}

// Result Types
export interface Result {
  id: string;
  attempt_id?: string;
  attemptId?: string;
  exam_id?: string;
  examId?: string;
  user_id?: string;
  userId?: string;
  score: number;
  total_marks?: number;
  totalMarks?: number;
  percentage: number;
  correct_answers?: number;
  correctAnswers?: number;
  wrong_answers?: number;
  wrongAnswers?: number;
  unattempted: number;
  time_taken?: number;
  timeTaken?: number;
  rank?: number;
  total_participants?: number;
  totalParticipants?: number;
  status: 'pass' | 'fail';
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
  examTitle?: string;
  submittedAt?: string;
  sectionWiseAnalysis?: any[];
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
  image?: string;
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
  eligibility?: string[];
  courses?: string[];
  fees?: CollegeFee[] | CollegeFeeBreakdown;
  fees_summary?: {
    minFee: number;
    maxFee: number;
    currency?: string;
  };
  cutoffs?: Cutoff[];
  placements?: Placement;
}

export interface CollegeFee {
  id: string;
  college_id: string;
  course: string;
  fee: number;
  currency?: string;
  created_at: string;
  updated_at: string;
}

export interface CollegeFeeBreakdown {
  minFee?: number;
  maxFee?: number;
  currency?: string;
  details?: CollegeFeeDetail[];
}

export interface CollegeFeeDetail {
  program?: string;
  course?: string;
  fee: number;
  duration?: string;
  currency?: string;
}

export interface Cutoff {
  id?: string;
  college_id?: string;
  exam: string;
  year: number;
  category: string;
  rank: number;
  created_at?: string;
}

export interface Placement {
  id?: string;
  college_id?: string;
  average_package?: number;
  highest_package?: number;
  placement_percentage?: number;
  top_recruiters?: string[];
  averagePackage?: number;
  highestPackage?: number;
  placementPercentage?: number;
  topRecruiters?: string[];
  created_at?: string;
  updated_at?: string;
}

// Course Types
export interface Course {
  id: string;
  name: string;
  duration: string;
  level: 'undergraduate' | 'postgraduate' | 'diploma' | 'certificate';
  description?: string;
  average_salary?: number;
  averageSalary?: number;
  image_url?: string;
  image?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  eligibility?: string[];
  career_prospects?: string[];
  careerProspects?: string[];
  top_colleges?: string[];
  topColleges?: string[];
  subjects?: string[];
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
  image?: string;
  image_url?: string;
  readTime?: number;
  read_time?: number;
  views: number;
  is_published: boolean;
  publishedAt?: string;
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
  avatar?: string;
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
  is_premium?: boolean;
  subscription_plan_id?: string | null;
  subscription_expires_at?: string | null;
  subscription_auto_renew?: boolean;
  subscription_plan?: SubscriptionPlanSummary | null;
}

export interface SubscriptionPlanSummary {
  id: string;
  name: string;
  description?: string | null;
  duration_days: number;
  price_cents: number;
  currency_code: string;
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
  subcategory?: string;
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
