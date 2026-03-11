import React from 'react';
import Link from 'next/link';
import { Languages, NotebookText, Users } from 'lucide-react';
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

  const userCount = testSeries.user_count || 0;
  const formattedUserCount = userCount >= 1000 ? `${(userCount / 1000).toFixed(1)}k` : userCount.toString();

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden">
      <div className="p-5 flex flex-col gap-3.5 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shadow-sm">
              {displayLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayLogo}
                  alt={testSeries.title}
                  className="h-12 w-12 object-cover p-1.5"
                  loading="lazy"
                />
              ) : (
                <span className="text-sm font-bold text-slate-600">{initials}</span>
              )}
            </div>
          </div>
          {userCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200">
              <Users className="h-3.5 w-3.5 text-yellow-600" />
              <span className="text-xs font-semibold text-yellow-700">{formattedUserCount} Users</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 leading-tight line-clamp-2">{testSeries.title}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <NotebookText className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-medium">{totalTests} Total Tests</span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-600 font-semibold">{freeTests} Free</span>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {languagesLabel && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 text-blue-700">
                <Languages className="h-3.5 w-3.5" />
                <span className="font-medium">{languagesLabel}</span>
              </div>
            )}
            {testSeries.difficulty && (
              <div className="px-2 py-1 rounded-md bg-purple-50 text-purple-700 font-medium">
                {testSeries.difficulty.name}
              </div>
            )}
          </div>
          
          {testSeries.subcategory && (
            <div className="text-slate-600">
              <span className="font-medium">Category:</span> {testSeries.subcategory.name}
            </div>
          )}
          
          {testSeries.description && (
            <p className="text-slate-600 line-clamp-2 leading-relaxed">
              {testSeries.description}
            </p>
          )}
          
          {testSeries.created_at && (
            <div className="text-slate-500 text-xs">
              Added {formatDate(testSeries.created_at)}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pb-5">
        <Link href={seriesUrl}>
          <Button
            className="w-full rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-sm py-2 shadow-sm"
            variant="default"
          >
            View Test Series
          </Button>
        </Link>
      </div>
    </div>
  );
};
