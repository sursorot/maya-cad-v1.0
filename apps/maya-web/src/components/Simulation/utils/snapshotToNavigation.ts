/**
 * Snapshot to Navigation Conversion
 * 
 * Converts a WorkspaceSnapshot to a NavigationFloorplan for simulation.
 */

import type { WorkspaceSnapshot } from '@maya/workspace-domain/workspace/core';
import type { NavigationFloorplan, NavigationWall, NavigationOpening, NavigationBounds } from './navigationTypes';

/**
 * Extract walls from a WorkspaceSnapshot and convert to navigation format.
 */
function extractWalls(snapshot: WorkspaceSnapshot): NavigationWall[] {
  const walls: NavigationWall[] = [];
  
  for (const shape of snapshot.shapes) {
    if (shape.type === 'wall') {
      const { centerline, thickness } = shape;
      
      // Convert each segment of the wall centerline
      if (centerline && centerline.length >= 2) {
        for (let i = 0; i < centerline.length - 1; i++) {
          walls.push({
            x1: centerline[i].x,
            y1: centerline[i].y,
            x2: centerline[i + 1].x,
            y2: centerline[i + 1].y,
            thickness: thickness || 0.15,
          });
        }
      }
    }
  }
  
  return walls;
}

/**
 * Extract openings (doors, windows) from a WorkspaceSnapshot.
 */
function extractOpenings(snapshot: WorkspaceSnapshot): NavigationOpening[] {
  const openings: NavigationOpening[] = [];
  
  for (const shape of snapshot.shapes) {
    if (shape.type === 'opening') {
      openings.push({
        x: shape.anchor.x,
        y: shape.anchor.y,
        width: shape.width,
        type: shape.category as 'door' | 'window' | 'opening',
      });
    }
  }
  
  return openings;
}

/**
 * Calculate bounds from walls or use viewBox.
 */
function calculateBounds(walls: NavigationWall[], snapshot: WorkspaceSnapshot): NavigationBounds {
  // If there are no walls, use viewBox
  if (walls.length === 0) {
    return {
      minX: snapshot.viewBox?.x ?? 0,
      minY: snapshot.viewBox?.y ?? 0,
      maxX: (snapshot.viewBox?.x ?? 0) + (snapshot.viewBox?.width ?? 10),
      maxY: (snapshot.viewBox?.y ?? 0) + (snapshot.viewBox?.height ?? 10),
    };
  }
  
  // Calculate from walls
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const wall of walls) {
    minX = Math.min(minX, wall.x1, wall.x2);
    minY = Math.min(minY, wall.y1, wall.y2);
    maxX = Math.max(maxX, wall.x1, wall.x2);
    maxY = Math.max(maxY, wall.y1, wall.y2);
  }
  
  // Add padding
  const padding = 0.5;
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}

/**
 * Convert a WorkspaceSnapshot to a NavigationFloorplan.
 */
export function snapshotToNavigation(snapshot: WorkspaceSnapshot): NavigationFloorplan {
  const walls = extractWalls(snapshot);
  const openings = extractOpenings(snapshot);
  const bounds = calculateBounds(walls, snapshot);
  
  return {
    id: `nav-${Date.now()}`,
    walls,
    openings,
    bounds,
  };
}

/**
 * Check if a floorplan has enough geometry for simulation.
 */
export function isFloorplanValid(floorplan: NavigationFloorplan): boolean {
  // Need at least some walls to navigate
  if (floorplan.walls.length === 0) {
    return false;
  }
  
  // Check bounds are reasonable
  const width = floorplan.bounds.maxX - floorplan.bounds.minX;
  const height = floorplan.bounds.maxY - floorplan.bounds.minY;
  
  if (width < 1 || height < 1 || width > 1000 || height > 1000) {
    return false;
  }
  
  return true;
}

