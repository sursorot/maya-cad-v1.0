import type { OpeningSwingState, TrimState, WorkspaceSnapshot } from './types';

export const DEFAULT_WALL_THICKNESS = 0.1524; // 6 inches in meters
export const DEFAULT_WALL_HEIGHT = 9;
export const DEFAULT_OPENING_WIDTH = 3;
export const DEFAULT_OPENING_HEIGHT = 7;
export const DEFAULT_OPENING_SILL = 0;
export const DEFAULT_FRAME_THICKNESS = 0.25;
export const MIN_OPENING_WIDTH = 0.1;
// Maximum distance (in meters) for an opening to snap to a wall
export const WALL_SNAP_PROXIMITY_THRESHOLD = 0.2; // 20cm - reduced from 50cm to minimize jump

export const DEFAULT_OPENING_SWING: OpeningSwingState = {
    operation: 'swing',
    direction: 'in',
    hinge: 'left',
    angle: 90,
    flipped: false,
    facing: 'positive',
};

export const DEFAULT_TRIM_STATE: TrimState = {
    wallId: null,
    firstPoint: null,
    secondPoint: null,
    highlightSegment: null,
    isConfirmed: false,
};

export const DEFAULT_SNAPSHOT: WorkspaceSnapshot = {
    shapes: [],
    activeTool: 'select',
    isDrawing: false,
    currentShape: null,
    selectedShapeId: null,
    selectedShapeIds: [],
    hoveredShapeId: null,
    drawingMode: 'one-time',
    guidelineOrientation: 'horizontal',
    chainSessionShapeIds: [],
    showGrid: true,
    measurementSettings: {
        enabled: false, // OFF by default - measurements show on selection only
        linearDimensions: true,
        chipDimensions: true,
        arcDimensions: true,
        spanDimensions: true,
        angles: true,
        areaLabels: true,
    },
    showMeasurements: false, // OFF by default - measurements show on selection only
    lengthUnit: 'ft',
    snapSettings: {
        enabled: true,
        endpoint: true,
        midpoint: true,
        center: true,
        nearest: true,
        quadrant: true,
        intersection: true,
        grid: true,
        direction: true,
        perpendicular: true,
        ortho: false,
        marker: true, // Snap to user-placed marker points
        precision: 0.001, // 1mm precision by default for professional CAD accuracy
    },
    viewBox: { x: -5, y: -5, width: 10, height: 10 },
    lastCursorPoint: null,
    wallsLocked: true,
    trimState: DEFAULT_TRIM_STATE,
    markerOptions: {
        label: 'M1',
        color: '#F57C00',
    },
    lastMarkerPosition: null,
    metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        historyDepth: 0,
        futureDepth: 0,
        revision: 0,
        drawingHistoryDepth: 0,
        drawingFutureDepth: 0,
    },
    drawingHistory: [],
    drawingFuture: [],
};

export const GUIDELINE_COLOR = '#FF6B35';
export const MARKER_COLOR = '#E65100'; // Orange color for markers
export const DEFAULT_STROKE = '#000000';
