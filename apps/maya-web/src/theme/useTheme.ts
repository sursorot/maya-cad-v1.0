/**
 * Theme Hook and Utilities
 * 
 * Provides convenient access to theme values in components.
 */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { 
  getTheme, 
  getWin95RaisedBorder, 
  getWin95InsetBorder,
  type Theme, 
  type ThemeVariant 
} from './index';

/**
 * Hook to get the current theme based on variant
 */
export function useTheme(variant: ThemeVariant = 'modern') {
  return useMemo(() => {
    const theme = getTheme(variant);
    const isModern = variant === 'modern';
    const isWindows95 = variant === 'windows95';
    const isFunk = variant === 'funk';
    const isCyber = variant === 'cyber';
    const isClean = variant === 'clean';
    
    return {
      theme,
      variant,
      isModern,
      isWindows95,
      isFunk,
      isCyber,
      isClean,
      // Windows 95 specific helpers
      win95RaisedBorder: isWindows95 ? getWin95RaisedBorder() : '',
      win95InsetBorder: isWindows95 ? getWin95InsetBorder() : '',
    };
  }, [variant]);
}

/**
 * Get button styles for the current theme
 */
export function getThemedButtonStyle(
  theme: Theme,
  variant: ThemeVariant,
  active: boolean = false
): CSSProperties {
  const base: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
    flexShrink: 0,
    border: 'none',
    background: 'none',
  };

  switch (variant) {
    case 'windows95':
      return {
        ...base,
        width: '24px',
        height: '22px',
        backgroundColor: theme.colors.bg,
        border: '2px solid',
        borderColor: active ? getWin95InsetBorder() : getWin95RaisedBorder(),
        padding: active ? '1px 0 0 1px' : '0',
        borderRadius: '0',
      };

    case 'funk':
      return {
        ...base,
        width: '26px',
        height: '22px',
        backgroundColor: active ? theme.colors.accent : theme.colors.bg,
        border: `2px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.sm,
      };

    case 'cyber':
      return {
        ...base,
        width: '26px',
        height: '22px',
        backgroundColor: active ? theme.colors.accent : 'transparent',
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '0',
      };

    case 'clean':
      return {
        ...base,
        width: '22px',
        height: '20px',
        backgroundColor: active ? theme.colors.bgActive : 'transparent',
        borderRadius: theme.borderRadius.sm,
      };

    case 'modern':
    default:
      return {
        ...base,
        width: '24px',
        height: '20px',
        backgroundColor: active ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
        border: `1px solid ${active ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)'}`,
        borderRadius: theme.borderRadius.sm,
      };
  }
}

/**
 * Get container/panel styles for the current theme
 */
export function getThemedContainerStyle(
  theme: Theme,
  variant: ThemeVariant
): CSSProperties {
  switch (variant) {
    case 'windows95':
      return {
        backgroundColor: theme.colors.bg,
        border: '2px solid',
        borderColor: getWin95RaisedBorder(),
        fontFamily: theme.fontFamily,
      };

    case 'funk':
      return {
        backgroundColor: theme.colors.bg,
        border: `2px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.md,
        boxShadow: `3px 3px 0 ${theme.colors.shadowColor}`,
        fontFamily: theme.fontFamily,
      };

    case 'cyber':
      return {
        backgroundColor: theme.colors.bg,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: `0 0 12px ${theme.colors.glowColor}`,
        fontFamily: theme.fontFamily,
      };

    case 'clean':
      return {
        backgroundColor: theme.colors.bg,
        border: `1px solid ${theme.colors.border}`,
        fontFamily: theme.fontFamily,
      };

    case 'modern':
    default:
      return {
        backgroundColor: theme.colors.bg,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.md,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        fontFamily: theme.fontFamily,
      };
  }
}

/**
 * Get input field styles for the current theme
 */
export function getThemedInputStyle(
  theme: Theme,
  variant: ThemeVariant
): CSSProperties {
  const base: CSSProperties = {
    backgroundColor: theme.colors.bgInput,
    color: theme.colors.text,
    fontFamily: theme.fontFamily,
    outline: 'none',
  };

  switch (variant) {
    case 'windows95':
      return {
        ...base,
        border: '2px solid',
        borderColor: getWin95InsetBorder(),
        padding: '2px 4px',
      };

    case 'funk':
      return {
        ...base,
        border: `2px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.sm,
        padding: '4px 8px',
      };

    case 'cyber':
      return {
        ...base,
        border: `1px solid ${theme.colors.border}`,
        padding: '4px 8px',
      };

    case 'clean':
      return {
        ...base,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.sm,
        padding: '4px 8px',
      };

    case 'modern':
    default:
      return {
        ...base,
        border: `1px solid ${theme.colors.borderInput}`,
        borderRadius: theme.borderRadius.sm,
        padding: '6px 10px',
      };
  }
}

export type { Theme, ThemeVariant };

// Re-export helper functions from index for convenience
export { getWin95RaisedBorder, getWin95InsetBorder } from './index';

