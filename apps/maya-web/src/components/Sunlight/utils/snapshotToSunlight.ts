/**
 * Snapshot to Sunlight Converter
 * 
 * Converts WorkspaceSnapshot data to the format needed for sunlight simulation.
 * Extracts walls and their openings with proper positioning.
 */

import type { WorkspaceSnapshot } from '@maya/workspace-domain/workspace/core';
import type { WallForSunlight, OpeningForSunlight, Point2D } from './sunlightTypes';
import { calculateWallAngle, calculateWallNormal } from './lightProjection';

/**
 * Extract walls with openings from a workspace snapshot.
 */
export function extractWallsForSunlight(snapshot: WorkspaceSnapshot | null): WallForSunlight[] {
  if (!snapshot) return [];

  const walls: WallForSunlight[] = [];

  // First, collect all openings from the snapshot (they're separate shapes)
  const allOpenings: Array<{
    anchor: Point2D;
    width: number;
    height: number;
    sillHeight: number;
    type: 'window' | 'door' | 'opening';
    wallId?: string;
    id: string;
  }> = [];

  for (const shape of snapshot.shapes) {
    if (shape.type === 'opening') {
      const openingShape = shape as {
        anchor: { x: number; y: number };
        width: number;
        height?: number;
        sillHeight?: number;
        category?: string;
        wallId?: string;
      };

      // Determine opening type from category
      let openingType: 'window' | 'door' | 'opening' = 'opening';
      const category = openingShape.category?.toLowerCase() ?? '';
      if (category.includes('window')) {
        openingType = 'window';
      } else if (category.includes('door')) {
        openingType = 'door';
      }

      allOpenings.push({
        anchor: openingShape.anchor,
        width: openingShape.width ?? 0.9,
        height: openingShape.height ?? 2.1,
        sillHeight: openingType === 'window' ? (openingShape.sillHeight ?? 0.9) : 0,
        type: openingType,
        wallId: openingShape.wallId,
        id: shape.id,
      });
    }
  }

  // Now extract walls
  for (const shape of snapshot.shapes) {
    if (shape.type !== 'wall') continue;

    const centerline = (shape as { centerline?: { x: number; y: number }[] }).centerline;
    const height = (shape as { height?: number }).height ?? 2.74;
    const thickness = (shape as { thickness?: number }).thickness ?? 0.1524;
    const wallId = shape.id;

    if (!centerline || centerline.length < 2) continue;

    // For each wall segment
    for (let i = 0; i < centerline.length - 1; i++) {
      const start = centerline[i];
      const end = centerline[i + 1];

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length < 0.01) continue;

      const angle = calculateWallAngle(start, end);
      const normalAngle = calculateWallNormal(angle);

      // Find openings that belong to this wall segment
      const segmentOpenings = findOpeningsForWallSegment(
        allOpenings,
        wallId,
        start,
        end,
        length,
        angle,
        thickness
      );

      walls.push({
        id: `${wallId}-seg-${i}`,
        startPoint: { x: start.x, y: start.y },
        endPoint: { x: end.x, y: end.y },
        height,
        thickness,
        angle,
        normalAngle,
        length,
        openings: segmentOpenings,
      });
    }
  }

  return walls;
}

/**
 * Find openings that are on or near a wall segment.
 */
function findOpeningsForWallSegment(
  allOpenings: Array<{
    anchor: Point2D;
    width: number;
    height: number;
    sillHeight: number;
    type: 'window' | 'door' | 'opening';
    wallId?: string;
    id: string;
  }>,
  wallId: string,
  wallStart: Point2D,
  _wallEnd: Point2D,
  wallLength: number,
  wallAngle: number,
  wallThickness: number
): OpeningForSunlight[] {
  const openings: OpeningForSunlight[] = [];

  const wallDirX = Math.cos(wallAngle);
  const wallDirY = Math.sin(wallAngle);
  const wallNormX = -wallDirY;
  const wallNormY = wallDirX;

  for (const opening of allOpenings) {
    // Check if opening belongs to this wall by ID
    const belongsToWall = opening.wallId === wallId;

    // Or check by proximity - opening center is within wall bounds
    const toOpeningX = opening.anchor.x - wallStart.x;
    const toOpeningY = opening.anchor.y - wallStart.y;

    // Distance along wall
    const distAlongWall = toOpeningX * wallDirX + toOpeningY * wallDirY;
    // Distance perpendicular to wall
    const distFromWall = Math.abs(toOpeningX * wallNormX + toOpeningY * wallNormY);

    // Check if opening is on this wall segment
    const isOnSegment = distAlongWall >= -opening.width / 2 &&
      distAlongWall <= wallLength + opening.width / 2;
    const isNearWall = distFromWall <= wallThickness * 2;

    if (belongsToWall || (isOnSegment && isNearWall)) {
      const positionOnWall = Math.max(0, Math.min(1, distAlongWall / wallLength));

      openings.push({
        id: opening.id,
        wallId,
        positionOnWall,
        width: opening.width,
        height: opening.height,
        sillHeight: opening.sillHeight,
        centerPoint: opening.anchor,
        type: opening.type,
      });
    }
  }

  return openings;
}

/**
 * Get the bounds of all walls.
 */
export function getWallBounds(walls: WallForSunlight[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
} {
  if (walls.length === 0) {
    return { minX: 0, maxX: 10, minY: 0, maxY: 10, centerX: 5, centerY: 5 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  let sumX = 0;
  let sumY = 0;
  let pointCount = 0;

  for (const wall of walls) {
    minX = Math.min(minX, wall.startPoint.x, wall.endPoint.x);
    maxX = Math.max(maxX, wall.startPoint.x, wall.endPoint.x);
    minY = Math.min(minY, wall.startPoint.y, wall.endPoint.y);
    maxY = Math.max(maxY, wall.startPoint.y, wall.endPoint.y);

    sumX += wall.startPoint.x + wall.endPoint.x;
    sumY += wall.startPoint.y + wall.endPoint.y;
    pointCount += 2;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: pointCount > 0 ? sumX / pointCount : 5,
    centerY: pointCount > 0 ? sumY / pointCount : 5,
  };
}

/**
 * Check if the snapshot has any openings (windows/doors).
 */
export function hasOpenings(snapshot: WorkspaceSnapshot | null): boolean {
  if (!snapshot) return false;

  for (const shape of snapshot.shapes) {
    if (shape.type === 'opening') {
      return true;
    }
  }

  return false;
}

/**
 * Count openings by type.
 */
export function countOpenings(snapshot: WorkspaceSnapshot | null): {
  windows: number;
  doors: number;
  openings: number;
  total: number;
} {
  const counts = { windows: 0, doors: 0, openings: 0, total: 0 };

  if (!snapshot) return counts;

  for (const shape of snapshot.shapes) {
    if (shape.type === 'opening') {
      counts.total++;
      const category = ((shape as { category?: string }).category ?? '').toLowerCase();
      if (category.includes('window')) {
        counts.windows++;
      } else if (category.includes('door')) {
        counts.doors++;
      } else {
        counts.openings++;
      }
    }
  }

  return counts;
}
