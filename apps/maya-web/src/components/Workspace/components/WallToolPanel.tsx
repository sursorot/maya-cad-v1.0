import { useState, useRef, useEffect } from 'react';
import type { WallAlignment, WallDrawingMode } from '../types';

interface WallToolPanelProps {
  visible: boolean;
  length?: number;
  thickness: number;
  height: number;
  alignment: WallAlignment;
  lengthUnit: string;
  mode: WallDrawingMode;
  offsetDistance: number;
  onLengthChange?: (value: number) => void;
  onThicknessChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onAlignmentChange: (value: WallAlignment) => void;
  onModeChange: (value: WallDrawingMode) => void;
  onOffsetDistanceChange: (value: number) => void;
  showCenterline: boolean;
  onCenterlineToggle: (value: boolean) => void;
}

export const WallToolPanel: React.FC<WallToolPanelProps> = ({
  visible,
  length,
  thickness,
  height,
  alignment,
  lengthUnit,
  mode,
  offsetDistance,
  onLengthChange,
  onThicknessChange,
  onHeightChange,
  onAlignmentChange,
  onModeChange,
  onOffsetDistanceChange,
  showCenterline,
  onCenterlineToggle,
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
    const panelHeight = 340;
    
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

  const renderCompactInput = (
    label: string,
    value: number,
    onChange: ((value: number) => void) | undefined,
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
          onChange={
            onChange
              ? (e) => {
                const nextValue = Number(e.target.value);
                if (!Number.isFinite(nextValue)) return;
                onChange(Math.max(min, nextValue));
              }
              : undefined
          }
          readOnly={!onChange}
          style={styles.input}
        />
        <span style={styles.unit}>{lengthUnit}</span>
      </div>
    </div>
  );

  // Icons for Modes
  const SegmentIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="4" y1="20" x2="20" y2="4" />
      <circle cx="4" cy="20" r="2" fill="currentColor" stroke="none" />
      <circle cx="20" cy="4" r="2" fill="currentColor" stroke="none" />
    </svg>
  );

  const ChainIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="4,12 12,4 20,12" />
      <circle cx="4" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="4" r="2" fill="currentColor" stroke="none" />
      <circle cx="20" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );

  const RectIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="4" y="4" width="16" height="16" />
    </svg>
  );

  const OffsetIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16v16H4z" strokeOpacity="0.3" />
      <path d="M8 8h8v8H8z" strokeWidth="2.5" />
    </svg>
  );

  // Alignment Icons
  const AlignmentIcon: React.FC<{ variant: WallAlignment; active: boolean }> = ({ variant, active }) => {
    const color = active ? 'currentColor' : '#6c6c6c';

    if (variant === 'inside') {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <line x1="2" y1="4" x2="14" y2="4" stroke={color} strokeWidth="1.5" strokeDasharray="2 1" />
          <rect x="2" y="6" width="12" height="6" fill={color} opacity={0.3} />
        </svg>
      );
    }

    if (variant === 'center') {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <rect x="2" y="5" width="12" height="6" fill={color} opacity={0.3} />
          <line x1="2" y1="8" x2="14" y2="8" stroke={color} strokeWidth="1.5" strokeDasharray="2 1" />
        </svg>
      );
    }

    return (
      <svg width="16" height="16" viewBox="0 0 16 16">
        <rect x="2" y="4" width="12" height="6" fill={color} opacity={0.3} />
        <line x1="2" y1="12" x2="14" y2="12" stroke={color} strokeWidth="1.5" strokeDasharray="2 1" />
      </svg>
    );
  };

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
        WALL
      </div>

      {/* Dimensions Section */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Dimensions</div>
        <div style={styles.inputGroup}>
          {typeof length === 'number' && Number.isFinite(length) && (
            renderCompactInput('L', length, onLengthChange, 0.1, 0.1)
          )}
          {renderCompactInput('T', thickness, onThicknessChange, 0.05, 0.05)}
          {renderCompactInput('H', height, onHeightChange, 0.1, 0.1)}
        </div>
      </div>

      <div style={styles.separator} />

      {/* Mode Section */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Mode</div>
        <div style={styles.buttonGroup}>
          {(['single', 'chain', 'rectangle', 'offset'] as WallDrawingMode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onModeChange(option)}
              title={option.charAt(0).toUpperCase() + option.slice(1)}
              style={{
                ...styles.iconButton,
                ...(option === mode ? styles.iconButtonActive : {}),
              }}
            >
              {option === 'single' && <SegmentIcon />}
              {option === 'chain' && <ChainIcon />}
              {option === 'rectangle' && <RectIcon />}
              {option === 'offset' && <OffsetIcon />}
            </button>
          ))}
        </div>
      </div>

      {mode === 'offset' && (
        <>
          <div style={styles.separator} />
          <div style={styles.section}>
            <div style={styles.sectionLabel}>Offset</div>
            {renderCompactInput('D', offsetDistance, onOffsetDistanceChange, 0.1, 0.1)}
          </div>
        </>
      )}

      <div style={styles.separator} />

      {/* Alignment Section */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Align</div>
        <div style={styles.buttonGroup}>
          {(['inside', 'center', 'outside'] as WallAlignment[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onAlignmentChange(option)}
              title={`Align ${option}`}
              style={{
                ...styles.iconButton,
                ...(option === alignment ? styles.iconButtonActive : {}),
              }}
            >
              <AlignmentIcon variant={option} active={option === alignment} />
            </button>
          ))}
        </div>
      </div>

      <div style={styles.separator} />

      {/* Centerline Toggle */}
      <div style={styles.toggleRow}>
        <span style={styles.toggleLabel}>Centerline</span>
        <button
          type="button"
          onClick={() => onCenterlineToggle(!showCenterline)}
          title="Toggle Centerline"
          style={{
            ...styles.toggle,
            backgroundColor: showCenterline ? '#000000' : '#e0e0e0',
          }}
        >
          <div
            style={{
              ...styles.toggleKnob,
              left: showCenterline ? '17px' : '3px',
              backgroundColor: showCenterline ? '#ffffff' : '#000000',
            }}
          />
        </button>
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
    gap: '4px',
  },
  iconButton: {
    padding: '4px',
    width: '32px',
    height: '32px',
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
  iconButtonActive: {
    border: '1px solid #000000',
    backgroundColor: '#000000',
    color: '#ffffff',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
  },
  toggleLabel: {
    fontSize: '10px',
    color: '#000000',
    fontWeight: 500,
  },
  toggle: {
    width: '32px',
    height: '18px',
    borderRadius: '9px',
    position: 'relative',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  toggleKnob: {
    position: 'absolute',
    top: '3px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    transition: 'left 0.15s',
  },
};

