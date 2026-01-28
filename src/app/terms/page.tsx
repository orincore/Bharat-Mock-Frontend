import { FileText, Scale, Shield, Coins } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Bharat Mock',
  description: 'Understand the rules that govern Bharat Mock mock tests, paid plans, acceptable use, dispute resolution, and your responsibilities as a learner.',
};

const userResponsibilities = [
  'Maintain accurate profile information and exam preferences',
  'Protect account credentials and notify us of suspicious activity',
  'Use mock tests only for personal preparation and not for resale',
  'Respect copyright and avoid distributing question banks externally',
  'Keep devices free from malware to protect shared exam environments',
];

const prohibitedActivities = [
  'Reverse engineering or interfering with the scoring algorithms',
  'Automating attempts, scraping questions, or bypassing paywalls',
  'Sharing screenshots of premium content without consent',
  'Misrepresenting identity while participating in leaderboards',
  'Uploading defamatory, obscene, or threatening material',
];

const refundRules = [
  'Subscription fees are non-refundable once a mock test has been unlocked',
  'Refunds may be issued within 7 days if no paid attempt has started',
  'Chargebacks filed without contacting support may lead to account suspension',
  'All prices are inclusive of applicable Indian GST unless otherwise stated',
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="gradient-hero py-20">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <FileText className="h-16 w-16 text-primary mx-auto mb-6" />
            <p className="text-sm uppercase tracking-[0.3em] text-background/70">Legal</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-background mb-4">
              Terms of Service
            </h1>
            <p className="text-lg text-background/80">Last updated: January 2026</p>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3">
            <article className="rounded-3xl border border-border/60 bg-card p-6 shadow-[0px_20px_45px_rgba(15,23,42,0.12)]">
              <Scale className="h-10 w-10 text-primary mb-4" />
              <h2 className="font-display text-xl mb-2">Contract & Acceptance</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Using Bharat Mock constitutes acceptance of these legally binding terms. Individuals under
                18 must obtain consent from a parent or guardian before purchasing paid plans.
              </p>
            </article>
            <article className="rounded-3xl border border-border/60 bg-card p-6">
              <Shield className="h-10 w-10 text-primary mb-4" />
              <h2 className="font-display text-xl mb-2">Academic Integrity</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We monitor attempts for unusual patterns. Accounts involved in cheating rings or content
                leaks will be disabled and results voided without refunds.
              </p>
            </article>
            <article className="rounded-3xl border border-border/60 bg-card p-6">
              <Coins className="h-10 w-10 text-primary mb-4" />
              <h2 className="font-display text-xl mb-2">Billing Snapshot</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Paid mock bundles renew monthly unless cancelled. GST invoices are emailed immediately
                after payment for compliance purposes.
              </p>
            </article>
          </div>

          <div className="prose prose-lg max-w-none mt-12 rounded-3xl border border-border/60 bg-card/80 p-10 shadow-[0px_30px_60px_rgba(15,23,42,0.12)]">
            <h2>Account & Access</h2>
            <p>
              Each account represents a single learner. Shared logins, credential resale, or enabling third
              parties to take exams on your behalf violates these terms and may result in permanent bans.
            </p>
            <ul>
              {userResponsibilities.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h2>Acceptable Use & Restrictions</h2>
            <p>To keep the ecosystem fair, you agree to refrain from the following activities:</p>
            <ul>
              {prohibitedActivities.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h2>Content Ownership</h2>
            <p>
              All proprietary content, logos, code, and mock test questions remain the intellectual property
              of Bharat Mock EdTech Pvt. Ltd. Subscription purchase grants a limited, non-transferable
              license for personal exam preparation only.
            </p>

            <h2>Mock Tests & Performance Insights</h2>
            <p>
              We strive to simulate real exams; however, scores, predicted ranks, and AI insights are
              indicative only. Official exam bodies do not endorse these metrics, and we are not liable for
              discrepancies between mock and real outcomes.
            </p>

            <h2>Payments, Renewals & Refunds</h2>
            <p>Payments are processed via PCI-DSS compliant partners. By subscribing you authorize:</p>
            <ul>
              {refundRules.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h2>Service Availability</h2>
            <p>
              Planned maintenance windows will be announced at least 24 hours in advance. Emergency
              downtime may occur for security reasons; any lost attempts will be restored or credited.
            </p>

            <h2>Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Bharat Mock is not liable for indirect, incidental, or
              consequential damages arising from platform use, score misinterpretation, or data loss.
            </p>

            <h2>Termination & Suspension</h2>
            <p>
              We may suspend or terminate accounts that violate policies, engage in payment fraud, or pose
              security risks. Upon termination, all licenses granted under these Terms immediately cease.
            </p>

            <h2>Governing Law & Dispute Resolution</h2>
            <p>
              These Terms are governed by the laws of India. Disputes shall be resolved through binding
              arbitration seated in Bengaluru, conducted in English per the Arbitration and Conciliation Act, 1996.
            </p>

            <h2>Changes to These Terms</h2>
            <p>
              We may update these Terms to reflect new features or regulatory changes. Continued use after
              the effective date constitutes acceptance of the revised Terms.
            </p>

            <div className="rounded-2xl border border-muted bg-muted/30 p-6">
              <h3 className="font-display text-xl mb-2">Questions?</h3>
              <p className="text-muted-foreground">
                Email <a href="mailto:legal@bharatmock.com" className="text-primary underline">legal@bharatmock.com</a> or call
                +91 1800-123-4567. Our registered office is Bharat Mock EdTech Pvt. Ltd., 91Springboard,
                Koramangala, Bengaluru 560034.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
