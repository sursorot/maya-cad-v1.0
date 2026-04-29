/**
 * Collision Detection Utilities
 * 
 * Functions for detecting collisions between the agent and walls.
 */

import type { NavigationWall, NavigationBounds, Point } from './navigationTypes';

/**
 * Check if a circle (agent) collides with a line segment (wall edge).
 */
function lineCircleCollision(
  x1: number, y1: number,
  x2: number, y2: number,
  cx: number, cy: number,
  r: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;
  
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  
  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;
  
  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);
  
  // Check if intersection is within segment
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
}

/**
 * Check if an agent at a given position collides with any walls.
 */
export function checkWallCollision(
  agentX: number,
  agentY: number,
  agentRadius: number,
  walls: NavigationWall[]
): boolean {
  for (const wall of walls) {
    const { x1, y1, x2, y2, thickness } = wall;
    const halfT = thickness / 2;
    
    // Calculate wall direction and normal
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len === 0) continue;
    
    const nx = -dy / len;
    const ny = dx / len;
    
    // Check collision with both edges of the wall
    const edgeOffset = halfT;
    
    // Positive edge
    if (lineCircleCollision(
      x1 + nx * edgeOffset, y1 + ny * edgeOffset,
      x2 + nx * edgeOffset, y2 + ny * edgeOffset,
      agentX, agentY, agentRadius
    )) {
      return true;
    }
    
    // Negative edge
    if (lineCircleCollision(
      x1 - nx * edgeOffset, y1 - ny * edgeOffset,
      x2 - nx * edgeOffset, y2 - ny * edgeOffset,
      agentX, agentY, agentRadius
    )) {
      return true;
    }
    
    // Check collision with wall centerline (with combined radius)
    if (lineCircleCollision(
      x1, y1, x2, y2,
      agentX, agentY, agentRadius + halfT
    )) {
      return true;
    }
    
    // Check endpoints (wall caps)
    const endpointRadius = agentRadius + halfT;
    if (Math.sqrt((agentX - x1) ** 2 + (agentY - y1) ** 2) < endpointRadius) {
      return true;
    }
    if (Math.sqrt((agentX - x2) ** 2 + (agentY - y2) ** 2) < endpointRadius) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if an agent is within bounds.
 */
export function checkBoundsCollision(
  agentX: number,
  agentY: number,
  agentRadius: number,
  bounds: NavigationBounds
): boolean {
  return (
    agentX - agentRadius < bounds.minX ||
    agentX + agentRadius > bounds.maxX ||
    agentY - agentRadius < bounds.minY ||
    agentY + agentRadius > bounds.maxY
  );
}

/**
 * Check if a position is valid (no collisions).
 */
export function isPositionValid(
  x: number,
  y: number,
  radius: number,
  walls: NavigationWall[],
  bounds: NavigationBounds
): boolean {
  return (
    !checkBoundsCollision(x, y, radius, bounds) &&
    !checkWallCollision(x, y, radius, walls)
  );
}

/**
 * Find a random valid spawn position.
 */
export function findValidSpawnPosition(
  walls: NavigationWall[],
  bounds: NavigationBounds,
  radius: number,
  maxAttempts: number = 100
): Point | null {
  const margin = radius + 0.5;
  
  for (let i = 0; i < maxAttempts; i++) {
    const x = bounds.minX + margin + Math.random() * (bounds.maxX - bounds.minX - margin * 2);
    const y = bounds.minY + margin + Math.random() * (bounds.maxY - bounds.minY - margin * 2);
    
    if (isPositionValid(x, y, radius, walls, bounds)) {
      return { x, y };
    }
  }
  
  // Fallback: center of bounds
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  
  if (isPositionValid(centerX, centerY, radius, walls, bounds)) {
    return { x: centerX, y: centerY };
  }
  
  return null;
}

/**
 * Calculate distance between two points.
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Check if agent has reached the goal based on goal shape.
 */
export function isAgentInGoal(
  agentX: number,
  agentY: number,
  agentRadius: number,
  goalX: number,
  goalY: number,
  goalShape: 'circle' | 'rectangle' | 'diamond',
  goalRadius: number,
  goalWidth: number,
  goalHeight: number
): boolean {
  switch (goalShape) {
    case 'circle': {
      const dist = distance(agentX, agentY, goalX, goalY);
      return dist <= goalRadius + agentRadius * 0.5;
    }
    case 'rectangle': {
      const halfW = goalWidth / 2;
      const halfH = goalHeight / 2;
      return (
        agentX >= goalX - halfW - agentRadius * 0.3 &&
        agentX <= goalX + halfW + agentRadius * 0.3 &&
        agentY >= goalY - halfH - agentRadius * 0.3 &&
        agentY <= goalY + halfH + agentRadius * 0.3
      );
    }
    case 'diamond': {
      // Diamond is rotated rectangle - check using Manhattan-like distance
      const halfW = goalWidth / 2;
      const halfH = goalHeight / 2;
      const dx = Math.abs(agentX - goalX) / halfW;
      const dy = Math.abs(agentY - goalY) / halfH;
      return dx + dy <= 1 + (agentRadius * 0.3) / Math.min(halfW, halfH);
    }
    default:
      return false;
  }
}

