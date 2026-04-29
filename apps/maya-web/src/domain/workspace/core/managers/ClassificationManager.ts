/**
 * Classification Manager
 * 
 * Manages industry classification codes (OmniClass, Uniclass, etc.) for shapes.
 * Provides search, validation, and assignment capabilities.
 */

import type { Shape } from '../../../../components/Workspace/types';
import type { BIMObjectProperties } from '../types/bim/BIMObject';
import {
  type ClassificationReference,
  type ClassificationSystemType,
  createClassification,
  createOmniClassRef,
  createUniclassRef,
  searchOmniClass,
  searchUniclass,
  validateClassificationCode,
  DEFAULT_CLASSIFICATIONS,
  OMNICLASS_TABLE_21,
  UNICLASS_2015,
} from '../types/bim/Classification';

// ============================================================================
// Classification Manager Class
// ============================================================================

export class ClassificationManager {
  // ============================================================================
  // Classification Assignment
  // ============================================================================

  /**
   * Set classification on a shape
   */
  setClassification<S extends Shape>(
    shape: S,
    classification: ClassificationReference
  ): S & Partial<BIMObjectProperties> {
    return { ...shape, classification } as S & Partial<BIMObjectProperties>;
  }

  /**
   * Remove classification from a shape
   */
  removeClassification<S extends Shape>(
    shape: S
  ): S & Partial<BIMObjectProperties> {
    const shapeWithBim = shape as S & Partial<BIMObjectProperties>;
    const { classification, ...rest } = shapeWithBim;
    // classification is intentionally destructured to remove it
    void classification;
    return rest as S & Partial<BIMObjectProperties>;
  }

  /**
   * Get classification from a shape
   */
  getClassification(shape: Shape): ClassificationReference | undefined {
    return (shape as Shape & Partial<BIMObjectProperties>).classification;
  }

  // ============================================================================
  // Default Classifications by Shape Type
  // ============================================================================

  /**
   * Get suggested classification for a shape based on its type
   */
  getSuggestedClassification(shape: Shape): ClassificationReference | undefined {
    switch (shape.type) {
      case 'wall':
        // Default to internal partition
        return DEFAULT_CLASSIFICATIONS.wall.internal;
      
      case 'opening':
        if (shape.category === 'door') {
          return DEFAULT_CLASSIFICATIONS.door.internal;
        } else if (shape.category === 'window') {
          return DEFAULT_CLASSIFICATIONS.window.external;
        }
        return undefined;
      
      case 'room':
        return DEFAULT_CLASSIFICATIONS.room.office;
      
      default:
        return undefined;
    }
  }

  /**
   * Auto-assign classification to a shape based on its type
   */
  autoClassify<S extends Shape>(shape: S): S & Partial<BIMObjectProperties> {
    const classification = this.getSuggestedClassification(shape);
    if (classification) {
      return this.setClassification(shape, classification);
    }
    return shape as S & Partial<BIMObjectProperties>;
  }

  // ============================================================================
  // Classification Search
  // ============================================================================

  /**
   * Search classifications across all systems
   */
  search(query: string, system?: ClassificationSystemType): ClassificationReference[] {
    if (!query || query.length < 2) {
      return [];
    }

    const results: ClassificationReference[] = [];

    if (!system || system === 'OmniClass') {
      results.push(...searchOmniClass(query));
    }

    if (!system || system === 'Uniclass2015') {
      results.push(...searchUniclass(query));
    }

    return results;
  }

  /**
   * Get all classifications for a specific system
   */
  getSystemClassifications(system: ClassificationSystemType): ClassificationReference[] {
    switch (system) {
      case 'OmniClass':
        return Object.entries(OMNICLASS_TABLE_21).map(([code, data]) =>
          createOmniClassRef(code, data.title)
        );
      case 'Uniclass2015':
        return Object.entries(UNICLASS_2015).map(([code, data]) =>
          createUniclassRef(code, data.title)
        );
      default:
        return [];
    }
  }

  // ============================================================================
  // Classification Creation
  // ============================================================================

  /**
   * Create a new classification reference
   */
  createClassification(
    system: ClassificationSystemType,
    code: string,
    title: string,
    options?: {
      edition?: string;
      description?: string;
      source?: string;
    }
  ): ClassificationReference {
    return createClassification(system, code, title, options);
  }

  /**
   * Create an OmniClass classification
   */
  createOmniClass(code: string, title?: string): ClassificationReference {
    return createOmniClassRef(code, title);
  }

  /**
   * Create a Uniclass 2015 classification
   */
  createUniclass(code: string, title?: string): ClassificationReference {
    return createUniclassRef(code, title);
  }

  /**
   * Create a custom classification
   */
  createCustomClassification(
    code: string,
    title: string,
    description?: string
  ): ClassificationReference {
    return createClassification('custom', code, title, { description });
  }

  // ============================================================================
  // Classification Validation
  // ============================================================================

  /**
   * Validate a classification code
   */
  validateCode(system: ClassificationSystemType, code: string): boolean {
    return validateClassificationCode(system, code);
  }

  /**
   * Check if a classification exists in the system
   */
  classificationExists(system: ClassificationSystemType, code: string): boolean {
    switch (system) {
      case 'OmniClass':
        return code in OMNICLASS_TABLE_21;
      case 'Uniclass2015':
        return code in UNICLASS_2015;
      default:
        return true; // Custom classifications are always valid
    }
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Set classification on multiple shapes
   */
  setClassificationBulk<S extends Shape>(
    shapes: S[],
    classification: ClassificationReference
  ): (S & Partial<BIMObjectProperties>)[] {
    return shapes.map(shape => this.setClassification(shape, classification));
  }

  /**
   * Auto-classify multiple shapes
   */
  autoClassifyBulk<S extends Shape>(
    shapes: S[]
  ): (S & Partial<BIMObjectProperties>)[] {
    return shapes.map(shape => this.autoClassify(shape));
  }

  /**
   * Get shapes by classification
   */
  filterByClassification(
    shapes: Shape[],
    classification: Partial<ClassificationReference>
  ): Shape[] {
    return shapes.filter(shape => {
      const shapeClassification = this.getClassification(shape);
      if (!shapeClassification) return false;

      if (classification.system && shapeClassification.system !== classification.system) {
        return false;
      }
      if (classification.code && shapeClassification.code !== classification.code) {
        return false;
      }
      if (classification.title && !shapeClassification.title.includes(classification.title)) {
        return false;
      }

      return true;
    });
  }

  // ============================================================================
  // Classification Reports
  // ============================================================================

  /**
   * Get classification statistics for shapes
   */
  getClassificationStats(shapes: Shape[]): {
    total: number;
    classified: number;
    unclassified: number;
    bySystem: Record<ClassificationSystemType | 'none', number>;
  } {
    const stats = {
      total: shapes.length,
      classified: 0,
      unclassified: 0,
      bySystem: {
        OmniClass: 0,
        Uniclass2015: 0,
        MasterFormat: 0,
        UniFormat: 0,
        NRM: 0,
        SfB: 0,
        custom: 0,
        none: 0,
      } as Record<ClassificationSystemType | 'none', number>,
    };

    for (const shape of shapes) {
      const classification = this.getClassification(shape);
      if (classification) {
        stats.classified++;
        stats.bySystem[classification.system]++;
      } else {
        stats.unclassified++;
        stats.bySystem.none++;
      }
    }

    return stats;
  }

  /**
   * Generate a classification report for export
   */
  generateClassificationReport(shapes: Shape[]): {
    shapeId: string;
    shapeType: string;
    system?: string;
    code?: string;
    title?: string;
  }[] {
    return shapes.map(shape => {
      const classification = this.getClassification(shape);
      return {
        shapeId: shape.id,
        shapeType: shape.type,
        system: classification?.system,
        code: classification?.code,
        title: classification?.title,
      };
    });
  }
}

// Export singleton instance
export const classificationManager = new ClassificationManager();

