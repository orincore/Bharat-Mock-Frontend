import type { Metadata } from 'next';
import { ShieldCheck, Lock, Users, Database } from 'lucide-react';

import { privacyService } from '@/lib/api/privacyService';
import { fallbackPrivacyPolicy } from '@/lib/constants/privacy';
import { PrivacyPolicyData, PrivacyPolicyListItem, PrivacyPolicySection } from '@/types';

export const metadata: Metadata = {
  title: 'Privacy Policy | Bharat Mock',
  description:
    'Learn how Bharat Mock collects, uses, protects, and shares your information across mock tests, personalized insights, and exam preparation tools.'
};

export const revalidate = 300;

async function getPrivacyPolicyData(): Promise<PrivacyPolicyData> {
  try {
    return await privacyService.getPrivacyPolicy();
  } catch (error) {
    console.error('PrivacyPolicyPage: failed to fetch data', error);
    return fallbackPrivacyPolicy;
  }
}

const sortByDisplayOrder = <T extends { display_order?: number }>(a: T, b: T) => {
  return (a.display_order ?? 0) - (b.display_order ?? 0);
};

function normalizeSections(sections: PrivacyPolicySection[]): PrivacyPolicySection[] {
  return sections
    .filter((section) => section && section.is_active !== false)
    .sort(sortByDisplayOrder)
    .map((section) => ({
      ...section,
      points: (section.points ?? [])
        .filter((point) => point && point.is_active !== false)
        .sort(sortByDisplayOrder)
    }));
}

function formatDate(isoDate?: string | null) {
  if (!isoDate) return null;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function renderListItemContent(item: PrivacyPolicyListItem) {
  if (typeof item === 'string') {
    return item;
  }

  if (item.term && item.text) {
    return (
      <>
        <span className="font-semibold text-foreground">{item.term}:</span> {item.text}
      </>
    );
  }

  if (item.term) {
    return <span className="font-semibold text-foreground">{item.term}</span>;
  }

  return item.text ?? '';
}

export default async function PrivacyPolicyPage() {
  const data = await getPrivacyPolicyData();
  const content = data.content ?? fallbackPrivacyPolicy.content;
  const sectionsCandidate = data.sections?.length ? data.sections : fallbackPrivacyPolicy.sections;
  const normalized = normalizeSections(sectionsCandidate);
  const sections = normalized.length ? normalized : normalizeSections(fallbackPrivacyPolicy.sections);

  const introBody = content?.intro_body ?? fallbackPrivacyPolicy.content.intro_body;
  const lastUpdated =
    formatDate(content?.last_updated) ?? formatDate(fallbackPrivacyPolicy.content.last_updated) ?? 'Recently updated';
  const contactEmail = content?.contact_email ?? fallbackPrivacyPolicy.content.contact_email;
  const contactUrl = content?.contact_url ?? fallbackPrivacyPolicy.content.contact_url;
  const rightsSummary =
    sections.find((section) => section.title?.toLowerCase().includes('right'))?.description ??
    'Update your profile, control notifications, and raise data requests whenever you need.';

  return (
    <div className="min-h-screen bg-background">
      <section className="gradient-hero py-12">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <ShieldCheck className="h-16 w-16 text-primary mx-auto mb-6" />
            <p className="text-sm uppercase tracking-[0.3em] text-background/70">Legal</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-background mb-4">
              {content?.title ?? fallbackPrivacyPolicy.content.title}
            </h1>
            <p className="text-lg text-background/80">Last updated: {lastUpdated}</p>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-3xl border border-border/60 bg-card p-8 shadow-[0px_20px_45px_rgba(15,23,42,0.15)]">
              <Lock className="h-10 w-10 text-primary mb-4" />
              <h2 className="font-display text-2xl mb-3">What this policy covers</h2>
              <p className="text-muted-foreground leading-relaxed">{introBody}</p>
            </article>

            <article className="rounded-3xl border border-border/60 bg-card p-8">
              <Users className="h-10 w-10 text-primary mb-4" />
              <h2 className="font-display text-2xl mb-3">Your control</h2>
              <p className="text-muted-foreground leading-relaxed">{rightsSummary}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/20">
        <div className="container-main max-w-5xl space-y-10">
          {sections.map((section, sectionIndex) => (
            <article
              key={section.id ?? `${section.title}-${sectionIndex}`}
              className="rounded-3xl border border-border/60 bg-card/90 p-8 shadow-[0px_30px_60px_rgba(15,23,42,0.12)]"
            >
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-primary/80">Section {sectionIndex + 1}</p>
                <h2 className="font-display text-3xl">{section.title}</h2>
                {section.description && (
                  <p className="text-muted-foreground leading-relaxed">{section.description}</p>
                )}
              </div>

              {!!section.points?.length && (
                <div className="mt-8 space-y-8">
                  {section.points.map((point, pointIndex) => (
                    <div
                      key={point.id ?? `${section.id}-point-${pointIndex}`}
                      className="border-l-2 border-primary/40 pl-6 space-y-4"
                    >
                      {point.heading && <h3 className="font-display text-xl">{point.heading}</h3>}
                      {point.body && <p className="text-muted-foreground leading-relaxed">{point.body}</p>}
                      {point.list_items && point.list_items.length > 0 && (
                        <ul className="list-disc space-y-2 pl-4 text-muted-foreground">
                          {point.list_items.map((item, itemIndex) => (
                            <li key={
                              typeof item === 'string'
                                ? `${point.id}-item-${itemIndex}`
                                : `${point.id}-item-${item.term ?? itemIndex}`
                            }>
                              {renderListItemContent(item)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main max-w-4xl">
          <div className="rounded-2xl border border-muted bg-muted/30 p-6 flex flex-col gap-2">
            <Database className="h-8 w-8 text-primary" />
            <h3 className="font-display text-xl">Contact the privacy desk</h3>
            <p className="text-muted-foreground">
              {contactEmail && (
                <>
                  Email{' '}
                  <a href={`mailto:${contactEmail}`} className="text-primary underline">
                    {contactEmail}
                  </a>
                </>
              )}
              {contactEmail && contactUrl && <span> · </span>}
              {contactUrl && (
                <>
                  visit{' '}
                  <a href={contactUrl} className="text-primary underline">
                    {contactUrl}
                  </a>
                </>
              )}
              {(!contactEmail && !contactUrl) && 'Reach out to our team for any privacy related queries.'}
            </p>
            <p className="text-sm text-muted-foreground">
              We respond to access requests, incident reports, and clarification emails within 7 business days.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
