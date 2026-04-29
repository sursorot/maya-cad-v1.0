/**
 * Wall Graph Hook
 * 
 * React hook that maintains a wall connectivity graph for incremental updates.
 * Only recalculates affected walls when changes occur.
 */

import { useRef, useCallback, useMemo, useEffect } from 'react';
import { WallGraph, createWallGraph } from './WallGraph';
import type { Shape, WallShape } from '@/components/Workspace/types';
import type { WallGraphChange, WallJoinOverrides } from './types';

/**
 * Options for the wall graph hook
 */
interface UseWallGraphOptions {
  /** Callback when walls are affected by changes */
  onAffectedWalls?: (wallIds: string[]) => void;
  /** Whether to enable debug logging */
  debug?: boolean;
}

/**
 * Hook return type
 */
interface UseWallGraphReturn {
  /** Sync the graph with shapes array */
  sync: (shapes: Shape[]) => Set<string>;
  /** Get walls connected to a given wall */
  getConnectedWalls: (wallId: string) => string[];
  /** Get all walls at a point */
  getWallsAtPoint: (point: { x: number; y: number }) => string[];
  /** Get a wall by ID */
  getWall: (wallId: string) => WallShape | undefined;
  /** Get all walls */
  getAllWalls: () => WallShape[];
  /** Get cached join overrides */
  getCachedJoins: (wallId: string) => WallJoinOverrides | undefined;
  /** Set cached join overrides */
  setCachedJoins: (wallId: string, joins: WallJoinOverrides) => void;
  /** Get graph statistics */
  getStats: () => { wallCount: number; connectionCount: number; junctionCount: number };
  /** Subscribe to graph changes */
  subscribe: (listener: (change: WallGraphChange) => void) => () => void;
  /** Clear the graph */
  clear: () => void;
}

/**
 * Hook for maintaining a wall connectivity graph
 */
export function useWallGraph(options: UseWallGraphOptions = {}): UseWallGraphReturn {
  const { onAffectedWalls, debug = false } = options;
  
  // Maintain a single graph instance
  const graphRef = useRef<WallGraph | null>(null);
  
  // Get or create the graph
  const getGraph = useCallback(() => {
    if (!graphRef.current) {
      graphRef.current = createWallGraph();
    }
    return graphRef.current;
  }, []);

  // Subscribe to changes and notify callback
  useEffect(() => {
    if (!onAffectedWalls) return;
    
    const graph = getGraph();
    
    const unsubscribe = graph.subscribe((change) => {
      if (debug) {
        console.log('[WallGraph] Change:', change.type, change.wallId, 'affected:', change.affectedWallIds);
      }
      onAffectedWalls(change.affectedWallIds);
    });
    
    return unsubscribe;
  }, [getGraph, onAffectedWalls, debug]);

  /**
   * Sync the graph with a shapes array
   */
  const sync = useCallback((shapes: Shape[]): Set<string> => {
    const graph = getGraph();
    const startTime = debug ? performance.now() : 0;
    
    const affected = graph.sync(shapes);
    
    if (debug && performance.now() - startTime > 5) {
      console.log(`[WallGraph] Sync took ${(performance.now() - startTime).toFixed(1)}ms, ${affected.size} affected walls`);
    }
    
    return affected;
  }, [getGraph, debug]);

  /**
   * Get walls connected to a given wall
   */
  const getConnectedWalls = useCallback((wallId: string): string[] => {
    return getGraph().getConnectedWalls(wallId);
  }, [getGraph]);

  /**
   * Get all walls at a point
   */
  const getWallsAtPoint = useCallback((point: { x: number; y: number }): string[] => {
    return getGraph().getWallsAtPoint(point);
  }, [getGraph]);

  /**
   * Get a wall by ID
   */
  const getWall = useCallback((wallId: string): WallShape | undefined => {
    return getGraph().getWall(wallId);
  }, [getGraph]);

  /**
   * Get all walls
   */
  const getAllWalls = useCallback((): WallShape[] => {
    return getGraph().getAllWalls();
  }, [getGraph]);

  /**
   * Get cached join overrides
   */
  const getCachedJoins = useCallback((wallId: string): WallJoinOverrides | undefined => {
    return getGraph().getCachedJoins(wallId);
  }, [getGraph]);

  /**
   * Set cached join overrides
   */
  const setCachedJoins = useCallback((wallId: string, joins: WallJoinOverrides): void => {
    getGraph().setCachedJoins(wallId, joins);
  }, [getGraph]);

  /**
   * Get graph statistics
   */
  const getStats = useCallback(() => {
    const stats = getGraph().getStats();
    return {
      wallCount: stats.wallCount,
      connectionCount: stats.connectionCount,
      junctionCount: stats.junctionCount,
    };
  }, [getGraph]);

  /**
   * Subscribe to graph changes
   */
  const subscribe = useCallback((listener: (change: WallGraphChange) => void) => {
    return getGraph().subscribe(listener);
  }, [getGraph]);

  /**
   * Clear the graph
   */
  const clear = useCallback(() => {
    graphRef.current?.clear();
  }, []);

  return useMemo(() => ({
    sync,
    getConnectedWalls,
    getWallsAtPoint,
    getWall,
    getAllWalls,
    getCachedJoins,
    setCachedJoins,
    getStats,
    subscribe,
    clear,
  }), [
    sync,
    getConnectedWalls,
    getWallsAtPoint,
    getWall,
    getAllWalls,
    getCachedJoins,
    setCachedJoins,
    getStats,
    subscribe,
    clear,
  ]);
}

