import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Attempt and Practice Topic Wise Quizzes for All Government Exams',
  description: 'Practice topic-wise quizzes for all government exams. Improve accuracy, strengthen concepts, and track your performance with smart practice.',
  keywords: 'SSC quiz, banking quiz, ssc english quiz banking quiz questions, Railway quiz, Police quiz',
  alternates: { canonical: 'https://bharatmock.com/quizzes' },
  openGraph: {
    title: 'Attempt and Practice Topic Wise Quizzes for All Government Exams',
    description: 'Practice topic-wise quizzes for all government exams. Improve accuracy, strengthen concepts, and track your performance with smart practice.',
    url: 'https://bharatmock.com/quizzes',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Attempt and Practice Topic Wise Quizzes for All Government Exams',
    description: 'Practice topic-wise quizzes for all government exams. Improve accuracy, strengthen concepts, and track your performance with smart practice.',
  },
};

export default function QuizzesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
