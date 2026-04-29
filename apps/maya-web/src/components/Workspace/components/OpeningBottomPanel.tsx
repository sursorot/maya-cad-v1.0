import React, { useState, useEffect, useRef } from 'react';
import type { LengthUnit, OpeningCategory } from '../types';
import type { OpeningPreset } from './OpeningPresets';
import { OPENING_PRESETS } from './OpeningPresets';
import { metersToUnitValue, unitValueToMeters } from '../utils/measurements';

interface OpeningBottomPanelProps {
  visible: boolean;
  width: number;
  height: number;
  lengthUnit: LengthUnit;
  selectedPresetId: string | null;
  selectedCategory?: OpeningCategory | null;
  onPresetSelect: (preset: OpeningPreset | null) => void;
  onCategoryChange?: (category: OpeningCategory) => void;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onClose?: () => void;
}

const clampPositive = (value: number, min = 0.25) => Math.max(min, value);

export const OpeningBottomPanel: React.FC<OpeningBottomPanelProps> = ({
  visible,
  width,
  height,
  lengthUnit,
  selectedPresetId,
  selectedCategory,
  onPresetSelect,
  onCategoryChange,
  onWidthChange,
  onHeightChange,
  onClose,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize position on right side, below StylePanelWrapper
  useEffect(() => {
    if (!visible || isInitialized) return;
    const viewportWidth = window.innerWidth;
    setPosition({
      x: viewportWidth - 240, // Match StylePanelWrapper x position
      y: 340, // Position below StylePanelWrapper (60 + ~280px panel height)
    });
    setIsInitialized(true);
  }, [visible, isInitialized]);

  // Reset initialization when panel is hidden
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

  if (!visible) return null;

  const formatUnit = (unit: string) => {
    if (unit === 'ft-in') return 'FT';
    if (unit === 'meters' || unit === 'm') return 'M';
    return unit.toUpperCase();
  };

  const displayWidth = metersToUnitValue(width, lengthUnit);
  const displayHeight = metersToUnitValue(height, lengthUnit);

  const filteredPresets = OPENING_PRESETS.filter(
    (preset) => preset.category === selectedCategory
  );

  // Category Icons
  const WindowIcon = ({ active }: { active: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#666'} strokeWidth="2.5">
      <rect x="3" y="3" width="18" height="18" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );

  const DoorIcon = ({ active }: { active: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#666'} strokeWidth="2.5">
      <rect x="4" y="2" width="16" height="20" />
      <circle cx="16" cy="12" r="1.5" fill={active ? '#fff' : '#666'} stroke="none" />
    </svg>
  );

  const renderInput = (
    label: string,
    value: number,
    onChange: (next: number) => void,
    min: number,
    step: number
  ) => (
    <div style={styles.inputRow}>
      <span style={styles.inputLabel}>{label}</span>
      <div style={styles.inputWrapper}>
        <input
          type="number"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value.toFixed(2) : ''}
          onChange={(e) => {
            const nextValue = Number(e.target.value);
            if (!Number.isFinite(nextValue)) return;
            onChange(clampPositive(nextValue, min));
          }}
          style={styles.input}
        />
        <span style={styles.unit}>{formatUnit(lengthUnit)}</span>
      </div>
    </div>
  );

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: 220,
        background: '#ffffff',
        border: '1px solid #000000',
        borderRadius: 4,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '10px',
        color: '#000000',
        zIndex: 1100,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Header - Clean Theme (matching StylePanelWrapper) */}
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
        <span style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6, 
          fontSize: '10px', 
          textTransform: 'uppercase', 
          letterSpacing: '0.1em',
        }}>
          <span style={{ opacity: 0.5, letterSpacing: '-2px' }}>⋮⋮</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="1" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
          OPENING
        </span>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '2px 4px',
              fontSize: '12px',
              opacity: 0.7,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Content - Vertical layout (matching StylePanelWrapper) */}
      <div style={styles.content}>
        {/* Type Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>Type</div>
          <div style={styles.btnGroup}>
            {(['window', 'door'] as const).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryChange?.(category)}
                title={category.charAt(0).toUpperCase() + category.slice(1)}
                style={{
                  ...styles.iconBtn,
                  ...(selectedCategory === category ? styles.iconBtnActive : {}),
                }}
              >
                {category === 'window' ? (
                  <WindowIcon active={selectedCategory === category} />
                ) : (
                  <DoorIcon active={selectedCategory === category} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Presets Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>Presets</div>
          <div style={styles.presetGrid}>
            {filteredPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onPresetSelect(preset)}
                style={{
                  ...styles.presetBtn,
                  ...(preset.id === selectedPresetId ? styles.presetBtnActive : {}),
                }}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onPresetSelect(null)}
              style={{
                ...styles.presetBtn,
                ...(selectedPresetId === null ? styles.presetBtnActive : {}),
              }}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Dimensions Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>Dimensions</div>
          <div style={styles.inputGroup}>
            {renderInput(
              'Width',
              displayWidth,
              (next) => onWidthChange(unitValueToMeters(next, lengthUnit)),
              0.5,
              0.25
            )}
            {renderInput(
              'Height',
              displayHeight,
              (next) => onHeightChange(unitValueToMeters(next, lengthUnit)),
              1,
              0.25
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Clean Theme Styles - Vertical layout (matching StylePanelWrapper)
const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  sectionHeader: {
    fontSize: '9px',
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e0e0e0',
    paddingBottom: 4,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: '10px',
    color: '#333',
    fontWeight: 500,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: 3,
    border: '1px solid #e0e0e0',
    backgroundColor: '#fff',
    gap: 4,
  },
  input: {
    width: 50,
    border: 'none',
    outline: 'none',
    fontSize: '10px',
    background: 'transparent',
    textAlign: 'right',
    padding: 0,
    color: '#000',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  unit: {
    fontSize: '9px',
    color: '#666',
    fontWeight: 500,
  },
  btnGroup: {
    display: 'flex',
    gap: 4,
  },
  iconBtn: {
    padding: 0,
    width: 28,
    height: 28,
    borderRadius: 3,
    border: '1px solid #e0e0e0',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.1s ease',
  },
  iconBtnActive: {
    border: '1px solid #000',
    backgroundColor: '#000',
  },
  presetGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  presetBtn: {
    padding: '5px 10px',
    borderRadius: 3,
    border: '1px solid #e0e0e0',
    backgroundColor: 'transparent',
    fontSize: '9px',
    fontWeight: 500,
    color: '#666',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  presetBtnActive: {
    border: '1px solid #000',
    backgroundColor: '#000',
    color: '#fff',
  },
};

export default OpeningBottomPanel;
