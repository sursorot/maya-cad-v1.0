/**
 * ZoomControls Component
 * 
 * Provides zoom in, zoom out, and fit-to-screen controls.
 * Extracted from Footer.tsx to reduce component complexity.
 */

import { Plus, Minus, Scan } from 'lucide-react';
import type { ToolbarStyle } from '../Workspace/types';

// Theme constants - will be migrated to centralized theme system
const win95 = {
  bgColor: '#c0c0c0',
  textColor: '#000000',
  borderLight: '#ffffff',
  borderDark: '#808080',
};

const funk = {
  textColor: '#1e1e1e',
  accentYellow: '#f9c500',
};

const clean = {
  textColor: '#000000',
  separatorColor: '#e0e0e0',
};

interface ZoomControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  toolbarStyle?: ToolbarStyle;
}

export function ZoomControls({
  onZoomIn,
  onZoomOut,
  onZoomReset,
  toolbarStyle = 'modern',
}: ZoomControlsProps) {
  const isWindows95 = toolbarStyle === 'windows95';
  const isFunk = toolbarStyle === 'funk';
  const isClean = toolbarStyle === 'clean';

  // Windows 95 border helpers
  const win95Raised = `${win95.borderLight} ${win95.borderDark} ${win95.borderDark} ${win95.borderLight}`;

  const getButtonStyle = (): React.CSSProperties => {
    if (isClean) {
      return {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '18px',
        height: '16px',
        borderRadius: '2px',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        flexShrink: 0,
        border: 'none',
        backgroundColor: 'transparent',
      };
    }
    if (isFunk) {
      return {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '18px',
        height: '16px',
        borderRadius: '2px',
        cursor: 'pointer',
        transition: 'all 0.1s ease-out',
        flexShrink: 0,
        border: 'none',
        backgroundColor: 'transparent',
      };
    }
    if (isWindows95) {
      return {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '18px',
        height: '16px',
        cursor: 'pointer',
        flexShrink: 0,
        border: '2px solid',
        borderColor: win95Raised,
        backgroundColor: win95.bgColor,
      };
    }
    // Modern/default
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '18px',
      height: '16px',
      borderRadius: '2px',
      cursor: 'pointer',
      transition: 'background-color 0.15s',
      flexShrink: 0,
      border: 'none',
      backgroundColor: 'transparent',
    };
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isClean) {
      e.currentTarget.style.backgroundColor = clean.separatorColor;
    } else if (isFunk) {
      e.currentTarget.style.backgroundColor = funk.accentYellow;
    } else if (!isWindows95) {
      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isWindows95) {
      e.currentTarget.style.backgroundColor = 'transparent';
    }
  };

  const getIconColor = (): string => {
    if (isClean) return clean.textColor;
    if (isFunk) return funk.textColor;
    if (isWindows95) return win95.textColor;
    return '#FFFFFF';
  };

  const iconColor = getIconColor();
  const buttonStyle = getButtonStyle();

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: isClean ? '1px' : isFunk ? '2px' : isWindows95 ? '2px' : '2px',
    }}>
      {/* Zoom out */}
      <div
        style={buttonStyle}
        onClick={onZoomOut}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="Zoom out"
      >
        <Minus size={12} style={{ color: iconColor }} />
      </div>

      {/* Zoom in */}
      <div
        style={buttonStyle}
        onClick={onZoomIn}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="Zoom in"
      >
        <Plus size={12} style={{ color: iconColor }} />
      </div>

      {/* Fit/Reset */}
      <div
        style={buttonStyle}
        onClick={onZoomReset}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="Fit to screen"
      >
        <Scan size={12} style={{ color: iconColor }} />
      </div>
    </div>
  );
}

export default ZoomControls;

