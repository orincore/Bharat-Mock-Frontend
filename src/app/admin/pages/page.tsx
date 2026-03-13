"use client";

import { useRouter } from 'next/navigation';
import { FileText, ChevronRight, Layers, CreditCard, Home, Settings, Shield, FileX } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';

const PAGES = [
  {
    id: 'homepage',
    title: 'Homepage',
    description: 'Manage homepage content, hero sections, and featured elements',
    href: '/admin/homepage',
    icon: Home
  },
  {
    id: 'header',
    title: 'Header & Navigation',
    description: 'Configure site header, navigation menu, and top-level links',
    href: '/admin/navigation',
    icon: Settings
  },
  {
    id: 'footer',
    title: 'Footer',
    description: 'Manage footer content, links, and site-wide footer elements',
    href: '/admin/footer',
    icon: Settings
  },
  {
    id: 'about',
    title: 'About Page',
    description: 'Edit about us page content, team information, and company details',
    href: '/admin/about',
    icon: FileText
  },
  {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    description: 'Manage privacy policy content and data protection information',
    href: '/admin/privacy',
    icon: Shield
  },
  {
    id: 'disclaimer',
    title: 'Disclaimer',
    description: 'Edit disclaimer content and legal notices',
    href: '/admin/disclaimer',
    icon: FileX
  },
  {
    id: 'exam-page',
    title: 'Exam Page',
    description: 'Manage popular mock test series section on the exams page',
    href: '/admin/pages/exam-page',
    icon: FileText
  },
  {
    id: 'test-series-sidebar',
    title: 'Test Series',
    description: 'Manage Everything for the test series detail page',
    href: '/admin/pages/test-series-sidebar',
    icon: Layers
  },
  {
    id: 'live-tests-hero',
    title: 'Live Tests Page',
    description: 'Upload and configure the hero banner for live tests',
    href: '/admin/pages/live-tests',
    icon: Layers
  },
  {
    id: 'subscription-page',
    title: 'Subscription Page',
    description: 'Manage subscription plans, pricing, and page content',
    href: '/admin/subscription-page',
    icon: CreditCard
  }
];

export default function PagesAdmin() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumbs
            items={[
              AdminBreadcrumb(),
              { label: 'Pages' }
            ]}
            className="mb-3"
          />
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Page Management
          </h1>
          <p className="text-muted-foreground">
            Configure content and sections for different pages across the platform. Manage site-wide pages, content sections, and page-specific settings.
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PAGES.map((page) => (
            <Card
              key={page.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(page.href)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <page.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {page.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {page.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
