import { Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useState, useEffect, useRef } from 'react';
import type { SnapSettings } from '../types';
import { PRECISION_PRESETS } from '../types';

// Precision options for the dropdown
const precisionOptions = [
  { value: PRECISION_PRESETS.OFF, label: 'Off' },
  { value: PRECISION_PRESETS.QUARTER_INCH, label: '1/4"' },
  { value: PRECISION_PRESETS.HALF_INCH, label: '1/2"' },
  { value: PRECISION_PRESETS.INCH, label: '1"' },
  { value: PRECISION_PRESETS.CENTIMETER, label: '1 cm' },
  { value: PRECISION_PRESETS.MILLIMETER, label: '1 mm' },
] as const;

interface SnappingMenuProps {
  snapSettings: SnapSettings;
  onSnapSettingsChange: (settings: Partial<SnapSettings>) => void;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLDivElement | null>;
}

interface SnapOption {
  key: keyof Omit<SnapSettings, 'enabled'>;
  label: string;
  shortcut?: string; // Optional keyboard shortcut hint
}

const snapOptions: SnapOption[] = [
  { key: 'endpoint', label: 'Endpoints' },
  { key: 'midpoint', label: 'Midpoints' },
  { key: 'center', label: 'Centers' },
  { key: 'nearest', label: 'Nearest point' },
  { key: 'quadrant', label: 'Quadrants' },
  { key: 'intersection', label: 'Intersections' },
  { key: 'grid', label: 'Grid' },
  { key: 'direction', label: 'Parallel' },
  { key: 'perpendicular', label: 'Perpendicular' },
  { key: 'ortho', label: 'Ortho (H/V)', shortcut: 'O' },
];

// Icon component for each snap type
const SnapIcon: React.FC<{ type: keyof Omit<SnapSettings, 'enabled'> }> = ({ type }) => {
  const iconSize = 16;
  const color = '#6F62A4';

  switch (type) {
    case 'endpoint':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
          <circle
            cx="8"
            cy="8"
            r="3"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
          />
        </svg>
      );
    case 'midpoint':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="3" fill="none" stroke={color} strokeWidth="1.5" />
          <circle cx="8" cy="8" r="5" fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case 'center':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="4" fill="none" stroke={color} strokeWidth="1.5" />
          <circle cx="8" cy="8" r="1.5" fill={color} />
        </svg>
      );
    case 'nearest':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
          <line x1="3" y1="13" x2="13" y2="3" stroke={color} strokeWidth="1.5" />
          <circle cx="8" cy="8" r="2.5" fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case 'quadrant':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="5" fill="none" stroke={color} strokeWidth="1.5" />
          <line x1="8" y1="3" x2="8" y2="13" stroke={color} strokeWidth="1" />
          <line x1="3" y1="8" x2="13" y2="8" stroke={color} strokeWidth="1" />
        </svg>
      );
    case 'intersection':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
          <line x1="2" y1="2" x2="14" y2="14" stroke={color} strokeWidth="1.5" />
          <line x1="14" y1="2" x2="2" y2="14" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case 'grid':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
          <line x1="5" y1="2" x2="5" y2="14" stroke={color} strokeWidth="1" />
          <line x1="8" y1="2" x2="8" y2="14" stroke={color} strokeWidth="1" />
          <line x1="11" y1="2" x2="11" y2="14" stroke={color} strokeWidth="1" />
          <line x1="2" y1="5" x2="14" y2="5" stroke={color} strokeWidth="1" />
          <line x1="2" y1="8" x2="14" y2="8" stroke={color} strokeWidth="1" />
          <line x1="2" y1="11" x2="14" y2="11" stroke={color} strokeWidth="1" />
        </svg>
      );
    case 'direction':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
          <line x1="3" y1="3" x2="13" y2="13" stroke={color} strokeWidth="1.5" />
          <line x1="5" y1="3" x2="15" y2="13" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case 'perpendicular':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
          <line x1="8" y1="2" x2="8" y2="14" stroke={color} strokeWidth="1.5" />
          <line x1="2" y1="8" x2="14" y2="8" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case 'ortho':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
          {/* Horizontal arrow */}
          <line x1="2" y1="8" x2="14" y2="8" stroke={color} strokeWidth="1.5" />
          <polyline points="11,5.5 14,8 11,10.5" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
          {/* Vertical arrow */}
          <line x1="8" y1="2" x2="8" y2="14" stroke={color} strokeWidth="1.5" />
          <polyline points="5.5,5 8,2 10.5,5" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
};

export const SnappingMenu: React.FC<SnappingMenuProps> = ({
  snapSettings,
  onSnapSettingsChange,
  triggerRef,
}) => {
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 6, // margin bottom
        right: window.innerWidth - rect.right,
      });
    }
  }, [triggerRef]);

  const toggleSnapOption = (key: keyof Omit<SnapSettings, 'enabled'>) => {
    onSnapSettingsChange({ [key]: !snapSettings[key] });
  };

  const toggleSnappingMode = () => {
    onSnapSettingsChange({ enabled: !snapSettings.enabled });
  };

  if (!position) return null;

  const menuContent = (
    <div
      ref={menuRef}
      data-menu-type="snap"
      style={{
        position: 'fixed',
        bottom: `calc(100vh - ${position.top}px)`,
        right: position.right,
        marginBottom: '6px',
        backgroundColor: '#FDFCFD',
        border: '1px solid #D8D2E9',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(111, 98, 164, 0.12)',
        padding: '4px 0',
        minWidth: '160px',
        zIndex: 9999,
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '4px 10px 3px 10px',
          fontSize: '0.625rem',
          fontWeight: 600,
          color: '#9B8BB7',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}
      >
        Snap to...
      </div>

      {/* Snap options */}
      {snapOptions.map((option) => (
        <div
          key={option.key}
          onClick={() => toggleSnapOption(option.key)}
          style={{
            padding: '4px 10px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: '#3B3B3B',
            backgroundColor: 'transparent',
            transition: 'background-color 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F7F5FA';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SnapIcon type={option.key} />
            <span style={{ fontWeight: 500, fontSize: '0.7rem' }}>
              {option.label}
            </span>
            {option.shortcut && (
              <span
                style={{
                  fontSize: '0.6rem',
                  color: '#9B8BB7',
                  fontWeight: 600,
                }}
              >
                {option.shortcut}
              </span>
            )}
          </div>
          {snapSettings[option.key] && (
            <Check size={13} style={{ color: '#6F62A4', strokeWidth: 2.5 }} />
          )}
        </div>
      ))}

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: '#E8E5F0',
          margin: '4px 0',
        }}
      />

      {/* Snapping mode toggle */}
      <div
        onClick={toggleSnappingMode}
        style={{
          padding: '4px 10px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#3B3B3B',
          backgroundColor: 'transparent',
          transition: 'background-color 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F7F5FA';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 500 }}>Snapping mode</span>
          <span
            style={{
              fontSize: '0.625rem',
              color: '#9B8BB7',
              fontWeight: 600,
            }}
          >
            ⌘P
          </span>
        </div>
        {snapSettings.enabled && (
          <Check size={13} style={{ color: '#6F62A4', strokeWidth: 2.5 }} />
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: '#E8E5F0',
          margin: '4px 0',
        }}
      />

      {/* Precision header */}
      <div
        style={{
          padding: '4px 10px 3px 10px',
          fontSize: '0.625rem',
          fontWeight: 600,
          color: '#9B8BB7',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}
      >
        Coordinate Precision
      </div>

      {/* Precision options */}
      {precisionOptions.map((option) => {
        const isSelected = (snapSettings.precision ?? 0.001) === option.value;
        return (
          <div
            key={option.value}
            onClick={() => onSnapSettingsChange({ precision: option.value })}
            style={{
              padding: '4px 10px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: '#3B3B3B',
              backgroundColor: 'transparent',
              transition: 'background-color 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F7F5FA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width={16} height={16} viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="2" fill="#6F62A4" />
                {option.value > 0 && (
                  <>
                    <line x1="8" y1="2" x2="8" y2="5" stroke="#6F62A4" strokeWidth="1" />
                    <line x1="8" y1="11" x2="8" y2="14" stroke="#6F62A4" strokeWidth="1" />
                    <line x1="2" y1="8" x2="5" y2="8" stroke="#6F62A4" strokeWidth="1" />
                    <line x1="11" y1="8" x2="14" y2="8" stroke="#6F62A4" strokeWidth="1" />
                  </>
                )}
              </svg>
              <span style={{ fontWeight: 500, fontSize: '0.7rem' }}>
                {option.label}
              </span>
            </div>
            {isSelected && (
              <Check size={13} style={{ color: '#6F62A4', strokeWidth: 2.5 }} />
            )}
          </div>
        );
      })}
    </div>
  );

  return createPortal(menuContent, document.body);
};

