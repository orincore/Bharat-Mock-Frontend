import { Exam } from '@/types';

export const formatExamSummary = (exam: Pick<Exam, 'category' | 'total_questions' | 'total_marks' | 'duration'>) => {
  const parts: string[] = [];

  if (exam.category) parts.push(exam.category);
  if (exam.total_questions) parts.push(`${exam.total_questions} Qs`);
  if (exam.total_marks) parts.push(`${exam.total_marks} Marks`);
  if (exam.duration) parts.push(`${exam.duration} mins`);

  return parts.length ? parts.join(' • ') : 'Mock test overview';
};
