"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const allFaqs = [
  { q: 'Can I retake a Live Test after it has ended?', a: 'Yes, you can attempt Live Tests again in practice mode after the live window closes. This enables you to rework and compare your two attempts and measure progress over time.' },
  { q: 'What is the difference between a Live Test and a Normal Mock Test?', a: "You can take a regular mock test at your own pace anytime. A Live Test is scheduled, has real-time competition with other aspirants and a live leaderboard that keeps updating as you attempt. It's the real exam-day adrenaline that a solo mock simply can't give you." },
  { q: 'How to join a Live Test on Bharat Mock?', a: 'To join the live test, log in to Bharat Mock, click on the Live Tests, select your exam category and then click on Join.' },
  { q: 'What exams are covered under Bharat Mock Live Tests?', a: 'Our mock tests are available for SSC, Banking, Railways, UPSC, State PSC, CTET, Defence, Insurance and many more exams.' },
  { q: 'Are Live Tests available in Hindi and English both?', a: 'Yes. The Live Tests are bilingual so that students from all the regions of India can attempt the tests easily in their own preferred language.' },
  { q: 'What if I miss a scheduled Live Test?', a: 'Certain tests may be re-attempted at a later date. But you will not be included in the live leaderboard. It is best to take the test during the live window for a competitive experience.' },
  { q: 'Do live tests follow the real exam pattern?', a: 'Yes, Live tests are based on the exam format, so you can get an experience of the actual exam.' },
  { q: 'How many Live Tests are held in a week on Bharat Mock?', a: 'We have several live tests every week in different categories. Your dashboard will have a calendar where you can plan to take the Live tests.' },
  { q: 'Will I get a performance report after each Live Test?', a: 'Yes. Along with every test, you will get a report containing your marks, accuracy, question-wise time, topic-wise score, hesitation report and your percentile among the best candidates.' },
];

const paymentFaqs = [
  { q: 'Can I stop a live test once it starts?', a: 'Yes, you can use your plan on all devices. Simply log in to your account to access the tests on any device.' },
  { q: 'Can I give paid Live Tests on both mobile and laptop?', a: 'Yes, your plan works on all devices. Just log in with your account to take tests anywhere.' },
  { q: 'Is it possible to share my Bharat Mock account after purchasing a plan?', a: 'No. Accounts are not shareable. If you share your account, you may be blocked from accessing your account.' },
  { q: 'How to buy a paid Live Test plan on Bharat Mock?', a: 'Sign in to your account, go to the Plans or Subscription page, choose your plan and pay the amount. You can access your account immediately with a successful payment.' },
  { q: 'How long is my paid Live Test plan valid for?', a: "The duration of the plan depends on which plan you buy. It's displayed on the plan page." },
  { q: 'Is it possible to upgrade my plan later?', a: 'Yes, you can upgrade anytime. It will be calculated based on your plan and validity.' },
  { q: 'What do I do if my internet drops during the test?', a: 'You will be able to rejoin a test, but time will continue to be counted.' },
  { q: 'Which Live Tests are free and which are paid?', a: 'You can spot Free Live Tests on the Live Tests page - they are clearly marked as "Free". Other tests require a plan. Register and then filter by free, premium or browse the schedule.' },
];

const tabs = [
  { key: 'All' as const, label: "All FAQ's", faqs: allFaqs },
  { key: 'Payments' as const, label: "Most Asked FAQ's", faqs: paymentFaqs },
];

export function LiveTestsFAQ() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'All' | 'Payments'>('All');

  return (
    <section className="container-main mt-16 mb-12">
      <div className="text-center space-y-3 mb-8">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">All FAQ&apos;s</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Understand how live tests, quizzes, and analysis help improve your preparation.
        </p>
      </div>

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

      {/* Both tab groups always in DOM so Google reads all answers */}
      {tabs.map(({ key, faqs }) => (
        <div
          key={key}
          aria-hidden={activeTab !== key}
          className={`space-y-4 ${activeTab !== key ? 'hidden' : ''}`}
        >
          {faqs.map((item, index) => {
            const isOpen = activeTab === key && expandedFaq === index;
            return (
              <div key={item.q} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
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
                  className="overflow-hidden transition-[max-height] duration-300 ease-in-out border-t border-border"
                  style={{ maxHeight: isOpen ? '600px' : '0px' }}
                  aria-hidden={!isOpen}
                >
                  <div className="px-6 py-4 bg-muted/30">
                    <p className="text-sm text-slate-700 leading-relaxed">{item.a}</p>
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
