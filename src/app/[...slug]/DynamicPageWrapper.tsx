import DynamicPageClient from './DynamicPageClient';
import type { FirstSegmentType, ServerPageData } from './page';

// NOTE: No "use client" here, and no next/dynamic wrapper.
// DynamicPageClient is already "use client" — importing it directly from a
// Server Component boundary allows Next.js to SSR the surrounding shell while
// hydrating the interactive parts on the client. Using dynamic() inside a
// "use client" component (as this file previously did) causes Next.js to emit
// BAILOUT_TO_CLIENT_SIDE_RENDERING and skip SSR entirely.

export default function DynamicPageWrapper({
  slugArray,
  firstSegmentType,
  serverPageData,
}: {
  slugArray: string[];
  firstSegmentType: FirstSegmentType;
  serverPageData: ServerPageData | null;
}) {
  return (
    <DynamicPageClient
      slugArray={slugArray}
      firstSegmentType={firstSegmentType}
      serverPageData={serverPageData}
    />
  );
}
