import type { TestSeries } from '@/lib/api/testSeriesService';
import type { Category, Subcategory } from '@/lib/api/taxonomyService';

interface ServerMockTestSeriesProps {
  testSeries: TestSeries[];
  categories: Category[];
  subcategories: Subcategory[];
  total: number;
}

export default function ServerMockTestSeries({ testSeries, categories, subcategories, total }: ServerMockTestSeriesProps) {
  return (
    <>
      {/* ── Static HTML for Google indexing ─────────────────────────────── */}
      <div className="sr-only" aria-hidden="false">
        <h1>Free Mock Test Series 2026 — SSC, Banking, Railway & Police</h1>
        <p>Practice with 5000+ free mock tests for SSC CGL, IBPS PO, RRB NTPC, UP Police and 100+ govt exams.</p>

        <section>
          <h2>Test Series Available</h2>
          <p>Total test series: {total}</p>
        </section>

        {testSeries.length > 0 && (
          <section>
            <h2>Featured Test Series</h2>
            <ul>
              {testSeries.slice(0, 10).map((series: any, i: number) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: series.title }} />
              ))}
            </ul>
          </section>
        )}

        {categories.length > 0 && (
          <section>
            <h2>Exam Categories</h2>
            <ul>
              {categories.map((cat: any, i: number) => (
                <li key={i}>{cat.name}</li>
              ))}
            </ul>
          </section>
        )}

        {subcategories.length > 0 && (
          <section>
            <h2>Exam Subcategories</h2>
            <ul>
              {subcategories.slice(0, 20).map((sub: any, i: number) => (
                <li key={i}>{sub.name}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
