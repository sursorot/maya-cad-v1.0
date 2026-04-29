import type { Point } from '../../../types';
import { measureChipDimensions, defaultDimensionTheme } from './theme';

interface LinearDimensionProps {
  start: Point;
  end: Point;
  text: string;
  zoomScale: number;
  offset?: number;
  /**
   * Side of the source geometry to render on: -1 = default (above/left), 1 = below/right.
   */
  side?: -1 | 1;
  lineColor?: string;
  extensionColor?: string;
  extensionDash?: string;
}

/**
 * Renders an architectural-style dimension with tick marks and inline text.
 * Features:
 * - Single continuous dimension line
 * - Text centered with white background creating a "break" in the line
 * - 45-degree angled tick marks at both ends
 */
export const LinearDimension: React.FC<LinearDimensionProps> = ({
  start,
  end,
  text,
  zoomScale,
  offset = 0.08 * zoomScale,
  side = -1,
}) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.0001) {
    return null;
  }

  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  const lineAngleRad = Math.atan2(dy, dx);
  let lineAngleDeg = (lineAngleRad * 180) / Math.PI;
  const flipText = lineAngleDeg > 90 || lineAngleDeg < -90;
  if (flipText) {
    lineAngleDeg += 180;
  }

  const halfLen = length / 2;
  const orientation = side >= 0 ? 1 : -1;
  const dimensionOffset = orientation * offset;
  
  // Get theme values
  const theme = defaultDimensionTheme;
  const dimensionLineColor = theme.lineColor;
  const tickLength = theme.tickLength * zoomScale;
  const tickAngle = theme.tickAngle;
  
  // Calculate chip metrics for the text break
  const chipMetrics = measureChipDimensions(text, zoomScale);
  const chipHalfWidth = chipMetrics.halfWidth + 0.01 * zoomScale; // Small padding around text
  const chipHalfHeight = chipMetrics.halfHeight;
  const fontSize = chipMetrics.fontSize;

  // Tick mark calculations (45-degree rotated)
  const tickAngleRad = (tickAngle * Math.PI) / 180;
  const tickDx = (tickLength / 2) * Math.cos(tickAngleRad);
  const tickDy = (tickLength / 2) * Math.sin(tickAngleRad);

  return (
    <g transform={`translate(${midX}, ${midY}) rotate(${lineAngleDeg})`}>
      {/* Main dimension line - from start to just before text */}
      <line
        x1={-halfLen}
        y1={dimensionOffset}
        x2={-chipHalfWidth}
        y2={dimensionOffset}
        stroke={dimensionLineColor}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      
      {/* Main dimension line - from just after text to end */}
      <line
        x1={chipHalfWidth}
        y1={dimensionOffset}
        x2={halfLen}
        y2={dimensionOffset}
        stroke={dimensionLineColor}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />

      {/* Start tick mark (45-degree angled) */}
      <line
        x1={-halfLen - tickDx}
        y1={dimensionOffset - tickDy}
        x2={-halfLen + tickDx}
        y2={dimensionOffset + tickDy}
        stroke={dimensionLineColor}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />

      {/* End tick mark (45-degree angled) */}
      <line
        x1={halfLen - tickDx}
        y1={dimensionOffset - tickDy}
        x2={halfLen + tickDx}
        y2={dimensionOffset + tickDy}
        stroke={dimensionLineColor}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />

      {/* Text background - white rectangle to create visual break in line */}
      <rect
        x={-chipHalfWidth}
        y={dimensionOffset - chipHalfHeight}
        width={chipHalfWidth * 2}
        height={chipHalfHeight * 2}
        fill={theme.backgroundColor}
      />

      {/* Dimension text */}
      <text
        x={0}
        y={dimensionOffset}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={theme.textColor}
        fontSize={fontSize}
        fontWeight={theme.fontWeight}
        fontFamily={theme.fontFamily}
        style={{ userSelect: 'none' }}
      >
        {text}
      </text>
    </g>
  );
};

