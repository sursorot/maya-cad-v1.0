import type { Point } from '../../../types';
import { measureChipDimensions, defaultDimensionTheme } from './theme';

interface SpanDimensionProps {
  start: Point;
  end: Point;
  text: string;
  zoomScale: number;
  offset?: number;
  lineColor?: string;
  extensionColor?: string;
}

/**
 * Renders a span-style dimension with 45-degree tick marks at endpoints.
 * Useful for wall openings or other edge-to-edge callouts.
 * Uses architectural ticks-on-line style.
 */
export const SpanDimension: React.FC<SpanDimensionProps> = ({
  start,
  end,
  text,
  zoomScale,
  offset = 0,
  lineColor,
  extensionColor,
}) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.0001) {
    return null;
  }

  const theme = defaultDimensionTheme;
  const resolvedLineColor = lineColor ?? theme.lineColor;
  const resolvedExtensionColor = extensionColor ?? theme.lineColor;
  
  const lineAngleRad = Math.atan2(dy, dx);
  let lineAngleDeg = (lineAngleRad * 180) / Math.PI;
  const flipText = lineAngleDeg > 90 || lineAngleDeg < -90;
  if (flipText) {
    lineAngleDeg += 180;
  }
  
  const cos = Math.cos(lineAngleRad);
  const sin = Math.sin(lineAngleRad);

  const offsetX = -sin * offset;
  const offsetY = cos * offset;

  const shiftedStart = {
    x: start.x + offsetX,
    y: start.y + offsetY,
  };
  const shiftedEnd = {
    x: end.x + offsetX,
    y: end.y + offsetY,
  };

  const chipMetrics = measureChipDimensions(text, zoomScale);
  const chipHalfWidth = chipMetrics.halfWidth + 0.01 * zoomScale;
  const midX = (shiftedStart.x + shiftedEnd.x) / 2;
  const midY = (shiftedStart.y + shiftedEnd.y) / 2;
  
  // 45-degree tick marks at endpoints
  const tickLength = theme.tickLength * zoomScale;
  const tickAngleRad = (theme.tickAngle * Math.PI) / 180;
  const tickDx = (tickLength / 2) * Math.cos(tickAngleRad);
  const tickDy = (tickLength / 2) * Math.sin(tickAngleRad);

  return (
    <g>
      {/* Extension lines */}
      <line
        x1={start.x}
        y1={start.y}
        x2={shiftedStart.x}
        y2={shiftedStart.y}
        stroke={resolvedExtensionColor}
        strokeWidth={0.5}
        strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={end.x}
        y1={end.y}
        x2={shiftedEnd.x}
        y2={shiftedEnd.y}
        stroke={resolvedExtensionColor}
        strokeWidth={0.5}
        strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
        vectorEffect="non-scaling-stroke"
      />

      {/* Dimension line with text break - rendered in rotated coordinate system */}
      <g transform={`translate(${midX}, ${midY}) rotate(${lineAngleDeg})`}>
        {/* Span line - start to text */}
        <line
          x1={-length / 2}
          y1={0}
          x2={-chipHalfWidth}
          y2={0}
          stroke={resolvedLineColor}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {/* Span line - text to end */}
        <line
          x1={chipHalfWidth}
          y1={0}
          x2={length / 2}
          y2={0}
          stroke={resolvedLineColor}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {/* Start tick mark (45-degree angled) */}
        <line
          x1={-length / 2 - tickDx}
          y1={-tickDy}
          x2={-length / 2 + tickDx}
          y2={tickDy}
          stroke={resolvedLineColor}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />

        {/* End tick mark (45-degree angled) */}
        <line
          x1={length / 2 - tickDx}
          y1={-tickDy}
          x2={length / 2 + tickDx}
          y2={tickDy}
          stroke={resolvedLineColor}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />

        {/* Text background - white rectangle */}
        <rect
          x={-chipHalfWidth}
          y={-chipMetrics.halfHeight}
          width={chipHalfWidth * 2}
          height={chipMetrics.halfHeight * 2}
          fill={theme.backgroundColor}
        />

        {/* Dimension text */}
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={theme.textColor}
          fontSize={chipMetrics.fontSize}
          fontWeight={theme.fontWeight}
          fontFamily={theme.fontFamily}
          style={{ userSelect: 'none' }}
        >
          {text}
        </text>
      </g>
    </g>
  );
};

