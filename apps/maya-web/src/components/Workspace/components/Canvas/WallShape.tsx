import React, { useMemo } from 'react';
import type { WallShape, LengthUnit, Point, OpeningShape, MeasurementSettings } from '../../types';
import { getWallRenderGeometry, type WallJoinOverrides } from '../../utils/walls';
import { calculateLength, calculateAngle, formatLength, formatAngle, calculateArcGeometry, getSemicircleMarkers } from '../../utils/measurements';
import { useDimensionCollector } from './dimensions/DimensionContext';
import { defaultDimensionTheme } from './dimensions/theme';
import {
  getFillAttribute,
  getFillOpacity,
  getShapeOpacity,
  getBlendMode,
  getFilterAttribute,
} from './appearanceUtils';
import {
  DynamicPattern,
  DynamicShadowFilter,
  DynamicGradient,
} from './AppearanceRenderer';

const normalizeVector = (x: number, y: number) => {
  const length = Math.hypot(x, y);
  if (!length || length < 1e-6) {
    return { x: 1, y: 0 };
  }
  return { x: x / length, y: y / length };
};

const pointToString = (point: Point) => `${point.x},${point.y}`;

/**
 * Creates an inset polygon by shrinking towards the centerline.
 * This makes hit areas smaller than the visual wall to reduce over-sensitivity.
 */
const createInsetPolygon = (
  polygon: Point[],
  centerline: Point[],
  insetAmount: number
): Point[] => {
  if (polygon.length < 4 || centerline.length < 2 || insetAmount <= 0) {
    return polygon;
  }

  const start = centerline[0];
  const end = centerline[centerline.length - 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  
  if (length < 0.001) return polygon;

  // Calculate perpendicular direction
  const perpX = -dy / length;
  const perpY = dx / length;

  // For each point in the polygon, determine which side of centerline it's on
  // and move it towards the centerline by insetAmount
  return polygon.map((p) => {
    // Calculate signed distance from centerline
    const toPointX = p.x - start.x;
    const toPointY = p.y - start.y;
    const perpDist = toPointX * perpX + toPointY * perpY;
    
    // Move point towards centerline
    const sign = perpDist > 0 ? -1 : 1;
    const moveAmount = Math.min(Math.abs(perpDist), insetAmount);
    
    return {
      x: p.x + sign * perpX * moveAmount,
      y: p.y + sign * perpY * moveAmount,
    };
  });
};

interface OpeningGapDefinition {
  id: string;
  polygonPoints: string;
  startLine: { start: Point; end: Point };
  endLine: { start: Point; end: Point };
  startDistance: number;
  endDistance: number;
}

interface SpanMeasurement {
  start: number;
  length: number;
  type: 'wall' | 'opening';
  gapId?: string;
}

interface WallShapeProps {
  shape: WallShape;
  isSelected: boolean;
  /** Whether this wall is currently hovered */
  isHovered?: boolean;
  /** Whether the user is currently dragging the curve handle to arc this wall */
  isBeingCurved?: boolean;
  zoomScale: number;
  lengthUnit?: LengthUnit;
  showMeasurements?: boolean;
  measurementSettings?: MeasurementSettings;
  showCenterline?: boolean;
  joinCaps?: WallJoinOverrides;
  openings?: OpeningShape[] | undefined;
  /** Hide edge strokes when using merged wall rendering (boolean union) */
  hideStrokes?: boolean;
  onMouseDown: (e: React.MouseEvent<SVGElement>, shapeId?: string) => void;
  onCurveHandleMouseDown: (e: React.MouseEvent<SVGElement>, shapeId: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  /** Force re-render when this value changes */
  renderToken?: number;
}

/**
 * WallShapeComponent - Memoized for performance
 * Only re-renders when props actually change
 */
export const WallShapeComponent: React.FC<WallShapeProps> = React.memo(({
  shape,
  isSelected,
  isHovered = false,
  isBeingCurved = false,
  zoomScale,
  lengthUnit = 'ft-in',
  showMeasurements = false,
  measurementSettings,
  showCenterline = true,
  joinCaps,
  openings,
  hideStrokes = false,
  onMouseDown,
  onCurveHandleMouseDown,
  onMouseEnter,
  onMouseLeave,
}) => {
  const dimensionCollector = useDimensionCollector();
  const shouldUseDescriptorLayer = Boolean(dimensionCollector);

  const renderGeometry = getWallRenderGeometry(shape, joinCaps);
  const geometryReady = Boolean(renderGeometry && renderGeometry.polygon.length >= 4);
  const fallbackPoint: Point = { x: 0, y: 0 };
  const polygon = geometryReady ? renderGeometry!.polygon : [];
  const leftEdge = geometryReady ? renderGeometry!.leftEdge : [];
  const rightEdge = geometryReady ? renderGeometry!.rightEdge : [];
  const startCap = geometryReady ? renderGeometry!.startCap : [fallbackPoint, fallbackPoint];
  const endCap = geometryReady ? renderGeometry!.endCap : [fallbackPoint, fallbackPoint];
  const start = shape.centerline[0];
  const end = shape.centerline[shape.centerline.length - 1];
  const length = calculateLength(start, end);
  const angle = calculateAngle(start, end);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dirLength = Math.hypot(dx, dy) || 1;
  const unitDirX = dx / dirLength;
  const unitDirY = dy / dirLength;
  const unitPerpX = -unitDirY;
  const unitPerpY = unitDirX;
  const lineAngleRad = Math.atan2(dy, dx);
  let linearDimensionAngleDeg = (lineAngleRad * 180) / Math.PI;
  const dimensionNeedsFlip = linearDimensionAngleDeg > 90 || linearDimensionAngleDeg < -90;
  if (dimensionNeedsFlip) {
    linearDimensionAngleDeg += 180;
  }
  const polygonPoints = polygon.map(pointToString).join(' ');

  // Create an inset hit area polygon that's slightly smaller than the visual wall.
  // This reduces hover sensitivity at wall junctions where individual wall polygons overlap.
  // The inset amount is scaled with zoom but capped to not be too aggressive.
  const hitAreaInset = Math.min(0.015 * zoomScale, shape.thickness * 0.25);
  const hitAreaPolygon = createInsetPolygon(polygon, shape.centerline, hitAreaInset);
  const hitAreaPoints = hitAreaPolygon.map(pointToString).join(' ');

  const hatchPatternId = `wall-hatch-${shape.id}`;

  // Use appearance if available, otherwise fallback to hatch pattern
  const defaultFillColor = isSelected || isHovered ? `url(#${hatchPatternId})` : 'transparent';
  const fillColor = shape.appearance ? getFillAttribute(shape.appearance?.fill, shape.id) : defaultFillColor;

  const edgeColor = isSelected || isHovered ? '#000000' : '#202124';
  const formatPoints = (points: Point[]) => points.map(pointToString).join(' ');
  const attachedOpenings = useMemo(
    () => (openings ?? []).filter((opening) => opening.host?.wallId === shape.id),
    [openings, shape.id]
  );
  const gapDefinitions = useMemo<OpeningGapDefinition[]>(() => {
    if (!attachedOpenings.length) {
      return [];
    }
    const halfThickness = Math.max(shape.thickness / 2, 0.001);
    const padding = Math.max(0.03, Math.min(shape.thickness * 0.2, 0.2));
    const extent = halfThickness + padding;
    return attachedOpenings
      .map((opening) => {
        const halfWidth = Math.max(opening.width / 2, 0.01);
        const direction = normalizeVector(opening.direction.x, opening.direction.y);
        const normal = normalizeVector(opening.normal.x, opening.normal.y);
        const startCenter = {
          x: opening.anchor.x - direction.x * halfWidth,
          y: opening.anchor.y - direction.y * halfWidth,
        };
        const endCenter = {
          x: opening.anchor.x + direction.x * halfWidth,
          y: opening.anchor.y + direction.y * halfWidth,
        };
        const startPositive = {
          x: startCenter.x + normal.x * extent,
          y: startCenter.y + normal.y * extent,
        };
        const startNegative = {
          x: startCenter.x - normal.x * extent,
          y: startCenter.y - normal.y * extent,
        };
        const endPositive = {
          x: endCenter.x + normal.x * extent,
          y: endCenter.y + normal.y * extent,
        };
        const endNegative = {
          x: endCenter.x - normal.x * extent,
          y: endCenter.y - normal.y * extent,
        };
        const startLinePositive = {
          x: startCenter.x + normal.x * halfThickness,
          y: startCenter.y + normal.y * halfThickness,
        };
        const startLineNegative = {
          x: startCenter.x - normal.x * halfThickness,
          y: startCenter.y - normal.y * halfThickness,
        };
        const endLinePositive = {
          x: endCenter.x + normal.x * halfThickness,
          y: endCenter.y + normal.y * halfThickness,
        };
        const endLineNegative = {
          x: endCenter.x - normal.x * halfThickness,
          y: endCenter.y - normal.y * halfThickness,
        };
        const startDistance = Math.max(
          0,
          Math.min(
            length,
            (startCenter.x - start.x) * unitDirX + (startCenter.y - start.y) * unitDirY
          )
        );
        const endDistance = Math.max(
          0,
          Math.min(
            length,
            (endCenter.x - start.x) * unitDirX + (endCenter.y - start.y) * unitDirY
          )
        );
        return {
          id: opening.id,
          polygonPoints: [startPositive, startNegative, endNegative, endPositive]
            .map(pointToString)
            .join(' '),
          startLine: { start: startLinePositive, end: startLineNegative },
          endLine: { start: endLinePositive, end: endLineNegative },
          startDistance: Math.min(startDistance, endDistance),
          endDistance: Math.max(startDistance, endDistance),
        };
      })
      .filter((gap): gap is OpeningGapDefinition => Boolean(gap));
  }, [attachedOpenings, shape.thickness, start.x, start.y, unitDirX, unitDirY, length]);
  const hasOpenings = gapDefinitions.length > 0;
  const spanMeasurements = useMemo<SpanMeasurement[]>(() => {
    if (!hasOpenings || shape.controlPoint || length <= 0.0001) {
      return [];
    }
    const sorted = [...gapDefinitions].sort((a, b) => a.startDistance - b.startDistance);
    const spans: SpanMeasurement[] = [];
    let cursor = 0;
    sorted.forEach((gap) => {
      const gapLength = gap.endDistance - gap.startDistance;
      const leadingLength = gap.startDistance - cursor;
      if (leadingLength > 0.001) {
        spans.push({ start: cursor, length: leadingLength, type: 'wall' });
      }
      if (gapLength > 0.001) {
        spans.push({
          start: gap.startDistance,
          length: gapLength,
          type: 'opening',
          gapId: gap.id,
        });
      }
      cursor = Math.max(cursor, gap.endDistance);
    });
    const trailing = length - cursor;
    if (trailing > 0.001) {
      spans.push({ start: cursor, length: trailing, type: 'wall' });
    }
    return spans;
  }, [gapDefinitions, hasOpenings, shape.controlPoint, length]);

  if (!geometryReady) {
    return null;
  }

  const perpDistances = polygon.map(
    (p) => (p.x - start.x) * unitPerpX + (p.y - start.y) * unitPerpY
  );
  const outerPositive = Math.max(...perpDistances);
  const outerNegative = Math.min(...perpDistances);
  const measurementMargin = 0.02 * zoomScale;
  let measurementOffset = outerNegative - measurementMargin;
  if (measurementOffset >= 0) {
    measurementOffset = -outerPositive - measurementMargin;
  }
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const offsetStartX = start.x + unitPerpX * measurementOffset;
  const offsetStartY = start.y + unitPerpY * measurementOffset;
  const angleChipAlongOffset = 0.2 * zoomScale;
  const angleChipX = offsetStartX + unitDirX * angleChipAlongOffset;
  const angleChipY = offsetStartY + unitDirY * angleChipAlongOffset;
  const linearLengthText = formatLength(length, lengthUnit);
  const angleText = formatAngle(angle);
  const curveHandlePosition =
    shape.controlPoint ?? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const curveHandleSize = Math.max(0.05 * zoomScale, 0.05);
  const curveHandleHalfSize = curveHandleSize / 2;
  const curveHandleHitPadding = Math.max(0.06 * zoomScale, curveHandleSize * 0.4);
  const curveHandleInteractiveSize = curveHandleSize + curveHandleHitPadding * 2;
  const faceEdges = [
    { key: 'left', points: leftEdge },
    { key: 'right', points: rightEdge },
  ];

  const arcGeometry = shape.controlPoint
    ? calculateArcGeometry(start, end, shape.controlPoint)
    : null;
  const arcInfo = (() => {
    if (!arcGeometry || arcGeometry.isLine) {
      return null;
    }
    let sweepAngle = arcGeometry.endAngle - arcGeometry.startAngle;
    if (arcGeometry.isCCW && sweepAngle < 0) sweepAngle += 2 * Math.PI;
    if (!arcGeometry.isCCW && sweepAngle > 0) sweepAngle -= 2 * Math.PI;
    const midAngle = arcGeometry.startAngle + sweepAngle / 2;
    const arcMidpoint = {
      x: arcGeometry.center.x + arcGeometry.radius * Math.cos(midAngle),
      y: arcGeometry.center.y + arcGeometry.radius * Math.sin(midAngle),
    };
    return { geometry: arcGeometry, sweepAngle, arcMidpoint };
  })();

  const arcLengthValue = arcInfo ? Math.abs(arcInfo.geometry.radius * arcInfo.sweepAngle) : null;
  const lengthText = arcLengthValue ? formatLength(arcLengthValue, lengthUnit) : linearLengthText;

  let centerlineElement: React.ReactNode = (
    <polyline
      points={shape.centerline.map((p) => `${p.x},${p.y}`).join(' ')}
      fill="none"
      stroke="#FF3B1D"
      strokeOpacity={0.95}
      strokeWidth={0.5}
      strokeDasharray="0.35 0.18"
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
    />
  );

  if (arcInfo) {
    const { geometry, sweepAngle } = arcInfo;
    const largeArcFlag = Math.abs(sweepAngle) > Math.PI ? 1 : 0;
    const sweepFlag = geometry.isCCW ? 1 : 0;
    const pathData = `M ${start.x},${start.y} A ${geometry.radius},${geometry.radius} 0 ${largeArcFlag},${sweepFlag} ${end.x},${end.y}`;
    centerlineElement = (
      <path
        d={pathData}
        fill="none"
        stroke="#FF3B1D"
        strokeOpacity={0.95}
        strokeWidth={0.5}
        strokeDasharray="0.35 0.18"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
    );
  }

  const shouldShowCenterline = showCenterline !== false;

  // Create mask ID for wall with opening cutouts
  const wallMaskId = `wall-mask-${shape.id}`;

  const wallBaseElements = (
    <>
      {/* Define mask for opening cutouts */}
      {hasOpenings && (
        <defs>
          <mask id={wallMaskId}>
            {/* White background means visible */}
            <rect x="-99999" y="-99999" width="199998" height="199998" fill="white" />
            {/* Black rectangles where openings are = transparent */}
            {gapDefinitions.map((gap) => (
              <polygon key={`mask-${gap.id}`} points={gap.polygonPoints} fill="black" />
            ))}
          </mask>
        </defs>
      )}

      {/* Hit area with opening cutouts - ensures clicks on openings select the opening, not the wall */}
      {/* Uses inset polygon to reduce hover sensitivity at wall junctions */}
      {/* Apply the same mask as the visible wall to exclude opening regions from hit detection */}
      <polygon
        points={hitAreaPoints}
        fill="transparent"
        stroke="none"
        pointerEvents="all"
        cursor="move"
        mask={hasOpenings ? `url(#${wallMaskId})` : undefined}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(e, shape.id);
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

      <polygon
        points={polygonPoints}
        fill={fillColor}
        fillOpacity={shape.appearance ? getFillOpacity(shape.appearance) : undefined}
        stroke="none"
        strokeWidth={1}
        opacity={shape.appearance ? getShapeOpacity(shape.appearance) : undefined}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        style={{ mixBlendMode: getBlendMode(shape.appearance) }}
        filter={getFilterAttribute(shape.appearance, shape.id)}
        mask={hasOpenings ? `url(#${wallMaskId})` : undefined}
      />
      {/* Edge strokes - hidden when using merged wall rendering */}
      {!hideStrokes && faceEdges.map((edge) => (
        <polyline
          key={`${shape.id}-${edge.key}`}
          points={formatPoints(edge.points)}
          fill="none"
          stroke={edgeColor}
          strokeWidth={1}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      ))}
      {/* End caps - hidden when using merged wall rendering */}
      {!hideStrokes && !joinCaps?.start?.connected && (
        <line
          x1={startCap[0].x}
          y1={startCap[0].y}
          x2={startCap[1].x}
          y2={startCap[1].y}
          stroke={edgeColor}
          strokeWidth={1}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
      {!hideStrokes && !joinCaps?.end?.connected && (
        <line
          x1={endCap[0].x}
          y1={endCap[0].y}
          x2={endCap[1].x}
          y2={endCap[1].y}
          stroke={edgeColor}
          strokeWidth={1}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
      {/* Centerline preview */}
      {shouldShowCenterline && centerlineElement}
      {/* Arc handle */}
      {isSelected && (
        <g
          cursor="ns-resize"
          onMouseDown={(e) => {
            e.stopPropagation();
            onCurveHandleMouseDown(e, shape.id);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <rect
            x={curveHandlePosition.x - curveHandleInteractiveSize / 2}
            y={curveHandlePosition.y - curveHandleInteractiveSize / 2}
            width={curveHandleInteractiveSize}
            height={curveHandleInteractiveSize}
            fill="#000000"
            opacity={0}
            pointerEvents="all"
          />
          <rect
            x={curveHandlePosition.x - curveHandleHalfSize}
            y={curveHandlePosition.y - curveHandleHalfSize}
            width={curveHandleSize}
            height={curveHandleSize}
            fill="#F7F5FF"
            stroke="#6F62A4"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
            rx={0.006 * zoomScale}
            ry={0.006 * zoomScale}
          />
          <line
            x1={curveHandlePosition.x - curveHandleHalfSize * 0.75}
            y1={curveHandlePosition.y}
            x2={curveHandlePosition.x + curveHandleHalfSize * 0.75}
            y2={curveHandlePosition.y}
            stroke="#6F62A4"
            strokeWidth={0.9}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
          <line
            x1={curveHandlePosition.x}
            y1={curveHandlePosition.y - curveHandleHalfSize * 0.75}
            x2={curveHandlePosition.x}
            y2={curveHandlePosition.y + curveHandleHalfSize * 0.75}
            stroke="#6F62A4"
            strokeWidth={0.9}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        </g>
      )}
    </>
  );

  return (
    <g>
      <defs>
        <pattern
          id={hatchPatternId}
          patternUnits="userSpaceOnUse"
          width={0.05 * zoomScale}
          height={0.05 * zoomScale}
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={0.05 * zoomScale}
            stroke="#6F62A4"
            strokeWidth={0.005 * zoomScale}
          />
        </pattern>
      </defs>

      {/* Dynamic definitions for appearance */}
      {shape.appearance?.fill?.type === 'gradient' && shape.appearance.fill.gradient && (
        <DynamicGradient shapeId={shape.id} fill={shape.appearance.fill} />
      )}
      {shape.appearance?.fill?.type === 'pattern' && shape.appearance.fill.patternId && (() => {
        // Calculate bounds from the wall polygon
        const xs = polygon.map(p => p.x);
        const ys = polygon.map(p => p.y);
        const wallBounds = {
          minX: Math.min(...xs),
          minY: Math.min(...ys),
          maxX: Math.max(...xs),
          maxY: Math.max(...ys),
        };
        return <DynamicPattern shapeId={shape.id} fill={shape.appearance!.fill!} bounds={wallBounds} />;
      })()}
      {shape.appearance?.shadow && (
        <DynamicShadowFilter shapeId={shape.id} shadow={shape.appearance.shadow} />
      )}

      {wallBaseElements}
      {hasOpenings &&
        gapDefinitions.map((gap) => (
          <g key={`gap-${gap.id}`} pointerEvents="none">
            <polygon points={gap.polygonPoints} fill="transparent" stroke="none" />
            <line
              x1={gap.startLine.start.x}
              y1={gap.startLine.start.y}
              x2={gap.startLine.end.x}
              y2={gap.startLine.end.y}
              stroke={edgeColor}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={gap.endLine.start.x}
              y1={gap.endLine.start.y}
              x2={gap.endLine.end.x}
              y2={gap.endLine.end.y}
              stroke={edgeColor}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      {length > 0.01 && (() => {
        // Smart Measurement Visibility Logic
        const isGlobalEnabled = measurementSettings ? measurementSettings.enabled : showMeasurements;

        // If global is ON, use granular flags. If OFF, only show on selection (not hover).
        // We default to TRUE for granular flags if measurementSettings is undefined (legacy behavior)
        const showLinear = isGlobalEnabled
          ? (measurementSettings?.linearDimensions ?? true)
          : isSelected;

        const isOrthogonal = Math.abs(angle % 90) < 0.1 || Math.abs(angle % 90) > 89.9;
        const showAngles = isGlobalEnabled
          ? (measurementSettings?.angles ?? true) && (!isOrthogonal || isSelected)
          : isSelected;

        const showSpans = isGlobalEnabled
          ? (measurementSettings?.spanDimensions ?? true)
          : isSelected;

        const showArc = isGlobalEnabled
          ? (measurementSettings?.arcDimensions ?? true)
          : isSelected;

        // If nothing is to be shown, return early
        if (!showLinear && !showAngles && !showSpans && !showArc) return null;

        // Emit descriptors for wall length, thickness, and angle
        // Wall length dimension (linear for straight walls, arc for curved)
        if (!arcInfo && showLinear) {
          // Use consistent offset like other shapes (0.35 * zoomScale)
          // Position it outside the wall based on geometry
          const baseOffset = 0.08 * zoomScale;
          const side = measurementOffset >= 0 ? 1 : -1;
          const wallClearance = side === 1 ? outerPositive : -outerNegative;
          const totalOffset = baseOffset + wallClearance;

          dimensionCollector?.({
            type: 'linear',
            id: `wall-${shape.id}-length`,
            start: start,
            end: end,
            text: lengthText,
            zoomScale,
            offset: totalOffset,
            side,
          });

        } else if (arcInfo && showArc) {
          // Arched Wall Dimensions (Inner and Outer)
          const { geometry, sweepAngle } = arcInfo;
          const halfThickness = shape.thickness / 2;

          // Calculate alignment shift
          let alignmentShift = 0;
          if (shape.alignment === 'inside') alignmentShift = halfThickness;
          else if (shape.alignment === 'outside') alignmentShift = -halfThickness;

          // Calculate radial shift based on alignment and arc direction
          // 'inside' means Left, 'outside' means Right relative to path
          // CCW: Left is Inward (-), Right is Outward (+)
          // CW: Left is Outward (+), Right is Inward (-)
          const radialShift = (geometry.isCCW ? -1 : 1) * alignmentShift;
          const visualCenterRadius = geometry.radius + radialShift;

          // Visual Inner and Outer Radii
          const visualInnerRadius = Math.max(visualCenterRadius - halfThickness, 0.001);
          const visualOuterRadius = visualCenterRadius + halfThickness;

          const innerLength = Math.abs(visualInnerRadius * sweepAngle);
          const innerText = formatLength(innerLength, lengthUnit);

          const outerLength = Math.abs(visualOuterRadius * sweepAngle);
          const outerText = formatLength(outerLength, lengthUnit);

          const margin = 0.08 * zoomScale;
          const innerDimOffset = (visualInnerRadius - margin) - geometry.radius;
          const outerDimOffset = (visualOuterRadius + margin) - geometry.radius;

          dimensionCollector?.({
            type: 'arc',
            id: `wall-${shape.id}-inner`,
            center: geometry.center,
            radius: geometry.radius,
            startAngle: geometry.startAngle,
            endAngle: geometry.endAngle,
            isCCW: geometry.isCCW,
            text: innerText,
            zoomScale,
            offset: innerDimOffset,
          });

          dimensionCollector?.({
            type: 'arc',
            id: `wall-${shape.id}-outer`,
            center: geometry.center,
            radius: geometry.radius,
            startAngle: geometry.startAngle,
            endAngle: geometry.endAngle,
            isCCW: geometry.isCCW,
            text: outerText,
            zoomScale,
            offset: outerDimOffset,
          });
        }

        // Angle chip
        if (showAngles && !shape.controlPoint) {
          dimensionCollector?.({
            type: 'chip',
            id: `wall-${shape.id}-angle`,
            position: { x: angleChipX, y: angleChipY },
            text: angleText,
            zoomScale,
          });
        }


        // Wall thickness dimension (perpendicular to wall, positioned at start of wall)
        if (showLinear) {
          const thicknessText = formatLength(shape.thickness, lengthUnit);

          let normalX = unitPerpX;
          let normalY = unitPerpY;
          let tangentX = unitDirX;
          let tangentY = unitDirY;

          if (arcInfo) {
            // For arc, the normal at the start point is along the radius vector.
            // Radius vector: from center to start.
            const { geometry } = arcInfo;
            const rx = start.x - geometry.center.x;
            const ry = start.y - geometry.center.y;
            const rLen = Math.hypot(rx, ry);
            // Normal pointing "outward" from center? Or consistent with straight wall?
            // Straight wall unitPerp is (-dy, dx) / len.
            // Let's use the same convention: Normal points "left" of the path.
            // Path direction at start: Tangent.
            // Tangent angle = startAngle + (isCCW ? 90 : -90) deg?
            // Tangent vector: (-sin(theta), cos(theta)) for CCW?

            // Easier: Normal is along the radius.
            // If CCW, "Left" is inward (towards center).
            // If CW, "Left" is outward (away from center).

            // Let's just compute the two points on the edge of the wall at the start.
            // We already have startCap or we can compute from thickness.

            const nx = rx / rLen;
            const ny = ry / rLen;

            // If isCCW, normal (left) is -radius vector (towards center).
            // Wait, if I walk CCW on a circle, center is to my left.
            // So normal (left) is towards center.
            // Vector from Start to Center is (-rx, -ry).

            if (geometry.isCCW) {
              normalX = -nx;
              normalY = -ny;
            } else {
              normalX = nx;
              normalY = ny;
            }

            // Tangent is perp to normal
            tangentX = -normalY;
            tangentY = normalX;
          }

          // Position the dimension slightly "before" the start of the wall
          const offsetDist = 0.15 * zoomScale;
          const baseX = start.x - tangentX * offsetDist;
          const baseY = start.y - tangentY * offsetDist;

          const halfThickness = shape.thickness / 2;

          // We need to account for alignment shift if the centerline is not in the middle
          // But WallShape thickness is total thickness.
          // And centerline is... well, the centerline property.
          // But `alignment` property shifts the wall body relative to centerline.
          // If alignment is 'center', wall extends +/- halfThickness from centerline.
          // If alignment is 'inside' or 'outside', it shifts.

          let alignmentShift = 0;
          if (shape.alignment === 'inside') alignmentShift = halfThickness;
          else if (shape.alignment === 'outside') alignmentShift = -halfThickness;

          // The visual start/end of the thickness line
          const thicknessStart = {
            x: baseX + normalX * (alignmentShift - halfThickness),
            y: baseY + normalY * (alignmentShift - halfThickness),
          };
          const thicknessEnd = {
            x: baseX + normalX * (alignmentShift + halfThickness),
            y: baseY + normalY * (alignmentShift + halfThickness),
          };

          // Determine offset for the dimension line itself (how far from the measured points)
          // For thickness, we usually want it "inline" or slightly offset.
          // Existing code used `thicknessOffset`.
          const thicknessOffset = 0.08 * zoomScale;

          // Determine side.
          // We want it to be readable.
          // Angle of the dimension line (normal vector angle)
          const thicknessAngle = Math.atan2(normalY, normalX) * (180 / Math.PI);
          const thicknessSide: -1 | 1 = Math.abs(thicknessAngle) > 90 ? -1 : 1;

          dimensionCollector?.({
            type: 'linear',
            id: `wall-${shape.id}-thickness`,
            start: thicknessStart,
            end: thicknessEnd,
            text: thicknessText,
            zoomScale,
            offset: thicknessOffset,
            side: thicknessSide,
          });
        }

        return (
          <>
            {!shape.controlPoint && showAngles && (
              <>
                {/* Angle arc */}
                {(() => {
                  const arcRadius = 0.25 * zoomScale;
                  const axisX = angleChipX + arcRadius;
                  const axisY = angleChipY;
                  const lineEndX = angleChipX + arcRadius * Math.cos(lineAngleRad);
                  const lineEndY = angleChipY + arcRadius * Math.sin(lineAngleRad);
                  const sweepFlag = lineAngleRad > 0 ? 1 : 0;
                  const pathD = `
                    M ${angleChipX},${angleChipY}
                    L ${axisX},${axisY}
                    A ${arcRadius},${arcRadius} 0 0,${sweepFlag} ${lineEndX},${lineEndY}
                    Z
                  `;
                  return <path d={pathD} fill={defaultDimensionTheme.lineColor} opacity="0.15" />;
                })()}
              </>
            )}

            {/* Span measurements */}
            {!arcInfo && showSpans && spanMeasurements.length > 0 && (() => {
              const measurementSide = measurementOffset >= 0 ? 1 : -1;
              const baseClearance = Math.abs(measurementOffset);
              const spanSide = measurementSide;
              const insetGap = Math.max(0.12 * zoomScale, 0.08);
              const spanOffsetMagnitude =
                Math.max(baseClearance - insetGap, 0) + Math.max(0.12 * zoomScale, 0.08);
              // Emit descriptors for span measurements
              if (shouldUseDescriptorLayer) {
                spanMeasurements.forEach((span, index) => {
                  if (span.length <= 0.001) {
                    return;
                  }
                  const spanStartPoint = {
                    x: start.x + unitDirX * span.start,
                    y: start.y + unitDirY * span.start,
                  };
                  const spanEndPoint = {
                    x: start.x + unitDirX * (span.start + span.length),
                    y: start.y + unitDirY * (span.start + span.length),
                  };
                  const spanLengthText = formatLength(span.length, lengthUnit);
                  const measurementColor = span.type === 'opening' ? '#FF9F0A' : '#4A90E2';
                  const id =
                    span.type === 'opening'
                      ? `span-opening-${span.gapId}`
                      : `span-wall-${shape.id}-${index}`;

                  dimensionCollector?.({
                    type: 'span',
                    id,
                    start: spanStartPoint,
                    end: spanEndPoint,
                    text: spanLengthText,
                    zoomScale,
                    offset: spanOffsetMagnitude * spanSide,
                    lineColor: measurementColor,
                    extensionColor: '#555555',
                  });
                });
              }

              return null;
            })()}

            {/* Semicircle Markers - only show when user is actively arcing the wall */}
            {isSelected && (isBeingCurved || shape.controlPoint) && (() => {
              const markers = getSemicircleMarkers(start, end);
              if (!markers) return null;
              const markerSize = 0.02 * zoomScale;
              return (
                <g pointerEvents="none">
                  {markers.map((marker, i) => (
                    <circle
                      key={`semicircle-marker-${i}`}
                      cx={marker.x}
                      cy={marker.y}
                      r={markerSize}
                      fill="#FF3B1D"
                      opacity={0.6}
                    />
                  ))}
                </g>
              );
            })()}

            {/* Midpoint offset measurement (sagitta) */}
            {arcInfo && showArc && (() => {
              const arcMidpoint = arcInfo.arcMidpoint;
              const sagittaVector = {
                x: arcMidpoint.x - midX,
                y: arcMidpoint.y - midY,
              };
              const sagittaLength = Math.hypot(sagittaVector.x, sagittaVector.y);
              if (sagittaLength < 0.0001) {
                return null;
              }
              const sagittaText = formatLength(sagittaLength, lengthUnit);
              const sagittaMidX = (arcMidpoint.x + midX) / 2;
              const sagittaMidY = (arcMidpoint.y + midY) / 2;
              const chipOffset = 0.05 * zoomScale;
              const chipX = sagittaMidX + unitDirX * chipOffset;
              const chipY = sagittaMidY + unitDirY * chipOffset;
              const sagittaCrossSize = Math.max(0.09 * zoomScale, 0.05);
              const sagittaCrossHalf = sagittaCrossSize / 2;

              // Emit descriptor for sagitta chip
              if (shouldUseDescriptorLayer) {
                dimensionCollector?.({
                  type: 'chip',
                  id: `sagitta-${shape.id}`,
                  position: { x: chipX, y: chipY },
                  text: sagittaText,
                  zoomScale,
                });
              }

              return (
                <g>
                  <line
                    x1={midX}
                    y1={midY}
                    x2={arcMidpoint.x}
                    y2={arcMidpoint.y}
                    stroke="#4A90E2"
                    strokeWidth={0.75}
                    strokeDasharray={`${0.08 * zoomScale} ${0.04 * zoomScale}`}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                  <line
                    x1={midX - sagittaCrossHalf}
                    y1={midY}
                    x2={midX + sagittaCrossHalf}
                    y2={midY}
                    stroke="#4A90E2"
                    strokeWidth={0.75}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                    opacity={0.9}
                  />
                  <line
                    x1={midX}
                    y1={midY - sagittaCrossHalf}
                    x2={midX}
                    y2={midY + sagittaCrossHalf}
                    stroke="#4A90E2"
                    strokeWidth={0.75}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                    opacity={0.9}
                  />
                  {isSelected && (
                    <>
                      <>
                        <circle
                          cx={midX}
                          cy={midY}
                          r={0.06 * zoomScale}
                          fill="transparent"
                          stroke="none"
                          pointerEvents="all"
                          cursor="ns-resize"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            onCurveHandleMouseDown(e, shape.id);
                          }}
                        />
                        <circle
                          cx={midX}
                          cy={midY}
                          r={0.02 * zoomScale}
                          fill="#FFFFFF"
                          stroke="#4A90E2"
                          strokeWidth={0.75}
                          vectorEffect="non-scaling-stroke"
                          pointerEvents="none"
                        />
                      </>
                      <rect
                        x={arcMidpoint.x - 0.015 * zoomScale}
                        y={arcMidpoint.y - 0.015 * zoomScale}
                        width={0.03 * zoomScale}
                        height={0.03 * zoomScale}
                        fill="#FFFFFF"
                        stroke="#4A90E2"
                        strokeWidth={0.75}
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="none"
                      />
                    </>
                  )}
                </g>
              );
            })()}
          </>
        );
      })()}
    </g>
  );
});

// Display name for React DevTools
WallShapeComponent.displayName = 'WallShapeComponent';

