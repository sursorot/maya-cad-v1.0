import React from 'react';
import type { GuidelineShape, ToolType, LengthUnit, Point } from '../../types';
import { distance } from '@maya/workspace-domain/workspace/core/utils';
import { calculateAngle, formatAngle } from '../../utils/measurements';

interface GuidelineShapeProps {
  shape: GuidelineShape;
  showMeasurements?: boolean;
  isSelected: boolean;
  isHovered: boolean;
  activeTool: ToolType;
  lengthUnit: LengthUnit;
  zoomScale: number;
  viewBox: { x: number; y: number; width: number; height: number };
  onMouseDown: (e: React.MouseEvent<SVGElement>, shapeId: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const GuidelineShapeComponent: React.FC<GuidelineShapeProps> = ({
  shape,
  showMeasurements = false,
  isSelected,
  isHovered,
  activeTool,
  zoomScale,
  viewBox,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (shape.type !== 'guideline') return null;

  // Calculate infinite line extension based on viewBox
  const extension = Math.max(viewBox.width, viewBox.height) * 2;

  let x1: number, y1: number, x2: number, y2: number;

  if (shape.orientation === 'horizontal') {
    // Horizontal guideline - extends left to right
    const y = shape.position ?? 0;
    x1 = viewBox.x - extension;
    y1 = y;
    x2 = viewBox.x + viewBox.width + extension;
    y2 = y;
  } else if (shape.orientation === 'vertical') {
    // Vertical guideline - extends top to bottom
    const x = shape.position ?? 0;
    x1 = x;
    y1 = viewBox.y - extension;
    x2 = x;
    y2 = viewBox.y + viewBox.height + extension;
  } else {
    // Freeform guideline - extends in both directions along the defined line
    if (!shape.start || !shape.end) return null;

    const dx = shape.end.x - shape.start.x;
    const dy = shape.end.y - shape.start.y;
    const length = distance(shape.start, shape.end);

    if (length < 1e-9) {
      // Render an anchor point if the line has no length yet (just clicked)
      const size = 0.04;
      const color = shape.stroke || '#FF0000';
      return (
        <g key={shape.id}>
          {/* Crosshair */}
          <line
            x1={shape.start.x - size * zoomScale}
            y1={shape.start.y}
            x2={shape.start.x + size * zoomScale}
            y2={shape.start.y}
            stroke={color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={shape.start.x}
            y1={shape.start.y - size * zoomScale}
            x2={shape.start.x}
            y2={shape.start.y + size * zoomScale}
            stroke={color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {/* Center circle */}
          <circle
            cx={shape.start.x}
            cy={shape.start.y}
            r={0.02 * zoomScale}
            fill={color}
            stroke="white"
            strokeWidth={0.008 * zoomScale}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      );
    }

    // Normalize direction and extend infinitely
    const dirX = dx / length;
    const dirY = dy / length;

    x1 = shape.start.x - dirX * extension;
    y1 = shape.start.y - dirY * extension;
    x2 = shape.start.x + dirX * extension;
    y2 = shape.start.y + dirY * extension;
  }

  // Determine stroke color based on state - bright red for visibility
  const defaultGuidelineColor = '#FF0000';
  const strokeColor = isSelected ? '#2E5C8A' : (isHovered ? '#4A90E2' : (shape.stroke || defaultGuidelineColor));
  const accentColor = shape.stroke || defaultGuidelineColor;
  const chipPadding = 0.025;
  const fontSize = 0.08;
  const charWidth = fontSize * 0.55;
  const getChipWidth = (text: string) => text.length * charWidth + chipPadding * 2;
  const chipHeight = fontSize + chipPadding * 2;

  const renderSnapCross = (point: Point, size: number = 0.04) => (
    <g>
      <line
        x1={point.x - size * zoomScale}
        y1={point.y}
        x2={point.x + size * zoomScale}
        y2={point.y}
        stroke={accentColor}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={point.x}
        y1={point.y - size * zoomScale}
        x2={point.x}
        y2={point.y + size * zoomScale}
        stroke={accentColor}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );

  const renderAxisMarkers = () => {
    if (shape.orientation === 'horizontal' && shape.position !== undefined) {
      const y = shape.position;
      const xs = [
        viewBox.x + viewBox.width * 0.25,
        viewBox.x + viewBox.width * 0.5,
        viewBox.x + viewBox.width * 0.75,
      ];
      return xs.map((markerX, idx) => (
        <circle
          key={`h - guide - marker - ${idx} `}
          cx={markerX}
          cy={y}
          r={0.018 * zoomScale}
          fill={accentColor}
          stroke="white"
          strokeWidth={0.008 * zoomScale}
          vectorEffect="non-scaling-stroke"
        />
      ));
    }

    if (shape.orientation === 'vertical' && shape.position !== undefined) {
      const x = shape.position;
      const ys = [
        viewBox.y + viewBox.height * 0.25,
        viewBox.y + viewBox.height * 0.5,
        viewBox.y + viewBox.height * 0.75,
      ];
      return ys.map((markerY, idx) => (
        <circle
          key={`v - guide - marker - ${idx} `}
          cx={x}
          cy={markerY}
          r={0.018 * zoomScale}
          fill={accentColor}
          stroke="white"
          strokeWidth={0.008 * zoomScale}
          vectorEffect="non-scaling-stroke"
        />
      ));
    }

    return null;
  };

  const renderOrientationChip = (text: string, x: number, y: number) => (
    <g transform={`translate(${x}, ${y}) scale(${zoomScale})`}>
      <rect
        x={-getChipWidth(text) / 2}
        y={-chipHeight / 2}
        width={getChipWidth(text)}
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
        {text}
      </text>
    </g>
  );

  return (
    <g key={shape.id}>
      {/* Invisible wider stroke for easier clicking/selecting */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth={10}
        vectorEffect="non-scaling-stroke"
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

      {/* The guideline itself - dashed style */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={strokeColor}
        strokeWidth={1}
        strokeDasharray="6 3"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        opacity="1"
      />

      {/* When drawing, show the defining point(s) */}
      {showMeasurements && (
        <>
          {shape.orientation === 'freeform' && shape.start && shape.end && (() => {
            const midPoint = {
              x: (shape.start.x + shape.end.x) / 2,
              y: (shape.start.y + shape.end.y) / 2,
            };

            return (
              <>
                {renderSnapCross(shape.start)}
                {renderSnapCross(shape.end)}
                <circle
                  cx={midPoint.x}
                  cy={midPoint.y}
                  r={0.02 * zoomScale}
                  fill={accentColor}
                  stroke="white"
                  strokeWidth={0.008 * zoomScale}
                  vectorEffect="non-scaling-stroke"
                />

                {/* Calculate angle */}
                {(() => {
                  // Use same angle calculation as polyline (w.r.t. horizontal)
                  const horizontalAngle = calculateAngle(shape.start, shape.end);
                  const angleText = formatAngle(horizontalAngle);

                  // Arc radius for visualization
                  const arcRadius = 0.25 * zoomScale;

                  // Calculate chip dimensions
                  const chipPadding = 0.025;
                  const fontSize = 0.08;
                  const charWidth = fontSize * 0.55;
                  const getChipWidth = (text: string) => text.length * charWidth + chipPadding * 2;
                  const chipHeight = fontSize + chipPadding * 2;

                  // Calculate the angle of the line in radians (SVG coordinate system)
                  const lineAngleRad = Math.atan2(shape.end.y - shape.start.y, shape.end.x - shape.start.x);

                  // Horizontal reference (always to the right)
                  const horizontalX = shape.start.x + arcRadius;
                  const horizontalY = shape.start.y;

                  // End point of arc (along the line direction)
                  const lineEndX = shape.start.x + arcRadius * Math.cos(lineAngleRad);
                  const lineEndY = shape.start.y + arcRadius * Math.sin(lineAngleRad);

                  // Determine sweep direction based on which way the line goes
                  const sweepFlag = lineAngleRad > 0 ? 1 : 0;
                  const largeArcFlag = 0;

                  // Create filled arc sector path (like in polyline)
                  const pathD = `
                  M ${shape.start.x},${shape.start.y}
                  L ${horizontalX},${horizontalY}
                  A ${arcRadius},${arcRadius} 0 ${largeArcFlag},${sweepFlag} ${lineEndX},${lineEndY}
Z
                `;

                  return (
                    <>
                      {/* Filled angle arc sector */}
                      <path
                        d={pathD}
                        fill={accentColor}
                        opacity="0.15"
                      />

                      {/* Angle label offset to left of start point */}
                      <g transform={`translate(${shape.start.x - 0.12 * zoomScale}, ${shape.start.y}) scale(${zoomScale})`}>
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
                    </>
                  );
                })()}
              </>
            );
          })()}

          {(shape.orientation === 'horizontal' || shape.orientation === 'vertical') && shape.position !== undefined && (
            <>
              {renderAxisMarkers()}
              {shape.orientation === 'horizontal'
                ? renderOrientationChip('0°', viewBox.x + viewBox.width / 2, shape.position - 0.12 * zoomScale)
                : renderOrientationChip('90°', shape.position + 0.12 * zoomScale, viewBox.y + viewBox.height / 2)}
            </>
          )}
        </>
      )}
    </g>
  );
};

