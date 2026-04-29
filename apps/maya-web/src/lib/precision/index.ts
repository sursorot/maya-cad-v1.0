/**
 * Precision Input System
 * 
 * Provides AutoCAD-style precision input for drawing operations.
 * 
 * Features:
 * - Coordinate parsing (absolute, relative, polar)
 * - Unit conversion (mm, cm, m, in, ft, ft-in)
 * - Direct distance entry
 * - Dynamic input overlay
 * 
 * @example
 * import { parseCoordinateInput, resolveCoordinate } from '@/lib/precision';
 * 
 * const result = parseCoordinateInput('@10<45');
 * if (result.type !== 'error') {
 *   const point = resolveCoordinate(result, {
 *     lastPoint: { x: 0, y: 0 },
 *     cursorDirection: { x: 1, y: 0 },
 *     defaultUnit: 'ft',
 *   });
 *   console.log(point); // { x: 2.154, y: 2.154 } (10ft at 45°)
 * }
 */

// Types
export type {
  ParsedCoordinate,
  ParseError,
  ParseResult,
  CoordinateContext,
  DynamicInputState,
  InputMode,
  PrecisionInputSettings,
} from './types';

export {
  isParseError,
  DEFAULT_PRECISION_INPUT_SETTINGS,
} from './types';

// Coordinate Parser
export {
  parseCoordinateInput,
  resolveCoordinate,
  validateInput,
  getInputHints,
} from './coordinateParser';

// Unit Conversion
export {
  parseLength,
  parseFeetInches,
  parseInputWithUnit,
  metersToUnit,
  unitToMeters,
  formatWithUnit,
} from './unitConversion';

export type { ParsedLength } from './unitConversion';

