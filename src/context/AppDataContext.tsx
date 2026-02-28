"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiClient } from '@/lib/api/client';
import { NavigationLink, FooterLink, ContactInfo } from '@/types';

interface ExamCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  logo_url?: string;
  display_order?: number;
}

interface ExamSubcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  logo_url?: string;
  display_order?: number;
}

interface AppInitData {
  navigation: NavigationLink[];
  footer: FooterLink[];
  contact: ContactInfo | null;
  categories: ExamCategory[];
  subcategories: ExamSubcategory[];
  profile: any | null;
}

interface AppDataContextType {
  navigation: NavigationLink[];
  footer: FooterLink[];
  contact: ContactInfo | null;
  categories: ExamCategory[];
  subcategories: ExamSubcategory[];
  profile: any | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [navigation, setNavigation] = useState<NavigationLink[]>([]);
  const [footer, setFooter] = useState<FooterLink[]>([]);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [categories, setCategories] = useState<ExamCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ExamSubcategory[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInit = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const response = await apiClient.get<{ success: boolean; data: AppInitData }>(
        '/init',
        Boolean(token)
      );

      const data = response.data;
      setNavigation(data.navigation || []);
      setFooter(data.footer || []);
      setContact(data.contact || null);
      setCategories(data.categories || []);
      setSubcategories(data.subcategories || []);
      setProfile(data.profile || null);
    } catch (err: any) {
      console.error('App init failed:', err);
      setError(err?.message || 'Failed to load app data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInit();
  }, [fetchInit]);

  return (
    <AppDataContext.Provider
      value={{
        navigation,
        footer,
        contact,
        categories,
        subcategories,
        profile,
        isLoading,
        error,
        refresh: fetchInit,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
