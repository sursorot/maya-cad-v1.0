/**
 * Optimized Wall Geometry Hook
 * 
 * Combines spatial indexing, wall graph, and web workers for
 * efficient wall geometry calculations.
 * 
 * Key optimizations:
 * - Incremental updates: Only recalculate affected walls
 * - Non-blocking: Heavy computations run in web worker
 * - Caching: Results cached and reused when possible
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Shape } from '../types';
import { useWallGraph } from '@/lib/geometry';
import { useGeometryWorker } from '@/lib/workers';
import { ComputeCache } from '@/lib/cache';
import { hashWalls } from '@/lib/cache/ShapeHasher';
import { computeWallJoins, computeWallUnion } from '../utils/walls';
import type { WallJoinOverrides, MergedWallGeometry } from '../utils/walls';
import { isShapeInViewport } from '../utils/viewportCulling';

// Performance tracking (only in development)
const PERF_TRACKING = typeof window !== 'undefined' && import.meta.env?.DEV === true;

interface PerformanceStats {
  cacheHits: number;
  cacheMisses: number;
  workerComputations: number;
  mainThreadComputations: number;
  totalComputeTime: number;
  lastComputeTime: number;
}

const perfStats: PerformanceStats = {
  cacheHits: 0,
  cacheMisses: 0,
  workerComputations: 0,
  mainThreadComputations: 0,
  totalComputeTime: 0,
  lastComputeTime: 0,
};

// Expose stats to window for console access
if (typeof window !== 'undefined') {
  // Use type-safe window extension
  const win = window as unknown as {
    wallGeometryPerfStats: PerformanceStats;
    getWallGeometryStats: () => PerformanceStats;
    resetWallGeometryStats: () => void;
  };

  win.wallGeometryPerfStats = perfStats;

  win.getWallGeometryStats = () => {
    const avgTime = perfStats.cacheMisses > 0
      ? perfStats.totalComputeTime / perfStats.cacheMisses
      : 0;
    const hitRate = (perfStats.cacheHits + perfStats.cacheMisses) > 0
      ? (perfStats.cacheHits / (perfStats.cacheHits + perfStats.cacheMisses)) * 100
      : 0;

    console.log('\n📊 Wall Geometry Performance Stats');
    console.log('─'.repeat(50));
    console.log(`  Cache Hits:          ${perfStats.cacheHits}`);
    console.log(`  Cache Misses:        ${perfStats.cacheMisses}`);
    console.log(`  Cache Hit Rate:      ${hitRate.toFixed(1)}%`);
    console.log(`  Worker Computations: ${perfStats.workerComputations}`);
    console.log(`  Main Thread:         ${perfStats.mainThreadComputations}`);
    console.log(`  Avg Compute Time:    ${avgTime.toFixed(2)}ms`);
    console.log(`  Last Compute Time:   ${perfStats.lastComputeTime.toFixed(2)}ms`);
    console.log(`  Total Compute Time:  ${perfStats.totalComputeTime.toFixed(2)}ms`);

    return perfStats;
  };

  win.resetWallGeometryStats = () => {
    perfStats.cacheHits = 0;
    perfStats.cacheMisses = 0;
    perfStats.workerComputations = 0;
    perfStats.mainThreadComputations = 0;
    perfStats.totalComputeTime = 0;
    perfStats.lastComputeTime = 0;
    console.log('Stats reset');
  };
}

/**
 * Empty geometry for initial/disabled state
 */
const EMPTY_WALL_GEOMETRY: MergedWallGeometry = {
  polygons: [],
  outerPolygons: [],
  innerPolygons: [],
  wallIds: [],
};

/**
 * Options for the optimized wall geometry hook
 */
interface UseOptimizedWallGeometryOptions {
  /** Whether wall join calculations are enabled */
  enableWallJoins?: boolean;
  /** Whether wall union rendering is enabled */
  enableWallUnion?: boolean;
  /** Whether to use web worker for heavy calculations */
  useWorker?: boolean;
  /** Debug mode for logging */
  debug?: boolean;
  /** Current viewport for culling (optional - if provided, only process visible walls for union) */
  viewBox?: { x: number; y: number; width: number; height: number };
}

/**
 * Result from the hook
 */
interface UseOptimizedWallGeometryResult {
  /** Computed wall join overrides */
  wallJoinOverrides: Record<string, WallJoinOverrides>;
  /** Merged wall geometry (union of all wall polygons) */
  mergedWallGeometry: MergedWallGeometry;
  /** Whether computation is in progress */
  isComputing: boolean;
  /** Any error during computation */
  error: string | null;
  /** Force a full recalculation */
  recalculate: () => void;
}

// Cache for wall geometry results
const geometryCache = new ComputeCache<{
  joins: Record<string, WallJoinOverrides>;
  geometry: MergedWallGeometry;
}>({
  name: 'wall-geometry',
  maxSize: 20,
  ttlMs: undefined,
});

/**
 * Hook for optimized wall geometry calculations
 */
export function useOptimizedWallGeometry(
  shapes: Shape[],
  currentShape: Shape | null,
  options: UseOptimizedWallGeometryOptions = {}
): UseOptimizedWallGeometryResult {
  const {
    enableWallJoins = true,
    enableWallUnion = true,
    useWorker = true,
    debug = false,
    viewBox,
  } = options;

  // State for computed results
  const [wallJoinOverrides, setWallJoinOverrides] = useState<Record<string, WallJoinOverrides>>({});
  const [mergedWallGeometry, setMergedWallGeometry] = useState<MergedWallGeometry>(EMPTY_WALL_GEOMETRY);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for tracking computation
  const lastHashRef = useRef<string>('');
  const computationIdRef = useRef(0);

  // Wall graph for incremental updates
  const wallGraph = useWallGraph({ debug });

  // Geometry worker for non-blocking computation
  const geometryWorker = useGeometryWorker();

  // Combine shapes with current shape if it's a wall
  // Also filter by viewport if provided (for performance)
  const effectiveShapes = useMemo(() => {
    let wallShapes = shapes;

    // Add current shape if it's a wall
    if (currentShape && currentShape.type === 'wall') {
      wallShapes = [...shapes, currentShape];
    }

    // If viewBox is provided and there are many walls, filter to visible walls only
    // We use a very large margin (2.0 = 200% viewport size) because wall joins can affect
    // walls well outside the viewport. Only apply when there are many walls (>30)
    const wallCount = wallShapes.filter(s => s.type === 'wall').length;
    if (viewBox && wallCount > 30) {
      const visibleWalls = wallShapes.filter(shape => {
        if (shape.type !== 'wall') return true; // Keep non-wall shapes
        return isShapeInViewport(shape, viewBox, 2.0); // 200% margin
      });
      return visibleWalls;
    }

    return wallShapes;
  }, [shapes, currentShape, viewBox]);

  // Ref to track if we're in rapid update mode (accessible to computeGeometry)
  const isRapidUpdateModeRef = useRef(false);

  // Compute wall geometry (runs when shapes change)
  const computeGeometry = useCallback(async () => {
    if (!enableWallJoins && !enableWallUnion) {
      setWallJoinOverrides({});
      setMergedWallGeometry(EMPTY_WALL_GEOMETRY);
      return;
    }

    // Generate hash for current wall configuration
    const currentHash = hashWalls(effectiveShapes);

    // Skip if nothing changed
    if (currentHash === lastHashRef.current) {
      return;
    }

    // Check cache first
    const cached = geometryCache.get(currentHash);
    if (cached) {
      if (PERF_TRACKING) perfStats.cacheHits++;
      if (debug) console.log('[WallGeometry] Cache hit');
      setWallJoinOverrides(enableWallJoins ? cached.joins : {});
      setMergedWallGeometry(enableWallUnion ? cached.geometry : EMPTY_WALL_GEOMETRY);
      lastHashRef.current = currentHash;
      return;
    }

    // Cache miss - need to compute
    if (PERF_TRACKING) perfStats.cacheMisses++;

    // Increment computation ID to track outdated results
    const computationId = ++computationIdRef.current;
    setIsComputing(true);
    setError(null);

    const startTime = performance.now();

    // Check if we should use synchronous mode (during rapid updates like dragging)
    const useSyncMode = isRapidUpdateModeRef.current;

    try {
      let joins: Record<string, WallJoinOverrides> = {};
      let geometry: MergedWallGeometry = EMPTY_WALL_GEOMETRY;

      // Sync wall graph for incremental updates
      const affectedWalls = wallGraph.sync(effectiveShapes);

      if (debug && affectedWalls.size > 0) {
        console.log(`[WallGeometry] ${affectedWalls.size} walls affected`);
      }

      // During rapid updates (dragging), use synchronous main thread computation
      // to eliminate any async latency that causes visual duplication
      if (useSyncMode) {
        try {
          if (enableWallJoins) {
            joins = computeWallJoins(effectiveShapes);
          }
          if (enableWallUnion) {
            geometry = computeWallUnion(effectiveShapes, joins);
          }
        } catch (syncError) {
          console.error('[WallGeometry] Sync computation failed:', syncError);
          joins = {};
          geometry = EMPTY_WALL_GEOMETRY;
        }

        if (PERF_TRACKING) {
          perfStats.mainThreadComputations++;
          const duration = performance.now() - startTime;
          perfStats.lastComputeTime = duration;
          perfStats.totalComputeTime += duration;
        }

        if (debug) {
          console.log(`[WallGeometry] Sync mode completed in ${(performance.now() - startTime).toFixed(1)}ms`);
        }
      }
      // Try to use worker for heavy computation (only when not in rapid update mode)
      else if (useWorker && geometryWorker.isReady) {
        try {
          const result = await geometryWorker.computeWallGeometry(effectiveShapes);

          // Check if this computation is still relevant
          if (computationId !== computationIdRef.current) {
            if (debug) console.log('[WallGeometry] Computation outdated, discarding');
            return;
          }

          joins = result.joins as unknown as Record<string, WallJoinOverrides>;
          geometry = result.union as unknown as MergedWallGeometry;

          // Track worker computation
          if (PERF_TRACKING) {
            perfStats.workerComputations++;
            const duration = performance.now() - startTime;
            perfStats.lastComputeTime = duration;
            perfStats.totalComputeTime += duration;
          }

          if (debug) {
            console.log(`[WallGeometry] Worker completed in ${(performance.now() - startTime).toFixed(1)}ms`);
          }
        } catch (workerError) {
          // Fall back to main thread on worker error
          if (debug) {
            console.warn('[WallGeometry] Worker failed, falling back to main thread:', workerError);
          }

          // Compute on main thread with error handling
          try {
            if (enableWallJoins) {
              joins = computeWallJoins(effectiveShapes);
            }
            if (enableWallUnion) {
              geometry = computeWallUnion(effectiveShapes, joins);
            }
          } catch (fallbackError) {
            console.error('[WallGeometry] Fallback computation failed:', fallbackError);
            // Return empty geometry instead of crashing
            joins = {};
            geometry = EMPTY_WALL_GEOMETRY;
          }

          // Track main thread fallback
          if (PERF_TRACKING) {
            perfStats.mainThreadComputations++;
            const duration = performance.now() - startTime;
            perfStats.lastComputeTime = duration;
            perfStats.totalComputeTime += duration;
          }
        }
      } else {
        // Compute on main thread (worker not available or disabled)
        try {
          if (enableWallJoins) {
            joins = computeWallJoins(effectiveShapes);
          }
          if (enableWallUnion) {
            geometry = computeWallUnion(effectiveShapes, joins);
          }
        } catch (mainThreadError) {
          console.error('[WallGeometry] Main thread computation failed:', mainThreadError);
          // Return empty geometry instead of crashing
          joins = {};
          geometry = EMPTY_WALL_GEOMETRY;
        }

        // Track main thread computation
        if (PERF_TRACKING) {
          perfStats.mainThreadComputations++;
          const duration = performance.now() - startTime;
          perfStats.lastComputeTime = duration;
          perfStats.totalComputeTime += duration;
        }

        if (debug) {
          console.log(`[WallGeometry] Main thread completed in ${(performance.now() - startTime).toFixed(1)}ms`);
        }
      }

      // Check if this computation is still relevant
      if (computationId !== computationIdRef.current) {
        if (debug) console.log('[WallGeometry] Computation outdated, discarding');
        return;
      }

      // Cache the result
      geometryCache.set(currentHash, { joins, geometry });

      // Update state
      setWallJoinOverrides(enableWallJoins ? joins : {});
      setMergedWallGeometry(enableWallUnion ? geometry : EMPTY_WALL_GEOMETRY);
      lastHashRef.current = currentHash;

    } catch (err) {
      if (computationId === computationIdRef.current) {
        console.error('[WallGeometry] Computation error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      if (computationId === computationIdRef.current) {
        setIsComputing(false);
      }
    }
  }, [
    effectiveShapes,
    enableWallJoins,
    enableWallUnion,
    useWorker,
    geometryWorker,
    wallGraph,
    debug,
  ]);

  // Debounce ref for throttling computations
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDrawingRef = useRef(false);
  const lastShapesChangeRef = useRef<number>(0);

  // Track if user is actively drawing (has currentShape)
  useEffect(() => {
    isDrawingRef.current = currentShape !== null;
  }, [currentShape]);

  // Track rapid shape changes (indicates dragging/interaction)
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastChange = now - lastShapesChangeRef.current;
    lastShapesChangeRef.current = now;

    // If shapes changed within 150ms, we're likely in an interactive mode (dragging)
    isRapidUpdateModeRef.current = timeSinceLastChange < 150;
  }, [effectiveShapes]);

  // Trigger computation when shapes change - with debouncing
  useEffect(() => {
    // Clear any pending computation
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Check if we're in interactive mode (drawing or rapid updates like dragging)
    const isInteractive = isDrawingRef.current || isRapidUpdateModeRef.current;

    if (isInteractive) {
      // During interactive operations: compute immediately (no debounce, no async)
      // This ensures WallGeometryLayer and ShapesLayer stay in sync
      computeGeometry();
    } else {
      // During idle: use debounce + requestIdleCallback for better performance
      debounceTimerRef.current = setTimeout(() => {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => computeGeometry(), { timeout: 100 });
        } else {
          computeGeometry();
        }
      }, 50);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [computeGeometry, currentShape, effectiveShapes]);

  // Force recalculation function
  const recalculate = useCallback(() => {
    lastHashRef.current = ''; // Clear hash to force recompute
    geometryCache.clear(); // Clear cache
    computeGeometry();
  }, [computeGeometry]);

  return {
    wallJoinOverrides,
    mergedWallGeometry,
    isComputing,
    error,
    recalculate,
  };
}

/**
 * Simplified synchronous version for when worker isn't needed
 * (e.g., small number of walls or when immediate result is required)
 */
export function useWallGeometrySync(
  shapes: Shape[],
  currentShape: Shape | null,
  options: { enableWallJoins?: boolean; enableWallUnion?: boolean } = {}
): {
  wallJoinOverrides: Record<string, WallJoinOverrides>;
  mergedWallGeometry: MergedWallGeometry;
} {
  const { enableWallJoins = true, enableWallUnion = true } = options;

  const effectiveShapes = useMemo(() => {
    if (currentShape && currentShape.type === 'wall') {
      return [...shapes, currentShape];
    }
    return shapes;
  }, [shapes, currentShape]);

  const wallJoinOverrides = useMemo(() => {
    if (!enableWallJoins) return {};
    return computeWallJoins(effectiveShapes);
  }, [effectiveShapes, enableWallJoins]);

  const mergedWallGeometry = useMemo(() => {
    if (!enableWallUnion) return EMPTY_WALL_GEOMETRY;
    return computeWallUnion(effectiveShapes, wallJoinOverrides);
  }, [effectiveShapes, wallJoinOverrides, enableWallUnion]);

  return { wallJoinOverrides, mergedWallGeometry };
}

