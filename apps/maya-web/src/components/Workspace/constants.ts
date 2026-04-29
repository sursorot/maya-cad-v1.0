// Custom cursor SVG - matches the SelectIcon from toolbar but filled
// Shape: M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z
export const CUSTOM_CURSOR = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z' fill='black' stroke='white' stroke-width='1.5' stroke-linejoin='round'/></svg>`;

// Cursor hotspot position (tip of the arrow)
export const CURSOR_HOTSPOT = '3 3';

// Default view settings
export const DEFAULT_VIEW_WIDTH = 10; // meters
export const DEFAULT_SCALE = 1;
export const DEFAULT_VIEWBOX = { x: -5, y: -5, width: 10, height: 10 };

// Zoom limits
// MIN_SCALE determines max zoom out: viewBox.width = DEFAULT_VIEW_WIDTH / MIN_SCALE
// At 0.005: 10m / 0.005 = 2000m = 2km max view
// At 0.001: 10m / 0.001 = 10000m = 10km max view (previous)
export const MIN_SCALE = 0.005; // Max zoom out ~2km (improved grid density)
export const MAX_SCALE = 1000; // Extreme zoom in

// Zoom factors
export const ZOOM_IN_FACTOR = 1.5;
export const ZOOM_OUT_FACTOR = 0.67;
export const PINCH_ZOOM_IN_FACTOR = 1.1;
export const PINCH_ZOOM_OUT_FACTOR = 0.9;

