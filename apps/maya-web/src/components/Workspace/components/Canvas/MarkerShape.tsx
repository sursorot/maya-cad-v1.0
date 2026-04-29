import React from 'react';
import type { MarkerShape, ToolType } from '../../types';

interface MarkerShapeProps {
  shape: MarkerShape;
  isSelected: boolean;
  isHovered: boolean;
  activeTool: ToolType;
  zoomScale: number;
  showMarkers?: boolean;
  onMouseDown: (e: React.MouseEvent<SVGElement>, shapeId: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onLabelClick?: (shapeId: string) => void;
}

export const MarkerShapeComponent: React.FC<MarkerShapeProps> = ({
  shape,
  isSelected,
  isHovered,
  activeTool,
  zoomScale,
  showMarkers = true,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (shape.type !== 'marker' || !showMarkers) return null;

  const { position, label, stroke } = shape;
  
  // Compact marker visual parameters
  const dotSize = 0.018 * zoomScale; // Small dot
  const fontSize = 0.055; // Smaller font
  const labelOffset = 0.035 * zoomScale; // Close to the dot
  
  // Always show the marker's actual color (so live preview works when editing)
  // Selection is indicated by the dashed ring, not by changing the marker color
  const shapeColor = stroke || '#F57C00';
  const selectionRingColor = '#1976D2';
  // Only change color on hover (when not selected) to indicate interactivity
  const color = (isHovered && !isSelected) ? '#42A5F5' : shapeColor;

  return (
    <g key={shape.id}>
      {/* Invisible hit area for easier clicking */}
      <circle
        cx={position.x}
        cy={position.y}
        r={dotSize * 2.5}
        fill="transparent"
        stroke="transparent"
        style={{ cursor: activeTool === 'select' ? 'pointer' : 'inherit' }}
        onMouseDown={(e) => {
          if (activeTool === 'select') {
            e.stopPropagation();
            onMouseDown(e, shape.id);
          }
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

      {/* Simple filled dot marker */}
      <circle
        cx={position.x}
        cy={position.y}
        r={dotSize}
        fill={color}
        stroke="#ffffff"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        opacity={isSelected || isHovered ? 1 : 0.85}
      />

      {/* Selection ring - only when selected */}
      {isSelected && (
        <circle
          cx={position.x}
          cy={position.y}
          r={dotSize * 2}
          fill="none"
          stroke={selectionRingColor}
          strokeWidth={1}
          strokeDasharray="2 1"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
          opacity={0.6}
        />
      )}

      {/* Minimal label - positioned to the right */}
      {label && (
        <text
          x={position.x + labelOffset}
          y={position.y}
          textAnchor="start"
          dominantBaseline="middle"
          fill={color}
          fontSize={fontSize * zoomScale}
          fontWeight="500"
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
          opacity={isSelected || isHovered ? 1 : 0.75}
        >
          {label}
        </text>
      )}
    </g>
  );
};

// Display name for React DevTools
MarkerShapeComponent.displayName = 'MarkerShapeComponent';

