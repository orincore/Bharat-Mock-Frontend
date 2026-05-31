import type { Metadata } from 'next';
import OriginalPage, { generateMetadata as originalMeta } from '@/app/blogs/[slug]/page';

// Locale-prefixed alias for the blog detail page. Without this, /hi/blogs/<slug>
// 404s: the literal `blogs/` segment routes into src/app/hi/blogs/ (which only has
// the listing page), so the hi/[...slug] catch-all never sees it.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  return originalMeta({ params: Promise.resolve({ slug }) });
}

export default async function HiBlogDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  return OriginalPage({ params: Promise.resolve({ slug }) });
}
