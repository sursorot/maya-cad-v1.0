/**
 * Shape Hasher
 * 
 * Fast hashing utilities for shapes and shape collections.
 * Used to create cache keys based on shape content rather than identity.
 */

import type { Shape, WallShape, Point } from '@/components/Workspace/types';

/**
 * DJB2 hash function - fast and has good distribution
 */
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit
}

/**
 * Hash a number with fixed precision
 */
function hashNumber(n: number, precision: number = 4): string {
  return n.toFixed(precision);
}

/**
 * Hash a point
 */
function hashPoint(p: Point): string {
  return `${hashNumber(p.x)},${hashNumber(p.y)}`;
}

/**
 * Hash an array of points
 */
function hashPoints(points: Point[]): string {
  return points.map(hashPoint).join(';');
}

/**
 * Create a hash string for a single shape
 * Captures the essential geometric properties that affect rendering
 */
export function hashShape(shape: Shape): string {
  const parts: string[] = [shape.id, shape.type];

  switch (shape.type) {
    case 'line':
      parts.push(hashPoint(shape.start), hashPoint(shape.end));
      break;

    case 'polyline':
    case 'curve':
      parts.push(hashPoints(shape.points));
      break;

    case 'arc':
      parts.push(
        hashPoint(shape.start),
        hashPoint(shape.end),
        hashPoint(shape.controlPoint)
      );
      break;

    case 'circle':
      parts.push(hashPoint(shape.center), hashNumber(shape.radius));
      break;

    case 'rectangle':
      parts.push(hashPoint(shape.start), hashPoint(shape.end));
      break;

    case 'wall': {
      const wall = shape as WallShape;
      parts.push(
        hashPoints(wall.centerline),
        hashNumber(wall.thickness),
        wall.alignment || 'center'
      );
      if (wall.controlPoint) {
        parts.push(hashPoint(wall.controlPoint));
      }
      break;
    }

    case 'room':
      parts.push(hashPoints(shape.points));
      if (shape.wallIds) {
        parts.push(shape.wallIds.sort().join(','));
      }
      break;

    case 'zone':
      parts.push(hashPoints(shape.points));
      break;

    case 'opening':
      parts.push(
        hashPoint(shape.anchor),
        hashPoint(shape.direction),
        hashPoint(shape.normal),
        hashNumber(shape.width),
        shape.category
      );
      if (shape.host) {
        parts.push(shape.host.wallId, hashNumber(shape.host.normalizedPosition));
      }
      break;

    case 'marker':
      parts.push(hashPoint(shape.position));
      break;

    case 'guideline':
      if (shape.orientation === 'freeform' && shape.start && shape.end) {
        parts.push(hashPoint(shape.start), hashPoint(shape.end));
      } else if (shape.position !== undefined) {
        parts.push(shape.orientation, hashNumber(shape.position));
      }
      break;

    case 'dimension':
      parts.push(
        hashPoint(shape.start),
        hashPoint(shape.end),
        hashNumber(shape.offset)
      );
      break;

    case 'text':
      parts.push(
        hashPoint(shape.position),
        shape.content,
        hashNumber(shape.fontSize)
      );
      break;
  }

  return parts.join('|');
}

/**
 * Create a combined hash for multiple shapes
 */
export function hashShapes(shapes: Shape[]): string {
  if (shapes.length === 0) return 'empty';
  
  // Sort by ID for consistent hashing regardless of order
  const sortedHashes = shapes
    .map(hashShape)
    .sort()
    .join('\n');
  
  return djb2Hash(sortedHashes).toString(36);
}

/**
 * Create a hash for walls only
 */
export function hashWalls(shapes: Shape[]): string {
  const walls = shapes.filter((s): s is WallShape => s.type === 'wall');
  return hashShapes(walls);
}

/**
 * Create a hash for a subset of shapes by IDs
 */
export function hashShapesByIds(shapes: Shape[], ids: string[]): string {
  const idSet = new Set(ids);
  const subset = shapes.filter(s => idSet.has(s.id));
  return hashShapes(subset);
}

/**
 * Create a cache key combining multiple factors
 */
export function createCacheKey(...parts: (string | number | boolean)[]): string {
  return parts.map(String).join(':');
}

/**
 * Compute a hash for any serializable value
 */
export function hashValue(value: unknown): string {
  return djb2Hash(JSON.stringify(value)).toString(36);
}

