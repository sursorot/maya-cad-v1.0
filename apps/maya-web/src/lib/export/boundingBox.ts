/**
 * Bounding Box Calculation
 * Calculates the bounding box for shapes to determine export area
 */

import type { 
  Shape, 
  Point, 
  LineShape, 
  PolylineShape, 
  ArcShape, 
  CircleShape, 
  RectangleShape, 
  CurveShape,
  WallShape,
  OpeningShape,
  RoomShape,
  ZoneShape,
  DimensionShape,
  TextShape,
  GuidelineShape,
} from '../../components/Workspace/types';
import type { ExportBoundingBox } from './types';

// ============================================================================
// Shape-specific Bounding Box Calculators
// ============================================================================

function getLineBounds(shape: LineShape): ExportBoundingBox {
  const minX = Math.min(shape.start.x, shape.end.x);
  const maxX = Math.max(shape.start.x, shape.end.x);
  const minY = Math.min(shape.start.y, shape.end.y);
  const maxY = Math.max(shape.start.y, shape.end.y);
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getPolylineBounds(shape: PolylineShape): ExportBoundingBox {
  if (shape.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  const xs = shape.points.map(p => p.x);
  const ys = shape.points.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getCircleBounds(shape: CircleShape): ExportBoundingBox {
  return {
    minX: shape.center.x - shape.radius,
    minY: shape.center.y - shape.radius,
    maxX: shape.center.x + shape.radius,
    maxY: shape.center.y + shape.radius,
    width: shape.radius * 2,
    height: shape.radius * 2,
  };
}

function getRectangleBounds(shape: RectangleShape): ExportBoundingBox {
  const minX = Math.min(shape.start.x, shape.end.x);
  const maxX = Math.max(shape.start.x, shape.end.x);
  const minY = Math.min(shape.start.y, shape.end.y);
  const maxY = Math.max(shape.start.y, shape.end.y);
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate bounding box for an arc defined by start, end, and control point
 * This handles the curved nature of the arc
 */
function getArcBounds(shape: ArcShape): ExportBoundingBox {
  const { start, end, controlPoint } = shape;
  
  // For a 3-point arc, we need to find the circle that passes through all 3 points
  // and then calculate the bounds of the arc segment
  
  // Calculate the circle center and radius
  const ax = start.x, ay = start.y;
  const bx = controlPoint.x, by = controlPoint.y;
  const cx = end.x, cy = end.y;
  
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  
  if (Math.abs(d) < 1e-10) {
    // Points are collinear, treat as line
    const minX = Math.min(ax, bx, cx);
    const maxX = Math.max(ax, bx, cx);
    const minY = Math.min(ay, by, cy);
    const maxY = Math.max(ay, by, cy);
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }
  
  const centerX = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const centerY = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  const radius = Math.hypot(ax - centerX, ay - centerY);
  
  // Calculate angles for start, control, and end points
  const startAngle = Math.atan2(ay - centerY, ax - centerX);
  const controlAngle = Math.atan2(by - centerY, bx - centerX);
  const endAngle = Math.atan2(cy - centerY, cx - centerX);
  
  // Collect extreme points: start, end, and any cardinal points on the arc
  const extremePoints: Point[] = [start, controlPoint, end];
  
  // Check if cardinal directions (0, π/2, π, 3π/2) are within the arc
  const cardinalAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  
  for (const angle of cardinalAngles) {
    if (isAngleOnArc(angle, startAngle, endAngle, controlAngle)) {
      extremePoints.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    }
  }
  
  const xs = extremePoints.map(p => p.x);
  const ys = extremePoints.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Check if an angle is on the arc between start and end, passing through control
 */
function isAngleOnArc(angle: number, startAngle: number, endAngle: number, controlAngle: number): boolean {
  // Normalize angles to [0, 2π)
  const normalize = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  
  const a = normalize(angle);
  const s = normalize(startAngle);
  const e = normalize(endAngle);
  const c = normalize(controlAngle);
  
  // Determine if the arc goes clockwise or counterclockwise
  // by checking if the control point is on the short arc or long arc
  const shortArcContainsControl = isAngleBetween(c, s, e);
  
  if (shortArcContainsControl) {
    return isAngleBetween(a, s, e);
  } else {
    return !isAngleBetween(a, s, e);
  }
}

function isAngleBetween(angle: number, start: number, end: number): boolean {
  if (start <= end) {
    return angle >= start && angle <= end;
  } else {
    return angle >= start || angle <= end;
  }
}

/**
 * Calculate bounds for a Catmull-Rom curve
 */
function getCurveBounds(shape: CurveShape): ExportBoundingBox {
  if (shape.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  if (shape.points.length < 2) {
    const p = shape.points[0];
    return { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y, width: 0, height: 0 };
  }
  
  // Sample points along the Catmull-Rom spline
  const sampledPoints: Point[] = [];
  const samplesPerSegment = 20;
  
  for (let i = 0; i < shape.points.length - 1; i++) {
    const p0 = shape.points[Math.max(0, i - 1)];
    const p1 = shape.points[i];
    const p2 = shape.points[i + 1];
    const p3 = shape.points[Math.min(shape.points.length - 1, i + 2)];
    
    for (let t = 0; t <= 1; t += 1 / samplesPerSegment) {
      sampledPoints.push(catmullRomPoint(p0, p1, p2, p3, t));
    }
  }
  
  const xs = sampledPoints.map(p => p.x);
  const ys = sampledPoints.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function catmullRomPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  
  return {
    x: 0.5 * (
      2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    ),
    y: 0.5 * (
      2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    ),
  };
}

/**
 * Calculate bounds for a wall, accounting for thickness and alignment
 */
function getWallBounds(shape: WallShape): ExportBoundingBox {
  if (shape.centerline.length < 2) {
    if (shape.centerline.length === 1) {
      const p = shape.centerline[0];
      const half = shape.thickness / 2;
      return {
        minX: p.x - half,
        minY: p.y - half,
        maxX: p.x + half,
        maxY: p.y + half,
        width: shape.thickness,
        height: shape.thickness,
      };
    }
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  const halfThickness = shape.thickness / 2;
  const polygonPoints: Point[] = [];
  
  // Calculate wall polygon points (simplified - assumes straight wall)
  const start = shape.centerline[0];
  const end = shape.centerline[shape.centerline.length - 1];
  
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  
  if (length < 1e-6) {
    return {
      minX: start.x - halfThickness,
      minY: start.y - halfThickness,
      maxX: start.x + halfThickness,
      maxY: start.y + halfThickness,
      width: shape.thickness,
      height: shape.thickness,
    };
  }
  
  const perpX = -dy / length;
  const perpY = dx / length;
  
  // Calculate alignment offset
  let alignmentOffset = 0;
  if (shape.alignment === 'inside') {
    alignmentOffset = halfThickness;
  } else if (shape.alignment === 'outside') {
    alignmentOffset = -halfThickness;
  }
  
  const offset1 = alignmentOffset + halfThickness;
  const offset2 = alignmentOffset - halfThickness;
  
  // Four corners of the wall polygon
  polygonPoints.push(
    { x: start.x + perpX * offset1, y: start.y + perpY * offset1 },
    { x: start.x + perpX * offset2, y: start.y + perpY * offset2 },
    { x: end.x + perpX * offset1, y: end.y + perpY * offset1 },
    { x: end.x + perpX * offset2, y: end.y + perpY * offset2 }
  );
  
  // If wall has a control point (curved), include it
  if (shape.controlPoint) {
    const cp = shape.controlPoint;
    polygonPoints.push(
      { x: cp.x + perpX * offset1, y: cp.y + perpY * offset1 },
      { x: cp.x + perpX * offset2, y: cp.y + perpY * offset2 }
    );
  }
  
  const xs = polygonPoints.map(p => p.x);
  const ys = polygonPoints.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate bounds for an opening
 */
function getOpeningBounds(shape: OpeningShape): ExportBoundingBox {
  const halfWidth = shape.width / 2;
  const { anchor, direction, normal } = shape;
  
  // Opening is centered at anchor, extends along direction
  const startX = anchor.x - direction.x * halfWidth;
  const startY = anchor.y - direction.y * halfWidth;
  const endX = anchor.x + direction.x * halfWidth;
  const endY = anchor.y + direction.y * halfWidth;
  
  // Include the swing arc for doors
  const points: Point[] = [
    { x: startX, y: startY },
    { x: endX, y: endY },
  ];
  
  // Add swing arc bounds for doors
  if (shape.category === 'door' && shape.swing.operation === 'swing') {
    const swingRadius = shape.width;
    // Add points at the extent of the swing
    points.push(
      { x: anchor.x + normal.x * swingRadius, y: anchor.y + normal.y * swingRadius },
      { x: anchor.x - normal.x * swingRadius, y: anchor.y - normal.y * swingRadius },
    );
  }
  
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate bounds for a room
 */
function getRoomBounds(shape: RoomShape): ExportBoundingBox {
  if (shape.bounds) {
    return {
      minX: shape.bounds.minX,
      minY: shape.bounds.minY,
      maxX: shape.bounds.maxX,
      maxY: shape.bounds.maxY,
      width: shape.bounds.maxX - shape.bounds.minX,
      height: shape.bounds.maxY - shape.bounds.minY,
    };
  }
  
  if (shape.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  const xs = shape.points.map(p => p.x);
  const ys = shape.points.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate bounds for a zone
 */
function getZoneBounds(shape: ZoneShape): ExportBoundingBox {
  if (shape.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  const xs = shape.points.map(p => p.x);
  const ys = shape.points.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate bounds for a dimension annotation
 */
function getDimensionBounds(shape: DimensionShape): ExportBoundingBox {
  const { start, end, offset } = shape;
  
  // Calculate perpendicular direction
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  
  if (length < 1e-6) {
    return {
      minX: start.x,
      minY: start.y,
      maxX: start.x,
      maxY: start.y,
      width: 0,
      height: 0,
    };
  }
  
  const perpX = -dy / length;
  const perpY = dx / length;
  
  // Offset points
  const offsetStart = {
    x: start.x + perpX * offset,
    y: start.y + perpY * offset,
  };
  const offsetEnd = {
    x: end.x + perpX * offset,
    y: end.y + perpY * offset,
  };
  
  const points = [start, end, offsetStart, offsetEnd];
  
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate bounds for a text element
 */
function getTextBounds(shape: TextShape): ExportBoundingBox {
  // Estimate text bounds based on font size and content
  // This is an approximation - actual rendering may vary
  const charWidth = shape.fontSize * 0.6;
  const lineHeight = shape.fontSize * 1.2;
  
  const lines = shape.content.split('\n');
  const maxLineLength = Math.max(...lines.map(line => line.length));
  
  const width = maxLineLength * charWidth;
  const height = lines.length * lineHeight;
  
  let x = shape.position.x;
  if (shape.textAlign === 'center') {
    x -= width / 2;
  } else if (shape.textAlign === 'right') {
    x -= width;
  }
  
  const y = shape.position.y - shape.fontSize * 0.8; // Approximate baseline offset
  
  return {
    minX: x,
    minY: y,
    maxX: x + width,
    maxY: y + height,
    width,
    height,
  };
}

/**
 * Calculate bounds for a guideline
 * Guidelines are infinite, so we return large bounds or the visible segment
 */
function getGuidelineBounds(shape: GuidelineShape, viewBox?: { x: number; y: number; width: number; height: number }): ExportBoundingBox {
  if (shape.orientation === 'freeform' && shape.start && shape.end) {
    return {
      minX: Math.min(shape.start.x, shape.end.x),
      minY: Math.min(shape.start.y, shape.end.y),
      maxX: Math.max(shape.start.x, shape.end.x),
      maxY: Math.max(shape.start.y, shape.end.y),
      width: Math.abs(shape.end.x - shape.start.x),
      height: Math.abs(shape.end.y - shape.start.y),
    };
  }
  
  // For horizontal/vertical guidelines, return viewport bounds or default large bounds
  if (viewBox) {
    if (shape.orientation === 'horizontal' && shape.position !== undefined) {
      return {
        minX: viewBox.x,
        minY: shape.position,
        maxX: viewBox.x + viewBox.width,
        maxY: shape.position,
        width: viewBox.width,
        height: 0,
      };
    }
    if (shape.orientation === 'vertical' && shape.position !== undefined) {
      return {
        minX: shape.position,
        minY: viewBox.y,
        maxX: shape.position,
        maxY: viewBox.y + viewBox.height,
        width: 0,
        height: viewBox.height,
      };
    }
  }
  
  // Default large bounds for guidelines
  const LARGE = 1000;
  return {
    minX: -LARGE,
    minY: -LARGE,
    maxX: LARGE,
    maxY: LARGE,
    width: LARGE * 2,
    height: LARGE * 2,
  };
}

// ============================================================================
// Main Bounding Box Functions
// ============================================================================

/**
 * Calculate the bounding box for a single shape
 */
export function calculateShapeBounds(shape: Shape, viewBox?: { x: number; y: number; width: number; height: number }): ExportBoundingBox {
  switch (shape.type) {
    case 'line':
      return getLineBounds(shape);
    case 'polyline':
      return getPolylineBounds(shape);
    case 'arc':
      return getArcBounds(shape);
    case 'circle':
      return getCircleBounds(shape);
    case 'rectangle':
      return getRectangleBounds(shape);
    case 'curve':
      return getCurveBounds(shape);
    case 'wall':
      return getWallBounds(shape);
    case 'opening':
      return getOpeningBounds(shape);
    case 'room':
      return getRoomBounds(shape);
    case 'zone':
      return getZoneBounds(shape);
    case 'dimension':
      return getDimensionBounds(shape);
    case 'text':
      return getTextBounds(shape);
    case 'guideline':
      return getGuidelineBounds(shape, viewBox);
    default:
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
}

/**
 * Merge multiple bounding boxes into one
 */
export function mergeBounds(bounds: ExportBoundingBox[]): ExportBoundingBox {
  if (bounds.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  const minX = Math.min(...bounds.map(b => b.minX));
  const minY = Math.min(...bounds.map(b => b.minY));
  const maxX = Math.max(...bounds.map(b => b.maxX));
  const maxY = Math.max(...bounds.map(b => b.maxY));
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate the combined bounding box for multiple shapes
 */
export function calculateCombinedBounds(
  shapes: Shape[], 
  viewBox?: { x: number; y: number; width: number; height: number }
): ExportBoundingBox {
  if (shapes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  const bounds = shapes.map(shape => calculateShapeBounds(shape, viewBox));
  return mergeBounds(bounds);
}

/**
 * Apply padding to a bounding box
 */
export function applyPadding(bounds: ExportBoundingBox, padding: number): ExportBoundingBox {
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

/**
 * Calculate export bounds for given shapes with options
 */
export function calculateExportBounds(
  shapes: Shape[],
  selectedIds: string[],
  scope: 'all' | 'selection',
  padding: number,
  options?: {
    includeGuidelines?: boolean;
    viewBox?: { x: number; y: number; width: number; height: number };
  }
): ExportBoundingBox {
  let targetShapes = scope === 'selection' && selectedIds.length > 0
    ? shapes.filter(s => selectedIds.includes(s.id))
    : shapes;
  
  // Optionally exclude guidelines (they're infinite)
  if (!options?.includeGuidelines) {
    targetShapes = targetShapes.filter(s => s.type !== 'guideline');
  }
  
  if (targetShapes.length === 0) {
    // Return a default area if no shapes
    return {
      minX: -1,
      minY: -1,
      maxX: 1,
      maxY: 1,
      width: 2,
      height: 2,
    };
  }
  
  const bounds = calculateCombinedBounds(targetShapes, options?.viewBox);
  return applyPadding(bounds, padding);
}

/**
 * Ensure bounds have a minimum size (useful for single points or very small shapes)
 */
export function ensureMinimumSize(bounds: ExportBoundingBox, minSize: number = 0.1): ExportBoundingBox {
  let { minX, minY, maxX, maxY, width, height } = bounds;
  
  if (width < minSize) {
    const centerX = (minX + maxX) / 2;
    minX = centerX - minSize / 2;
    maxX = centerX + minSize / 2;
    width = minSize;
  }
  
  if (height < minSize) {
    const centerY = (minY + maxY) / 2;
    minY = centerY - minSize / 2;
    maxY = centerY + minSize / 2;
    height = minSize;
  }
  
  return { minX, minY, maxX, maxY, width, height };
}

