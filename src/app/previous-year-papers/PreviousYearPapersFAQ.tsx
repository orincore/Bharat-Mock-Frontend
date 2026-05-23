"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const allFaqs = [
  { q: 'Where can I find previous year question papers for all government exams?', a: 'You can find previous year question papers for government exams on Bharat Mock. Some papers are free to access, while others are premium.' },
  { q: 'How often are new papers added to Bharat Mock?', a: 'New papers are added regularly, especially after major government exams are conducted. In addition, the archive is kept updated, so aspirants always have access to the latest papers.' },
  { q: 'Which exams are covered on Bharat Mock?', a: 'We cover 70+ government exams. For example, SSC CGL, SSC CHSL, SSC MTS, IBPS PO, SBI Clerk, RBI Grade B, Railway NTPC, Railway Group D, Police Bharti, and many more.' },
  { q: 'Are SSC previous year question papers available with solutions?', a: 'Yes, they are. In fact, all SSC previous year question papers come with full solutions and detailed explanations, so you understand the concept, not just the answer.' },
  { q: "Can I get the bank's previous year question papers on Bharat Mock?", a: "Yes, absolutely. You can access the bank's previous year question papers for IBPS PO, SBI Clerk, SBI PO, RBI Grade B, IBPS Clerk, and other banking exams in one place." },
  { q: 'Is there an SSC previous year question paper in Hindi PDF available?', a: 'Yes. We provide SSC previous year question papers in both Hindi and English. So, if you are preparing in Hindi medium, you can easily access bilingual papers and solutions.' },
  { q: 'How many years of previous year papers are available on Bharat Mock?', a: 'For the most popular exams, we offer multiple years of papers. In fact, for exams such as SSC CGL, you can find papers from the last 5-6 years, and for IBPS PO, you can find papers from the last 5 years.' },
  { q: 'How do previous year papers help in government exam preparation?', a: 'Previous year papers help you understand the exam pattern, identify important topics, improve time management, and build confidence. That is why they are one of the most effective tools for exam preparation.' },
  { q: "Are the railway's previous year question papers available on Bharat Mock?", a: 'Yes, they are. You can find Railway NTPC, Railway Group D, and ALP previous year question papers with complete solutions in both Hindi and English.' },
  { q: 'Can I practice section-wise from previous year papers?', a: 'Yes, you can. In fact, all papers are organised section-wise and topic-wise. So you can easily practice Quantitative Aptitude, Reasoning, or English based on your weak areas.' },
];

const mostAskedFaqs = [
  { q: 'Are all previous year question papers free on Bharat Mock?', a: 'No, not all PYQs are free. You can find both free and paid papers, so you can get started with your preparation and also purchase the paid papers for better preparation.' },
  { q: 'Why are some PYQs paid?', a: 'Some PYQs are paid as they are more organised and have verified solutions. This allows serious students to practice in a more structured manner.' },
  { q: 'What do I get in paid PYQs?', a: 'With paid PYQs, you get well-organised question papers, detailed solutions, and exam-focused practice sets that make your preparation clearer and more effective.' },
  { q: 'Can I prepare with free PYQs only?', a: 'Yes, you can. Free PYQs are sufficient to start with your preparation. But paid papers allow you to learn more.' },
  { q: 'Is it worth buying paid PYQs?', a: 'Yes, it is. Paid PYQs give you better practice quality and help you understand real exam patterns more clearly, which improves your preparation.' },
  { q: 'How do I access paid question papers?', a: 'Once your payment is completed, the paid PYQs are unlocked instantly. After that, you can access them anytime from your account.' },
  { q: 'Can I use both free and paid PYQs together?', a: "Yes, and that's a good idea. Free papers give you some basic preparation, and paid papers enhance your practice and understanding." },
  { q: 'Are paid PYQs updated regularly?', a: "Yes, they are regularly updated with the latest exam pattern and trends, so you don't miss out on any important information." },
  { q: 'Do paid PYQs include solutions?', a: 'Yes, most paid PYQs come with clear and detailed solutions so you can understand the concepts properly.' },
  { q: 'Is payment safe on Bharat Mock?', a: 'Yes, all payments are completely secure and processed through trusted payment gateways.' },
];

const tabs = [
  { key: 'All' as const, label: 'All FAQ', faqs: allFaqs },
  { key: 'MostAsked' as const, label: 'Most Asked', faqs: mostAskedFaqs },
];

export function PreviousYearPapersFAQ() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'All' | 'MostAsked'>('All');

  return (
    <section className="container-main py-10">
      <h2 className="font-display text-4xl font-bold text-foreground mb-8 text-center">FAQ&apos;s</h2>
      <p className="text-center text-muted-foreground mb-8">
        All your doubts about previous year question papers, solutions, and exam prep are explained clearly in one place.
      </p>

      <div className="flex gap-2 mb-8 border-b border-border">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setExpandedFaq(null); setActiveTab(key); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tabs.map(({ key, faqs }) => (
        <div
          key={key}
          aria-hidden={activeTab !== key}
          className={`space-y-4 ${activeTab !== key ? 'hidden' : ''}`}
        >
          {faqs.map((item, index) => {
            const isOpen = activeTab === key && expandedFaq === index;
            return (
              <div key={item.q} className="bg-card border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(isOpen ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                  aria-expanded={isOpen}
                >
                  <h3 className="font-medium text-foreground text-base">{index + 1}. {item.q}</h3>
                  {isOpen
                    ? <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  }
                </button>
                <div
                  className="border-t border-border overflow-hidden transition-[max-height] duration-300 ease-in-out"
                  style={{ maxHeight: isOpen ? '600px' : '0px' }}
                  aria-hidden={!isOpen}
                >
                  <div className="px-6 py-4 bg-muted/30">
                    <p className="text-slate-700">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
