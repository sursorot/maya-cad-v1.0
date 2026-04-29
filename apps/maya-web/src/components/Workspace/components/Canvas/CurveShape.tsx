import React from 'react';
import type { CurveShape, ToolType, LengthUnit, MeasurementSettings } from '../../types';
import { calculateCurveLength, generateCatmullRomPath, formatLength } from '../../utils/measurements';
import { useDimensionCollector } from './dimensions/DimensionContext';
import { defaultDimensionTheme } from './dimensions/theme';
import {
  getStrokeAttribute,
  getStrokeWidth,
  getStrokeDashArray,
  getStrokeLineCap,
  getStrokeLineJoin,
  getShapeOpacity,
  getStrokeOpacity,
  getBlendMode,
  getFilterAttribute,
} from './appearanceUtils';
import { DynamicShadowFilter, HATCH_PATTERN_ID } from './AppearanceRenderer';

interface CurveShapeProps {
  shape: CurveShape;
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

export const CurveShapeComponent: React.FC<CurveShapeProps> = ({
  shape,
  showMeasurements = false,
  measurementSettings,
  isSelected,
  isHovered: _isHovered,
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

  if (shape.type !== 'curve' || shape.points.length < 2) return null;

  // Generate smooth curve path using Catmull-Rom splines
  const pathData = generateCatmullRomPath(shape.points, 20, 0);

  // Calculate curve length for measurement
  const curveLength = calculateCurveLength(shape.points, 20, 0);
  const lengthText = formatLength(curveLength, lengthUnit);
  const hatchOpacity = isSelected ? 0.22 : 0.14;
  const showHatch = forceHatch || isSelected || _isHovered;

  // Use architectural dimension theme
  const theme = defaultDimensionTheme;
  const chipPadding = theme.chipPadding;
  const fontSize = theme.fontSize;
  const charWidth = fontSize * theme.charWidthFactor;

  const getChipWidth = (text: string) => text.length * charWidth + chipPadding * 2;
  const chipHeight = fontSize + chipPadding * 2;

  // Smart Measurement Logic
  const isGlobalEnabled = measurementSettings ? measurementSettings.enabled : showMeasurements;
  const showChip = isGlobalEnabled
    ? (measurementSettings?.chipDimensions ?? true)
    : isSelected;

  // Calculate midpoint of the curve for length label
  // Use the middle control point or average of all points
  const midIdx = Math.floor(shape.points.length / 2);
  const midPoint = shape.points[midIdx];
  const shouldShade = shape.points.length >= 3;
  const hatchPathData = `${pathData} Z`;

  return (
    <g key={shape.id} data-shape-id={shape.id}>
      {/* Dynamic shadow filter if needed */}
      {shape.appearance?.shadow && (
        <DynamicShadowFilter shapeId={shape.id} shadow={shape.appearance.shadow} />
      )}

      {/* Invisible wider path for easier clicking/selecting */}
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

      {/* Invisible fill hit-area for hover/select over the closed curve region */}
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

      {/* The smooth curve itself - with full appearance support */}
      <path
        d={pathData}
        stroke={getStrokeAttribute(shape.appearance, shape.stroke)}
        strokeWidth={getStrokeWidth(shape.appearance, 1)}
        strokeDasharray={getStrokeDashArray(shape.appearance)}
        strokeLinecap={getStrokeLineCap(shape.appearance) || 'round'}
        strokeLinejoin={getStrokeLineJoin(shape.appearance) || 'round'}
        strokeOpacity={getStrokeOpacity(shape.appearance)}
        opacity={getShapeOpacity(shape.appearance)}
        fill="none"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        style={{ mixBlendMode: getBlendMode(shape.appearance) }}
        filter={getFilterAttribute(shape.appearance, shape.id)}
      />

      {/* Hatch shading (fills closed or in-progress curves by connecting endpoints) */}
      {shouldShade && showHatch && (
        <path
          d={hatchPathData}
          fill={`url(#${HATCH_PATTERN_ID})`}
          fillOpacity={hatchOpacity}
          stroke="none"
          pointerEvents="none"
        />
      )}

      {/* Measurement labels (only show during drawing) */}
      {(showChip) && curveLength > 0.01 && (
        <>
          {/* Control points indicators */}
          {shape.points.map((point, index) => {
            const isFirst = index === 0;
            const isLast = index === shape.points.length - 1;

            if (isFirst) {
              // First point - show as larger filled circle with stroke (closing target)
              return (
                <g key={`point-${index}`}>
                  {/* Outer ring to indicate this is the closing point */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={0.025 * zoomScale}
                    fill="none"
                    stroke={theme.lineColor}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                    opacity="0.4"
                  />
                  {/* Inner filled circle */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={0.018 * zoomScale}
                    fill={theme.lineColor}
                  />
                </g>
              );
            } else if (isLast) {
              // Last point (cursor following) - show as hollow circle
              return (
                <circle
                  key={`point-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={0.02 * zoomScale}
                  fill="none"
                  stroke={theme.lineColor}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              );
            } else {
              // Intermediate control points - show as small filled circles
              return (
                <circle
                  key={`point-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={0.012 * zoomScale}
                  fill={theme.lineColor}
                  opacity={0.7}
                />
              );
            }
          })}

          {/* Length label at midpoint of curve */}
          {shouldUseDescriptorLayer
            ? dimensionCollector?.({
              type: 'chip',
              id: `curve-${shape.id}-length`,
              position: { x: midPoint.x, y: midPoint.y - 0.15 * zoomScale },
              text: lengthText,
              zoomScale,
            })
            : (
              <g transform={`translate(${midPoint.x}, ${midPoint.y - 0.15 * zoomScale}) scale(${zoomScale})`}>
                <rect
                  x={-getChipWidth(lengthText) / 2}
                  y={-chipHeight / 2}
                  width={getChipWidth(lengthText)}
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
                  {lengthText}
                </text>
              </g>
            )}

          {/* Show tangent lines from control points (optional, light guidance) */}
          {shape.points.length > 2 && shape.points.slice(1, -1).map((point, index) => {
            const actualIndex = index + 1;
            const prevPoint = shape.points[actualIndex - 1];
            const nextPoint = shape.points[actualIndex + 1];

            // Calculate tangent direction
            const tangentX = (nextPoint.x - prevPoint.x) * 0.08;
            const tangentY = (nextPoint.y - prevPoint.y) * 0.08;

            return (
              <g key={`tangent-${index}`}>
                <line
                  x1={point.x - tangentX}
                  y1={point.y - tangentY}
                  x2={point.x + tangentX}
                  y2={point.y + tangentY}
                  stroke={theme.lineColor}
                  strokeWidth={0.5}
                  strokeDasharray="0.015,0.015"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.3"
                />
              </g>
            );
          })}
        </>
      )}
    </g>
  );
};

