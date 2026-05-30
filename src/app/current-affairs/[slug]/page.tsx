import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CurrentAffairsDetailClient from './CurrentAffairsDetailClient';
import { blogService } from '@/lib/api/blogService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bharatmock.com').replace(/\/$/, '');

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await blogService.getBlogBySlug(slug);
    if (!article) return { title: 'Current Affairs' };
    const canonicalUrl = `${SITE_URL}/current-affairs/${slug}`;
    const title = article.meta_title || article.title;
    const description = article.meta_description || article.excerpt;
    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: article.og_title || article.title,
        description: article.og_description || article.excerpt,
        url: canonicalUrl,
        type: 'article',
        siteName: 'BharatMock',
        images: article.featured_image_url
          ? [{ url: article.featured_image_url, width: 1200, height: 630, alt: title }]
          : [{ url: `${SITE_URL}/assets/login_banner_image.jpg`, width: 1200, height: 630 }],
      },
      twitter: {
        card: 'summary_large_image',
        title: article.og_title || article.title,
        description: article.og_description || article.excerpt,
        images: article.featured_image_url
          ? [article.featured_image_url]
          : [`${SITE_URL}/assets/login_banner_image.jpg`],
      },
    };
  } catch {
    return { title: 'Current Affairs' };
  }
}

export default async function CurrentAffairsDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let article = null;
  let sections: any[] = [];

  try {
    article = await blogService.getBlogBySlug(slug);
    if (!article) notFound();
    if (!article.is_current_affairs_note) notFound();
    sections = await blogService.getBlogContent(article.id);
  } catch {
    // Render client component with null — it will retry client-side
  }

  return (
    <CurrentAffairsDetailClient
      slug={slug}
      initialArticle={article}
      initialSections={sections}
    />
  );
}
