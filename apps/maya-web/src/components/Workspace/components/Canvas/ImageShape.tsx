/**
 * ImageShape Canvas Renderer
 * 
 * Renders reference/trace images on the SVG canvas.
 * These are rendered as the lowest layer beneath all other shapes.
 * Supports on-canvas calibration for point marking.
 */

import React, { useMemo } from 'react';
import type { ImageShape as ImageShapeType, Point } from '../../types';
import { generateCSSFilters, generateImageTransform } from '../../../TraceLayer/utils';

interface ImageShapeProps {
  image: ImageShapeType;
  isSelected?: boolean;
  zoomScale: number;
  onSelect?: (id: string) => void;
  /** Calibration mode state */
  calibrationMode?: {
    isCalibrating: boolean;
    point1: Point | null;
    point2: Point | null;
  };
  /** Callback when image is clicked during calibration */
  onCalibrationClick?: (canvasPoint: Point, imageId: string) => void;
}

export const ImageShapeRenderer: React.FC<ImageShapeProps> = ({
  image,
  isSelected = false,
  zoomScale,
  onSelect,
  calibrationMode,
  onCalibrationClick,
}) => {
  // Skip invalid images
  if (!image?.id || !image.visible) return null;
  if (!image.width || !image.height || !image.originalWidth || !image.originalHeight) return null;

  const isCalibrating = calibrationMode?.isCalibrating ?? false;

  // Generate CSS filter string
  const filterString = useMemo(() => {
    return generateCSSFilters(image.filters);
  }, [image.filters]);

  // Generate transform string
  const transformString = useMemo(() => {
    return generateImageTransform(
      image.position,
      image.width,
      image.height,
      image.rotation,
      image.flipHorizontal,
      image.flipVertical
    );
  }, [image.position, image.width, image.height, image.rotation, image.flipHorizontal, image.flipVertical]);

  const handleClick = (e: React.MouseEvent<SVGImageElement>) => {
    if (isCalibrating && onCalibrationClick) {
      e.stopPropagation();
      
      // Get the SVG element to convert coordinates
      const svg = (e.target as SVGImageElement).ownerSVGElement;
      if (!svg) return;
      
      // Create SVG point and transform to canvas coordinates
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      
      // Get the inverse of the current transformation matrix
      const screenCTM = svg.getScreenCTM();
      if (!screenCTM) return;
      
      const canvasPoint = pt.matrixTransform(screenCTM.inverse());
      
      onCalibrationClick({ x: canvasPoint.x, y: canvasPoint.y }, image.id);
      return;
    }

    // Normal selection behavior
    if (!image.locked && onSelect) {
      e.stopPropagation();
      onSelect(image.id);
    }
  };

  // Selection indicator stroke width that scales with zoom
  const selectionStrokeWidth = 0.02 * zoomScale;
  const selectionPadding = 0.03 * zoomScale;
  const calibrationPointRadius = 0.05 * zoomScale;

  // Convert calibration points from pixel to canvas coordinates
  const point1Canvas = calibrationMode?.point1 ? {
    x: image.position.x + (calibrationMode.point1.x / image.originalWidth) * image.width,
    y: image.position.y + (calibrationMode.point1.y / image.originalHeight) * image.height,
  } : null;

  const point2Canvas = calibrationMode?.point2 ? {
    x: image.position.x + (calibrationMode.point2.x / image.originalWidth) * image.width,
    y: image.position.y + (calibrationMode.point2.y / image.originalHeight) * image.height,
  } : null;

  return (
    <g 
      className="image-shape-group"
      style={{ pointerEvents: isCalibrating ? 'auto' : (image.locked ? 'none' : 'auto') }}
    >
      {/* The image */}
      <image
        href={image.src}
        x={image.position.x}
        y={image.position.y}
        width={image.width}
        height={image.height}
        preserveAspectRatio="none"
        opacity={image.opacity}
        transform={transformString || undefined}
        style={{
          filter: filterString !== 'none' ? filterString : undefined,
          cursor: isCalibrating ? 'crosshair' : (image.locked ? 'default' : 'pointer'),
        }}
        onClick={handleClick}
      />

      {/* Selection indicator */}
      {isSelected && !image.locked && !isCalibrating && (
        <rect
          x={image.position.x - selectionPadding}
          y={image.position.y - selectionPadding}
          width={image.width + selectionPadding * 2}
          height={image.height + selectionPadding * 2}
          fill="none"
          stroke="#4da6ff"
          strokeWidth={selectionStrokeWidth}
          strokeDasharray={`${selectionStrokeWidth * 4} ${selectionStrokeWidth * 2}`}
          transform={transformString || undefined}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Calibration mode indicator */}
      {isCalibrating && (
        <rect
          x={image.position.x - selectionPadding}
          y={image.position.y - selectionPadding}
          width={image.width + selectionPadding * 2}
          height={image.height + selectionPadding * 2}
          fill="none"
          stroke="#16a34a"
          strokeWidth={selectionStrokeWidth * 1.5}
          strokeDasharray={`${selectionStrokeWidth * 6} ${selectionStrokeWidth * 3}`}
          transform={transformString || undefined}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Calibration points being selected */}
      {isCalibrating && point1Canvas && (
        <>
          <circle
            cx={point1Canvas.x}
            cy={point1Canvas.y}
            r={calibrationPointRadius}
            fill="#16a34a"
            stroke="#ffffff"
            strokeWidth={selectionStrokeWidth}
            style={{ pointerEvents: 'none' }}
          />
          <text
            x={point1Canvas.x}
            y={point1Canvas.y + calibrationPointRadius * 2.5}
            textAnchor="middle"
            fontSize={calibrationPointRadius * 1.5}
            fontFamily="'IBM Plex Mono', monospace"
            fontWeight="bold"
            fill="#16a34a"
            style={{ pointerEvents: 'none' }}
          >
            1
          </text>
        </>
      )}

      {isCalibrating && point2Canvas && (
        <>
          <circle
            cx={point2Canvas.x}
            cy={point2Canvas.y}
            r={calibrationPointRadius}
            fill="#dc2626"
            stroke="#ffffff"
            strokeWidth={selectionStrokeWidth}
            style={{ pointerEvents: 'none' }}
          />
          <text
            x={point2Canvas.x}
            y={point2Canvas.y + calibrationPointRadius * 2.5}
            textAnchor="middle"
            fontSize={calibrationPointRadius * 1.5}
            fontFamily="'IBM Plex Mono', monospace"
            fontWeight="bold"
            fill="#dc2626"
            style={{ pointerEvents: 'none' }}
          >
            2
          </text>
        </>
      )}

      {/* Line between calibration points */}
      {isCalibrating && point1Canvas && point2Canvas && (
        <line
          x1={point1Canvas.x}
          y1={point1Canvas.y}
          x2={point2Canvas.x}
          y2={point2Canvas.y}
          stroke="#16a34a"
          strokeWidth={selectionStrokeWidth * 1.5}
          strokeDasharray={`${selectionStrokeWidth * 4} ${selectionStrokeWidth * 2}`}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Calibration reference line (if enabled and calibrated - for showing after calibration) */}
      {!isCalibrating && image.showCalibrationLine && image.calibration && (
        <CalibrationReferenceLine
          calibration={image.calibration}
          zoomScale={zoomScale}
        />
      )}
    </g>
  );
};

// Calibration Reference Line Component
interface CalibrationReferenceLineProps {
  calibration: ImageShapeType['calibration'];
  zoomScale: number;
}

const CalibrationReferenceLine: React.FC<CalibrationReferenceLineProps> = ({
  calibration,
  zoomScale,
}) => {
  if (!calibration) return null;

  const { point1Canvas, point2Canvas, realDistance, unit } = calibration;
  
  const strokeWidth = 0.015 * zoomScale;
  const pointRadius = 0.04 * zoomScale;
  const fontSize = 0.08 * zoomScale;
  
  // Calculate midpoint for label
  const midX = (point1Canvas.x + point2Canvas.x) / 2;
  const midY = (point1Canvas.y + point2Canvas.y) / 2;
  
  // Format distance
  const formatDistance = () => {
    switch (unit) {
      case 'ft-in': {
        const feet = Math.floor(realDistance);
        const inches = (realDistance - feet) * 12;
        if (feet === 0) return `${inches.toFixed(1)}"`;
        if (inches < 0.5) return `${feet}'`;
        return `${feet}' ${Math.round(inches)}"`;
      }
      case 'ft':
        return `${realDistance.toFixed(2)}'`;
      case 'm':
        return `${realDistance.toFixed(2)} m`;
      case 'cm':
        return `${realDistance.toFixed(1)} cm`;
      case 'mm':
        return `${Math.round(realDistance)} mm`;
      case 'in':
        return `${realDistance.toFixed(1)}"`;
      default:
        return `${realDistance.toFixed(2)}`;
    }
  };

  return (
    <g className="calibration-reference-line" style={{ pointerEvents: 'none' }}>
      {/* Line between points */}
      <line
        x1={point1Canvas.x}
        y1={point1Canvas.y}
        x2={point2Canvas.x}
        y2={point2Canvas.y}
        stroke="#16a34a"
        strokeWidth={strokeWidth}
        strokeDasharray={`${strokeWidth * 3} ${strokeWidth * 2}`}
      />
      
      {/* Point 1 (green) */}
      <circle
        cx={point1Canvas.x}
        cy={point1Canvas.y}
        r={pointRadius}
        fill="#16a34a"
        stroke="#ffffff"
        strokeWidth={strokeWidth * 0.5}
      />
      
      {/* Point 2 (red) */}
      <circle
        cx={point2Canvas.x}
        cy={point2Canvas.y}
        r={pointRadius}
        fill="#dc2626"
        stroke="#ffffff"
        strokeWidth={strokeWidth * 0.5}
      />
      
      {/* Distance label background */}
      <rect
        x={midX - fontSize * 2}
        y={midY - fontSize * 0.7}
        width={fontSize * 4}
        height={fontSize * 1.2}
        fill="#ffffff"
        stroke="#16a34a"
        strokeWidth={strokeWidth * 0.5}
        rx={fontSize * 0.2}
      />
      
      {/* Distance label text */}
      <text
        x={midX}
        y={midY + fontSize * 0.25}
        textAnchor="middle"
        fontSize={fontSize}
        fontFamily="'IBM Plex Mono', monospace"
        fontWeight="600"
        fill="#16a34a"
      >
        {formatDistance()}
      </text>
    </g>
  );
};

export default ImageShapeRenderer;
