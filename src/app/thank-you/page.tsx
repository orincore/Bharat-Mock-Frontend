import type { Metadata } from 'next';
import ThankYouClient from './ThankYouClient';

export const metadata: Metadata = {
  title: 'Thank You — BharatMock',
  description: 'Thank you for subscribing to BharatMock Premium.',
  robots: { index: false, follow: false },
  alternates: {
    canonical: 'https://bharatmock.com/thank-you',
  },
};

export const dynamic = 'force-dynamic';

export default function ThankYouPage() {
  return <ThankYouClient />;
}
