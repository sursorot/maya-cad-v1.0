/**
 * TraceLayerPanel Component
 * 
 * Floating panel for managing trace/reference images.
 * Uses Clean Theme (WIRED-inspired) styling.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  X, 
  Image as ImageIcon, 
  Upload,
  Settings,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { ImageShape } from '../Workspace/types';
import { OPACITY_PRESETS, type OpacityPreset } from './types';
import { formatScale } from './utils';

interface TraceLayerPanelProps {
  visible: boolean;
  images: ImageShape[];
  onClose: () => void;
  onUploadClick: () => void;
  onImageUpdate: (id: string, updates: Partial<ImageShape>) => void;
  onImageRemove: (id: string) => void;
  onRecalibrate: (id: string) => void;
  onSettingsClick?: (id: string) => void;
}

export const TraceLayerPanel: React.FC<TraceLayerPanelProps> = ({
  visible,
  images,
  onClose,
  onUploadClick,
  onImageUpdate,
  onImageRemove,
  onRecalibrate,
  onSettingsClick,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize position
  useEffect(() => {
    if (!visible || isInitialized) return;
    const viewportWidth = window.innerWidth;
    setPosition({
      x: viewportWidth - 300,
      y: 60,
    });
    setIsInitialized(true);
  }, [visible, isInitialized]);

  // Reset when hidden
  useEffect(() => {
    if (!visible) {
      setIsInitialized(false);
    }
  }, [visible]);

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
    const handleMouseUp = () => setIsDragging(false);
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

  // Quick actions for all images
  const handleShowAll = () => {
    images.forEach(img => {
      if (!img.visible) {
        onImageUpdate(img.id, { visible: true });
      }
    });
  };

  const handleHideAll = () => {
    images.forEach(img => {
      if (img.visible) {
        onImageUpdate(img.id, { visible: false });
      }
    });
  };

  const handleLockAll = () => {
    images.forEach(img => {
      if (!img.locked) {
        onImageUpdate(img.id, { locked: true });
      }
    });
  };

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: 280,
        maxHeight: '70vh',
        background: '#ffffff',
        border: '1px solid #000000',
        borderRadius: 4,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '10px',
        color: '#000000',
        zIndex: 1100,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: '8px 10px',
          background: '#000000',
          color: '#ffffff',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          borderRadius: '3px 3px 0 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ImageIcon size={12} />
          <span>TRACE LAYERS</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="panel-scroll-area" style={{
        flex: 1,
        padding: '8px',
      }}>
        {images.length === 0 ? (
          <div style={{
            padding: '20px 10px',
            textAlign: 'center',
            color: '#6c6c6c',
          }}>
            <ImageIcon size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
            <div style={{ marginBottom: 12 }}>No trace images</div>
            <button
              onClick={onUploadClick}
              style={{
                padding: '8px 16px',
                background: '#000000',
                color: '#ffffff',
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 600,
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <Upload size={12} />
              Upload Image
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {images.map(image => (
              <TraceLayerItem
                key={image.id}
                image={image}
                onUpdate={(updates) => onImageUpdate(image.id, updates)}
                onRemove={() => onImageRemove(image.id)}
                onRecalibrate={() => onRecalibrate(image.id)}
                onSettingsClick={onSettingsClick ? () => onSettingsClick(image.id) : undefined}
              />
            ))}
            
            {/* Add More Button */}
            <button
              onClick={onUploadClick}
              style={{
                padding: '10px',
                background: '#f5f5f5',
                border: '1px dashed #000000',
                borderRadius: 3,
                cursor: 'pointer',
                fontSize: '10px',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                color: '#6c6c6c',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#000000';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderStyle = 'solid';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
                e.currentTarget.style.color = '#6c6c6c';
                e.currentTarget.style.borderStyle = 'dashed';
              }}
            >
              <Upload size={12} />
              Add Trace Image
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions Footer */}
      {images.length > 0 && (
        <div style={{
          padding: '8px 10px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
        }}>
          <QuickActionButton onClick={handleShowAll} icon={<Eye size={10} />} label="Show All" />
          <QuickActionButton onClick={handleHideAll} icon={<EyeOff size={10} />} label="Hide All" />
          <QuickActionButton onClick={handleLockAll} icon={<Lock size={10} />} label="Lock All" />
        </div>
      )}
    </div>
  );
};

// Individual Trace Layer Item
interface TraceLayerItemProps {
  image: ImageShape;
  onUpdate: (updates: Partial<ImageShape>) => void;
  onRemove: () => void;
  onRecalibrate: () => void;
  onSettingsClick?: () => void;
}

const TraceLayerItem: React.FC<TraceLayerItemProps> = ({
  image,
  onUpdate,
  onRemove,
  onRecalibrate,
  onSettingsClick,
}) => {
  const [showActions, setShowActions] = useState(false);

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ opacity: parseFloat(e.target.value) });
  };

  const setPresetOpacity = (preset: OpacityPreset) => {
    onUpdate({ opacity: OPACITY_PRESETS[preset].value });
  };

  // Find which preset is closest to current opacity
  const getCurrentPreset = (): OpacityPreset | null => {
    const opacityValue = image.opacity;
    for (const [key, preset] of Object.entries(OPACITY_PRESETS)) {
      if (Math.abs(preset.value - opacityValue) < 0.05) {
        return key as OpacityPreset;
      }
    }
    return null;
  };

  const currentPreset = getCurrentPreset();

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: 3,
        overflow: 'hidden',
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Layer Header */}
      <div style={{
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid #f0f0f0',
      }}>
        {/* Visibility Toggle */}
        <button
          onClick={() => onUpdate({ visible: !image.visible })}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            color: image.visible ? '#000000' : '#a0a0a0',
          }}
          title={image.visible ? 'Hide (T)' : 'Show (T)'}
        >
          {image.visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>

        {/* Lock Toggle */}
        <button
          onClick={() => onUpdate({ locked: !image.locked })}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            color: image.locked ? '#dc2626' : '#a0a0a0',
          }}
          title={image.locked ? 'Unlock' : 'Lock'}
        >
          {image.locked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>

        {/* Image Name */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: 500,
          color: image.visible ? '#000000' : '#a0a0a0',
        }}>
          {image.name}
        </div>

        {/* Calibration Status */}
        {image.calibration ? (
          <span style={{
            fontSize: '8px',
            padding: '2px 4px',
            background: '#dcfce7',
            color: '#16a34a',
            borderRadius: 2,
            fontWeight: 600,
          }}>
            ✓
          </span>
        ) : (
          <span style={{
            fontSize: '8px',
            padding: '2px 4px',
            background: '#fef3c7',
            color: '#d97706',
            borderRadius: 2,
            fontWeight: 600,
          }}>
            !
          </span>
        )}
      </div>

      {/* Opacity Control */}
      <div style={{ padding: '8px 10px' }}>
        {/* Opacity Slider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
        }}>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={image.opacity}
            onChange={handleOpacityChange}
            style={{
              flex: 1,
              height: 4,
              cursor: 'pointer',
              accentColor: '#000000',
            }}
          />
          <span style={{
            minWidth: 32,
            textAlign: 'right',
            fontSize: '9px',
            color: '#6c6c6c',
          }}>
            {Math.round(image.opacity * 100)}%
          </span>
        </div>

        {/* Quick Opacity Presets */}
        <div style={{
          display: 'flex',
          gap: 4,
        }}>
          {(Object.keys(OPACITY_PRESETS) as OpacityPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setPresetOpacity(preset)}
              style={{
                flex: 1,
                padding: '4px 2px',
                background: currentPreset === preset ? '#000000' : '#f5f5f5',
                color: currentPreset === preset ? '#ffffff' : '#6c6c6c',
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
                fontSize: '8px',
                fontWeight: 600,
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                transition: 'all 0.1s ease',
              }}
              title={`${OPACITY_PRESETS[preset].label} (${OPACITY_PRESETS[preset].shortLabel})`}
            >
              {OPACITY_PRESETS[preset].shortLabel}
            </button>
          ))}
        </div>

        {/* Scale Info */}
        {image.calibration && (
          <div style={{
            marginTop: 6,
            fontSize: '8px',
            color: '#6c6c6c',
          }}>
            {formatScale(image.calibration.metersPerPixel, image.calibration.unit)}
          </div>
        )}
      </div>

      {/* Actions Row - show on hover or always if no calibration */}
      {(showActions || !image.calibration) && (
        <div style={{
          padding: '6px 10px',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          gap: 4,
        }}>
          {!image.calibration ? (
            <ActionButton 
              onClick={onRecalibrate} 
              label="Calibrate" 
              primary
            />
          ) : (
            <ActionButton 
              onClick={onRecalibrate} 
              icon={<RotateCcw size={10} />}
              label="Recalibrate" 
            />
          )}
          {onSettingsClick && (
            <ActionButton 
              onClick={onSettingsClick} 
              icon={<Settings size={10} />}
              label="Settings" 
            />
          )}
          <ActionButton 
            onClick={onRemove} 
            icon={<Trash2 size={10} />}
            label="Remove"
            danger
          />
        </div>
      )}
    </div>
  );
};

// Action Button Component
interface ActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  primary?: boolean;
  danger?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  icon,
  label,
  primary,
  danger,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyle: React.CSSProperties = {
    flex: 1,
    padding: '4px 6px',
    border: '1px solid',
    borderRadius: 2,
    cursor: 'pointer',
    fontSize: '8px',
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    transition: 'all 0.1s ease',
  };

  const getColors = () => {
    if (danger) {
      return {
        bg: isHovered ? '#dc2626' : '#ffffff',
        color: isHovered ? '#ffffff' : '#dc2626',
        border: '#dc2626',
      };
    }
    if (primary) {
      return {
        bg: isHovered ? '#333333' : '#000000',
        color: '#ffffff',
        border: '#000000',
      };
    }
    return {
      bg: isHovered ? '#000000' : '#ffffff',
      color: isHovered ? '#ffffff' : '#000000',
      border: '#000000',
    };
  };

  const colors = getColors();

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...baseStyle,
        background: colors.bg,
        color: colors.color,
        borderColor: colors.border,
      }}
    >
      {icon}
      {label}
    </button>
  );
};

// Quick Action Button
interface QuickActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  onClick,
  icon,
  label,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '4px 8px',
        background: isHovered ? '#000000' : '#f5f5f5',
        color: isHovered ? '#ffffff' : '#6c6c6c',
        border: 'none',
        borderRadius: 2,
        cursor: 'pointer',
        fontSize: '8px',
        fontWeight: 500,
        fontFamily: "'IBM Plex Mono', monospace",
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        transition: 'all 0.1s ease',
      }}
    >
      {icon}
      {label}
    </button>
  );
};

export default TraceLayerPanel;

