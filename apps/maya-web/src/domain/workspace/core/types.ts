
import type {
    DrawingMode,
    GuidelineOrientation,
    LengthUnit,
    MeasurementSettings,
    OpeningCategory,
    OpeningHostAttachment,
    OpeningSwingState,
    Point,
    Shape,
    SnapSettings,
    ToolType,
    ViewBox,
    WallAlignment,
    AssetCategory,
} from '../../../components/Workspace/types';

export type {
    DrawingMode,
    GuidelineOrientation,
    LengthUnit,
    MeasurementSettings,
    OpeningCategory,
    OpeningHostAttachment,
    OpeningSwingState,
    Point,
    Shape,
    SnapSettings,
    ToolType,
    ViewBox,
    WallAlignment,
    WallShape,
    RoomShape,
    OpeningShape,
    GuidelineShape,
    ArcShape,
    CircleShape,
    CurveShape,
    LineShape,
    PolylineShape,
    RectangleShape,
    ZoneShape,
    TextShape,
    BIMShapeProperties,
    DimensionShape,
    MarkerShape,
    // Trace Layer / Reference Image types
    ImageShape,
    ImageCalibration,
    ImageFilters,
    // Asset types
    AssetShape,
    AssetCategory,
} from '../../../components/Workspace/types';

export { DEFAULT_IMAGE_SHAPE } from '../../../components/Workspace/types';

import type { HistoryBatchTelemetry } from '../telemetry';

export interface WorkspaceStateOptions {
    telemetry?: HistoryBatchTelemetry;
}

export interface WallCreationOptions {
    thickness?: number;
    height?: number;
    alignment?: WallAlignment;
    materialId?: string;
}

export interface RoomCreationOptions {
    label?: string;
    wallIds?: string[];
}

export interface OpeningCreationOptions {
    category?: OpeningCategory;
    width?: number;
    height?: number;
    sillHeight?: number;
    headHeight?: number;
    frameThickness?: number;
    swing?: Partial<OpeningSwingState>;
    metadata?: Record<string, string | number | boolean | null>;
    facing?: 'positive' | 'negative';
}

export interface OpeningPlacementOptions extends OpeningCreationOptions {
    wallId?: string | null;
    host?: Partial<Omit<OpeningHostAttachment, 'wallId'>> & { wallId: string };
    normalOffset?: number;
    autoAttach?: boolean;
}

export interface AssetPlacementOptions {
    assetId: string;
    category?: AssetCategory;
    width?: number;
    height?: number;
    rotation?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    label?: string;
    metadata?: Record<string, string | number | boolean | null>;
}

export interface OpeningPose extends OpeningHostAttachment {
    anchor: Point;
    direction: Point;
    normal: Point;
    facing: 'positive' | 'negative';
}

export interface WallCenterlineDescriptor {
    segments: { start: Point; end: Point; length: number }[];
    totalLength: number;
}

/**
 * Trim state for the trim tool - holds two points on a wall that define a section to be removed
 */
export interface TrimState {
    wallId: string | null;
    firstPoint: Point | null;
    secondPoint: Point | null;
    /** The portion of the wall between the two points, for highlighting */
    highlightSegment: { start: Point; end: Point } | null;
    /** Whether the second point has been confirmed by a click (stops following mouse) */
    isConfirmed: boolean;
}

/**
 * WorkspaceSnapshot captures the entire mutable surface area of the canvas so it can be cloned,
 * serialized, diffed, or shipped to external agents (humans or RL policies).
 */
export interface WorkspaceSnapshot {
    shapes: Shape[];
    activeTool: ToolType;
    isDrawing: boolean;
    currentShape: Shape | null;
    selectedShapeId: string | null;
    selectedShapeIds: string[];
    hoveredShapeId: string | null;
    drawingMode: DrawingMode;
    guidelineOrientation: GuidelineOrientation;
    chainSessionShapeIds: string[];
    showGrid: boolean;
    measurementSettings: MeasurementSettings;
    showMeasurements: boolean;
    lengthUnit: LengthUnit;
    snapSettings: SnapSettings;
    viewBox: ViewBox;
    lastCursorPoint: Point | null;
    wallsLocked: boolean;
    trimState: TrimState;
    markerOptions: {
        label: string;
        color: string;
    };
    /** Last placed marker position for chain mode - shows preview line to cursor */
    lastMarkerPosition: Point | null;
    metadata: {
        createdAt: number;
        updatedAt: number;
        historyDepth: number;
        futureDepth: number;
        revision: number;
        drawingHistoryDepth: number;
        drawingFutureDepth: number;
    };
    drawingHistory: Shape[];
    drawingFuture: Shape[];
}

export type MutableSnapshot = WorkspaceSnapshot;

// ============================================================================
// BIM Types Re-exports
// ============================================================================

export type {
    BIMObjectProperties,
    ShapeStatus,
} from './types/bim/BIMObject';

export {
    generateGlobalId,
    generateUUID,
    uuidToIfcGuid,
    ifcGuidToUuid,
    isValidGlobalId,
    createBIMProperties,
    withBIMProperties,
    generateTag,
    TAG_PREFIXES,
    hasBIMProperties,
    hasPropertySet,
    getPropertySet,
    setPropertySet,
} from './types/bim/BIMObject';

export type {
    PropertySet,
    Property,
    PropertyValue,
    StringPropertyValue,
    NumberPropertyValue,
    BooleanPropertyValue,
    EnumPropertyValue,
    ReferencePropertyValue,
    MeasurePropertyValue,
    MeasureUnit,
} from './types/bim/PropertySet';

export {
    STANDARD_PSET_NAMES,
    createPropertySet,
    addProperty,
    getPropertyValue,
    setPropertyValue,
    stringValue,
    numberValue,
    booleanValue,
    enumValue,
    referenceValue,
    measureValue,
} from './types/bim/PropertySet';

export type {
    ClassificationReference,
    ClassificationSystemType,
} from './types/bim/Classification';

export {
    createClassification,
    createOmniClassRef,
    createUniclassRef,
    searchOmniClass,
    searchUniclass,
    validateClassificationCode,
    DEFAULT_CLASSIFICATIONS,
    OMNICLASS_TABLE_21,
    UNICLASS_2015,
} from './types/bim/Classification';

export type {
    RelationshipType,
    ObjectRelationship,
    BoundaryType,
    SpaceBoundary,
    ConnectionType,
    PathConnection,
} from './types/bim/Relationship';

export {
    createRelationship,
    createFillsVoidRelationship,
    createVoidsElementRelationship,
    createContainedInRelationship,
    createSpaceBoundary,
    createWallConnection,
    filterRelationshipsByType,
    findRelationshipTo,
    hasRelationship,
} from './types/bim/Relationship';

export type {
    OwnerHistory,
    ChangeAction,
} from './types/bim/OwnerHistory';

export {
    createOwnerHistory,
    updateOwnerHistory,
} from './types/bim/OwnerHistory';

export type {
    Layer,
    LayerCategory,
    Discipline,
    LineType,
} from './types/bim/Layer';

export {
    DEFAULT_LAYERS,
    DISCIPLINE_NAMES,
    LINE_TYPE_PATTERNS,
    ACI_COLORS,
    hexToAci,
    createLayer,
    getLayerById,
    getLayerByAiaName,
    getDefaultLayerForShapeType,
} from './types/bim/Layer';
