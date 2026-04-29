import type { Point, Shape, WallShape } from '../types';
import { calculateArcGeometry } from './measurements';
import polygonClipping from 'polygon-clipping';
import { GridIndex } from '@/lib/spatial/GridIndex';
import type { BoundingBox } from '@/lib/spatial/types';

type Endpoint = 'start' | 'end';
type Side = 'left' | 'right';

const normalize = (dx: number, dy: number): Point => {
  const length = Math.hypot(dx, dy);
  if (!length) {
    return { x: 0, y: 0 };
  }
  return { x: dx / length, y: dy / length };
};

const perpendicular = (dx: number, dy: number): Point => {
  const { x, y } = normalize(dx, dy);
  return { x: -y, y: x };
};

const addPoints = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const scalePoint = (point: Point, scale: number): Point => ({ x: point.x * scale, y: point.y * scale });
const clampRadius = (radius: number) => Math.max(radius, 0.001);

export interface WallJoinCap {
  left?: Point;
  right?: Point;
  connected?: boolean;
  /** Polygon to cover the seam at T-junctions (covers through wall's stroke) */
  seamCover?: Point[];
}

export interface WallJoinOverrides {
  start?: WallJoinCap;
  end?: WallJoinCap;
}

/** Seam cover polygon with its associated wall ID for rendering */
export interface SeamCover {
  wallId: string;
  endpoint: 'start' | 'end';
  polygon: Point[];
}

/** Extract all seam covers from wall join overrides for rendering after all walls */
export const getSeamCovers = (joins: Record<string, WallJoinOverrides>): SeamCover[] => {
  const covers: SeamCover[] = [];
  for (const [wallId, overrides] of Object.entries(joins)) {
    if (overrides.start?.seamCover && overrides.start.seamCover.length >= 3) {
      covers.push({
        wallId,
        endpoint: 'start',
        polygon: overrides.start.seamCover,
      });
    }
    if (overrides.end?.seamCover && overrides.end.seamCover.length >= 3) {
      covers.push({
        wallId,
        endpoint: 'end',
        polygon: overrides.end.seamCover,
      });
    }
  }
  return covers;
};

export interface WallRenderGeometry {
  polygon: Point[];
  leftEdge: Point[];
  rightEdge: Point[];
  startCap: [Point, Point];
  endCap: [Point, Point];
}

interface WallGeometry {
  start: Point;
  end: Point;
  startDirection: Point;
  endDirection: Point;
  startPerp: Point;
  endPerp: Point;
  half: number;
  alignmentShift: number;
  startLeft: Point;
  startRight: Point;
  endLeft: Point;
  endRight: Point;
}

interface EndpointRef {
  wallId: string;
  endpoint: Endpoint;
  point: Point;
  geometry: WallGeometry;
}

const POINT_KEY_PRECISION = 10000; // ~0.0001 units tolerance
const MITER_LIMIT = 16;
const EPSILON = 1e-9;
const T_JUNCTION_THRESHOLD = 0.01; // Distance threshold for T-junction detection (~1cm)

const hashPoint = (point: Point) =>
  `${Math.round(point.x * POINT_KEY_PRECISION)}:${Math.round(point.y * POINT_KEY_PRECISION)}`;

/**
 * Project a point onto a line segment and return projection info.
 * Returns the projected point, distance from original point, and t parameter (0-1 along segment).
 */
const projectPointOnSegment = (
  point: Point,
  segStart: Point,
  segEnd: Point
): { point: Point; distance: number; t: number } => {
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < EPSILON) {
    // Degenerate segment (start == end)
    return {
      point: segStart,
      distance: Math.hypot(point.x - segStart.x, point.y - segStart.y),
      t: 0,
    };
  }

  // Calculate t parameter (unclamped)
  let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lenSq;
  // Clamp t to [0, 1] to stay on segment
  t = Math.max(0, Math.min(1, t));

  const projected = {
    x: segStart.x + dx * t,
    y: segStart.y + dy * t,
  };

  return {
    point: projected,
    distance: Math.hypot(point.x - projected.x, point.y - projected.y),
    t,
  };
};

const createSeamCoverPolygon = (
  throughLeftEdgePoint: Point,
  throughRightEdgePoint: Point,
  throughDirection: Point,
  halfLength: number
): Point[] | null => {
  if (halfLength <= 0) {
    return null;
  }
  const span = {
    x: throughDirection.x * halfLength,
    y: throughDirection.y * halfLength,
  };
  const leftBack = {
    x: throughLeftEdgePoint.x - span.x,
    y: throughLeftEdgePoint.y - span.y,
  };
  const leftForward = {
    x: throughLeftEdgePoint.x + span.x,
    y: throughLeftEdgePoint.y + span.y,
  };
  const rightForward = {
    x: throughRightEdgePoint.x + span.x,
    y: throughRightEdgePoint.y + span.y,
  };
  const rightBack = {
    x: throughRightEdgePoint.x - span.x,
    y: throughRightEdgePoint.y - span.y,
  };
  return [leftBack, leftForward, rightForward, rightBack];
};

/**
 * Information about a detected T-junction
 */
interface TJunctionInfo {
  throughWallId: string;
  throughWallGeometry: WallGeometry;
  terminatingWallId: string;
  terminatingEndpoint: Endpoint;
  terminatingGeometry: WallGeometry;
  /** Point on the through wall's centerline where the terminating wall connects */
  connectionPoint: Point;
  /** Parameter t (0-1) along the through wall's centerline */
  connectionT: number;
}

export interface ConnectedWallEndpoint {
  wallId: string;
  endpointIndex: number;
}

/**
 * Find all walls connected at the same point as the specified wall's endpoint.
 * Returns a list of {wallId, endpointIndex} pairs for all connected endpoints.
 */
export const findConnectedWalls = (
  targetWallId: string,
  targetEndpointIndex: number,
  allWalls: WallShape[]
): ConnectedWallEndpoint[] => {
  // Find the target wall
  const targetWall = allWalls.find((w) => w.id === targetWallId);
  if (!targetWall || !targetWall.centerline || targetWall.centerline.length < 2) {
    return [];
  }

  // Get the target endpoint
  const targetPoint = targetWall.centerline[targetEndpointIndex];
  if (!targetPoint) {
    return [];
  }

  // Hash the target point
  const targetHash = hashPoint(targetPoint);

  // Find all wall endpoints that share this point
  const connected: ConnectedWallEndpoint[] = [];

  allWalls.forEach((wall) => {
    if (!wall.centerline || wall.centerline.length < 2) {
      return;
    }

    // Check start endpoint
    const startHash = hashPoint(wall.centerline[0]);
    if (startHash === targetHash) {
      connected.push({ wallId: wall.id, endpointIndex: 0 });
    }

    // Check end endpoint
    const endIndex = wall.centerline.length - 1;
    const endHash = hashPoint(wall.centerline[endIndex]);
    if (endHash === targetHash) {
      connected.push({ wallId: wall.id, endpointIndex: endIndex });
    }
  });

  return connected;
};


const buildGeometry = (wall: WallShape): WallGeometry | null => {
  if (!wall.centerline || wall.centerline.length < 2) {
    return null;
  }

  const start = wall.centerline[0];
  const end = wall.centerline[wall.centerline.length - 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!length) {
    return null;
  }

  const half = wall.thickness / 2;
  let alignmentShift = 0;
  if (wall.alignment === 'inside') {
    alignmentShift = half;
  } else if (wall.alignment === 'outside') {
    alignmentShift = -half;
  }
  const buildLinearGeometry = (): WallGeometry => {
    const direction = normalize(dx, dy);
    const perp = perpendicular(dx, dy);
    const offsetLeft = scalePoint(perp, alignmentShift + half);
    const offsetRight = scalePoint(perp, alignmentShift - half);
    return {
      start,
      end,
      startDirection: direction,
      endDirection: { x: -direction.x, y: -direction.y },
      startPerp: perp,
      endPerp: perp,
      half,
      alignmentShift,
      startLeft: addPoints(start, offsetLeft),
      startRight: addPoints(start, offsetRight),
      endLeft: addPoints(end, offsetLeft),
      endRight: addPoints(end, offsetRight),
    };
  };

  if (!wall.controlPoint) {
    return buildLinearGeometry();
  }

  const arcGeometry = calculateArcGeometry(start, end, wall.controlPoint);
  if (arcGeometry.isLine) {
    return buildLinearGeometry();
  }

  const directionSign = arcGeometry.isCCW ? -1 : 1;
  const startRadial = normalize(
    start.x - arcGeometry.center.x,
    start.y - arcGeometry.center.y
  );
  const endRadial = normalize(
    end.x - arcGeometry.center.x,
    end.y - arcGeometry.center.y
  );

  const radialToTangent = (radial: Point, ccw: boolean) =>
    ccw ? { x: -radial.y, y: radial.x } : { x: radial.y, y: -radial.x };

  const startTangent = radialToTangent(startRadial, arcGeometry.isCCW);
  const endTangent = radialToTangent(endRadial, arcGeometry.isCCW);
  const startDirection = normalize(startTangent.x, startTangent.y);
  const endDirection = normalize(-endTangent.x, -endTangent.y);
  const startPerp = perpendicular(startDirection.x, startDirection.y);
  const endPerp = perpendicular(endDirection.x, endDirection.y);

  const baseRadius = arcGeometry.radius + directionSign * alignmentShift;
  const leftRadius = clampRadius(baseRadius + directionSign * half);
  const rightRadius = clampRadius(baseRadius - directionSign * half);

  const startLeft = {
    x: arcGeometry.center.x + leftRadius * Math.cos(arcGeometry.startAngle),
    y: arcGeometry.center.y + leftRadius * Math.sin(arcGeometry.startAngle),
  };
  const startRight = {
    x: arcGeometry.center.x + rightRadius * Math.cos(arcGeometry.startAngle),
    y: arcGeometry.center.y + rightRadius * Math.sin(arcGeometry.startAngle),
  };
  const endLeft = {
    x: arcGeometry.center.x + leftRadius * Math.cos(arcGeometry.endAngle),
    y: arcGeometry.center.y + leftRadius * Math.sin(arcGeometry.endAngle),
  };
  const endRight = {
    x: arcGeometry.center.x + rightRadius * Math.cos(arcGeometry.endAngle),
    y: arcGeometry.center.y + rightRadius * Math.sin(arcGeometry.endAngle),
  };

  return {
    start,
    end,
    startDirection,
    endDirection,
    startPerp,
    endPerp,
    half,
    alignmentShift,
    startLeft,
    startRight,
    endLeft,
    endRight,
  };
};

const getEdgeDirection = (ref: EndpointRef): Point =>
  ref.endpoint === 'start' ? ref.geometry.startDirection : ref.geometry.endDirection;

const getDirectionAngle = (ref: EndpointRef): number => {
  const dir = getEdgeDirection(ref);
  return Math.atan2(dir.y, dir.x);
};

const getBasePoint = (ref: EndpointRef, side: Side): Point =>
  ref.endpoint === 'start'
    ? side === 'left'
      ? ref.geometry.startLeft
      : ref.geometry.startRight
    : side === 'left'
      ? ref.geometry.endLeft
      : ref.geometry.endRight;

const intersectLines = (p1: Point, d1: Point, p2: Point, d2: Point): Point | null => {
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < EPSILON) {
    return null;
  }
  const diffX = p2.x - p1.x;
  const diffY = p2.y - p1.y;
  const t = (diffX * d2.y - diffY * d2.x) / denom;
  const x = p1.x + d1.x * t;
  const y = p1.y + d1.y * t;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return { x, y };
};

const shouldUseIntersection = (intersection: Point | null, ref: EndpointRef) => {
  if (!intersection) {
    return false;
  }
  const distance = Math.hypot(intersection.x - ref.point.x, intersection.y - ref.point.y);
  const limit = Math.max(ref.geometry.half, 0.001) * MITER_LIMIT;
  return distance <= limit + EPSILON;
};

const assignJoinPoint = (
  joins: Record<string, WallJoinOverrides>,
  ref: EndpointRef,
  side: Side,
  point: Point
) => {
  const entry = joins[ref.wallId] ?? (joins[ref.wallId] = {});
  const cap = entry[ref.endpoint] ?? (entry[ref.endpoint] = {});
  cap[side] = point;
};

const assignSeamCover = (
  joins: Record<string, WallJoinOverrides>,
  ref: EndpointRef,
  polygon: Point[] | null
) => {
  if (!polygon || polygon.length < 3) {
    return;
  }
  const entry = joins[ref.wallId] ?? (joins[ref.wallId] = {});
  const cap = entry[ref.endpoint] ?? (entry[ref.endpoint] = {});
  cap.seamCover = polygon;
};

const markEndpointConnected = (joins: Record<string, WallJoinOverrides>, ref: EndpointRef) => {
  const entry = joins[ref.wallId] ?? (joins[ref.wallId] = {});
  const cap = entry[ref.endpoint] ?? (entry[ref.endpoint] = {});
  cap.connected = true;
};

const solveJoinBetweenFaces = (
  joins: Record<string, WallJoinOverrides>,
  a: EndpointRef,
  sideA: Side,
  b: EndpointRef,
  sideB: Side
) => {
  const aBase = getBasePoint(a, sideA);
  const bBase = getBasePoint(b, sideB);
  const aDir = getEdgeDirection(a);
  const bDir = getEdgeDirection(b);
  const intersection = intersectLines(aBase, aDir, bBase, bDir);

  // Check if both walls are arcs with valid intersections
  // If the miter creates extreme spikes, use a bevel join instead
  const aUseIntersection = shouldUseIntersection(intersection, a);
  const bUseIntersection = shouldUseIntersection(intersection, b);

  // If one side would use miter but the other wouldn't, use bevel for both
  // This creates a cleaner, more consistent join
  if (aUseIntersection !== bUseIntersection) {
    // Bevel join: use the midpoint between the two base points
    const bevelPoint = {
      x: (aBase.x + bBase.x) / 2,
      y: (aBase.y + bBase.y) / 2,
    };
    assignJoinPoint(joins, a, sideA, bevelPoint);
    assignJoinPoint(joins, b, sideB, bevelPoint);
    return;
  }

  const aPoint = aUseIntersection ? intersection! : aBase;
  const bPoint = bUseIntersection ? intersection! : bBase;

  assignJoinPoint(joins, a, sideA, aPoint);
  assignJoinPoint(joins, b, sideB, bPoint);
};

const getWallBounds = (wall: WallShape): BoundingBox => {
  if (!wall.centerline || wall.centerline.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  const xs = wall.centerline.map(p => p.x);
  const ys = wall.centerline.map(p => p.y);
  const padding = (wall.thickness || 0.2) * 2;
  return {
    minX: Math.min(...xs) - padding,
    maxX: Math.max(...xs) + padding,
    minY: Math.min(...ys) - padding,
    maxY: Math.max(...ys) + padding,
  };
};

export const computeWallJoins = (shapes: Shape[]): Record<string, WallJoinOverrides> => {
  const walls = shapes.filter((shape): shape is WallShape => shape.type === 'wall');

  // Create spatial index for O(1) neighbor lookups
  // Use 2m cell size as walls are typically 3-5m long
  const spatialIndex = new GridIndex<WallShape>({ cellSize: 2.0 });
  walls.forEach(wall => {
    spatialIndex.insert(wall, getWallBounds(wall));
  });

  const geometries: Record<string, WallGeometry> = {};
  const endpointGroups = new Map<string, EndpointRef[]>();
  const allEndpointRefs: EndpointRef[] = [];
  const refsByWallId = new Map<string, EndpointRef[]>();

  walls.forEach((wall) => {
    const geometry = buildGeometry(wall);
    if (!geometry) {
      return;
    }
    geometries[wall.id] = geometry;

    (['start', 'end'] as Endpoint[]).forEach((endpoint) => {
      const point = endpoint === 'start' ? geometry.start : geometry.end;
      const key = hashPoint(point);
      const ref: EndpointRef = {
        wallId: wall.id,
        endpoint,
        point,
        geometry,
      };
      allEndpointRefs.push(ref);

      if (!refsByWallId.has(wall.id)) {
        refsByWallId.set(wall.id, []);
      }
      refsByWallId.get(wall.id)!.push(ref);

      const refs = endpointGroups.get(key);
      if (refs) {
        refs.push(ref);
      } else {
        endpointGroups.set(key, [ref]);
      }
    });
  });

  const joins: Record<string, WallJoinOverrides> = {};
  const processedPairs = new Set<string>();

  // First, handle exact endpoint matches (traditional joins)
  endpointGroups.forEach((refs) => {
    if (refs.length === 2) {
      const [a, b] = refs;
      markEndpointConnected(joins, a);
      markEndpointConnected(joins, b);
      solveJoinBetweenFaces(joins, a, 'left', b, 'left');
      solveJoinBetweenFaces(joins, a, 'right', b, 'right');
      processedPairs.add(`${a.wallId}:${a.endpoint}|${b.wallId}:${b.endpoint}`);
      processedPairs.add(`${b.wallId}:${b.endpoint}|${a.wallId}:${a.endpoint}`);
      return;
    }

    if (refs.length < 2) {
      return;
    }

    refs.forEach((ref) => markEndpointConnected(joins, ref));
    const sorted = refs
      .map((ref) => ({ ref, angle: getDirectionAngle(ref) }))
      .sort((a, b) => a.angle - b.angle)
      .map((entry) => entry.ref);

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const next = sorted[(i + 1) % sorted.length];
      solveJoinBetweenFaces(joins, current, 'left', next, 'right');
      processedPairs.add(`${current.wallId}:${current.endpoint}|${next.wallId}:${next.endpoint}`);
    }
  });

  // Second, handle adjacent walls (walls connected via wall-extended snapping)
  // These are walls whose endpoints are separated by wall thickness
  for (let i = 0; i < allEndpointRefs.length; i++) {
    const refA = allEndpointRefs[i];
    const wallA = walls.find(w => w.id === refA.wallId);
    if (!wallA) continue;

    // Use spatial index to find nearby walls instead of iterating all
    const searchRadius = (wallA.thickness || 0.2) * 2;
    const queryBounds = {
      minX: refA.point.x - searchRadius,
      maxX: refA.point.x + searchRadius,
      minY: refA.point.y - searchRadius,
      maxY: refA.point.y + searchRadius
    };

    const candidates = spatialIndex.query(queryBounds);

    for (const wallB of candidates) {
      if (wallB.id === wallA.id) continue;

      const bRefs = refsByWallId.get(wallB.id) || [];
      for (const refB of bRefs) {
        const pairKey1 = `${refA.wallId}:${refA.endpoint}|${refB.wallId}:${refB.endpoint}`;
        const pairKey2 = `${refB.wallId}:${refB.endpoint}|${refA.wallId}:${refA.endpoint}`;
        if (processedPairs.has(pairKey1) || processedPairs.has(pairKey2)) continue;

        // Calculate distance between endpoints
        const dist = Math.hypot(refA.point.x - refB.point.x, refA.point.y - refB.point.y);

        // Check if endpoints are separated by approximately wall thickness
        const thicknessA = wallA.thickness || 0.1524;
        const thicknessB = wallB.thickness || 0.1524;
        const maxThickness = Math.max(thicknessA, thicknessB);
        const minThickness = Math.min(thicknessA, thicknessB) / 2;

        // Adjacent walls: distance is between minThickness/2 and maxThickness * 1.2
        if (dist >= minThickness * 0.4 && dist <= maxThickness * 1.2) {
          // Check if walls are roughly perpendicular
          const dirA = getEdgeDirection(refA);
          const dirB = getEdgeDirection(refB);
          const dotProduct = Math.abs(dirA.x * dirB.x + dirA.y * dirB.y);

          if (dotProduct < 0.3) {
            // Adjacent perpendicular walls - extend both walls to meet at corner
            markEndpointConnected(joins, refA);
            markEndpointConnected(joins, refB);

            // Get the base points (edge corners) of each wall at this endpoint
            const aLeft = getBasePoint(refA, 'left');
            const aRight = getBasePoint(refA, 'right');
            const bLeft = getBasePoint(refB, 'left');
            const bRight = getBasePoint(refB, 'right');

            // Find which corners are closest - those should meet
            const distALeftBLeft = Math.hypot(aLeft.x - bLeft.x, aLeft.y - bLeft.y);
            const distALeftBRight = Math.hypot(aLeft.x - bRight.x, aLeft.y - bRight.y);
            const distARightBLeft = Math.hypot(aRight.x - bLeft.x, aRight.y - bLeft.y);
            const distARightBRight = Math.hypot(aRight.x - bRight.x, aRight.y - bRight.y);

            // Find the two closest corner pairs
            const distances = [
              { dist: distALeftBLeft, aSide: 'left' as Side, bSide: 'left' as Side },
              { dist: distALeftBRight, aSide: 'left' as Side, bSide: 'right' as Side },
              { dist: distARightBLeft, aSide: 'right' as Side, bSide: 'left' as Side },
              { dist: distARightBRight, aSide: 'right' as Side, bSide: 'right' as Side },
            ].sort((a, b) => a.dist - b.dist);

            // The two closest pairs should be extended to meet
            // Use the first (closest) pair - extend both to the midpoint
            const closest = distances[0];
            const aCorner = closest.aSide === 'left' ? aLeft : aRight;
            const bCorner = closest.bSide === 'left' ? bLeft : bRight;

            // Calculate intersection of the wall edges
            const aDir = getEdgeDirection(refA);
            const bDir = getEdgeDirection(refB);
            const intersection = intersectLines(aCorner, aDir, bCorner, bDir);

            if (intersection) {
              // Extend both walls to meet at the intersection
              assignJoinPoint(joins, refA, closest.aSide, intersection);
              assignJoinPoint(joins, refB, closest.bSide, intersection);
            } else {
              // Fallback: use midpoint between corners
              const midpoint = {
                x: (aCorner.x + bCorner.x) / 2,
                y: (aCorner.y + bCorner.y) / 2,
              };
              assignJoinPoint(joins, refA, closest.aSide, midpoint);
              assignJoinPoint(joins, refB, closest.bSide, midpoint);
            }

            // Handle the second closest pair (opposite corners)
            const secondClosest = distances[1];
            if (secondClosest.aSide !== closest.aSide && secondClosest.bSide !== closest.bSide) {
              const aCorner2 = secondClosest.aSide === 'left' ? aLeft : aRight;
              const bCorner2 = secondClosest.bSide === 'left' ? bLeft : bRight;
              const intersection2 = intersectLines(aCorner2, aDir, bCorner2, bDir);

              if (intersection2) {
                assignJoinPoint(joins, refA, secondClosest.aSide, intersection2);
                assignJoinPoint(joins, refB, secondClosest.bSide, intersection2);
              }
            }

            processedPairs.add(pairKey1);
          }
        }
      }
    }
  }

  // Third, handle T-junctions: walls whose endpoint lies ON another wall's centerline segment
  // (not at the endpoints). This is the "wall terminating into another wall" case.
  const tJunctions: TJunctionInfo[] = [];

  // Detect all T-junctions
  for (const terminatingRef of allEndpointRefs) {
    // Skip if this endpoint is already connected (L-join or adjacent)
    const existingJoin = joins[terminatingRef.wallId]?.[terminatingRef.endpoint];
    if (existingJoin?.connected) {
      continue;
    }

    const terminatingWall = walls.find(w => w.id === terminatingRef.wallId);
    if (!terminatingWall) continue;

    // Use spatial index to find candidate through-walls
    // We need to check walls that might intersect with the terminating endpoint
    // plus a small radius (T_JUNCTION_THRESHOLD + max possible wall thickness/2)
    const maxWallThickness = 0.5; // Conservative estimate
    const searchRadius = T_JUNCTION_THRESHOLD + maxWallThickness;
    const queryBounds = {
      minX: terminatingRef.point.x - searchRadius,
      maxX: terminatingRef.point.x + searchRadius,
      minY: terminatingRef.point.y - searchRadius,
      maxY: terminatingRef.point.y + searchRadius
    };

    const candidates = spatialIndex.query(queryBounds);

    for (const throughWall of candidates) {
      if (throughWall.id === terminatingRef.wallId) continue;
      if (!throughWall.centerline || throughWall.centerline.length < 2) continue;

      const throughGeometry = geometries[throughWall.id];
      if (!throughGeometry) continue;

      // Project the terminating endpoint onto the through wall's centerline
      const throughStart = throughWall.centerline[0];
      const throughEnd = throughWall.centerline[throughWall.centerline.length - 1];
      const projection = projectPointOnSegment(terminatingRef.point, throughStart, throughEnd);

      // Check if:
      // 1. The point is close enough to the centerline (within threshold)
      // 2. The projection is NOT at the endpoints (t is between 0.01 and 0.99)
      //    This distinguishes T-junctions from L-junctions
      if (
        projection.distance < T_JUNCTION_THRESHOLD + throughWall.thickness / 2 &&
        projection.t > 0.01 &&
        projection.t < 0.99
      ) {
        tJunctions.push({
          throughWallId: throughWall.id,
          throughWallGeometry: throughGeometry,
          terminatingWallId: terminatingRef.wallId,
          terminatingEndpoint: terminatingRef.endpoint,
          terminatingGeometry: terminatingRef.geometry,
          connectionPoint: projection.point,
          connectionT: projection.t,
        });
      }
    }
  }

  // Process T-junctions: clip the terminating wall to meet the through wall's edges
  for (const tJunction of tJunctions) {
    const {
      throughWallGeometry,
      terminatingWallId,
      terminatingEndpoint,
      terminatingGeometry,
      connectionPoint,
    } = tJunction;

    // Get the terminating wall's edge direction at the junction endpoint
    const termDirection = terminatingEndpoint === 'start'
      ? terminatingGeometry.startDirection
      : terminatingGeometry.endDirection;

    // Get the through wall's perpendicular (normal) direction
    // This defines the direction of the through wall's edges
    const throughDirection = normalize(
      throughWallGeometry.end.x - throughWallGeometry.start.x,
      throughWallGeometry.end.y - throughWallGeometry.start.y
    );
    const throughPerp = perpendicular(throughDirection.x, throughDirection.y);

    // Calculate the through wall's left and right edge positions at the connection point
    const throughHalf = throughWallGeometry.half;
    const throughAlignmentShift = throughWallGeometry.alignmentShift;

    const throughLeftEdgePoint = {
      x: connectionPoint.x + throughPerp.x * (throughAlignmentShift + throughHalf),
      y: connectionPoint.y + throughPerp.y * (throughAlignmentShift + throughHalf),
    };
    const throughRightEdgePoint = {
      x: connectionPoint.x + throughPerp.x * (throughAlignmentShift - throughHalf),
      y: connectionPoint.y + throughPerp.y * (throughAlignmentShift - throughHalf),
    };

    // Get the terminating wall's corner points at this endpoint
    const termLeft = terminatingEndpoint === 'start'
      ? terminatingGeometry.startLeft
      : terminatingGeometry.endLeft;
    const termRight = terminatingEndpoint === 'start'
      ? terminatingGeometry.startRight
      : terminatingGeometry.endRight;

    // Calculate where the terminating wall's edges intersect with the through wall's edges
    // The through wall's edges run parallel to throughDirection, passing through throughLeftEdgePoint and throughRightEdgePoint

    // Find intersection of terminating left edge with through wall edges
    const termLeftIntersectLeft = intersectLines(termLeft, termDirection, throughLeftEdgePoint, throughDirection);
    const termLeftIntersectRight = intersectLines(termLeft, termDirection, throughRightEdgePoint, throughDirection);

    // Find intersection of terminating right edge with through wall edges
    const termRightIntersectLeft = intersectLines(termRight, termDirection, throughLeftEdgePoint, throughDirection);
    const termRightIntersectRight = intersectLines(termRight, termDirection, throughRightEdgePoint, throughDirection);

    // Determine which through wall edge each terminating edge should connect to
    // We want to find the intersection that is:
    // 1. Valid (not null)
    // 2. Closest to the original terminating corner (along the termination direction)
    // 3. Actually on or beyond the through wall (not before it)

    const selectBestIntersection = (
      corner: Point,
      direction: Point,
      intersect1: Point | null,
      intersect2: Point | null
    ): Point | null => {
      const candidates: { point: Point; distAlongDir: number }[] = [];

      if (intersect1) {
        const dx = intersect1.x - corner.x;
        const dy = intersect1.y - corner.y;
        const distAlongDir = dx * direction.x + dy * direction.y;
        // Only consider intersections in the direction we're going (positive dist for start, negative for end)
        candidates.push({ point: intersect1, distAlongDir: Math.abs(distAlongDir) });
      }

      if (intersect2) {
        const dx = intersect2.x - corner.x;
        const dy = intersect2.y - corner.y;
        const distAlongDir = dx * direction.x + dy * direction.y;
        candidates.push({ point: intersect2, distAlongDir: Math.abs(distAlongDir) });
      }

      if (candidates.length === 0) return null;

      // Return the closest intersection
      candidates.sort((a, b) => a.distAlongDir - b.distAlongDir);
      return candidates[0].point;
    };

    const newLeftCorner = selectBestIntersection(termLeft, termDirection, termLeftIntersectLeft, termLeftIntersectRight);
    const newRightCorner = selectBestIntersection(termRight, termDirection, termRightIntersectLeft, termRightIntersectRight);

    // Apply the new corner positions
    const termRef: EndpointRef = {
      wallId: terminatingWallId,
      endpoint: terminatingEndpoint,
      point: terminatingEndpoint === 'start' ? terminatingGeometry.start : terminatingGeometry.end,
      geometry: terminatingGeometry,
    };

    if (newLeftCorner) {
      assignJoinPoint(joins, termRef, 'left', newLeftCorner);
    }
    if (newRightCorner) {
      assignJoinPoint(joins, termRef, 'right', newRightCorner);
    }

    if (newLeftCorner && newRightCorner) {
      const seamHalfLength = Math.max(
        Math.min(terminatingGeometry.half, throughWallGeometry.half) * 0.9,
        0.04
      );
      const seamPolygon = createSeamCoverPolygon(
        throughLeftEdgePoint,
        throughRightEdgePoint,
        throughDirection,
        seamHalfLength
      );
      assignSeamCover(joins, termRef, seamPolygon);
    }

    // Mark the terminating endpoint as connected (hides the end cap line)
    markEndpointConnected(joins, termRef);

    // Note: Junction cover approach disabled - white covers create visible gaps
    // The T-junction geometry is correctly clipped. A thin stroke line may be visible
    // at junctions, which is less disruptive than white gaps.
    // 
    // For a perfect solution, we would need to implement one of:
    // 1. Layered rendering (all fills first, then all strokes)
    // 2. Stroke gap rendering (modify through wall to skip stroke at junctions)
    // 3. Boolean union of all wall polygons
  }

  return joins;
};

interface CenterlineDescriptor {
  points: Point[];
  arcCenter?: Point;
  arcOrientation?: 1 | -1;
}

const buildCenterlineDescriptor = (wall: WallShape): CenterlineDescriptor | null => {
  if (!wall.centerline || wall.centerline.length < 2) {
    return null;
  }
  const start = wall.centerline[0];
  const end = wall.centerline[wall.centerline.length - 1];

  if (!wall.controlPoint) {
    return { points: [start, end] };
  }

  const arcGeometry = calculateArcGeometry(start, end, wall.controlPoint);
  if (arcGeometry.isLine) {
    return { points: [start, end] };
  }

  let sweepAngle = arcGeometry.endAngle - arcGeometry.startAngle;
  if (arcGeometry.isCCW && sweepAngle < 0) sweepAngle += 2 * Math.PI;
  if (!arcGeometry.isCCW && sweepAngle > 0) sweepAngle -= 2 * Math.PI;
  const segments = Math.max(32, Math.ceil(Math.abs(sweepAngle) * 64));
  const angleStep = sweepAngle / segments;

  const samples: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = arcGeometry.startAngle + angleStep * i;
    samples.push({
      x: arcGeometry.center.x + arcGeometry.radius * Math.cos(angle),
      y: arcGeometry.center.y + arcGeometry.radius * Math.sin(angle),
    });
  }
  return {
    points: samples,
    arcCenter: arcGeometry.center,
    arcOrientation: arcGeometry.isCCW ? 1 : -1,
  };
};

export const getWallRenderGeometry = (wall: WallShape, joins?: WallJoinOverrides): WallRenderGeometry | null => {
  const descriptor = buildCenterlineDescriptor(wall);
  if (!descriptor || descriptor.points.length < 2) {
    return null;
  }
  const centerline = descriptor.points;
  const half = wall.thickness / 2;
  let alignmentShift = 0;
  if (wall.alignment === 'inside') {
    alignmentShift = half;
  } else if (wall.alignment === 'outside') {
    alignmentShift = -half;
  }

  const leftEdge: Point[] = [];
  const rightEdge: Point[] = [];

  for (let i = 0; i < centerline.length; i++) {
    const point = centerline[i];
    const prev = centerline[Math.max(i - 1, 0)];
    const next = centerline[Math.min(i + 1, centerline.length - 1)];
    const tangentVec = {
      x: next.x - prev.x,
      y: next.y - prev.y,
    };
    const tangent = normalize(tangentVec.x, tangentVec.y);
    if (!Number.isFinite(tangent.x) || !Number.isFinite(tangent.y)) {
      return null;
    }
    const baseNormal = perpendicular(tangent.x, tangent.y);
    const normal = baseNormal;

    leftEdge.push({
      x: point.x + normal.x * (alignmentShift + half),
      y: point.y + normal.y * (alignmentShift + half),
    });
    rightEdge.push({
      x: point.x + normal.x * (alignmentShift - half),
      y: point.y + normal.y * (alignmentShift - half),
    });
  }

  if (joins?.start?.left) leftEdge[0] = joins.start.left;
  if (joins?.start?.right) rightEdge[0] = joins.start.right;
  if (joins?.end?.left) leftEdge[leftEdge.length - 1] = joins.end.left;
  if (joins?.end?.right) rightEdge[rightEdge.length - 1] = joins.end.right;

  const polygon = [...leftEdge, ...rightEdge.slice().reverse()];

  return {
    polygon,
    leftEdge,
    rightEdge,
    startCap: [rightEdge[0], leftEdge[0]],
    endCap: [
      leftEdge[leftEdge.length - 1],
      rightEdge[rightEdge.length - 1],
    ],
  };
};

export const getWallPolygonPoints = (wall: WallShape, joins?: WallJoinOverrides): Point[] => {
  const geometry = getWallRenderGeometry(wall, joins);
  return geometry ? geometry.polygon : [];
};

export const getWallBoundingBox = (wall: WallShape, joins?: WallJoinOverrides) => {
  const polygon = getWallPolygonPoints(wall, joins);
  if (!polygon.length) {
    return null;
  }
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export const pointInPolygon = (point: Point, polygon: Point[]): boolean => {
  if (polygon.length < 3) return false;

  let inside = false;
  const { x, y } = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
};

/**
 * Find all closed loops formed by connected walls
 */
export const findClosedWallLoops = (shapes: Shape[]): { wallIds: string[]; polygon: Point[] }[] => {
  const walls = shapes.filter((shape): shape is WallShape => shape.type === 'wall');
  const pointKey = (point: Point) => `${point.x.toFixed(3)}:${point.y.toFixed(3)}`;

  const adjacency = new Map<string, { point: Point; walls: { id: string; pointIndex: number }[] }>();

  const addNode = (point: Point, wallId: string, pointIndex: number) => {
    const key = pointKey(point);
    let entry = adjacency.get(key);
    if (!entry) {
      entry = { point, walls: [] };
      adjacency.set(key, entry);
    }
    entry.walls.push({ id: wallId, pointIndex });
  };

  walls.forEach((wall) => {
    wall.centerline.forEach((point, index) => {
      addNode(point, wall.id, index);
    });
  });

  const visitedEdges = new Set<string>();
  const loops: { wallIds: string[]; polygon: Point[] }[] = [];

  const makeEdgeKey = (wallId: string, fromIndex: number) => `${wallId}:${fromIndex}`;

  walls.forEach((wall) => {
    for (let i = 0; i < wall.centerline.length - 1; i += 1) {
      const edgeKey = makeEdgeKey(wall.id, i);
      if (visitedEdges.has(edgeKey)) continue;

      const loopWallIds: string[] = [];
      const polygon: Point[] = [];
      let currentWall = wall;
      let currentIndex = i;
      let safety = 0;

      while (safety < 500) {
        safety += 1;
        const nextEdgeKey = makeEdgeKey(currentWall.id, currentIndex);
        if (visitedEdges.has(nextEdgeKey)) break;
        visitedEdges.add(nextEdgeKey);
        loopWallIds.push(currentWall.id);
        const descriptor = buildCenterlineDescriptor(currentWall);
        if (descriptor && descriptor.points.length > 0) {
          // For arcs, we need to include the intermediate points
          // We exclude the last point because it will be the start of the next wall
          // (or the closing point of the loop)
          for (let k = 0; k < descriptor.points.length - 1; k++) {
            polygon.push(descriptor.points[k]);
          }
        } else {
          polygon.push(currentWall.centerline[currentIndex]);
        }

        const endPoint = currentWall.centerline[currentIndex + 1];
        const endKey = pointKey(endPoint);
        const adjacencyEntry = adjacency.get(endKey);
        if (!adjacencyEntry) break;

        const nextCandidates = adjacencyEntry.walls.filter((candidate) => candidate.id !== currentWall.id);
        if (nextCandidates.length === 0) {
          polygon.push(endPoint);
          break;
        }

        const nextCandidate = nextCandidates[0];
        const nextWall = walls.find((w) => w.id === nextCandidate.id);
        if (!nextWall) break;

        if (nextCandidate.pointIndex === 0) {
          currentWall = nextWall;
          currentIndex = 0;
        } else if (nextCandidate.pointIndex === nextWall.centerline.length - 1) {
          nextWall.centerline.reverse();
          currentWall = nextWall;
          currentIndex = 0;
        } else {
          break;
        }

        if (pointKey(currentWall.centerline[currentIndex]) === pointKey(polygon[0])) {
          polygon.push(currentWall.centerline[currentIndex]);
          break;
        }
      }

      if (polygon.length >= 4 && pointKey(polygon[0]) === pointKey(polygon[polygon.length - 1])) {
        loops.push({
          wallIds: Array.from(new Set(loopWallIds)),
          polygon,
        });
      }
    }
  });

  return loops;
};

/**
 * Find the closed wall loop that contains a given point.
 * Returns the loop polygon and wall IDs if found, null otherwise.
 */
export const findEnclosingWallLoop = (
  point: Point,
  shapes: Shape[]
): { wallIds: string[]; polygon: Point[] } | null => {
  const loops = findClosedWallLoops(shapes);

  // Find which loop contains the point
  // If multiple loops contain the point (nested), return the smallest one (innermost)
  let bestLoop: { wallIds: string[]; polygon: Point[] } | null = null;
  let bestArea = Infinity;

  for (const loop of loops) {
    if (pointInPolygon(point, loop.polygon)) {
      // Calculate area to find smallest enclosing loop
      let area = 0;
      for (let i = 0, j = loop.polygon.length - 1; i < loop.polygon.length; j = i++) {
        area += (loop.polygon[j].x + loop.polygon[i].x) * (loop.polygon[j].y - loop.polygon[i].y);
      }
      area = Math.abs(area / 2);

      if (area < bestArea) {
        bestArea = area;
        bestLoop = loop;
      }
    }
  }

  return bestLoop;
};

/**
 * A single merged wall polygon with its associated holes
 */
export interface MergedWallPolygon {
  /** Outer boundary of this wall group */
  outer: Point[];
  /** Holes (interior spaces) within this wall group */
  holes: Point[][];
}

/**
 * Merged wall geometry result from boolean union
 */
export interface MergedWallGeometry {
  /** All merged wall polygons, each with its outer boundary and holes */
  polygons: MergedWallPolygon[];
  /** Outer polygons (exterior rings) - for fill and outer stroke (backward compat) */
  outerPolygons: Point[][];
  /** Inner polygons (holes) - areas inside walls that should not be filled (backward compat) */
  innerPolygons: Point[][];
  /** All wall IDs that were merged */
  wallIds: string[];
}

/**
 * Convert Point array to polygon-clipping format
 */
const pointsToRing = (points: Point[]): [number, number][] => {
  return points.map(p => [p.x, p.y] as [number, number]);
};

/**
 * Convert polygon-clipping ring back to Point array
 */
const ringToPoints = (ring: [number, number][]): Point[] => {
  return ring.map(([x, y]) => ({ x, y }));
};

/**
 * Compute the boolean union of all wall polygons
 * This merges overlapping walls into single continuous shapes,
 * eliminating internal edges at T-junctions and L-junctions.
 */
export const computeWallUnion = (
  shapes: Shape[],
  joins: Record<string, WallJoinOverrides>
): MergedWallGeometry => {
  const walls = shapes.filter((shape): shape is WallShape => shape.type === 'wall');
  const wallIds: string[] = [];

  if (walls.length === 0) {
    return { polygons: [], outerPolygons: [], innerPolygons: [], wallIds: [] };
  }

  // Collect all wall polygons
  const wallPolygons: [number, number][][] = [];

  for (const wall of walls) {
    const geometry = getWallRenderGeometry(wall, joins[wall.id]);
    if (geometry && geometry.polygon.length >= 3) {
      wallIds.push(wall.id);
      // Ensure polygon is closed (first point == last point) for polygon-clipping
      const ring = pointsToRing(geometry.polygon);
      // Close the ring if not already closed
      if (ring.length > 0) {
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          ring.push([first[0], first[1]]);
        }
      }
      wallPolygons.push(ring);
    }
  }

  if (wallPolygons.length === 0) {
    return { polygons: [], outerPolygons: [], innerPolygons: [], wallIds: [] };
  }

  // Start with the first polygon
  let result: [number, number][][][] = [[wallPolygons[0]]];

  // Union each subsequent polygon
  for (let i = 1; i < wallPolygons.length; i++) {
    try {
      result = polygonClipping.union(result, [[wallPolygons[i]]]);
    } catch (e) {
      // If union fails for a polygon, skip it (might be degenerate)
      console.warn('Wall polygon union failed for wall', wallIds[i], e);
    }
  }

  // Convert result back to Point arrays
  // Each multiPolygon has [outerRing, hole1, hole2, ...]
  const polygons: MergedWallPolygon[] = [];
  const outerPolygons: Point[][] = [];
  const innerPolygons: Point[][] = [];

  for (const multiPolygon of result) {
    // First ring is the outer boundary
    if (multiPolygon.length > 0) {
      const outer = ringToPoints(multiPolygon[0]);
      const holes: Point[][] = [];

      outerPolygons.push(outer);

      // Subsequent rings are holes belonging to THIS outer polygon
      for (let i = 1; i < multiPolygon.length; i++) {
        const hole = ringToPoints(multiPolygon[i]);
        holes.push(hole);
        innerPolygons.push(hole);
      }

      polygons.push({ outer, holes });
    }
  }

  return { polygons, outerPolygons, innerPolygons, wallIds };
};
