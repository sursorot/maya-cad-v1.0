/**
 * Cache Types
 * 
 * Type definitions for the caching system.
 */

/**
 * Configuration for ComputeCache
 */
export interface CacheOptions {
  /** Maximum number of entries in the cache */
  maxSize: number;
  /** Optional time-to-live in milliseconds */
  ttlMs?: number;
  /** Name for debugging/monitoring */
  name?: string;
}

/**
 * Cache entry with metadata
 */
export interface CacheEntry<V> {
  /** Cached value */
  value: V;
  /** Timestamp when entry was created/updated */
  timestamp: number;
  /** Number of times this entry was accessed */
  hits: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Cache name */
  name: string;
  /** Number of entries in cache */
  size: number;
  /** Maximum cache size */
  maxSize: number;
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Hit rate (hits / total requests) */
  hitRate: number;
  /** Number of evictions due to size limit */
  evictions: number;
}

/**
 * Generic cache interface
 */
export interface ICache<K, V> {
  /** Get a value, computing if not present */
  getOrCompute(key: K, compute: () => V): V;
  
  /** Get a value if present */
  get(key: K): V | undefined;
  
  /** Set a value */
  set(key: K, value: V): void;
  
  /** Check if key exists */
  has(key: K): boolean;
  
  /** Delete a specific key */
  delete(key: K): boolean;
  
  /** Invalidate multiple keys */
  invalidate(keys: K[]): void;
  
  /** Clear all entries */
  clear(): void;
  
  /** Get cache statistics */
  getStats(): CacheStats;
}

