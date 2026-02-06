"use client";

import { useParams } from 'next/navigation';
import { ExamDetailPage } from '@/components/pages/ExamDetailPage';
import SubcategoryPage from '@/components/pages/SubcategoryPage';
import ModernSubcategoryPage from '@/components/pages/ModernSubcategoryPage';

export default function DynamicPage() {
  const params = useParams();
  const slugArray = params.slug as string[];
  const safeArray = Array.isArray(slugArray) ? slugArray : [slugArray];

  const parseCombined = (value: string) => {
    const segments = value.split('-');
    if (segments.length < 2) {
      return { category: value, subcategory: '' };
    }
    return {
      category: segments[0],
      subcategory: segments.slice(1).join('-')
    };
  };

  const isLegacyExam = safeArray.length === 3;
  const isCombinedExam = safeArray.length === 2;
  const isLegacySubcategory = safeArray.length === 2;
  const isCombinedSubcategory = safeArray.length === 1 && safeArray[0]?.includes('-');

  if (isLegacyExam) {
    const urlPath = `/${safeArray.join('/')}`;
    return <ExamDetailPage urlPath={urlPath} />;
  }

  if (isCombinedExam) {
    const [combined, examSlug] = safeArray;
    const { category, subcategory } = parseCombined(combined);
    if (!category || !subcategory) {
      return null;
    }
    const urlPath = `/${category}/${subcategory}/${examSlug}`;
    return <ExamDetailPage urlPath={urlPath} />;
  }

  if (isLegacySubcategory) {
    const [categorySlug, subcategorySlug] = safeArray;
    if (categorySlug.includes('-')) {
      const { category, subcategory } = parseCombined(categorySlug);
      return <ModernSubcategoryPage categorySlug={category} subcategorySlug={subcategory} />;
    }
    return <SubcategoryPage categorySlug={categorySlug} subcategorySlug={subcategorySlug} />;
  }

  if (isCombinedSubcategory) {
    const { category, subcategory } = parseCombined(safeArray[0]);
    if (!category || !subcategory) {
      return null;
    }
    return <ModernSubcategoryPage categorySlug={category} subcategorySlug={subcategory} />;
  }

  return null;
}
