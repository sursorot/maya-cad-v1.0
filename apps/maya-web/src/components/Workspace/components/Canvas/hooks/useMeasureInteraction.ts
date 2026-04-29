/**
 * Measure Interaction Hook
 * 
 * Handles the measure tool's click-and-drag behavior.
 * Extracted from useCanvasInteraction for better organization.
 */

import { useState, useCallback, useEffect } from 'react';
import type { Point } from '../../../types';

interface UseMeasureInteractionProps {
  activeTool: string;
}

interface UseMeasureInteractionReturn {
  measureStart: Point | null;
  measureEnd: Point | null;
  isMeasuring: boolean;
  startMeasure: (point: Point) => void;
  updateMeasure: (point: Point) => void;
  endMeasure: () => void;
  clearMeasure: () => void;
}

/**
 * Hook for measure tool interaction
 */
export const useMeasureInteraction = ({
  activeTool,
}: UseMeasureInteractionProps): UseMeasureInteractionReturn => {
  const [measureStart, setMeasureStart] = useState<Point | null>(null);
  const [measureEnd, setMeasureEnd] = useState<Point | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);

  // Clear measure state when switching away from measure tool
  useEffect(() => {
    if (activeTool !== 'measure') {
      setMeasureStart(null);
      setMeasureEnd(null);
      setIsMeasuring(false);
    }
  }, [activeTool]);

  const startMeasure = useCallback((point: Point) => {
    setMeasureStart(point);
    setMeasureEnd(point);
    setIsMeasuring(true);
  }, []);

  const updateMeasure = useCallback((point: Point) => {
    if (isMeasuring) {
      setMeasureEnd(point);
    }
  }, [isMeasuring]);

  const endMeasure = useCallback(() => {
    // Keep the measurement visible after mouse up
    setIsMeasuring(false);
  }, []);

  const clearMeasure = useCallback(() => {
    setMeasureStart(null);
    setMeasureEnd(null);
    setIsMeasuring(false);
  }, []);

  return {
    measureStart,
    measureEnd,
    isMeasuring,
    startMeasure,
    updateMeasure,
    endMeasure,
    clearMeasure,
  };
};

