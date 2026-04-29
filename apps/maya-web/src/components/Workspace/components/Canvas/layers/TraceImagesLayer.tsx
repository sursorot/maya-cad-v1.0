/**
 * Trace Images Layer
 * 
 * Renders trace/reference images behind all other shapes.
 * Memoized to only re-render when images change.
 */

import { memo } from 'react';
import type { Point, ImageShape } from '../../../types';
import { ImageShapeRenderer } from '../ImageShape';

interface CalibrationMode {
  active: boolean;
  imageId: string | null;
  point1: Point | null;
  point2: Point | null;
}

interface TraceImagesLayerProps {
  /** Trace images to render */
  images: ImageShape[];
  /** Currently selected shape ID */
  selectedShapeId: string | null;
  /** Zoom scale */
  zoomScale: number;
  /** Calibration mode state */
  calibrationMode?: CalibrationMode;
  /** Callback when clicking on image during calibration */
  onCalibrationClick?: (canvasPoint: Point, imageId: string) => void;
}

/**
 * Memoized trace images layer
 */
export const TraceImagesLayer = memo(function TraceImagesLayer({
  images,
  selectedShapeId,
  zoomScale,
  calibrationMode,
  onCalibrationClick,
}: TraceImagesLayerProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <g className="trace-images-layer">
      {images.map(image => {
        const isThisImageCalibrating = calibrationMode?.active && calibrationMode.imageId === image.id;
        return (
          <ImageShapeRenderer
            key={image.id}
            image={image}
            isSelected={selectedShapeId === image.id}
            zoomScale={zoomScale}
            calibrationMode={isThisImageCalibrating ? {
              isCalibrating: true,
              point1: calibrationMode.point1,
              point2: calibrationMode.point2,
            } : undefined}
            onCalibrationClick={isThisImageCalibrating ? onCalibrationClick : undefined}
          />
        );
      })}
    </g>
  );
}, (prevProps, nextProps) => {
  // Only re-render when images or calibration state changes
  if (prevProps.images !== nextProps.images) return false;
  if (prevProps.selectedShapeId !== nextProps.selectedShapeId) return false;
  if (prevProps.zoomScale !== nextProps.zoomScale) return false;
  if (prevProps.calibrationMode !== nextProps.calibrationMode) return false;
  return true;
});

