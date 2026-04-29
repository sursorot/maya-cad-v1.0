/**
 * Worker Types
 * 
 * Type definitions for Web Worker communication.
 */

import type { Shape } from '@/components/Workspace/types';

/**
 * Base message structure for worker communication
 */
export interface WorkerMessage {
  id: string;
  type: string;
}

/**
 * Geometry worker request types
 */
export type GeometryWorkerRequest =
  | {
      type: 'computeWallJoins';
      id: string;
      shapes: Shape[];
    }
  | {
      type: 'computeWallUnion';
      id: string;
      shapes: Shape[];
      joins: Record<string, WallJoinOverridesData>;
    }
  | {
      type: 'computeBoth';
      id: string;
      shapes: Shape[];
    };

/**
 * Geometry worker response types
 */
export type GeometryWorkerResponse =
  | {
      type: 'wallJoinsResult';
      id: string;
      result: Record<string, WallJoinOverridesData>;
    }
  | {
      type: 'wallUnionResult';
      id: string;
      result: MergedWallGeometryData;
    }
  | {
      type: 'bothResult';
      id: string;
      joins: Record<string, WallJoinOverridesData>;
      union: MergedWallGeometryData;
    }
  | {
      type: 'error';
      id: string;
      error: string;
    };

/**
 * Serializable wall join overrides (for worker transfer)
 */
export interface WallJoinOverridesData {
  startCapOverride?: Array<{ x: number; y: number }>;
  endCapOverride?: Array<{ x: number; y: number }>;
  startJoinType?: 'miter' | 'bevel' | 'tee' | 'cross' | 'none';
  endJoinType?: 'miter' | 'bevel' | 'tee' | 'cross' | 'none';
}

/**
 * Serializable merged wall geometry (for worker transfer)
 */
export interface MergedWallGeometryData {
  outerBoundary: Array<Array<{ x: number; y: number }>>;
  holes: Array<Array<{ x: number; y: number }>>;
  success: boolean;
  error?: string;
}

/**
 * Pending worker request
 */
export interface PendingRequest<T> {
  resolve: (result: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * Worker pool options
 */
export interface WorkerPoolOptions {
  /** Maximum number of workers */
  maxWorkers: number;
  /** Timeout for idle workers in ms */
  idleTimeout: number;
  /** Maximum queue size */
  maxQueueSize: number;
  /** Name for debugging */
  name: string;
}

/**
 * Worker status
 */
export type WorkerStatus = 'idle' | 'busy' | 'terminated';

/**
 * Worker instance info
 */
export interface WorkerInstance {
  worker: Worker;
  status: WorkerStatus;
  lastUsed: number;
}

