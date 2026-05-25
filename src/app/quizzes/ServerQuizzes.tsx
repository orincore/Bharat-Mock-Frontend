import type { Exam } from '@/types';
import type { Category, Subcategory } from '@/lib/api/taxonomyService';

interface ServerQuizzesProps {
  exams: Exam[];
  categories: Category[];
  subcategories: Subcategory[];
  total: number;
}

export default function ServerQuizzes({ exams, categories, subcategories, total }: ServerQuizzesProps) {
  return (
    <>
      {/* ── Static HTML for Google indexing ─────────────────────────────── */}
      <div className="sr-only" aria-hidden="false">
        <h1>Free Daily Quizzes 2026 — GK, Current Affairs & Exam Practice</h1>
        <p>Practice with free daily quizzes on GK, current affairs, reasoning and quantitative aptitude for SSC CGL, IBPS PO, RRB NTPC and all government exams.</p>

        <section>
          <h2>Available Quizzes</h2>
          <p>Total quizzes: {total}</p>
        </section>

        {exams.length > 0 && (
          <section>
            <h2>Featured Quizzes</h2>
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
