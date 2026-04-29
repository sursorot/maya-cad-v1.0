/**
 * useLayerPanel Hook
 * 
 * Manages layer state for the LayerPanel component.
 * Provides CRUD operations and integrates with the LayerManager.
 */

import { useState, useCallback, useMemo } from 'react';
import type { Layer, Discipline, LayerCategory } from '../../../../domain/workspace/core/types/bim/Layer';
import { DEFAULT_LAYERS, createLayer } from '../../../../domain/workspace/core/types/bim/Layer';

export interface UseLayerPanelOptions {
  initialLayers?: Layer[];
  onLayersChange?: (layers: Layer[]) => void;
}

export interface UseLayerPanelReturn {
  layers: Layer[];
  activeLayerId: string | undefined;
  visibleLayerIds: Set<string>;
  
  // Visibility
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  toggleLayerVisibility: (layerId: string) => void;
  showAllLayers: () => void;
  hideAllLayers: () => void;
  isolateLayer: (layerId: string) => void;
  
  // Lock
  setLayerLocked: (layerId: string, locked: boolean) => void;
  toggleLayerLocked: (layerId: string) => void;
  
  // Active Layer
  setActiveLayer: (layerId: string) => void;
  
  // CRUD
  addLayer: (name: string, discipline: Discipline, category?: LayerCategory) => Layer;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  
  // Utilities
  getLayerById: (layerId: string) => Layer | undefined;
  getLayerByName: (name: string) => Layer | undefined;
  isLayerVisible: (layerId: string) => boolean;
  isLayerLocked: (layerId: string) => boolean;
  
  // Reset
  resetToDefaults: () => void;
}

export function useLayerPanel(options: UseLayerPanelOptions = {}): UseLayerPanelReturn {
  const { initialLayers, onLayersChange } = options;
  
  const [layers, setLayers] = useState<Layer[]>(initialLayers ?? [...DEFAULT_LAYERS]);
  const [activeLayerId, setActiveLayerId] = useState<string | undefined>('a-wall');

  // Derived state: set of visible layer IDs for quick lookup
  const visibleLayerIds = useMemo(
    () => new Set(layers.filter(l => l.visible).map(l => l.id)),
    [layers]
  );

  // Update layers and notify parent
  const updateLayers = useCallback((newLayers: Layer[]) => {
    setLayers(newLayers);
    onLayersChange?.(newLayers);
  }, [onLayersChange]);

  // Visibility operations
  const setLayerVisibility = useCallback((layerId: string, visible: boolean) => {
    updateLayers(layers.map(l => 
      l.id === layerId ? { ...l, visible } : l
    ));
  }, [layers, updateLayers]);

  const toggleLayerVisibility = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      setLayerVisibility(layerId, !layer.visible);
    }
  }, [layers, setLayerVisibility]);

  const showAllLayers = useCallback(() => {
    updateLayers(layers.map(l => ({ ...l, visible: true })));
  }, [layers, updateLayers]);

  const hideAllLayers = useCallback(() => {
    updateLayers(layers.map(l => ({ ...l, visible: false })));
  }, [layers, updateLayers]);

  const isolateLayer = useCallback((layerId: string) => {
    updateLayers(layers.map(l => ({ ...l, visible: l.id === layerId })));
  }, [layers, updateLayers]);

  // Lock operations
  const setLayerLocked = useCallback((layerId: string, locked: boolean) => {
    updateLayers(layers.map(l => 
      l.id === layerId ? { ...l, locked } : l
    ));
  }, [layers, updateLayers]);

  const toggleLayerLocked = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      setLayerLocked(layerId, !layer.locked);
    }
  }, [layers, setLayerLocked]);

  // Active layer
  const setActiveLayer = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      setActiveLayerId(layerId);
    }
  }, [layers]);

  // CRUD operations
  const addLayer = useCallback((
    name: string,
    discipline: Discipline,
    category: LayerCategory = 'major'
  ): Layer => {
    const newLayer = createLayer(name, discipline, category);
    updateLayers([...layers, newLayer]);
    return newLayer;
  }, [layers, updateLayers]);

  const removeLayer = useCallback((layerId: string) => {
    // Don't allow removing if it's the active layer
    if (layerId === activeLayerId) {
      const otherLayers = layers.filter(l => l.id !== layerId);
      if (otherLayers.length > 0) {
        setActiveLayerId(otherLayers[0].id);
      }
    }
    updateLayers(layers.filter(l => l.id !== layerId));
  }, [layers, activeLayerId, updateLayers]);

  const updateLayer = useCallback((layerId: string, updates: Partial<Layer>) => {
    updateLayers(layers.map(l => 
      l.id === layerId ? { ...l, ...updates } : l
    ));
  }, [layers, updateLayers]);

  // Utilities
  const getLayerById = useCallback((layerId: string): Layer | undefined => {
    return layers.find(l => l.id === layerId);
  }, [layers]);

  const getLayerByName = useCallback((name: string): Layer | undefined => {
    return layers.find(l => l.name === name || l.aiaLayerName === name);
  }, [layers]);

  const isLayerVisible = useCallback((layerId: string): boolean => {
    return visibleLayerIds.has(layerId);
  }, [visibleLayerIds]);

  const isLayerLocked = useCallback((layerId: string): boolean => {
    const layer = layers.find(l => l.id === layerId);
    return layer?.locked ?? false;
  }, [layers]);

  // Reset
  const resetToDefaults = useCallback(() => {
    updateLayers([...DEFAULT_LAYERS]);
    setActiveLayerId('a-wall');
  }, [updateLayers]);

  return {
    layers,
    activeLayerId,
    visibleLayerIds,
    setLayerVisibility,
    toggleLayerVisibility,
    showAllLayers,
    hideAllLayers,
    isolateLayer,
    setLayerLocked,
    toggleLayerLocked,
    setActiveLayer,
    addLayer,
    removeLayer,
    updateLayer,
    getLayerById,
    getLayerByName,
    isLayerVisible,
    isLayerLocked,
    resetToDefaults,
  };
}

