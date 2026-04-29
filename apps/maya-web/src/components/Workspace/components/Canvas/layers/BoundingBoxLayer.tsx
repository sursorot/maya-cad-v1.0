/**
 * Bounding Box Layer
 * 
 * Renders bounding boxes for selected shapes.
 * Memoized to only re-render when selection changes.
 */

import React, { memo, useMemo } from 'react';
import type { Shape, WallShape, Point, LengthUnit, MeasurementSettings } from '../../../types';
import type { WallJoinOverrides } from '../../../utils/walls';
import { BoundingBox } from '../BoundingBox';
import { getWallPolygonPoints } from '../../../utils/walls';
import { calculateCurveBounds, getArcBounds } from '../../../utils/measurements';
import { MULTI_SELECT_ID } from '../constants';

interface BoundingBoxLayerProps {
  /** All shapes */
  shapes: Shape[];
  /** Currently selected shape ID (single selection) */
  selectedShapeId: string | null;
  /** Selected shape IDs (multi-selection) */
  selectedShapeIds: string[];
  /** Active tool */
  activeTool: string;
  /** Zoom scale */
  zoomScale: number;
  /** Length unit */
  lengthUnit: LengthUnit;
  /** Wall join overrides */
  wallJoinOverrides: Record<string, WallJoinOverrides>;
  /** Measurement settings */
  measurementSettings?: MeasurementSettings;
  /** Whether multi-select was via box */
  multiSelectViaBox: boolean;
  /** Interaction states */
  isResizing: boolean;
  isResizingPolylineCorner: boolean;
  isResizingRectangleEdge: boolean;
  isResizingRoomCorner: boolean;
  /** Rotation preview state */
  rotationPreview: { absoluteAngle: number; deltaAngle: number } | null;
  /** Callbacks - matching useCanvasInteraction signatures */
  onMouseDown: (e: React.MouseEvent<Element>, shapeId?: string) => void;
  onResizeStart: (e: React.MouseEvent<SVGElement>, shapeId: string | undefined, handle: 'start' | 'end') => void;
  onPolylineCornerResizeStart: (e: React.MouseEvent<SVGElement>, shapeId: string | undefined, corner: 'tl' | 'tr' | 'bl' | 'br') => void;
  onRectangleEdgeResizeStart: (e: React.MouseEvent<SVGElement>, shapeId: string | undefined, edge: 'top' | 'right' | 'bottom' | 'left') => void;
  onRoomCornerResizeStart: (e: React.MouseEvent<SVGElement>, shapeId: string | undefined, corner: 'tl' | 'tr' | 'bl' | 'br') => void;
  onRotateHandleStart: (e: React.MouseEvent<SVGElement>, pivotPoint: Point) => void;
}

/**
 * Check if a shape is rotatable
 */
function isShapeRotatable(shape: Shape): boolean {
  if (shape.type === 'rectangle') {
    return false;
  }
  if (shape.type === 'guideline') {
    return shape.orientation === 'freeform' && Boolean(shape.start && shape.end);
  }
  return true;
}

/**
 * Memoized bounding box layer
 */
export const BoundingBoxLayer = memo(function BoundingBoxLayer({
  shapes,
  selectedShapeId,
  selectedShapeIds,
  activeTool,
  zoomScale,
  lengthUnit,
  wallJoinOverrides,
  measurementSettings,
  multiSelectViaBox,
  isResizing,
  isResizingPolylineCorner,
  isResizingRectangleEdge,
  isResizingRoomCorner,
  rotationPreview,
  onMouseDown,
  onResizeStart,
  onPolylineCornerResizeStart,
  onRectangleEdgeResizeStart,
  onRoomCornerResizeStart,
  onRotateHandleStart,
}: BoundingBoxLayerProps) {
  // Single selection bounding box
  const singleSelectionBox = useMemo(() => {
    // Skip if not in select tool
    if (activeTool !== 'select') {
      return null;
    }
    if (!selectedShapeId || selectedShapeIds.length > 1) {
      return null;
    }

    const selectedShape = shapes.find(s => s.id === selectedShapeId);
    if (!selectedShape) {
      return null;
    }

    let roomWallBounds: { minX: number; maxX: number; minY: number; maxY: number } | undefined;
    if (selectedShape.type === 'room') {
      if (selectedShape.bounds) {
        roomWallBounds = selectedShape.bounds;
      } else if (selectedShape.wallIds && selectedShape.wallIds.length > 0) {
        const wallPoints: Point[] = [];
        selectedShape.wallIds.forEach((wallId) => {
          const wallShape = shapes.find((shape): shape is WallShape => shape.type === 'wall' && shape.id === wallId);
          if (!wallShape) return;
          const polygon = getWallPolygonPoints(wallShape, wallJoinOverrides[wallShape.id]);
          if (polygon && polygon.length > 0) {
            wallPoints.push(...polygon);
          }
        });
        if (wallPoints.length > 0) {
          const xs = wallPoints.map((p) => p.x);
          const ys = wallPoints.map((p) => p.y);
          roomWallBounds = {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys),
          };
        }
      }
    }

    const showBoundingMeasurements =
      (isResizing || isResizingPolylineCorner || isResizingRectangleEdge || isResizingRoomCorner) &&
      selectedShape.type !== 'wall';

    return {
      shape: selectedShape,
      roomWallBounds,
      showBoundingMeasurements,
    };
  }, [activeTool, selectedShapeId, selectedShapeIds.length, shapes, wallJoinOverrides, isResizing, isResizingPolylineCorner, isResizingRectangleEdge, isResizingRoomCorner]);

  // Multi-selection bounding box
  const multiSelectionBox = useMemo(() => {
    // Skip if not in select tool
    if (activeTool !== 'select') {
      return null;
    }
    if (!multiSelectViaBox || selectedShapeIds.length <= 1) {
      return null;
    }

    const selectedShapes = shapes.filter(s => selectedShapeIds.includes(s.id));
    if (selectedShapes.length === 0) {
      return null;
    }

    // Calculate consolidated bounding box from all selected shapes
    const allPoints: Point[] = [];
    selectedShapes.forEach(shape => {
      if (shape.type === 'line') {
        allPoints.push(shape.start, shape.end);
      } else if (shape.type === 'polyline') {
        allPoints.push(...shape.points);
      } else if (shape.type === 'curve') {
        const bounds = calculateCurveBounds(shape.points, 20, 0);
        allPoints.push(
          { x: bounds.minX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.maxY },
          { x: bounds.minX, y: bounds.maxY }
        );
      } else if (shape.type === 'arc') {
        const bounds = getArcBounds(shape.start, shape.end, shape.controlPoint);
        allPoints.push(
          { x: bounds.minX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.maxY },
          { x: bounds.minX, y: bounds.maxY },
        );
      } else if (shape.type === 'circle') {
        allPoints.push(
          { x: shape.center.x - shape.radius, y: shape.center.y },
          { x: shape.center.x + shape.radius, y: shape.center.y },
          { x: shape.center.x, y: shape.center.y - shape.radius },
          { x: shape.center.x, y: shape.center.y + shape.radius }
        );
      } else if (shape.type === 'rectangle') {
        allPoints.push(shape.start, shape.end);
      } else if (shape.type === 'room') {
        allPoints.push(...shape.points);
      } else if (shape.type === 'wall') {
        const polygon = getWallPolygonPoints(shape, wallJoinOverrides[shape.id]);
        allPoints.push(...polygon);
      } else if (shape.type === 'zone') {
        allPoints.push(...shape.points);
      } else if (shape.type === 'text') {
        const textAnchor = shape.textAlign === 'center' ? 'middle' :
          shape.textAlign === 'right' ? 'end' : 'start';
        const width = shape.content.length * shape.fontSize * 0.6;
        const height = shape.fontSize * 1.2;
        const x = shape.position.x - (textAnchor === 'middle' ? width / 2 : textAnchor === 'end' ? width : 0);
        const y = shape.position.y - shape.fontSize * 0.7;
        allPoints.push(
          { x, y },
          { x: x + width, y },
          { x: x + width, y: y + height },
          { x, y: y + height }
        );
      }
    });

    if (allPoints.length < 2) {
      return null;
    }

    const xs = allPoints.map(p => p.x);
    const ys = allPoints.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const canRotateSelection = selectedShapes.every(isShapeRotatable);

    // Create a virtual polyline shape for the consolidated bounding box
    const consolidatedShape: Shape = {
      type: 'polyline',
      id: 'multi-select',
      points: [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ],
      stroke: '#000000',
      strokeWidth: 1,
    };

    return {
      shape: consolidatedShape,
      canRotateSelection,
      minX,
      minY,
      maxX,
      maxY,
    };
  }, [activeTool, multiSelectViaBox, selectedShapeIds, shapes, wallJoinOverrides]);

  return (
    <>
      {/* Single selection bounding box */}
      {singleSelectionBox && (
        <BoundingBox
          shape={singleSelectionBox.shape}
          selectionTargetId={selectedShapeId ?? undefined}
          zoomScale={zoomScale}
          onMouseDown={onMouseDown}
          onResizeStart={onResizeStart}
          onPolylineCornerResizeStart={onPolylineCornerResizeStart}
          onRectangleEdgeResizeStart={onRectangleEdgeResizeStart}
          onRoomCornerResizeStart={onRoomCornerResizeStart}
          onRotateHandleStart={singleSelectionBox.shape.type === 'asset' ? onRotateHandleStart : undefined}
          showMeasurements={singleSelectionBox.showBoundingMeasurements}
          measurementSettings={measurementSettings}
          lengthUnit={lengthUnit}
          roomWallBounds={singleSelectionBox.roomWallBounds}
          rotationPreview={singleSelectionBox.shape.type === 'asset' ? rotationPreview : null}
        />
      )}

      {/* Multi-selection bounding box */}
      {multiSelectionBox && (
        <>
          <BoundingBox
            shape={multiSelectionBox.shape}
            selectionTargetId={MULTI_SELECT_ID}
            zoomScale={zoomScale}
            onMouseDown={onMouseDown}
            onResizeStart={onResizeStart}
            onPolylineCornerResizeStart={onPolylineCornerResizeStart}
            onRectangleEdgeResizeStart={onRectangleEdgeResizeStart}
            showMeasurements={isResizing || isResizingPolylineCorner || isResizingRectangleEdge}
            lengthUnit={lengthUnit}
          />
          {/* Rotation handle for multi-selection */}
          {multiSelectionBox.canRotateSelection && (
            <RotationHandle
              minX={multiSelectionBox.minX}
              minY={multiSelectionBox.minY}
              maxX={multiSelectionBox.maxX}
              maxY={multiSelectionBox.maxY}
              zoomScale={zoomScale}
              rotationPreview={rotationPreview}
              onRotateHandleStart={onRotateHandleStart}
            />
          )}
        </>
      )}
    </>
  );
});

/**
 * Rotation handle component
 */
const RotationHandle = memo(function RotationHandle({
  minX,
  minY,
  maxX,
  maxY,
  zoomScale,
  rotationPreview,
  onRotateHandleStart,
}: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  zoomScale: number;
  rotationPreview: { absoluteAngle: number; deltaAngle: number } | null;
  onRotateHandleStart: (e: React.MouseEvent<SVGElement>, pivotPoint: Point) => void;
}) {
  const pivotPoint: Point = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
  const offset = 0.35 * zoomScale;
  const handleRadius = 0.04 * zoomScale;
  const handlePoint: Point = {
    x: pivotPoint.x,
    y: minY - offset,
  };
  
  // Snap angle markers
  const SNAP_ANGLES = [0, 45, 90, 135, 180, -135, -90, -45];
  const boundingRadius = Math.max(maxX - minX, maxY - minY) / 2;
  const snapMarkerRadius = boundingRadius + offset + 0.08 * zoomScale;
  const snapMarkerDotRadius = 0.015 * zoomScale;

  const snappedAngle = rotationPreview && 'snappedAngle' in rotationPreview 
    ? (rotationPreview as { snappedAngle?: number | null }).snappedAngle 
    : null;

  const label = rotationPreview ? (() => {
    const isSnapped = snappedAngle !== null && snappedAngle !== undefined;
    const displayAngle = isSnapped ? snappedAngle : rotationPreview.absoluteAngle;
    const formattedAbs = `${displayAngle.toFixed(isSnapped ? 0 : 1)}°`;
    const snapHint = isSnapped ? ' ⊕' : '';
    const labelText = `${formattedAbs}${snapHint}`;
    const chipPadding = 0.02;
    const fontSize = 0.065;
    const charWidth = fontSize * 0.6;
    const chipWidth = labelText.length * charWidth + chipPadding * 2;
    const chipHeight = fontSize + chipPadding * 2;
    const labelOffset = 0.15 * zoomScale;
    const labelPoint = {
      x: handlePoint.x,
      y: handlePoint.y - labelOffset,
    };
    const chipColor = isSnapped ? '#4A90E2' : (rotationPreview.absoluteAngle >= 0 ? '#00BFA5' : '#F59E0B');
    const textColor = '#ffffff';
    return (
      <g transform={`translate(${labelPoint.x}, ${labelPoint.y}) scale(${zoomScale})`}>
        <rect
          x={-chipWidth / 2}
          y={-chipHeight / 2}
          width={chipWidth}
          height={chipHeight}
          fill={chipColor}
          rx={0.02}
          opacity={0.9}
        />
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={textColor}
          fontSize={fontSize}
          fontWeight="600"
          fontFamily="'Courier New', Courier, monospace"
          style={{ userSelect: 'none' }}
        >
          {labelText}
        </text>
      </g>
    );
  })() : null;

  return (
    <g key="multi-rotate-handle" data-export-exclude="true">
      {/* Snap angle markers - visible during rotation */}
      {rotationPreview && (
        <g opacity={0.6}>
          {/* Rotation guide circle (dashed) */}
          <circle
            cx={pivotPoint.x}
            cy={pivotPoint.y}
            r={snapMarkerRadius - 0.04 * zoomScale}
            fill="none"
            stroke="#4A90E2"
            strokeWidth="1"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
          {/* Snap angle markers */}
          {SNAP_ANGLES.map((snapAngle) => {
            const snapRad = (snapAngle * Math.PI) / 180;
            const markerX = pivotPoint.x + Math.sin(snapRad) * (snapMarkerRadius - 0.04 * zoomScale);
            const markerY = pivotPoint.y - Math.cos(snapRad) * (snapMarkerRadius - 0.04 * zoomScale);
            const isQuadrant = snapAngle % 90 === 0;
            const isActive = snappedAngle === snapAngle;
            return (
              <g key={snapAngle}>
                {/* Snap marker dot */}
                <circle
                  cx={markerX}
                  cy={markerY}
                  r={isActive ? snapMarkerDotRadius * 2 : (isQuadrant ? snapMarkerDotRadius * 1.5 : snapMarkerDotRadius)}
                  fill={isActive ? '#4A90E2' : (isQuadrant ? '#4A90E2' : '#94a3b8')}
                  stroke={isActive ? '#ffffff' : 'none'}
                  strokeWidth={isActive ? 1 : 0}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
                {/* Angle label for quadrants */}
                {isQuadrant && (
                  <text
                    x={pivotPoint.x + Math.sin(snapRad) * (snapMarkerRadius + 0.06 * zoomScale)}
                    y={pivotPoint.y - Math.cos(snapRad) * (snapMarkerRadius + 0.06 * zoomScale)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={0.04 * zoomScale}
                    fill={isActive ? '#4A90E2' : '#64748b'}
                    fontWeight={isActive ? '700' : '500'}
                    style={{ userSelect: 'none' }}
                  >
                    {snapAngle === 180 || snapAngle === -180 ? '180°' : `${snapAngle}°`}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}
      
      <line
        x1={pivotPoint.x}
        y1={minY}
        x2={handlePoint.x}
        y2={handlePoint.y}
        stroke="#4A90E2"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      <circle
        cx={handlePoint.x}
        cy={handlePoint.y}
        r={handleRadius}
        fill="#ffffff"
        stroke="#4A90E2"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        cursor="grab"
        onMouseDown={(e) => onRotateHandleStart(e, pivotPoint)}
      />
      {label}
    </g>
  );
});

