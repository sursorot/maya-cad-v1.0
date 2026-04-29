/**
 * Compute Cache
 * 
 * An LRU (Least Recently Used) cache for expensive computations.
 * Automatically evicts oldest entries when capacity is reached.
 * 
 * Features:
 * - LRU eviction policy
 * - Optional TTL (time-to-live)
 * - Hit/miss statistics
 * - Bulk invalidation
 */

import type { CacheOptions, CacheEntry, CacheStats, ICache } from './types';

/**
 * LRU cache for computed values
 */
export class ComputeCache<V> implements ICache<string, V> {
  private cache: Map<string, CacheEntry<V>>;
  private accessOrder: string[];
  private maxSize: number;
  private ttlMs?: number;
  private name: string;
  
  // Statistics
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(options: CacheOptions) {
    this.cache = new Map();
    this.accessOrder = [];
    this.maxSize = options.maxSize;
    this.ttlMs = options.ttlMs;
    this.name = options.name ?? 'unnamed';
  }

  /**
   * Get a cached value or compute and cache it
   */
  getOrCompute(key: string, compute: () => V): V {
    // Check for existing entry
    const existing = this.cache.get(key);
    
    if (existing) {
      // Check TTL
      if (this.isExpired(existing)) {
        this.delete(key);
      } else {
        // Cache hit
        this.hits++;
        existing.hits++;
        this.moveToEnd(key);
        return existing.value;
      }
    }

    // Cache miss - compute value
    this.misses++;
    const value = compute();
    this.set(key, value);
    return value;
  }

  /**
   * Get a value if present (without computing)
   */
  get(key: string): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.delete(key);
      return undefined;
    }

    entry.hits++;
    this.moveToEnd(key);
    return entry.value;
  }

  /**
   * Manually set a cache entry
   */
  set(key: string, value: V): void {
    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evict if at capacity
    while (this.cache.size >= this.maxSize && this.accessOrder.length > 0) {
      const oldest = this.accessOrder.shift()!;
      this.cache.delete(oldest);
      this.evictions++;
    }

    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    });
    this.accessOrder.push(key);
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      this.accessOrder = this.accessOrder.filter(k => k !== key);
    }
    return existed;
  }

  /**
   * Invalidate multiple keys
   */
  invalidate(keys: string[]): void {
    for (const key of keys) {
      this.delete(key);
    }
  }

  /**
   * Invalidate keys matching a predicate
   */
  invalidateMatching(predicate: (key: string) => boolean): number {
    const toDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (predicate(key)) {
        toDelete.push(key);
      }
    }
    
    for (const key of toDelete) {
      this.delete(key);
    }
    
    return toDelete.length;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      name: this.name,
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      evictions: this.evictions,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get the number of entries in the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * Check if an entry has expired
   */
  private isExpired(entry: CacheEntry<V>): boolean {
    if (!this.ttlMs) return false;
    return Date.now() - entry.timestamp > this.ttlMs;
  }

  /**
   * Move a key to the end of the access order (most recently used)
   */
  private moveToEnd(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }
  }
}

/**
 * Create a compute cache with common defaults
 */
export function createComputeCache<V>(
  name: string,
  maxSize: number = 100,
  ttlMs?: number
): ComputeCache<V> {
  return new ComputeCache<V>({ name, maxSize, ttlMs });
}

