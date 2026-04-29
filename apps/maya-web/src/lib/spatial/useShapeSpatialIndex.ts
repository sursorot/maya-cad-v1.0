/**
 * Shape Spatial Index Hook
 * 
 * React hook that maintains a spatial index of workspace shapes.
 * Provides O(log n) lookups for shapes near a point instead of O(n).
 */

import { useRef, useCallback, useMemo } from 'react';
import { GridIndex } from './GridIndex';
import { getShapeBounds } from '../geometry/bounds';
import type { Shape, Point } from '@/components/Workspace/types';
import type { BoundingBox, SpatialItem } from './types';

/**
 * Shape wrapper for spatial indexing
 */
interface IndexedShape extends SpatialItem {
  id: string;
  shape: Shape;
}

/**
 * Options for the spatial index
 */
interface UseShapeSpatialIndexOptions {
  /** Cell size in meters (default: 1.0) */
  cellSize?: number;
  /** Whether to automatically sync on shapes change */
  autoSync?: boolean;
}

/**
 * Hook return type
 */
interface UseShapeSpatialIndexReturn {
  /** Query shapes near a point */
  queryNearPoint: (point: Point, radius: number) => Shape[];
  /** Query shapes in a bounding box */
  queryInBounds: (bounds: BoundingBox) => Shape[];
  /** Query the nearest shape to a point */
  queryNearest: (point: Point, maxDistance?: number) => Shape | null;
  /** Sync the index with a shapes array */
  sync: (shapes: Shape[]) => void;
  /** Add a single shape to the index */
  addShape: (shape: Shape) => void;
  /** Remove a shape by ID */
  removeShape: (shapeId: string) => void;
  /** Update a shape in the index */
  updateShape: (shape: Shape) => void;
  /** Clear the index */
  clear: () => void;
  /** Get index statistics */
  getStats: () => { itemCount: number; cellCount: number };
}

/**
 * Hook for maintaining a spatial index of shapes
 */
export function useShapeSpatialIndex(
  options: UseShapeSpatialIndexOptions = {}
): UseShapeSpatialIndexReturn {
  const { cellSize = 1.0 } = options;
  
  // Maintain a single index instance
  const indexRef = useRef<GridIndex<IndexedShape> | null>(null);
  
  // Get or create the index
  const getIndex = useCallback(() => {
    if (!indexRef.current) {
      indexRef.current = new GridIndex<IndexedShape>({ cellSize });
    }
    return indexRef.current;
  }, [cellSize]);

  /**
   * Sync the index with a shapes array
   */
  const sync = useCallback((shapes: Shape[]) => {
    const index = getIndex();
    
    // Track which shapes are in the new array
    const newShapeIds = new Set(shapes.map(s => s.id));
    
    // Remove shapes that no longer exist
    const existingIds = new Set(index.toArray().map(item => item.id));
    for (const existingId of existingIds) {
      if (!newShapeIds.has(existingId)) {
        index.remove(existingId);
      }
    }
    
    // Add or update shapes
    for (const shape of shapes) {
      const bounds = getShapeBounds(shape);
      const indexed: IndexedShape = { id: shape.id, shape };
      
      if (index.has(shape.id)) {
        index.update(indexed, bounds);
      } else {
        index.insert(indexed, bounds);
      }
    }
  }, [getIndex]);

  /**
   * Add a single shape to the index
   */
  const addShape = useCallback((shape: Shape) => {
    const index = getIndex();
    const bounds = getShapeBounds(shape);
    index.insert({ id: shape.id, shape }, bounds);
  }, [getIndex]);

  /**
   * Remove a shape by ID
   */
  const removeShape = useCallback((shapeId: string) => {
    const index = getIndex();
    index.remove(shapeId);
  }, [getIndex]);

  /**
   * Update a shape in the index
   */
  const updateShape = useCallback((shape: Shape) => {
    const index = getIndex();
    const bounds = getShapeBounds(shape);
    index.update({ id: shape.id, shape }, bounds);
  }, [getIndex]);

  /**
   * Query shapes near a point
   */
  const queryNearPoint = useCallback((point: Point, radius: number): Shape[] => {
    const index = getIndex();
    const results = index.queryRadius(point, radius);
    return results.map(item => item.shape);
  }, [getIndex]);

  /**
   * Query shapes in a bounding box
   */
  const queryInBounds = useCallback((bounds: BoundingBox): Shape[] => {
    const index = getIndex();
    const results = index.query(bounds);
    return results.map(item => item.shape);
  }, [getIndex]);

  /**
   * Query the nearest shape to a point
   */
  const queryNearest = useCallback((point: Point, maxDistance?: number): Shape | null => {
    const index = getIndex();
    const result = index.queryNearest(point, maxDistance);
    return result?.shape ?? null;
  }, [getIndex]);

  /**
   * Clear the index
   */
  const clear = useCallback(() => {
    indexRef.current?.clear();
  }, []);

  /**
   * Get index statistics
   */
  const getStats = useCallback(() => {
    const index = getIndex();
    const stats = index.getStats();
    return {
      itemCount: stats.itemCount,
      cellCount: stats.cellCount,
    };
  }, [getIndex]);

  return useMemo(() => ({
    queryNearPoint,
    queryInBounds,
    queryNearest,
    sync,
    addShape,
    removeShape,
    updateShape,
    clear,
    getStats,
  }), [
    queryNearPoint,
    queryInBounds,
    queryNearest,
    sync,
    addShape,
    removeShape,
    updateShape,
    clear,
    getStats,
  ]);
}

/**
 * Create a standalone spatial index (non-hook version for use in workers)
 */
export function createShapeSpatialIndex(cellSize: number = 1.0) {
  const index = new GridIndex<IndexedShape>({ cellSize });
  
  return {
    sync(shapes: Shape[]) {
      index.clear();
      for (const shape of shapes) {
        const bounds = getShapeBounds(shape);
        index.insert({ id: shape.id, shape }, bounds);
      }
    },
    
    queryNearPoint(point: Point, radius: number): Shape[] {
      return index.queryRadius(point, radius).map(item => item.shape);
    },
    
    queryInBounds(bounds: BoundingBox): Shape[] {
      return index.query(bounds).map(item => item.shape);
    },
    
    clear() {
      index.clear();
    },
  };
}

