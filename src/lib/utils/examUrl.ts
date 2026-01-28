import { Exam } from '@/types';

export const getExamUrl = (exam: Pick<Exam, 'url_path' | 'slug' | 'id'>) => {
  if (exam?.url_path) return exam.url_path;
  if (exam?.slug) return `/exams/${exam.slug}`;
  return `/exams/${exam?.id}`;
};
