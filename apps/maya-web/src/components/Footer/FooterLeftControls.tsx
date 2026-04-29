/**
 * Footer Left Controls
 * 
 * Memoized component for the left side of the footer.
 * Contains: Grid toggle, Toolbar toggle, Markers toggle, Style picker
 */

import { memo } from 'react';
import { Grid3x3, Square, PencilRuler, MapPin } from 'lucide-react';
import type { ToolbarStyle } from '../Workspace/types';
import { FooterButton, getIconProps } from './FooterButton';
import { footerStyles, themeColors } from '../../theme/componentStyles';

interface FooterLeftControlsProps {
  canvasOpen: boolean;
  showGrid: boolean;
  onToggleGrid?: () => void;
  showToolbar: boolean;
  onToggleToolbar?: () => void;
  showMarkers: boolean;
  onToggleMarkers?: () => void;
  toolbarStyle: ToolbarStyle;
  onToolbarStyleChange?: (style: ToolbarStyle) => void;
}

/**
 * Left side controls of the footer
 */
export const FooterLeftControls = memo(function FooterLeftControls({
  canvasOpen,
  showGrid,
  onToggleGrid,
  showToolbar,
  onToggleToolbar,
  showMarkers,
  onToggleMarkers,
  toolbarStyle,
}: FooterLeftControlsProps) {
  const styles = footerStyles[toolbarStyle];

  if (!canvasOpen) {
    return <div style={styles.leftGroup} />;
  }

  return (
    <div style={styles.leftGroup}>
      {/* Grid toggle */}
      <FooterButton
        active={showGrid}
        onClick={onToggleGrid}
        title={showGrid ? 'Hide Grid' : 'Show Grid'}
        toolbarStyle={toolbarStyle}
        icon={
          showGrid ? (
            <Grid3x3 {...getIconProps({ toolbarStyle, active: showGrid })} />
          ) : (
            <Square
              {...getIconProps({ toolbarStyle, active: false })}
              fill={getInactiveFill(toolbarStyle)}
            />
          )
        }
      />

      {/* Toolbar toggle */}
      <FooterButton
        active={showToolbar}
        onClick={onToggleToolbar}
        title={showToolbar ? 'Hide Toolbar' : 'Show Toolbar'}
        toolbarStyle={toolbarStyle}
        icon={<PencilRuler {...getIconProps({ toolbarStyle, active: showToolbar })} />}
      />

      {/* Markers toggle */}
      <FooterButton
        active={showMarkers}
        onClick={onToggleMarkers}
        title={showMarkers ? 'Hide Markers' : 'Show Markers'}
        toolbarStyle={toolbarStyle}
        icon={<MapPin {...getIconProps({ toolbarStyle, active: showMarkers })} />}
      />

      {/* Style picker - HIDDEN FOR PRODUCTION (only Clean theme available)
      {onToolbarStyleChange && (
        <StylePickerButton
          toolbarStyle={toolbarStyle}
          onClick={cycleStyle}
        />
      )}
      */}
    </div>
  );
});

/**
 * Get fill color for inactive square icon
 */
function getInactiveFill(toolbarStyle: ToolbarStyle): string {
  switch (toolbarStyle) {
    case 'clean':
      return themeColors.clean.textSecondary;
    case 'cyber':
      return themeColors.cyber.lineDim;
    case 'funk':
      return themeColors.funk.borderColor;
    case 'windows95':
      return themeColors.windows95.borderDark;
    default:
      return 'rgba(255, 255, 255, 0.6)';
  }
}


