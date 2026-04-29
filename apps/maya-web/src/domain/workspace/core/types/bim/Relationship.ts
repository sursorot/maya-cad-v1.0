/**
 * Object Relationships - IFC relationship mapping
 * 
 * Defines spatial and semantic relationships between BIM objects.
 * Maps to IFC relationship entities (IfcRelContainedInSpatialStructure, etc.)
 */

// ============================================================================
// Relationship Types
// ============================================================================

export type RelationshipType =
  // Spatial relationships
  | 'containedIn'       // Object is contained in a space (IfcRelContainedInSpatialStructure)
  | 'boundedBy'         // Space is bounded by elements (IfcRelSpaceBoundary)
  
  // Element relationships
  | 'fillsVoid'         // Door/window fills opening in wall (IfcRelFillsElement)
  | 'voidsElement'      // Opening voids a wall (IfcRelVoidsElement)
  | 'connects'          // Wall connects to wall (IfcRelConnectsPathElements)
  
  // Aggregation relationships
  | 'aggregates'        // Building aggregates storeys (IfcRelAggregates)
  | 'decomposes'        // Element is part of assembly (IfcRelDecomposes)
  
  // Association relationships
  | 'associatedWith'    // Generic association (IfcRelAssociates)
  | 'assignedTo'        // Assigned to group/system (IfcRelAssignsToGroup)
  
  // Type relationships
  | 'definedByType';    // Instance defined by type (IfcRelDefinesByType)

// ============================================================================
// Relationship Definition
// ============================================================================

export interface ObjectRelationship {
  /** Type of relationship */
  type: RelationshipType;
  
  /** GlobalId of the related object */
  relatedObjectId: string;
  
  /** Optional name for the relationship */
  name?: string;
  
  /** Optional description */
  description?: string;
  
  /** Additional attributes specific to relationship type */
  attributes?: Record<string, unknown>;
}

// ============================================================================
// Spatial Boundary (for room boundaries)
// ============================================================================

export type BoundaryType = 
  | '1stLevel'    // Physical boundary
  | '2ndLevel';   // Virtual/center-of-element boundary

export interface SpaceBoundary extends ObjectRelationship {
  type: 'boundedBy';
  
  /** Boundary type per IFC */
  boundaryType: BoundaryType;
  
  /** Whether this is an external boundary */
  isExternal?: boolean;
  
  /** Area of the boundary surface */
  area?: number;
}

// ============================================================================
// Connection Relationship (for wall connections)
// ============================================================================

export type ConnectionType =
  | 'atStart'     // Connected at start point
  | 'atEnd'       // Connected at end point
  | 'atPath'      // Connected along path (T-junction)
  | 'notDefined';

export interface PathConnection extends ObjectRelationship {
  type: 'connects';
  
  /** Where on this element the connection occurs */
  connectionAtThis: ConnectionType;
  
  /** Where on the related element the connection occurs */
  connectionAtRelated: ConnectionType;
  
  /** Connection geometry point */
  connectionPoint?: { x: number; y: number };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a generic relationship
 */
export function createRelationship(
  type: RelationshipType,
  relatedObjectId: string,
  options?: {
    name?: string;
    description?: string;
    attributes?: Record<string, unknown>;
  }
): ObjectRelationship {
  return {
    type,
    relatedObjectId,
    ...options,
  };
}

/**
 * Create a "fills void" relationship (door/window in wall)
 */
export function createFillsVoidRelationship(
  _openingId: string,
  wallId: string
): ObjectRelationship {
  return {
    type: 'fillsVoid',
    relatedObjectId: wallId,
    name: 'Opening fills void in wall',
  };
}

/**
 * Create a "voids element" relationship (opening cuts wall)
 */
export function createVoidsElementRelationship(
  _voidId: string,
  elementId: string
): ObjectRelationship {
  return {
    type: 'voidsElement',
    relatedObjectId: elementId,
    name: 'Void cuts element',
  };
}

/**
 * Create a "contained in" relationship (element in space)
 */
export function createContainedInRelationship(
  _elementId: string,
  spaceId: string
): ObjectRelationship {
  return {
    type: 'containedIn',
    relatedObjectId: spaceId,
    name: 'Element contained in space',
  };
}

/**
 * Create a space boundary relationship
 */
export function createSpaceBoundary(
  _spaceId: string,
  boundingElementId: string,
  boundaryType: BoundaryType = '2ndLevel',
  isExternal: boolean = false
): SpaceBoundary {
  return {
    type: 'boundedBy',
    relatedObjectId: boundingElementId,
    boundaryType,
    isExternal,
    name: `Space bounded by ${isExternal ? 'external' : 'internal'} element`,
  };
}

/**
 * Create a wall connection relationship
 */
export function createWallConnection(
  _wall1Id: string,
  wall2Id: string,
  connectionAtThis: ConnectionType,
  connectionAtRelated: ConnectionType,
  connectionPoint?: { x: number; y: number }
): PathConnection {
  return {
    type: 'connects',
    relatedObjectId: wall2Id,
    connectionAtThis,
    connectionAtRelated,
    connectionPoint,
    name: 'Wall connects to wall',
  };
}

// ============================================================================
// Relationship Utilities
// ============================================================================

/**
 * Filter relationships by type
 */
export function filterRelationshipsByType(
  relationships: ObjectRelationship[],
  type: RelationshipType
): ObjectRelationship[] {
  return relationships.filter(r => r.type === type);
}

/**
 * Find relationship to a specific object
 */
export function findRelationshipTo(
  relationships: ObjectRelationship[],
  relatedObjectId: string
): ObjectRelationship | undefined {
  return relationships.find(r => r.relatedObjectId === relatedObjectId);
}

/**
 * Check if a relationship exists
 */
export function hasRelationship(
  relationships: ObjectRelationship[],
  type: RelationshipType,
  relatedObjectId?: string
): boolean {
  return relationships.some(
    r => r.type === type && (!relatedObjectId || r.relatedObjectId === relatedObjectId)
  );
}

