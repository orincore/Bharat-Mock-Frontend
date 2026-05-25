import type { Exam } from '@/types';
import type { Category } from '@/lib/api/taxonomyService';

interface ServerLiveTestsProps {
  exams: Exam[];
  categories: Category[];
}

export default function ServerLiveTests({ exams, categories }: ServerLiveTestsProps) {
  return (
    <>
      {/* ── Static HTML for Google indexing ─────────────────────────────── */}
      <div className="sr-only" aria-hidden="false">
        <h1>Free Live Mock Tests 2026 — SSC, Banking, Railway & Police</h1>
        <p>Attempt scheduled live mock tests with real-time leaderboards for SSC CGL, IBPS PO, RRB NTPC, UP Police and 100+ government exams.</p>

        <section>
          <h2>Upcoming Live Tests</h2>
          <p>Total live tests: {exams.length}</p>
        </section>

        {exams.length > 0 && (
          <section>
            <h2>Scheduled Live Exams</h2>
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
      </div>
    </>
  );
}
