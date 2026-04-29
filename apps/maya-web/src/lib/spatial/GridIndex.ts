/**
 * Grid-Based Spatial Index
 * 
 * A fast spatial index using a uniform grid for O(1) average-case queries.
 * Ideal for CAD applications where items are distributed across a workspace.
 * 
 * Performance characteristics:
 * - Insert: O(cells covered by item)
 * - Remove: O(cells covered by item)
 * - Query: O(cells in query region + items found)
 * - Memory: O(n × average cells per item)
 */

import type { 
  BoundingBox, 
  Point2D, 
  SpatialItem, 
  GridIndexOptions, 
  SpatialIndexStats,
  ISpatialIndex 
} from './types';

/**
 * Default configuration values
 */
const DEFAULT_CELL_SIZE = 1.0; // 1 meter cells work well for architectural scale

/**
 * Grid-based spatial index for fast spatial queries
 */
export class GridIndex<T extends SpatialItem> implements ISpatialIndex<T> {
  /** Map of cell key → Set of items in that cell */
  private cells: Map<string, Set<T>>;
  
  /** Map of item ID → Set of cell keys containing that item */
  private itemToCells: Map<string, Set<string>>;
  
  /** Map of item ID → item's bounding box */
  private itemBounds: Map<string, BoundingBox>;
  
  /** Map of item ID → item reference (for retrieval) */
  private items: Map<string, T>;
  
  /** Size of each grid cell */
  private cellSize: number;

  constructor(options?: Partial<GridIndexOptions>) {
    this.cellSize = options?.cellSize ?? DEFAULT_CELL_SIZE;
    this.cells = new Map();
    this.itemToCells = new Map();
    this.itemBounds = new Map();
    this.items = new Map();
  }

  /**
   * Insert an item with its bounding box into the index
   */
  insert(item: T, bounds: BoundingBox): void {
    // Remove existing entry if updating
    if (this.items.has(item.id)) {
      this.remove(item.id);
    }

    // Store item reference and bounds
    this.items.set(item.id, item);
    this.itemBounds.set(item.id, bounds);

    // Get all cells this item overlaps
    const cellKeys = this.getCellKeys(bounds);
    this.itemToCells.set(item.id, new Set(cellKeys));

    // Add item to each overlapping cell
    for (const key of cellKeys) {
      let cell = this.cells.get(key);
      if (!cell) {
        cell = new Set();
        this.cells.set(key, cell);
      }
      cell.add(item);
    }
  }

  /**
   * Remove an item from the index by ID
   */
  remove(itemId: string): boolean {
    const cellKeys = this.itemToCells.get(itemId);
    if (!cellKeys) {
      return false;
    }

    const item = this.items.get(itemId);
    if (!item) {
      return false;
    }

    // Remove from all cells
    for (const key of cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.delete(item);
        // Clean up empty cells
        if (cell.size === 0) {
          this.cells.delete(key);
        }
      }
    }

    // Clean up item tracking
    this.itemToCells.delete(itemId);
    this.itemBounds.delete(itemId);
    this.items.delete(itemId);

    return true;
  }

  /**
   * Update an item's position in the index
   */
  update(item: T, newBounds: BoundingBox): void {
    const oldBounds = this.itemBounds.get(item.id);
    
    // If bounds haven't changed significantly, skip update
    if (oldBounds && this.boundsEqual(oldBounds, newBounds)) {
      return;
    }

    // Re-insert with new bounds
    this.insert(item, newBounds);
  }

  /**
   * Query all items that may intersect with the given bounds
   */
  query(bounds: BoundingBox): T[] {
    const cellKeys = this.getCellKeys(bounds);
    const seen = new Set<string>();
    const results: T[] = [];

    for (const key of cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        for (const item of cell) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            // Verify actual bounds intersection
            const itemBounds = this.itemBounds.get(item.id);
            if (itemBounds && this.boundsIntersect(bounds, itemBounds)) {
              results.push(item);
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Query items within a radius of a point
   */
  queryRadius(point: Point2D, radius: number): T[] {
    // Create bounding box for the radius query
    const bounds: BoundingBox = {
      minX: point.x - radius,
      maxX: point.x + radius,
      minY: point.y - radius,
      maxY: point.y + radius,
    };

    // Get candidates from grid
    const candidates = this.query(bounds);

    // Filter to items actually within radius
    // Note: This checks if item bounds intersect the circle, not exact distance
    // For more precision, caller should do additional filtering
    return candidates.filter(item => {
      const itemBounds = this.itemBounds.get(item.id);
      if (!itemBounds) return false;
      return this.boundsIntersectCircle(itemBounds, point, radius);
    });
  }

  /**
   * Query the single nearest item to a point
   */
  queryNearest(point: Point2D, maxDistance: number = Infinity): T | null {
    // Start with small radius and expand
    let searchRadius = Math.min(this.cellSize * 2, maxDistance);
    let candidates: T[] = [];

    while (searchRadius <= maxDistance) {
      candidates = this.queryRadius(point, searchRadius);
      
      if (candidates.length > 0) {
        // Find actual nearest by computing distances to bounds
        let nearest: T | null = null;
        let nearestDist = Infinity;

        for (const item of candidates) {
          const bounds = this.itemBounds.get(item.id);
          if (bounds) {
            const dist = this.distanceToBounds(point, bounds);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = item;
            }
          }
        }

        if (nearest && nearestDist <= maxDistance) {
          return nearest;
        }
      }

      // Expand search radius
      searchRadius *= 2;
    }

    return null;
  }

  /**
   * Check if an item exists in the index
   */
  has(itemId: string): boolean {
    return this.items.has(itemId);
  }

  /**
   * Get an item by ID
   */
  get(itemId: string): T | undefined {
    return this.items.get(itemId);
  }

  /**
   * Get the bounds of an item
   */
  getBounds(itemId: string): BoundingBox | undefined {
    return this.itemBounds.get(itemId);
  }

  /**
   * Clear all items from the index
   */
  clear(): void {
    this.cells.clear();
    this.itemToCells.clear();
    this.itemBounds.clear();
    this.items.clear();
  }

  /**
   * Get the total number of items in the index
   */
  get size(): number {
    return this.items.size;
  }

  /**
   * Get statistics about the index
   */
  getStats(): SpatialIndexStats {
    let maxItems = 0;
    let totalItems = 0;

    for (const cell of this.cells.values()) {
      totalItems += cell.size;
      maxItems = Math.max(maxItems, cell.size);
    }

    const cellCount = this.cells.size;

    return {
      itemCount: this.items.size,
      cellCount,
      avgItemsPerCell: cellCount > 0 ? totalItems / cellCount : 0,
      maxItemsPerCell: maxItems,
    };
  }

  /**
   * Iterate over all items in the index
   */
  [Symbol.iterator](): Iterator<T> {
    return this.items.values();
  }

  /**
   * Get all items as an array
   */
  toArray(): T[] {
    return Array.from(this.items.values());
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * Get all cell keys that a bounding box overlaps
   */
  private getCellKeys(bounds: BoundingBox): string[] {
    const keys: string[] = [];
    const minCellX = Math.floor(bounds.minX / this.cellSize);
    const maxCellX = Math.floor(bounds.maxX / this.cellSize);
    const minCellY = Math.floor(bounds.minY / this.cellSize);
    const maxCellY = Math.floor(bounds.maxY / this.cellSize);

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        keys.push(`${x}:${y}`);
      }
    }

    return keys;
  }

  /**
   * Check if two bounding boxes intersect
   */
  private boundsIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return !(
      a.maxX < b.minX ||
      a.minX > b.maxX ||
      a.maxY < b.minY ||
      a.minY > b.maxY
    );
  }

  /**
   * Check if two bounding boxes are equal (within epsilon)
   */
  private boundsEqual(a: BoundingBox, b: BoundingBox, epsilon: number = 0.0001): boolean {
    return (
      Math.abs(a.minX - b.minX) < epsilon &&
      Math.abs(a.maxX - b.maxX) < epsilon &&
      Math.abs(a.minY - b.minY) < epsilon &&
      Math.abs(a.maxY - b.maxY) < epsilon
    );
  }

  /**
   * Check if a bounding box intersects a circle
   */
  private boundsIntersectCircle(bounds: BoundingBox, center: Point2D, radius: number): boolean {
    // Find the closest point on the bounds to the circle center
    const closestX = Math.max(bounds.minX, Math.min(center.x, bounds.maxX));
    const closestY = Math.max(bounds.minY, Math.min(center.y, bounds.maxY));
    
    // Check if that point is within the circle
    const dx = center.x - closestX;
    const dy = center.y - closestY;
    return (dx * dx + dy * dy) <= (radius * radius);
  }

  /**
   * Calculate minimum distance from a point to a bounding box
   */
  private distanceToBounds(point: Point2D, bounds: BoundingBox): number {
    const closestX = Math.max(bounds.minX, Math.min(point.x, bounds.maxX));
    const closestY = Math.max(bounds.minY, Math.min(point.y, bounds.maxY));
    
    const dx = point.x - closestX;
    const dy = point.y - closestY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

/**
 * Create a GridIndex with default settings optimized for architectural CAD
 */
export function createSpatialIndex<T extends SpatialItem>(
  cellSize: number = DEFAULT_CELL_SIZE
): GridIndex<T> {
  return new GridIndex<T>({ cellSize });
}

