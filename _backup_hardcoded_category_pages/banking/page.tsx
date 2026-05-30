import type { Metadata } from 'next';
import ServerPageContent from '../[...slug]/ServerPageContent';
import type { ServerPageData } from '../[...slug]/page';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const SITE_URL = 'https://bharatmock.com';
const OG_IMAGE = `${SITE_URL}/assets/login_banner_image.jpg`;

export const metadata: Metadata = {
  title: {
    absolute: 'Banking Exam Mock Tests 2026 — IBPS PO, SBI PO, RBI | BharatMock',
  },
  description:
    'Free mock tests for IBPS PO, SBI PO, SBI Clerk, RBI Grade B, RBI Assistant and all banking exams. Start free today.',
  alternates: { canonical: `${SITE_URL}/banking` },
  openGraph: {
    title: 'Banking Exam Mock Tests 2026 — IBPS PO, SBI PO, RBI | BharatMock',
    description:
      'Free mock tests for IBPS PO, SBI PO, SBI Clerk, RBI Grade B, RBI Assistant and all banking exams. Start free today.',
    url: `${SITE_URL}/banking`,
    type: 'website',
    siteName: 'BharatMock',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Banking Exams — BharatMock' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Banking Exam Mock Tests 2026 — IBPS PO, SBI PO, RBI | BharatMock',
    description:
      'Free mock tests for IBPS PO, SBI PO, SBI Clerk, RBI Grade B, RBI Assistant and all banking exams.',
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

async function fetchBankingData(): Promise<ServerPageData> {
  try {
    const catRes = await fetch(`${API_BASE}/taxonomy/category/banking`, {
      next: { revalidate: 3600 },
    });
    if (!catRes.ok) return {};
    const catData = await catRes.json();
    const categoryId: string | undefined = catData?.data?.id;
    if (!categoryId) return { categoryInfo: catData.data };

    const [contentRes, subRes] = await Promise.all([
      fetch(`${API_BASE}/category-page-content/${categoryId}`, { next: { revalidate: 3600 } }),
      fetch(`${API_BASE}/taxonomy/subcategories?category_id=${categoryId}`, {
        next: { revalidate: 3600 },
      }),
    ]);

    const pageContentData = contentRes.ok ? await contentRes.json() : null;
    const subcategories = subRes.ok ? ((await subRes.json())?.data ?? []) : [];

    return { categoryInfo: catData.data, categoryId, pageContentData, subcategories };
  } catch {
    return {};
  }
}

export default async function BankingPage() {
  const serverPageData = await fetchBankingData();
  return (
    <ServerPageContent
      slugArray={['banking']}
      firstSegmentType="category"
      serverPageData={serverPageData}
      activeTabSlug={undefined}
    />
  );
}
