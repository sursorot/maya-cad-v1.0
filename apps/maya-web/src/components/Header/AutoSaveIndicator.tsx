/**
 * AutoSaveIndicator Component
 * 
 * Displays the auto-save status with appropriate icons and labels.
 * Extracted from Header.tsx to reduce component complexity.
 */

import { Cloud, Loader2, AlertCircle } from 'lucide-react';
import type { AutoSaveState } from '../../lib/supabase/types';
import type { ToolbarStyle } from '../Workspace/types';

// Theme constants - will be migrated to centralized theme system
const win95 = {
  bgColor: '#c0c0c0',
  textColor: '#000000',
  borderLight: '#ffffff',
  borderDark: '#808080',
  fontFamily: "'Tahoma', 'Verdana', 'Arial', sans-serif",
};

const funk = {
  bgColor: '#ffffff',
  textColor: '#1e1e1e',
  borderColor: '#1e1e1e',
  accentPink: '#ff69b4',
  fontFamily: "'Inter', sans-serif",
};

const cyber = {
  lineColor: '#4da6ff',
  lineDim: '#2d7acc',
  textColor: '#e8f4ff',
  accentOrange: '#ff6b35',
  glowColor: 'rgba(77, 166, 255, 0.4)',
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
};

const clean = {
  bgColor: '#ffffff',
  textColor: '#1A1A1A',
  textSecondary: '#5A6370',
  borderColor: '#3A3A3A',
  fontFamily: "'IBM Plex Mono', monospace",
};

interface AutoSaveIndicatorProps {
  autoSaveState: AutoSaveState;
  onRetrySave?: () => void;
  onManualSave?: () => void;
  toolbarStyle?: ToolbarStyle;
  /** Use modern CSS class-based styling */
  useModernStyles?: boolean;
}

function getSaveStatusLabel(status: AutoSaveState['status']): string {
  switch (status) {
    case 'saving': return 'Saving...';
    case 'saved': return 'Saved';
    case 'error': return 'Error';
    case 'pending': return 'Unsaved';
    default: return 'Saved';
  }
}

export function AutoSaveIndicator({
  autoSaveState,
  onRetrySave,
  onManualSave,
  toolbarStyle = 'modern',
  useModernStyles = false,
}: AutoSaveIndicatorProps) {
  const isWindows95 = toolbarStyle === 'windows95';
  const isFunk = toolbarStyle === 'funk';
  const isCyber = toolbarStyle === 'cyber';
  const isClean = toolbarStyle === 'clean';

  const handleClick = () => {
    if (autoSaveState.status === 'error' && onRetrySave) {
      onRetrySave();
    } else if (onManualSave && autoSaveState.status !== 'saving') {
      onManualSave();
    }
  };

  const renderIcon = () => {
    const iconSize = useModernStyles ? 14 : (isClean ? 12 : isCyber ? 12 : isFunk ? 13 : isWindows95 ? 12 : 14);
    const iconStyle = { color: 'currentColor', flexShrink: 0 };
    
    switch (autoSaveState.status) {
      case 'saving':
        return (
          <Loader2 
            size={iconSize} 
            style={{ 
              ...iconStyle,
              animation: 'spin 1s linear infinite',
            }} 
          />
        );
      case 'error':
        return <AlertCircle size={iconSize} style={iconStyle} />;
      case 'saved':
      case 'pending':
      default:
        return <Cloud size={iconSize} style={iconStyle} />;
    }
  };

  // Modern CSS class-based rendering
  if (useModernStyles) {
    return (
      <button 
        onClick={handleClick}
        disabled={autoSaveState.status === 'saving'}
        className="header-status-button"
        data-state={autoSaveState.status}
        title={autoSaveState.status === 'saving' ? 'Saving in progress...' : 'Click to save now'}
      >
        {renderIcon()}
        <span className="header-status-label">
          {getSaveStatusLabel(autoSaveState.status)}
        </span>
      </button>
    );
  }

  // Inline style-based rendering (for themed toolbar styles)
  const getStatusColor = (): string => {
    if (autoSaveState.status === 'error') {
      return isClean ? '#dc2626' : isCyber ? cyber.accentOrange : isFunk ? '#dc2626' : isWindows95 ? '#c00000' : '#dc2626';
    }
    if (autoSaveState.status === 'pending') {
      return isClean ? clean.textSecondary : isCyber ? cyber.lineDim : isFunk ? '#6c6c6c' : isWindows95 ? '#808080' : '#6c6c6c';
    }
    if (autoSaveState.status === 'saving') {
      return isClean ? clean.textColor : isCyber ? cyber.lineColor : isFunk ? funk.accentPink : isWindows95 ? win95.textColor : '#525252';
    }
    // saved
    return isClean ? '#16a34a' : isCyber ? cyber.lineColor : isFunk ? '#16a34a' : isWindows95 ? '#008000' : '#16a34a';
  };

  const getButtonStyle = (): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: isClean ? '4px' : isCyber ? '6px' : isFunk ? '4px' : isWindows95 ? '4px' : '6px',
    padding: isClean ? '2px 6px' : isCyber ? '3px 8px' : isFunk ? '3px 8px' : isWindows95 ? '2px 6px' : '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: isClean ? '3px' : isFunk ? '4px' : isWindows95 ? '0' : '4px',
    cursor: autoSaveState.status === 'saving' ? 'not-allowed' : 'pointer',
    color: getStatusColor(),
    fontFamily: isClean ? clean.fontFamily : isCyber ? cyber.fontFamily : isFunk ? funk.fontFamily : isWindows95 ? win95.fontFamily : 'inherit',
    fontSize: isClean ? '10px' : isCyber ? '10px' : isFunk ? '11px' : isWindows95 ? '11px' : '12px',
    fontWeight: isClean ? 600 : 500,
    letterSpacing: isClean ? '0.02em' : isCyber ? '0.05em' : 'normal',
    textTransform: isClean ? 'uppercase' as const : isCyber ? 'uppercase' as const : 'none' as const,
    transition: 'opacity 0.15s, background-color 0.15s',
    opacity: autoSaveState.status === 'saving' ? 0.7 : 1,
  });

  return (
    <button 
      onClick={handleClick}
      disabled={autoSaveState.status === 'saving'}
      style={getButtonStyle()}
      title={autoSaveState.status === 'saving' ? 'Saving in progress...' : 'Click to save now'}
    >
      {renderIcon()}
      <span>{getSaveStatusLabel(autoSaveState.status)}</span>
    </button>
  );
}

export default AutoSaveIndicator;

