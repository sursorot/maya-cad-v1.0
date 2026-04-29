/**
 * HintsBar Component
 * 
 * A contextual hints bar that displays keyboard shortcuts and available actions
 * based on the current workspace state. Designed to be placed in the footer area.
 * 
 * Features two rows:
 * - Row 1: Keyboard shortcuts (key badges with labels)
 * - Row 2: Educational tip sentence explaining the current context
 * 
 * Supports all toolbar themes: modern, clean, cyber, funk, windows95
 */

import React, { memo, useMemo } from 'react';
import type { ToolbarStyle } from '../Workspace/types';
import type { Hint, HintCategory, HintContext } from './types';
import type { ToolType } from '../Workspace/types';

// ============================================================================
// Theme Colors (matching componentStyles.ts)
// ============================================================================

interface ThemeColors {
  bg: string;
  bgHover: string;
  border: string;
  text: string;
  textDim: string;
  keyBg: string;
  keyBorder: string;
  separator: string;
  fontFamily: string;
  borderLight?: string;
  borderDark?: string;
  keyText?: string;
  accentPink?: string;
  accentCyan?: string;
  glowColor?: string;
}

const THEME_COLORS: Record<ToolbarStyle, ThemeColors> = {
  modern: {
    bg: 'rgba(255, 255, 255, 0.08)',
    bgHover: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.2)',
    text: 'rgba(255, 255, 255, 0.9)',
    textDim: 'rgba(255, 255, 255, 0.6)',
    keyBg: 'rgba(255, 255, 255, 0.15)',
    keyBorder: 'rgba(255, 255, 255, 0.3)',
    separator: 'rgba(255, 255, 255, 0.2)',
    fontFamily: 'inherit',
  },
  windows95: {
    bg: '#c0c0c0',
    bgHover: '#d4d4d4',
    border: '#808080',
    borderLight: '#ffffff',
    borderDark: '#404040',
    text: '#000000',
    textDim: '#404040',
    keyBg: '#c0c0c0',
    keyBorder: '#808080',
    separator: '#808080',
    fontFamily: "'Tahoma', 'Verdana', 'Arial', sans-serif",
  },
  funk: {
    bg: '#ffffff',
    bgHover: '#fff0f5',
    border: '#1e1e1e',
    text: '#1e1e1e',
    textDim: '#666666',
    keyBg: '#f9c500',
    keyBorder: '#1e1e1e',
    accentPink: '#ff69b4',
    accentCyan: '#00f0ff',
    separator: '#1e1e1e',
    fontFamily: "'Inter', sans-serif",
  },
  cyber: {
    bg: 'rgba(13, 47, 77, 0.8)',
    bgHover: 'rgba(77, 166, 255, 0.1)',
    border: '#2d7acc',
    text: '#e8f4ff',
    textDim: '#4da6ff',
    keyBg: 'rgba(77, 166, 255, 0.15)',
    keyBorder: '#4da6ff',
    glowColor: 'rgba(77, 166, 255, 0.4)',
    separator: '#2d7acc',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  },
  clean: {
    bg: '#ffffff',
    bgHover: '#f5f5f5',
    border: '#E8EAED',
    text: '#1A1A1A',
    textDim: '#5A6370',
    keyBg: '#1565C0',
    keyText: '#ffffff',
    keyBorder: '#1565C0',
    separator: '#E8EAED',
    fontFamily: "'IBM Plex Mono', monospace",
  },
} as const;

// ============================================================================
// Contextual Tips - Educational sentences for each tool/state
// ============================================================================

interface TipConfig {
  idle: string;
  drawing: string;
  selected?: string;
  preview?: string;
  chain?: string;
}

const CONTEXTUAL_TIPS: Record<ToolType, TipConfig> = {
  select: {
    idle: 'Click on a shape to select it, or drag to create a selection rectangle',
    drawing: 'Release to complete your selection rectangle',
    selected: 'Use arrow keys to nudge, or press Delete to remove',
  },
  wall: {
    idle: 'Click to place the first point of your wall',
    drawing: 'Click to add points. Press Enter when done, or Escape to cancel',
    chain: 'Keep clicking to draw connected wall segments',
    preview: 'Click to confirm this wall segment',
    selected: 'Press O to add a door or window to this wall',
  },
  opening: {
    idle: 'Click on any wall to place a door or window',
    drawing: 'Position the opening along the wall',
    preview: 'Click to confirm placement. Press F to flip the swing direction',
    selected: 'Drag to reposition, or press F to flip the swing',
  },
  measure: {
    idle: 'Click two points to measure the distance between them',
    drawing: 'Click the second point to finish the measurement',
  },
  line: {
    idle: 'Click to start drawing a line',
    drawing: 'Click again to finish the line. Hold Shift for angle snap',
  },
  polyline: {
    idle: 'Click to start drawing a multi-segment line',
    drawing: 'Click to add points. Press Enter to finish, C to close the shape',
  },
  rectangle: {
    idle: 'Click and drag to draw a rectangle',
    drawing: 'Hold Shift to draw a perfect square. Release to finish',
  },
  circle: {
    idle: 'Click and drag to draw a circle',
    drawing: 'Drag to set the radius. Release to finish',
  },
  arc: {
    idle: 'Click to set the start point of the arc',
    drawing: 'Click to set the end point, then adjust the curve',
  },
  curve: {
    idle: 'Click to add points for a smooth curve',
    drawing: 'Click to add points. Press Enter to finish',
  },
  guideline: {
    idle: 'Press H for horizontal, V for vertical, or F for freeform',
    drawing: 'Click to place the guideline. Other shapes will snap to it',
  },
  trim: {
    idle: 'Click on a line to set it as the cutting boundary',
    drawing: 'Click on segments to trim them. Press Escape when done',
    preview: 'Click to remove this segment, or Shift+Click to keep it',
  },
  zone: {
    idle: 'Click to draw a zone, or click inside enclosed walls to auto-detect',
    drawing: 'Click to add corners. Press Enter to finish, C to close',
    selected: 'Double-click to edit the room label',
  },
  text: {
    idle: 'Click anywhere to place a text box',
    drawing: 'Type your text. Press Escape to finish editing',
  },
  pencil: {
    idle: 'Click and drag to draw freehand. Use [ ] to adjust size',
    drawing: 'Release to finish your stroke',
  },
  arrow: {
    idle: 'Click and drag to draw an arrow',
    drawing: 'Drag to set direction. Hold Shift for angle snap',
  },
  highlighter: {
    idle: 'Click and drag to highlight an area',
    drawing: 'Release to finish highlighting',
  },
  eraser: {
    idle: 'Click on shapes to delete them, or drag to erase multiple',
    drawing: 'Shapes will be deleted when you release',
  },
  note: {
    idle: 'Click to place a note',
    drawing: 'Type your note content. Click outside to finish',
  },
  marker: {
    idle: 'Click to place a marker point. Other shapes will snap to it',
    drawing: 'Marker placed! It will help with precise alignment',
  },
  upload: {
    idle: 'Click to open file picker, or drag an image onto the canvas',
    drawing: 'Click to place the image. Drag corners to resize',
  },
  dimension: {
    idle: 'Click to set the first measurement point',
    drawing: 'Click to set the second point. The distance will be shown',
  },
  zoom: {
    idle: 'Click to zoom in, Alt+Click to zoom out, or drag to zoom to area',
    drawing: 'Release to zoom to the selected area',
  },
  asset: {
    idle: 'Click to place furniture or fixtures',
    drawing: 'Click to confirm placement',
    selected: 'Drag to move, or use handles to resize',
  },
};

/**
 * Get the contextual tip for the current tool and state
 */
function getContextualTip(
  activeTool: ToolType,
  isDrawing: boolean,
  hasSelection: boolean,
  isInChainMode: boolean,
  hasPreview: boolean
): string {
  const toolTips = CONTEXTUAL_TIPS[activeTool];
  if (!toolTips) {
    return 'Select a tool to get started';
  }

  // Determine which tip to show based on state
  if (hasPreview && toolTips.preview) {
    return toolTips.preview;
  }
  if (isInChainMode && toolTips.chain) {
    return toolTips.chain;
  }
  if (isDrawing) {
    return toolTips.drawing;
  }
  if (hasSelection && toolTips.selected) {
    return toolTips.selected;
  }
  return toolTips.idle;
}

// ============================================================================
// Types
// ============================================================================

export interface HintsBarProps {
  /** Hints to display */
  hints: Hint[];
  /** Current toolbar style/theme */
  toolbarStyle?: ToolbarStyle;
  /** Maximum hints to show (default: 6) */
  maxHints?: number;
  /** Show separator between hint groups */
  showSeparators?: boolean;
  /** Callback when a hint is clicked (for help modal) */
  onHintClick?: (hint: Hint) => void;
  /** Callback for opening shortcuts modal */
  onShowShortcuts?: () => void;
  /** Whether to show the help button */
  showHelpButton?: boolean;
  /** Custom className */
  className?: string;
  /** Current hint context for educational tip */
  context?: HintContext;
  /** Custom tip override (if provided, replaces auto-generated tip) */
  customTip?: string;
  /** Whether to show the educational tip row (default: true) */
  showTipRow?: boolean;
}

// ============================================================================
// KeyBadge Component
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
    padding: '0px 4px',
    fontSize: '9px',
    fontWeight: 600,
    fontFamily: colors.fontFamily,
    letterSpacing: '0.2px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    lineHeight: 1.4,
  };
  
  const getStyle = (): React.CSSProperties => {
    switch (toolbarStyle) {
      case 'windows95':
        return {
          ...baseStyle,
          backgroundColor: colors.bg,
          border: '1px solid',
          borderColor: `${colors.borderLight} ${colors.borderDark} ${colors.borderDark} ${colors.borderLight}`,
          color: colors.text,
          padding: '0px 3px',
          fontSize: '10px',
        };
      case 'funk':
        return {
          ...baseStyle,
          backgroundColor: colors.keyBg,
          border: `1px solid ${colors.keyBorder}`,
          borderRadius: '2px',
          color: colors.text,
          boxShadow: `1px 1px 0 ${colors.border}`,
        };
      case 'cyber':
        return {
          ...baseStyle,
          backgroundColor: colors.keyBg,
          border: `1px solid ${colors.keyBorder}`,
          color: colors.textDim,
          textTransform: 'uppercase',
          fontSize: '8px',
          letterSpacing: '0.3px',
        };
      case 'clean':
        return {
          ...baseStyle,
          backgroundColor: colors.keyBg,
          border: 'none',
          borderRadius: '3px',
          color: colors.keyText,
          padding: '2px 6px',
        };
      default: // modern
        return {
          ...baseStyle,
          backgroundColor: colors.keyBg,
          border: `1px solid ${colors.keyBorder}`,
          borderRadius: '3px',
          color: colors.text,
        };
    }
  };
  
  return <span style={getStyle()}>{keyDisplay}</span>;
});

KeyBadge.displayName = 'KeyBadge';

// ============================================================================
// HintItem Component
// ============================================================================

interface HintItemProps {
  hint: Hint;
  toolbarStyle: ToolbarStyle;
  onClick?: () => void;
}

const HintItem: React.FC<HintItemProps> = memo(({ hint, toolbarStyle, onClick }) => {
  const colors = THEME_COLORS[toolbarStyle];
  const [isHovered, setIsHovered] = React.useState(false);
  
  // Workflow hints get special styling
  const isWorkflow = hint.category === 'workflow';
  
  // Get workflow-specific colors
  const getWorkflowColors = () => {
    switch (toolbarStyle) {
      case 'windows95':
        return { bg: '#ffffc0', text: '#000080', border: '#808000' };
      case 'funk':
        return { bg: '#e0f7fa', text: '#00796b', border: '#00bcd4' };
      case 'cyber':
        return { bg: 'rgba(0, 255, 136, 0.1)', text: '#00ff88', border: '#00ff88' };
      case 'clean':
        return { bg: '#e8f5e9', text: '#2e7d32', border: '#4caf50' };
      default: // modern
        return { bg: 'rgba(76, 175, 80, 0.15)', text: '#81c784', border: 'rgba(76, 175, 80, 0.4)' };
    }
  };
  
  const workflowColors = getWorkflowColors();
  
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    padding: '1px 4px',
    borderRadius: toolbarStyle === 'windows95' ? '0' : '3px',
    cursor: onClick ? 'pointer' : 'default',
    backgroundColor: isWorkflow 
      ? (isHovered ? workflowColors.bg : 'transparent')
      : (isHovered ? colors.bgHover : 'transparent'),
    transition: toolbarStyle === 'windows95' ? 'none' : 'background-color 0.1s ease',
    border: isWorkflow ? `1px dashed ${workflowColors.border}` : 'none',
  };
  
  const labelStyle: React.CSSProperties = {
    fontSize: toolbarStyle === 'cyber' ? '9px' : '10px',
    fontWeight: 500,
    color: isWorkflow ? workflowColors.text : colors.textDim,
    fontFamily: colors.fontFamily,
    letterSpacing: toolbarStyle === 'cyber' ? '0.2px' : '0',
    textTransform: toolbarStyle === 'cyber' ? 'uppercase' : 'none',
    whiteSpace: 'nowrap',
    fontStyle: isWorkflow ? 'italic' : 'normal',
  };
  
  // For workflow hints, show an arrow indicator if key starts with "→"
  const keyDisplay = hint.key.display;
  const isArrowKey = keyDisplay.startsWith('→');
  
  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      title={hint.description}
    >
      {isArrowKey ? (
        // Workflow hint with arrow indicator
        <span style={{ 
          color: workflowColors.text, 
          fontSize: '10px',
          fontWeight: 'bold',
        }}>→</span>
      ) : (
        <KeyBadge keyDisplay={keyDisplay} toolbarStyle={toolbarStyle} />
      )}
      <span style={labelStyle}>{hint.label}</span>
    </div>
  );
});

HintItem.displayName = 'HintItem';

// ============================================================================
// Separator Component
// ============================================================================

interface SeparatorProps {
  toolbarStyle: ToolbarStyle;
}

const Separator: React.FC<SeparatorProps> = memo(({ toolbarStyle }) => {
  const colors = THEME_COLORS[toolbarStyle];
  
  const getStyle = (): React.CSSProperties => {
    switch (toolbarStyle) {
      case 'windows95':
        return {
          width: '1px',
          height: '12px',
          backgroundColor: colors.borderDark,
          borderRight: `1px solid ${colors.borderLight}`,
          margin: '0 2px',
        };
      case 'funk':
        return {
          width: '1px',
          height: '10px',
          backgroundColor: colors.border,
          margin: '0 3px',
        };
      case 'cyber':
        return {
          width: '1px',
          height: '10px',
          backgroundColor: colors.separator,
          margin: '0 4px',
          opacity: 0.4,
        };
      case 'clean':
        return {
          width: '1px',
          height: '10px',
          backgroundColor: colors.separator,
          margin: '0 3px',
        };
      default: // modern
        return {
          width: '1px',
          height: '10px',
          backgroundColor: colors.separator,
          margin: '0 3px',
        };
    }
  };
  
  return <div style={getStyle()} />;
});

Separator.displayName = 'Separator';

// ============================================================================
// HelpButton Component
// ============================================================================

interface HelpButtonProps {
  toolbarStyle: ToolbarStyle;
  onClick: () => void;
}

const HelpButton: React.FC<HelpButtonProps> = memo(({ toolbarStyle, onClick }) => {
  const colors = THEME_COLORS[toolbarStyle];
  const [isHovered, setIsHovered] = React.useState(false);
  
  const getStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1px 5px',
      cursor: 'pointer',
      fontFamily: colors.fontFamily,
      fontSize: '9px',
      fontWeight: 600,
      transition: 'all 0.1s ease',
      border: 'none',
      background: 'none',
    };
    
    switch (toolbarStyle) {
      case 'windows95':
        return {
          ...base,
          backgroundColor: colors.bg,
          border: '1px solid',
          borderColor: isHovered
            ? `${colors.borderDark} ${colors.borderLight} ${colors.borderLight} ${colors.borderDark}`
            : `${colors.borderLight} ${colors.borderDark} ${colors.borderDark} ${colors.borderLight}`,
          color: colors.text,
        };
      case 'funk':
        return {
          ...base,
          backgroundColor: isHovered ? colors.accentPink : colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: '3px',
          color: isHovered ? '#fff' : colors.text,
        };
      case 'cyber':
        return {
          ...base,
          backgroundColor: isHovered ? 'rgba(77, 166, 255, 0.15)' : 'transparent',
          border: `1px solid ${colors.keyBorder}`,
          color: colors.textDim,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          fontSize: '8px',
        };
      case 'clean':
        return {
          ...base,
          backgroundColor: isHovered ? colors.keyBg : 'transparent',
          borderRadius: '3px',
          color: isHovered ? colors.keyText : colors.textDim,
        };
      default: // modern
        return {
          ...base,
          backgroundColor: isHovered ? colors.bgHover : 'transparent',
          border: `1px solid ${colors.border}`,
          borderRadius: '3px',
          color: colors.textDim,
        };
    }
  };
  
  return (
    <button
      type="button"
      style={getStyle()}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Show all keyboard shortcuts (?)"
    >
      <span>?</span>
    </button>
  );
});

HelpButton.displayName = 'HelpButton';

// ============================================================================
// Main HintsBar Component
// ============================================================================

export const HintsBar: React.FC<HintsBarProps> = memo(({
  hints,
  toolbarStyle = 'clean',
  maxHints = 6,
  showSeparators = true,
  onHintClick,
  onShowShortcuts,
  showHelpButton = true,
  className,
  context,
  customTip,
  showTipRow = true,
}) => {
  const colors = THEME_COLORS[toolbarStyle];
  
  // Generate contextual tip based on current state
  const contextualTip = useMemo(() => {
    if (customTip) return customTip;
    if (!context) return null;
    
    const hasPreview = context.hasWallPreview || context.hasOpeningPreview || context.hasTrimPreview;
    return getContextualTip(
      context.activeTool,
      context.isDrawing,
      context.hasSelection,
      context.isInChainMode,
      hasPreview
    );
  }, [context, customTip]);
  
  // Limit hints to maxHints
  const displayHints = useMemo(() => hints.slice(0, maxHints), [hints, maxHints]);
  
  // Group hints by category for separators
  const groupedHints = useMemo(() => {
    if (!showSeparators) {
      return [{ category: 'all' as HintCategory, hints: displayHints }];
    }
    
    const groups: { category: HintCategory; hints: Hint[] }[] = [];
    let currentCategory: HintCategory | null = null;
    let currentGroup: Hint[] = [];
    
    displayHints.forEach(hint => {
      if (currentCategory !== hint.category) {
        if (currentGroup.length > 0 && currentCategory) {
          groups.push({ category: currentCategory, hints: currentGroup });
        }
        currentCategory = hint.category;
        currentGroup = [hint];
      } else {
        currentGroup.push(hint);
      }
    });
    
    if (currentGroup.length > 0 && currentCategory) {
      groups.push({ category: currentCategory, hints: currentGroup });
    }
    
    return groups;
  }, [displayHints, showSeparators]);
  
  // Get outer container style (wraps both rows)
  const getOuterContainerStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: showTipRow && contextualTip ? '2px' : '0',
      fontFamily: colors.fontFamily,
    };
    
    switch (toolbarStyle) {
      case 'modern':
        return {
          ...baseStyle,
          padding: '4px 8px',
          backgroundColor: 'rgba(30, 30, 40, 0.92)',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
        };
      case 'windows95':
        return {
          ...baseStyle,
          padding: '2px 4px',
          backgroundColor: colors.bg,
          border: `1px solid ${colors.borderLight}`,
          borderBottomColor: colors.borderDark,
          borderRightColor: colors.borderDark,
        };
      case 'funk':
        return {
          ...baseStyle,
          padding: '4px 6px',
          backgroundColor: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: '5px',
          boxShadow: `2px 2px 0 ${colors.border}`,
        };
      case 'cyber':
        return {
          ...baseStyle,
          padding: '4px 8px',
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
          boxShadow: `0 0 12px ${colors.glowColor}`,
        };
      case 'clean':
      default:
        return {
          ...baseStyle,
          padding: '4px 8px',
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: '5px',
          boxShadow: '0 1px 6px rgba(0, 0, 0, 0.08)',
        };
    }
  };
  
  // Get style for the shortcuts row (Row 1)
  const getShortcutsRowStyle = (): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '1px',
    minHeight: '18px',
  });
  
  // Get style for the tip row (Row 2)
  const getTipRowStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '9px',
      lineHeight: '1.2',
      textAlign: 'center',
      padding: '1px 2px',
    };
    
    switch (toolbarStyle) {
      case 'modern':
        return {
          ...baseStyle,
          color: 'rgba(255, 255, 255, 0.55)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '3px',
          marginTop: '1px',
        };
      case 'windows95':
        return {
          ...baseStyle,
          color: colors.textDim,
          borderTop: `1px solid ${colors.borderDark}`,
          paddingTop: '2px',
          marginTop: '1px',
          fontSize: '10px',
        };
      case 'funk':
        return {
          ...baseStyle,
          color: colors.textDim,
          borderTop: `1px dashed ${colors.border}`,
          paddingTop: '3px',
          marginTop: '1px',
          fontStyle: 'italic',
        };
      case 'cyber':
        return {
          ...baseStyle,
          color: colors.textDim,
          borderTop: `1px solid ${colors.border}`,
          paddingTop: '3px',
          marginTop: '1px',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          fontSize: '8px',
        };
      case 'clean':
      default:
        return {
          ...baseStyle,
          color: colors.textDim,
          borderTop: `1px solid ${colors.separator}`,
          paddingTop: '3px',
          marginTop: '1px',
        };
    }
  };
  
  const outerContainerStyle = getOuterContainerStyle();
  const shortcutsRowStyle = getShortcutsRowStyle();
  const tipRowStyle = getTipRowStyle();
  
  if (displayHints.length === 0 && !showHelpButton && !contextualTip) {
    return null;
  }
  
  return (
    <div style={outerContainerStyle} className={className}>
      {/* Row 1: Keyboard Shortcuts */}
      <div style={shortcutsRowStyle}>
        {groupedHints.map((group, groupIndex) => (
          <React.Fragment key={group.category}>
            {groupIndex > 0 && showSeparators && <Separator toolbarStyle={toolbarStyle} />}
            {group.hints.map(hint => (
              <HintItem
                key={hint.id}
                hint={hint}
                toolbarStyle={toolbarStyle}
                onClick={onHintClick ? () => onHintClick(hint) : undefined}
              />
            ))}
          </React.Fragment>
        ))}
        
        {showHelpButton && onShowShortcuts && (
          <>
            {displayHints.length > 0 && <Separator toolbarStyle={toolbarStyle} />}
            <HelpButton toolbarStyle={toolbarStyle} onClick={onShowShortcuts} />
          </>
        )}
      </div>
      
      {/* Row 2: Educational Tip */}
      {showTipRow && contextualTip && (
        <div style={tipRowStyle}>
          <span>{contextualTip}</span>
        </div>
      )}
    </div>
  );
});

HintsBar.displayName = 'HintsBar';

export default HintsBar;

