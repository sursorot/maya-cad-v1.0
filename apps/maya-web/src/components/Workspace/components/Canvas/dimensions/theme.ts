export interface DimensionTheme {
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  chipPadding: number;
  charWidthFactor: number;
  textColor: string;
  backgroundColor: string;
  cornerRadius: number;
  // Architectural ticks on line style
  lineColor: string;
  tickLength: number;
  tickAngle: number; // degrees
}

export const defaultDimensionTheme: DimensionTheme = {
  fontSize: 0.075,
  fontWeight: 600,
  fontFamily: "'Courier New', Courier, monospace",
  chipPadding: 0.022,
  charWidthFactor: 0.55,
  // Architectural style: red text on white background
  textColor: '#D32F2F',
  backgroundColor: '#FFFFFF',
  cornerRadius: 0,
  // Architectural ticks
  lineColor: '#D32F2F',
  tickLength: 0.06,
  tickAngle: 45,
};

export interface ChipMeasurement {
  width: number;
  height: number;
  halfWidth: number;
  halfHeight: number;
  fontSize: number;
  baseWidth: number;
  baseHeight: number;
  baseHalfWidth: number;
  baseHalfHeight: number;
  theme: DimensionTheme;
}

const mergeTheme = (overrides?: Partial<DimensionTheme>): DimensionTheme => ({
  ...defaultDimensionTheme,
  ...(overrides ?? {}),
});

/**
 * Calculates the rendered chip dimensions in world coordinates, scaled for the current zoom level.
 */
export const measureChipDimensions = (
  text: string,
  zoomScale: number,
  overrides?: Partial<DimensionTheme>,
): ChipMeasurement => {
  const theme = mergeTheme(overrides);
  const charWidth = theme.fontSize * theme.charWidthFactor;
  const baseWidth = text.length * charWidth + theme.chipPadding * 2;
  const baseHeight = theme.fontSize + theme.chipPadding * 2;
  const width = baseWidth * zoomScale;
  const height = baseHeight * zoomScale;

  return {
    width,
    height,
    halfWidth: width / 2,
    halfHeight: height / 2,
    fontSize: theme.fontSize * zoomScale,
    baseWidth,
    baseHeight,
    baseHalfWidth: baseWidth / 2,
    baseHalfHeight: baseHeight / 2,
    theme,
  };
};

