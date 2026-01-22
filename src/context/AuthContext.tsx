"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Education, User } from '@/types';
import { authService } from '@/lib/api/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('auth_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to parse cached auth user:', error);
    localStorage.removeItem('auth_user');
    return null;
  }
};

const persistUser = (userData: User | null) => {
  if (typeof window === 'undefined') return;
  if (userData) {
    localStorage.setItem('auth_user', JSON.stringify(userData));
  } else {
    localStorage.removeItem('auth_user');
  }
};

const normalizeUser = (userData: any): User | null => {
  if (!userData) return null;

  const {
    user_education,
    user_preferences,
    education,
    preferences,
    ...rest
  } = userData;

  const normalizedEducation: Education | undefined = (() => {
    if (education) return education as Education;
    if (Array.isArray(user_education)) return user_education[0] as Education | undefined;
    return user_education as Education | undefined;
  })();

  const normalizedPreferences = (() => {
    if (preferences) return preferences;
    if (Array.isArray(user_preferences)) return user_preferences[0];
    return user_preferences;
  })();

  return {
    ...rest,
    education: normalizedEducation,
    preferences: normalizedPreferences,
  } as User;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const cached = getStoredUser();
    if (cached) {
      setUser(cached);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setUser(null);
          persistUser(null);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        const userData = await authService.getProfile();
        const normalized = normalizeUser(userData);
        setUser(normalized);
        persistUser(normalized);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        persistUser(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [isHydrated]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login(email, password);
      const normalized = normalizeUser(response.data.user);
      setUser(normalized);
      persistUser(normalized);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
    setIsLoading(false);
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await authService.register(email, password, name);
      const normalized = normalizeUser(response.data.user);
      setUser(normalized);
      persistUser(normalized);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    authService.logout();
    persistUser(null);
    setUser(null);
    setIsLoading(false);
  };

  const resetPassword = async (email: string) => {
    await authService.forgotPassword(email);
  };

  const updateProfile = async (data: Partial<User>) => {
    setIsLoading(true);
    try {
      await authService.updateProfile(data);
      const updatedUser = await authService.getProfile();
      const normalized = normalizeUser(updatedUser);
      setUser(normalized);
      persistUser(normalized);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        resetPassword,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
