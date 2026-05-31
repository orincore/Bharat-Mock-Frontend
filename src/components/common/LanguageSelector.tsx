"use client";

import { useTransition, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { ChevronDown, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिंदी" },
] as const;

const YEAR = 60 * 60 * 24 * 365;

function setLocaleCookie(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${YEAR};SameSite=Lax`;
}

function setGoogTransCookie(locale: string) {
  // Clear first, then set — both path variants needed for Google Translate
  document.cookie = `googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 UTC`;
  document.cookie = `googtrans=;path=/;domain=${window.location.hostname};expires=Thu, 01 Jan 1970 00:00:00 UTC`;
  if (locale !== "en") {
    document.cookie = `googtrans=/en/${locale};path=/;max-age=${YEAR};SameSite=Lax`;
    document.cookie = `googtrans=/en/${locale};path=/;domain=${window.location.hostname};max-age=${YEAR};SameSite=Lax`;
  }
}

export function LanguageSelector() {
  const localeFromIntl = useLocale();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [cookieLocale, setCookieLocale] = useState<string | null>(null);

  // Read NEXT_LOCALE cookie once on mount. The root layout never unmounts during
  // client-side navigation, so this state persists across pages — the dropdown
  // stays in sync even after navigating away from /hi/... to /banking etc.
  useEffect(() => {
    const match = document.cookie.match(/NEXT_LOCALE=([a-z]{2})/);
    if (match) setCookieLocale(match[1]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Priority: URL prefix > browser cookie > next-intl context
  const localeFromUrl = pathname === '/hi' || pathname.startsWith('/hi/')
    ? 'hi'
    : pathname === '/en' || pathname.startsWith('/en/')
    ? 'en'
    : null;

  const locale = localeFromUrl ?? cookieLocale ?? localeFromIntl;
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  const changeLanguage = (code: string) => {
    if (code === locale) return;
    setLocaleCookie(code);
    setGoogTransCookie(code);

    startTransition(() => {
      // Strip any existing locale prefix from the current path
      const stripped = pathname.replace(/^\/(hi|en)(\/|$)/, '/').replace(/\/$/, '') || '/';

      if (code === 'hi') {
        // Navigate to /hi/... so middleware sets the locale header
        const target = stripped === '/' ? '/hi' : `/hi${stripped}`;
        window.location.href = target;
      } else {
        // Navigate to the plain URL — cookie is already set to 'en'
        window.location.href = stripped;
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          disabled={isPending}
          title="Change language"
        >
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline text-sm font-medium">{current.native}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-card border border-border shadow-lg">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`cursor-pointer flex flex-col items-start gap-0.5 ${
              locale === lang.code ? "bg-primary/10 text-primary" : ""
            }`}
          >
            <span className="font-medium">{lang.native}</span>
            <span className="text-xs text-muted-foreground">{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
