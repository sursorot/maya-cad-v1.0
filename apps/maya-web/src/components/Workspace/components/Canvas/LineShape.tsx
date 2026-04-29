import React from 'react';
import type { Shape, ToolType, LengthUnit, MeasurementSettings } from '../../types';
import { calculateLength, calculateAngle, formatLength, formatAngle } from '../../utils/measurements';
import { measureChipDimensions, defaultDimensionTheme } from './dimensions/theme';
import { useDimensionCollector } from './dimensions/DimensionContext';
import {
  getStrokeAttribute,
  getStrokeWidth,
  getStrokeDashArray,
  getStrokeLineCap,
  getShapeOpacity,
  getStrokeOpacity,
  getBlendMode,
  getFilterAttribute,
} from './appearanceUtils';
import { DynamicShadowFilter } from './AppearanceRenderer';

interface LineShapeProps {
  shape: Shape;
  showMeasurements?: boolean;
  measurementSettings?: MeasurementSettings;
  isSelected: boolean;
  isHovered: boolean;
  activeTool: ToolType;
  lengthUnit: LengthUnit;
  zoomScale: number;
  useDimensionLayer?: boolean;
  onMouseDown: (e: React.MouseEvent<SVGElement>, shapeId: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * LineShape - Memoized for performance
 * Renders line shapes with measurements
 */
export const LineShape: React.FC<LineShapeProps> = React.memo(({
  shape,
  showMeasurements = false,
  measurementSettings,
  isSelected,
  isHovered,
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

  if (shape.type !== 'line') return null;
  const lineShape = shape;

  const length = calculateLength(lineShape.start, lineShape.end);
  const angle = calculateAngle(lineShape.start, lineShape.end);
  const lengthText = formatLength(length, lengthUnit);
  const angleText = formatAngle(angle);
  
  // Offset angle label to the left of start point to avoid overlapping with bounding box handle
  const angleLabelOffset = 0.12 * zoomScale;
  const angleLabelX = lineShape.start.x - angleLabelOffset;
  const angleLabelY = lineShape.start.y;

  // Smart Measurement Logic
  const isGlobalEnabled = measurementSettings ? measurementSettings.enabled : showMeasurements;
  const showLinear = isGlobalEnabled
    ? (measurementSettings?.linearDimensions ?? true)
    : isSelected;
  const isOrthogonal = Math.abs(angle % 90) < 0.1 || Math.abs(angle % 90) > 89.9;
  const showAngles = isGlobalEnabled
    ? (measurementSettings?.angles ?? true) && (!isOrthogonal || isSelected)
    : isSelected;

  if (shouldUseDescriptorLayer && showLinear && length > 0.01) {
    dimensionCollector?.({
      type: 'linear',
      id: `line-${lineShape.id}-length`,
      start: lineShape.start,
      end: lineShape.end,
      text: lengthText,
      zoomScale,
      offset: 0.08 * zoomScale,
      side: -1,
    });
  }

  return (
    <g key={lineShape.id} data-shape-id={lineShape.id}>
      {/* Dynamic shadow filter if needed */}
      {lineShape.appearance?.shadow && (
        <DynamicShadowFilter shapeId={lineShape.id} shadow={lineShape.appearance.shadow} />
      )}

      {/* Invisible wider line for easier clicking/selecting */}
      <line
        x1={lineShape.start.x}
        y1={lineShape.start.y}
        x2={lineShape.end.x}
        y2={lineShape.end.y}
        stroke="transparent"
        strokeWidth={10}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        style={{ cursor: 'inherit' }}
        onMouseDown={(e) => {
          if (!isSelected && activeTool === 'select') {
            e.stopPropagation();
            onMouseDown(e, lineShape.id);
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
      {/* The line itself - with full appearance support */}
      <line
        x1={lineShape.start.x}
        y1={lineShape.start.y}
        x2={lineShape.end.x}
        y2={lineShape.end.y}
        stroke={getStrokeAttribute(lineShape.appearance, lineShape.stroke)}
        strokeWidth={getStrokeWidth(lineShape.appearance, 1)}
        strokeDasharray={getStrokeDashArray(lineShape.appearance)}
        strokeLinecap={getStrokeLineCap(lineShape.appearance) || 'round'}
        strokeOpacity={getStrokeOpacity(lineShape.appearance)}
        opacity={getShapeOpacity(lineShape.appearance)}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        style={{ mixBlendMode: getBlendMode(lineShape.appearance) }}
        filter={getFilterAttribute(lineShape.appearance, lineShape.id)}
      />

      {/* Selection indicator - subtle glow when selected */}
      {isSelected && (
        <line
          x1={lineShape.start.x}
          y1={lineShape.start.y}
          x2={lineShape.end.x}
          y2={lineShape.end.y}
          stroke="#2E5C8A"
          strokeWidth={3}
          strokeOpacity={0.3}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          pointerEvents="none"
        />
      )}

      {/* Hover indicator */}
      {isHovered && !isSelected && (
        <line
          x1={lineShape.start.x}
          y1={lineShape.start.y}
          x2={lineShape.end.x}
          y2={lineShape.end.y}
          stroke="#4A90E2"
          strokeWidth={2.5}
          strokeOpacity={0.4}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          pointerEvents="none"
        />
      )}

      {/* Measurement labels (only show during drawing) */}
      {(showLinear || showAngles) && length > 0.01 && (
        <>
          {/* Angle arc visualization */}
          {showAngles && (
            <g>
              {(() => {
                const arcRadius = 0.25 * zoomScale; // Scale with zoom like measurement chips

                // Calculate the angle of the line in radians (SVG coordinate system)
                const lineAngleRad = Math.atan2(lineShape.end.y - lineShape.start.y, lineShape.end.x - lineShape.start.x);

                // Horizontal reference (always to the right)
                const horizontalX = lineShape.start.x + arcRadius;
                const horizontalY = lineShape.start.y;

                // End point of arc (along the line direction)
                const lineEndX = lineShape.start.x + arcRadius * Math.cos(lineAngleRad);
                const lineEndY = lineShape.start.y + arcRadius * Math.sin(lineAngleRad);

                // Determine sweep direction based on which way the line goes
                // If line is above horizontal (negative Y), sweep counterclockwise (0)
                // If line is below horizontal (positive Y), sweep clockwise (1)
                const sweepFlag = lineAngleRad > 0 ? 1 : 0;

                // Always use small arc since our angles are -180 to +180
                const largeArcFlag = 0;

                // Create path: move to center, line to horizontal, arc to line direction, close
                const pathD = `
                M ${lineShape.start.x},${lineShape.start.y}
                L ${horizontalX},${horizontalY}
                A ${arcRadius},${arcRadius} 0 ${largeArcFlag},${sweepFlag} ${lineEndX},${lineEndY}
                Z
              `;

                return (
                  <path
                    d={pathD}
                    fill={defaultDimensionTheme.lineColor}
                    opacity="0.15"
                  />
                );
              })()}
            </g>
          )}

          {showAngles && (() => {
            const angleChipMetrics = measureChipDimensions(
              angleText,
              zoomScale,
            );
            const theme = defaultDimensionTheme;
            const cornerRadius = theme.cornerRadius * zoomScale;
            return (
              <g transform={`translate(${angleLabelX}, ${angleLabelY})`}>
                <rect
                  x={-angleChipMetrics.halfWidth}
                  y={-angleChipMetrics.halfHeight}
                  width={angleChipMetrics.width}
                  height={angleChipMetrics.height}
                  fill={theme.backgroundColor}
                  rx={cornerRadius}
                />
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={theme.textColor}
                  fontSize={angleChipMetrics.fontSize}
                  fontWeight={theme.fontWeight}
                  fontFamily={theme.fontFamily}
                  style={{ userSelect: 'none' }}
                >
                  {angleText}
                </text>
              </g>
            );
          })()}
          {/* Start point indicator */}
          <circle
            cx={lineShape.start.x}
            cy={lineShape.start.y}
            r={0.015 * zoomScale}
            fill={defaultDimensionTheme.lineColor}
          />

          {/* End point indicator */}
          <circle
            cx={lineShape.end.x}
            cy={lineShape.end.y}
            r={0.015 * zoomScale}
            fill={defaultDimensionTheme.lineColor}
          />
        </>
      )}
    </g>
  );
});

// Display name for React DevTools
LineShape.displayName = 'LineShape';

