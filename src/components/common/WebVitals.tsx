'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send to your analytics endpoint
    // console.log(metric);
    
    // Example: Send to Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        value: Math.round(metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true,
      });
    }
    
    // Example: Send to your backend
    // fetch('/api/vitals', {
    //   method: 'POST',
    //   body: JSON.stringify(metric),
    //   keepalive: true,
    // });
  });

  return null;
}
