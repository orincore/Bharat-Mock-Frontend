'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpenText } from 'lucide-react';
import { MathRenderer } from '@/components/common/MathRenderer';
import type { Passage } from '@/types';

interface PassagePaneProps {
  passage: Passage;
  /** 'column': dedicated sticky reading pane (desktop attempt UI). 'inline': block above a
   *  cluster of cards (review page) — no sticky positioning, same collapse behavior. */
  variant?: 'column' | 'inline';
  className?: string;
}

/**
 * Shared comprehension-passage reading pane. Always fully visible at `lg:` and up
 * (a real dedicated column). Below `lg:` it's open by default too — the learner
 * needs the passage to answer the question — but can be collapsed via the toggle
 * if a long passage is pushing the question/options too far down.
 */
export function PassagePane({ passage, variant = 'column', className = '' }: PassagePaneProps) {
  const [expanded, setExpanded] = useState(true);

  if (!passage?.content) return null;

  const isColumn = variant === 'column';

  return (
    <div
      className={`bg-white border border-slate-200 rounded-none md:rounded-xl shadow-sm flex flex-col min-h-0 ${isColumn ? 'lg:h-full lg:overflow-hidden' : ''
        } ${className}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="lg:hidden w-full flex items-center justify-between gap-2 px-4 py-3 text-left border-b border-slate-100"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-[13px] font-bold text-slate-800">
          <BookOpenText className="h-4 w-4 shrink-0 text-slate-500" />
          {passage.title || 'Reading Passage'}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        )}
      </button>

      <div className="hidden lg:flex items-center gap-2 px-4 md:px-5 py-3 border-b border-slate-100 shrink-0">
        <BookOpenText className="h-4 w-4 shrink-0 text-slate-500" />
        <span className="text-[13px] font-bold text-slate-800">{passage.title || 'Reading Passage'}</span>
      </div>

      <div
        // lg:min-h-0 is what actually makes this scroll. As a flex item it defaults to
        // min-height:auto, which refuses to shrink below the content height — so
        // overflow-y-auto never engaged and the parent's overflow-hidden silently
        // clipped long passages instead of scrolling them.
        // Below lg the pane is a collapsible block in the normal page flow, so it gets
        // a viewport-relative cap of its own rather than growing without limit and
        // pushing the question off-screen.
        // Scrollbar hidden (still scrollable) to match the section tab bar's treatment.
        className={`${expanded ? 'block' : 'hidden'} lg:block px-4 md:px-5 py-4 max-h-[50vh] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isColumn ? 'lg:flex-1 lg:min-h-0 lg:max-h-none' : 'lg:max-h-none'
          }`}
      >
        <MathRenderer
          html={passage.content}
          // max-h keeps a tall pasted image from pushing the passage text out of the
          // reading pane; w-auto/h-auto preserve the aspect ratio as it scales down.
          className="rich-text-content passage-content leading-relaxed text-[14px] md:text-[15px] text-slate-700 [&_img]:max-w-full [&_img]:max-h-[200px] [&_img]:w-auto [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-3 [&_img]:mx-auto [&_img]:block"
        />
      </div>
    </div>
  );
}
