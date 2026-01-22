/**
 * Centralized Color Theme Configuration
 * Update colors here to change the entire website theme
 */

export const colors = {
  // Primary Brand Colors
  primary: {
    DEFAULT: '#00aeef', // Bright Blue
    light: '#33bef2',
    dark: '#0098d4',
    foreground: '#ffffff',
  },
  
  // Secondary Brand Colors
  secondary: {
    DEFAULT: '#f7941d', // Orange
    light: '#f9a847',
    dark: '#de8419',
    foreground: '#ffffff',
  },

  // Semantic Colors
  success: {
    DEFAULT: '#10b981',
    light: '#34d399',
    dark: '#059669',
    foreground: '#ffffff',
  },
  
  warning: {
    DEFAULT: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    foreground: '#ffffff',
  },
  
  destructive: {
    DEFAULT: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    foreground: '#ffffff',
  },
  
  info: {
    DEFAULT: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
    foreground: '#ffffff',
  },

  // Neutral Colors
  background: {
    DEFAULT: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
  },
  
  foreground: {
    DEFAULT: '#0f172a',
    secondary: '#475569',
    tertiary: '#94a3b8',
  },
  
  card: {
    DEFAULT: '#ffffff',
    foreground: '#0f172a',
  },
  
  muted: {
    DEFAULT: '#f1f5f9',
    foreground: '#64748b',
  },
  
  border: {
    DEFAULT: '#e2e8f0',
    light: '#f1f5f9',
    dark: '#cbd5e1',
  },

  // Gradient Colors
  gradient: {
    primary: {
      from: '#00aeef',
      to: '#0098d4',
    },
    secondary: {
      from: '#f7941d',
      to: '#de8419',
    },
    hero: {
      from: '#00aeef',
      via: '#0098d4',
      to: '#006b9e',
    },
  },
} as const;

// CSS Variables for dynamic theming
export const cssVariables = {
  '--color-primary': colors.primary.DEFAULT,
  '--color-primary-light': colors.primary.light,
  '--color-primary-dark': colors.primary.dark,
  '--color-primary-foreground': colors.primary.foreground,
  
  '--color-secondary': colors.secondary.DEFAULT,
  '--color-secondary-light': colors.secondary.light,
  '--color-secondary-dark': colors.secondary.dark,
  '--color-secondary-foreground': colors.secondary.foreground,
  
  '--color-success': colors.success.DEFAULT,
  '--color-warning': colors.warning.DEFAULT,
  '--color-destructive': colors.destructive.DEFAULT,
  '--color-info': colors.info.DEFAULT,
  
  '--color-background': colors.background.DEFAULT,
  '--color-foreground': colors.foreground.DEFAULT,
  '--color-border': colors.border.DEFAULT,
  '--color-muted': colors.muted.DEFAULT,
} as const;

export type ColorTheme = typeof colors;
