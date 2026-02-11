"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ExamDetailPage } from '@/components/pages/ExamDetailPage';
import ModernSubcategoryPage from '@/components/pages/ModernSubcategoryPage';
import NewCategoryPage from '@/components/pages/NewCategoryPage';

const apiBase = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : '';

const buildApiUrl = (path: string) => {
  const p = path.startsWith('/') ? path : `/${path}`;
  return apiBase ? `${apiBase}${p}` : `/api/v1${p}`;
};

/**
 * SmartResolver: For 1-segment URLs with hyphens, we need to determine if it's
 * a combined category-subcategory slug (e.g., ssc-cgl) or just a category slug
 * that happens to contain hyphens. We try the backend /resolve endpoint first.
 */
function SmartResolver({ slug, tabSlug }: { slug: string; tabSlug?: string }) {
  const [resolved, setResolved] = useState<'subcategory' | 'category' | null>(null);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      try {
        const res = await fetch(buildApiUrl(`/taxonomy/resolve/${slug.toLowerCase()}`));
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.id) {
            if (!cancelled) setResolved('subcategory');
            return;
          }
        }
      } catch {}
      // Not a combined slug — try as category
      if (!cancelled) setResolved('category');
    };
    resolve();
    return () => { cancelled = true; };
  }, [slug]);

  if (resolved === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (resolved === 'subcategory') {
    return <ModernSubcategoryPage combinedSlug={slug} initialTabSlug={tabSlug} />;
  }

  return <NewCategoryPage categorySlug={slug} initialTabSlug={tabSlug} />;
}

export default function DynamicPage() {
  const params = useParams();
  const slugArray = params.slug as string[];
  const safeArray = Array.isArray(slugArray) ? slugArray : [slugArray];

  // 3 segments: /categorySlug/subcategorySlug/examSlug  →  Exam detail
  if (safeArray.length === 3) {
    const urlPath = `/${safeArray.join('/')}`;
    return <ExamDetailPage urlPath={urlPath} />;
  }

  // 2 segments: could be /combinedSlug/tabSlug OR /categorySlug/tabSlug
  if (safeArray.length === 2) {
    const [first, second] = safeArray;
    if (first?.includes('-')) {
      // Could be combined category-subcategory slug with tab, use smart resolver
      return <SmartResolver slug={first} tabSlug={second} />;
    }
    // No hyphen in first segment: it's a plain category slug with a tab slug
    return <NewCategoryPage categorySlug={first} initialTabSlug={second} />;
  }

  // 1 segment with hyphen: could be combined slug OR hyphenated category slug
  if (safeArray.length === 1 && safeArray[0]?.includes('-')) {
    return <SmartResolver slug={safeArray[0]} />;
  }

  // 1 segment without hyphen: plain category slug (e.g., /ssc)
  if (safeArray.length === 1 && safeArray[0]) {
    return <NewCategoryPage categorySlug={safeArray[0]} />;
  }

  return null;
}
