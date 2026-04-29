import { useEffect, useState, useRef, useMemo } from 'react';
import type { RefObject } from 'react';
import type { Point, Shape, SnapSettings, WallShape, WallDrawingMode, OpeningShape, WallAlignment } from '../../types';
import type { OpeningPlacementOptions, AssetPlacementOptions, WorkspaceSnapshot, WallCreationOptions } from '@maya/workspace-domain/workspace';
import { MULTI_SELECT_ID } from './constants';
import type { WorkspaceController } from '../../hooks/useWorkspaceController';
import { getSVGPoint } from './utils';
import type { SnapResult } from '../../hooks/useSnapping';
import { getSemicircleMarkers } from '../../utils/measurements';
import { useAlignmentGuides, type AlignmentGuide } from '../../hooks/useAlignmentGuides';

// Modular hooks are available in ./hooks but currently not extracted
// TODO: Extract measure, marker chain, box selection, and resize logic to hooks
import {
  findClosestWall,
  isShapeIntersectingRect,
  LOOP_CLOSE_TOLERANCE,
  type WallExtendedSnapMetadata,
} from './interactionUtils';

type DrawingMode = 'one-time' | 'chain';

interface UseCanvasInteractionProps {
  svgRef: RefObject<SVGSVGElement>;
  controller: WorkspaceController;
  snapshot: WorkspaceSnapshot;
  snapSettings?: SnapSettings;
  gridSpacing?: number; // Grid minor spacing in meters for ortho-grid integration
  findSnapPoint: (
    point: Point,
    excludeShapeId?: string,
    additionalPoints?: Point[],
    customSnapPoints?: { point: Point; type: string }[],
  ) => SnapResult;
  setSnapIndicator: (indicator: { point: Point; type: string } | null) => void;
  wallOptions?: WallCreationOptions & { offsetDistance?: number };
  wallMode?: WallDrawingMode;
  openingOptions?: OpeningPlacementOptions;
  assetOptions?: AssetPlacementOptions;
  onOpeningPlaced?: () => void;
  drawingMode?: DrawingMode;
  alignmentGuidesEnabled?: boolean;
}

export interface SelectionRect {
  start: Point;
  end: Point;
}

export const useCanvasInteraction = ({
  svgRef,
  controller,
  snapshot,
  snapSettings,
  gridSpacing = 0,
  findSnapPoint,
  setSnapIndicator,
  wallOptions,
  wallMode = 'single',
  openingOptions,
  assetOptions,
  onOpeningPlaced,
  drawingMode = 'one-time',
  alignmentGuidesEnabled = true,
}: UseCanvasInteractionProps) => {
  const {
    activeTool,
    isDrawing,
    currentShape,
    shapes,
    selectedShapeId,
    selectedShapeIds,
    wallsLocked,
  } = snapshot;

  const selectionContainsWall = useMemo(() => {
    const ids = new Set<string>();
    if (selectedShapeIds?.length) {
      selectedShapeIds.forEach((id) => {
        if (id && id !== MULTI_SELECT_ID) {
          ids.add(id);
        }
      });
    }
    if (ids.size === 0 && selectedShapeId && selectedShapeId !== MULTI_SELECT_ID) {
      ids.add(selectedShapeId);
    }
    if (ids.size === 0) {
      return false;
    }
    return shapes.some((shape) => ids.has(shape.id) && shape.type === 'wall');
  }, [selectedShapeIds, selectedShapeId, shapes]);

  // Determine the orientation of selected walls for ortho constraint
  const selectedWallsOrientation = useMemo(() => {
    const ids = new Set<string>();
    if (selectedShapeIds?.length) {
      selectedShapeIds.forEach((id) => {
        if (id && id !== MULTI_SELECT_ID) {
          ids.add(id);
        }
      });
    }
    if (ids.size === 0 && selectedShapeId && selectedShapeId !== MULTI_SELECT_ID) {
      ids.add(selectedShapeId);
    }
    
    const selectedWalls = shapes.filter(
      (shape): shape is WallShape => shape.type === 'wall' && ids.has(shape.id)
    );
    
    if (selectedWalls.length === 0) return 'none' as const;
    
    const orientations = selectedWalls.map((wall) => {
      if (!wall.centerline || wall.centerline.length < 2) return 'diagonal' as const;
      const start = wall.centerline[0];
      const end = wall.centerline[wall.centerline.length - 1];
      const dx = Math.abs(end.x - start.x);
      const dy = Math.abs(end.y - start.y);
      // Wall is considered orthogonal if the angle is within ~5 degrees of horizontal/vertical
      const ratio = Math.min(dx, dy) / Math.max(dx, dy);
      const isOrthogonal = ratio < 0.1;
      if (!isOrthogonal) return 'diagonal' as const;
      return dx >= dy ? 'horizontal' as const : 'vertical' as const;
    });
    
    const allHorizontal = orientations.every(o => o === 'horizontal');
    const allVertical = orientations.every(o => o === 'vertical');
    
    if (allHorizontal) return 'horizontal' as const;
    if (allVertical) return 'vertical' as const;
    return 'mixed' as const;
  }, [selectedShapeIds, selectedShapeId, shapes]);

  const {
    click,
    updateCursor,
    setPrimarySelection,
    setMultiSelection,
    moveSelection,
    resizeLineHandle,
    resizePolylineCorner,
    resizeRectangleEdge,
    resizeWallHandle,
    resizeRoomCorner,
    resizeOpeningHandle,
    setWallControlPoint,
    beginHistoryBatch,
    commitHistoryBatch,
    commitChainSession,
    wallBegin,
    wallUpdate,
    wallCommit,
    wallCancel,
    wallDrawRectangle,
    wallOffset,
    selectTool,
    openingBegin,
    openingUpdate,
    openingCancel,
    openingInsert,
    assetInsert,
    setTrimFirstPoint,
    setTrimSecondPoint,
    clearTrimState,
  } = controller;
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const [clickedOnShape, setClickedOnShape] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'start' | 'end' | null>(null);
  const [isResizingPolylineCorner, setIsResizingPolylineCorner] = useState(false);
  const [polylineCorner, setPolylineCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [isResizingRectangleEdge, setIsResizingRectangleEdge] = useState(false);
  const [rectangleEdge, setRectangleEdge] = useState<'top' | 'right' | 'bottom' | 'left' | null>(null);
  const [isResizingRoomCorner, setIsResizingRoomCorner] = useState(false);
  const [roomCorner, setRoomCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [isResizingText, setIsResizingText] = useState(false);
  const [textResizeCorner, setTextResizeCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [textResizeInitial, setTextResizeInitial] = useState<{
    width: number;
    height: number;
    fontSize: number;
    position: Point;
    textAlign: 'left' | 'center' | 'right';
  } | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationPreview, setRotationPreview] = useState<{
    pivot: Point;
    absoluteAngle: number;
    deltaAngle: number;
    snappedAngle: number | null;
  } | null>(null);
  const wallLoopVerticesRef = useRef<Point[]>([]);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isCurvingWall, setIsCurvingWall] = useState(false);
  const [curvingWallId, setCurvingWallId] = useState<string | null>(null);
  const [rectangleState, setRectangleState] = useState<{
    mode: WallDrawingMode;
    start: Point | null;
    preview: { start: Point; end: Point } | null;
  }>({
    mode: wallMode,
    start: null,
    preview: null,
  });
  const wallAttachContextRef = useRef<WallExtendedSnapMetadata | null>(null);
  const autoAlignmentRef = useRef<WallAlignment | null>(null);
  const dragAxisRef = useRef<'horizontal' | 'vertical' | null>(null);
  const rotationStateRef = useRef<{
    pivot: Point;
    lastAngle: number;
    totalAngle: number;
    baseOrientation: number;
  } | null>(null);
  const selectionRotationRef = useRef<number>(0);
  const selectionRotationStartRef = useRef<number>(0);
  const selectionKeyRef = useRef<string | null>(null);

  // Measure tool state - temporary measurement between two points
  const [measureStart, setMeasureStart] = useState<Point | null>(null);
  const [measureEnd, setMeasureEnd] = useState<Point | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);

  // Marker chain mode state - shows measurement line from last marker to cursor
  const [markerChainStart, setMarkerChainStart] = useState<Point | null>(null);
  const [markerChainEnd, setMarkerChainEnd] = useState<Point | null>(null);
  const [isMarkerChaining, setIsMarkerChaining] = useState(false);

  // Track if multi-selection was made via box selection (to show consolidated bounding box)
  const [multiSelectViaBox, setMultiSelectViaBox] = useState(false);

  // Alignment guides state - shows guide lines during drag operations
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  
  // Alignment guides hook for calculating smart alignment
  const { applyAlignmentSnap } = useAlignmentGuides(shapes, {
    enabled: alignmentGuidesEnabled,
    snapThreshold: 0.05, // 5cm snap threshold
    alignCenter: true,
    alignEdges: true,
    alignCorners: false, // Keep it simple for now
    maxGuides: 4,
  });

  useEffect(() => {
    if (activeTool !== 'wall') {
      wallLoopVerticesRef.current = [];
    }
    // Clear measure state when switching away from measure tool
    if (activeTool !== 'measure') {
      setMeasureStart(null);
      setMeasureEnd(null);
      setIsMeasuring(false);
    }
    
    // Clear marker chain state when switching away from marker tool
    if (activeTool !== 'marker') {
      setMarkerChainStart(null);
      setMarkerChainEnd(null);
      setIsMarkerChaining(false);
    }
    
    // Clear trim state when switching away from trim tool
    if (activeTool !== 'trim') {
      clearTrimState();
    }
    
    // Clear dimension adjustment state when switching away from select tool
    if (activeTool !== 'select') {
      setAdjustingDimensionId(null);
    }

    // Clean up opening preview when switching away from opening tool
    if (activeTool !== 'opening' && isDrawing && currentShape && currentShape.type === 'opening') {
      openingCancel();
    }
  }, [activeTool, isDrawing, currentShape, openingCancel, clearTrimState]);

  useEffect(() => {
    if (wallMode !== 'single' && wallMode !== 'chain') {
      wallLoopVerticesRef.current = [];
    }
  }, [wallMode]);

  useEffect(() => {
    const key = (() => {
      if (selectedShapeIds && selectedShapeIds.length > 0) {
        return selectedShapeIds.slice().sort().join('|');
      }
      return selectedShapeId ?? null;
    })();
    if (selectionKeyRef.current !== key) {
      selectionKeyRef.current = key;
      selectionRotationRef.current = 0;
      setRotationPreview(null);
    }
  }, [selectedShapeIds, selectedShapeId]);

  useEffect(() => {
    if (!wallsLocked || !selectionContainsWall) {
      dragAxisRef.current = null;
    }
  }, [wallsLocked, selectionContainsWall]);

  // Effect to update opening ghost shape when options change
  useEffect(() => {
    if (activeTool === 'opening' && isDrawing && currentShape && currentShape.type === 'opening') {
      if (openingOptions?.category) {
        // Check if properties actually changed to avoid infinite loop
        const shape = currentShape as OpeningShape;
        const currentVisualType = shape.metadata?.visualType;
        const newVisualType = openingOptions.metadata?.visualType;
        if (
          shape.width !== openingOptions.width ||
          shape.height !== openingOptions.height ||
          shape.category !== openingOptions.category ||
          currentVisualType !== newVisualType
        ) {
          // Re-trigger begin to update the shape with new options (width/height/category/metadata)
          // We use the current anchor point
          openingBegin(currentShape.anchor, openingOptions);
        }
      } else {
        // If category is cleared, cancel the ghost shape
        openingCancel();
      }
    }
  }, [activeTool, isDrawing, currentShape, openingOptions, openingBegin, openingCancel]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Return') {
        // Handle wall tool in chain mode - Enter finishes the wall chain
        if (activeTool === 'wall' && wallMode === 'chain') {
          e.preventDefault();
          // Cancel any in-progress wall preview (don't commit it - user just wants to finish)
          // The preview is an "uncommitted" wall that starts after the last click
          if (isDrawing && currentShape?.type === 'wall') {
            wallCancel();
          }
          // Commit the chain session to finish wall drawing (selects completed walls)
          commitChainSession();
          return;
        }
        
        if (activeTool === 'zone' && isDrawing && currentShape?.type === 'zone') {
          e.preventDefault();
          controller.zoneCommit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, isDrawing, currentShape, controller, wallMode, wallCancel, commitChainSession]);

  const rectangleStart = rectangleState.mode === wallMode ? rectangleState.start : null;
  const rectanglePreview = rectangleState.mode === wallMode ? rectangleState.preview : null;
  const setRectangleSession = (start: Point | null, preview: { start: Point; end: Point } | null) => {
    setRectangleState({ mode: wallMode, start, preview });
  };

  const historySources = {
    drag: 'selection.drag',
    resizeLine: 'selection.resize.line_handle',
    resizePolylineCorner: 'selection.resize.polyline_corner',
    resizeRectangleEdge: 'selection.resize.rectangle_edge',
    resizeRoomCorner: 'selection.resize.room_corner',
    resizeText: 'selection.resize.text',
    curveWall: 'selection.curve_wall',
    rotateSelection: 'selection.rotate',
  } as const;

  const getArcSemicircleSnapPoints = (): { point: Point; type: string }[] | undefined => {
    if (!isDrawing || activeTool !== 'arc' || !currentShape || currentShape.type !== 'arc') {
      return undefined;
    }

    const controlPointDistance = Math.hypot(
      currentShape.controlPoint.x - currentShape.start.x,
      currentShape.controlPoint.y - currentShape.start.y
    );

    if (controlPointDistance < 0.01) {
      return undefined;
    }

    const markers = getSemicircleMarkers(currentShape.start, currentShape.end);
    if (!markers) {
      return undefined;
    }

    return markers.map((marker) => ({
      point: marker,
      type: 'semicircle',
    }));
  };

  // distancePointToSegment imported from interactionUtils

  const applyWallLockConstraint = (delta: Point): Point => {
    if (!wallsLocked || !selectionContainsWall) {
      return delta;
    }
    const absX = Math.abs(delta.x);
    const absY = Math.abs(delta.y);
    const epsilon = 1e-6;

    // Use wall orientation to determine constraint axis
    // Horizontal walls can only move vertically (perpendicular)
    // Vertical walls can only move horizontally (perpendicular)
    if (selectedWallsOrientation === 'horizontal') {
      // Horizontal walls move only vertically
      return { x: 0, y: delta.y };
    } else if (selectedWallsOrientation === 'vertical') {
      // Vertical walls move only horizontally
      return { x: delta.x, y: 0 };
    }

    // For mixed or diagonal walls, fall back to initial drag axis behavior
    if (!dragAxisRef.current) {
      if (absX < epsilon && absY < epsilon) {
        return { x: 0, y: 0 };
      }
      dragAxisRef.current = absX >= absY ? 'horizontal' : 'vertical';
    }

    if (dragAxisRef.current === 'horizontal') {
      return { x: delta.x, y: 0 };
    }
    return { x: 0, y: delta.y };
  };

  // Wrapper for imported findClosestWall to use shapes from closure
  const findClosestWallLocal = (point: Point): WallShape | null => {
    return findClosestWall(point, shapes);
  };

  // isPointInsidePolygon imported from interactionUtils

  // isShapeIntersectingRect imported from interactionUtils

  /**
   * Compute orthogonal snap - FORCES drawing to horizontal/vertical directions only (0°, 90°, 180°, 270°)
   * When ortho mode is on, walls can ONLY be drawn horizontally or vertically
   */
  const computeOrthoSnap = (
    origin: Point | null,
    target: Point
  ): { point: Point; type: 'ortho-horizontal' | 'ortho-vertical' } | null => {
    if (!snapSettings?.enabled || !snapSettings.ortho) return null;
    if (!origin) return null;
    
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.0005) return null;
    
    // Calculate angle from origin to target (in radians)
    const angle = Math.atan2(dy, dx);
    
    // Convert to degrees for easier reasoning
    const angleDeg = (angle * 180) / Math.PI;
    
    // Normalize angle to 0-360 range
    const normalizedAngle = ((angleDeg % 360) + 360) % 360;
    
    // Orthogonal directions
    const directions = [
      { angle: 0, type: 'ortho-horizontal' as const, vec: { x: 1, y: 0 } },    // Right
      { angle: 90, type: 'ortho-vertical' as const, vec: { x: 0, y: 1 } },     // Down
      { angle: 180, type: 'ortho-horizontal' as const, vec: { x: -1, y: 0 } }, // Left
      { angle: 270, type: 'ortho-vertical' as const, vec: { x: 0, y: -1 } },   // Up
    ];
    
    // ALWAYS find the nearest orthogonal direction and snap to it
    let bestDir = directions[0];
    let bestDiff = 360;
    
    for (const dir of directions) {
      // Calculate angular distance (handle wraparound for 0/360)
      let angleDiff = Math.abs(normalizedAngle - dir.angle);
      if (angleDiff > 180) angleDiff = 360 - angleDiff;
      
      if (angleDiff < bestDiff) {
        bestDiff = angleDiff;
        bestDir = dir;
      }
    }
    
    // Project the mouse movement onto the nearest orthogonal direction
    // Use the full distance traveled in that direction
    const projection = dx * bestDir.vec.x + dy * bestDir.vec.y;
    
    // If projection is essentially zero (mouse moved perpendicular to best direction),
    // use the length of the movement instead
    const effectiveLength = Math.abs(projection) > 0.0005 ? Math.abs(projection) : len;
    const sign = projection >= 0 ? 1 : -1;
    
    const snappedPoint = {
      x: origin.x + bestDir.vec.x * effectiveLength * sign,
      y: origin.y + bestDir.vec.y * effectiveLength * sign,
    };
    
    return { point: snappedPoint, type: bestDir.type };
  };

  const computeWallDirectionSnap = (
    origin: Point | null,
    target: Point
  ): { point: Point; type: 'parallel' | 'perpendicular' } | null => {
    if (!snapSettings?.enabled) return null;
    if (!snapSettings.direction && !snapSettings.perpendicular) return null;
    if (!origin) return null;
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.0005) return null;
    const tolerance = Math.sin((5 * Math.PI) / 180);
    let best: { point: Point; type: 'parallel' | 'perpendicular'; score: number } | null = null;

    const evaluateAlignment = (vecX: number, vecY: number, type: 'parallel' | 'perpendicular') => {
      const cross = Math.abs(dx * vecY - dy * vecX) / len;
      if (cross <= tolerance) {
        const projection = dx * vecX + dy * vecY;
        if (Math.abs(projection) < 0.0005) return;
        const snappedPoint = {
          x: origin.x + vecX * projection,
          y: origin.y + vecY * projection,
        };
        if (!best || cross < best.score) {
          best = { point: snappedPoint, type, score: cross };
        }
      }
    };

    shapes.forEach((shape) => {
      if (shape.type !== 'wall' || shape.centerline.length < 2) return;
      const start = shape.centerline[0];
      const end = shape.centerline[shape.centerline.length - 1];
      const vx = end.x - start.x;
      const vy = end.y - start.y;
      const vLen = Math.hypot(vx, vy);
      if (vLen < 0.0005) return;
      const ux = vx / vLen;
      const uy = vy / vLen;

      if (snapSettings.direction) {
        evaluateAlignment(ux, uy, 'parallel');
      }
      if (snapSettings.perpendicular) {
        evaluateAlignment(-uy, ux, 'perpendicular');
      }
    });

    return best;
  };

  const clearAutoAlignmentContext = () => {
    wallAttachContextRef.current = null;
    autoAlignmentRef.current = null;
  };

  const updateAutoAlignment = (origin: Point | null, target: Point) => {
    const attachInfo = wallAttachContextRef.current;
    if (!attachInfo?.faceNormal) {
      return;
    }
    if (!origin) {
      return;
    }
    if (!wallOptions?.alignment || wallOptions.alignment === 'center') {
      return;
    }
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.0005) {
      return;
    }
    const perpX = -dy / len;
    const perpY = dx / len;
    const faceNormal = attachInfo.faceNormal;
    if (!faceNormal) {
      return;
    }
    const outsideDot = faceNormal.x * -perpX + faceNormal.y * -perpY;
    const insideDot = faceNormal.x * perpX + faceNormal.y * perpY;
    const desiredAlignment: WallAlignment = outsideDot >= insideDot ? 'outside' : 'inside';
    if (autoAlignmentRef.current !== desiredAlignment) {
      controller.wallSetAlignment(desiredAlignment);
      autoAlignmentRef.current = desiredAlignment;
    }
  };

  const resolveWallPoint = (rawPoint: Point, origin: Point | null) => {
    const snapResult = findSnapPoint(rawPoint);
    let resolvedPoint = snapResult.snapped ? snapResult.point : rawPoint;
    let indicator: { point: Point; type: string } | null =
      snapResult.snapped && snapResult.snapType ? { point: snapResult.point, type: snapResult.snapType } : null;
    let activeSnap: SnapResult | null = snapResult.snapped ? snapResult : null;
    
    // When ortho mode is ON, it's a HARD constraint - always apply it first
    // Skip for rectangle mode - rectangle walls are orthogonal by definition
    // Skip for offset mode - offset walls follow the existing wall's direction
    if (snapSettings?.enabled && snapSettings.ortho && origin && wallMode !== 'rectangle' && wallMode !== 'offset') {
      const orthoSnap = computeOrthoSnap(origin, rawPoint);
      if (orthoSnap) {
        resolvedPoint = orthoSnap.point;
        indicator = { point: orthoSnap.point, type: orthoSnap.type };
        activeSnap = null;
        
        const isHorizontal = orthoSnap.type === 'ortho-horizontal';
        
        // PRECISION FIX: When ortho + grid are both enabled, snap the FREE coordinate to grid
        // This ensures orthogonal lines land on grid intersections
        if (snapSettings.grid && gridSpacing > 0) {
          if (isHorizontal) {
            // Horizontal line: Y is locked to origin.y, snap X to grid
            resolvedPoint = {
              x: Math.round(orthoSnap.point.x / gridSpacing) * gridSpacing,
              y: origin.y, // Maintain exact ortho constraint
            };
          } else {
            // Vertical line: X is locked to origin.x, snap Y to grid
            resolvedPoint = {
              x: origin.x, // Maintain exact ortho constraint
              y: Math.round(orthoSnap.point.y / gridSpacing) * gridSpacing,
            };
          }
          indicator = { point: resolvedPoint, type: 'ortho-grid' };
        }
        
        // After ortho constraint (with optional grid snap), check for higher-priority snaps
        // This allows snapping to endpoints/midpoints that happen to be on the ortho axis
        const orthoSnapResult = findSnapPoint(resolvedPoint);
        if (orthoSnapResult.snapped && orthoSnapResult.snapType && 
            orthoSnapResult.snapType !== 'nearest' && orthoSnapResult.snapType !== 'grid') {
          // Only use the snap if it's still on the ortho axis (within small tolerance)
          const snapPoint = orthoSnapResult.point;
          const tolerance = 0.001; // Small tolerance for floating point
          
          if (isHorizontal && Math.abs(snapPoint.y - origin.y) < tolerance) {
            // Snap point is on the horizontal axis
            resolvedPoint = snapPoint;
            indicator = { point: snapPoint, type: orthoSnapResult.snapType };
            activeSnap = orthoSnapResult;
          } else if (!isHorizontal && Math.abs(snapPoint.x - origin.x) < tolerance) {
            // Snap point is on the vertical axis
            resolvedPoint = snapPoint;
            indicator = { point: snapPoint, type: orthoSnapResult.snapType };
            activeSnap = orthoSnapResult;
          }
        }
        
        return { point: resolvedPoint, indicator, snapType: activeSnap?.snapType, snapMetadata: activeSnap?.snapMetadata };
      }
    }
    
    // Non-ortho mode: use original logic
    const prioritizeExisting =
      snapResult.snapped && snapResult.snapType && snapResult.snapType !== 'nearest';

    if (prioritizeExisting && snapResult.snapType) {
      indicator = { point: snapResult.point, type: snapResult.snapType };
      activeSnap = snapResult;
    } else {
      // Fall back to parallel/perpendicular snap to existing walls
      const directionSnap = computeWallDirectionSnap(origin, resolvedPoint);
      if (directionSnap) {
        resolvedPoint = directionSnap.point;
        indicator = { point: directionSnap.point, type: directionSnap.type };
        activeSnap = null;
      } else if (snapResult.snapped && snapResult.snapType) {
        indicator = { point: snapResult.point, type: snapResult.snapType };
        activeSnap = snapResult;
      } else {
        indicator = null;
        activeSnap = null;
      }
    }

    return { point: resolvedPoint, indicator, snapType: activeSnap?.snapType, snapMetadata: activeSnap?.snapMetadata };
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // Handle trim tool clicks
    if (activeTool === 'trim') {
      const rawPoint = getSVGPoint(e, svgRef);
      const snapResult = findSnapPoint(rawPoint);
      const point = snapResult.snapped ? snapResult.point : rawPoint;

      const trimState = snapshot.trimState;
      
      // If trim is already confirmed, clicking anywhere clears it
      if (trimState?.isConfirmed) {
        clearTrimState();
        setSnapIndicator(null);
        return;
      }

      // Find the closest wall to the click point
      const closestWall = findClosestWallLocal(point);
      
      if (!closestWall) {
        // No wall near the click point - clear any existing trim state
        clearTrimState();
        setSnapIndicator(null);
        return;
      }
      
      if (!trimState?.firstPoint) {
        // First click - set the first trim point on this wall
        setTrimFirstPoint(point, closestWall.id);
        if (snapResult.snapped && snapResult.snapType) {
          setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
        } else {
          setSnapIndicator({ point, type: 'nearest' });
        }
      } else if (trimState?.wallId === closestWall.id) {
        // Second click on the same wall - confirm the second trim point
        setTrimSecondPoint(point, true); // Pass true to confirm
        if (snapResult.snapped && snapResult.snapType) {
          setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
        } else {
          setSnapIndicator({ point, type: 'nearest' });
        }
      } else {
        // Clicked on a different wall - reset and start fresh
        clearTrimState();
        setTrimFirstPoint(point, closestWall.id);
        if (snapResult.snapped && snapResult.snapType) {
          setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
        } else {
          setSnapIndicator({ point, type: 'nearest' });
        }
      }
      return;
    }

    if (activeTool === 'opening') {
      const rawPoint = getSVGPoint(e, svgRef);
      const snapResult = findSnapPoint(rawPoint);
      const point = snapResult.snapped ? snapResult.point : rawPoint;

      // Single-click placement: directly insert the opening at the clicked location
      // Cancel any preview first to clean up
      if (isDrawing && currentShape && currentShape.type === 'opening') {
        openingCancel();
      }
      openingInsert(point, openingOptions);
      onOpeningPlaced?.();

      if (snapResult.snapped && snapResult.snapType) {
        setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
      } else {
        setSnapIndicator(null);
      }
      return;
    }

    if (activeTool === 'asset') {
      const rawPoint = getSVGPoint(e, svgRef);
      const snapResult = findSnapPoint(rawPoint);
      const point = snapResult.snapped ? snapResult.point : rawPoint;

      // Single-click placement: directly insert the asset at the clicked location
      if (assetOptions) {
        assetInsert(point, assetOptions);
      }

      if (snapResult.snapped && snapResult.snapType) {
        setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
      } else {
        setSnapIndicator(null);
      }
      return;
    }

    if (activeTool === 'wall') {
      const rawPoint = getSVGPoint(e, svgRef);
      const origin =
        currentShape && currentShape.type === 'wall' ? currentShape.centerline[0] : rectangleStart;
      const { point, snapType: _snapType, snapMetadata } = resolveWallPoint(rawPoint, origin);

      const shouldTrackLoop = wallMode === 'single' || wallMode === 'chain';

      if (wallMode === 'offset') {
        clearAutoAlignmentContext();
        const targetWall = findClosestWallLocal(point);
        if (targetWall) {
          const distance = Math.max(0.01, wallOptions?.offsetDistance ?? 1);
          if (targetWall.centerline.length >= 2) {
            const start = targetWall.centerline[0];
            const end = targetWall.centerline[targetWall.centerline.length - 1];
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.hypot(dx, dy);
            if (length >= 1e-6) {
              const unitPerp = { x: -dy / length, y: dx / length };
              const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
              const offsetDirectionValue =
                (point.x - midpoint.x) * unitPerp.x + (point.y - midpoint.y) * unitPerp.y;
              const offsetDirection = offsetDirectionValue >= 0 ? 'left' : 'right';
              wallOffset(targetWall.id, distance, offsetDirection, wallOptions);
            }
          }
        }
        setSnapIndicator(null);
        return;
      }

      if (wallMode === 'rectangle') {
        clearAutoAlignmentContext();
        if (!rectangleStart) {
          setRectangleSession(point, { start: point, end: point });
        } else {
          const width = Math.abs(point.x - rectangleStart.x);
          const height = Math.abs(point.y - rectangleStart.y);
          if (width > 0.0005 && height > 0.0005) {
            wallDrawRectangle(rectangleStart, point, wallOptions);
          }
          setRectangleSession(null, null);
        }
        setSnapIndicator(null);
        return;
      }

      if (!isDrawing || !currentShape || currentShape.type !== 'wall') {
        wallBegin(point, wallOptions);
        if (snapMetadata?.faceNormal) {
          wallAttachContextRef.current = snapMetadata as WallExtendedSnapMetadata;
          autoAlignmentRef.current = null;
        } else {
          clearAutoAlignmentContext();
        }
        if (shouldTrackLoop) {
          wallLoopVerticesRef.current = [point];
        } else {
          wallLoopVerticesRef.current = [];
        }
      } else {
        wallUpdate(point);
        wallCommit();
        clearAutoAlignmentContext();
        let closedLoop = false;
        const loopVertices = wallLoopVerticesRef.current;
        if (shouldTrackLoop && loopVertices.length > 0) {
          const start = loopVertices[0];
          const dx = point.x - start.x;
          const dy = point.y - start.y;
          const nearStart = Math.hypot(dx, dy) <= LOOP_CLOSE_TOLERANCE;
          const hasEnoughSegments = wallMode === 'single' || loopVertices.length >= 3;
          closedLoop = nearStart && hasEnoughSegments;
        }

        const shouldContinueChain = wallMode === 'chain' && !closedLoop;

        if (shouldTrackLoop) {
          if (shouldContinueChain) {
            wallLoopVerticesRef.current = [...loopVertices, point];
          } else {
            wallLoopVerticesRef.current = [];
          }
        }

        if (shouldContinueChain) {
          clearAutoAlignmentContext();
          wallBegin(point, wallOptions);
        } else if (closedLoop && activeTool === 'wall') {
          selectTool('select');
          commitChainSession();
        }
      }
      setSnapIndicator(null);
      return;
    }

    // Handle measure tool clicks
    if (activeTool === 'measure') {
      const rawPoint = getSVGPoint(e, svgRef);
      const snapResult = findSnapPoint(rawPoint);
      const point = snapResult.snapped ? snapResult.point : rawPoint;

      if (!isMeasuring) {
        // First click - set start point
        setMeasureStart(point);
        setMeasureEnd(point);
        setIsMeasuring(true);
      } else {
        // Second click - finalize the measurement, then reset for new measurement
        setMeasureStart(null);
        setMeasureEnd(null);
        setIsMeasuring(false);
      }

      if (snapResult.snapped && snapResult.snapType) {
        setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
      } else {
        setSnapIndicator(null);
      }
      return;
    }

    // Handle marker tool with chain mode support
    if (activeTool === 'marker') {
      const rawPoint = getSVGPoint(e, svgRef);
      const snapResult = findSnapPoint(rawPoint);
      const point = snapResult.snapped ? snapResult.point : rawPoint;
      
      // Place the marker
      click(point);
      
      // Handle chain mode
      if (drawingMode === 'chain') {
        // Update chain start to the placed marker position for next marker
        setMarkerChainStart(point);
        setMarkerChainEnd(point);
        setIsMarkerChaining(true);
      }
      
      if (snapResult.snapped && snapResult.snapType) {
        setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
      } else {
        setSnapIndicator(null);
      }
      return;
    }

    if (
      activeTool === 'line' ||
      activeTool === 'polyline' ||
      activeTool === 'curve' ||
      activeTool === 'arc' ||
      activeTool === 'circle' ||
      activeTool === 'rectangle' ||
      activeTool === 'guideline' ||
      activeTool === 'zone' ||
      activeTool === 'dimension' ||
      activeTool === 'text'
    ) {
      const rawPoint = getSVGPoint(e, svgRef);

      // For polyline and curve, pass the already-placed points as additional snap points
      const additionalPoints = (activeTool === 'polyline' && isDrawing && currentShape && currentShape.type === 'polyline')
        ? currentShape.points.slice(0, -1) // Exclude the last trailing point
        : (activeTool === 'curve' && isDrawing && currentShape && currentShape.type === 'curve')
          ? currentShape.points.slice(0, -1) // Exclude the last trailing point
          : undefined;

      const customSnapPoints = getArcSemicircleSnapPoints();
      const snapResult = findSnapPoint(rawPoint, undefined, additionalPoints, customSnapPoints);
      const point = snapResult.snapped ? snapResult.point : rawPoint;
      click(point);

      // Clear snap indicator after click
      setSnapIndicator(null);
    }
  };

  const rafId = useRef<number | null>(null);
  const pendingMousePositionRef = useRef<Point | null>(null); // Track latest mouse position to avoid dropping events
  const hasDragged = useRef(false);
  const clickedAlreadySelected = useRef(false);
  const [adjustingDimensionId, setAdjustingDimensionId] = useState<string | null>(null);

  const handleMouseDown = (e: React.MouseEvent<Element>, shapeId?: string) => {
    hasDragged.current = false;
    clickedAlreadySelected.current = false;

    // If we are adjusting a dimension, any click commits it
    if (adjustingDimensionId) {
      e.stopPropagation();
      setAdjustingDimensionId(null);
      setClickedOnShape(true); // Prevent deselection
      return;
    }

    // Allow selection when using select tool OR when clicking on existing shapes while in asset mode
    if (activeTool === 'select' || (activeTool === 'asset' && shapeId)) {
      if (shapeId) {
        e.stopPropagation();
        
        // Check if clicking on a disabled zone - don't allow selection
        const clickedShapeCheck = shapes.find(s => s.id === shapeId);
        if (clickedShapeCheck?.type === 'zone' && clickedShapeCheck.disabled) {
          return; // Don't select disabled zones
        }
        
        const isMultiSelectionTarget = shapeId === MULTI_SELECT_ID;
        if (isMultiSelectionTarget || shapeId !== selectedShapeId) {
          setClickedOnShape(true);
        } else {
          // Already selected
          clickedAlreadySelected.current = true;
          // Still set clickedOnShape to prevent background deselect
          setClickedOnShape(true);
        }

        // Special handling for dimensions: Click to start moving
        const clickedShape = shapes.find(s => s.id === shapeId);
        if (clickedShape?.type === 'dimension' && !isMultiSelectionTarget) {
          setAdjustingDimensionId(shapeId);
          setPrimarySelection(shapeId);
          return; // Don't start standard drag
        }

        // Special handling for text resize: Detect corner handle clicks
        if (shapeId.includes('-resize-')) {
          // Parse ID format: ${shapeId}-resize-${corner}
          // Use regex to safely extract the parts
          const match = shapeId.match(/(.*)-resize-(tl|tr|bl|br)$/);
          if (!match) return;

          const actualShapeId = match[1];
          const corner = match[2];

          const textShape = shapes.find(s => s.id === actualShapeId);

          if (textShape?.type === 'text') {
            // Store the current text properties for resize calculation
            const estimatedWidth = textShape.content.length * textShape.fontSize * 0.6;
            const estimatedHeight = textShape.fontSize * 1.2;

            setTextResizeInitial({
              width: estimatedWidth,
              height: estimatedHeight,
              fontSize: textShape.fontSize,
              position: textShape.position, // Store the text anchor, not bbox
              textAlign: textShape.textAlign, // Store alignment for reconstruction
            });
            setIsResizingText(true);
            setTextResizeCorner(corner as 'tl' | 'tr' | 'bl' | 'br');
            setClickedOnShape(true);
            setPrimarySelection(actualShapeId);
            beginHistoryBatch(historySources.resizeText);
            return; // Don't start standard drag
          }
        }

        dragAxisRef.current = null;
        setIsDragging(true);
        setDragStart(getSVGPoint(e as React.MouseEvent<SVGSVGElement>, svgRef));
        setSnapIndicator(null);
        if (!isMultiSelectionTarget) {
          // Handle Shift+Click or Ctrl/Cmd+Click for multi-selection (standard CAD convention)
          const isMultiSelectModifier = e.shiftKey || e.ctrlKey || e.metaKey;
          if (isMultiSelectModifier) {
            // Get current selection
            const currentSelection = selectedShapeIds.length > 0 ? selectedShapeIds : (selectedShapeId ? [selectedShapeId] : []);
            const isAlreadySelected = currentSelection.includes(shapeId);
            
            if (isAlreadySelected) {
              // Remove from selection (toggle off)
              const newSelection = currentSelection.filter(id => id !== shapeId);
              if (newSelection.length === 0) {
                setPrimarySelection(null);
                setMultiSelection([]);
                setMultiSelectViaBox(false);
              } else if (newSelection.length === 1) {
                setPrimarySelection(newSelection[0]);
                setMultiSelectViaBox(false);
              } else {
                setMultiSelection(newSelection);
                setMultiSelectViaBox(false); // Click-based selection, no bounding box
              }
            } else {
              // Add to selection
              const newSelection = [...currentSelection, shapeId];
              setMultiSelection(newSelection);
              setMultiSelectViaBox(false); // Click-based selection, no bounding box
            }
          } else {
            // Normal click - single selection
            setPrimarySelection(shapeId);
            setMultiSelectViaBox(false);
          }
        }
      } else {
        // Clicking on empty canvas - start selection rectangle
        const point = getSVGPoint(e as React.MouseEvent<SVGSVGElement>, svgRef);
        setIsSelecting(true);
        setSelectionRect({ start: point, end: point });
        setClickedOnShape(false);
      }
    } else if (activeTool === 'wall') {
      // ... existing wall logic ...
      const rawPoint = getSVGPoint(e as React.MouseEvent<SVGSVGElement>, svgRef);
      // Use centerline[0] (the START point) as origin for ortho constraint
      const { point } = resolveWallPoint(rawPoint, isDrawing && currentShape && currentShape.type === 'wall' ? currentShape.centerline[0] : null);

      if (wallMode === 'rectangle') {
        // ... existing rectangle logic ...
        if (!rectangleStart) {
          setRectangleSession(point, { start: point, end: point });
        } else {
          wallDrawRectangle(rectangleStart, point, wallOptions);
          setRectangleSession(null, null);
        }
      } else {
        if (!isDrawing) {
          wallBegin(point, wallOptions);
        } else {
          wallUpdate(point);
          if (wallMode === 'single') {
            wallCommit();
          }
        }
      }
    } else if (activeTool === 'opening') {
      // Handled by handleClick for now, but could move here
    } else if (activeTool === 'text') {
      // Check for resize handle clicks during text creation
      if (shapeId?.includes('-resize-') && currentShape?.type === 'text') {
        const match = shapeId.match(/(.*)-resize-(tl|tr|bl|br)$/);
        if (match && match[1] === currentShape.id) {
          e.stopPropagation();
          const corner = match[2];

          // Store current text properties for resize
          const estimatedWidth = currentShape.content.length * currentShape.fontSize * 0.6;
          const estimatedHeight = currentShape.fontSize * 1.2;

          setTextResizeInitial({
            width: estimatedWidth,
            height: estimatedHeight,
            fontSize: currentShape.fontSize,
            position: currentShape.position,
            textAlign: currentShape.textAlign,
          });
          setIsResizingText(true);
          setTextResizeCorner(corner as 'tl' | 'tr' | 'bl' | 'br');
          setClickedOnShape(true);
          // Note: we don't setPrimarySelection for currentShape since it's not in shapes array
          beginHistoryBatch(historySources.resizeText);
          return;
        }
      }

      // Allow dragging the current text shape being edited
      if (currentShape && shapeId === currentShape.id) {
        e.stopPropagation();
        dragAxisRef.current = null;
        setIsDragging(true);
        setDragStart(getSVGPoint(e as React.MouseEvent<SVGSVGElement>, svgRef));
        setSnapIndicator(null);
        // We don't set primarySelection because currentShape is not in shapes array yet
        return;
      }

      // Otherwise, place new text
      const rawPoint = getSVGPoint(e as React.MouseEvent<SVGSVGElement>, svgRef);
      const snapResult = findSnapPoint(rawPoint);
      const point = snapResult.snapped ? snapResult.point : rawPoint;
      click(point);
    } else {
      // Generic tool click
      const rawPoint = getSVGPoint(e as React.MouseEvent<SVGSVGElement>, svgRef);
      const snapResult = findSnapPoint(rawPoint);
      const point = snapResult.snapped ? snapResult.point : rawPoint;
      click(point);
    }
  };

  const handleResizeStart = (e: React.MouseEvent<SVGElement>, shapeId: string | undefined, handle: 'start' | 'end') => {
    e.stopPropagation();
    if (shapeId && shapeId !== MULTI_SELECT_ID) {
      setPrimarySelection(shapeId);
    }
    setIsResizing(true);
    setResizeHandle(handle);
    setClickedOnShape(true);
  };

  const handlePolylineCornerResizeStart = (e: React.MouseEvent<SVGElement>, shapeId: string | undefined, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    e.stopPropagation();
    if (shapeId && shapeId !== MULTI_SELECT_ID) {
      setPrimarySelection(shapeId);
    }
    setIsResizingPolylineCorner(true);
    setPolylineCorner(corner);
    setClickedOnShape(true);
  };

  const handleRectangleEdgeResizeStart = (e: React.MouseEvent<SVGElement>, shapeId: string | undefined, edge: 'top' | 'right' | 'bottom' | 'left') => {
    e.stopPropagation();
    if (shapeId && shapeId !== MULTI_SELECT_ID) {
      setPrimarySelection(shapeId);
    }
    setIsResizingRectangleEdge(true);
    setRectangleEdge(edge);
    setClickedOnShape(true);
  };

  const handleRoomCornerResizeStart = (e: React.MouseEvent<SVGElement>, shapeId: string | undefined, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    e.stopPropagation();
    if (shapeId && shapeId !== MULTI_SELECT_ID) {
      setPrimarySelection(shapeId);
    }
    setIsResizingRoomCorner(true);
    setRoomCorner(corner);
    setClickedOnShape(true);
  };

  const handleWallCurveHandleStart = (e: React.MouseEvent<SVGElement>, shapeId: string | undefined) => {
    e.stopPropagation();
    if (!shapeId || shapeId === MULTI_SELECT_ID) {
      return;
    }
    setPrimarySelection(shapeId);
    setIsCurvingWall(true);
    setCurvingWallId(shapeId);
    setClickedOnShape(true);
  };

  const handleRotateHandleStart = (e: React.MouseEvent<SVGElement>, pivot: Point) => {
    e.stopPropagation();
    setClickedOnShape(true);
    const rawPoint = getSVGPoint(e as React.MouseEvent<SVGSVGElement>, svgRef);
    const initialAngle = Math.atan2(rawPoint.y - pivot.y, rawPoint.x - pivot.x);
    
    // For single asset selection, initialize rotation from the asset's current rotation
    let baseRotation = selectionRotationRef.current;
    if (selectedShapeId && selectedShapeIds.length <= 1) {
      const selectedShape = shapes.find(s => s.id === selectedShapeId);
      if (selectedShape && selectedShape.type === 'asset' && 'rotation' in selectedShape) {
        baseRotation = selectedShape.rotation || 0;
        selectionRotationRef.current = baseRotation;
      }
    }
    
    selectionRotationStartRef.current = baseRotation;
    rotationStateRef.current = {
      pivot,
      lastAngle: initialAngle,
      totalAngle: 0,
      baseOrientation: selectionRotationStartRef.current,
    };
    setIsRotating(true);
    beginHistoryBatch(historySources.rotateSelection);
    setRotationPreview({
      pivot,
      absoluteAngle: selectionRotationStartRef.current,
      deltaAngle: 0,
      snappedAngle: null,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rawPoint = getSVGPoint(e, svgRef);
    
    // Store the latest mouse position to avoid dropping events during RAF throttling
    pendingMousePositionRef.current = rawPoint;

    // Keep hover strictly tied to the element under the cursor (data-shape-id)
    const targetElement = e.target as Element | null;
    const targetShapeId = targetElement?.closest?.('[data-shape-id]')?.getAttribute('data-shape-id') ?? null;
    if (hoveredShapeId !== targetShapeId) {
      setHoveredShapeId(targetShapeId);
    }

    if (isDragging) {
      hasDragged.current = true;
    }

    if (rafId.current) return;

    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      
      // Use the most recent mouse position (may differ from rawPoint if events were dropped)
      const currentPoint = pendingMousePositionRef.current;
      if (!currentPoint) return;

      // Keep controller cursor in sync for overlays (drawing, resizing, editing)
      updateCursor(currentPoint);

      const customSnapPoints = getArcSemicircleSnapPoints();

        if (isRotating && rotationStateRef.current) {
          hasDragged.current = true;
          const { pivot, lastAngle, totalAngle, baseOrientation } = rotationStateRef.current;
          const angle = Math.atan2(currentPoint.y - pivot.y, currentPoint.x - pivot.x);
          let delta = angle - lastAngle;
          if (delta > Math.PI) {
            delta -= Math.PI * 2;
          } else if (delta < -Math.PI) {
            delta += Math.PI * 2;
          }
          const deltaDegrees = (delta * 180) / Math.PI;
          if (Math.abs(deltaDegrees) > 0.01) {
            const nextTotal = totalAngle + deltaDegrees;
            let absoluteAngle = baseOrientation + nextTotal;
            
            // Normalize to -180 to 180
            while (absoluteAngle > 180) absoluteAngle -= 360;
            while (absoluteAngle < -180) absoluteAngle += 360;
            
            // Snap angles: quadrants (0, 90, 180, -90) and 45-degree increments
            const SNAP_ANGLES = [0, 45, 90, 135, 180, -135, -90, -45];
            const SNAP_THRESHOLD = 5; // degrees - auto-snap when within 5 degrees
            
            let snappedAngle: number | null = null;
            let effectiveAngle = absoluteAngle;
            
            // Check for nearby snap angles and AUTO-SNAP (no Shift key needed)
            for (const snapAngle of SNAP_ANGLES) {
              if (Math.abs(absoluteAngle - snapAngle) <= SNAP_THRESHOLD) {
                snappedAngle = snapAngle;
                effectiveAngle = snapAngle; // Auto-snap!
                break;
              }
            }
            
            // Calculate actual delta to apply
            const actualDelta = deltaDegrees + (snappedAngle !== null ? (snappedAngle - absoluteAngle) : 0);
            
            controller.rotateSelection(actualDelta, pivot);
            
            const actualNextTotal = totalAngle + actualDelta;
            
            setRotationPreview({
              pivot,
              absoluteAngle: effectiveAngle,
              deltaAngle: actualNextTotal,
              snappedAngle: snappedAngle,
            });
            rotationStateRef.current = { pivot, lastAngle: angle, totalAngle: actualNextTotal, baseOrientation };
          }
          setSnapIndicator(null);
          return;
        }

      if (adjustingDimensionId) {
        // Update dimension offset to follow cursor
        controller.setDimensionOffset(adjustingDimensionId, currentPoint);
        return;
      }

      if (activeTool === 'opening') {
        const snapResult = findSnapPoint(currentPoint);
        const point = snapResult.snapped ? snapResult.point : currentPoint;

        // Show preview following cursor when tool is active (even if not drawing)
        // This gives immediate visual feedback before clicking
        // ONLY if a category is selected
        if (openingOptions?.category) {
          if (!isDrawing || !currentShape || currentShape.type !== 'opening') {
            // Create or recreate preview by beginning placement
            openingBegin(point, openingOptions);
          } else {
            // Update existing preview position
            openingUpdate(point);
          }
        }

        if (snapResult.snapped && snapResult.snapType) {
          setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
        } else {
          setSnapIndicator(null);
        }
        return;
      }

      // Handle measure tool mouse move - update end point while measuring
      if (activeTool === 'measure' && isMeasuring && measureStart) {
        const snapResult = findSnapPoint(currentPoint);
        const point = snapResult.snapped ? snapResult.point : currentPoint;
        setMeasureEnd(point);

        if (snapResult.snapped && snapResult.snapType) {
          setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
        } else {
          setSnapIndicator(null);
        }
        return;
      }

      // Handle marker chain mode - update end point while chaining
      if (activeTool === 'marker' && drawingMode === 'chain' && isMarkerChaining && markerChainStart) {
        const snapResult = findSnapPoint(currentPoint);
        const point = snapResult.snapped ? snapResult.point : currentPoint;
        setMarkerChainEnd(point);

        if (snapResult.snapped && snapResult.snapType) {
          setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
        } else {
          setSnapIndicator(null);
        }
        return;
      }

      // Handle trim tool mouse move - update second point and highlight in real-time
      if (activeTool === 'trim' && snapshot.trimState?.firstPoint && snapshot.trimState?.wallId) {
        const snapResult = findSnapPoint(currentPoint);
        const point = snapResult.snapped ? snapResult.point : currentPoint;
        
        // Update the second point to show the highlight segment as user moves mouse
        setTrimSecondPoint(point);

        if (snapResult.snapped && snapResult.snapType) {
          setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
        } else {
          setSnapIndicator(null);
        }
        return;
      }

      if (isDragging && dragStart) {
        const delta = {
          x: currentPoint.x - dragStart.x,
          y: currentPoint.y - dragStart.y,
        };

        if (activeTool === 'text' && currentShape) {
          controller.moveCurrentShape(delta);
          setAlignmentGuides([]);
        } else if (selectedShapeId) {
          const constrainedDelta = applyWallLockConstraint(delta);
          if (constrainedDelta.x || constrainedDelta.y) {
            // Apply alignment guides snapping
            const { delta: snappedDelta, guides } = applyAlignmentSnap(
              selectedShapeId,
              dragStart,
              constrainedDelta
            );
            
            // Update alignment guides display
            setAlignmentGuides(guides);
            
            // Move with the snapped delta
            moveSelection(snappedDelta);
          }
        }
        setDragStart(currentPoint);
        setSnapIndicator(null);
        return;
      }

      if (isSelecting && selectionRect) {
        // Update selection rectangle
        setSelectionRect({
          ...selectionRect,
          end: currentPoint,
        });
        return;
      }

      if (isResizing && resizeHandle) {
        const snapResult = findSnapPoint(currentPoint, selectedShapeId || undefined, undefined, customSnapPoints);
        const point = snapResult.snapped ? snapResult.point : currentPoint;
        beginHistoryBatch(historySources.resizeLine);
        const selectedShape = shapes.find((shape) => shape.id === selectedShapeId);
        if (selectedShape?.type === 'wall') {
          resizeWallHandle(point, resizeHandle);
        } else if (selectedShape?.type === 'opening') {
          resizeOpeningHandle(point, resizeHandle);
        } else {
          resizeLineHandle(point, resizeHandle);
        }

        // Show snap indicator
        if (snapResult.snapped && snapResult.snapType) {
          setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
        } else {
          setSnapIndicator(null);
        }
      } else if (isResizingPolylineCorner && polylineCorner) {
        const snapResult = findSnapPoint(currentPoint, selectedShapeId || undefined, undefined, customSnapPoints);
        const point = snapResult.snapped ? snapResult.point : currentPoint;
        beginHistoryBatch(historySources.resizePolylineCorner);
        resizePolylineCorner(point, polylineCorner);

        // Show snap indicator
        if (snapResult.snapped && snapResult.snapType) {
          setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
        } else {
          setSnapIndicator(null);
        }
      } else if (isResizingRectangleEdge && rectangleEdge) {
        const snapResult = findSnapPoint(currentPoint, selectedShapeId || undefined, undefined, customSnapPoints);
        const point = snapResult.snapped ? snapResult.point : currentPoint;
        beginHistoryBatch(historySources.resizeRectangleEdge);
        resizeRectangleEdge(point, rectangleEdge);

        // Show snap indicator
        if (snapResult.snapped && snapResult.snapType) {
          setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
        } else {
          setSnapIndicator(null);
        }
      } else if (isResizingRoomCorner && roomCorner) {
        const snapResult = findSnapPoint(currentPoint, selectedShapeId || undefined, undefined, customSnapPoints);
        const point = snapResult.snapped ? snapResult.point : currentPoint;
        beginHistoryBatch(historySources.resizeRoomCorner);
        resizeRoomCorner(point, roomCorner);
        if (snapResult.snapped && snapResult.snapType) {
          setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
        } else {
          setSnapIndicator(null);
        }
      } else if (isResizingText && textResizeCorner && textResizeInitial) {
        // Handle text resize for both currentShape (during creation) and existing shapes
        const textShape = selectedShapeId
          ? shapes.find(s => s.id === selectedShapeId)
          : currentShape;

        if (textShape?.type === 'text') {
          const { width: initialWidth, height: initialHeight, fontSize: initialFontSize, position: initialAnchor, textAlign } = textResizeInitial;

          // Step 1: Calculate initial bounding box from anchor and alignment
          let initialBBoxX = initialAnchor.x;
          if (textAlign === 'center') {
            initialBBoxX -= (initialWidth / 2);
          } else if (textAlign === 'right') {
            initialBBoxX -= initialWidth;
          }
          const initialBBoxY = initialAnchor.y - initialFontSize * 0.7;

          // Step 2: Calculate new bounding box dimensions based on drag
          let newBBoxX = initialBBoxX;
          let newBBoxY = initialBBoxY;
          let newBBoxWidth = initialWidth;
          let newBBoxHeight = initialHeight;

          switch (textResizeCorner) {
            case 'br': // Bottom-right: simple case, just extend from top-left
              newBBoxWidth = currentPoint.x - initialBBoxX;
              newBBoxHeight = currentPoint.y - initialBBoxY;
              break;
            case 'bl': // Bottom-left: adjust X, extend Y
              newBBoxWidth = (initialBBoxX + initialWidth) - currentPoint.x;
              newBBoxHeight = currentPoint.y - initialBBoxY;
              newBBoxX = currentPoint.x;
              break;
            case 'tr': // Top-right: extend X, adjust Y
              newBBoxWidth = currentPoint.x - initialBBoxX;
              newBBoxHeight = (initialBBoxY + initialHeight) - currentPoint.y;
              newBBoxY = currentPoint.y;
              break;
            case 'tl': // Top-left: adjust both X and Y
              newBBoxWidth = (initialBBoxX + initialWidth) - currentPoint.x;
              newBBoxHeight = (initialBBoxY + initialHeight) - currentPoint.y;
              newBBoxX = currentPoint.x;
              newBBoxY = currentPoint.y;
              break;
          }

          // Step 3: Calculate scale and new font size
          const widthScale = Math.max(newBBoxWidth / initialWidth, 0.1);
          const heightScale = Math.max(newBBoxHeight / initialHeight, 0.1);
          const scale = (widthScale + heightScale) / 2;
          let newFontSize = initialFontSize * scale;
          newFontSize = Math.max(0.1, Math.min(2.0, newFontSize));

          // Step 4: Calculate actual dimensions with the new font size
          const actualWidth = textShape.content.length * newFontSize * 0.6;
          const actualHeight = newFontSize * 1.2;

          // Step 5: Keep the resized corner fixed by adjusting bbox
          // If we're dragging a left corner and size changed, adjust X
          if (textResizeCorner === 'tl' || textResizeCorner === 'bl') {
            newBBoxX = (initialBBoxX + initialWidth) - actualWidth;
          }
          // If we're dragging a top corner and size changed, adjust Y
          if (textResizeCorner === 'tl' || textResizeCorner === 'tr') {
            newBBoxY = (initialBBoxY + initialHeight) - actualHeight;
          }

          // Step 6: Calculate new anchor from new bbox and alignment
          let newAnchorX = newBBoxX;
          if (textAlign === 'center') {
            newAnchorX += actualWidth / 2;
          } else if (textAlign === 'right') {
            newAnchorX += actualWidth;
          }
          const newAnchorY = newBBoxY + newFontSize * 0.7;

          // Step 7: Update the text shape
          beginHistoryBatch(historySources.resizeText);
          if (selectedShapeId) {
            // Update existing shape
            controller.resizeText(selectedShapeId, newFontSize, { x: newAnchorX, y: newAnchorY });
          } else if (currentShape) {
            // Update currentShape during creation using dedicated resize method
            controller.resizeCurrentText(newFontSize, { x: newAnchorX, y: newAnchorY });
          }
        }
      } else if (isCurvingWall && curvingWallId) {
        const snapResult = findSnapPoint(currentPoint, curvingWallId, undefined, customSnapPoints);
        const point = snapResult.snapped ? snapResult.point : currentPoint;
        beginHistoryBatch(historySources.curveWall);
        setWallControlPoint(point);

        if (snapResult.snapped && snapResult.snapType) {
          setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
        } else {
          setSnapIndicator(null);
        }
      } else if (activeTool === 'wall' && wallMode === 'rectangle' && rectangleStart) {
        // Rectangle wall preview - needs to update even when not in standard "drawing" mode
        const { point, indicator } = resolveWallPoint(currentPoint, rectangleStart);
        setRectangleSession(rectangleStart, { start: rectangleStart, end: point });
        setSnapIndicator(indicator);
      } else if (isDrawing) {
        // Drawing preview logic
        if (activeTool === 'wall') {
          // IMPORTANT: Use the START point of the wall (centerline[0]) as origin for ortho constraint
          // The start point is where the wall began, and we constrain the end point relative to it
          const origin = currentShape && currentShape.type === 'wall' && currentShape.centerline.length > 0 
            ? currentShape.centerline[0] 
            : null;
        const { point, indicator } = resolveWallPoint(currentPoint, origin);

          if (wallMode === 'rectangle') {
            if (rectangleStart) {
              setRectangleSession(rectangleStart, { start: rectangleStart, end: point });
            }
          } else {
            wallUpdate(point);
          updateAutoAlignment(origin, point);
          }
          setSnapIndicator(indicator);
        } else {
          // For polyline and curve, pass the already-placed points as additional snap points
          const additionalPoints = (activeTool === 'polyline' && currentShape && currentShape.type === 'polyline')
            ? currentShape.points.slice(0, -1) // Exclude the last trailing point
            : (activeTool === 'curve' && currentShape && currentShape.type === 'curve')
              ? currentShape.points.slice(0, -1) // Exclude the last trailing point
              : (activeTool === 'zone' && currentShape && currentShape.type === 'zone')
                ? currentShape.points.slice(0, -1)
                : undefined;

          const snapResult = findSnapPoint(currentPoint, undefined, additionalPoints, customSnapPoints);
          const point = snapResult.snapped ? snapResult.point : currentPoint;
          updateCursor(point);
          if (snapResult.snapped && snapResult.snapType) {
            setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
          } else {
            setSnapIndicator(null);
          }
        }
      } else {
        // Just hovering
        const snapResult = findSnapPoint(currentPoint, undefined, undefined, customSnapPoints);
        const point = snapResult.snapped ? snapResult.point : currentPoint;

        if (activeTool === 'guideline') {
          updateCursor(point);
        }

        if (snapResult.snapped && snapResult.snapType) {
          setSnapIndicator({ point: snapResult.point, type: snapResult.snapType });
        } else {
          setSnapIndicator(null);
        }
      }
    });
  };

  const handleMouseUp = () => {
    const wasDragging = isDragging;
    const wasResizing = isResizing;
    const wasPolylineResize = isResizingPolylineCorner;
    const wasRectangleResize = isResizingRectangleEdge;
    const wasRoomCornerResize = isResizingRoomCorner;
    const wasResizingText = isResizingText;
    const wasCurvingWall = isCurvingWall;
    const wasRotating = isRotating;

    if (wasDragging) {
      setIsDragging(false);
      setDragStart(null);
      dragAxisRef.current = null;

      // Clear alignment guides when drag ends
      setAlignmentGuides([]);

      // Check for click-to-deselect
      if (!hasDragged.current && clickedAlreadySelected.current) {
        setPrimarySelection(null);
      }
    }
    if (wasResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setSnapIndicator(null);
    }
    if (wasPolylineResize) {
      setIsResizingPolylineCorner(false);
      setPolylineCorner(null);
      setSnapIndicator(null);
    }
    if (wasRectangleResize) {
      setIsResizingRectangleEdge(false);
      setRectangleEdge(null);
      setSnapIndicator(null);
    }
    if (wasRoomCornerResize) {
      setIsResizingRoomCorner(false);
      setRoomCorner(null);
      setSnapIndicator(null);
    }
    if (wasResizingText) {
      setIsResizingText(false);
      setTextResizeCorner(null);
      setTextResizeInitial(null);
      commitHistoryBatch();
    }
    if (wasCurvingWall) {
      setIsCurvingWall(false);
      setCurvingWallId(null);
      setSnapIndicator(null);
    }
    if (wasRotating) {
      setIsRotating(false);
      if (rotationStateRef.current) {
        selectionRotationRef.current =
          rotationStateRef.current.baseOrientation + rotationStateRef.current.totalAngle;
      }
      rotationStateRef.current = null;
      setRotationPreview(null);
      setSnapIndicator(null);
    }
    if (isSelecting && selectionRect) {
      // Find all shapes that intersect with the selection rectangle
      // Exclude disabled zones from box selection
      const selectedIds = shapes
        .filter((shape: Shape) => {
          // Skip disabled zones
          if (shape.type === 'zone' && shape.disabled) {
            return false;
          }
          return isShapeIntersectingRect(shape, selectionRect);
        })
        .map((shape: Shape) => shape.id);

      // Select the shapes
      if (selectedIds.length > 0) {
        setMultiSelection(selectedIds);
        setMultiSelectViaBox(true); // Mark as box selection to show consolidated bounding box
        setClickedOnShape(true); // Prevent deselection on canvas click
      }

      // Clear selection rectangle
      setIsSelecting(false);
      setSelectionRect(null);
    }

    if (wasDragging || wasResizing || wasPolylineResize || wasRectangleResize || wasRoomCornerResize || wasCurvingWall || wasRotating) {
      commitHistoryBatch();
    }
  };

  const handleCanvasClick = () => {
    // Only deselect if we clicked on empty canvas (not on a shape)
    if (activeTool === 'select' && !clickedOnShape) {
      setPrimarySelection(null);
      setMultiSelection([]); // Also clear multi-selection
    }
    // Reset the flag for next click
    setClickedOnShape(false);
  };

  return {
    isDragging,
    isResizing,
    isResizingPolylineCorner,
    isResizingRectangleEdge,
    isResizingRoomCorner,
    isResizingText,
    hoveredShapeId,
    setHoveredShapeId,
    handleClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleCanvasClick,
    handleResizeStart,
    handlePolylineCornerResizeStart,
    handleRectangleEdgeResizeStart,
    handleRoomCornerResizeStart,
    handleWallCurveHandleStart,
    handleRotateHandleStart,
    selectionRect,
    isSelecting,
    rotationPreview,
    isCurvingWall,
    curvingWallId,
    rectanglePreview,
    // Measure tool state
    measureStart,
    measureEnd,
    isMeasuring,
    // Marker chain mode state
    markerChainStart,
    markerChainEnd,
    isMarkerChaining,
    // Multi-select method tracking
    multiSelectViaBox,
    // Alignment guides for smart snapping
    alignmentGuides,
  };
};
