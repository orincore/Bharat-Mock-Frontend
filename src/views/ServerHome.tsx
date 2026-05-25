import type { HomepageData, HomepageHero } from '@/lib/api/homepageService';
import { Exam } from '@/types';

interface ServerHomeProps {
  hero?: HomepageHero | null;
  data?: HomepageData | null;
  mostAttemptedExams?: Exam[];
}

export default function ServerHome({ hero, data, mostAttemptedExams }: ServerHomeProps) {
  const heroTitle = hero?.title || data?.hero?.title || 'Free Mock Tests for SSC, Banking, Railway & Police Exams';
  const heroSubtitle = hero?.subtitle || data?.hero?.subtitle || '';
  const heroDescription = hero?.description || data?.hero?.description || '';
  const featuredExams = data?.featuredExams || [];
  const featuredArticles = data?.featuredArticles || [];
  const categories = data?.categories || [];
  const impactStats = [
    { label: 'Mock Tests', value: '1000+' },
    { label: 'Past Year Papers', value: '60+' },
    { label: 'Test Series', value: '5,000+' },
    { label: 'Success Rate', value: '90%' }
  ];

  return (
    <>
      {/* ── Static HTML for Google indexing ─────────────────────────────── */}
      <div className="sr-only" aria-hidden="false">
        <h1 dangerouslySetInnerHTML={{ __html: heroTitle }} />
        {heroSubtitle && <p dangerouslySetInnerHTML={{ __html: heroSubtitle }} />}
        {heroDescription && <p dangerouslySetInnerHTML={{ __html: heroDescription }} />}

        <section>
          <h2>Impact Stats</h2>
          <ul>
            {impactStats.map((stat, i) => (
              <li key={i}>{stat.label}: {stat.value}</li>
            ))}
          </ul>
        </section>

        {featuredExams.length > 0 && (
          <section>
            <h2>Featured Mock Tests</h2>
            <ul>
              {featuredExams.slice(0, 10).map((exam: any, i: number) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: exam.title }} />
              ))}
            </ul>
          </section>
        )}

        {featuredArticles.length > 0 && (
          <section>
            <h2>Featured Articles</h2>
            <ul>
              {featuredArticles.slice(0, 5).map((article: any, i: number) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: article.title }} />
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

        {mostAttemptedExams && mostAttemptedExams.length > 0 && (
          <section>
            <h2>Most Attempted Exams</h2>
            <ul>
              {mostAttemptedExams.map((exam: any, i: number) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: exam.title }} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
