/**
 * ImageCalibrationModal Component
 * 
 * Large modal for uploading and calibrating trace images.
 * Combined point picker + distance input in single view.
 * Uses Clean Theme (WIRED-inspired) styling.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  Move,
} from 'lucide-react';
import type { LengthUnit, Point, ImageShape } from '../Workspace/types';
import { DEFAULT_IMAGE_SHAPE } from '../Workspace/types';
import { 
  loadImageFile, 
  calculateCalibration, 
  createImageCalibration,
  generateImageId,
  extractFileName,
  calculateDistance,
} from './utils';

interface ImageCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (image: ImageShape) => void;
  /** Image to recalibrate (if provided, skip upload step) */
  existingImage?: ImageShape;
  /** Default unit to use */
  defaultUnit?: LengthUnit;
}

type Step = 'upload' | 'calibrate';

const UNIT_OPTIONS: { value: LengthUnit; label: string }[] = [
  { value: 'ft-in', label: 'ft-in' },
  { value: 'ft', label: 'feet' },
  { value: 'm', label: 'meters' },
  { value: 'cm', label: 'cm' },
  { value: 'mm', label: 'mm' },
  { value: 'in', label: 'inches' },
];

const QUICK_DISTANCES: { value: number; unit: LengthUnit; label: string }[] = [
  { value: 1, unit: 'm', label: '1m' },
  { value: 3, unit: 'ft', label: '3ft' },
  { value: 5, unit: 'ft', label: '5ft' },
  { value: 10, unit: 'ft', label: '10ft' },
  { value: 5, unit: 'm', label: '5m' },
  { value: 20, unit: 'ft', label: '20ft' },
];

export const ImageCalibrationModal: React.FC<ImageCalibrationModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  existingImage,
  defaultUnit = 'ft-in',
}) => {
  // State
  const [step, setStep] = useState<Step>(existingImage ? 'calibrate' : 'upload');
  const [imageSrc, setImageSrc] = useState<string | undefined>(existingImage?.src);
  const [imageName, setImageName] = useState<string>(existingImage?.name || '');
  const [originalWidth, setOriginalWidth] = useState<number | undefined>(existingImage?.originalWidth);
  const [originalHeight, setOriginalHeight] = useState<number | undefined>(existingImage?.originalHeight);
  const [point1, setPoint1] = useState<Point | undefined>();
  const [point2, setPoint2] = useState<Point | undefined>();
  const [distance, setDistance] = useState<string>('');
  const [unit, setUnit] = useState<LengthUnit>(defaultUnit);
  const [initialOpacity, setInitialOpacity] = useState(0.4);
  const [initialLocked, setInitialLocked] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  // Point picker state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (existingImage) {
        setStep('calibrate');
        setImageSrc(existingImage.src);
        setImageName(existingImage.name);
        setOriginalWidth(existingImage.originalWidth);
        setOriginalHeight(existingImage.originalHeight);
      } else {
        setStep('upload');
        setImageSrc(undefined);
        setImageName('');
        setOriginalWidth(undefined);
        setOriginalHeight(undefined);
      }
      setPoint1(undefined);
      setPoint2(undefined);
      setDistance('');
      setUnit(defaultUnit);
      setError(undefined);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, existingImage, defaultUnit]);

  // Update viewport size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setViewportSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [step]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle file upload
  const handleFileSelect = useCallback(async (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PNG, JPEG, or WebP image');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Image must be less than 20MB');
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const { src, width, height } = await loadImageFile(file);
      setImageSrc(src);
      setImageName(extractFileName(file));
      setOriginalWidth(width);
      setOriginalHeight(height);
      setStep('calibrate');
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } catch {
      setError('Failed to load image. Please try another file.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Handle point picking
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !originalWidth || !originalHeight) return;
    if (isPanning) return;

    const rect = canvasRef.current.getBoundingClientRect();
    
    // Get click position relative to the canvas container
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Calculate the image display dimensions
    const aspectRatio = originalWidth / originalHeight;
    let displayWidth = rect.width;
    let displayHeight = rect.width / aspectRatio;
    
    if (displayHeight > rect.height) {
      displayHeight = rect.height;
      displayWidth = rect.height * aspectRatio;
    }
    
    // Center offset
    const offsetX = (rect.width - displayWidth) / 2;
    const offsetY = (rect.height - displayHeight) / 2;
    
    // Adjust for zoom and pan
    const adjustedX = (clickX - offsetX) / zoom - pan.x;
    const adjustedY = (clickY - offsetY) / zoom - pan.y;
    
    // Convert to image pixel coordinates
    const pixelX = (adjustedX / displayWidth) * originalWidth;
    const pixelY = (adjustedY / displayHeight) * originalHeight;
    
    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(originalWidth, pixelX));
    const clampedY = Math.max(0, Math.min(originalHeight, pixelY));

    const clickPoint = { x: clampedX, y: clampedY };

    if (!point1) {
      setPoint1(clickPoint);
    } else if (!point2) {
      setPoint2(clickPoint);
    }
  }, [zoom, pan, isPanning, originalWidth, originalHeight, point1]);

  // Handle panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x * zoom, y: e.clientY - pan.y * zoom });
      e.preventDefault();
    }
  }, [pan, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: (e.clientX - panStart.x) / zoom,
        y: (e.clientY - panStart.y) / zoom,
      });
    }
  }, [isPanning, panStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.25, Math.min(8, z * delta)));
  }, []);

  // Reset points
  const resetPoints = useCallback(() => {
    setPoint1(undefined);
    setPoint2(undefined);
  }, []);

  // Reset view
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Calculate pixel distance
  const pixelDistance = point1 && point2 ? calculateDistance(point1, point2) : 0;
  const distanceValue = parseFloat(distance) || 0;

  // Calculate preview
  const preview = (pixelDistance > 0 && distanceValue > 0 && originalWidth && originalHeight)
    ? calculateCalibration(
        { point1Pixel: point1!, point2Pixel: point2!, realDistance: distanceValue, unit },
        originalWidth,
        originalHeight
      )
    : null;

  // Can complete?
  const canComplete = !!(point1 && point2 && pixelDistance > 10 && distanceValue > 0);

  // Complete calibration
  const handleComplete = () => {
    if (!imageSrc || !originalWidth || !originalHeight || !point1 || !point2 || !preview) return;

    const canvasPosition = { x: 0, y: 0 };
    const calibration = createImageCalibration(
      { point1Pixel: point1, point2Pixel: point2, realDistance: distanceValue, unit },
      preview,
      canvasPosition
    );

    const imageShape: ImageShape = existingImage ? {
      ...existingImage,
      calibration,
      width: preview.scaledWidth,
      height: preview.scaledHeight,
      opacity: initialOpacity,
      locked: initialLocked,
    } : {
      ...DEFAULT_IMAGE_SHAPE,
      id: generateImageId(),
      name: imageName,
      src: imageSrc,
      originalWidth,
      originalHeight,
      position: canvasPosition,
      width: preview.scaledWidth,
      height: preview.scaledHeight,
      calibration,
      opacity: initialOpacity,
      locked: initialLocked,
    };

    onComplete(imageShape);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <Crosshair size={14} />
            <span>{step === 'upload' ? 'UPLOAD TRACE IMAGE' : 'CALIBRATE IMAGE'}</span>
          </div>
          <button onClick={onClose} style={styles.closeButton} title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {step === 'upload' ? (
            <UploadStep
              onFileSelect={handleFileSelect}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              fileInputRef={fileInputRef}
              isLoading={isLoading}
              error={error}
            />
          ) : (
            <div style={styles.calibrateLayout}>
              {/* Left: Image Canvas */}
              <div style={styles.canvasSection} ref={containerRef}>
                <div style={styles.canvasHeader}>
                  <span style={styles.canvasTitle}>
                    {!point1 ? '① Click first point' : !point2 ? '② Click second point' : '✓ Points set — enter distance'}
                  </span>
                  <div style={styles.canvasControls}>
                    <button onClick={() => setZoom(z => Math.max(0.25, z / 1.3))} style={styles.controlButton} title="Zoom Out (scroll)">
                      <ZoomOut size={14} />
                    </button>
                    <span style={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(8, z * 1.3))} style={styles.controlButton} title="Zoom In (scroll)">
                      <ZoomIn size={14} />
                    </button>
                    <div style={styles.controlDivider} />
                    <button onClick={resetView} style={styles.controlButton} title="Reset View">
                      <Move size={14} />
                    </button>
                    <button onClick={resetPoints} style={styles.controlButton} title="Reset Points">
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
                
                <div
                  ref={canvasRef}
                  style={{
                    ...styles.imageCanvas,
                    cursor: isPanning ? 'grabbing' : (point1 && point2) ? 'default' : 'crosshair',
                  }}
                  onClick={handleCanvasClick}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                >
                  {imageSrc && originalWidth && originalHeight && (
                    <ImageWithPoints
                      imageSrc={imageSrc}
                      originalWidth={originalWidth}
                      originalHeight={originalHeight}
                      point1={point1}
                      point2={point2}
                      zoom={zoom}
                      pan={pan}
                      containerWidth={viewportSize.width - 340}
                      containerHeight={viewportSize.height - 80}
                    />
                  )}
                </div>
                
                <div style={styles.canvasFooter}>
                  <span>Shift+drag to pan • Scroll to zoom</span>
                  {pixelDistance > 0 && <span style={{ fontWeight: 600 }}>Pixel distance: {Math.round(pixelDistance)} px</span>}
                </div>
              </div>

              {/* Right: Controls Panel */}
              <div style={styles.controlsPanel}>
                <div style={styles.panelSection}>
                  <div style={styles.sectionTitle}>REFERENCE DISTANCE</div>
                  <p style={styles.sectionDesc}>
                    Enter the real-world distance between your two points.
                  </p>
                  
                  <div style={styles.distanceInputRow}>
                    <input
                      type="number"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      placeholder="Distance"
                      style={styles.distanceInput}
                      min="0"
                      step="0.1"
                    />
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as LengthUnit)}
                      style={styles.unitSelect}
                    >
                      {UNIT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.quickPresets}>
                    {QUICK_DISTANCES.map((preset, i) => (
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
                </div>

                {/* Calibration Preview */}
                {preview && (
                  <div style={styles.panelSection}>
                    <div style={styles.sectionTitle}>CALIBRATION RESULT</div>
                    <div style={styles.resultBox}>
                      <div style={styles.resultRow}>
                        <span>Scale:</span>
                        <span>1px = {(preview.metersPerPixel * 1000).toFixed(2)} mm</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span>Image size:</span>
                        <span>{preview.scaledWidth.toFixed(2)}m × {preview.scaledHeight.toFixed(2)}m</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Placement Options */}
                <div style={styles.panelSection}>
                  <div style={styles.sectionTitle}>PLACEMENT OPTIONS</div>
                  
                  <div style={styles.optionRow}>
                    <span>Opacity:</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={initialOpacity}
                      onChange={(e) => setInitialOpacity(parseFloat(e.target.value))}
                      style={styles.slider}
                    />
                    <span style={styles.sliderValue}>{Math.round(initialOpacity * 100)}%</span>
                  </div>
                  
                  <label style={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={initialLocked}
                      onChange={(e) => setInitialLocked(e.target.checked)}
                      style={styles.checkbox}
                    />
                    <span>Lock image position</span>
                  </label>
                </div>

                {/* Status / Warnings */}
                {point1 && point2 && pixelDistance < 50 && (
                  <div style={styles.warningBox}>
                    ⚠️ Points are close together. Pick points further apart for better accuracy.
                  </div>
                )}

                {/* Action Button */}
                <div style={styles.actionSection}>
                  <button
                    onClick={handleComplete}
                    disabled={!canComplete}
                    style={{
                      ...styles.primaryButton,
                      opacity: canComplete ? 1 : 0.5,
                      cursor: canComplete ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <Check size={14} />
                    Place on Canvas
                  </button>
                  
                  {!existingImage && (
                    <button
                      onClick={() => setStep('upload')}
                      style={styles.secondaryButton}
                    >
                      Change Image
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Image with Points Overlay
interface ImageWithPointsProps {
  imageSrc: string;
  originalWidth: number;
  originalHeight: number;
  point1?: Point;
  point2?: Point;
  zoom: number;
  pan: { x: number; y: number };
  containerWidth: number;
  containerHeight: number;
}

const ImageWithPoints: React.FC<ImageWithPointsProps> = ({
  imageSrc,
  originalWidth,
  originalHeight,
  point1,
  point2,
  zoom,
  pan,
  containerWidth,
  containerHeight,
}) => {
  // Calculate display dimensions to fit container
  const aspectRatio = originalWidth / originalHeight;
  let displayWidth = containerWidth;
  let displayHeight = containerWidth / aspectRatio;
  
  if (displayHeight > containerHeight) {
    displayHeight = containerHeight;
    displayWidth = containerHeight * aspectRatio;
  }
  
  // Center offset
  const offsetX = (containerWidth - displayWidth) / 2;
  const offsetY = (containerHeight - displayHeight) / 2;

  return (
    <div style={{
      position: 'absolute',
      left: offsetX,
      top: offsetY,
      width: displayWidth,
      height: displayHeight,
      transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
      transformOrigin: 'center center',
    }}>
      <img
        src={imageSrc}
        alt="Reference"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        draggable={false}
      />
      
      {/* Points overlay */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        viewBox={`0 0 ${originalWidth} ${originalHeight}`}
        preserveAspectRatio="none"
      >
        {/* Line between points */}
        {point1 && point2 && (
          <>
            <line
              x1={point1.x}
              y1={point1.y}
              x2={point2.x}
              y2={point2.y}
              stroke="#16a34a"
              strokeWidth={Math.max(2, 4 / zoom)}
              strokeDasharray={`${12 / zoom} ${8 / zoom}`}
            />
            {/* Distance label at midpoint */}
            <circle
              cx={(point1.x + point2.x) / 2}
              cy={(point1.y + point2.y) / 2}
              r={Math.max(15, 25 / zoom)}
              fill="rgba(22, 163, 74, 0.9)"
            />
          </>
        )}
        
        {/* Point 1 */}
        {point1 && (
          <>
            <circle
              cx={point1.x}
              cy={point1.y}
              r={Math.max(8, 12 / zoom)}
              fill="#16a34a"
              stroke="#ffffff"
              strokeWidth={Math.max(2, 3 / zoom)}
            />
            <text
              x={point1.x}
              y={point1.y + Math.max(25, 35 / zoom)}
              textAnchor="middle"
              fill="#16a34a"
              fontSize={Math.max(14, 20 / zoom)}
              fontWeight="bold"
              fontFamily="'IBM Plex Mono', monospace"
            >
              1
            </text>
          </>
        )}
        
        {/* Point 2 */}
        {point2 && (
          <>
            <circle
              cx={point2.x}
              cy={point2.y}
              r={Math.max(8, 12 / zoom)}
              fill="#dc2626"
              stroke="#ffffff"
              strokeWidth={Math.max(2, 3 / zoom)}
            />
            <text
              x={point2.x}
              y={point2.y + Math.max(25, 35 / zoom)}
              textAnchor="middle"
              fill="#dc2626"
              fontSize={Math.max(14, 20 / zoom)}
              fontWeight="bold"
              fontFamily="'IBM Plex Mono', monospace"
            >
              2
            </text>
          </>
        )}
      </svg>
    </div>
  );
};

// Upload Step Component
interface UploadStepProps {
  onFileSelect: (file: File) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isLoading: boolean;
  error?: string;
}

const UploadStep: React.FC<UploadStepProps> = ({
  onFileSelect,
  onDrop,
  onDragOver,
  fileInputRef,
  isLoading,
  error,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div style={styles.uploadContainer}>
      <div
        style={{
          ...styles.dropZone,
          borderColor: isDragOver ? '#000000' : '#a0a0a0',
          backgroundColor: isDragOver ? '#f0f0f0' : '#fafafa',
        }}
        onDrop={(e) => {
          setIsDragOver(false);
          onDrop(e);
        }}
        onDragOver={(e) => {
          setIsDragOver(true);
          onDragOver(e);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        {isLoading ? (
          <div style={styles.uploadContent}>
            <div style={styles.spinner} />
            <div style={{ marginTop: 16 }}>Loading image...</div>
          </div>
        ) : (
          <div style={styles.uploadContent}>
            <Upload size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
            <div style={{ fontSize: 16, marginBottom: 8 }}>Drop image here or click to browse</div>
            <div style={{ fontSize: 12, color: '#888' }}>
              PNG, JPEG, WebP • Max 20MB
            </div>
          </div>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
      />

      {error && (
        <div style={styles.error}>{error}</div>
      )}
    </div>
  );
};

// Styles (Clean Theme - Large Modal)
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: 20,
  },
  modal: {
    width: '95vw',
    maxWidth: 1400,
    height: '90vh',
    maxHeight: 900,
    background: '#ffffff',
    border: '1px solid #000000',
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '12px',
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    background: '#000000',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontWeight: 600,
    fontSize: '13px',
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
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
  },
  // Upload Step
  uploadContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  dropZone: {
    width: '100%',
    maxWidth: 500,
    height: 300,
    border: '3px dashed',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  uploadContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: '#666',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #e0e0e0',
    borderTopColor: '#000000',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  error: {
    marginTop: 20,
    padding: '12px 20px',
    background: '#fef2f2',
    color: '#dc2626',
    borderRadius: 4,
    fontSize: '12px',
  },
  // Calibrate Layout
  calibrateLayout: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  canvasSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #e0e0e0',
    minWidth: 0,
  },
  canvasHeader: {
    padding: '10px 16px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#f9f9f9',
    flexShrink: 0,
  },
  canvasTitle: {
    fontWeight: 600,
    fontSize: '11px',
  },
  canvasControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  controlButton: {
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
    padding: '6px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#000000',
  },
  controlDivider: {
    width: 1,
    height: 20,
    background: '#e0e0e0',
    margin: '0 4px',
  },
  zoomLabel: {
    minWidth: 45,
    textAlign: 'center',
    fontSize: '10px',
    color: '#666',
  },
  imageCanvas: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    background: '#f5f5f5',
  },
  canvasFooter: {
    padding: '8px 16px',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: '#888',
    background: '#f9f9f9',
    flexShrink: 0,
  },
  // Controls Panel
  controlsPanel: {
    width: 320,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    background: '#ffffff',
  },
  panelSection: {
    padding: '16px 20px',
    borderBottom: '1px solid #e0e0e0',
  },
  sectionTitle: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#000000',
    letterSpacing: '0.1em',
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: '11px',
    color: '#666',
    marginBottom: 12,
    lineHeight: 1.5,
  },
  distanceInputRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  distanceInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #000000',
    borderRadius: 4,
    fontSize: '16px',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  unitSelect: {
    padding: '10px 12px',
    border: '1px solid #000000',
    borderRadius: 4,
    fontSize: '12px',
    fontFamily: "'IBM Plex Mono', monospace",
    background: '#ffffff',
    cursor: 'pointer',
    minWidth: 90,
  },
  quickPresets: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  presetButton: {
    padding: '6px 12px',
    background: '#f5f5f5',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '11px',
    fontFamily: "'IBM Plex Mono', monospace",
    color: '#000000',
    transition: 'all 0.1s ease',
  },
  resultBox: {
    padding: '12px',
    background: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: 4,
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: '11px',
    color: '#166534',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    fontSize: '11px',
  },
  slider: {
    flex: 1,
    accentColor: '#000000',
  },
  sliderValue: {
    minWidth: 35,
    textAlign: 'right',
    fontSize: '10px',
    color: '#666',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    fontSize: '11px',
  },
  checkbox: {
    accentColor: '#000000',
  },
  warningBox: {
    margin: '12px 20px',
    padding: '10px 12px',
    background: '#fef3c7',
    color: '#92400e',
    borderRadius: 4,
    fontSize: '11px',
    lineHeight: 1.4,
  },
  actionSection: {
    padding: '16px 20px',
    marginTop: 'auto',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  primaryButton: {
    padding: '12px 20px',
    background: '#000000',
    color: '#ffffff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  secondaryButton: {
    padding: '10px 16px',
    background: '#ffffff',
    color: '#666',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '11px',
    fontFamily: "'IBM Plex Mono', monospace",
    textAlign: 'center',
  },
};

// Add keyframes for spinner
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default ImageCalibrationModal;
