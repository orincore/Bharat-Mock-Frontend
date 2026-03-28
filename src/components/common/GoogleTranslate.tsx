"use client";

import { useEffect } from 'react';

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

export function GoogleTranslate() {
  useEffect(() => {
    // Defer until after page is fully interactive — never block LCP
    const load = () => {
      let attempts = 0;

      const init = () => {
        const container = document.getElementById('google_translate_element');
        if (!container) return;

        if (window.google?.translate?.TranslateElement) {
          try {
            container.innerHTML = '';
            new window.google.translate.TranslateElement(
              {
                pageLanguage: 'en',
                includedLanguages: 'en,hi,mr',
                layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false,
              },
              'google_translate_element'
            );
            setTimeout(() => window.dispatchEvent(new Event('googleTranslateReady')), 500);
          } catch (_e) {
            // silent — translate is non-critical
          }
        } else if (attempts < 20) {
          attempts++;
          setTimeout(init, 300);
        }
      };

      window.googleTranslateElementInit = init;

      if (!document.querySelector('script[src*="translate.google.com"]')) {
        const script = document.createElement('script');
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        // defer + async = loads after HTML parsed, never blocks render
        script.async = true;
        script.defer = true;
        document.body.appendChild(script); // body not head — further deferred
      } else {
        init();
      }
    };

    // Wait until browser is idle (after LCP) before loading translate
    if ('requestIdleCallback' in window) {
      requestIdleCallback(load, { timeout: 4000 });
    } else {
      setTimeout(load, 3000);
    }
  }, []);

  return (
    <div
      id="google_translate_element"
      style={{ position: 'fixed', top: '-9999px', left: '-9999px', visibility: 'hidden', pointerEvents: 'none' }}
    />
  );
}
