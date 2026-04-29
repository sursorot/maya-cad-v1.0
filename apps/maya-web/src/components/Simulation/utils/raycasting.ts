/**
 * Raycasting Utilities
 * 
 * Functions for computing raycast observations for the agent.
 */

import type { NavigationWall, NavigationBounds, RaycastResult } from './navigationTypes';

/**
 * Cast a ray from origin in a direction and find the closest intersection.
 */
function castRay(
  originX: number,
  originY: number,
  angle: number,
  walls: NavigationWall[],
  bounds: NavigationBounds,
  maxDistance: number
): { distance: number; hitX: number; hitY: number } {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let minDist = maxDistance;
  let hitX = originX + dx * maxDistance;
  let hitY = originY + dy * maxDistance;
  
  // Check intersection with walls
  for (const wall of walls) {
    const { x1, y1, x2, y2, thickness } = wall;
    
    // Check both edges of the wall
    const halfT = thickness / 2;
    const wallDx = x2 - x1;
    const wallDy = y2 - y1;
    const len = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
    
    if (len === 0) continue;
    
    const nx = -wallDy / len;
    const ny = wallDx / len;
    
    // Check intersection with both wall edges
    for (const offset of [-halfT, halfT]) {
      const wx1 = x1 + nx * offset;
      const wy1 = y1 + ny * offset;
      const wx2 = x2 + nx * offset;
      const wy2 = y2 + ny * offset;
      
      const dist = rayLineIntersection(originX, originY, dx, dy, wx1, wy1, wx2, wy2);
      if (dist !== null && dist > 0 && dist < minDist) {
        minDist = dist;
        hitX = originX + dx * dist;
        hitY = originY + dy * dist;
      }
    }
    
    // Also check wall centerline
    const dist = rayLineIntersection(originX, originY, dx, dy, x1, y1, x2, y2);
    if (dist !== null && dist > 0 && dist < minDist) {
      minDist = dist;
      hitX = originX + dx * dist;
      hitY = originY + dy * dist;
    }
  }
  
  // Check intersection with bounds
  const boundsDist = rayBoundsIntersection(originX, originY, dx, dy, bounds);
  if (boundsDist !== null && boundsDist > 0 && boundsDist < minDist) {
    minDist = boundsDist;
    hitX = originX + dx * boundsDist;
    hitY = originY + dy * boundsDist;
  }
  
  return { distance: minDist, hitX, hitY };
}

/**
 * Calculate ray-line segment intersection.
 * Returns distance along ray, or null if no intersection.
 */
function rayLineIntersection(
  ox: number, oy: number,   // Ray origin
  dx: number, dy: number,   // Ray direction (normalized)
  x1: number, y1: number,   // Line segment start
  x2: number, y2: number    // Line segment end
): number | null {
  const segDx = x2 - x1;
  const segDy = y2 - y1;
  
  const denom = dx * segDy - dy * segDx;
  
  // Parallel check
  if (Math.abs(denom) < 1e-10) return null;
  
  const t = ((x1 - ox) * segDy - (y1 - oy) * segDx) / denom;
  const u = ((x1 - ox) * dy - (y1 - oy) * dx) / denom;
  
  // Check if intersection is within segment and in front of ray
  if (t >= 0 && u >= 0 && u <= 1) {
    return t;
  }
  
  return null;
}

/**
 * Calculate ray intersection with bounding box.
 */
function rayBoundsIntersection(
  ox: number, oy: number,
  dx: number, dy: number,
  bounds: NavigationBounds
): number | null {
  let minDist: number | null = null;
  
  // Check all 4 edges of bounds
  const edges = [
    [bounds.minX, bounds.minY, bounds.maxX, bounds.minY], // Top
    [bounds.maxX, bounds.minY, bounds.maxX, bounds.maxY], // Right
    [bounds.maxX, bounds.maxY, bounds.minX, bounds.maxY], // Bottom
    [bounds.minX, bounds.maxY, bounds.minX, bounds.minY], // Left
  ];
  
  for (const [x1, y1, x2, y2] of edges) {
    const dist = rayLineIntersection(ox, oy, dx, dy, x1, y1, x2, y2);
    if (dist !== null && dist > 0) {
      if (minDist === null || dist < minDist) {
        minDist = dist;
      }
    }
  }
  
  return minDist;
}

/**
 * Compute raycasts in 8 directions from agent position.
 */
export function computeRaycasts(
  agentX: number,
  agentY: number,
  walls: NavigationWall[],
  bounds: NavigationBounds,
  maxDistance: number = 10
): RaycastResult[] {
  const directions = [
    { name: 'N', angle: -Math.PI / 2 },
    { name: 'NE', angle: -Math.PI / 4 },
    { name: 'E', angle: 0 },
    { name: 'SE', angle: Math.PI / 4 },
    { name: 'S', angle: Math.PI / 2 },
    { name: 'SW', angle: 3 * Math.PI / 4 },
    { name: 'W', angle: Math.PI },
    { name: 'NW', angle: -3 * Math.PI / 4 },
  ];
  
  return directions.map(({ name, angle }) => {
    const { distance, hitX, hitY } = castRay(agentX, agentY, angle, walls, bounds, maxDistance);
    return {
      name,
      angle,
      distance,
      hitX,
      hitY,
    };
  });
}

/**
 * Compute normalized observation vector from raycasts.
 * Returns [x, y, gx, gy, ray1, ray2, ..., ray8] normalized to [0, 1]
 */
export function computeObservation(
  agentX: number,
  agentY: number,
  goalX: number,
  goalY: number,
  bounds: NavigationBounds,
  raycasts: RaycastResult[],
  maxRayDistance: number = 10
): number[] {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  
  // Normalize positions to [0, 1]
  const normX = (agentX - bounds.minX) / width;
  const normY = (agentY - bounds.minY) / height;
  const normGX = (goalX - bounds.minX) / width;
  const normGY = (goalY - bounds.minY) / height;
  
  // Normalize ray distances to [0, 1]
  const normRays = raycasts.map(r => Math.min(r.distance / maxRayDistance, 1));
  
  return [normX, normY, normGX, normGY, ...normRays];
}

