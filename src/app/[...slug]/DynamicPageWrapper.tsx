"use client";

import dynamic from 'next/dynamic';

const DynamicPageClient = dynamic(() => import('./DynamicPageClient'), { ssr: true });

export default function DynamicPageWrapper({ slugArray }: { slugArray: string[] }) {
  return <DynamicPageClient slugArray={slugArray} />;
}
