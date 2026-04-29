import type { ArcDimensionDescriptor } from './DimensionDescriptor';
import { measureChipDimensions, defaultDimensionTheme } from './theme';

/**
 * Renders an architectural-style arc dimension with tick marks and inline text.
 */
export const ArcDimension: React.FC<ArcDimensionDescriptor> = ({
  center,
  radius,
  startAngle,
  endAngle,
  isCCW,
  text,
  zoomScale,
  offset = 0.08 * zoomScale,
}) => {
  const theme = defaultDimensionTheme;
  const offsetRadius = radius + offset;
  const extraExtension = 0.05 * zoomScale;
  
  const startPoint = {
    x: center.x + radius * Math.cos(startAngle),
    y: center.y + radius * Math.sin(startAngle),
  };
  const endPoint = {
    x: center.x + radius * Math.cos(endAngle),
    y: center.y + radius * Math.sin(endAngle),
  };
  const startOffsetPoint = {
    x: center.x + offsetRadius * Math.cos(startAngle),
    y: center.y + offsetRadius * Math.sin(startAngle),
  };
  const endOffsetPoint = {
    x: center.x + offsetRadius * Math.cos(endAngle),
    y: center.y + offsetRadius * Math.sin(endAngle),
  };
  const startExtensionEnd = {
    x: center.x + (offsetRadius + extraExtension) * Math.cos(startAngle),
    y: center.y + (offsetRadius + extraExtension) * Math.sin(startAngle),
  };
  const endExtensionEnd = {
    x: center.x + (offsetRadius + extraExtension) * Math.cos(endAngle),
    y: center.y + (offsetRadius + extraExtension) * Math.sin(endAngle),
  };

  const sweepRaw = endAngle - startAngle;
  const sweepAngle = isCCW
    ? sweepRaw < 0
      ? sweepRaw + Math.PI * 2
      : sweepRaw
    : sweepRaw > 0
      ? sweepRaw - Math.PI * 2
      : sweepRaw;
  const midAngle = startAngle + sweepAngle / 2;
  const chipPosition = {
    x: center.x + offsetRadius * Math.cos(midAngle),
    y: center.y + offsetRadius * Math.sin(midAngle),
  };
  const tangentAngle = midAngle + Math.PI / 2;
  let chipRotation = (tangentAngle * 180) / Math.PI;

  // Normalize to 0-360
  chipRotation = chipRotation % 360;
  if (chipRotation < 0) chipRotation += 360;

  // Flip text if it's upside down (between 90 and 270 degrees)
  if (chipRotation > 90 && chipRotation < 270) {
    chipRotation += 180;
  }
  const metrics = measureChipDimensions(text, zoomScale);
  const chipHalfWidth = metrics.halfWidth + 0.01 * zoomScale;

  // Calculate angular width for chip break positioning
  const chipAngularWidth = chipHalfWidth / offsetRadius;
  
  // Calculate positions for the arc segments (before and after chip)
  const beforeChipEndAngle = midAngle - chipAngularWidth;
  const afterChipStartAngle = midAngle + chipAngularWidth;
  
  const beforeChipEnd = {
    x: center.x + offsetRadius * Math.cos(beforeChipEndAngle),
    y: center.y + offsetRadius * Math.sin(beforeChipEndAngle),
  };
  const afterChipStart = {
    x: center.x + offsetRadius * Math.cos(afterChipStartAngle),
    y: center.y + offsetRadius * Math.sin(afterChipStartAngle),
  };

  // 45-degree tick marks at endpoints
  const tickLength = theme.tickLength * zoomScale;
  const tickAngleRad = (theme.tickAngle * Math.PI) / 180;

  return (
    <g>
      {/* Extension lines */}
      <line
        x1={startPoint.x}
        y1={startPoint.y}
        x2={startExtensionEnd.x}
        y2={startExtensionEnd.y}
        stroke={theme.lineColor}
        strokeWidth={0.5}
        strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={endPoint.x}
        y1={endPoint.y}
        x2={endExtensionEnd.x}
        y2={endExtensionEnd.y}
        stroke={theme.lineColor}
        strokeWidth={0.5}
        strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
        vectorEffect="non-scaling-stroke"
      />
      
      {/* Arc segment before chip */}
      <path
        d={`M ${startOffsetPoint.x},${startOffsetPoint.y} A ${offsetRadius},${offsetRadius} 0 0,${isCCW ? 1 : 0} ${beforeChipEnd.x},${beforeChipEnd.y}`}
        stroke={theme.lineColor}
        strokeWidth={1}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
      
      {/* Arc segment after chip */}
      <path
        d={`M ${afterChipStart.x},${afterChipStart.y} A ${offsetRadius},${offsetRadius} 0 0,${isCCW ? 1 : 0} ${endOffsetPoint.x},${endOffsetPoint.y}`}
        stroke={theme.lineColor}
        strokeWidth={1}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
      
      {/* Start tick mark (45-degree angled, perpendicular to arc) */}
      <line
        x1={startOffsetPoint.x - (tickLength / 2) * Math.cos(startAngle + tickAngleRad)}
        y1={startOffsetPoint.y - (tickLength / 2) * Math.sin(startAngle + tickAngleRad)}
        x2={startOffsetPoint.x + (tickLength / 2) * Math.cos(startAngle + tickAngleRad)}
        y2={startOffsetPoint.y + (tickLength / 2) * Math.sin(startAngle + tickAngleRad)}
        stroke={theme.lineColor}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      
      {/* End tick mark (45-degree angled, perpendicular to arc) */}
      <line
        x1={endOffsetPoint.x - (tickLength / 2) * Math.cos(endAngle + tickAngleRad)}
        y1={endOffsetPoint.y - (tickLength / 2) * Math.sin(endAngle + tickAngleRad)}
        x2={endOffsetPoint.x + (tickLength / 2) * Math.cos(endAngle + tickAngleRad)}
        y2={endOffsetPoint.y + (tickLength / 2) * Math.sin(endAngle + tickAngleRad)}
        stroke={theme.lineColor}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      
      {/* Chip with text */}
      <g transform={`translate(${chipPosition.x}, ${chipPosition.y}) rotate(${chipRotation})`}>
        {/* Text background - white rectangle */}
        <rect
          x={-chipHalfWidth}
          y={-metrics.halfHeight}
          width={chipHalfWidth * 2}
          height={metrics.halfHeight * 2}
          fill={theme.backgroundColor}
        />
        {/* Dimension text */}
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={theme.textColor}
          fontSize={metrics.fontSize}
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

