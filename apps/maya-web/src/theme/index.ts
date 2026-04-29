/**
 * Centralized Theme System for Maya
 * 
 * This module provides consistent theming across all components.
 * Instead of duplicating theme constants in each component, import from here.
 */

export type ThemeVariant = 'modern' | 'windows95' | 'funk' | 'cyber' | 'clean';

/**
 * Theme color definitions
 */
export interface ThemeColors {
  // Backgrounds
  bg: string;
  bgHeader: string;
  bgHover: string;
  bgActive: string;
  bgInput: string;
  bgAlt: string;
  
  // Borders
  border: string;
  borderLight: string;
  borderDark: string;
  borderInput: string;
  borderGlow: string;
  
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Accents
  accent: string;
  accentHover: string;
  accentSecondary: string;
  accentText: string;
  
  // Special
  glowColor: string;
  shadowColor: string;
  separatorColor: string;
}

/**
 * Complete theme definition
 */
export interface Theme {
  colors: ThemeColors;
  fontFamily: string;
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
  };
}

// =============================================================================
// Theme Definitions
// =============================================================================

export const modernTheme: Theme = {
  colors: {
    bg: '#ffffff',
    bgHeader: '#fafafa',
    bgHover: '#f5f5f5',
    bgActive: '#f0edfa',
    bgInput: '#ffffff',
    bgAlt: '#f8f8f9',
    border: '#e5e5e5',
    borderLight: '#ffffff',
    borderDark: '#d0d0d0',
    borderInput: '#e0e0e0',
    borderGlow: '#6F62A4',
    text: '#1a1a1a',
    textSecondary: '#525252',
    textMuted: '#a3a3a3',
    accent: '#6F62A4',
    accentHover: '#5D5192',
    accentSecondary: '#6F62A4',
    accentText: '#ffffff',
    glowColor: 'rgba(111, 98, 164, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    separatorColor: '#e0e0e0',
  },
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  borderRadius: {
    none: '0',
    sm: '3px',
    md: '6px',
    lg: '12px',
  },
};

export const windows95Theme: Theme = {
  colors: {
    bg: '#c0c0c0',
    bgHeader: '#c0c0c0',
    bgHover: '#d4d0c8',
    bgActive: '#000080',
    bgInput: '#ffffff',
    bgAlt: '#d4d4d4',
    border: '#808080',
    borderLight: '#ffffff',
    borderDark: '#404040',
    borderInput: '#808080',
    borderGlow: '#000080',
    text: '#000000',
    textSecondary: '#404040',
    textMuted: '#808080',
    accent: '#000080',
    accentHover: '#000080',
    accentSecondary: '#008080',
    accentText: '#ffffff',
    glowColor: 'transparent',
    shadowColor: '#000000',
    separatorColor: '#808080',
  },
  fontFamily: "'Tahoma', 'Verdana', 'Arial', sans-serif",
  borderRadius: {
    none: '0',
    sm: '0',
    md: '0',
    lg: '0',
  },
};

export const funkTheme: Theme = {
  colors: {
    bg: '#ffffff',
    bgHeader: '#ffffff',
    bgHover: '#f5f5f5',
    bgActive: '#ff69b4',
    bgInput: '#ffffff',
    bgAlt: '#f5f5f5',
    border: '#1e1e1e',
    borderLight: '#ffffff',
    borderDark: '#1e1e1e',
    borderInput: '#1e1e1e',
    borderGlow: '#ff69b4',
    text: '#1e1e1e',
    textSecondary: '#404040',
    textMuted: '#808080',
    accent: '#ff69b4',
    accentHover: '#ff1493',
    accentSecondary: '#00f0ff',
    accentText: '#ffffff',
    glowColor: 'rgba(255, 105, 180, 0.3)',
    shadowColor: '#1e1e1e',
    separatorColor: '#e0e0e0',
  },
  fontFamily: "'Inter', sans-serif",
  borderRadius: {
    none: '0',
    sm: '3px',
    md: '4px',
    lg: '8px',
  },
};

export const cyberTheme: Theme = {
  colors: {
    bg: '#0a2540',
    bgHeader: '#0d2f4d',
    bgHover: '#0d3a5c',
    bgActive: '#4da6ff',
    bgInput: '#0d2f4d',
    bgAlt: '#0d2f4d',
    border: '#2d7acc',
    borderLight: '#4da6ff',
    borderDark: '#1a3d5c',
    borderInput: '#2d7acc',
    borderGlow: '#4da6ff',
    text: '#e8f4ff',
    textSecondary: '#a0c4e8',
    textMuted: '#5a8ab8',
    accent: '#4da6ff',
    accentHover: '#6bb8ff',
    accentSecondary: '#4da6ff',
    accentText: '#0a2540',
    glowColor: 'rgba(77, 166, 255, 0.4)',
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    separatorColor: '#2d7acc',
  },
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  borderRadius: {
    none: '0',
    sm: '0',
    md: '0',
    lg: '0',
  },
};

export const cleanTheme: Theme = {
  colors: {
    bg: '#ffffff',
    bgHeader: '#fafafa',
    bgHover: '#f5f5f5',
    bgActive: '#1565C0',
    bgInput: '#ffffff',
    bgAlt: '#f7f8fa',
    border: '#3A3A3A',
    borderLight: '#ffffff',
    borderDark: '#2D2D2D',
    borderInput: '#3A3A3A',
    borderGlow: '#1565C0',
    text: '#1A1A1A',
    textSecondary: '#5A6370',
    textMuted: '#8E95A0',
    accent: '#1565C0',
    accentHover: '#0D47A1',
    accentSecondary: '#1E88E5',
    accentText: '#ffffff',
    glowColor: 'rgba(21, 101, 192, 0.2)',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    separatorColor: '#E8EAED',
  },
  fontFamily: "'IBM Plex Mono', monospace",
  borderRadius: {
    none: '0',
    sm: '3px',
    md: '4px',
    lg: '6px',
  },
};

// =============================================================================
// Theme Registry
// =============================================================================

export const themes: Record<ThemeVariant, Theme> = {
  modern: modernTheme,
  windows95: windows95Theme,
  funk: funkTheme,
  cyber: cyberTheme,
  clean: cleanTheme,
};

/**
 * Get a theme by variant name
 */
export function getTheme(variant: ThemeVariant): Theme {
  return themes[variant] ?? themes.modern;
}

/**
 * Check if the current theme is a specific variant
 */
export function isTheme(variant: ThemeVariant, check: ThemeVariant): boolean {
  return variant === check;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get Windows 95 style raised border color string
 */
export function getWin95RaisedBorder(): string {
  return `${windows95Theme.colors.borderLight} ${windows95Theme.colors.border} ${windows95Theme.colors.border} ${windows95Theme.colors.borderLight}`;
}

/**
 * Get Windows 95 style inset border color string
 */
export function getWin95InsetBorder(): string {
  return `${windows95Theme.colors.border} ${windows95Theme.colors.borderLight} ${windows95Theme.colors.borderLight} ${windows95Theme.colors.border}`;
}

/**
 * Type guard for ToolbarStyle compatibility
 */
export type ToolbarStyle = ThemeVariant;

