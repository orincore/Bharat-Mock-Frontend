import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';

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

const mockUser: User = {
  id: 'user1',
  email: 'student@example.com',
  name: 'John Doe',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
  phone: '+91 9876543210',
  dateOfBirth: '2000-01-15',
  education: {
    level: '12th Pass',
    institution: 'Delhi Public School',
    year: 2023,
    percentage: 92.5
  },
  preferences: {
    notifications: true,
    newsletter: true,
    examReminders: true
  },
  createdAt: '2023-06-01T00:00:00Z'
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session (mock)
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock successful login
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
    setIsLoading(false);
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newUser: User = {
      ...mockUser,
      id: `user_${Date.now()}`,
      email,
      name,
      createdAt: new Date().toISOString()
    };
    
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setUser(null);
    localStorage.removeItem('user');
    setIsLoading(false);
  };

  const resetPassword = async (email: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Mock password reset email sent
  };

  const updateProfile = async (data: Partial<User>) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
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
