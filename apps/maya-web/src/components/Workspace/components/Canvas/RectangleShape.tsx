import React from 'react';
import type { RectangleShape, ToolType, LengthUnit, MeasurementSettings } from '../../types';
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

interface RectangleShapeProps {
  shape: RectangleShape;
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

export const RectangleShapeComponent: React.FC<RectangleShapeProps> = React.memo(({
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

  if (shape.type !== 'rectangle') return null;

  // Calculate rectangle dimensions
  const minX = Math.min(shape.start.x, shape.end.x);
  const minY = Math.min(shape.start.y, shape.end.y);
  const maxX = Math.max(shape.start.x, shape.end.x);
  const maxY = Math.max(shape.start.y, shape.end.y);
  const width = maxX - minX;
  const height = maxY - minY;
  const hatchOpacity = isSelected ? 0.24 : 0.14;
  const showHatch = forceHatch || isSelected || isHovered;

  // Format measurement text
  const widthText = formatLength(width, lengthUnit);
  const heightText = formatLength(height, lengthUnit);

  // Smart Measurement Logic
  const isGlobalEnabled = measurementSettings ? measurementSettings.enabled : showMeasurements;
  const showLinear = isGlobalEnabled
    ? (measurementSettings?.linearDimensions ?? true)
    : isSelected;

  if (shouldUseDescriptorLayer && showLinear && !isSelected) {
    if (width > 0.01) {
      dimensionCollector?.({
        type: 'linear',
        id: `rectangle-${shape.id}-width`,
        start: { x: minX, y: maxY },
        end: { x: maxX, y: maxY },
        text: widthText,
        zoomScale,
        offset: 0.08 * zoomScale,
        side: 1,
      });
    }
    if (height > 0.01) {
      dimensionCollector?.({
        type: 'linear',
        id: `rectangle-${shape.id}-height`,
        start: { x: maxX, y: minY },
        end: { x: maxX, y: maxY },
        text: heightText,
        zoomScale,
        offset: 0.08 * zoomScale,
        side: -1,
      });
    }
  }

  return (
    <g key={shape.id} data-shape-id={shape.id}>
      {/* Dynamic definitions for this shape */}
      {shape.appearance?.fill?.type === 'gradient' && shape.appearance.fill.gradient && (
        <DynamicGradient shapeId={shape.id} fill={shape.appearance.fill} />
      )}
      {shape.appearance?.fill?.type === 'pattern' && shape.appearance.fill.patternId && (
        <DynamicPattern shapeId={shape.id} fill={shape.appearance.fill} bounds={{ minX, minY, maxX, maxY }} />
      )}
      {shape.appearance?.shadow && (
        <DynamicShadowFilter shapeId={shape.id} shadow={shape.appearance.shadow} />
      )}

      {/* Invisible wider stroke for easier clicking/selecting */}
      <rect
        x={minX}
        y={minY}
        width={width}
        height={height}
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

      {/* Invisible fill hit-area to enable hover/select inside the rect */}
      <rect
        x={minX}
        y={minY}
        width={width}
        height={height}
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

      {/* The rectangle itself - with full appearance support */}
      <rect
        x={minX}
        y={minY}
        width={width}
        height={height}
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
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill={`url(#${HATCH_PATTERN_ID})`}
          fillOpacity={hatchOpacity}
          stroke="none"
          pointerEvents="none"
        />
      )}

      {/* Selection indicator - blue box when selected */}
      {isSelected && (
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
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
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          stroke="#4A90E2"
          strokeWidth={2}
          strokeOpacity={0.5}
          fill="none"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}

      {/* Measurement labels (only show during drawing, not when selected) */}
      {showLinear && !isSelected && (width > 0.01 || height > 0.01) && (
        <>
          {/* Start point cross - at first corner (where user clicked) */}
          <g>
            <line
              x1={shape.start.x - 0.03 * zoomScale}
              y1={shape.start.y}
              x2={shape.start.x + 0.03 * zoomScale}
              y2={shape.start.y}
              stroke={defaultDimensionTheme.lineColor}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={shape.start.x}
              y1={shape.start.y - 0.03 * zoomScale}
              x2={shape.start.x}
              y2={shape.start.y + 0.03 * zoomScale}
              stroke={defaultDimensionTheme.lineColor}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </g>

        </>
      )}
    </g>
  );
});

