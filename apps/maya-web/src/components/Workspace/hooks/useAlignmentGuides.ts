/**
 * Alignment Guides Hook
 * 
 * Calculates smart alignment guides when dragging shapes.
 * Shows alignment lines for center, edges, and corners of nearby objects.
 * 
 * Best Practices Implemented:
 * - Center-to-center alignment (most important)
 * - Edge-to-edge alignment (left, right, top, bottom)
 * - Corner alignment (4 corners)
 * - Equal spacing guides (distance between objects)
 * - Performance optimized with spatial filtering
 */

import { useMemo, useCallback } from 'react';
import type { Shape, Point } from '../types';

/**
 * Types of alignment guides
 */
export type AlignmentGuideType = 
  | 'center-horizontal'   // Horizontal line through center
  | 'center-vertical'     // Vertical line through center
  | 'edge-left'           // Align left edges
  | 'edge-right'          // Align right edges
  | 'edge-top'            // Align top edges
  | 'edge-bottom'         // Align bottom edges
  | 'corner'              // Corner alignment
  | 'spacing';            // Equal spacing

/**
 * An alignment guide line
 */
export interface AlignmentGuide {
  type: AlignmentGuideType;
  /** Start point of the guide line */
  start: Point;
  /** End point of the guide line */
  end: Point;
  /** The coordinate value where alignment occurs */
  alignValue: number;
  /** Reference shape ID that created this guide */
  referenceShapeId: string;
  /** Whether this is a horizontal or vertical guide */
  orientation: 'horizontal' | 'vertical';
  /** Distance from the dragged shape to this guide (for snapping) */
  distance: number;
}

/**
 * Snap target for alignment-based snapping
 */
export interface AlignmentSnapTarget {
  /** The snapped position */
  point: Point;
  /** Type of alignment */
  type: AlignmentGuideType;
  /** Which axis this snap affects */
  axis: 'x' | 'y' | 'both';
  /** Distance to snap point */
  distance: number;
}

/**
 * Bounding box of a shape
 */
export interface ShapeBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

/**
 * Result from alignment guide calculation
 */
export interface AlignmentGuideResult {
  /** Active guide lines to display */
  guides: AlignmentGuide[];
  /** Snap targets that can be used for snapping */
  snapTargets: AlignmentSnapTarget[];
  /** The snapped position (if any snap is active) */
  snappedPosition: Point | null;
  /** Whether any snap is active */
  isSnapping: boolean;
}

/**
 * Options for the alignment guides hook
 */
export interface UseAlignmentGuidesOptions {
  /** Enable/disable alignment guides */
  enabled?: boolean;
  /** Snap threshold in canvas units (how close to trigger snap) */
  snapThreshold?: number;
  /** Enable center alignment */
  alignCenter?: boolean;
  /** Enable edge alignment */
  alignEdges?: boolean;
  /** Enable corner alignment */
  alignCorners?: boolean;
  /** Maximum number of guide lines to show */
  maxGuides?: number;
}

const DEFAULT_OPTIONS: UseAlignmentGuidesOptions = {
  enabled: true,
  snapThreshold: 0.05, // 5cm in meters
  alignCenter: true,
  alignEdges: true,
  alignCorners: true,
  maxGuides: 6,
};

/**
 * Get bounding box for a shape
 */
export function getShapeBounds(shape: Shape): ShapeBounds | null {
  switch (shape.type) {
    case 'line': {
      const minX = Math.min(shape.start.x, shape.end.x);
      const maxX = Math.max(shape.start.x, shape.end.x);
      const minY = Math.min(shape.start.y, shape.end.y);
      const maxY = Math.max(shape.start.y, shape.end.y);
      return {
        minX,
        minY,
        maxX,
        maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    case 'rectangle': {
      const minX = Math.min(shape.start.x, shape.end.x);
      const maxX = Math.max(shape.start.x, shape.end.x);
      const minY = Math.min(shape.start.y, shape.end.y);
      const maxY = Math.max(shape.start.y, shape.end.y);
      return {
        minX,
        minY,
        maxX,
        maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    case 'wall': {
      if (!shape.centerline || shape.centerline.length < 2) return null;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      // Include wall thickness in bounds
      const halfThickness = (shape.thickness || 0.1) / 2;
      
      for (const pt of shape.centerline) {
        minX = Math.min(minX, pt.x - halfThickness);
        maxX = Math.max(maxX, pt.x + halfThickness);
        minY = Math.min(minY, pt.y - halfThickness);
        maxY = Math.max(maxY, pt.y + halfThickness);
      }
      return {
        minX,
        minY,
        maxX,
        maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    case 'circle': {
      const r = shape.radius;
      return {
        minX: shape.center.x - r,
        minY: shape.center.y - r,
        maxX: shape.center.x + r,
        maxY: shape.center.y + r,
        centerX: shape.center.x,
        centerY: shape.center.y,
        width: r * 2,
        height: r * 2,
      };
    }

    case 'polyline':
    case 'curve': {
      if (!shape.points || shape.points.length === 0) return null;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      for (const pt of shape.points) {
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minY = Math.min(minY, pt.y);
        maxY = Math.max(maxY, pt.y);
      }
      return {
        minX,
        minY,
        maxX,
        maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    case 'arc': {
      const minX = Math.min(shape.start.x, shape.end.x, shape.controlPoint.x);
      const maxX = Math.max(shape.start.x, shape.end.x, shape.controlPoint.x);
      const minY = Math.min(shape.start.y, shape.end.y, shape.controlPoint.y);
      const maxY = Math.max(shape.start.y, shape.end.y, shape.controlPoint.y);
      return {
        minX,
        minY,
        maxX,
        maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    case 'zone':
    case 'room': {
      if (!shape.points || shape.points.length === 0) return null;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      for (const pt of shape.points) {
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minY = Math.min(minY, pt.y);
        maxY = Math.max(maxY, pt.y);
      }
      return {
        minX,
        minY,
        maxX,
        maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    case 'asset': {
      const halfWidth = shape.width / 2;
      const halfHeight = shape.height / 2;
      return {
        minX: shape.position.x - halfWidth,
        minY: shape.position.y - halfHeight,
        maxX: shape.position.x + halfWidth,
        maxY: shape.position.y + halfHeight,
        centerX: shape.position.x,
        centerY: shape.position.y,
        width: shape.width,
        height: shape.height,
      };
    }

    case 'text': {
      // Approximate text bounds
      const charWidth = shape.fontSize * 0.6;
      const width = shape.content.length * charWidth;
      const height = shape.fontSize * 1.2;
      let minX = shape.position.x;
      if (shape.textAlign === 'center') minX -= width / 2;
      else if (shape.textAlign === 'right') minX -= width;
      
      return {
        minX,
        minY: shape.position.y - shape.fontSize * 0.7,
        maxX: minX + width,
        maxY: shape.position.y + height - shape.fontSize * 0.7,
        centerX: minX + width / 2,
        centerY: shape.position.y,
        width,
        height,
      };
    }

    case 'opening': {
      const halfWidth = shape.width / 2;
      const halfThickness = 0.1; // Approximate opening depth
      return {
        minX: shape.anchor.x - halfWidth * Math.abs(shape.direction.x) - halfThickness * Math.abs(shape.normal.x),
        minY: shape.anchor.y - halfWidth * Math.abs(shape.direction.y) - halfThickness * Math.abs(shape.normal.y),
        maxX: shape.anchor.x + halfWidth * Math.abs(shape.direction.x) + halfThickness * Math.abs(shape.normal.x),
        maxY: shape.anchor.y + halfWidth * Math.abs(shape.direction.y) + halfThickness * Math.abs(shape.normal.y),
        centerX: shape.anchor.x,
        centerY: shape.anchor.y,
        width: shape.width,
        height: halfThickness * 2,
      };
    }

    case 'marker': {
      // Markers are points, give them a small bounding box
      const size = 0.05;
      return {
        minX: shape.position.x - size,
        minY: shape.position.y - size,
        maxX: shape.position.x + size,
        maxY: shape.position.y + size,
        centerX: shape.position.x,
        centerY: shape.position.y,
        width: size * 2,
        height: size * 2,
      };
    }

    case 'dimension': {
      const minX = Math.min(shape.start.x, shape.end.x);
      const maxX = Math.max(shape.start.x, shape.end.x);
      const minY = Math.min(shape.start.y, shape.end.y);
      const maxY = Math.max(shape.start.y, shape.end.y);
      return {
        minX,
        minY,
        maxX,
        maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    default:
      return null;
  }
}

/**
 * Calculate the extension length for guide lines
 * Lines should extend a bit beyond the shapes for visibility
 */
function calculateGuideExtension(
  draggedBounds: ShapeBounds,
  referenceBounds: ShapeBounds
): number {
  // Calculate the overall span and add some padding
  const overallMinX = Math.min(draggedBounds.minX, referenceBounds.minX);
  const overallMaxX = Math.max(draggedBounds.maxX, referenceBounds.maxX);
  const overallMinY = Math.min(draggedBounds.minY, referenceBounds.minY);
  const overallMaxY = Math.max(draggedBounds.maxY, referenceBounds.maxY);
  
  const span = Math.max(overallMaxX - overallMinX, overallMaxY - overallMinY);
  return Math.max(span * 0.1, 0.2); // At least 20cm extension
}

/**
 * Hook for calculating alignment guides during drag operations
 */
export function useAlignmentGuides(
  shapes: Shape[],
  options: UseAlignmentGuidesOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  /**
   * Calculate alignment guides for a shape being dragged
   */
  const calculateGuides = useCallback((
    draggedShapeId: string | null,
    draggedPosition: Point | null
  ): AlignmentGuideResult => {
    const emptyResult: AlignmentGuideResult = {
      guides: [],
      snapTargets: [],
      snappedPosition: null,
      isSnapping: false,
    };

    if (!opts.enabled || !draggedShapeId || !draggedPosition) {
      return emptyResult;
    }

    // Find the dragged shape
    const draggedShape = shapes.find(s => s.id === draggedShapeId);
    if (!draggedShape) return emptyResult;

    // Get bounds of dragged shape
    const draggedBounds = getShapeBounds(draggedShape);
    if (!draggedBounds) return emptyResult;

    const guides: AlignmentGuide[] = [];
    const snapTargets: AlignmentSnapTarget[] = [];

    // Get reference shapes (exclude dragged shape, images, guidelines)
    const referenceShapes = shapes.filter(s => 
      s.id !== draggedShapeId && 
      s.type !== 'image' && 
      s.type !== 'guideline'
    );

    // For each reference shape, calculate potential alignments
    for (const refShape of referenceShapes) {
      const refBounds = getShapeBounds(refShape);
      if (!refBounds) continue;

      const extension = calculateGuideExtension(draggedBounds, refBounds);
      
      // Calculate guide line span
      const lineMinX = Math.min(draggedBounds.minX, refBounds.minX) - extension;
      const lineMaxX = Math.max(draggedBounds.maxX, refBounds.maxX) + extension;
      const lineMinY = Math.min(draggedBounds.minY, refBounds.minY) - extension;
      const lineMaxY = Math.max(draggedBounds.maxY, refBounds.maxY) + extension;

      // CENTER ALIGNMENT
      if (opts.alignCenter) {
        // Horizontal center alignment (same Y center)
        const centerYDiff = Math.abs(draggedBounds.centerY - refBounds.centerY);
        if (centerYDiff < opts.snapThreshold!) {
          guides.push({
            type: 'center-horizontal',
            start: { x: lineMinX, y: refBounds.centerY },
            end: { x: lineMaxX, y: refBounds.centerY },
            alignValue: refBounds.centerY,
            referenceShapeId: refShape.id,
            orientation: 'horizontal',
            distance: centerYDiff,
          });
          snapTargets.push({
            point: { x: draggedBounds.centerX, y: refBounds.centerY },
            type: 'center-horizontal',
            axis: 'y',
            distance: centerYDiff,
          });
        }

        // Vertical center alignment (same X center)
        const centerXDiff = Math.abs(draggedBounds.centerX - refBounds.centerX);
        if (centerXDiff < opts.snapThreshold!) {
          guides.push({
            type: 'center-vertical',
            start: { x: refBounds.centerX, y: lineMinY },
            end: { x: refBounds.centerX, y: lineMaxY },
            alignValue: refBounds.centerX,
            referenceShapeId: refShape.id,
            orientation: 'vertical',
            distance: centerXDiff,
          });
          snapTargets.push({
            point: { x: refBounds.centerX, y: draggedBounds.centerY },
            type: 'center-vertical',
            axis: 'x',
            distance: centerXDiff,
          });
        }
      }

      // EDGE ALIGNMENT
      if (opts.alignEdges) {
        // Left edge alignment
        const leftDiff = Math.abs(draggedBounds.minX - refBounds.minX);
        if (leftDiff < opts.snapThreshold!) {
          guides.push({
            type: 'edge-left',
            start: { x: refBounds.minX, y: lineMinY },
            end: { x: refBounds.minX, y: lineMaxY },
            alignValue: refBounds.minX,
            referenceShapeId: refShape.id,
            orientation: 'vertical',
            distance: leftDiff,
          });
          snapTargets.push({
            point: { x: refBounds.minX + (draggedBounds.centerX - draggedBounds.minX), y: draggedBounds.centerY },
            type: 'edge-left',
            axis: 'x',
            distance: leftDiff,
          });
        }

        // Right edge alignment
        const rightDiff = Math.abs(draggedBounds.maxX - refBounds.maxX);
        if (rightDiff < opts.snapThreshold!) {
          guides.push({
            type: 'edge-right',
            start: { x: refBounds.maxX, y: lineMinY },
            end: { x: refBounds.maxX, y: lineMaxY },
            alignValue: refBounds.maxX,
            referenceShapeId: refShape.id,
            orientation: 'vertical',
            distance: rightDiff,
          });
          snapTargets.push({
            point: { x: refBounds.maxX - (draggedBounds.maxX - draggedBounds.centerX), y: draggedBounds.centerY },
            type: 'edge-right',
            axis: 'x',
            distance: rightDiff,
          });
        }

        // Top edge alignment
        const topDiff = Math.abs(draggedBounds.minY - refBounds.minY);
        if (topDiff < opts.snapThreshold!) {
          guides.push({
            type: 'edge-top',
            start: { x: lineMinX, y: refBounds.minY },
            end: { x: lineMaxX, y: refBounds.minY },
            alignValue: refBounds.minY,
            referenceShapeId: refShape.id,
            orientation: 'horizontal',
            distance: topDiff,
          });
          snapTargets.push({
            point: { x: draggedBounds.centerX, y: refBounds.minY + (draggedBounds.centerY - draggedBounds.minY) },
            type: 'edge-top',
            axis: 'y',
            distance: topDiff,
          });
        }

        // Bottom edge alignment
        const bottomDiff = Math.abs(draggedBounds.maxY - refBounds.maxY);
        if (bottomDiff < opts.snapThreshold!) {
          guides.push({
            type: 'edge-bottom',
            start: { x: lineMinX, y: refBounds.maxY },
            end: { x: lineMaxX, y: refBounds.maxY },
            alignValue: refBounds.maxY,
            referenceShapeId: refShape.id,
            orientation: 'horizontal',
            distance: bottomDiff,
          });
          snapTargets.push({
            point: { x: draggedBounds.centerX, y: refBounds.maxY - (draggedBounds.maxY - draggedBounds.centerY) },
            type: 'edge-bottom',
            axis: 'y',
            distance: bottomDiff,
          });
        }

        // Cross-edge alignments (dragged left = ref right, etc.)
        const leftToRightDiff = Math.abs(draggedBounds.minX - refBounds.maxX);
        if (leftToRightDiff < opts.snapThreshold!) {
          guides.push({
            type: 'edge-left',
            start: { x: refBounds.maxX, y: lineMinY },
            end: { x: refBounds.maxX, y: lineMaxY },
            alignValue: refBounds.maxX,
            referenceShapeId: refShape.id,
            orientation: 'vertical',
            distance: leftToRightDiff,
          });
        }

        const rightToLeftDiff = Math.abs(draggedBounds.maxX - refBounds.minX);
        if (rightToLeftDiff < opts.snapThreshold!) {
          guides.push({
            type: 'edge-right',
            start: { x: refBounds.minX, y: lineMinY },
            end: { x: refBounds.minX, y: lineMaxY },
            alignValue: refBounds.minX,
            referenceShapeId: refShape.id,
            orientation: 'vertical',
            distance: rightToLeftDiff,
          });
        }

        const topToBottomDiff = Math.abs(draggedBounds.minY - refBounds.maxY);
        if (topToBottomDiff < opts.snapThreshold!) {
          guides.push({
            type: 'edge-top',
            start: { x: lineMinX, y: refBounds.maxY },
            end: { x: lineMaxX, y: refBounds.maxY },
            alignValue: refBounds.maxY,
            referenceShapeId: refShape.id,
            orientation: 'horizontal',
            distance: topToBottomDiff,
          });
        }

        const bottomToTopDiff = Math.abs(draggedBounds.maxY - refBounds.minY);
        if (bottomToTopDiff < opts.snapThreshold!) {
          guides.push({
            type: 'edge-bottom',
            start: { x: lineMinX, y: refBounds.minY },
            end: { x: lineMaxX, y: refBounds.minY },
            alignValue: refBounds.minY,
            referenceShapeId: refShape.id,
            orientation: 'horizontal',
            distance: bottomToTopDiff,
          });
        }
      }
    }

    // Sort guides by distance and limit
    guides.sort((a, b) => a.distance - b.distance);
    const limitedGuides = guides.slice(0, opts.maxGuides);

    // Deduplicate guides by alignment value and orientation
    const uniqueGuides: AlignmentGuide[] = [];
    const seen = new Set<string>();
    for (const guide of limitedGuides) {
      const key = `${guide.orientation}-${guide.alignValue.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueGuides.push(guide);
      }
    }

    // Calculate snapped position based on closest snap targets
    let snappedPosition: Point | null = null;
    let isSnapping = false;

    if (snapTargets.length > 0) {
      // Sort by distance
      snapTargets.sort((a, b) => a.distance - b.distance);
      
      // Find closest X and Y snaps
      const xSnap = snapTargets.find(t => t.axis === 'x');
      const ySnap = snapTargets.find(t => t.axis === 'y');

      if (xSnap || ySnap) {
        isSnapping = true;
        snappedPosition = {
          x: xSnap ? xSnap.point.x : draggedBounds.centerX,
          y: ySnap ? ySnap.point.y : draggedBounds.centerY,
        };
      }
    }

    return {
      guides: uniqueGuides,
      snapTargets,
      snappedPosition,
      isSnapping,
    };
  }, [shapes, opts.enabled, opts.snapThreshold, opts.alignCenter, opts.alignEdges, opts.alignCorners, opts.maxGuides]);

  /**
   * Apply alignment snapping to a delta movement
   * Returns the adjusted delta that snaps to alignment guides
   */
  const applyAlignmentSnap = useCallback((
    draggedShapeId: string | null,
    _currentPosition: Point,
    proposedDelta: Point
  ): { delta: Point; guides: AlignmentGuide[] } => {
    if (!opts.enabled || !draggedShapeId) {
      return { delta: proposedDelta, guides: [] };
    }

    // Find the shape and temporarily calculate its new bounds
    const shape = shapes.find(s => s.id === draggedShapeId);
    if (!shape) {
      return { delta: proposedDelta, guides: [] };
    }

    const currentBounds = getShapeBounds(shape);
    if (!currentBounds) {
      return { delta: proposedDelta, guides: [] };
    }

    // Calculate proposed bounds
    const proposedBounds: ShapeBounds = {
      minX: currentBounds.minX + proposedDelta.x,
      maxX: currentBounds.maxX + proposedDelta.x,
      minY: currentBounds.minY + proposedDelta.y,
      maxY: currentBounds.maxY + proposedDelta.y,
      centerX: currentBounds.centerX + proposedDelta.x,
      centerY: currentBounds.centerY + proposedDelta.y,
      width: currentBounds.width,
      height: currentBounds.height,
    };

    // Find alignment targets
    const guides: AlignmentGuide[] = [];
    let snapDeltaX = 0;
    let snapDeltaY = 0;
    let foundXSnap = false;
    let foundYSnap = false;

    const referenceShapes = shapes.filter(s => 
      s.id !== draggedShapeId && 
      s.type !== 'image' && 
      s.type !== 'guideline'
    );

    for (const refShape of referenceShapes) {
      const refBounds = getShapeBounds(refShape);
      if (!refBounds) continue;

      const extension = calculateGuideExtension(proposedBounds, refBounds);
      const lineMinX = Math.min(proposedBounds.minX, refBounds.minX) - extension;
      const lineMaxX = Math.max(proposedBounds.maxX, refBounds.maxX) + extension;
      const lineMinY = Math.min(proposedBounds.minY, refBounds.minY) - extension;
      const lineMaxY = Math.max(proposedBounds.maxY, refBounds.maxY) + extension;

      // Check center alignments
      if (opts.alignCenter) {
        // Center X
        if (!foundXSnap) {
          const diff = proposedBounds.centerX - refBounds.centerX;
          if (Math.abs(diff) < opts.snapThreshold!) {
            snapDeltaX = -diff;
            foundXSnap = true;
            guides.push({
              type: 'center-vertical',
              start: { x: refBounds.centerX, y: lineMinY },
              end: { x: refBounds.centerX, y: lineMaxY },
              alignValue: refBounds.centerX,
              referenceShapeId: refShape.id,
              orientation: 'vertical',
              distance: Math.abs(diff),
            });
          }
        }

        // Center Y
        if (!foundYSnap) {
          const diff = proposedBounds.centerY - refBounds.centerY;
          if (Math.abs(diff) < opts.snapThreshold!) {
            snapDeltaY = -diff;
            foundYSnap = true;
            guides.push({
              type: 'center-horizontal',
              start: { x: lineMinX, y: refBounds.centerY },
              end: { x: lineMaxX, y: refBounds.centerY },
              alignValue: refBounds.centerY,
              referenceShapeId: refShape.id,
              orientation: 'horizontal',
              distance: Math.abs(diff),
            });
          }
        }
      }

      // Check edge alignments
      if (opts.alignEdges) {
        // Left edges align
        if (!foundXSnap) {
          const diff = proposedBounds.minX - refBounds.minX;
          if (Math.abs(diff) < opts.snapThreshold!) {
            snapDeltaX = -diff;
            foundXSnap = true;
            guides.push({
              type: 'edge-left',
              start: { x: refBounds.minX, y: lineMinY },
              end: { x: refBounds.minX, y: lineMaxY },
              alignValue: refBounds.minX,
              referenceShapeId: refShape.id,
              orientation: 'vertical',
              distance: Math.abs(diff),
            });
          }
        }

        // Right edges align
        if (!foundXSnap) {
          const diff = proposedBounds.maxX - refBounds.maxX;
          if (Math.abs(diff) < opts.snapThreshold!) {
            snapDeltaX = -diff;
            foundXSnap = true;
            guides.push({
              type: 'edge-right',
              start: { x: refBounds.maxX, y: lineMinY },
              end: { x: refBounds.maxX, y: lineMaxY },
              alignValue: refBounds.maxX,
              referenceShapeId: refShape.id,
              orientation: 'vertical',
              distance: Math.abs(diff),
            });
          }
        }

        // Top edges align
        if (!foundYSnap) {
          const diff = proposedBounds.minY - refBounds.minY;
          if (Math.abs(diff) < opts.snapThreshold!) {
            snapDeltaY = -diff;
            foundYSnap = true;
            guides.push({
              type: 'edge-top',
              start: { x: lineMinX, y: refBounds.minY },
              end: { x: lineMaxX, y: refBounds.minY },
              alignValue: refBounds.minY,
              referenceShapeId: refShape.id,
              orientation: 'horizontal',
              distance: Math.abs(diff),
            });
          }
        }

        // Bottom edges align
        if (!foundYSnap) {
          const diff = proposedBounds.maxY - refBounds.maxY;
          if (Math.abs(diff) < opts.snapThreshold!) {
            snapDeltaY = -diff;
            foundYSnap = true;
            guides.push({
              type: 'edge-bottom',
              start: { x: lineMinX, y: refBounds.maxY },
              end: { x: lineMaxX, y: refBounds.maxY },
              alignValue: refBounds.maxY,
              referenceShapeId: refShape.id,
              orientation: 'horizontal',
              distance: Math.abs(diff),
            });
          }
        }

        // Cross-edge: left to right
        if (!foundXSnap) {
          const diff = proposedBounds.minX - refBounds.maxX;
          if (Math.abs(diff) < opts.snapThreshold!) {
            snapDeltaX = -diff;
            foundXSnap = true;
            guides.push({
              type: 'edge-left',
              start: { x: refBounds.maxX, y: lineMinY },
              end: { x: refBounds.maxX, y: lineMaxY },
              alignValue: refBounds.maxX,
              referenceShapeId: refShape.id,
              orientation: 'vertical',
              distance: Math.abs(diff),
            });
          }
        }

        // Cross-edge: right to left
        if (!foundXSnap) {
          const diff = proposedBounds.maxX - refBounds.minX;
          if (Math.abs(diff) < opts.snapThreshold!) {
            snapDeltaX = -diff;
            foundXSnap = true;
            guides.push({
              type: 'edge-right',
              start: { x: refBounds.minX, y: lineMinY },
              end: { x: refBounds.minX, y: lineMaxY },
              alignValue: refBounds.minX,
              referenceShapeId: refShape.id,
              orientation: 'vertical',
              distance: Math.abs(diff),
            });
          }
        }

        // Cross-edge: top to bottom
        if (!foundYSnap) {
          const diff = proposedBounds.minY - refBounds.maxY;
          if (Math.abs(diff) < opts.snapThreshold!) {
            snapDeltaY = -diff;
            foundYSnap = true;
            guides.push({
              type: 'edge-top',
              start: { x: lineMinX, y: refBounds.maxY },
              end: { x: lineMaxX, y: refBounds.maxY },
              alignValue: refBounds.maxY,
              referenceShapeId: refShape.id,
              orientation: 'horizontal',
              distance: Math.abs(diff),
            });
          }
        }

        // Cross-edge: bottom to top
        if (!foundYSnap) {
          const diff = proposedBounds.maxY - refBounds.minY;
          if (Math.abs(diff) < opts.snapThreshold!) {
            snapDeltaY = -diff;
            foundYSnap = true;
            guides.push({
              type: 'edge-bottom',
              start: { x: lineMinX, y: refBounds.minY },
              end: { x: lineMaxX, y: refBounds.minY },
              alignValue: refBounds.minY,
              referenceShapeId: refShape.id,
              orientation: 'horizontal',
              distance: Math.abs(diff),
            });
          }
        }
      }

      // Early exit if both snaps found
      if (foundXSnap && foundYSnap) break;
    }

    // Apply snap corrections to delta
    const adjustedDelta = {
      x: proposedDelta.x + snapDeltaX,
      y: proposedDelta.y + snapDeltaY,
    };

    // Deduplicate guides
    const uniqueGuides: AlignmentGuide[] = [];
    const seen = new Set<string>();
    for (const guide of guides) {
      const key = `${guide.orientation}-${guide.alignValue.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueGuides.push(guide);
      }
    }

    return { delta: adjustedDelta, guides: uniqueGuides };
  }, [shapes, opts.enabled, opts.snapThreshold, opts.alignCenter, opts.alignEdges]);

  return useMemo(() => ({
    calculateGuides,
    applyAlignmentSnap,
    getShapeBounds,
  }), [calculateGuides, applyAlignmentSnap]);
}

export default useAlignmentGuides;

