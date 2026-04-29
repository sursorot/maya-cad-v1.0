import type { Shape, LengthUnit, Point, MeasurementSettings } from '../../types';
import {
  calculateLength,
  calculateAngle,
  formatLength,
  formatAngle,
  calculateCurveBounds,
  getArcBounds,
  calculateArcGeometry,
} from '../../utils/measurements';
import { getWallRenderGeometry } from '../../utils/walls';
import { isWindowLikeOpening } from './isWindowLikeOpening';
import { getWindowVisualMetrics } from './openingVisuals';
import { getDoorVisualMetrics, DOOR_FRAME_THICKNESS_SVG } from './doorVisuals';
import { useDimensionCollector } from './dimensions/DimensionContext';
import { getAssetById } from './assetRegistry';
import { defaultDimensionTheme } from './dimensions/theme';

const normalizeVector = (dx: number, dy: number) => {
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) {
    return { x: 1, y: 0 };
  }
  return { x: dx / length, y: dy / length };
};

const pointToString = (point: { x: number; y: number }) => `${point.x},${point.y}`;

interface BoundingBoxProps {
  shape: Shape;
  selectionTargetId?: string;
  zoomScale: number;
  onMouseDown: (e: React.MouseEvent<SVGElement>, shapeId?: string) => void;
  onResizeStart: (e: React.MouseEvent<SVGElement>, shapeId: string | undefined, handle: 'start' | 'end') => void;
  onPolylineCornerResizeStart?: (e: React.MouseEvent<SVGElement>, shapeId: string | undefined, corner: 'tl' | 'tr' | 'bl' | 'br') => void;
  onRectangleEdgeResizeStart?: (e: React.MouseEvent<SVGElement>, shapeId: string | undefined, edge: 'top' | 'right' | 'bottom' | 'left') => void;
  onRoomCornerResizeStart?: (e: React.MouseEvent<SVGElement>, shapeId: string | undefined, corner: 'tl' | 'tr' | 'bl' | 'br') => void;
  onRotateHandleStart?: (e: React.MouseEvent<SVGElement>, pivotPoint: Point) => void;
  roomWallBounds?: { minX: number; maxX: number; minY: number; maxY: number };
  showMeasurements?: boolean;
  measurementSettings?: MeasurementSettings;
  lengthUnit: LengthUnit;
  rotationPreview?: { absoluteAngle: number; deltaAngle: number; snappedAngle?: number | null } | null;
}

export const BoundingBox: React.FC<BoundingBoxProps> = ({
  shape,
  selectionTargetId,
  zoomScale,
  onMouseDown,
  onResizeStart,
  onPolylineCornerResizeStart,
  onRectangleEdgeResizeStart,
  onRoomCornerResizeStart,
  onRotateHandleStart,
  roomWallBounds,
  showMeasurements = false,
  measurementSettings,
  lengthUnit,
  rotationPreview,
}) => {
  // Common constants - calculate once for all shape types
  const handleSize = 0.06 * zoomScale;
  const chipPadding = 0.025;
  const fontSize = 0.08;
  const charWidth = fontSize * 0.55;
  const getChipWidth = (text: string) => text.length * charWidth + chipPadding * 2;
  const chipHeight = fontSize + chipPadding * 2;

  const targetId = selectionTargetId ?? shape.id;

  // Smart Measurement Logic
  const isGlobalEnabled = measurementSettings ? measurementSettings.enabled : showMeasurements;
  const showLinear = isGlobalEnabled ? (measurementSettings?.linearDimensions ?? true) : true; // Always show linear during resize if global off? Or follow settings?
  // Actually, during resize (which is when showMeasurements is true here), we usually want to see what we are changing.
  // But we can respect specific "hide" flags.
  const showAngles = isGlobalEnabled ? (measurementSettings?.angles ?? true) : true;
  const showAxis = isGlobalEnabled ? (measurementSettings?.linearDimensions ?? true) : true;

  const showAxisMeasurements = showMeasurements && showAxis;
  const dimensionCollector = useDimensionCollector();
  const shouldUseDescriptorLayer = Boolean(dimensionCollector);

  const emitAxisLinearDescriptors = ({
    idPrefix,
    visualMinX,
    visualMinY,
    visualMaxX,
    visualMaxY,
    horizontalText,
    verticalText,
    zoomScale,
    axisOffset,
    collector,
  }: {
    idPrefix: string;
    visualMinX: number;
    visualMinY: number;
    visualMaxX: number;
    visualMaxY: number;
    horizontalText: string;
    verticalText: string;
    zoomScale: number;
    axisOffset: number;
    collector: ReturnType<typeof useDimensionCollector>;
  }) => {
    const emit = (start: Point, end: Point, text: string, orientationId: string) => {
      const midPoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      const dxAxis = end.x - start.x;
      const dyAxis = end.y - start.y;
      const normal = { x: -dyAxis, y: dxAxis };
      const bboxCenter = {
        x: (visualMinX + visualMaxX) / 2,
        y: (visualMinY + visualMaxY) / 2,
      };
      const dotRef = (bboxCenter.x - midPoint.x) * normal.x + (bboxCenter.y - midPoint.y) * normal.y;
      const orientation: -1 | 1 = dotRef >= 0 ? -1 : 1;
      collector?.({
        type: 'linear',
        id: `${idPrefix}-${orientationId}`,
        start,
        end,
        text,
        zoomScale,
        offset: axisOffset,
        side: orientation,
      });
    };

    emit(
      { x: visualMinX, y: visualMaxY },
      { x: visualMaxX, y: visualMaxY },
      horizontalText,
      'horizontal',
    );

    emit(
      { x: visualMaxX, y: visualMinY },
      { x: visualMaxX, y: visualMaxY },
      verticalText,
      'vertical',
    );
  };

  const descriptorAxisTranslation = (
    start: Point,
    end: Point,
    visualMinX: number,
    visualMinY: number,
    visualMaxX: number,
    visualMaxY: number,
    axisOffset: number,
  ) => {
    const midPoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const dxAxis = end.x - start.x;
    const dyAxis = end.y - start.y;
    const normal = { x: -dyAxis, y: dxAxis };
    const normalLength = Math.hypot(normal.x, normal.y) || 1;
    const unitNormal = { x: normal.x / normalLength, y: normal.y / normalLength };
    const bboxCenter = {
      x: (visualMinX + visualMaxX) / 2,
      y: (visualMinY + visualMaxY) / 2,
    };
    const dotRef = (bboxCenter.x - midPoint.x) * normal.x + (bboxCenter.y - midPoint.y) * normal.y;
    const orientation: -1 | 1 = dotRef >= 0 ? -1 : 1;
    return {
      translation: {
        x: midPoint.x + unitNormal.x * axisOffset * orientation,
        y: midPoint.y + unitNormal.y * axisOffset * orientation,
      },
      orientation,
    };
  };

  const renderAxisMeasurements = ({
    horizontalTranslation,
    verticalTranslation,
    horizontalText,
    verticalText,
    fontSize,
    chipHeight,
    getChipWidth,
    zoomScale,
    shouldUseDescriptorLayer,
    showAxisMeasurements,
    horizontalDist,
    verticalDist,
  }: {
    horizontalTranslation?: { x: number; y: number };
    verticalTranslation?: { x: number; y: number };
    horizontalText: string;
    verticalText: string;
    fontSize: number;
    chipHeight: number;
    getChipWidth: (text: string) => number;
    zoomScale: number;
    shouldUseDescriptorLayer: boolean;
    showAxisMeasurements: boolean;
    horizontalDist: number;
    verticalDist: number;
  }) => {
    return (
      <>
        {!shouldUseDescriptorLayer && showAxisMeasurements && horizontalDist > 0.01 && horizontalTranslation && (
          <g transform={`translate(${horizontalTranslation.x}, ${horizontalTranslation.y}) scale(${zoomScale})`}>
            <rect
              x={-getChipWidth(horizontalText) / 2}
              y={-chipHeight / 2}
              width={getChipWidth(horizontalText)}
              height={chipHeight}
              fill="#000000"
              rx="0.02"
            />
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={fontSize}
              fontWeight="600"
              style={{ userSelect: 'none' }}
            >
              {horizontalText}
            </text>
          </g>
        )}

        {!shouldUseDescriptorLayer && showAxisMeasurements && verticalDist > 0.01 && verticalTranslation && (
          <g transform={`translate(${verticalTranslation.x}, ${verticalTranslation.y})`}>
            <g transform={`rotate(90) scale(${zoomScale})`}>
              <rect
                x={-getChipWidth(verticalText) / 2}
                y={-chipHeight / 2}
                width={getChipWidth(verticalText)}
                height={chipHeight}
                fill="#000000"
                rx="0.02"
              />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={fontSize}
                fontWeight="600"
                style={{ userSelect: 'none' }}
              >
                {verticalText}
              </text>
            </g>
          </g>
        )}
      </>
    );
  };

  if (shape.type === 'line') {
    // Visual bounding box (tight to line)
    const visualMinX = Math.min(shape.start.x, shape.end.x);
    const visualMinY = Math.min(shape.start.y, shape.end.y);
    const visualMaxX = Math.max(shape.start.x, shape.end.x);
    const visualMaxY = Math.max(shape.start.y, shape.end.y);

    // Add padding to ensure horizontal/vertical lines have clickable area
    const clickPadding = 0.15 * zoomScale;
    const minX = visualMinX - clickPadding;
    const minY = visualMinY - clickPadding;
    const maxX = visualMaxX + clickPadding;
    const maxY = visualMaxY + clickPadding;

    // Determine which corners correspond to start and end points (use visual bounds)
    const startIsTopLeft = shape.start.x === visualMinX && shape.start.y === visualMinY;
    const startIsTopRight = shape.start.x === visualMaxX && shape.start.y === visualMinY;
    const startIsBottomLeft = shape.start.x === visualMinX && shape.start.y === visualMaxY;
    const startIsBottomRight = shape.start.x === visualMaxX && shape.start.y === visualMaxY;

    // Calculate measurements for display
    const length = calculateLength(shape.start, shape.end);
    const angle = calculateAngle(shape.start, shape.end);
    const horizontalDist = Math.abs(shape.end.x - shape.start.x);
    const verticalDist = Math.abs(shape.end.y - shape.start.y);

    // Calculate midpoint for measurements
    const midX = (shape.start.x + shape.end.x) / 2;
    const midY = (shape.start.y + shape.end.y) / 2;
    const bboxCenter = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    };

    // Format measurement text
    const horizontalText = formatLength(horizontalDist, lengthUnit);
    const verticalText = formatLength(verticalDist, lengthUnit);
    const lengthText = formatLength(length, lengthUnit);
    const angleText = formatAngle(angle);
    const perpX = -(shape.end.y - shape.start.y);
    const perpY = shape.end.x - shape.start.x;
    const dot = (bboxCenter.x - midX) * perpX + (bboxCenter.y - midY) * perpY;
    const lengthOrientation: -1 | 1 = dot >= 0 ? -1 : 1;
    const axisOffset = 0.08 * zoomScale;
    const lengthOffset = 0.08 * zoomScale;

    const computeAxisMeta = (startPoint: { x: number; y: number }, endPoint: { x: number; y: number }) => {
      const midPoint = {
        x: (startPoint.x + endPoint.x) / 2,
        y: (startPoint.y + endPoint.y) / 2,
      };
      const dxAxis = endPoint.x - startPoint.x;
      const dyAxis = endPoint.y - startPoint.y;
      const normal = {
        x: -dyAxis,
        y: dxAxis,
      };
      const normalLength = Math.hypot(normal.x, normal.y) || 1;
      const unitNormal = {
        x: normal.x / normalLength,
        y: normal.y / normalLength,
      };
      const dotRef =
        (bboxCenter.x - midPoint.x) * normal.x + (bboxCenter.y - midPoint.y) * normal.y;
      const orientation: -1 | 1 = dotRef >= 0 ? -1 : 1;
      return { midPoint, unitNormal, orientation };
    };

    const horizontalAxisStart = { x: visualMinX, y: visualMaxY };
    const horizontalAxisEnd = { x: visualMaxX, y: visualMaxY };
    const verticalAxisStart = { x: visualMaxX, y: visualMinY };
    const verticalAxisEnd = { x: visualMaxX, y: visualMaxY };

    const horizontalAxisMeta = computeAxisMeta(horizontalAxisStart, horizontalAxisEnd);
    const verticalAxisMeta = computeAxisMeta(verticalAxisStart, verticalAxisEnd);

    const horizontalAxisTranslation = {
      x: horizontalAxisMeta.midPoint.x + horizontalAxisMeta.unitNormal.x * axisOffset * horizontalAxisMeta.orientation,
      y: horizontalAxisMeta.midPoint.y + horizontalAxisMeta.unitNormal.y * axisOffset * horizontalAxisMeta.orientation,
    };

    const verticalAxisTranslation = {
      x: verticalAxisMeta.midPoint.x + verticalAxisMeta.unitNormal.x * axisOffset * verticalAxisMeta.orientation,
      y: verticalAxisMeta.midPoint.y + verticalAxisMeta.unitNormal.y * axisOffset * verticalAxisMeta.orientation,
    };

    return (
      <g key={`bbox-${shape.id}`} data-export-exclude="true">
        {/* Invisible fill area for dragging */}
        <rect
          x={minX}
          y={minY}
          width={maxX - minX}
          height={maxY - minY}
          fill="transparent"
          stroke="none"
          cursor="move"
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, targetId);
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Bounding rectangle (visual, tight to line) */}
        <rect
          x={visualMinX}
          y={visualMinY}
          width={visualMaxX - visualMinX}
          height={visualMaxY - visualMinY}
          fill="none"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />

        {/* Corner handles */}
        {/* Top-left */}
        <rect
          x={visualMinX - handleSize / 2}
          y={visualMinY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nwse-resize"
          onMouseDown={(e) => {
            onResizeStart(e, targetId, startIsTopLeft ? 'start' : 'end');
          }}
          onClick={(e) => e.stopPropagation()}
        />
        {/* Top-right */}
        <rect
          x={visualMaxX - handleSize / 2}
          y={visualMinY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nesw-resize"
          onMouseDown={(e) => {
            onResizeStart(e, targetId, startIsTopRight ? 'start' : 'end');
          }}
          onClick={(e) => e.stopPropagation()}
        />
        {/* Bottom-left */}
        <rect
          x={visualMinX - handleSize / 2}
          y={visualMaxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nesw-resize"
          onMouseDown={(e) => {
            onResizeStart(e, targetId, startIsBottomLeft ? 'start' : 'end');
          }}
          onClick={(e) => e.stopPropagation()}
        />
        {/* Bottom-right */}
        <rect
          x={visualMaxX - handleSize / 2}
          y={visualMaxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nwse-resize"
          onMouseDown={(e) => {
            onResizeStart(e, targetId, startIsBottomRight ? 'start' : 'end');
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Measurement overlays during resize */}
        {showMeasurements && length > 0.01 && (() => {
          if (shouldUseDescriptorLayer) {

            if (showLinear) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-length`,
                start: shape.start,
                end: shape.end,
                text: lengthText,
                zoomScale,
                offset: lengthOffset,
                side: lengthOrientation,
              });
            }

            emitAxisLinearDescriptors({
              idPrefix: `bbox-${shape.id}`,
              visualMinX,
              visualMinY,
              visualMaxX,
              visualMaxY,
              horizontalText,
              verticalText,
              zoomScale,
              axisOffset,
              collector: dimensionCollector,
            });

            if (showAngles) {
              const angleLabelOffset = 0.12 * zoomScale;
              dimensionCollector?.({
                type: 'chip',
                id: `bbox-${shape.id}-angle`,
                position: { x: shape.start.x - angleLabelOffset, y: shape.start.y },
                text: angleText,
                zoomScale,
              });
            }
          }

          return (
            <>
              {/* Angle arc visualization */}
              <g>
                {(() => {
                  const arcRadius = 0.25 * zoomScale;
                  const lineAngleRad = Math.atan2(shape.end.y - shape.start.y, shape.end.x - shape.start.x);
                  const horizontalX = shape.start.x + arcRadius;
                  const horizontalY = shape.start.y;
                  const lineEndX = shape.start.x + arcRadius * Math.cos(lineAngleRad);
                  const lineEndY = shape.start.y + arcRadius * Math.sin(lineAngleRad);
                  const sweepFlag = lineAngleRad > 0 ? 1 : 0;
                  const largeArcFlag = 0;
                  const pathD = `
                    M ${shape.start.x},${shape.start.y}
                    L ${horizontalX},${horizontalY}
                    A ${arcRadius},${arcRadius} 0 ${largeArcFlag},${sweepFlag} ${lineEndX},${lineEndY}
                    Z
                  `;

                  return showAngles ? (
                    <path
                      d={pathD}
                      fill="#6F62A4"
                      opacity="0.15"
                    />
                  ) : null;
                })()}
              </g>

              {renderAxisMeasurements({
                horizontalTranslation: horizontalAxisTranslation,
                verticalTranslation: verticalAxisTranslation,
                horizontalText,
                verticalText,
                fontSize,
                chipHeight,
                getChipWidth,
                zoomScale,
                shouldUseDescriptorLayer,
                showAxisMeasurements,
                horizontalDist,
                verticalDist,
              })}

              {/* CAD-style dimension lines and measurement */}
              {!shouldUseDescriptorLayer && showLinear && (
                <g>
                  {(() => {
                    const dx = shape.end.x - shape.start.x;
                    const dy = shape.end.y - shape.start.y;
                    const lineAngleRad = Math.atan2(dy, dx);
                    let lineAngleDeg = lineAngleRad * (180 / Math.PI);
                    const textFlip = lineAngleDeg > 90 || lineAngleDeg < -90;
                    if (textFlip) {
                      lineAngleDeg = lineAngleDeg + 180;
                    }
                    const offsetMagnitude = 0.08 * zoomScale;
                    const offset = lengthOrientation * offsetMagnitude;
                    const halfLen = length / 2;
                    const chipWidth = getChipWidth(lengthText) * zoomScale;
                    const chipHalfWidth = chipWidth / 2;
                    const scaledChipHeight = chipHeight * zoomScale;
                    const extLineMagnitude = offsetMagnitude + 0.05 * zoomScale;
                    const extLineLength = lengthOrientation * extLineMagnitude;

                    return (
                      <g transform={`translate(${midX}, ${midY}) rotate(${lineAngleDeg})`}>
                        <line
                          x1={-halfLen}
                          y1={0}
                          x2={-halfLen}
                          y2={extLineLength}
                          stroke="#555555"
                          strokeWidth={0.5}
                          strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
                          vectorEffect="non-scaling-stroke"
                        />
                        <line
                          x1={halfLen}
                          y1={0}
                          x2={halfLen}
                          y2={extLineLength}
                          stroke="#555555"
                          strokeWidth={0.5}
                          strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
                          vectorEffect="non-scaling-stroke"
                        />
                        <line
                          x1={-halfLen}
                          y1={offset}
                          x2={-chipHalfWidth}
                          y2={offset}
                          stroke="#4A90E2"
                          strokeWidth={0.75}
                          vectorEffect="non-scaling-stroke"
                        />
                        <line
                          x1={halfLen}
                          y1={offset}
                          x2={chipHalfWidth}
                          y2={offset}
                          stroke="#4A90E2"
                          strokeWidth={0.75}
                          vectorEffect="non-scaling-stroke"
                        />
                        <rect
                          x={-chipHalfWidth}
                          y={offset - scaledChipHeight / 2}
                          width={chipWidth}
                          height={scaledChipHeight}
                          fill="#000000"
                          rx={0.02 * zoomScale}
                        />
                        <text
                          x="0"
                          y={offset}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize={fontSize * zoomScale}
                          fontWeight="600"
                          style={{ userSelect: 'none' }}
                        >
                          {lengthText}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* Angle label offset to the left of start point to avoid bounding box handle */}
              {!shouldUseDescriptorLayer && showAngles && (() => {
                const angleLabelOffset = 0.12 * zoomScale;
                return (
                  <g transform={`translate(${shape.start.x - angleLabelOffset}, ${shape.start.y}) scale(${zoomScale})`}>
                    <rect
                      x={-getChipWidth(angleText) / 2}
                      y={-chipHeight / 2}
                      width={getChipWidth(angleText)}
                      height={chipHeight}
                      fill="#000000"
                      rx="0.02"
                    />
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={fontSize}
                      fontWeight="600"
                      style={{ userSelect: 'none' }}
                    >
                      {angleText}
                    </text>
                  </g>
                );
              })()}
            </>
          );
        })()}
      </g>
    );
  } else if (shape.type === 'opening') {
    const direction = normalizeVector(shape.direction.x, shape.direction.y);
    const normal = normalizeVector(shape.normal.x, shape.normal.y);
    const halfWidth = Math.max(shape.width / 2, 0.01);
    const start = {
      x: shape.anchor.x - direction.x * halfWidth,
      y: shape.anchor.y - direction.y * halfWidth,
    };
    const end = {
      x: shape.anchor.x + direction.x * halfWidth,
      y: shape.anchor.y + direction.y * halfWidth,
    };
    const frameOffset = Math.max(shape.frameThickness / 2, 0.05);
    const isWindowLike = isWindowLikeOpening(shape);
    const paddingBase = Math.max(0.08 * zoomScale, 0.04);
    const paddingWindow = Math.max(0.04 * zoomScale, 0.02);
    let positiveOffset = frameOffset + paddingBase;
    let negativeOffset = frameOffset + paddingBase;

    if (isWindowLike) {
      const { mainPositiveExtent, mainNegativeExtent } = getWindowVisualMetrics(shape);
      positiveOffset = mainPositiveExtent + paddingWindow;
      negativeOffset = mainNegativeExtent + paddingWindow;
    } else if (shape.category === 'door') {
      const { scale } = getDoorVisualMetrics(shape);
      const doorFrameVisualThickness = DOOR_FRAME_THICKNESS_SVG * scale;
      // Match the visual thickness exactly (compact)
      positiveOffset = doorFrameVisualThickness / 2;
      negativeOffset = doorFrameVisualThickness / 2;
    }

    const corners = [
      { x: start.x + normal.x * positiveOffset, y: start.y + normal.y * positiveOffset },
      { x: end.x + normal.x * positiveOffset, y: end.y + normal.y * positiveOffset },
      { x: end.x - normal.x * negativeOffset, y: end.y - normal.y * negativeOffset },
      { x: start.x - normal.x * negativeOffset, y: start.y - normal.y * negativeOffset },
    ];
    const polygonPoints = corners.map(pointToString).join(' ');
    const xs = corners.map((corner) => corner.x);
    const ys = corners.map((corner) => corner.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX;
    const height = maxY - minY;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const axisOffset = 0.08 * zoomScale;

    // Format measurement text
    const widthText = formatLength(width, lengthUnit);
    const heightText = formatLength(height, lengthUnit);

    const horizontalAxisData = descriptorAxisTranslation(
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );
    const verticalAxisData = descriptorAxisTranslation(
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );

    const cursor =
      Math.abs(direction.x) > Math.abs(direction.y) ? 'ew-resize' : 'ns-resize';
    return (
      <g key={`bbox-${shape.id}`} data-export-exclude="true">
        <rect
          x={minX}
          y={minY}
          width={maxX - minX}
          height={maxY - minY}
          fill="transparent"
          stroke="none"
          cursor="move"
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, targetId);
          }}
          onClick={(e) => e.stopPropagation()}
        />

        <polygon
          points={polygonPoints}
          fill="none"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />

        {isWindowLike || shape.category === 'door' ? (
          [start, end].map((handlePoint, index) => (
            <rect
              key={`opening-window-handle-${index}`}
              x={handlePoint.x - handleSize / 2}
              y={handlePoint.y - handleSize / 2}
              width={handleSize}
              height={handleSize}
              fill="white"
              stroke="#4A90E2"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              cursor={cursor}
              onMouseDown={(e) => onResizeStart(e, targetId, index === 0 ? 'start' : 'end')}
              onClick={(e) => e.stopPropagation()}
            />
          ))
        ) : (
          <>
            {[corners[0], corners[3]].map((handlePoint, index) => (
              <rect
                key={`opening-start-${index}`}
                x={handlePoint.x - handleSize / 2}
                y={handlePoint.y - handleSize / 2}
                width={handleSize}
                height={handleSize}
                fill="white"
                stroke="#4A90E2"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                cursor={cursor}
                onMouseDown={(e) => onResizeStart(e, targetId, 'start')}
                onClick={(e) => e.stopPropagation()}
              />
            ))}

            {[corners[1], corners[2]].map((handlePoint, index) => (
              <rect
                key={`opening-end-${index}`}
                x={handlePoint.x - handleSize / 2}
                y={handlePoint.y - handleSize / 2}
                width={handleSize}
                height={handleSize}
                fill="white"
                stroke="#4A90E2"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                cursor={cursor}
                onMouseDown={(e) => onResizeStart(e, targetId, 'end')}
                onClick={(e) => e.stopPropagation()}
              />
            ))}
          </>
        )}

        {/* Measurements when resizing */}
        {showMeasurements && (() => {
          if (shouldUseDescriptorLayer) {
            if (showAxisMeasurements && width > 0.01) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-width`,
                start: { x: minX, y: maxY },
                end: { x: maxX, y: maxY },
                text: widthText,
                zoomScale,
                offset: axisOffset,
                side: horizontalAxisData.orientation,
              });
            }

            if (showAxisMeasurements && height > 0.01) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-height`,
                start: { x: maxX, y: minY },
                end: { x: maxX, y: maxY },
                text: heightText,
                zoomScale,
                offset: axisOffset,
                side: verticalAxisData.orientation,
              });
            }
          }

          return (
            <>
              {/* Legacy rendering fallback */}
              {!shouldUseDescriptorLayer && (
                <>
                  {/* Horizontal measurement */}
                  {showAxisMeasurements && width > 0.01 && (
                    <g transform={`translate(${midX}, ${maxY + 0.3 * zoomScale}) scale(${zoomScale})`}>
                      <rect
                        x={-getChipWidth(widthText) / 2}
                        y={-chipHeight / 2}
                        width={getChipWidth(widthText)}
                        height={chipHeight}
                        fill="#000000"
                        rx="0.02"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="600"
                        style={{ userSelect: 'none' }}
                      >
                        {widthText}
                      </text>
                    </g>
                  )}

                  {/* Vertical measurement */}
                  {showAxisMeasurements && height > 0.01 && (
                    <g transform={`translate(${maxX + 0.3 * zoomScale}, ${midY}) scale(${zoomScale})`}>
                      <rect
                        x={-getChipWidth(heightText) / 2}
                        y={-chipHeight / 2}
                        width={getChipWidth(heightText)}
                        height={chipHeight}
                        fill="#000000"
                        rx="0.02"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="600"
                        style={{ userSelect: 'none' }}
                      >
                        {heightText}
                      </text>
                    </g>
                  )}
                </>
              )}
            </>
          );
        })()}
      </g>
    );
  } else if (shape.type === 'polyline' && shape.points.length >= 2) {
    // Calculate bounding box for polyline
    const xs = shape.points.map(p => p.x);
    const ys = shape.points.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const width = maxX - minX;
    const height = maxY - minY;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const axisOffset = 0.08 * zoomScale;

    // Format measurement text
    const widthText = formatLength(width, lengthUnit);
    const heightText = formatLength(height, lengthUnit);

    const horizontalAxisData = descriptorAxisTranslation(
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );
    const verticalAxisData = descriptorAxisTranslation(
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );

    return (
      <g key={`bbox-${shape.id}`} data-export-exclude="true">
        {/* Invisible fill area for dragging */}
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill="transparent"
          stroke="none"
          cursor="move"
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, targetId);
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Bounding rectangle (solid stroke like line tool) */}
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill="none"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />

        {/* Corner handles - square handles at 4 corners like line tool */}
        {/* Top-left */}
        <rect
          x={minX - handleSize / 2}
          y={minY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nwse-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'tl');
            }
          }}
        />
        {/* Top-right */}
        <rect
          x={maxX - handleSize / 2}
          y={minY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nesw-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'tr');
            }
          }}
        />
        {/* Bottom-left */}
        <rect
          x={minX - handleSize / 2}
          y={maxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nesw-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'bl');
            }
          }}
        />
        {/* Bottom-right */}
        <rect
          x={maxX - handleSize / 2}
          y={maxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nwse-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'br');
            }
          }}
        />

        {/* Measurement overlays during resize - show individual segment measurements */}
        {showMeasurements && (() => {
          if (shouldUseDescriptorLayer) {
            if (showAxisMeasurements && width > 0.01) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-width`,
                start: { x: minX, y: maxY },
                end: { x: maxX, y: maxY },
                text: widthText,
                zoomScale,
                offset: axisOffset,
                side: horizontalAxisData.orientation,
              });
            }

            if (showAxisMeasurements && height > 0.01) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-height`,
                start: { x: maxX, y: minY },
                end: { x: maxX, y: maxY },
                text: heightText,
                zoomScale,
                offset: axisOffset,
                side: verticalAxisData.orientation,
              });
            }
          }

          return (
            <>
              {/* Legacy rendering fallback for bounding box measurements */}
              {!shouldUseDescriptorLayer && (
                <>
                  {/* Horizontal measurement of bounding box */}
                  {showAxisMeasurements && width > 0.01 && (
                    <g transform={`translate(${midX}, ${maxY + 0.3 * zoomScale}) scale(${zoomScale})`}>
                      <rect
                        x={-getChipWidth(widthText) / 2}
                        y={-chipHeight / 2}
                        width={getChipWidth(widthText)}
                        height={chipHeight}
                        fill="#000000"
                        rx="0.02"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="600"
                        style={{ userSelect: 'none' }}
                      >
                        {widthText}
                      </text>
                    </g>
                  )}

                  {/* Vertical measurement of bounding box */}
                  {showAxisMeasurements && height > 0.01 && (
                    <g transform={`translate(${maxX + 0.3 * zoomScale}, ${midY}) scale(${zoomScale})`}>
                      <rect
                        x={-getChipWidth(heightText) / 2}
                        y={-chipHeight / 2}
                        width={getChipWidth(heightText)}
                        height={chipHeight}
                        fill="#000000"
                        rx="0.02"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="600"
                        style={{ userSelect: 'none' }}
                      >
                        {heightText}
                      </text>
                    </g>
                  )}
                </>
              )}

              {/* Individual segment measurements - skip if showing axis measurements (width/height) */}
              {!showAxisMeasurements && shape.points.map((point, index) => {
                if (index === 0) return null;

                const prevPoint = shape.points[index - 1];
                const segmentLength = calculateLength(prevPoint, point);

                if (segmentLength < 0.01) return null;

                const segmentMidX = (prevPoint.x + point.x) / 2;
                const segmentMidY = (prevPoint.y + point.y) / 2;
                const lengthText = formatLength(segmentLength, lengthUnit);

                // Calculate line angle
                const dx = point.x - prevPoint.x;
                const dy = point.y - prevPoint.y;
                const lineAngleRad = Math.atan2(dy, dx);
                let lineAngleDeg = lineAngleRad * (180 / Math.PI);

                // Keep text upright - flip if line angle makes text upside down
                const textFlip = lineAngleDeg > 90 || lineAngleDeg < -90;
                if (textFlip) {
                  lineAngleDeg = lineAngleDeg + 180;
                }

                const offset = 0.35 * zoomScale;
                const halfLen = segmentLength / 2;
                const chipWidth = getChipWidth(lengthText) * zoomScale;
                const chipHalfWidth = chipWidth / 2;
                const scaledChipHeight = chipHeight * zoomScale;
                const extLineLength = offset + 0.05 * zoomScale;

                return (
                  <g key={`segment-${index}`} transform={`translate(${segmentMidX}, ${segmentMidY}) rotate(${lineAngleDeg})`}>
                    {/* Left extension line */}
                    <line
                      x1={-halfLen}
                      y1={0}
                      x2={-halfLen}
                      y2={-extLineLength}
                      stroke="#555555"
                      strokeWidth={0.5}
                      strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Right extension line */}
                    <line
                      x1={halfLen}
                      y1={0}
                      x2={halfLen}
                      y2={-extLineLength}
                      stroke="#555555"
                      strokeWidth={0.5}
                      strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Left segment of dimension line */}
                    <line
                      x1={-halfLen}
                      y1={-offset}
                      x2={-chipHalfWidth}
                      y2={-offset}
                      stroke="#4A90E2"
                      strokeWidth={0.75}
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Right segment of dimension line */}
                    <line
                      x1={halfLen}
                      y1={-offset}
                      x2={chipHalfWidth}
                      y2={-offset}
                      stroke="#4A90E2"
                      strokeWidth={0.75}
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Measurement chip */}
                    <rect
                      x={-chipHalfWidth}
                      y={-offset - scaledChipHeight / 2}
                      width={chipWidth}
                      height={scaledChipHeight}
                      fill="#000000"
                      rx={0.02 * zoomScale}
                    />

                    {/* Measurement text */}
                    <text
                      x="0"
                      y={-offset}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={fontSize * zoomScale}
                      fontWeight="600"
                      style={{ userSelect: 'none' }}
                    >
                      {lengthText}
                    </text>
                  </g>
                );
              })}
            </>
          );
        })()}
      </g>
    );
  } else if (shape.type === 'curve' && shape.points.length >= 2) {
    // Calculate actual bounding box for curve by sampling the spline path
    // This ensures the curve stays within the bounding box (Catmull-Rom can overshoot control points)
    const bounds = calculateCurveBounds(shape.points, 20, 0);
    const minX = bounds.minX;
    const minY = bounds.minY;
    const maxX = bounds.maxX;
    const maxY = bounds.maxY;

    const width = maxX - minX;
    const height = maxY - minY;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const axisOffset = 0.08 * zoomScale;

    // Format measurement text
    const horizontalText = formatLength(width, lengthUnit);
    const verticalText = formatLength(height, lengthUnit);

    const horizontalAxisData = descriptorAxisTranslation(
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );
    const verticalAxisData = descriptorAxisTranslation(
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );

    return (
      <g key={`bbox-${shape.id}`} data-export-exclude="true">
        {/* Invisible fill area for dragging */}
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill="transparent"
          stroke="none"
          cursor="move"
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, targetId);
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Bounding rectangle */}
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill="none"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />

        {/* Corner handles - square handles at 4 corners */}
        {/* Top-left */}
        <rect
          x={minX - handleSize / 2}
          y={minY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nwse-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'tl');
            }
          }}
        />
        {/* Top-right */}
        <rect
          x={maxX - handleSize / 2}
          y={minY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nesw-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'tr');
            }
          }}
        />
        {/* Bottom-left */}
        <rect
          x={minX - handleSize / 2}
          y={maxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nesw-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'bl');
            }
          }}
        />
        {/* Bottom-right */}
        <rect
          x={maxX - handleSize / 2}
          y={maxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nwse-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'br');
            }
          }}
        />

        {/* Measurement overlays during resize */}
        {showMeasurements && (width > 0.01 || height > 0.01) && (() => {
          if (shouldUseDescriptorLayer) {
            if (showAxisMeasurements && width > 0.01) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-width`,
                start: { x: minX, y: maxY },
                end: { x: maxX, y: maxY },
                text: horizontalText,
                zoomScale,
                offset: axisOffset,
                side: horizontalAxisData.orientation,
              });
            }

            if (showAxisMeasurements && height > 0.01) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-height`,
                start: { x: maxX, y: minY },
                end: { x: maxX, y: maxY },
                text: verticalText,
                zoomScale,
                offset: axisOffset,
                side: verticalAxisData.orientation,
              });
            }
          }

          return (
            <>
              {/* Legacy rendering fallback */}
              {!shouldUseDescriptorLayer && (
                <>
                  {/* Horizontal measurement */}
                  {showAxisMeasurements && width > 0.01 && (
                    <g transform={`translate(${midX}, ${maxY + 0.3 * zoomScale}) scale(${zoomScale})`}>
                      <rect
                        x={-getChipWidth(horizontalText) / 2}
                        y={-chipHeight / 2}
                        width={getChipWidth(horizontalText)}
                        height={chipHeight}
                        fill="#000000"
                        rx="0.02"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="600"
                        style={{ userSelect: 'none' }}
                      >
                        {horizontalText}
                      </text>
                    </g>
                  )}

                  {/* Vertical measurement */}
                  {showAxisMeasurements && height > 0.01 && (
                    <g transform={`translate(${maxX + 0.3 * zoomScale}, ${midY}) scale(${zoomScale})`}>
                      <rect
                        x={-getChipWidth(verticalText) / 2}
                        y={-chipHeight / 2}
                        width={getChipWidth(verticalText)}
                        height={chipHeight}
                        fill="#000000"
                        rx="0.02"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="600"
                        style={{ userSelect: 'none' }}
                      >
                        {verticalText}
                      </text>
                    </g>
                  )}
                </>
              )}
            </>
          );
        })()}
      </g>
    );
  } else if (shape.type === 'arc') {
    // Calculate proper bounding box for arc considering the curved path
    const arcBounds = getArcBounds(shape.start, shape.end, shape.controlPoint);
    const minX = arcBounds.minX;
    const minY = arcBounds.minY;
    const maxX = arcBounds.maxX;
    const maxY = arcBounds.maxY;

    const width = maxX - minX;
    const height = maxY - minY;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const axisOffset = 0.08 * zoomScale;

    // Format measurement text
    const horizontalText = formatLength(width, lengthUnit);
    const verticalText = formatLength(height, lengthUnit);

    const horizontalAxisData = descriptorAxisTranslation(
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );
    const verticalAxisData = descriptorAxisTranslation(
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );

    return (
      <g key={`bbox-${shape.id}`} data-export-exclude="true">
        {/* Invisible fill area for dragging */}
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill="transparent"
          stroke="none"
          cursor="move"
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, targetId);
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Bounding rectangle - solid stroke like polyline */}
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill="none"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />

        {/* Corner resize handles - render last so they're on top */}
        {/* Top-left */}
        <rect
          x={minX - handleSize / 2}
          y={minY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nwse-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'tl');
            }
          }}
        />

        {/* Top-right */}
        <rect
          x={maxX - handleSize / 2}
          y={minY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nesw-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'tr');
            }
          }}
        />

        {/* Bottom-left */}
        <rect
          x={minX - handleSize / 2}
          y={maxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nesw-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'bl');
            }
          }}
        />

        {/* Bottom-right */}
        <rect
          x={maxX - handleSize / 2}
          y={maxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nwse-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'br');
            }
          }}
        />

        {/* Measurements when resizing */}
        {showMeasurements && (() => {
          if (shouldUseDescriptorLayer) {
            if (width > 0.01) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-width`,
                start: { x: minX, y: maxY },
                end: { x: maxX, y: maxY },
                text: horizontalText,
                zoomScale,
                offset: axisOffset,
                side: horizontalAxisData.orientation,
              });
            }

            if (height > 0.01) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-height`,
                start: { x: maxX, y: minY },
                end: { x: maxX, y: maxY },
                text: verticalText,
                zoomScale,
                offset: axisOffset,
                side: verticalAxisData.orientation,
              });
            }
          }

          return (
            <>
              {/* Legacy rendering fallback */}
              {!shouldUseDescriptorLayer && (
                <>
                  {/* Horizontal measurement */}
                  {width > 0.01 && (
                    <g transform={`translate(${midX}, ${maxY + 0.3 * zoomScale}) scale(${zoomScale})`}>
                      <rect
                        x={-getChipWidth(horizontalText) / 2}
                        y={-chipHeight / 2}
                        width={getChipWidth(horizontalText)}
                        height={chipHeight}
                        fill="#000000"
                        rx="0.02"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="600"
                        style={{ userSelect: 'none' }}
                      >
                        {horizontalText}
                      </text>
                    </g>
                  )}

                  {/* Vertical measurement */}
                  {height > 0.01 && (
                    <g transform={`translate(${maxX + 0.3 * zoomScale}, ${midY}) scale(${zoomScale})`}>
                      <rect
                        x={-getChipWidth(verticalText) / 2}
                        y={-chipHeight / 2}
                        width={getChipWidth(verticalText)}
                        height={chipHeight}
                        fill="#000000"
                        rx="0.02"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="600"
                        style={{ userSelect: 'none' }}
                      >
                        {verticalText}
                      </text>
                    </g>
                  )}
                </>
              )}
            </>
          );
        })()}
      </g>
    );
  } else if (shape.type === 'circle') {
    // Calculate bounding box for circle
    const minX = shape.center.x - shape.radius;
    const minY = shape.center.y - shape.radius;
    const maxX = shape.center.x + shape.radius;
    const maxY = shape.center.y + shape.radius;
    const width = shape.radius * 2;
    const height = shape.radius * 2;

    // Format measurement text
    const radiusText = formatLength(shape.radius, lengthUnit);

    return (
      <g key={`bbox-${shape.id}`} data-export-exclude="true">
        {/* Invisible fill area for dragging */}
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill="transparent"
          stroke="none"
          cursor="move"
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, targetId);
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Bounding rectangle - solid stroke like polyline */}
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill="none"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />

        {/* Corner resize handles - render last so they're on top */}
        {/* Top-left */}
        <rect
          x={minX - handleSize / 2}
          y={minY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nwse-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'tl');
            }
          }}
        />

        {/* Top-right */}
        <rect
          x={maxX - handleSize / 2}
          y={minY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nesw-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'tr');
            }
          }}
        />

        {/* Bottom-left */}
        <rect
          x={minX - handleSize / 2}
          y={maxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nesw-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'bl');
            }
          }}
        />

        {/* Bottom-right */}
        <rect
          x={maxX - handleSize / 2}
          y={maxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nwse-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'br');
            }
          }}
        />

        {/* Measurements when resizing */}
        {showMeasurements && (
          <>
            {shape.radius > 0.01 && (
              <>
                {/* Center point cross - red marker */}
                <g>
                  <line
                    x1={shape.center.x - 0.03 * zoomScale}
                    y1={shape.center.y}
                    x2={shape.center.x + 0.03 * zoomScale}
                    y2={shape.center.y}
                    stroke="#E63946"
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                  <line
                    x1={shape.center.x}
                    y1={shape.center.y - 0.03 * zoomScale}
                    x2={shape.center.x}
                    y2={shape.center.y + 0.03 * zoomScale}
                    stroke="#E63946"
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>

                {/* Dashed radius line from center to right edge */}
                <line
                  x1={shape.center.x}
                  y1={shape.center.y}
                  x2={shape.center.x + shape.radius}
                  y2={shape.center.y}
                  stroke="#6F62A4"
                  strokeWidth={0.5}
                  strokeDasharray="0.02,0.02"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.5"
                />

                {/* Tiny dot at the edge of circle */}
                <circle
                  cx={shape.center.x + shape.radius}
                  cy={shape.center.y}
                  r={0.015 * zoomScale}
                  fill="#6F62A4"
                />

                {/* Radius measurement chip at midpoint of radius line */}
                <g transform={`translate(${shape.center.x + shape.radius / 2}, ${shape.center.y - 0.1 * zoomScale}) scale(${zoomScale})`}>
                  <rect
                    x={-getChipWidth(radiusText) / 2}
                    y={-chipHeight / 2}
                    width={getChipWidth(radiusText)}
                    height={chipHeight}
                    fill={defaultDimensionTheme.backgroundColor}
                    rx="0.02"
                  />
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={defaultDimensionTheme.textColor}
                    fontSize={fontSize}
                    fontWeight={defaultDimensionTheme.fontWeight}
                    fontFamily={defaultDimensionTheme.fontFamily}
                    style={{ userSelect: 'none' }}
                  >
                    {radiusText}
                  </text>
                </g>
              </>
            )}
          </>
        )}
      </g>
    );
  } else if (shape.type === 'rectangle') {
    // Calculate bounding box for rectangle
    const minX = Math.min(shape.start.x, shape.end.x);
    const minY = Math.min(shape.start.y, shape.end.y);
    const maxX = Math.max(shape.start.x, shape.end.x);
    const maxY = Math.max(shape.start.y, shape.end.y);
    const width = maxX - minX;
    const height = maxY - minY;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const axisOffset = 0.08 * zoomScale;

    // Format measurement text
    const widthText = formatLength(width, lengthUnit);
    const heightText = formatLength(height, lengthUnit);

    const horizontalAxisData = descriptorAxisTranslation(
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );
    const verticalAxisData = descriptorAxisTranslation(
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );

    return (
      <g key={`bbox-${shape.id}`} data-export-exclude="true">
        {/* Invisible fill area for dragging */}
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill="transparent"
          stroke="none"
          cursor="move"
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, targetId);
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Bounding rectangle - solid stroke */}
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill="none"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />

        {/* Corner resize handles */}
        {/* Top-left */}
        <rect
          x={minX - handleSize / 2}
          y={minY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nwse-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'tl');
            }
          }}
        />

        {/* Top-right */}
        <rect
          x={maxX - handleSize / 2}
          y={minY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nesw-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'tr');
            }
          }}
        />

        {/* Bottom-left */}
        <rect
          x={minX - handleSize / 2}
          y={maxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nesw-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'bl');
            }
          }}
        />

        {/* Bottom-right */}
        <rect
          x={maxX - handleSize / 2}
          y={maxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nwse-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'br');
            }
          }}
        />

        {/* Edge resize handles */}
        {/* Top edge */}
        <rect
          x={minX + width / 2 - handleSize / 2}
          y={minY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="ns-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onRectangleEdgeResizeStart) {
              onRectangleEdgeResizeStart(e, targetId, 'top');
            }
          }}
        />

        {/* Right edge */}
        <rect
          x={maxX - handleSize / 2}
          y={minY + height / 2 - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="ew-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onRectangleEdgeResizeStart) {
              onRectangleEdgeResizeStart(e, targetId, 'right');
            }
          }}
        />

        {/* Bottom edge */}
        <rect
          x={minX + width / 2 - handleSize / 2}
          y={maxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="ns-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onRectangleEdgeResizeStart) {
              onRectangleEdgeResizeStart(e, targetId, 'bottom');
            }
          }}
        />

        {/* Left edge */}
        <rect
          x={minX - handleSize / 2}
          y={minY + height / 2 - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="ew-resize"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onRectangleEdgeResizeStart) {
              onRectangleEdgeResizeStart(e, targetId, 'left');
            }
          }}
        />

        {/* Measurements when resizing */}
        {showMeasurements && (() => {
          if (shouldUseDescriptorLayer) {
            if (width > 0.01) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-width`,
                start: { x: minX, y: maxY },
                end: { x: maxX, y: maxY },
                text: widthText,
                zoomScale,
                offset: axisOffset,
                side: horizontalAxisData.orientation,
              });
            }

            if (height > 0.01) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-height`,
                start: { x: maxX, y: minY },
                end: { x: maxX, y: maxY },
                text: heightText,
                zoomScale,
                offset: axisOffset,
                side: verticalAxisData.orientation,
              });
            }
          }

          return (
            <>
              {/* Legacy rendering fallback */}
              {!shouldUseDescriptorLayer && (
                <>
                  {/* Width measurement at bottom with CAD-style dimension lines */}
                  {width > 0.01 && (
                    <g>
                      {(() => {
                        const offset = 0.35 * zoomScale;
                        const chipWidth = getChipWidth(widthText) * zoomScale;
                        const chipHalfWidth = chipWidth / 2;
                        const scaledChipHeight = chipHeight * zoomScale;
                        const extLineLength = offset + 0.05 * zoomScale;

                        return (
                          <g>
                            {/* Left extension line */}
                            <line
                              x1={minX}
                              y1={maxY}
                              x2={minX}
                              y2={maxY + extLineLength}
                              stroke="#555555"
                              strokeWidth={0.5}
                              strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
                              vectorEffect="non-scaling-stroke"
                            />

                            {/* Right extension line */}
                            <line
                              x1={maxX}
                              y1={maxY}
                              x2={maxX}
                              y2={maxY + extLineLength}
                              stroke="#555555"
                              strokeWidth={0.5}
                              strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
                              vectorEffect="non-scaling-stroke"
                            />

                            {/* Left segment of dimension line */}
                            <line
                              x1={minX}
                              y1={maxY + offset}
                              x2={midX - chipHalfWidth}
                              y2={maxY + offset}
                              stroke="#4A90E2"
                              strokeWidth={0.75}
                              vectorEffect="non-scaling-stroke"
                            />

                            {/* Right segment of dimension line */}
                            <line
                              x1={maxX}
                              y1={maxY + offset}
                              x2={midX + chipHalfWidth}
                              y2={maxY + offset}
                              stroke="#4A90E2"
                              strokeWidth={0.75}
                              vectorEffect="non-scaling-stroke"
                            />

                            {/* Measurement chip */}
                            <rect
                              x={midX - chipHalfWidth}
                              y={maxY + offset - scaledChipHeight / 2}
                              width={chipWidth}
                              height={scaledChipHeight}
                              fill="#000000"
                              rx={0.02 * zoomScale}
                            />

                            {/* Measurement text */}
                            <text
                              x={midX}
                              y={maxY + offset}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize={fontSize * zoomScale}
                              fontWeight="600"
                              style={{ userSelect: 'none' }}
                            >
                              {widthText}
                            </text>
                          </g>
                        );
                      })()}
                    </g>
                  )}

                  {/* Height measurement at right with CAD-style dimension lines */}
                  {height > 0.01 && (
                    <g>
                      {(() => {
                        const offset = 0.35 * zoomScale;
                        const chipWidth = getChipWidth(heightText) * zoomScale;
                        const chipHalfWidth = chipWidth / 2;
                        const scaledChipHeight = chipHeight * zoomScale;
                        const extLineLength = offset + 0.05 * zoomScale;

                        return (
                          <g>
                            {/* Top extension line */}
                            <line
                              x1={maxX}
                              y1={minY}
                              x2={maxX + extLineLength}
                              y2={minY}
                              stroke="#555555"
                              strokeWidth={0.5}
                              strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
                              vectorEffect="non-scaling-stroke"
                            />

                            {/* Bottom extension line */}
                            <line
                              x1={maxX}
                              y1={maxY}
                              x2={maxX + extLineLength}
                              y2={maxY}
                              stroke="#555555"
                              strokeWidth={0.5}
                              strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
                              vectorEffect="non-scaling-stroke"
                            />

                            {/* Top segment of dimension line */}
                            <line
                              x1={maxX + offset}
                              y1={minY}
                              x2={maxX + offset}
                              y2={midY - chipHalfWidth}
                              stroke="#4A90E2"
                              strokeWidth={0.75}
                              vectorEffect="non-scaling-stroke"
                            />

                            {/* Bottom segment of dimension line */}
                            <line
                              x1={maxX + offset}
                              y1={maxY}
                              x2={maxX + offset}
                              y2={midY + chipHalfWidth}
                              stroke="#4A90E2"
                              strokeWidth={0.75}
                              vectorEffect="non-scaling-stroke"
                            />

                            {/* Measurement chip */}
                            <rect
                              x={maxX + offset - scaledChipHeight / 2}
                              y={midY - chipHalfWidth}
                              width={scaledChipHeight}
                              height={chipWidth}
                              fill="#000000"
                              rx={0.02 * zoomScale}
                            />

                            {/* Measurement text (rotated for vertical) */}
                            <text
                              x={maxX + offset}
                              y={midY}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize={fontSize * zoomScale}
                              fontWeight="600"
                              style={{ userSelect: 'none' }}
                              transform={`rotate(-90, ${maxX + offset}, ${midY})`}
                            >
                              {heightText}
                            </text>
                          </g>
                        );
                      })()}
                    </g>
                  )}
                </>
              )}
            </>
          );
        })()}
      </g>
    );
  } else if (shape.type === 'room') {
    if (!shape.points || shape.points.length === 0) {
      return null;
    }
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
    const defaultMinX = Math.min(...xs);
    const defaultMaxX = Math.max(...xs);
    const defaultMinY = Math.min(...ys);
    const defaultMaxY = Math.max(...ys);

    const bounds = roomWallBounds ?? {
      minX: defaultMinX,
      maxX: defaultMaxX,
      minY: defaultMinY,
      maxY: defaultMaxY,
    };

    const minX = bounds.minX;
    const maxX = bounds.maxX;
    const minY = bounds.minY;
    const maxY = bounds.maxY;
    const width = maxX - minX;
    const height = maxY - minY;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const axisOffset = 0.08 * zoomScale;

    // Format measurement text
    const widthText = formatLength(width, lengthUnit);
    const heightText = formatLength(height, lengthUnit);

    const horizontalAxisData = descriptorAxisTranslation(
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );
    const verticalAxisData = descriptorAxisTranslation(
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );

    return (
      <g key={`bbox-${shape.id}`} data-export-exclude="true">
        <rect
          x={minX}
          y={minY}
          width={maxX - minX}
          height={maxY - minY}
          fill="transparent"
          stroke="none"
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, targetId);
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <rect
          x={minX}
          y={minY}
          width={maxX - minX}
          height={maxY - minY}
          fill="none"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
        {/* Corner resize handles */}
        {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => {
          const x = corner.includes('l') ? minX : maxX;
          const y = corner.includes('t') ? minY : maxY;
          const cursor =
            corner === 'tl'
              ? 'nwse-resize'
              : corner === 'tr'
                ? 'nesw-resize'
                : corner === 'bl'
                  ? 'nesw-resize'
                  : 'nwse-resize';
          return (
            <rect
              key={`room-corner-${corner}`}
              x={x - handleSize / 2}
              y={y - handleSize / 2}
              width={handleSize}
              height={handleSize}
              fill="white"
              stroke="#4A90E2"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              cursor={cursor}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (onRoomCornerResizeStart) {
                  onRoomCornerResizeStart(e, targetId, corner);
                }
              }}
            />
          );
        })}

        {/* Measurements when resizing */}
        {showMeasurements && (() => {
          if (shouldUseDescriptorLayer) {
            if (showAxisMeasurements && width > 0.01) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-width`,
                start: { x: minX, y: maxY },
                end: { x: maxX, y: maxY },
                text: widthText,
                zoomScale,
                offset: axisOffset,
                side: horizontalAxisData.orientation,
              });
            }

            if (showAxisMeasurements && height > 0.01) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-height`,
                start: { x: maxX, y: minY },
                end: { x: maxX, y: maxY },
                text: heightText,
                zoomScale,
                offset: axisOffset,
                side: verticalAxisData.orientation,
              });
            }
          }

          return (
            <>
              {/* Legacy rendering fallback */}
              {!shouldUseDescriptorLayer && (
                <>
                  {/* Horizontal measurement */}
                  {showAxisMeasurements && width > 0.01 && (
                    <g transform={`translate(${midX}, ${maxY + 0.3 * zoomScale}) scale(${zoomScale})`}>
                      <rect
                        x={-getChipWidth(widthText) / 2}
                        y={-chipHeight / 2}
                        width={getChipWidth(widthText)}
                        height={chipHeight}
                        fill="#000000"
                        rx="0.02"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="600"
                        style={{ userSelect: 'none' }}
                      >
                        {widthText}
                      </text>
                    </g>
                  )}

                  {/* Vertical measurement */}
                  {showAxisMeasurements && height > 0.01 && (
                    <g transform={`translate(${maxX + 0.3 * zoomScale}, ${midY}) scale(${zoomScale})`}>
                      <rect
                        x={-getChipWidth(heightText) / 2}
                        y={-chipHeight / 2}
                        width={getChipWidth(heightText)}
                        height={chipHeight}
                        fill="#000000"
                        rx="0.02"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="600"
                        style={{ userSelect: 'none' }}
                      >
                        {heightText}
                      </text>
                    </g>
                  )}
                </>
              )}
            </>
          );
        })()}
      </g>
    );
  } else if (shape.type === 'wall') {
    const geometry = getWallRenderGeometry(shape);
    if (!geometry) return null;

    const { polygon } = geometry;
    const polygonPoints = polygon.map(pointToString).join(' ');

    const startPoint = shape.centerline[0];
    const endPoint = shape.centerline[shape.centerline.length - 1];
    const length = calculateLength(startPoint, endPoint);

    // Calculate wall angle for handle rotation
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const wallAngleRad = Math.atan2(dy, dx);
    const wallAngleDeg = wallAngleRad * (180 / Math.PI);

    // Determine offset direction (always "up" relative to wall direction)
    // For now, consistent offset is fine.
    const measurementOffset = 0.3 * zoomScale;
    const textOffset = measurementOffset + 0.15 * zoomScale;

    // For aligned measurements
    const midX = (startPoint.x + endPoint.x) / 2;
    const midY = (startPoint.y + endPoint.y) / 2;
    const lengthText = formatLength(length, lengthUnit);
    const chipHeight = 0.25 * zoomScale;
    const fontSize = 0.14 * zoomScale;

    // Ensure text is readable (not upside down)
    let textAngle = wallAngleDeg;
    let offsetDir = 1; // Default to "Above/Left"
    if (textAngle > 90 || textAngle < -90) {
      textAngle += 180;
      offsetDir = -1; // Flip to keep it on the same relative side (or consistent with text flip)
    }

    // We want the measurement to be "outside" the wall. 
    // Since we don't know which side is "outside" without context, let's just pick one side (e.g. Left/Top)
    // or try to detect the "empty" side? 
    // For now, consistent offset is fine.

    return (
      <g key={`bbox-${shape.id}`} data-export-exclude="true">
        {/* Snug bounding shape (visual) */}
        <polygon
          points={polygonPoints}
          fill="none"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />

        {/* Start handle (Square) */}
        <rect
          x={startPoint.x - handleSize / 2}
          y={startPoint.y - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="move"
          onMouseDown={(e) => {
            onResizeStart(e, targetId, 'start');
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* End handle (Arrow Head) */}
        <g
          transform={`translate(${endPoint.x}, ${endPoint.y}) rotate(${wallAngleDeg})`}
          cursor="move"
          onMouseDown={(e) => {
            onResizeStart(e, targetId, 'end');
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <path
            d={`M ${handleSize / 2},0 L ${-handleSize / 2},${-handleSize / 1.5} L ${-handleSize / 2},${handleSize / 1.5} Z`}
            fill="white"
            stroke="#4A90E2"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </g>

        {/* Measurements when resizing */}
        {showMeasurements && length > 0.01 && (() => {
          // Check for arc geometry
          const arcGeometry = shape.controlPoint
            ? calculateArcGeometry(startPoint, endPoint, shape.controlPoint)
            : null;

          if (arcGeometry && !arcGeometry.isLine) {
            // Arched Wall Logic
            if (shouldUseDescriptorLayer) {
              // Calculate inner and outer radii
              const halfThickness = shape.thickness / 2;

              // Base radius is the centerline radius
              // Inner/Outer relative to the arc center

              // Let's derive from base arc geometry + thickness
              // We assume the wall is concentric.

              // Inner Arc (smaller radius)
              const innerRadius = Math.max(arcGeometry.radius - halfThickness, 0.001);
              const outerRadius = arcGeometry.radius + halfThickness;

              // Calculate arc lengths
              let sweepAngle = arcGeometry.endAngle - arcGeometry.startAngle;
              if (arcGeometry.isCCW && sweepAngle < 0) sweepAngle += 2 * Math.PI;
              if (!arcGeometry.isCCW && sweepAngle > 0) sweepAngle -= 2 * Math.PI;

              const innerLength = Math.abs(innerRadius * sweepAngle);
              const outerLength = Math.abs(outerRadius * sweepAngle);

              const innerText = formatLength(innerLength, lengthUnit);
              const outerText = formatLength(outerLength, lengthUnit);

              // Emit Inner Dimension
              // ArcDimension takes an 'offset' which adds to the radius.
              // So for inner, we want offset such that (radius + offset) = innerRadius - margin
              // margin = 0.3 * zoomScale
              const margin = 0.3 * zoomScale;

              // We want the dimension line to be slightly away from the wall edge
              // Inner dimension radius = innerRadius - margin
              // Outer dimension radius = outerRadius + margin

              const innerDimOffset = (innerRadius - margin) - arcGeometry.radius;
              const outerDimOffset = (outerRadius + margin) - arcGeometry.radius;

              dimensionCollector?.({
                type: 'arc',
                id: `bbox-${shape.id}-inner`,
                center: arcGeometry.center,
                radius: arcGeometry.radius,
                startAngle: arcGeometry.startAngle,
                endAngle: arcGeometry.endAngle,
                isCCW: arcGeometry.isCCW,
                text: innerText,
                zoomScale,
                offset: innerDimOffset,
              });

              dimensionCollector?.({
                type: 'arc',
                id: `bbox-${shape.id}-outer`,
                center: arcGeometry.center,
                radius: arcGeometry.radius,
                startAngle: arcGeometry.startAngle,
                endAngle: arcGeometry.endAngle,
                isCCW: arcGeometry.isCCW,
                text: outerText,
                zoomScale,
                offset: outerDimOffset,
              });

              // Also show thickness? User didn't explicitly ask, but usually good. 
              // User said "thickness dimension line should remain the same".
              // In the image, there is a small flat dimension at the end.
              // Let's keep it simple and just do the arcs for now as requested.
            }

            // Fallback for manual rendering of arcs is complex, skipping for now as descriptor layer is standard.
            return null;
          }

          // Straight Wall Logic (Existing)
          if (shouldUseDescriptorLayer) {
            dimensionCollector?.({
              type: 'linear',
              id: `bbox-${shape.id}-length`,
              start: startPoint,
              end: endPoint,
              text: lengthText,
              zoomScale,
              offset: measurementOffset,
              side: offsetDir as 1 | -1,
            });
          }

          return (
            <>
              {!shouldUseDescriptorLayer && (
                <g transform={`translate(${midX}, ${midY}) rotate(${textAngle})`}>
                  {/* Dimension Line */}
                  <line
                    x1={-length / 2}
                    y1={-measurementOffset * offsetDir}
                    x2={length / 2}
                    y2={-measurementOffset * offsetDir}
                    stroke="#4A90E2"
                    strokeWidth={0.75}
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* End ticks */}
                  <line
                    x1={-length / 2}
                    y1={-measurementOffset * offsetDir - 0.05 * zoomScale}
                    x2={-length / 2}
                    y2={-measurementOffset * offsetDir + 0.05 * zoomScale}
                    stroke="#4A90E2"
                    strokeWidth={0.75}
                    vectorEffect="non-scaling-stroke"
                  />
                  <line
                    x1={length / 2}
                    y1={-measurementOffset * offsetDir - 0.05 * zoomScale}
                    x2={length / 2}
                    y2={-measurementOffset * offsetDir + 0.05 * zoomScale}
                    stroke="#4A90E2"
                    strokeWidth={0.75}
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* Text Chip */}
                  <g transform={`translate(0, ${-textOffset * offsetDir})`}>
                    <rect
                      x={-getChipWidth(lengthText) / 2}
                      y={-chipHeight / 2}
                      width={getChipWidth(lengthText)}
                      height={chipHeight}
                      fill="#000000"
                      rx={0.02 * zoomScale}
                    />
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={fontSize}
                      fontWeight="600"
                      style={{ userSelect: 'none' }}
                    >
                      {lengthText}
                    </text>
                  </g>
                </g>
              )}
            </>
          );
        })()}
      </g>
    );
  } else if (shape.type === 'zone') {
    if (!shape.points || shape.points.length === 0) {
      return null;
    }

    // Calculate bounding box from zone points
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = maxX - minX;
    const height = maxY - minY;
    const axisOffset = 0.08 * zoomScale;

    // Format measurement text
    const widthText = formatLength(width, lengthUnit);
    const heightText = formatLength(height, lengthUnit);

    const horizontalAxisData = descriptorAxisTranslation(
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );
    const verticalAxisData = descriptorAxisTranslation(
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );

    return (
      <g key={`bbox-${shape.id}`} data-export-exclude="true">
        {/* Invisible fill area for dragging */}
        <rect
          x={minX}
          y={minY}
          width={maxX - minX}
          height={maxY - minY}
          fill="transparent"
          stroke="none"
          cursor="move"
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, targetId);
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Bounding rectangle */}
        <rect
          x={minX}
          y={minY}
          width={maxX - minX}
          height={maxY - minY}
          fill="none"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />

        {/* Corner resize handles */}
        {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => {
          const x = corner.includes('l') ? minX : maxX;
          const y = corner.includes('t') ? minY : maxY;
          const cursor =
            corner === 'tl'
              ? 'nwse-resize'
              : corner === 'tr'
                ? 'nesw-resize'
                : corner === 'bl'
                  ? 'nesw-resize'
                  : 'nwse-resize';
          return (
            <rect
              key={corner}
              x={x - handleSize / 2}
              y={y - handleSize / 2}
              width={handleSize}
              height={handleSize}
              fill="white"
              stroke="#4A90E2"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              cursor={cursor}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (onRoomCornerResizeStart) {
                  onRoomCornerResizeStart(e, targetId, corner);
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        })}

        {/* Measurement overlays during resize */}
        {showMeasurements && (() => {
          if (shouldUseDescriptorLayer && showAxisMeasurements) {
            emitAxisLinearDescriptors({
              idPrefix: `bbox-${shape.id}`,
              visualMinX: minX,
              visualMinY: minY,
              visualMaxX: maxX,
              visualMaxY: maxY,
              horizontalText: widthText,
              verticalText: heightText,
              zoomScale,
              axisOffset,
              collector: dimensionCollector,
            });
          }

          return renderAxisMeasurements({
            horizontalTranslation: horizontalAxisData.translation,
            verticalTranslation: verticalAxisData.translation,
            horizontalText: widthText,
            verticalText: heightText,
            fontSize,
            chipHeight,
            getChipWidth,
            zoomScale,
            shouldUseDescriptorLayer,
            showAxisMeasurements,
            horizontalDist: width,
            verticalDist: height,
          });
        })()}
      </g>
    );
  } else if (shape.type === 'asset') {
    // Asset bounding box with corner resize handles (aspect-ratio locked)
    const { position, width, height, assetId } = shape;
    
    // Get asset definition for snug dimensions
    const assetDef = getAssetById(assetId);
    
    // Calculate snug dimensions (actual rendered size, maintaining aspect ratio)
    let snugWidth = width;
    let snugHeight = height;
    
    if (assetDef) {
      // Parse viewBox to get original aspect ratio
      const viewBoxParts = assetDef.viewBox.split(' ').map(Number);
      const vbWidth = viewBoxParts[2];
      const vbHeight = viewBoxParts[3];
      
      // Calculate uniform scale (same as in AssetShape)
      const scaleToFitX = width / vbWidth;
      const scaleToFitY = height / vbHeight;
      const uniformScale = Math.min(scaleToFitX, scaleToFitY);
      
      // Snug dimensions
      snugWidth = vbWidth * uniformScale;
      snugHeight = vbHeight * uniformScale;
    }
    
    // Calculate bounding box from center position using snug dimensions
    const minX = position.x - snugWidth / 2;
    const maxX = position.x + snugWidth / 2;
    const minY = position.y - snugHeight / 2;
    const maxY = position.y + snugHeight / 2;
    
    const midX = position.x;
    const midY = position.y;
    const axisOffset = 0.08 * zoomScale;

    // Format measurement text with snug dimensions
    const widthText = formatLength(snugWidth, lengthUnit);
    const heightText = formatLength(snugHeight, lengthUnit);

    const horizontalAxisData = descriptorAxisTranslation(
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );
    const verticalAxisData = descriptorAxisTranslation(
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      minX,
      minY,
      maxX,
      maxY,
      axisOffset,
    );

    return (
      <g key={`bbox-${shape.id}`} data-export-exclude="true">
        {/* Invisible fill area for dragging */}
        <rect
          x={minX}
          y={minY}
          width={maxX - minX}
          height={maxY - minY}
          fill="transparent"
          stroke="none"
          cursor="move"
          transform={`rotate(${shape.rotation}, ${position.x}, ${position.y})`}
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, targetId);
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Bounding rectangle */}
        <rect
          x={minX}
          y={minY}
          width={maxX - minX}
          height={maxY - minY}
          fill="none"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
          transform={`rotate(${shape.rotation}, ${position.x}, ${position.y})`}
        />

        {/* Corner resize handles - reuse polyline corner resize for aspect-ratio locked resizing */}
        {/* Top-left */}
        <rect
          x={minX - handleSize / 2}
          y={minY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nwse-resize"
          transform={`rotate(${shape.rotation}, ${position.x}, ${position.y})`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'tl');
            }
          }}
        />
        {/* Top-right */}
        <rect
          x={maxX - handleSize / 2}
          y={minY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nesw-resize"
          transform={`rotate(${shape.rotation}, ${position.x}, ${position.y})`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'tr');
            }
          }}
        />
        {/* Bottom-left */}
        <rect
          x={minX - handleSize / 2}
          y={maxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nesw-resize"
          transform={`rotate(${shape.rotation}, ${position.x}, ${position.y})`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'bl');
            }
          }}
        />
        {/* Bottom-right */}
        <rect
          x={maxX - handleSize / 2}
          y={maxY - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#4A90E2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          cursor="nwse-resize"
          transform={`rotate(${shape.rotation}, ${position.x}, ${position.y})`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onPolylineCornerResizeStart) {
              onPolylineCornerResizeStart(e, targetId, 'br');
            }
          }}
        />

        {/* Rotation handle for assets */}
        {onRotateHandleStart && (() => {
          const rotationOffset = 0.35 * zoomScale;
          const rotationHandleRadius = 0.04 * zoomScale;
          const pivotPoint = { x: position.x, y: position.y };
          
          // Calculate handle position accounting for current rotation
          const rotationRad = (shape.rotation * Math.PI) / 180;
          const handleX = position.x + Math.sin(rotationRad) * (snugHeight / 2 + rotationOffset);
          const handleY = position.y - Math.cos(rotationRad) * (snugHeight / 2 + rotationOffset);
          
          // Line start point (top center of bounding box, rotated)
          const lineStartX = position.x + Math.sin(rotationRad) * (snugHeight / 2);
          const lineStartY = position.y - Math.cos(rotationRad) * (snugHeight / 2);
          
          // Snap markers - show guide dots at snap angles
          const SNAP_ANGLES = [0, 45, 90, 135, 180, -135, -90, -45];
          const snapMarkerRadius = Math.max(snugWidth, snugHeight) / 2 + rotationOffset + 0.08 * zoomScale;
          const snapMarkerDotRadius = 0.015 * zoomScale;

          // Rotation label
          const rotationLabel = rotationPreview ? (() => {
            const isSnapped = rotationPreview.snappedAngle !== null && rotationPreview.snappedAngle !== undefined;
            const displayAngle = isSnapped ? rotationPreview.snappedAngle! : rotationPreview.absoluteAngle;
            const formattedAbs = `${displayAngle.toFixed(isSnapped ? 0 : 1)}°`;
            const snapHint = isSnapped ? ' ⊕' : '';
            const labelText = `${formattedAbs}${snapHint}`;
            const labelPadding = 0.02;
            const labelFontSize = 0.065;
            const labelCharWidth = labelFontSize * 0.6;
            const labelChipWidth = labelText.length * labelCharWidth + labelPadding * 2;
            const labelChipHeight = labelFontSize + labelPadding * 2;
            const labelOffset = 0.15 * zoomScale;
            const labelX = handleX + Math.sin(rotationRad) * labelOffset;
            const labelY = handleY - Math.cos(rotationRad) * labelOffset;
            const chipColor = isSnapped ? '#4A90E2' : (rotationPreview.absoluteAngle >= 0 ? '#00BFA5' : '#F59E0B');
            return (
              <g transform={`translate(${labelX}, ${labelY}) scale(${zoomScale})`}>
                <rect
                  x={-labelChipWidth / 2}
                  y={-labelChipHeight / 2}
                  width={labelChipWidth}
                  height={labelChipHeight}
                  fill={chipColor}
                  rx={0.02}
                  opacity={0.9}
                />
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize={labelFontSize}
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
            <g key="asset-rotate-handle" data-export-exclude="true">
              {/* Snap angle markers - visible during rotation */}
              {rotationPreview && (
                <g opacity={0.6}>
                  {/* Rotation guide circle (dashed) */}
                  <circle
                    cx={position.x}
                    cy={position.y}
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
                    const markerX = position.x + Math.sin(snapRad) * (snapMarkerRadius - 0.04 * zoomScale);
                    const markerY = position.y - Math.cos(snapRad) * (snapMarkerRadius - 0.04 * zoomScale);
                    const isQuadrant = snapAngle % 90 === 0;
                    const isActive = rotationPreview.snappedAngle === snapAngle;
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
                            x={position.x + Math.sin(snapRad) * (snapMarkerRadius + 0.06 * zoomScale)}
                            y={position.y - Math.cos(snapRad) * (snapMarkerRadius + 0.06 * zoomScale)}
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
              
              {/* Line from top of bounding box to rotation handle */}
              <line
                x1={lineStartX}
                y1={lineStartY}
                x2={handleX}
                y2={handleY}
                stroke="#4A90E2"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
              {/* Rotation handle circle */}
              <circle
                cx={handleX}
                cy={handleY}
                r={rotationHandleRadius}
                fill="#ffffff"
                stroke="#4A90E2"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                cursor="grab"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onRotateHandleStart(e, pivotPoint);
                }}
              />
              {rotationLabel}
            </g>
          );
        })()}

        {/* Measurement overlays during resize */}
        {showMeasurements && (width > 0.01 || height > 0.01) && (() => {
          if (shouldUseDescriptorLayer) {
            if (showAxisMeasurements && width > 0.01) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-width`,
                start: { x: minX, y: maxY },
                end: { x: maxX, y: maxY },
                text: widthText,
                zoomScale,
                offset: axisOffset,
                side: horizontalAxisData.orientation,
              });
            }

            if (showAxisMeasurements && height > 0.01) {
              dimensionCollector?.({
                type: 'linear',
                id: `bbox-${shape.id}-height`,
                start: { x: maxX, y: minY },
                end: { x: maxX, y: maxY },
                text: heightText,
                zoomScale,
                offset: axisOffset,
                side: verticalAxisData.orientation,
              });
            }
          }

          return (
            <>
              {/* Legacy rendering fallback */}
              {!shouldUseDescriptorLayer && (
                <>
                  {/* Horizontal measurement */}
                  {showAxisMeasurements && width > 0.01 && (
                    <g transform={`translate(${midX}, ${maxY + 0.3 * zoomScale}) scale(${zoomScale})`}>
                      <rect
                        x={-getChipWidth(widthText) / 2}
                        y={-chipHeight / 2}
                        width={getChipWidth(widthText)}
                        height={chipHeight}
                        fill="#000000"
                        rx="0.02"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="600"
                        style={{ userSelect: 'none' }}
                      >
                        {widthText}
                      </text>
                    </g>
                  )}

                  {/* Vertical measurement */}
                  {showAxisMeasurements && height > 0.01 && (
                    <g transform={`translate(${maxX + 0.3 * zoomScale}, ${midY}) scale(${zoomScale})`}>
                      <rect
                        x={-getChipWidth(heightText) / 2}
                        y={-chipHeight / 2}
                        width={getChipWidth(heightText)}
                        height={chipHeight}
                        fill="#000000"
                        rx="0.02"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="600"
                        style={{ userSelect: 'none' }}
                      >
                        {heightText}
                      </text>
                    </g>
                  )}
                </>
              )}
            </>
          );
        })()}
      </g>
    );
  }
  return null;
};
