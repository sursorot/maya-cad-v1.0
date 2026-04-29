import type { Point, Shape, SnapSettings, ArcShape, WallShape, DimensionShape } from '../types';
import { roundPointToPrecision } from '../types';
import { catmullRomPoint, calculateArcGeometry } from '../utils/measurements';
import { distance, isPointNear } from '@maya/workspace-domain/workspace/core/utils';
import { getFeatureFlags } from '../../../config/featureFlags';

export interface SnapResult {
  point: Point;
  snapped: boolean;
  snapType?: string;
  snapToPoint?: Point;
  snapMetadata?: any;
}

// Base snap threshold in meters - scales with zoom for consistent screen-space snapping
// At default zoom (10m view), this gives ~15cm snap radius
// At inch-precision zoom (0.3m view), threshold scales down to ~0.5cm for precise work
const BASE_SNAP_THRESHOLD = 0.15;
const MIN_SNAP_SCALE = 0.1; // Minimum zoom scale multiplier for fine precision work
const GUIDE_EXTENT = 10000; // Large value to approximate infinite guidelines

// PERFORMANCE: Maximum shapes to consider for intersection snapping (O(n²) operation)
const MAX_INTERSECTION_SHAPES = 50;

// PERFORMANCE: Quick bounding box check to skip shapes far from snap point
const getShapeBounds = (shape: Shape): { minX: number; maxX: number; minY: number; maxY: number } | null => {
  switch (shape.type) {
    case 'line':
      return {
        minX: Math.min(shape.start.x, shape.end.x),
        maxX: Math.max(shape.start.x, shape.end.x),
        minY: Math.min(shape.start.y, shape.end.y),
        maxY: Math.max(shape.start.y, shape.end.y),
      };
    case 'circle':
      return {
        minX: shape.center.x - shape.radius,
        maxX: shape.center.x + shape.radius,
        minY: shape.center.y - shape.radius,
        maxY: shape.center.y + shape.radius,
      };
    case 'rectangle':
      return {
        minX: Math.min(shape.start.x, shape.end.x),
        maxX: Math.max(shape.start.x, shape.end.x),
        minY: Math.min(shape.start.y, shape.end.y),
        maxY: Math.max(shape.start.y, shape.end.y),
      };
    case 'polyline':
    case 'curve':
    case 'zone': {
      const points = shape.points;
      if (!points || points.length === 0) return null;
      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      };
    }
    case 'arc':
      return {
        minX: Math.min(shape.start.x, shape.end.x, shape.controlPoint.x),
        maxX: Math.max(shape.start.x, shape.end.x, shape.controlPoint.x),
        minY: Math.min(shape.start.y, shape.end.y, shape.controlPoint.y),
        maxY: Math.max(shape.start.y, shape.end.y, shape.controlPoint.y),
      };
    case 'wall':
      if (!shape.centerline || shape.centerline.length === 0) return null;
      const wallXs = shape.centerline.map(p => p.x);
      const wallYs = shape.centerline.map(p => p.y);
      const thickness = shape.thickness || 0.2;
      return {
        minX: Math.min(...wallXs) - thickness,
        maxX: Math.max(...wallXs) + thickness,
        minY: Math.min(...wallYs) - thickness,
        maxY: Math.max(...wallYs) + thickness,
      };
    case 'guideline':
      // Guidelines are infinite, always consider them
      return null;
    default:
      return null;
  }
};

// PERFORMANCE: Check if point is near shape bounds (with padding)
const isPointNearBounds = (
  point: Point,
  bounds: { minX: number; maxX: number; minY: number; maxY: number } | null,
  padding: number
): boolean => {
  if (!bounds) return true; // If no bounds, always consider (e.g., guidelines)
  return (
    point.x >= bounds.minX - padding &&
    point.x <= bounds.maxX + padding &&
    point.y >= bounds.minY - padding &&
    point.y <= bounds.maxY + padding
  );
};

// Helper to check if a curve is closed
const isCurveClosed = (points: Point[], threshold: number = 0.001): boolean => {
  if (points.length < 3) return false;
  const first = points[0];
  const last = points[points.length - 1];
  return isPointNear(first, last, threshold);
};

export const useSnapping = (
  shapes: Shape[],
  snapSettings: SnapSettings | undefined,
  gridSpacing: number = 1,
  zoomScale: number = 1,
  spatialQuery?: { getShapesNearPoint: (point: Point, radius: number) => Shape[] }
) => {
  type CustomSnapPoint = { point: Point; type: string };

  const findSnapPoint = (
    point: Point,
    excludeShapeId?: string,
    additionalPoints?: Point[],
    customSnapPoints?: CustomSnapPoint[],
  ): SnapResult => {
    // Get precision setting (default to 0 = disabled if not set)
    const precision = snapSettings?.precision ?? 0;

    // Helper to apply precision rounding to a result
    const applyPrecision = (result: SnapResult): SnapResult => {
      if (!precision || precision <= 0) return result;
      const roundedPoint = roundPointToPrecision(result.point, precision);
      return {
        ...result,
        point: roundedPoint,
        snapToPoint: result.snapToPoint ? roundPointToPrecision(result.snapToPoint, precision) : result.snapToPoint,
      };
    };

    if (!snapSettings?.enabled) {
      // Still apply precision even when snapping is disabled
      return applyPrecision({ point, snapped: false });
    }

    const snapThreshold = BASE_SNAP_THRESHOLD * Math.max(zoomScale, MIN_SNAP_SCALE);

    const snapPoints: Array<{ point: Point; type: string; distance: number; metadata?: any }> = [];

    // Add additional points (e.g., from current polyline being drawn) as snap targets
    if (additionalPoints && additionalPoints.length >= 2) {
      // Endpoint snapping for all points
      if (snapSettings.endpoint) {
        additionalPoints.forEach((pt) => {
          snapPoints.push({
            point: pt,
            type: 'endpoint',
            distance: distance(point, pt),
          });
        });
      }

      // Midpoint and nearest point snapping for segments between consecutive points
      for (let i = 0; i < additionalPoints.length - 1; i++) {
        const p1 = additionalPoints[i];
        const p2 = additionalPoints[i + 1];

        // Midpoint snapping
        if (snapSettings.midpoint) {
          const midpoint = {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
          };
          snapPoints.push({
            point: midpoint,
            type: 'midpoint',
            distance: distance(point, midpoint),
          });
        }

        // Nearest point on segment
        if (snapSettings.nearest) {
          const nearest = nearestPointOnLine(point, p1, p2);
          if (nearest) {
            snapPoints.push({
              point: nearest,
              type: 'nearest',
              distance: distance(point, nearest),
            });
          }
        }
      }
    }

    // Filter out the shape being drawn/edited
    // If spatial query is available, use it to get initial set of candidate shapes
    const proximityPadding = snapThreshold * 3; // Extra padding for safety
    let relevantShapes: Shape[];

    if (spatialQuery) {
      relevantShapes = spatialQuery.getShapesNearPoint(point, proximityPadding).filter(s => s.id !== excludeShapeId);
    } else {
      const baseFilteredShapes = shapes.filter(s => s.id !== excludeShapeId);

      // PERFORMANCE: Filter shapes by proximity to snap point
      // This significantly reduces calculations for large drawings
      relevantShapes = baseFilteredShapes.filter(shape => {
        const bounds = getShapeBounds(shape);
        return isPointNearBounds(point, bounds, proximityPadding);
      });
    }

    // Calculate intersections between additional points (current polyline) and other shapes
    // PERFORMANCE: Use feature flag to enable/disable intersection snapping
    const flags = getFeatureFlags();
    if (additionalPoints && additionalPoints.length >= 2 && snapSettings.intersection && flags.enableIntersectionSnapping) {
      for (let i = 0; i < additionalPoints.length - 1; i++) {
        const p1 = additionalPoints[i];
        const p2 = additionalPoints[i + 1];

        relevantShapes.forEach((shape) => {
          if (shape.type === 'line') {
            const intersection = lineIntersection(p1, p2, shape.start, shape.end);
            if (intersection) {
              snapPoints.push({
                point: intersection,
                type: 'intersection',
                distance: distance(point, intersection),
              });
            }
          } else if (shape.type === 'polyline') {
            // Check intersections with each segment of the polyline
            for (let j = 0; j < shape.points.length - 1; j++) {
              const intersection = lineIntersection(
                p1,
                p2,
                shape.points[j],
                shape.points[j + 1]
              );
              if (intersection) {
                snapPoints.push({
                  point: intersection,
                  type: 'intersection',
                  distance: distance(point, intersection),
                });
              }
            }
          } else if (shape.type === 'arc') {
            const descriptor = getArcDescriptor(shape);
            if (descriptor) {
              const segments = Math.max(12, Math.ceil(Math.abs(descriptor.sweep) * 12));
              let prevPoint = pointOnArc(descriptor, 0);
              for (let seg = 1; seg <= segments; seg++) {
                const nextPoint = pointOnArc(descriptor, seg / segments);
                const intersection = lineIntersection(p1, p2, prevPoint, nextPoint);
                if (intersection) {
                  snapPoints.push({
                    point: intersection,
                    type: 'intersection',
                    distance: distance(point, intersection),
                  });
                }
                prevPoint = nextPoint;
              }
            } else {
              const intersection = lineIntersection(p1, p2, shape.start, shape.end);
              if (intersection) {
                snapPoints.push({
                  point: intersection,
                  type: 'intersection',
                  distance: distance(point, intersection),
                });
              }
            }
          } else if (shape.type === 'circle') {
            const intersections = lineCircleIntersections(p1, p2, shape.center, shape.radius);
            intersections.forEach((pt) => {
              snapPoints.push({
                point: pt,
                type: 'intersection',
                distance: distance(point, pt),
              });
            });
          } else if (shape.type === 'guideline') {
            if (shape.orientation === 'freeform' && shape.start && shape.end) {
              const intersection = lineIntersection(p1, p2, shape.start, shape.end);
              if (intersection) {
                snapPoints.push({
                  point: intersection,
                  type: 'intersection',
                  distance: distance(point, intersection),
                });
              }
            } else if (shape.orientation === 'horizontal' && shape.position !== undefined) {
              const intersection = segmentHorizontalIntersection(p1, p2, shape.position);
              if (intersection) {
                snapPoints.push({
                  point: intersection,
                  type: 'intersection',
                  distance: distance(point, intersection),
                });
              }
            } else if (shape.orientation === 'vertical' && shape.position !== undefined) {
              const intersection = segmentVerticalIntersection(p1, p2, shape.position);
              if (intersection) {
                snapPoints.push({
                  point: intersection,
                  type: 'intersection',
                  distance: distance(point, intersection),
                });
              }
            }
          } else if (shape.type === 'rectangle') {
            // Check intersection with each edge of the rectangle
            const rectEdges = [
              [shape.start, { x: shape.end.x, y: shape.start.y }], // Top edge
              [{ x: shape.end.x, y: shape.start.y }, shape.end], // Right edge
              [shape.end, { x: shape.start.x, y: shape.end.y }], // Bottom edge
              [{ x: shape.start.x, y: shape.end.y }, shape.start], // Left edge
            ];

            rectEdges.forEach(([edgeStart, edgeEnd]) => {
              const intersection = lineIntersection(p1, p2, edgeStart, edgeEnd);
              if (intersection) {
                snapPoints.push({
                  point: intersection,
                  type: 'intersection',
                  distance: distance(point, intersection),
                });
              }
            });
          } else if (shape.type === 'curve' && shape.points.length >= 2) {
            // Check intersections with curve segments (sampled)
            const segmentsPerPoint = 20;
            const tension = 0;
            const isClosed = isCurveClosed(shape.points);

            for (let k = 0; k < shape.points.length - 1; k++) {
              let c0: Point, c3: Point;
              const c1 = shape.points[k];
              const c2 = shape.points[k + 1];

              if (isClosed) {
                c0 = k === 0 ? shape.points[shape.points.length - 2] : shape.points[k - 1];
                c3 = k === shape.points.length - 2 ? shape.points[1] : shape.points[k + 2];
              } else {
                c0 = k === 0 ? shape.points[0] : shape.points[k - 1];
                c3 = k === shape.points.length - 2 ? shape.points[k + 1] : shape.points[k + 2];
              }

              let prevCurvePoint = c1;

              for (let t = 1; t <= segmentsPerPoint; t++) {
                const tVal = t / segmentsPerPoint;
                const curvePoint = catmullRomPoint(c0, c1, c2, c3, tVal, tension);

                // Check if line segment (p1-p2) intersects with curve segment
                const intersection = lineIntersection(p1, p2, prevCurvePoint, curvePoint);
                if (intersection) {
                  snapPoints.push({
                    point: intersection,
                    type: 'intersection',
                    distance: distance(point, intersection),
                  });
                }

                prevCurvePoint = curvePoint;
              }
            }
          } else if (shape.type === 'dimension') {
            // Check intersections with dimension line and extension lines
            const dimShape = shape as DimensionShape;
            const { start: dimStart, end: dimEnd, offset: dimOffset } = dimShape;
            const dx = dimEnd.x - dimStart.x;
            const dy = dimEnd.y - dimStart.y;
            const length = Math.hypot(dx, dy);

            if (length > 0) {
              const px = -dy / length;
              const py = dx / length;
              const ox = px * dimOffset;
              const oy = py * dimOffset;
              const dimP1 = { x: dimStart.x + ox, y: dimStart.y + oy };
              const dimP2 = { x: dimEnd.x + ox, y: dimEnd.y + oy };

              // Intersection with dimension line
              const dimLineIntersection = lineIntersection(p1, p2, dimP1, dimP2);
              if (dimLineIntersection) {
                snapPoints.push({
                  point: dimLineIntersection,
                  type: 'intersection',
                  distance: distance(point, dimLineIntersection),
                });
              }

              // Intersections with extension lines
              if (Math.abs(dimOffset) > 0.01) {
                const ext1Intersection = lineIntersection(p1, p2, dimStart, dimP1);
                if (ext1Intersection) {
                  snapPoints.push({
                    point: ext1Intersection,
                    type: 'intersection',
                    distance: distance(point, ext1Intersection),
                  });
                }
                const ext2Intersection = lineIntersection(p1, p2, dimEnd, dimP2);
                if (ext2Intersection) {
                  snapPoints.push({
                    point: ext2Intersection,
                    type: 'intersection',
                    distance: distance(point, ext2Intersection),
                  });
                }
              }
            }
          }
        });
      }
    }

    if (customSnapPoints && customSnapPoints.length > 0) {
      customSnapPoints.forEach(({ point: snapPoint, type }) => {
        snapPoints.push({
          point: snapPoint,
          type,
          distance: distance(point, snapPoint),
        });
      });
    }

    relevantShapes.forEach((shape) => {
      if (shape.type === 'line') {
        // Endpoint snapping
        if (snapSettings.endpoint) {
          snapPoints.push({
            point: shape.start,
            type: 'endpoint',
            distance: distance(point, shape.start),
          });
          snapPoints.push({
            point: shape.end,
            type: 'endpoint',
            distance: distance(point, shape.end),
          });
        }
      } else if (shape.type === 'arc') {
        // Endpoint snapping for arc
        if (snapSettings.endpoint) {
          snapPoints.push({
            point: shape.start,
            type: 'endpoint',
            distance: distance(point, shape.start),
          });
          snapPoints.push({
            point: shape.end,
            type: 'endpoint',
            distance: distance(point, shape.end),
          });
        }

        const arcDescriptor = getArcDescriptor(shape);

        if (snapSettings.center && arcDescriptor) {
          snapPoints.push({
            point: arcDescriptor.center,
            type: 'center',
            distance: distance(point, arcDescriptor.center),
          });
        }

        if (snapSettings.midpoint) {
          const midpoint = arcMidpoint(shape, arcDescriptor);
          snapPoints.push({
            point: midpoint,
            type: 'midpoint',
            distance: distance(point, midpoint),
          });
        }

        if (snapSettings.nearest) {
          const nearest = nearestPointOnArcSegment(shape, point, arcDescriptor);
          snapPoints.push({
            point: nearest,
            type: 'nearest',
            distance: distance(point, nearest),
          });
        }
      } else if (shape.type === 'polyline') {
        // Endpoint snapping for polyline vertices
        if (snapSettings.endpoint) {
          shape.points.forEach((pt) => {
            snapPoints.push({
              point: pt,
              type: 'endpoint',
              distance: distance(point, pt),
            });
          });
        }
      } else if (shape.type === 'circle') {
        // Center snapping for circles
        if (snapSettings.center) {
          snapPoints.push({
            point: shape.center,
            type: 'center',
            distance: distance(point, shape.center),
          });
        }

        // Quadrant snapping for circles (4 cardinal points on perimeter)
        if (snapSettings.quadrant) {
          const quadrantPoints = [
            { x: shape.center.x + shape.radius, y: shape.center.y }, // Right
            { x: shape.center.x - shape.radius, y: shape.center.y }, // Left
            { x: shape.center.x, y: shape.center.y + shape.radius }, // Bottom
            { x: shape.center.x, y: shape.center.y - shape.radius }, // Top
          ];

          quadrantPoints.forEach((qPoint) => {
            snapPoints.push({
              point: qPoint,
              type: 'quadrant',
              distance: distance(point, qPoint),
            });
          });
        }

        // Nearest point on circle perimeter
        if (snapSettings.nearest) {
          const nearest = nearestPointOnCircle(point, shape.center, shape.radius);
          snapPoints.push({
            point: nearest,
            type: 'nearest',
            distance: distance(point, nearest),
          });
        }
      } else if (shape.type === 'guideline') {
        if (shape.orientation === 'freeform' && shape.start && shape.end) {
          if (snapSettings.endpoint) {
            snapPoints.push({
              point: shape.start,
              type: 'endpoint',
              distance: distance(point, shape.start),
            });
            snapPoints.push({
              point: shape.end,
              type: 'endpoint',
              distance: distance(point, shape.end),
            });
          }

          if (snapSettings.midpoint) {
            const midpoint = {
              x: (shape.start.x + shape.end.x) / 2,
              y: (shape.start.y + shape.end.y) / 2,
            };
            snapPoints.push({
              point: midpoint,
              type: 'midpoint',
              distance: distance(point, midpoint),
            });
          }

          if (snapSettings.nearest) {
            const nearest = nearestPointOnLine(point, shape.start, shape.end);
            snapPoints.push({
              point: nearest,
              type: 'nearest',
              distance: distance(point, nearest),
            });
          }
        } else if (shape.orientation === 'horizontal' && shape.position !== undefined) {
          if (snapSettings.nearest) {
            const nearest = { x: point.x, y: shape.position };
            snapPoints.push({
              point: nearest,
              type: 'nearest',
              distance: Math.abs(point.y - shape.position),
            });
          }
        } else if (shape.orientation === 'vertical' && shape.position !== undefined) {
          if (snapSettings.nearest) {
            const nearest = { x: shape.position, y: point.y };
            snapPoints.push({
              point: nearest,
              type: 'nearest',
              distance: Math.abs(point.x - shape.position),
            });
          }
        }
      } else if (shape.type === 'marker') {
        // Marker point snapping - markers are explicit snap targets
        if (snapSettings.marker) {
          snapPoints.push({
            point: shape.position,
            type: 'marker',
            distance: distance(point, shape.position),
          });
        }
      } else if (shape.type === 'rectangle') {
        // Get the 4 corners of the rectangle
        const corners = [
          shape.start,
          shape.end,
          { x: shape.start.x, y: shape.end.y },
          { x: shape.end.x, y: shape.start.y },
        ];

        // Endpoint snapping for rectangle corners
        if (snapSettings.endpoint) {
          corners.forEach((corner) => {
            snapPoints.push({
              point: corner,
              type: 'endpoint',
              distance: distance(point, corner),
            });
          });
        }

        // Center snapping for rectangle
        if (snapSettings.center) {
          const center = {
            x: (shape.start.x + shape.end.x) / 2,
            y: (shape.start.y + shape.end.y) / 2,
          };
          snapPoints.push({
            point: center,
            type: 'center',
            distance: distance(point, center),
          });
        }

        // Midpoint snapping for each edge
        if (snapSettings.midpoint) {
          const edgeMidpoints = [
            { x: (shape.start.x + shape.end.x) / 2, y: shape.start.y }, // Top edge
            { x: (shape.start.x + shape.end.x) / 2, y: shape.end.y }, // Bottom edge
            { x: shape.start.x, y: (shape.start.y + shape.end.y) / 2 }, // Left edge
            { x: shape.end.x, y: (shape.start.y + shape.end.y) / 2 }, // Right edge
          ];

          edgeMidpoints.forEach((midpoint) => {
            snapPoints.push({
              point: midpoint,
              type: 'midpoint',
              distance: distance(point, midpoint),
            });
          });
        }

        // Nearest point on rectangle edges
        if (snapSettings.nearest) {
          const edges = [
            [shape.start, { x: shape.end.x, y: shape.start.y }], // Top edge
            [{ x: shape.end.x, y: shape.start.y }, shape.end], // Right edge
            [shape.end, { x: shape.start.x, y: shape.end.y }], // Bottom edge
            [{ x: shape.start.x, y: shape.end.y }, shape.start], // Left edge
          ];

          edges.forEach(([edgeStart, edgeEnd]) => {
            const nearest = nearestPointOnLine(point, edgeStart, edgeEnd);
            snapPoints.push({
              point: nearest,
              type: 'nearest',
              distance: distance(point, nearest),
            });
          });
        }
      } else if (shape.type === 'curve') {
        // Endpoint snapping for curve control points
        if (snapSettings.endpoint) {
          shape.points.forEach((pt) => {
            snapPoints.push({
              point: pt,
              type: 'endpoint',
              distance: distance(point, pt),
            });
          });
        }

        // Midpoint snapping between control points
        if (snapSettings.midpoint) {
          for (let i = 0; i < shape.points.length - 1; i++) {
            const midpoint = {
              x: (shape.points[i].x + shape.points[i + 1].x) / 2,
              y: (shape.points[i].y + shape.points[i + 1].y) / 2,
            };
            snapPoints.push({
              point: midpoint,
              type: 'midpoint',
              distance: distance(point, midpoint),
            });
          }
        }

        // Nearest point on curve snapping
        if (snapSettings.nearest && shape.points.length >= 2) {
          let nearestPoint: Point | null = null;
          let minDist = Infinity;

          // Sample points along the curve and find the nearest
          const segmentsPerPoint = 20;
          const tension = 0;
          const isClosed = isCurveClosed(shape.points);

          for (let i = 0; i < shape.points.length - 1; i++) {
            let p0: Point, p3: Point;
            const p1 = shape.points[i];
            const p2 = shape.points[i + 1];

            if (isClosed) {
              p0 = i === 0 ? shape.points[shape.points.length - 2] : shape.points[i - 1];
              p3 = i === shape.points.length - 2 ? shape.points[1] : shape.points[i + 2];
            } else {
              p0 = i === 0 ? shape.points[0] : shape.points[i - 1];
              p3 = i === shape.points.length - 2 ? shape.points[i + 1] : shape.points[i + 2];
            }

            for (let j = 0; j <= segmentsPerPoint; j++) {
              const t = j / segmentsPerPoint;
              const curvePoint = catmullRomPoint(p0, p1, p2, p3, t, tension);
              const dist = distance(point, curvePoint);

              if (dist < minDist) {
                minDist = dist;
                nearestPoint = curvePoint;
              }
            }
          }

          if (nearestPoint) {
            snapPoints.push({
              point: nearestPoint,
              type: 'nearest',
              distance: minDist,
            });
          }
        }
      } else if (shape.type === 'wall' && shape.centerline.length >= 2) {
        const wallShape = shape as WallShape;
        const start = wallShape.centerline[0];
        const end = wallShape.centerline[wallShape.centerline.length - 1];
        const thickness = wallShape.thickness || 0.1524; // Default 6 inches
        const half = thickness / 2;

        // Calculate wall direction and perpendicular for edge points
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.hypot(dx, dy);
        const perpX = len > 0 ? -dy / len : 0;
        const perpY = len > 0 ? dx / len : 0;
        const faceNormal =
          wallShape.alignment === 'outside'
            ? { x: -perpX, y: -perpY }
            : wallShape.alignment === 'inside'
              ? { x: perpX, y: perpY }
              : null;

        if (snapSettings.endpoint) {
          // Centerline endpoints
          snapPoints.push({
            point: start,
            type: 'endpoint',
            distance: distance(point, start),
            metadata: {
              wallId: wallShape.id,
              endpoint: 'start',
              alignment: wallShape.alignment,
              faceNormal,
            },
          });
          snapPoints.push({
            point: end,
            type: 'endpoint',
            distance: distance(point, end),
            metadata: {
              wallId: wallShape.id,
              endpoint: 'end',
              alignment: wallShape.alignment,
              faceNormal,
            },
          });

          // Calculate wall direction unit vector
          const dirX = len > 0 ? dx / len : 0;
          const dirY = len > 0 ? dy / len : 0;

          // EXTENDED ENDPOINT snap points - on centerline but BEYOND the wall surface
          // These help position a new wall so its centerline starts past the existing wall's surface.
          // All walls need extension markers regardless of alignment since the wall end cap
          // always has half thickness extent from the centerline endpoint.
          // Using half thickness ensures proper wall-to-wall joining for all alignment types.
          let extendOffset = half;
          if (wallShape.alignment === 'outside') {
            extendOffset = thickness;
          }

          const startExtended = {
            x: start.x - dirX * extendOffset,  // Beyond start, away from wall
            y: start.y - dirY * extendOffset
          };
          const endExtended = {
            x: end.x + dirX * extendOffset,    // Beyond end, away from wall
            y: end.y + dirY * extendOffset
          };

          snapPoints.push(
            // Extended endpoints - on centerline but beyond wall surface
            // Use these to position adjacent room so centerlines don't overlap
            {
              point: startExtended,
              type: 'wall-extended',
              distance: distance(point, startExtended),
              metadata: {
                wallId: wallShape.id,
                endpoint: 'start',
                alignment: wallShape.alignment,
                faceNormal,
              },
            },
            {
              point: endExtended,
              type: 'wall-extended',
              distance: distance(point, endExtended),
              metadata: {
                wallId: wallShape.id,
                endpoint: 'end',
                alignment: wallShape.alignment,
                faceNormal,
              },
            },
          );
        }

        if (snapSettings.midpoint) {
          const midpoint = {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2,
          };
          snapPoints.push({
            point: midpoint,
            type: 'midpoint',
            distance: distance(point, midpoint),
          });
        }

        if (snapSettings.nearest) {
          const nearest = nearestPointOnLine(point, start, end);
          snapPoints.push({
            point: nearest,
            type: 'nearest',
            distance: distance(point, nearest),
          });
        }
      } else if (shape.type === 'dimension') {
        // Dimension shape snapping - snap to extension line endpoints and dimension line
        const dimShape = shape as DimensionShape;
        const { start: dimStart, end: dimEnd, offset: dimOffset } = dimShape;

        // Calculate geometry (same as DimensionShape component)
        const dx = dimEnd.x - dimStart.x;
        const dy = dimEnd.y - dimStart.y;
        const length = Math.hypot(dx, dy);

        if (length > 0) {
          // Perpendicular vector (rotated 90 degrees counter-clockwise)
          const px = -dy / length;
          const py = dx / length;

          // Offset vector
          const ox = px * dimOffset;
          const oy = py * dimOffset;

          // Dimension line endpoints (where extension lines meet the dimension line)
          const p1 = { x: dimStart.x + ox, y: dimStart.y + oy };
          const p2 = { x: dimEnd.x + ox, y: dimEnd.y + oy };

          // Endpoint snapping for all 4 key points
          if (snapSettings.endpoint) {
            // Base points (where extension lines originate)
            snapPoints.push({
              point: dimStart,
              type: 'endpoint',
              distance: distance(point, dimStart),
            });
            snapPoints.push({
              point: dimEnd,
              type: 'endpoint',
              distance: distance(point, dimEnd),
            });
            // Dimension line endpoints (where extension lines meet dimension line)
            snapPoints.push({
              point: p1,
              type: 'endpoint',
              distance: distance(point, p1),
            });
            snapPoints.push({
              point: p2,
              type: 'endpoint',
              distance: distance(point, p2),
            });
          }

          // Midpoint snapping for the dimension line
          if (snapSettings.midpoint) {
            const midpoint = {
              x: (p1.x + p2.x) / 2,
              y: (p1.y + p2.y) / 2,
            };
            snapPoints.push({
              point: midpoint,
              type: 'midpoint',
              distance: distance(point, midpoint),
            });

            // Also add midpoints of extension lines
            const ext1Mid = {
              x: (dimStart.x + p1.x) / 2,
              y: (dimStart.y + p1.y) / 2,
            };
            const ext2Mid = {
              x: (dimEnd.x + p2.x) / 2,
              y: (dimEnd.y + p2.y) / 2,
            };
            snapPoints.push({
              point: ext1Mid,
              type: 'midpoint',
              distance: distance(point, ext1Mid),
            });
            snapPoints.push({
              point: ext2Mid,
              type: 'midpoint',
              distance: distance(point, ext2Mid),
            });
          }

          // Nearest point snapping on dimension line and extension lines
          if (snapSettings.nearest) {
            // Nearest on dimension line
            const nearestOnDim = nearestPointOnLine(point, p1, p2);
            snapPoints.push({
              point: nearestOnDim,
              type: 'nearest',
              distance: distance(point, nearestOnDim),
            });

            // Nearest on extension lines (if offset is significant)
            if (Math.abs(dimOffset) > 0.01) {
              const nearestOnExt1 = nearestPointOnLine(point, dimStart, p1);
              const nearestOnExt2 = nearestPointOnLine(point, dimEnd, p2);
              snapPoints.push({
                point: nearestOnExt1,
                type: 'nearest',
                distance: distance(point, nearestOnExt1),
              });
              snapPoints.push({
                point: nearestOnExt2,
                type: 'nearest',
                distance: distance(point, nearestOnExt2),
              });
            }
          }
        }
      }

      if (shape.type === 'line') {

        // Midpoint snapping - with section subdivision support
        if (snapSettings.midpoint) {
          // Find all points that subdivide this line
          const subdivisionPoints: Point[] = [shape.start];

          // Add intersection points with other lines
          relevantShapes.forEach((otherShape) => {
            if (otherShape.id !== shape.id && otherShape.type === 'line') {
              const intersection = lineIntersection(
                shape.start,
                shape.end,
                otherShape.start,
                otherShape.end
              );
              if (intersection) {
                subdivisionPoints.push(intersection);
              }

              // Check if other line's endpoints lie on this line
              const startOnLine = pointLiesOnSegment(otherShape.start, shape.start, shape.end);
              const endOnLine = pointLiesOnSegment(otherShape.end, shape.start, shape.end);
              if (startOnLine) subdivisionPoints.push(otherShape.start);
              if (endOnLine) subdivisionPoints.push(otherShape.end);
            }
          });

          subdivisionPoints.push(shape.end);

          // Remove duplicates and sort along the line
          const uniquePoints = removeDuplicatePoints(subdivisionPoints);
          const sortedPoints = sortPointsAlongLine(uniquePoints, shape.start, shape.end);

          // Calculate midpoint of each section
          for (let i = 0; i < sortedPoints.length - 1; i++) {
            const sectionMidpoint = {
              x: (sortedPoints[i].x + sortedPoints[i + 1].x) / 2,
              y: (sortedPoints[i].y + sortedPoints[i + 1].y) / 2,
            };
            snapPoints.push({
              point: sectionMidpoint,
              type: 'midpoint',
              distance: distance(point, sectionMidpoint),
            });
          }
        }

        // Nearest point on line snapping
        if (snapSettings.nearest) {
          const nearest = nearestPointOnLine(point, shape.start, shape.end);
          snapPoints.push({
            point: nearest,
            type: 'nearest',
            distance: distance(point, nearest),
          });
        }

        // Perpendicular snapping - disabled for lines as it's redundant with "nearest"
        // "Nearest" already does perpendicular projection clamped to the segment
        // if (snapSettings.perpendicular) {
        //   const perpendicular = perpendicularPoint(point, shape.start, shape.end);
        //   if (perpendicular) {
        //     snapPoints.push({
        //       point: perpendicular,
        //       type: 'perpendicular',
        //       distance: distance(point, perpendicular),
        //     });
        //   }
        // }
      } else if (shape.type === 'polyline' && shape.points.length >= 2) {
        // Handle snapping for polyline segments
        for (let i = 0; i < shape.points.length - 1; i++) {
          const segStart = shape.points[i];
          const segEnd = shape.points[i + 1];

          // Midpoint snapping for each segment
          if (snapSettings.midpoint) {
            const segmentMidpoint = {
              x: (segStart.x + segEnd.x) / 2,
              y: (segStart.y + segEnd.y) / 2,
            };
            snapPoints.push({
              point: segmentMidpoint,
              type: 'midpoint',
              distance: distance(point, segmentMidpoint),
            });
          }

          // Nearest point on segment snapping
          if (snapSettings.nearest) {
            const nearest = nearestPointOnLine(point, segStart, segEnd);
            snapPoints.push({
              point: nearest,
              type: 'nearest',
              distance: distance(point, nearest),
            });
          }
        }
      } else if (shape.type === 'zone' && shape.points.length >= 3) {
        // Endpoint snapping
        if (snapSettings.endpoint) {
          shape.points.forEach((pt) => {
            snapPoints.push({
              point: pt,
              type: 'endpoint',
              distance: distance(point, pt),
            });
          });
        }

        // Midpoint and Nearest for all segments (closed loop)
        const len = shape.points.length;
        for (let i = 0; i < len; i++) {
          const p1 = shape.points[i];
          const p2 = shape.points[(i + 1) % len];

          if (snapSettings.midpoint) {
            const midpoint = {
              x: (p1.x + p2.x) / 2,
              y: (p1.y + p2.y) / 2,
            };
            snapPoints.push({
              point: midpoint,
              type: 'midpoint',
              distance: distance(point, midpoint),
            });
          }

          if (snapSettings.nearest) {
            const nearest = nearestPointOnLine(point, p1, p2);
            snapPoints.push({
              point: nearest,
              type: 'nearest',
              distance: distance(point, nearest),
            });
          }
        }
      }
    });

    // Intersection snapping - check intersections between existing lines and polylines
    // PERFORMANCE: Limit intersection checks when there are many shapes (O(n²) operation)
    const intersectionFlags = getFeatureFlags();
    const limitedShapesForIntersection = relevantShapes.length > MAX_INTERSECTION_SHAPES
      ? relevantShapes.slice(0, MAX_INTERSECTION_SHAPES)
      : relevantShapes;

    if (snapSettings.intersection && intersectionFlags.enableIntersectionSnapping && limitedShapesForIntersection.length >= 2) {
      for (let i = 0; i < limitedShapesForIntersection.length; i++) {
        for (let j = i + 1; j < limitedShapesForIntersection.length; j++) {
          const shape1 = limitedShapesForIntersection[i];
          const shape2 = limitedShapesForIntersection[j];

          // Get all segments from each shape
          const getSegments = (shape: Shape): Array<{ start: Point, end: Point }> => {
            if (shape.type === 'line') {
              return [{ start: shape.start, end: shape.end }];
            } else if (shape.type === 'polyline' && shape.points.length >= 2) {
              const segments = [];
              for (let k = 0; k < shape.points.length - 1; k++) {
                segments.push({ start: shape.points[k], end: shape.points[k + 1] });
              }
              return segments;
            } else if (shape.type === 'zone' && shape.points.length >= 3) {
              const segments = [];
              const len = shape.points.length;
              for (let k = 0; k < len; k++) {
                segments.push({ start: shape.points[k], end: shape.points[(k + 1) % len] });
              }
              return segments;
            } else if (shape.type === 'arc') {
              const descriptor = getArcDescriptor(shape);
              if (!descriptor) {
                return [{ start: shape.start, end: shape.end }];
              }
              const segments = Math.max(12, Math.ceil(Math.abs(descriptor.sweep) * 12));
              const arcSegments: Array<{ start: Point; end: Point }> = [];
              let prevPoint = pointOnArc(descriptor, 0);
              for (let seg = 1; seg <= segments; seg++) {
                const nextPoint = pointOnArc(descriptor, seg / segments);
                arcSegments.push({ start: prevPoint, end: nextPoint });
                prevPoint = nextPoint;
              }
              return arcSegments;
            } else if (shape.type === 'circle') {
              const segments = 32;
              const circleSegments: Array<{ start: Point; end: Point }> = [];
              let prevPoint = { x: shape.center.x + shape.radius, y: shape.center.y };
              for (let seg = 1; seg <= segments; seg++) {
                const angle = (seg / segments) * TWO_PI;
                const nextPoint = {
                  x: shape.center.x + shape.radius * Math.cos(angle),
                  y: shape.center.y + shape.radius * Math.sin(angle),
                };
                circleSegments.push({ start: prevPoint, end: nextPoint });
                prevPoint = nextPoint;
              }
              return circleSegments;
            } else if (shape.type === 'guideline') {
              if (shape.orientation === 'freeform' && shape.start && shape.end) {
                return [{ start: shape.start, end: shape.end }];
              }
              if (shape.orientation === 'horizontal' && shape.position !== undefined) {
                return [{
                  start: { x: -GUIDE_EXTENT, y: shape.position },
                  end: { x: GUIDE_EXTENT, y: shape.position },
                }];
              }
              if (shape.orientation === 'vertical' && shape.position !== undefined) {
                return [{
                  start: { x: shape.position, y: -GUIDE_EXTENT },
                  end: { x: shape.position, y: GUIDE_EXTENT },
                }];
              }
              return [];
            } else if (shape.type === 'rectangle') {
              // Return all 4 edges of the rectangle
              return [
                { start: shape.start, end: { x: shape.end.x, y: shape.start.y } }, // Top edge
                { start: { x: shape.end.x, y: shape.start.y }, end: shape.end }, // Right edge
                { start: shape.end, end: { x: shape.start.x, y: shape.end.y } }, // Bottom edge
                { start: { x: shape.start.x, y: shape.end.y }, end: shape.start }, // Left edge
              ];
            }
            return [];
          };

          const segments1 = getSegments(shape1);
          const segments2 = getSegments(shape2);

          // Check intersections between all segment pairs
          segments1.forEach(seg1 => {
            segments2.forEach(seg2 => {
              const intersection = lineIntersection(
                seg1.start,
                seg1.end,
                seg2.start,
                seg2.end
              );
              if (intersection) {
                snapPoints.push({
                  point: intersection,
                  type: 'intersection',
                  distance: distance(point, intersection),
                });
              }
            });
          });
        }
      }
    }

    // Grid snapping
    if (snapSettings.grid && gridSpacing > 0) {
      const gridPoint = {
        x: Math.round(point.x / gridSpacing) * gridSpacing,
        y: Math.round(point.y / gridSpacing) * gridSpacing,
      };
      snapPoints.push({
        point: gridPoint,
        type: 'grid',
        distance: distance(point, gridPoint),
      });
    }

    // Quadrant snapping (90°, 180°, 270° directions from endpoints)
    // Disabled for line tool as it's not useful for line drawing
    // if (snapSettings.quadrant) {
    //   relevantShapes.forEach((shape) => {
    //     if (shape.type === 'line') {
    //       [shape.start, shape.end].forEach((refPoint) => {
    //         // Check if point is roughly aligned with quadrant directions
    //         const dx = point.x - refPoint.x;
    //         const dy = point.y - refPoint.y;
    //         const dist = Math.sqrt(dx * dx + dy * dy);
    //         
    //         if (dist > 0.1) {
    //           // Snap to horizontal/vertical from this point
    //           const horizontalPoint = { x: point.x, y: refPoint.y };
    //           const verticalPoint = { x: refPoint.x, y: point.y };
    //           
    //           snapPoints.push({
    //             point: horizontalPoint,
    //             type: 'quadrant',
    //             distance: Math.abs(dy),
    //           });
    //           snapPoints.push({
    //             point: verticalPoint,
    //             type: 'quadrant',
    //             distance: Math.abs(dx),
    //           });
    //         }
    //       });
    //     }
    //   });
    // }

    // Direction snapping (parallel/aligned directions)
    // Disabled for lines as it's not useful for line drawing
    // if (snapSettings.direction) {
    //   relevantShapes.forEach((shape) => {
    //     if (shape.type === 'line') {
    //       // Get the angle of the existing line
    //       const angle = Math.atan2(shape.end.y - shape.start.y, shape.end.x - shape.start.x);
    //       
    //       // For each endpoint, project the current point along the same angle
    //       [shape.start, shape.end].forEach((refPoint) => {
    //         const dist = distance(point, refPoint);
    //         const projectedPoint = {
    //           x: refPoint.x + dist * Math.cos(angle),
    //           y: refPoint.y + dist * Math.sin(angle),
    //         };
    //         
    //         if (distance(point, projectedPoint) < snapThreshold * 2) {
    //           snapPoints.push({
    //             point: projectedPoint,
    //             type: 'direction',
    //             distance: distance(point, projectedPoint),
    //           });
    //         }
    //       });
    //     }
    //   });
    // }

    // Find the closest snap point with priority system
    const validSnapPoints = snapPoints.filter((sp) => sp.distance < snapThreshold);

    if (validSnapPoints.length === 0) {
      return applyPrecision({ point, snapped: false });
    }

    // Priority-based selection for line snapping
    // 1. Endpoint (highest priority when within range)
    // 2. Wall corner/edge (for connecting walls at surfaces)
    // 3. Midpoint (second priority)
    // 4. Intersection (third priority)
    // 5. Grid (if close enough)
    // 6. Nearest (lowest priority - fallback)

    const priorityOrder = ['endpoint', 'marker', 'wall-extended', 'midpoint', 'semicircle', 'intersection', 'center', 'quadrant', 'grid', 'nearest'];

    // Group by type
    const byType = new Map<string, typeof validSnapPoints>();
    validSnapPoints.forEach(sp => {
      if (!byType.has(sp.type)) {
        byType.set(sp.type, []);
      }
      byType.get(sp.type)!.push(sp);
    });

    // Find the highest priority type that has valid snaps
    for (const type of priorityOrder) {
      const snapsOfType = byType.get(type);
      if (snapsOfType && snapsOfType.length > 0) {
        // Sort by distance and get the closest of this type
        snapsOfType.sort((a, b) => a.distance - b.distance);
        const closestSnap = snapsOfType[0];

        return applyPrecision({
          point: closestSnap.point,
          snapped: true,
          snapType: closestSnap.type,
          snapToPoint: closestSnap.point,
          snapMetadata: closestSnap.metadata,
        });
      }
    }

    // Fallback (should never reach here)
    validSnapPoints.sort((a, b) => a.distance - b.distance);
    const closestSnap = validSnapPoints[0];

    return applyPrecision({
      point: closestSnap.point,
      snapped: true,
      snapType: closestSnap.type,
      snapToPoint: closestSnap.point,
      snapMetadata: closestSnap.metadata,
    });
  };

  return { findSnapPoint };
};

// Helper functions

function nearestPointOnLine(point: Point, lineStart: Point, lineEnd: Point): Point {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSquared = dx * dx + dy * dy;

  if (lenSquared === 0) return lineStart;

  let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSquared;
  t = Math.max(0, Math.min(1, t));

  return {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy,
  };
}

function nearestPointOnCircle(point: Point, center: Point, radius: number): Point {
  // Calculate vector from center to point
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // If point is at the center, return any point on the circle (e.g., rightmost point)
  if (dist === 0) {
    return {
      x: center.x + radius,
      y: center.y,
    };
  }

  // Normalize the vector and multiply by radius to get the point on the perimeter
  return {
    x: center.x + (dx / dist) * radius,
    y: center.y + (dy / dist) * radius,
  };
}

function lineIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

  if (Math.abs(denom) < 0.0001) return null; // Lines are parallel

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  // Check if intersection point is on both line segments
  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y),
    };
  }

  return null;
}

function lineCircleIntersections(lineStart: Point, lineEnd: Point, center: Point, radius: number): Point[] {
  const d = { x: lineEnd.x - lineStart.x, y: lineEnd.y - lineStart.y };
  const f = { x: lineStart.x - center.x, y: lineStart.y - center.y };

  const a = d.x * d.x + d.y * d.y;
  const b = 2 * (f.x * d.x + f.y * d.y);
  const c = f.x * f.x + f.y * f.y - radius * radius;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0 || a === 0) {
    return [];
  }

  const intersections: Point[] = [];
  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  if (t1 >= 0 && t1 <= 1) {
    intersections.push({
      x: lineStart.x + d.x * t1,
      y: lineStart.y + d.y * t1,
    });
  }

  if (t2 >= 0 && t2 <= 1 && discriminant > 0) {
    intersections.push({
      x: lineStart.x + d.x * t2,
      y: lineStart.y + d.y * t2,
    });
  }

  return intersections;
}

function pointLiesOnSegment(point: Point, lineStart: Point, lineEnd: Point): boolean {
  const TOLERANCE = 0.001;

  // Check if point is within the bounding box of the line segment
  const minX = Math.min(lineStart.x, lineEnd.x) - TOLERANCE;
  const maxX = Math.max(lineStart.x, lineEnd.x) + TOLERANCE;
  const minY = Math.min(lineStart.y, lineEnd.y) - TOLERANCE;
  const maxY = Math.max(lineStart.y, lineEnd.y) + TOLERANCE;

  if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) {
    return false;
  }

  // Check if point is on the line using perpendicular distance
  const nearest = nearestPointOnLine(point, lineStart, lineEnd);
  const dist = distance(point, nearest);

  return dist < TOLERANCE;
}

function removeDuplicatePoints(points: Point[]): Point[] {
  const TOLERANCE = 0.001;
  const unique: Point[] = [];

  points.forEach(point => {
    const isDuplicate = unique.some(p =>
      Math.abs(p.x - point.x) < TOLERANCE && Math.abs(p.y - point.y) < TOLERANCE
    );
    if (!isDuplicate) {
      unique.push(point);
    }
  });

  return unique;
}

function sortPointsAlongLine(points: Point[], lineStart: Point, lineEnd: Point): Point[] {
  // Calculate the parameter t for each point along the line
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSquared = dx * dx + dy * dy;

  if (lenSquared === 0) return points;

  const pointsWithT = points.map(point => {
    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSquared;
    return { point, t };
  });

  // Sort by t parameter
  pointsWithT.sort((a, b) => a.t - b.t);

  return pointsWithT.map(item => item.point);
}

function segmentHorizontalIntersection(p1: Point, p2: Point, y: number): Point | null {
  const dy = p2.y - p1.y;
  if (Math.abs(dy) < 1e-6) return null;
  const t = (y - p1.y) / dy;
  if (t < 0 || t > 1) return null;
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y,
  };
}

function segmentVerticalIntersection(p1: Point, p2: Point, x: number): Point | null {
  const dx = p2.x - p1.x;
  if (Math.abs(dx) < 1e-6) return null;
  const t = (x - p1.x) / dx;
  if (t < 0 || t > 1) return null;
  return {
    x,
    y: p1.y + (p2.y - p1.y) * t,
  };
}

const TWO_PI = Math.PI * 2;

interface ArcDescriptor {
  center: Point;
  radius: number;
  startAngle: number;
  sweep: number;
}

const getArcDescriptor = (arc: ArcShape): ArcDescriptor | null => {
  const geometry = calculateArcGeometry(arc.start, arc.end, arc.controlPoint);
  if (geometry.isLine || geometry.radius === 0) {
    return null;
  }

  let sweep = geometry.endAngle - geometry.startAngle;
  if (geometry.isCCW) {
    if (sweep < 0) sweep += TWO_PI;
  } else {
    if (sweep > 0) sweep -= TWO_PI;
  }

  return {
    center: geometry.center,
    radius: geometry.radius,
    startAngle: geometry.startAngle,
    sweep,
  };
};

const pointOnArc = (descriptor: ArcDescriptor, t: number): Point => {
  const angle = descriptor.startAngle + descriptor.sweep * t;
  return {
    x: descriptor.center.x + descriptor.radius * Math.cos(angle),
    y: descriptor.center.y + descriptor.radius * Math.sin(angle),
  };
};

const arcMidpoint = (arc: ArcShape, descriptor?: ArcDescriptor | null): Point => {
  const arcData = descriptor ?? getArcDescriptor(arc);
  if (!arcData) {
    return {
      x: (arc.start.x + arc.end.x) / 2,
      y: (arc.start.y + arc.end.y) / 2,
    };
  }
  return pointOnArc(arcData, 0.5);
};

const nearestPointOnArcSegment = (arc: ArcShape, target: Point, descriptor?: ArcDescriptor | null): Point => {
  const arcData = descriptor ?? getArcDescriptor(arc);
  if (!arcData) {
    return nearestPointOnLine(target, arc.start, arc.end);
  }

  const segments = Math.max(24, Math.ceil(Math.abs(arcData.sweep) * 24));
  let closest = pointOnArc(arcData, 0);
  let minDist = distance(target, closest);

  for (let i = 1; i <= segments; i++) {
    const sample = pointOnArc(arcData, i / segments);
    const sampleDist = distance(target, sample);
    if (sampleDist < minDist) {
      closest = sample;
      minDist = sampleDist;
    }
  }

  return closest;
};

