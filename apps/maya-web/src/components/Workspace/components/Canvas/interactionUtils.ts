/**
 * Interaction Utilities
 * 
 * Helper functions for canvas interaction logic.
 * Extracted from useCanvasInteraction for better organization.
 */

import type { Point, Shape, WallShape, WallAlignment } from '../../types';
import { isPointNear } from '@maya/workspace-domain/workspace/core/utils';
import { getWallPolygonPoints } from '../../utils/walls';
import type { WallJoinOverrides } from '../../utils/walls';

// ============================================================================
// Point/Distance Helpers
// ============================================================================

/**
 * Check if two points are close enough
 */
export const arePointsClose = (p1: Point, p2: Point, threshold: number = 0.001): boolean => {
  return isPointNear(p1, p2, threshold);
};

/**
 * Check if a curve is closed (first and last points are close)
 */
export const isCurveClosed = (points: Point[], threshold: number = 0.001): boolean => {
  if (points.length < 3) return false;
  const first = points[0];
  const last = points[points.length - 1];
  return arePointsClose(first, last, threshold);
};

/**
 * Distance from a point to a line segment
 */
export const distancePointToSegment = (
  point: Point,
  segStart: Point,
  segEnd: Point
): number => {
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // Segment is a point
    return Math.hypot(point.x - segStart.x, point.y - segStart.y);
  }

  // Project point onto the line
  let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = segStart.x + t * dx;
  const projY = segStart.y + t * dy;

  return Math.hypot(point.x - projX, point.y - projY);
};

// ============================================================================
// Wall Helpers
// ============================================================================

/**
 * Find the closest wall to a given point
 */
export const findClosestWall = (
  point: Point,
  shapes: Shape[]
): WallShape | null => {
  let bestWall: WallShape | null = null;
  let bestDistance = Infinity;

  shapes.forEach((shape) => {
    if (shape.type !== 'wall' || shape.centerline.length < 2) return;
    const distance = distancePointToSegment(
      point,
      shape.centerline[0],
      shape.centerline[shape.centerline.length - 1]
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestWall = shape;
    }
  });

  return bestWall;
};

/**
 * Determine the orientation of walls (horizontal, vertical, diagonal, mixed)
 */
export const getWallsOrientation = (
  walls: WallShape[]
): 'horizontal' | 'vertical' | 'diagonal' | 'mixed' | 'none' => {
  if (walls.length === 0) return 'none';

  const orientations = walls.map((wall) => {
    if (!wall.centerline || wall.centerline.length < 2) return 'diagonal' as const;
    const start = wall.centerline[0];
    const end = wall.centerline[wall.centerline.length - 1];
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    // Wall is considered orthogonal if the angle is within ~5 degrees of horizontal/vertical
    const ratio = Math.min(dx, dy) / Math.max(dx, dy);
    const isOrthogonal = ratio < 0.1;
    if (!isOrthogonal) return 'diagonal' as const;
    return dx >= dy ? 'horizontal' as const : 'vertical' as const;
  });

  const allHorizontal = orientations.every((o) => o === 'horizontal');
  const allVertical = orientations.every((o) => o === 'vertical');

  if (allHorizontal) return 'horizontal';
  if (allVertical) return 'vertical';
  return 'mixed';
};

// ============================================================================
// Polygon/Geometry Helpers
// ============================================================================

/**
 * Check if a point is inside a polygon using ray casting
 */
export const isPointInsidePolygon = (point: Point, polygon: Point[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * Check if two line segments intersect
 */
export const doSegmentsIntersect = (
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point
): boolean => {
  const ccw = (A: Point, B: Point, C: Point): boolean => {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  };
  return ccw(a1, b1, b2) !== ccw(a2, b1, b2) && ccw(a1, a2, b1) !== ccw(a1, a2, b2);
};

// ============================================================================
// Selection Rectangle Helpers
// ============================================================================

export interface SelectionRect {
  start: Point;
  end: Point;
}

/**
 * Check if a shape intersects with a selection rectangle
 */
export const isShapeIntersectingRect = (
  shape: Shape,
  rect: SelectionRect,
  wallJoinOverrides?: Record<string, WallJoinOverrides>
): boolean => {
  const minX = Math.min(rect.start.x, rect.end.x);
  const maxX = Math.max(rect.start.x, rect.end.x);
  const minY = Math.min(rect.start.y, rect.end.y);
  const maxY = Math.max(rect.start.y, rect.end.y);

  const rectCorners: Point[] = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];

  const rectEdges: [Point, Point][] = [
    [rectCorners[0], rectCorners[1]],
    [rectCorners[1], rectCorners[2]],
    [rectCorners[2], rectCorners[3]],
    [rectCorners[3], rectCorners[0]],
  ];

  const isPointInRect = (p: Point): boolean =>
    p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;

  if (shape.type === 'line') {
    if (isPointInRect(shape.start) || isPointInRect(shape.end)) return true;
    return rectEdges.some(([e1, e2]) =>
      doSegmentsIntersect(shape.start, shape.end, e1, e2)
    );
  }

  if (shape.type === 'polyline') {
    if (shape.points.some(isPointInRect)) return true;
    for (let i = 0; i < shape.points.length - 1; i++) {
      const p1 = shape.points[i];
      const p2 = shape.points[i + 1];
      if (rectEdges.some(([e1, e2]) => doSegmentsIntersect(p1, p2, e1, e2))) {
        return true;
      }
    }
    return false;
  }

  if (shape.type === 'circle') {
    const cx = shape.center.x;
    const cy = shape.center.y;
    const r = shape.radius;
    // Check if center is inside rect
    if (isPointInRect(shape.center)) return true;
    // Check if circle intersects any edge
    const closestX = Math.max(minX, Math.min(cx, maxX));
    const closestY = Math.max(minY, Math.min(cy, maxY));
    const distSq = (cx - closestX) ** 2 + (cy - closestY) ** 2;
    return distSq <= r * r;
  }

  if (shape.type === 'rectangle') {
    const rMinX = Math.min(shape.start.x, shape.end.x);
    const rMaxX = Math.max(shape.start.x, shape.end.x);
    const rMinY = Math.min(shape.start.y, shape.end.y);
    const rMaxY = Math.max(shape.start.y, shape.end.y);
    return !(rMaxX < minX || rMinX > maxX || rMaxY < minY || rMinY > maxY);
  }

  if (shape.type === 'wall') {
    const wallPolygon = getWallPolygonPoints(
      shape as WallShape,
      wallJoinOverrides?.[shape.id]
    );
    if (wallPolygon.some(isPointInRect)) return true;
    for (let i = 0; i < wallPolygon.length; i++) {
      const p1 = wallPolygon[i];
      const p2 = wallPolygon[(i + 1) % wallPolygon.length];
      if (rectEdges.some(([e1, e2]) => doSegmentsIntersect(p1, p2, e1, e2))) {
        return true;
      }
    }
    return false;
  }

  if (shape.type === 'room' || shape.type === 'zone') {
    if (shape.points.some(isPointInRect)) return true;
    for (let i = 0; i < shape.points.length; i++) {
      const p1 = shape.points[i];
      const p2 = shape.points[(i + 1) % shape.points.length];
      if (rectEdges.some(([e1, e2]) => doSegmentsIntersect(p1, p2, e1, e2))) {
        return true;
      }
    }
    return false;
  }

  if (shape.type === 'text') {
    const textAnchor =
      shape.textAlign === 'center'
        ? 'middle'
        : shape.textAlign === 'right'
        ? 'end'
        : 'start';
    const estWidth = shape.content.length * shape.fontSize * 0.6;
    const estHeight = shape.fontSize * 1.2;
    const x =
      shape.position.x -
      (textAnchor === 'middle' ? estWidth / 2 : textAnchor === 'end' ? estWidth : 0);
    const y = shape.position.y - shape.fontSize * 0.7;
    return !(
      x + estWidth < minX ||
      x > maxX ||
      y + estHeight < minY ||
      y > maxY
    );
  }

  if (shape.type === 'marker') {
    return isPointInRect(shape.position);
  }

  if (shape.type === 'arc') {
    if (isPointInRect(shape.start) || isPointInRect(shape.end)) return true;
    if (shape.controlPoint && isPointInRect(shape.controlPoint)) return true;
    return false;
  }

  if (shape.type === 'curve') {
    return shape.points.some(isPointInRect);
  }

  if (shape.type === 'guideline') {
    if (shape.start && shape.end) {
      if (isPointInRect(shape.start) || isPointInRect(shape.end)) return true;
      return rectEdges.some(([e1, e2]) =>
        doSegmentsIntersect(shape.start!, shape.end!, e1, e2)
      );
    }
    return false;
  }

  if (shape.type === 'opening') {
    return isPointInRect(shape.anchor);
  }

  if (shape.type === 'dimension') {
    if (isPointInRect(shape.start) || isPointInRect(shape.end)) return true;
    return rectEdges.some(([e1, e2]) =>
      doSegmentsIntersect(shape.start, shape.end, e1, e2)
    );
  }

  return false;
};

// ============================================================================
// Drag Constraint Helpers
// ============================================================================

/**
 * Constrain drag movement for orthogonal walls
 */
export const constrainWallDrag = (
  delta: Point,
  wallsOrientation: 'horizontal' | 'vertical' | 'diagonal' | 'mixed' | 'none',
  dragAxisRef: { current: 'horizontal' | 'vertical' | null }
): Point => {
  const epsilon = 0.001;
  const absX = Math.abs(delta.x);
  const absY = Math.abs(delta.y);

  // Horizontal walls can only move vertically
  if (wallsOrientation === 'horizontal') {
    return { x: 0, y: delta.y };
  }
  // Vertical walls can only move horizontally
  if (wallsOrientation === 'vertical') {
    return { x: delta.x, y: 0 };
  }

  // For mixed or diagonal walls, use initial drag axis
  if (!dragAxisRef.current) {
    if (absX < epsilon && absY < epsilon) {
      return { x: 0, y: 0 };
    }
    dragAxisRef.current = absX >= absY ? 'horizontal' : 'vertical';
  }

  if (dragAxisRef.current === 'horizontal') {
    return { x: delta.x, y: 0 };
  }
  return { x: 0, y: delta.y };
};

// ============================================================================
// Wall Extended Snap Metadata
// ============================================================================

export interface WallExtendedSnapMetadata {
  wallId: string;
  endpoint: 'start' | 'end';
  alignment: WallAlignment;
  faceNormal?: Point | null;
}

// ============================================================================
// Constants
// ============================================================================

export const LOOP_CLOSE_TOLERANCE = 0.02;

