/**
 * CalibrationOverlay Component
 * 
 * Floating panel for on-canvas calibration of trace images.
 * User marks two points directly on the canvas, then enters the distance.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, RotateCcw, Target } from 'lucide-react';
import type { LengthUnit, Point, ImageShape } from '../Workspace/types';
import { calculateCalibration, createImageCalibration, calculateDistance } from './utils';

interface CalibrationOverlayProps {
  isActive: boolean;
  image: ImageShape | null;
  point1: Point | null;
  point2: Point | null;
  defaultUnit?: LengthUnit;
  onCancel: () => void;
  onComplete: (imageId: string, calibration: ImageShape['calibration'], scaledWidth: number, scaledHeight: number) => void;
  onResetPoints: () => void;
}

const UNIT_OPTIONS: { value: LengthUnit; label: string }[] = [
  { value: 'ft-in', label: 'ft-in' },
  { value: 'ft', label: 'feet' },
  { value: 'm', label: 'm' },
  { value: 'cm', label: 'cm' },
  { value: 'mm', label: 'mm' },
  { value: 'in', label: 'in' },
];

const QUICK_PRESETS: { value: number; unit: LengthUnit; label: string }[] = [
  { value: 1, unit: 'm', label: '1m' },
  { value: 3, unit: 'ft', label: '3ft' },
  { value: 5, unit: 'ft', label: '5ft' },
  { value: 10, unit: 'ft', label: '10ft' },
  { value: 5, unit: 'm', label: '5m' },
];

export const CalibrationOverlay: React.FC<CalibrationOverlayProps> = ({
  isActive,
  image,
  point1,
  point2,
  defaultUnit = 'ft-in',
  onCancel,
  onComplete,
  onResetPoints,
}) => {
  const [distance, setDistance] = useState('');
  const [unit, setUnit] = useState<LengthUnit>(defaultUnit);

  // Reset distance when calibration starts
  useEffect(() => {
    if (isActive) {
      setDistance('');
      setUnit(defaultUnit);
    }
  }, [isActive, defaultUnit]);

  // Calculate pixel distance between points
  const pixelDistance = (point1 && point2) ? calculateDistance(point1, point2) : 0;
  const distanceValue = parseFloat(distance) || 0;

  // Check if we can complete
  const canComplete = !!(image && point1 && point2 && pixelDistance > 10 && distanceValue > 0);

  // Handle completion
  const handleComplete = useCallback(() => {
    if (!image || !point1 || !point2 || !canComplete) return;

    const result = calculateCalibration(
      { point1Pixel: point1, point2Pixel: point2, realDistance: distanceValue, unit },
      image.originalWidth,
      image.originalHeight
    );

    const calibration = createImageCalibration(
      { point1Pixel: point1, point2Pixel: point2, realDistance: distanceValue, unit },
      result,
      image.position
    );

    onComplete(image.id, calibration, result.scaledWidth, result.scaledHeight);
  }, [image, point1, point2, canComplete, distanceValue, unit, onComplete]);

  // Handle Enter key
  useEffect(() => {
    if (!isActive) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canComplete) {
        handleComplete();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, canComplete, handleComplete, onCancel]);

  if (!isActive) return null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <Target size={14} />
          <span>CALIBRATE: {image?.name || 'Image'}</span>
        </div>
        <button onClick={onCancel} style={styles.closeButton} title="Cancel (Esc)">
          <X size={14} />
        </button>
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        {!point1 ? (
          <div style={styles.step}>
            <span style={styles.stepNumber}>1</span>
            Click first point on the image
          </div>
        ) : !point2 ? (
          <div style={styles.step}>
            <span style={styles.stepNumber}>2</span>
            Click second point on the image
          </div>
        ) : (
          <div style={styles.step}>
            <span style={{ ...styles.stepNumber, background: '#16a34a' }}>✓</span>
            Points set — enter distance below
          </div>
        )}
      </div>

      {/* Distance Input (visible after both points are set) */}
      {point1 && point2 && (
        <div style={styles.distanceSection}>
          <div style={styles.label}>Real-world distance between points:</div>
          
          <div style={styles.inputRow}>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="Distance"
              style={styles.input}
              min="0"
              step="0.1"
              autoFocus
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as LengthUnit)}
              style={styles.select}
            >
              {UNIT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Quick Presets */}
          <div style={styles.presets}>
            {QUICK_PRESETS.map((preset, i) => (
              <button
                key={i}
                onClick={() => {
                  setDistance(preset.value.toString());
                  setUnit(preset.unit);
                }}
                style={styles.presetButton}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Pixel distance info */}
          <div style={styles.info}>
            Pixel distance: {Math.round(pixelDistance)} px
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button onClick={onResetPoints} style={styles.secondaryButton}>
          <RotateCcw size={12} />
          Reset Points
        </button>
        <button
          onClick={handleComplete}
          disabled={!canComplete}
          style={{
            ...styles.primaryButton,
            opacity: canComplete ? 1 : 0.5,
            cursor: canComplete ? 'pointer' : 'not-allowed',
          }}
        >
          <Check size={12} />
          Apply Calibration
        </button>
      </div>
    </div>
  );
};

// Styles (Clean Theme)
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 340,
    background: '#ffffff',
    border: '2px solid #000000',
    borderRadius: 6,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    zIndex: 10000,
    overflow: 'hidden',
  },
  header: {
    padding: '10px 14px',
    background: '#000000',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 600,
    fontSize: '10px',
    letterSpacing: '0.05em',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    opacity: 0.8,
  },
  instructions: {
    padding: '12px 14px',
    borderBottom: '1px solid #e0e0e0',
    background: '#f9f9f9',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: '11px',
    fontWeight: 500,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#000000',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 700,
    flexShrink: 0,
  },
  distanceSection: {
    padding: '14px',
  },
  label: {
    fontSize: '10px',
    color: '#666',
    marginBottom: 10,
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #000000',
    borderRadius: 4,
    fontSize: '14px',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #000000',
    borderRadius: 4,
    fontSize: '11px',
    fontFamily: "'IBM Plex Mono', monospace",
    background: '#ffffff',
    cursor: 'pointer',
    minWidth: 70,
  },
  presets: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  presetButton: {
    padding: '5px 10px',
    background: '#f5f5f5',
    border: '1px solid #e0e0e0',
    borderRadius: 3,
    cursor: 'pointer',
    fontSize: '10px',
    fontFamily: "'IBM Plex Mono', monospace",
    color: '#000000',
    transition: 'all 0.1s ease',
  },
  info: {
    fontSize: '9px',
    color: '#888',
  },
  actions: {
    padding: '12px 14px',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    padding: '10px 14px',
    background: '#000000',
    color: '#ffffff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  secondaryButton: {
    padding: '10px 14px',
    background: '#ffffff',
    color: '#666',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '10px',
    fontFamily: "'IBM Plex Mono', monospace",
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
};

export default CalibrationOverlay;

