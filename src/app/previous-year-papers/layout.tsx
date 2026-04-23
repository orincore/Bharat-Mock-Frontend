import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Latest Previous Year Question Papers for All Government Exams',
  description: 'Practice previous year question papers for SSC, Banking, Railway & Police exams with detailed solutions to improve accuracy & understand exam patterns.',
  keywords: 'SSC previous year question paper, bank previous year question paper railway previous year question paper, bank exam previous year question paper police bharti previous year question paper, ssc exam previous year question paper',
  alternates: { canonical: 'https://bharatmock.com/previous-year-papers' },
  openGraph: {
    title: 'Latest Previous Year Question Papers for All Government Exams',
    description: 'Practice previous year question papers for SSC, Banking, Railway & Police exams with detailed solutions to improve accuracy & understand exam patterns.',
    url: 'https://bharatmock.com/previous-year-papers',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Latest Previous Year Question Papers for All Government Exams',
    description: 'Practice previous year question papers for SSC, Banking, Railway & Police exams with detailed solutions to improve accuracy & understand exam patterns.',
  },
};

export default function PreviousYearPapersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
