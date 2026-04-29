/**
 * Rectangle Preview Layer
 * 
 * Renders the rectangle wall preview during wall rectangle mode.
 * Memoized to only re-render when preview state changes.
 */

import { memo } from 'react';
import type { Point, LengthUnit, ToolbarStyle, WallDrawingMode } from '../../../types';
import type { WallCreationOptions } from '@maya/workspace-domain/workspace';

interface RectanglePreviewLayerProps {
  /** Preview start point */
  start: Point | null;
  /** Preview end point */
  end: Point | null;
  /** Wall drawing mode */
  wallMode: WallDrawingMode;
  /** Wall options */
  wallOptions?: WallCreationOptions & { offsetDistance?: number };
  /** Length unit */
  lengthUnit: LengthUnit;
  /** Zoom scale */
  zoomScale: number;
  /** Toolbar style */
  toolbarStyle: ToolbarStyle;
}

/**
 * Format wall length for display
 */
function formatWallLength(meters: number, lengthUnit: LengthUnit): string {
  switch (lengthUnit) {
    case 'ft-in': {
      const totalInches = meters * 39.3701;
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      if (totalInches < 1) return `${totalInches.toFixed(2)}"`;
      if (totalInches < 12) return `${totalInches.toFixed(1)}"`;
      if (inches < 0.5) return `${feet}'`;
      if (inches < 1) return `${feet}' ${inches.toFixed(1)}"`;
      return `${feet}' ${Math.round(inches)}"`;
    }
    case 'ft': {
      const feet = meters * 3.28084;
      if (feet < 1) return `${(feet * 12).toFixed(1)}"`;
      if (feet < 10) return `${feet.toFixed(2)}'`;
      return `${feet.toFixed(1)}'`;
    }
    case 'm': {
      if (meters < 0.1) return `${(meters * 100).toFixed(1)} cm`;
      return `${meters.toFixed(2)} m`;
    }
    case 'cm': {
      return `${(meters * 100).toFixed(1)} cm`;
    }
    case 'mm': {
      return `${Math.round(meters * 1000)} mm`;
    }
    case 'in': {
      const inches = meters * 39.3701;
      return `${inches.toFixed(1)}"`;
    }
    default:
      return `${meters.toFixed(2)} m`;
  }
}

/**
 * Memoized rectangle preview layer
 */
export const RectanglePreviewLayer = memo(function RectanglePreviewLayer({
  start,
  end,
  wallMode,
  wallOptions,
  lengthUnit,
  zoomScale,
  toolbarStyle,
}: RectanglePreviewLayerProps) {
  if (wallMode !== 'rectangle' || !start || !end) {
    return null;
  }

  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  const width = maxX - minX;
  const height = maxY - minY;

  if (width < 0.0005 || height < 0.0005) {
    return null;
  }

  const isClean = toolbarStyle === 'clean';

  // Get wall thickness from options or use default (0.1524m = 6 inches)
  const thickness = wallOptions?.thickness ?? 0.1524;
  const half = thickness / 2;

  // Create a connected wall ring using outer and inner rectangles
  const outerPoints: Point[] = [
    { x: minX - half, y: minY - half },
    { x: maxX + half, y: minY - half },
    { x: maxX + half, y: maxY + half },
    { x: minX - half, y: maxY + half },
  ];

  const innerPoints: Point[] = [
    { x: minX + half, y: minY + half },
    { x: maxX - half, y: minY + half },
    { x: maxX - half, y: maxY - half },
    { x: minX + half, y: maxY - half },
  ];

  // Wall segment data for measurements
  const wallSegments = [
    { midpoint: { x: (minX + maxX) / 2, y: minY }, length: width, angle: 0, offsetDir: { x: 0, y: -1 } },
    { midpoint: { x: maxX, y: (minY + maxY) / 2 }, length: height, angle: 90, offsetDir: { x: 1, y: 0 } },
    { midpoint: { x: (minX + maxX) / 2, y: maxY }, length: width, angle: 180, offsetDir: { x: 0, y: 1 } },
    { midpoint: { x: minX, y: (minY + maxY) / 2 }, length: height, angle: -90, offsetDir: { x: -1, y: 0 } },
  ];

  const fontSize = 0.065 * zoomScale;
  const chipPadding = 0.02 * zoomScale;
  const measurementOffset = (half + 0.12) * zoomScale;

  // Architectural dimension style
  const dimColor = '#D32F2F';
  const tickLength = 0.06 * zoomScale;
  const tickAngle = 45;
  const tickAngleRad = (tickAngle * Math.PI) / 180;
  const tickDx = (tickLength / 2) * Math.cos(tickAngleRad);
  const tickDy = (tickLength / 2) * Math.sin(tickAngleRad);

  return (
    <g pointerEvents="none">
      {/* Connected wall ring using SVG path with fill-rule evenodd */}
      <path
        d={`M ${outerPoints[0].x} ${outerPoints[0].y} 
            L ${outerPoints[1].x} ${outerPoints[1].y} 
            L ${outerPoints[2].x} ${outerPoints[2].y} 
            L ${outerPoints[3].x} ${outerPoints[3].y} Z 
            M ${innerPoints[0].x} ${innerPoints[0].y} 
            L ${innerPoints[3].x} ${innerPoints[3].y} 
            L ${innerPoints[2].x} ${innerPoints[2].y} 
            L ${innerPoints[1].x} ${innerPoints[1].y} Z`}
        fill="transparent"
        stroke={isClean ? "#3A3A3A" : "#6F62A4"}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        fillRule="evenodd"
      />

      {/* Measurement labels for each wall */}
      {wallSegments.map((wall, index) => {
        const textX = wall.midpoint.x + wall.offsetDir.x * measurementOffset;
        const textY = wall.midpoint.y + wall.offsetDir.y * measurementOffset;

        const isVertical = Math.abs(wall.angle) === 90;
        const lineHalfLength = wall.length / 2;

        const dirX = isVertical ? 0 : 1;
        const dirY = isVertical ? 1 : 0;

        const lineStartX = textX - dirX * lineHalfLength;
        const lineStartY = textY - dirY * lineHalfLength;
        const lineEndX = textX + dirX * lineHalfLength;
        const lineEndY = textY + dirY * lineHalfLength;

        const lengthText = formatWallLength(wall.length, lengthUnit);
        const chipWidth = lengthText.length * fontSize * 0.55 + chipPadding * 2;
        const chipHeight = fontSize + chipPadding * 2;
        const chipHalfWidth = chipWidth / 2;

        return (
          <g key={index}>
            {/* Dimension line - before text */}
            <line
              x1={lineStartX}
              y1={lineStartY}
              x2={textX - dirX * chipHalfWidth}
              y2={textY - dirY * chipHalfWidth}
              stroke={dimColor}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {/* Dimension line - after text */}
            <line
              x1={textX + dirX * chipHalfWidth}
              y1={textY + dirY * chipHalfWidth}
              x2={lineEndX}
              y2={lineEndY}
              stroke={dimColor}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {/* Start tick mark (45-degree) */}
            <line
              x1={lineStartX - tickDx}
              y1={lineStartY - tickDy}
              x2={lineStartX + tickDx}
              y2={lineStartY + tickDy}
              stroke={dimColor}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            {/* End tick mark (45-degree) */}
            <line
              x1={lineEndX - tickDx}
              y1={lineEndY - tickDy}
              x2={lineEndX + tickDx}
              y2={lineEndY + tickDy}
              stroke={dimColor}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            {/* Text background */}
            <rect
              x={textX - chipHalfWidth}
              y={textY - chipHeight / 2}
              width={chipWidth}
              height={chipHeight}
              fill="#FFFFFF"
            />
            {/* Dimension text */}
            <text
              x={textX}
              y={textY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={fontSize}
              fill={dimColor}
              fontWeight={600}
              fontFamily="'Courier New', Courier, monospace"
              style={{ userSelect: 'none' }}
            >
              {lengthText}
            </text>
          </g>
        );
      })}
    </g>
  );
}, (prevProps, nextProps) => {
  if (prevProps.wallMode !== nextProps.wallMode) return false;
  if (prevProps.start !== nextProps.start) return false;
  if (prevProps.end !== nextProps.end) return false;
  if (prevProps.zoomScale !== nextProps.zoomScale) return false;
  if (prevProps.lengthUnit !== nextProps.lengthUnit) return false;
  if (prevProps.toolbarStyle !== nextProps.toolbarStyle) return false;
  return true;
});

