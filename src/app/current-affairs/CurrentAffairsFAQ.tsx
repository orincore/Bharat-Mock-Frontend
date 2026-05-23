"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqs = [
  { q: 'What is the best way to read daily current affairs for competitive exams?', a: "The best approach is a focused daily routine instead of reading everything. Spend 15-20 minutes on today's current affairs with important topics. Then take a quiz to test what you remember. Consistency beats last-minute revision." },
  { q: 'How many months of current affairs are important for exams?', a: 'Most competitive exams focus on the last six months of current affairs in India, making it the most important preparation window.' },
  { q: 'Is there a current affairs quiz available for today?', a: 'Yes, a daily quiz is available based on the latest updates. It will allow you to assess your knowledge and prepare you for the exam.' },
  { q: 'How many hours should I spend on current affairs daily?', a: 'You do not need long hours. About 15-20 minutes a day is sufficient if you have a focused mindset and stick with it.' },
  { q: 'How do I remember current affairs for a long time?', a: 'The best way is to read regularly and revise through quizzes or weekly PDFs. This helps improve long-term retention.' },
  { q: 'Is reading current affairs enough, or should I practice questions?', a: 'Reading alone is not enough. Practising questions helps improve recall, speed, and accuracy in exams.' },
  { q: 'What topics are covered in current affairs?', a: 'It covers national and international news, economy, science, sports, government schemes and other major events.' },
  { q: 'How is a current affairs mock test different from a quiz?', a: 'A quiz is a short test, meant for daily practice, while a mock test is a full-length test, meant for exam-like settings.' },
  { q: 'Can I download current affairs PDFs for revision?', a: 'Yes, there are weekly and monthly PDFs. These help with quick and organised revision.' },
  { q: 'What is the difference between the latest and the last six months of current affairs?', a: 'Latest current affairs cover daily updates, while the last six months provide a complete revision set, important for exams.' },
];

export function CurrentAffairsFAQ() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <section className="container-main py-10">
      <h2 className="font-display text-4xl font-bold text-foreground mb-8 text-center">FAQ&apos;s</h2>
      <p className="text-center text-muted-foreground mb-8">
        Find answers to common questions about current affairs preparation and daily learning.
      </p>

      <div className="space-y-4">
        {faqs.map((item, index) => {
          const isOpen = expandedFaq === index;
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
    </section>
  );
}
