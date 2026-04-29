import { useState, useRef, useEffect } from 'react';
import type { FC } from 'react';
import type { LengthUnit } from '../types';
import type { OpeningPreset } from './OpeningPresets';
import { OPENING_PRESETS } from './OpeningPresets';
import { metersToUnitValue, unitValueToMeters } from '../utils/measurements';

import type { OpeningCategory } from '../types';

interface OpeningToolPanelProps {
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
}

const clampPositive = (value: number, min = 0.25) => Math.max(min, value);

export const OpeningToolPanel: FC<OpeningToolPanelProps> = ({
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
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize position on first render
  useEffect(() => {
    if (!visible || isInitialized) return;
    
    // Position on right side, vertically centered
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelWidth = 180;
    const panelHeight = 300;
    
    setPosition({
      x: viewportWidth - panelWidth - 20,
      y: (viewportHeight - panelHeight) / 2,
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

    const handleMouseUp = () => {
      setIsDragging(false);
    };

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

  const displayWidth = metersToUnitValue(width, lengthUnit as LengthUnit);
  const displayHeight = metersToUnitValue(height, lengthUnit as LengthUnit);

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
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            if (!Number.isFinite(nextValue)) return;
            onChange(clampPositive(nextValue, min));
          }}
          style={styles.input}
        />
        <span style={styles.unit}>{lengthUnit}</span>
      </div>
    </div>
  );

  const filteredPresets = OPENING_PRESETS.filter(
    (preset) => preset.category === selectedCategory
  );

  // Icons for categories
  const WindowIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="3" y="3" width="18" height="18" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );

  const DoorIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="4" y="2" width="16" height="20" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );

  return (
    <div
      ref={panelRef}
      style={{
        ...styles.panel,
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Drag Handle / Header */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          ...styles.header,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <span style={styles.dragIndicator}>⋮⋮</span>
        OPENING
      </div>

      {/* Category Selector */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Type</div>
        <div style={styles.buttonGroup}>
          {(['window', 'door'] as const).map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange?.(category)}
              style={{
                ...styles.categoryButton,
                ...(selectedCategory === category ? styles.categoryButtonActive : {}),
              }}
            >
              {category === 'window' ? <WindowIcon /> : <DoorIcon />}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.separator} />

      {/* Presets Section */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Presets</div>
        <div style={styles.presetGroup}>
          {filteredPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPresetSelect(preset)}
              style={{
                ...styles.presetButton,
                ...(preset.id === selectedPresetId ? styles.presetButtonActive : {}),
              }}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPresetSelect(null)}
            style={{
              ...styles.presetButton,
              ...(selectedPresetId === null ? styles.presetButtonActive : {}),
            }}
          >
            Custom
          </button>
        </div>
      </div>

      <div style={styles.separator} />

      {/* Dimensions Section */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Dimensions</div>
        <div style={styles.inputGroup}>
          {renderInput(
            'W',
            displayWidth,
            (next) => onWidthChange(unitValueToMeters(next, lengthUnit as LengthUnit)),
            0.5,
            0.25
          )}
          {renderInput(
            'H',
            displayHeight,
            (next) => onHeightChange(unitValueToMeters(next, lengthUnit as LengthUnit)),
            1,
            0.25
          )}
        </div>
      </div>
    </div>
  );
};

// Clean Theme Styles - More spacious
const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    padding: '0',
    borderRadius: '4px',
    border: '1px solid #000000',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1100,
    fontFamily: "'IBM Plex Mono', monospace",
    width: '170px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  header: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    padding: '8px 12px',
    backgroundColor: '#000000',
    borderRadius: '3px 3px 0 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    userSelect: 'none',
  },
  dragIndicator: {
    opacity: 0.5,
    fontSize: '12px',
    letterSpacing: '-2px',
  },
  section: {
    padding: '10px 12px',
  },
  sectionLabel: {
    fontSize: '9px',
    fontWeight: 600,
    color: '#6c6c6c',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '8px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  inputLabel: {
    fontSize: '10px',
    color: '#6c6c6c',
    fontWeight: 500,
    minWidth: '18px',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '3px',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    gap: '4px',
    height: '26px',
  },
  input: {
    width: '50px',
    border: 'none',
    outline: 'none',
    fontSize: '11px',
    background: 'transparent',
    textAlign: 'right',
    padding: 0,
    color: '#000000',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  unit: {
    fontSize: '9px',
    color: '#6c6c6c',
    fontWeight: 500,
    textTransform: 'uppercase',
  },
  separator: {
    height: '1px',
    background: '#e0e0e0',
    margin: '0',
  },
  buttonGroup: {
    display: 'flex',
    gap: '6px',
  },
  categoryButton: {
    flex: 1,
    padding: '8px',
    borderRadius: '3px',
    border: '1px solid #e0e0e0',
    backgroundColor: 'transparent',
    color: '#6c6c6c',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.1s ease',
  },
  categoryButtonActive: {
    border: '1px solid #000000',
    backgroundColor: '#000000',
    color: '#ffffff',
  },
  presetGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  presetButton: {
    padding: '5px 8px',
    borderRadius: '3px',
    border: '1px solid #e0e0e0',
    backgroundColor: 'transparent',
    fontSize: '9px',
    fontWeight: 500,
    color: '#6c6c6c',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  presetButtonActive: {
    border: '1px solid #000000',
    backgroundColor: '#000000',
    color: '#ffffff',
  },
};

