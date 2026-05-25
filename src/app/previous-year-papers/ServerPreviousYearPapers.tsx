import type { Exam } from '@/types';
import type { Category, Subcategory } from '@/lib/api/taxonomyService';

interface ServerPreviousYearPapersProps {
  exams: Exam[];
  categories: Category[];
  subcategories: Subcategory[];
  total: number;
}

export default function ServerPreviousYearPapers({ exams, categories, subcategories, total }: ServerPreviousYearPapersProps) {
  return (
    <>
      {/* ── Static HTML for Google indexing ─────────────────────────────── */}
      <div className="sr-only" aria-hidden="false">
        <h1>Previous Year Question Papers — SSC, Banking, Railway & Police</h1>
        <p>Download and practice previous year question papers for SSC CGL, IBPS PO, RRB NTPC, UP Police and 100+ government exams.</p>

        <section>
          <h2>Available Papers</h2>
          <p>Total papers: {total}</p>
        </section>

        {exams.length > 0 && (
          <section>
            <h2>Featured Previous Year Papers</h2>
            <ul>
              {exams.slice(0, 10).map((exam: any, i: number) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: exam.title }} />
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
