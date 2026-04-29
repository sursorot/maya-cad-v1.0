/**
 * Trim Visualization Layer
 * 
 * Renders the trim tool overlay with cut points and highlighted sections.
 * Memoized to only re-render when trim state changes.
 */

import { memo } from 'react';
import type { Point, WallShape, LengthUnit } from '../../../types';
import { formatLength } from '../../../utils/measurements';

interface TrimState {
  firstPoint: Point | null;
  secondPoint: Point | null;
  highlightSegment: { start: Point; end: Point } | null;
  wallId: string | null;
  isConfirmed: boolean;
}

interface TrimVisualizationLayerProps {
  /** Current trim state */
  trimState: TrimState | null;
  /** All shapes (for finding wall) */
  shapes: { type: string; id: string; thickness?: number; alignment?: string }[];
  /** Zoom scale */
  zoomScale: number;
  /** Length unit for formatting */
  lengthUnit: LengthUnit;
}

/**
 * Memoized trim visualization layer
 */
export const TrimVisualizationLayer = memo(function TrimVisualizationLayer({
  trimState,
  shapes,
  zoomScale,
  lengthUnit,
}: TrimVisualizationLayerProps) {
  if (!trimState?.firstPoint) {
    return null;
  }

  const { firstPoint, secondPoint, highlightSegment, wallId, isConfirmed } = trimState;

  return (
    <g className="trim-visualization" pointerEvents="none" data-export-exclude="true">
      {/* First trim point marker */}
      <TrimPointMarker point={firstPoint} zoomScale={zoomScale} />

      {/* Second trim point marker */}
      {secondPoint && (
        <TrimPointMarker point={secondPoint} zoomScale={zoomScale} />
      )}

      {/* Highlighted section between the two points */}
      {highlightSegment && wallId && (
        <TrimHighlightSection
          highlightSegment={highlightSegment}
          wallId={wallId}
          shapes={shapes}
          zoomScale={zoomScale}
          lengthUnit={lengthUnit}
          isConfirmed={isConfirmed}
        />
      )}
    </g>
  );
});

/**
 * Trim point marker (cross + dot)
 */
const TrimPointMarker = memo(function TrimPointMarker({
  point,
  zoomScale,
}: {
  point: Point;
  zoomScale: number;
}) {
  return (
    <g>
      {/* Cross marker - thin red lines */}
      <line
        x1={point.x - 0.06 * zoomScale}
        y1={point.y}
        x2={point.x + 0.06 * zoomScale}
        y2={point.y}
        stroke="#E53935"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={point.x}
        y1={point.y - 0.06 * zoomScale}
        x2={point.x}
        y2={point.y + 0.06 * zoomScale}
        stroke="#E53935"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={point.x}
        cy={point.y}
        r={0.01 * zoomScale}
        fill="#E53935"
      />
    </g>
  );
});

/**
 * Trim highlight section with measurement
 */
const TrimHighlightSection = memo(function TrimHighlightSection({
  highlightSegment,
  wallId,
  shapes,
  zoomScale,
  lengthUnit,
  isConfirmed,
}: {
  highlightSegment: { start: Point; end: Point };
  wallId: string;
  shapes: { type: string; id: string; thickness?: number; alignment?: string }[];
  zoomScale: number;
  lengthUnit: LengthUnit;
  isConfirmed: boolean;
}) {
  const wall = shapes.find(s => s.type === 'wall' && s.id === wallId) as WallShape | undefined;
  if (!wall) return null;

  const { start, end } = highlightSegment;
  const thickness = wall.thickness || 0.1524;
  const half = thickness / 2;
  const alignment = wall.alignment || 'center';

  // Calculate perpendicular direction
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return null;

  const perpX = -dy / len;
  const perpY = dx / len;

  // Calculate alignment shift
  let alignmentShift = 0;
  if (alignment === 'inside') {
    alignmentShift = half;
  } else if (alignment === 'outside') {
    alignmentShift = -half;
  }

  const offsetLeft = alignmentShift + half;
  const offsetRight = alignmentShift - half;

  // Create rectangle points
  const p1 = { x: start.x + perpX * offsetLeft, y: start.y + perpY * offsetLeft };
  const p2 = { x: end.x + perpX * offsetLeft, y: end.y + perpY * offsetLeft };
  const p3 = { x: end.x + perpX * offsetRight, y: end.y + perpY * offsetRight };
  const p4 = { x: start.x + perpX * offsetRight, y: start.y + perpY * offsetRight };

  // Calculate measurement
  const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
  const formattedLength = formatLength(segmentLength, lengthUnit);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  // Calculate angle for positioning
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const textAngle = (angle > 90 || angle < -90) ? angle + 180 : angle;

  // Chip sizing
  const fontSize = 0.08 * zoomScale;
  const chipPadding = 0.025 * zoomScale;
  const charWidth = fontSize * 0.55;
  const chipWidth = formattedLength.length * charWidth + chipPadding * 2;
  const chipHeight = 0.12 * zoomScale;

  // Instruction text
  const instructionText = isConfirmed ? 'Enter or Delete to trim' : 'Click to confirm';
  const instructionWidth = isConfirmed ? 1.2 * zoomScale : 0.85 * zoomScale;

  return (
    <>
      {/* Highlighted section polygon */}
      <polygon
        points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
        fill="#E53935"
        opacity={0.2}
        stroke="#E53935"
        strokeWidth={1}
        strokeDasharray="4 2"
        vectorEffect="non-scaling-stroke"
      />

      {/* Length measurement along the segment */}
      <g transform={`translate(${midX}, ${midY})`}>
        <g transform={`rotate(${textAngle})`}>
          <rect
            x={-chipWidth / 2}
            y={-chipHeight / 2}
            width={chipWidth}
            height={chipHeight}
            fill="#E53935"
            rx={0.03 * zoomScale}
          />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={fontSize}
            fontWeight="600"
            fontFamily="'Courier New', Courier, monospace"
            style={{ userSelect: 'none' }}
          >
            {formattedLength}
          </text>
        </g>
      </g>

      {/* Instruction label above */}
      <g transform={`translate(${midX}, ${midY - 0.25 * zoomScale})`}>
        <rect
          x={-instructionWidth / 2}
          y={-chipHeight / 2}
          width={instructionWidth}
          height={chipHeight}
          fill={isConfirmed ? 'rgba(33, 150, 83, 0.9)' : 'rgba(0,0,0,0.8)'}
          rx={0.03 * zoomScale}
        />
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={fontSize}
          fontWeight="600"
          style={{ userSelect: 'none' }}
        >
          {instructionText}
        </text>
      </g>
    </>
  );
});

