/**
 * LayerPanel Component
 * 
 * Floating panel for managing layers (visibility, lock, active layer).
 * Follows AIA CAD Layer Guidelines for professional interoperability.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Layer, Discipline } from '../../../../domain/workspace/core/types/bim/Layer';
import { DISCIPLINE_NAMES } from '../../../../domain/workspace/core/types/bim/Layer';
import { Eye, EyeOff, Lock, Unlock, Plus, ChevronDown, ChevronRight, X, Layers } from 'lucide-react';

interface LayerPanelProps {
  visible: boolean;
  layers: Layer[];
  activeLayerId?: string;
  onLayerVisibilityChange: (layerId: string, visible: boolean) => void;
  onLayerLockChange: (layerId: string, locked: boolean) => void;
  onActiveLayerChange: (layerId: string) => void;
  onLayerCreate?: (name: string, discipline: Discipline) => void;
  onClose: () => void;
}

// Group layers by discipline
interface LayerGroup {
  discipline: Discipline;
  name: string;
  layers: Layer[];
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  visible,
  layers,
  activeLayerId,
  onLayerVisibilityChange,
  onLayerLockChange,
  onActiveLayerChange,
  onLayerCreate,
  onClose,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<Discipline>>(new Set(['A', 'G']));
  const [showNewLayerForm, setShowNewLayerForm] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerDiscipline, setNewLayerDiscipline] = useState<Discipline>('A');
  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize position
  useEffect(() => {
    if (!visible || isInitialized) return;
    const viewportWidth = window.innerWidth;
    setPosition({
      x: viewportWidth - 280,
      y: 60,
    });
    setIsInitialized(true);
  }, [visible, isInitialized]);

  // Reset when hidden
  useEffect(() => {
    if (!visible) {
      setIsInitialized(false);
    }
  }, [visible]);

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!panelRef.current) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - panelRef.current.offsetLeft,
      y: e.clientY - panelRef.current.offsetTop,
    });
  };

  const toggleGroup = (discipline: Discipline) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(discipline)) next.delete(discipline);
      else next.add(discipline);
      return next;
    });
  };

  const handleCreateLayer = () => {
    if (onLayerCreate && newLayerName.trim()) {
      onLayerCreate(newLayerName.trim(), newLayerDiscipline);
      setNewLayerName('');
      setShowNewLayerForm(false);
    }
  };

  // Group layers by discipline
  const groupedLayers: LayerGroup[] = [];
  const disciplineOrder: Discipline[] = ['A', 'S', 'M', 'E', 'P', 'F', 'C', 'L', 'I', 'G'];
  
  for (const discipline of disciplineOrder) {
    const disciplineLayers = layers.filter(l => l.discipline === discipline);
    if (disciplineLayers.length > 0) {
      groupedLayers.push({
        discipline,
        name: DISCIPLINE_NAMES[discipline],
        layers: disciplineLayers,
      });
    }
  }

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: 260,
        maxHeight: '70vh',
        background: '#ffffff',
        border: '1px solid #000000',
        borderRadius: 4,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '10px',
        color: '#000000',
        zIndex: 1100,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: '8px 10px',
          background: '#000000',
          color: '#ffffff',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          borderRadius: '3px 3px 0 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={12} />
          <span>LAYERS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {onLayerCreate && (
            <button
              onClick={() => setShowNewLayerForm(!showNewLayerForm)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
              }}
              title="Add new layer"
            >
              <Plus size={12} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* New Layer Form */}
      {showNewLayerForm && (
        <div style={{
          padding: '8px 10px',
          borderBottom: '1px solid #e5e5e5',
          background: '#f9f9f9',
        }}>
          <div style={{ marginBottom: 6 }}>
            <input
              type="text"
              placeholder="Layer name (e.g., A-WALL-NEW)"
              value={newLayerName}
              onChange={(e) => setNewLayerName(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #000',
                borderRadius: 2,
                fontSize: 10,
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              value={newLayerDiscipline}
              onChange={(e) => setNewLayerDiscipline(e.target.value as Discipline)}
              style={{
                flex: 1,
                padding: '4px 6px',
                border: '1px solid #000',
                borderRadius: 2,
                fontSize: 10,
                fontFamily: 'inherit',
              }}
            >
              {disciplineOrder.map(d => (
                <option key={d} value={d}>{d} - {DISCIPLINE_NAMES[d]}</option>
              ))}
            </select>
            <button
              onClick={handleCreateLayer}
              disabled={!newLayerName.trim()}
              style={{
                padding: '4px 8px',
                background: newLayerName.trim() ? '#000' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: 2,
                fontSize: 10,
                cursor: newLayerName.trim() ? 'pointer' : 'default',
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Layer List */}
      <div className="panel-scroll-area" style={{
        flex: 1,
      }}>
        {groupedLayers.map(group => (
          <div key={group.discipline}>
            {/* Group Header */}
            <div
              onClick={() => toggleGroup(group.discipline)}
              style={{
                padding: '6px 10px',
                background: '#f5f5f5',
                borderBottom: '1px solid #e5e5e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {expandedGroups.has(group.discipline) ? (
                  <ChevronDown size={10} />
                ) : (
                  <ChevronRight size={10} />
                )}
                <span>{group.discipline} - {group.name}</span>
              </div>
              <span style={{ color: '#888', fontWeight: 400 }}>
                {group.layers.length}
              </span>
            </div>

            {/* Layers in Group */}
            {expandedGroups.has(group.discipline) && group.layers.map(layer => (
              <LayerRow
                key={layer.id}
                layer={layer}
                isActive={layer.id === activeLayerId}
                onVisibilityChange={() => onLayerVisibilityChange(layer.id, !layer.visible)}
                onLockChange={() => onLayerLockChange(layer.id, !layer.locked)}
                onSelect={() => onActiveLayerChange(layer.id)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div style={{
        padding: '6px 10px',
        borderTop: '1px solid #e5e5e5',
        background: '#f9f9f9',
        fontSize: 9,
        color: '#666',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>{layers.length} layers</span>
        <span>
          {layers.filter(l => l.visible).length} visible, {layers.filter(l => l.locked).length} locked
        </span>
      </div>
    </div>
  );
};

// Individual Layer Row Component
interface LayerRowProps {
  layer: Layer;
  isActive: boolean;
  onVisibilityChange: () => void;
  onLockChange: () => void;
  onSelect: () => void;
}

const LayerRow: React.FC<LayerRowProps> = ({
  layer,
  isActive,
  onVisibilityChange,
  onLockChange,
  onSelect,
}) => {
  return (
    <div
      style={{
        padding: '5px 10px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: isActive ? '#e8f4ff' : 'transparent',
        cursor: 'pointer',
      }}
      onClick={onSelect}
    >
      {/* Visibility Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onVisibilityChange();
        }}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          color: layer.visible ? '#000' : '#ccc',
        }}
        title={layer.visible ? 'Hide layer' : 'Show layer'}
      >
        {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
      </button>

      {/* Lock Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onLockChange();
        }}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          color: layer.locked ? '#ff6b6b' : '#ccc',
        }}
        title={layer.locked ? 'Unlock layer' : 'Lock layer'}
      >
        {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
      </button>

      {/* Color Swatch */}
      <div
        style={{
          width: 12,
          height: 12,
          background: layer.color,
          border: '1px solid #000',
          borderRadius: 2,
          flexShrink: 0,
        }}
        title={`Color: ${layer.color}`}
      />

      {/* Layer Name */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            fontWeight: isActive ? 600 : 400,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: layer.visible ? '#000' : '#888',
          }}
        >
          {layer.name}
        </div>
        {layer.description && (
          <div
            style={{
              fontSize: 8,
              color: '#888',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {layer.description}
          </div>
        )}
      </div>

      {/* Print Indicator */}
      {!layer.printable && (
        <span
          style={{
            fontSize: 8,
            color: '#888',
            background: '#f0f0f0',
            padding: '1px 4px',
            borderRadius: 2,
          }}
          title="Non-printing layer"
        >
          NP
        </span>
      )}

      {/* Active Indicator */}
      {isActive && (
        <div
          style={{
            width: 6,
            height: 6,
            background: '#0066ff',
            borderRadius: '50%',
          }}
          title="Active layer"
        />
      )}
    </div>
  );
};

export default LayerPanel;

