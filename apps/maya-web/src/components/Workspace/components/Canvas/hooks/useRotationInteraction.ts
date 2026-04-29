/**
 * Rotation Interaction Hook
 * 
 * Handles rotation of selected shapes.
 * Extracted from useCanvasInteraction for better organization.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Point } from '../../../types';

interface RotationState {
  pivot: Point;
  lastAngle: number;
  totalAngle: number;
  baseOrientation: number;
}

interface RotationPreview {
  pivot: Point;
  absoluteAngle: number;
  deltaAngle: number;
  snappedAngle: number | null;
}

interface UseRotationInteractionProps {
  selectedShapeIds: string[];
  selectedShapeId: string | null;
  beginHistoryBatch: (source: string) => void;
  commitHistoryBatch: () => void;
}

interface UseRotationInteractionReturn {
  isRotating: boolean;
  rotationPreview: { absoluteAngle: number; deltaAngle: number } | null;
  startRotation: (e: React.MouseEvent, pivot: Point, getSVGPoint: (e: React.MouseEvent) => Point) => void;
  updateRotation: (rawPoint: Point, shiftKey: boolean) => { deltaRadians: number; pivot: Point } | null;
  endRotation: () => void;
  resetRotation: () => void;
}

const ROTATION_SNAP_ANGLES = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, -15, -30, -45, -60, -75, -90, -105, -120, -135, -150, -165];
const ROTATION_SNAP_THRESHOLD = 3; // degrees

/**
 * Hook for rotation interaction
 */
export const useRotationInteraction = ({
  selectedShapeIds,
  selectedShapeId,
  beginHistoryBatch,
  commitHistoryBatch,
}: UseRotationInteractionProps): UseRotationInteractionReturn => {
  const [isRotating, setIsRotating] = useState(false);
  const [rotationPreview, setRotationPreview] = useState<RotationPreview | null>(null);
  
  const rotationStateRef = useRef<RotationState | null>(null);
  const selectionRotationRef = useRef<number>(0);
  const selectionRotationStartRef = useRef<number>(0);
  const selectionKeyRef = useRef<string | null>(null);

  // Reset rotation when selection changes
  useEffect(() => {
    const key = (() => {
      if (selectedShapeIds && selectedShapeIds.length > 0) {
        return selectedShapeIds.slice().sort().join('|');
      }
      return selectedShapeId ?? null;
    })();
    if (selectionKeyRef.current !== key) {
      selectionKeyRef.current = key;
      selectionRotationRef.current = 0;
      setRotationPreview(null);
    }
  }, [selectedShapeIds, selectedShapeId]);

  const startRotation = useCallback((
    e: React.MouseEvent,
    pivot: Point,
    getSVGPoint: (e: React.MouseEvent) => Point
  ) => {
    e.stopPropagation();
    const rawPoint = getSVGPoint(e);
    const initialAngle = Math.atan2(rawPoint.y - pivot.y, rawPoint.x - pivot.x);
    selectionRotationStartRef.current = selectionRotationRef.current;
    rotationStateRef.current = {
      pivot,
      lastAngle: initialAngle,
      totalAngle: 0,
      baseOrientation: selectionRotationStartRef.current,
    };
    setIsRotating(true);
    beginHistoryBatch('rotateSelection');
    setRotationPreview({
      pivot,
      absoluteAngle: selectionRotationStartRef.current,
      deltaAngle: 0,
      snappedAngle: null,
    });
  }, [beginHistoryBatch]);

  const updateRotation = useCallback((
    rawPoint: Point,
    shiftKey: boolean
  ): { deltaRadians: number; pivot: Point } | null => {
    if (!isRotating || !rotationStateRef.current) return null;

    const { pivot, lastAngle, totalAngle, baseOrientation } = rotationStateRef.current;
    const angle = Math.atan2(rawPoint.y - pivot.y, rawPoint.x - pivot.x);
    let delta = angle - lastAngle;
    
    // Handle angle wrap-around
    if (delta > Math.PI) {
      delta -= Math.PI * 2;
    } else if (delta < -Math.PI) {
      delta += Math.PI * 2;
    }
    
    const newTotalAngle = totalAngle + delta;
    rotationStateRef.current = {
      pivot,
      lastAngle: angle,
      totalAngle: newTotalAngle,
      baseOrientation,
    };

    let absoluteAngleDeg = baseOrientation + (newTotalAngle * 180) / Math.PI;
    // Normalize to -180 to 180
    while (absoluteAngleDeg > 180) absoluteAngleDeg -= 360;
    while (absoluteAngleDeg < -180) absoluteAngleDeg += 360;

    let snappedAngle: number | null = null;
    let effectiveAngleDeg = absoluteAngleDeg;

    // Shift key enables angle snapping
    if (shiftKey) {
      for (const snapAngle of ROTATION_SNAP_ANGLES) {
        if (Math.abs(absoluteAngleDeg - snapAngle) <= ROTATION_SNAP_THRESHOLD) {
          snappedAngle = snapAngle;
          effectiveAngleDeg = snapAngle;
          break;
        }
      }
    }

    const deltaDeg = effectiveAngleDeg - baseOrientation;
    const deltaRadians = (deltaDeg * Math.PI) / 180;

    selectionRotationRef.current = effectiveAngleDeg;
    setRotationPreview({
      pivot,
      absoluteAngle: effectiveAngleDeg,
      deltaAngle: deltaDeg,
      snappedAngle,
    });

    return { deltaRadians, pivot };
  }, [isRotating]);

  const endRotation = useCallback(() => {
    if (isRotating) {
      commitHistoryBatch();
      rotationStateRef.current = null;
      setIsRotating(false);
    }
  }, [isRotating, commitHistoryBatch]);

  const resetRotation = useCallback(() => {
    selectionRotationRef.current = 0;
    selectionRotationStartRef.current = 0;
    rotationStateRef.current = null;
    setRotationPreview(null);
    setIsRotating(false);
  }, []);

  return {
    isRotating,
    rotationPreview: rotationPreview ? {
      absoluteAngle: rotationPreview.absoluteAngle,
      deltaAngle: rotationPreview.deltaAngle,
    } : null,
    startRotation,
    updateRotation,
    endRotation,
    resetRotation,
  };
};

