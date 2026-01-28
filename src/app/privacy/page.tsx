import { ShieldCheck, Lock, Users, Database } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Bharat Mock',
  description:
    'Learn how Bharat Mock collects, uses, protects, and shares your information across mock tests, personalized insights, and exam preparation tools.',
};

const personalInformation = [
  'Basic identity details such as name, email address, and phone number',
  'Account credentials that you create to access the platform',
  'Profile data like date of birth, academic background, and category preferences',
  'Payment details processed securely by PCI-DSS compliant gateways',
];

const usageInformation = [
  'Mock test interactions including attempts, time spent, and scores',
  'Device identifiers, IP address, and approximate geolocation',
  'Browser and operating system information for troubleshooting',
  'Clickstream data such as pages visited and features used',
];

const userRights = [
  'Request a copy of the data we hold about you',
  'Update or correct inaccurate profile information',
  'Request deletion of non-mandatory information',
  'Withdraw consent for marketing communications at any time',
  'Restrict or object to certain processing activities',
  'Export your exam history and performance reports',
];

const safeguardingMeasures = [
  'Encryption in transit using HTTPS and TLS 1.2+',
  'Role-based access controls for internal teams',
  'Regular vulnerability scans and dependency upgrades',
  'Continuous backups with strict retention policies',
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="gradient-hero py-20">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <ShieldCheck className="h-16 w-16 text-primary mx-auto mb-6" />
            <p className="text-sm uppercase tracking-[0.3em] text-background/70">Legal</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-background mb-4">
              Privacy Policy
            </h1>
            <p className="text-lg text-background/80">Last updated: January 2026</p>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-3xl border border-border/60 bg-card p-8 shadow-[0px_20px_45px_rgba(15,23,42,0.15)]">
              <Lock className="h-10 w-10 text-primary mb-4" />
              <h2 className="font-display text-2xl mb-3">What This Policy Covers</h2>
              <p className="text-muted-foreground leading-relaxed">
                Bharat Mock collects information to deliver accurate mock tests, personalized learning
                plans, and reliable customer support. This policy explains the categories of data we
                process, why we process it, who we share it with, and the choices you control.
              </p>
            </article>

            <article className="rounded-3xl border border-border/60 bg-card p-8">
              <Users className="h-10 w-10 text-primary mb-4" />
              <h2 className="font-display text-2xl mb-3">Your Control</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your exam journey is yours alone. You can update your profile, manage notification
                preferences, and opt-out of specific processing activities through the dashboard or by
                contacting our privacy desk.
              </p>
            </article>
          </div>

          <div className="prose prose-lg max-w-none mt-12 rounded-3xl border border-border/60 bg-card/80 p-10 shadow-[0px_30px_60px_rgba(15,23,42,0.12)]">
            <h2>Information We Collect</h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3>Personal Information</h3>
                <p>Information you actively provide while creating or maintaining your account:</p>
                <ul>
                  {personalInformation.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Usage & Technical Information</h3>
                <p>Automatically collected telemetry that helps us secure and improve Bharat Mock:</p>
                <ul>
                  {usageInformation.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <h2>How We Use Your Information</h2>
            <ul>
              <li>Delivering mock tests, analytics dashboards, and personalized recommendations</li>
              <li>Authenticating logins, preventing fraudulent activity, and enforcing exam integrity</li>
              <li>Sending service notifications, exam reminders, and product updates</li>
              <li>Researching aggregated performance trends to improve product reliability</li>
              <li>Complying with applicable laws, audit obligations, and regulatory requests</li>
            </ul>

            <h2>How We Share Data</h2>
            <p>
              We never sell your personal data. We only share limited information with trusted
              partners under strict contractual terms when it is required to provide the service:
            </p>
            <ul>
              <li>Cloud hosting, analytics, and payment vendors who meet our security standards</li>
              <li>Government authorities when legally compelled to respond</li>
              <li>Professional advisors (lawyers, auditors) bound by confidentiality</li>
            </ul>

            <h2>Data Retention & Security</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3>Retention</h3>
                <p>
                  Exam history is retained for as long as you maintain an active account. We purge or
                  irreversibly anonymize dormant accounts after 24 months unless legally required to
                  retain them longer.
                </p>
              </div>
              <div>
                <h3>Security</h3>
                <p>We apply layered safeguards across infrastructure, application, and people:</p>
                <ul>
                  {safeguardingMeasures.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <h2>Your Privacy Rights</h2>
            <p>
              Depending on where you live, you may exercise the following rights by emailing
              privacy@bharatmock.com or visiting Settings → Privacy:
            </p>
            <ul>
              {userRights.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h2>Cookies & Tracking Technologies</h2>
            <p>
              We use first-party cookies for session management and third-party analytics to understand
              how learners navigate the platform. You may disable cookies in your browser, but certain key
              features such as timed examinations may not function correctly.
            </p>

            <h2>Children&apos;s Privacy</h2>
            <p>
              Bharat Mock does not knowingly collect information from children under 13. Accounts found to
              belong to minors will be promptly deactivated and data deleted, unless a parent or guardian
              provides verifiable consent.
            </p>

            <h2>Policy Updates</h2>
            <p>
              We review this policy at least once each year. Material changes will be announced via email
              and an in-app banner before they take effect.
            </p>

            <div className="rounded-2xl border border-muted bg-muted/30 p-6 flex flex-col gap-2">
              <Database className="h-8 w-8 text-primary" />
              <h3 className="font-display text-xl">Contact the Privacy Desk</h3>
              <p className="text-muted-foreground">
                Email <a href="mailto:privacy@bharatmock.com" className="text-primary underline">privacy@bharatmock.com</a>{' '}
                or call +91 1800-123-4567 for data access requests, incident reports, or general questions.
              </p>
              <p className="text-sm text-muted-foreground">
                Registered office: Bharat Mock EdTech Pvt. Ltd., 91Springboard, Koramangala, Bengaluru 560034
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
