/**
 * Coordinate Input Parser
 * 
 * Parses various coordinate input formats like AutoCAD:
 * - Absolute coordinates: 5,10
 * - Relative coordinates: @5,10
 * - Polar coordinates: @10<45
 * - Direct distance: 10 (in cursor direction)
 * - Feet-inches: 5'6"
 * - Unit suffixes: 100mm, 2.5m
 */

import type { Point, LengthUnit } from '../../components/Workspace/types';
import type { ParsedCoordinate, ParseResult, CoordinateContext } from './types';
import { parseFeetInches, parseInputWithUnit, unitToMeters } from './unitConversion';

/**
 * Regular expression patterns for different input formats
 */
const PATTERNS = {
  // Polar: @10<45 or 10<45 (with optional spaces)
  polar: /^@?\s*([\d.]+)\s*<\s*([\d.-]+)$/,
  
  // Relative Cartesian: @5,10 or @5, 10 (with spaces)
  relativeCartesian: /^@\s*([\d.-]+)\s*,\s*([\d.-]+)$/,
  
  // Absolute Cartesian: 5,10 or 5, 10 (with spaces)
  absoluteCartesian: /^([\d.-]+)\s*,\s*([\d.-]+)$/,
  
  // Feet-Inches: 5'6" or 5'-6" or 5' 6"
  feetInches: /^(\d+(?:\.\d+)?)'[\s-]*(\d+(?:\.\d+)?)"?$/,
  
  // Value with unit suffix: 100mm, 2.5m, 6ft, 12in
  valueWithUnit: /^([\d.-]+)\s*(mm|cm|m|in|ft|'|")$/i,
  
  // Direct distance (just a number, optionally negative)
  directDistance: /^-?[\d.]+$/,
};

/**
 * Parse a coordinate input string
 * 
 * @param input - Raw input string from user
 * @returns ParseResult - Either a ParsedCoordinate or ParseError
 * 
 * @example
 * parseCoordinateInput("5,10")     // absolute: x=5, y=10
 * parseCoordinateInput("@5,10")    // relative: x+5, y+10
 * parseCoordinateInput("@10<45")   // polar: 10 units at 45°
 * parseCoordinateInput("10")       // direct: 10 units in cursor direction
 * parseCoordinateInput("5'6\"")    // feet-inches as distance
 */
export function parseCoordinateInput(input: string): ParseResult {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return {
      type: 'error',
      message: 'Empty input',
      input,
    };
  }
  
  // 1. Try polar format: @10<45 or 10<45
  const polarMatch = trimmed.match(PATTERNS.polar);
  if (polarMatch) {
    const distance = parseFloat(polarMatch[1]);
    const angle = parseFloat(polarMatch[2]);
    
    if (isNaN(distance) || isNaN(angle)) {
      return {
        type: 'error',
        message: 'Invalid polar coordinates',
        input,
      };
    }
    
    return {
      type: 'polar',
      distance,
      angle,
      rawValue: trimmed,
    };
  }
  
  // 2. Try relative Cartesian: @5,10
  const relativeMatch = trimmed.match(PATTERNS.relativeCartesian);
  if (relativeMatch) {
    const x = parseFloat(relativeMatch[1]);
    const y = parseFloat(relativeMatch[2]);
    
    if (isNaN(x) || isNaN(y)) {
      return {
        type: 'error',
        message: 'Invalid relative coordinates',
        input,
      };
    }
    
    return {
      type: 'relative',
      x,
      y,
      rawValue: trimmed,
    };
  }
  
  // 3. Try absolute Cartesian: 5,10
  const absoluteMatch = trimmed.match(PATTERNS.absoluteCartesian);
  if (absoluteMatch) {
    const x = parseFloat(absoluteMatch[1]);
    const y = parseFloat(absoluteMatch[2]);
    
    if (isNaN(x) || isNaN(y)) {
      return {
        type: 'error',
        message: 'Invalid coordinates',
        input,
      };
    }
    
    return {
      type: 'absolute',
      x,
      y,
      rawValue: trimmed,
    };
  }
  
  // 4. Try feet-inches: 5'6"
  const feetInchMeters = parseFeetInches(trimmed);
  if (feetInchMeters !== null) {
    return {
      type: 'direct',
      distance: feetInchMeters,
      rawValue: trimmed,
      parsedUnit: 'ft-in',
    };
  }
  
  // 5. Try value with unit suffix: 100mm, 2.5m
  const unitMatch = trimmed.match(PATTERNS.valueWithUnit);
  if (unitMatch) {
    const meters = parseInputWithUnit(trimmed, 'm');
    
    if (meters === null) {
      return {
        type: 'error',
        message: 'Invalid value with unit',
        input,
      };
    }
    
    // Determine the parsed unit
    const unitStr = unitMatch[2].toLowerCase();
    let parsedUnit: LengthUnit = 'm';
    if (unitStr === 'mm') parsedUnit = 'mm';
    else if (unitStr === 'cm') parsedUnit = 'cm';
    else if (unitStr === 'in' || unitStr === '"') parsedUnit = 'in';
    else if (unitStr === 'ft' || unitStr === "'") parsedUnit = 'ft';
    
    return {
      type: 'direct',
      distance: meters,
      rawValue: trimmed,
      parsedUnit,
    };
  }
  
  // 6. Try direct distance (just a number)
  if (PATTERNS.directDistance.test(trimmed)) {
    const distance = parseFloat(trimmed);
    
    if (isNaN(distance)) {
      return {
        type: 'error',
        message: 'Invalid number',
        input,
      };
    }
    
    return {
      type: 'direct',
      distance,
      rawValue: trimmed,
    };
  }
  
  // No pattern matched
  return {
    type: 'error',
    message: 'Unrecognized input format. Try: 5,10 or @5,10 or @10<45 or 10',
    input,
  };
}

/**
 * Resolve a parsed coordinate to an actual Point
 * 
 * @param parsed - The parsed coordinate result
 * @param context - Context including last point, cursor direction, and default unit
 * @returns The resolved Point or null if invalid
 * 
 * @example
 * // Relative Cartesian
 * resolveCoordinate(
 *   { type: 'relative', x: 5, y: 10 },
 *   { lastPoint: { x: 0, y: 0 }, cursorDirection: { x: 1, y: 0 }, defaultUnit: 'ft' }
 * )
 * // Returns: { x: 1.524, y: 3.048 } (5ft, 10ft converted to meters)
 */
export function resolveCoordinate(
  parsed: ParsedCoordinate,
  context: CoordinateContext
): Point | null {
  const { lastPoint, cursorDirection, defaultUnit } = context;
  
  /**
   * Convert a distance value to meters, considering whether it was 
   * already converted during parsing (has parsedUnit) or needs conversion
   * from workspace units.
   */
  const toMeters = (value: number): number => {
    if (parsed.parsedUnit) {
      // Already in meters from parsing
      return value;
    }
    // Convert from workspace units
    return unitToMeters(value, defaultUnit);
  };
  
  switch (parsed.type) {
    case 'absolute':
      if (parsed.x === undefined || parsed.y === undefined) return null;
      return {
        x: unitToMeters(parsed.x, defaultUnit),
        y: unitToMeters(parsed.y, defaultUnit),
      };
    
    case 'relative':
      if (parsed.x !== undefined && parsed.y !== undefined) {
        // Cartesian relative: @x,y
        return {
          x: lastPoint.x + unitToMeters(parsed.x, defaultUnit),
          y: lastPoint.y - unitToMeters(parsed.y, defaultUnit), // Negative because SVG Y is inverted
        };
      }
      return null;
    
    case 'polar':
      if (parsed.distance === undefined || parsed.angle === undefined) return null;
      {
        const meters = toMeters(parsed.distance);
        const angleRad = (parsed.angle * Math.PI) / 180;
        return {
          x: lastPoint.x + meters * Math.cos(angleRad),
          y: lastPoint.y - meters * Math.sin(angleRad), // Negative for SVG coords
        };
      }
    
    case 'direct':
      if (parsed.distance === undefined) return null;
      {
        // Direct distance in cursor direction
        const len = Math.hypot(cursorDirection.x, cursorDirection.y);
        if (len < 0.0001) {
          // No direction available, use positive X axis
          const meters = toMeters(parsed.distance);
          return {
            x: lastPoint.x + meters,
            y: lastPoint.y,
          };
        }
        
        const meters = toMeters(parsed.distance);
        const normX = cursorDirection.x / len;
        const normY = cursorDirection.y / len;
        
        return {
          x: lastPoint.x + normX * meters,
          y: lastPoint.y + normY * meters,
        };
      }
    
    default:
      return null;
  }
}

/**
 * Validate an input string and return helpful error messages
 * 
 * @param input - Input string to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateInput(input: string): { isValid: boolean; error?: string } {
  if (!input.trim()) {
    return { isValid: false, error: 'Enter a value' };
  }
  
  const result = parseCoordinateInput(input);
  
  if (result.type === 'error') {
    return { isValid: false, error: result.message };
  }
  
  return { isValid: true };
}

/**
 * Get input format hints for display
 */
export function getInputHints(): string[] {
  return [
    '5,10 — Absolute X,Y coordinates',
    '@5,10 — Relative X,Y from last point',
    '@10<45 — 10 units at 45° from last point',
    '10 — Direct distance in cursor direction',
    "5'6\" — Feet and inches",
    '100mm — With unit suffix (mm, cm, m, in, ft)',
  ];
}

