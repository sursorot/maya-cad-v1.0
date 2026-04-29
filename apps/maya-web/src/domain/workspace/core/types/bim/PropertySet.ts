/**
 * Property Set System - IFC Pset equivalent
 * 
 * Provides structured property storage compatible with IFC property sets.
 * Supports various value types including measures with units.
 */

// ============================================================================
// Property Value Types
// ============================================================================

export interface StringPropertyValue {
  type: 'string';
  value: string;
}

export interface NumberPropertyValue {
  type: 'number';
  value: number;
}

export interface BooleanPropertyValue {
  type: 'boolean';
  value: boolean;
}

export interface EnumPropertyValue {
  type: 'enum';
  value: string;
  options: string[];
}

export interface ReferencePropertyValue {
  type: 'reference';
  value: string; // GlobalId of referenced object
}

export interface MeasurePropertyValue {
  type: 'measure';
  value: number;
  unit: MeasureUnit;
}

export type PropertyValue =
  | StringPropertyValue
  | NumberPropertyValue
  | BooleanPropertyValue
  | EnumPropertyValue
  | ReferencePropertyValue
  | MeasurePropertyValue;

// ============================================================================
// Measure Units (IFC compatible)
// ============================================================================

export type LengthUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft';
export type AreaUnit = 'mm2' | 'cm2' | 'm2' | 'in2' | 'ft2';
export type VolumeUnit = 'mm3' | 'cm3' | 'm3' | 'in3' | 'ft3';
export type AngleUnit = 'deg' | 'rad';
export type MassUnit = 'kg' | 'lb';
export type TimeUnit = 's' | 'min' | 'h';
export type TemperatureUnit = 'C' | 'F' | 'K';
export type ThermalUnit = 'W/(m·K)' | 'W/(m2·K)';

export type MeasureUnit =
  | LengthUnit
  | AreaUnit
  | VolumeUnit
  | AngleUnit
  | MassUnit
  | TimeUnit
  | TemperatureUnit
  | ThermalUnit
  | string; // Allow custom units

// ============================================================================
// Property Definition
// ============================================================================

export interface Property {
  /** Property name (e.g., "IsExternal", "FireRating") */
  name: string;
  
  /** Property value with type information */
  value: PropertyValue;
  
  /** Optional description */
  description?: string;
}

// ============================================================================
// Property Set Definition
// ============================================================================

export interface PropertySet {
  /** Unique identifier for this property set instance */
  id: string;
  
  /** Property set name (e.g., "Pset_WallCommon", "Pset_DoorCommon") */
  name: string;
  
  /** Optional description */
  description?: string;
  
  /** Properties in this set */
  properties: Property[];
}

// ============================================================================
// Standard IFC Property Set Names
// ============================================================================

export const STANDARD_PSET_NAMES = {
  // Wall property sets
  WALL_COMMON: 'Pset_WallCommon',
  
  // Door property sets
  DOOR_COMMON: 'Pset_DoorCommon',
  DOOR_WINDOW_GLAZING: 'Pset_DoorWindowGlazingType',
  
  // Window property sets
  WINDOW_COMMON: 'Pset_WindowCommon',
  
  // Space property sets
  SPACE_COMMON: 'Pset_SpaceCommon',
  SPACE_OCCUPANCY: 'Pset_SpaceOccupancyRequirements',
  SPACE_THERMAL: 'Pset_SpaceThermalRequirements',
  SPACE_FIRE_SAFETY: 'Pset_SpaceFireSafetyRequirements',
  
  // Building property sets
  BUILDING_COMMON: 'Pset_BuildingCommon',
  BUILDING_STOREY_COMMON: 'Pset_BuildingStoreyCommon',
} as const;

// ============================================================================
// Property Set Factory Functions
// ============================================================================

/**
 * Create an empty property set
 */
export function createPropertySet(name: string, description?: string): PropertySet {
  return {
    id: generatePropertySetId(),
    name,
    description,
    properties: [],
  };
}

/**
 * Add a property to a property set
 */
export function addProperty(pset: PropertySet, property: Property): PropertySet {
  return {
    ...pset,
    properties: [...pset.properties, property],
  };
}

/**
 * Get a property value from a property set by name
 */
export function getPropertyValue(pset: PropertySet, propertyName: string): PropertyValue | undefined {
  const property = pset.properties.find(p => p.name === propertyName);
  return property?.value;
}

/**
 * Set a property value in a property set
 */
export function setPropertyValue(
  pset: PropertySet,
  propertyName: string,
  value: PropertyValue,
  description?: string
): PropertySet {
  const existingIndex = pset.properties.findIndex(p => p.name === propertyName);
  
  const newProperty: Property = {
    name: propertyName,
    value,
    description,
  };
  
  if (existingIndex >= 0) {
    const newProperties = [...pset.properties];
    newProperties[existingIndex] = newProperty;
    return { ...pset, properties: newProperties };
  }
  
  return { ...pset, properties: [...pset.properties, newProperty] };
}

// ============================================================================
// Helper Functions for Creating Property Values
// ============================================================================

export function stringValue(value: string): StringPropertyValue {
  return { type: 'string', value };
}

export function numberValue(value: number): NumberPropertyValue {
  return { type: 'number', value };
}

export function booleanValue(value: boolean): BooleanPropertyValue {
  return { type: 'boolean', value };
}

export function enumValue(value: string, options: string[]): EnumPropertyValue {
  return { type: 'enum', value, options };
}

export function referenceValue(globalId: string): ReferencePropertyValue {
  return { type: 'reference', value: globalId };
}

export function measureValue(value: number, unit: MeasureUnit): MeasurePropertyValue {
  return { type: 'measure', value, unit };
}

// ============================================================================
// Internal Utilities
// ============================================================================

function generatePropertySetId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `pset-${crypto.randomUUID()}`;
  }
  return `pset-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

