/**
 * Header Navigation Controls
 * 
 * Memoized component for sidebar and canvas toggles.
 */

import { memo } from 'react';
import { Menu, LayoutTemplate, X } from 'lucide-react';
import type { ToolbarStyle } from '../Workspace/types';
import { HeaderButton, getHeaderIconProps } from './HeaderButton';
import { headerStyles } from '../../theme/componentStyles';

interface HeaderNavProps {
  sidebarVisible: boolean;
  canvasOpen: boolean;
  onToggleSidebar: () => void;
  onOpenCanvas: () => void;
  toolbarStyle: ToolbarStyle;
}

/**
 * Navigation controls for sidebar and canvas
 */
export const HeaderNav = memo(function HeaderNav({
  sidebarVisible,
  canvasOpen,
  onToggleSidebar,
  onOpenCanvas,
  toolbarStyle,
}: HeaderNavProps) {
  const styles = headerStyles[toolbarStyle];

  return (
    <div style={styles.leftGroup}>
      {/* Sidebar toggle */}
      <HeaderButton
        active={sidebarVisible}
        onClick={onToggleSidebar}
        title={sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
        toolbarStyle={toolbarStyle}
      >
        <Menu {...getHeaderIconProps(toolbarStyle, sidebarVisible)} />
      </HeaderButton>

      {/* Canvas toggle */}
      <HeaderButton
        active={canvasOpen}
        onClick={onOpenCanvas}
        title={canvasOpen ? 'Close Canvas' : 'Open Canvas'}
        toolbarStyle={toolbarStyle}
      >
        {canvasOpen ? (
          <X {...getHeaderIconProps(toolbarStyle, canvasOpen)} />
        ) : (
          <LayoutTemplate {...getHeaderIconProps(toolbarStyle, false)} />
        )}
      </HeaderButton>
    </div>
  );
});

