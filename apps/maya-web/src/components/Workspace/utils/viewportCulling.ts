/**
 * Viewport Culling Utilities
 * 
 * Performance optimization: Skip rendering shapes that are completely outside the viewport.
 * This significantly improves performance for canvases with many shapes.
 */

import type { Shape, Point, ViewBox } from '../types';

/**
 * Bounding box interface for shapes
 */
interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

/**
 * Calculate the bounding box for any shape type
 */
export function getShapeBoundingBox(shape: Shape): BoundingBox | null {
    switch (shape.type) {
        case 'line':
            return {
                minX: Math.min(shape.start.x, shape.end.x),
                minY: Math.min(shape.start.y, shape.end.y),
                maxX: Math.max(shape.start.x, shape.end.x),
                maxY: Math.max(shape.start.y, shape.end.y),
            };

        case 'polyline':
        case 'curve':
            if (shape.points.length === 0) return null;
            return getPointsBoundingBox(shape.points);

        case 'arc':
            // For arcs, include all control points
            return getPointsBoundingBox([shape.start, shape.end, shape.controlPoint]);

        case 'circle':
            return {
                minX: shape.center.x - shape.radius,
                minY: shape.center.y - shape.radius,
                maxX: shape.center.x + shape.radius,
                maxY: shape.center.y + shape.radius,
            };

        case 'rectangle':
            return {
                minX: Math.min(shape.start.x, shape.end.x),
                minY: Math.min(shape.start.y, shape.end.y),
                maxX: Math.max(shape.start.x, shape.end.x),
                maxY: Math.max(shape.start.y, shape.end.y),
            };

        case 'wall':
            if (shape.centerline.length === 0) return null;
            const wallBounds = getPointsBoundingBox(shape.centerline);
            // Expand by wall thickness
            const halfThickness = (shape.thickness || 0.15) / 2;
            return {
                minX: wallBounds.minX - halfThickness,
                minY: wallBounds.minY - halfThickness,
                maxX: wallBounds.maxX + halfThickness,
                maxY: wallBounds.maxY + halfThickness,
            };

        case 'opening':
            // Expand bounds to include swing arc for doors
            const halfWidth = shape.width / 2;
            const swingExtent = shape.category === 'door' ? shape.width : shape.frameThickness;
            return {
                minX: shape.anchor.x - halfWidth - swingExtent,
                minY: shape.anchor.y - halfWidth - swingExtent,
                maxX: shape.anchor.x + halfWidth + swingExtent,
                maxY: shape.anchor.y + halfWidth + swingExtent,
            };

        case 'room':
        case 'zone':
            if (shape.points.length === 0) return null;
            return getPointsBoundingBox(shape.points);

        case 'guideline':
            if (shape.orientation === 'horizontal') {
                return {
                    minX: -Infinity,
                    minY: shape.position! - 0.01,
                    maxX: Infinity,
                    maxY: shape.position! + 0.01,
                };
            } else if (shape.orientation === 'vertical') {
                return {
                    minX: shape.position! - 0.01,
                    minY: -Infinity,
                    maxX: shape.position! + 0.01,
                    maxY: Infinity,
                };
            } else if (shape.start && shape.end) {
                return getPointsBoundingBox([shape.start, shape.end]);
            }
            return null;

        case 'dimension':
            // Include offset for dimension lines
            const dimOffset = Math.abs(shape.offset || 0);
            return {
                minX: Math.min(shape.start.x, shape.end.x) - dimOffset,
                minY: Math.min(shape.start.y, shape.end.y) - dimOffset,
                maxX: Math.max(shape.start.x, shape.end.x) + dimOffset,
                maxY: Math.max(shape.start.y, shape.end.y) + dimOffset,
            };

        case 'text':
            // Approximate text bounds - text can vary in size
            const textWidth = shape.content.length * shape.fontSize * 0.6;
            const textHeight = shape.fontSize * 1.5;
            return {
                minX: shape.position.x,
                minY: shape.position.y - textHeight,
                maxX: shape.position.x + textWidth,
                maxY: shape.position.y,
            };

        default:
            return null;
    }
}

/**
 * Calculate bounding box from an array of points
 */
function getPointsBoundingBox(points: Point[]): BoundingBox {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
    };
}

/**
 * Check if a bounding box intersects with the viewport
 * Includes a margin to prevent pop-in when scrolling
 */
export function isInViewport(
    bounds: BoundingBox,
    viewBox: ViewBox,
    margin: number = 0.5 // Extra margin as percentage of viewport size
): boolean {
    // Expand viewport by margin to prevent pop-in
    const marginX = viewBox.width * margin;
    const marginY = viewBox.height * margin;

    const expandedViewBox = {
        minX: viewBox.x - marginX,
        minY: viewBox.y - marginY,
        maxX: viewBox.x + viewBox.width + marginX,
        maxY: viewBox.y + viewBox.height + marginY,
    };

    // Check for intersection (AABB collision)
    return !(
        bounds.maxX < expandedViewBox.minX ||
        bounds.minX > expandedViewBox.maxX ||
        bounds.maxY < expandedViewBox.minY ||
        bounds.minY > expandedViewBox.maxY
    );
}

/**
 * Check if a shape is visible in the current viewport
 */
export function isShapeInViewport(shape: Shape, viewBox: ViewBox, margin?: number): boolean {
    const bounds = getShapeBoundingBox(shape);
    
    // If we can't determine bounds (infinite guidelines), assume visible
    if (!bounds) return true;
    
    // Handle infinite bounds (guidelines)
    if (!isFinite(bounds.minX) || !isFinite(bounds.maxX) ||
        !isFinite(bounds.minY) || !isFinite(bounds.maxY)) {
        return true;
    }
    
    return isInViewport(bounds, viewBox, margin);
}

/**
 * Filter shapes to only those visible in the viewport
 * Returns the visible shapes and a count of culled shapes for debugging
 */
export function filterVisibleShapes<T extends Shape>(
    shapes: T[],
    viewBox: ViewBox,
    margin?: number
): { visible: T[]; culledCount: number } {
    const visible: T[] = [];
    let culledCount = 0;

    for (const shape of shapes) {
        if (isShapeInViewport(shape, viewBox, margin)) {
            visible.push(shape);
        } else {
            culledCount++;
        }
    }

    return { visible, culledCount };
}

/**
 * Hook-friendly version that returns just the visible shapes
 * Use this in components with useMemo for optimal performance
 */
export function getVisibleShapes<T extends Shape>(
    shapes: T[],
    viewBox: ViewBox,
    margin: number = 0.5
): T[] {
    return shapes.filter(shape => isShapeInViewport(shape, viewBox, margin));
}

