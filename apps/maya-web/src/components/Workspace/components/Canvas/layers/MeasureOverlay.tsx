/**
 * Measure Overlay Layer
 * 
 * Renders the measure tool temporary overlay with distance and angle.
 * Memoized to only re-render when measure state changes.
 */

import { memo } from 'react';
import type { Point, LengthUnit } from '../../../types';
import { calculateLength, calculateAngle, formatLength, formatAngle } from '../../../utils/measurements';

interface MeasureOverlayProps {
  /** Start point of measurement */
  measureStart: Point | null;
  /** End point of measurement */
  measureEnd: Point | null;
  /** Whether measuring is active */
  isMeasuring: boolean;
  /** Zoom scale */
  zoomScale: number;
  /** Length unit for formatting */
  lengthUnit: LengthUnit;
}

/**
 * Memoized measure overlay component
 */
export const MeasureOverlay = memo(function MeasureOverlay({
  measureStart,
  measureEnd,
  isMeasuring,
  zoomScale,
  lengthUnit,
}: MeasureOverlayProps) {
  if (!isMeasuring || !measureStart || !measureEnd) {
    return null;
  }

  const length = calculateLength(measureStart, measureEnd);
  const angle = calculateAngle(measureStart, measureEnd);
  const lengthText = formatLength(length, lengthUnit);
  const angleText = formatAngle(angle);

  // Calculate midpoint for length label
  const midX = (measureStart.x + measureEnd.x) / 2;
  const midY = (measureStart.y + measureEnd.y) / 2;

  // Calculate line direction
  const dx = measureEnd.x - measureStart.x;
  const dy = measureEnd.y - measureStart.y;
  const lineLength = Math.hypot(dx, dy);
  const labelOffset = 0.08 * zoomScale;

  // Chip styling - architectural style
  const chipPadding = 0.02 * zoomScale;
  const fontSize = 0.065 * zoomScale;
  const charWidth = fontSize * 0.55;
  const getChipWidth = (text: string) => text.length * charWidth + chipPadding * 2;
  const chipHeight = fontSize + chipPadding * 2;
  const halfLen = lineLength / 2;

  // Arc visualization for angle
  const arcRadius = 0.25 * zoomScale;
  const lineAngleRad = Math.atan2(dy, dx);
  let lineAngleDeg = (lineAngleRad * 180) / Math.PI;
  const flipText = lineAngleDeg > 90 || lineAngleDeg < -90;
  if (flipText) {
    lineAngleDeg += 180;
  }
  const horizontalX = measureStart.x + arcRadius;
  const horizontalY = measureStart.y;
  const lineEndX = measureStart.x + arcRadius * Math.cos(lineAngleRad);
  const lineEndY = measureStart.y + arcRadius * Math.sin(lineAngleRad);
  const sweepFlag = lineAngleRad > 0 ? 1 : 0;

  const measureColor = '#D32F2F'; // Architectural red for measure tool

  // 45-degree tick marks
  const tickLength = 0.06 * zoomScale;
  const tickAngleRad = (45 * Math.PI) / 180;
  const tickDx = (tickLength / 2) * Math.cos(tickAngleRad);
  const tickDy = (tickLength / 2) * Math.sin(tickAngleRad);
  const chipHalfWidth = getChipWidth(lengthText) / 2;

  return (
    <g pointerEvents="none">
      {/* Architectural dimension line with ticks */}
      <g transform={`translate(${midX}, ${midY}) rotate(${lineAngleDeg})`}>
        {/* Dimension line - start to text */}
        <line
          x1={-halfLen}
          y1={labelOffset}
          x2={-chipHalfWidth}
          y2={labelOffset}
          stroke={measureColor}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {/* Dimension line - text to end */}
        <line
          x1={chipHalfWidth}
          y1={labelOffset}
          x2={halfLen}
          y2={labelOffset}
          stroke={measureColor}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {/* Start tick mark (45-degree) */}
        <line
          x1={-halfLen - tickDx}
          y1={labelOffset - tickDy}
          x2={-halfLen + tickDx}
          y2={labelOffset + tickDy}
          stroke={measureColor}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        {/* End tick mark (45-degree) */}
        <line
          x1={halfLen - tickDx}
          y1={labelOffset - tickDy}
          x2={halfLen + tickDx}
          y2={labelOffset + tickDy}
          stroke={measureColor}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        {/* Extension lines from endpoints to dimension line */}
        <line
          x1={-halfLen}
          y1={0}
          x2={-halfLen}
          y2={labelOffset + 0.03 * zoomScale}
          stroke={measureColor}
          strokeWidth={0.5}
          strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={halfLen}
          y1={0}
          x2={halfLen}
          y2={labelOffset + 0.03 * zoomScale}
          stroke={measureColor}
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
          fill={measureColor}
          fontSize={fontSize}
          fontWeight={600}
          fontFamily="'Courier New', Courier, monospace"
          style={{ userSelect: 'none' }}
        >
          {lengthText}
        </text>
      </g>

      {/* Start point indicator - small tick */}
      <line
        x1={measureStart.x - 0.04 * zoomScale}
        y1={measureStart.y - 0.04 * zoomScale}
        x2={measureStart.x + 0.04 * zoomScale}
        y2={measureStart.y + 0.04 * zoomScale}
        stroke={measureColor}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />

      {/* End point indicator - small tick */}
      <line
        x1={measureEnd.x - 0.04 * zoomScale}
        y1={measureEnd.y - 0.04 * zoomScale}
        x2={measureEnd.x + 0.04 * zoomScale}
        y2={measureEnd.y + 0.04 * zoomScale}
        stroke={measureColor}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />

      {/* Angle arc visualization */}
      {length > 0.01 && Math.abs(angle) > 0.1 && (
        <path
          d={`
            M ${measureStart.x},${measureStart.y}
            L ${horizontalX},${horizontalY}
            A ${arcRadius},${arcRadius} 0 0,${sweepFlag} ${lineEndX},${lineEndY}
            Z
          `}
          fill={measureColor}
          opacity="0.15"
        />
      )}

      {/* Angle label chip offset to left of start point */}
      {length > 0.01 && (() => {
        const angleLabelOffset = 0.12 * zoomScale;
        return (
          <g transform={`translate(${measureStart.x - angleLabelOffset}, ${measureStart.y})`}>
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
              fill={measureColor}
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
  // Only re-render when measure state changes
  if (prevProps.isMeasuring !== nextProps.isMeasuring) return false;
  if (prevProps.measureStart !== nextProps.measureStart) return false;
  if (prevProps.measureEnd !== nextProps.measureEnd) return false;
  if (prevProps.zoomScale !== nextProps.zoomScale) return false;
  if (prevProps.lengthUnit !== nextProps.lengthUnit) return false;
  return true;
});

