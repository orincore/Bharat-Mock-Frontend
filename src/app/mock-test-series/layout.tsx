import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mock Test Series with Chapter and Topic Wise Papers',
  description: 'Free Mock Tests for SSC, Banking, Railway, Police & All Govt Exams 2026. Practice full-length, chapter-wise tests & previous year papers to boost your score.',
  keywords: 'SSC mock test, bank mock test, railway mock test, police test question paper ssc test series, online mock test for ssc, bank test series, ssc mock test in hindi,  police bharti question paper online test',
  alternates: { canonical: 'https://bharatmock.com/mock-test-series' },
  openGraph: {
    title: 'Mock Test Series with Chapter and Topic Wise Papers',
    description: 'Free Mock Tests for SSC, Banking, Railway, Police & All Govt Exams 2026. Practice full-length, chapter-wise tests & previous year papers to boost your score.',
    url: 'https://bharatmock.com/mock-test-series',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mock Test Series with Chapter and Topic Wise Papers',
    description: 'Free Mock Tests for SSC, Banking, Railway, Police & All Govt Exams 2026. Practice full-length, chapter-wise tests & previous year papers to boost your score.',
  },
};

export default function MockTestSeriesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
