/**
 * Spatial Index Types
 * 
 * Type definitions for spatial indexing data structures.
 */

/**
 * Axis-aligned bounding box for spatial queries
 */
export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * 2D Point
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Item that can be indexed spatially
 */
export interface SpatialItem {
  id: string;
}

/**
 * Configuration for GridIndex
 */
export interface GridIndexOptions {
  /** Size of each grid cell in world units (default: 1.0) */
  cellSize: number;
  /** Initial capacity hint for optimization (optional) */
  initialCapacity?: number;
}

/**
 * Statistics about the spatial index
 */
export interface SpatialIndexStats {
  /** Total number of items in the index */
  itemCount: number;
  /** Number of occupied cells */
  cellCount: number;
  /** Average items per cell */
  avgItemsPerCell: number;
  /** Maximum items in any single cell */
  maxItemsPerCell: number;
}

/**
 * Generic spatial index interface
 */
export interface ISpatialIndex<T extends SpatialItem> {
  /** Insert an item with its bounding box */
  insert(item: T, bounds: BoundingBox): void;
  
  /** Remove an item by ID */
  remove(itemId: string): boolean;
  
  /** Update an item's position */
  update(item: T, newBounds: BoundingBox): void;
  
  /** Query items that may intersect with bounds */
  query(bounds: BoundingBox): T[];
  
  /** Query items within radius of a point */
  queryRadius(point: Point2D, radius: number): T[];
  
  /** Query the single nearest item to a point */
  queryNearest(point: Point2D, maxDistance?: number): T | null;
  
  /** Clear all items from the index */
  clear(): void;
  
  /** Get statistics about the index */
  getStats(): SpatialIndexStats;
}

