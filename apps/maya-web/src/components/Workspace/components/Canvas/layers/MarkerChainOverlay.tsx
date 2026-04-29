/**
 * Marker Chain Overlay Layer
 * 
 * Renders the marker chain mode preview line showing distance/angle from last marker to cursor.
 * Memoized to only re-render when marker chain state changes.
 */

import { memo } from 'react';
import type { Point, LengthUnit } from '../../../types';
import { calculateLength, calculateAngle, formatLength, formatAngle } from '../../../utils/measurements';

interface MarkerChainOverlayProps {
  /** Start point of marker chain (last marker position) */
  markerChainStart: Point | null;
  /** End point of marker chain (cursor position) */
  markerChainEnd: Point | null;
  /** Whether marker chaining is active */
  isMarkerChaining: boolean;
  /** Current drawing mode */
  drawingMode: 'one-time' | 'chain';
  /** Active tool */
  activeTool: string;
  /** Zoom scale */
  zoomScale: number;
  /** Length unit for formatting */
  lengthUnit: LengthUnit;
}

/**
 * Memoized marker chain overlay component
 */
export const MarkerChainOverlay = memo(function MarkerChainOverlay({
  markerChainStart,
  markerChainEnd,
  isMarkerChaining,
  drawingMode,
  activeTool,
  zoomScale,
  lengthUnit,
}: MarkerChainOverlayProps) {
  if (activeTool !== 'marker' || drawingMode !== 'chain' || !isMarkerChaining || !markerChainStart || !markerChainEnd) {
    return null;
  }

  const length = calculateLength(markerChainStart, markerChainEnd);
  const angle = calculateAngle(markerChainStart, markerChainEnd);
  const lengthText = formatLength(length, lengthUnit);
  const angleText = formatAngle(angle);

  // Calculate midpoint for length label
  const midX = (markerChainStart.x + markerChainEnd.x) / 2;
  const midY = (markerChainStart.y + markerChainEnd.y) / 2;

  // Calculate label offset perpendicular to the line
  const dx = markerChainEnd.x - markerChainStart.x;
  const dy = markerChainEnd.y - markerChainStart.y;
  const lineLength = Math.hypot(dx, dy);
  const labelOffset = 0.08 * zoomScale;
  const halfLen = lineLength / 2;

  // Chip styling - architectural style
  const chipPadding = 0.02 * zoomScale;
  const fontSize = 0.065 * zoomScale;
  const charWidth = fontSize * 0.55;
  const getChipWidth = (text: string) => text.length * charWidth + chipPadding * 2;
  const chipHeight = fontSize + chipPadding * 2;

  // Arc visualization for angle
  const arcRadius = 0.25 * zoomScale;
  const lineAngleRad = Math.atan2(dy, dx);
  let lineAngleDeg = (lineAngleRad * 180) / Math.PI;
  const flipText = lineAngleDeg > 90 || lineAngleDeg < -90;
  if (flipText) {
    lineAngleDeg += 180;
  }
  const horizontalX = markerChainStart.x + arcRadius;
  const horizontalY = markerChainStart.y;
  const lineEndX = markerChainStart.x + arcRadius * Math.cos(lineAngleRad);
  const lineEndY = markerChainStart.y + arcRadius * Math.sin(lineAngleRad);
  const sweepFlag = lineAngleRad > 0 ? 1 : 0;

  const markerChainColor = '#D32F2F'; // Architectural red for consistency

  // 45-degree tick marks
  const tickLength = 0.06 * zoomScale;
  const tickAngleRad = (45 * Math.PI) / 180;
  const tickDx = (tickLength / 2) * Math.cos(tickAngleRad);
  const tickDy = (tickLength / 2) * Math.sin(tickAngleRad);
  const chipHalfWidth = getChipWidth(lengthText) / 2;

  return (
    <g pointerEvents="none">
      {/* Angle arc fill */}
      {length > 0.05 && (
        <path
          d={`
            M ${markerChainStart.x},${markerChainStart.y}
            L ${horizontalX},${horizontalY}
            A ${arcRadius},${arcRadius} 0 0,${sweepFlag} ${lineEndX},${lineEndY}
            Z
          `}
          fill={markerChainColor}
          opacity="0.15"
        />
      )}

      {/* Architectural dimension line with ticks */}
      {length > 0.05 && (
        <g transform={`translate(${midX}, ${midY}) rotate(${lineAngleDeg})`}>
          {/* Dimension line - start to text */}
          <line
            x1={-halfLen}
            y1={labelOffset}
            x2={-chipHalfWidth}
            y2={labelOffset}
            stroke={markerChainColor}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {/* Dimension line - text to end */}
          <line
            x1={chipHalfWidth}
            y1={labelOffset}
            x2={halfLen}
            y2={labelOffset}
            stroke={markerChainColor}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {/* Start tick mark (45-degree) */}
          <line
            x1={-halfLen - tickDx}
            y1={labelOffset - tickDy}
            x2={-halfLen + tickDx}
            y2={labelOffset + tickDy}
            stroke={markerChainColor}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          {/* End tick mark (45-degree) */}
          <line
            x1={halfLen - tickDx}
            y1={labelOffset - tickDy}
            x2={halfLen + tickDx}
            y2={labelOffset + tickDy}
            stroke={markerChainColor}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          {/* Extension lines */}
          <line
            x1={-halfLen}
            y1={0}
            x2={-halfLen}
            y2={labelOffset + 0.03 * zoomScale}
            stroke={markerChainColor}
            strokeWidth={0.5}
            strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={halfLen}
            y1={0}
            x2={halfLen}
            y2={labelOffset + 0.03 * zoomScale}
            stroke={markerChainColor}
            strokeWidth={0.5}
            strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
            vectorEffect="non-scaling-stroke"
          />
          {/* Text background */}
          <rect
            x={-chipHalfWidth}
            y={labelOffset - chipHeight / 2}
            width={chipHalfWidth * 2}
            height={chipHeight}
            fill="#FFFFFF"
          />
          {/* Length text */}
          <text
            x={0}
            y={labelOffset}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={markerChainColor}
            fontSize={fontSize}
            fontWeight={600}
            fontFamily="'Courier New', Courier, monospace"
            style={{ userSelect: 'none' }}
          >
            {lengthText}
          </text>
        </g>
      )}

      {/* Angle chip offset to left of start point */}
      {length > 0.05 && (() => {
        const angleLabelOffset = 0.12 * zoomScale;
        return (
          <g transform={`translate(${markerChainStart.x - angleLabelOffset}, ${markerChainStart.y})`}>
            <rect
              x={-getChipWidth(angleText) / 2}
              y={-chipHeight / 2}
              width={getChipWidth(angleText)}
              height={chipHeight}
              fill="#FFFFFF"
            />
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="middle"
              fill={markerChainColor}
              fontSize={fontSize}
              fontWeight={600}
              fontFamily="'Courier New', Courier, monospace"
              style={{ userSelect: 'none' }}
            >
              {angleText}
            </text>
          </g>
        );
      })()}
    </g>
  );
}, (prevProps, nextProps) => {
  // Only re-render when marker chain state changes
  if (prevProps.activeTool !== nextProps.activeTool) return false;
  if (prevProps.drawingMode !== nextProps.drawingMode) return false;
  if (prevProps.isMarkerChaining !== nextProps.isMarkerChaining) return false;
  if (prevProps.markerChainStart !== nextProps.markerChainStart) return false;
  if (prevProps.markerChainEnd !== nextProps.markerChainEnd) return false;
  if (prevProps.zoomScale !== nextProps.zoomScale) return false;
  if (prevProps.lengthUnit !== nextProps.lengthUnit) return false;
  return true;
});

