import type { Point, LengthUnit } from '../types';
import { distance as calculateDistance, isPointNear } from '@maya/workspace-domain/workspace/core/utils';

/**
 * Calculate the distance between two points
 */
export const calculateLength = (start: Point, end: Point): number => {
  return calculateDistance(start, end);
};

export const calculatePolygonArea = (points: Point[]): number => {
  if (!points || points.length < 3) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
};

export const calculatePolygonPerimeter = (points: Point[]): number => {
  if (!points || points.length < 2) {
    return 0;
  }
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    total += calculateLength(current, next);
  }
  return total;
};

export const getPolygonCentroid = (points: Point[]): Point => {
  let accumulatedArea = 0;
  let centroidX = 0;
  let centroidY = 0;
  const pointCount = points.length;
  if (pointCount < 3) return { x: 0, y: 0 };

  for (let i = 0, j = pointCount - 1; i < pointCount; j = i, i += 1) {
    const p1 = points[j];
    const p2 = points[i];
    const f = p1.x * p2.y - p2.x * p1.y;
    accumulatedArea += f;
    centroidX += (p1.x + p2.x) * f;
    centroidY += (p1.y + p2.y) * f;
  }

  const area = accumulatedArea / 2;
  if (Math.abs(area) < 1e-9) {
    return {
      x: points.reduce((sum, p) => sum + p.x, 0) / pointCount,
      y: points.reduce((sum, p) => sum + p.y, 0) / pointCount,
    };
  }

  const factor = 1 / (6 * area);
  return {
    x: centroidX * factor,
    y: centroidY * factor,
  };
};

/**
 * Calculate the angle of a line with respect to the horizontal axis
 * Returns angle in degrees (0° = horizontal right, positive = counterclockwise)
 * Range: -180° to +180°
 */
export const calculateAngle = (start: Point, end: Point): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const radians = Math.atan2(-dy, dx); // Negative dy because SVG Y increases downward
  const degrees = radians * (180 / Math.PI);

  // Returns value in range -180 to +180
  return degrees;
};

/**
 * Format length for display in the specified unit
 * Assumes SVG units are in meters (1 SVG unit = 1 meter)
 */
export const formatLength = (length: number, unit: LengthUnit): string => {
  const meters = length;

  switch (unit) {
    case 'mm': {
      const mm = meters * 1000;
      if (mm < 1) return `${mm.toFixed(2)} mm`;
      if (mm < 10) return `${mm.toFixed(1)} mm`;
      return `${Math.round(mm)} mm`;
    }
    case 'cm': {
      const cm = meters * 100;
      if (cm < 1) return `${cm.toFixed(2)} cm`;
      if (cm < 10) return `${cm.toFixed(1)} cm`;
      return `${Math.round(cm)} cm`;
    }
    case 'm': {
      if (meters < 0.01) return `${(meters * 1000).toFixed(1)} mm`;
      if (meters < 0.1) return `${(meters * 100).toFixed(1)} cm`;
      if (meters < 1) return `${(meters * 100).toFixed(0)} cm`;
      if (meters < 10) return `${meters.toFixed(2)} m`;
      if (meters < 100) return `${meters.toFixed(1)} m`;
      if (meters < 1000) return `${Math.round(meters)} m`;
      return `${(meters / 1000).toFixed(2)} km`;
    }
    case 'in': {
      const inches = meters * 39.3701;
      if (inches < 1) return `${inches.toFixed(2)}"`;
      if (inches < 12) return `${inches.toFixed(1)}"`;
      return `${Math.round(inches)}"`;
    }
    case 'ft': {
      const feet = meters * 3.28084;
      if (feet < 1) return `${(feet * 12).toFixed(1)}"`;
      if (feet < 10) return `${feet.toFixed(2)}'`;
      if (feet < 100) return `${feet.toFixed(1)}'`;
      return `${Math.round(feet)}'`;
    }
    case 'ft-in': {
      const totalInches = meters * 39.3701;
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;

      if (totalInches < 1) {
        return `${totalInches.toFixed(2)}"`;
      } else if (totalInches < 12) {
        return `${totalInches.toFixed(1)}"`;
      } else {
        if (inches < 0.5) {
          return `${feet}'`;
        } else if (inches < 1) {
          return `${feet}' ${inches.toFixed(1)}"`;
        } else {
          return `${feet}' ${Math.round(inches)}"`;
        }
      }
    }
    default:
      return `${meters.toFixed(3)} m`;
  }
};

export const formatArea = (area: number, unit: LengthUnit): string => {
  const squareMeters = area;
  const formatValue = (value: number, suffix: string) => {
    if (value < 1) return `${value.toFixed(2)} ${suffix}`;
    if (value < 10) return `${value.toFixed(2)} ${suffix}`;
    if (value < 100) return `${value.toFixed(1)} ${suffix}`;
    return `${Math.round(value)} ${suffix}`;
  };

  switch (unit) {
    case 'mm': {
      const squareMillimeters = squareMeters * 1e6;
      return formatValue(squareMillimeters, 'mm²');
    }
    case 'cm': {
      const squareCentimeters = squareMeters * 1e4;
      return formatValue(squareCentimeters, 'cm²');
    }
    case 'm': {
      return formatValue(squareMeters, 'm²');
    }
    case 'in': {
      const squareInches = squareMeters * 1550.0031;
      return formatValue(squareInches, 'in²');
    }
    case 'ft':
    case 'ft-in': {
      const squareFeet = squareMeters * 10.7639;
      return formatValue(squareFeet, 'ft²');
    }
    default:
      return `${squareMeters.toFixed(2)} m²`;
  }
};

/**
 * Convert meters to a numeric value in the specified unit
 * Used for input fields and calculations
 */
export const metersToUnitValue = (meters: number, unit: LengthUnit): number => {
  switch (unit) {
    case 'mm':
      return meters * 1000;
    case 'cm':
      return meters * 100;
    case 'm':
      return meters;
    case 'in':
      return meters * 39.3701;
    case 'ft':
    case 'ft-in':
    default:
      return meters * 3.28084;
  }
};

/**
 * Convert a numeric value in the specified unit to meters
 * Used for input fields and calculations
 */
export const unitValueToMeters = (value: number, unit: LengthUnit): number => {
  switch (unit) {
    case 'mm':
      return value / 1000;
    case 'cm':
      return value / 100;
    case 'm':
      return value;
    case 'in':
      return value * 0.0254;
    case 'ft':
    case 'ft-in':
    default:
      return value * 0.3048;
  }
};

/**
 * Format angle for display
 */
export const formatAngle = (angle: number): string => {
  return `${angle.toFixed(1)}°`;
};

/**
 * Calculate the angle between two line segments (p1-p2 and p2-p3)
 * Returns the interior angle at p2 in degrees
 * Range: 0° to 180° (always returns the smaller interior angle)
 */
export const calculateSegmentAngle = (p1: Point, p2: Point, p3: Point): number => {
  // Vector from p2 to p1
  const v1x = p1.x - p2.x;
  const v1y = p1.y - p2.y;

  // Vector from p2 to p3
  const v2x = p3.x - p2.x;
  const v2y = p3.y - p2.y;

  // Calculate dot product and magnitudes
  const dotProduct = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

  if (mag1 === 0 || mag2 === 0) return 0;

  // Calculate angle using dot product formula
  // This gives us the interior angle (0-180°)
  const cosAngle = dotProduct / (mag1 * mag2);
  const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle))); // Clamp to [-1, 1] to avoid NaN
  const degrees = angleRad * (180 / Math.PI);

  return degrees;
};

/**
 * Calculate arc properties from 3 points (start, end, control point)
 * Returns center, radius, angles, and whether the arc is counter-clockwise
 */
export interface ArcGeometry {
  center: Point;
  radius: number;
  startAngle: number;
  endAngle: number;
  isCCW: boolean;
  isLine: boolean; // True if points are collinear
}

export const calculateArcGeometry = (start: Point, end: Point, controlPoint: Point): ArcGeometry => {
  // Check if points are collinear (would result in a line, not an arc)
  const A = 2 * (end.x - start.x);
  const B = 2 * (end.y - start.y);
  const C = end.x ** 2 + end.y ** 2 - start.x ** 2 - start.y ** 2;

  const D = 2 * (controlPoint.x - end.x);
  const E = 2 * (controlPoint.y - end.y);
  const F = controlPoint.x ** 2 + controlPoint.y ** 2 - end.x ** 2 - end.y ** 2;

  const denominator = A * E - B * D;

  // Points are collinear - return a line fallback
  if (Math.abs(denominator) < 1e-6) {
    return {
      center: { x: 0, y: 0 },
      radius: 0,
      startAngle: 0,
      endAngle: 0,
      isCCW: false,
      isLine: true,
    };
  }

  // Calculate center of the circle
  const centerX = (C * E - B * F) / denominator;
  const centerY = (A * F - C * D) / denominator;
  const center = { x: centerX, y: centerY };

  // Calculate radius
  const radius = Math.hypot(start.x - centerX, start.y - centerY);

  // Calculate angles
  const startAngle = Math.atan2(start.y - centerY, start.x - centerX);
  const rawEndAngle = Math.atan2(end.y - centerY, end.x - centerX);
  const controlAngle = Math.atan2(controlPoint.y - centerY, controlPoint.x - centerX);

  const TWO_PI = Math.PI * 2;
  const normalizeAngle = (angle: number) => {
    let value = angle;
    while (value < 0) value += TWO_PI;
    while (value >= TWO_PI) value -= TWO_PI;
    return value;
  };
  const deltaCCW = (from: number, to: number) => {
    let delta = to - from;
    if (delta < 0) delta += TWO_PI;
    return delta;
  };
  const deltaCW = (from: number, to: number) => {
    let delta = to - from;
    if (delta > 0) delta -= TWO_PI;
    return delta;
  };

  const normStart = normalizeAngle(startAngle);
  const normControl = normalizeAngle(controlAngle);
  const normEnd = normalizeAngle(rawEndAngle);

  const ccwStartToControl = deltaCCW(normStart, normControl);
  const ccwStartToEnd = deltaCCW(normStart, normEnd);
  const cwStartToControl = deltaCW(normStart, normControl);
  const cwStartToEnd = deltaCW(normStart, normEnd);
  const EPSILON = 1e-9;

  let sweepAngle: number;
  if (ccwStartToControl <= ccwStartToEnd + EPSILON) {
    sweepAngle = ccwStartToEnd;
  } else if (cwStartToControl >= cwStartToEnd - EPSILON) {
    sweepAngle = cwStartToEnd;
  } else {
    // Fallback: select orientation that keeps arc magnitude minimal while non-zero
    sweepAngle =
      Math.abs(ccwStartToEnd) <= Math.abs(cwStartToEnd) ? ccwStartToEnd : cwStartToEnd;
  }

  const isCCW = sweepAngle > 0;
  const endAngle = startAngle + sweepAngle;

  return {
    center,
    radius,
    startAngle,
    endAngle,
    isCCW,
    isLine: false,
  };
};

/**
 * Calculate the arc length given start, end, and control point
 */
export const calculateArcLength = (start: Point, end: Point, controlPoint: Point): number => {
  const geometry = calculateArcGeometry(start, end, controlPoint);

  if (geometry.isLine) {
    return calculateLength(start, end);
  }

  // Calculate sweep angle
  let sweepAngle = geometry.endAngle - geometry.startAngle;
  if (geometry.isCCW && sweepAngle < 0) sweepAngle += 2 * Math.PI;
  if (!geometry.isCCW && sweepAngle > 0) sweepAngle -= 2 * Math.PI;

  // Arc length = radius * |sweep angle|
  return geometry.radius * Math.abs(sweepAngle);
};

/**
 * Calculate the arc angle (sweep angle) in degrees given start, end, and control point
 */
export const calculateArcAngle = (start: Point, end: Point, controlPoint: Point): number => {
  const geometry = calculateArcGeometry(start, end, controlPoint);

  if (geometry.isLine) {
    return 0;
  }

  // Calculate sweep angle
  let sweepAngle = geometry.endAngle - geometry.startAngle;
  if (geometry.isCCW && sweepAngle < 0) sweepAngle += 2 * Math.PI;
  if (!geometry.isCCW && sweepAngle > 0) sweepAngle -= 2 * Math.PI;

  // Convert to degrees
  return Math.abs(sweepAngle * (180 / Math.PI));
};

/**
 * Calculate a point on a Catmull-Rom spline
 * @param p0 Point before the segment
 * @param p1 Start point of the segment
 * @param p2 End point of the segment
 * @param p3 Point after the segment
 * @param t Parameter from 0 to 1
 * @param tension Tension parameter (0 = normal, higher = tighter curves)
 */
export const catmullRomPoint = (
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
  tension: number = 0
): Point => {
  const t2 = t * t;
  const t3 = t2 * t;
  const s = (1 - tension) / 2; // Tension scaling factor

  // Catmull-Rom basis functions
  const x =
    s * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  const y =
    s * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

  return { x, y };
};

/**
 * Check if a curve is closed (first and last points are the same or very close)
 */
const isCurveClosed = (points: Point[]): boolean => {
  if (points.length < 2) return false;
  return isPointNear(points[0], points[points.length - 1], 0.001);
};

/**
 * Generate smooth curve path through control points using Catmull-Rom spline
 * @param points Control points that the curve should pass through
 * @param segmentsPerPoint Number of interpolation segments between each pair of points
 * @param tension Tension parameter (0 = normal, higher = tighter curves)
 * @returns SVG path string
 */
export const generateCatmullRomPath = (
  points: Point[],
  segmentsPerPoint: number = 20,
  tension: number = 0
): string => {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }

  const pathSegments: string[] = [];
  pathSegments.push(`M ${points[0].x},${points[0].y}`);

  // Check if the curve is closed (forms a loop)
  const isClosed = isCurveClosed(points);

  // For each segment between control points
  for (let i = 0; i < points.length - 1; i++) {
    // Get the four control points needed for Catmull-Rom
    // For closed curves, wrap around to get proper tangents
    let p0: Point, p3: Point;
    const p1 = points[i];
    const p2 = points[i + 1];

    if (isClosed) {
      // Closed curve: wrap around for smooth connection
      p0 = i === 0 ? points[points.length - 2] : points[i - 1];
      p3 = i === points.length - 2 ? points[1] : points[i + 2];
    } else {
      // Open curve: duplicate endpoint for tangent calculation
      p0 = i === 0 ? points[0] : points[i - 1];
      p3 = i === points.length - 2 ? points[i + 1] : points[i + 2];
    }

    // Generate interpolated points for this segment
    for (let j = 1; j <= segmentsPerPoint; j++) {
      const t = j / segmentsPerPoint;
      const point = catmullRomPoint(p0, p1, p2, p3, t, tension);
      pathSegments.push(`L ${point.x},${point.y}`);
    }
  }

  return pathSegments.join(' ');
};

/**
 * Calculate approximate length of a Catmull-Rom curve
 * Uses linear approximation between interpolated points
 */
export const calculateCurveLength = (
  points: Point[],
  segmentsPerPoint: number = 20,
  tension: number = 0
): number => {
  if (points.length < 2) return 0;
  if (points.length === 2) {
    return calculateLength(points[0], points[1]);
  }

  let totalLength = 0;
  let prevPoint = points[0];

  // Check if the curve is closed
  const isClosed = isCurveClosed(points);

  // For each segment between control points
  for (let i = 0; i < points.length - 1; i++) {
    let p0: Point, p3: Point;
    const p1 = points[i];
    const p2 = points[i + 1];

    if (isClosed) {
      // Closed curve: wrap around for smooth connection
      p0 = i === 0 ? points[points.length - 2] : points[i - 1];
      p3 = i === points.length - 2 ? points[1] : points[i + 2];
    } else {
      // Open curve: duplicate endpoint for tangent calculation
      p0 = i === 0 ? points[0] : points[i - 1];
      p3 = i === points.length - 2 ? points[i + 1] : points[i + 2];
    }

    // Sum lengths of interpolated segments
    for (let j = 1; j <= segmentsPerPoint; j++) {
      const t = j / segmentsPerPoint;
      const point = catmullRomPoint(p0, p1, p2, p3, t, tension);
      totalLength += calculateLength(prevPoint, point);
      prevPoint = point;
    }
  }

  return totalLength;
};

/**
 * Calculate the actual bounding box of a Catmull-Rom curve
 * Samples all points along the curve path to get true bounds
 */
export interface CurveBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const calculateCurveBounds = (
  points: Point[],
  segmentsPerPoint: number = 20,
  tension: number = 0
): CurveBounds => {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  if (points.length === 1) {
    return {
      minX: points[0].x,
      minY: points[0].y,
      maxX: points[0].x,
      maxY: points[0].y
    };
  }

  if (points.length === 2) {
    return {
      minX: Math.min(points[0].x, points[1].x),
      minY: Math.min(points[0].y, points[1].y),
      maxX: Math.max(points[0].x, points[1].x),
      maxY: Math.max(points[0].y, points[1].y),
    };
  }

  // Initialize with the first point
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  // Check if the curve is closed
  const isClosed = isCurveClosed(points);

  // Sample all points along the curve
  for (let i = 0; i < points.length - 1; i++) {
    let p0: Point, p3: Point;
    const p1 = points[i];
    const p2 = points[i + 1];

    if (isClosed) {
      // Closed curve: wrap around for smooth connection
      p0 = i === 0 ? points[points.length - 2] : points[i - 1];
      p3 = i === points.length - 2 ? points[1] : points[i + 2];
    } else {
      // Open curve: duplicate endpoint for tangent calculation
      p0 = i === 0 ? points[0] : points[i - 1];
      p3 = i === points.length - 2 ? points[i + 1] : points[i + 2];
    }

    for (let j = 1; j <= segmentsPerPoint; j++) {
      const t = j / segmentsPerPoint;
      const point = catmullRomPoint(p0, p1, p2, p3, t, tension);

      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  return { minX, minY, maxX, maxY };
};

export interface ArcBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const getArcBounds = (start: Point, end: Point, controlPoint: Point): ArcBounds => {
  const geometry = calculateArcGeometry(start, end, controlPoint);

  if (geometry.isLine || geometry.radius === 0) {
    const xs = [start.x, end.x, controlPoint.x];
    const ys = [start.y, end.y, controlPoint.y];
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  }

  let sweepAngle = geometry.endAngle - geometry.startAngle;
  if (geometry.isCCW) {
    if (sweepAngle < 0) sweepAngle += 2 * Math.PI;
  } else {
    if (sweepAngle > 0) sweepAngle -= 2 * Math.PI;
  }

  // Match ArcShape/BoundingBox inversion logic
  if (Math.abs(sweepAngle) > Math.PI) {
    if (geometry.isCCW) {
      sweepAngle -= 2 * Math.PI;
    } else {
      sweepAngle += 2 * Math.PI;
    }
  }

  let minX = Math.min(start.x, end.x);
  let minY = Math.min(start.y, end.y);
  let maxX = Math.max(start.x, end.x);
  let maxY = Math.max(start.y, end.y);

  const numSamples = Math.max(80, Math.ceil(Math.abs(sweepAngle) * 30));
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const angle = geometry.startAngle + sweepAngle * t;
    const x = geometry.center.x + geometry.radius * Math.cos(angle);
    const y = geometry.center.y + geometry.radius * Math.sin(angle);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return { minX, minY, maxX, maxY };
};

/**
 * Return the two points located an equal distance above/below the chord that
 * would form perfect semicircles when used as the arc control point.
 */
export const getSemicircleMarkers = (start: Point, end: Point): Point[] | null => {
  const chordLength = calculateLength(start, end);
  if (chordLength < 0.001) {
    return null;
  }

  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  const dirX = (end.x - start.x) / chordLength;
  const dirY = (end.y - start.y) / chordLength;
  const perpX = -dirY;
  const perpY = dirX;
  const radius = chordLength / 2;

  return [
    {
      x: midpoint.x + perpX * radius,
      y: midpoint.y + perpY * radius,
    },
    {
      x: midpoint.x - perpX * radius,
      y: midpoint.y - perpY * radius,
    },
  ];
};

