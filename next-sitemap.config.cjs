/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://bharatmock.com',
  generateRobotsTxt: false,
  siteMapSize: 5000,
  changefreq: 'weekly',
  priority: 0.7,
  exclude: [
    '/admin/*',
    '/profile/*',
    '/results/*',
    '/exams/*/attempt/*',
    '/auth/*',
    '/onboarding/*',
    '/forgot-password',
    '/reset-password',
    '/register',
    '/login',
  ],
  additionalPaths: async (config) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.bharatmock.com/api/v1';
    const results = [];

    try {
      const examsRes = await fetch(`${baseUrl}/exams/slugs`);
      if (examsRes.ok) {
        const { data: exams } = await examsRes.json();
        const subTabs = ['notification', 'syllabus', 'eligibility', 'admit-card', 'answer-key', 'result', 'mock-tests', 'previous-papers'];
        for (const exam of exams) {
          results.push(await config.transform(config, `/${exam.slug}`));
          for (const tab of subTabs) {
            results.push(await config.transform(config, `/${exam.slug}/${tab}`));
          }
        }
      }

      const blogsRes = await fetch(`${baseUrl}/blogs/slugs`);
      if (blogsRes.ok) {
        const { data: blogs } = await blogsRes.json();
        for (const blog of blogs) {
          results.push(await config.transform(config, `/blogs/${blog.slug}`));
        }
      }

      const caRes = await fetch(`${baseUrl}/current-affairs/slugs`);
      if (caRes.ok) {
        const { data: articles } = await caRes.json();
        for (const article of articles) {
          results.push(await config.transform(config, `/current-affairs/${article.slug}`));
        }
      }
    } catch (err) {
      console.warn('[next-sitemap] Could not fetch dynamic paths from API:', err.message);
    }

    return results;
  },
};
