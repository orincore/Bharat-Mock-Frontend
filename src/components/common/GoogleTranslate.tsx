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
    let initAttempts = 0;
    const maxAttempts = 20;

    const initializeTranslate = () => {
      const container = document.getElementById('google_translate_element');
      
      if (!container) {
        console.error('Google Translate container not found in DOM');
        initAttempts++;
        if (initAttempts < maxAttempts) {
          setTimeout(initializeTranslate, 300);
        }
        return;
      }

      if (window.google?.translate?.TranslateElement) {
        try {
          // Clear any existing content
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
          
          setTimeout(() => {
            window.dispatchEvent(new Event('googleTranslateReady'));
          }, 500);
        } catch (error) {
          console.error('Error initializing Google Translate:', error);
        }
      } else {
        initAttempts++;
        if (initAttempts < maxAttempts) {
          setTimeout(initializeTranslate, 300);
        } else {
          console.error('Failed to initialize Google Translate after multiple attempts');
        }
      }
    };

    // Define the initialization function
    window.googleTranslateElementInit = initializeTranslate;

    // Load the Google Translate script
    const existingScript = document.querySelector('script[src*="translate.google.com"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.onerror = () => console.error('Failed to load Google Translate script');
      document.head.appendChild(script);
    } else {
      initializeTranslate();
    }

    return () => {
      // Cleanup
    };
  }, []);

  return (
    <div 
      id="google_translate_element" 
      style={{ 
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        visibility: 'hidden',
        pointerEvents: 'none'
      }}
    ></div>
  );
}
