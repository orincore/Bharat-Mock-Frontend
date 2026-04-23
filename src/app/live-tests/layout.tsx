import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Practice, Analyze, and Improve with Live Tests for Govt Exams',
  description: 'Take live mock tests for government exams and experience a real live exam environment while getting detailed insights to track progress, and improve accuracy.',
  keywords: 'live test, live exam, live mock test, online live quiz, ssc live test',
  alternates: { canonical: 'https://bharatmock.com/live-tests' },
  openGraph: {
    title: 'Practice, Analyze, and Improve with Live Tests for Govt Exams',
    description: 'Take live mock tests for government exams and experience a real live exam environment while getting detailed insights to track progress, and improve accuracy.',
    url: 'https://bharatmock.com/live-tests',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Practice, Analyze, and Improve with Live Tests for Govt Exams',
    description: 'Take live mock tests for government exams and experience a real live exam environment while getting detailed insights to track progress, and improve accuracy.',
  },
};

export default function LiveTestsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
