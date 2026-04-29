/**
 * Footer Right Controls
 * 
 * Memoized component for the right side of the footer.
 * Contains: Drawing mode toggle, Zone hover, Compass, Snap menu, Measurements,
 * Scale indicator, Unit selector, Data mode, Zoom controls
 */

import React, { memo, useState, useRef, useEffect } from 'react';
import { 
  Infinity as InfinityIcon, 
  MousePointerClick, 
  Disc,
  Magnet, 
  Ruler, 
  Info,
  Scan
} from 'lucide-react';
import type { ToolbarStyle, SnapSettings, MeasurementSettings } from '../Workspace/types';
import type { LengthUnit, DrawingMode } from './types';
import { FooterButton, getIconProps } from './FooterButton';
import { footerStyles, buttonStyles, themeColors } from '../../theme/componentStyles';
import { SnappingMenu } from '../Workspace/components/SnappingMenu';
import { MeasurementMenu } from '../Workspace/components/MeasurementMenu';
import { ZoomControls } from './ZoomControls';
import { formatLength } from '../Workspace/utils/measurements';

interface FooterRightControlsProps {
  canvasOpen: boolean;
  toolbarStyle: ToolbarStyle;
  // Drawing mode
  drawingMode: DrawingMode;
  onToggleDrawingMode?: () => void;
  // Zone hover
  zoneHoverEnabled: boolean;
  onToggleZoneHover?: (enabled: boolean) => void;
  // Compass
  showCompass: boolean;
  onToggleCompass?: () => void;
  // Snapping
  snapSettings?: SnapSettings;
  onSnapSettingsChange?: (settings: Partial<SnapSettings>) => void;
  // Measurements
  showMeasurements: boolean;
  measurementSettings?: MeasurementSettings;
  onMeasurementSettingsChange?: (settings: Partial<MeasurementSettings>) => void;
  // Scale
  scale: number;
  viewBoxWidth?: number;
  containerWidth?: number;
  lengthUnit: LengthUnit;
  onLengthUnitChange?: (unit: LengthUnit) => void;
  // Zoom
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
}

/**
 * Right side controls of the footer
 */
export const FooterRightControls = memo(function FooterRightControls({
  canvasOpen,
  toolbarStyle,
  drawingMode,
  onToggleDrawingMode,
  zoneHoverEnabled,
  onToggleZoneHover,
  showCompass,
  onToggleCompass,
  snapSettings,
  onSnapSettingsChange,
  showMeasurements,
  measurementSettings,
  onMeasurementSettingsChange,
  scale,
  viewBoxWidth,
  containerWidth,
  lengthUnit,
  onLengthUnitChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: FooterRightControlsProps) {
  const styles = footerStyles[toolbarStyle];
  const [showSnapMenu, setShowSnapMenu] = useState(false);
  const [showMeasurementMenu, setShowMeasurementMenu] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const snapMenuRef = useRef<HTMLDivElement>(null);
  const measurementMenuRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isInsideSnapMenu = target.closest('[data-menu-type="snap"]');
      const isInsideMeasurementMenu = target.closest('[data-menu-type="measurement"]');

      if (snapMenuRef.current && !snapMenuRef.current.contains(target as Node) && !isInsideSnapMenu) {
        setShowSnapMenu(false);
      }
      if (measurementMenuRef.current && !measurementMenuRef.current.contains(target as Node) && !isInsideMeasurementMenu) {
        setShowMeasurementMenu(false);
      }
      if (infoRef.current && !infoRef.current.contains(target as Node)) {
        setShowInfo(false);
      }
    };

    if (showSnapMenu || showMeasurementMenu || showInfo) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSnapMenu, showMeasurementMenu, showInfo]);

  if (!canvasOpen) {
    return <div style={styles.rightGroup} />;
  }

  const isChainMode = drawingMode === 'chain';
  const isSnapEnabled = snapSettings?.enabled ?? false;

  return (
    <div style={styles.rightGroup}>
      {/* Drawing mode toggle */}
      <FooterButton
        active={isChainMode}
        onClick={onToggleDrawingMode}
        title={isChainMode ? 'Chain Mode (click to switch to One-time)' : 'One-time Mode (click to switch to Chain)'}
        toolbarStyle={toolbarStyle}
        icon={
          isChainMode ? (
            <InfinityIcon {...getIconProps({ toolbarStyle, active: isChainMode })} />
          ) : (
            <MousePointerClick {...getIconProps({ toolbarStyle, active: false })} />
          )
        }
      />

      {/* Zone hover toggle */}
      <FooterButton
        active={zoneHoverEnabled}
        onClick={() => onToggleZoneHover?.(!zoneHoverEnabled)}
        title={zoneHoverEnabled ? 'Disable Zone Highlighting' : 'Enable Zone Highlighting'}
        toolbarStyle={toolbarStyle}
        icon={<Scan {...getIconProps({ toolbarStyle, active: zoneHoverEnabled })} />}
      />

      {/* Compass toggle */}
      <FooterButton
        active={showCompass}
        onClick={onToggleCompass}
        title={showCompass ? 'Hide Compass' : 'Show Compass'}
        toolbarStyle={toolbarStyle}
        icon={<Disc {...getIconProps({ toolbarStyle, active: showCompass })} />}
      />

      {/* Snap menu */}
      <div ref={snapMenuRef} style={{ position: 'relative' }}>
        <FooterButton
          active={isSnapEnabled}
          onClick={() => setShowSnapMenu(!showSnapMenu)}
          title="Snapping Settings"
          toolbarStyle={toolbarStyle}
          icon={<Magnet {...getIconProps({ toolbarStyle, active: isSnapEnabled })} />}
        />
        {showSnapMenu && snapSettings && onSnapSettingsChange && (
          <SnappingMenu
            snapSettings={snapSettings}
            onSnapSettingsChange={onSnapSettingsChange}
            onClose={() => setShowSnapMenu(false)}
            triggerRef={snapMenuRef}
          />
        )}
      </div>

      {/* Measurements menu */}
      <div ref={measurementMenuRef} style={{ position: 'relative' }}>
        <FooterButton
          active={showMeasurements}
          onClick={() => setShowMeasurementMenu(!showMeasurementMenu)}
          title="Measurement Settings"
          toolbarStyle={toolbarStyle}
          icon={<Ruler {...getIconProps({ toolbarStyle, active: showMeasurements })} />}
        />
        {showMeasurementMenu && measurementSettings && onMeasurementSettingsChange && (
          <MeasurementMenu
            measurementSettings={measurementSettings}
            onMeasurementSettingsChange={onMeasurementSettingsChange}
            onClose={() => setShowMeasurementMenu(false)}
            triggerRef={measurementMenuRef}
          />
        )}
      </div>

      {/* Scale indicator */}
      <ScaleIndicator
        scale={scale}
        viewBoxWidth={viewBoxWidth}
        containerWidth={containerWidth}
        lengthUnit={lengthUnit}
        onLengthUnitChange={onLengthUnitChange}
        toolbarStyle={toolbarStyle}
        showInfo={showInfo}
        onToggleInfo={() => setShowInfo(!showInfo)}
        infoRef={infoRef}
      />

      {/* PRODUCTION: Data mode toggle hidden - internal training tool only
      <DataModeToggle
        enabled={dataModeEnabled}
        onChange={onDataModeChange ?? (() => {})}
        toolbarStyle={toolbarStyle}
      />
      */}

      {/* Zoom controls */}
      <ZoomControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onZoomReset={onZoomReset}
        toolbarStyle={toolbarStyle}
      />
    </div>
  );
});

/**
 * Scale indicator component
 */
const ScaleIndicator = memo(function ScaleIndicator({
  scale,
  viewBoxWidth,
  containerWidth,
  lengthUnit,
  onLengthUnitChange,
  toolbarStyle,
  showInfo,
  onToggleInfo,
  infoRef,
}: {
  scale: number;
  viewBoxWidth?: number;
  containerWidth?: number;
  lengthUnit: LengthUnit;
  onLengthUnitChange?: (unit: LengthUnit) => void;
  toolbarStyle: ToolbarStyle;
  showInfo: boolean;
  onToggleInfo: () => void;
  infoRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Calculate scale measurement
  const getScaleMeasurement = () => {
    const rulerScreenWidth = 50;
    let metersInModel: number;

    if (viewBoxWidth !== undefined && viewBoxWidth > 0 && containerWidth !== undefined && containerWidth > 0) {
      const pixelsPerMeter = containerWidth / viewBoxWidth;
      metersInModel = rulerScreenWidth / pixelsPerMeter;
    } else if (viewBoxWidth !== undefined && viewBoxWidth > 0) {
      const estimatedScreenWidth = typeof window !== 'undefined' ? window.innerWidth * 0.6 : 1200;
      const pixelsPerMeter = estimatedScreenWidth / viewBoxWidth;
      metersInModel = rulerScreenWidth / pixelsPerMeter;
    } else {
      const pixelsPerMeter = 40;
      metersInModel = rulerScreenWidth / (pixelsPerMeter * scale);
    }

    return formatLength(metersInModel, lengthUnit);
  };

  const iconProps = getIconProps({ toolbarStyle, active: false, size: 12 });
  const textColor = buttonStyles[toolbarStyle].text;

  return (
    <div 
      ref={infoRef}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px',
        position: 'relative',
      }}
    >
      {/* Ruler visual */}
      <div
        style={{
          width: '50px',
          height: '8px',
          backgroundColor: textColor,
          opacity: 0.8,
          position: 'relative',
        }}
      >
        {/* Tick marks */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '1px',
          height: '8px',
          backgroundColor: toolbarStyle === 'modern' ? '#1e293b' : 'inherit',
        }} />
        <div style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '1px',
          height: '8px',
          backgroundColor: toolbarStyle === 'modern' ? '#1e293b' : 'inherit',
        }} />
      </div>

      {/* Scale text */}
      <span style={{ 
        color: textColor, 
        fontSize: '10px',
        minWidth: '50px',
      }}>
        {getScaleMeasurement()}
      </span>

      {/* Info button */}
      <div
        onClick={onToggleInfo}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
        title="Scale Info"
      >
        <Info {...iconProps} />
      </div>

      {/* Info popup */}
      {showInfo && (
        <ScaleInfoPopup 
          toolbarStyle={toolbarStyle}
          lengthUnit={lengthUnit}
          onLengthUnitChange={onLengthUnitChange}
        />
      )}
    </div>
  );
});

/**
 * Scale info popup
 */
const ScaleInfoPopup = memo(function ScaleInfoPopup({
  toolbarStyle,
  lengthUnit,
  onLengthUnitChange,
}: {
  toolbarStyle: ToolbarStyle;
  lengthUnit: LengthUnit;
  onLengthUnitChange?: (unit: LengthUnit) => void;
}) {
  const units: LengthUnit[] = ['mm', 'cm', 'm', 'in', 'ft', 'ft-in'];
  const unitLabels: Record<LengthUnit, string> = {
    'mm': 'Millimeters',
    'cm': 'Centimeters',
    'm': 'Meters',
    'in': 'Inches',
    'ft': 'Feet',
    'ft-in': 'Feet/inches',
  };

  const bgColor = toolbarStyle === 'cyber' 
    ? themeColors.cyber.paperColor 
    : toolbarStyle === 'funk'
    ? themeColors.funk.bgColor
    : toolbarStyle === 'windows95'
    ? themeColors.windows95.bgColor
    : toolbarStyle === 'clean'
    ? themeColors.clean.bgColor
    : '#1e293b';

  const textColor = buttonStyles[toolbarStyle].text;
  const borderColor = toolbarStyle === 'cyber'
    ? themeColors.cyber.lineColor
    : toolbarStyle === 'funk'
    ? themeColors.funk.borderColor
    : toolbarStyle === 'clean'
    ? themeColors.clean.borderColor
    : 'rgba(255,255,255,0.2)';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        right: 0,
        marginBottom: '8px',
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: toolbarStyle === 'windows95' ? '0' : '4px',
        padding: '8px',
        minWidth: '120px',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ 
        color: textColor, 
        fontSize: '10px', 
        marginBottom: '8px',
        fontWeight: 500,
      }}>
        Display Units
      </div>
      {units.map((unit) => (
        <div
          key={unit}
          onClick={() => onLengthUnitChange?.(unit)}
          style={{
            padding: '4px 8px',
            cursor: 'pointer',
            backgroundColor: unit === lengthUnit ? borderColor : 'transparent',
            color: textColor,
            fontSize: '11px',
            borderRadius: '2px',
            marginBottom: '2px',
          }}
        >
          {unitLabels[unit]}
        </div>
      ))}
    </div>
  );
});

