/**
 * Unit Conversion Utilities
 * 
 * Functions for parsing and converting between different length units.
 */

import type { LengthUnit } from '../../components/Workspace/types';

/**
 * Result of parsing a length value with unit
 */
export interface ParsedLength {
  /** Value converted to meters */
  meters: number;
  
  /** The unit that was parsed */
  unit: LengthUnit;
  
  /** Original numeric value before conversion */
  originalValue: number;
}

/**
 * Unit string aliases
 */
const UNIT_ALIASES: Record<string, LengthUnit> = {
  'mm': 'mm',
  'millimeter': 'mm',
  'millimeters': 'mm',
  'cm': 'cm',
  'centimeter': 'cm',
  'centimeters': 'cm',
  'm': 'm',
  'meter': 'm',
  'meters': 'm',
  'in': 'in',
  'inch': 'in',
  'inches': 'in',
  '"': 'in',
  'ft': 'ft',
  'foot': 'ft',
  'feet': 'ft',
  "'": 'ft',
};

/**
 * Conversion factors from each unit to meters
 */
const TO_METERS: Record<LengthUnit, number> = {
  'mm': 0.001,
  'cm': 0.01,
  'm': 1,
  'in': 0.0254,
  'ft': 0.3048,
  'ft-in': 0.3048, // Base unit is feet
};

/**
 * Conversion factors from meters to each unit
 */
const FROM_METERS: Record<LengthUnit, number> = {
  'mm': 1000,
  'cm': 100,
  'm': 1,
  'in': 39.3701,
  'ft': 3.28084,
  'ft-in': 3.28084,
};

/**
 * Parse a numeric value with a unit suffix and convert to meters
 * 
 * @param value - The numeric value
 * @param unitStr - The unit string (e.g., "mm", "ft", "'")
 * @returns ParsedLength or null if unit not recognized
 * 
 * @example
 * parseLength(100, 'mm') // { meters: 0.1, unit: 'mm', originalValue: 100 }
 * parseLength(5, 'ft')   // { meters: 1.524, unit: 'ft', originalValue: 5 }
 */
export function parseLength(value: number, unitStr: string): ParsedLength | null {
  const normalized = unitStr.toLowerCase().trim();
  const unit = UNIT_ALIASES[normalized];
  
  if (!unit) {
    return null;
  }
  
  const meters = value * TO_METERS[unit];
  
  return {
    meters,
    unit,
    originalValue: value,
  };
}

/**
 * Parse a feet-inches string like "5'6" or "5'-6""
 * 
 * @param input - Input string in feet-inches format
 * @returns Distance in meters, or null if invalid
 * 
 * @example
 * parseFeetInches("5'6\"")   // 1.6764 meters
 * parseFeetInches("5'-6\"")  // 1.6764 meters
 * parseFeetInches("5' 6\"")  // 1.6764 meters
 * parseFeetInches("0'11\"")  // 0.2794 meters
 */
export function parseFeetInches(input: string): number | null {
  // Patterns:
  // 5'6" or 5'6
  // 5'-6" or 5'-6
  // 5' 6" or 5' 6
  const patterns = [
    /^(\d+(?:\.\d+)?)'[\s-]*(\d+(?:\.\d+)?)"?$/,  // 5'6" or 5'-6" or 5' 6"
    /^(\d+(?:\.\d+)?)'$/,                          // 5' (feet only)
    /^(\d+(?:\.\d+)?)"$/,                          // 6" (inches only)
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      if (match.length === 3) {
        // Feet and inches
        const feet = parseFloat(match[1]);
        const inches = parseFloat(match[2]);
        
        if (isNaN(feet) || isNaN(inches)) return null;
        if (feet < 0 || inches < 0) return null;
        
        const totalInches = feet * 12 + inches;
        return totalInches * 0.0254;
      } else if (match.length === 2) {
        const value = parseFloat(match[1]);
        if (isNaN(value) || value < 0) return null;
        
        if (input.includes("'")) {
          // Feet only
          return value * 0.3048;
        } else {
          // Inches only
          return value * 0.0254;
        }
      }
    }
  }
  
  return null;
}

/**
 * Parse an input string that might be a number or have a unit suffix
 * 
 * @param input - Input string to parse
 * @param defaultUnit - Unit to use if no suffix specified
 * @returns Distance in meters, or null if invalid
 * 
 * @example
 * parseInputWithUnit("100mm", "ft")  // 0.1 meters (uses explicit mm)
 * parseInputWithUnit("5", "ft")      // 1.524 meters (uses default ft)
 * parseInputWithUnit("5'6\"", "m")   // 1.6764 meters (feet-inches detected)
 */
export function parseInputWithUnit(
  input: string,
  defaultUnit: LengthUnit
): number | null {
  const trimmed = input.trim();
  
  if (!trimmed) return null;
  
  // Check for feet-inches format first
  const feetInchResult = parseFeetInches(trimmed);
  if (feetInchResult !== null) {
    return feetInchResult;
  }
  
  // Check for value with unit suffix
  const unitMatch = trimmed.match(/^(-?[\d.]+)\s*(mm|cm|m|in|ft|'|")$/i);
  if (unitMatch) {
    const value = parseFloat(unitMatch[1]);
    if (isNaN(value)) return null;
    
    const result = parseLength(value, unitMatch[2]);
    return result?.meters ?? null;
  }
  
  // Just a number - use default unit
  const numValue = parseFloat(trimmed);
  if (isNaN(numValue)) return null;
  
  return numValue * TO_METERS[defaultUnit];
}

/**
 * Convert meters to a specific unit
 * 
 * @param meters - Distance in meters
 * @param unit - Target unit
 * @returns Distance in target unit
 */
export function metersToUnit(meters: number, unit: LengthUnit): number {
  return meters * FROM_METERS[unit];
}

/**
 * Convert a value from one unit to meters
 * 
 * @param value - Value in source unit
 * @param unit - Source unit
 * @returns Distance in meters
 */
export function unitToMeters(value: number, unit: LengthUnit): number {
  return value * TO_METERS[unit];
}

/**
 * Format a meters value with a unit
 * 
 * @param meters - Distance in meters
 * @param unit - Target unit
 * @param precision - Decimal places (default: 2)
 * @returns Formatted string with unit
 */
export function formatWithUnit(
  meters: number,
  unit: LengthUnit,
  precision: number = 2
): string {
  const value = metersToUnit(meters, unit);
  
  switch (unit) {
    case 'mm':
      return `${value.toFixed(precision)}mm`;
    case 'cm':
      return `${value.toFixed(precision)}cm`;
    case 'm':
      return `${value.toFixed(precision)}m`;
    case 'in':
      return `${value.toFixed(precision)}"`;
    case 'ft':
      return `${value.toFixed(precision)}'`;
    case 'ft-in':
      const totalInches = meters * 39.3701;
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      if (feet === 0) {
        return `${inches.toFixed(1)}"`;
      }
      return `${feet}'${Math.round(inches)}"`;
    default:
      return `${value.toFixed(precision)}`;
  }
}

