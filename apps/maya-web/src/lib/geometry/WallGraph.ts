/**
 * Wall Graph
 * 
 * A graph data structure that tracks wall connections for incremental updates.
 * When a wall changes, only the affected walls need to be recalculated.
 * 
 * Performance characteristics:
 * - Add wall: O(k) where k = connected walls
 * - Remove wall: O(k) where k = connected walls  
 * - Find affected walls: O(1) lookup
 * - Full rebuild: O(n²) worst case, O(n × avg_connections) typical
 */

import type { Point, WallShape, Shape } from '@/components/Workspace/types';
import type { 
  WallEndpoint, 
  WallGraphNode, 
  WallGraphChange, 
  WallGraphStats,
  WallJoinOverrides
} from './types';
import { ComputeCache } from '../cache/ComputeCache';

/**
 * Precision for point comparison (in meters)
 * Points within this distance are considered the same
 */
const POINT_EPSILON = 0.001; // 1mm

/**
 * Hash precision for point indexing
 */
const HASH_PRECISION = 1000; // 1mm precision

/**
 * Graph structure for tracking wall connections
 */
export class WallGraph {
  /** Wall nodes indexed by ID */
  private nodes: Map<string, WallGraphNode> = new Map();
  
  /** Point hash → Wall endpoints at that location */
  private endpointIndex: Map<string, WallEndpoint[]> = new Map();
  
  /** Cache for computed joins */
  private joinCache: ComputeCache<WallJoinOverrides>;
  
  /** Change listeners */
  private listeners: Set<(change: WallGraphChange) => void> = new Set();

  constructor() {
    this.joinCache = new ComputeCache({
      name: 'wall-joins',
      maxSize: 500,
      ttlMs: undefined, // No expiration, explicitly invalidated
    });
  }

  /**
   * Hash a point for indexing
   */
  private hashPoint(point: Point): string {
    const x = Math.round(point.x * HASH_PRECISION);
    const y = Math.round(point.y * HASH_PRECISION);
    return `${x}:${y}`;
  }

  /**
   * Get the start and end points of a wall
   */
  private getWallEndpoints(wall: WallShape): { start: Point; end: Point } | null {
    if (!wall.centerline || wall.centerline.length < 2) {
      return null;
    }
    return {
      start: wall.centerline[0],
      end: wall.centerline[wall.centerline.length - 1],
    };
  }

  /**
   * Check if two points are approximately equal
   */
  private pointsEqual(a: Point, b: Point): boolean {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy) < POINT_EPSILON;
  }

  /**
   * Add a wall to the graph
   * @returns Set of affected wall IDs that need recalculation
   */
  addWall(wall: WallShape): Set<string> {
    const endpoints = this.getWallEndpoints(wall);
    if (!endpoints) {
      return new Set();
    }

    // Remove if already exists (update case)
    if (this.nodes.has(wall.id)) {
      this.removeWall(wall.id);
    }

    const affected = new Set<string>([wall.id]);
    const node: WallGraphNode = {
      wall,
      startConnections: new Set(),
      endConnections: new Set(),
      startPoint: endpoints.start,
      endPoint: endpoints.end,
    };

    // Index the wall
    this.nodes.set(wall.id, node);

    // Process start endpoint
    const startHash = this.hashPoint(endpoints.start);
    const startEndpoints = this.endpointIndex.get(startHash) || [];
    
    for (const existing of startEndpoints) {
      if (existing.wallId !== wall.id) {
        // Create bidirectional connection
        node.startConnections.add(existing.wallId);
        const otherNode = this.nodes.get(existing.wallId);
        if (otherNode) {
          if (existing.endpoint === 'start') {
            otherNode.startConnections.add(wall.id);
          } else {
            otherNode.endConnections.add(wall.id);
          }
        }
        affected.add(existing.wallId);
      }
    }
    
    startEndpoints.push({ wallId: wall.id, endpoint: 'start', point: endpoints.start });
    this.endpointIndex.set(startHash, startEndpoints);

    // Process end endpoint
    const endHash = this.hashPoint(endpoints.end);
    const endEndpoints = this.endpointIndex.get(endHash) || [];
    
    for (const existing of endEndpoints) {
      if (existing.wallId !== wall.id) {
        // Create bidirectional connection
        node.endConnections.add(existing.wallId);
        const otherNode = this.nodes.get(existing.wallId);
        if (otherNode) {
          if (existing.endpoint === 'start') {
            otherNode.startConnections.add(wall.id);
          } else {
            otherNode.endConnections.add(wall.id);
          }
        }
        affected.add(existing.wallId);
      }
    }
    
    endEndpoints.push({ wallId: wall.id, endpoint: 'end', point: endpoints.end });
    this.endpointIndex.set(endHash, endEndpoints);

    // Invalidate caches for affected walls
    this.invalidateCaches(affected);

    // Notify listeners
    this.notifyListeners({
      type: 'add',
      wallId: wall.id,
      affectedWallIds: Array.from(affected),
    });

    return affected;
  }

  /**
   * Remove a wall from the graph
   * @returns Set of affected wall IDs that need recalculation
   */
  removeWall(wallId: string): Set<string> {
    const node = this.nodes.get(wallId);
    if (!node) {
      return new Set();
    }

    const affected = new Set<string>();

    // Collect all connected walls
    for (const connectedId of node.startConnections) {
      affected.add(connectedId);
    }
    for (const connectedId of node.endConnections) {
      affected.add(connectedId);
    }

    // Remove from endpoint index
    const startHash = this.hashPoint(node.startPoint);
    const endHash = this.hashPoint(node.endPoint);

    const startEndpoints = this.endpointIndex.get(startHash);
    if (startEndpoints) {
      const filtered = startEndpoints.filter(ep => ep.wallId !== wallId);
      if (filtered.length === 0) {
        this.endpointIndex.delete(startHash);
      } else {
        this.endpointIndex.set(startHash, filtered);
      }
    }

    const endEndpoints = this.endpointIndex.get(endHash);
    if (endEndpoints) {
      const filtered = endEndpoints.filter(ep => ep.wallId !== wallId);
      if (filtered.length === 0) {
        this.endpointIndex.delete(endHash);
      } else {
        this.endpointIndex.set(endHash, filtered);
      }
    }

    // Remove connections from other walls
    for (const connectedId of node.startConnections) {
      const otherNode = this.nodes.get(connectedId);
      if (otherNode) {
        otherNode.startConnections.delete(wallId);
        otherNode.endConnections.delete(wallId);
      }
    }
    for (const connectedId of node.endConnections) {
      const otherNode = this.nodes.get(connectedId);
      if (otherNode) {
        otherNode.startConnections.delete(wallId);
        otherNode.endConnections.delete(wallId);
      }
    }

    // Remove the node
    this.nodes.delete(wallId);

    // Invalidate caches
    affected.add(wallId);
    this.invalidateCaches(affected);

    // Notify listeners
    this.notifyListeners({
      type: 'remove',
      wallId,
      affectedWallIds: Array.from(affected),
    });

    return affected;
  }

  /**
   * Update a wall (efficient remove + add)
   * @returns Set of affected wall IDs
   */
  updateWall(wall: WallShape): Set<string> {
    // Check if wall position actually changed
    const existingNode = this.nodes.get(wall.id);
    if (existingNode) {
      const newEndpoints = this.getWallEndpoints(wall);
      if (newEndpoints &&
          this.pointsEqual(existingNode.startPoint, newEndpoints.start) &&
          this.pointsEqual(existingNode.endPoint, newEndpoints.end)) {
        // Position unchanged, just update the wall reference
        existingNode.wall = wall;
        return new Set([wall.id]);
      }
    }

    const removeAffected = this.removeWall(wall.id);
    const addAffected = this.addWall(wall);
    
    const combined = new Set([...removeAffected, ...addAffected]);
    
    // Notify with update type
    this.notifyListeners({
      type: 'update',
      wallId: wall.id,
      affectedWallIds: Array.from(combined),
    });

    return combined;
  }

  /**
   * Get all walls connected to the given wall
   */
  getConnectedWalls(wallId: string): string[] {
    const node = this.nodes.get(wallId);
    if (!node) {
      return [];
    }
    
    return [
      ...Array.from(node.startConnections),
      ...Array.from(node.endConnections),
    ];
  }

  /**
   * Get walls connected at a specific endpoint
   */
  getConnectionsAtEndpoint(wallId: string, endpoint: 'start' | 'end'): string[] {
    const node = this.nodes.get(wallId);
    if (!node) {
      return [];
    }
    
    const connections = endpoint === 'start' 
      ? node.startConnections 
      : node.endConnections;
    
    return Array.from(connections);
  }

  /**
   * Get all walls that share a point
   */
  getWallsAtPoint(point: Point): string[] {
    const hash = this.hashPoint(point);
    const endpoints = this.endpointIndex.get(hash);
    
    if (!endpoints) {
      return [];
    }
    
    return endpoints.map(ep => ep.wallId);
  }

  /**
   * Get a wall by ID
   */
  getWall(wallId: string): WallShape | undefined {
    return this.nodes.get(wallId)?.wall;
  }

  /**
   * Check if a wall exists in the graph
   */
  hasWall(wallId: string): boolean {
    return this.nodes.has(wallId);
  }

  /**
   * Get all wall IDs in the graph
   */
  getAllWallIds(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get all walls in the graph
   */
  getAllWalls(): WallShape[] {
    return Array.from(this.nodes.values()).map(n => n.wall);
  }

  /**
   * Get cached join overrides for a wall
   */
  getCachedJoins(wallId: string): WallJoinOverrides | undefined {
    return this.joinCache.get(wallId);
  }

  /**
   * Set cached join overrides for a wall
   */
  setCachedJoins(wallId: string, joins: WallJoinOverrides): void {
    this.joinCache.set(wallId, joins);
  }

  /**
   * Rebuild the entire graph from a shapes array
   */
  rebuild(shapes: Shape[]): void {
    // Clear everything
    this.nodes.clear();
    this.endpointIndex.clear();
    this.joinCache.clear();

    // Add all walls
    const walls = shapes.filter((s): s is WallShape => s.type === 'wall');
    for (const wall of walls) {
      // Directly add without triggering change notifications
      const endpoints = this.getWallEndpoints(wall);
      if (!endpoints) continue;

      const node: WallGraphNode = {
        wall,
        startConnections: new Set(),
        endConnections: new Set(),
        startPoint: endpoints.start,
        endPoint: endpoints.end,
      };

      this.nodes.set(wall.id, node);

      // Index start endpoint
      const startHash = this.hashPoint(endpoints.start);
      if (!this.endpointIndex.has(startHash)) {
        this.endpointIndex.set(startHash, []);
      }
      this.endpointIndex.get(startHash)!.push({
        wallId: wall.id,
        endpoint: 'start',
        point: endpoints.start,
      });

      // Index end endpoint
      const endHash = this.hashPoint(endpoints.end);
      if (!this.endpointIndex.has(endHash)) {
        this.endpointIndex.set(endHash, []);
      }
      this.endpointIndex.get(endHash)!.push({
        wallId: wall.id,
        endpoint: 'end',
        point: endpoints.end,
      });
    }

    // Build connections
    for (const [_hash, endpoints] of this.endpointIndex) {
      if (endpoints.length > 1) {
        // Multiple walls share this point - connect them
        for (let i = 0; i < endpoints.length; i++) {
          for (let j = i + 1; j < endpoints.length; j++) {
            const ep1 = endpoints[i];
            const ep2 = endpoints[j];
            
            const node1 = this.nodes.get(ep1.wallId);
            const node2 = this.nodes.get(ep2.wallId);
            
            if (node1 && node2) {
              if (ep1.endpoint === 'start') {
                node1.startConnections.add(ep2.wallId);
              } else {
                node1.endConnections.add(ep2.wallId);
              }
              
              if (ep2.endpoint === 'start') {
                node2.startConnections.add(ep1.wallId);
              } else {
                node2.endConnections.add(ep1.wallId);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Synchronize the graph with a shapes array
   * More efficient than rebuild when few changes occurred
   */
  sync(shapes: Shape[]): Set<string> {
    const walls = shapes.filter((s): s is WallShape => s.type === 'wall');
    const newWallIds = new Set(walls.map(w => w.id));
    const existingWallIds = new Set(this.nodes.keys());
    const affected = new Set<string>();

    // Remove walls that no longer exist
    for (const existingId of existingWallIds) {
      if (!newWallIds.has(existingId)) {
        const removeAffected = this.removeWall(existingId);
        for (const id of removeAffected) {
          affected.add(id);
        }
      }
    }

    // Add or update walls
    for (const wall of walls) {
      if (!this.nodes.has(wall.id)) {
        // New wall
        const addAffected = this.addWall(wall);
        for (const id of addAffected) {
          affected.add(id);
        }
      } else {
        // Check if wall changed
        const existingNode = this.nodes.get(wall.id)!;
        const newEndpoints = this.getWallEndpoints(wall);
        
        if (newEndpoints && (
          !this.pointsEqual(existingNode.startPoint, newEndpoints.start) ||
          !this.pointsEqual(existingNode.endPoint, newEndpoints.end) ||
          existingNode.wall.thickness !== wall.thickness
        )) {
          const updateAffected = this.updateWall(wall);
          for (const id of updateAffected) {
            affected.add(id);
          }
        } else {
          // Just update the wall reference
          existingNode.wall = wall;
        }
      }
    }

    return affected;
  }

  /**
   * Get statistics about the graph
   */
  getStats(): WallGraphStats {
    let connectionCount = 0;
    let isolatedWalls = 0;
    const junctionPoints = new Set<string>();

    for (const node of this.nodes.values()) {
      const totalConnections = node.startConnections.size + node.endConnections.size;
      connectionCount += totalConnections;
      
      if (totalConnections === 0) {
        isolatedWalls++;
      }
    }

    // Count junction points (3+ walls meeting)
    for (const [hash, endpoints] of this.endpointIndex) {
      if (endpoints.length >= 3) {
        junctionPoints.add(hash);
      }
    }

    return {
      wallCount: this.nodes.size,
      connectionCount: connectionCount / 2, // Each connection counted twice
      isolatedWalls,
      junctionCount: junctionPoints.size,
    };
  }

  /**
   * Subscribe to graph changes
   */
  subscribe(listener: (change: WallGraphChange) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Clear the entire graph
   */
  clear(): void {
    this.nodes.clear();
    this.endpointIndex.clear();
    this.joinCache.clear();
    this.listeners.clear();
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * Invalidate caches for affected walls
   */
  private invalidateCaches(wallIds: Set<string>): void {
    for (const wallId of wallIds) {
      this.joinCache.delete(wallId);
    }
  }

  /**
   * Notify all listeners of a change
   */
  private notifyListeners(change: WallGraphChange): void {
    for (const listener of this.listeners) {
      try {
        listener(change);
      } catch (e) {
        console.error('WallGraph listener error:', e);
      }
    }
  }
}

/**
 * Create a new WallGraph instance
 */
export function createWallGraph(): WallGraph {
  return new WallGraph();
}

