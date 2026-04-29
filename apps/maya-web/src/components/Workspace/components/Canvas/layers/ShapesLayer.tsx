/**
 * Shapes Layer
 * 
 * Renders all visible shapes with proper z-ordering and selection state.
 * Memoized to prevent unnecessary re-renders when unrelated state changes.
 */

import React, { memo, useMemo, useCallback } from 'react';
import type {
  Shape,
  WallShape,
  RoomShape,
  OpeningShape,
  OpeningSwingState,
  AssetShape,
  ViewBox,
  LengthUnit,
  ToolbarStyle,
  MeasurementSettings,
  WallDrawingMode,
  ToolType,
} from '../../../types';
import type { WallJoinOverrides } from '../../../utils/walls';

import { LineShape } from '../LineShape';
import { PolylineShape } from '../PolylineShape';
import { ArcShapeComponent } from '../ArcShape';
import { CurveShapeComponent } from '../CurveShape';
import { CircleShapeComponent } from '../CircleShape';
import { RectangleShapeComponent } from '../RectangleShape';
import { GuidelineShapeComponent } from '../GuidelineShape';
import { MarkerShapeComponent } from '../MarkerShape';
import { WallShapeComponent } from '../WallShape';
import { RoomShapeComponent } from '../RoomShape';
import { OpeningShapeComponent } from '../OpeningShape';
import { AssetShapeComponent } from '../AssetShape';
import { ZoneShapeComponent } from '../../ZoneShape';
import { DimensionShape } from '../DimensionShape';
import { TextShapeComponent } from '../TextShape';

interface ShapesLayerProps {
  /** Visible shapes to render */
  visibleShapes: Shape[];
  /** Currently selected shape ID (single selection) */
  selectedShapeId: string | null;
  /** Selected shape IDs (multi-selection) */
  selectedShapeIds: string[];
  /** Shapes in chain drawing session */
  chainSessionShapeIds: string[];
  /** Currently hovered shape ID */
  hoveredShapeId: string | null;
  /** Active tool */
  activeTool: ToolType;
  /** Wall drawing mode */
  wallMode: WallDrawingMode;
  /** Whether to show measurements */
  showMeasurements: boolean;
  /** Measurement settings */
  measurementSettings?: MeasurementSettings;
  /** Length unit */
  lengthUnit: LengthUnit;
  /** Zoom scale */
  zoomScale: number;
  /** ViewBox */
  viewBox: ViewBox;
  /** Toolbar style */
  toolbarStyle: ToolbarStyle;
  /** Wall join overrides */
  wallJoinOverrides: Record<string, WallJoinOverrides>;
  /** Openings by wall ID */
  openingsByWallId: Map<string, OpeningShape[]>;
  /** Whether to show wall centerline */
  showWallCenterline: boolean;
  /** Whether to show markers */
  showMarkers: boolean;
  /** Whether multi-select was via box */
  multiSelectViaBox: boolean;
  /** Whether resizing/curving walls */
  isResizing: boolean;
  /** Whether currently dragging */
  isDragging: boolean;
  isCurvingWall: boolean;
  curvingWallId: string | null;
  /** Wall IDs connected to the wall being dragged (to show their dimensions) */
  connectedDraggingWallIds: Set<string>;
  /** Callbacks */
  onMouseDown: (e: React.MouseEvent<Element>, shapeId?: string) => void;
  onWallCurveHandleStart: (e: React.MouseEvent<SVGElement>, shapeId?: string) => void;
  setHoveredShapeId: (id: string | null) => void;
  onRoomLabelEditRequest?: (roomId: string) => void;
  onOpeningFlip?: (openingId: string, flipState: Partial<OpeningSwingState>) => void;
  /** Map of wall ID to wall thickness */
  wallThicknessMap: Map<string, number>;
}

/**
 * Memoized individual shape renderer
 */
const ShapeRenderer = memo(function ShapeRenderer({
  shape,
  isSelected,
  isHovered,
  isInMultiSelection,
  isConnectedToDragging,
  showMeasurements,
  measurementSettings,
  lengthUnit,
  zoomScale,
  viewBox,
  toolbarStyle,
  activeTool,
  wallMode,
  wallJoinOverrides,
  openingsByWallId,
  showWallCenterline,
  showMarkers,
  isResizing,
  isCurvingWall,
  curvingWallId,
  chainSessionShapeIds,
  onMouseDown,
  onWallCurveHandleStart,
  setHoveredShapeId,
  onRoomLabelEditRequest,
  onOpeningFlip,
  wallThicknessMap,
}: {
  shape: Shape;
  isSelected: boolean;
  isHovered: boolean;
  isInMultiSelection: boolean;
  isConnectedToDragging: boolean;
  showMeasurements: boolean;
  measurementSettings?: MeasurementSettings;
  lengthUnit: LengthUnit;
  zoomScale: number;
  viewBox: ViewBox;
  toolbarStyle: ToolbarStyle;
  activeTool: ToolType;
  wallMode: WallDrawingMode;
  wallJoinOverrides: Record<string, WallJoinOverrides>;
  openingsByWallId: Map<string, OpeningShape[]>;
  showWallCenterline: boolean;
  showMarkers: boolean;
  isResizing: boolean;
  isCurvingWall: boolean;
  curvingWallId: string | null;
  chainSessionShapeIds: string[];
  onMouseDown: (e: React.MouseEvent<Element>, shapeId?: string) => void;
  onWallCurveHandleStart: (e: React.MouseEvent<SVGElement>, shapeId?: string) => void;
  setHoveredShapeId: (id: string | null) => void;
  onRoomLabelEditRequest?: (roomId: string) => void;
  onOpeningFlip?: (openingId: string, flipState: Partial<OpeningSwingState>) => void;
  wallThicknessMap: Map<string, number>;
}) {
  const shouldHideMeasurements = isInMultiSelection;
  const showAsSelected = isSelected;

  // Wrap onMouseDown to include shapeId
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onMouseDown(e, shape.id);
  }, [onMouseDown, shape.id]);

  const handleMouseEnter = useCallback(() => setHoveredShapeId(shape.id), [shape.id, setHoveredShapeId]);
  const handleMouseLeave = useCallback(() => setHoveredShapeId(null), [setHoveredShapeId]);

  switch (shape.type) {
    case 'line':
      return (
        <LineShape
          key={shape.id}
          shape={shape}
          showMeasurements={showMeasurements && !shouldHideMeasurements}
          measurementSettings={measurementSettings}
          isSelected={showAsSelected}
          isHovered={isHovered && !isInMultiSelection}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          useDimensionLayer={true}
        />
      );

    case 'polyline':
      return (
        <PolylineShape
          key={shape.id}
          shape={shape}
          showMeasurements={(showMeasurements && !shouldHideMeasurements) || (showAsSelected && isResizing)}
          measurementSettings={measurementSettings}
          isSelected={showAsSelected}
          isHovered={isHovered && !isInMultiSelection}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          useDimensionLayer={true}
        />
      );

    case 'curve':
      return (
        <CurveShapeComponent
          key={shape.id}
          shape={shape}
          showMeasurements={showMeasurements && !shouldHideMeasurements}
          measurementSettings={measurementSettings}
          isSelected={showAsSelected}
          isHovered={isHovered && !isInMultiSelection}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          useDimensionLayer={true}
        />
      );

    case 'arc':
      return (
        <ArcShapeComponent
          key={shape.id}
          shape={shape}
          showMeasurements={showMeasurements && !shouldHideMeasurements}
          measurementSettings={measurementSettings}
          isSelected={showAsSelected}
          isHovered={isHovered && !isInMultiSelection}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          useDimensionLayer={true}
        />
      );

    case 'circle':
      return (
        <CircleShapeComponent
          key={shape.id}
          shape={shape}
          showMeasurements={showMeasurements && !shouldHideMeasurements}
          measurementSettings={measurementSettings}
          isSelected={showAsSelected}
          isHovered={isHovered && !isInMultiSelection}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          useDimensionLayer={true}
        />
      );

    case 'rectangle':
      return (
        <RectangleShapeComponent
          key={shape.id}
          shape={shape}
          showMeasurements={showMeasurements && !shouldHideMeasurements}
          measurementSettings={measurementSettings}
          isSelected={showAsSelected}
          isHovered={isHovered && !isInMultiSelection}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          useDimensionLayer={true}
        />
      );

    case 'wall': {
      const wallShape = shape as WallShape;
      const isWallBeingCurved = isCurvingWall && curvingWallId === shape.id;
      const isInActiveChainSession =
        wallMode === 'chain' &&
        chainSessionShapeIds.length > 0 &&
        chainSessionShapeIds.includes(shape.id);
      // Show measurements if:
      // - Global showMeasurements is on (and not in multi-selection)
      // - Wall is selected and being resized/curved
      // - Wall is connected to a wall being dragged (to show how dragging affects connected walls)
      const showWallMeasurements =
        !isInActiveChainSession &&
        ((showMeasurements && !shouldHideMeasurements) ||
          (showAsSelected && (isResizing || isWallBeingCurved)) ||
          isConnectedToDragging);

      return (
        <WallShapeComponent
          key={shape.id}
          shape={wallShape}
          joinCaps={wallJoinOverrides[shape.id]}
          openings={openingsByWallId.get(shape.id)}
          isSelected={showAsSelected || isConnectedToDragging}
          isHovered={isHovered && !isInMultiSelection}
          isBeingCurved={isWallBeingCurved}
          zoomScale={zoomScale}
          lengthUnit={lengthUnit}
          showMeasurements={showWallMeasurements}
          measurementSettings={measurementSettings}
          showCenterline={showWallCenterline}
          hideStrokes={true}
          onMouseDown={handleMouseDown}
          onCurveHandleMouseDown={(e) => onWallCurveHandleStart(e, shape.id)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      );
    }

    case 'room': {
      const roomShape = shape as RoomShape;
      return (
        <RoomShapeComponent
          key={roomShape.id}
          shape={roomShape}
          lengthUnit={lengthUnit}
          isSelected={showAsSelected}
          isHovered={isHovered && !isInMultiSelection}
          activeTool={activeTool}
          showMeasurements={showMeasurements && !shouldHideMeasurements}
          measurementSettings={measurementSettings}
          useDimensionLayer={true}
          onMouseDown={handleMouseDown}
          zoomScale={zoomScale}
          onMouseEnter={(id) => setHoveredShapeId(id)}
          onMouseLeave={handleMouseLeave}
          onLabelClick={onRoomLabelEditRequest}
        />
      );
    }

    case 'guideline':
      return (
        <GuidelineShapeComponent
          key={shape.id}
          shape={shape}
          showMeasurements={showMeasurements && !showAsSelected}
          isSelected={showAsSelected}
          isHovered={isHovered && !isInMultiSelection}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          viewBox={viewBox}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      );

    case 'marker':
      return (
        <MarkerShapeComponent
          key={shape.id}
          shape={shape}
          isSelected={showAsSelected || isInMultiSelection}
          isHovered={isHovered && !isInMultiSelection}
          activeTool={activeTool}
          zoomScale={zoomScale}
          showMarkers={showMarkers}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      );

    case 'opening': {
      const shouldShowOpeningMeasurements =
        (showMeasurements && !shouldHideMeasurements) || showAsSelected;
      return (
        <OpeningShapeComponent
          key={shape.id}
          shape={shape as OpeningShape}
          isSelected={showAsSelected}
          isHovered={isHovered && !isInMultiSelection}
          zoomScale={zoomScale}
          lengthUnit={lengthUnit}
          showMeasurements={shouldShowOpeningMeasurements}
          measurementSettings={measurementSettings}
          useDimensionLayer={true}
          toolbarStyle={toolbarStyle}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFlip={onOpeningFlip}
          wallThickness={shape.host ? wallThicknessMap.get(shape.host.wallId) : undefined}
        />
      );
    }

    case 'zone':
      return (
        <ZoneShapeComponent
          key={shape.id}
          shape={shape}
          isSelected={showAsSelected}
          isHovered={isHovered && !isInMultiSelection}
          lengthUnit={lengthUnit}
          showMeasurements={showMeasurements && !shouldHideMeasurements}
          measurementSettings={measurementSettings}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      );

    case 'dimension':
      return (
        <DimensionShape
          key={shape.id}
          shape={shape}
          isSelected={showAsSelected}
          zoomScale={zoomScale}
          lengthUnit={lengthUnit}
          onMouseDown={handleMouseDown}
        />
      );

    case 'text':
      return (
        <TextShapeComponent
          key={shape.id}
          shape={shape}
          isSelected={showAsSelected}
          isHovered={isHovered && !isInMultiSelection}
          zoomScale={zoomScale}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      );

    case 'asset':
      return (
        <AssetShapeComponent
          key={shape.id}
          shape={shape as AssetShape}
          isSelected={showAsSelected}
          isHovered={isHovered && !isInMultiSelection}
          activeTool={activeTool}
          zoomScale={zoomScale}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      );

    default:
      return null;
  }
});

/**
 * Memoized shapes layer
 */
export const ShapesLayer = memo(function ShapesLayer({
  visibleShapes,
  selectedShapeId,
  selectedShapeIds,
  chainSessionShapeIds,
  hoveredShapeId,
  activeTool,
  wallMode,
  showMeasurements,
  measurementSettings,
  lengthUnit,
  zoomScale,
  viewBox,
  toolbarStyle,
  wallJoinOverrides,
  openingsByWallId,
  showWallCenterline,
  showMarkers,
  multiSelectViaBox,
  isResizing,
  isDragging,
  isCurvingWall,
  curvingWallId,
  connectedDraggingWallIds,
  onMouseDown,
  onWallCurveHandleStart,
  setHoveredShapeId,
  onRoomLabelEditRequest,
  onOpeningFlip,
  wallThicknessMap,
}: ShapesLayerProps) {
  // Pre-compute selection sets for O(1) lookup
  const selectedSet = useMemo(() => new Set(selectedShapeIds), [selectedShapeIds]);

  return (
    <g className="shapes-layer">
      {visibleShapes.map(shape => {
        const isInMultiSelection = selectedShapeIds.length > 1 && selectedSet.has(shape.id);
        const showAsSelected = (shape.id === selectedShapeId && selectedShapeIds.length <= 1) ||
          (isInMultiSelection && !multiSelectViaBox);
        const isHovered = shape.id === hoveredShapeId;
        // Check if this wall is connected to the wall being dragged
        // Don't show as "connected to dragging" if this wall is part of a box multi-selection
        // (it's being dragged together with other walls, not separately)
        const isConnectedToDragging = isDragging && shape.type === 'wall' && 
          connectedDraggingWallIds.has(shape.id) && 
          !(multiSelectViaBox && isInMultiSelection);

        return (
          <ShapeRenderer
            key={shape.id}
            shape={shape}
            isSelected={showAsSelected}
            isHovered={isHovered}
            isInMultiSelection={isInMultiSelection}
            isConnectedToDragging={isConnectedToDragging}
            showMeasurements={showMeasurements}
            measurementSettings={measurementSettings}
            lengthUnit={lengthUnit}
            zoomScale={zoomScale}
            viewBox={viewBox}
            toolbarStyle={toolbarStyle}
            activeTool={activeTool}
            wallMode={wallMode}
            wallJoinOverrides={wallJoinOverrides}
            openingsByWallId={openingsByWallId}
            showWallCenterline={showWallCenterline}
            showMarkers={showMarkers}
            isResizing={isResizing}
            isCurvingWall={isCurvingWall}
            curvingWallId={curvingWallId}
            chainSessionShapeIds={chainSessionShapeIds}
            onMouseDown={onMouseDown}
            onWallCurveHandleStart={onWallCurveHandleStart}
            setHoveredShapeId={setHoveredShapeId}
            onRoomLabelEditRequest={onRoomLabelEditRequest}
            onOpeningFlip={onOpeningFlip}
            wallThicknessMap={wallThicknessMap}
          />
        );
      })}
    </g>
  );
});

