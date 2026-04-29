/**
 * DynamicInput Component
 * 
 * On-cursor input overlay for precision drawing.
 * Shows distance and angle from the last point, and allows typing exact values.
 * 
 * Features:
 * - Live distance/angle display that follows cursor
 * - Type to enter exact values
 * - Tab to switch between distance and angle
 * - Enter to confirm, Escape to cancel
 * - Supports all coordinate formats (@x,y, @d<a, etc.)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Point, LengthUnit } from '../../types';
import { parseCoordinateInput, resolveCoordinate } from '../../../../lib/precision/coordinateParser';
import type { CoordinateContext } from '../../../../lib/precision/types';
import { formatLength, formatAngle, calculateSegmentAngle } from '../../utils/measurements';
import { useTheme, getThemedInputStyle } from '../../../../theme/useTheme';
import type { ToolbarStyle } from '../../../../theme';

export interface DynamicInputProps {
  /** Current cursor position in canvas coordinates (meters) */
  cursorPosition: Point;
  
  /** Last clicked point - start of current segment (meters) */
  lastPoint: Point;
  
  /** Previous point before last (for polyline angle between segments) */
  prevPoint?: Point | null;

  /** Whether angle entry should be shown/enabled */
  allowAngle?: boolean;

  /** Current shape type being drawn (used for rectangle/circle behaviors) */
  shapeType?: string | null;
  
  /** Current length unit for display and default parsing */
  lengthUnit: LengthUnit;
  
  /** Whether dynamic input is enabled */
  enabled: boolean;
  
  /** Whether we're currently in drawing mode */
  isDrawing: boolean;
  
  /** Callback when user confirms input with a point */
  onConfirm: (point: Point) => void;
  
  /** Callback when input changes (for preview line) */
  onPreview?: (point: Point | null) => void;
  
  /** Callback when user cancels input */
  onCancel?: () => void;
  
  /** Theme style to match the workspace toolbar (defaults to modern) */
  toolbarStyle?: ToolbarStyle;
}

/**
 * Convert distance from workspace units to meters
 */
function convertToMeters(value: number, unit: LengthUnit): number {
  switch (unit) {
    case 'mm': return value / 1000;
    case 'cm': return value / 100;
    case 'm': return value;
    case 'in': return value * 0.0254;
    case 'ft':
    case 'ft-in':
    default:
      return value * 0.3048;
  }
}

export const DynamicInput: React.FC<DynamicInputProps> = ({
  cursorPosition,
  lastPoint,
  prevPoint = null,
  allowAngle = true,
  shapeType = null,
  lengthUnit,
  enabled,
  isDrawing,
  onConfirm,
  onPreview,
  onCancel,
  toolbarStyle = 'modern',
}) => {
  // Input state
  const [distanceInput, setDistanceInput] = useState('');
  const [angleInput, setAngleInput] = useState('');
  const [activeField, setActiveField] = useState<'distance' | 'angle'>('distance');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for input fields
  const distanceRef = useRef<HTMLInputElement>(null);
  const angleRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate current distance and angle from cursor position
  const dx = cursorPosition.x - lastPoint.x;
  const dy = cursorPosition.y - lastPoint.y;
  const currentDistance = Math.hypot(dx, dy);
  // Angle in degrees, 0° = right, positive = counterclockwise
  // Negate dy because SVG Y increases downward
  const currentAngle = Math.atan2(-dy, dx) * (180 / Math.PI);

  const isRectangle = shapeType === 'rectangle';
  const isCircle = shapeType === 'circle';
  const hasSecondField = allowAngle || isRectangle;
  
  // Format display values
  const currentLength = isRectangle ? Math.abs(dx) : currentDistance;
  const currentBreadth = Math.abs(dy);
  const displayDistance = formatLength(currentLength, lengthUnit);
  const segmentAngle = prevPoint ? calculateSegmentAngle(prevPoint, lastPoint, cursorPosition) : currentAngle;
  const displayAngle = formatAngle(segmentAngle);
  const displayBreadth = formatLength(currentBreadth, lengthUnit);
  const primaryLabel = isRectangle ? 'Width' : isCircle ? 'Radius' : 'Distance';
  const secondaryLabel = isRectangle ? 'Height' : 'Angle';
  const secondPlaceholder = isRectangle ? displayBreadth : displayAngle;
  
  // Reset state when drawing starts/stops
  useEffect(() => {
    if (!isDrawing) {
      setIsEditing(false);
      setDistanceInput('');
      setAngleInput('');
      setError(null);
    }
  }, [isDrawing]);
  
  // Focus appropriate field when editing starts
  useEffect(() => {
    if (isEditing) {
      if (activeField === 'distance') {
        distanceRef.current?.focus();
        distanceRef.current?.select();
      } else {
        angleRef.current?.focus();
        angleRef.current?.select();
      }
    }
  }, [isEditing, activeField]);
  
  /**
   * Calculate the target point from current inputs
   */
  const calculateTargetPoint = useCallback((): Point | null => {
    const context: CoordinateContext = {
      lastPoint,
      cursorDirection: { x: dx, y: dy },
      defaultUnit: lengthUnit,
    };
    
    if (isRectangle) {
      const lengthValue = distanceInput.trim()
        ? parseFloat(distanceInput)
        : currentLength;
      const breadthValue = angleInput.trim()
        ? parseFloat(angleInput)
        : currentBreadth;

      if (isNaN(lengthValue) || isNaN(breadthValue)) {
        return null;
      }

      const lengthMeters = distanceInput.trim()
        ? convertToMeters(lengthValue, lengthUnit)
        : lengthValue;
      const breadthMeters = angleInput.trim()
        ? convertToMeters(breadthValue, lengthUnit)
        : breadthValue;

      const signX = dx >= 0 ? 1 : -1;
      const signY = dy >= 0 ? 1 : -1;

      return {
        x: lastPoint.x + lengthMeters * signX,
        y: lastPoint.y + breadthMeters * signY,
      };
    }

    // If distance input contains coordinate syntax, parse it directly
    if (distanceInput.includes(',') || distanceInput.includes('<')) {
      const parsed = parseCoordinateInput(distanceInput);
      if (parsed.type !== 'error') {
        return resolveCoordinate(parsed, context);
      }
      return null;
    }
    
    // Otherwise, use distance + angle mode
    const distanceValue = distanceInput.trim() 
      ? parseFloat(distanceInput) 
      : currentDistance;
    
    const angleValue = angleInput.trim() 
      ? parseFloat(angleInput) 
      : currentAngle;
    
    if (isNaN(distanceValue)) {
      return null;
    }
    
    // Convert distance from display units to meters
    const distanceMeters = distanceInput.trim() 
      ? convertToMeters(distanceValue, lengthUnit)
      : distanceValue; // Already in meters if from cursor
    
    const angleRad = (angleValue * Math.PI) / 180;
    
    return {
      x: lastPoint.x + distanceMeters * Math.cos(angleRad),
      y: lastPoint.y - distanceMeters * Math.sin(angleRad), // Negative for SVG coords
    };
  }, [distanceInput, angleInput, lastPoint, dx, dy, currentDistance, currentAngle, lengthUnit, isRectangle, currentLength, currentBreadth]);
  
  /**
   * Handle confirmation of input
   */
  const handleConfirm = useCallback(() => {
    const point = calculateTargetPoint();
    
    if (!point) {
      setError('Invalid input');
      return;
    }
    
    onConfirm(point);
    setDistanceInput('');
    setAngleInput('');
    setIsEditing(false);
    setError(null);
  }, [calculateTargetPoint, onConfirm]);
  
  /**
   * Handle cancellation
   */
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDistanceInput('');
    setAngleInput('');
    setError(null);
    onPreview?.(null);
    onCancel?.();
  }, [onPreview, onCancel]);
  
  /**
   * Clear error when input becomes valid
   */
  useEffect(() => {
    if (!isEditing) return;
    
    const point = calculateTargetPoint();
    
    // Clear error if input is now valid
    if (point) {
      setError(null);
    }
  }, [isEditing, distanceInput, angleInput, calculateTargetPoint]);
  
  /**
   * Global keyboard handler
   */
  useEffect(() => {
    if (!enabled || !isDrawing) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if in another input field
      const target = e.target as HTMLElement;
      const isInOurInput = containerRef.current?.contains(target);
      const isInOtherInput = (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      ) && !isInOurInput;
      
      if (isInOtherInput) return;
      
      // Start editing when typing a number
      if (!isEditing && /^[\d.@]$/.test(e.key)) {
        e.preventDefault();
        setIsEditing(true);
        setActiveField('distance');
        setDistanceInput(e.key);
        return;
      }
      
      if (!isEditing) return;
      
      // Handle special keys during editing
      switch (e.key) {
        case 'Tab':
          if (hasSecondField) {
            e.preventDefault();
            setActiveField(prev => prev === 'distance' ? 'angle' : 'distance');
          }
          break;
          
        case 'Enter':
          e.preventDefault();
          handleConfirm();
          break;
          
        case 'Escape':
          e.preventDefault();
          handleCancel();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, isDrawing, isEditing, handleConfirm, handleCancel]);
  
  // Theming (defaults to modern)
  const themeVariant = toolbarStyle ?? 'modern';
  const { theme } = useTheme(themeVariant);
  const inputBaseStyle = getThemedInputStyle(theme, themeVariant);
  const unitLabel = (() => {
    switch (lengthUnit) {
      case 'ft-in': return 'ft-in';
      case 'ft': return 'ft';
      case 'in': return 'in';
      case 'cm': return 'cm';
      case 'mm': return 'mm';
      case 'm':
      default: return 'm';
    }
  })();
  
  const fieldContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  };
  
  const labelStyle: React.CSSProperties = {
    color: '#666',
    fontWeight: 500,
    fontSize: '11px',
    whiteSpace: 'nowrap',
    letterSpacing: '0.01em',
    flexShrink: 0,
    minWidth: '48px',
  };
  
  const readoutStyle: React.CSSProperties = {
    width: '72px',
    padding: '5px 8px',
    borderRadius: '4px',
    background: '#fff',
    border: '1px solid #e0e0e0',
    color: '#222',
    cursor: 'text',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'border-color 0.15s, box-shadow 0.15s',
    textAlign: 'right' as const,
  };
  
  const dividerStyle: React.CSSProperties = {
    width: '1px',
    height: '24px',
    marginLeft: '14px',
    marginRight: '14px',
    background: '#d0d0d0',
    flexShrink: 0,
  };
  
  const unitStyle: React.CSSProperties = {
    color: '#888',
    fontSize: '11px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    minWidth: '24px',
  };
  
  // Don't render if not enabled or not drawing
  if (!enabled || !isDrawing) return null;
  
  // Position the overlay as a static row at the bottom-center of the canvas
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    bottom: '10px',
    transform: 'translateX(-50%)',
    pointerEvents: 'auto',
    zIndex: 10000,
  };
  
  return (
    <div ref={containerRef} style={overlayStyle}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.97)',
          border: '1px solid #d8d8d8',
          borderRadius: '8px',
          padding: '8px 14px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
          fontFamily: theme.fontFamily,
          fontSize: '12px',
          color: '#333',
          minWidth: '240px',
        }}
      >
          {/* Distance / Width */}
          <div style={fieldContainerStyle}>
            <span style={labelStyle}>{primaryLabel}</span>
            {isEditing && activeField === 'distance' ? (
              <input
                ref={distanceRef}
                type="text"
                value={distanceInput}
                onChange={(e) => setDistanceInput(e.target.value)}
                onFocus={() => setActiveField('distance')}
                placeholder={displayDistance}
                autoComplete="off"
                spellCheck={false}
                style={{
                  ...inputBaseStyle,
                  width: '72px',
                  padding: '5px 8px',
                  fontSize: '12px',
                  background: '#fff',
                  color: '#222',
                  border: '1px solid',
                  borderColor: theme.colors.accent,
                  borderRadius: '4px',
                  boxShadow: `0 0 0 2px ${theme.colors.glowColor}`,
                  textAlign: 'right',
                }}
              />
            ) : (
              <span
                style={readoutStyle}
                onClick={() => {
                  setIsEditing(true);
                  setActiveField('distance');
                }}
              >
                {displayDistance}
              </span>
            )}
            <span style={unitStyle}>{unitLabel}</span>
          </div>
          
          {hasSecondField && (
            <>
              <div style={dividerStyle} />
              
              {/* Angle / Height */}
              <div style={fieldContainerStyle}>
                <span style={labelStyle}>{secondaryLabel}</span>
                {isEditing && activeField === 'angle' ? (
                  <input
                    ref={angleRef}
                    type="text"
                    value={angleInput}
                    onChange={(e) => setAngleInput(e.target.value)}
                    onFocus={() => setActiveField('angle')}
                    placeholder={secondPlaceholder}
                    autoComplete="off"
                    spellCheck={false}
                    style={{
                      ...inputBaseStyle,
                      width: '72px',
                      padding: '5px 8px',
                      fontSize: '12px',
                      background: '#fff',
                      color: '#222',
                      border: '1px solid',
                      borderColor: theme.colors.accent,
                      borderRadius: '4px',
                      boxShadow: `0 0 0 2px ${theme.colors.glowColor}`,
                      textAlign: 'right',
                    }}
                  />
                ) : (
                  <span
                    style={readoutStyle}
                    onClick={() => {
                      setIsEditing(true);
                      setActiveField('angle');
                    }}
                  >
                    {secondPlaceholder}
                  </span>
                )}
                <span style={unitStyle}>{isRectangle ? unitLabel : '°'}</span>
              </div>
            </>
          )}
        
        {/* Inline error */}
        {error ? (
          <div
            style={{
              color: '#d92d20',
              fontSize: '11px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              marginLeft: '4px',
            }}
          >
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DynamicInput;

