/**
 * UnitSelector Component
 * 
 * Dropdown for selecting measurement units (mm, cm, m, in, ft, ft-in).
 * Extracted from Footer.tsx to reduce component complexity.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronUp, Ruler } from 'lucide-react';
import type { ToolbarStyle } from '../Workspace/types';

type LengthUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft' | 'ft-in';

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

const unitLabels: Record<LengthUnit, string> = {
  'mm': 'Millimeters',
  'cm': 'Centimeters',
  'm': 'Meters',
  'in': 'Inches',
  'ft': 'Feet',
  'ft-in': 'Feet/inches'
};

interface UnitSelectorProps {
  lengthUnit: LengthUnit;
  onLengthUnitChange?: (unit: LengthUnit) => void;
  toolbarStyle?: ToolbarStyle;
}

export function UnitSelector({
  lengthUnit,
  onLengthUnitChange,
  toolbarStyle = 'modern',
}: UnitSelectorProps) {
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
      right: 0,
      marginBottom: '4px',
      padding: '4px 0',
      minWidth: '140px',
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
        minWidth: '160px',
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
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      cursor: 'pointer',
      transition: 'background-color 0.15s',
    };

    if (isClean) {
      return {
        ...base,
        padding: '4px 10px',
        fontSize: '11px',
        fontWeight: isActive ? 600 : 400,
        color: clean.textColor,
        backgroundColor: isActive ? clean.separatorColor : 'transparent',
      };
    }
    if (isFunk) {
      return {
        ...base,
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: isActive ? 700 : 500,
        color: funk.textColor,
        backgroundColor: isActive ? funk.accentPink : 'transparent',
      };
    }
    if (isWindows95) {
      return {
        ...base,
        padding: '2px 8px',
        fontSize: '11px',
        color: win95.textColor,
        backgroundColor: isActive ? '#000080' : 'transparent',
        ...(isActive && { color: '#ffffff' }),
      };
    }
    if (isCyber) {
      return {
        ...base,
        padding: '6px 12px',
        fontSize: '11px',
        color: cyber.textColor,
        backgroundColor: isActive ? 'rgba(77, 166, 255, 0.2)' : 'transparent',
      };
    }
    // Modern
    return {
      ...base,
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
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

  return (
    <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Dropdown menu */}
      {showDropdown && (
        <div style={getDropdownStyle()}>
          {(Object.keys(unitLabels) as LengthUnit[]).map((unit) => (
            <div
              key={unit}
              style={getItemStyle(lengthUnit === unit)}
              onClick={() => {
                onLengthUnitChange?.(unit);
                setShowDropdown(false);
              }}
              onMouseEnter={(e) => {
                if (lengthUnit !== unit) {
                  if (isClean) {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  } else if (isFunk) {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  } else if (!isWindows95) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }
                }
              }}
              onMouseLeave={(e) => {
                if (lengthUnit !== unit) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {unitLabels[unit]}
            </div>
          ))}
        </div>
      )}

      {/* Trigger button */}
      <div
        style={getTriggerStyle()}
        onClick={() => setShowDropdown(!showDropdown)}
        title="Change measurement units"
      >
        <Ruler size={14} style={{ color: getIconColor() }} />
        <span style={{ 
          fontSize: isClean ? '10px' : isFunk ? '11px' : isWindows95 ? '11px' : '11px',
          fontWeight: isClean ? 600 : 500,
          color: getIconColor(),
          textTransform: isClean ? 'uppercase' : 'none',
          letterSpacing: isClean ? '0.02em' : 'normal',
        }}>
          {lengthUnit.toUpperCase()}
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

export default UnitSelector;

