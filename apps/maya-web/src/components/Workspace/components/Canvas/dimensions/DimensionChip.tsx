import type { DimensionTheme, ChipMeasurement } from './theme';
import { measureChipDimensions } from './theme';

interface DimensionChipProps {
  text: string;
  zoomScale: number;
  themeOverrides?: Partial<DimensionTheme>;
  /**
   * Provide pre-computed metrics when callers need the values for layout math.
   */
  metrics?: ChipMeasurement;
  /**
   * Optionally offset the chip without wrapping it in another <g>.
   */
  x?: number;
  y?: number;
  /**
   * When true, the chip is visually centered around (x, y).
   * Defaults to true to match CAD-style measurements.
   */
  center?: boolean;
}

export const DimensionChip: React.FC<DimensionChipProps> = ({
  text,
  zoomScale,
  themeOverrides,
  metrics,
  x = 0,
  y = 0,
  center = true,
}) => {
  const resolvedMetrics = metrics ?? measureChipDimensions(text, zoomScale, themeOverrides);
  const { width, height, halfWidth, halfHeight, fontSize, theme } = resolvedMetrics;
  const cornerRadius = theme.cornerRadius * zoomScale;

  const rectProps = center
    ? { x: x - halfWidth, y: y - halfHeight }
    : { x, y };

  const textX = center ? x : x + width / 2;
  const textY = center ? y : y + height / 2;

  return (
    <>
      <rect
        {...rectProps}
        width={width}
        height={height}
        fill={theme.backgroundColor}
        rx={cornerRadius}
      />
      <text
        x={textX}
        y={textY}
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
    </>
  );
};

