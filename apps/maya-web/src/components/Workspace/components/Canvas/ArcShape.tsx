import React from 'react';
import type { ArcShape, ToolType, LengthUnit, MeasurementSettings } from '../../types';
import { calculateArcLength, calculateArcAngle, formatLength, formatAngle, calculateArcGeometry, getSemicircleMarkers } from '../../utils/measurements';
import { useDimensionCollector } from './dimensions/DimensionContext';
import { defaultDimensionTheme } from './dimensions/theme';
import {
  getStrokeAttribute,
  getStrokeWidth,
  getStrokeDashArray,
  getStrokeLineCap,
  getShapeOpacity,
  getStrokeOpacity,
  getBlendMode,
  getFilterAttribute,
} from './appearanceUtils';
import { DynamicShadowFilter, HATCH_PATTERN_ID } from './AppearanceRenderer';

interface ArcShapeProps {
  shape: ArcShape;
  showMeasurements?: boolean;
  measurementSettings?: MeasurementSettings;
  isSelected: boolean;
  isHovered: boolean;
  forceHatch?: boolean;
  activeTool: ToolType;
  lengthUnit: LengthUnit;
  zoomScale: number;
  useDimensionLayer?: boolean;
  onMouseDown: (e: React.MouseEvent<SVGElement>, shapeId: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const ArcShapeComponent: React.FC<ArcShapeProps> = React.memo(({
  shape,
  showMeasurements = false,
  measurementSettings,
  isSelected,
  isHovered,
  forceHatch = false,
  activeTool,
  lengthUnit,
  zoomScale,
  useDimensionLayer = false,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}) => {
  const dimensionCollector = useDimensionCollector();
  const shouldUseDescriptorLayer = Boolean(useDimensionLayer && dimensionCollector);

  if (shape.type !== 'arc') return null;

  // Check if we're in the initial state (after first click)
  const isInitialState =
    Math.abs(shape.start.x - shape.end.x) < 0.001 &&
    Math.abs(shape.start.y - shape.end.y) < 0.001;

  const arcLength = calculateArcLength(shape.start, shape.end, shape.controlPoint);
  const arcAngle = calculateArcAngle(shape.start, shape.end, shape.controlPoint);
  const geometry = calculateArcGeometry(shape.start, shape.end, shape.controlPoint);
  const chordMidpoint = {
    x: (shape.start.x + shape.end.x) / 2,
    y: (shape.start.y + shape.end.y) / 2,
  };
  const semicircleMarkers = getSemicircleMarkers(shape.start, shape.end);
  const hasUsableChord = Boolean(semicircleMarkers);
  const hatchOpacity = isSelected ? 0.22 : 0.14;
  const showHatchState = forceHatch || isSelected || isHovered;

  // Format measurement text
  const lengthText = formatLength(arcLength, lengthUnit);
  const angleText = formatAngle(arcAngle);
  const radiusText = formatLength(geometry.radius, lengthUnit);

  // Use architectural dimension theme
  const theme = defaultDimensionTheme;
  const chipPadding = theme.chipPadding;
  const fontSize = theme.fontSize;
  const charWidth = fontSize * theme.charWidthFactor;

  const getChipWidth = (text: string) => text.length * charWidth + chipPadding * 2;
  const chipHeight = fontSize + chipPadding * 2;

  // Smart Measurement Logic
  const isGlobalEnabled = measurementSettings ? measurementSettings.enabled : showMeasurements;
  const showArc = isGlobalEnabled
    ? (measurementSettings?.arcDimensions ?? true)
    : isSelected;
  const showRadius = isGlobalEnabled
    ? (measurementSettings?.linearDimensions ?? true)
    : isSelected;
  const showAngles = isGlobalEnabled
    ? (measurementSettings?.angles ?? true)
    : isSelected;

  // Calculate sweep angle once (used for both path and midpoint)
  let sweepAngle = 0;
  if (!geometry.isLine) {
    sweepAngle = geometry.endAngle - geometry.startAngle;

    // Adjust sweep angle based on direction
    if (geometry.isCCW) {
      // Counter-clockwise: if negative, add 2π to get positive angle
      if (sweepAngle < 0) sweepAngle += 2 * Math.PI;
    } else {
      // Clockwise: if positive, subtract 2π to get negative angle
      if (sweepAngle > 0) sweepAngle -= 2 * Math.PI;
    }
  }

  // Create path data for arc
  let pathData: string;
  if (geometry.isLine) {
    // Fallback to line if points are collinear
    pathData = `M ${shape.start.x},${shape.start.y} L ${shape.end.x},${shape.end.y}`;
  } else {
    // Large arc flag: 1 if arc is > 180°, inverted to get the arc through the control point
    const largeArcFlag = Math.abs(sweepAngle) > Math.PI ? 1 : 0;

    // Sweep flag in SVG: 0=counter-clockwise, 1=clockwise
    const sweepFlag = geometry.isCCW ? 1 : 0;

    pathData = `M ${shape.start.x},${shape.start.y} A ${geometry.radius},${geometry.radius} 0 ${largeArcFlag},${sweepFlag} ${shape.end.x},${shape.end.y}`;
  }


  // If in initial state (after first click), show start point cross only
  // Note: We don't show anything here because the line tool doesn't show a preview at this stage
  if (isInitialState && showMeasurements) {
    return (
      <g key={shape.id} data-shape-id={shape.id}>
        {/* Start point indicator */}
        <g>
          <line
            x1={shape.start.x - 0.03 * zoomScale}
            y1={shape.start.y}
            x2={shape.start.x + 0.03 * zoomScale}
            y2={shape.start.y}
            stroke={theme.lineColor}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={shape.start.x}
            y1={shape.start.y - 0.03 * zoomScale}
            x2={shape.start.x}
            y2={shape.start.y + 0.03 * zoomScale}
            stroke={theme.lineColor}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </g>
    );
  }

  // Check if we're between first and second click
  // Between 1st and 2nd click: controlPoint == start (hasn't moved yet)
  const betweenFirstAndSecond =
    showMeasurements &&
    !isInitialState &&
    Math.abs(shape.controlPoint.x - shape.start.x) < 0.001 &&
    Math.abs(shape.controlPoint.y - shape.start.y) < 0.001;

  const showHatch = showHatchState && !geometry.isLine && !isInitialState && !betweenFirstAndSecond && arcLength > 0.01;
  const hatchPathData = `${pathData} Z`;

  // If between first and second click, show a preview line with measurements (like LineShape)
  if (betweenFirstAndSecond) {
    const previewLength = Math.hypot(shape.end.x - shape.start.x, shape.end.y - shape.start.y);
    const previewAngle = Math.atan2(shape.end.y - shape.start.y, shape.end.x - shape.start.x) * (180 / Math.PI);

    const previewLengthText = formatLength(previewLength, lengthUnit);
    const previewAngleText = formatAngle(previewAngle);

    const midX = (shape.start.x + shape.end.x) / 2;
    const midY = (shape.start.y + shape.end.y) / 2;

    return (
      <g key={shape.id} data-shape-id={shape.id}>
        {/* Preview line from start to current cursor position */}
        <line
          x1={shape.start.x}
          y1={shape.start.y}
          x2={shape.end.x}
          y2={shape.end.y}
          stroke={theme.lineColor}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />

        {previewLength > 0.01 && (
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

                return (
                  <path
                    d={pathD}
                    fill={theme.lineColor}
                    opacity="0.15"
                  />
                );
              })()}
            </g>

            {/* Angle label offset to left of start point */}
            <g transform={`translate(${shape.start.x - 0.12 * zoomScale}, ${shape.start.y}) scale(${zoomScale})`}>
              <rect
                x={-getChipWidth(previewAngleText) / 2}
                y={-chipHeight / 2}
                width={getChipWidth(previewAngleText)}
                height={chipHeight}
                fill={theme.backgroundColor}
              />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={theme.textColor}
                fontSize={fontSize}
                fontWeight={theme.fontWeight}
                fontFamily={theme.fontFamily}
                style={{ userSelect: 'none' }}
              >
                {previewAngleText}
              </text>
            </g>

            {/* Length label */}
            <g transform={`translate(${midX}, ${midY - 0.15 * zoomScale}) scale(${zoomScale})`}>
              <rect
                x={-getChipWidth(previewLengthText) / 2}
                y={-chipHeight / 2}
                width={getChipWidth(previewLengthText)}
                height={chipHeight}
                fill={theme.backgroundColor}
              />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={theme.textColor}
                fontSize={fontSize}
                fontWeight={theme.fontWeight}
                fontFamily={theme.fontFamily}
                style={{ userSelect: 'none' }}
              >
                {previewLengthText}
              </text>
            </g>

            {/* Start point indicator */}
            <circle
              cx={shape.start.x}
              cy={shape.start.y}
              r={0.015 * zoomScale}
              fill={theme.lineColor}
            />

            {/* End point indicator */}
            <circle
              cx={shape.end.x}
              cy={shape.end.y}
              r={0.015 * zoomScale}
              fill={theme.lineColor}
            />
          </>
        )}
      </g>
    );
  }

  return (
    <g key={shape.id} data-shape-id={shape.id}>
      {/* Dynamic shadow filter if needed */}
      {shape.appearance?.shadow && (
        <DynamicShadowFilter shapeId={shape.id} shadow={shape.appearance.shadow} />
      )}

      {/* Invisible wider path for easier clicking/selecting */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth={10}
        fill="none"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        style={{ cursor: 'inherit' }}
        onMouseDown={(e) => {
          if (!isSelected && activeTool === 'select') {
            e.stopPropagation();
            onMouseDown(e, shape.id);
          }
        }}
        onClick={(e) => {
          if (!isSelected && activeTool === 'select') {
            e.stopPropagation();
          }
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

      {/* Invisible fill hit-area for hover/select over arc region when hatch is possible */}
      {showHatch && (
        <path
          d={hatchPathData}
          fill="transparent"
          stroke="none"
          pointerEvents="all"
          onMouseDown={(e) => {
            if (!isSelected && activeTool === 'select') {
              e.stopPropagation();
              onMouseDown(e, shape.id);
            }
          }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      )}

      {/* The arc itself - with full appearance support */}
      <path
        d={pathData}
        stroke={getStrokeAttribute(shape.appearance, shape.stroke)}
        strokeWidth={getStrokeWidth(shape.appearance, 1)}
        strokeDasharray={getStrokeDashArray(shape.appearance)}
        strokeLinecap={getStrokeLineCap(shape.appearance) || 'round'}
        strokeOpacity={getStrokeOpacity(shape.appearance)}
        opacity={getShapeOpacity(shape.appearance)}
        fill="none"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        style={{ mixBlendMode: getBlendMode(shape.appearance) }}
        filter={getFilterAttribute(shape.appearance, shape.id)}
      />

      {/* Hatch shading */}
      {showHatch && (
        <path
          d={hatchPathData}
          fill={`url(#${HATCH_PATTERN_ID})`}
          fillOpacity={hatchOpacity}
          stroke="none"
          pointerEvents="none"
        />
      )}

      {/* Selection indicator */}
      {isSelected && (
        <path
          d={pathData}
          stroke="#2E5C8A"
          strokeWidth={3}
          strokeOpacity={0.3}
          fill="none"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          pointerEvents="none"
        />
      )}

      {/* Hover indicator */}
      {isHovered && !isSelected && (
        <path
          d={pathData}
          stroke="#4A90E2"
          strokeWidth={2.5}
          strokeOpacity={0.4}
          fill="none"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          pointerEvents="none"
        />
      )}

      {/* Measurement labels (only show during drawing) */}
      {(showArc || showRadius || showAngles) && arcLength > 0.01 && !geometry.isLine && (
        <>
          {/* Center point cross */}
          <g>
            <line
              x1={geometry.center.x - 0.05 * zoomScale}
              y1={geometry.center.y}
              x2={geometry.center.x + 0.05 * zoomScale}
              y2={geometry.center.y}
              stroke={theme.lineColor}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={geometry.center.x}
              y1={geometry.center.y - 0.05 * zoomScale}
              x2={geometry.center.x}
              y2={geometry.center.y + 0.05 * zoomScale}
              stroke={theme.lineColor}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </g>

          {/* Radius line from center to control point (dotted) */}
          {showRadius && (
            <>
              <line
                x1={geometry.center.x}
                y1={geometry.center.y}
                x2={shape.controlPoint.x}
                y2={shape.controlPoint.y}
                stroke={theme.lineColor}
                strokeWidth={0.5}
                strokeDasharray="0.02,0.02"
                vectorEffect="non-scaling-stroke"
                opacity="0.5"
              />

              {/* Control point indicator (tiny dot) */}
              <circle
                cx={shape.controlPoint.x}
                cy={shape.controlPoint.y}
                r={0.015 * zoomScale}
                fill={theme.lineColor}
              />

              {/* Radius label at midpoint of radius line */}
              <g transform={`translate(${(geometry.center.x + shape.controlPoint.x) / 2}, ${(geometry.center.y + shape.controlPoint.y) / 2}) scale(${zoomScale})`}>
                <rect
                  x={-getChipWidth(radiusText) / 2}
                  y={-chipHeight / 2}
                  width={getChipWidth(radiusText)}
                  height={chipHeight}
                  fill={theme.backgroundColor}
                />
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={theme.textColor}
                  fontSize={fontSize}
                  fontWeight={theme.fontWeight}
                  fontFamily={theme.fontFamily}
                  style={{ userSelect: 'none' }}
                >
                  {radiusText}
                </text>
              </g>
            </>
          )}

          {/* Angle label at start point */}
          {showAngles && (
            <g transform={`translate(${shape.start.x - 0.15 * zoomScale}, ${shape.start.y - 0.1 * zoomScale}) scale(${zoomScale})`}>
              <rect
                x={-getChipWidth(angleText) / 2}
                y={-chipHeight / 2}
                width={getChipWidth(angleText)}
                height={chipHeight}
                fill={theme.backgroundColor}
              />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={theme.textColor}
                fontSize={fontSize}
                fontWeight={theme.fontWeight}
                fontFamily={theme.fontFamily}
                style={{ userSelect: 'none' }}
              >
                {angleText}
              </text>
            </g>
          )}

          {/* CAD-style curved dimension line for arc length */}
          {showArc && (() => {
            const offset = 0.08 * zoomScale;
            if (shouldUseDescriptorLayer) {
              dimensionCollector?.({
                type: 'arc',
                id: `arc-${shape.id}-length`,
                center: geometry.center,
                radius: geometry.radius,
                startAngle: geometry.startAngle,
                endAngle: geometry.endAngle,
                isCCW: geometry.isCCW,
                text: lengthText,
                zoomScale,
                offset,
              });
              return null;
            }

            const chipWidth = getChipWidth(lengthText) * zoomScale;
            const chipHalfWidth = chipWidth / 2;
            const scaledChipHeight = chipHeight * zoomScale;

            const offsetRadius = geometry.radius + offset;
            const startExtEnd = {
              x: geometry.center.x + (offsetRadius + 0.05 * zoomScale) * Math.cos(geometry.startAngle),
              y: geometry.center.y + (offsetRadius + 0.05 * zoomScale) * Math.sin(geometry.startAngle)
            };
            const endExtEnd = {
              x: geometry.center.x + (offsetRadius + 0.05 * zoomScale) * Math.cos(geometry.endAngle),
              y: geometry.center.y + (offsetRadius + 0.05 * zoomScale) * Math.sin(geometry.endAngle)
            };
            const startOffsetPoint = {
              x: geometry.center.x + offsetRadius * Math.cos(geometry.startAngle),
              y: geometry.center.y + offsetRadius * Math.sin(geometry.startAngle)
            };
            const endOffsetPoint = {
              x: geometry.center.x + offsetRadius * Math.cos(geometry.endAngle),
              y: geometry.center.y + offsetRadius * Math.sin(geometry.endAngle)
            };

            let midAngle = geometry.startAngle + sweepAngle / 2;
            let chipX = geometry.center.x + offsetRadius * Math.cos(midAngle);
            let chipY = geometry.center.y + offsetRadius * Math.sin(midAngle);

            const controlVector = {
              x: shape.controlPoint.x - geometry.center.x,
              y: shape.controlPoint.y - geometry.center.y,
            };
            const chipVector = {
              x: chipX - geometry.center.x,
              y: chipY - geometry.center.y,
            };

            if (controlVector.x * chipVector.x + controlVector.y * chipVector.y < 0) {
              midAngle += Math.PI;
              chipX = geometry.center.x + offsetRadius * Math.cos(midAngle);
              chipY = geometry.center.y + offsetRadius * Math.sin(midAngle);
            }

            const tangentAngle = midAngle + Math.PI / 2;
            let chipRotation = tangentAngle * (180 / Math.PI);
            if (chipRotation > 90 && chipRotation < 270) {
              chipRotation += 180;
            }

            const dimensionSweepAbs = Math.abs(sweepAngle);
            const largeArcFlag = dimensionSweepAbs > Math.PI ? 1 : 0;
            const sweepFlag = geometry.isCCW ? 1 : 0;

            return (
              <g>
                <line
                  x1={shape.start.x}
                  y1={shape.start.y}
                  x2={startExtEnd.x}
                  y2={startExtEnd.y}
                  stroke={theme.lineColor}
                  strokeWidth={0.5}
                  strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={shape.end.x}
                  y1={shape.end.y}
                  x2={endExtEnd.x}
                  y2={endExtEnd.y}
                  stroke={theme.lineColor}
                  strokeWidth={0.5}
                  strokeDasharray={`${0.04 * zoomScale} ${0.02 * zoomScale}`}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={`M ${startOffsetPoint.x},${startOffsetPoint.y} A ${offsetRadius},${offsetRadius} 0 ${largeArcFlag},${sweepFlag} ${endOffsetPoint.x},${endOffsetPoint.y}`}
                  stroke={theme.lineColor}
                  strokeWidth={1}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
                <g transform={`translate(${chipX}, ${chipY}) rotate(${chipRotation})`}>
                  <rect
                    x={-chipHalfWidth}
                    y={-scaledChipHeight / 2}
                    width={chipWidth}
                    height={scaledChipHeight}
                    fill={theme.backgroundColor}
                  />
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={theme.textColor}
                    fontSize={fontSize * zoomScale}
                    fontWeight={theme.fontWeight}
                    fontFamily={theme.fontFamily}
                    style={{ userSelect: 'none' }}
                  >
                    {lengthText}
                  </text>
                </g>
              </g>
            );
          })()}

          {/* Start point indicator */}
          <g>
            <line
              x1={shape.start.x - 0.03 * zoomScale}
              y1={shape.start.y}
              x2={shape.start.x + 0.03 * zoomScale}
              y2={shape.start.y}
              stroke={theme.lineColor}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={shape.start.x}
              y1={shape.start.y - 0.03 * zoomScale}
              x2={shape.start.x}
              y2={shape.start.y + 0.03 * zoomScale}
              stroke={theme.lineColor}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </g>

          {/* End point indicator */}
          <g>
            <line
              x1={shape.end.x - 0.03 * zoomScale}
              y1={shape.end.y}
              x2={shape.end.x + 0.03 * zoomScale}
              y2={shape.end.y}
              stroke={theme.lineColor}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={shape.end.x}
              y1={shape.end.y - 0.03 * zoomScale}
              x2={shape.end.x}
              y2={shape.end.y + 0.03 * zoomScale}
              stroke={theme.lineColor}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </>
      )}

      {/* Semicircle helper markers - appear while choosing the control point */}
      {showMeasurements && !isInitialState && hasUsableChord && semicircleMarkers && (
        <g opacity={0.9}>
          {semicircleMarkers.map((marker, index) => (
            <g key={`semicircle-marker-${index}`}>
              {/* Guide from chord midpoint to marker */}
              <line
                x1={chordMidpoint.x}
                y1={chordMidpoint.y}
                x2={marker.x}
                y2={marker.y}
                stroke="#B26DFF"
                strokeWidth={0.5}
                strokeDasharray="0.02,0.02"
                vectorEffect="non-scaling-stroke"
                opacity={0.35}
              />
              {/* Marker */}
              <circle
                cx={marker.x}
                cy={marker.y}
                r={0.018 * zoomScale}
                stroke="#B26DFF"
                strokeWidth={0.01 * zoomScale}
                fill="rgba(178, 109, 255, 0.15)"
              />
              <circle
                cx={marker.x}
                cy={marker.y}
                r={0.008 * zoomScale}
                fill="#B26DFF"
              />
            </g>
          ))}
        </g>
      )}
    </g>
  );
});

