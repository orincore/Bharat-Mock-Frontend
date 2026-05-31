"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
    _gtInitialized?: boolean;
  }
}

function getLang(pathname: string): string {
  // URL prefix takes priority — /hi/... always means Hindi, /en/... means English
  if (pathname === "/hi" || pathname.startsWith("/hi/")) return "hi";
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  // Fall back to NEXT_LOCALE cookie (set by LanguageSelector)
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/NEXT_LOCALE=([a-z]{2})/);
  return match ? match[1] : "en";
}

function initWidget(lang: string) {
  const container = document.getElementById("google_translate_element");
  if (!container) return;

  container.innerHTML = "";
  window._gtInitialized = false;

  try {
    new window.google.translate.TranslateElement(
      {
        pageLanguage: "en",
        includedLanguages: "en,hi",
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false,
      },
      "google_translate_element"
    );
    window._gtInitialized = true;

    // Programmatically select the target language
    if (lang !== "en") {
      const applyLang = (tries = 0) => {
        const select = document.querySelector(
          ".goog-te-combo"
        ) as HTMLSelectElement | null;
        if (select) {
          select.value = lang;
          select.dispatchEvent(new Event("change"));
        } else if (tries < 20) {
          setTimeout(() => applyLang(tries + 1), 200);
        }
      };
      applyLang();
    }
  } catch {
    // silent
  }
}

function loadScript(onReady: () => void) {
  if (document.querySelector('script[src*="translate.google.com"]')) {
    if (window.google?.translate?.TranslateElement) {
      onReady();
    } else {
      window.googleTranslateElementInit = onReady;
    }
    return;
  }

  window.googleTranslateElementInit = onReady;
  const script = document.createElement("script");
  script.src =
    "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.head.appendChild(script);
}

// Routes that handle their own translation — skip the widget on these
const WIDGET_EXCLUDED = ['/attempt/'];

export function GoogleTranslate() {
  const pathname = usePathname();

  useEffect(() => {
    // Exam attempt page uses direct API translation — the global widget must not
    // translate it. A bare `return` isn't enough: when the user navigates here from a
    // Hindi page (client-side), the widget instance is already translating and keeps
    // going. So actively force it back to English — clear the cookie AND reset the
    // selector (the widget won't revert from a cookie change alone once translated).
    if (WIDGET_EXCLUDED.some((seg) => pathname.includes(seg))) {
      document.cookie = "googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 UTC";
      document.cookie = `googtrans=;path=/;domain=${window.location.hostname};expires=Thu, 01 Jan 1970 00:00:00 UTC`;
      const revertToEnglish = (tries = 0) => {
        const select = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
        if (select && select.value && select.value !== "en") {
          select.value = "en";
          select.dispatchEvent(new Event("change"));
        } else if (tries < 25 && document.body.className.includes("translated")) {
          // Widget/translation still settling — keep trying until the page is restored.
          setTimeout(() => revertToEnglish(tries + 1), 200);
        }
      };
      revertToEnglish();
      return;
    }

    const lang = getLang(pathname);

    if (lang === "en") {
      // Always clear googtrans when language is English so stale cookie never triggers translation
      document.cookie = "googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 UTC";
      document.cookie = `googtrans=;path=/;domain=${window.location.hostname};expires=Thu, 01 Jan 1970 00:00:00 UTC`;
      return;
    }

    // Keep googtrans in sync with NEXT_LOCALE
    document.cookie = `googtrans=/en/${lang};path=/;SameSite=Lax`;

    const run = () => initWidget(lang);

    if (window.google?.translate?.TranslateElement) {
      run();
    } else {
      loadScript(run);
    }
  // Re-run on every route change so SPA navigation gets translated too
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      id="google_translate_element"
      style={{ position: "fixed", top: "-9999px", left: "-9999px", opacity: 0, pointerEvents: "none" }}
      aria-hidden="true"
    />
  );
}
