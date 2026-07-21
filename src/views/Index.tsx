"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from '@/components/common/Image';
import dynamic from 'next/dynamic';
import { BookOpenCheck, FileText, BarChart3, Award } from 'lucide-react';
import { Exam } from '@/types';
import { HomepageHero, HomepageHeroMediaItem, HomepageData } from '@/lib/api/homepageService';

// Everything below the hero + stats strip lives in its own chunk. The hero
// image is the LCP element; splitting the ~500 lines of below-fold sections
// (plus StandardExamCard and the data services they pull in) out of the
// critical bundle stops that JS from competing with the hero's first paint on
// slow mobile connections. SSR is unaffected — the full HTML still renders
// server-side; only client hydration of the below-fold content is deferred.
const HomeBelowFold = dynamic(() => import('./home/HomeBelowFold'));

type IndexProps = {
  initialHero?: HomepageHero | null;
  initialData?: HomepageData | null;
  initialMostAttemptedExams?: Exam[];
};

const fallbackHero = {
  title: 'Free Mock Tests for SSC, Banking, Railway & Police Exams',
  subtitle: '',
  descriptions: [
    'Start Your Journey With Us! Your Tests, Exams, Quizzes, & Information About Latest Government Exams.',
    'Learn, Practice & Crack Government Exams Today.',
    'Start Preparing For Government Jobs Today With Free Mock Tests, Practice Tests, Notes, Quizzes & Exam Resources!'
  ],
  primaryCta: { text: 'Get Free Mock', url: '/mock-test-series' },
  secondaryCta: null as { text: string; url: string } | null,
  media: [
    {
      url: '/assets/image1.png',
      asset_type: 'image',
      alt_text: 'Exam preparation dashboard'
    }
  ] as HomepageHeroMediaItem[],
  mediaLayout: 'single'
};

const impactStats = [
  { label: 'Mock Tests', value: '1000+', gradient: 'from-[#fed7aa] via-[#fef3c7] to-[#fde68a]', icon: BookOpenCheck },
  { label: 'Past Year Papers', value: '60+', gradient: 'from-[#bfdbfe] via-[#dbeafe] to-[#eef2ff]', icon: FileText },
  { label: 'Test Series', value: '5,000+', gradient: 'from-[#e9d5ff] via-[#f5d0fe] to-[#fde2ff]', icon: BarChart3 },
  { label: 'Success Rate', value: '90%', gradient: 'from-[#bbf7d0] via-[#dcfce7] to-[#f0fdf4]', icon: Award }
];

export default function Index({ initialHero, initialData, initialMostAttemptedExams }: IndexProps = { initialHero: null, initialData: null }) {
  const [activeHeroMedia, setActiveHeroMedia] = useState(0);
  const heroButtonsScrollRef = useRef<HTMLDivElement>(null);

  const heroData = initialHero || initialData?.hero || null;
  const heroTitle = heroData?.title ?? fallbackHero.title;
  const heroDescriptions = heroData?.description
    ? heroData.description
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : fallbackHero.descriptions;
  const heroPrimaryCta = heroData?.cta_primary_text && heroData?.cta_primary_url
    ? { text: heroData.cta_primary_text, url: heroData.cta_primary_url }
    : fallbackHero.primaryCta;

  const heroMedia = useMemo(() => {
    if (heroData?.media_items && heroData.media_items.length > 0) {
      return heroData.media_items;
    }
    return fallbackHero.media;
  }, [heroData]);

  const { buttonCardMedia, heroIllustrationMedia } = useMemo(() => {
    const buttons = heroMedia.filter(item => item.overlay_color !== 'hero-visual');
    const illustration = heroMedia.find(item => item.overlay_color === 'hero-visual');
    return { buttonCardMedia: buttons, heroIllustrationMedia: illustration };
  }, [heroMedia]);

  const heroMediaLayout = heroData?.media_layout || fallbackHero.mediaLayout;
  const heroMediaCount = heroMedia.length;
  const showSlider = heroMediaLayout === 'slideshow' && heroMediaCount > 1;
  const heroMediaPrimary = heroIllustrationMedia;

  useEffect(() => {
    setActiveHeroMedia(0);
  }, [heroMediaCount, heroMediaLayout]);

  useEffect(() => {
    if (!showSlider) return undefined;
    const timer = setInterval(() => {
      setActiveHeroMedia((prev) => (prev + 1) % heroMediaCount);
    }, 6000);
    return () => clearInterval(timer);
  }, [showSlider, heroMediaCount]);

  const renderMediaAsset = (
    asset?: HomepageHeroMediaItem,
    className = 'w-full h-80 md:h-96 rounded-[28px] object-cover',
    options: { disableShadow?: boolean } = {}
  ) => {
    if (!asset) return null;
    if (asset.asset_type === 'video') {
      return (
        <video
          src={asset.url}
          className={`${className} ${options.disableShadow ? '' : 'shadow-[0_25px_80px_-40px_rgba(15,23,42,0.9)]'}`.trim()}
          autoPlay
          muted
          loop
          playsInline
          controls={false}
        />
      );
    }
    // next/image (not a raw <img>): the LCP element. `priority` preloads it
    // with a responsive srcset, so a phone downloads a ~750px variant instead
    // of the full-size original — the raw <img> shipped the original file
    // (126KB+) to every device.
    //
    // Fixed-aspect container + fill/object-contain (NOT width/height attrs):
    // the API doesn't expose the uploaded image's dimensions, and hardcoded
    // attrs with the wrong ratio made the browser reserve a too-tall box that
    // SHRANK when the image loaded — a reproducible 0.072 CLS as the hero
    // text below jumped up. The container reserves its box up front and never
    // resizes; if an admin uploads a different ratio it letterboxes inside
    // (object-contain) instead of shifting the page. aspect-[1536/633]
    // matches the current CMS hero asset.
    return (
      <div className={`relative w-full aspect-[1536/633] ${options.disableShadow ? '' : 'shadow-[0_25px_80px_-40px_rgba(15,23,42,0.9)]'}`.trim()}>
        <Image
          src={asset.url}
          alt={asset.alt_text || heroTitle}
          fill
          priority
          fetchPriority="high"
          sizes="(min-width: 1024px) 512px, 100vw"
          className="object-contain"
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Dynamic Hero Section */}
      <section className="relative w-full bg-[#e7f1ff]">
        <div className="container-home py-3 md:py-12">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-4 order-2 lg:order-1">
              <h1 className="font-display text-[1.6rem] sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-snug sm:leading-tight">
                {heroTitle}
              </h1>
              <div className="space-y-1.5 text-[0.95rem] sm:text-base">
                {heroDescriptions.map((paragraph, idx) => (
                  <p key={idx} className="text-gray-600 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Exam Buttons Grid */}
              <div className="relative pt-3">
                <div
                  ref={heroButtonsScrollRef}
                  className="flex gap-3 overflow-x-auto pb-2 pr-4 -ml-4 pl-4 hide-scrollbar sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:p-0"
                >
                  {buttonCardMedia.slice(0, 4).map((item, idx) => {
                    const examIcons = ['📋', '📚', '📅', '📊'];
                    const examLabels = item.headline || ['Delhi Police Head Constable', 'RRB Group D', 'Exam Calendar', 'My Test Series'][idx];
                    const examDates = item.description || ['Exam Date: 7th January 2026', 'Exam Date: 8th January 2026', '', ''][idx];

                    return (
                      <Link
                        key={idx}
                        href={item.cta_url || heroPrimaryCta?.url || '/mock-test-series'}
                        className="group relative min-w-[200px] flex-shrink-0 bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 sm:min-w-0"
                      >
                        <div className="flex items-start gap-3">
                          {item.url ? (
                          <div className="w-10 h-10 flex-shrink-0">
                            {/* next/image + sizes="40px": source assets are ~525px; serves ~80px variants */}
                            <Image src={item.url} alt={item.alt_text || examLabels} width={40} height={40} sizes="40px" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="text-3xl">{examIcons[idx]}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          {/* span, not a heading — card labels aren't document structure
                              (an h3 here follows the h1 directly, breaking heading order) */}
                          <span className="block text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {examLabels}
                          </span>
                          {examDates && (
                            <p className="text-xs text-gray-500 mt-1">{examDates}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                </div>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="order-1 lg:order-2 flex justify-center lg:justify-end mt-1 sm:mt-4 lg:mt-0">
              <div className="relative w-full max-w-none sm:max-w-md lg:max-w-lg">
                {heroMediaPrimary ? (
                  renderMediaAsset(heroMediaPrimary, 'w-full h-auto object-contain', { disableShadow: true })
                ) : (
                  <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-4 sm:p-8">
                    <div className="bg-blue-700 p-3 sm:p-6 border border-blue-500">
                      <h3 className="text-white text-xl font-bold mb-6 text-center">My board</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-800 rounded-xl p-4 text-white">
                          <div className="text-2xl mb-2">📋</div>
                          <p className="text-sm font-medium">Attempted Tests</p>
                        </div>
                        <div className="bg-blue-800 rounded-xl p-4 text-white">
                          <div className="text-2xl mb-2">📚</div>
                          <p className="text-sm font-medium">My Library</p>
                        </div>
                        <div className="bg-blue-800 rounded-xl p-4 text-white">
                          <div className="text-2xl mb-2">📅</div>
                          <p className="text-sm font-medium">Exam Calendar</p>
                        </div>
                        <div className="bg-blue-800 rounded-xl p-4 text-white">
                          <div className="text-2xl mb-2">📊</div>
                          <p className="text-sm font-medium">My Test Series</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats Strip */}
      <section className="py-6 bg-background">
        <div className="container-home">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {impactStats.map((stat) => (
              <div
                key={stat.label}
                /* [transform:translateZ(0)] gives each card its own clean compositor layer and
                   [contain:paint] clips its painting to its box — together they stop the Android
                   Chrome paint-trail/ghosting these gradient cards exhibited on scroll. Borders/
                   icon bg are opaque (no translucency) for the same reason. */
                className={`flex items-center gap-3 rounded-2xl border border-black/5 bg-gradient-to-br ${stat.gradient} p-4 shadow-md transition-shadow hover:shadow-lg [transform:translateZ(0)] [contain:paint]`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary">
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <p className="font-display text-2xl text-slate-900 leading-none">{stat.value}</p>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-600 whitespace-nowrap">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Everything below the fold — separate chunk, deferred hydration */}
      <HomeBelowFold initialData={initialData} initialMostAttemptedExams={initialMostAttemptedExams} />
    </div>
  );
}
