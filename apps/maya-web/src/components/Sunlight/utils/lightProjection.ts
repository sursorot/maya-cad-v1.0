/**
 * Light Projection Calculator (2.5D Ray Casting)
 * 
 * Calculates where sunlight falls on the floor AND walls through openings.
 * Uses a 2.5D approach:
 * 1. Projects a 3D light volume from the opening.
 * 2. Intersects this volume with walls to find "Lit Wall Segments".
 * 3. Clips the floor projection based on wall occlusion.
 */

import type {
  SunPosition,
  WallForSunlight,
  OpeningForSunlight,
  LightPatch,
  Point2D,
  SunlightConfig,
} from './sunlightTypes';
import { LIGHT_COLORS } from './sunlightTypes';

const DEG_TO_RAD = Math.PI / 180;

/**
 * Calculate the angle of a wall from its start and end points.
 */
export function calculateWallAngle(start: Point2D, end: Point2D): number {
  return Math.atan2(end.y - start.y, end.x - start.x);
}

/**
 * Calculate the outward-facing normal of a wall.
 */
export function calculateWallNormal(wallAngle: number): number {
  return wallAngle - Math.PI / 2;
}

/**
 * Check if a wall is facing the sun.
 */
export function isWallFacingSun(
  wall: WallForSunlight,
  sunPosition: SunPosition,
  config: SunlightConfig,
  center: Point2D
): boolean {
  const sunAzRad = (sunPosition.azimuth - config.buildingOrientation) * DEG_TO_RAD;
  const toSunX = Math.sin(sunAzRad);
  const toSunY = -Math.cos(sunAzRad);

  // Centroid of wall
  const midX = (wall.startPoint.x + wall.endPoint.x) / 2;
  const midY = (wall.startPoint.y + wall.endPoint.y) / 2;
  const outwardX = midX - center.x;
  const outwardY = midY - center.y;

  const normalX = Math.cos(wall.normalAngle);
  const normalY = Math.sin(wall.normalAngle);

  let finalNormalX = normalX;
  let finalNormalY = normalY;
  if (normalX * outwardX + normalY * outwardY < 0) {
    finalNormalX = -normalX;
    finalNormalY = -normalY;
  }

  return (finalNormalX * toSunX + finalNormalY * toSunY) > 0;
}

/**
 * Check if an opening is occluded by other walls (i.e., is it an internal opening?).
 * Casts a ray from the opening center towards the sun.
 */
function isOpeningOccluded(
  opening: OpeningForSunlight,
  wall: WallForSunlight,
  allWalls: WallForSunlight[],
  sunPosition: SunPosition,
  config: SunlightConfig
): boolean {
  const sunAzRad = (sunPosition.azimuth - config.buildingOrientation) * DEG_TO_RAD;
  const toSunX = Math.sin(sunAzRad);
  const toSunY = -Math.cos(sunAzRad);

  // Opening center
  const wallDirX = Math.cos(wall.angle);
  const wallDirY = Math.sin(wall.angle);
  const centerDist = opening.positionOnWall * wall.length;

  const centerX = wall.startPoint.x + wallDirX * centerDist;
  const centerY = wall.startPoint.y + wallDirY * centerDist;

  // Ray start (slightly offset to avoid self-intersection)
  const start = { x: centerX + toSunX * 0.1, y: centerY + toSunY * 0.1 };
  const end = { x: centerX + toSunX * 1000, y: centerY + toSunY * 1000 }; // Far away

  const sourceBaseId = wall.id.split('-seg-')[0];

  for (const otherWall of allWalls) {
    const otherBaseId = otherWall.id.split('-seg-')[0];
    if (sourceBaseId === otherBaseId) continue;

    // Check intersection
    const intersection = segmentIntersection(start, end, otherWall.startPoint, otherWall.endPoint);
    if (intersection) {
      return true; // Blocked by another wall
    }
  }

  return false;
}

/**
 * Find the closest wall intersection point for a ray cast in a given direction.
 * Similar to the HTML reference's findClosestIntersection function.
 */
function findClosestIntersection(
  rayOrigin: Point2D,
  rayDirX: number,
  rayDirY: number,
  allWalls: WallForSunlight[],
  excludeWallId?: string // Exclude this wall to prevent self-intersection
): Point2D | null {
  let closestIntersection: Point2D | null = null;
  let minDistSq = Infinity;

  // Create a very long ray endpoint
  const rayEnd = {
    x: rayOrigin.x + rayDirX * 10000,
    y: rayOrigin.y + rayDirY * 10000
  };

  for (const wall of allWalls) {
    // Skip the source wall to avoid self-intersection
    if (excludeWallId && wall.id === excludeWallId) {
      continue;
    }

    const intersection = segmentIntersection(rayOrigin, rayEnd, wall.startPoint, wall.endPoint);
    if (intersection) {
      const dx = intersection.x - rayOrigin.x;
      const dy = intersection.y - rayOrigin.y;
      const distSq = dx * dx + dy * dy;

      // Only consider intersections that are meaningfully far away (> 0.01m)
      if (distSq > 0.0001 && distSq < minDistSq) {
        minDistSq = distSq;
        closestIntersection = intersection;
      }
    }
  }

  return closestIntersection;
}

/**
 * Calculate the light patch and lit wall segments for a single opening.
 */
export function calculateOpeningLightPatch(
  opening: OpeningForSunlight,
  wall: WallForSunlight,
  sunPosition: SunPosition,
  config: SunlightConfig,
  center: Point2D,
  allWalls: WallForSunlight[] // Needed for occlusion
): LightPatch | null {
  if (sunPosition.altitude <= 2) {
    return null;
  }

  if (!isWallFacingSun(wall, sunPosition, config, center)) {
    return null;
  }

  // Check if opening is occluded (internal or shadowed)
  if (isOpeningOccluded(opening, wall, allWalls, sunPosition, config)) {
    return null;
  }

  // Sun direction vector (direction light travels INTO the room)
  // Azimuth convention: 0°=North, 90°=East, 180°=South, 270°=West (clockwise from North)
  // In SVG coordinates: +X=East (right), +Y=South (down)
  // "To sun" direction: X = sin(az), Y = -cos(az)
  // Light travels OPPOSITE to where sun is, so we negate both components
  const sunAzRad = (sunPosition.azimuth - config.buildingOrientation) * DEG_TO_RAD;

  // Light direction = opposite of "to sun" direction
  const sunDirX = -Math.sin(sunAzRad);
  const sunDirY = Math.cos(sunAzRad);

  // Get opening corner points on the wall
  const corners = getOpeningCornersOnWall(opening, wall);
  const p1 = corners.left;
  const p2 = corners.right;

  // Cast rays from both opening endpoints to find wall intersections
  // Exclude the source wall to prevent self-intersection
  const i1 = findClosestIntersection(p1, sunDirX, sunDirY, allWalls, wall.id);
  const i2 = findClosestIntersection(p2, sunDirX, sunDirY, allWalls, wall.id);

  // If both rays hit walls, create the light polygon (quadrilateral)
  if (!i1 || !i2) {
    return null;
  }

  // Create the light patch polygon: [p1, p2, i2, i1]
  const lightPolygon: Point2D[] = [p1, p2, i2, i1];

  // Calculate intensity and color
  const intensity = Math.min(1, sunPosition.altitude / 45);
  const color = getLightColor(config.colorScheme, intensity, config.patchOpacity);

  return {
    id: `light-${opening.id}`,
    openingId: opening.id,
    paths: [lightPolygon],
    intensity,
    color,
    litSegments: [], // No lit segments in simplified version
  };
}


// Helper for segment intersection
function segmentIntersection(p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D): Point2D | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null;
  const t1 = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const t2 = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
  if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
    return { x: p1.x + t1 * d1x, y: p1.y + t1 * d1y };
  }
  return null;
}

function getOpeningCornersOnWall(
  opening: OpeningForSunlight,
  wall: WallForSunlight
): { left: Point2D; right: Point2D } {
  const wallDirX = Math.cos(wall.angle);
  const wallDirY = Math.sin(wall.angle);

  const centerDist = opening.positionOnWall * wall.length;
  const halfWidth = opening.width / 2;

  const centerX = wall.startPoint.x + wallDirX * centerDist;
  const centerY = wall.startPoint.y + wallDirY * centerDist;

  return {
    left: {
      x: centerX - wallDirX * halfWidth,
      y: centerY - wallDirY * halfWidth,
    },
    right: {
      x: centerX + wallDirX * halfWidth,
      y: centerY + wallDirY * halfWidth,
    },
  };
}

function getLightColor(
  scheme: 'warm' | 'analysis' | 'heatmap',
  intensity: number,
  opacity: number
): string {
  const colors = LIGHT_COLORS[scheme];
  let baseColor: string;
  if (intensity > 0.7) baseColor = colors.bright;
  else if (intensity > 0.4) baseColor = colors.medium;
  else baseColor = colors.soft;

  const match = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
  if (match) {
    const [, r, g, b, a] = match;
    const baseOpacity = parseFloat(a || '1');
    const finalOpacity = baseOpacity * opacity * (0.5 + intensity * 0.5);
    return `rgba(${r}, ${g}, ${b}, ${finalOpacity.toFixed(2)})`;
  }
  return baseColor;
}

export function calculateAllLightPatches(
  walls: WallForSunlight[],
  sunPosition: SunPosition,
  config: SunlightConfig,
  center: Point2D
): LightPatch[] {
  const patches: LightPatch[] = [];

  if (!sunPosition.isAboveHorizon) {
    return patches;
  }

  for (const wall of walls) {
    for (const opening of wall.openings) {
      // Pass ALL walls to the calculation for occlusion checks
      const patch = calculateOpeningLightPatch(opening, wall, sunPosition, config, center, walls);
      if (patch) {
        patches.push(patch);
      }
    }
  }

  return patches;
}

export function calculateAllLightPatchesUnclipped(
  walls: WallForSunlight[],
  sunPosition: SunPosition,
  config: SunlightConfig,
  center: Point2D
): LightPatch[] {
  // For unclipped, we just disable occlusion in config temporarily
  const unclippedConfig = { ...config, enableWallOcclusion: false };
  return calculateAllLightPatches(walls, sunPosition, unclippedConfig, center);
}

export function polygonToPath(points: Point2D[]): string {
  if (points.length === 0) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  path += ' Z';
  return path;
}

export function createSunDirectionIndicator(
  sunPosition: SunPosition,
  buildingOrientation: number,
  center: Point2D,
  length: number
): { start: Point2D; end: Point2D; fromSun: Point2D } {
  const adjustedAz = (sunPosition.azimuth - buildingOrientation) * DEG_TO_RAD;
  const toSunX = Math.sin(adjustedAz);
  const toSunY = -Math.cos(adjustedAz);
  const fromSunX = -toSunX;
  const fromSunY = -toSunY;

  return {
    start: center,
    end: {
      x: center.x + toSunX * length,
      y: center.y + toSunY * length,
    },
    fromSun: {
      x: center.x + fromSunX * length * 0.5,
      y: center.y + fromSunY * length * 0.5,
    },
  };
}
