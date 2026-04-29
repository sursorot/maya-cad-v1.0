import { ChevronUp, Info, Grid3x3, Square, PencilRuler, Magnet, Infinity as InfinityIcon, Disc, MousePointerClick, MapPin, Palette, Ruler, AlignVerticalJustifyCenter } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { SnappingMenu } from './Workspace/components/SnappingMenu';
import { MeasurementMenu } from './Workspace/components/MeasurementMenu';
import type { SnapSettings, MeasurementSettings, ToolbarStyle } from './Workspace/types';
import { formatLength } from './Workspace/utils/measurements';
import { DataModeToggle } from './DataMode/DataModeToggle';
import { useTheme } from '../theme/useTheme';
import { ZoomControls } from './Footer/index';

type LengthUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft' | 'ft-in';
type DrawingMode = 'one-time' | 'chain';

interface FooterProps {
  canvasOpen?: boolean;
  scale?: number;
  viewBoxWidth?: number;
  containerWidth?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  showToolbar?: boolean;
  onToggleToolbar?: () => void;
  toolbarStyle?: ToolbarStyle;
  onToolbarStyleChange?: (style: ToolbarStyle) => void;
  showMeasurements?: boolean;
  onToggleMeasurements?: () => void;
  measurementSettings?: MeasurementSettings;
  onMeasurementSettingsChange?: (settings: Partial<MeasurementSettings>) => void;
  lengthUnit?: LengthUnit;
  onLengthUnitChange?: (unit: LengthUnit) => void;
  snapSettings?: SnapSettings;
  onSnapSettingsChange?: (settings: Partial<SnapSettings>) => void;
  drawingMode?: DrawingMode;
  onToggleDrawingMode?: () => void;
  dataModeEnabled?: boolean;
  onDataModeChange?: (enabled: boolean) => void;
  showCompass?: boolean;
  onToggleCompass?: () => void;
  zoneHoverEnabled?: boolean;
  onToggleZoneHover?: (enabled: boolean) => void;
  showMarkers?: boolean;
  onToggleMarkers?: () => void;
  alignmentGuidesEnabled?: boolean;
  onToggleAlignmentGuides?: () => void;
}

// Legacy theme objects - being migrated to centralized theme system
// These are kept temporarily for backward compatibility
const win95 = {
  bgColor: '#c0c0c0',
  textColor: '#000000',
  borderLight: '#ffffff',
  borderDark: '#808080',
  borderDarker: '#404040',
  activeColor: '#000080',
  fontFamily: "'Tahoma', 'Verdana', 'Arial', sans-serif",
};

const funk = {
  bgColor: '#ffffff',
  textColor: '#1e1e1e',
  borderColor: '#1e1e1e',
  accentPink: '#ff69b4',
  accentCyan: '#00f0ff',
  accentYellow: '#f9c500',
  shadowColor: '#1e1e1e',
  fontFamily: "'Inter', sans-serif",
};

const cyber = {
  bgColor: '#0a2540',
  paperColor: '#0d2f4d',
  lineColor: '#4da6ff',
  lineDim: '#2d7acc',
  textColor: '#e8f4ff',
  accentOrange: '#ff6b35',
  glowColor: 'rgba(77, 166, 255, 0.4)',
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
};

const clean = {
  bgColor: '#ffffff',
  textColor: '#000000',
  textSecondary: '#6c6c6c',
  borderColor: '#000000',
  separatorColor: '#e0e0e0',
  activeColor: '#000000',
  fontFamily: "'IBM Plex Mono', monospace",
};

export default function Footer({
  canvasOpen,
  scale = 1,
  viewBoxWidth,
  containerWidth,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  showGrid = true,
  onToggleGrid,
  showToolbar = false,
  onToggleToolbar,
  toolbarStyle = 'modern',
  onToolbarStyleChange,
  showMeasurements = true,
  onToggleMeasurements,
  measurementSettings,
  onMeasurementSettingsChange,
  lengthUnit = 'ft-in',
  onLengthUnitChange,
  snapSettings,
  onSnapSettingsChange,
  drawingMode = 'one-time',
  onToggleDrawingMode,
  dataModeEnabled = false,
  onDataModeChange,
  showCompass = false,
  onToggleCompass,
  zoneHoverEnabled = true,
  onToggleZoneHover,
  showMarkers = true,
  onToggleMarkers,
  alignmentGuidesEnabled = true,
  onToggleAlignmentGuides,
}: FooterProps) {
  // Use centralized theme system
  const { isWindows95, isFunk, isCyber, isClean, win95RaisedBorder, win95InsetBorder } = useTheme(toolbarStyle);
  
  const [showUnits, setShowUnits] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showSnapMenu, setShowSnapMenu] = useState(false);
  const [showMeasurementMenu, setShowMeasurementMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const snapMenuRef = useRef<HTMLDivElement>(null);
  const measurementMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowUnits(false);
      }
      if (infoRef.current && !infoRef.current.contains(target)) {
        setShowInfo(false);
      }

      // For portaled menus, check if click is inside the trigger OR the portaled menu content
      // The menu content has a data attribute we can check
      const clickedElement = event.target as HTMLElement;
      const isInsideSnapMenu = clickedElement.closest('[data-menu-type="snap"]');
      const isInsideMeasurementMenu = clickedElement.closest('[data-menu-type="measurement"]');

      if (snapMenuRef.current && !snapMenuRef.current.contains(target) && !isInsideSnapMenu) {
        setShowSnapMenu(false);
      }
      if (measurementMenuRef.current && !measurementMenuRef.current.contains(target) && !isInsideMeasurementMenu) {
        setShowMeasurementMenu(false);
      }
    };

    if (showUnits || showInfo || showSnapMenu || showMeasurementMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUnits, showInfo, showSnapMenu, showMeasurementMenu]);

  // Professional CAD measurement (like AutoCAD status bar)
  const getScaleMeasurement = () => {
    // Model Space: ruler shows actual model dimensions
    // The 50px ruler represents how many meters in the MODEL at current zoom

    // In our system: 1 SVG unit = 1 meter in model space
    // To calculate how many meters the 50px ruler represents, we need to know
    // the actual pixels per meter, which depends on screen width and viewBox width

    const rulerScreenWidth = 50; // pixels on screen (actual SVG width)

    // If we have viewBoxWidth, we can calculate accurately
    // Otherwise, fall back to the old calculation (which was incorrect)
    let metersInModel: number;

    if (viewBoxWidth !== undefined && viewBoxWidth > 0 && containerWidth !== undefined && containerWidth > 0) {
      // Calculate actual pixels per meter: containerWidth / viewBoxWidth
      const pixelsPerMeter = containerWidth / viewBoxWidth;

      // Calculate meters represented by the ruler: rulerPixels / pixelsPerMeter
      metersInModel = rulerScreenWidth / pixelsPerMeter;
    } else if (viewBoxWidth !== undefined && viewBoxWidth > 0) {
      // Fallback: estimate container width if not provided
      const estimatedScreenWidth = typeof window !== 'undefined' ? window.innerWidth * 0.6 : 1200;
      const pixelsPerMeter = estimatedScreenWidth / viewBoxWidth;
      metersInModel = rulerScreenWidth / pixelsPerMeter;
    } else {
      // Fallback: use the old calculation (incorrect but better than nothing)
      // This assumes a fixed relationship that doesn't account for actual screen size
      const pixelsPerMeter = 40; // base calibration (incorrect assumption)
      metersInModel = rulerScreenWidth / (pixelsPerMeter * scale);
    }

    // Use shared formatting utility for consistency
    return formatLength(metersInModel, lengthUnit);
  };

  const unitLabels: Record<LengthUnit, string> = {
    'mm': 'Millimeters',
    'cm': 'Centimeters',
    'm': 'Meters',
    'in': 'Inches',
    'ft': 'Feet',
    'ft-in': 'Feet/inches'
  };

  // Note: isWindows95, isFunk, isCyber, isClean, win95RaisedBorder, win95InsetBorder 
  // are provided by useTheme hook above
  const win95Raised = win95RaisedBorder;
  const win95Inset = win95InsetBorder;

  // Common button style for Win95
  const getWin95ButtonStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '22px',
    backgroundColor: win95.bgColor,
    border: '2px solid',
    borderColor: active ? win95Inset : win95Raised,
    cursor: 'pointer',
    padding: active ? '1px 0 0 1px' : '0',
    flexShrink: 0,
  });

  // Modern button style
  const getModernButtonStyle = (active: boolean): React.CSSProperties => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '20px',
    backgroundColor: active ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${active ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)'}`,
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.15s',
    flexShrink: 0,
  });

  // Funk button style
  const getFunkButtonStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '26px',
    height: '22px',
    backgroundColor: active ? funk.accentPink : funk.bgColor,
    border: `2px solid ${funk.borderColor}`,
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'all 0.1s ease-out',
    flexShrink: 0,
  });

  // Cyber button style
  const getCyberButtonStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '26px',
    height: '22px',
    backgroundColor: active ? cyber.lineColor : 'transparent',
    border: `1px solid ${cyber.lineDim}`,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  });

  // Clean button style
  const getCleanButtonStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    height: '20px',
    backgroundColor: active ? clean.activeColor : 'transparent',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease, background-color 0.2s ease',
    flexShrink: 0,
  });

  // Get button style based on current theme
  const getButtonStyle = (active: boolean): React.CSSProperties => {
    if (isClean) return getCleanButtonStyle(active);
    if (isCyber) return getCyberButtonStyle(active);
    if (isFunk) return getFunkButtonStyle(active);
    if (isWindows95) return getWin95ButtonStyle(active);
    return getModernButtonStyle(active);
  };

  const getFooterStyle = (): React.CSSProperties | undefined => {
    if (isClean) {
      return {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 12px',
        backgroundColor: clean.bgColor,
        borderTop: `2px solid ${clean.borderColor}`,
        fontFamily: clean.fontFamily,
        fontSize: '11px',
        height: '32px',
        boxSizing: 'border-box',
      };
    }
    if (isCyber) {
      return {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 16px',
        backgroundColor: cyber.paperColor,
        borderTop: `2px solid ${cyber.lineColor}`,
        fontFamily: cyber.fontFamily,
        fontSize: '10px',
        height: '32px',
        boxSizing: 'border-box',
      };
    }
    if (isFunk) {
      return {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 8px',
        backgroundColor: funk.bgColor,
        borderTop: `3px solid ${funk.borderColor}`,
        fontFamily: funk.fontFamily,
        fontSize: '12px',
        height: '32px',
        boxSizing: 'border-box',
        boxShadow: `0 -4px 0 ${funk.accentCyan}`,
      };
    }
    if (isWindows95) {
      return {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '2px 4px',
        backgroundColor: win95.bgColor,
        borderTop: `2px solid ${win95.borderLight}`,
        fontFamily: win95.fontFamily,
        fontSize: '12px',
        height: '28px',
        boxSizing: 'border-box',
      };
    }
    return undefined;
  };

  return (
    <footer 
      className={(isWindows95 || isFunk || isCyber || isClean) ? undefined : "app-footer"}
      style={getFooterStyle()}
    >
      <div className="footer-left" style={{ display: 'flex', gap: isClean ? '4px' : (isWindows95 || isFunk || isCyber) ? '4px' : '6px', alignItems: 'center' }}>
        {canvasOpen && (
          <>
            {/* Grid toggle */}
            <div
              onClick={onToggleGrid}
              style={getButtonStyle(showGrid)}
              onMouseEnter={(e) => {
                if (isClean) {
                  if (!showGrid) e.currentTarget.style.opacity = '0.6';
                } else if (isCyber) {
                  e.currentTarget.style.borderColor = cyber.lineColor;
                  e.currentTarget.style.boxShadow = `0 0 8px ${cyber.glowColor}`;
                } else if (isFunk) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                } else if (!isWindows95) {
                e.currentTarget.style.backgroundColor = showGrid ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (isClean) {
                  e.currentTarget.style.opacity = '1';
                } else if (isCyber) {
                  e.currentTarget.style.borderColor = cyber.lineDim;
                  e.currentTarget.style.boxShadow = 'none';
                } else if (isFunk) {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                } else if (!isWindows95) {
                e.currentTarget.style.backgroundColor = showGrid ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)';
                }
              }}
              title={showGrid ? 'Hide Grid' : 'Show Grid'}
            >
              {showGrid ? (
                <Grid3x3
                  size={14}
                  style={{
                    color: isClean ? (showGrid ? clean.bgColor : clean.textColor) : isCyber ? (showGrid ? cyber.bgColor : cyber.lineColor) : isFunk ? (showGrid ? funk.bgColor : funk.textColor) : isWindows95 ? win95.textColor : '#FFFFFF',
                    strokeWidth: 2
                  }}
                />
              ) : (
                <Square
                  size={14}
                  fill={isClean ? clean.textSecondary : isCyber ? cyber.lineDim : isFunk ? funk.borderColor : isWindows95 ? win95.borderDark : 'rgba(255, 255, 255, 0.6)'}
                  style={{
                    color: isClean ? clean.textColor : isCyber ? cyber.lineColor : isFunk ? funk.textColor : isWindows95 ? win95.textColor : '#FFFFFF',
                    strokeWidth: 2
                  }}
                />
              )}
            </div>

            {/* Toolbar toggle */}
            <div
              onClick={onToggleToolbar}
              style={getButtonStyle(showToolbar)}
              onMouseEnter={(e) => {
                if (isClean) {
                  if (!showToolbar) e.currentTarget.style.opacity = '0.6';
                } else if (isCyber) {
                  e.currentTarget.style.borderColor = cyber.lineColor;
                  e.currentTarget.style.boxShadow = `0 0 8px ${cyber.glowColor}`;
                } else if (isFunk) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                } else if (!isWindows95) {
                  e.currentTarget.style.backgroundColor = showToolbar ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (isClean) {
                  e.currentTarget.style.opacity = '1';
                } else if (isCyber) {
                  e.currentTarget.style.borderColor = cyber.lineDim;
                  e.currentTarget.style.boxShadow = 'none';
                } else if (isFunk) {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                } else if (!isWindows95) {
                  e.currentTarget.style.backgroundColor = showToolbar ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)';
                }
              }}
              title={showToolbar ? 'Hide Toolbar' : 'Show Toolbar'}
            >
              <PencilRuler
                size={14}
              style={{
                  color: isClean ? (showToolbar ? clean.bgColor : clean.textColor) : isCyber ? (showToolbar ? cyber.bgColor : cyber.lineColor) : isFunk ? (showToolbar ? funk.bgColor : funk.textColor) : isWindows95 ? win95.textColor : '#FFFFFF',
                  strokeWidth: 2
                }}
              />
            </div>

            {/* Markers toggle */}
            <div
              onClick={onToggleMarkers}
              style={getButtonStyle(showMarkers)}
              onMouseEnter={(e) => {
                if (isClean) {
                  if (!showMarkers) e.currentTarget.style.opacity = '0.6';
                } else if (isCyber) {
                  e.currentTarget.style.borderColor = cyber.lineColor;
                  e.currentTarget.style.boxShadow = `0 0 8px ${cyber.glowColor}`;
                } else if (isFunk) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                } else if (!isWindows95) {
                  e.currentTarget.style.backgroundColor = showMarkers ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (isClean) {
                  e.currentTarget.style.opacity = '1';
                } else if (isCyber) {
                  e.currentTarget.style.borderColor = cyber.lineDim;
                  e.currentTarget.style.boxShadow = 'none';
                } else if (isFunk) {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                } else if (!isWindows95) {
                  e.currentTarget.style.backgroundColor = showMarkers ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)';
                }
              }}
              title={showMarkers ? 'Hide Markers' : 'Show Markers'}
            >
              <MapPin
                size={14}
                style={{
                  color: isClean ? (showMarkers ? clean.bgColor : clean.textColor) : isCyber ? (showMarkers ? cyber.bgColor : cyber.lineColor) : isFunk ? (showMarkers ? funk.bgColor : funk.textColor) : isWindows95 ? win95.textColor : '#FFFFFF',
                  strokeWidth: 2
                }}
              />
            </div>

            {/* Toolbar Style toggle */}
            {onToolbarStyleChange && (
              <div
                onClick={() => {
                  const styles: ToolbarStyle[] = ['modern', 'windows95', 'funk', 'cyber', 'clean'];
                  const currentIndex = styles.indexOf(toolbarStyle);
                  const nextIndex = (currentIndex + 1) % styles.length;
                  onToolbarStyleChange(styles[nextIndex]);
                }}
                style={isClean ? {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '55px',
                  height: '20px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  padding: '0 6px',
                  gap: '4px',
                  transition: 'opacity 0.2s ease',
                } : isCyber ? {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                  minWidth: '60px',
                  height: '22px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${cyber.lineDim}`,
                  cursor: 'pointer',
                  flexShrink: 0,
                  padding: '0 6px',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                } : isFunk ? {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '60px',
                  height: '22px',
                  backgroundColor: funk.bgColor,
                  border: `2px solid ${funk.borderColor}`,
                  borderRadius: '3px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  padding: '0 6px',
                  gap: '4px',
                  transition: 'all 0.1s ease-out',
                } : isWindows95 ? {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '60px',
                  height: '22px',
                  backgroundColor: win95.bgColor,
                  border: '2px solid',
                  borderColor: win95Raised,
                  cursor: 'pointer',
                  flexShrink: 0,
                  padding: '0 6px',
                  gap: '4px',
                } : {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '60px',
                height: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                  flexShrink: 0,
                  padding: '0 6px',
                  gap: '4px',
              }}
              onMouseEnter={(e) => {
                  if (isClean) {
                    e.currentTarget.style.opacity = '0.6';
                  } else if (isCyber) {
                    e.currentTarget.style.borderColor = cyber.lineColor;
                    e.currentTarget.style.boxShadow = `0 0 8px ${cyber.glowColor}`;
                  } else if (isFunk) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                  } else if (!isWindows95) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                  }
              }}
              onMouseLeave={(e) => {
                  if (isClean) {
                    e.currentTarget.style.opacity = '1';
                  } else if (isCyber) {
                    e.currentTarget.style.borderColor = cyber.lineDim;
                    e.currentTarget.style.boxShadow = 'none';
                  } else if (isFunk) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  } else if (!isWindows95) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  }
                }}
                title={`UI Style: ${toolbarStyle === 'modern' ? 'Modern' : toolbarStyle === 'windows95' ? 'Windows 95' : toolbarStyle === 'funk' ? 'Funk' : toolbarStyle === 'cyber' ? 'Cyber' : 'Clean'} (Click to toggle)`}
              >
                <Palette
                  size={12}
                style={{
                    color: isClean ? clean.textColor : isCyber ? cyber.lineColor : isFunk ? funk.textColor : isWindows95 ? win95.textColor : '#FFFFFF',
                  strokeWidth: 2
                }}
              />
                <span style={{
                  color: isClean ? clean.textColor : isCyber ? cyber.textColor : isFunk ? funk.textColor : isWindows95 ? win95.textColor : '#FFFFFF',
                  fontSize: isClean ? '11px' : (isWindows95 || isFunk || isCyber) ? '11px' : '0.65rem',
                  fontWeight: isClean ? 500 : isCyber ? 500 : isFunk ? 600 : isWindows95 ? 'normal' : 500,
                  textTransform: 'uppercase',
                  letterSpacing: isCyber ? '1px' : '0.02em',
                }}>
                  {toolbarStyle === 'modern' ? 'Modern' : toolbarStyle === 'windows95' ? 'Win95' : toolbarStyle === 'funk' ? 'Funk' : toolbarStyle === 'cyber' ? 'Cyber' : 'Clean'}
                </span>
            </div>
            )}
          </>
        )}
      </div>
      <div className="footer-right" style={{ display: 'flex', alignItems: 'center', gap: isClean ? '4px' : (isWindows95 || isFunk || isCyber) ? '4px' : '8px' }}>
        {canvasOpen && (
          <>
            {/* Plot Scale Selector removed - can be re-added for printing features */}
            {/* Model Space is always 1:1 full scale */}

            {/* Drawing mode toggle */}
            <div
              style={isClean ? {
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                backgroundColor: clean.bgColor,
                border: `1px solid ${clean.separatorColor}`,
                borderRadius: '3px',
                padding: '2px',
                flexShrink: 0,
                height: '20px',
              } : isFunk ? {
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                backgroundColor: funk.bgColor,
                border: `2px solid ${funk.borderColor}`,
                borderRadius: '3px',
                padding: '2px',
                flexShrink: 0,
                height: '22px',
              } : isWindows95 ? {
                display: 'flex',
                alignItems: 'center',
                gap: '0px',
                backgroundColor: win95.bgColor,
                border: '2px solid',
                borderColor: win95Inset,
                padding: '1px',
                flexShrink: 0,
                height: '22px',
              } : {
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '3px',
                padding: '2px',
                flexShrink: 0,
                height: '20px',
              }}
            >
              {/* One-time mode button */}
              <div
                onClick={onToggleDrawingMode}
                style={isClean ? {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '16px',
                  backgroundColor: drawingMode === 'one-time' ? clean.activeColor : 'transparent',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                } : isFunk ? {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '16px',
                  backgroundColor: drawingMode === 'one-time' ? funk.accentPink : 'transparent',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease-out',
                  flexShrink: 0,
                } : isWindows95 ? {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '16px',
                  backgroundColor: drawingMode === 'one-time' ? win95.activeColor : 'transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                } : {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '16px',
                  backgroundColor: drawingMode === 'one-time' ? 'rgba(255, 255, 255, 0.35)' : 'transparent',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isWindows95 && !isFunk && !isClean && drawingMode !== 'one-time') {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  } else if (isClean && drawingMode !== 'one-time') {
                    e.currentTarget.style.backgroundColor = clean.separatorColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isWindows95 && !isFunk && !isClean && drawingMode !== 'one-time') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  } else if (isClean && drawingMode !== 'one-time') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                title="One-time Mode: Tool deselects after use"
              >
                <Disc
                  size={12}
                  style={{
                    color: isClean
                      ? (drawingMode === 'one-time' ? clean.bgColor : clean.textColor)
                      : isFunk
                      ? (drawingMode === 'one-time' ? funk.bgColor : funk.textColor)
                      : isWindows95 
                        ? (drawingMode === 'one-time' ? '#FFFFFF' : win95.textColor)
                        : (drawingMode === 'one-time' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'),
                    strokeWidth: 2,
                    transition: (isWindows95 || isFunk || isClean) ? 'none' : 'color 0.15s',
                  }}
                />
              </div>

              {/* Chain mode button */}
              <div
                onClick={onToggleDrawingMode}
                style={isClean ? {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '16px',
                  backgroundColor: drawingMode === 'chain' ? clean.activeColor : 'transparent',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                } : isFunk ? {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '16px',
                  backgroundColor: drawingMode === 'chain' ? funk.accentPink : 'transparent',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease-out',
                  flexShrink: 0,
                } : isWindows95 ? {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '16px',
                  backgroundColor: drawingMode === 'chain' ? win95.activeColor : 'transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                } : {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '16px',
                  backgroundColor: drawingMode === 'chain' ? 'rgba(255, 255, 255, 0.35)' : 'transparent',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isWindows95 && !isFunk && !isClean && drawingMode !== 'chain') {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  } else if (isClean && drawingMode !== 'chain') {
                    e.currentTarget.style.backgroundColor = clean.separatorColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isWindows95 && !isFunk && !isClean && drawingMode !== 'chain') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  } else if (isClean && drawingMode !== 'chain') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                title="Chain Mode: Draw multiple objects"
              >
                <InfinityIcon
                  size={12}
                  style={{
                    color: isClean
                      ? (drawingMode === 'chain' ? clean.bgColor : clean.textColor)
                      : isFunk
                      ? (drawingMode === 'chain' ? funk.bgColor : funk.textColor)
                      : isWindows95 
                        ? (drawingMode === 'chain' ? '#FFFFFF' : win95.textColor)
                        : (drawingMode === 'chain' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'),
                    strokeWidth: 2,
                    transition: (isWindows95 || isFunk || isClean) ? 'none' : 'color 0.15s',
                  }}
                />
              </div>
            </div>

            {/* Measurements toggle */}
            <div ref={measurementMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
              {showMeasurementMenu && measurementSettings && onMeasurementSettingsChange && (
                <MeasurementMenu
                  measurementSettings={measurementSettings}
                  onMeasurementSettingsChange={onMeasurementSettingsChange}
                  onClose={() => setShowMeasurementMenu(false)}
                  triggerRef={measurementMenuRef}
                />
              )}
              <div
                onClick={(event) => {
                  if (event.shiftKey) {
                    onToggleMeasurements?.();
                    return;
                  }
                  setShowMeasurementMenu((prev) => !prev);
                }}
                style={getButtonStyle(showMeasurements)}
                onMouseEnter={(e) => {
                  if (isClean) {
                    e.currentTarget.style.opacity = '0.6';
                  } else if (isFunk) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                  } else if (!isWindows95) {
                  e.currentTarget.style.backgroundColor = showMeasurements ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isClean) {
                    e.currentTarget.style.opacity = '1';
                  } else if (isFunk) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  } else if (!isWindows95) {
                  e.currentTarget.style.backgroundColor = showMeasurements ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                title={
                  showMeasurements
                    ? 'Measurement Settings (Shift+Click to toggle visibility)'
                    : 'Measurement Settings (Shift+Click to toggle visibility)'
                }
              >
                <Ruler
                  size={14}
                  style={{
                    color: isClean
                      ? (showMeasurements ? clean.bgColor : clean.textColor)
                      : isFunk
                      ? (showMeasurements ? funk.bgColor : funk.textColor)
                      : isWindows95 
                        ? (showMeasurements ? win95.textColor : win95.borderDark)
                        : (showMeasurements ? '#FFFFFF' : '#B0B0B0'),
                    strokeWidth: 2,
                    transition: (isWindows95 || isFunk || isClean) ? 'none' : 'color 0.15s',
                  }}
                />
              </div>
            </div>

            {/* Snapping toggle */}
            <div ref={snapMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
              {showSnapMenu && snapSettings && onSnapSettingsChange && (
                <SnappingMenu
                  snapSettings={snapSettings}
                  onSnapSettingsChange={onSnapSettingsChange}
                  onClose={() => setShowSnapMenu(false)}
                  triggerRef={snapMenuRef}
                />
              )}
              <div
                onClick={() => setShowSnapMenu(!showSnapMenu)}
                style={getButtonStyle(snapSettings?.enabled ?? false)}
                onMouseEnter={(e) => {
                  if (isClean) {
                    e.currentTarget.style.opacity = '0.6';
                  } else if (isFunk) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                  } else if (!isWindows95) {
                  e.currentTarget.style.backgroundColor = snapSettings?.enabled ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isClean) {
                    e.currentTarget.style.opacity = '1';
                  } else if (isFunk) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  } else if (!isWindows95) {
                  e.currentTarget.style.backgroundColor = snapSettings?.enabled ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                title={snapSettings?.enabled ? 'Snapping: ON (⌘P)' : 'Snapping: OFF (⌘P)'}
              >
                <Magnet
                  size={14}
                  style={{
                    color: isClean
                      ? (snapSettings?.enabled ? clean.bgColor : clean.textColor)
                      : isFunk
                      ? (snapSettings?.enabled ? funk.bgColor : funk.textColor)
                      : isWindows95 
                        ? (snapSettings?.enabled ? win95.textColor : win95.borderDark)
                        : (snapSettings?.enabled ? '#FFFFFF' : '#B0B0B0'),
                    strokeWidth: 2,
                    transition: (isWindows95 || isFunk || isClean) ? 'none' : 'color 0.15s',
                  }}
                />
              </div>
            </div>

            {/* Zone hover toggle */}
            <div
              style={getButtonStyle(zoneHoverEnabled)}
              onClick={() => onToggleZoneHover?.(!zoneHoverEnabled)}
              onMouseEnter={(e) => {
                if (isClean) {
                  e.currentTarget.style.opacity = '0.6';
                } else if (isCyber) {
                  e.currentTarget.style.borderColor = cyber.lineColor;
                  e.currentTarget.style.boxShadow = `0 0 8px ${cyber.glowColor}`;
                } else if (isFunk) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                } else if (!isWindows95) {
                  e.currentTarget.style.backgroundColor = zoneHoverEnabled ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (isCyber) {
                  e.currentTarget.style.borderColor = cyber.lineDim;
                  e.currentTarget.style.boxShadow = 'none';
                } else if (isClean) {
                  e.currentTarget.style.opacity = '1';
                } else if (isFunk) {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                } else if (!isWindows95) {
                  e.currentTarget.style.backgroundColor = zoneHoverEnabled ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)';
                }
              }}
              title={zoneHoverEnabled ? 'Zone Hover: ON (show preview & quick-create zones)' : 'Zone Hover: OFF'}
            >
              <MousePointerClick
                size={14}
                style={{
                  color: isClean
                    ? (zoneHoverEnabled ? clean.bgColor : clean.textColor)
                    : isFunk
                    ? (zoneHoverEnabled ? funk.bgColor : funk.textColor)
                    : isWindows95
                      ? (zoneHoverEnabled ? win95.textColor : win95.borderDark)
                      : (zoneHoverEnabled ? '#FFFFFF' : '#B0B0B0'),
                  strokeWidth: 2,
                  transition: (isWindows95 || isFunk || isClean) ? 'none' : 'color 0.15s',
                }}
              />
            </div>

            {/* Alignment Guides toggle */}
            <div
              style={getButtonStyle(alignmentGuidesEnabled)}
              onClick={onToggleAlignmentGuides}
              onMouseEnter={(e) => {
                if (isClean) {
                  e.currentTarget.style.opacity = '0.6';
                } else if (isCyber) {
                  e.currentTarget.style.borderColor = cyber.lineColor;
                  e.currentTarget.style.boxShadow = `0 0 8px ${cyber.glowColor}`;
                } else if (isFunk) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                } else if (!isWindows95) {
                  e.currentTarget.style.backgroundColor = alignmentGuidesEnabled ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (isClean) {
                  e.currentTarget.style.opacity = '1';
                } else if (isCyber) {
                  e.currentTarget.style.borderColor = cyber.lineDim;
                  e.currentTarget.style.boxShadow = 'none';
                } else if (isFunk) {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                } else if (!isWindows95) {
                  e.currentTarget.style.backgroundColor = alignmentGuidesEnabled ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)';
                }
              }}
              title={alignmentGuidesEnabled ? 'Smart Guides: ON (show alignment guides when dragging)' : 'Smart Guides: OFF'}
            >
              <AlignVerticalJustifyCenter
                size={14}
                style={{
                  color: isClean
                    ? (alignmentGuidesEnabled ? clean.bgColor : clean.textColor)
                    : isFunk
                    ? (alignmentGuidesEnabled ? funk.bgColor : funk.textColor)
                    : isWindows95
                      ? (alignmentGuidesEnabled ? win95.textColor : win95.borderDark)
                      : (alignmentGuidesEnabled ? '#FFFFFF' : '#B0B0B0'),
                  strokeWidth: 2,
                  transition: (isWindows95 || isFunk || isClean) ? 'none' : 'color 0.15s',
                }}
              />
            </div>

            {/* Data Mode Toggle - for training data collection */}
            {onDataModeChange && (
              <DataModeToggle
                enabled={dataModeEnabled}
                onChange={onDataModeChange}
              />
            )}

            {/* Compass toggle */}
            {onToggleCompass && (
              <div
                onClick={onToggleCompass}
                style={getButtonStyle(showCompass)}
                onMouseEnter={(e) => {
                  if (isClean) {
                    e.currentTarget.style.opacity = '0.6';
                  } else if (isCyber) {
                    e.currentTarget.style.borderColor = cyber.lineColor;
                    e.currentTarget.style.boxShadow = `0 0 8px ${cyber.glowColor}`;
                  } else if (isFunk) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                  } else if (!isWindows95) {
                    e.currentTarget.style.backgroundColor = showCompass ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isClean) {
                    e.currentTarget.style.opacity = '1';
                  } else if (isCyber) {
                    e.currentTarget.style.borderColor = cyber.lineDim;
                    e.currentTarget.style.boxShadow = 'none';
                  } else if (isFunk) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  } else if (!isWindows95) {
                    e.currentTarget.style.backgroundColor = showCompass ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                title={showCompass ? 'Hide Compass' : 'Show Compass'}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isClean ? (showCompass ? clean.bgColor : clean.textColor) : isCyber ? (showCompass ? cyber.bgColor : cyber.lineColor) : isFunk ? (showCompass ? funk.bgColor : funk.textColor) : isWindows95 ? win95.textColor : '#FFFFFF'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polygon
                    points="12,2 14.5,10 12,8 9.5,10"
                    fill={showCompass ? (isClean ? clean.bgColor : isCyber ? cyber.bgColor : isFunk ? funk.bgColor : isWindows95 ? win95.textColor : '#FFFFFF') : (isClean ? clean.textColor : '#E53935')}
                    stroke="none"
                  />
                  <line x1="12" y1="22" x2="12" y2="18" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
              </div>
            )}

            {/* Zoom controls */}
            <div style={isClean ? {
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              backgroundColor: clean.bgColor,
              border: `1px solid ${clean.separatorColor}`,
              borderRadius: '3px',
              padding: '2px 3px',
              flexShrink: 0,
              height: '20px',
            } : isFunk ? {
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              backgroundColor: funk.bgColor,
              border: `2px solid ${funk.borderColor}`,
              borderRadius: '3px',
              padding: '2px 3px',
              flexShrink: 0,
              height: '22px',
            } : isWindows95 ? {
              display: 'flex',
              alignItems: 'center',
              gap: '0px',
              backgroundColor: win95.bgColor,
              border: '2px solid',
              borderColor: win95Inset,
              padding: '1px 2px',
              flexShrink: 0,
              height: '22px',
            } : {
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '3px',
              padding: '2px 3px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              flexShrink: 0,
              height: '20px',
            }}>
              {/* Zoom percentage */}
              <div style={isClean ? {
                fontSize: '11px',
                fontWeight: 500,
                color: clean.textColor,
                padding: '0 4px',
                width: '40px',
                textAlign: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                textOverflow: 'clip',
                whiteSpace: 'nowrap',
                lineHeight: '16px',
              } : isFunk ? {
                fontSize: '11px',
                fontWeight: 600,
                color: funk.textColor,
                padding: '0 4px',
                width: '40px',
                textAlign: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                textOverflow: 'clip',
                whiteSpace: 'nowrap',
                lineHeight: '16px',
              } : isWindows95 ? {
                fontSize: '11px',
                fontWeight: 'normal',
                color: win95.textColor,
                padding: '0 4px',
                width: '40px',
                textAlign: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                textOverflow: 'clip',
                whiteSpace: 'nowrap',
                lineHeight: '16px',
              } : {
                fontSize: '0.65rem',
                fontWeight: 600,
                color: '#FFFFFF',
                padding: '0 4px',
                width: '46px',
                textAlign: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                textOverflow: 'clip',
                whiteSpace: 'nowrap',
                lineHeight: '16px',
              }}>
                {Math.round(scale * 100)}%
              </div>
              {/* Zoom Controls */}
              <ZoomControls
                onZoomIn={onZoomIn}
                onZoomOut={onZoomOut}
                onZoomReset={onZoomReset}
                toolbarStyle={toolbarStyle}
              />
            </div>

            {/* Measurement Ruler */}
            <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
              {/* Unit selector dropdown */}
              {showUnits && (
                <div
                  style={isClean ? {
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '4px',
                    backgroundColor: clean.bgColor,
                    border: `1px solid ${clean.borderColor}`,
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    padding: '4px 0',
                    minWidth: '140px',
                    zIndex: 1000,
                    fontFamily: clean.fontFamily,
                  } : isFunk ? {
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '4px',
                    backgroundColor: funk.bgColor,
                    border: `3px solid ${funk.borderColor}`,
                    borderRadius: '4px',
                    boxShadow: `4px 4px 0 ${funk.shadowColor}`,
                    padding: '4px 0',
                    minWidth: '160px',
                    zIndex: 1000,
                  } : isWindows95 ? {
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '4px',
                    backgroundColor: win95.bgColor,
                    border: '2px solid',
                    borderColor: win95Raised,
                    padding: '2px 0',
                    minWidth: '140px',
                    zIndex: 1000,
                  } : {
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '8px',
                    backgroundColor: '#FDFCFD',
                    border: '1px solid #D8D2E9',
                    borderRadius: '6px',
                    boxShadow: '0 4px 16px rgba(111, 98, 164, 0.15)',
                    padding: '4px 0',
                    minWidth: '160px',
                    zIndex: 1000,
                  }}
                >
                  {(Object.keys(unitLabels) as LengthUnit[]).map((unit) => (
                    <div
                      key={unit}
                      onClick={() => {
                        onLengthUnitChange?.(unit);
                        setShowUnits(false);
                      }}
                      style={isClean ? {
                        padding: '4px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: lengthUnit === unit ? clean.bgColor : clean.textColor,
                        backgroundColor: lengthUnit === unit ? clean.activeColor : 'transparent',
                        fontFamily: clean.fontFamily,
                      } : isFunk ? {
                        padding: '6px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: lengthUnit === unit ? funk.bgColor : funk.textColor,
                        backgroundColor: lengthUnit === unit ? funk.accentPink : 'transparent',
                        fontFamily: funk.fontFamily,
                      } : isWindows95 ? {
                        padding: '4px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px',
                        color: lengthUnit === unit ? '#FFFFFF' : win95.textColor,
                        backgroundColor: lengthUnit === unit ? win95.activeColor : 'transparent',
                        fontFamily: win95.fontFamily,
                      } : {
                        padding: '6px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.8125rem',
                        color: '#3B3B3B',
                        backgroundColor: lengthUnit === unit ? '#EFEBF8' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (lengthUnit !== unit) {
                          if (isClean) {
                            e.currentTarget.style.backgroundColor = clean.separatorColor;
                          } else if (isFunk) {
                            e.currentTarget.style.backgroundColor = funk.accentYellow;
                          } else if (isWindows95) {
                            e.currentTarget.style.backgroundColor = win95.activeColor;
                            e.currentTarget.style.color = '#FFFFFF';
                          } else {
                          e.currentTarget.style.backgroundColor = '#F7F5FA';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (lengthUnit !== unit) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          if (isWindows95) e.currentTarget.style.color = win95.textColor;
                        }
                      }}
                    >
                      {unitLabels[unit]}
                      {lengthUnit === unit && !isWindows95 && !isFunk && !isClean && <span style={{ color: '#6F62A4', fontWeight: 600 }}>✓</span>}
                      {lengthUnit === unit && isFunk && <span style={{ color: funk.bgColor, fontWeight: 600 }}>✓</span>}
                      {lengthUnit === unit && isClean && <span style={{ color: clean.bgColor, fontWeight: 600 }}>✓</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Scale indicator */}
              <div
                style={isClean ? {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: clean.bgColor,
                  padding: '2px 6px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  border: `1px solid ${clean.separatorColor}`,
                  borderRadius: '3px',
                  width: '130px',
                  height: '20px',
                  flexShrink: 0,
                  fontFamily: clean.fontFamily,
                } : isFunk ? {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: funk.bgColor,
                  padding: '2px 6px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  border: `2px solid ${funk.borderColor}`,
                  borderRadius: '3px',
                  width: '140px',
                  height: '22px',
                  flexShrink: 0,
                  transition: 'all 0.1s ease-out',
                } : isWindows95 ? {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: win95.bgColor,
                  padding: '2px 6px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  border: '2px solid',
                  borderColor: win95Inset,
                  width: '130px',
                  height: '22px',
                  flexShrink: 0,
                } : {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  width: '150px',
                  height: '20px',
                  flexShrink: 0,
                }}
                onClick={() => setShowUnits(!showUnits)}
                onMouseEnter={(e) => {
                  if (isClean) {
                    e.currentTarget.style.opacity = '0.7';
                  } else if (isFunk) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (isClean) {
                    e.currentTarget.style.opacity = '1';
                  } else if (isFunk) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Ruler with measurement text on side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: (isWindows95 || isFunk || isClean) ? '4px' : '6px', flex: 1 }}>
                  {/* Ruler visual using SVG - fixed width for stability */}
                  <svg width="50" height="14" aria-hidden="true" role="img" style={{ flexShrink: 0 }}>
                    {/* Main ruler path: left tick, horizontal line, right tick */}
                    <path
                      d="M 2 3 V 11 H 48 V 3"
                      stroke={isClean ? clean.textColor : isFunk ? funk.textColor : isWindows95 ? win95.textColor : '#FFFFFF'}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                    {/* Intermediate ticks pointing upward from baseline - evenly spaced intervals */}
                    <line x1="13.5" y1="11" x2="13.5" y2="7" stroke={isClean ? clean.textColor : isFunk ? funk.textColor : isWindows95 ? win95.textColor : '#FFFFFF'} strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="25" y1="11" x2="25" y2="7" stroke={isClean ? clean.textColor : isFunk ? funk.textColor : isWindows95 ? win95.textColor : '#FFFFFF'} strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="36.5" y1="11" x2="36.5" y2="7" stroke={isClean ? clean.textColor : isFunk ? funk.textColor : isWindows95 ? win95.textColor : '#FFFFFF'} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {/* Measurement text on side - fixed width to prevent jitter */}
                  <div style={isClean ? {
                    fontSize: '11px',
                    fontWeight: 500,
                    color: clean.textColor,
                    letterSpacing: '0.2px',
                    width: '50px',
                    textAlign: 'left',
                    flexShrink: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: '14px',
                  } : isFunk ? {
                    fontSize: '11px',
                    fontWeight: 600,
                    color: funk.textColor,
                    letterSpacing: '0.2px',
                    width: '55px',
                    textAlign: 'left',
                    flexShrink: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: '14px',
                  } : isWindows95 ? {
                    fontSize: '11px',
                    fontWeight: 'normal',
                    color: win95.textColor,
                    letterSpacing: '0.2px',
                    width: '50px',
                    textAlign: 'left',
                    flexShrink: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: '14px',
                  } : {
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    letterSpacing: '0.2px',
                    width: '55px',
                    textAlign: 'left',
                    flexShrink: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: '14px',
                  }}>
                    {getScaleMeasurement()}
                  </div>
                </div>
                <ChevronUp
                  size={12}
                  style={{
                    color: isClean ? clean.textColor : isCyber ? cyber.lineColor : isFunk ? funk.textColor : isWindows95 ? win95.textColor : '#FFFFFF',
                    transform: showUnits ? 'rotate(0deg)' : 'rotate(180deg)',
                    transition: (isWindows95 || isFunk || isCyber || isClean) ? 'none' : 'transform 0.2s',
                    flexShrink: 0,
                  }}
                />
              </div>
            </div>

            {/* Info icon with popup */}
            <div ref={infoRef} style={{ position: 'relative', flexShrink: 0 }}>
              {showInfo && (
                <div
                  style={isClean ? {
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '4px',
                    backgroundColor: clean.bgColor,
                    border: `1px solid ${clean.borderColor}`,
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    padding: '10px',
                    width: '260px',
                    zIndex: 1000,
                    fontFamily: clean.fontFamily,
                  } : isCyber ? {
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '4px',
                    backgroundColor: cyber.paperColor,
                    border: `1px solid ${cyber.lineColor}`,
                    padding: '12px',
                    width: '280px',
                    zIndex: 1000,
                    fontFamily: cyber.fontFamily,
                    boxShadow: `0 0 12px ${cyber.glowColor}`,
                  } : isFunk ? {
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '4px',
                    backgroundColor: funk.bgColor,
                    border: `3px solid ${funk.borderColor}`,
                    borderRadius: '4px',
                    boxShadow: `4px 4px 0 ${funk.shadowColor}`,
                    padding: '12px',
                    width: '280px',
                    zIndex: 1000,
                    fontFamily: funk.fontFamily,
                  } : isWindows95 ? {
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '4px',
                    backgroundColor: win95.bgColor,
                    border: '2px solid',
                    borderColor: win95Raised,
                    padding: '8px',
                    width: '260px',
                    zIndex: 1000,
                    fontFamily: win95.fontFamily,
                  } : {
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '8px',
                    backgroundColor: '#FDFCFD',
                    border: '1px solid #D8D2E9',
                    borderRadius: '6px',
                    boxShadow: '0 4px 16px rgba(111, 98, 164, 0.15)',
                    padding: '12px',
                    width: '280px',
                    zIndex: 1000,
                  }}
                >
                  <div style={isClean ? {
                    fontSize: '11px',
                    color: clean.textColor,
                    lineHeight: '1.5',
                  } : isCyber ? {
                    fontSize: '10px',
                    color: cyber.textColor,
                    lineHeight: '1.5',
                  } : isFunk ? {
                    fontSize: '12px',
                    color: funk.textColor,
                    lineHeight: '1.5',
                  } : isWindows95 ? {
                    fontSize: '11px',
                    color: win95.textColor,
                    lineHeight: '1.4',
                  } : {
                    fontSize: '0.875rem',
                    color: '#3B3B3B',
                    lineHeight: '1.5',
                  }}>
                    <div style={isClean ? {
                      fontWeight: 600,
                      marginBottom: '8px',
                      color: clean.textColor,
                    } : isCyber ? {
                      fontWeight: 600,
                      marginBottom: '8px',
                      color: cyber.lineColor,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    } : isFunk ? {
                      fontWeight: 700,
                      marginBottom: '8px',
                      color: funk.accentPink,
                    } : isWindows95 ? {
                      fontWeight: 'bold',
                      marginBottom: '6px',
                      color: win95.textColor,
                    } : {
                      fontWeight: 600,
                      marginBottom: '8px',
                      color: '#6F62A4',
                    }}>
                      Scale Indicator
                    </div>
                    <p style={{ margin: '0 0 6px 0' }}>
                      The displayed value represents the <strong>total length</strong> of the ruler at the current zoom level in your model space.
                    </p>
                    <p style={{ margin: '0 0 6px 0' }}>
                      The ruler is divided into 4 equal segments. For example, if it shows "1.2 m", the entire ruler represents 1.2 meters, and each segment is approximately 0.3 m (30 cm).
                    </p>
                    <p style={isClean ? {
                      margin: 0,
                      fontSize: '11px',
                      color: clean.textSecondary,
                      fontWeight: 500,
                    } : isCyber ? {
                      margin: 0,
                      fontSize: '10px',
                      color: cyber.accentOrange,
                      fontWeight: 500,
                    } : isFunk ? {
                      margin: 0,
                      fontSize: '12px',
                      color: funk.accentCyan,
                      fontWeight: 600,
                    } : isWindows95 ? {
                      margin: 0,
                      fontSize: '11px',
                      color: win95.textColor,
                    } : {
                      margin: 0,
                      fontSize: '0.8125rem',
                      color: '#6F62A4',
                    }}>
                      Click the ruler to change measurement units.
                    </p>
                  </div>
                </div>
              )}
              <div
                style={getButtonStyle(false)}
                onClick={() => setShowInfo(!showInfo)}
                onMouseEnter={(e) => {
                  if (isClean) {
                    e.currentTarget.style.opacity = '0.6';
                  } else if (isCyber) {
                    e.currentTarget.style.borderColor = cyber.lineColor;
                    e.currentTarget.style.boxShadow = `0 0 8px ${cyber.glowColor}`;
                  } else if (isFunk) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (isClean) {
                    e.currentTarget.style.opacity = '1';
                  } else if (isCyber) {
                    e.currentTarget.style.borderColor = cyber.lineDim;
                    e.currentTarget.style.boxShadow = 'none';
                  } else if (isFunk) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <Info size={14} style={{ color: isClean ? clean.textColor : isCyber ? cyber.lineColor : isFunk ? funk.textColor : isWindows95 ? win95.textColor : '#FFFFFF' }} />
              </div>
            </div>
          </>
        )}
      </div>
    </footer>
  );
}
