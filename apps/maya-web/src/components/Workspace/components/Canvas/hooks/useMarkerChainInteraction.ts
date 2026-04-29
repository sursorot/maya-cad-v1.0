/**
 * Marker Chain Interaction Hook
 * 
 * Handles the marker chain mode's interaction.
 * Shows measurement line from last marker to cursor in chain mode.
 * Extracted from useCanvasInteraction for better organization.
 */

import { useState, useCallback, useEffect } from 'react';
import type { Point } from '../../../types';

type DrawingMode = 'one-time' | 'chain';

interface UseMarkerChainInteractionProps {
  activeTool: string;
  drawingMode: DrawingMode;
}

interface UseMarkerChainInteractionReturn {
  markerChainStart: Point | null;
  markerChainEnd: Point | null;
  isMarkerChaining: boolean;
  startMarkerChain: (point: Point) => void;
  updateMarkerChain: (point: Point) => void;
  commitMarkerChain: (point: Point) => void;
  clearMarkerChain: () => void;
}

/**
 * Hook for marker chain mode interaction
 */
export const useMarkerChainInteraction = ({
  activeTool,
  drawingMode,
}: UseMarkerChainInteractionProps): UseMarkerChainInteractionReturn => {
  const [markerChainStart, setMarkerChainStart] = useState<Point | null>(null);
  const [markerChainEnd, setMarkerChainEnd] = useState<Point | null>(null);
  const [isMarkerChaining, setIsMarkerChaining] = useState(false);

  // Clear marker chain state when switching away from marker tool
  useEffect(() => {
    if (activeTool !== 'marker') {
      setMarkerChainStart(null);
      setMarkerChainEnd(null);
      setIsMarkerChaining(false);
    }
  }, [activeTool]);

  const startMarkerChain = useCallback((point: Point) => {
    if (drawingMode === 'chain') {
      setMarkerChainStart(point);
      setMarkerChainEnd(point);
      setIsMarkerChaining(true);
    }
  }, [drawingMode]);

  const updateMarkerChain = useCallback((point: Point) => {
    if (isMarkerChaining && drawingMode === 'chain') {
      setMarkerChainEnd(point);
    }
  }, [isMarkerChaining, drawingMode]);

  const commitMarkerChain = useCallback((point: Point) => {
    if (drawingMode === 'chain') {
      // Update start to new marker position for next segment
      setMarkerChainStart(point);
      setMarkerChainEnd(point);
    }
  }, [drawingMode]);

  const clearMarkerChain = useCallback(() => {
    setMarkerChainStart(null);
    setMarkerChainEnd(null);
    setIsMarkerChaining(false);
  }, []);

  return {
    markerChainStart,
    markerChainEnd,
    isMarkerChaining,
    startMarkerChain,
    updateMarkerChain,
    commitMarkerChain,
    clearMarkerChain,
  };
};

