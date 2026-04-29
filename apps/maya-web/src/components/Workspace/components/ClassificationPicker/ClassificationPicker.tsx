/**
 * ClassificationPicker Component
 * 
 * UI for searching and selecting industry classification codes.
 * Supports OmniClass and Uniclass 2015 systems.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ClassificationReference, ClassificationSystemType } from '../../../../domain/workspace/core/types/bim/Classification';
import {
  searchOmniClass,
  searchUniclass,
  DEFAULT_CLASSIFICATIONS,
  OMNICLASS_TABLE_21,
  UNICLASS_2015,
} from '../../../../domain/workspace/core/types/bim/Classification';
import { X, Search, Tag, Check, Sparkles } from 'lucide-react';

interface ClassificationPickerProps {
  visible: boolean;
  shapeType?: string;
  shapeCategory?: string;
  currentClassification?: ClassificationReference;
  onSelect: (classification: ClassificationReference) => void;
  onClear: () => void;
  onClose: () => void;
}

type TabType = 'search' | 'omniclass' | 'uniclass' | 'suggested';

export const ClassificationPicker: React.FC<ClassificationPickerProps> = ({
  visible,
  shapeType,
  shapeCategory,
  currentClassification,
  onSelect,
  onClear,
  onClose,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('suggested');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSystem, setSearchSystem] = useState<ClassificationSystemType | 'all'>('all');
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize position
  useEffect(() => {
    if (!visible || isInitialized) return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    setPosition({
      x: (viewportWidth - 360) / 2,
      y: (viewportHeight - 500) / 2,
    });
    setIsInitialized(true);
  }, [visible, isInitialized]);

  // Reset when hidden
  useEffect(() => {
    if (!visible) {
      setIsInitialized(false);
      setSearchQuery('');
    }
  }, [visible]);

  // Focus search input when switching to search tab
  useEffect(() => {
    if (activeTab === 'search' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeTab]);

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

  // Get suggested classifications based on shape type
  const suggestedClassifications = useMemo((): ClassificationReference[] => {
    const suggestions: ClassificationReference[] = [];
    
    if (shapeType === 'wall') {
      suggestions.push(DEFAULT_CLASSIFICATIONS.wall.internal);
      suggestions.push(DEFAULT_CLASSIFICATIONS.wall.external);
    } else if (shapeType === 'opening') {
      if (shapeCategory === 'door') {
        suggestions.push(DEFAULT_CLASSIFICATIONS.door.internal);
        suggestions.push(DEFAULT_CLASSIFICATIONS.door.external);
      } else if (shapeCategory === 'window') {
        suggestions.push(DEFAULT_CLASSIFICATIONS.window.external);
      }
    } else if (shapeType === 'room') {
      suggestions.push(DEFAULT_CLASSIFICATIONS.room.office);
      suggestions.push(DEFAULT_CLASSIFICATIONS.room.circulation);
      suggestions.push(DEFAULT_CLASSIFICATIONS.room.storage);
      suggestions.push(DEFAULT_CLASSIFICATIONS.room.sanitary);
    }
    
    return suggestions;
  }, [shapeType, shapeCategory]);

  // Search results
  const searchResults = useMemo((): ClassificationReference[] => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    const results: ClassificationReference[] = [];
    
    if (searchSystem === 'all' || searchSystem === 'OmniClass') {
      results.push(...searchOmniClass(searchQuery));
    }
    if (searchSystem === 'all' || searchSystem === 'Uniclass2015') {
      results.push(...searchUniclass(searchQuery));
    }
    
    return results.slice(0, 20); // Limit results
  }, [searchQuery, searchSystem]);

  // Get all classifications for browsing
  const omniClassItems = useMemo((): ClassificationReference[] => {
    return Object.entries(OMNICLASS_TABLE_21).map(([code, data]) => ({
      system: 'OmniClass' as ClassificationSystemType,
      code,
      title: data.title,
      edition: '2012',
    }));
  }, []);

  const uniclassItems = useMemo((): ClassificationReference[] => {
    return Object.entries(UNICLASS_2015).map(([code, data]) => ({
      system: 'Uniclass2015' as ClassificationSystemType,
      code,
      title: data.title,
      edition: '2015 v1.31',
    }));
  }, []);

  if (!visible) return null;

  const renderClassificationItem = (
    classification: ClassificationReference,
    isSelected: boolean = false
  ) => (
    <div
      key={`${classification.system}-${classification.code}`}
      onClick={() => onSelect(classification)}
      style={{
        padding: '8px 12px',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
        background: isSelected ? '#e8f4ff' : 'transparent',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = '#f9f9f9';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div style={{
        background: classification.system === 'OmniClass' ? '#4A90D9' : '#2ECC71',
        color: '#fff',
        padding: '2px 6px',
        borderRadius: 3,
        fontSize: 8,
        fontWeight: 600,
        flexShrink: 0,
        marginTop: 2,
      }}>
        {classification.system === 'OmniClass' ? 'OC' : 'UC'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'monospace',
          fontSize: 10,
          fontWeight: 600,
          color: '#333',
        }}>
          {classification.code}
        </div>
        <div style={{
          fontSize: 10,
          color: '#666',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {classification.title}
        </div>
      </div>
      {isSelected && (
        <Check size={14} style={{ color: '#4A90D9', flexShrink: 0 }} />
      )}
    </div>
  );

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: 340,
        maxHeight: '80vh',
        background: '#ffffff',
        border: '1px solid #000000',
        borderRadius: 4,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '10px',
        color: '#000000',
        zIndex: 1200,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: '10px 12px',
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
          <Tag size={12} />
          <span>CLASSIFICATION</span>
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

      {/* Current Classification */}
      {currentClassification && (
        <div style={{
          padding: '8px 12px',
          background: '#f0f8ff',
          borderBottom: '1px solid #e5e5e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>CURRENT</div>
            <div style={{ fontWeight: 600 }}>
              <span style={{
                background: currentClassification.system === 'OmniClass' ? '#4A90D9' : '#2ECC71',
                color: '#fff',
                padding: '1px 4px',
                borderRadius: 2,
                fontSize: 8,
                marginRight: 4,
              }}>
                {currentClassification.system === 'OmniClass' ? 'OC' : 'UC'}
              </span>
              {currentClassification.code}
            </div>
            <div style={{ fontSize: 9, color: '#666' }}>{currentClassification.title}</div>
          </div>
          <button
            onClick={onClear}
            style={{
              padding: '4px 8px',
              background: '#ff6b6b',
              color: '#fff',
              border: 'none',
              borderRadius: 3,
              fontSize: 9,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e5e5e5',
      }}>
        {[
          { id: 'suggested', label: 'Suggested', icon: <Sparkles size={10} /> },
          { id: 'search', label: 'Search', icon: <Search size={10} /> },
          { id: 'omniclass', label: 'OmniClass', icon: null },
          { id: 'uniclass', label: 'Uniclass', icon: null },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            style={{
              flex: 1,
              padding: '8px 4px',
              background: activeTab === tab.id ? '#f5f5f5' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #000' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 9,
              fontWeight: activeTab === tab.id ? 600 : 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="panel-scroll-area" style={{ flex: 1, maxHeight: 400 }}>
        {/* Search Tab */}
        {activeTab === 'search' && (
          <div>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e5e5' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search classifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    border: '1px solid #ccc',
                    borderRadius: 3,
                    fontSize: 10,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['all', 'OmniClass', 'Uniclass2015'] as const).map(sys => (
                  <button
                    key={sys}
                    onClick={() => setSearchSystem(sys)}
                    style={{
                      padding: '3px 8px',
                      background: searchSystem === sys ? '#000' : '#f0f0f0',
                      color: searchSystem === sys ? '#fff' : '#333',
                      border: 'none',
                      borderRadius: 3,
                      fontSize: 9,
                      cursor: 'pointer',
                    }}
                  >
                    {sys === 'all' ? 'All' : sys === 'OmniClass' ? 'OmniClass' : 'Uniclass'}
                  </button>
                ))}
              </div>
            </div>
            {searchResults.length > 0 ? (
              searchResults.map(c => renderClassificationItem(
                c,
                currentClassification?.code === c.code && currentClassification?.system === c.system
              ))
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
                {searchQuery.length < 2 
                  ? 'Type at least 2 characters to search'
                  : 'No classifications found'}
              </div>
            )}
          </div>
        )}

        {/* Suggested Tab */}
        {activeTab === 'suggested' && (
          <div>
            {suggestedClassifications.length > 0 ? (
              <>
                <div style={{
                  padding: '8px 12px',
                  background: '#fffef0',
                  borderBottom: '1px solid #e5e5e5',
                  fontSize: 9,
                  color: '#666',
                }}>
                  <Sparkles size={10} style={{ display: 'inline', marginRight: 4 }} />
                  Suggested for <strong>{shapeType}</strong>
                  {shapeCategory && <span> ({shapeCategory})</span>}
                </div>
                {suggestedClassifications.map(c => renderClassificationItem(
                  c,
                  currentClassification?.code === c.code && currentClassification?.system === c.system
                ))}
              </>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
                No suggestions available for this shape type.
                <br />
                <span style={{ fontSize: 9 }}>Try searching or browsing classifications.</span>
              </div>
            )}
          </div>
        )}

        {/* OmniClass Tab */}
        {activeTab === 'omniclass' && (
          <div>
            <div style={{
              padding: '8px 12px',
              background: '#f0f8ff',
              borderBottom: '1px solid #e5e5e5',
              fontSize: 9,
            }}>
              <strong>OmniClass Table 21</strong> - Elements
              <br />
              <span style={{ color: '#666' }}>{omniClassItems.length} classifications</span>
            </div>
            {omniClassItems.map(c => renderClassificationItem(
              c,
              currentClassification?.code === c.code && currentClassification?.system === c.system
            ))}
          </div>
        )}

        {/* Uniclass Tab */}
        {activeTab === 'uniclass' && (
          <div>
            <div style={{
              padding: '8px 12px',
              background: '#f0fff0',
              borderBottom: '1px solid #e5e5e5',
              fontSize: 9,
            }}>
              <strong>Uniclass 2015</strong> - Systems, Products, Spaces
              <br />
              <span style={{ color: '#666' }}>{uniclassItems.length} classifications</span>
            </div>
            {uniclassItems.map(c => renderClassificationItem(
              c,
              currentClassification?.code === c.code && currentClassification?.system === c.system
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid #e5e5e5',
        background: '#f9f9f9',
        fontSize: 9,
        color: '#666',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>Click to assign classification</span>
        <span>
          {activeTab === 'search' && searchResults.length > 0 && `${searchResults.length} results`}
          {activeTab === 'suggested' && `${suggestedClassifications.length} suggestions`}
          {activeTab === 'omniclass' && `${omniClassItems.length} items`}
          {activeTab === 'uniclass' && `${uniclassItems.length} items`}
        </span>
      </div>
    </div>
  );
};

export default ClassificationPicker;

