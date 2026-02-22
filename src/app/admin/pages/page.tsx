"use client";

import { useRouter } from 'next/navigation';
import { FileText, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';

const PAGES = [
  {
    id: 'exam-page',
    title: 'Exam Page',
    description: 'Manage popular mock test series section on the exams page',
    href: '/admin/pages/exam-page',
    icon: FileText
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
            Configure content and sections for different pages across the platform
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
