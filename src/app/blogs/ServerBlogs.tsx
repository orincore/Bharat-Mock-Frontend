import type { Blog } from '@/lib/api/blogService';

interface ServerBlogsProps {
  articles: Blog[];
  categories: string[];
  total: number;
}

export default function ServerBlogs({ articles, categories, total }: ServerBlogsProps) {
  return (
    <>
      {/* ── Static HTML for Google indexing ─────────────────────────────── */}
      <div className="sr-only" aria-hidden="false">
        <h1>Exam Preparation Blog — SSC, Banking & Railway Tips</h1>
        <p>Read expert tips, exam strategies, current affairs updates and study guides for SSC CGL, IBPS PO, RRB NTPC and all govt exams on BharatMock Blog.</p>

        <section>
          <h2>Blog Articles</h2>
          <p>Total articles: {total}</p>
        </section>

        {articles.length > 0 && (
          <section>
            <h2>Featured Articles</h2>
            <ul>
              {articles.slice(0, 10).map((article: any, i: number) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: article.title }} />
              ))}
            </ul>
          </section>
        )}

        {categories.length > 0 && (
          <section>
            <h2>Blog Categories</h2>
            <ul>
              {categories.map((cat: string, i: number) => (
                <li key={i}>{cat}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
