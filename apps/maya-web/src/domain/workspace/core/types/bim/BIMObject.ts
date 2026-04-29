/**
 * BIM Object Base Interface
 * 
 * Core interface for all BIM-enabled objects in Maya.
 * Provides IFC-compatible identification, classification, properties, and relationships.
 */

import type { ClassificationReference } from './Classification';
import type { PropertySet } from './PropertySet';
import type { ObjectRelationship } from './Relationship';
import type { OwnerHistory } from './OwnerHistory';

// ============================================================================
// BIM Object Base Interface
// ============================================================================

/**
 * Base interface for all BIM objects
 * All shape types should extend or include these properties for BIM compliance
 */
export interface BIMObjectProperties {
  // Identity
  /** IFC-compatible Global Unique Identifier (UUID v4, can be compressed to IFC format) */
  globalId: string;
  
  /** User-friendly name */
  name?: string;
  
  /** Optional description */
  description?: string;
  
  /** Short identifier/tag (e.g., "D-101", "W-203") */
  tag?: string;
  
  // Classification
  /** Industry classification reference (OmniClass, Uniclass, etc.) */
  classification?: ClassificationReference;
  
  // Properties
  /** IFC-compatible property sets */
  propertySets?: PropertySet[];
  
  // Relationships
  /** Object relationships (spatial, semantic) */
  relationships?: ObjectRelationship[];
  
  // Metadata
  /** Change tracking history */
  ownerHistory?: OwnerHistory;
  
  // Layer
  /** Layer ID for CAD compatibility */
  layerId?: string;
}

// ============================================================================
// Shape Status (for renovation/phasing)
// ============================================================================

export type ShapeStatus = 
  | 'new'         // New construction
  | 'existing'    // Existing to remain
  | 'demolition'  // To be demolished
  | 'temporary';  // Temporary construction

// ============================================================================
// IFC GUID Utilities
// ============================================================================

/**
 * IFC uses a compressed 22-character base64 encoding of UUIDs.
 * This is the standard format for GlobalId in IFC files.
 */

const IFC_BASE64_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';

/**
 * Generate a new UUID v4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Convert a standard UUID to IFC compressed GUID format (22 characters)
 * Based on buildingSMART IFC GUID specification
 */
export function uuidToIfcGuid(uuid: string): string {
  // Remove hyphens from UUID
  const hex = uuid.replace(/-/g, '');
  
  // Convert hex string to array of 4-bit values
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  
  // Convert to IFC base64 encoding (6 bits per character)
  let result = '';
  let bitBuffer = 0;
  let bitsInBuffer = 0;
  
  for (const byte of bytes) {
    bitBuffer = (bitBuffer << 8) | byte;
    bitsInBuffer += 8;
    
    while (bitsInBuffer >= 6) {
      bitsInBuffer -= 6;
      const index = (bitBuffer >> bitsInBuffer) & 0x3F;
      result += IFC_BASE64_CHARS[index];
    }
  }
  
  // Handle remaining bits
  if (bitsInBuffer > 0) {
    const index = (bitBuffer << (6 - bitsInBuffer)) & 0x3F;
    result += IFC_BASE64_CHARS[index];
  }
  
  return result.substring(0, 22);
}

/**
 * Convert an IFC compressed GUID back to standard UUID format
 */
export function ifcGuidToUuid(ifcGuid: string): string {
  // Convert IFC base64 to bit stream
  let bitBuffer = BigInt(0);
  
  for (const char of ifcGuid) {
    const index = IFC_BASE64_CHARS.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid IFC GUID character: ${char}`);
    }
    bitBuffer = (bitBuffer << BigInt(6)) | BigInt(index);
  }
  
  // Convert to hex string
  let hex = bitBuffer.toString(16).padStart(32, '0');
  
  // Format as UUID
  return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
}

/**
 * Generate a new IFC-compatible Global ID
 * Returns the standard UUID format (for storage) - can be converted to IFC format on export
 */
export function generateGlobalId(): string {
  return generateUUID();
}

/**
 * Validate a Global ID (accepts both UUID and IFC format)
 */
export function isValidGlobalId(id: string): boolean {
  // Check UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return true;
  }
  
  // Check IFC GUID format (22 characters from IFC base64 alphabet)
  const ifcGuidRegex = /^[0-9A-Za-z_$]{22}$/;
  return ifcGuidRegex.test(id);
}

// ============================================================================
// BIM Object Factory Functions
// ============================================================================

/**
 * Create default BIM properties for a new object
 */
export function createBIMProperties(
  options?: Partial<BIMObjectProperties>
): BIMObjectProperties {
  return {
    globalId: generateGlobalId(),
    propertySets: [],
    relationships: [],
    ...options,
  };
}

/**
 * Add BIM properties to an existing shape
 */
export function withBIMProperties<T extends object>(
  shape: T,
  bimProps?: Partial<BIMObjectProperties>
): T & BIMObjectProperties {
  return {
    ...shape,
    globalId: generateGlobalId(),
    propertySets: [],
    relationships: [],
    ...bimProps,
  };
}

/**
 * Generate a tag/mark for an object based on type and sequence
 */
export function generateTag(
  prefix: string,
  sequence: number,
  levelPrefix?: string
): string {
  const paddedSequence = sequence.toString().padStart(2, '0');
  if (levelPrefix) {
    return `${levelPrefix}-${prefix}${paddedSequence}`;
  }
  return `${prefix}-${paddedSequence}`;
}

/**
 * Standard tag prefixes by shape type
 */
export const TAG_PREFIXES = {
  wall: 'W',
  door: 'D',
  window: 'WN',
  room: 'RM',
  zone: 'Z',
  opening: 'O',
} as const;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an object has BIM properties
 */
export function hasBIMProperties(obj: unknown): obj is BIMObjectProperties {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'globalId' in obj &&
    typeof (obj as BIMObjectProperties).globalId === 'string'
  );
}

/**
 * Check if an object has a specific property set
 */
export function hasPropertySet(
  obj: BIMObjectProperties,
  psetName: string
): boolean {
  return obj.propertySets?.some(ps => ps.name === psetName) ?? false;
}

/**
 * Get a property set by name
 */
export function getPropertySet(
  obj: BIMObjectProperties,
  psetName: string
): PropertySet | undefined {
  return obj.propertySets?.find(ps => ps.name === psetName);
}

/**
 * Add or update a property set on an object
 */
export function setPropertySet(
  obj: BIMObjectProperties,
  pset: PropertySet
): BIMObjectProperties {
  const existingIndex = obj.propertySets?.findIndex(ps => ps.name === pset.name) ?? -1;
  const propertySets = [...(obj.propertySets ?? [])];
  
  if (existingIndex >= 0) {
    propertySets[existingIndex] = pset;
  } else {
    propertySets.push(pset);
  }
  
  return { ...obj, propertySets };
}

