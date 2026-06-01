'use client';

import { useFooterVisible } from '@/app/providers';

// Subcategory/category tab pages live under the 2-segment catch-all route, which the global
// footer heuristic would otherwise hide. Rendering this marker keeps the footer visible on them
// (including custom tabs with arbitrary slugs) without affecting exam-detail or other pages.
export default function FooterVisible() {
  useFooterVisible();
  return null;
}
