import React, { useMemo } from 'react';
import type { OpeningShape, LengthUnit, OpeningSwingState, MeasurementSettings, ToolbarStyle } from '../../types';
import { isWindowLikeOpening } from './isWindowLikeOpening';
import { getWindowVisualMetrics, WINDOW_VIEWBOX, WINDOW_SVG_CONTENT, getSingleWindowVisualMetrics, SINGLE_WINDOW_VIEWBOX, SINGLE_WINDOW_SVG_CONTENT, getSlidingWindowVisualMetrics, SLIDING_WINDOW_VIEWBOX, SLIDING_WINDOW_SVG_CONTENT, getBayWindowVisualMetrics, BAY_WINDOW_VIEWBOX, BAY_WINDOW_SVG_CONTENT, getSlidingDoorVisualMetrics, SLIDING_DOOR_VIEWBOX, SLIDING_DOOR_SVG_CONTENT, getFrenchDoorVisualMetrics, FRENCH_DOOR_VIEWBOX, FRENCH_DOOR_SVG_CONTENT } from './openingVisuals';
import { getDoorVisualMetrics, DOOR_VIEWBOX, DOOR_SVG_CONTENT, DOOR_FRAME_THICKNESS_SVG } from './doorVisuals';
import type { WindowVisualType, DoorVisualType } from '../OpeningPresets';
import { useDimensionCollector } from './dimensions/DimensionContext';
import { formatLength } from '../../utils/measurements';
import {
  getFillAttribute,
  getStrokeAttribute,
  getStrokeWidth,
  getStrokeDashArray,
  getFillOpacity,
  getShapeOpacity,
  getStrokeOpacity,
  getBlendMode,
  getFilterAttribute,
} from './appearanceUtils';
import {
  DynamicShadowFilter,
  DynamicGradient,
} from './AppearanceRenderer';

interface OpeningShapeProps {
  shape: OpeningShape;
  isSelected: boolean;
  isHovered: boolean;
  zoomScale: number;
  lengthUnit: LengthUnit;
  showMeasurements?: boolean;
  measurementSettings?: MeasurementSettings;
  useDimensionLayer?: boolean;
  toolbarStyle?: ToolbarStyle;
  onMouseDown: (e: React.MouseEvent<SVGElement>, shapeId?: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFlip?: (openingId: string, flipState: Partial<OpeningSwingState>) => void;
  wallThickness?: number;
}

// Helper to replace stroke colors in SVG content for dark themes
const recolorSvgStrokes = (svgContent: string, newStrokeColor: string): string => {
  return svgContent
    .replace(/stroke="rgba\(0,0,0,[^"]+\)"/g, `stroke="${newStrokeColor}"`)
    .replace(/stroke="rgba\(188,188,188,[^"]+\)"/g, `stroke="${newStrokeColor}"`)
    .replace(/stroke="#000000"/g, `stroke="${newStrokeColor}"`)
    .replace(/stroke="#1a1a1a"/g, `stroke="${newStrokeColor}"`);
};

const normalizeVector = (x: number, y: number) => {
  const length = Math.hypot(x, y);
  if (!length || length < 1e-6) {
    return { x: 1, y: 0 };
  }
  return { x: x / length, y: y / length };
};

const pointToString = (point: { x: number; y: number }) => `${point.x},${point.y}`;
const getAnchorMarkerRadius = (openingWidth: number) => {
  const referenceWidth = 3; // meters, roughly a standard door width
  const normalizedWidth = Math.max(openingWidth, 0.1) / referenceWidth;
  const scaledRadius = normalizedWidth * 0.03;
  return Math.max(0.008, Math.min(0.035, scaledRadius));
};

/**
 * OpeningShapeComponent - Memoized for performance
 * Handles doors, windows, and generic openings
 */
export const OpeningShapeComponent: React.FC<OpeningShapeProps> = React.memo(({
  shape,
  isSelected,
  isHovered,
  zoomScale,
  lengthUnit,
  showMeasurements = false,
  measurementSettings,
  useDimensionLayer = false,
  toolbarStyle = 'modern',
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onFlip,
  wallThickness,
}) => {
  const dimensionCollector = useDimensionCollector();
  const shouldUseDescriptorLayer = Boolean(useDimensionLayer && dimensionCollector);

  // Determine if we need white strokes for dark themes
  const useLightStrokes = toolbarStyle === 'windows95' || toolbarStyle === 'cyber';
  const themeStrokeColor = useLightStrokes ? '#ffffff' : null;

  // Memoize recolored SVG content for performance
  const themedWindowContent = useMemo(() =>
    themeStrokeColor ? recolorSvgStrokes(WINDOW_SVG_CONTENT, themeStrokeColor) : WINDOW_SVG_CONTENT,
    [themeStrokeColor]
  );
  const themedSingleWindowContent = useMemo(() =>
    themeStrokeColor ? recolorSvgStrokes(SINGLE_WINDOW_SVG_CONTENT, themeStrokeColor) : SINGLE_WINDOW_SVG_CONTENT,
    [themeStrokeColor]
  );
  const themedSlidingWindowContent = useMemo(() =>
    themeStrokeColor ? recolorSvgStrokes(SLIDING_WINDOW_SVG_CONTENT, themeStrokeColor) : SLIDING_WINDOW_SVG_CONTENT,
    [themeStrokeColor]
  );
  const themedBayWindowContent = useMemo(() =>
    themeStrokeColor ? recolorSvgStrokes(BAY_WINDOW_SVG_CONTENT, themeStrokeColor) : BAY_WINDOW_SVG_CONTENT,
    [themeStrokeColor]
  );
  const themedDoorContent = useMemo(() =>
    themeStrokeColor ? recolorSvgStrokes(DOOR_SVG_CONTENT, themeStrokeColor) : DOOR_SVG_CONTENT,
    [themeStrokeColor]
  );
  const themedSlidingDoorContent = useMemo(() =>
    themeStrokeColor ? recolorSvgStrokes(SLIDING_DOOR_SVG_CONTENT, themeStrokeColor) : SLIDING_DOOR_SVG_CONTENT,
    [themeStrokeColor]
  );
  const themedFrenchDoorContent = useMemo(() =>
    themeStrokeColor ? recolorSvgStrokes(FRENCH_DOOR_SVG_CONTENT, themeStrokeColor) : FRENCH_DOOR_SVG_CONTENT,
    [themeStrokeColor]
  );
  const direction = normalizeVector(shape.direction.x, shape.direction.y);
  const normal = normalizeVector(shape.normal.x, shape.normal.y);
  const halfWidth = Math.max(shape.width / 2, 0.05);
  const frameOffset = Math.max(shape.frameThickness / 2, 0.03);
  const isWindowLike = isWindowLikeOpening(shape);

  // Determine window visual type from metadata (default to 'casement' for backwards compatibility)
  const windowVisualType: WindowVisualType = (shape.metadata?.visualType as WindowVisualType) || 'casement';
  const isSingleWindow = windowVisualType === 'single';
  const isSlidingWindow = windowVisualType === 'sliding';
  const isBayWindow = windowVisualType === 'bay';

  // Determine door visual type from metadata (default to 'swing' for backwards compatibility)
  const doorVisualType: DoorVisualType = (shape.metadata?.visualType as DoorVisualType) || 'swing';
  const isSlidingDoor = shape.category === 'door' && doorVisualType === 'sliding';
  const isFrenchDoor = shape.category === 'door' && doorVisualType === 'french';

  // Get the appropriate metrics based on visual type
  const casementMetrics = getWindowVisualMetrics(shape);
  const singleMetrics = getSingleWindowVisualMetrics(shape);
  const slidingMetrics = getSlidingWindowVisualMetrics(shape);
  const bayMetrics = getBayWindowVisualMetrics(shape);
  const slidingDoorMetrics = getSlidingDoorVisualMetrics(shape);
  const frenchDoorMetrics = getFrenchDoorVisualMetrics(shape);
  const windowMetrics = isBayWindow ? bayMetrics : isSlidingWindow ? slidingMetrics : isSingleWindow ? singleMetrics : casementMetrics;

  const {
    windowVisualHeight,
    windowVisualWidth,
    anchorOffset,
    mainPositiveExtent,
    mainNegativeExtent,
    scale,
  } = windowMetrics;
  const { scale: doorScale } = getDoorVisualMetrics(shape);

  const signedScaleX = shape.swing.hinge === 'right' ? -doorScale : doorScale;
  const signedScaleY = shape.swing.facing === 'negative' ? -doorScale : doorScale;

  const rotationDegrees = Math.atan2(direction.y, direction.x) * (180 / Math.PI);
  const openingLabel = isWindowLike
    ? 'Window'
    : shape.category === 'door'
      ? 'Door'
      : 'Opening';

  const start = {
    x: shape.anchor.x - direction.x * halfWidth,
    y: shape.anchor.y - direction.y * halfWidth,
  };
  const end = {
    x: shape.anchor.x + direction.x * halfWidth,
    y: shape.anchor.y + direction.y * halfWidth,
  };

  // Calculate visual frame thickness for door to ensure snug fit
  const doorFrameVisualThickness = DOOR_FRAME_THICKNESS_SVG * doorScale;

  // Calculate a precise hit area offset based on the actual frame thickness
  // This ensures clicks only register on the opening itself, not the extended visual area
  // Use a small buffer (max 0.08 or 1.5x frame thickness) to keep hit area tight
  // If wallThickness is provided, constrain the hit area to be within the wall
  const hitAreaOffset = wallThickness
    ? Math.min(frameOffset * 1.5, wallThickness / 2)
    : Math.min(frameOffset * 1.5, 0.08);

  const positiveFillOffset = isWindowLike
    ? mainPositiveExtent
    : shape.category === 'door'
      ? isSlidingDoor
        ? slidingDoorMetrics.mainPositiveExtent
        : isFrenchDoor
          ? frenchDoorMetrics.mainPositiveExtent
          : doorFrameVisualThickness / 2
      : frameOffset;

  const negativeFillOffset = isWindowLike
    ? mainNegativeExtent
    : shape.category === 'door'
      ? isSlidingDoor
        ? slidingDoorMetrics.mainNegativeExtent
        : isFrenchDoor
          ? frenchDoorMetrics.mainNegativeExtent
          : doorFrameVisualThickness / 2
      : frameOffset;


  // Emit dimension descriptors if using descriptor layer
  // Only show dimensions when opening is NOT attached to a wall (detached)
  // When attached to a wall, the wall's segmented dimension line already shows the opening dimension
  const isAttachedToWall = shape.host !== null;

  // Smart Measurement Logic
  const isGlobalEnabled = measurementSettings ? measurementSettings.enabled : showMeasurements;
  const showSpan = isGlobalEnabled
    ? (measurementSettings?.spanDimensions ?? true)
    : isSelected;
  const showLabel = isGlobalEnabled
    ? (measurementSettings?.chipDimensions ?? true)
    : isSelected;

  if (shouldUseDescriptorLayer && (showSpan || showLabel) && !isSelected && shape.width > 0.01 && !isAttachedToWall) {
    // Width dimension (linear dimension along the opening)
    if (showSpan) {
      const widthText = formatLength(shape.width, lengthUnit);
      const baseOffset = 0.35 * zoomScale;
      const totalOffset = baseOffset + Math.max(frameOffset, positiveFillOffset) + 0.05 * zoomScale;

      dimensionCollector?.({
        type: 'linear',
        id: `opening-${shape.id}-width`,
        start: start,
        end: end,
        text: widthText,
        zoomScale,
        offset: totalOffset,
        // Place dimension on the positive normal side (outside the opening)
        side: 1,
      });
    }

    // Label chip (for non-window-like openings)
    if (!isWindowLike && showLabel) {
      const chipOffset = Math.max(0.35, 0.25 * zoomScale);
      const chipCenter = {
        x: shape.anchor.x + normal.x * (frameOffset + chipOffset),
        y: shape.anchor.y + normal.y * (frameOffset + chipOffset),
      };

      dimensionCollector?.({
        type: 'chip',
        id: `opening-${shape.id}-label`,
        position: chipCenter,
        text: openingLabel,
        zoomScale,
      });
    }
  }

  const facePoints = [
    {
      x: start.x + normal.x * positiveFillOffset,
      y: start.y + normal.y * positiveFillOffset,
    },
    {
      x: end.x + normal.x * positiveFillOffset,
      y: end.y + normal.y * positiveFillOffset,
    },
    {
      x: end.x - normal.x * negativeFillOffset,
      y: end.y - normal.y * negativeFillOffset,
    },
    {
      x: start.x - normal.x * negativeFillOffset,
      y: start.y - normal.y * negativeFillOffset,
    },
  ];

  // Precise hit area points - only covers the actual opening region, not extended visuals
  // This prevents openings from intercepting clicks meant for walls at high zoom levels
  const hitAreaPoints = [
    {
      x: start.x + normal.x * hitAreaOffset,
      y: start.y + normal.y * hitAreaOffset,
    },
    {
      x: end.x + normal.x * hitAreaOffset,
      y: end.y + normal.y * hitAreaOffset,
    },
    {
      x: end.x - normal.x * hitAreaOffset,
      y: end.y - normal.y * hitAreaOffset,
    },
    {
      x: start.x - normal.x * hitAreaOffset,
      y: start.y - normal.y * hitAreaOffset,
    },
  ];

  const strokeColor = isSelected ? '#6F62A4' : isHovered ? '#4A90E2' : '#1F1F1F';
  const baseFillColor = isSelected
    ? 'rgba(111, 98, 164, 0.28)'
    : shape.category === 'window'
      ? 'rgba(111, 98, 164, 0.18)'
      : shape.category === 'door'
        ? 'rgba(16, 16, 16, 0.03)' // Very subtle for door
        : 'rgba(16, 16, 16, 0.12)';
  const fillColor = isWindowLike && !isSelected ? 'transparent' : baseFillColor;
  const strokeWidth = Math.max(0.02, 0.015 * zoomScale);

  return (
    <g
      key={shape.id}
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown(e, shape.id);
      }}
      onMouseEnter={() => onMouseEnter()}
      onMouseLeave={() => onMouseLeave()}
    >
      {isWindowLike && shape.category !== 'door' && !isSingleWindow && !isSlidingWindow && !isBayWindow && (
        <g
          transform={`translate(${shape.anchor.x} ${shape.anchor.y}) rotate(${rotationDegrees})`}
          opacity={isSelected ? 0.95 : isHovered ? 0.88 : 0.8}
          style={{ pointerEvents: 'none' }}
        >
          <g
            transform={`translate(${-windowVisualWidth / 2} ${shape.swing.facing === 'negative'
              ? windowVisualHeight / 2 - anchorOffset
              : -windowVisualHeight / 2 + anchorOffset
              })`}
          >
            <g transform={`scale(${scale} ${shape.swing.facing === 'negative' ? -scale : scale})`}>
              <g
                transform={`translate(${-WINDOW_VIEWBOX.minX} ${-WINDOW_VIEWBOX.minY})`}
                dangerouslySetInnerHTML={{ __html: themedWindowContent }}
              />
            </g>
          </g>
        </g>
      )}

      {isWindowLike && shape.category !== 'door' && isSingleWindow && (
        <g
          transform={`translate(${shape.anchor.x} ${shape.anchor.y}) rotate(${rotationDegrees})`}
          opacity={isSelected ? 0.95 : isHovered ? 0.88 : 0.8}
          style={{ pointerEvents: 'none' }}
        >
          <g
            transform={`translate(${-windowVisualWidth / 2} ${shape.swing.facing === 'negative'
              ? windowVisualHeight / 2 - anchorOffset
              : -windowVisualHeight / 2 + anchorOffset
              })`}
          >
            <g transform={`scale(${scale} ${shape.swing.facing === 'negative' ? -scale : scale})`}>
              <g
                transform={`translate(${-SINGLE_WINDOW_VIEWBOX.minX} ${-SINGLE_WINDOW_VIEWBOX.minY})`}
                dangerouslySetInnerHTML={{ __html: themedSingleWindowContent }}
              />
            </g>
          </g>
        </g>
      )}

      {isWindowLike && shape.category !== 'door' && isSlidingWindow && (
        <g
          transform={`translate(${shape.anchor.x} ${shape.anchor.y}) rotate(${rotationDegrees})`}
          opacity={isSelected ? 0.95 : isHovered ? 0.88 : 0.8}
          style={{ pointerEvents: 'none' }}
        >
          <g
            transform={`translate(${-windowVisualWidth / 2} ${shape.swing.facing === 'negative'
              ? windowVisualHeight / 2 - anchorOffset
              : -windowVisualHeight / 2 + anchorOffset
              })`}
          >
            <g transform={`scale(${scale} ${shape.swing.facing === 'negative' ? -scale : scale})`}>
              <g
                transform={`translate(${-SLIDING_WINDOW_VIEWBOX.minX} ${-SLIDING_WINDOW_VIEWBOX.minY})`}
                dangerouslySetInnerHTML={{ __html: themedSlidingWindowContent }}
              />
            </g>
          </g>
        </g>
      )}

      {isWindowLike && shape.category !== 'door' && isBayWindow && (
        <g
          transform={`translate(${shape.anchor.x} ${shape.anchor.y}) rotate(${rotationDegrees})`}
          opacity={isSelected ? 0.95 : isHovered ? 0.88 : 0.8}
          style={{ pointerEvents: 'none' }}
        >
          <g
            transform={`translate(${-BAY_WINDOW_VIEWBOX.width * scale / 2} ${shape.swing.facing === 'negative'
              ? windowVisualHeight / 2 - anchorOffset
              : -windowVisualHeight / 2 + anchorOffset
              })`}
          >
            <g transform={`scale(${scale} ${shape.swing.facing === 'negative' ? -scale : scale})`}>
              <g
                transform={`translate(${-BAY_WINDOW_VIEWBOX.minX} ${-BAY_WINDOW_VIEWBOX.minY})`}
                dangerouslySetInnerHTML={{ __html: themedBayWindowContent }}
              />
            </g>
          </g>
        </g>
      )}

      {shape.category === 'door' && !isSlidingDoor && !isFrenchDoor && (
        <g
          transform={`translate(${shape.anchor.x} ${shape.anchor.y}) rotate(${rotationDegrees})`}
          opacity={isSelected ? 0.95 : isHovered ? 0.88 : 0.8}
          style={{ pointerEvents: 'none' }}
        >
          <g
            transform={`translate(${DOOR_VIEWBOX.minX * signedScaleX} ${DOOR_VIEWBOX.minY * signedScaleY
              })`}
          >
            <g transform={`scale(${signedScaleX} ${signedScaleY})`}>
              <g
                transform={`translate(${-DOOR_VIEWBOX.minX} ${-DOOR_VIEWBOX.minY})`}
                dangerouslySetInnerHTML={{ __html: themedDoorContent }}
              />
            </g>
          </g>
        </g>
      )}

      {shape.category === 'door' && isSlidingDoor && (
        <g
          transform={`translate(${shape.anchor.x} ${shape.anchor.y}) rotate(${rotationDegrees})`}
          opacity={isSelected ? 0.95 : isHovered ? 0.88 : 0.8}
          style={{ pointerEvents: 'none' }}
        >
          <g
            transform={`translate(${-slidingDoorMetrics.doorVisualWidth / 2} ${shape.swing.facing === 'negative'
              ? slidingDoorMetrics.doorVisualHeight / 2 - slidingDoorMetrics.anchorOffset
              : -slidingDoorMetrics.doorVisualHeight / 2 + slidingDoorMetrics.anchorOffset
              })`}
          >
            <g transform={`scale(${slidingDoorMetrics.scale} ${shape.swing.facing === 'negative' ? -slidingDoorMetrics.scale : slidingDoorMetrics.scale})`}>
              <g
                transform={`translate(${-SLIDING_DOOR_VIEWBOX.minX} ${-SLIDING_DOOR_VIEWBOX.minY})`}
                dangerouslySetInnerHTML={{ __html: themedSlidingDoorContent }}
              />
            </g>
          </g>
        </g>
      )}

      {shape.category === 'door' && isFrenchDoor && (
        <g
          transform={`translate(${shape.anchor.x} ${shape.anchor.y}) rotate(${rotationDegrees})`}
          opacity={isSelected ? 0.95 : isHovered ? 0.88 : 0.8}
          style={{ pointerEvents: 'none' }}
        >
          <g
            transform={`translate(${-frenchDoorMetrics.doorVisualWidth / 2} ${shape.swing.facing === 'negative'
              ? frenchDoorMetrics.doorVisualHeight / 2 - frenchDoorMetrics.anchorOffset
              : -frenchDoorMetrics.doorVisualHeight / 2 + frenchDoorMetrics.anchorOffset
              })`}
          >
            <g transform={`scale(${frenchDoorMetrics.scale} ${shape.swing.facing === 'negative' ? -frenchDoorMetrics.scale : frenchDoorMetrics.scale})`}>
              <g
                transform={`translate(${-FRENCH_DOOR_VIEWBOX.minX} ${-FRENCH_DOOR_VIEWBOX.minY})`}
                dangerouslySetInnerHTML={{ __html: themedFrenchDoorContent }}
              />
            </g>
          </g>
        </g>
      )}

      {/* Dynamic definitions for appearance */}
      {shape.appearance?.fill?.type === 'gradient' && shape.appearance.fill.gradient && (
        <DynamicGradient shapeId={shape.id} fill={shape.appearance.fill} />
      )}
      {shape.appearance?.shadow && (
        <DynamicShadowFilter shapeId={shape.id} shadow={shape.appearance.shadow} />
      )}

      {/* Invisible hit area to capture clicks - uses precise bounds around opening centerline */}
      {/* This ensures opening can be selected and takes precedence over wall selection */}
      <polygon
        points={hitAreaPoints.map(pointToString).join(' ')}
        fill="transparent"
        stroke="none"
        pointerEvents="all"
        style={{ cursor: 'move' }}
      />

      <polygon
        points={facePoints.map(pointToString).join(' ')}
        fill={shape.appearance ? getFillAttribute(shape.appearance?.fill, shape.id) : fillColor}
        fillOpacity={shape.appearance ? getFillOpacity(shape.appearance) : undefined}
        stroke={shape.appearance ? getStrokeAttribute(shape.appearance, shape.category === 'door' ? 'none' : strokeColor) : (shape.category === 'door' ? 'none' : strokeColor)}
        strokeWidth={shape.appearance ? getStrokeWidth(shape.appearance, strokeWidth) : strokeWidth}
        strokeDasharray={shape.appearance ? getStrokeDashArray(shape.appearance) : undefined}
        strokeOpacity={shape.appearance ? getStrokeOpacity(shape.appearance) : undefined}
        opacity={shape.appearance ? getShapeOpacity(shape.appearance) : undefined}
        vectorEffect="non-scaling-stroke"
        style={{ mixBlendMode: getBlendMode(shape.appearance) }}
        filter={getFilterAttribute(shape.appearance, shape.id)}
        pointerEvents="none"
      />

      {/* Reference line - excluded from export */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.8}
        strokeDasharray={isSelected ? '0.15 0.1' : undefined}
        vectorEffect="non-scaling-stroke"
        data-export-exclude="true"
      />

      {/* Anchor marker - excluded from export */}
      <circle
        cx={shape.anchor.x}
        cy={shape.anchor.y}
        r={getAnchorMarkerRadius(shape.width)}
        fill={strokeColor}
        opacity={isSelected ? 0.9 : 0.6}
        pointerEvents="none"
        data-export-exclude="true"
      />

      {/* Flip controls - only show when selected and attached to a wall */}
      {isSelected && isAttachedToWall && onFlip && (
        <g
          onMouseDown={(e) => e.stopPropagation()}
          data-export-exclude="true"
        >
          {isWindowLike ? (
            // Window Flip Controls (Two-way arrows)
            <g>
              {(() => {
                const flipControlDistY = Math.max(positiveFillOffset, negativeFillOffset) + 0.3 * zoomScale;

                return (
                  <>
                    {/* Dashed line through the center */}
                    <line
                      x1={shape.anchor.x - normal.x * flipControlDistY}
                      y1={shape.anchor.y - normal.y * flipControlDistY}
                      x2={shape.anchor.x + normal.x * flipControlDistY}
                      y2={shape.anchor.y + normal.y * flipControlDistY}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth * 0.3}
                      strokeDasharray="0.05 0.05"
                      opacity={0.5}
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Positive Side Marker (Outside) */}
                    <g
                      transform={`translate(${shape.anchor.x + normal.x * (flipControlDistY - 0.05 * zoomScale)} ${shape.anchor.y + normal.y * (flipControlDistY - 0.05 * zoomScale)
                        }) rotate(${Math.atan2(normal.y, normal.x) * (180 / Math.PI) - 90})`}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlip(shape.id, { facing: 'positive' });
                      }}
                    >
                      <polygon
                        points={`0,0 -${0.03 * zoomScale},${0.05 * zoomScale} ${0.03 * zoomScale},${0.05 * zoomScale}`}
                        fill={shape.swing.facing === 'positive' ? '#6F62A4' : 'white'}
                        stroke="#6F62A4"
                        strokeWidth={0.005 * zoomScale}
                      />
                    </g>

                    {/* Negative Side Marker (Inside) */}
                    <g
                      transform={`translate(${shape.anchor.x - normal.x * (flipControlDistY - 0.05 * zoomScale)} ${shape.anchor.y - normal.y * (flipControlDistY - 0.05 * zoomScale)
                        }) rotate(${Math.atan2(normal.y, normal.x) * (180 / Math.PI) + 90})`}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlip(shape.id, { facing: 'negative' });
                      }}
                    >
                      <polygon
                        points={`0,0 -${0.03 * zoomScale},${0.05 * zoomScale} ${0.03 * zoomScale},${0.05 * zoomScale}`}
                        fill={shape.swing.facing === 'negative' ? '#6F62A4' : 'white'}
                        stroke="#6F62A4"
                        strokeWidth={0.005 * zoomScale}
                      />
                    </g>
                  </>
                );
              })()}
            </g>
          ) : shape.category === 'door' && (isSlidingDoor || isFrenchDoor) ? (
            // Sliding/French Door Flip Controls (Two-way arrows, like windows)
            <g>
              {(() => {
                const flipControlDistY = Math.max(positiveFillOffset, negativeFillOffset) + 0.3 * zoomScale;

                return (
                  <>
                    {/* Dashed line through the center */}
                    <line
                      x1={shape.anchor.x - normal.x * flipControlDistY}
                      y1={shape.anchor.y - normal.y * flipControlDistY}
                      x2={shape.anchor.x + normal.x * flipControlDistY}
                      y2={shape.anchor.y + normal.y * flipControlDistY}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth * 0.3}
                      strokeDasharray="0.05 0.05"
                      opacity={0.5}
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Positive Side Marker (Outside) */}
                    <g
                      transform={`translate(${shape.anchor.x + normal.x * (flipControlDistY - 0.05 * zoomScale)} ${shape.anchor.y + normal.y * (flipControlDistY - 0.05 * zoomScale)
                        }) rotate(${Math.atan2(normal.y, normal.x) * (180 / Math.PI) - 90})`}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlip(shape.id, { facing: 'positive' });
                      }}
                    >
                      <polygon
                        points={`0,0 -${0.03 * zoomScale},${0.05 * zoomScale} ${0.03 * zoomScale},${0.05 * zoomScale}`}
                        fill={shape.swing.facing === 'positive' ? '#6F62A4' : 'white'}
                        stroke="#6F62A4"
                        strokeWidth={0.005 * zoomScale}
                      />
                    </g>

                    {/* Negative Side Marker (Inside) */}
                    <g
                      transform={`translate(${shape.anchor.x - normal.x * (flipControlDistY - 0.05 * zoomScale)} ${shape.anchor.y - normal.y * (flipControlDistY - 0.05 * zoomScale)
                        }) rotate(${Math.atan2(normal.y, normal.x) * (180 / Math.PI) + 90})`}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlip(shape.id, { facing: 'negative' });
                      }}
                    >
                      <polygon
                        points={`0,0 -${0.03 * zoomScale},${0.05 * zoomScale} ${0.03 * zoomScale},${0.05 * zoomScale}`}
                        fill={shape.swing.facing === 'negative' ? '#6F62A4' : 'white'}
                        stroke="#6F62A4"
                        strokeWidth={0.005 * zoomScale}
                      />
                    </g>
                  </>
                );
              })()}
            </g>
          ) : shape.category === 'door' ? (
            // Swing Door Flip Controls (4-way)
            <g>
              {(() => {
                const flipControlDistX = halfWidth + 0.3 * zoomScale;
                const flipControlDistY = Math.max(positiveFillOffset, negativeFillOffset) + 0.3 * zoomScale;

                return (
                  <>
                    {/* Crosshair */}
                    <line
                      x1={shape.anchor.x - normal.x * flipControlDistY}
                      y1={shape.anchor.y - normal.y * flipControlDistY}
                      x2={shape.anchor.x + normal.x * flipControlDistY}
                      y2={shape.anchor.y + normal.y * flipControlDistY}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth * 0.3}
                      strokeDasharray="0.05 0.05"
                      opacity={0.5}
                      vectorEffect="non-scaling-stroke"
                    />
                    <line
                      x1={shape.anchor.x - direction.x * flipControlDistX}
                      y1={shape.anchor.y - direction.y * flipControlDistX}
                      x2={shape.anchor.x + direction.x * flipControlDistX}
                      y2={shape.anchor.y + direction.y * flipControlDistX}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth * 0.3}
                      strokeDasharray="0.05 0.05"
                      opacity={0.5}
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Top Marker (Facing Positive/Outside) */}
                    <g
                      transform={`translate(${shape.anchor.x + normal.x * (flipControlDistY - 0.05 * zoomScale)} ${shape.anchor.y + normal.y * (flipControlDistY - 0.05 * zoomScale)
                        }) rotate(${Math.atan2(normal.y, normal.x) * (180 / Math.PI) - 90})`}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlip(shape.id, { facing: 'positive' });
                      }}
                    >
                      <polygon
                        points={`0,0 -${0.03 * zoomScale},${0.05 * zoomScale} ${0.03 * zoomScale},${0.05 * zoomScale}`}
                        fill={shape.swing.facing === 'positive' ? '#6F62A4' : 'white'}
                        stroke="#6F62A4"
                        strokeWidth={0.005 * zoomScale}
                      />
                    </g>

                    {/* Bottom Marker (Facing Negative/Inside) */}
                    <g
                      transform={`translate(${shape.anchor.x - normal.x * (flipControlDistY - 0.05 * zoomScale)} ${shape.anchor.y - normal.y * (flipControlDistY - 0.05 * zoomScale)
                        }) rotate(${Math.atan2(normal.y, normal.x) * (180 / Math.PI) + 90})`}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlip(shape.id, { facing: 'negative' });
                      }}
                    >
                      <polygon
                        points={`0,0 -${0.03 * zoomScale},${0.05 * zoomScale} ${0.03 * zoomScale},${0.05 * zoomScale}`}
                        fill={shape.swing.facing === 'negative' ? '#6F62A4' : 'white'}
                        stroke="#6F62A4"
                        strokeWidth={0.005 * zoomScale}
                      />
                    </g>

                    {/* Left Marker (Hinge Left) */}
                    <g
                      transform={`translate(${shape.anchor.x - direction.x * (flipControlDistX - 0.05 * zoomScale)} ${shape.anchor.y - direction.y * (flipControlDistX - 0.05 * zoomScale)
                        }) rotate(${Math.atan2(direction.y, direction.x) * (180 / Math.PI) + 90})`}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlip(shape.id, { hinge: 'left' });
                      }}
                    >
                      <polygon
                        points={`0,0 -${0.03 * zoomScale},${0.05 * zoomScale} ${0.03 * zoomScale},${0.05 * zoomScale}`}
                        fill={shape.swing.hinge === 'left' ? '#6F62A4' : 'white'}
                        stroke="#6F62A4"
                        strokeWidth={0.005 * zoomScale}
                      />
                    </g>

                    {/* Right Marker (Hinge Right) */}
                    <g
                      transform={`translate(${shape.anchor.x + direction.x * (flipControlDistX - 0.05 * zoomScale)} ${shape.anchor.y + direction.y * (flipControlDistX - 0.05 * zoomScale)
                        }) rotate(${Math.atan2(direction.y, direction.x) * (180 / Math.PI) - 90})`}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlip(shape.id, { hinge: 'right' });
                      }}
                    >
                      <polygon
                        points={`0,0 -${0.03 * zoomScale},${0.05 * zoomScale} ${0.03 * zoomScale},${0.05 * zoomScale}`}
                        fill={shape.swing.hinge === 'right' ? '#6F62A4' : 'white'}
                        stroke="#6F62A4"
                        strokeWidth={0.005 * zoomScale}
                      />
                    </g>
                  </>
                );
              })()}
            </g>
          ) : null}
        </g>
      )}
    </g >
  );
});

// Display name for React DevTools
OpeningShapeComponent.displayName = 'OpeningShapeComponent';

