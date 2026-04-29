/**
 * Selection Rect Layer
 * 
 * Renders the selection rectangle during box selection.
 * Memoized to only re-render when selection state changes.
 */

import { memo } from 'react';
import type { Point, ToolbarStyle } from '../../../types';

interface SelectionRectLayerProps {
  /** Whether selection is active */
  isSelecting: boolean;
  /** Selection rectangle start point */
  selectionStart: Point | null;
  /** Selection rectangle end point */
  selectionEnd: Point | null;
  /** Toolbar style for theming */
  toolbarStyle: ToolbarStyle;
}

/**
 * Memoized selection rect layer
 */
export const SelectionRectLayer = memo(function SelectionRectLayer({
  isSelecting,
  selectionStart,
  selectionEnd,
  toolbarStyle,
}: SelectionRectLayerProps) {
  if (!isSelecting || !selectionStart || !selectionEnd) {
    return null;
  }

  const isClean = toolbarStyle === 'clean';
  const isFunk = toolbarStyle === 'funk';
  const isWindows95 = toolbarStyle === 'windows95';

  // Calculate fill and stroke based on theme
  const fill = isClean
    ? 'rgba(21, 101, 192, 0.12)'
    : isFunk
    ? 'rgba(255, 105, 180, 0.2)'
    : isWindows95
    ? 'rgba(0, 0, 128, 0.25)'
    : 'rgba(100, 149, 237, 0.15)';

  const stroke = isClean
    ? '#1565C0'
    : isFunk
    ? '#ff69b4'
    : isWindows95
    ? '#000080'
    : 'rgba(65, 105, 225, 0.9)';

  const strokeWidth = isClean ? '1' : isFunk ? '2' : isWindows95 ? '1' : '0.5';
  const strokeDasharray = isClean ? 'none' : isWindows95 ? '2 2' : 'none';

  return (
    <rect
      x={Math.min(selectionStart.x, selectionEnd.x)}
      y={Math.min(selectionStart.y, selectionEnd.y)}
      width={Math.abs(selectionEnd.x - selectionStart.x)}
      height={Math.abs(selectionEnd.y - selectionStart.y)}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render when selection state changes
  if (prevProps.isSelecting !== nextProps.isSelecting) return false;
  if (prevProps.selectionStart !== nextProps.selectionStart) return false;
  if (prevProps.selectionEnd !== nextProps.selectionEnd) return false;
  if (prevProps.toolbarStyle !== nextProps.toolbarStyle) return false;
  return true;
});

