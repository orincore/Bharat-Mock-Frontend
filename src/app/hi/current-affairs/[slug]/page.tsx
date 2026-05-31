import type { Metadata } from 'next';
import OriginalPage, { generateMetadata as originalMeta } from '@/app/current-affairs/[slug]/page';

// Locale-prefixed alias for the current-affairs detail page (see hi/blogs/[slug] for why).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  return originalMeta({ params: Promise.resolve({ slug }) });
}

export default async function HiCurrentAffairsDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  return OriginalPage({ params: Promise.resolve({ slug }) });
}
