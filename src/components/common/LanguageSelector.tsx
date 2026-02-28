"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

type Language = {
  code: string;
  name: string;
  nativeName: string;
};

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
];

export function LanguageSelector() {
  const [currentLang, setCurrentLang] = useState<string>('en');
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const getRootDomain = useCallback(() => {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return hostname;
    }
    const parts = hostname.split('.');
    if (parts.length <= 2) {
      return hostname;
    }
    return parts.slice(parts.length - 2).join('.');
  }, []);

  const setGoogleTranslateCookie = useCallback((langCode: string) => {
    const cookieValue = `/auto/${langCode}`;
    const rootDomain = getRootDomain();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

    // Base cookie
    document.cookie = `googtrans=${cookieValue};expires=${expires.toUTCString()};path=/`;

    // Domain-specific cookie
    document.cookie = `googtrans=${cookieValue};expires=${expires.toUTCString()};path=/;domain=${rootDomain}`;
  }, [getRootDomain]);

  const getGoogleTranslateCookie = useCallback(() => {
    const match = document.cookie.match(/googtrans=([^;]+)/);
    if (match && match[1]) {
      const parts = match[1].split('/');
      return parts[2] || 'en';
    }
    return 'en';
  }, []);

  useEffect(() => {
    const savedLang = localStorage.getItem('preferred_language');
    if (savedLang) {
      setCurrentLang(savedLang);
    } else {
      const cookieLang = getGoogleTranslateCookie();
      setCurrentLang(cookieLang);
    }
  }, [getGoogleTranslateCookie]);

  const changeLanguage = (langCode: string) => {
    if (isApplying) return;
    setIsApplying(true);
    setGoogleTranslateCookie(langCode);
    setCurrentLang(langCode);
    localStorage.setItem('preferred_language', langCode);

    // Give Google Translate script a moment to pick up cookie, then reload
    setTimeout(() => {
      window.location.reload();
    }, 200);
  };

  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          title={isApplying ? 'Applying language...' : 'Change language'}
          disabled={isApplying}
        >
          <Image
            src="/assets/Google_Translate_Icon.png"
            alt="Translate"
            width={16}
            height={16}
            className="h-4 w-4"
            priority
          />
          <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 bg-card text-foreground border border-border shadow-lg">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`cursor-pointer ${
              currentLang === lang.code ? 'bg-primary/10 text-primary' : ''
            }`}
          >
            <div className="flex flex-col">
              <span className="font-medium">{lang.nativeName}</span>
              <span className="text-xs text-muted-foreground">{lang.name}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
