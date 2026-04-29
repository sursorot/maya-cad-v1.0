/**
 * Box Selection Hook
 * 
 * Handles box/rectangle selection functionality.
 * Extracted from useCanvasInteraction for better organization.
 */

import { useState, useCallback } from 'react';
import type { Point, Shape } from '../../../types';
import type { WallJoinOverrides } from '../../../utils/walls';
import { isShapeIntersectingRect } from '../interactionUtils';

// Local type definition to avoid import resolution issues
export interface SelectionRect {
  start: Point;
  end: Point;
}

interface UseBoxSelectionProps {
  shapes: Shape[];
  wallJoinOverrides?: Record<string, WallJoinOverrides>;
}

interface UseBoxSelectionReturn {
  selectionRect: SelectionRect | null;
  isSelecting: boolean;
  multiSelectViaBox: boolean;
  startSelection: (point: Point) => void;
  updateSelection: (point: Point) => void;
  endSelection: () => string[];
  clearSelection: () => void;
  setMultiSelectViaBox: (value: boolean) => void;
}

/**
 * Hook for box selection functionality
 */
export const useBoxSelection = ({
  shapes,
  wallJoinOverrides,
}: UseBoxSelectionProps): UseBoxSelectionReturn => {
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [multiSelectViaBox, setMultiSelectViaBox] = useState(false);

  const startSelection = useCallback((point: Point) => {
    setSelectionRect({ start: point, end: point });
    setIsSelecting(true);
  }, []);

  const updateSelection = useCallback((point: Point) => {
    if (isSelecting && selectionRect) {
      setSelectionRect({ ...selectionRect, end: point });
    }
  }, [isSelecting, selectionRect]);

  const endSelection = useCallback((): string[] => {
    if (!selectionRect) {
      setIsSelecting(false);
      return [];
    }

    // Find all shapes intersecting the selection rectangle
    const selectedIds = shapes
      .filter((shape) => {
        // Don't include images or disabled zones in box selection
        if (shape.type === 'image') return false;
        if (shape.type === 'zone' && shape.disabled) return false;
        return isShapeIntersectingRect(shape, selectionRect, wallJoinOverrides);
      })
      .map((shape) => shape.id);

    setSelectionRect(null);
    setIsSelecting(false);

    if (selectedIds.length > 0) {
      setMultiSelectViaBox(true);
    }

    return selectedIds;
  }, [selectionRect, shapes, wallJoinOverrides]);

  const clearSelection = useCallback(() => {
    setSelectionRect(null);
    setIsSelecting(false);
    setMultiSelectViaBox(false);
  }, []);

  return {
    selectionRect,
    isSelecting,
    multiSelectViaBox,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    setMultiSelectViaBox,
  };
};

