'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface CustomTab {
  id: string;
  title: string;
  tab_key: string;
  description?: string | null;
  display_order: number;
}

interface TabNavigationProps {
  customTabs: CustomTab[];
  activeTabId: string | null;
  first: string;
  // Reserved Mock Tests / Previous Papers tabs — admin can hide each per subcategory.
  showMockTestsTab?: boolean;
  showPreviousPapersTab?: boolean;
}

const normalize = (value: string) =>
  value.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function TabNavigation({ customTabs, activeTabId, first, showMockTestsTab = false, showPreviousPapersTab = false }: TabNavigationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isTabListOpen, setIsTabListOpen] = useState(false);

  // Single source of truth for the tab list — drives both the horizontal strip and the
  // mobile "More" sheet so they never drift apart.
  const tabs = [
    { key: 'overview', label: 'Overview', href: `/${first}`, isActive: !activeTabId || activeTabId === 'overview' },
    ...customTabs.map((tab) => ({
      key: tab.id,
      label: tab.title,
      href: `/${first}/${normalize(tab.tab_key || tab.title || tab.id)}`,
      isActive: activeTabId === tab.id,
    })),
    ...(showMockTestsTab ? [{ key: 'mock-tests', label: 'Mock Tests', href: `/${first}/mock-tests`, isActive: activeTabId === 'mock-tests' }] : []),
    ...(showPreviousPapersTab ? [{ key: 'previous-papers', label: 'Previous Papers', href: `/${first}/previous-papers`, isActive: activeTabId === 'previous-papers' }] : []),
  ];

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = 200;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="container-main">
        <div className="flex items-center">
          {/* Left Arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="shrink-0 w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors mr-2"
              aria-label="Scroll tabs left"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
          )}
          
          <div
            ref={scrollRef}
            className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto py-3"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                tab.isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              {tab.label}
            </Link>
          ))}
          </div>

          {/* Mobile "More" button — always visible on small screens so every tab is
              reachable even when the strip overflows. Sits to the left of the right arrow. */}
          <button
            type="button"
            className="md:hidden shrink-0 whitespace-nowrap text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 ml-2"
            onClick={() => setIsTabListOpen(true)}
          >
            More
          </button>

          {/* Right Arrow */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="shrink-0 w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors ml-2"
              aria-label="Scroll tabs right"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile tab sheet — portalled to <body> so it escapes this component's
          `sticky z-30` stacking context; otherwise its z-index is capped below the
          navbar (z-50) and the navbar covers the Close button. */}
      {isTabListOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/80 z-[60] md:hidden">
          <div className="absolute inset-0 bg-white text-gray-900 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="text-lg font-bold text-gray-900">All Sections</div>
              <button
                type="button"
                className="text-sm font-medium text-blue-600"
                onClick={() => setIsTabListOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ul className="divide-y">
                {tabs.map((tab) => (
                  <li key={tab.key}>
                    <Link
                      href={tab.href}
                      onClick={() => setIsTabListOpen(false)}
                      className={`block w-full text-left px-5 py-4 text-base font-medium ${
                        tab.isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-800'
                      }`}
                    >
                      {tab.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
