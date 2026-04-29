/**
 * Property Manager
 * 
 * Manages BIM property sets for shapes.
 * Provides methods for creating, updating, and querying IFC-compatible property sets.
 */

import type { Shape } from '../../../../components/Workspace/types';
import type { BIMObjectProperties } from '../types/bim/BIMObject';
import {
  type PropertySet,
  type PropertyValue,
  createPropertySet,
  setPropertyValue,
  getPropertyValue,
  stringValue,
  numberValue,
  booleanValue,
  measureValue,
  STANDARD_PSET_NAMES,
} from '../types/bim/PropertySet';

// ============================================================================
// Property Manager Class
// ============================================================================

export class PropertyManager {
  // ============================================================================
  // Wall Property Sets
  // ============================================================================

  /**
   * Create Pset_WallCommon for a wall shape
   */
  createWallCommonPset(options: {
    isExternal?: boolean;
    loadBearing?: boolean;
    fireRating?: string;
    acousticRating?: string;
    thermalTransmittance?: number;
    combustible?: boolean;
    surfaceSpreadOfFlame?: string;
    status?: 'new' | 'existing' | 'demolition' | 'temporary';
    reference?: string;
  }): PropertySet {
    let pset = createPropertySet(
      STANDARD_PSET_NAMES.WALL_COMMON,
      'Common properties for wall elements'
    );

    if (options.isExternal !== undefined) {
      pset = setPropertyValue(pset, 'IsExternal', booleanValue(options.isExternal));
    }
    if (options.loadBearing !== undefined) {
      pset = setPropertyValue(pset, 'LoadBearing', booleanValue(options.loadBearing));
    }
    if (options.fireRating) {
      pset = setPropertyValue(pset, 'FireRating', stringValue(options.fireRating));
    }
    if (options.acousticRating) {
      pset = setPropertyValue(pset, 'AcousticRating', stringValue(options.acousticRating));
    }
    if (options.thermalTransmittance !== undefined) {
      pset = setPropertyValue(
        pset,
        'ThermalTransmittance',
        measureValue(options.thermalTransmittance, 'W/(m2·K)')
      );
    }
    if (options.combustible !== undefined) {
      pset = setPropertyValue(pset, 'Combustible', booleanValue(options.combustible));
    }
    if (options.surfaceSpreadOfFlame) {
      pset = setPropertyValue(
        pset,
        'SurfaceSpreadOfFlame',
        stringValue(options.surfaceSpreadOfFlame)
      );
    }
    if (options.status) {
      pset = setPropertyValue(pset, 'Status', stringValue(options.status));
    }
    if (options.reference) {
      pset = setPropertyValue(pset, 'Reference', stringValue(options.reference));
    }

    return pset;
  }

  // ============================================================================
  // Door Property Sets
  // ============================================================================

  /**
   * Create Pset_DoorCommon for a door opening
   */
  createDoorCommonPset(options: {
    isExternal?: boolean;
    fireRating?: string;
    acousticRating?: string;
    securityRating?: string;
    thermalTransmittance?: number;
    glazingAreaFraction?: number;
    handicapAccessible?: boolean;
    fireExit?: boolean;
    selfClosing?: boolean;
    smokeStop?: boolean;
    status?: 'new' | 'existing' | 'demolition' | 'temporary';
    reference?: string;
  }): PropertySet {
    let pset = createPropertySet(
      STANDARD_PSET_NAMES.DOOR_COMMON,
      'Common properties for door elements'
    );

    if (options.isExternal !== undefined) {
      pset = setPropertyValue(pset, 'IsExternal', booleanValue(options.isExternal));
    }
    if (options.fireRating) {
      pset = setPropertyValue(pset, 'FireRating', stringValue(options.fireRating));
    }
    if (options.acousticRating) {
      pset = setPropertyValue(pset, 'AcousticRating', stringValue(options.acousticRating));
    }
    if (options.securityRating) {
      pset = setPropertyValue(pset, 'SecurityRating', stringValue(options.securityRating));
    }
    if (options.thermalTransmittance !== undefined) {
      pset = setPropertyValue(
        pset,
        'ThermalTransmittance',
        measureValue(options.thermalTransmittance, 'W/(m2·K)')
      );
    }
    if (options.glazingAreaFraction !== undefined) {
      pset = setPropertyValue(
        pset,
        'GlazingAreaFraction',
        numberValue(options.glazingAreaFraction)
      );
    }
    if (options.handicapAccessible !== undefined) {
      pset = setPropertyValue(
        pset,
        'HandicapAccessible',
        booleanValue(options.handicapAccessible)
      );
    }
    if (options.fireExit !== undefined) {
      pset = setPropertyValue(pset, 'FireExit', booleanValue(options.fireExit));
    }
    if (options.selfClosing !== undefined) {
      pset = setPropertyValue(pset, 'SelfClosing', booleanValue(options.selfClosing));
    }
    if (options.smokeStop !== undefined) {
      pset = setPropertyValue(pset, 'SmokeStop', booleanValue(options.smokeStop));
    }
    if (options.status) {
      pset = setPropertyValue(pset, 'Status', stringValue(options.status));
    }
    if (options.reference) {
      pset = setPropertyValue(pset, 'Reference', stringValue(options.reference));
    }

    return pset;
  }

  // ============================================================================
  // Window Property Sets
  // ============================================================================

  /**
   * Create Pset_WindowCommon for a window opening
   */
  createWindowCommonPset(options: {
    isExternal?: boolean;
    fireRating?: string;
    acousticRating?: string;
    thermalTransmittance?: number;
    glazingAreaFraction?: number;
    hasSillExternal?: boolean;
    hasSillInternal?: boolean;
    hasDrive?: boolean;
    smokeStop?: boolean;
    status?: 'new' | 'existing' | 'demolition' | 'temporary';
    reference?: string;
  }): PropertySet {
    let pset = createPropertySet(
      STANDARD_PSET_NAMES.WINDOW_COMMON,
      'Common properties for window elements'
    );

    if (options.isExternal !== undefined) {
      pset = setPropertyValue(pset, 'IsExternal', booleanValue(options.isExternal));
    }
    if (options.fireRating) {
      pset = setPropertyValue(pset, 'FireRating', stringValue(options.fireRating));
    }
    if (options.acousticRating) {
      pset = setPropertyValue(pset, 'AcousticRating', stringValue(options.acousticRating));
    }
    if (options.thermalTransmittance !== undefined) {
      pset = setPropertyValue(
        pset,
        'ThermalTransmittance',
        measureValue(options.thermalTransmittance, 'W/(m2·K)')
      );
    }
    if (options.glazingAreaFraction !== undefined) {
      pset = setPropertyValue(
        pset,
        'GlazingAreaFraction',
        numberValue(options.glazingAreaFraction)
      );
    }
    if (options.hasSillExternal !== undefined) {
      pset = setPropertyValue(pset, 'HasSillExternal', booleanValue(options.hasSillExternal));
    }
    if (options.hasSillInternal !== undefined) {
      pset = setPropertyValue(pset, 'HasSillInternal', booleanValue(options.hasSillInternal));
    }
    if (options.hasDrive !== undefined) {
      pset = setPropertyValue(pset, 'HasDrive', booleanValue(options.hasDrive));
    }
    if (options.smokeStop !== undefined) {
      pset = setPropertyValue(pset, 'SmokeStop', booleanValue(options.smokeStop));
    }
    if (options.status) {
      pset = setPropertyValue(pset, 'Status', stringValue(options.status));
    }
    if (options.reference) {
      pset = setPropertyValue(pset, 'Reference', stringValue(options.reference));
    }

    return pset;
  }

  // ============================================================================
  // Space/Room Property Sets
  // ============================================================================

  /**
   * Create Pset_SpaceCommon for a room shape
   */
  createSpaceCommonPset(options: {
    category?: string;
    floorCovering?: string;
    wallCovering?: string;
    ceilingCovering?: string;
    skirtingBoard?: string;
    publiclyAccessible?: boolean;
    handicapAccessible?: boolean;
    grossPlannedArea?: number;
    netPlannedArea?: number;
    reference?: string;
  }): PropertySet {
    let pset = createPropertySet(
      STANDARD_PSET_NAMES.SPACE_COMMON,
      'Common properties for space elements'
    );

    if (options.category) {
      pset = setPropertyValue(pset, 'Category', stringValue(options.category));
    }
    if (options.floorCovering) {
      pset = setPropertyValue(pset, 'FloorCovering', stringValue(options.floorCovering));
    }
    if (options.wallCovering) {
      pset = setPropertyValue(pset, 'WallCovering', stringValue(options.wallCovering));
    }
    if (options.ceilingCovering) {
      pset = setPropertyValue(pset, 'CeilingCovering', stringValue(options.ceilingCovering));
    }
    if (options.skirtingBoard) {
      pset = setPropertyValue(pset, 'SkirtingBoard', stringValue(options.skirtingBoard));
    }
    if (options.publiclyAccessible !== undefined) {
      pset = setPropertyValue(
        pset,
        'PubliclyAccessible',
        booleanValue(options.publiclyAccessible)
      );
    }
    if (options.handicapAccessible !== undefined) {
      pset = setPropertyValue(
        pset,
        'HandicapAccessible',
        booleanValue(options.handicapAccessible)
      );
    }
    if (options.grossPlannedArea !== undefined) {
      pset = setPropertyValue(
        pset,
        'GrossPlannedArea',
        measureValue(options.grossPlannedArea, 'm2')
      );
    }
    if (options.netPlannedArea !== undefined) {
      pset = setPropertyValue(
        pset,
        'NetPlannedArea',
        measureValue(options.netPlannedArea, 'm2')
      );
    }
    if (options.reference) {
      pset = setPropertyValue(pset, 'Reference', stringValue(options.reference));
    }

    return pset;
  }

  /**
   * Create Pset_SpaceOccupancyRequirements for a room shape
   */
  createSpaceOccupancyPset(options: {
    occupancyType?: string;
    occupancyNumber?: number;
    occupancyNumberPeak?: number;
    occupancyTimePerDay?: number;
    areaPerOccupant?: number;
    minimumHeadroom?: number;
  }): PropertySet {
    let pset = createPropertySet(
      STANDARD_PSET_NAMES.SPACE_OCCUPANCY,
      'Occupancy requirements for space elements'
    );

    if (options.occupancyType) {
      pset = setPropertyValue(pset, 'OccupancyType', stringValue(options.occupancyType));
    }
    if (options.occupancyNumber !== undefined) {
      pset = setPropertyValue(pset, 'OccupancyNumber', numberValue(options.occupancyNumber));
    }
    if (options.occupancyNumberPeak !== undefined) {
      pset = setPropertyValue(
        pset,
        'OccupancyNumberPeak',
        numberValue(options.occupancyNumberPeak)
      );
    }
    if (options.occupancyTimePerDay !== undefined) {
      pset = setPropertyValue(
        pset,
        'OccupancyTimePerDay',
        measureValue(options.occupancyTimePerDay, 'h')
      );
    }
    if (options.areaPerOccupant !== undefined) {
      pset = setPropertyValue(
        pset,
        'AreaPerOccupant',
        measureValue(options.areaPerOccupant, 'm2')
      );
    }
    if (options.minimumHeadroom !== undefined) {
      pset = setPropertyValue(
        pset,
        'MinimumHeadroom',
        measureValue(options.minimumHeadroom, 'm')
      );
    }

    return pset;
  }

  // ============================================================================
  // Generic Property Operations
  // ============================================================================

  /**
   * Get all property sets from a shape (if it has BIM properties)
   */
  getPropertySets(shape: Shape): PropertySet[] {
    const bimShape = shape as Shape & Partial<BIMObjectProperties>;
    return bimShape.propertySets ?? [];
  }

  /**
   * Get a specific property set by name
   */
  getPropertySetByName(shape: Shape, psetName: string): PropertySet | undefined {
    const psets = this.getPropertySets(shape);
    return psets.find(ps => ps.name === psetName);
  }

  /**
   * Get a property value from a shape
   */
  getProperty(shape: Shape, psetName: string, propertyName: string): PropertyValue | undefined {
    const pset = this.getPropertySetByName(shape, psetName);
    if (!pset) return undefined;
    return getPropertyValue(pset, propertyName);
  }

  /**
   * Set a property value on a shape (returns updated shape)
   */
  setProperty<S extends Shape>(
    shape: S,
    psetName: string,
    propertyName: string,
    value: PropertyValue
  ): S & Partial<BIMObjectProperties> {
    const bimShape = shape as S & Partial<BIMObjectProperties>;
    const psets = [...(bimShape.propertySets ?? [])];
    
    let psetIndex = psets.findIndex(ps => ps.name === psetName);
    if (psetIndex === -1) {
      psets.push(createPropertySet(psetName));
      psetIndex = psets.length - 1;
    }
    
    psets[psetIndex] = setPropertyValue(psets[psetIndex], propertyName, value);
    
    return { ...bimShape, propertySets: psets };
  }

  /**
   * Add a complete property set to a shape
   */
  addPropertySet<S extends Shape>(
    shape: S,
    pset: PropertySet
  ): S & Partial<BIMObjectProperties> {
    const bimShape = shape as S & Partial<BIMObjectProperties>;
    const psets = [...(bimShape.propertySets ?? [])];
    
    // Replace existing pset with same name, or add new
    const existingIndex = psets.findIndex(ps => ps.name === pset.name);
    if (existingIndex >= 0) {
      psets[existingIndex] = pset;
    } else {
      psets.push(pset);
    }
    
    return { ...bimShape, propertySets: psets } as S & Partial<BIMObjectProperties>;
  }

  /**
   * Remove a property set from a shape
   */
  removePropertySet<S extends Shape>(
    shape: S,
    psetName: string
  ): S & Partial<BIMObjectProperties> {
    const bimShape = shape as S & Partial<BIMObjectProperties>;
    const psets = (bimShape.propertySets ?? []).filter(ps => ps.name !== psetName);
    return { ...bimShape, propertySets: psets } as S & Partial<BIMObjectProperties>;
  }

  // ============================================================================
  // Default Property Sets for Shape Types
  // ============================================================================

  /**
   * Create default property sets for a wall shape
   */
  createDefaultWallProperties(): PropertySet[] {
    return [
      this.createWallCommonPset({
        isExternal: false,
        loadBearing: false,
        status: 'new',
      }),
    ];
  }

  /**
   * Create default property sets for a door opening
   */
  createDefaultDoorProperties(): PropertySet[] {
    return [
      this.createDoorCommonPset({
        isExternal: false,
        handicapAccessible: false,
        fireExit: false,
        selfClosing: false,
        status: 'new',
      }),
    ];
  }

  /**
   * Create default property sets for a window opening
   */
  createDefaultWindowProperties(): PropertySet[] {
    return [
      this.createWindowCommonPset({
        isExternal: true,
        status: 'new',
      }),
    ];
  }

  /**
   * Create default property sets for a room shape
   */
  createDefaultRoomProperties(area?: number): PropertySet[] {
    return [
      this.createSpaceCommonPset({
        category: 'office',
        publiclyAccessible: true,
        handicapAccessible: true,
        grossPlannedArea: area,
      }),
    ];
  }
}

// Export singleton instance
export const propertyManager = new PropertyManager();

