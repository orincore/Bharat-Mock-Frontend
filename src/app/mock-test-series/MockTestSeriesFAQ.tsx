"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const allFaqs = [
  { q: 'Why are mock tests important for competitive exams?', a: 'A mock test is an exam you take that simulates a similar pattern, level and duration of the real exam. It can be an SSC mock test, a bank exam mock test or any other mock test; it will help improve speed, accuracy, and boost exam confidence.' },
  { q: 'How many mock tests should I attempt before my exam?', a: 'Take at least 15-20 mock tests prior to the exam. It can also help you perform better by familiarising yourself with the exam format.' },
  { q: 'Are the mock tests based on the latest exam pattern?', a: 'Yes, all mock tests are updated as per the latest pattern and syllabus, so you can practise the latest questions.' },
  { q: 'Will I get solutions after each mock test?', a: 'Yes, you gain access to detailed solutions and explanations for each test, to learn from your errors and improve your accuracy.' },
  { q: 'Is there a bank mock test for all major exams?', a: 'Yes, mock tests are available for IBPS PO, Clerk, SBI PO, SBI Clerk, RBI Assistant and others, which are as per the actual exam difficulty level.' },
  { q: 'Is there a railway mock test available?', a: 'Yes, you can find railway mock tests for RRB NTPC, Group D, ALP, JE, RPF and other exams as per the latest pattern.' },
  { q: 'Can I attempt the railway mock test in Hindi?', a: 'Yes, a railway mock test in Hindi is available (as well as English), so you can select the language before attempting the test.' },
  { q: 'Are mock tests available in police exam format?', a: 'Yes, you can attempt mock tests on the basis of police test question papers for GK, Reasoning, Maths and Current Affairs as per the syllabus.' },
  { q: 'Can I attempt mock tests on mobile?', a: 'Yes, mock tests can be done on a mobile phone, tablet, or laptop without installing any app.' },
  { q: 'Can I re-attempt mock tests?', a: 'Yes, you can attempt mock tests in practice mode again and again to analyse the progress and improve your weak areas.' },
];

const paymentFaqs = [
  { q: 'Are all mock tests free on this platform?', a: 'Unfortunately, only some mock tests are available for free. Full mock tests are covered by a plan that offers access to all exams.' },
  { q: 'Why are most mock tests paid?', a: 'Our mock tests are developed by experts, regularly updated, with solutions and analysis. This quality preparation system is sustained by paid plans.' },
  { q: 'How do I purchase a mock test plan?', a: 'Visit the Plans section, select your exam plan and make the payment. You can access your plan immediately after payment.' },
  { q: 'What payment methods are accepted?', a: 'You can choose to pay with UPI, Credit & Debit card, Net banking or using wallets - Paytm or PhonePe.' },
  { q: 'Can I share my account with others?', a: 'No, each account is for individual use only. Sharing may lead to suspension without refund.' },
  { q: 'How long is the paid plan valid?', a: 'The plan you select will determine the duration, which is clearly stated before purchasing. Always check before payment.' },
  { q: 'Does the plan auto-renew?', a: 'There is an option for auto-renewal. You can TURN-ON the auto-renewal option.' },
  { q: 'Can I use my plan on mobile and laptop?', a: 'Yes, you can use any device. All you need to do is log in to the same account.' },
];

export function MockTestSeriesFAQ() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'All' | 'Payments'>('All');

  const tabs = [
    { key: 'All' as const, label: 'All FAQ', faqs: allFaqs },
    { key: 'Payments' as const, label: 'Payment FAQ', faqs: paymentFaqs },
  ];

  return (
    <section className="container-main mt-16 mb-12">
      <h2 className="font-display text-4xl font-bold text-foreground mb-8 text-center">
        FAQ&apos;s
      </h2>

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

      {/* Both tab groups always in DOM; inactive tab hidden with CSS so Google reads all answers */}
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
                  <h3 className="font-medium text-foreground text-base">
                    {index + 1}. {item.q}
                  </h3>
                  {isOpen
                    ? <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  }
                </button>
                {/* Answer always in DOM; max-height animates open/close */}
                <div
                  className="overflow-hidden transition-[max-height] duration-300 ease-in-out border-t border-border"
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
