import React from 'react';
import Link from 'next/link';
import { Languages, NotebookText, Users, ArrowRight, Clock, FileText, TrendingUp } from 'lucide-react';
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
    || (testSeries.exams && testSeries.exams.some(exam => exam.supports_hindi) ? 'English + हिंदी' : 'English only');

  const userCount = testSeries.user_count || 0;
  const formattedUserCount = userCount >= 1000 ? `${(userCount / 1000).toFixed(1)}k` : userCount.toString();

  const initials = (categoryName || testSeries.title)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase() || 'BM';

  return (
    <div className="group relative flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.08)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.12)] hover:border-slate-300 transition-all duration-300 hover:-translate-y-1">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />

      <div className="p-3 sm:p-4 bg-gradient-to-br from-slate-50/50 via-white to-white">
        <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
              {displayLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayLogo} alt={testSeries.title} className="h-8 w-8 sm:h-10 sm:w-10 object-cover p-1" loading="lazy" />
              ) : (
                <span className="text-[10px] sm:text-xs font-bold text-slate-600">{initials}</span>
              )}
            </div>
            <span className="px-2 sm:px-2.5 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200/60 text-[11px] sm:text-xs font-semibold shadow-sm">
              {freeTests > 0 ? `${freeTests} Free` : 'Premium'}
            </span>
          </div>
          {userCount > 0 && (
            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/60 text-[11px] sm:text-xs font-semibold text-amber-700 shadow-sm">
              <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {formattedUserCount}
            </div>
          )}
        </div>

        <h3 className="font-display text-sm sm:text-base font-semibold text-slate-900 leading-snug mb-2 sm:mb-3 line-clamp-2 group-hover:text-primary transition-colors">
          {testSeries.title}
        </h3>
      </div>

      <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col gap-2 sm:gap-3 flex-1">
        <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-sky-50/80 border border-sky-100 text-[11px] sm:text-xs text-sky-700 w-fit">
          <Languages className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="font-medium hidden sm:inline">{languagesLabel}</span>
          <span className="font-medium sm:hidden">{testSeries.exams && testSeries.exams.some(exam => exam.supports_hindi) ? 'EN+HI' : 'EN'}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1.5 sm:gap-y-2 text-[11px] sm:text-xs text-slate-600">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-sky-50">
              <NotebookText className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-sky-600" />
            </div>
            <span className="font-medium">{totalTests} Tests</span>
          </div>
          {testSeries.difficulty && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="px-2 sm:px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] sm:text-xs font-semibold shadow-sm">
                {testSeries.difficulty.name}
              </span>
            </div>
          )}
          {testSeries.subcategory && (
            <span className="px-2 sm:px-2.5 py-0.5 rounded-md border border-slate-200/60 bg-white text-slate-600 text-[10px] sm:text-xs font-medium shadow-sm">
              {testSeries.subcategory.name}
            </span>
          )}
        </div>

        {testSeries.description && (
          <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-2 leading-relaxed">{testSeries.description}</p>
        )}

        <div className="mt-auto pt-1 sm:pt-2">
          <Link href={seriesUrl} className="inline-flex w-full">
            <Button
              className="w-full rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:from-sky-500 hover:via-blue-600 hover:to-indigo-600 transition-all duration-300 group/btn text-sm"
              size="sm"
            >
              View Test Series
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover/btn:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
