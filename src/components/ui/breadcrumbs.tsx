import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  variant?: 'light' | 'dark';
}

export function Breadcrumbs({ items, className = '', variant = 'light' }: BreadcrumbsProps) {
  const isDark = variant === 'dark';
  
  const chevronClass = isDark 
    ? 'h-4 w-4 text-white/60 flex-shrink-0' 
    : 'h-4 w-4 text-gray-500 flex-shrink-0';
  
  const linkClass = isDark
    ? 'flex items-center gap-1.5 text-white/80 hover:text-white transition-colors'
    : 'flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors';
  
  const lastItemClass = isDark
    ? 'flex items-center gap-1.5 text-white font-medium'
    : 'flex items-center gap-1.5 text-gray-900 font-medium';
  
  const nonLastItemClass = isDark
    ? 'flex items-center gap-1.5 text-white/80'
    : 'flex items-center gap-1.5 text-gray-600';
  
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1 text-sm ${className}`}>
      <ol className="flex items-center gap-1 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className={chevronClass} />
              )}
              
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={linkClass}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={isLast ? lastItemClass : nonLastItemClass}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function HomeBreadcrumb(): BreadcrumbItem {
  return {
    label: 'Home',
    href: '/',
    icon: <Home className="h-3.5 w-3.5" />
  };
}

export function AdminBreadcrumb(): BreadcrumbItem {
  return {
    label: 'Admin',
    href: '/admin'
  };
}
