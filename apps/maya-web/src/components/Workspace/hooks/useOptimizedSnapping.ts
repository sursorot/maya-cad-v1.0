/**
 * Optimized Snapping Hook
 * 
 * Enhanced snapping with spatial indexing for O(1) shape lookups
 * instead of O(n) filtering through all shapes.
 * 
 * This is a drop-in enhancement for useSnapping that adds:
 * - Spatial indexing for fast proximity queries
 * - Automatic index maintenance on shape changes
 * - Same API as original useSnapping
 */

import { useRef, useCallback, useMemo, useEffect } from 'react';
import type { Point, Shape, SnapSettings } from '../types';
import { useSnapping } from './useSnapping';
import { createShapeSpatialIndex } from '@/lib/spatial/useShapeSpatialIndex';
import type { BoundingBox } from '@/lib/spatial/types';

/**
 * Options for the optimized snapping hook
 */
interface UseOptimizedSnappingOptions {
  /** Minimum number of shapes before using spatial index (default: 30) */
  spatialIndexThreshold?: number;
  /** Cell size for spatial index in meters (default: 1.0) */
  cellSize?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Hook for optimized snapping with spatial indexing
 * 
 * Falls back to standard snapping for small shape counts,
 * uses spatial index for larger drawings.
 */
export function useOptimizedSnapping(
  shapes: Shape[],
  snapSettings: SnapSettings | undefined,
  gridSpacing: number = 1,
  zoomScale: number = 1,
  options: UseOptimizedSnappingOptions = {}
) {
  const {
    spatialIndexThreshold = 30,
    cellSize = 1.0,
    debug = false,
  } = options;

  // Create spatial index (maintained across renders)
  const spatialIndexRef = useRef(createShapeSpatialIndex(cellSize));
  const lastShapeCountRef = useRef(0);

  // Keep spatial index in sync with shapes
  useEffect(() => {
    // Only sync when shape count changes significantly or we cross the threshold
    const useSpatialIndex = shapes.length >= spatialIndexThreshold;

    if (useSpatialIndex) {
      const startTime = debug ? performance.now() : 0;
      spatialIndexRef.current.sync(shapes);

      if (debug && shapes.length !== lastShapeCountRef.current) {
        console.log(`[OptimizedSnapping] Synced spatial index with ${shapes.length} shapes in ${(performance.now() - startTime).toFixed(1)}ms`);
      }
    }

    lastShapeCountRef.current = shapes.length;
  }, [shapes, spatialIndexThreshold, debug]);

  /**
   * Get shapes near a point using spatial index
   */
  const getShapesNearPoint = useCallback((point: Point, radius: number): Shape[] => {
    if (shapes.length < spatialIndexThreshold) {
      // For small shape counts, just return all shapes
      return shapes;
    }

    const startTime = debug ? performance.now() : 0;
    const nearbyShapes = spatialIndexRef.current.queryNearPoint(point, radius);

    if (debug && performance.now() - startTime > 1) {
      console.log(`[OptimizedSnapping] queryNearPoint found ${nearbyShapes.length}/${shapes.length} shapes in ${(performance.now() - startTime).toFixed(1)}ms`);
    }

    return nearbyShapes;
  }, [shapes, spatialIndexThreshold, debug]);

  // Use the standard snapping hook with spatial query
  const baseSnapping = useSnapping(
    shapes,
    snapSettings,
    gridSpacing,
    zoomScale,
    { getShapesNearPoint }
  );

  /**
   * Get shapes in a bounding box using spatial index
   */
  const getShapesInBounds = useCallback((bounds: BoundingBox): Shape[] => {
    if (shapes.length < spatialIndexThreshold) {
      return shapes;
    }

    return spatialIndexRef.current.queryInBounds(bounds);
  }, [shapes, spatialIndexThreshold]);

  // Return the base snapping functionality plus spatial query helpers
  return useMemo(() => ({
    ...baseSnapping,
    // Additional spatial query functions for advanced use cases
    getShapesNearPoint,
    getShapesInBounds,
    // Stats for debugging
    get spatialIndexStats() {
      return {
        usingSpatialIndex: shapes.length >= spatialIndexThreshold,
        shapeCount: shapes.length,
        threshold: spatialIndexThreshold,
      };
    },
  }), [baseSnapping, getShapesNearPoint, getShapesInBounds, shapes.length, spatialIndexThreshold]);
}

/**
 * Utility to pre-filter shapes near a point
 * Can be used to reduce shapes before passing to snapping
 */
export function filterShapesNearPoint(
  shapes: Shape[],
  point: Point,
  radius: number
): Shape[] {
  // For small arrays, no need for filtering
  if (shapes.length < 30) {
    return shapes;
  }

  const radiusSq = radius * radius;

  return shapes.filter(shape => {
    // Get a representative point for the shape
    const shapePoint = getShapeRepresentativePoint(shape);
    if (!shapePoint) return true; // Include if we can't determine position

    // Quick distance check
    const dx = shapePoint.x - point.x;
    const dy = shapePoint.y - point.y;
    return dx * dx + dy * dy <= radiusSq;
  });
}

/**
 * Get a representative point for a shape (for quick distance checks)
 */
function getShapeRepresentativePoint(shape: Shape): Point | null {
  switch (shape.type) {
    case 'line':
      return { x: (shape.start.x + shape.end.x) / 2, y: (shape.start.y + shape.end.y) / 2 };
    case 'polyline':
    case 'curve':
      if (shape.points.length === 0) return null;
      const mid = Math.floor(shape.points.length / 2);
      return shape.points[mid];
    case 'arc':
      return { x: (shape.start.x + shape.end.x) / 2, y: (shape.start.y + shape.end.y) / 2 };
    case 'circle':
      return shape.center;
    case 'rectangle':
      return { x: (shape.start.x + shape.end.x) / 2, y: (shape.start.y + shape.end.y) / 2 };
    case 'wall':
      if (shape.centerline.length === 0) return null;
      const wallMid = Math.floor(shape.centerline.length / 2);
      return shape.centerline[wallMid];
    case 'opening':
      return shape.anchor;
    case 'room':
    case 'zone':
      return (shape as any).centroid || (shape.points.length > 0 ? shape.points[0] : null);
    case 'marker':
      return shape.position;
    case 'guideline':
      if (shape.start && shape.end) {
        return { x: (shape.start.x + shape.end.x) / 2, y: (shape.start.y + shape.end.y) / 2 };
      }
      return null;
    case 'dimension':
      return { x: (shape.start.x + shape.end.x) / 2, y: (shape.start.y + shape.end.y) / 2 };
    case 'text':
      return shape.position;
    default:
      return null;
  }
}

