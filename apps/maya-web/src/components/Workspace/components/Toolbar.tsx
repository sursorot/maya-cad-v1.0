import { useState, useRef, useEffect } from 'react';
import type { ToolType, ToolbarStyle } from '../types';

interface ToolbarProps {
  visible: boolean;
  toolbarStyle?: ToolbarStyle;
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Note: wallsLocked and orthoSnap moved to WallBottomPanel
}

// SVG Icon Components - All using consistent size
const PolylineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="circle-marker-polyline" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <circle cx="5" cy="5" r="2.5" fill="#fff" stroke="currentColor" strokeWidth="1.5" />
      </marker>
    </defs>
    <polyline stroke="currentColor" strokeWidth="2" fill="none"
      markerStart="url(#circle-marker-polyline)"
      markerMid="url(#circle-marker-polyline)"
      markerEnd="url(#circle-marker-polyline)"
      points="3,4 9,18 19,10" />
  </svg>
);

const LineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="circle-marker-line" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <circle cx="5" cy="5" r="2.5" fill="#fff" stroke="currentColor" strokeWidth="1.5" />
      </marker>
    </defs>
    <line stroke="currentColor" strokeWidth="2" fill="none"
      markerStart="url(#circle-marker-line)"
      markerEnd="url(#circle-marker-line)"
      x1="3" y1="17" x2="21" y2="7" />
  </svg>
);

const ArcIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="circle-marker-arc" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <circle cx="5" cy="5" r="2.5" fill="#fff" stroke="currentColor" strokeWidth="1.5" />
      </marker>
    </defs>
    <path stroke="currentColor" strokeWidth="2" fill="none"
      markerStart="url(#circle-marker-arc)"
      markerEnd="url(#circle-marker-arc)"
      d="M 4,18 A 15 15 0 0 1 20,6" />
  </svg>
);

const CurveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="circle-marker-curve" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <circle cx="5" cy="5" r="2.5" fill="#fff" stroke="currentColor" strokeWidth="1.5" />
      </marker>
    </defs>
    <path stroke="currentColor" strokeWidth="2" fill="none"
      markerStart="url(#circle-marker-curve)"
      markerEnd="url(#circle-marker-curve)"
      d="M 3,13 C 8,3 14,21 21,11" />
  </svg>
);

const CircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle stroke="currentColor" strokeWidth="2" fill="none" cx="12" cy="12" r="8" />
  </svg>
);

const RectangleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect stroke="currentColor" strokeWidth="2" fill="none" x="4" y="6" width="16" height="12" rx="2" ry="2" />
  </svg>
);

const WallIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    {/* Brick wall pattern - clearly represents a wall */}
    <rect x="3" y="5" width="18" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" rx="1" />
    {/* Horizontal mortar lines */}
    <line x1="3" y1="9.5" x2="21" y2="9.5" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    <line x1="3" y1="14.5" x2="21" y2="14.5" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    {/* Vertical brick joints - staggered */}
    <line x1="8" y1="5" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    <line x1="16" y1="5" x2="16" y2="9.5" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    <line x1="12" y1="9.5" x2="12" y2="14.5" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    <line x1="8" y1="14.5" x2="8" y2="19" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    <line x1="16" y1="14.5" x2="16" y2="19" stroke="currentColor" strokeWidth="1" opacity="0.7" />
  </svg>
);

const OpeningIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    {/* Door frame - clear doorway shape */}
    <path d="M5 4 L5 20 L19 20 L19 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* Door panel */}
    <rect x="7" y="6" width="10" height="14" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1" />
    {/* Door handle */}
    <circle cx="15" cy="13" r="1.2" fill="currentColor" />
  </svg>
);

const AssetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    {/* Bed icon - simple furniture representation */}
    <rect x="3" y="8" width="18" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
    {/* Headboard */}
    <rect x="3" y="5" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" />
    {/* Pillows */}
    <rect x="5" y="9" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1" fill="none" />
    <rect x="14" y="9" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1" fill="none" />
    {/* Blanket line */}
    <path d="M3 15 Q12 14 21 15" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
  </svg>
);

const ZoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="zone-icon-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="2" height="4" transform="translate(0,0)" fill="currentColor" opacity="0.3" />
      </pattern>
    </defs>
    <path d="M12 3L21 9V18L12 21L3 18V9L12 3Z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
    <path d="M12 3L21 9V18L12 21L3 18V9L12 3Z" fill="url(#zone-icon-hatch)" stroke="none" />
  </svg>
);

const DimensionIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <line x1="5" y1="6" x2="5" y2="18" stroke="currentColor" strokeWidth="1.5" />
    <line x1="19" y1="6" x2="19" y2="18" stroke="currentColor" strokeWidth="1.5" />
    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 9l-3 3 3 3 M16 9l3 3-3 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GuidelineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <line stroke="currentColor" strokeWidth="2" strokeDasharray="2 3" x1="12" y1="3" x2="12" y2="21" />
  </svg>
);

const TrimIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    {/* Scissors icon */}
    <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="8.5" y1="7.5" x2="18" y2="16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="8.5" y1="16.5" x2="18" y2="7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const MarkerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    {/* Pin/Marker icon - a location marker point */}
    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="1" fill="currentColor" />
  </svg>
);

const SelectIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
  </svg>
);

const MeasureIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    {/* Diagonal measurement line */}
    <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* End markers */}
    <circle cx="4" cy="20" r="2" fill="currentColor" />
    <circle cx="20" cy="4" r="2" fill="currentColor" />
    {/* Extension ticks */}
    <line x1="2" y1="18" x2="6" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="18" y1="2" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const UndoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 7l-4 4 4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 11h9a6 6 0 1 1 0 12h-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

const RedoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 7l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 11H12a6 6 0 1 0 0 12h4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

// Windows 95 style CSS variables
const win95Vars = {
  bgColor: '#c0c0c0',
  textColor: '#000000',
  borderLight: '#ffffff',
  borderDark: '#808080',
  activeHeaderBg: '#000080',
  activeHeaderText: '#ffffff',
  tooltipBg: '#FFFFE1',
  tooltipText: '#000000',
  fontFamily: "'Tahoma', 'Verdana', 'Arial', sans-serif",
};

// Funk style CSS variables
const funkVars = {
  bgColor: '#ffffff',
  textColor: '#1e1e1e',
  borderColor: '#1e1e1e',
  accentPink: '#ff69b4',
  accentCyan: '#00f0ff',
  accentYellow: '#f9c500',
  shadowColor: '#1e1e1e',
  fontFamily: "'Inter', sans-serif",
};

// Cyber (Blueprint) style CSS variables
const cyberVars = {
  bgColor: '#0a2540',           // Deep prussian blue
  paperColor: '#0d2f4d',        // Slightly lighter blue for elements
  lineColor: '#4da6ff',         // Bright cyan line
  lineDim: '#2d7acc',           // Dimmer cyan
  textColor: '#e8f4ff',         // Off-white text
  accentOrange: '#ff6b35',      // Orange accent for active states
  glowColor: 'rgba(77, 166, 255, 0.4)',
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
};

// Clean (WIRED-inspired) style CSS variables - deep glossy blue accent
const cleanVars = {
  bgColor: '#ffffff',
  textColor: '#1A1A1A',
  textSecondary: '#5A6370',
  borderColor: '#3A3A3A',
  separatorColor: '#E8EAED',
  activeColor: '#1565C0',
  fontFamily: "'IBM Plex Mono', monospace",
};

export const Toolbar: React.FC<ToolbarProps> = ({
  visible,
  toolbarStyle = 'modern',
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isWindows95 = toolbarStyle === 'windows95';
  const isFunk = toolbarStyle === 'funk';
  const isCyber = toolbarStyle === 'cyber';
  const isClean = toolbarStyle === 'clean';

  // Center toolbar vertically on mount and when window resizes (but NOT when expanding/collapsing)
  useEffect(() => {
    if (!visible || !toolbarRef.current) return;

    const centerToolbar = () => {
      if (!toolbarRef.current) return;
      const toolbar = toolbarRef.current;
      const parent = toolbar.offsetParent as HTMLElement;

      if (parent) {
        // Get the actual available height from the parent container (canvas container)
        const parentHeight = parent.clientHeight;
        const toolbarHeight = toolbar.offsetHeight;

        // Center within the parent container
        const centeredY = (parentHeight - toolbarHeight) / 2;

        setPosition({
          x: 12, // minimal gap from left edge
          y: Math.max(10, centeredY) // ensure at least 10px from top
        });
        setIsInitialized(true);
      }
    };

    // Only center on initial mount, not on expand/collapse
    if (!isInitialized) {
      centerToolbar();
      // Small delay to ensure toolbar is fully rendered before centering
      const timer = setTimeout(centerToolbar, 100);

      return () => {
        clearTimeout(timer);
      };
    }

    // Recenter when window resizes
    const handleResize = () => {
      centerToolbar();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [visible, isInitialized]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!toolbarRef.current) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - toolbarRef.current.offsetLeft,
      y: e.clientY - toolbarRef.current.offsetTop,
    });
  };

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

  const toggleGroup = (groupId: number) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  if (!visible) return null;

  // Windows 95 container styles
  const win95ContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${position.y}px`,
    left: `${position.x}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '4px',
    backgroundColor: win95Vars.bgColor,
    border: '2px solid',
    borderColor: `${win95Vars.borderLight} ${win95Vars.borderDark} ${win95Vars.borderDark} ${win95Vars.borderLight}`,
    userSelect: 'none',
    width: '96px',
    zIndex: 1000,
    fontFamily: win95Vars.fontFamily,
  };

  // Modern container styles
  const modernContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${position.y}px`,
    left: `${position.x}px`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '6px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e0e0e0',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    userSelect: 'none',
    width: '88px',
    zIndex: 1000,
  };

  // Funk container styles
  // Button width = 40px content + 3px border × 2 = 46px visual
  // 2 buttons × 46px + 6px gap = 98px content width needed
  const funkContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${position.y}px`,
    left: `${position.x}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '8px',
    backgroundColor: funkVars.bgColor,
    border: `3px solid ${funkVars.borderColor}`,
    borderRadius: '8px',
    boxShadow: `8px 8px 0px ${funkVars.shadowColor}`,
    userSelect: 'none',
    width: '98px',
    zIndex: 1000,
    fontFamily: funkVars.fontFamily,
    overflow: 'hidden',
  };

  // Cyber (Blueprint) container styles
  const cyberContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${position.y}px`,
    left: `${position.x}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    backgroundColor: cyberVars.paperColor,
    border: `2px solid ${cyberVars.lineColor}`,
    userSelect: 'none',
    width: '110px',
    zIndex: 1000,
    fontFamily: cyberVars.fontFamily,
    boxShadow: `inset 0 0 0 1px ${cyberVars.lineDim}, 0 0 20px ${cyberVars.glowColor}`,
  };

  // Clean (WIRED-inspired) container styles
  const cleanContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${position.y}px`,
    left: `${position.x}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '6px',
    backgroundColor: cleanVars.bgColor,
    border: `1px solid ${cleanVars.borderColor}`,
    borderRadius: '4px',
    userSelect: 'none',
    width: '88px',
    zIndex: 1000,
    fontFamily: cleanVars.fontFamily,
  };

  const getContainerStyle = () => {
    if (isClean) return cleanContainerStyle;
    if (isCyber) return cyberContainerStyle;
    if (isFunk) return funkContainerStyle;
    if (isWindows95) return win95ContainerStyle;
    return modernContainerStyle;
  };

  // Grid gap: Funk uses 6px, Cyber uses 6px, others use 4px
  const gridGap = (isFunk || isCyber) ? '6px' : '4px';

  return (
    <div
      ref={toolbarRef}
      style={getContainerStyle()}
    >
      {/* Drag Handle */}
      {isClean ? (
        <div
          onMouseDown={handleMouseDown}
          style={{
            background: cleanVars.activeColor,
            color: cleanVars.bgColor,
            fontSize: '10px',
            fontWeight: 600,
            padding: '3px 6px',
            margin: '-6px -6px 4px -6px',
            textAlign: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            letterSpacing: '0.5px',
          }}
        >
          TOOLS
        </div>
      ) : isCyber ? (
        <div
          onMouseDown={handleMouseDown}
          style={{
            background: 'transparent',
            border: `1px dashed ${cyberVars.lineColor}`,
            color: cyberVars.textColor,
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            padding: '6px 8px',
            textAlign: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            position: 'relative',
          }}
        >
          <span style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', color: cyberVars.lineColor, fontSize: '10px' }}>⊕</span>
          TOOLS
          <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', color: cyberVars.lineColor, fontSize: '10px' }}>⊕</span>
        </div>
      ) : isFunk ? (
        <div
          onMouseDown={handleMouseDown}
          style={{
            background: `linear-gradient(45deg, ${funkVars.accentYellow}, ${funkVars.accentPink})`,
            color: funkVars.borderColor,
            fontSize: '16px',
            fontWeight: 'bold',
            padding: '6px 8px',
            margin: '-8px -8px 4px -8px',
            textAlign: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            textShadow: '2px 2px 0px rgba(255,255,255,0.5)',
            letterSpacing: '1px',
          }}
        >
          TOOLBOX
        </div>
      ) : isWindows95 ? (
        <div
          onMouseDown={handleMouseDown}
          style={{
            backgroundColor: win95Vars.activeHeaderBg,
            color: win95Vars.activeHeaderText,
            fontSize: '12px',
            fontWeight: 'bold',
            padding: '3px 6px',
            marginBottom: '2px',
            textAlign: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          Tools
        </div>
      ) : (
        <div
          onMouseDown={handleMouseDown}
          style={{
            width: '32px',
            height: '12px',
            cursor: isDragging ? 'grabbing' : 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#b0b0b0',
            marginBottom: '2px',
          }}
        >
          <svg width="16" height="4" viewBox="0 0 16 4" fill="currentColor">
            <rect width="16" height="1" />
            <rect y="3" width="16" height="1" />
          </svg>
        </div>
      )}

      {/* Tool Group 0: Guideline, Trim & Marker */}
      <div style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: gridGap }}>
          <ToolButton
            icon={<GuidelineIcon />}
            label="Guideline"
            active={activeTool === 'guideline'}
            onClick={() => onToolChange('guideline')}
            styleVariant={toolbarStyle}
          />
          <ToolButton
            icon={<TrimIcon />}
            label="Trim"
            active={activeTool === 'trim'}
            onClick={() => onToolChange('trim')}
            styleVariant={toolbarStyle}
          />
          <ToolButton
            icon={<MarkerIcon />}
            label="Marker"
            active={activeTool === 'marker'}
            onClick={() => onToolChange('marker')}
            styleVariant={toolbarStyle}
          />
        </div>
      </div>

      <Separator styleVariant={toolbarStyle} />

      {/* Tool Group 1: Navigation */}
      <div style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: gridGap }}>
          <ToolButton
            icon={<SelectIcon />}
            label="Select"
            active={activeTool === 'select'}
            onClick={() => onToolChange('select')}
            styleVariant={toolbarStyle}
          />
          <ToolButton
            icon={<MeasureIcon />}
            label="Measure"
            active={activeTool === 'measure'}
            onClick={() => onToolChange('measure')}
            styleVariant={toolbarStyle}
          />
        </div>
      </div>

      <Separator styleVariant={toolbarStyle} />

      {/* Tool Group 2: Shapes */}
      <div style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: gridGap }}>
          <ToolButton
            icon={<PolylineIcon />}
            label="Polyline"
            active={activeTool === 'polyline'}
            onClick={() => onToolChange('polyline')}
            styleVariant={toolbarStyle}
          />
          <ToolButton
            icon={<LineIcon />}
            label="Line"
            active={activeTool === 'line'}
            onClick={() => onToolChange('line')}
            styleVariant={toolbarStyle}
          />
          <ToolButton
            icon={<ArcIcon />}
            label="Arc"
            active={activeTool === 'arc'}
            onClick={() => onToolChange('arc')}
            styleVariant={toolbarStyle}
          />
          <ToolButton
            icon={<CurveIcon />}
            label="Curve"
            active={activeTool === 'curve'}
            onClick={() => onToolChange('curve')}
            styleVariant={toolbarStyle}
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: gridGap,
            gridColumn: '1 / -1',
            overflow: 'hidden',
            maxHeight: expandedGroups.has(1) ? '200px' : '0',
            transition: isWindows95 ? 'none' : 'max-height 0.25s ease-in-out, opacity 0.2s ease-in-out',
            opacity: expandedGroups.has(1) ? 1 : 0,
          }}>
            <ToolButton
              icon={<CircleIcon />}
              label="Circle"
              active={activeTool === 'circle'}
              onClick={() => onToolChange('circle')}
              styleVariant={toolbarStyle}
            />
            <ToolButton
              icon={<RectangleIcon />}
              label="Rectangle"
              active={activeTool === 'rectangle'}
              onClick={() => onToolChange('rectangle')}
              styleVariant={toolbarStyle}
            />
          </div>
        </div>
        <Expander expanded={expandedGroups.has(1)} onClick={() => toggleGroup(1)} styleVariant={toolbarStyle} />
      </div>

      <Separator styleVariant={toolbarStyle} />

      {/* Tool Group 3: Drawing */}
      <div style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: gridGap }}>
          <ToolButton
            icon={<WallIcon />}
            label="Wall"
            active={activeTool === 'wall'}
            onClick={() => onToolChange('wall')}
            styleVariant={toolbarStyle}
          />
          <ToolButton
            icon={<OpeningIcon />}
            label="Opening"
            active={activeTool === 'opening'}
            onClick={() => onToolChange('opening')}
            styleVariant={toolbarStyle}
          />
          <ToolButton
            icon={<AssetIcon />}
            label="Assets"
            active={activeTool === 'asset'}
            onClick={() => onToolChange('asset')}
            styleVariant={toolbarStyle}
          />
          <ToolButton
            icon={<ZoneIcon />}
            label="Zone"
            active={activeTool === 'zone'}
            onClick={() => onToolChange('zone')}
            styleVariant={toolbarStyle}
          />
          <ToolButton
            icon={<DimensionIcon />}
            label="Dimension"
            active={activeTool === 'dimension'}
            onClick={() => onToolChange('dimension')}
            styleVariant={toolbarStyle}
          />
          <ToolButton
            icon="T"
            label="Text"
            active={activeTool === 'text'}
            onClick={() => onToolChange('text')}
            styleVariant={toolbarStyle}
          />
        </div>
      </div>

      <Separator styleVariant={toolbarStyle} />

      {/* Lock/Unlock Walls and Ortho Snap moved to Wall Settings Panel */}

      <div style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: gridGap }}>
          <ToolButton
            icon={<UndoIcon />}
            label="Undo"
            active={false}
            onClick={onUndo}
            disabled={!canUndo}
            styleVariant={toolbarStyle}
          />
          <ToolButton
            icon={<RedoIcon />}
            label="Redo"
            active={false}
            onClick={onRedo}
            disabled={!canRedo}
            styleVariant={toolbarStyle}
          />
        </div>
      </div>
    </div>
  );
};

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  styleVariant?: ToolbarStyle;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, active, onClick, disabled = false, styleVariant = 'modern' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isWindows95 = styleVariant === 'windows95';
  const isFunk = styleVariant === 'funk';
  const isCyber = styleVariant === 'cyber';
  const isClean = styleVariant === 'clean';

  const handleMouseEnter = () => {
    if (disabled) return;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
  };

  const handleMouseDown = () => {
    if (disabled) return;
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  // Windows 95 beveled border styles
  const win95BorderRaised = `${win95Vars.borderLight} ${win95Vars.borderDark} ${win95Vars.borderDark} ${win95Vars.borderLight}`;
  const win95BorderInset = `${win95Vars.borderDark} ${win95Vars.borderLight} ${win95Vars.borderLight} ${win95Vars.borderDark}`;

  const getWin95ButtonStyle = (): React.CSSProperties => ({
    backgroundColor: win95Vars.bgColor,
    border: '2px solid',
    borderColor: (active || isPressed) ? win95BorderInset : win95BorderRaised,
    width: '38px',
    height: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: disabled ? '#808080' : win95Vars.textColor,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    padding: (active || isPressed) ? '2px 0 0 2px' : '0',
    opacity: disabled ? 0.5 : 1,
    transition: 'none', // Windows 95 had instant feedback
  });

  const getModernButtonStyle = (): React.CSSProperties => ({
    backgroundColor: active ? '#eef2ff' : (!disabled && isHovered ? '#f0f0f0' : 'transparent'),
    border: 'none',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    color: disabled ? '#b9b9b9' : active ? '#4338ca' : '#605E61',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    transition: 'background-color 0.2s ease, color 0.2s ease',
    opacity: disabled ? 0.5 : 1,
  });

  const getFunkButtonStyle = (): React.CSSProperties => ({
    backgroundColor: active ? funkVars.accentPink : funkVars.bgColor,
    border: `3px solid ${funkVars.borderColor}`,
    borderRadius: '4px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: active ? funkVars.bgColor : funkVars.textColor,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    transition: 'all 0.1s ease-out',
    opacity: disabled ? 0.5 : 1,
    transform: active || isPressed 
      ? 'translateY(2px) scale(0.98)' 
      : isHovered 
        ? 'translateY(-2px) scale(1.05)' 
        : 'none',
    boxShadow: active || isPressed 
      ? 'none' 
      : isHovered 
        ? `4px 4px 0 ${funkVars.accentYellow}` 
        : 'none',
  });

  const getCyberButtonStyle = (): React.CSSProperties => ({
    backgroundColor: active ? cyberVars.lineColor : 'transparent',
    border: `1px solid ${isHovered ? cyberVars.lineColor : cyberVars.lineDim}`,
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: active ? cyberVars.bgColor : cyberVars.lineColor,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    transition: 'all 0.15s ease',
    opacity: disabled ? 0.4 : 1,
    position: 'relative',
    boxShadow: isHovered && !active ? `0 0 10px ${cyberVars.glowColor}` : 'none',
  });

  const getCleanButtonStyle = (): React.CSSProperties => ({
    backgroundColor: active ? cleanVars.activeColor : 'transparent',
    border: 'none',
    borderRadius: '4px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: active ? cleanVars.bgColor : cleanVars.textColor,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    transition: 'opacity 0.2s ease, background-color 0.2s ease',
    opacity: disabled ? 0.3 : (isHovered && !active ? 0.6 : 1),
  });

  const getButtonStyle = () => {
    if (isClean) return getCleanButtonStyle();
    if (isCyber) return getCyberButtonStyle();
    if (isFunk) return getFunkButtonStyle();
    if (isWindows95) return getWin95ButtonStyle();
    return getModernButtonStyle();
  };

  const getTooltipStyle = (): React.CSSProperties => {
    if (isClean) {
      return {
        position: 'absolute',
        left: 'calc(100% + 8px)',
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: cleanVars.activeColor,
        color: cleanVars.bgColor,
        padding: '3px 8px',
        borderRadius: '3px',
        fontSize: '11px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 10000,
        fontFamily: cleanVars.fontFamily,
      };
    }
    if (isCyber) {
      return {
        position: 'absolute',
        left: 'calc(100% + 12px)',
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: cyberVars.paperColor,
        color: cyberVars.textColor,
        border: `1px solid ${cyberVars.lineColor}`,
        padding: '4px 8px',
        fontSize: '9px',
        fontWeight: 500,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 10000,
        fontFamily: cyberVars.fontFamily,
      };
    }
    if (isFunk) {
      return {
        position: 'absolute',
        left: '120%',
        top: '50%',
        transform: isHovered ? 'translateY(-50%) translateX(5px)' : 'translateY(-50%)',
        backgroundColor: funkVars.accentYellow,
        color: funkVars.textColor,
        border: `3px solid ${funkVars.borderColor}`,
        borderRadius: '4px',
        boxShadow: `3px 3px 0px ${funkVars.shadowColor}`,
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 10000,
        transition: 'transform 0.2s',
      };
    }
    if (isWindows95) {
      return {
        position: 'absolute',
        left: '105%',
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: win95Vars.tooltipBg,
        color: win95Vars.tooltipText,
        border: `1px solid ${win95Vars.textColor}`,
        padding: '2px 8px',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 10000,
      };
    }
    return {
      position: 'absolute',
      left: '50%',
      bottom: '100%',
      transform: 'translateX(-50%)',
      marginBottom: '6px',
      backgroundColor: '#2d2d2d',
      color: 'white',
      padding: '4px 10px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      zIndex: 10000,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    };
  };

  return (
    <div
      style={isWindows95 || isFunk || isCyber || isClean
        ? { position: 'relative' }
        : { position: 'relative', width: '100%', aspectRatio: '1 / 1' }
      }
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          onClick();
        }}
        disabled={disabled}
        style={getButtonStyle()}
      >
        {icon}
        {/* Cyber corner notch */}
        {isCyber && (
          <span style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '6px',
            height: '6px',
            borderLeft: `1px solid ${cyberVars.lineDim}`,
            borderBottom: `1px solid ${cyberVars.lineDim}`,
          }} />
        )}
        {/* Cyber active indicator */}
        {isCyber && active && (
          <span style={{
            position: 'absolute',
            bottom: '3px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '4px',
            height: '4px',
            backgroundColor: cyberVars.accentOrange,
            borderRadius: '50%',
          }} />
        )}
      </button>
      {isHovered && !disabled && (
        <div style={getTooltipStyle()}>
          {label}
        </div>
      )}
    </div>
  );
};

interface SeparatorProps {
  styleVariant?: ToolbarStyle;
}

const Separator: React.FC<SeparatorProps> = ({ styleVariant = 'modern' }) => {
  const isWindows95 = styleVariant === 'windows95';
  const isFunk = styleVariant === 'funk';
  const isCyber = styleVariant === 'cyber';
  const isClean = styleVariant === 'clean';
  
  if (isClean) {
    return (
      <div
        style={{
          width: '100%',
          height: '1px',
          backgroundColor: cleanVars.separatorColor,
          margin: '2px 0',
        }}
      />
    );
  }
  
  if (isCyber) {
    return (
      <div
        style={{
          height: '0',
          borderTop: `1px dashed ${cyberVars.lineDim}`,
          margin: '4px 0',
          position: 'relative',
        }}
      >
        <span style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: cyberVars.paperColor,
          color: cyberVars.lineDim,
          fontSize: '8px',
          padding: '0 4px',
        }}>—</span>
      </div>
    );
  }
  
  if (isFunk) {
    return (
      <div
        style={{
          height: '3px',
          background: `linear-gradient(to right, ${funkVars.accentCyan} 33%, ${funkVars.accentPink} 33%, ${funkVars.accentPink} 66%, ${funkVars.accentYellow} 66%)`,
          backgroundSize: '15px 3px',
          borderTop: `3px solid ${funkVars.borderColor}`,
          borderBottom: `3px solid ${funkVars.borderColor}`,
          margin: '6px 0',
        }}
      />
    );
  }
  
  if (isWindows95) {
    return (
      <div
        style={{
          height: '2px',
          backgroundColor: win95Vars.bgColor,
          borderBottom: `2px solid ${win95Vars.borderLight}`,
          borderTop: `2px solid ${win95Vars.borderDark}`,
          margin: '4px 0',
        }}
      />
    );
  }
  
  return (
    <div
      style={{
        width: '80%',
        height: '1px',
        backgroundColor: '#e0e0e0',
        margin: '4px 0',
      }}
    />
  );
};

interface ExpanderProps {
  expanded: boolean;
  onClick: () => void;
  styleVariant?: ToolbarStyle;
}

const Expander: React.FC<ExpanderProps> = ({ expanded, onClick, styleVariant = 'modern' }) => {
  const isWindows95 = styleVariant === 'windows95';
  const isFunk = styleVariant === 'funk';
  const isCyber = styleVariant === 'cyber';
  const isClean = styleVariant === 'clean';
  
  const getExpanderStyle = (): React.CSSProperties => {
    if (isClean) {
      return {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 0',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '2px',
        transition: 'opacity 0.2s ease',
      };
    }
    if (isCyber) {
      return {
        background: 'transparent',
        border: `1px dashed ${cyberVars.lineDim}`,
        cursor: 'pointer',
        padding: '2px 0',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '4px',
        transition: 'all 0.15s ease',
        color: cyberVars.lineColor,
        fontSize: '8px',
        letterSpacing: '1px',
      };
    }
    if (isFunk) {
      return {
        background: funkVars.bgColor,
        border: `2px solid ${funkVars.borderColor}`,
        borderRadius: '4px',
        cursor: 'pointer',
        padding: '2px 0',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '4px',
        transition: 'all 0.1s ease-out',
      };
    }
    if (isWindows95) {
      return {
        background: win95Vars.bgColor,
        border: '2px solid',
        borderColor: `${win95Vars.borderLight} ${win95Vars.borderDark} ${win95Vars.borderDark} ${win95Vars.borderLight}`,
        cursor: 'pointer',
        padding: '2px 0',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '2px',
      };
    }
    return {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '2px 0',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
    };
  };
  
  return (
    <button
      onClick={onClick}
      style={getExpanderStyle()}
      onMouseEnter={(e) => {
        if (isClean) {
          e.currentTarget.style.opacity = '0.6';
        } else if (isCyber) {
          e.currentTarget.style.borderStyle = 'solid';
          e.currentTarget.style.backgroundColor = 'rgba(77, 166, 255, 0.1)';
        } else if (isFunk) {
          e.currentTarget.style.boxShadow = `2px 2px 0 ${funkVars.accentYellow}`;
          e.currentTarget.style.transform = 'translateY(-1px)';
        } else if (!isWindows95) {
          e.currentTarget.style.backgroundColor = '#f5f5f5';
        }
      }}
      onMouseLeave={(e) => {
        if (isClean) {
          e.currentTarget.style.opacity = '1';
        } else if (isCyber) {
          e.currentTarget.style.borderStyle = 'dashed';
          e.currentTarget.style.backgroundColor = 'transparent';
        } else if (isFunk) {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'none';
        } else if (!isWindows95) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        style={{
          transition: (isWindows95 || isCyber || isClean) ? 'none' : 'transform 0.2s ease',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
      >
        <path
          d="M 3 5 L 7 9 L 11 5"
          fill="none"
          stroke={isClean ? cleanVars.textSecondary : isCyber ? cyberVars.lineColor : isFunk ? funkVars.textColor : isWindows95 ? win95Vars.textColor : '#b0b0b0'}
          strokeWidth={isFunk ? '2.5' : '1.5'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
};

