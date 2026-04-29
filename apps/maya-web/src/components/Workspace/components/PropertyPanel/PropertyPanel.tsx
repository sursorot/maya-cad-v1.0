/**
 * PropertyPanel Component
 * 
 * BIM Property editor for selected shapes.
 * Displays and edits IFC-compatible property sets (Pset_WallCommon, etc.)
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Shape } from '../../types';
import type { PropertySet, Property, PropertyValue } from '../../../../domain/workspace/core/types/bim/PropertySet';
import type { ClassificationReference } from '../../../../domain/workspace/core/types/bim/Classification';
import { X, ChevronDown, ChevronRight, Tag, FileText, Link2, Hash, Layers, Edit2 } from 'lucide-react';
import { ClassificationPicker } from '../ClassificationPicker';

interface PropertyPanelProps {
  visible: boolean;
  selectedShape: Shape | null;
  onPropertyChange: (shapeId: string, psetName: string, propertyName: string, value: PropertyValue) => void;
  onNameChange: (shapeId: string, name: string) => void;
  onTagChange: (shapeId: string, tag: string) => void;
  onDescriptionChange: (shapeId: string, description: string) => void;
  onClassificationChange: (shapeId: string, classification: ClassificationReference | null) => void;
  onClose: () => void;
}

// Helper to get BIM properties from shape
interface BIMShapeProperties {
  globalId?: string;
  name?: string;
  description?: string;
  tag?: string;
  classification?: ClassificationReference;
  propertySets?: PropertySet[];
  layerId?: string;
}

type SectionKey = 'identity' | 'classification' | 'properties' | 'geometry';

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  visible,
  selectedShape,
  onPropertyChange,
  onNameChange,
  onTagChange,
  onDescriptionChange,
  onClassificationChange,
  onClose,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [classificationPickerVisible, setClassificationPickerVisible] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    new Set(['identity', 'properties'])
  );
  const [expandedPsets, setExpandedPsets] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize position
  useEffect(() => {
    if (!visible || isInitialized) return;
    const viewportWidth = window.innerWidth;
    setPosition({
      x: viewportWidth - 320,
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

  const toggleSection = (key: SectionKey) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const togglePset = (psetName: string) => {
    setExpandedPsets(prev => {
      const next = new Set(prev);
      if (next.has(psetName)) next.delete(psetName);
      else next.add(psetName);
      return next;
    });
  };

  // Extract BIM properties from shape
  const bimProps = useMemo((): BIMShapeProperties => {
    if (!selectedShape) return {};
    return selectedShape as Shape & BIMShapeProperties;
  }, [selectedShape]);

  // Get property sets
  const propertySets = useMemo(() => {
    return bimProps.propertySets ?? [];
  }, [bimProps]);

  // Get geometry info based on shape type
  const geometryInfo = useMemo(() => {
    if (!selectedShape) return [];
    
    const info: { label: string; value: string }[] = [];
    
    switch (selectedShape.type) {
      case 'wall':
        info.push({ label: 'Type', value: 'Wall' });
        info.push({ label: 'Thickness', value: `${(selectedShape.thickness * 1000).toFixed(0)} mm` });
        if (selectedShape.height) {
          info.push({ label: 'Height', value: `${(selectedShape.height * 1000).toFixed(0)} mm` });
        }
        info.push({ label: 'Alignment', value: selectedShape.alignment });
        break;
      case 'opening':
        info.push({ label: 'Type', value: selectedShape.category === 'door' ? 'Door' : selectedShape.category === 'window' ? 'Window' : 'Opening' });
        info.push({ label: 'Width', value: `${(selectedShape.width * 1000).toFixed(0)} mm` });
        info.push({ label: 'Height', value: `${(selectedShape.height * 1000).toFixed(0)} mm` });
        info.push({ label: 'Sill Height', value: `${(selectedShape.sillHeight * 1000).toFixed(0)} mm` });
        break;
      case 'room':
        info.push({ label: 'Type', value: 'Room/Space' });
        info.push({ label: 'Area', value: `${selectedShape.area.toFixed(2)} m²` });
        info.push({ label: 'Perimeter', value: `${selectedShape.perimeter.toFixed(2)} m` });
        break;
      case 'zone':
        info.push({ label: 'Type', value: 'Zone' });
        info.push({ label: 'Area', value: `${selectedShape.area.toFixed(2)} m²` });
        break;
      default:
        info.push({ label: 'Type', value: selectedShape.type });
    }
    
    return info;
  }, [selectedShape]);

  if (!visible) return null;

  const renderSectionHeader = (
    key: SectionKey,
    label: string,
    icon: React.ReactNode
  ) => (
    <div
      onClick={() => toggleSection(key)}
      style={{
        padding: '8px 10px',
        background: '#f5f5f5',
        borderBottom: '1px solid #e5e5e5',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        fontWeight: 600,
      }}
    >
      {expandedSections.has(key) ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      {icon}
      <span>{label}</span>
    </div>
  );

  const renderPropertyInput = (
    psetName: string,
    prop: Property
  ) => {
    const { name, value } = prop;
    
    switch (value.type) {
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={value.value}
            onChange={(e) => {
              if (selectedShape) {
                onPropertyChange(selectedShape.id, psetName, name, {
                  type: 'boolean',
                  value: e.target.checked,
                });
              }
            }}
            style={{ marginLeft: 'auto' }}
          />
        );
      case 'number':
      case 'measure':
        return (
          <input
            type="number"
            value={value.value}
            onChange={(e) => {
              if (selectedShape) {
                onPropertyChange(selectedShape.id, psetName, name, {
                  ...value,
                  value: parseFloat(e.target.value) || 0,
                });
              }
            }}
            style={{
              width: 80,
              padding: '2px 4px',
              border: '1px solid #ccc',
              borderRadius: 2,
              fontSize: 10,
              fontFamily: 'inherit',
              textAlign: 'right',
            }}
          />
        );
      case 'string':
        return (
          <input
            type="text"
            value={value.value}
            onChange={(e) => {
              if (selectedShape) {
                onPropertyChange(selectedShape.id, psetName, name, {
                  type: 'string',
                  value: e.target.value,
                });
              }
            }}
            style={{
              flex: 1,
              maxWidth: 120,
              padding: '2px 4px',
              border: '1px solid #ccc',
              borderRadius: 2,
              fontSize: 10,
              fontFamily: 'inherit',
            }}
          />
        );
      case 'enum':
        return (
          <select
            value={value.value}
            onChange={(e) => {
              if (selectedShape) {
                onPropertyChange(selectedShape.id, psetName, name, {
                  type: 'enum',
                  value: e.target.value,
                  options: value.options,
                });
              }
            }}
            style={{
              flex: 1,
              maxWidth: 120,
              padding: '2px 4px',
              border: '1px solid #ccc',
              borderRadius: 2,
              fontSize: 10,
              fontFamily: 'inherit',
            }}
          >
            {value.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      default:
        return <span style={{ color: '#888' }}>{JSON.stringify(value.value)}</span>;
    }
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: 300,
        maxHeight: '80vh',
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
          <FileText size={12} />
          <span>PROPERTIES</span>
        </div>
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

      {/* Content */}
      <div className="panel-scroll-area" style={{ flex: 1 }}>
        {!selectedShape ? (
          <div style={{
            padding: 20,
            textAlign: 'center',
            color: '#888',
          }}>
            Select a shape to view properties
          </div>
        ) : (
          <>
            {/* Identity Section */}
            {renderSectionHeader('identity', 'Identity', <Hash size={10} />)}
            {expandedSections.has('identity') && (
              <div style={{ padding: '8px 10px' }}>
                {/* ID (readonly) */}
                <div style={styles.row}>
                  <span style={styles.label}>ID</span>
                  <span style={{ ...styles.value, color: '#888', fontFamily: 'monospace', fontSize: 8 }}>
                    {selectedShape.id}
                  </span>
                </div>
                
                {/* Global ID (readonly) */}
                {bimProps.globalId && (
                  <div style={styles.row}>
                    <span style={styles.label}>Global ID</span>
                    <span style={{ ...styles.value, color: '#888', fontFamily: 'monospace', fontSize: 8 }}>
                      {bimProps.globalId.substring(0, 18)}...
                    </span>
                  </div>
                )}

                {/* Name */}
                <div style={styles.row}>
                  <span style={styles.label}>Name</span>
                  <input
                    type="text"
                    value={bimProps.name || ''}
                    placeholder="Enter name..."
                    onChange={(e) => onNameChange(selectedShape.id, e.target.value)}
                    style={styles.input}
                  />
                </div>

                {/* Tag */}
                <div style={styles.row}>
                  <span style={styles.label}>Tag</span>
                  <input
                    type="text"
                    value={bimProps.tag || ''}
                    placeholder="e.g., D-101"
                    onChange={(e) => onTagChange(selectedShape.id, e.target.value)}
                    style={{ ...styles.input, width: 80 }}
                  />
                </div>

                {/* Description */}
                <div style={{ marginTop: 6 }}>
                  <span style={{ ...styles.label, display: 'block', marginBottom: 4 }}>Description</span>
                  <textarea
                    value={bimProps.description || ''}
                    placeholder="Enter description..."
                    onChange={(e) => onDescriptionChange(selectedShape.id, e.target.value)}
                    style={{
                      width: '100%',
                      height: 50,
                      padding: '4px 6px',
                      border: '1px solid #ccc',
                      borderRadius: 2,
                      fontSize: 10,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Classification Section */}
            {renderSectionHeader('classification', 'Classification', <Tag size={10} />)}
            {expandedSections.has('classification') && (
              <div style={{ padding: '8px 10px' }}>
                {bimProps.classification ? (
                  <>
                    <div style={styles.row}>
                      <span style={styles.label}>System</span>
                      <span style={{
                        background: bimProps.classification.system === 'OmniClass' ? '#4A90D9' : '#2ECC71',
                        color: '#fff',
                        padding: '1px 6px',
                        borderRadius: 3,
                        fontSize: 9,
                      }}>
                        {bimProps.classification.system}
                      </span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>Code</span>
                      <span style={{ ...styles.value, fontFamily: 'monospace' }}>
                        {bimProps.classification.code}
                      </span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>Title</span>
                      <span style={styles.value}>{bimProps.classification.title}</span>
                    </div>
                    <button
                      onClick={() => setClassificationPickerVisible(true)}
                      style={{
                        marginTop: 8,
                        width: '100%',
                        padding: '6px 10px',
                        background: '#f5f5f5',
                        border: '1px solid #ccc',
                        borderRadius: 3,
                        fontSize: 9,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <Edit2 size={10} />
                      Change Classification
                    </button>
                  </>
                ) : (
                  <div>
                    <div style={{ color: '#888', fontStyle: 'italic', marginBottom: 8 }}>
                      No classification assigned
                    </div>
                    <button
                      onClick={() => setClassificationPickerVisible(true)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#000',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 3,
                        fontSize: 10,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Tag size={12} />
                      Assign Classification
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Classification Picker Modal */}
            <ClassificationPicker
              visible={classificationPickerVisible}
              shapeType={selectedShape?.type}
              shapeCategory={'category' in selectedShape ? (selectedShape.category as string) : undefined}
              currentClassification={bimProps.classification}
              onSelect={(classification) => {
                if (selectedShape) {
                  onClassificationChange(selectedShape.id, classification);
                }
                setClassificationPickerVisible(false);
              }}
              onClear={() => {
                if (selectedShape) {
                  onClassificationChange(selectedShape.id, null);
                }
              }}
              onClose={() => setClassificationPickerVisible(false)}
            />

            {/* Geometry Section */}
            {renderSectionHeader('geometry', 'Geometry', <Layers size={10} />)}
            {expandedSections.has('geometry') && (
              <div style={{ padding: '8px 10px' }}>
                {geometryInfo.map(({ label, value }) => (
                  <div key={label} style={styles.row}>
                    <span style={styles.label}>{label}</span>
                    <span style={styles.value}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Property Sets Section */}
            {renderSectionHeader('properties', 'Property Sets', <Link2 size={10} />)}
            {expandedSections.has('properties') && (
              <div>
                {propertySets.length === 0 ? (
                  <div style={{ padding: '8px 10px', color: '#888', fontStyle: 'italic' }}>
                    No property sets defined
                  </div>
                ) : (
                  propertySets.map(pset => (
                    <div key={pset.id}>
                      {/* Pset Header */}
                      <div
                        onClick={() => togglePset(pset.name)}
                        style={{
                          padding: '6px 10px',
                          background: '#fafafa',
                          borderBottom: '1px solid #f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          cursor: 'pointer',
                          fontSize: 9,
                        }}
                      >
                        {expandedPsets.has(pset.name) ? (
                          <ChevronDown size={8} />
                        ) : (
                          <ChevronRight size={8} />
                        )}
                        <span style={{ fontWeight: 600 }}>{pset.name}</span>
                        <span style={{ color: '#888', marginLeft: 'auto' }}>
                          {pset.properties.length} props
                        </span>
                      </div>

                      {/* Pset Properties */}
                      {expandedPsets.has(pset.name) && (
                        <div style={{ padding: '6px 10px 6px 20px' }}>
                          {pset.properties.map(prop => (
                            <div key={prop.name} style={{
                              ...styles.row,
                              marginBottom: 4,
                            }}>
                              <span style={{ ...styles.label, fontSize: 9 }}>
                                {prop.name}
                              </span>
                              {renderPropertyInput(pset.name, prop)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {selectedShape && (
        <div style={{
          padding: '6px 10px',
          borderTop: '1px solid #e5e5e5',
          background: '#f9f9f9',
          fontSize: 9,
          color: '#666',
        }}>
          {selectedShape.type.toUpperCase()} | {propertySets.length} property sets
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  } as React.CSSProperties,
  label: {
    color: '#666',
    fontSize: 9,
  } as React.CSSProperties,
  value: {
    fontWeight: 500,
  } as React.CSSProperties,
  input: {
    flex: 1,
    maxWidth: 140,
    padding: '2px 6px',
    border: '1px solid #ccc',
    borderRadius: 2,
    fontSize: 10,
    fontFamily: 'inherit',
  } as React.CSSProperties,
};

export default PropertyPanel;

