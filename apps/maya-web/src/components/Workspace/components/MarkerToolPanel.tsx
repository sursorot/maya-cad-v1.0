import { useState, useRef, useEffect, useCallback } from 'react';
import type { MarkerShape } from '../types';

// Preset colors for markers
export const MARKER_COLOR_PRESETS = [
  { id: 'orange', color: '#F57C00', name: 'Orange' },
  { id: 'red', color: '#E53935', name: 'Red' },
  { id: 'pink', color: '#D81B60', name: 'Pink' },
  { id: 'purple', color: '#8E24AA', name: 'Purple' },
  { id: 'blue', color: '#1E88E5', name: 'Blue' },
  { id: 'cyan', color: '#00ACC1', name: 'Cyan' },
  { id: 'teal', color: '#00897B', name: 'Teal' },
  { id: 'green', color: '#43A047', name: 'Green' },
  { id: 'lime', color: '#7CB342', name: 'Lime' },
  { id: 'yellow', color: '#FDD835', name: 'Yellow' },
  { id: 'brown', color: '#6D4C41', name: 'Brown' },
  { id: 'grey', color: '#757575', name: 'Grey' },
];

const PANEL_WIDTH = 160;
const PANEL_HEIGHT = 280; // Approximate height including delete button
const MIN_DISTANCE = 80; // Minimum distance from cursor to panel
const EDGE_MARGIN = 10; // Margin from viewport edges

type DrawingMode = 'one-time' | 'chain';

interface MarkerToolPanelProps {
  visible: boolean;
  markerLabel: string;
  markerColor: string;
  onLabelChange: (label: string) => void;
  onColorChange: (color: string) => void;
  // Edit mode props
  editingMarker?: MarkerShape | null;
  onMarkerUpdate?: (markerId: string, updates: { label?: string; color?: string }) => void;
  onDelete?: () => void;
  // Position props - screen coordinates
  initialPosition?: { x: number; y: number } | null;
  // Drawing mode props
  drawingMode?: DrawingMode;
  onToggleDrawingMode?: () => void;
  // Multi-selection props
  selectedMarkerCount?: number;
}

export const MarkerToolPanel: React.FC<MarkerToolPanelProps> = ({
  visible,
  markerLabel,
  markerColor,
  onLabelChange,
  onColorChange,
  editingMarker,
  onMarkerUpdate,
  onDelete,
  initialPosition,
  drawingMode = 'one-time',
  onToggleDrawingMode,
  selectedMarkerCount = 0,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const cursorPosRef = useRef({ x: 0, y: 0 });
  
  // Track if we're editing a marker (use marker's current values)
  const isEditMode = !!editingMarker;
  const isMultiSelectMode = selectedMarkerCount > 1;
  const displayLabel = isEditMode ? editingMarker.label : markerLabel;
  const displayColor = isEditMode ? editingMarker.stroke : markerColor;

  // Calculate optimal position away from cursor
  const calculatePositionAwayfromCursor = useCallback((cursorX: number, cursorY: number) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Try to place panel to the right of cursor first
    let x = cursorX + MIN_DISTANCE;
    let y = cursorY - PANEL_HEIGHT / 2;
    
    // If panel would go off right edge, place it to the left
    if (x + PANEL_WIDTH > viewportWidth - EDGE_MARGIN) {
      x = cursorX - PANEL_WIDTH - MIN_DISTANCE;
    }
    
    // If still off-screen (left edge), try above or below
    if (x < EDGE_MARGIN) {
      x = Math.max(EDGE_MARGIN, cursorX - PANEL_WIDTH / 2);
      // Place below cursor
      y = cursorY + MIN_DISTANCE;
      // If below doesn't fit, place above
      if (y + PANEL_HEIGHT > viewportHeight - EDGE_MARGIN) {
        y = cursorY - PANEL_HEIGHT - MIN_DISTANCE;
      }
    }
    
    // Clamp to viewport bounds
    x = Math.max(EDGE_MARGIN, Math.min(x, viewportWidth - PANEL_WIDTH - EDGE_MARGIN));
    y = Math.max(EDGE_MARGIN, Math.min(y, viewportHeight - PANEL_HEIGHT - EDGE_MARGIN));
    
    return { x, y };
  }, []);

  // Track cursor movement globally - only reposition when NOT hovering over panel
  useEffect(() => {
    if (!visible || isDragging || hasBeenDragged || isHovering) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      cursorPosRef.current = { x: e.clientX, y: e.clientY };
      
      // Check if cursor is getting close to panel
      const panelRect = panelRef.current?.getBoundingClientRect();
      if (!panelRect) return;
      
      // Check if cursor is over the panel (with some padding)
      const padding = 40;
      const isOverPanel = 
        e.clientX >= panelRect.left - padding &&
        e.clientX <= panelRect.right + padding &&
        e.clientY >= panelRect.top - padding &&
        e.clientY <= panelRect.bottom + padding;
      
      // Don't reposition if cursor is near/over the panel
      if (isOverPanel) return;
      
      // Calculate distance from cursor to panel center
      const panelCenterX = panelRect.left + panelRect.width / 2;
      const panelCenterY = panelRect.top + panelRect.height / 2;
      const distance = Math.hypot(e.clientX - panelCenterX, e.clientY - panelCenterY);
      
      // If cursor is within the "danger zone", reposition panel
      const dangerZone = Math.max(panelRect.width, panelRect.height) / 2 + MIN_DISTANCE / 2;
      if (distance < dangerZone) {
        const newPos = calculatePositionAwayfromCursor(e.clientX, e.clientY);
        setPosition(newPos);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [visible, isDragging, hasBeenDragged, isHovering, calculatePositionAwayfromCursor]);

  // Initialize position when panel becomes visible or initialPosition changes
  useEffect(() => {
    if (!visible) {
      setHasBeenDragged(false);
      return;
    }
    
    // Use initial position or current cursor position
    const targetX = initialPosition?.x ?? cursorPosRef.current.x;
    const targetY = initialPosition?.y ?? cursorPosRef.current.y;
    
    const newPos = calculatePositionAwayfromCursor(targetX, targetY);
    setPosition(newPos);
  }, [visible, initialPosition, calculatePositionAwayfromCursor]);

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
      setHasBeenDragged(true); // Once dragged, stop auto-repositioning
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

  const handleLabelChange = (newLabel: string) => {
    if (isEditMode && editingMarker && onMarkerUpdate) {
      onMarkerUpdate(editingMarker.id, { label: newLabel });
    } else {
      onLabelChange(newLabel);
    }
  };

  const handleColorChange = (newColor: string) => {
    if (isEditMode && editingMarker && onMarkerUpdate) {
      onMarkerUpdate(editingMarker.id, { color: newColor });
    } else {
      onColorChange(newColor);
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        ...styles.container,
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? 'none' : 'left 0.15s ease-out, top 0.15s ease-out',
      }}
    >
      {/* Header */}
      <div style={styles.header} onMouseDown={handleMouseDown}>
        <span style={styles.title}>
          {isMultiSelectMode ? `${selectedMarkerCount} MARKERS` : isEditMode ? 'EDIT MARKER' : 'MARKER'}
        </span>
        <span style={styles.dragHint}>⋮⋮</span>
      </div>

      {/* Drawing Mode Toggle - only show when not editing or multi-selecting */}
      {!isEditMode && !isMultiSelectMode && onToggleDrawingMode && (
        <div style={styles.modeToggleSection}>
          <button
            onClick={onToggleDrawingMode}
            style={{
              ...styles.modeButton,
              ...(drawingMode === 'one-time' ? styles.modeButtonActive : {}),
            }}
          >
            One-time
          </button>
          <button
            onClick={onToggleDrawingMode}
            style={{
              ...styles.modeButton,
              ...(drawingMode === 'chain' ? styles.modeButtonActive : {}),
            }}
          >
            Chain
          </button>
        </div>
      )}

      {/* Label Input - hide when multiple markers selected */}
      {!isMultiSelectMode && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Label</div>
          <div style={styles.inputWrapper}>
            <input
              type="text"
              value={displayLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="M1"
              maxLength={10}
              style={styles.textInput}
            />
          </div>
        </div>
      )}

      {!isMultiSelectMode && <div style={styles.separator} />}

      {/* Color Selection - hide when multiple markers selected */}
      {!isMultiSelectMode && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Color</div>
          <div style={styles.colorGrid}>
            {MARKER_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleColorChange(preset.color)}
                style={{
                  ...styles.colorSwatch,
                  backgroundColor: preset.color,
                  ...(displayColor === preset.color ? styles.colorSwatchActive : {}),
                }}
                title={preset.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Preview - hide when multiple markers selected */}
      {!isMultiSelectMode && (
        <>
          <div style={styles.separator} />
          <div style={styles.previewSection}>
            <div style={styles.sectionLabel}>Preview</div>
            <div style={styles.preview}>
              <div style={{ ...styles.previewDot, backgroundColor: displayColor }} />
              <span style={{ ...styles.previewLabel, color: displayColor }}>{displayLabel || 'M1'}</span>
            </div>
          </div>
        </>
      )}

      {/* Delete button - show in edit mode or multi-select mode */}
      {(isEditMode || isMultiSelectMode) && onDelete && (
        <>
          <div style={styles.separator} />
          <div style={styles.deleteSection}>
            <button
              onClick={onDelete}
              style={styles.deleteButton}
              title={isMultiSelectMode ? `Delete ${selectedMarkerCount} markers` : 'Delete marker'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              <span>{isMultiSelectMode ? `Delete All (${selectedMarkerCount})` : 'Delete'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    width: '160px',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
    fontFamily: "'IBM Plex Mono', monospace",
    zIndex: 1000,
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#000000',
    borderRadius: '5px 5px 0 0',
    cursor: 'grab',
  },
  title: {
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.1em',
  },
  dragHint: {
    color: '#666666',
    fontSize: '12px',
    letterSpacing: '-2px',
  },
  modeToggleSection: {
    display: 'flex',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: '#f5f5f5',
    borderBottom: '1px solid #e0e0e0',
  },
  modeButton: {
    flex: 1,
    padding: '5px 8px',
    fontSize: '9px',
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    border: '1px solid #d0d0d0',
    borderRadius: '3px',
    backgroundColor: '#ffffff',
    color: '#666666',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  modeButtonActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
    color: '#ffffff',
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
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '3px',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    height: '26px',
  },
  textInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    fontSize: '11px',
    background: 'transparent',
    padding: 0,
    color: '#000000',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  separator: {
    height: '1px',
    background: '#e0e0e0',
    margin: '0',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '4px',
  },
  colorSwatch: {
    width: '18px',
    height: '18px',
    borderRadius: '3px',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'transform 0.1s, border-color 0.1s',
    outline: 'none',
  },
  colorSwatchActive: {
    borderColor: '#000000',
    transform: 'scale(1.1)',
  },
  previewSection: {
    padding: '10px 12px',
  },
  preview: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#fafafa',
    borderRadius: '4px',
    border: '1px solid #e0e0e0',
  },
  previewDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '2px solid #ffffff',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
  },
  previewLabel: {
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  deleteSection: {
    padding: '10px 12px',
  },
  deleteButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#fff5f5',
    border: '1px solid #ffcdd2',
    borderRadius: '4px',
    color: '#c62828',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};
