/**
 * Pre-computed Component Styles
 * 
 * Styles computed once at module load time for zero runtime overhead.
 * Used by Footer, Header, and other UI components.
 */

import type { ToolbarStyle } from '../components/Workspace/types';

// ============================================================================
// Theme Color Constants (matches theme/index.ts)
// ============================================================================

const COLORS = {
  modern: {
    bg: 'rgba(255, 255, 255, 0.1)',
    bgActive: 'rgba(255, 255, 255, 0.25)',
    bgHover: 'rgba(255, 255, 255, 0.2)',
    border: 'rgba(255, 255, 255, 0.3)',
    borderActive: 'rgba(255, 255, 255, 0.5)',
    text: '#FFFFFF',
  },
  windows95: {
    bgColor: '#c0c0c0',
    textColor: '#000000',
    borderLight: '#ffffff',
    borderDark: '#808080',
    borderDarker: '#404040',
    activeColor: '#000080',
    fontFamily: "'Tahoma', 'Verdana', 'Arial', sans-serif",
  },
  funk: {
    bgColor: '#ffffff',
    textColor: '#1e1e1e',
    borderColor: '#1e1e1e',
    accentPink: '#ff69b4',
    accentCyan: '#00f0ff',
    accentYellow: '#f9c500',
    shadowColor: '#1e1e1e',
    fontFamily: "'Inter', sans-serif",
  },
  cyber: {
    bgColor: '#0a2540',
    paperColor: '#0d2f4d',
    lineColor: '#4da6ff',
    lineDim: '#2d7acc',
    textColor: '#e8f4ff',
    accentOrange: '#ff6b35',
    glowColor: 'rgba(77, 166, 255, 0.4)',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  },
  clean: {
    bgColor: '#ffffff',
    textColor: '#1A1A1A',
    textSecondary: '#5A6370',
    borderColor: '#3A3A3A',
    separatorColor: '#E8EAED',
    activeColor: '#1565C0',
    fontFamily: "'IBM Plex Mono', monospace",
  },
} as const;

// ============================================================================
// Button Styles
// ============================================================================

export interface ButtonStyles {
  base: React.CSSProperties;
  active: React.CSSProperties;
  text: string;
  textActive: string;
}

/**
 * Pre-computed button styles per theme
 */
export const buttonStyles: Record<ToolbarStyle, ButtonStyles> = {
  modern: {
    base: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '20px',
      backgroundColor: COLORS.modern.bg,
      border: `1px solid ${COLORS.modern.border}`,
      borderRadius: '3px',
      cursor: 'pointer',
      transition: 'all 0.15s',
      flexShrink: 0,
    },
    active: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '20px',
      backgroundColor: COLORS.modern.bgActive,
      border: `1px solid ${COLORS.modern.borderActive}`,
      borderRadius: '3px',
      cursor: 'pointer',
      transition: 'all 0.15s',
      flexShrink: 0,
    },
    text: COLORS.modern.text,
    textActive: COLORS.modern.text,
  },
  windows95: {
    base: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '22px',
      backgroundColor: COLORS.windows95.bgColor,
      border: '2px solid',
      borderColor: `${COLORS.windows95.borderLight} ${COLORS.windows95.borderDarker} ${COLORS.windows95.borderDarker} ${COLORS.windows95.borderLight}`,
      cursor: 'pointer',
      padding: '0',
      flexShrink: 0,
    },
    active: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '22px',
      backgroundColor: COLORS.windows95.bgColor,
      border: '2px solid',
      borderColor: `${COLORS.windows95.borderDarker} ${COLORS.windows95.borderLight} ${COLORS.windows95.borderLight} ${COLORS.windows95.borderDarker}`,
      cursor: 'pointer',
      padding: '1px 0 0 1px',
      flexShrink: 0,
    },
    text: COLORS.windows95.textColor,
    textActive: COLORS.windows95.textColor,
  },
  funk: {
    base: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '26px',
      height: '22px',
      backgroundColor: COLORS.funk.bgColor,
      border: `2px solid ${COLORS.funk.borderColor}`,
      borderRadius: '3px',
      cursor: 'pointer',
      transition: 'all 0.1s ease-out',
      flexShrink: 0,
    },
    active: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '26px',
      height: '22px',
      backgroundColor: COLORS.funk.accentPink,
      border: `2px solid ${COLORS.funk.borderColor}`,
      borderRadius: '3px',
      cursor: 'pointer',
      transition: 'all 0.1s ease-out',
      flexShrink: 0,
    },
    text: COLORS.funk.textColor,
    textActive: COLORS.funk.bgColor,
  },
  cyber: {
    base: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '26px',
      height: '22px',
      backgroundColor: 'transparent',
      border: `1px solid ${COLORS.cyber.lineDim}`,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      flexShrink: 0,
    },
    active: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '26px',
      height: '22px',
      backgroundColor: COLORS.cyber.lineColor,
      border: `1px solid ${COLORS.cyber.lineDim}`,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      flexShrink: 0,
    },
    text: COLORS.cyber.lineColor,
    textActive: COLORS.cyber.bgColor,
  },
  clean: {
    base: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '22px',
      height: '20px',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer',
      transition: 'opacity 0.2s ease, background-color 0.2s ease',
      flexShrink: 0,
    },
    active: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '22px',
      height: '20px',
      backgroundColor: COLORS.clean.activeColor,
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer',
      transition: 'opacity 0.2s ease, background-color 0.2s ease',
      flexShrink: 0,
    },
    text: COLORS.clean.textColor,
    textActive: COLORS.clean.bgColor,
  },
};

// ============================================================================
// Footer Styles
// ============================================================================

export interface FooterContainerStyles {
  container: React.CSSProperties;
  leftGroup: React.CSSProperties;
  rightGroup: React.CSSProperties;
}

/**
 * Pre-computed footer container styles per theme
 */
export const footerStyles: Record<ToolbarStyle, FooterContainerStyles> = {
  modern: {
    container: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    leftGroup: {
      display: 'flex',
      gap: '6px',
      alignItems: 'center',
    },
    rightGroup: {
      display: 'flex',
      gap: '6px',
      alignItems: 'center',
    },
  },
  windows95: {
    container: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '2px 4px',
      backgroundColor: COLORS.windows95.bgColor,
      borderTop: `2px solid ${COLORS.windows95.borderLight}`,
      fontFamily: COLORS.windows95.fontFamily,
      fontSize: '12px',
      height: '28px',
      boxSizing: 'border-box',
    },
    leftGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
    rightGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
  },
  funk: {
    container: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '4px 8px',
      backgroundColor: COLORS.funk.bgColor,
      borderTop: `3px solid ${COLORS.funk.borderColor}`,
      fontFamily: COLORS.funk.fontFamily,
      fontSize: '12px',
      height: '32px',
      boxSizing: 'border-box',
      boxShadow: `0 -4px 0 ${COLORS.funk.accentCyan}`,
    },
    leftGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
    rightGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
  },
  cyber: {
    container: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '4px 16px',
      backgroundColor: COLORS.cyber.paperColor,
      borderTop: `2px solid ${COLORS.cyber.lineColor}`,
      fontFamily: COLORS.cyber.fontFamily,
      fontSize: '10px',
      height: '32px',
      boxSizing: 'border-box',
    },
    leftGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
    rightGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
  },
  clean: {
    container: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '4px 12px',
      backgroundColor: COLORS.clean.bgColor,
      borderTop: `2px solid ${COLORS.clean.borderColor}`,
      fontFamily: COLORS.clean.fontFamily,
      fontSize: '11px',
      height: '32px',
      boxSizing: 'border-box',
    },
    leftGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
    rightGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
  },
};

// ============================================================================
// Header Styles
// ============================================================================

export interface HeaderContainerStyles {
  container: React.CSSProperties;
  leftGroup: React.CSSProperties;
  centerGroup: React.CSSProperties;
  rightGroup: React.CSSProperties;
}

/**
 * Pre-computed header container styles per theme
 */
export const headerStyles: Record<ToolbarStyle, HeaderContainerStyles> = {
  modern: {
    container: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    leftGroup: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    },
    centerGroup: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    },
    rightGroup: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    },
  },
  windows95: {
    container: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '2px 4px',
      backgroundColor: COLORS.windows95.bgColor,
      borderBottom: `2px solid ${COLORS.windows95.borderDark}`,
      fontFamily: COLORS.windows95.fontFamily,
      fontSize: '12px',
      height: '28px',
      boxSizing: 'border-box',
    },
    leftGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
    centerGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
    rightGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
  },
  funk: {
    container: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '4px 8px',
      backgroundColor: COLORS.funk.bgColor,
      borderBottom: `3px solid ${COLORS.funk.borderColor}`,
      fontFamily: COLORS.funk.fontFamily,
      fontSize: '12px',
      height: '32px',
      boxSizing: 'border-box',
      boxShadow: `0 4px 0 ${COLORS.funk.accentPink}`,
    },
    leftGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
    centerGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
    rightGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
  },
  cyber: {
    container: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '4px 16px',
      backgroundColor: COLORS.cyber.paperColor,
      borderBottom: `2px solid ${COLORS.cyber.lineColor}`,
      fontFamily: COLORS.cyber.fontFamily,
      fontSize: '10px',
      height: '32px',
      boxSizing: 'border-box',
    },
    leftGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
    centerGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
    rightGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
  },
  clean: {
    container: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '4px 12px',
      backgroundColor: COLORS.clean.bgColor,
      borderBottom: `2px solid ${COLORS.clean.borderColor}`,
      fontFamily: COLORS.clean.fontFamily,
      fontSize: '11px',
      height: '32px',
      boxSizing: 'border-box',
    },
    leftGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
    centerGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
    rightGroup: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    },
  },
};

// ============================================================================
// Hover Effect Handlers
// ============================================================================

/**
 * Get hover enter handler for a button
 */
export function getButtonHoverEnter(
  theme: ToolbarStyle,
  isActive: boolean
): (e: React.MouseEvent<HTMLElement>) => void {
  return (e) => {
    switch (theme) {
      case 'clean':
        if (!isActive) e.currentTarget.style.opacity = '0.6';
        break;
      case 'cyber':
        e.currentTarget.style.borderColor = COLORS.cyber.lineColor;
        e.currentTarget.style.boxShadow = `0 0 8px ${COLORS.cyber.glowColor}`;
        break;
      case 'funk':
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = `2px 2px 0 ${COLORS.funk.accentYellow}`;
        break;
      case 'modern':
        e.currentTarget.style.backgroundColor = isActive 
          ? 'rgba(255, 255, 255, 0.35)' 
          : 'rgba(255, 255, 255, 0.2)';
        break;
      // windows95 doesn't have hover effects
    }
  };
}

/**
 * Get hover leave handler for a button
 */
export function getButtonHoverLeave(
  theme: ToolbarStyle,
  isActive: boolean
): (e: React.MouseEvent<HTMLElement>) => void {
  return (e) => {
    switch (theme) {
      case 'clean':
        e.currentTarget.style.opacity = '1';
        break;
      case 'cyber':
        e.currentTarget.style.borderColor = COLORS.cyber.lineDim;
        e.currentTarget.style.boxShadow = 'none';
        break;
      case 'funk':
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
        break;
      case 'modern':
        e.currentTarget.style.backgroundColor = isActive 
          ? 'rgba(255, 255, 255, 0.25)' 
          : 'rgba(255, 255, 255, 0.1)';
        break;
      // windows95 doesn't have hover effects
    }
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get button style based on theme and active state
 */
export function getButtonStyle(theme: ToolbarStyle, isActive: boolean): React.CSSProperties {
  const styles = buttonStyles[theme];
  return isActive ? styles.active : styles.base;
}

/**
 * Get text color based on theme and active state
 */
export function getButtonTextColor(theme: ToolbarStyle, isActive: boolean): string {
  const styles = buttonStyles[theme];
  return isActive ? styles.textActive : styles.text;
}

/**
 * Export theme colors for use in components
 */
export { COLORS as themeColors };

