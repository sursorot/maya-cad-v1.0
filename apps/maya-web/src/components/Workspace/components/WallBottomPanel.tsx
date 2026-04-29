import React, { useState, useEffect, useRef } from 'react';
import type { WallAlignment, WallDrawingMode } from '../types';

interface WallBottomPanelProps {
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
  onClose?: () => void;
  // Wall lock and ortho snap
  wallsLocked: boolean;
  onWallsLockedChange: (locked: boolean) => void;
  canSnapWallsOrthogonal: boolean;
  onSnapWallsOrthogonal: () => void;
}

export const WallBottomPanel: React.FC<WallBottomPanelProps> = ({
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
  onClose,
  wallsLocked,
  onWallsLockedChange,
  canSnapWallsOrthogonal,
  onSnapWallsOrthogonal,
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

  // Compact Icons
  const SegmentIcon = ({ active }: { active: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#666'} strokeWidth="2.5" strokeLinecap="round">
      <line x1="6" y1="18" x2="18" y2="6" />
      <circle cx="6" cy="18" r="2" fill={active ? '#fff' : '#666'} stroke="none" />
      <circle cx="18" cy="6" r="2" fill={active ? '#fff' : '#666'} stroke="none" />
    </svg>
  );

  const ChainIcon = ({ active }: { active: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#666'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7,16 12,10 17,16" />
      <circle cx="7" cy="16" r="2" fill={active ? '#fff' : '#666'} stroke="none" />
      <circle cx="12" cy="10" r="2" fill={active ? '#fff' : '#666'} stroke="none" />
      <circle cx="17" cy="16" r="2" fill={active ? '#fff' : '#666'} stroke="none" />
    </svg>
  );

  const RectIcon = ({ active }: { active: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? '#fff' : '#666'}>
      <path d="M3,3V21H21V3H3M19,19H5V5H19V19Z" />
    </svg>
  );

  const OffsetIcon = ({ active }: { active: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#666'} strokeWidth="2">
      <path d="M4 4h16v16H4z" opacity="0.3" />
      <path d="M8 8h8v8H8z" strokeWidth="2.5" />
    </svg>
  );

  // Lock/Unlock Icon
  const LockIcon = ({ locked }: { locked: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={locked ? '#fff' : '#666'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {locked ? (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </>
      ) : (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
        </>
      )}
    </svg>
  );

  // Ortho Snap Icon
  const OrthoIcon = ({ active }: { active: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#666'} strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v20M2 12h20"/>
      <path d="M17 7l-5 5 5 5" strokeWidth="2"/>
    </svg>
  );

  const AlignIcon = ({ variant, active }: { variant: WallAlignment; active: boolean }) => {
    const color = active ? '#fff' : '#666';
    if (variant === 'inside') {
      return (
        <svg width="14" height="14" viewBox="0 0 16 16">
          <line x1="2" y1="4" x2="14" y2="4" stroke={color} strokeWidth="1.5" strokeDasharray={active ? "0" : "2 1"} />
          <rect x="2" y="6" width="12" height="6" fill={color} opacity={0.3} />
        </svg>
      );
    }
    if (variant === 'center') {
      return (
        <svg width="14" height="14" viewBox="0 0 16 16">
          <rect x="2" y="5" width="12" height="6" fill={color} opacity={0.3} />
          <line x1="2" y1="8" x2="14" y2="8" stroke={color} strokeWidth="1.5" strokeDasharray={active ? "0" : "2 1"} />
        </svg>
      );
    }
    return (
      <svg width="14" height="14" viewBox="0 0 16 16">
        <rect x="2" y="4" width="12" height="6" fill={color} opacity={0.3} />
        <line x1="2" y1="12" x2="14" y2="12" stroke={color} strokeWidth="1.5" strokeDasharray={active ? "0" : "2 1"} />
      </svg>
    );
  };

  const renderInput = (
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
          <svg width="12" height="12" viewBox="0 0 100 100" fill="#fff">
            <circle cx="25" cy="25" r="10" />
            <circle cx="75" cy="25" r="10" />
            <circle cx="25" cy="75" r="10" />
            <circle cx="75" cy="75" r="10" />
          </svg>
          WALL
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
        {/* Dimensions Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>Dimensions</div>
          <div style={styles.inputGroup}>
            {typeof length === 'number' && Number.isFinite(length) && renderInput('Length', length, onLengthChange, 0.1, 0.1)}
            {renderInput('Thickness', thickness, onThicknessChange, 0.05, 0.05)}
            {renderInput('Height', height, onHeightChange, 0.1, 0.1)}
          </div>
        </div>

        {/* Mode Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>Drawing Mode</div>
          <div style={styles.btnGroup}>
            {(['single', 'chain', 'rectangle', 'offset'] as WallDrawingMode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onModeChange(option)}
                title={option.charAt(0).toUpperCase() + option.slice(1)}
                style={{
                  ...styles.iconBtn,
                  ...(option === mode ? styles.iconBtnActive : {}),
                }}
              >
                {option === 'single' && <SegmentIcon active={option === mode} />}
                {option === 'chain' && <ChainIcon active={option === mode} />}
                {option === 'rectangle' && <RectIcon active={option === mode} />}
                {option === 'offset' && <OffsetIcon active={option === mode} />}
              </button>
            ))}
          </div>
        </div>

        {/* Alignment Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>Alignment</div>
          <div style={styles.btnGroup}>
            {(['inside', 'center', 'outside'] as WallAlignment[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onAlignmentChange(option)}
                title={`Align ${option}`}
                style={{
                  ...styles.iconBtn,
                  ...(option === alignment ? styles.iconBtnActive : {}),
                }}
              >
                <AlignIcon variant={option} active={option === alignment} />
              </button>
            ))}
          </div>
        </div>

        {mode === 'offset' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>Offset Distance</div>
            <div style={styles.inputGroup}>
              {renderInput('Distance', offsetDistance, onOffsetDistanceChange, 0.1, 0.1)}
            </div>
          </div>
        )}

        {/* Options Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>Options</div>
          <div style={styles.optionRow}>
            <span style={styles.optionLabel}>Centerline</span>
            <button
              type="button"
              onClick={() => onCenterlineToggle(!showCenterline)}
              title="Toggle Centerline"
              style={{
                ...styles.toggle,
                backgroundColor: showCenterline ? '#000' : '#e0e0e0',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: showCenterline ? '14px' : '2px',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: showCenterline ? '#fff' : '#000',
                  transition: 'left 0.15s',
                }}
              />
            </button>
          </div>
          <div style={styles.btnGroup}>
            <button
              type="button"
              onClick={() => onWallsLockedChange(!wallsLocked)}
              title={wallsLocked ? "Unlock Walls" : "Lock Walls"}
              style={{
                ...styles.iconBtn,
                ...(wallsLocked ? styles.iconBtnActive : {}),
              }}
            >
              <LockIcon locked={wallsLocked} />
            </button>
            <button
              type="button"
              onClick={onSnapWallsOrthogonal}
              disabled={!canSnapWallsOrthogonal}
              title="Snap to Orthogonal"
              style={{
                ...styles.iconBtn,
                opacity: canSnapWallsOrthogonal ? 1 : 0.4,
                cursor: canSnapWallsOrthogonal ? 'pointer' : 'not-allowed',
              }}
            >
              <OrthoIcon active={false} />
            </button>
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
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  optionLabel: {
    fontSize: '10px',
    color: '#333',
    fontWeight: 500,
  },
  toggle: {
    width: 26,
    height: 14,
    borderRadius: 7,
    position: 'relative',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
};

export default WallBottomPanel;
