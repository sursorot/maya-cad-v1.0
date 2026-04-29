/**
 * Precision Input System Types
 * 
 * Type definitions for the coordinate input parsing and precision drawing system.
 */

import type { Point, LengthUnit } from '../../components/Workspace/types';

/**
 * Result of parsing a coordinate input string
 */
export interface ParsedCoordinate {
  type: 'absolute' | 'relative' | 'polar' | 'direct';
  
  /** For absolute and relative Cartesian coordinates */
  x?: number;
  y?: number;
  
  /** For polar and direct distance */
  distance?: number;
  
  /** For polar coordinates (in degrees) */
  angle?: number;
  
  /** Raw input string (for debugging) */
  rawValue?: string;
  
  /** Unit that was explicitly specified (if any) */
  parsedUnit?: LengthUnit | null;
}

/**
 * Context needed to resolve a parsed coordinate to an actual point
 */
export interface CoordinateContext {
  /** Previous point (for relative/polar coordinates) */
  lastPoint: Point;
  
  /** Current cursor direction from last point (for direct distance) */
  cursorDirection: Point;
  
  /** Workspace unit for values without explicit suffix */
  defaultUnit: LengthUnit;
}

/**
 * Error result from parsing
 */
export interface ParseError {
  type: 'error';
  message: string;
  input: string;
}

/**
 * Result of coordinate parsing - either success or error
 */
export type ParseResult = ParsedCoordinate | ParseError;

/**
 * Check if a parse result is an error
 */
export function isParseError(result: ParseResult): result is ParseError {
  return result.type === 'error';
}

/**
 * State for the dynamic input overlay
 */
export interface DynamicInputState {
  /** Whether dynamic input is enabled */
  enabled: boolean;
  
  /** Current interaction mode */
  mode: 'idle' | 'distance' | 'angle' | 'coordinate';
  
  /** Current input values */
  distanceInput: string;
  angleInput: string;
  xInput: string;
  yInput: string;
  
  /** Which field is currently active */
  activeField: 'distance' | 'angle' | 'x' | 'y' | null;
  
  /** Whether current input is valid */
  isValid: boolean;
  
  /** Error message if invalid */
  errorMessage: string | null;
  
  /** Preview point based on current input */
  previewPoint: Point | null;
}

/**
 * Input display mode preference
 */
export type InputMode = 'polar' | 'cartesian';

/**
 * Settings for precision input system
 */
export interface PrecisionInputSettings {
  /** Master toggle for precision input */
  enabled: boolean;
  
  /** Display mode (polar or cartesian) */
  mode: InputMode;
  
  /** Show preview line during input */
  showPreview: boolean;
  
  /** Auto-focus input on drawing start */
  autoFocusOnDraw: boolean;
  
  /** Keyboard shortcut to toggle (default: F12) */
  toggleShortcut: string;
}

/**
 * Default settings
 */
export const DEFAULT_PRECISION_INPUT_SETTINGS: PrecisionInputSettings = {
  enabled: true,
  mode: 'polar',
  showPreview: true,
  autoFocusOnDraw: false,
  toggleShortcut: 'F12',
};

