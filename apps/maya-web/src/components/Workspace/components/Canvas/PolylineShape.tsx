import React from 'react';
import type { PolylineShape as PolylineShapeType, ToolType, LengthUnit, MeasurementSettings } from '../../types';
import { calculateLength, calculateAngle, calculateSegmentAngle, formatLength, formatAngle } from '../../utils/measurements';
import { useDimensionCollector } from './dimensions/DimensionContext';
import { defaultDimensionTheme } from './dimensions/theme';
import {
  getFillAttribute,
  getStrokeAttribute,
  getStrokeWidth,
  getStrokeDashArray,
  getStrokeLineCap,
  getStrokeLineJoin,
  getFillOpacity,
  getShapeOpacity,
  getStrokeOpacity,
  getBlendMode,
  getFilterAttribute,
} from './appearanceUtils';
import {
  DynamicShadowFilter,
  DynamicGradient,
} from './AppearanceRenderer';
import { HATCH_PATTERN_ID } from './AppearanceRenderer';

interface PolylineShapeProps {
  shape: PolylineShapeType;
  showMeasurements?: boolean;
  measurementSettings?: MeasurementSettings;
  isSelected: boolean;
  isHovered: boolean;
  forceHatch?: boolean;
  activeTool: ToolType;
  lengthUnit: LengthUnit;
  zoomScale: number;
  useDimensionLayer?: boolean;
  onMouseDown: (e: React.MouseEvent<SVGElement>, shapeId: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const PolylineShape: React.FC<PolylineShapeProps> = React.memo(({
  shape,
  showMeasurements = false,
  measurementSettings,
  isSelected,
  isHovered,
  forceHatch = false,
  activeTool,
  lengthUnit,
  zoomScale,
  useDimensionLayer = false,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}) => {
  const dimensionCollector = useDimensionCollector();
  const shouldUseDescriptorLayer = Boolean(useDimensionLayer && dimensionCollector);

  if (shape.type !== 'polyline' || shape.points.length < 2) return null;

  // Use architectural dimension theme
  const theme = defaultDimensionTheme;
  const chipPadding = theme.chipPadding;
  const fontSize = theme.fontSize;
  const charWidth = fontSize * theme.charWidthFactor;

  const getChipWidth = (text: string) => text.length * charWidth + chipPadding * 2;
  const chipHeight = fontSize + chipPadding * 2;
  
  // 45-degree tick marks
  const tickLength = theme.tickLength;
  const tickAngleRad = (theme.tickAngle * Math.PI) / 180;
  const tickDx = (tickLength / 2) * Math.cos(tickAngleRad);
  const tickDy = (tickLength / 2) * Math.sin(tickAngleRad);

  // Smart Measurement Logic
  const isGlobalEnabled = measurementSettings ? measurementSettings.enabled : showMeasurements;
  const showLinear = isGlobalEnabled
    ? (measurementSettings?.linearDimensions ?? true)
    : isSelected;
  const showAngles = isGlobalEnabled
    ? (measurementSettings?.angles ?? true)
    : isSelected;

  // Create path for the polyline
  const pathData = shape.points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`)
    .join(' ');

  // Check if polyline is closed (first and last points are very close)
  const firstPoint = shape.points[0];
  const lastPoint = shape.points[shape.points.length - 1];
  const dist = Math.hypot(lastPoint.x - firstPoint.x, lastPoint.y - firstPoint.y);
  const isClosed = dist < 0.001; // Tolerance of 1mm
  const shouldShade = shape.points.length >= 3;
  const showHatch = forceHatch || isSelected || isHovered;
  const hatchOpacity = isSelected ? 0.26 : 0.16;
  const hatchPathData = `${pathData} Z`;

  return (
    <g key={shape.id} data-shape-id={shape.id}>
      {/* Dynamic definitions for this shape */}
      {shape.appearance?.fill?.type === 'gradient' && shape.appearance.fill.gradient && (
        <DynamicGradient shapeId={shape.id} fill={shape.appearance.fill} />
      )}
      {shape.appearance?.shadow && (
        <DynamicShadowFilter shapeId={shape.id} shadow={shape.appearance.shadow} />
      )}

      {/* Invisible wider path for easier clicking/selecting (stroke) */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth={10}
        fill="none"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ cursor: 'inherit' }}
        onMouseDown={(e) => {
          if (!isSelected && activeTool === 'select') {
            e.stopPropagation();
            onMouseDown(e, shape.id);
          }
        }}
        onClick={(e) => {
          if (!isSelected && activeTool === 'select') {
            e.stopPropagation();
          }
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

      {/* Invisible fill hit-area so hover/select works inside the closed region */}
      {shouldShade && (
        <path
          d={hatchPathData}
          fill="transparent"
          stroke="none"
          pointerEvents="all"
          onMouseDown={(e) => {
            if (!isSelected && activeTool === 'select') {
              e.stopPropagation();
              onMouseDown(e, shape.id);
            }
          }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      )}

      {/* The polyline itself - with full appearance support */}
      <path
        d={pathData}
        fill={isClosed ? getFillAttribute(shape.appearance?.fill, shape.id) : 'none'}
        fillOpacity={isClosed ? getFillOpacity(shape.appearance) : undefined}
        stroke={getStrokeAttribute(shape.appearance, shape.stroke)}
        strokeWidth={getStrokeWidth(shape.appearance, 1)}
        strokeDasharray={getStrokeDashArray(shape.appearance)}
        strokeLinecap={getStrokeLineCap(shape.appearance) || 'round'}
        strokeLinejoin={getStrokeLineJoin(shape.appearance) || 'round'}
        strokeOpacity={getStrokeOpacity(shape.appearance)}
        opacity={getShapeOpacity(shape.appearance)}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        style={{ mixBlendMode: getBlendMode(shape.appearance) }}
        filter={getFilterAttribute(shape.appearance, shape.id)}
      />

      {/* Hatch shading */}
      {shouldShade && showHatch && (
        <path
          d={hatchPathData}
          fill={`url(#${HATCH_PATTERN_ID})`}
          fillOpacity={hatchOpacity}
          stroke="none"
          pointerEvents="none"
        />
      )}

      {/* Selection indicator */}
      {isSelected && (
        <path
          d={pathData}
          stroke="#2E5C8A"
          strokeWidth={3}
          strokeOpacity={0.3}
          fill="none"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}

      {/* Hover indicator */}
      {isHovered && !isSelected && (
        <path
          d={pathData}
          stroke="#4A90E2"
          strokeWidth={2.5}
          strokeOpacity={0.4}
          fill="none"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}

      {/* Measurement labels (show for all segments during drawing) */}
      {(showLinear || showAngles) && (
        <>
          {/* Render measurements for all segments */}
          {shape.points.map((point, index) => {
            // Show all points
            if (index === 0) {
              return (
                <circle
                  key={`point-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={0.015 * zoomScale}
                  fill={theme.lineColor}
                />
              );
            }

            const prevPoint = shape.points[index - 1];
            const length = calculateLength(prevPoint, point);

            // Skip rendering if segment is too short
            if (length < 0.01) return null;

            // Calculate midpoint for length label
            const midX = (prevPoint.x + point.x) / 2;
            const midY = (prevPoint.y + point.y) / 2;

            const lengthText = formatLength(length, lengthUnit);

            return (
              <g key={`segment-${index}`}>
                {/* Angle measurement - first segment w.r.t. horizontal, others w.r.t. previous segment */}
                {showAngles && (index === 1 ? (
                  // First segment: show angle w.r.t. horizontal
                  <>
                    {/* Angle arc visualization (w.r.t. horizontal) */}
                    <g>
                      {(() => {
                        const horizontalAngle = calculateAngle(prevPoint, point);
                        const horizontalAngleText = formatAngle(horizontalAngle);

                        // Hide orthogonal angles (0, 90, 180, 270) unless selected
                        const isOrthogonal = Math.abs(horizontalAngle % 90) < 0.1 || Math.abs(horizontalAngle % 90) > 89.9;
                        if (isOrthogonal && !isSelected) return null;

                        const arcRadius = 0.25 * zoomScale;

                        // Calculate the angle of the line in radians (SVG coordinate system)
                        const lineAngleRad = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x);

                        // Horizontal reference (always to the right)
                        const horizontalX = prevPoint.x + arcRadius;
                        const horizontalY = prevPoint.y;

                        // End point of arc (along the line direction)
                        const lineEndX = prevPoint.x + arcRadius * Math.cos(lineAngleRad);
                        const lineEndY = prevPoint.y + arcRadius * Math.sin(lineAngleRad);

                        // Determine sweep direction based on which way the line goes
                        const sweepFlag = lineAngleRad > 0 ? 1 : 0;
                        const largeArcFlag = 0;

                        const pathD = `
                          M ${prevPoint.x},${prevPoint.y}
                          L ${horizontalX},${horizontalY}
                          A ${arcRadius},${arcRadius} 0 ${largeArcFlag},${sweepFlag} ${lineEndX},${lineEndY}
                          Z
                        `;

                        return (
                          <>
                            <path
                              d={pathD}
                              fill={theme.lineColor}
                              opacity="0.15"
                            />
                            {/* Angle label (w.r.t. horizontal) offset to left of start point */}
                            <g transform={`translate(${prevPoint.x - 0.12 * zoomScale}, ${prevPoint.y}) scale(${zoomScale})`}>
                              <rect
                                x={-getChipWidth(horizontalAngleText) / 2}
                                y={-chipHeight / 2}
                                width={getChipWidth(horizontalAngleText)}
                                height={chipHeight}
                                fill={theme.backgroundColor}
                              />
                              <text
                                x="0"
                                y="0"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill={theme.textColor}
                                fontSize={fontSize}
                                fontWeight={theme.fontWeight}
                                fontFamily={theme.fontFamily}
                                style={{ userSelect: 'none' }}
                              >
                                {horizontalAngleText}
                              </text>
                            </g>
                          </>
                        );
                      })()}
                    </g>
                  </>
                ) : (
                  // Subsequent segments: show angle relative to previous segment
                  <>
                    {(() => {
                      const p1 = shape.points[index - 2];
                      const p2 = shape.points[index - 1];
                      const p3 = shape.points[index];

                      const angle = calculateSegmentAngle(p1, p2, p3);
                      const angleText = formatAngle(angle);

                      // Hide orthogonal angles (90 degrees) unless selected
                      const isOrthogonal = Math.abs(angle % 90) < 0.1 || Math.abs(angle % 90) > 89.9;
                      if (isOrthogonal && !isSelected) return null;

                      // Calculate angles of both segments relative to horizontal
                      const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
                      const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);

                      const arcRadius = 0.25 * zoomScale;

                      // Calculate arc start and end points
                      const startX = p2.x + Math.cos(angle1) * arcRadius;
                      const startY = p2.y + Math.sin(angle1) * arcRadius;
                      const endX = p2.x + Math.cos(angle2) * arcRadius;
                      const endY = p2.y + Math.sin(angle2) * arcRadius;

                      // Since we're using the interior angle (0-180°), we never need large arc
                      const largeArcFlag = 0;

                      // Determine sweep direction
                      // We want to go from angle1 to angle2 via the shorter path
                      let angleDiff = angle2 - angle1;

                      // Normalize angle difference to -PI to PI range
                      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                      // If angle difference is positive, sweep counterclockwise (0), else clockwise (1)
                      const sweepFlag = angleDiff > 0 ? 1 : 0;

                      const pathD = `
                        M ${p2.x},${p2.y}
                        L ${startX},${startY}
                        A ${arcRadius},${arcRadius} 0 ${largeArcFlag},${sweepFlag} ${endX},${endY}
                        Z
                      `;

                      return (
                        <>
                          {/* Angle arc */}
                          <path
                            d={pathD}
                            fill={theme.lineColor}
                            opacity="0.15"
                          />

                          {/* Angle label offset to left of vertex point */}
                          <g transform={`translate(${p2.x - 0.12 * zoomScale}, ${p2.y}) scale(${zoomScale})`}>
                            <rect
                              x={-getChipWidth(angleText) / 2}
                              y={-chipHeight / 2}
                              width={getChipWidth(angleText)}
                              height={chipHeight}
                              fill={theme.backgroundColor}
                            />
                            <text
                              x="0"
                              y="0"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill={theme.textColor}
                              fontSize={fontSize}
                              fontWeight={theme.fontWeight}
                              fontFamily={theme.fontFamily}
                              style={{ userSelect: 'none' }}
                            >
                              {angleText}
                            </text>
                          </g>
                        </>
                      );
                    })()}
                  </>
                ))}

                {/* Architectural ticks-on-line dimension */}
                {showLinear && (() => {
                  const descriptorId = `polyline-${shape.id}-segment-${index}`;
                  if (shouldUseDescriptorLayer) {
                    dimensionCollector?.({
                      type: 'linear',
                      id: descriptorId,
                      start: prevPoint,
                      end: point,
                      text: lengthText,
                      zoomScale,
                      offset: 0.08 * zoomScale,
                      side: -1,
                    });
                    return null;
                  }

                  // Calculate line angle in radians for proper rotation
                  const dx = point.x - prevPoint.x;
                  const dy = point.y - prevPoint.y;
                  const lineAngleRad = Math.atan2(dy, dx);
                  let lineAngleDeg = lineAngleRad * (180 / Math.PI);

                  // Keep text upright - flip if line angle makes text upside down
                  const textFlip = lineAngleDeg > 90 || lineAngleDeg < -90;
                  if (textFlip) {
                    lineAngleDeg = lineAngleDeg + 180;
                  }

                  // Dimension line offset from the actual line
                  const offset = 0.08 * zoomScale;

                  // Half length of the segment
                  const halfLen = length / 2;

                  // Chip dimensions in world coordinates (scaled)
                  const chipWidth = getChipWidth(lengthText) * zoomScale;
                  const chipHalfWidth = chipWidth / 2 + 0.01 * zoomScale;
                  const scaledChipHeight = chipHeight * zoomScale;

                  // Tick mark scaling
                  const scaledTickDx = tickDx * zoomScale;
                  const scaledTickDy = tickDy * zoomScale;

                  return (
                    <g transform={`translate(${midX}, ${midY}) rotate(${lineAngleDeg})`}>
                      {/* Dimension line - start to text */}
                      <line
                        x1={-halfLen}
                        y1={-offset}
                        x2={-chipHalfWidth}
                        y2={-offset}
                        stroke={theme.lineColor}
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                      />

                      {/* Dimension line - text to end */}
                      <line
                        x1={chipHalfWidth}
                        y1={-offset}
                        x2={halfLen}
                        y2={-offset}
                        stroke={theme.lineColor}
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                      />

                      {/* Start tick mark (45-degree) */}
                      <line
                        x1={-halfLen - scaledTickDx}
                        y1={-offset - scaledTickDy}
                        x2={-halfLen + scaledTickDx}
                        y2={-offset + scaledTickDy}
                        stroke={theme.lineColor}
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                      />

                      {/* End tick mark (45-degree) */}
                      <line
                        x1={halfLen - scaledTickDx}
                        y1={-offset - scaledTickDy}
                        x2={halfLen + scaledTickDx}
                        y2={-offset + scaledTickDy}
                        stroke={theme.lineColor}
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                      />

                      {/* Text background - white rectangle */}
                      <rect
                        x={-chipHalfWidth}
                        y={-offset - scaledChipHeight / 2}
                        width={chipHalfWidth * 2}
                        height={scaledChipHeight}
                        fill={theme.backgroundColor}
                      />

                      {/* Measurement text */}
                      <text
                        x="0"
                        y={-offset}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={theme.textColor}
                        fontSize={fontSize * zoomScale}
                        fontWeight={theme.fontWeight}
                        fontFamily={theme.fontFamily}
                        style={{ userSelect: 'none' }}
                      >
                        {lengthText}
                      </text>
                    </g>
                  );
                })()}

                {/* Point indicator */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={0.015 * zoomScale}
                  fill={theme.lineColor}
                />
              </g>
            );
          })}
        </>
      )}
    </g>
  );
});

