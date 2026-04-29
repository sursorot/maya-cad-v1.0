/**
 * Geometry Worker Hook
 * 
 * React hook for computing wall geometry in a Web Worker.
 * Keeps the main thread responsive during heavy calculations.
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import type { Shape } from '@/components/Workspace/types';
import type { 
  GeometryWorkerRequest, 
  GeometryWorkerResponse,
  WallJoinOverridesData,
  MergedWallGeometryData,
  PendingRequest,
} from './types';

/**
 * Result from the geometry worker
 */
export interface GeometryWorkerResult {
  joins: Record<string, WallJoinOverridesData>;
  union: MergedWallGeometryData;
}

/**
 * Hook state
 */
interface UseGeometryWorkerState {
  isReady: boolean;
  isComputing: boolean;
  error: string | null;
}

/**
 * Hook for using the geometry worker
 */
export function useGeometryWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, PendingRequest<GeometryWorkerResult>>>(new Map());
  const requestIdRef = useRef(0);
  
  const [state, setState] = useState<UseGeometryWorkerState>({
    isReady: false,
    isComputing: false,
    error: null,
  });

  // Initialize worker
  useEffect(() => {
    let mounted = true;

    const initWorker = async () => {
      try {
        // Create worker using Vite's worker syntax
        const worker = new Worker(
          new URL('../../workers/geometry.worker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (e: MessageEvent<GeometryWorkerResponse>) => {
          const { id, type } = e.data;
          const pending = pendingRef.current.get(id);
          
          if (!pending) {
            console.warn('Received response for unknown request:', id);
            return;
          }

          pendingRef.current.delete(id);
          
          // Update computing state
          if (pendingRef.current.size === 0) {
            setState(s => ({ ...s, isComputing: false }));
          }

          if (type === 'error') {
            pending.reject(new Error((e.data as { error: string }).error));
          } else if (type === 'bothResult') {
            const data = e.data as { joins: Record<string, WallJoinOverridesData>; union: MergedWallGeometryData };
            pending.resolve({ joins: data.joins, union: data.union });
          } else if (type === 'wallJoinsResult') {
            // If we only requested joins, create empty union result
            const data = e.data as { result: Record<string, WallJoinOverridesData> };
            pending.resolve({
              joins: data.result,
              union: { outerBoundary: [], holes: [], success: true },
            });
          } else if (type === 'wallUnionResult') {
            // If we only requested union, create empty joins result
            const data = e.data as { result: MergedWallGeometryData };
            pending.resolve({
              joins: {},
              union: data.result,
            });
          }
        };

        worker.onerror = (e) => {
          console.error('Geometry worker error:', e);
          if (mounted) {
            setState(s => ({ ...s, error: e.message }));
          }
          
          // Reject all pending requests
          for (const pending of pendingRef.current.values()) {
            pending.reject(new Error('Worker error: ' + e.message));
          }
          pendingRef.current.clear();
        };

        workerRef.current = worker;
        
        if (mounted) {
          setState({ isReady: true, isComputing: false, error: null });
        }
      } catch (error) {
        console.error('Failed to initialize geometry worker:', error);
        if (mounted) {
          setState(s => ({ 
            ...s, 
            error: error instanceof Error ? error.message : 'Failed to initialize worker' 
          }));
        }
      }
    };

    initWorker();

    return () => {
      mounted = false;
      // Access refs directly - this is intentional as we need the current value at cleanup time
      const currentWorker = workerRef.current;
      const currentPending = pendingRef.current;
      
      if (currentWorker) {
        currentWorker.terminate();
        workerRef.current = null;
      }
      // Reject any pending requests
      for (const p of currentPending.values()) {
        p.reject(new Error('Worker terminated'));
      }
      currentPending.clear();
    };
  }, []);

  /**
   * Compute wall joins and union in the worker
   */
  const computeWallGeometry = useCallback(async (
    shapes: Shape[]
  ): Promise<GeometryWorkerResult> => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
    }

    const id = `geom-${++requestIdRef.current}`;
    
    setState(s => ({ ...s, isComputing: true }));

    return new Promise((resolve, reject) => {
      pendingRef.current.set(id, { 
        resolve,
        reject,
        timestamp: Date.now(),
      });
      
      const request: GeometryWorkerRequest = {
        type: 'computeBoth',
        id,
        shapes,
      };
      
      workerRef.current!.postMessage(request);
    });
  }, []);

  /**
   * Compute only wall joins (lighter operation)
   */
  const computeWallJoins = useCallback(async (
    shapes: Shape[]
  ): Promise<Record<string, WallJoinOverridesData>> => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
    }

    const id = `joins-${++requestIdRef.current}`;
    
    setState(s => ({ ...s, isComputing: true }));

    return new Promise((resolve, reject) => {
      const pending: PendingRequest<GeometryWorkerResult> = {
        resolve: (result) => resolve(result.joins),
        reject,
        timestamp: Date.now(),
      };
      
      pendingRef.current.set(id, pending);
      
      const request: GeometryWorkerRequest = {
        type: 'computeWallJoins',
        id,
        shapes,
      };
      
      workerRef.current!.postMessage(request);
    });
  }, []);

  /**
   * Cancel all pending computations
   */
  const cancelAll = useCallback(() => {
    for (const pending of pendingRef.current.values()) {
      pending.reject(new Error('Cancelled'));
    }
    pendingRef.current.clear();
    setState(s => ({ ...s, isComputing: false }));
  }, []);

  return useMemo(() => ({
    ...state,
    computeWallGeometry,
    computeWallJoins,
    cancelAll,
  }), [state, computeWallGeometry, computeWallJoins, cancelAll]);
}

/**
 * Fallback computation on main thread (when workers not available)
 * This imports the actual computation functions and runs them synchronously
 */
export async function computeWallGeometrySync(
  shapes: Shape[],
  computeWallJoins: (shapes: Shape[]) => Record<string, WallJoinOverridesData>,
  computeWallUnion: (shapes: Shape[], joins: Record<string, WallJoinOverridesData>) => MergedWallGeometryData
): Promise<GeometryWorkerResult> {
  const joins = computeWallJoins(shapes);
  const union = computeWallUnion(shapes, joins);
  return { joins, union };
}

