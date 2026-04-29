import React from 'react';
import type { LengthUnit, RoomShape, ToolType, MeasurementSettings } from '../../types';
import { formatArea } from '../../utils/measurements';
import { useDimensionCollector } from './dimensions/DimensionContext';
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
  HATCH_PATTERN_ID,
} from './AppearanceRenderer';

interface RoomShapeProps {
  shape: RoomShape;
  lengthUnit: LengthUnit;
  isSelected: boolean;
  isHovered?: boolean;
  forceHatch?: boolean;
  activeTool: ToolType;
  showMeasurements?: boolean;
  measurementSettings?: MeasurementSettings;
  useDimensionLayer?: boolean;
  onMouseDown: (e: React.MouseEvent<SVGElement>, shapeId?: string) => void;
  onMouseEnter: (shapeId: string) => void;
  onMouseLeave: () => void;
  onLabelClick?: (shapeId: string) => void;
  zoomScale: number;
}

/**
 * RoomShapeComponent - Memoized for performance
 * Renders room polygons with area labels
 */
export const RoomShapeComponent: React.FC<RoomShapeProps> = React.memo(({
  shape,
  lengthUnit,
  isSelected,
  isHovered = false,
  forceHatch = false,
  activeTool,
  showMeasurements = true,
  measurementSettings,
  useDimensionLayer = false,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onLabelClick,
  zoomScale,
}) => {
  const dimensionCollector = useDimensionCollector();
  const shouldUseDescriptorLayer = Boolean(useDimensionLayer && dimensionCollector);

  if (!shape.points || shape.points.length < 3) {
    return null;
  }

  const polygonPoints = shape.points.map((point) => `${ point.x },${ point.y } `).join(' ');

  // Default fallback colors if no appearance
  const defaultFillColor = isSelected ? 'rgba(111, 98, 164, 0.3)' : 'rgba(111, 98, 164, 0.12)';
  const defaultStrokeColor = isSelected ? '#6F62A4' : 'rgba(111, 98, 164, 0.4)';
  const hatchOpacity = isSelected ? 0.24 : 0.14;
  const showHatch = forceHatch || isSelected || isHovered;

  const { centroid } = shape;

  const areaLabel = formatArea(shape.area, lengthUnit);

  // Emit area label descriptor if using descriptor layer
  // Smart Measurement Logic
  const isGlobalEnabled = measurementSettings ? measurementSettings.enabled : showMeasurements;
  const showArea = isGlobalEnabled
    ? (measurementSettings?.areaLabels ?? true)
    : (isSelected);

  if (shouldUseDescriptorLayer && showArea) {
    // If there's a custom label, show area below it; otherwise show area at centroid
    const areaY = shape.label ? centroid.y + 0.6 : centroid.y;

    dimensionCollector?.({
      type: 'chip',
      id: `room - ${ shape.id } -area`,
      position: { x: centroid.x, y: areaY },
      text: areaLabel,
      zoomScale,
    });
  }

  const handleLabelClick = (e: React.MouseEvent<SVGTextElement>) => {
    e.stopPropagation();
    onMouseDown(e as unknown as React.MouseEvent<SVGElement>, shape.id);
    if (onLabelClick) {
      onLabelClick(shape.id);
    }
  };

  const baseFont = 0.18;
  const normalizedScale = Math.min(2.4, Math.max(0.4, zoomScale || 1));
  const labelFontSize = baseFont * 1.3 * normalizedScale;

  const isSelectTool = activeTool === 'select';
  const cursorStyle = isSelectTool ? (isSelected ? 'grabbing' : 'move') : 'default';

  const handleMouseDownInternal = (e: React.MouseEvent<SVGElement>) => {
    if (!isSelectTool) return;
    e.stopPropagation();
    onMouseDown(e, shape.id);
  };

  const handleMouseEnterInternal = () => {
    onMouseEnter(shape.id);
  };

  return (
    <g
      data-shape-id={shape.id}
      onMouseLeave={onMouseLeave}
    >
      {/* Dynamic definitions for this shape */}
      {shape.appearance?.fill?.type === 'gradient' && shape.appearance.fill.gradient && (
        <DynamicGradient shapeId={shape.id} fill={shape.appearance.fill} />
      )}
      {shape.appearance?.fill?.type === 'pattern' && shape.appearance.fill.patternId && (
        <DynamicPattern shapeId={shape.id} fill={shape.appearance.fill} bounds={shape.bounds} />
      )}
      {shape.appearance?.shadow && (
        <DynamicShadowFilter shapeId={shape.id} shadow={shape.appearance.shadow} />
      )}

      <polygon
        points={polygonPoints}
        fill={shape.appearance ? getFillAttribute(shape.appearance?.fill, shape.id) : defaultFillColor}
        fillOpacity={shape.appearance ? getFillOpacity(shape.appearance) : undefined}
        stroke={shape.appearance ? getStrokeAttribute(shape.appearance, defaultStrokeColor) : defaultStrokeColor}
        strokeWidth={shape.appearance ? getStrokeWidth(shape.appearance, 0.4) : 0.4}
        strokeDasharray={shape.appearance ? getStrokeDashArray(shape.appearance) : undefined}
        strokeOpacity={shape.appearance ? getStrokeOpacity(shape.appearance) : undefined}
        opacity={shape.appearance ? getShapeOpacity(shape.appearance) : undefined}
        vectorEffect="non-scaling-stroke"
        style={{ cursor: cursorStyle, mixBlendMode: getBlendMode(shape.appearance) }}
        filter={getFilterAttribute(shape.appearance, shape.id)}
        onMouseEnter={handleMouseEnterInternal}
        onMouseDown={handleMouseDownInternal}
      />
      {/* Invisible fill hit-area so hover/select works over the room area */}
      <polygon
        points={polygonPoints}
        fill="transparent"
        stroke="none"
        pointerEvents="all"
        onMouseDown={(e) => {
          if (!isSelected && isSelectTool) {
            e.stopPropagation();
            onMouseDown(e as unknown as React.MouseEvent<SVGElement>, shape.id);
          }
        }}
        onMouseEnter={handleMouseEnterInternal}
      />
      {showHatch && (
        <polygon
          points={polygonPoints}
          fill={`url(#${HATCH_PATTERN_ID})`}
          fillOpacity={hatchOpacity}
          stroke="none"
          pointerEvents="none"
        />
      )}
      {/* Custom label - always show if set */}
      {shape.label && (
        <text
          x={centroid.x}
          y={centroid.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#3C375A"
          fontSize={labelFontSize}
          fontWeight={600}
          style={{ cursor: isSelectTool ? 'text' : 'default' }}
          onMouseDown={handleLabelClick}
          pointerEvents="visible"
          onMouseEnter={handleMouseEnterInternal}
        >
          {shape.label}
        </text>
      )}
    </g>
  );
});

// Display name for React DevTools
RoomShapeComponent.displayName = 'RoomShapeComponent';

