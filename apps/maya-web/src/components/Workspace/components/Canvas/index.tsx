/**
 * Canvas Component (Refactored)
 * 
 * Main SVG canvas for rendering shapes and handling interactions.
 * Uses memoized layer components for efficient rendering.
 * 
 * Performance optimizations:
 * - Each layer is memoized and only re-renders when its specific dependencies change
 * - Viewport culling for shapes outside the visible area
 * - Web worker for heavy wall geometry calculations
 */

import { useMemo, useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import type {
  ViewBox,
  GridSystem,
  Shape,
  Point,
  LengthUnit,
  SnapSettings,
  WallShape,
  WallDrawingMode,
  OpeningShape,
  ToolbarStyle,
  MeasurementSettings,
  ImageShape as ImageShapeType,
} from '../../types';
import type { OpeningPlacementOptions, WallCreationOptions, AssetPlacementOptions } from '@maya/workspace-domain/workspace';
import { CUSTOM_CURSOR, CURSOR_HOTSPOT } from '../../constants';
import { getVisibleShapes } from '../../utils/viewportCulling';
import { useCanvasInteraction } from './useCanvasInteraction';
import { useOptimizedSnapping } from '../../hooks/useOptimizedSnapping';
import { useOptimizedWallGeometry } from '../../hooks/useOptimizedWallGeometry';
import { getSeamCovers, findConnectedWalls } from '../../utils/walls';
import { getPerformanceAdjustedFlags } from '../../../../config/featureFlags';
import { useWorkspaceControllerContext } from '../../context/WorkspaceControllerContext';
import { AppearanceRenderer } from './AppearanceRenderer';
import { DimensionCollectorProvider } from './dimensions/DimensionContext';

// Import layer components
import {
  GridLayer,
  WallGeometryLayer,
  TrimVisualizationLayer,
  ShapesLayer,
  CurrentShapeLayer,
  BoundingBoxLayer,
  SnapIndicatorLayer,
  MeasureOverlay,
  MarkerChainOverlay,
  SelectionRectLayer,
  TraceImagesLayer,
  RectanglePreviewLayer,
  AlignmentGuidesLayer,
} from './layers';
import { CanvasErrorBoundary } from '../../../ErrorBoundary';

interface CanvasProps {
  svgRef: RefObject<SVGSVGElement>;
  viewBox: ViewBox;
  showGrid: boolean;
  gridSystem: GridSystem;
  lengthUnit: LengthUnit;
  snapSettings?: SnapSettings;
  showMeasurements?: boolean;
  measurementSettings?: MeasurementSettings;
  wallOptions?: WallCreationOptions & { offsetDistance?: number };
  wallMode?: WallDrawingMode;
  openingOptions?: OpeningPlacementOptions;
  assetOptions?: AssetPlacementOptions;
  showWallCenterline?: boolean;
  zoneHoverEnabled?: boolean;
  showMarkers?: boolean;
  alignmentGuidesEnabled?: boolean;
  onRoomLabelEditRequest?: (roomId: string) => void;
  onOpeningPlaced?: () => void;
  onZoneInteract?: () => void;
  toolbarStyle?: ToolbarStyle;
  simulationOverlay?: React.ReactNode;
  calibrationMode?: {
    active: boolean;
    imageId: string | null;
    point1: Point | null;
    point2: Point | null;
  };
  onCalibrationClick?: (canvasPoint: Point, imageId: string) => void;
  onInteractionStateChange?: (state: { isResizingAny: boolean }) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  svgRef,
  viewBox,
  showGrid,
  gridSystem,
  lengthUnit,
  snapSettings,
  showMeasurements = true,
  measurementSettings,
  wallOptions,
  wallMode = 'single',
  openingOptions,
  assetOptions,
  showWallCenterline = true,
  zoneHoverEnabled = true,
  showMarkers = true,
  alignmentGuidesEnabled = true,
  onRoomLabelEditRequest,
  onOpeningPlaced,
  onZoneInteract,
  toolbarStyle = 'modern',
  simulationOverlay,
  calibrationMode,
  onCalibrationClick,
  onInteractionStateChange,
}) => {
  const isWindows95 = toolbarStyle === 'windows95';
  const isFunk = toolbarStyle === 'funk';
  const isCyber = toolbarStyle === 'cyber';
  const isClean = toolbarStyle === 'clean';

  // Local state
  const [snapIndicator, setSnapIndicator] = useState<{ point: Point; type: string } | null>(null);
  const [hoveredInteriorIndex, setHoveredInteriorIndex] = useState<number | null>(null);
  const [flashingInteriors, setFlashingInteriors] = useState<Set<number>>(new Set());
  const prevInnerPolygonCountRef = useRef<number>(-1);

  // Controller context
  const controller = useWorkspaceControllerContext();

  // Subscribe to controller state changes
  useSyncExternalStore(
    controller.subscribe,
    () => controller.snapshot,
    () => controller.snapshot
  );

  const { snapshot } = controller;
  const {
    activeTool,
    shapes,
    currentShape,
    isDrawing,
    selectedShapeId,
    selectedShapeIds,
    chainSessionShapeIds,
    drawingMode,
  } = snapshot;

  // Calculated values
  const extension = useMemo(() => Math.max(viewBox.width, viewBox.height) * 2, [viewBox.width, viewBox.height]);
  const baseViewBoxWidth = 10;
  const zoomScale = viewBox.width / baseViewBoxWidth;

  // Separate trace images from other shapes
  const traceImages = useMemo(() => {
    return shapes.filter((s): s is ImageShapeType =>
      s.type === 'image' && Boolean(s.id) && Boolean((s as ImageShapeType).src)
    );
  }, [shapes]);

  // Snapping hook
  const { findSnapPoint } = useOptimizedSnapping(shapes, snapSettings, gridSystem.minor, zoomScale);

  // Canvas interaction hook
  const {
    hoveredShapeId,
    setHoveredShapeId,
    isDragging,
    isResizing,
    isResizingPolylineCorner,
    isResizingRectangleEdge,
    isResizingRoomCorner,
    isResizingText,
    isCurvingWall,
    curvingWallId,
    rectanglePreview,
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
    rotationPreview,
    selectionRect,
    isSelecting,
    measureStart,
    measureEnd,
    isMeasuring,
    markerChainStart,
    markerChainEnd,
    isMarkerChaining,
    multiSelectViaBox,
    alignmentGuides,
  } = useCanvasInteraction({
    svgRef,
    controller,
    snapshot,
    findSnapPoint,
    setSnapIndicator,
    wallOptions,
    wallMode,
    snapSettings,
    gridSpacing: gridSystem.minor,
    openingOptions,
    assetOptions,
    onOpeningPlaced,
    drawingMode,
    alignmentGuidesEnabled,
  });

  // Bubble interaction state to parent (for precision input when resizing/editing)
  useEffect(() => {
    const isResizingAny =
      isResizing ||
      isResizingPolylineCorner ||
      isResizingRectangleEdge ||
      isResizingRoomCorner ||
      isResizingText;
    onInteractionStateChange?.({ isResizingAny });
  }, [
    isResizing,
    isResizingPolylineCorner,
    isResizingRectangleEdge,
    isResizingRoomCorner,
    isResizingText,
    onInteractionStateChange,
  ]);

  // Performance flags based on shape count
  const perfFlags = useMemo(() => getPerformanceAdjustedFlags(shapes.length), [shapes.length]);

  // Optimized wall geometry
  const {
    wallJoinOverrides,
    mergedWallGeometry: effectiveWallGeometry,
  } = useOptimizedWallGeometry(shapes, currentShape, {
    enableWallJoins: perfFlags.enableWallJoinCalculations,
    enableWallUnion: perfFlags.enableWallUnionRendering,
    useWorker: true,
    debug: false,
    viewBox,
  });

  const seamCovers = useMemo(() => getSeamCovers(wallJoinOverrides), [wallJoinOverrides]);

  // Detect new closed loops and flash the interior
  useEffect(() => {
    const currentCount = effectiveWallGeometry.innerPolygons.length;
    const prevCount = prevInnerPolygonCountRef.current;

    if (prevCount === -1) {
      prevInnerPolygonCountRef.current = currentCount;
      return;
    }

    if (currentCount > prevCount) {
      const newIndices = new Set<number>();
      for (let i = prevCount; i < currentCount; i++) {
        newIndices.add(i);
      }
      // Use requestAnimationFrame to avoid lint warning about setState in effect
      const rafId = requestAnimationFrame(() => {
        setFlashingInteriors(newIndices);
      });

      const timeout = setTimeout(() => {
        setFlashingInteriors(new Set());
      }, 1500);

      prevInnerPolygonCountRef.current = currentCount;
      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timeout);
      };
    }

    prevInnerPolygonCountRef.current = currentCount;
  }, [effectiveWallGeometry.innerPolygons.length]);

  useEffect(() => {
    if (!zoneHoverEnabled) {
      // Use requestAnimationFrame to avoid lint warning about setState in effect
      const rafId = requestAnimationFrame(() => {
        setHoveredInteriorIndex(null);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [zoneHoverEnabled]);

  // Viewport culling - only render visible shapes
  const visibleShapes = useMemo(() => {
    if (shapes.length === 0) return [];

    const selectedSet = new Set(selectedShapeIds);
    if (selectedShapeId) selectedSet.add(selectedShapeId);
    const chainSet = new Set(chainSessionShapeIds);

    const mustRender: Shape[] = [];
    const toCheck: Shape[] = [];

    for (const shape of shapes) {
      if (shape.type === 'image') continue;
      if (selectedSet.has(shape.id) || chainSet.has(shape.id)) {
        mustRender.push(shape);
      } else {
        toCheck.push(shape);
      }
    }

    const viewportVisible = getVisibleShapes(toCheck, viewBox, 0.5);
    const visible = [...mustRender, ...viewportVisible];

    visible.sort((a, b) => {
      if (a.type === 'opening' && b.type !== 'opening') return 1;
      if (a.type !== 'opening' && b.type === 'opening') return -1;
      return 0;
    });

    return visible;
  }, [shapes, viewBox, selectedShapeId, selectedShapeIds, chainSessionShapeIds]);

  // Group openings by wall ID
  const openingsByWallId = useMemo(() => {
    const map = new Map<string, OpeningShape[]>();
    shapes.forEach((shape) => {
      if (shape.type === 'opening' && shape.host) {
        const existing = map.get(shape.host.wallId);
        if (existing) {
          existing.push(shape);
        } else {
          map.set(shape.host.wallId, [shape]);
        }
      }
    });
    return map;
  }, [shapes]);

  // Compute connected walls when dragging a wall - show their dimensions too
  const connectedDraggingWallIds = useMemo(() => {
    // Only compute when actively dragging a wall
    if (!isDragging || !selectedShapeId) {
      return new Set<string>();
    }
    
    // Check if selected shape is a wall
    const selectedWall = shapes.find(
      (s): s is WallShape => s.type === 'wall' && s.id === selectedShapeId
    );
    if (!selectedWall || !selectedWall.centerline || selectedWall.centerline.length < 2) {
      return new Set<string>();
    }
    
    const walls = shapes.filter((s): s is WallShape => s.type === 'wall');
    const connectedIds = new Set<string>();
    
    // Find walls connected at start endpoint
    const connectedAtStart = findConnectedWalls(selectedShapeId, 0, walls);
    connectedAtStart.forEach(c => {
      if (c.wallId !== selectedShapeId) connectedIds.add(c.wallId);
    });
    
    // Find walls connected at end endpoint
    const endIndex = selectedWall.centerline.length - 1;
    const connectedAtEnd = findConnectedWalls(selectedShapeId, endIndex, walls);
    connectedAtEnd.forEach(c => {
      if (c.wallId !== selectedShapeId) connectedIds.add(c.wallId);
    });
    
    return connectedIds;
  }, [isDragging, selectedShapeId, shapes]);

  // Opening gap polygons for wall masking
  const allOpeningGapPolygons = useMemo(() => {
    const gaps: string[] = [];
    shapes.forEach((shape) => {
      if (shape.type === 'opening' && shape.host) {
        const wall = shapes.find((s): s is WallShape => s.type === 'wall' && s.id === shape.host?.wallId);
        if (!wall) return;

        const halfThickness = Math.max(wall.thickness / 2, 0.001);
        const padding = Math.max(0.03, Math.min(wall.thickness * 0.2, 0.2));
        const extent = halfThickness + padding;
        const halfWidth = Math.max(shape.width / 2, 0.01);

        const dirLen = Math.hypot(shape.direction.x, shape.direction.y) || 1;
        const direction = { x: shape.direction.x / dirLen, y: shape.direction.y / dirLen };
        const normLen = Math.hypot(shape.normal.x, shape.normal.y) || 1;
        const normal = { x: shape.normal.x / normLen, y: shape.normal.y / normLen };

        const startCenter = {
          x: shape.anchor.x - direction.x * halfWidth,
          y: shape.anchor.y - direction.y * halfWidth,
        };
        const endCenter = {
          x: shape.anchor.x + direction.x * halfWidth,
          y: shape.anchor.y + direction.y * halfWidth,
        };
        const startPositive = { x: startCenter.x + normal.x * extent, y: startCenter.y + normal.y * extent };
        const startNegative = { x: startCenter.x - normal.x * extent, y: startCenter.y - normal.y * extent };
        const endPositive = { x: endCenter.x + normal.x * extent, y: endCenter.y + normal.y * extent };
        const endNegative = { x: endCenter.x - normal.x * extent, y: endCenter.y - normal.y * extent };

        gaps.push(`${startPositive.x},${startPositive.y} ${startNegative.x},${startNegative.y} ${endNegative.x},${endNegative.y} ${endPositive.x},${endPositive.y}`);
      }
    });
    return gaps;
  }, [shapes]);

  // Cursor style based on active tool
  // Note: When in select mode, the 'move' cursor is controlled by individual shape elements
  // via their cursor="move" attribute, not at the SVG level. This ensures the cursor
  // only changes to 'move' when directly over a shape's hit area.
  const getCursorStyle = useCallback(() => {
    if (activeTool === 'select') {
      if (isResizing || isResizingPolylineCorner || isResizingRectangleEdge || isResizingRoomCorner || isResizingText) {
        return 'grabbing';
      }
      // Don't set 'move' cursor at SVG level - let shape elements control their own cursors
      return `url("${CUSTOM_CURSOR}") ${CURSOR_HOTSPOT}, auto`;
    }

    if (activeTool === 'zoom') {
      return 'zoom-in';
    }

    if (activeTool === 'trim') {
      const scissorsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(scissorsSvg)}") 12 12, crosshair`;
    }

    if (
      activeTool === 'line' ||
      activeTool === 'polyline' ||
      activeTool === 'curve' ||
      activeTool === 'arc' ||
      activeTool === 'circle' ||
      activeTool === 'rectangle' ||
      activeTool === 'guideline' ||
      activeTool === 'wall' ||
      activeTool === 'opening' ||
      activeTool === 'zone' ||
      activeTool === 'dimension' ||
      activeTool === 'text'
    ) {
      return 'crosshair';
    }

    return `url("${CUSTOM_CURSOR}") ${CURSOR_HOTSPOT}, auto`;
  }, [activeTool, isResizing, isResizingPolylineCorner, isResizingRectangleEdge, isResizingRoomCorner, isResizingText]);

  // Handler for interior hover
  const handleInteriorHover = useCallback((index: number | null) => {
    setHoveredInteriorIndex(index);
  }, []);

  // Handler for interior click (creates zone)
  const handleInteriorClick = useCallback((polygon: Point[]) => {
    controller.createZoneFromPolygon(polygon);
  }, [controller]);

  // Background color based on theme
  const backgroundColor = useMemo(() => {
    if (isClean) return '#ffffff';
    if (isCyber) return '#0a2540';
    if (isFunk) return '#f0f0f0';
    if (isWindows95) return '#008080';
    return '#ffffff';
  }, [isClean, isCyber, isFunk, isWindows95]);

  return (
    <CanvasErrorBoundary>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        style={{
          display: 'block',
          backgroundColor,
          margin: 0,
          padding: 0,
          cursor: getCursorStyle(),
        }}
        onClick={(e) => {
          handleClick(e);
          handleCanvasClick();
        }}
        onMouseDown={(e) => {
          if (activeTool === 'select' && e.target === e.currentTarget) {
            handleMouseDown(e);
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
      {/* Appearance definitions - patterns, gradients, filters */}
      <defs>
        <AppearanceRenderer />
      </defs>

      {/* Grid layer */}
      <GridLayer
        viewBox={viewBox}
        gridSystem={gridSystem}
        showGrid={showGrid}
        toolbarStyle={toolbarStyle}
        extension={extension}
      />

      {/* Trace images layer - renders behind everything */}
      <TraceImagesLayer
        images={traceImages}
        selectedShapeId={selectedShapeId}
        zoomScale={zoomScale}
        calibrationMode={calibrationMode}
        onCalibrationClick={onCalibrationClick}
      />

      {/* DimensionCollectorProvider wraps all shape content */}
      <DimensionCollectorProvider>
        {/* Rectangle wall preview */}
        <RectanglePreviewLayer
          start={rectanglePreview?.start ?? null}
          end={rectanglePreview?.end ?? null}
          wallMode={wallMode}
          wallOptions={wallOptions}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          toolbarStyle={toolbarStyle}
        />

        {/* Merged wall geometry layer */}
        <WallGeometryLayer
          wallGeometry={effectiveWallGeometry}
          seamCovers={seamCovers}
          openingGapPolygons={allOpeningGapPolygons}
          zoneHoverEnabled={zoneHoverEnabled}
          hoveredInteriorIndex={hoveredInteriorIndex}
          flashingInteriors={flashingInteriors}
          toolbarStyle={toolbarStyle}
          onInteriorHover={handleInteriorHover}
          onInteriorClick={handleInteriorClick}
          onZoneInteract={onZoneInteract}
        />

        {/* Trim tool visualization */}
        {activeTool === 'trim' && (
          <TrimVisualizationLayer
            trimState={snapshot.trimState}
            shapes={shapes}
            zoomScale={zoomScale}
            lengthUnit={lengthUnit}
          />
        )}

        {/* All visible shapes */}
        <ShapesLayer
          visibleShapes={visibleShapes}
          selectedShapeId={selectedShapeId}
          selectedShapeIds={selectedShapeIds}
          chainSessionShapeIds={chainSessionShapeIds}
          hoveredShapeId={hoveredShapeId}
          activeTool={activeTool}
          wallMode={wallMode}
          showMeasurements={showMeasurements}
          measurementSettings={measurementSettings}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          viewBox={viewBox}
          toolbarStyle={toolbarStyle}
          wallJoinOverrides={wallJoinOverrides}
          openingsByWallId={openingsByWallId}
          wallThicknessMap={useMemo(() => {
            const map = new Map<string, number>();
            shapes.forEach(s => {
              if (s.type === 'wall') map.set(s.id, s.thickness);
            });
            return map;
          }, [shapes])}
          showWallCenterline={showWallCenterline}
          showMarkers={showMarkers}
          multiSelectViaBox={multiSelectViaBox}
          isResizing={isResizing}
          isDragging={isDragging}
          isCurvingWall={isCurvingWall}
          curvingWallId={curvingWallId}
          connectedDraggingWallIds={connectedDraggingWallIds}
          onMouseDown={handleMouseDown}
          onWallCurveHandleStart={handleWallCurveHandleStart}
          setHoveredShapeId={setHoveredShapeId}
          onRoomLabelEditRequest={onRoomLabelEditRequest}
          onOpeningFlip={controller.openingFlip}
        />

        {/* Current shape being drawn */}
        <CurrentShapeLayer
          currentShape={currentShape}
          isDrawing={isDrawing}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          viewBox={viewBox}
          toolbarStyle={toolbarStyle}
          wallJoinOverrides={wallJoinOverrides}
          showWallCenterline={showWallCenterline}
          onMouseDown={handleMouseDown}
          onWallCurveHandleStart={handleWallCurveHandleStart}
          renderToken={Date.now()}
        />

        {/* Alignment guides for smart snapping during drag */}
        <AlignmentGuidesLayer
          guides={alignmentGuides}
          zoomScale={zoomScale}
          enabled={isDragging && alignmentGuides.length > 0}
        />

        {/* Bounding boxes for selected shapes */}
        <BoundingBoxLayer
          shapes={shapes}
          selectedShapeId={selectedShapeId}
          selectedShapeIds={selectedShapeIds}
          activeTool={activeTool}
          zoomScale={zoomScale}
          lengthUnit={lengthUnit}
          wallJoinOverrides={wallJoinOverrides}
          measurementSettings={measurementSettings}
          multiSelectViaBox={multiSelectViaBox}
          isResizing={isResizing}
          isResizingPolylineCorner={isResizingPolylineCorner}
          isResizingRectangleEdge={isResizingRectangleEdge}
          isResizingRoomCorner={isResizingRoomCorner}
          rotationPreview={rotationPreview}
          onMouseDown={handleMouseDown}
          onResizeStart={handleResizeStart}
          onPolylineCornerResizeStart={handlePolylineCornerResizeStart}
          onRectangleEdgeResizeStart={handleRectangleEdgeResizeStart}
          onRoomCornerResizeStart={handleRoomCornerResizeStart}
          onRotateHandleStart={handleRotateHandleStart}
        />

        {/* Snap indicator */}
        <SnapIndicatorLayer
          snapIndicator={snapIndicator}
          snapEnabled={snapSettings?.enabled ?? true}
          zoomScale={zoomScale}
        />
      </DimensionCollectorProvider>

      {/* Measure tool overlay */}
      <MeasureOverlay
        measureStart={measureStart}
        measureEnd={measureEnd}
        isMeasuring={isMeasuring}
        zoomScale={zoomScale}
        lengthUnit={lengthUnit}
      />

      {/* Marker chain overlay */}
      <MarkerChainOverlay
        markerChainStart={markerChainStart}
        markerChainEnd={markerChainEnd}
        isMarkerChaining={isMarkerChaining}
        drawingMode={drawingMode}
        activeTool={activeTool}
        zoomScale={zoomScale}
        lengthUnit={lengthUnit}
      />

      {/* Selection rectangle */}
      <SelectionRectLayer
        isSelecting={isSelecting}
        selectionStart={selectionRect?.start ?? null}
        selectionEnd={selectionRect?.end ?? null}
        toolbarStyle={toolbarStyle}
      />

      {/* Simulation overlay (navigation agent) */}
      {simulationOverlay}
    </svg>
    </CanvasErrorBoundary>
  );
};

