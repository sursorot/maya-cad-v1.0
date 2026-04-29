/**
 * Snap Indicator Layer
 * 
 * Renders snap point indicators and labels.
 * Memoized to only re-render when snap indicator changes.
 */

import { memo } from 'react';
import type { Point } from '../../../types';

interface SnapIndicatorLayerProps {
  /** Current snap indicator */
  snapIndicator: { point: Point; type: string } | null;
  /** Whether snapping is enabled */
  snapEnabled: boolean;
  /** Zoom scale */
  zoomScale: number;
}

/**
 * Get snap indicator color based on type
 */
function getSnapColor(type: string): string {
  switch (type) {
    case 'endpoint': return '#7B8CDE';
    case 'midpoint': return '#8FBC8F';
    case 'semicircle': return '#B26DFF';
    case 'nearest': return '#DDA15E';
    case 'intersection': return '#E07A7A';
    case 'grid': return '#6B8FCC';
    case 'quadrant': return '#D4A5A5';
    case 'center': return '#81B29A';
    case 'parallel': return '#FFB703';
    case 'perpendicular': return '#219EBC';
    case 'ortho-horizontal': return '#00BFA5';
    case 'ortho-vertical': return '#00BFA5';
    case 'ortho-grid': return '#00897B';
    case 'wall-extended': return '#E91E63';
    default: return '#95A5A6';
  }
}

/**
 * Get display label for snap type
 */
function getSnapLabel(type: string): string {
  switch (type) {
    case 'ortho-horizontal': return 'Horizontal';
    case 'ortho-vertical': return 'Vertical';
    case 'ortho-grid': return 'Ortho+Grid';
    case 'wall-extended': return 'Wall Extended';
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

/**
 * Memoized snap indicator layer
 */
export const SnapIndicatorLayer = memo(function SnapIndicatorLayer({
  snapIndicator,
  snapEnabled,
  zoomScale,
}: SnapIndicatorLayerProps) {
  if (!snapIndicator || !snapEnabled) {
    return null;
  }

  const color = getSnapColor(snapIndicator.type);
  const labelText = getSnapLabel(snapIndicator.type);
  
  // Chip dimensions
  const fontSize = 0.065;
  const charWidth = fontSize * 0.55;
  const chipPadding = 0.02;
  const chipWidth = labelText.length * charWidth + chipPadding * 2;
  const chipHeight = fontSize + chipPadding * 2;

  return (
    <g className="snap-indicator" data-export-exclude="true">
      {/* Snap point indicator */}
      <SnapPointIndicator
        point={snapIndicator.point}
        type={snapIndicator.type}
        color={color}
        zoomScale={zoomScale}
      />

      {/* Label chip */}
      <g transform={`translate(${snapIndicator.point.x}, ${snapIndicator.point.y - 0.15 * zoomScale}) scale(${zoomScale})`}>
        <rect
          x={-chipWidth / 2}
          y={-chipHeight / 2}
          width={chipWidth}
          height={chipHeight}
          fill={color}
          rx="0.02"
          opacity="0.9"
        />
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={fontSize}
          fontWeight="600"
          style={{ userSelect: 'none' }}
        >
          {labelText}
        </text>
      </g>
    </g>
  );
});

/**
 * Snap point indicator based on type
 */
const SnapPointIndicator = memo(function SnapPointIndicator({
  point,
  type,
  color,
  zoomScale,
}: {
  point: Point;
  type: string;
  color: string;
  zoomScale: number;
}) {
  switch (type) {
    case 'endpoint':
      return (
        <circle
          cx={point.x}
          cy={point.y}
          r={0.03 * zoomScale}
          fill="none"
          stroke={color}
          strokeWidth={0.01 * zoomScale}
          pointerEvents="none"
        />
      );

    case 'midpoint':
      return (
        <g transform={`translate(${point.x}, ${point.y}) scale(${zoomScale})`}>
          <path
            d="M 0,-0.035 L 0.035,0 L 0,0.035 L -0.035,0 Z"
            fill="none"
            stroke={color}
            strokeWidth={0.01}
            pointerEvents="none"
          />
        </g>
      );

    case 'nearest':
      return (
        <circle
          cx={point.x}
          cy={point.y}
          r={0.02 * zoomScale}
          fill={color}
          pointerEvents="none"
        />
      );

    case 'intersection':
      return (
        <g>
          <line
            x1={point.x - 0.035 * zoomScale}
            y1={point.y - 0.035 * zoomScale}
            x2={point.x + 0.035 * zoomScale}
            y2={point.y + 0.035 * zoomScale}
            stroke={color}
            strokeWidth={0.01 * zoomScale}
            pointerEvents="none"
          />
          <line
            x1={point.x + 0.035 * zoomScale}
            y1={point.y - 0.035 * zoomScale}
            x2={point.x - 0.035 * zoomScale}
            y2={point.y + 0.035 * zoomScale}
            stroke={color}
            strokeWidth={0.01 * zoomScale}
            pointerEvents="none"
          />
        </g>
      );

    case 'wall-extended':
      return (
        <g transform={`translate(${point.x}, ${point.y}) scale(${zoomScale})`}>
          <rect
            x={-0.025}
            y={-0.025}
            width={0.05}
            height={0.05}
            fill="none"
            stroke={color}
            strokeWidth={0.01}
            pointerEvents="none"
          />
          <circle
            cx={0}
            cy={0}
            r={0.015}
            fill={color}
            pointerEvents="none"
          />
        </g>
      );

    default:
      return (
        <circle
          cx={point.x}
          cy={point.y}
          r={0.02 * zoomScale}
          fill={color}
          pointerEvents="none"
        />
      );
  }
});

