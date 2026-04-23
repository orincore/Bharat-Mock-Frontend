import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Current Affairs 2026 for All Govt Exams: Latest News & Updates',
  description: 'Stay updated with daily current affairs for all government exams. Get latest news, important updates, and boost your exam preparation.',
  keywords: 'Current affairs, current affairs today current affairs in india, current affairs in hindi current affairs quiz, latest current affairs monthly current affairs',
  alternates: { canonical: 'https://bharatmock.com/current-affairs' },
  openGraph: {
    title: 'Current Affairs 2026 for All Govt Exams: Latest News & Updates',
    description: 'Stay updated with daily current affairs for all government exams. Get latest news, important updates, and boost your exam preparation.',
    url: 'https://bharatmock.com/current-affairs',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Current Affairs 2026 for All Govt Exams: Latest News & Updates',
    description: 'Stay updated with daily current affairs for all government exams. Get latest news, important updates, and boost your exam preparation.',
  },
};

export default function CurrentAffairsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
