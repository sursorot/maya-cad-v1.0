/**
 * Bounding Box Utilities
 * 
 * Functions for computing and manipulating bounding boxes for shapes.
 * Used by spatial indexing and viewport culling.
 */

import type { Shape, Point, WallShape } from '@/components/Workspace/types';
import type { BoundingBox } from '../spatial/types';

/**
 * Compute bounding box for a single point
 */
export function pointBounds(point: Point): BoundingBox {
  return {
    minX: point.x,
    maxX: point.x,
    minY: point.y,
    maxY: point.y,
  };
}

/**
 * Compute bounding box for an array of points
 */
export function pointsBounds(points: Point[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Expand bounding box by a margin
 */
export function expandBounds(bounds: BoundingBox, margin: number): BoundingBox {
  return {
    minX: bounds.minX - margin,
    maxX: bounds.maxX + margin,
    minY: bounds.minY - margin,
    maxY: bounds.maxY + margin,
  };
}

/**
 * Merge multiple bounding boxes
 */
export function mergeBounds(...boxes: BoundingBox[]): BoundingBox {
  if (boxes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  return boxes.reduce((merged, box) => ({
    minX: Math.min(merged.minX, box.minX),
    maxX: Math.max(merged.maxX, box.maxX),
    minY: Math.min(merged.minY, box.minY),
    maxY: Math.max(merged.maxY, box.maxY),
  }));
}

/**
 * Compute bounding box for a shape
 */
export function getShapeBounds(shape: Shape): BoundingBox {
  switch (shape.type) {
    case 'line':
      return pointsBounds([shape.start, shape.end]);

    case 'polyline':
    case 'curve':
      return pointsBounds(shape.points);

    case 'arc':
      // For arc, include the control point to ensure bounds contain the curve
      return expandBounds(
        pointsBounds([shape.start, shape.end, shape.controlPoint]),
        shape.strokeWidth / 2
      );

    case 'circle':
      return {
        minX: shape.center.x - shape.radius,
        maxX: shape.center.x + shape.radius,
        minY: shape.center.y - shape.radius,
        maxY: shape.center.y + shape.radius,
      };

    case 'rectangle':
      return pointsBounds([shape.start, shape.end]);

    case 'wall': {
      const wall = shape as WallShape;
      const lineBounds = pointsBounds(wall.centerline);
      // Expand by half the wall thickness
      return expandBounds(lineBounds, wall.thickness / 2);
    }

    case 'room':
    case 'zone':
      return pointsBounds(shape.points);

    case 'opening': {
      // Opening bounds based on anchor, width, and direction
      const halfWidth = shape.width / 2;
      const dirLen = Math.sqrt(shape.direction.x ** 2 + shape.direction.y ** 2);
      if (dirLen === 0) {
        return pointBounds(shape.anchor);
      }
      
      const dirNorm = {
        x: shape.direction.x / dirLen,
        y: shape.direction.y / dirLen,
      };
      
      const corner1 = {
        x: shape.anchor.x + dirNorm.x * halfWidth,
        y: shape.anchor.y + dirNorm.y * halfWidth,
      };
      const corner2 = {
        x: shape.anchor.x - dirNorm.x * halfWidth,
        y: shape.anchor.y - dirNorm.y * halfWidth,
      };
      
      // Add swing arc extent
      const swingExtent = shape.swing.operation !== 'fixed' ? shape.width : 0;
      return expandBounds(pointsBounds([corner1, corner2]), swingExtent);
    }

    case 'marker':
      // Small bounds around marker position
      return expandBounds(pointBounds(shape.position), 0.1);

    case 'guideline':
      if (shape.orientation === 'freeform' && shape.start && shape.end) {
        return pointsBounds([shape.start, shape.end]);
      } else if (shape.position !== undefined) {
        // Infinite guideline - use large bounds
        const INF = 1e6;
        if (shape.orientation === 'horizontal') {
          return { minX: -INF, maxX: INF, minY: shape.position, maxY: shape.position };
        } else {
          return { minX: shape.position, maxX: shape.position, minY: -INF, maxY: INF };
        }
      }
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

    case 'dimension':
      // Include offset in bounds
      const lineBounds = pointsBounds([shape.start, shape.end]);
      return expandBounds(lineBounds, Math.abs(shape.offset) + 0.5);

    case 'text':
      // Approximate text bounds (actual bounds would need font metrics)
      const fontSize = shape.fontSize || 0.5;
      const approxWidth = shape.content.length * fontSize * 0.6;
      return {
        minX: shape.position.x,
        maxX: shape.position.x + approxWidth,
        minY: shape.position.y - fontSize,
        maxY: shape.position.y + fontSize,
      };

    default:
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
}

/**
 * Check if two bounding boxes intersect
 */
export function boundsIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
}

/**
 * Check if a point is inside a bounding box
 */
export function pointInBounds(point: Point, bounds: BoundingBox): boolean {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

/**
 * Get the center of a bounding box
 */
export function boundsCenter(bounds: BoundingBox): Point {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

/**
 * Get the dimensions of a bounding box
 */
export function boundsSize(bounds: BoundingBox): { width: number; height: number } {
  return {
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

/**
 * Get the area of a bounding box
 */
export function boundsArea(bounds: BoundingBox): number {
  return (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
}

