/**
 * Geometry Types
 * 
 * Type definitions for the geometry computation system.
 */

import type { Point, WallShape } from '@/components/Workspace/types';

/**
 * Wall endpoint classification
 */
export interface WallEndpoint {
  wallId: string;
  endpoint: 'start' | 'end';
  point: Point;
}

/**
 * Wall connection information
 */
export interface WallConnection {
  wallId: string;
  endpoint: 'start' | 'end';
  connectedTo: WallEndpoint[];
  angle: number; // Angle of wall at this endpoint in radians
}

/**
 * Join type for wall connections
 */
export type WallJoinType = 'miter' | 'bevel' | 'tee' | 'cross' | 'none';

/**
 * Override geometry for wall endpoints (computed joins)
 */
export interface WallJoinOverrides {
  startCapOverride?: Point[];
  endCapOverride?: Point[];
  startJoinType?: WallJoinType;
  endJoinType?: WallJoinType;
}

/**
 * Merged wall geometry result
 */
export interface MergedWallGeometry {
  /** Outer boundary of merged walls */
  outerBoundary: Point[][];
  /** Inner holes (if any) */
  holes: Point[][];
  /** Indicates if union computation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Wall graph node
 */
export interface WallGraphNode {
  wall: WallShape;
  startConnections: Set<string>; // Wall IDs connected at start
  endConnections: Set<string>;   // Wall IDs connected at end
  startPoint: Point;
  endPoint: Point;
}

/**
 * Change event for wall graph
 */
export interface WallGraphChange {
  type: 'add' | 'remove' | 'update';
  wallId: string;
  affectedWallIds: string[];
}

/**
 * Wall graph statistics
 */
export interface WallGraphStats {
  wallCount: number;
  connectionCount: number;
  isolatedWalls: number;
  junctionCount: number; // Points where 3+ walls meet
}

/**
 * Bounding box for shapes
 */
export interface ShapeBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

