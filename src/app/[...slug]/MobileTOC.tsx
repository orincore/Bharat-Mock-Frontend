"use client";

import React, { useState } from 'react';
import { List, X } from 'lucide-react';

interface TocEntry {
  id: string;
  label: string;
}

export default function MobileTOC({ tableOfContents }: { tableOfContents: TocEntry[] }) {
  const [open, setOpen] = useState(false);

  if (!tableOfContents.length) return null;

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top, behavior: 'smooth' });
    setOpen(false);
  };

  return (
    <div className="lg:hidden">
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      )}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm text-foreground">Table of Contents</span>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted transition">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <nav className="overflow-y-auto max-h-[60vh] pb-safe p-3 space-y-0.5">
          {tableOfContents.map((entry, idx) => (
            <button
              key={`${entry.id || 'toc'}-${idx}`}
              type="button"
              onClick={() => scrollToAnchor(entry.id)}
              className="w-full flex items-start gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted hover:text-primary transition text-left group"
            >
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0 group-hover:bg-primary" />
              <span className="text-foreground group-hover:text-primary leading-snug">{entry.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-4 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold"
      >
        <List className="h-4 w-4" />
        Contents
      </button>
    </div>
  );
}
