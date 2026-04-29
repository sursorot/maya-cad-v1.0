/**
 * Polygon Clipping Utilities
 * 
 * Implements algorithms for clipping light patches against wall shadow volumes.
 * Uses Sutherland-Hodgman algorithm for polygon clipping.
 */

import type { Point2D, WallForSunlight, SunPosition } from './sunlightTypes';

const EPSILON = 1e-10;

/**
 * Calculate cross product of vectors OA and OB (2D, returns scalar z-component)
 */
function cross(o: Point2D, a: Point2D, b: Point2D): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Check if point is on the left side of a directed line from p1 to p2.
 * Returns positive if left, negative if right, 0 if on line.
 */
function sideOfLine(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
  return cross(lineStart, lineEnd, point);
}

/**
 * Calculate intersection point of two line segments.
 * Returns null if lines are parallel.
 */
function lineIntersection(
  p1: Point2D, p2: Point2D,  // First line
  p3: Point2D, p4: Point2D   // Second line (clipping edge)
): Point2D | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;

  const denom = d1x * d2y - d1y * d2x;

  if (Math.abs(denom) < EPSILON) {
    return null; // Lines are parallel
  }

  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;

  return {
    x: p1.x + t * d1x,
    y: p1.y + t * d1y,
  };
}

/**
 * Sutherland-Hodgman polygon clipping algorithm.
 * Clips a polygon against a convex clipping polygon.
 * 
 * @param subjectPolygon - The polygon to be clipped
 * @param clipPolygon - The convex clipping region (vertices in CCW order)
 * @returns Clipped polygon, or empty array if completely outside
 */
export function clipPolygonAgainstConvex(
  subjectPolygon: Point2D[],
  clipPolygon: Point2D[]
): Point2D[] {
  if (subjectPolygon.length < 3 || clipPolygon.length < 3) {
    return [];
  }

  let outputList = [...subjectPolygon];

  // Process each edge of the clip polygon
  for (let i = 0; i < clipPolygon.length; i++) {
    if (outputList.length === 0) {
      return [];
    }

    const inputList = outputList;
    outputList = [];

    const edgeStart = clipPolygon[i];
    const edgeEnd = clipPolygon[(i + 1) % clipPolygon.length];

    for (let j = 0; j < inputList.length; j++) {
      const current = inputList[j];
      const previous = inputList[(j + inputList.length - 1) % inputList.length];

      const currentInside = sideOfLine(current, edgeStart, edgeEnd) >= -EPSILON;
      const previousInside = sideOfLine(previous, edgeStart, edgeEnd) >= -EPSILON;

      if (currentInside) {
        if (!previousInside) {
          // Entering: add intersection point
          const intersection = lineIntersection(previous, current, edgeStart, edgeEnd);
          if (intersection) {
            outputList.push(intersection);
          }
        }
        // Add current point
        outputList.push(current);
      } else if (previousInside) {
        // Leaving: add intersection point
        const intersection = lineIntersection(previous, current, edgeStart, edgeEnd);
        if (intersection) {
          outputList.push(intersection);
        }
      }
    }
  }

  return outputList;
}

/**
 * Subtract a convex polygon from another polygon using clipping.
 * This is used to remove shadow regions from light patches.
 * 
 * Note: This is a simplified version that clips against the shadow region.
 * For complex cases, the result may be multiple polygons.
 * 
 * @param polygon - The original polygon (light patch)
 * @param shadowRegion - The convex shadow region to subtract
 * @returns Array of resulting polygons after subtraction
 */
export function subtractConvexFromPolygon(
  polygon: Point2D[],
  shadowRegion: Point2D[]
): Point2D[][] {
  if (polygon.length < 3 || shadowRegion.length < 3) {
    return [polygon];
  }

  // Check if polygons intersect at all
  const intersection = clipPolygonAgainstConvex(polygon, shadowRegion);

  if (intersection.length < 3) {
    // No intersection - return original polygon
    return [polygon];
  }

  // For a proper subtraction, we need to find the parts of the polygon
  // that are OUTSIDE the shadow region. 
  // We do this by clipping against the complement of each shadow edge.

  // Simplified approach: clip against the "inverse" half-planes
  // This works well for convex light patches being cut by walls

  const results: Point2D[][] = [];

  // For each edge of the shadow region, try clipping to keep the outside
  for (let i = 0; i < shadowRegion.length; i++) {
    const edgeStart = shadowRegion[i];
    const edgeEnd = shadowRegion[(i + 1) % shadowRegion.length];

    // Create a clipping region that keeps everything on the OUTSIDE of this edge
    // We do this by creating a large half-plane on the outside
    const outsideClip = createOutsideHalfPlane(edgeStart, edgeEnd, polygon);

    const clipped = clipPolygonAgainstConvex(polygon, outsideClip);
    if (clipped.length >= 3) {
      // Check this piece doesn't overlap with shadow
      const overlapCheck = clipPolygonAgainstConvex(clipped, shadowRegion);
      if (overlapCheck.length < 3 || polygonArea(overlapCheck) < EPSILON) {
        results.push(clipped);
      }
    }
  }

  // If no results from edge clipping, the shadow might be entirely inside
  // In this case, we need to handle the "donut" case - but for simplicity
  // we'll just return the original minus the intersection
  if (results.length === 0 && intersection.length >= 3) {
    // Create a more complex subtraction using polygon difference
    const diff = computePolygonDifference(polygon, shadowRegion);
    if (diff.length > 0) {
      return diff;
    }
    // Fallback: return original (shadow is too small to matter)
    return [polygon];
  }

  return results.length > 0 ? results : [polygon];
}

/**
 * Create a half-plane clipping region on the outside of an edge.
 */
function createOutsideHalfPlane(
  edgeStart: Point2D,
  edgeEnd: Point2D,
  boundingPolygon: Point2D[]
): Point2D[] {
  // Find bounding box of the polygon
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const p of boundingPolygon) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  // Expand bounds significantly
  const expand = Math.max(maxX - minX, maxY - minY) * 2;
  minX -= expand;
  maxX += expand;
  minY -= expand;
  maxY += expand;

  // Direction along edge
  const dx = edgeEnd.x - edgeStart.x;
  const dy = edgeEnd.y - edgeStart.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < EPSILON) {
    return [];
  }

  // Outward normal (perpendicular, pointing left of edge direction)
  // For CCW shadow region, "outside" is to the right, so we use -normal
  const nx = dy / len;
  const ny = -dx / len;

  // Create a large rectangle on the outside of the edge
  const offset = expand;

  return [
    { x: edgeStart.x - nx * offset, y: edgeStart.y - ny * offset },
    { x: edgeEnd.x - nx * offset, y: edgeEnd.y - ny * offset },
    { x: edgeEnd.x - nx * offset + dx * 0.5, y: edgeEnd.y - ny * offset + dy * 0.5 },
    { x: edgeStart.x - nx * offset - dx * 0.5, y: edgeStart.y - ny * offset - dy * 0.5 },
  ];
}

/**
 * Compute polygon difference (polygon - shadow).
 * For convex polygons, this can result in 0, 1, or 2 result polygons.
 */
function computePolygonDifference(
  polygon: Point2D[],
  shadow: Point2D[]
): Point2D[][] {
  // Find all intersection points between polygon edges and shadow edges
  const intersections: Array<{ point: Point2D; polyEdge: number; shadowEdge: number }> = [];

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    for (let j = 0; j < shadow.length; j++) {
      const s1 = shadow[j];
      const s2 = shadow[(j + 1) % shadow.length];

      const intersection = segmentIntersection(p1, p2, s1, s2);
      if (intersection) {
        intersections.push({ point: intersection, polyEdge: i, shadowEdge: j });
      }
    }
  }

  if (intersections.length < 2) {
    // Either no intersection or tangent - return original
    return [polygon];
  }

  // Sort intersections by polygon edge, then by position along edge
  intersections.sort((a, b) => {
    if (a.polyEdge !== b.polyEdge) return a.polyEdge - b.polyEdge;
    const p1 = polygon[a.polyEdge];
    const distA = Math.hypot(a.point.x - p1.x, a.point.y - p1.y);
    const distB = Math.hypot(b.point.x - p1.x, b.point.y - p1.y);
    return distA - distB;
  });

  // Build result polygons by tracing
  const results: Point2D[][] = [];
  const used = new Set<number>();

  for (let startIdx = 0; startIdx < intersections.length; startIdx++) {
    if (used.has(startIdx)) continue;

    const result: Point2D[] = [];
    let currentIdx = startIdx;
    let onPolygon = true;
    let iterations = 0;
    const maxIterations = polygon.length + shadow.length + intersections.length;

    while (iterations++ < maxIterations) {
      const current = intersections[currentIdx];
      result.push({ ...current.point });
      used.add(currentIdx);

      if (onPolygon) {
        // Trace along polygon until next intersection
        let nextPolyEdge = current.polyEdge;
        let foundNext = false;

        for (let step = 0; step < polygon.length && !foundNext; step++) {
          nextPolyEdge = (nextPolyEdge + 1) % polygon.length;

          // Add polygon vertex if it's outside shadow
          const vertex = polygon[nextPolyEdge];
          if (!isPointInConvexPolygon(vertex, shadow)) {
            result.push({ ...vertex });
          }

          // Check for next intersection on this edge
          for (let i = 0; i < intersections.length; i++) {
            if (intersections[i].polyEdge === nextPolyEdge && !used.has(i)) {
              currentIdx = i;
              foundNext = true;
              break;
            }
          }
        }

        if (!foundNext) break;
        onPolygon = false;
      } else {
        // Trace along shadow boundary (but outside polygon) until next intersection
        let nextShadowEdge = current.shadowEdge;
        let foundNext = false;

        for (let step = 0; step < shadow.length && !foundNext; step++) {
          nextShadowEdge = (nextShadowEdge + 1) % shadow.length;

          // Check for next intersection on this shadow edge
          for (let i = 0; i < intersections.length; i++) {
            if (intersections[i].shadowEdge === nextShadowEdge && !used.has(i)) {
              currentIdx = i;
              foundNext = true;
              break;
            }
          }
        }

        if (!foundNext) break;
        onPolygon = true;
      }

      if (currentIdx === startIdx) break;
    }

    if (result.length >= 3) {
      results.push(result);
    }
  }

  return results.length > 0 ? results : [polygon];
}

/**
 * Find intersection point of two line segments.
 * Returns null if segments don't intersect.
 */
function segmentIntersection(
  p1: Point2D, p2: Point2D,
  p3: Point2D, p4: Point2D
): Point2D | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;

  const denom = d1x * d2y - d1y * d2x;

  if (Math.abs(denom) < EPSILON) {
    return null;
  }

  const t1 = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const t2 = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;

  // Check if intersection is within both segments
  if (t1 >= -EPSILON && t1 <= 1 + EPSILON && t2 >= -EPSILON && t2 <= 1 + EPSILON) {
    return {
      x: p1.x + t1 * d1x,
      y: p1.y + t1 * d1y,
    };
  }

  return null;
}

/**
 * Check if a point is inside a convex polygon.
 */
function isPointInConvexPolygon(point: Point2D, polygon: Point2D[]): boolean {
  if (polygon.length < 3) return false;

  let sign = 0;

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const side = sideOfLine(point, p1, p2);

    if (Math.abs(side) < EPSILON) continue;

    if (sign === 0) {
      sign = side > 0 ? 1 : -1;
    } else if ((side > 0 ? 1 : -1) !== sign) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate area of a polygon (signed, positive for CCW).
 */
export function polygonArea(polygon: Point2D[]): number {
  if (polygon.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    area += p1.x * p2.y - p2.x * p1.y;
  }

  return Math.abs(area) / 2;
}

/**
 * Calculate the shadow region cast by a wall segment given sun direction.
 * The shadow is a quadrilateral extending from the wall in the direction
 * opposite to the sun.
 * 
 * @param wall - The wall casting the shadow
 * @param sunPosition - Current sun position
 * @param buildingOrientation - Building rotation in degrees
 * @param maxShadowLength - Maximum length of shadow projection
 * @returns Shadow polygon vertices (4 points), or null if no shadow
 */
export function calculateWallShadowRegion(
  wall: WallForSunlight,
  sunPosition: SunPosition,
  buildingOrientation: number,
  maxShadowLength: number = 15
): Point2D[] | null {
  // No shadow if sun is below horizon
  if (!sunPosition.isAboveHorizon || sunPosition.altitude <= 2) {
    return null;
  }

  const DEG_TO_RAD = Math.PI / 180;

  // Sun direction (adjusted for building orientation)
  const sunAzRad = (sunPosition.azimuth - buildingOrientation) * DEG_TO_RAD;
  const sunAltRad = sunPosition.altitude * DEG_TO_RAD;

  // Direction FROM sun (where shadows project TO)
  // In 2D plan view: shadows extend opposite to sun azimuth
  const shadowDirX = -Math.sin(sunAzRad);
  const shadowDirY = -Math.cos(sunAzRad);

  // Shadow length based on wall height and sun altitude
  // tan(altitude) = height / shadow_length
  // shadow_length = height / tan(altitude)
  const tanAlt = Math.tan(sunAltRad);
  if (tanAlt <= 0.02) {
    return null; // Sun too low, shadow would be infinite
  }

  const shadowLength = Math.min(wall.height / tanAlt, maxShadowLength);

  // Wall endpoints
  const { startPoint, endPoint } = wall;

  // Shadow region is a quadrilateral:
  // - Two corners at wall endpoints
  // - Two corners at projected positions
  const shadow: Point2D[] = [
    { x: startPoint.x, y: startPoint.y },
    { x: endPoint.x, y: endPoint.y },
    { x: endPoint.x + shadowDirX * shadowLength, y: endPoint.y + shadowDirY * shadowLength },
    { x: startPoint.x + shadowDirX * shadowLength, y: startPoint.y + shadowDirY * shadowLength },
  ];

  return shadow;
}

/**
 * Clip a light patch against all wall shadow regions.
 * 
 * @param lightPatch - The original light patch polygon
 * @param walls - All walls in the scene
 * @param sourceWallId - ID of the wall the light comes through (to exclude)
 * @param sunPosition - Current sun position
 * @param buildingOrientation - Building rotation
 * @returns Array of clipped polygon(s)
 */
export function clipLightPatchAgainstWalls(
  lightPatch: Point2D[],
  walls: WallForSunlight[],
  sourceWallId: string,
  sunPosition: SunPosition,
  buildingOrientation: number
): Point2D[][] {
  if (lightPatch.length < 3) {
    return [];
  }

  let currentPatches: Point2D[][] = [lightPatch];

  for (const wall of walls) {
    // Skip the source wall and any segments of the same parent wall
    // (A wall cannot occlude its own openings)
    const sourceBaseId = sourceWallId.split('-seg-')[0];
    const wallBaseId = wall.id.split('-seg-')[0];

    if (sourceBaseId === wallBaseId) {
      continue;
    }

    // Calculate shadow region for this wall
    const shadowRegion = calculateWallShadowRegion(
      wall,
      sunPosition,
      buildingOrientation
    );

    if (!shadowRegion) {
      continue;
    }

    // Clip each current patch against this shadow
    const newPatches: Point2D[][] = [];

    for (const patch of currentPatches) {
      // Check if patch intersects shadow at all
      const intersection = clipPolygonAgainstConvex(patch, shadowRegion);

      if (intersection.length < 3 || polygonArea(intersection) < 0.001) {
        // No intersection - keep original patch
        newPatches.push(patch);
      } else {
        // Patch intersects shadow - subtract shadow region
        const remaining = subtractShadowFromPatch(patch, shadowRegion);
        newPatches.push(...remaining);
      }
    }

    currentPatches = newPatches;

    if (currentPatches.length === 0) {
      break; // All light blocked
    }
  }

  // Filter out degenerate polygons
  return currentPatches.filter(p => p.length >= 3 && polygonArea(p) > 0.001);
}

/**
 * Subtract a shadow region from a light patch.
 * Uses a simplified approach that works well for architectural scenarios.
 */
export function subtractShadowFromPatch(
  patch: Point2D[],
  shadow: Point2D[]
): Point2D[][] {
  // Find which parts of the patch are outside the shadow
  const results: Point2D[][] = [];

  // For each edge of the shadow, find the part of the patch on its outside
  // This creates "slices" of the patch that aren't in shadow

  for (let i = 0; i < shadow.length; i++) {
    const edgeStart = shadow[i];
    const edgeEnd = shadow[(i + 1) % shadow.length];

    // Clip patch to the half-plane OUTSIDE this shadow edge
    const clipped = clipToOutsideOfEdge(patch, edgeStart, edgeEnd);

    if (clipped.length >= 3 && polygonArea(clipped) > 0.001) {
      // Verify this piece doesn't significantly overlap with shadow
      const overlap = clipPolygonAgainstConvex(clipped, shadow);
      const overlapArea = overlap.length >= 3 ? polygonArea(overlap) : 0;
      const clippedArea = polygonArea(clipped);

      if (overlapArea / clippedArea < 0.1) {
        results.push(clipped);
      }
    }
  }

  // Remove duplicates and merge overlapping results
  return deduplicatePatches(results);
}

/**
 * Clip a polygon to keep only the part outside of a directed edge.
 * The "outside" is to the right of the edge direction.
 */
function clipToOutsideOfEdge(
  polygon: Point2D[],
  edgeStart: Point2D,
  edgeEnd: Point2D
): Point2D[] {
  if (polygon.length < 3) return [];

  const result: Point2D[] = [];

  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];

    const currentSide = sideOfLine(current, edgeStart, edgeEnd);
    const nextSide = sideOfLine(next, edgeStart, edgeEnd);

    // Keep points on the right side (negative side value for CCW shadow)
    const currentOutside = currentSide <= EPSILON;
    const nextOutside = nextSide <= EPSILON;

    if (currentOutside) {
      result.push(current);
    }

    // If edge crosses the boundary, add intersection
    if (currentOutside !== nextOutside) {
      const intersection = lineIntersection(current, next, edgeStart, edgeEnd);
      if (intersection) {
        result.push(intersection);
      }
    }
  }

  return result;
}

/**
 * Remove duplicate/overlapping patches from results.
 */
function deduplicatePatches(patches: Point2D[][]): Point2D[][] {
  if (patches.length <= 1) return patches;

  const unique: Point2D[][] = [];

  for (const patch of patches) {
    const center = getPolygonCentroid(patch);
    let isDuplicate = false;

    for (const existing of unique) {
      const existingCenter = getPolygonCentroid(existing);
      const dist = Math.hypot(center.x - existingCenter.x, center.y - existingCenter.y);

      if (dist < 0.1) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(patch);
    }
  }

  return unique;
}

/**
 * Get centroid of a polygon.
 */
function getPolygonCentroid(polygon: Point2D[]): Point2D {
  let cx = 0, cy = 0;
  for (const p of polygon) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / polygon.length, y: cy / polygon.length };
}

/**
 * Check if a light patch is blocked by any wall.
 * Quick check to see if the entire patch is in shadow.
 */
export function isLightPatchFullyBlocked(
  lightPatch: Point2D[],
  walls: WallForSunlight[],
  sourceWallId: string,
  sunPosition: SunPosition,
  buildingOrientation: number
): boolean {
  const sourceBaseId = sourceWallId.split('-seg-')[0];

  for (const wall of walls) {
    const wallBaseId = wall.id.split('-seg-')[0];
    if (sourceBaseId === wallBaseId) {
      continue;
    }

    const shadow = calculateWallShadowRegion(wall, sunPosition, buildingOrientation);
    if (!shadow) continue;

    // Check if entire light patch is inside shadow
    const intersection = clipPolygonAgainstConvex(lightPatch, shadow);
    if (intersection.length >= 3) {
      const intersectionArea = polygonArea(intersection);
      const patchArea = polygonArea(lightPatch);

      if (intersectionArea / patchArea > 0.95) {
        return true; // Patch is almost entirely in shadow
      }
    }
  }

  return false;
}

