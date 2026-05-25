import Link from 'next/link';
import type { CurrentAffairsPayload, CurrentAffairsQuizLink, CurrentAffairsVideo, CurrentAffairsNoteSummary } from '@/lib/api/currentAffairsService';

interface ServerCurrentAffairsProps {
  data: CurrentAffairsPayload | null;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ServerCurrentAffairs({ data }: ServerCurrentAffairsProps) {
  if (!data) return null;

  const topQuizzes: CurrentAffairsQuizLink[] = data.quizzes.slice(0, 10);
  const topVideos: CurrentAffairsVideo[] = data.videos.slice(0, 10);
  const topNotes: CurrentAffairsNoteSummary[] = data.notes.slice(0, 10);

  return (
    <>
      {/* ── Static HTML for Google indexing ─────────────────────────────── */}
      <div className="sr-only" aria-hidden="false">
        <h1>Current Affairs — BharatMock</h1>
        {data.settings?.heroTitle && <h2>{data.settings.heroTitle}</h2>}
        {data.settings?.heroDescription && <p>{data.settings.heroDescription}</p>}

        <section>
          <h3>Top Quizzes</h3>
          <ul>
            {topQuizzes.map((quiz) => (
              <li key={quiz.id}>
                {quiz.highlightLabel || quiz.exam?.title || 'Current Affairs Quiz'}
                {quiz.summary && <span>: {quiz.summary}</span>}
                {quiz.badge && <span> ({quiz.badge})</span>}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Top Videos</h3>
          <ul>
            {topVideos.map((video) => (
              <li key={video.id}>
                {video.title}
                {video.description && <span>: {video.description}</span>}
                {video.tag && <span> — {video.tag}</span>}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Top Notes</h3>
          <ul>
            {topNotes.map((note) => (
              <li key={note.id}>
                {note.title}
                {note.excerpt && <span>: {note.excerpt}</span>}
                {note.tag && <span> — {note.tag}</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ── Visible SSR hero section for immediate content ───────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_55%)]" />
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />
        <div className="relative container-main py-12 md:py-16">
          <div className="max-w-4xl">
            {data.settings?.heroBadge && (
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                {data.settings.heroBadge}
              </div>
            )}
            <h1 className="font-display text-3xl md:text-5xl font-extrabold leading-tight mb-4">
              {data.settings?.heroTitle || 'Daily Current Affairs'}
            </h1>
            {data.settings?.heroDescription && (
              <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-3xl">
                {data.settings.heroDescription}
              </p>
            )}
            {data.settings?.heroCtaLabel && data.settings?.heroCtaUrl && (
              <div className="mt-8">
                <Link
                  href={data.settings.heroCtaUrl}
                  className="inline-flex items-center gap-2 bg-white text-indigo-900 font-semibold px-6 py-3 rounded-full hover:bg-white/90 transition-all shadow-lg"
                >
                  {data.settings.heroCtaLabel}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Quick stats ─────────────────────────────────────────────────────── */}
      <div className="container-main py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-1">{data.quizzes.length}</div>
            <div className="text-sm text-muted-foreground">Quizzes Live</div>
          </div>
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-1">{data.videos.length}</div>
            <div className="text-sm text-muted-foreground">Video Explainers</div>
          </div>
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-1">{data.notes.length}</div>
            <div className="text-sm text-muted-foreground">Notes Updated</div>
          </div>
        </div>
      </div>

      {/* ── Top 10 Quizzes (SSR) ────────────────────────────────────────────── */}
      {topQuizzes.length > 0 && (
        <div className="container-main py-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">Top Quizzes</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {topQuizzes.map((quiz) => (
                <Link
                  key={quiz.id}
                  href={quiz.examId ? `/exams/${quiz.examId}` : '#'}
                  className="block bg-card rounded-xl border border-border p-5 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {quiz.badge && (
                        <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded mb-2">
                          {quiz.badge}
                        </span>
                      )}
                      <h3 className="font-semibold text-foreground mb-1">
                        {quiz.highlightLabel || quiz.exam?.title || 'Current Affairs Quiz'}
                      </h3>
                      {quiz.summary && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{quiz.summary}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Top 10 Videos (SSR) ──────────────────────────────────────────────── */}
      {topVideos.length > 0 && (
        <div className="container-main py-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">Top Video Explainers</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {topVideos.map((video) => (
                <div key={video.id} className="bg-card rounded-xl border border-border p-5">
                  {video.thumbnailUrl && (
                    <div className="aspect-video bg-slate-100 rounded-lg mb-3 overflow-hidden">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <h3 className="font-semibold text-foreground mb-1">{video.title}</h3>
                  {video.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{video.description}</p>
                  )}
                  {video.tag && (
                    <span className="inline-block bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded">
                      {video.tag}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Top 10 Notes (SSR) ───────────────────────────────────────────────── */}
      {topNotes.length > 0 && (
        <div className="container-main py-8 pb-12">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">Top Notes</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {topNotes.map((note) => (
                <Link
                  key={note.id}
                  href={`/current-affairs/${note.slug}`}
                  className="block bg-card rounded-xl border border-border p-5 hover:border-primary/50 transition-all"
                >
                  {note.featuredImageUrl && (
                    <div className="aspect-video bg-slate-100 rounded-lg mb-3 overflow-hidden">
                      <img
                        src={note.featuredImageUrl}
                        alt={note.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <h3 className="font-semibold text-foreground mb-1">{note.title}</h3>
                  {note.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{note.excerpt}</p>
                  )}
                  {note.publishedAt && (
                    <div className="text-xs text-muted-foreground">{formatDate(note.publishedAt)}</div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
