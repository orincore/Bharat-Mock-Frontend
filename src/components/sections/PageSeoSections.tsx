"use client";

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';

const allFaqs = [
  { q: 'Are Bharat Mock tests really free to attempt?', a: 'Yes. Every registered user gets instant access to curated free tests across SSC, IBPS, SBI, Railways, NDA, and more. Premium series exist for deeper analytics, but the entry tier is always free.' },
  { q: 'How often are exam patterns updated?', a: 'Our content team refreshes question banks every time TCS/NTA updates the blueprint or releases a new notification, ensuring alignment with 2026 exam trends.' },
  { q: 'Can I attempt tests anytime on mobile?', a: 'Absolutely. The platform is responsive and supports Android/iOS browsers. You can attempt, pause, and resume on any device with stable internet.' },
  { q: 'Do I get AIR (All India Rank) after each mock?', a: 'Yes. After submitting, you receive All India Rank, percentile, accuracy, and topic-level insights driven by our analytics engine.' },
  { q: 'How many exams are covered right now?', a: 'We cover 80+ central and state exams—from SSC CGL, CHSL, JE to SBI PO, IBPS Clerk, Railway NTPC, Group D, CDS, AFCAT, and more.' },
  { q: 'Can I download solutions or explanations?', a: 'Each question carries explainers, shortcuts, and PDF exports so you can revise offline and share notes with friends.' },
  { q: 'Is there sectional timing like the actual CBT?', a: 'Yes, our mock engine simulates sectional timing, negative marking, and auto-submit behavior exactly like SSC and Banking CBTs.' },
  { q: 'How do I track progress across attempts?', a: 'Navigate to your dashboard to view attempt history, accuracy trendlines, and topic heatmaps that highlight weak zones.' },
  { q: 'Can I retake the same mock?', a: 'You can retake most free tests multiple times. Scores are stored separately so you can benchmark improvement.' },
  { q: 'Do you provide bilingual tests?', a: 'Yes. Most of our mock tests support English and Hindi, and we continue to add more regional language support based on demand.' },
];

const paymentFaqs = [
  { q: 'What payment methods are accepted?', a: 'We accept UPI (GPay, PhonePe, Paytm), Net Banking, Credit/Debit Cards (Visa, Mastercard, RuPay), and popular wallets via Razorpay.' },
  { q: 'Is my payment information secure?', a: 'Yes. All transactions are processed through Razorpay, a PCI-DSS compliant payment gateway. We never store your card details on our servers.' },
  { q: 'Can I get a refund if I am not satisfied?', a: 'We offer a 7-day refund policy for premium subscriptions. If you face any issues, contact support@bharatmock.com within 7 days of purchase.' },
  { q: 'Will I get a receipt or invoice for my payment?', a: 'Yes. A payment confirmation email with a GST invoice is sent to your registered email address immediately after a successful transaction.' },
  { q: 'What happens if my payment fails but money is deducted?', a: 'In case of a failed transaction where money is deducted, it is automatically refunded to your source account within 5–7 business days. Contact us if it takes longer.' },
  { q: 'Are there any hidden charges or auto-renewals?', a: 'No hidden charges. Subscriptions do not auto-renew unless you explicitly enable it. You will always be notified before any renewal.' },
  { q: 'Can I upgrade or downgrade my subscription plan?', a: 'Yes. You can upgrade your plan at any time and pay only the prorated difference. Downgrades take effect at the end of the current billing cycle.' },
  { q: 'Do you offer student discounts or group pricing?', a: 'Yes, we periodically offer discounts for students and group enrollments. Check the Subscriptions page or contact us for bulk pricing.' },
];

interface PageSeoSectionsProps {
  faqTitle?: string;
  faqSubtitle?: string;
  testimonialsDescription?: string;
  whyTitle?: string;
  whySubtitle?: string;
  seoContent?: React.ReactNode;
}

export function PageSeoSections({
  faqTitle = "FAQ's",
  faqSubtitle = "Everything you need to know—compiled from the questions aspirants ask our support mentors most often.",
  testimonialsDescription = "Real feedback from toppers and serious contenders—curated from app reviews and our student community.",
  whyTitle = "Why take Bharat Mock Test Series?",
  whySubtitle = "Whether you attempt a live mock or a rapid-fire quiz, the Bharat Mock ecosystem goes beyond scores. Each pillar below highlights the key advantages that help you prepare smarter.",
  seoContent,
}: PageSeoSectionsProps) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeFaqTab, setActiveFaqTab] = useState<'All' | 'Payments'>('All');

  const activeFaqs = activeFaqTab === 'All' ? allFaqs : paymentFaqs;

  return (
    <>
      {/* Why take Bharat Mock */}
      <section className="bg-background border border-border/60 rounded-3xl shadow-sm p-8 md:p-12 space-y-8 mt-10">
        <div className="text-center space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-secondary font-semibold">Reasons to trust Bharat Mock</p>
          <h2 className="font-display text-3xl font-bold text-foreground">{whyTitle}</h2>
          <p className="text-muted-foreground mx-auto">{whySubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute top-6 right-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="absolute -top-2 -right-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-lg">NEW</span>
              </div>
            </div>
            <div className="mt-20 space-y-3">
              <h3 className="font-display text-xl font-bold">Latest Exam Patterns</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Mocks and quizzes replicate the freshest shifts in exam blueprints so that the difficulty you face on test day feels familiar.</p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute top-6 right-6">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
            </div>
            <div className="mt-20 space-y-3">
              <h3 className="font-display text-xl font-bold">Save Tests & Questions</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Bookmark clutch attempts, tricky questions, or entire fixtures to retake them when revision week arrives.</p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          <div className="group relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute top-6 right-6">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="mt-20 space-y-3">
              <h3 className="font-display text-xl font-bold">In-depth Performance Analysis</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Access strength vs. weakness reports, percentile charts, and topper comparisons immediately after every attempt.</p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <TestimonialsSection className="mt-10" description={testimonialsDescription} />

      {/* SEO Content — rendered just before FAQ */}
      {seoContent && <div className="mt-10">{seoContent}</div>}

      {/* FAQ */}
      <section className="py-10">
        <div>
          <h2 className="font-display text-4xl font-bold text-foreground mb-8 text-center">{faqTitle}</h2>
          <p className="text-center text-muted-foreground mb-8">{faqSubtitle}</p>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-border">
            {(['All', 'Payments'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setExpandedFaq(null); setActiveFaqTab(tab); }}
                className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                  activeFaqTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'All' ? 'All FAQ' : 'Payment FAQ'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {activeFaqs.map((item, index) => (
              <div key={item.q} className="bg-card border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                >
                  <h3 className="font-medium text-foreground text-base">{index + 1}. {item.q}</h3>
                  {expandedFaq === index
                    ? <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  }
                </button>
                {expandedFaq === index && (
                  <div className="px-6 py-4 bg-muted/30 border-t border-border">
                    <p className="text-slate-700">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
