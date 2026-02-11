"use client";

import { useParams } from 'next/navigation';
import { ExamDetailPage } from '@/components/pages/ExamDetailPage';
import ModernSubcategoryPage from '@/components/pages/ModernSubcategoryPage';

export default function DynamicPage() {
  const params = useParams();
  const slugArray = params.slug as string[];
  const safeArray = Array.isArray(slugArray) ? slugArray : [slugArray];

  // 3 segments: /categorySlug/subcategorySlug/examSlug  →  Exam detail
  if (safeArray.length === 3) {
    const urlPath = `/${safeArray.join('/')}`;
    return <ExamDetailPage urlPath={urlPath} />;
  }

  // 2 segments: could be /categorySlug/subcategorySlug OR /combinedSlug/tabSlug
  if (safeArray.length === 2) {
    const [first, second] = safeArray;
    if (first?.includes('-')) {
      return <ModernSubcategoryPage combinedSlug={first} initialTabSlug={second} />;
    }
    return <ModernSubcategoryPage categorySlug={first} subcategorySlug={second} />;
  }

  // 1 segment with hyphen: combined format e.g. /ssc-test-test-ssc
  // The backend /resolve endpoint will try all split points to find the correct category+subcategory
  if (safeArray.length === 1 && safeArray[0]?.includes('-')) {
    return <ModernSubcategoryPage combinedSlug={safeArray[0]} />;
  }

  return null;
}
