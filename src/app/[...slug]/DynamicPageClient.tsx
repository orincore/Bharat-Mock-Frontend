"use client";

import { useEffect, useState } from 'react';
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

type ResolvedType = 'subcategory' | 'category' | null;

function SlugResolver({ slug, tabSlug }: { slug: string; tabSlug?: string }) {
  const [resolved, setResolved] = useState<ResolvedType>(null);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      try {
        const res = await fetch(buildApiUrl(`/taxonomy/subcategory/${slug.toLowerCase()}`));
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.id) {
            if (!cancelled) setResolved('subcategory');
            return;
          }
        }
      } catch { /* not a subcategory */ }
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
    return <ModernSubcategoryPage subcategorySlug={slug} initialTabSlug={tabSlug} />;
  }

  return <NewCategoryPage categorySlug={slug} initialTabSlug={tabSlug} />;
}

const KNOWN_TAB_SLUGS = new Set([
  'overview',
  'mock-tests',
  'previous-papers',
  'question-papers'
]);

type TwoSegmentResolved = 'exam' | 'subcategory-tab' | 'category-tab' | null;

function TwoSegmentResolver({ first, second }: { first: string; second: string }) {
  const [resolved, setResolved] = useState<TwoSegmentResolved>(null);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      const isKnownTab = KNOWN_TAB_SLUGS.has(second.toLowerCase());

      try {
        const examPath = `/${first}/${second}`;
        const examRes = await fetch(buildApiUrl(`/exams/path${examPath}`));
        if (examRes.ok) {
          const examData = await examRes.json();
          if (examData?.data?.id) {
            if (!cancelled) setResolved('exam');
            return;
          }
        }
      } catch { /* not an exam */ }

      try {
        const subRes = await fetch(buildApiUrl(`/taxonomy/subcategory/${first.toLowerCase()}`));
        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData?.data?.id) {
            if (isKnownTab) {
              if (!cancelled) setResolved('subcategory-tab');
              return;
            }
            try {
              const contentRes = await fetch(buildApiUrl(`/page-content/${subData.data.id}`));
              if (contentRes.ok) {
                const contentData = await contentRes.json();
                const customTabs = contentData?.customTabs || [];
                const normalize = (value: string) =>
                  value.toString().toLowerCase().trim()
                    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                const targetSlug = normalize(second);
                const isCustomTab = customTabs.some((tab: any) => {
                  const tabSlug = normalize(tab?.tab_key || tab?.title || '');
                  return tabSlug === targetSlug;
                });
                if (isCustomTab) {
                  if (!cancelled) setResolved('subcategory-tab');
                  return;
                }
              }
            } catch { /* ignore */ }
            if (!cancelled) setResolved('exam');
            return;
          }
        }
      } catch { /* not a subcategory */ }

      try {
        const catRes = await fetch(buildApiUrl(`/taxonomy/category/${first.toLowerCase()}`));
        if (catRes.ok) {
          const catData = await catRes.json();
          if (catData?.data?.id) {
            if (!cancelled) setResolved('category-tab');
            return;
          }
        }
      } catch { /* not a category */ }

      if (!cancelled) setResolved('exam');
    };
    resolve();
    return () => { cancelled = true; };
  }, [first, second]);

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

  if (resolved === 'subcategory-tab') {
    return <ModernSubcategoryPage subcategorySlug={first} initialTabSlug={second} />;
  }

  if (resolved === 'category-tab') {
    return <NewCategoryPage categorySlug={first} initialTabSlug={second} />;
  }

  return <ExamDetailPage urlPath={`/${first}/${second}`} />;
}

export default function DynamicPageClient({ slugArray }: { slugArray: string[] }) {
  if (slugArray.length >= 3) {
    return <ExamDetailPage urlPath={`/${slugArray.join('/')}`} />;
  }

  if (slugArray.length === 2) {
    return <TwoSegmentResolver first={slugArray[0]} second={slugArray[1]} />;
  }

  if (slugArray.length === 1 && slugArray[0]) {
    return <SlugResolver slug={slugArray[0]} />;
  }

  return null;
}
