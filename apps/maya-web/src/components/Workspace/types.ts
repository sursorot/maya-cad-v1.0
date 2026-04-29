import type { WorkspaceSnapshot } from '@maya/workspace-domain/workspace/core';
import type { CommandLogEntry } from '@maya/rl-core/types';

export type LengthUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft' | 'ft-in';
export type DrawingMode = 'one-time' | 'chain';
export type ToolbarStyle = 'modern' | 'windows95' | 'funk' | 'cyber' | 'clean';

export interface SnapSettings {
  endpoint: boolean;
  midpoint: boolean;
  center: boolean;
  nearest: boolean;
  quadrant: boolean;
  intersection: boolean;
  grid: boolean;
  direction: boolean;
  perpendicular: boolean;
  ortho: boolean; // Constrain to horizontal/vertical (0°, 90°, 180°, 270°)
  marker: boolean; // Snap to user-placed marker points
  enabled: boolean; // Master toggle
  precision?: number; // Coordinate precision in meters (e.g., 0.001 = 1mm). 0 = disabled
}

// Precision constants for architectural work
export const PRECISION_PRESETS = {
  OFF: 0,           // No rounding
  MILLIMETER: 0.001, // 1mm precision
  CENTIMETER: 0.01,  // 1cm precision
  INCH: 0.0254,      // 1 inch precision
  HALF_INCH: 0.0127, // 1/2 inch precision
  QUARTER_INCH: 0.00635, // 1/4 inch precision
} as const;

/**
 * Round a coordinate value to the specified precision.
 * @param value The coordinate value to round
 * @param precision The precision in meters (0 = no rounding)
 * @returns The rounded value
 */
export const roundToPrecision = (value: number, precision: number): number => {
  if (!precision || precision <= 0) return value;
  return Math.round(value / precision) * precision;
};

/**
 * Round a point's coordinates to the specified precision.
 * @param point The point to round
 * @param precision The precision in meters (0 = no rounding)
 * @returns A new point with rounded coordinates
 */
export const roundPointToPrecision = (point: Point, precision: number): Point => {
  if (!precision || precision <= 0) return point;
  return {
    x: roundToPrecision(point.x, precision),
    y: roundToPrecision(point.y, precision),
  };
};

export interface MeasurementSettings {
  linearDimensions: boolean;    // Blue dimension lines showing lengths
  chipDimensions: boolean;       // Small text chips showing measurements
  arcDimensions: boolean;        // Curved dimension lines for arcs/circles
  spanDimensions: boolean;       // Span measurements across edges
  angles: boolean;               // Angle indicators and chips
  areaLabels: boolean;           // Area labels for rooms
  enabled: boolean;              // Master toggle for all measurements
}


export interface WorkspaceProps {
  canvasOpen: boolean;
  onScaleChange?: (scale: number) => void;
  onViewBoxChange?: (viewBox: ViewBox) => void;
  onContainerWidthChange?: (width: number) => void;
  showGrid?: boolean;
  showToolbar?: boolean;
  toolbarStyle?: ToolbarStyle;
  lengthUnit?: LengthUnit;
  snapSettings?: SnapSettings;
  drawingMode?: DrawingMode;
  onDrawingModeChange?: (mode: DrawingMode) => void;
  showCompass?: boolean;
  zoneHoverEnabled?: boolean;
  showMarkers?: boolean;
  /** Enable smart alignment guides when dragging shapes */
  alignmentGuidesEnabled?: boolean;
  /** Initial snapshot to load (for restoring saved projects) */
  initialSnapshot?: Partial<WorkspaceSnapshot>;
}

export interface WorkspaceHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  setShowMeasurements: (show: boolean) => void;
  setMeasurementSettings: (settings: Partial<MeasurementSettings>) => void;
  getShowMeasurements: () => boolean;
  getMeasurementSettings: () => MeasurementSettings;
  getSnapshot: () => WorkspaceSnapshot;
  getCommandLog: () => CommandLogEntry[];
  resetCommandLog: () => void;
  subscribeToCommandLog: (listener: (entry: CommandLogEntry) => void) => () => void;
  /** Subscribe to workspace state changes (returns unsubscribe function) */
  subscribe: (listener: () => void) => () => void;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridSystem {
  minor: number;
  medium: number;
  major: number;
  minorUnit: number;
  mediumUnit: number;
  majorUnit: number;
  label: string;
}

// Drawing tool types
export type WallAlignment = 'center' | 'inside' | 'outside';
export type WallDrawingMode = 'single' | 'chain' | 'rectangle' | 'offset';
export type WallOffsetDirection = 'left' | 'right';

export type ToolType =
  | 'select'
  | 'measure'
  | 'zoom'
  | 'line'
  | 'polyline'
  | 'arc'
  | 'curve'
  | 'circle'
  | 'rectangle'
  | 'guideline'
  | 'trim'
  | 'marker'
  | 'wall'
  | 'opening'
  | 'asset'
  | 'pencil'
  | 'text'
  | 'arrow'
  | 'highlighter'
  | 'eraser'
  | 'note'
  | 'upload'
  | 'zone'
  | 'dimension';

// Universal Appearance System
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten';

export interface GradientStop {
  offset: number; // 0-1
  color: string;
}

export interface GradientDefinition {
  type: 'linear' | 'radial';
  stops: GradientStop[];
  angle?: number; // degrees, for linear gradients
}

export interface FillStyle {
  type: 'none' | 'solid' | 'pattern' | 'image' | 'gradient';

  // For solid colors
  color?: string;

  // For patterns (hatch, tiles, etc.)
  patternId?: string;
  patternScale?: number;
  patternRotation?: number; // degrees
  patternColors?: {
    primary: string;
    secondary?: string;
  };

  // For images (textures)
  imageUrl?: string;
  imageScale?: number;
  imageFit?: 'fill' | 'cover' | 'contain' | 'tile';

  // For gradients
  gradient?: GradientDefinition;

  // Common
  opacity?: number; // 0-1
}

export interface StrokeStyle {
  color: string;
  width: number;
  dashArray?: number[]; // For dashed lines [dash, gap, dash, gap, ...]
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  opacity?: number; // 0-1
}

export interface ShadowStyle {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

export interface Appearance {
  fill?: FillStyle;
  stroke?: StrokeStyle;
  opacity?: number; // 0-1, applies to entire shape
  blendMode?: BlendMode;
  shadow?: ShadowStyle | null; // Allow null to explicitly remove shadow
  zIndex?: number; // For layering control
}

// Shape types
export interface Point {
  x: number;
  y: number;
}

// ============================================================================
// BIM Properties (Optional on all shapes for BIM compliance)
// ============================================================================

/**
 * Optional BIM properties that can be added to any shape
 * These enable IFC-compatible data exchange and industry classification
 */
export interface BIMShapeProperties {
  /** IFC-compatible Global Unique Identifier */
  globalId?: string;
  /** User-friendly name */
  name?: string;
  /** Optional description */
  description?: string;
  /** Short identifier/tag (e.g., "D-101") */
  tag?: string;
  /** Industry classification reference */
  classification?: {
    system: string;
    code: string;
    title: string;
    edition?: string;
  };
  /** IFC-compatible property sets */
  propertySets?: Array<{
    id: string;
    name: string;
    description?: string;
    properties: Array<{
      name: string;
      value: unknown;
      description?: string;
    }>;
  }>;
  /** Object relationships */
  relationships?: Array<{
    type: string;
    relatedObjectId: string;
    name?: string;
    attributes?: Record<string, unknown>;
  }>;
  /** Change tracking */
  ownerHistory?: {
    createdBy: string;
    createdAt: string;
    modifiedBy?: string;
    modifiedAt?: string;
    changeAction: string;
  };
  /** Layer assignment for CAD export */
  layerId?: string;
}

// ============================================================================
// Shape Definitions
// ============================================================================

export interface LineShape extends Partial<BIMShapeProperties> {
  type: 'line';
  id: string;
  start: Point;
  end: Point;
  stroke: string;
  strokeWidth: number;
  appearance?: Appearance; // Universal styling
}

export interface PolylineShape extends Partial<BIMShapeProperties> {
  type: 'polyline';
  id: string;
  points: Point[];
  stroke: string;
  strokeWidth: number;
  appearance?: Appearance; // Universal styling
}

export interface ArcShape extends Partial<BIMShapeProperties> {
  type: 'arc';
  id: string;
  start: Point;
  end: Point;
  controlPoint: Point; // Third point that defines the arc curvature
  stroke: string;
  strokeWidth: number;
  appearance?: Appearance; // Universal styling
}

export interface CircleShape extends Partial<BIMShapeProperties> {
  type: 'circle';
  id: string;
  center: Point;
  radius: number;
  cursorPoint: Point; // Track cursor position on the circle perimeter
  stroke: string;
  strokeWidth: number;
  appearance?: Appearance; // Universal styling
}

export interface RectangleShape extends Partial<BIMShapeProperties> {
  type: 'rectangle';
  id: string;
  start: Point; // First corner (where user clicks)
  end: Point; // Opposite corner (follows cursor)
  stroke: string;
  strokeWidth: number;
  appearance?: Appearance; // Universal styling
}

export interface CurveShape extends Partial<BIMShapeProperties> {
  type: 'curve';
  id: string;
  points: Point[]; // Control points that the curve passes through
  stroke: string;
  strokeWidth: number;
  appearance?: Appearance; // Universal styling
}

export interface WallShape extends Partial<BIMShapeProperties> {
  type: 'wall';
  id: string;
  centerline: Point[]; // Ordered points describing wall centerline
  controlPoint?: Point | null;
  thickness: number;
  height?: number;
  alignment: WallAlignment;
  materialId?: string;
  appearance?: Appearance; // Universal styling (materials, elevation patterns)
}

export type OpeningCategory = 'door' | 'window' | 'opening';
export type OpeningOperation = 'swing' | 'slide' | 'fixed';
export type OpeningSwingDirection = 'in' | 'out' | 'center';
export type OpeningHingeSide = 'left' | 'right' | 'double' | 'none';

export interface OpeningSwingState {
  operation: OpeningOperation;
  direction: OpeningSwingDirection;
  hinge: OpeningHingeSide;
  angle: number;
  flipped?: boolean;
  facing?: 'positive' | 'negative';
}

export interface OpeningHostAttachment {
  wallId: string;
  normalizedPosition: number;
  distance: number;
  normalOffset: number;
}

export interface OpeningShape extends Partial<BIMShapeProperties> {
  type: 'opening';
  id: string;
  category: OpeningCategory;
  width: number;
  height: number;
  sillHeight: number;
  headHeight: number;
  frameThickness: number;
  anchor: Point;
  direction: Point;
  normal: Point;
  swing: OpeningSwingState;
  host: OpeningHostAttachment | null;
  metadata?: Record<string, string | number | boolean | null>;
  appearance?: Appearance; // Universal styling (glass, wood, materials)
}

export type GuidelineOrientation = 'horizontal' | 'vertical' | 'freeform';

export interface GuidelineShape extends Partial<BIMShapeProperties> {
  type: 'guideline';
  id: string;
  orientation: GuidelineOrientation;
  // For horizontal/vertical: position is the y/x coordinate
  // For freeform: uses start and end points
  position?: number; // For horizontal (y-coord) or vertical (x-coord)
  start?: Point; // For freeform
  end?: Point; // For freeform (used to define direction)
  stroke: string;
  strokeWidth: number;
  appearance?: Appearance; // Universal styling
}

export interface RoomShape extends Partial<BIMShapeProperties> {
  type: 'room';
  id: string;
  points: Point[];
  area: number;
  perimeter: number;
  centroid: Point;
  label?: string;
  wallIds?: string[];
  bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  appearance?: Appearance; // Universal styling (floor materials, patterns)
}

export interface ZoneShape extends Partial<BIMShapeProperties> {
  type: 'zone';
  id: string;
  points: Point[];
  stroke: string;
  strokeWidth: number;
  fill: string;
  area: number;
  label?: string;
  wallIds?: string[]; // If set, zone is bound to these walls and cannot be moved freely
  appearance?: Appearance; // Universal styling (hatches, patterns)
  disabled?: boolean; // If true, zone won't highlight on hover or be selectable
}

export interface DimensionShape extends Partial<BIMShapeProperties> {
  type: 'dimension';
  id: string;
  start: Point;
  end: Point;
  offset: number; // Perpendicular distance from the line connecting start and end
  stroke: string;
  strokeWidth: number;
  value?: number; // Optional Override value, otherwise calculated from distance
  editingStage?: 'end' | 'offset'; // Track creation phase
  attachedTo?: string; // ID of the shape this dimension is attached to
  appearance?: Appearance; // Universal styling
}

export interface MarkerShape extends Partial<BIMShapeProperties> {
  type: 'marker';
  id: string;
  position: Point;
  label: string;
  stroke: string;
  strokeWidth: number;
  appearance?: Appearance; // Universal styling
}

export interface TextShape extends Partial<BIMShapeProperties> {
  type: 'text';
  id: string;
  position: Point;
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textAlign: 'left' | 'center' | 'right';
  appearance?: Appearance; // For potential background/border styling
}

// ============================================================================
// Trace Layer / Reference Image
// ============================================================================

/**
 * ImageShape - Reference image for tracing floor plans
 * These are rendered as a background layer beneath all other shapes.
 */
export interface ImageCalibration {
  point1Pixel: Point;        // First point in image pixel coords
  point2Pixel: Point;        // Second point in image pixel coords
  point1Canvas: Point;       // First point in canvas coords (for reference line)
  point2Canvas: Point;       // Second point in canvas coords
  pixelDistance: number;     // Distance between points in pixels
  realDistance: number;      // User-specified real-world distance
  unit: LengthUnit;          // Unit of realDistance
  metersPerPixel: number;    // Calculated scale factor
  timestamp: number;         // When calibration was done
}

export interface ImageFilters {
  brightness: number;        // -100 to +100 (default: 0)
  contrast: number;          // -100 to +100 (default: 0)
  grayscale: boolean;        // Convert to grayscale
  invert: boolean;           // Invert colors
}

export interface ImageShape extends Partial<BIMShapeProperties> {
  type: 'image';
  id: string;
  name: string;              // User-friendly name (filename by default)
  
  // Image data
  src: string;               // Data URL or blob URL
  originalWidth: number;     // Original image width in pixels
  originalHeight: number;    // Original image height in pixels
  
  // Position & Transform
  position: Point;           // Top-left corner in canvas coordinates (meters)
  width: number;             // Display width in canvas units (meters)
  height: number;            // Display height in canvas units (meters)
  rotation: number;          // Rotation in degrees (default: 0)
  flipHorizontal: boolean;   // Mirror horizontally
  flipVertical: boolean;     // Mirror vertically
  
  // Calibration data (optional - image can be placed without calibration)
  calibration?: ImageCalibration;
  
  // Layer Controls
  opacity: number;           // 0-1, default 0.4 for tracing
  visible: boolean;          // Toggle visibility (default: true)
  locked: boolean;           // Prevent selection/movement (default: true)
  zOrder: number;            // Layer order (lower = behind)
  
  // Image Filters (optional)
  filters?: ImageFilters;
  
  // Show calibration reference line on canvas
  showCalibrationLine?: boolean;
  
  appearance?: Appearance;
}

// ============================================================================
// Asset Shape - Furniture and placeable 2D assets
// ============================================================================

export type AssetCategory = 'furniture' | 'fixture' | 'equipment' | 'decoration' | 'other';

export interface AssetShape extends Partial<BIMShapeProperties> {
  type: 'asset';
  id: string;
  category: AssetCategory;
  assetId: string;           // Identifier for the asset type (e.g., 'king-bed', 'queen-bed')
  
  // Position & Transform
  position: Point;           // Center point in canvas coordinates (meters)
  width: number;             // Display width in canvas units (meters)
  height: number;            // Display height in canvas units (meters)
  rotation: number;          // Rotation in degrees (default: 0)
  flipHorizontal: boolean;   // Mirror horizontally
  flipVertical: boolean;     // Mirror vertically
  
  // Visual
  stroke: string;
  strokeWidth: number;
  opacity: number;           // 0-1, default 1
  
  // Metadata
  label?: string;            // User-assigned label
  metadata?: Record<string, string | number | boolean | null>;
  appearance?: Appearance;
}

// ============================================================================
// Group Shape - Combines multiple shapes into a single selectable unit
// ============================================================================

export interface GroupShape extends Partial<BIMShapeProperties> {
  type: 'group';
  id: string;
  memberIds: string[];        // IDs of shapes in this group
  bounds: {                   // Cached bounding box
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  name?: string;              // Optional user-assigned name
  locked?: boolean;           // Prevent editing members
  appearance?: Appearance;    // Override appearance for all members
}

/** Default values for new trace images */
export const DEFAULT_IMAGE_SHAPE: Omit<ImageShape, 'id' | 'src' | 'originalWidth' | 'originalHeight' | 'position' | 'width' | 'height' | 'name'> = {
  type: 'image',
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  opacity: 0.4,              // 40% - good for tracing
  visible: true,
  locked: true,              // Locked by default to prevent accidents
  zOrder: 0,
  filters: {
    brightness: 0,
    contrast: 0,
    grayscale: false,
    invert: false,
  },
  showCalibrationLine: false,
};

export type Shape =
  | LineShape
  | PolylineShape
  | ArcShape
  | CurveShape
  | CircleShape
  | RectangleShape
  | GuidelineShape
  | MarkerShape
  | WallShape
  | OpeningShape
  | RoomShape
  | ZoneShape
  | DimensionShape
  | TextShape
  | ImageShape
  | AssetShape
  | GroupShape;


// Drawing state
export interface DrawingState {
  activeTool: ToolType;
  shapes: Shape[];
  isDrawing: boolean;
  currentShape: Shape | null;
  selectedShapeId: string | null;
}
