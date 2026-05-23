"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const allFaqs = [
  { q: 'Which is the best quiz to start with as a beginner?', a: 'Start with a subject-wise quiz on your strongest subject first. It builds confidence early. Once you are comfortable, try mixed quizzes that have mixed questions from multiple subjects, similar to your actual SSC quiz or banking quiz paper.' },
  { q: 'How is a quiz different from a full mock test?', a: 'A mock test covers the full paper in one go. A quiz is shorter, more specific to one topic or subject and gives you faster feedback.' },
  { q: 'Can I filter quizzes by exam and difficulty?', a: 'Yes. You can pick quizzes by type of exam, topic, difficulty and language. From a basic railway quiz to a complex banking quiz on Data Interpretation, you can choose the quiz you want.' },
  { q: 'Do quizzes follow negative marking like the actual exam?', a: 'Yes, the CBT-style quizzes follow the exact same negative marking as the official pattern, so that you learn to attempt questions confidently before the actual paper.' },
  { q: 'How many quizzes should I attempt in a day?', a: "It's better to attempt two or three quizzes per day rather than ten quizzes. Consistency and quality are key in any govt exam." },
  { q: 'Are there quizzes for current affairs and GK?', a: 'Yes. Current Affairs Quizzes are published every day, so you can keep up-to-date with news and events without having to read a newspaper.' },
  { q: 'Can I attempt quizzes without creating an account?', a: "You can view the quizzes, but to save time and progress to track your improvement and build your own personal weak area list while you revise, you will need to register (it's free)." },
  { q: 'Are police quiz questions based on state-specific patterns?', a: 'Yes. We offer state paper pattern police quizzes for various topics like General knowledge, reasoning, current affairs, in the same pattern you will get in your state exam.' },
  { q: 'What happens if I run out of time during a quiz?', a: 'The quiz will automatically submit when the time is over, as in a CBT paper. Your attempt is evaluated, giving you an instant result.' },
];

const mostAskedFaqs = [
  { q: 'Are quizzes updated after every official exam notification?', a: 'Yes. Whenever a new notification is released or an exam pattern changes, our team updates the relevant quiz sets within a few days. This ensures your practice always matches the latest exam trends.' },
  { q: 'Can I attempt quizzes on my mobile?', a: 'All quizzes are mobile-friendly. You can take any quiz on any device, anywhere and anytime you want.' },
  { q: 'Do I get answers and explanations after the quiz?', a: 'Yes. With all quizzes, explanations are provided to understand the concepts, and hence improve your performance.' },
  { q: 'Are quizzes available in Hindi and English?', a: 'Yes, all quizzes are in Hindi and English. This ensures students are well prepared for bilingual exams.' },
  { q: 'Are quiz questions repeated in real exams?', a: 'Questions may not be the same, but patterns are quite similar to the actual exams, such as SSC and banking. This lets you know the exam pattern.' },
  { q: 'Are SSC quiz questions based on previous year papers?', a: 'Yes. SSC quiz questions are set according to previous year papers of SSC CGL, CHSL, and MTS, so you get to practice actual exam questions.' },
  { q: 'Can I prepare for multiple exams at the same time on Bharat Mock?', a: 'Yes. You can practice the SSC quiz, the banking quiz, and the railway quiz in one account, and it will track your score.' },
  { q: 'Are quizzes enough, or do I need mock tests too?', a: 'Both are important. Practice quizzes help to learn new things fast, while mock tests give you an idea of how ready you are for the exam. Both are best.' },
  { q: 'How many questions are there in each quiz?', a: "Each quiz has 10 to 20 questions, depending on the level. It's brief enough to finish in a reasonable time, but long enough to practise." },
  { q: 'What happens if I accidentally close the quiz or lose internet connection?', a: 'Your answers are automatically saved. You will be able to start from the last question answered.' },
];

const tabs = [
  { key: 'All' as const, label: 'All FAQ', faqs: allFaqs },
  { key: 'MostAsked' as const, label: 'Most Asked', faqs: mostAskedFaqs },
];

export function QuizzesFAQ() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'All' | 'MostAsked'>('All');

  return (
    <section className="container-main py-10">
      <h2 className="font-display text-4xl font-bold text-foreground mb-8 text-center">FAQ&apos;s</h2>
      <p className="text-center text-muted-foreground mb-8">Everything you need to know before you attempt your first quiz</p>

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
