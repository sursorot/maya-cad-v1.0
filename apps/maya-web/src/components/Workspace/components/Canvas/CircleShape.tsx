import React from 'react';
import type { CircleShape, ToolType, LengthUnit, MeasurementSettings } from '../../types';
import { formatLength } from '../../utils/measurements';
import { useDimensionCollector } from './dimensions/DimensionContext';
import { defaultDimensionTheme } from './dimensions/theme';
import {
  getFillAttribute,
  getStrokeAttribute,
  getStrokeWidth,
  getStrokeDashArray,
  getFillOpacity,
  getShapeOpacity,
  getStrokeOpacity,
  getBlendMode,
  getFilterAttribute,
} from './appearanceUtils';
import {
  DynamicPattern,
  DynamicShadowFilter,
  DynamicGradient,
} from './AppearanceRenderer';
import { HATCH_PATTERN_ID } from './AppearanceRenderer';

interface CircleShapeProps {
  shape: CircleShape;
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

export const CircleShapeComponent: React.FC<CircleShapeProps> = React.memo(({
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

  if (shape.type !== 'circle') return null;

  // Format measurement text
  const radiusText = formatLength(shape.radius, lengthUnit);
  const hatchOpacity = isSelected ? 0.25 : 0.14;
  const showHatch = forceHatch || isSelected || isHovered;

  // Smart Measurement Logic
  const isGlobalEnabled = measurementSettings ? measurementSettings.enabled : showMeasurements;
  const showRadius = isGlobalEnabled
    ? (measurementSettings?.linearDimensions ?? true)
    : isSelected;

  if (shouldUseDescriptorLayer && showRadius && shape.radius > 0.01) {
    const labelX = shape.center.x + shape.radius / 2;
    const labelY = shape.center.y - 0.1 * zoomScale;
    dimensionCollector?.({
      type: 'chip',
      id: `circle-${shape.id}-radius`,
      position: { x: labelX, y: labelY },
      text: radiusText,
      zoomScale,
    });
  }

  return (
    <g key={shape.id} data-shape-id={shape.id}>
      {/* Dynamic definitions for this shape */}
      {shape.appearance?.fill?.type === 'gradient' && shape.appearance.fill.gradient && (
        <DynamicGradient shapeId={shape.id} fill={shape.appearance.fill} />
      )}
      {shape.appearance?.fill?.type === 'pattern' && shape.appearance.fill.patternId && (
        <DynamicPattern 
          shapeId={shape.id} 
          fill={shape.appearance.fill} 
          bounds={{ 
            minX: shape.center.x - shape.radius, 
            minY: shape.center.y - shape.radius, 
            maxX: shape.center.x + shape.radius, 
            maxY: shape.center.y + shape.radius 
          }} 
        />
      )}
      {shape.appearance?.shadow && (
        <DynamicShadowFilter shapeId={shape.id} shadow={shape.appearance.shadow} />
      )}

      {/* Invisible wider stroke for easier clicking/selecting */}
      <circle
        cx={shape.center.x}
        cy={shape.center.y}
        r={shape.radius}
        stroke="transparent"
        strokeWidth={10}
        fill="none"
        vectorEffect="non-scaling-stroke"
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

      {/* Invisible fill hit-area for hover/select over the whole circle */}
      <circle
        cx={shape.center.x}
        cy={shape.center.y}
        r={shape.radius}
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

      {/* The circle itself - with full appearance support */}
      <circle
        cx={shape.center.x}
        cy={shape.center.y}
        r={shape.radius}
        fill={getFillAttribute(shape.appearance?.fill, shape.id)}
        fillOpacity={getFillOpacity(shape.appearance)}
        stroke={getStrokeAttribute(shape.appearance, shape.stroke)}
        strokeWidth={getStrokeWidth(shape.appearance, 1)}
        strokeDasharray={getStrokeDashArray(shape.appearance)}
        strokeOpacity={getStrokeOpacity(shape.appearance)}
        opacity={getShapeOpacity(shape.appearance)}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        style={{ mixBlendMode: getBlendMode(shape.appearance) }}
        filter={getFilterAttribute(shape.appearance, shape.id)}
      />

      {/* Hatch shading */}
      {showHatch && (
        <circle
          cx={shape.center.x}
          cy={shape.center.y}
          r={shape.radius}
          fill={`url(#${HATCH_PATTERN_ID})`}
          fillOpacity={hatchOpacity}
          stroke="none"
          pointerEvents="none"
        />
      )}

      {/* Selection indicator */}
      {isSelected && (
        <circle
          cx={shape.center.x}
          cy={shape.center.y}
          r={shape.radius}
          stroke="#2E5C8A"
          strokeWidth={2.5}
          strokeOpacity={0.5}
          fill="none"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}

      {/* Hover indicator */}
      {isHovered && !isSelected && (
        <circle
          cx={shape.center.x}
          cy={shape.center.y}
          r={shape.radius}
          stroke="#4A90E2"
          strokeWidth={2}
          strokeOpacity={0.5}
          fill="none"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}

      {/* Measurement labels (only show during drawing) */}
      {showRadius && shape.radius > 0.01 && (
        <>
          {/* Center point cross - architectural red marker */}
          <g>
            <line
              x1={shape.center.x - 0.03 * zoomScale}
              y1={shape.center.y}
              x2={shape.center.x + 0.03 * zoomScale}
              y2={shape.center.y}
              stroke={defaultDimensionTheme.lineColor}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={shape.center.x}
              y1={shape.center.y - 0.03 * zoomScale}
              x2={shape.center.x}
              y2={shape.center.y + 0.03 * zoomScale}
              stroke={defaultDimensionTheme.lineColor}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </g>

          {/* Radius line from center horizontally to the right */}
          <line
            x1={shape.center.x}
            y1={shape.center.y}
            x2={shape.center.x + shape.radius}
            y2={shape.center.y}
            stroke={defaultDimensionTheme.lineColor}
            strokeWidth={0.5}
            strokeDasharray="0.02,0.02"
            vectorEffect="non-scaling-stroke"
            opacity="0.5"
          />

          {/* Point indicator at the end of radius line (tiny dot) */}
          <circle
            cx={shape.center.x + shape.radius}
            cy={shape.center.y}
            r={0.015 * zoomScale}
            fill={defaultDimensionTheme.lineColor}
          />

        </>
      )}
    </g>
  );
});

