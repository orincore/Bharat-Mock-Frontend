import { Metadata } from 'next';

interface HeadProps {
  params: {
    slug: string;
  };
}

const humanizeSlug = (slug: string) =>
  slug
    .split('-')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

export default function Head({ params }: HeadProps) {
  const readableTitle = humanizeSlug(params.slug);
  const title = `${readableTitle} Test Series | Bharat Mock`; 
  const description =
    `${readableTitle} full-length mock tests with analytics, 1,000+ word prep guides, and FAQ support. Prepare smarter with Bharat Mock's adaptive test series platform.`;

  const keywords = [
    readableTitle,
    'test series',
    'mock tests',
    'practice papers',
    'exam preparation',
    'Bharat Mock'
  ].join(', ');

  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bharatmock.com'}/test-series/${params.slug}`;

  const faqItems = [
    {
      question: 'How often should I attempt a Bharat Mock test series exam?',
      answer:
        'For most competitive exams, we recommend attempting one full-length mock test every 3 to 4 days. This cadence gives you enough time to analyse results, revise weak topics, and maintain momentum without burning out.'
    },
    {
      question: 'Can I pause a test series attempt and resume later?',
      answer:
        'Each mock replicates the official exam environment, so pausing is disabled by default. If you need flexible practice, use the custom practice sets or section drills, then return to the timed mock when you are ready for a complete simulation.'
    },
    {
      question: 'What insights do I get after submitting a mock test?',
      answer:
        'Your dashboard highlights accuracy by topic, speed metrics, percentile comparisons, and personalised study nudges. You can also download detailed solutions, bookmark tricky questions, and convert mistakes into revision cards.'
    },
    {
      question: 'Does the test series support bilingual exams?',
      answer:
        'Yes. Many Bharat Mock test series provide both English and Hindi interfaces along with bilingual question explanations. Check the language badges on the test detail cards before starting your attempt.'
    }
  ];

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="Bharat Mock" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: title,
            description,
            mainEntityOfPage: url,
            author: {
              '@type': 'Organization',
              name: 'Bharat Mock'
            },
            publisher: {
              '@type': 'Organization',
              name: 'Bharat Mock'
            }
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqItems.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer
              }
            }))
          })
        }}
      />
    </>
  );
}
