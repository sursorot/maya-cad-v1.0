/**
 * ShortcutsModal Component
 * 
 * A modal dialog displaying all available keyboard shortcuts organized by category.
 * Supports all toolbar themes for consistent styling.
 */

import React, { memo, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import type { ToolbarStyle } from '../Workspace/types';
import type { Hint, HintCategory } from './types';
import { getAllHintsGrouped } from './contextualHints';

// ============================================================================
// Theme Colors
// ============================================================================

interface ThemeColors {
  overlay: string;
  bg: string;
  bgSecondary: string;
  border: string;
  text: string;
  textDim: string;
  textMuted: string;
  keyBg: string;
  keyBorder: string;
  accent: string;
  fontFamily: string;
  borderLight?: string;
  borderDark?: string;
  keyText?: string;
  accentCyan?: string;
  glowColor?: string;
}

const THEME_COLORS: Record<ToolbarStyle, ThemeColors> = {
  modern: {
    overlay: 'rgba(0, 0, 0, 0.6)',
    bg: '#1a1a2e',
    bgSecondary: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#ffffff',
    textDim: 'rgba(255, 255, 255, 0.6)',
    textMuted: 'rgba(255, 255, 255, 0.4)',
    keyBg: 'rgba(255, 255, 255, 0.1)',
    keyBorder: 'rgba(255, 255, 255, 0.2)',
    accent: '#6366f1',
    fontFamily: 'inherit',
  },
  windows95: {
    overlay: 'rgba(0, 0, 128, 0.3)',
    bg: '#c0c0c0',
    bgSecondary: '#ffffff',
    border: '#808080',
    borderLight: '#ffffff',
    borderDark: '#404040',
    text: '#000000',
    textDim: '#404040',
    textMuted: '#808080',
    keyBg: '#c0c0c0',
    keyBorder: '#808080',
    accent: '#000080',
    fontFamily: "'Tahoma', 'Verdana', 'Arial', sans-serif",
  },
  funk: {
    overlay: 'rgba(30, 30, 30, 0.8)',
    bg: '#ffffff',
    bgSecondary: '#fafafa',
    border: '#1e1e1e',
    text: '#1e1e1e',
    textDim: '#666666',
    textMuted: '#999999',
    keyBg: '#f9c500',
    keyBorder: '#1e1e1e',
    accent: '#ff69b4',
    accentCyan: '#00f0ff',
    fontFamily: "'Inter', sans-serif",
  },
  cyber: {
    overlay: 'rgba(10, 37, 64, 0.9)',
    bg: '#0d2f4d',
    bgSecondary: 'rgba(77, 166, 255, 0.05)',
    border: '#2d7acc',
    text: '#e8f4ff',
    textDim: '#4da6ff',
    textMuted: '#2d7acc',
    keyBg: 'rgba(77, 166, 255, 0.15)',
    keyBorder: '#4da6ff',
    accent: '#ff6b35',
    glowColor: 'rgba(77, 166, 255, 0.4)',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  },
  clean: {
    overlay: 'rgba(0, 0, 0, 0.5)',
    bg: '#ffffff',
    bgSecondary: '#f8f9fa',
    border: '#E8EAED',
    text: '#1A1A1A',
    textDim: '#5A6370',
    textMuted: '#9BA3AF',
    keyBg: '#1565C0',
    keyText: '#ffffff',
    keyBorder: '#1565C0',
    accent: '#1565C0',
    fontFamily: "'IBM Plex Mono', monospace",
  },
} as const;

// ============================================================================
// Category Labels
// ============================================================================

const CATEGORY_LABELS: Record<HintCategory, string> = {
  'tool-switch': 'Tools',
  'tool-action': 'Tool Actions',
  'drawing': 'Drawing',
  'selection': 'Selection',
  'edit': 'Edit',
  'history': 'History',
  'navigation': 'Navigation',
  'modifier': 'Modifiers',
  'mode': 'Modes',
  'confirm': 'Confirm / Cancel',
  'help': 'Help',
  'workflow': 'Workflow',
};

const CATEGORY_ORDER: HintCategory[] = [
  'tool-switch',
  'tool-action',
  'drawing',
  'confirm',
  'selection',
  'edit',
  'history',
  'mode',
  'workflow',
  'navigation',
  'modifier',
  'help',
];

// ============================================================================
// Types
// ============================================================================

export interface ShortcutsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Current toolbar style/theme */
  toolbarStyle?: ToolbarStyle;
  /** Additional hints to merge with defaults */
  additionalHints?: Hint[];
  /** Current active tool (for highlighting relevant shortcuts) */
  activeTool?: string;
}

// ============================================================================
// KeyBadge Component (Modal version - slightly larger)
// ============================================================================

interface KeyBadgeProps {
  keyDisplay: string;
  toolbarStyle: ToolbarStyle;
}

const KeyBadge: React.FC<KeyBadgeProps> = memo(({ keyDisplay, toolbarStyle }) => {
  const colors = THEME_COLORS[toolbarStyle];
  
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3px 8px',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'inherit',
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap',
    minWidth: '24px',
  };
  
  const getStyle = (): React.CSSProperties => {
    switch (toolbarStyle) {
      case 'windows95':
        return {
          ...baseStyle,
          backgroundColor: colors.keyBg,
          border: '2px solid',
          borderColor: `${colors.borderLight} ${colors.borderDark} ${colors.borderDark} ${colors.borderLight}`,
          color: colors.text,
        };
      case 'funk':
        return {
          ...baseStyle,
          backgroundColor: colors.keyBg,
          border: `2px solid ${colors.keyBorder}`,
          borderRadius: '4px',
          color: colors.text,
          boxShadow: `2px 2px 0 ${colors.border}`,
        };
      case 'cyber':
        return {
          ...baseStyle,
          backgroundColor: colors.keyBg,
          border: `1px solid ${colors.keyBorder}`,
          color: colors.textDim,
          textTransform: 'uppercase',
          fontSize: '10px',
          letterSpacing: '0.5px',
        };
      case 'clean':
        return {
          ...baseStyle,
          backgroundColor: colors.keyBg,
          border: 'none',
          borderRadius: '4px',
          color: colors.keyText,
        };
      default: // modern
        return {
          ...baseStyle,
          backgroundColor: colors.keyBg,
          border: `1px solid ${colors.keyBorder}`,
          borderRadius: '4px',
          color: colors.text,
        };
    }
  };
  
  return <span style={getStyle()}>{keyDisplay}</span>;
});

KeyBadge.displayName = 'KeyBadge';

// ============================================================================
// ShortcutRow Component
// ============================================================================

interface ShortcutRowProps {
  hint: Hint;
  toolbarStyle: ToolbarStyle;
}

const ShortcutRow: React.FC<ShortcutRowProps> = memo(({ hint, toolbarStyle }) => {
  const colors = THEME_COLORS[toolbarStyle];
  
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: toolbarStyle === 'windows95' ? '0' : '4px',
    backgroundColor: colors.bgSecondary,
    marginBottom: '4px',
  };
  
  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: colors.text,
    fontWeight: 500,
  };
  
  const descriptionStyle: React.CSSProperties = {
    fontSize: '11px',
    color: colors.textMuted,
    marginTop: '2px',
  };
  
  return (
    <div style={rowStyle}>
      <div>
        <div style={labelStyle}>{hint.label}</div>
        {hint.description && (
          <div style={descriptionStyle}>{hint.description}</div>
        )}
      </div>
      <KeyBadge keyDisplay={hint.key.display} toolbarStyle={toolbarStyle} />
    </div>
  );
});

ShortcutRow.displayName = 'ShortcutRow';

// ============================================================================
// CategorySection Component
// ============================================================================

interface CategorySectionProps {
  category: HintCategory;
  hints: Hint[];
  toolbarStyle: ToolbarStyle;
}

const CategorySection: React.FC<CategorySectionProps> = memo(({ 
  category, 
  hints, 
  toolbarStyle 
}) => {
  const colors = THEME_COLORS[toolbarStyle];
  
  if (hints.length === 0) return null;
  
  const headerStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
    paddingBottom: '4px',
    borderBottom: `1px solid ${colors.border}`,
  };
  
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={headerStyle}>{CATEGORY_LABELS[category]}</div>
      {hints.map(hint => (
        <ShortcutRow key={hint.id} hint={hint} toolbarStyle={toolbarStyle} />
      ))}
    </div>
  );
});

CategorySection.displayName = 'CategorySection';

// ============================================================================
// Main ShortcutsModal Component
// ============================================================================

export const ShortcutsModal: React.FC<ShortcutsModalProps> = memo(({
  isOpen,
  onClose,
  toolbarStyle = 'clean',
  additionalHints = [],
}) => {
  const colors = THEME_COLORS[toolbarStyle];
  
  // Get all hints grouped by category
  const groupedHints = getAllHintsGrouped();
  
  // Merge additional hints
  if (additionalHints.length > 0) {
    additionalHints.forEach(hint => {
      groupedHints[hint.category].push(hint);
    });
  }
  
  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);
  
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);
  
  if (!isOpen) return null;
  
  // Styles
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  };
  
  const modalStyle: React.CSSProperties = {
    backgroundColor: colors.bg,
    borderRadius: toolbarStyle === 'windows95' ? '0' : '12px',
    border: toolbarStyle === 'windows95' 
      ? `3px solid ${colors.borderLight}`
      : toolbarStyle === 'funk'
        ? `3px solid ${colors.border}`
        : `1px solid ${colors.border}`,
    boxShadow: toolbarStyle === 'funk' 
      ? `6px 6px 0 ${colors.border}`
      : toolbarStyle === 'cyber'
        ? `0 0 30px ${colors.glowColor}`
        : '0 20px 60px rgba(0, 0, 0, 0.3)',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: colors.fontFamily,
    overflow: 'hidden',
  };
  
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: toolbarStyle === 'windows95' 
      ? colors.accent 
      : toolbarStyle === 'funk'
        ? colors.accent
        : toolbarStyle === 'clean'
          ? colors.accent
          : 'transparent',
  };
  
  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: toolbarStyle === 'windows95' || toolbarStyle === 'funk' || toolbarStyle === 'clean'
      ? '#ffffff' 
      : colors.text,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };
  
  const closeButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    color: toolbarStyle === 'windows95' || toolbarStyle === 'funk' || toolbarStyle === 'clean'
      ? '#ffffff' 
      : colors.textDim,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  };
  
  const contentStyle: React.CSSProperties = {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  };
  
  const columnsStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
  };
  
  // Split categories into two columns
  const leftCategories = CATEGORY_ORDER.slice(0, Math.ceil(CATEGORY_ORDER.length / 2));
  const rightCategories = CATEGORY_ORDER.slice(Math.ceil(CATEGORY_ORDER.length / 2));
  
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={titleStyle}>
            <span>⌨️</span>
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            type="button"
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Content */}
        <div style={contentStyle}>
          <div style={columnsStyle}>
            {/* Left Column */}
            <div>
              {leftCategories.map(category => (
                <CategorySection
                  key={category}
                  category={category}
                  hints={groupedHints[category]}
                  toolbarStyle={toolbarStyle}
                />
              ))}
            </div>
            
            {/* Right Column */}
            <div>
              {rightCategories.map(category => (
                <CategorySection
                  key={category}
                  category={category}
                  hints={groupedHints[category]}
                  toolbarStyle={toolbarStyle}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer hint */}
        <div style={{
          padding: '12px 20px',
          borderTop: `1px solid ${colors.border}`,
          fontSize: '11px',
          color: colors.textMuted,
          textAlign: 'center',
        }}>
          Press <KeyBadge keyDisplay="Esc" toolbarStyle={toolbarStyle} /> to close • 
          Press <KeyBadge keyDisplay="?" toolbarStyle={toolbarStyle} /> anytime to open this reference
        </div>
      </div>
    </div>
  );
});

ShortcutsModal.displayName = 'ShortcutsModal';

export default ShortcutsModal;

