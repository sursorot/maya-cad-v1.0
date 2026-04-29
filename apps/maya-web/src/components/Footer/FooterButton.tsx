/**
 * Footer Button Component
 * 
 * Memoized button component for the footer toolbar.
 * Uses pre-computed styles to avoid runtime style object creation.
 */

import React, { memo, useCallback } from 'react';
import type { ToolbarStyle } from '../Workspace/types';
import { 
  getButtonStyle, 
  getButtonTextColor, 
  getButtonHoverEnter, 
  getButtonHoverLeave 
} from '../../theme/componentStyles';

interface FooterButtonProps {
  /** Whether the button is in active state */
  active: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Tooltip text */
  title?: string;
  /** Current toolbar style/theme */
  toolbarStyle: ToolbarStyle;
  /** Icon to render */
  icon: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Memoized footer button that only re-renders when props change
 */
export const FooterButton = memo(function FooterButton({
  active,
  onClick,
  title,
  toolbarStyle,
  icon,
  className,
}: FooterButtonProps) {
  // Get pre-computed style
  const style = getButtonStyle(toolbarStyle, active);
  
  // Memoize hover handlers
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      getButtonHoverEnter(toolbarStyle, active)(e);
    },
    [toolbarStyle, active]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      getButtonHoverLeave(toolbarStyle, active)(e);
    },
    [toolbarStyle, active]
  );

  return (
    <div
      onClick={onClick}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={title}
      className={className}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {icon}
    </div>
  );
});

/**
 * Get icon color based on theme and active state
 */
export function useIconColor(toolbarStyle: ToolbarStyle, active: boolean): string {
  return getButtonTextColor(toolbarStyle, active);
}

/**
 * Props for themed icon
 */
interface ThemedIconProps {
  toolbarStyle: ToolbarStyle;
  active: boolean;
  size?: number;
  strokeWidth?: number;
}

/**
 * Get icon style props based on theme and active state
 */
export function getIconProps(props: ThemedIconProps): { 
  style: React.CSSProperties; 
  size: number;
} {
  const { toolbarStyle, active, size = 14, strokeWidth = 2 } = props;
  const color = getButtonTextColor(toolbarStyle, active);
  
  return {
    size,
    style: {
      color,
      strokeWidth,
    },
  };
}

