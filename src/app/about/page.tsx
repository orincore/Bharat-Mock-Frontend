import Image from 'next/image';
import Link from 'next/link';
import { aboutIconRegistry, fallbackAboutData } from '@/lib/constants/about';
import { fetchAboutPageData } from '@/lib/data/about';

export const revalidate = 300;

export default async function AboutPage() {
  const aboutData = await fetchAboutPageData();
  const content = aboutData.content ?? fallbackAboutData.content;
  const values = aboutData.values?.length ? aboutData.values : fallbackAboutData.values;
  const stats = aboutData.stats?.length ? aboutData.stats : fallbackAboutData.stats;
  const offerings = aboutData.offerings?.length ? aboutData.offerings : fallbackAboutData.offerings;

  const renderIcon = (iconKey?: string) => {
    const Icon = aboutIconRegistry[iconKey ?? ''] ?? aboutIconRegistry.star;
    return <Icon className="h-8 w-8" />;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.35),_transparent_55%)]" />
        <div className="relative container-main py-20">
          <div className="flex justify-center mb-8">
            <div className="relative h-16 w-48">
              <Image
                src="/logo.png"
                alt="Bharat Mock Logo"
                fill
                sizes="(min-width: 768px) 240px, 180px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="max-w-4xl mx-auto text-center space-y-6">
            {content.hero_badge && (
              <span className="inline-flex items-center justify-center px-4 py-1 rounded-full border border-white/20 text-xs uppercase tracking-[0.35em] text-white/70">
                {content.hero_badge}
              </span>
            )}
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
              {content.hero_heading}
            </h1>
            {content.hero_subheading && (
              <p className="text-lg text-white/80 max-w-3xl mx-auto">{content.hero_subheading}</p>
            )}
            {content.hero_description && (
              <p className="text-base text-white/70 max-w-3xl mx-auto">{content.hero_description}</p>
            )}

            {content.cta_label && content.cta_href && (
              <div className="pt-4">
                <Link
                  href={content.cta_href}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-900 font-semibold shadow-lg hover:shadow-xl transition"
                >
                  {content.cta_label}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-main">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.4em] text-primary font-semibold">Mission</p>
              <h2 className="font-display text-3xl font-bold">{content.mission_heading}</h2>
              {content.mission_body && (
                <p className="text-muted-foreground leading-relaxed">{content.mission_body}</p>
              )}
            </div>
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.4em] text-primary font-semibold">Story</p>
              <h2 className="font-display text-3xl font-bold">{content.story_heading}</h2>
              {content.story_body && (
                <p className="text-muted-foreground leading-relaxed">{content.story_body}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/20">
        <div className="container-main">
          <p className="text-xs uppercase tracking-[0.35em] text-primary font-semibold text-center">Values</p>
          <h2 className="font-display text-3xl font-bold text-center mt-3">{content.hero_badge || 'What drives us'}</h2>
          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div key={value.id ?? value.title} className="text-center bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
                  {renderIcon(value.icon)}
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-main">
          <div className="flex flex-col items-center text-center mb-12">
            <p className="text-xs uppercase tracking-[0.35em] text-primary font-semibold">Impact</p>
            <h2 className="font-display text-3xl font-bold">{content.impact_heading}</h2>
            {content.impact_body && <p className="text-muted-foreground mt-2 max-w-3xl">{content.impact_body}</p>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.id ?? stat.label} className="text-center rounded-2xl border border-border p-6 bg-card">
                <p className="font-display text-4xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm font-semibold mt-2">{stat.label}</p>
                {stat.helper_text && <p className="text-xs text-muted-foreground mt-1">{stat.helper_text}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/20">
        <div className="container-main">
          <div className="flex flex-col items-center text-center mb-12">
            <p className="text-xs uppercase tracking-[0.35em] text-primary font-semibold">Offerings</p>
            <h2 className="font-display text-3xl font-bold">{content.offerings_heading}</h2>
            {content.offerings_body && <p className="text-muted-foreground mt-2 max-w-3xl">{content.offerings_body}</p>}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {offerings.map((offering) => (
              <div key={offering.id ?? offering.title} className="bg-card border border-border rounded-2xl p-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
                  {renderIcon(offering.icon)}
                </div>
                <h3 className="font-display text-xl font-semibold">{offering.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{offering.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
