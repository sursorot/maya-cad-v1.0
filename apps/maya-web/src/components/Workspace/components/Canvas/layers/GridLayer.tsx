/**
 * Grid Layer
 * 
 * Renders the 3-tier hierarchical grid system.
 * Memoized to only re-render when grid settings or viewBox change.
 */

import { memo } from 'react';
import type { ViewBox, GridSystem, ToolbarStyle } from '../../../types';
import { GridPatterns } from '../../GridPatterns';

interface GridLayerProps {
  /** Current viewBox */
  viewBox: ViewBox;
  /** Grid system settings */
  gridSystem: GridSystem;
  /** Whether grid is visible */
  showGrid: boolean;
  /** Toolbar style for theming */
  toolbarStyle: ToolbarStyle;
  /** Extension for infinite grid */
  extension: number;
}

/**
 * Memoized grid layer component
 */
export const GridLayer = memo(function GridLayer({
  viewBox,
  gridSystem,
  showGrid,
  toolbarStyle,
  extension,
}: GridLayerProps) {
  if (!showGrid) {
    return null;
  }

  return (
    <>
      {/* Grid patterns - 3-tier hierarchical system */}
      <GridPatterns gridSystem={gridSystem} toolbarStyle={toolbarStyle} />

      {/* Minor grid - finest */}
      <rect
        x={viewBox.x - extension}
        y={viewBox.y - extension}
        width={viewBox.width + extension * 2}
        height={viewBox.height + extension * 2}
        fill="url(#minorGrid)"
        pointerEvents="none"
      />

      {/* Medium grid - intermediate */}
      <rect
        x={viewBox.x - extension}
        y={viewBox.y - extension}
        width={viewBox.width + extension * 2}
        height={viewBox.height + extension * 2}
        fill="url(#mediumGrid)"
        pointerEvents="none"
      />

      {/* Major grid - coarsest */}
      <rect
        x={viewBox.x - extension}
        y={viewBox.y - extension}
        width={viewBox.width + extension * 2}
        height={viewBox.height + extension * 2}
        fill="url(#majorGrid)"
        pointerEvents="none"
      />
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render when grid-specific props change
  if (prevProps.showGrid !== nextProps.showGrid) return false;
  if (prevProps.toolbarStyle !== nextProps.toolbarStyle) return false;
  if (prevProps.gridSystem !== nextProps.gridSystem) return false;
  // ViewBox changes frequently during pan/zoom, but grid pattern is relative
  // so we only care about significant size changes
  if (Math.abs(prevProps.viewBox.width - nextProps.viewBox.width) > 0.001) return false;
  if (Math.abs(prevProps.viewBox.height - nextProps.viewBox.height) > 0.001) return false;
  if (Math.abs(prevProps.extension - nextProps.extension) > 0.001) return false;
  // For position, we need to update to keep grid aligned
  if (Math.abs(prevProps.viewBox.x - nextProps.viewBox.x) > 0.001) return false;
  if (Math.abs(prevProps.viewBox.y - nextProps.viewBox.y) > 0.001) return false;
  return true;
});

