/**
 * Layer Manager
 * 
 * Manages the layer system for CAD/BIM interoperability.
 * Provides AIA CAD Layer Guidelines compliant layer management.
 */

import type { Shape } from '../../../../components/Workspace/types';
import type { BIMObjectProperties } from '../types/bim/BIMObject';
import {
  type Layer,
  type Discipline,
  type LayerCategory,
  DEFAULT_LAYERS,
  createLayer,
  getLayerById,
  getLayerByAiaName,
  getDefaultLayerForShapeType,
} from '../types/bim/Layer';

// ============================================================================
// Layer State
// ============================================================================

export interface LayerState {
  /** All layers in the workspace */
  layers: Layer[];
  
  /** Currently active/selected layer */
  activeLayerId?: string;
}

// ============================================================================
// Layer Manager Class
// ============================================================================

export class LayerManager {
  private layers: Layer[] = [];
  private activeLayerId?: string;

  constructor(initialLayers?: Layer[]) {
    this.layers = initialLayers ?? [...DEFAULT_LAYERS];
    // Default to A-WALL as active layer
    this.activeLayerId = this.layers.find(l => l.id === 'a-wall')?.id;
  }

  // ============================================================================
  // Layer CRUD Operations
  // ============================================================================

  /**
   * Get all layers
   */
  getLayers(): Layer[] {
    return [...this.layers];
  }

  /**
   * Get a layer by ID
   */
  getLayer(layerId: string): Layer | undefined {
    return getLayerById(this.layers, layerId);
  }

  /**
   * Get a layer by AIA name
   */
  getLayerByName(name: string): Layer | undefined {
    return getLayerByAiaName(this.layers, name);
  }

  /**
   * Add a new layer
   */
  addLayer(layer: Layer): void {
    if (this.layers.some(l => l.id === layer.id)) {
      throw new Error(`Layer with ID ${layer.id} already exists`);
    }
    this.layers.push(layer);
  }

  /**
   * Create and add a new layer
   */
  createLayer(
    name: string,
    discipline: Discipline,
    category: LayerCategory,
    options?: Partial<Omit<Layer, 'id' | 'name' | 'discipline' | 'category'>>
  ): Layer {
    const layer = createLayer(name, discipline, category, options);
    this.addLayer(layer);
    return layer;
  }

  /**
   * Update a layer
   */
  updateLayer(layerId: string, updates: Partial<Omit<Layer, 'id'>>): Layer | undefined {
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index === -1) return undefined;

    const updated = { ...this.layers[index], ...updates };
    this.layers[index] = updated;
    return updated;
  }

  /**
   * Delete a layer
   */
  deleteLayer(layerId: string): boolean {
    const initialLength = this.layers.length;
    this.layers = this.layers.filter(l => l.id !== layerId);
    
    // If deleted layer was active, clear active layer
    if (this.activeLayerId === layerId) {
      this.activeLayerId = this.layers[0]?.id;
    }
    
    return this.layers.length < initialLength;
  }

  // ============================================================================
  // Active Layer
  // ============================================================================

  /**
   * Get the active layer
   */
  getActiveLayer(): Layer | undefined {
    return this.activeLayerId ? this.getLayer(this.activeLayerId) : undefined;
  }

  /**
   * Set the active layer
   */
  setActiveLayer(layerId: string): void {
    if (!this.getLayer(layerId)) {
      throw new Error(`Layer ${layerId} not found`);
    }
    this.activeLayerId = layerId;
  }

  // ============================================================================
  // Layer Visibility
  // ============================================================================

  /**
   * Set layer visibility
   */
  setLayerVisibility(layerId: string, visible: boolean): void {
    this.updateLayer(layerId, { visible });
  }

  /**
   * Toggle layer visibility
   */
  toggleLayerVisibility(layerId: string): boolean {
    const layer = this.getLayer(layerId);
    if (!layer) return false;
    
    this.updateLayer(layerId, { visible: !layer.visible });
    return !layer.visible;
  }

  /**
   * Show all layers
   */
  showAllLayers(): void {
    this.layers.forEach(layer => {
      layer.visible = true;
    });
  }

  /**
   * Hide all layers except specified
   */
  isolateLayer(layerId: string): void {
    this.layers.forEach(layer => {
      layer.visible = layer.id === layerId;
    });
  }

  /**
   * Get visible layers
   */
  getVisibleLayers(): Layer[] {
    return this.layers.filter(l => l.visible);
  }

  // ============================================================================
  // Layer Lock
  // ============================================================================

  /**
   * Set layer lock state
   */
  setLayerLocked(layerId: string, locked: boolean): void {
    this.updateLayer(layerId, { locked });
  }

  /**
   * Toggle layer lock
   */
  toggleLayerLocked(layerId: string): boolean {
    const layer = this.getLayer(layerId);
    if (!layer) return false;
    
    this.updateLayer(layerId, { locked: !layer.locked });
    return !layer.locked;
  }

  /**
   * Get unlocked layers
   */
  getUnlockedLayers(): Layer[] {
    return this.layers.filter(l => !l.locked);
  }

  // ============================================================================
  // Shape Layer Assignment
  // ============================================================================

  /**
   * Assign a shape to a layer
   */
  assignShapeToLayer<S extends Shape>(
    shape: S,
    layerId: string
  ): S & Partial<BIMObjectProperties> {
    const layer = this.getLayer(layerId);
    if (!layer) {
      throw new Error(`Layer ${layerId} not found`);
    }
    return { ...shape, layerId } as S & Partial<BIMObjectProperties>;
  }

  /**
   * Get the layer for a shape (or default layer based on shape type)
   */
  getShapeLayer(shape: Shape): Layer | undefined {
    const bimShape = shape as Shape & Partial<BIMObjectProperties>;
    
    if (bimShape.layerId) {
      return this.getLayer(bimShape.layerId);
    }
    
    // Return default layer based on shape type
    const defaultLayerId = getDefaultLayerForShapeType(
      shape.type,
      'category' in shape ? (shape.category as string) : undefined
    );
    return this.getLayer(defaultLayerId);
  }

  /**
   * Auto-assign shape to appropriate default layer
   */
  autoAssignLayer<S extends Shape>(shape: S): S & Partial<BIMObjectProperties> {
    const defaultLayerId = getDefaultLayerForShapeType(
      shape.type,
      'category' in shape ? (shape.category as string) : undefined
    );
    return this.assignShapeToLayer(shape, defaultLayerId);
  }

  /**
   * Filter shapes by layer
   */
  getShapesOnLayer(shapes: Shape[], layerId: string): Shape[] {
    return shapes.filter(shape => {
      const bimShape = shape as Shape & Partial<BIMObjectProperties>;
      if (bimShape.layerId === layerId) return true;
      
      // Also include shapes with default layer matching
      if (!bimShape.layerId) {
        const defaultLayerId = getDefaultLayerForShapeType(
          shape.type,
          'category' in shape ? (shape.category as string) : undefined
        );
        return defaultLayerId === layerId;
      }
      
      return false;
    });
  }

  /**
   * Get visible shapes (shapes on visible layers)
   */
  getVisibleShapes(shapes: Shape[]): Shape[] {
    const visibleLayerIds = new Set(this.getVisibleLayers().map(l => l.id));
    
    return shapes.filter(shape => {
      const bimShape = shape as Shape & Partial<BIMObjectProperties>;
      const layerId = bimShape.layerId ?? getDefaultLayerForShapeType(
        shape.type,
        'category' in shape ? (shape.category as string) : undefined
      );
      return visibleLayerIds.has(layerId);
    });
  }

  // ============================================================================
  // Layer Filtering by Properties
  // ============================================================================

  /**
   * Get layers by discipline
   */
  getLayersByDiscipline(discipline: Discipline): Layer[] {
    return this.layers.filter(l => l.discipline === discipline);
  }

  /**
   * Get layers by category
   */
  getLayersByCategory(category: LayerCategory): Layer[] {
    return this.layers.filter(l => l.category === category);
  }

  /**
   * Get printable layers
   */
  getPrintableLayers(): Layer[] {
    return this.layers.filter(l => l.printable && l.visible);
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Get current layer state
   */
  getState(): LayerState {
    return {
      layers: this.getLayers(),
      activeLayerId: this.activeLayerId,
    };
  }

  /**
   * Restore layer state
   */
  setState(state: LayerState): void {
    this.layers = [...state.layers];
    this.activeLayerId = state.activeLayerId;
  }

  /**
   * Reset to default layers
   */
  reset(): void {
    this.layers = [...DEFAULT_LAYERS];
    this.activeLayerId = 'a-wall';
  }

  // ============================================================================
  // Export Helpers
  // ============================================================================

  /**
   * Get layer configuration for DXF export
   */
  getDxfLayerConfig(): {
    name: string;
    color: number;
    lineType: string;
  }[] {
    return this.layers.map(layer => ({
      name: layer.aiaLayerName ?? layer.name,
      color: layer.aciColor ?? 7,
      lineType: layer.lineType === 'continuous' ? 'CONTINUOUS' : layer.lineType.toUpperCase(),
    }));
  }
}

// Export singleton instance with default layers
export const layerManager = new LayerManager();

