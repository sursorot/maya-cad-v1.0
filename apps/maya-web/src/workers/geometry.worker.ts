/**
 * Geometry Worker
 * 
 * Web Worker for computing expensive wall geometry operations.
 * Runs in a separate thread to keep the main thread responsive.
 * 
 * Operations:
 * - computeWallJoins: Calculate join geometry for connected walls
 * - computeWallUnion: Compute boolean union of wall polygons
 * - computeBoth: Calculate both joins and union together
 */

import type { Shape } from '../components/Workspace/types';
import { 
  computeWallJoins, 
  computeWallUnion,
  type WallJoinOverrides,
  type MergedWallGeometry,
} from '../components/Workspace/utils/walls';

/**
 * Message types
 */
type GeometryWorkerRequest =
  | { type: 'computeWallJoins'; id: string; shapes: Shape[] }
  | { type: 'computeWallUnion'; id: string; shapes: Shape[]; joins: Record<string, WallJoinOverrides> }
  | { type: 'computeBoth'; id: string; shapes: Shape[] };

type GeometryWorkerResponse =
  | { type: 'wallJoinsResult'; id: string; result: Record<string, WallJoinOverrides> }
  | { type: 'wallUnionResult'; id: string; result: MergedWallGeometry }
  | { type: 'bothResult'; id: string; joins: Record<string, WallJoinOverrides>; union: MergedWallGeometry }
  | { type: 'error'; id: string; error: string };

/**
 * Handle incoming messages
 */
self.onmessage = (e: MessageEvent<GeometryWorkerRequest>) => {
  const { type, id } = e.data;
  
  try {
    switch (type) {
      case 'computeWallJoins': {
        const startTime = performance.now();
        const result = computeWallJoins(e.data.shapes);
        const duration = performance.now() - startTime;
        
        if (duration > 50) {
          console.log(`[Worker] computeWallJoins took ${duration.toFixed(1)}ms for ${e.data.shapes.length} shapes`);
        }
        
        self.postMessage({ 
          type: 'wallJoinsResult', 
          id, 
          result 
        } as GeometryWorkerResponse);
        break;
      }
      
      case 'computeWallUnion': {
        const startTime = performance.now();
        const result = computeWallUnion(e.data.shapes, e.data.joins);
        const duration = performance.now() - startTime;
        
        if (duration > 50) {
          console.log(`[Worker] computeWallUnion took ${duration.toFixed(1)}ms for ${e.data.shapes.length} shapes`);
        }
        
        self.postMessage({ 
          type: 'wallUnionResult', 
          id, 
          result 
        } as GeometryWorkerResponse);
        break;
      }
      
      case 'computeBoth': {
        const startTime = performance.now();
        
        // First compute joins
        const joins = computeWallJoins(e.data.shapes);
        const joinsTime = performance.now() - startTime;
        
        // Then compute union using those joins
        const union = computeWallUnion(e.data.shapes, joins);
        const totalTime = performance.now() - startTime;
        
        if (totalTime > 50) {
          console.log(`[Worker] computeBoth took ${totalTime.toFixed(1)}ms (joins: ${joinsTime.toFixed(1)}ms) for ${e.data.shapes.length} shapes`);
        }
        
        self.postMessage({ 
          type: 'bothResult', 
          id, 
          joins, 
          union 
        } as GeometryWorkerResponse);
        break;
      }
      
      default:
        console.warn('[Worker] Unknown message type:', type);
    }
  } catch (error) {
    console.error('[Worker] Error processing request:', error);
    
    self.postMessage({ 
      type: 'error', 
      id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    } as GeometryWorkerResponse);
  }
};

/**
 * Handle worker errors
 */
self.onerror = (error) => {
  console.error('[Worker] Global error:', error);
};

// Log when worker starts
console.log('[Geometry Worker] Initialized');

