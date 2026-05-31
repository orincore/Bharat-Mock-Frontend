'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

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
  // Subcategory pages always show the reserved Mock Tests / Previous Papers tabs.
  showReservedTabs?: boolean;
}

const normalize = (value: string) =>
  value.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function TabNavigation({ customTabs, activeTabId, first, showReservedTabs = false }: TabNavigationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
            className="flex-1 flex items-center gap-1 overflow-x-auto py-3"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
          <Link
            href={`/${first}`}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              (!activeTabId || activeTabId === 'overview')
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            Overview
          </Link>
          {customTabs.map((tab) => {
            const tabSlug = normalize(tab.tab_key || tab.title || tab.id);
            const isActive = activeTabId === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/${first}/${tabSlug}`}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {tab.title}
              </Link>
            );
          })}
          {showReservedTabs && (
            <>
              <Link
                href={`/${first}/mock-tests`}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTabId === 'mock-tests'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                Mock Tests
              </Link>
              <Link
                href={`/${first}/previous-papers`}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTabId === 'previous-papers'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                Previous Papers
              </Link>
            </>
          )}
          </div>
          
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
    </div>
  );
}
