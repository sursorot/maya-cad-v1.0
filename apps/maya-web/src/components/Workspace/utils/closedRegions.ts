/**
 * Closed Region Detection for Non-Wall Shapes
 * 
 * This module detects closed regions formed by various shapes:
 * - Circles (inherently closed)
 * - Rectangles (inherently closed)
 * - Closed Polylines (first point == last point)
 * - Self-intersecting polylines
 * - Connected/intersecting shapes (lines, arcs, curves, polylines) forming closed loops
 * - Sub-regions created when shapes intersect each other
 */

import type { Point, Shape, CircleShape, RectangleShape, PolylineShape, ArcShape, CurveShape } from '../types';
import { calculateArcGeometry, catmullRomPoint } from './measurements';
import { pointInPolygon } from './walls';
import polygonClipping from 'polygon-clipping';

// Threshold for considering points as connected (in SVG units / meters)
const CONNECTION_THRESHOLD = 0.005;

// Blade width for cutting polygons (thin rectangle along cutting lines)
// Needs to be wide enough for polygon-clipping to handle reliably
// Using 2cm (0.02m) for reliable cutting
const BLADE_WIDTH = 0.02;

/**
 * Result of closed region detection
 */
export interface ClosedRegion {
  /** Polygon points forming the closed region */
  polygon: Point[];
  /** Shape IDs that contribute to this region */
  shapeIds: string[];
  /** Type of region: 'intrinsic' (single shape), 'composite' (multiple connected shapes), or 'split' (from intersection) */
  regionType: 'intrinsic' | 'composite' | 'split';
  /** Calculated area of the region */
  area: number;
}

/**
 * Check if two points are close enough to be considered connected
 */
const arePointsClose = (p1: Point, p2: Point, threshold: number = CONNECTION_THRESHOLD): boolean => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
};

/**
 * Hash a point for use in adjacency maps
 */
const pointKey = (point: Point, precision: number = 3): string => {
  return `${point.x.toFixed(precision)}:${point.y.toFixed(precision)}`;
};

/**
 * Convert a circle to a polygon approximation
 */
const circleToPolygon = (circle: CircleShape, segments: number = 64): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    points.push({
      x: circle.center.x + circle.radius * Math.cos(angle),
      y: circle.center.y + circle.radius * Math.sin(angle),
    });
  }
  // Close the polygon
  points.push(points[0]);
  return points;
};

/**
 * Convert a rectangle to a polygon
 */
const rectangleToPolygon = (rect: RectangleShape): Point[] => {
  const minX = Math.min(rect.start.x, rect.end.x);
  const maxX = Math.max(rect.start.x, rect.end.x);
  const minY = Math.min(rect.start.y, rect.end.y);
  const maxY = Math.max(rect.start.y, rect.end.y);
  
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
    { x: minX, y: minY }, // Close the polygon
  ];
};

/**
 * Check if a polyline is closed
 */
const isPolylineClosed = (polyline: PolylineShape): boolean => {
  if (polyline.points.length < 3) return false;
  const first = polyline.points[0];
  const last = polyline.points[polyline.points.length - 1];
  return arePointsClose(first, last);
};

/**
 * Convert arc to polygon approximation
 */
const arcToPolygon = (arc: ArcShape, segments: number = 32): Point[] => {
  const geometry = calculateArcGeometry(arc.start, arc.end, arc.controlPoint);
  const points: Point[] = [];
  
  if (geometry.isLine || geometry.radius === 0) {
    // Degenerate arc - return line segment
    return [arc.start, arc.end];
  }
  
  let sweepAngle = geometry.endAngle - geometry.startAngle;
  if (geometry.isCCW) {
    if (sweepAngle < 0) sweepAngle += 2 * Math.PI;
  } else {
    if (sweepAngle > 0) sweepAngle -= 2 * Math.PI;
  }
  
  // Match BoundingBox inversion logic
  if (Math.abs(sweepAngle) > Math.PI) {
    if (geometry.isCCW) {
      sweepAngle -= 2 * Math.PI;
    } else {
      sweepAngle += 2 * Math.PI;
    }
  }
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = geometry.startAngle + sweepAngle * t;
    points.push({
      x: geometry.center.x + geometry.radius * Math.cos(angle),
      y: geometry.center.y + geometry.radius * Math.sin(angle),
    });
  }
  
  return points;
};

/**
 * Check if curve points form a closed loop
 */
const isCurveClosed = (points: Point[], threshold: number = CONNECTION_THRESHOLD): boolean => {
  if (points.length < 3) return false;
  return arePointsClose(points[0], points[points.length - 1], threshold);
};

/**
 * Convert curve to polygon approximation (sampling the Catmull-Rom spline)
 */
const curveToPolygon = (curve: CurveShape, segmentsPerPoint: number = 20): Point[] => {
  if (curve.points.length < 2) return [];
  
  const points: Point[] = [];
  const isClosed = isCurveClosed(curve.points);
  
  // Start with first point
  points.push(curve.points[0]);
  
  // Sample all segments
  for (let i = 0; i < curve.points.length - 1; i++) {
    let p0: Point, p3: Point;
    const p1 = curve.points[i];
    const p2 = curve.points[i + 1];
    
    if (isClosed) {
      p0 = i === 0 ? curve.points[curve.points.length - 2] : curve.points[i - 1];
      p3 = i === curve.points.length - 2 ? curve.points[1] : curve.points[i + 2];
    } else {
      p0 = i === 0 ? curve.points[0] : curve.points[i - 1];
      p3 = i === curve.points.length - 2 ? curve.points[i + 1] : curve.points[i + 2];
    }
    
    for (let j = 1; j <= segmentsPerPoint; j++) {
      const t = j / segmentsPerPoint;
      const point = catmullRomPoint(p0, p1, p2, p3, t, 0);
      points.push(point);
    }
  }
  
  return points;
};

/**
 * Calculate polygon area using the shoelace formula
 */
const calculateArea = (polygon: Point[]): number => {
  if (polygon.length < 3) return 0;
  
  let area = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    area += (polygon[j].x + polygon[i].x) * (polygon[j].y - polygon[i].y);
  }
  return Math.abs(area / 2);
};

/**
 * Points to polygon-clipping format
 */
const pointsToRing = (points: Point[]): [number, number][] => {
  return points.map(p => [p.x, p.y]);
};

/**
 * Ring to Points format
 */
const ringToPoints = (ring: [number, number][]): Point[] => {
  return ring.map(([x, y]) => ({ x, y }));
};

/**
 * Ensure a polygon ring is closed
 */
const ensureRingClosed = (ring: [number, number][]): [number, number][] => {
  if (ring.length < 2) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, [first[0], first[1]]];
  }
  return ring;
};

/**
 * Create a "blade" polygon from a polyline for cutting
 * The blade is a thin rectangle along the polyline path
 * Extended slightly beyond endpoints to ensure complete cutting
 */
const createBladeFromPolyline = (points: Point[], width: number = BLADE_WIDTH): [number, number][][] | null => {
  if (points.length < 2) return null;
  
  const blades: [number, number][][] = [];
  
  // Extension factor - extend blade well beyond endpoints to ensure complete cutting
  const EXTENSION = 0.5; // 50cm extension on each end
  
  // Create a blade for each segment
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len < 0.0001) continue;
    
    // Unit direction vector
    const ux = dx / len;
    const uy = dy / len;
    
    // Perpendicular unit vector
    const nx = -dy / len;
    const ny = dx / len;
    
    // Extend the endpoints slightly
    const ext1x = p1.x - ux * EXTENSION;
    const ext1y = p1.y - uy * EXTENSION;
    const ext2x = p2.x + ux * EXTENSION;
    const ext2y = p2.y + uy * EXTENSION;
    
    // Create thin rectangle with extended endpoints
    const halfWidth = width / 2;
    const blade: [number, number][] = [
      [ext1x + nx * halfWidth, ext1y + ny * halfWidth],
      [ext2x + nx * halfWidth, ext2y + ny * halfWidth],
      [ext2x - nx * halfWidth, ext2y - ny * halfWidth],
      [ext1x - nx * halfWidth, ext1y - ny * halfWidth],
      [ext1x + nx * halfWidth, ext1y + ny * halfWidth], // Close
    ];
    
    blades.push(blade);
  }
  
  if (blades.length === 0) return null;
  
  // Union all segment blades into one continuous blade
  try {
    let result: [number, number][][][] = [[blades[0]]];
    for (let i = 1; i < blades.length; i++) {
      result = polygonClipping.union(result, [[blades[i]]]);
    }
    return result[0] || null;
  } catch {
    return blades; // Return individual blades if union fails
  }
};

/**
 * Check if a cutting shape intersects with a closed polygon
 */
const doesShapeIntersectPolygon = (
  cuttingPoints: Point[],
  closedPolygon: Point[]
): boolean => {
  // Check if any point of the cutting shape is inside the polygon
  for (const point of cuttingPoints) {
    if (pointInPolygon(point, closedPolygon)) {
      return true;
    }
  }
  
  // Check if any segment of the cutting shape intersects the polygon edges
  for (let i = 0; i < cuttingPoints.length - 1; i++) {
    const a1 = cuttingPoints[i];
    const a2 = cuttingPoints[i + 1];
    
    for (let j = 0; j < closedPolygon.length - 1; j++) {
      const b1 = closedPolygon[j];
      const b2 = closedPolygon[j + 1];
      
      if (lineSegmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Check if two line segments intersect
 */
const lineSegmentsIntersect = (a1: Point, a2: Point, b1: Point, b2: Point): boolean => {
  const d1 = direction(b1, b2, a1);
  const d2 = direction(b1, b2, a2);
  const d3 = direction(a1, a2, b1);
  const d4 = direction(a1, a2, b2);
  
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  
  if (d1 === 0 && onSegment(b1, b2, a1)) return true;
  if (d2 === 0 && onSegment(b1, b2, a2)) return true;
  if (d3 === 0 && onSegment(a1, a2, b1)) return true;
  if (d4 === 0 && onSegment(a1, a2, b2)) return true;
  
  return false;
};

/**
 * Get intersection point of two line segments (if they intersect)
 */
const getLineIntersection = (a1: Point, a2: Point, b1: Point, b2: Point): Point | null => {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return null; // Parallel
  
  const dx = b1.x - a1.x;
  const dy = b1.y - a1.y;
  
  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;
  
  // Check if intersection is within both segments
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: a1.x + t * d1x,
      y: a1.y + t * d1y,
    };
  }
  
  return null;
};

const direction = (p1: Point, p2: Point, p3: Point): number => {
  return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
};

const onSegment = (p1: Point, p2: Point, p: Point): boolean => {
  return Math.min(p1.x, p2.x) <= p.x && p.x <= Math.max(p1.x, p2.x) &&
         Math.min(p1.y, p2.y) <= p.y && p.y <= Math.max(p1.y, p2.y);
};

/**
 * Split a closed polygon by cutting shapes
 * Returns array of resulting polygons after all cuts
 */
const splitPolygonByShapes = (
  closedPolygon: Point[],
  cuttingShapes: Array<{ points: Point[]; shapeId: string }>,
  originalShapeId: string
): ClosedRegion[] => {
  // Ensure the polygon is closed
  let polygonRing = pointsToRing(closedPolygon);
  polygonRing = ensureRingClosed(polygonRing);
  
  // Start with the original polygon as a MultiPolygon
  // MultiPolygon structure: [Polygon, ...] where Polygon = [Ring, ...] where Ring = [[x,y], ...]
  const initialPolygon: [number, number][][] = [polygonRing]; // One polygon with one ring (no holes)
  let currentPolygons: [number, number][][][] = [initialPolygon]; // MultiPolygon with one polygon
  const contributingShapeIds = new Set<string>([originalShapeId]);
  
  // Apply each cutting shape
  for (const cuttingShape of cuttingShapes) {
    if (!doesShapeIntersectPolygon(cuttingShape.points, closedPolygon)) {
      continue;
    }
    
    const blade = createBladeFromPolyline(cuttingShape.points);
    if (!blade) continue;
    
    contributingShapeIds.add(cuttingShape.shapeId);
    
    // Difference: subtract the blade from all current polygons
    // polygon-clipping.difference expects MultiPolygon arguments: [Polygon, ...]
    const newPolygons: [number, number][][][] = [];
    
    for (const poly of currentPolygons) {
      try {
        // Wrap poly in array to make it a MultiPolygon, same for blade
        const result = polygonClipping.difference([poly], [blade]);
        if (result.length > 0) {
          newPolygons.push(...result);
        }
      } catch {
        // If difference fails, keep original polygon
        newPolygons.push(poly);
      }
    }
    
    if (newPolygons.length > 0) {
      currentPolygons = newPolygons;
    }
  }
  
  // Convert results back to ClosedRegion format
  // polygon-clipping returns MultiPolygon which is Polygon[] where each Polygon is Ring[]
  // Ring is [number, number][] - array of coordinate pairs
  const shapeIds = Array.from(contributingShapeIds);
  const regions: ClosedRegion[] = [];
  
  for (const polygonWithHoles of currentPolygons) {
    // polygonWithHoles is Ring[] where first ring is outer boundary, rest are holes
    if (polygonWithHoles.length === 0) continue;
    
    // First ring is the outer boundary
    const outerRing = polygonWithHoles[0];
    if (!outerRing || outerRing.length < 4) continue; // Need at least 3 unique points + closing point
    
    const polygon = ringToPoints(outerRing);
    const area = calculateArea(polygon);
    
    // Skip very small areas (artifacts)
    if (area < 0.0001) continue;
    
    regions.push({
      polygon,
      shapeIds,
      regionType: currentPolygons.length > 1 || cuttingShapes.some(s => contributingShapeIds.has(s.shapeId)) 
        ? 'split' 
        : 'intrinsic',
      area,
    });
  }
  
  return regions;
};

/**
 * Get all "cutting" shapes that can split closed shapes
 */
const getCuttingShapes = (shapes: Shape[]): Array<{ points: Point[]; shapeId: string }> => {
  const cutting: Array<{ points: Point[]; shapeId: string }> = [];
  
  for (const shape of shapes) {
    switch (shape.type) {
      case 'line':
        cutting.push({
          points: [shape.start, shape.end],
          shapeId: shape.id,
        });
        break;
      
      case 'arc':
        cutting.push({
          points: arcToPolygon(shape),
          shapeId: shape.id,
        });
        break;
      
      case 'curve':
        if (shape.points.length >= 2 && !isCurveClosed(shape.points)) {
          cutting.push({
            points: curveToPolygon(shape),
            shapeId: shape.id,
          });
        }
        break;
      
      case 'polyline':
        if (shape.points.length >= 2 && !isPolylineClosed(shape)) {
          cutting.push({
            points: [...shape.points],
            shapeId: shape.id,
          });
        }
        break;
    }
  }
  
  return cutting;
};

/**
 * Find all intrinsically closed shapes and split them by intersecting shapes
 */
const findIntrinsicClosedRegions = (shapes: Shape[]): ClosedRegion[] => {
  const regions: ClosedRegion[] = [];
  const cuttingShapes = getCuttingShapes(shapes);
  
  // Also include closed shapes as potential cutting shapes for other closed shapes
  const closedShapesCutters: Array<{ points: Point[]; shapeId: string }> = [];
  
  for (const shape of shapes) {
    let polygon: Point[] | null = null;
    const shapeId = shape.id;
    
    switch (shape.type) {
      case 'circle': {
        polygon = circleToPolygon(shape);
        // Circle edges can cut other shapes
        closedShapesCutters.push({ points: polygon, shapeId: shape.id });
        break;
      }
      
      case 'rectangle': {
        polygon = rectangleToPolygon(shape);
        // Rectangle edges can cut other shapes
        closedShapesCutters.push({ points: polygon, shapeId: shape.id });
        break;
      }
      
      case 'polyline': {
        if (isPolylineClosed(shape)) {
          polygon = [...shape.points];
          if (!arePointsClose(polygon[0], polygon[polygon.length - 1])) {
            polygon.push(polygon[0]);
          }
          closedShapesCutters.push({ points: polygon, shapeId: shape.id });
        }
        break;
      }
      
      case 'curve': {
        if (isCurveClosed(shape.points)) {
          polygon = curveToPolygon(shape);
          if (!arePointsClose(polygon[0], polygon[polygon.length - 1])) {
            polygon.push(polygon[0]);
          }
          closedShapesCutters.push({ points: polygon, shapeId: shape.id });
        }
        break;
      }
    }
    
    if (polygon) {
      // Get all cutters except the shape itself
      const cuttersForThisShape = [
        ...cuttingShapes,
        ...closedShapesCutters.filter(c => c.shapeId !== shapeId)
      ];
      
      // Split the polygon by all cutting shapes
      const splitRegions = splitPolygonByShapes(polygon, cuttersForThisShape, shapeId);
      regions.push(...splitRegions);
    }
  }
  
  return regions;
};

// ============================================================================
// PLANAR GRAPH APPROACH FOR COMPOSITE CLOSED REGIONS
// Handles: self-intersecting polylines, multiple shapes intersecting, etc.
// ============================================================================

/**
 * A line segment with its source shape ID
 */
interface Segment {
  start: Point;
  end: Point;
  shapeId: string;
}

/**
 * Convert a shape to line segments
 */
const shapeToSegments = (shape: Shape): Segment[] => {
  const segments: Segment[] = [];
  
  switch (shape.type) {
    case 'line':
      segments.push({ start: shape.start, end: shape.end, shapeId: shape.id });
      break;
    
    case 'arc': {
      const points = arcToPolygon(shape);
      for (let i = 0; i < points.length - 1; i++) {
        segments.push({ start: points[i], end: points[i + 1], shapeId: shape.id });
      }
      break;
    }
    
    case 'curve': {
      const points = curveToPolygon(shape);
      for (let i = 0; i < points.length - 1; i++) {
        segments.push({ start: points[i], end: points[i + 1], shapeId: shape.id });
      }
      break;
    }
    
    case 'polyline': {
      for (let i = 0; i < shape.points.length - 1; i++) {
        segments.push({ start: shape.points[i], end: shape.points[i + 1], shapeId: shape.id });
      }
      break;
    }
    
    case 'circle': {
      const points = circleToPolygon(shape);
      for (let i = 0; i < points.length - 1; i++) {
        segments.push({ start: points[i], end: points[i + 1], shapeId: shape.id });
      }
      break;
    }
    
    case 'rectangle': {
      const points = rectangleToPolygon(shape);
      for (let i = 0; i < points.length - 1; i++) {
        segments.push({ start: points[i], end: points[i + 1], shapeId: shape.id });
      }
      break;
    }
  }
  
  return segments;
};

/**
 * Find all intersection points and split segments at intersections
 */
const splitSegmentsAtIntersections = (segments: Segment[]): Segment[] => {
  const result: Segment[] = [];
  const intersectionPoints: Map<number, Point[]> = new Map();
  
  // Find all intersections between segments
  for (let i = 0; i < segments.length; i++) {
    const segA = segments[i];
    const pointsOnA: Point[] = [];
    
    for (let j = i + 1; j < segments.length; j++) {
      const segB = segments[j];
      const intersection = getLineIntersection(segA.start, segA.end, segB.start, segB.end);
      
      if (intersection) {
        // Check it's not at endpoints
        if (!arePointsClose(intersection, segA.start) && !arePointsClose(intersection, segA.end)) {
          pointsOnA.push(intersection);
        }
        
        // Add to segment B's intersections too
        if (!arePointsClose(intersection, segB.start) && !arePointsClose(intersection, segB.end)) {
          const pointsOnB = intersectionPoints.get(j) || [];
          pointsOnB.push(intersection);
          intersectionPoints.set(j, pointsOnB);
        }
      }
    }
    
    if (pointsOnA.length > 0) {
      intersectionPoints.set(i, pointsOnA);
    }
  }
  
  // Split each segment at its intersection points
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const points = intersectionPoints.get(i);
    
    if (!points || points.length === 0) {
      result.push(seg);
      continue;
    }
    
    // Sort intersection points by distance from start
    const sortedPoints = [seg.start, ...points, seg.end].sort((a, b) => {
      const distA = Math.hypot(a.x - seg.start.x, a.y - seg.start.y);
      const distB = Math.hypot(b.x - seg.start.x, b.y - seg.start.y);
      return distA - distB;
    });
    
    // Create sub-segments
    for (let j = 0; j < sortedPoints.length - 1; j++) {
      const start = sortedPoints[j];
      const end = sortedPoints[j + 1];
      if (!arePointsClose(start, end)) {
        result.push({ start, end, shapeId: seg.shapeId });
      }
    }
  }
  
  return result;
};

/**
 * Edge in the planar graph
 */
interface PlanarEdge {
  from: string; // Point key
  to: string; // Point key
  fromPoint: Point;
  toPoint: Point;
  shapeIds: Set<string>;
  angle: number; // Angle from 'from' to 'to'
}

/**
 * Build a planar graph from segments
 */
const buildPlanarGraph = (segments: Segment[]): Map<string, PlanarEdge[]> => {
  const graph = new Map<string, PlanarEdge[]>();
  
  for (const seg of segments) {
    const startKey = pointKey(seg.start);
    const endKey = pointKey(seg.end);
    
    // Calculate angles
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const angleForward = Math.atan2(dy, dx);
    const angleBackward = Math.atan2(-dy, -dx);
    
    // Add forward edge
    const forwardEdge: PlanarEdge = {
      from: startKey,
      to: endKey,
      fromPoint: seg.start,
      toPoint: seg.end,
      shapeIds: new Set([seg.shapeId]),
      angle: angleForward,
    };
    
    // Add backward edge
    const backwardEdge: PlanarEdge = {
      from: endKey,
      to: startKey,
      fromPoint: seg.end,
      toPoint: seg.start,
      shapeIds: new Set([seg.shapeId]),
      angle: angleBackward,
    };
    
    // Add to graph
    const startEdges = graph.get(startKey) || [];
    startEdges.push(forwardEdge);
    graph.set(startKey, startEdges);
    
    const endEdges = graph.get(endKey) || [];
    endEdges.push(backwardEdge);
    graph.set(endKey, endEdges);
  }
  
  // Sort edges at each node by angle (for finding minimal faces)
  for (const [, edges] of graph) {
    edges.sort((a, b) => a.angle - b.angle);
  }
  
  return graph;
};

/**
 * Find all minimal faces (closed regions) in a planar graph
 * Uses the "next edge in clockwise order" algorithm
 */
const findMinimalFaces = (graph: Map<string, PlanarEdge[]>): ClosedRegion[] => {
  const regions: ClosedRegion[] = [];
  const usedEdges = new Set<string>();
  
  const edgeKey = (from: string, to: string) => `${from}->${to}`;
  
  for (const [, edges] of graph) {
    for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
      const startEdge = edges[edgeIndex];
      const startEdgeKey = edgeKey(startEdge.from, startEdge.to);
      
      if (usedEdges.has(startEdgeKey)) continue;
      
      // Try to trace a face starting from this edge
      const facePoints: Point[] = [];
      const faceShapeIds = new Set<string>();
      const faceEdgeKeys: string[] = [];
      let currentEdge = startEdge;
      let safety = 0;
      const MAX_FACE_SIZE = 500;
      let completedFace = false;
      
      while (safety < MAX_FACE_SIZE) {
        safety++;
        
        const currentEdgeKey = edgeKey(currentEdge.from, currentEdge.to);
        
        // Check if we've already used this edge in this face traversal
        if (faceEdgeKeys.includes(currentEdgeKey)) {
          // We've looped within our traversal - might be a face
          if (currentEdge.from === startEdge.from && facePoints.length >= 3) {
            completedFace = true;
          }
          break;
        }
        
        // Check if this edge was used by a previous face
        if (usedEdges.has(currentEdgeKey)) break;
        
        faceEdgeKeys.push(currentEdgeKey);
        facePoints.push(currentEdge.fromPoint);
        currentEdge.shapeIds.forEach(id => faceShapeIds.add(id));
        
        // Move to the next node
        const currentNode = currentEdge.to;
        
        // Check if we've completed a loop back to start
        if (currentNode === startEdge.from && facePoints.length >= 3) {
          completedFace = true;
          break;
        }
        
        // Find the next edge (turning right/clockwise)
        const nodeEdges = graph.get(currentNode);
        if (!nodeEdges || nodeEdges.length === 0) break;
        
        // Find the edge we came from (reversed angle)
        const reverseAngle = currentEdge.angle + Math.PI;
        const normalizedReverseAngle = ((reverseAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        
        // Find the next edge in counter-clockwise order from the reverse angle
        // This gives us the right-hand (clockwise) face
        let nextEdge: PlanarEdge | null = null;
        let bestAngleDiff = Infinity;
        
        for (const edge of nodeEdges) {
          // Don't go back the way we came
          if (edge.to === currentEdge.from && arePointsClose(edge.toPoint, currentEdge.fromPoint)) {
            continue;
          }
          
          const normalizedEdgeAngle = ((edge.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          let angleDiff = normalizedEdgeAngle - normalizedReverseAngle;
          if (angleDiff <= 0) angleDiff += 2 * Math.PI;
          
          if (angleDiff < bestAngleDiff) {
            bestAngleDiff = angleDiff;
            nextEdge = edge;
          }
        }
        
        if (!nextEdge) break;
        currentEdge = nextEdge;
      }
      
      // Only mark edges as used and create region if we completed a face
      if (completedFace && facePoints.length >= 3) {
        // Mark all edges in this face as used
        for (const key of faceEdgeKeys) {
          usedEdges.add(key);
        }
        
        // Close the polygon
        facePoints.push(facePoints[0]);
        
        const area = calculateArea(facePoints);
        if (area > 0.0001) { // Skip tiny areas
          regions.push({
            polygon: facePoints,
            shapeIds: Array.from(faceShapeIds),
            regionType: 'composite',
            area,
          });
        }
      }
    }
  }
  
  return regions;
};

/**
 * Find closed loops formed by connected/intersecting shapes
 * This is the improved version that handles:
 * - Self-intersecting polylines
 * - Multiple lines/arcs/curves forming closed regions  
 * - Lines/shapes crossing through circles/rectangles
 * - Any combination of shapes
 */
const findCompositeClosedRegions = (shapes: Shape[]): ClosedRegion[] => {
  // Include ALL shapes to properly detect intersections between open shapes and closed shapes
  const allShapes = shapes.filter(shape => {
    if (shape.type === 'line') return true;
    if (shape.type === 'arc') return true;
    if (shape.type === 'curve') return true;
    if (shape.type === 'polyline') return true;
    if (shape.type === 'circle') return true;
    if (shape.type === 'rectangle') return true;
    return false;
  });
  
  if (allShapes.length === 0) return [];
  
  // Convert shapes to segments
  let segments: Segment[] = [];
  for (const shape of allShapes) {
    segments.push(...shapeToSegments(shape));
  }
  
  if (segments.length < 3) return []; // Need at least 3 segments for a face
  
  // Split segments at intersection points
  segments = splitSegmentsAtIntersections(segments);
  
  // Build planar graph
  const graph = buildPlanarGraph(segments);
  
  // Find all minimal faces
  const regions = findMinimalFaces(graph);
  
  // Filter out the "outer face" (usually the largest region that represents the exterior)
  // and regions with very large areas (likely exterior faces)
  const maxReasonableArea = 1000; // 1000 square meters - increased for larger workspaces
  return regions.filter(r => r.area < maxReasonableArea);
};

/**
 * Remove duplicate/overlapping regions
 */
const deduplicateRegions = (regions: ClosedRegion[]): ClosedRegion[] => {
  const unique: ClosedRegion[] = [];
  const seen = new Set<string>();
  
  for (const region of regions) {
    // Create a hash based on centroid and area
    const centroid = getPolygonCentroid(region.polygon);
    const hash = `${centroid.x.toFixed(2)}:${centroid.y.toFixed(2)}:${region.area.toFixed(4)}`;
    
    if (!seen.has(hash)) {
      seen.add(hash);
      unique.push(region);
    }
  }
  
  return unique;
};

/**
 * Main function: Find all closed regions in the workspace
 * This includes:
 * - Intrinsically closed shapes (circles, rectangles, closed polylines/curves)
 * - Composite regions formed by connected/intersecting open shapes
 * - Sub-regions created when shapes intersect each other
 */
export const findClosedRegions = (shapes: Shape[]): ClosedRegion[] => {
  // Filter out walls, zones, rooms, etc. - only look at drawing shapes
  const drawingShapes = shapes.filter(shape => 
    shape.type === 'circle' ||
    shape.type === 'rectangle' ||
    shape.type === 'polyline' ||
    shape.type === 'line' ||
    shape.type === 'arc' ||
    shape.type === 'curve'
  );
  
  const intrinsicRegions = findIntrinsicClosedRegions(drawingShapes);
  const compositeRegions = findCompositeClosedRegions(drawingShapes);
  
  // Combine and deduplicate
  const allRegions = [...intrinsicRegions, ...compositeRegions];
  return deduplicateRegions(allRegions);
};

/**
 * Find the closed region containing a given point
 * Returns the smallest enclosing region (innermost) if nested
 */
export const findEnclosingRegion = (
  point: Point,
  shapes: Shape[]
): ClosedRegion | null => {
  const regions = findClosedRegions(shapes);
  
  let bestRegion: ClosedRegion | null = null;
  let bestArea = Infinity;
  
  for (const region of regions) {
    if (pointInPolygon(point, region.polygon)) {
      if (region.area < bestArea) {
        bestArea = region.area;
        bestRegion = region;
      }
    }
  }
  
  return bestRegion;
};

/**
 * Compute the union of all closed regions and return them as a geometry structure
 * similar to MergedWallGeometry (with outer boundaries and holes)
 */
export interface MergedShapeGeometry {
  /** All merged shape polygons, each with outer boundary and holes */
  polygons: Array<{
    outer: Point[];
    holes: Point[][];
    shapeIds: string[];
  }>;
  /** Total count of interior holes (for flash detection) */
  totalHoles: number;
}

/**
 * Compute merged geometry from closed regions
 * This creates a structure where nested regions result in holes
 */
export const computeClosedRegionGeometry = (shapes: Shape[]): MergedShapeGeometry => {
  const regions = findClosedRegions(shapes);
  
  if (regions.length === 0) {
    return { polygons: [], totalHoles: 0 };
  }
  
  // For now, return each region as its own polygon
  const polygons = regions.map(region => ({
    outer: region.polygon,
    holes: [] as Point[][],
    shapeIds: region.shapeIds,
  }));
  
  return {
    polygons,
    totalHoles: 0,
  };
};

/**
 * Alternative approach: Return all closed regions as interactive areas
 * This is simpler and treats each closed region independently
 */
export interface InteractiveClosedRegion {
  polygon: Point[];
  shapeIds: string[];
  area: number;
  centroid: Point;
}

/**
 * Calculate centroid of a polygon
 */
const getPolygonCentroid = (points: Point[]): Point => {
  if (points.length === 0) return { x: 0, y: 0 };
  
  let accumulatedArea = 0;
  let centroidX = 0;
  let centroidY = 0;
  const pointCount = points.length;
  
  if (pointCount < 3) {
    return {
      x: points.reduce((sum, p) => sum + p.x, 0) / pointCount,
      y: points.reduce((sum, p) => sum + p.y, 0) / pointCount,
    };
  }
  
  for (let i = 0, j = pointCount - 1; i < pointCount; j = i, i += 1) {
    const p1 = points[j];
    const p2 = points[i];
    const f = p1.x * p2.y - p2.x * p1.y;
    accumulatedArea += f;
    centroidX += (p1.x + p2.x) * f;
    centroidY += (p1.y + p2.y) * f;
  }
  
  const area = accumulatedArea / 2;
  if (Math.abs(area) < 1e-9) {
    return {
      x: points.reduce((sum, p) => sum + p.x, 0) / pointCount,
      y: points.reduce((sum, p) => sum + p.y, 0) / pointCount,
    };
  }
  
  const factor = 1 / (6 * area);
  return {
    x: centroidX * factor,
    y: centroidY * factor,
  };
};

/**
 * Get all closed regions as interactive areas for zone creation
 */
export const getInteractiveClosedRegions = (shapes: Shape[]): InteractiveClosedRegion[] => {
  const regions = findClosedRegions(shapes);
  
  return regions.map(region => ({
    polygon: region.polygon,
    shapeIds: region.shapeIds,
    area: region.area,
    centroid: getPolygonCentroid(region.polygon),
  }));
};
