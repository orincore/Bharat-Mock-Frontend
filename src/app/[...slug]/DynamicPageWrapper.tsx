"use client";

import dynamic from 'next/dynamic';

const DynamicPageClient = dynamic(() => import('./DynamicPageClient'), { ssr: false });

export default function DynamicPageWrapper({ slugArray }: { slugArray: string[] }) {
  return <DynamicPageClient slugArray={slugArray} />;
}
