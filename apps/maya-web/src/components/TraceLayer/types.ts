/**
 * Trace Layer Types
 * Types for the trace layer / reference image feature
 */

import type { ImageShape, LengthUnit, Point } from '../Workspace/types';

export type { ImageShape, ImageCalibration, ImageFilters } from '../Workspace/types';
export { DEFAULT_IMAGE_SHAPE } from '../Workspace/types';

/**
 * Calibration wizard step
 */
export type CalibrationStep = 'upload' | 'pickPoints' | 'enterDistance' | 'confirm';

/**
 * Calibration state during wizard
 */
export interface CalibrationState {
  step: CalibrationStep;
  imageFile?: File;
  imageSrc?: string;
  originalWidth?: number;
  originalHeight?: number;
  point1?: Point;
  point2?: Point;
  distance?: number;
  unit: LengthUnit;
}

/**
 * Quick opacity presets for tracing
 */
export const OPACITY_PRESETS = {
  ghost: { value: 0.2, label: 'Ghost', shortLabel: '20%' },
  trace: { value: 0.4, label: 'Trace', shortLabel: '40%' },
  reference: { value: 0.7, label: 'Reference', shortLabel: '70%' },
  full: { value: 1.0, label: 'Full', shortLabel: '100%' },
} as const;

export type OpacityPreset = keyof typeof OPACITY_PRESETS;

/**
 * Props for the TraceLayerPanel
 */
export interface TraceLayerPanelProps {
  visible: boolean;
  images: ImageShape[];
  onClose: () => void;
  onUploadClick: () => void;
  onImageUpdate: (id: string, updates: Partial<ImageShape>) => void;
  onImageRemove: (id: string) => void;
  onRecalibrate: (id: string) => void;
}

/**
 * Props for individual trace layer item
 */
export interface TraceLayerItemProps {
  image: ImageShape;
  onUpdate: (updates: Partial<ImageShape>) => void;
  onRemove: () => void;
  onRecalibrate: () => void;
  onSettingsClick: () => void;
}

/**
 * Calibration calculation input
 */
export interface CalibrationInput {
  point1Pixel: Point;
  point2Pixel: Point;
  realDistance: number;
  unit: LengthUnit;
}

/**
 * Calibration calculation result
 */
export interface CalibrationResult {
  pixelDistance: number;
  metersPerPixel: number;
  scaledWidth: number;
  scaledHeight: number;
}

