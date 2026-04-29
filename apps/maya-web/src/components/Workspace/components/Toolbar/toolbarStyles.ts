/**
 * Toolbar Style Configurations
 * 
 * Component-specific style definitions for different toolbar themes.
 * These are kept separate from the global theme system (src/theme)
 * because they contain complex component-specific styling logic.
 * 
 * Note: Color values should align with src/theme/index.ts
 */

import type { CSSProperties } from 'react';

export type ToolbarStyleVariant = 'modern' | 'windows95' | 'funk' | 'cyber' | 'clean';

export interface ToolbarTheme {
    container: CSSProperties;
    dragHandle: CSSProperties;
    button: {
        base: CSSProperties;
        active: CSSProperties;
        hover: CSSProperties;
        disabled: CSSProperties;
    };
    tooltip: CSSProperties;
    separator: CSSProperties;
    expander: CSSProperties;
    gridGap: string;
}

// Modern (default) theme
export const modernTheme: ToolbarTheme = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        padding: '6px',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        userSelect: 'none',
        width: '88px',
        zIndex: 1000,
    },
    dragHandle: {
        width: '32px',
        height: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#b0b0b0',
        marginBottom: '2px',
    },
    button: {
        base: {
            backgroundColor: 'transparent',
            border: 'none',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            color: '#605E61',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'background-color 0.2s ease, color 0.2s ease',
        },
        active: {
            backgroundColor: '#eef2ff',
            color: '#4338ca',
        },
        hover: {
            backgroundColor: '#f0f0f0',
        },
        disabled: {
            color: '#b9b9b9',
            cursor: 'not-allowed',
            opacity: 0.5,
        },
    },
    tooltip: {
        position: 'absolute',
        left: '50%',
        bottom: '100%',
        transform: 'translateX(-50%)',
        marginBottom: '6px',
        backgroundColor: '#2d2d2d',
        color: 'white',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 10000,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    },
    separator: {
        width: '80%',
        height: '1px',
        backgroundColor: '#e0e0e0',
        margin: '4px 0',
    },
    expander: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 0',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
    },
    gridGap: '4px',
};

// Windows 95 theme
export const windows95Theme: ToolbarTheme = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '4px',
        backgroundColor: '#c0c0c0',
        border: '2px solid',
        borderColor: '#ffffff #808080 #808080 #ffffff',
        userSelect: 'none',
        width: '96px',
        zIndex: 1000,
        fontFamily: "'Tahoma', 'Verdana', 'Arial', sans-serif",
    },
    dragHandle: {
        backgroundColor: '#000080',
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: 'bold',
        padding: '3px 6px',
        marginBottom: '2px',
        textAlign: 'center',
    },
    button: {
        base: {
            backgroundColor: '#c0c0c0',
            border: '2px solid',
            borderColor: '#ffffff #808080 #808080 #ffffff',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
            transition: 'none',
        },
        active: {
            borderColor: '#808080 #ffffff #ffffff #808080',
            padding: '2px 0 0 2px',
        },
        hover: {},
        disabled: {
            color: '#808080',
            cursor: 'not-allowed',
            opacity: 0.5,
        },
    },
    tooltip: {
        position: 'absolute',
        left: '105%',
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: '#FFFFE1',
        color: '#000000',
        border: '1px solid #000000',
        padding: '2px 8px',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 10000,
    },
    separator: {
        height: '2px',
        backgroundColor: '#c0c0c0',
        borderBottom: '2px solid #ffffff',
        borderTop: '2px solid #808080',
        margin: '4px 0',
    },
    expander: {
        background: '#c0c0c0',
        border: '2px solid',
        borderColor: '#ffffff #808080 #808080 #ffffff',
        cursor: 'pointer',
        padding: '2px 0',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '2px',
    },
    gridGap: '4px',
};

// Funk theme
export const funkTheme: ToolbarTheme = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '8px',
        backgroundColor: '#ffffff',
        border: '3px solid #1e1e1e',
        borderRadius: '8px',
        boxShadow: '8px 8px 0px #1e1e1e',
        userSelect: 'none',
        width: '98px',
        zIndex: 1000,
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
    },
    dragHandle: {
        background: 'linear-gradient(45deg, #f9c500, #ff69b4)',
        color: '#1e1e1e',
        fontSize: '16px',
        fontWeight: 'bold',
        padding: '6px 8px',
        margin: '-8px -8px 4px -8px',
        textAlign: 'center',
        textShadow: '2px 2px 0px rgba(255,255,255,0.5)',
        letterSpacing: '1px',
    },
    button: {
        base: {
            backgroundColor: '#ffffff',
            border: '3px solid #1e1e1e',
            borderRadius: '4px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1e1e1e',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'all 0.1s ease-out',
        },
        active: {
            backgroundColor: '#ff69b4',
            color: '#ffffff',
            transform: 'translateY(2px) scale(0.98)',
        },
        hover: {
            transform: 'translateY(-2px) scale(1.05)',
            boxShadow: '4px 4px 0 #f9c500',
        },
        disabled: {
            opacity: 0.5,
            cursor: 'not-allowed',
        },
    },
    tooltip: {
        position: 'absolute',
        left: '120%',
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: '#f9c500',
        color: '#1e1e1e',
        border: '3px solid #1e1e1e',
        borderRadius: '4px',
        boxShadow: '3px 3px 0px #1e1e1e',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 10000,
        transition: 'transform 0.2s',
    },
    separator: {
        height: '3px',
        background: 'linear-gradient(to right, #00f0ff 33%, #ff69b4 33%, #ff69b4 66%, #f9c500 66%)',
        backgroundSize: '15px 3px',
        borderTop: '3px solid #1e1e1e',
        borderBottom: '3px solid #1e1e1e',
        margin: '6px 0',
    },
    expander: {
        background: '#ffffff',
        border: '2px solid #1e1e1e',
        borderRadius: '4px',
        cursor: 'pointer',
        padding: '2px 0',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '4px',
        transition: 'all 0.1s ease-out',
    },
    gridGap: '6px',
};

// Cyber (Blueprint) theme
export const cyberTheme: ToolbarTheme = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        backgroundColor: '#0d2f4d',
        border: '2px solid #4da6ff',
        userSelect: 'none',
        width: '110px',
        zIndex: 1000,
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        boxShadow: 'inset 0 0 0 1px #2d7acc, 0 0 20px rgba(77, 166, 255, 0.4)',
    },
    dragHandle: {
        background: 'transparent',
        border: '1px dashed #4da6ff',
        color: '#e8f4ff',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        padding: '6px 8px',
        textAlign: 'center',
        position: 'relative',
    },
    button: {
        base: {
            backgroundColor: 'transparent',
            border: '1px solid #2d7acc',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4da6ff',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'all 0.15s ease',
            position: 'relative',
        },
        active: {
            backgroundColor: '#4da6ff',
            color: '#0a2540',
        },
        hover: {
            borderColor: '#4da6ff',
            boxShadow: '0 0 10px rgba(77, 166, 255, 0.4)',
        },
        disabled: {
            opacity: 0.4,
            cursor: 'not-allowed',
        },
    },
    tooltip: {
        position: 'absolute',
        left: 'calc(100% + 12px)',
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: '#0d2f4d',
        color: '#e8f4ff',
        border: '1px solid #4da6ff',
        padding: '4px 8px',
        fontSize: '9px',
        fontWeight: 500,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 10000,
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    },
    separator: {
        height: '0',
        borderTop: '1px dashed #2d7acc',
        margin: '4px 0',
        position: 'relative',
    },
    expander: {
        background: 'transparent',
        border: '1px dashed #2d7acc',
        cursor: 'pointer',
        padding: '2px 0',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '4px',
        transition: 'all 0.15s ease',
        color: '#4da6ff',
        fontSize: '8px',
        letterSpacing: '1px',
    },
    gridGap: '6px',
};

// Clean (WIRED-inspired) theme - Minimalist with soft slate blue accent
export const cleanTheme: ToolbarTheme = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '6px',
        backgroundColor: '#ffffff',
        border: '1px solid #3A3A3A',
        borderRadius: '4px',
        userSelect: 'none',
        width: '88px',
        zIndex: 1000,
        fontFamily: "'IBM Plex Mono', monospace",
    },
    dragHandle: {
        background: '#1565C0',
        color: '#ffffff',
        fontSize: '10px',
        fontWeight: 600,
        padding: '3px 6px',
        margin: '-6px -6px 4px -6px',
        textAlign: 'center',
        letterSpacing: '0.5px',
    },
    button: {
        base: {
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1A1A1A',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'opacity 0.2s ease, background-color 0.2s ease',
        },
        active: {
            backgroundColor: '#1565C0',
            color: '#ffffff',
        },
        hover: {
            opacity: 0.6,
        },
        disabled: {
            opacity: 0.3,
            cursor: 'not-allowed',
        },
    },
    tooltip: {
        position: 'absolute',
        left: 'calc(100% + 8px)',
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: '#3A3A3A',
        color: '#ffffff',
        padding: '3px 8px',
        borderRadius: '3px',
        fontSize: '11px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 10000,
        fontFamily: "'IBM Plex Mono', monospace",
    },
    separator: {
        width: '100%',
        height: '1px',
        backgroundColor: '#E8EAED',
        margin: '2px 0',
    },
    expander: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 0',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#5A6370',
        transition: 'opacity 0.2s ease',
    },
    gridGap: '4px',
};

/**
 * Get theme configuration by variant name
 */
export function getToolbarTheme(variant: ToolbarStyleVariant): ToolbarTheme {
    switch (variant) {
        case 'windows95':
            return windows95Theme;
        case 'funk':
            return funkTheme;
        case 'cyber':
            return cyberTheme;
        case 'clean':
            return cleanTheme;
        case 'modern':
        default:
            return modernTheme;
    }
}

/**
 * Get container style with position applied
 */
export function getContainerStyle(
    theme: ToolbarTheme,
    position: { x: number; y: number }
): CSSProperties {
    return {
        ...theme.container,
        position: 'absolute',
        top: `${position.y}px`,
        left: `${position.x}px`,
    };
}

