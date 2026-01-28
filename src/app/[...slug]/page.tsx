"use client";

import { useParams } from 'next/navigation';
import { ExamDetailPage } from '@/components/pages/ExamDetailPage';
import { CategoryPage } from '@/components/pages/CategoryPage';
import SubcategoryPage from '@/components/pages/SubcategoryPage';

export default function DynamicPage() {
  const params = useParams();
  const slugArray = params.slug as string[];
  const isExamPage = slugArray && slugArray.length === 3;
  const isSubcategoryPage = slugArray && slugArray.length === 2;
  const isCategoryPage = slugArray && slugArray.length === 1;

  if (isExamPage) {
    const urlPath = `/${slugArray.join('/')}`;
    return <ExamDetailPage urlPath={urlPath} />;
  }

  if (isSubcategoryPage) {
    return <SubcategoryPage categorySlug={slugArray[0]} subcategorySlug={slugArray[1]} />;
  }

  if (isCategoryPage) {
    return <CategoryPage categorySlug={slugArray[0]} />;
  }

  return null;
}
