import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get in Touch with BharatMock | Exam Support & Assistance',
  description: 'Contact BharatMock for help with exam support, mock tests, and test-related queries. Get quick support and resolve your issues easily.',
  alternates: { canonical: 'https://bharatmock.com/contact' },
  openGraph: {
    title: 'Get in Touch with BharatMock | Exam Support & Assistance',
    description: 'Contact BharatMock for help with exam support, mock tests, and test-related queries. Get quick support and resolve your issues easily.',
    url: 'https://bharatmock.com/contact',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Get in Touch with BharatMock | Exam Support & Assistance',
    description: 'Contact BharatMock for help with exam support, mock tests, and test-related queries. Get quick support and resolve your issues easily.',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
