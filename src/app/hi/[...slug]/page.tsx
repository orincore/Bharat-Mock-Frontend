import type { Metadata } from 'next';
import OriginalPage, { generateMetadata as originalMeta } from '@/app/[...slug]/page';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string[] }> }
): Promise<Metadata> {
  const { slug } = await params;
  return originalMeta({ params: Promise.resolve({ slug }) });
}

export default async function HiSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  // Resolve params here and pass a fresh Promise to avoid issues with
  // Promise sharing between nested Server Component calls in Next.js 15+.
  const { slug } = await params;
  return OriginalPage({ params: Promise.resolve({ slug }) });
}
