import type { OpeningShape } from '../../types';
import rawCasementWindowSvg from '../../../../assets/2d-assets/casement_window_01.svg?raw';
import rawSingleWindowSvg from '../../../../assets/2d-assets/single-window.svg?raw';
import rawSlidingWindowSvg from '../../../../assets/2d-assets/sliding-window.svg?raw';
import rawBayWindowSvg from '../../../../assets/2d-assets/bay-window.svg?raw';
import rawSlidingDoorSvg from '../../../../assets/2d-assets/sliding-door.svg?raw';
import rawFrenchDoorSvg from '../../../../assets/2d-assets/french-door.svg?raw';

const DEFAULT_VIEWBOX = {
  minX: -630.0024,
  minY: -52.4998,
  width: 1260.0041,
  height: 365.551,
};

const extractSvgMetadata = (svgMarkup: string) => {
  const viewBoxMatch = svgMarkup.match(/viewBox="([^"]+)"/i);
  const [minX, minY, width, height] = viewBoxMatch
    ? viewBoxMatch[1].split(/\s+/).map(Number)
    : [DEFAULT_VIEWBOX.minX, DEFAULT_VIEWBOX.minY, DEFAULT_VIEWBOX.width, DEFAULT_VIEWBOX.height];

  const contentMatch = svgMarkup.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  const innerContent = contentMatch ? contentMatch[1].trim() : '';

  return {
    viewBox: {
      minX: Number.isFinite(minX) ? minX : DEFAULT_VIEWBOX.minX,
      minY: Number.isFinite(minY) ? minY : DEFAULT_VIEWBOX.minY,
      width: Number.isFinite(width) ? width : DEFAULT_VIEWBOX.width,
      height: Number.isFinite(height) ? height : DEFAULT_VIEWBOX.height,
    },
    content: innerContent,
  };
};

const { viewBox: parsedViewBox, content: parsedContent } = extractSvgMetadata(rawCasementWindowSvg);

const VIEWBOX_MIN_X = parsedViewBox.minX;
const VIEWBOX_MIN_Y = parsedViewBox.minY;
const VIEWBOX_WIDTH = parsedViewBox.width;
const VIEWBOX_HEIGHT = parsedViewBox.height;
const MAIN_SECTION_CENTER_Y = 0;
const MAIN_WINDOW_HALF_HEIGHT = 35.0012;
const VIEWBOX_CENTER_Y = VIEWBOX_MIN_Y + VIEWBOX_HEIGHT / 2;
const VIEWBOX_CENTER_TO_MAIN_CENTER = VIEWBOX_CENTER_Y - MAIN_SECTION_CENTER_Y;

export const WINDOW_VIEWBOX = {
  minX: VIEWBOX_MIN_X,
  minY: VIEWBOX_MIN_Y,
  width: VIEWBOX_WIDTH,
  height: VIEWBOX_HEIGHT,
};

export const WINDOW_SVG_CONTENT = parsedContent;

export const getWindowVisualMetrics = (shape: OpeningShape) => {
  const windowVisualWidth = Math.max(shape.width ?? 0.1, 0.1);
  const scale = windowVisualWidth / VIEWBOX_WIDTH;
  const windowVisualHeight = scale * VIEWBOX_HEIGHT;
  const anchorOffset = VIEWBOX_CENTER_TO_MAIN_CENTER * scale;

  const strokeCompensation = 6.25; // covers the thick black frame area in the SVG
  const mainPositiveExtent = (MAIN_WINDOW_HALF_HEIGHT + strokeCompensation) * scale;
  const mainNegativeExtent = (MAIN_WINDOW_HALF_HEIGHT + strokeCompensation) * scale;

  return {
    windowVisualWidth,
    windowVisualHeight,
    anchorOffset,
    mainPositiveExtent,
    mainNegativeExtent,
    scale,
  };
};

// Single Window SVG (simpler rectangular window)
const { viewBox: singleWindowViewBox, content: singleWindowContent } = extractSvgMetadata(rawSingleWindowSvg);

const SINGLE_WINDOW_VIEWBOX_MIN_X = singleWindowViewBox.minX;
const SINGLE_WINDOW_VIEWBOX_MIN_Y = singleWindowViewBox.minY;
const SINGLE_WINDOW_VIEWBOX_WIDTH = singleWindowViewBox.width;
const SINGLE_WINDOW_VIEWBOX_HEIGHT = singleWindowViewBox.height;
const SINGLE_WINDOW_CENTER_Y = 0; // The window is centered at y=0
const SINGLE_WINDOW_HALF_HEIGHT = 38.1; // Half the window frame height
const SINGLE_WINDOW_VIEWBOX_CENTER_Y = SINGLE_WINDOW_VIEWBOX_MIN_Y + SINGLE_WINDOW_VIEWBOX_HEIGHT / 2;
const SINGLE_WINDOW_CENTER_TO_MAIN_CENTER = SINGLE_WINDOW_VIEWBOX_CENTER_Y - SINGLE_WINDOW_CENTER_Y;

export const SINGLE_WINDOW_VIEWBOX = {
  minX: SINGLE_WINDOW_VIEWBOX_MIN_X,
  minY: SINGLE_WINDOW_VIEWBOX_MIN_Y,
  width: SINGLE_WINDOW_VIEWBOX_WIDTH,
  height: SINGLE_WINDOW_VIEWBOX_HEIGHT,
};

export const SINGLE_WINDOW_SVG_CONTENT = singleWindowContent;

export const getSingleWindowVisualMetrics = (shape: OpeningShape) => {
  const windowVisualWidth = Math.max(shape.width ?? 0.1, 0.1);
  const scale = windowVisualWidth / SINGLE_WINDOW_VIEWBOX_WIDTH;
  const windowVisualHeight = scale * SINGLE_WINDOW_VIEWBOX_HEIGHT;
  const anchorOffset = SINGLE_WINDOW_CENTER_TO_MAIN_CENTER * scale;

  const strokeCompensation = 2.5; // covers the stroke width in the SVG
  const mainPositiveExtent = (SINGLE_WINDOW_HALF_HEIGHT + strokeCompensation) * scale;
  const mainNegativeExtent = (SINGLE_WINDOW_HALF_HEIGHT + strokeCompensation) * scale;

  return {
    windowVisualWidth,
    windowVisualHeight,
    anchorOffset,
    mainPositiveExtent,
    mainNegativeExtent,
    scale,
  };
};

// Sliding Window SVG
const { viewBox: slidingWindowViewBox, content: slidingWindowContent } = extractSvgMetadata(rawSlidingWindowSvg);

const SLIDING_WINDOW_VIEWBOX_MIN_X = slidingWindowViewBox.minX;
const SLIDING_WINDOW_VIEWBOX_MIN_Y = slidingWindowViewBox.minY;
const SLIDING_WINDOW_VIEWBOX_WIDTH = slidingWindowViewBox.width;
const SLIDING_WINDOW_VIEWBOX_HEIGHT = slidingWindowViewBox.height;
const SLIDING_WINDOW_CENTER_Y = 0;
const SLIDING_WINDOW_HALF_HEIGHT = 38.1;
const SLIDING_WINDOW_VIEWBOX_CENTER_Y = SLIDING_WINDOW_VIEWBOX_MIN_Y + SLIDING_WINDOW_VIEWBOX_HEIGHT / 2;
const SLIDING_WINDOW_CENTER_TO_MAIN_CENTER = SLIDING_WINDOW_VIEWBOX_CENTER_Y - SLIDING_WINDOW_CENTER_Y;

export const SLIDING_WINDOW_VIEWBOX = {
  minX: SLIDING_WINDOW_VIEWBOX_MIN_X,
  minY: SLIDING_WINDOW_VIEWBOX_MIN_Y,
  width: SLIDING_WINDOW_VIEWBOX_WIDTH,
  height: SLIDING_WINDOW_VIEWBOX_HEIGHT,
};

export const SLIDING_WINDOW_SVG_CONTENT = slidingWindowContent;

export const getSlidingWindowVisualMetrics = (shape: OpeningShape) => {
  const windowVisualWidth = Math.max(shape.width ?? 0.1, 0.1);
  const scale = windowVisualWidth / SLIDING_WINDOW_VIEWBOX_WIDTH;
  const windowVisualHeight = scale * SLIDING_WINDOW_VIEWBOX_HEIGHT;
  const anchorOffset = SLIDING_WINDOW_CENTER_TO_MAIN_CENTER * scale;

  const strokeCompensation = 2.5;
  const mainPositiveExtent = (SLIDING_WINDOW_HALF_HEIGHT + strokeCompensation) * scale;
  const mainNegativeExtent = (SLIDING_WINDOW_HALF_HEIGHT + strokeCompensation) * scale;

  return {
    windowVisualWidth,
    windowVisualHeight,
    anchorOffset,
    mainPositiveExtent,
    mainNegativeExtent,
    scale,
  };
};

// Bay Window SVG
// The bay window has triangular ends at x = ±832 that attach to walls
// The wall attachment width is 1664 units (from -832 to +832)
// The wall line runs through y = 0, and the bay extends outward into negative Y
const { viewBox: bayWindowViewBox, content: bayWindowContent } = extractSvgMetadata(rawBayWindowSvg);

const BAY_WINDOW_VIEWBOX_MIN_X = bayWindowViewBox.minX;
const BAY_WINDOW_VIEWBOX_MIN_Y = bayWindowViewBox.minY;
const BAY_WINDOW_VIEWBOX_WIDTH = bayWindowViewBox.width;
const BAY_WINDOW_VIEWBOX_HEIGHT = bayWindowViewBox.height;

// The wall attachment width (distance between the two triangular ends)
// From SVG path: M 832.0568 -95.0921 ... -832.0568
const BAY_WINDOW_WALL_WIDTH = 832.0568 * 2; // = 1664.1136

// The wall line is at y = 0 in SVG coords
// Frame extends from y = -95.0921 to y = +95.0921 at the wall attachment points
const BAY_WINDOW_WALL_HALF_THICKNESS = 95.0921;

// The bay extends outward (negative Y) to y = -575.7906
const BAY_WINDOW_OUTWARD_EXTENT = 575.7906;

// The wall line in SVG is at y=0. After translate(-minY), the wall line is at position:
// wallLineInGroup = 0 - BAY_WINDOW_VIEWBOX_MIN_Y = 582 (since minY = -582)
const BAY_WINDOW_WALL_LINE_IN_VIEWBOX = 0 - BAY_WINDOW_VIEWBOX_MIN_Y; // = 582

export const BAY_WINDOW_VIEWBOX = {
  minX: BAY_WINDOW_VIEWBOX_MIN_X,
  minY: BAY_WINDOW_VIEWBOX_MIN_Y,
  width: BAY_WINDOW_VIEWBOX_WIDTH,
  height: BAY_WINDOW_VIEWBOX_HEIGHT,
};

export const BAY_WINDOW_SVG_CONTENT = bayWindowContent;

export const getBayWindowVisualMetrics = (shape: OpeningShape) => {
  const windowVisualWidth = Math.max(shape.width ?? 0.1, 0.1);
  // Scale based on wall attachment width, not viewBox width
  const scale = windowVisualWidth / BAY_WINDOW_WALL_WIDTH;
  const windowVisualHeight = scale * BAY_WINDOW_VIEWBOX_HEIGHT;
  
  // The scaled visual width based on viewBox (slightly larger than wall width due to padding)
  const scaledViewBoxWidth = scale * BAY_WINDOW_VIEWBOX_WIDTH;
  
  // After translate(-minX, -minY) and scale(s), the wall line (y=0 in SVG) is at:
  // y = BAY_WINDOW_WALL_LINE_IN_VIEWBOX * scale = 582 * scale from the top of the group
  const wallLineY = BAY_WINDOW_WALL_LINE_IN_VIEWBOX * scale;
  
  // The transform pattern is: translate(_, -height/2 + anchorOffset)
  // For the wall line to be at the anchor (y=0):
  //   -height/2 + anchorOffset + wallLineY = 0
  //   anchorOffset = height/2 - wallLineY
  const anchorOffset = windowVisualHeight / 2 - wallLineY;

  // Main frame stroke-width is 10.0, so add 5 units for half-stroke on each side
  const strokeCompensation = 5;
  // Positive extent is toward the interior (y > 0 side) - frame thickness at wall
  const mainPositiveExtent = (BAY_WINDOW_WALL_HALF_THICKNESS + strokeCompensation) * scale;
  // Negative extent covers the full bay projection outward
  const mainNegativeExtent = (BAY_WINDOW_OUTWARD_EXTENT + strokeCompensation) * scale;

  return {
    windowVisualWidth,
    windowVisualHeight,
    scaledViewBoxWidth, // Export this for proper centering
    anchorOffset,
    mainPositiveExtent,
    mainNegativeExtent,
    scale,
  };
};

// Sliding Door SVG
const { viewBox: slidingDoorViewBox, content: slidingDoorContent } = extractSvgMetadata(rawSlidingDoorSvg);

const SLIDING_DOOR_VIEWBOX_MIN_X = slidingDoorViewBox.minX;
const SLIDING_DOOR_VIEWBOX_MIN_Y = slidingDoorViewBox.minY;
const SLIDING_DOOR_VIEWBOX_WIDTH = slidingDoorViewBox.width;
const SLIDING_DOOR_VIEWBOX_HEIGHT = slidingDoorViewBox.height;
const SLIDING_DOOR_CENTER_Y = 0;
const SLIDING_DOOR_HALF_HEIGHT = 62;
const SLIDING_DOOR_VIEWBOX_CENTER_Y = SLIDING_DOOR_VIEWBOX_MIN_Y + SLIDING_DOOR_VIEWBOX_HEIGHT / 2;
const SLIDING_DOOR_CENTER_TO_MAIN_CENTER = SLIDING_DOOR_VIEWBOX_CENTER_Y - SLIDING_DOOR_CENTER_Y;

export const SLIDING_DOOR_VIEWBOX = {
  minX: SLIDING_DOOR_VIEWBOX_MIN_X,
  minY: SLIDING_DOOR_VIEWBOX_MIN_Y,
  width: SLIDING_DOOR_VIEWBOX_WIDTH,
  height: SLIDING_DOOR_VIEWBOX_HEIGHT,
};

export const SLIDING_DOOR_SVG_CONTENT = slidingDoorContent;

export const getSlidingDoorVisualMetrics = (shape: OpeningShape) => {
  const doorVisualWidth = Math.max(shape.width ?? 0.1, 0.1);
  const scale = doorVisualWidth / SLIDING_DOOR_VIEWBOX_WIDTH;
  const doorVisualHeight = scale * SLIDING_DOOR_VIEWBOX_HEIGHT;
  const anchorOffset = SLIDING_DOOR_CENTER_TO_MAIN_CENTER * scale;

  const strokeCompensation = 2.5;
  const mainPositiveExtent = (SLIDING_DOOR_HALF_HEIGHT + strokeCompensation) * scale;
  const mainNegativeExtent = (SLIDING_DOOR_HALF_HEIGHT + strokeCompensation) * scale;

  return {
    doorVisualWidth,
    doorVisualHeight,
    anchorOffset,
    mainPositiveExtent,
    mainNegativeExtent,
    scale,
  };
};

// French Door SVG
const { viewBox: frenchDoorViewBox, content: frenchDoorContent } = extractSvgMetadata(rawFrenchDoorSvg);

const FRENCH_DOOR_VIEWBOX_MIN_X = frenchDoorViewBox.minX;
const FRENCH_DOOR_VIEWBOX_MIN_Y = frenchDoorViewBox.minY;
const FRENCH_DOOR_VIEWBOX_WIDTH = frenchDoorViewBox.width;
const FRENCH_DOOR_VIEWBOX_HEIGHT = frenchDoorViewBox.height;
const FRENCH_DOOR_CENTER_Y = 0;
const FRENCH_DOOR_HALF_HEIGHT = 62;
const FRENCH_DOOR_VIEWBOX_CENTER_Y = FRENCH_DOOR_VIEWBOX_MIN_Y + FRENCH_DOOR_VIEWBOX_HEIGHT / 2;
const FRENCH_DOOR_CENTER_TO_MAIN_CENTER = FRENCH_DOOR_VIEWBOX_CENTER_Y - FRENCH_DOOR_CENTER_Y;

export const FRENCH_DOOR_VIEWBOX = {
  minX: FRENCH_DOOR_VIEWBOX_MIN_X,
  minY: FRENCH_DOOR_VIEWBOX_MIN_Y,
  width: FRENCH_DOOR_VIEWBOX_WIDTH,
  height: FRENCH_DOOR_VIEWBOX_HEIGHT,
};

export const FRENCH_DOOR_SVG_CONTENT = frenchDoorContent;

export const getFrenchDoorVisualMetrics = (shape: OpeningShape) => {
  const doorVisualWidth = Math.max(shape.width ?? 0.1, 0.1);
  const scale = doorVisualWidth / FRENCH_DOOR_VIEWBOX_WIDTH;
  const doorVisualHeight = scale * FRENCH_DOOR_VIEWBOX_HEIGHT;
  const anchorOffset = FRENCH_DOOR_CENTER_TO_MAIN_CENTER * scale;

  const strokeCompensation = 2.5;
  const mainPositiveExtent = (FRENCH_DOOR_HALF_HEIGHT + strokeCompensation) * scale;
  const mainNegativeExtent = (FRENCH_DOOR_HALF_HEIGHT + strokeCompensation) * scale;

  return {
    doorVisualWidth,
    doorVisualHeight,
    anchorOffset,
    mainPositiveExtent,
    mainNegativeExtent,
    scale,
  };
};

