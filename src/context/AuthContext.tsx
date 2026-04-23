"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Education, User } from '@/types';
import { authService } from '@/lib/api/authService';
import { apiClient } from '@/lib/api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDeleted: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  completePasswordReset: (token: string, newPassword: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUserContext: (user: User | null) => void;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
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
  const { user_education, user_preferences, education, preferences, ...rest } = userData;
  return {
    ...rest,
    education: education ?? (Array.isArray(user_education) ? user_education[0] : user_education),
    preferences: preferences ?? (Array.isArray(user_preferences) ? user_preferences[0] : user_preferences),
  } as User;
};

interface AuthProviderProps {
  children: ReactNode;
  onAuthChange?: () => void;
}

export function AuthProvider({ children, onAuthChange }: AuthProviderProps) {
  // Seed from localStorage immediately to avoid flash of logged-out state
  const [user, setUser] = useState<User | null>(() =>
    typeof window !== 'undefined' ? getStoredUser() : null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleted, setIsDeleted] = useState(false);
  const initDone = useRef(false);

  // One-time cleanup: remove any legacy API cache entries from localStorage
  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('bm_api_'));
      keys.forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
  }, []);

  // On mount: verify token is still valid by fetching fresh profile
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    if (!token) {
      // No token — ensure state is clean
      setUser(null);
      persistUser(null);
      setIsLoading(false);
      return;
    }

    // Token exists — fetch fresh profile to validate it
    authService.getProfile()
      .then(userData => {
        const normalized = normalizeUser(userData);
        setUser(normalized);
        persistUser(normalized);
      })
      .catch((err: any) => {
        const msg = err?.message || '';
        if (msg.includes('410')) {
          // Account soft-deleted — clear session and show deleted screen
          authService.logout();
          apiClient.clearAuthCache();
          setUser(null);
          setIsDeleted(true);
        } else if (msg.includes('401') || msg.includes('403')) {
          // Token invalid/expired — clear everything and show logged-out state
          authService.logout();
          apiClient.clearAuthCache();
          setUser(null);
        }
        // For network errors, keep the cached user so the app still works offline
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Force logout when apiClient clears tokens (refresh token expired)
  useEffect(() => {
    const handleSessionExpired = () => {
      persistUser(null);
      apiClient.clearAuthCache();
      setUser(null);
      setIsLoading(false);
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  // Cross-tab sync via storage events
  useEffect(() => {
    const syncFromStorage = () => {
      const token = localStorage.getItem('auth_token');
      const storedUser = getStoredUser();

      if (!token) {
        // No token in storage — ensure this tab is logged out
        if (user) {
          setUser(null);
        }
        return;
      }

      if (storedUser) {
        // Token + user in storage — sync to this tab
        setUser(storedUser);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      // Any auth-related key change — re-sync from storage
      if (e.key === 'auth_token' || e.key === 'auth_user') {
        syncFromStorage();
      }
    };

    // Re-check auth whenever this tab becomes visible (user switches back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromStorage();
      }
    };

    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login(email, password);
      const normalized = normalizeUser(response.data.user);
      apiClient.clearAuthCache();
      setUser(normalized);
      persistUser(normalized);
      setTimeout(() => onAuthChange?.(), 0);
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_DELETED') {
        setIsDeleted(true);
        setUser(null);
        return;
      }
      if (err?.code === 'ACCOUNT_BLOCKED') {
        // Inject a minimal user with is_blocked so BlockedAccountGate fires
        const blockedUser = { is_blocked: true, block_reason: err?.block_reason ?? null } as any;
        setUser(blockedUser);
        persistUser(blockedUser);
        return;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await authService.register(email, password, name);
      const normalized = normalizeUser(response.data.user);
      setUser(normalized);
      persistUser(normalized);
      setTimeout(() => onAuthChange?.(), 0);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    authService.logout();
    apiClient.clearAuthCache();
    persistUser(null);
    setUser(null);
    setIsLoading(false);
  };

  const refreshProfile = async () => {
    try {
      const profile = await authService.getProfile();
      const normalized = normalizeUser(profile);
      setUser(normalized);
      persistUser(normalized);
    } catch (err: any) {
      const msg = err?.message || '';
      console.error('Failed to refresh profile:', err);
      if (msg.includes('410')) {
        authService.logout();
        apiClient.clearAuthCache();
        setUser(null);
        setIsDeleted(true);
      } else if (msg.includes('401') || msg.includes('403')) {
        authService.logout();
        apiClient.clearAuthCache();
        setUser(null);
      }
    }
  };

  const deleteAccount = async () => {
    await authService.deleteAccount();
    authService.logout();
    apiClient.clearAuthCache();
    persistUser(null);
    setUser(null);
    setIsDeleted(true);
  };

  const updateProfile = async (data: Partial<User>) => {
    setIsLoading(true);
    try {
      await authService.updateProfile(data);
      await refreshProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const setUserContext = (userData: User | null) => {
    setUser(userData);
    persistUser(userData);
  };

  const requestPasswordReset = async (email: string) => {
    await authService.forgotPassword(email);
  };

  const completePasswordReset = async (token: string, newPassword: string) => {
    await authService.resetPassword(token, newPassword);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      isDeleted,
      login,
      register,
      logout,
      requestPasswordReset,
      completePasswordReset,
      updateProfile,
      refreshProfile,
      setUserContext,
      deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
