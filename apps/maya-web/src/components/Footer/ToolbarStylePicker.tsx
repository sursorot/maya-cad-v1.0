/**
 * ToolbarStylePicker Component
 * 
 * Dropdown for selecting the UI theme/style (modern, windows95, funk, cyber, clean).
 * Extracted from Footer.tsx to reduce component complexity.
 */

import { useState, useRef, useEffect } from 'react';
import { Palette, ChevronUp } from 'lucide-react';
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
  shadowColor: '#1e1e1e',
  fontFamily: "'Inter', sans-serif",
};

const cyber = {
  bgColor: '#0a2540',
  lineColor: '#4da6ff',
  lineDim: '#2d7acc',
  textColor: '#e8f4ff',
  glowColor: 'rgba(77, 166, 255, 0.4)',
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
};

const clean = {
  bgColor: '#ffffff',
  textColor: '#000000',
  borderColor: '#000000',
  separatorColor: '#e0e0e0',
  fontFamily: "'IBM Plex Mono', monospace",
};

interface StyleOption {
  value: ToolbarStyle;
  label: string;
  description?: string;
}

// PRODUCTION: Only Clean theme is available for now
// Other themes are commented out for future releases
const styleOptions: StyleOption[] = [
  { value: 'clean', label: 'Clean', description: 'WIRED-inspired minimal' },
  // { value: 'modern', label: 'Modern', description: 'Clean, minimal design' },
  // { value: 'windows95', label: 'Win95', description: 'Classic Windows look' },
  // { value: 'funk', label: 'Funk', description: 'Bold, playful colors' },
  // { value: 'cyber', label: 'Cyber', description: 'Blueprint/tech aesthetic' },
];

interface ToolbarStylePickerProps {
  toolbarStyle: ToolbarStyle;
  onToolbarStyleChange?: (style: ToolbarStyle) => void;
}

export function ToolbarStylePicker({
  toolbarStyle,
  onToolbarStyleChange,
}: ToolbarStylePickerProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isWindows95 = toolbarStyle === 'windows95';
  const isFunk = toolbarStyle === 'funk';
  const isCyber = toolbarStyle === 'cyber';
  const isClean = toolbarStyle === 'clean';

  // Windows 95 border helpers
  const win95Raised = `${win95.borderLight} ${win95.borderDark} ${win95.borderDark} ${win95.borderLight}`;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDropdownStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '4px',
      padding: '4px 0',
      minWidth: '160px',
      zIndex: 1000,
    };

    if (isClean) {
      return {
        ...base,
        backgroundColor: clean.bgColor,
        border: `1px solid ${clean.borderColor}`,
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        fontFamily: clean.fontFamily,
      };
    }
    if (isFunk) {
      return {
        ...base,
        backgroundColor: funk.bgColor,
        border: `3px solid ${funk.borderColor}`,
        borderRadius: '4px',
        boxShadow: `4px 4px 0 ${funk.shadowColor}`,
      };
    }
    if (isWindows95) {
      return {
        ...base,
        backgroundColor: win95.bgColor,
        border: '2px solid',
        borderColor: win95Raised,
        fontFamily: win95.fontFamily,
      };
    }
    if (isCyber) {
      return {
        ...base,
        backgroundColor: cyber.bgColor,
        border: `1px solid ${cyber.lineDim}`,
        boxShadow: `0 0 12px ${cyber.glowColor}`,
        fontFamily: cyber.fontFamily,
      };
    }
    // Modern
    return {
      ...base,
      backgroundColor: '#1f1f1f',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    };
  };

  const getItemStyle = (isActive: boolean): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      padding: '6px 12px',
      cursor: 'pointer',
      transition: 'background-color 0.15s',
    };

    if (isClean) {
      return {
        ...base,
        padding: '4px 10px',
        backgroundColor: isActive ? clean.separatorColor : 'transparent',
      };
    }
    if (isFunk) {
      return {
        ...base,
        backgroundColor: isActive ? funk.accentPink : 'transparent',
      };
    }
    if (isWindows95) {
      return {
        ...base,
        padding: '2px 8px',
        backgroundColor: isActive ? '#000080' : 'transparent',
      };
    }
    if (isCyber) {
      return {
        ...base,
        backgroundColor: isActive ? 'rgba(77, 166, 255, 0.2)' : 'transparent',
      };
    }
    // Modern
    return {
      ...base,
      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    };
  };

  const getLabelStyle = (isActive: boolean): React.CSSProperties => {
    if (isClean) {
      return {
        fontSize: '11px',
        fontWeight: isActive ? 600 : 400,
        color: clean.textColor,
      };
    }
    if (isFunk) {
      return {
        fontSize: '12px',
        fontWeight: isActive ? 700 : 500,
        color: isActive ? '#ffffff' : funk.textColor,
      };
    }
    if (isWindows95) {
      return {
        fontSize: '11px',
        color: isActive ? '#ffffff' : win95.textColor,
      };
    }
    if (isCyber) {
      return {
        fontSize: '11px',
        color: cyber.textColor,
      };
    }
    return {
      fontSize: '12px',
      color: '#ffffff',
    };
  };

  const getTriggerStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      cursor: 'pointer',
      padding: '2px 6px',
      borderRadius: '4px',
      transition: 'background-color 0.15s',
      border: 'none',
      backgroundColor: 'transparent',
    };

    if (isClean) {
      return {
        ...base,
        padding: '2px 4px',
        borderRadius: '2px',
      };
    }
    if (isFunk) {
      return {
        ...base,
        borderRadius: '4px',
      };
    }
    if (isWindows95) {
      return {
        ...base,
        border: '2px solid',
        borderColor: win95Raised,
        backgroundColor: win95.bgColor,
        borderRadius: '0',
      };
    }
    return base;
  };

  const getIconColor = (): string => {
    if (isClean) return clean.textColor;
    if (isFunk) return funk.textColor;
    if (isWindows95) return win95.textColor;
    if (isCyber) return cyber.textColor;
    return '#FFFFFF';
  };

  const currentStyle = styleOptions.find(s => s.value === toolbarStyle) || styleOptions[0];

  return (
    <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Dropdown menu */}
      {showDropdown && (
        <div style={getDropdownStyle()}>
          {styleOptions.map((option) => {
            const isActive = toolbarStyle === option.value;
            return (
              <div
                key={option.value}
                style={getItemStyle(isActive)}
                onClick={() => {
                  onToolbarStyleChange?.(option.value);
                  setShowDropdown(false);
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    if (isClean || isFunk) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    } else if (!isWindows95) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={getLabelStyle(isActive)}>{option.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Trigger button */}
      <div
        style={getTriggerStyle()}
        onClick={() => setShowDropdown(!showDropdown)}
        title="Change UI style"
      >
        <Palette size={14} style={{ color: getIconColor() }} />
        <span style={{ 
          fontSize: isClean ? '10px' : isFunk ? '11px' : isWindows95 ? '11px' : '11px',
          fontWeight: isClean ? 600 : 500,
          color: getIconColor(),
          textTransform: isClean ? 'uppercase' : 'none',
          letterSpacing: isClean ? '0.02em' : 'normal',
        }}>
          {currentStyle.label}
        </span>
        <ChevronUp 
          size={10} 
          style={{ 
            color: getIconColor(),
            transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }} 
        />
      </div>
    </div>
  );
}

export default ToolbarStylePicker;

