/**
 * Header Button Component
 * 
 * Memoized button component for the header toolbar.
 * Uses pre-computed styles to avoid runtime style object creation.
 */

import React, { memo, useCallback } from 'react';
import type { ToolbarStyle } from '../Workspace/types';
import { 
  buttonStyles,
  getButtonHoverEnter, 
  getButtonHoverLeave 
} from '../../theme/componentStyles';

interface HeaderButtonProps {
  /** Whether the button is in active state */
  active?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Tooltip text */
  title?: string;
  /** Current toolbar style/theme */
  toolbarStyle: ToolbarStyle;
  /** Icon or content to render */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Custom width override */
  width?: string | number;
  /** Whether button is disabled */
  disabled?: boolean;
}

/**
 * Memoized header button that only re-renders when props change
 */
export const HeaderButton = memo(function HeaderButton({
  active = false,
  onClick,
  title,
  toolbarStyle,
  children,
  className,
  width,
  disabled = false,
}: HeaderButtonProps) {
  // Get pre-computed style
  const baseStyle = active ? buttonStyles[toolbarStyle].active : buttonStyles[toolbarStyle].base;
  
  // Apply width override and larger size for header
  const style: React.CSSProperties = {
    ...baseStyle,
    width: width ?? '28px',
    height: toolbarStyle === 'windows95' ? '24px' : '26px',
    opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
  };
  
  // Memoize hover handlers
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!disabled) {
        getButtonHoverEnter(toolbarStyle, active)(e);
      }
    },
    [toolbarStyle, active, disabled]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!disabled) {
        getButtonHoverLeave(toolbarStyle, active)(e);
      }
    },
    [toolbarStyle, active, disabled]
  );

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={title}
      className={className}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {children}
    </div>
  );
});

/**
 * Get icon color for header buttons
 */
export function getHeaderIconColor(toolbarStyle: ToolbarStyle, active: boolean = false): string {
  return active ? buttonStyles[toolbarStyle].textActive : buttonStyles[toolbarStyle].text;
}

/**
 * Get icon props for header buttons
 */
export function getHeaderIconProps(
  toolbarStyle: ToolbarStyle, 
  active: boolean = false,
  size: number = 16
): { size: number; style: React.CSSProperties } {
  return {
    size,
    style: {
      color: getHeaderIconColor(toolbarStyle, active),
      strokeWidth: 2,
    },
  };
}

