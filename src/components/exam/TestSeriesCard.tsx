import React from 'react';
import Link from 'next/link';
import { Languages, NotebookText } from 'lucide-react';
import { TestSeries } from '@/lib/api/testSeriesService';
import { Button } from '@/components/ui/button';

interface TestSeriesCardProps {
  testSeries: TestSeries;
}

export const TestSeriesCard: React.FC<TestSeriesCardProps> = ({ testSeries }) => {
  const categoryName = testSeries.category?.name || 'Test Series';
  const categoryLogo = testSeries.category?.logo_url || null;
  const displayLogo = testSeries.logo_url || categoryLogo;
  const seriesUrl = testSeries.slug ? `/test-series/${testSeries.slug}` : `/test-series/${testSeries.id}`;
  const totalTests = testSeries.total_tests ?? testSeries.exams?.length ?? 0;
  const freeTests = testSeries.free_tests ?? testSeries.exams?.filter(exam => exam.is_free)?.length ?? 0;

  const languagesLabel = testSeries.languages_text
    || (testSeries.languages && testSeries.languages.length > 0 ? testSeries.languages.join(', ') : null)
    || (testSeries.exams && testSeries.exams.some(exam => exam.supports_hindi) ? 'English, Hindi' : 'English');

  const testsLabel = totalTests === 1 ? '1 Test' : `${totalTests} Tests`;
  const freeLabel = freeTests > 0 ? `${freeTests} ${freeTests === 1 ? 'Test' : 'Tests'} Free` : null;

  const badgeLogo = categoryLogo || displayLogo;

  const initials = (categoryName || testSeries.title)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase() || 'BM';

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.45)] flex flex-col h-full overflow-hidden">
      <div className="px-5 pt-5 pb-4 flex flex-col gap-4 flex-1">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
            {displayLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayLogo}
                alt={testSeries.title}
                className="h-12 w-12 object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-sm font-semibold text-slate-600">{initials}</span>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold whitespace-nowrap">
              {badgeLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={badgeLogo}
                  alt={categoryName}
                  className="h-5 w-5 rounded-full border border-white object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-500">
                  {initials.slice(0, 2)}
                </span>
              )}
              <span className="truncate">{categoryName}</span>
            </span>
            <p className="text-lg font-semibold text-slate-900 leading-tight line-clamp-2">{testSeries.title}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <NotebookText className="h-4 w-4 text-slate-500" />
            <span>{testsLabel}</span>
          </div>
          {freeLabel && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
              {freeLabel}
            </span>
          )}
        </div>

        {languagesLabel && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Languages className="h-4 w-4 text-slate-500" />
            <span>{languagesLabel}</span>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <Link href={seriesUrl}>
          <Button
            className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base"
            variant="secondary"
          >
            View Test Series
          </Button>
        </Link>
      </div>
    </div>
  );
};
