/**
 * ImageUploadModal Component
 * 
 * Simple modal for uploading trace images.
 * Image is placed on canvas immediately - calibration happens on-canvas.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import type { ImageShape } from '../Workspace/types';
import { DEFAULT_IMAGE_SHAPE } from '../Workspace/types';
import { loadImageFile, generateImageId, extractFileName } from './utils';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (image: ImageShape) => void;
  /** Center position for placing the image (canvas coordinates) */
  canvasCenter?: { x: number; y: number };
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  canvasCenter = { x: 0, y: 0 },
}) => {
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(undefined);
      setIsLoading(false);
      setIsDragOver(false);
    }
  }, [isOpen]);

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
    // More permissive type checking - also accept empty type (some browsers don't set it)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', ''];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const validExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension || '')) {
      setError(`Invalid file type: ${file.type || 'unknown'}. Please upload a PNG, JPEG, or WebP image.`);
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
      
      // Default size: fit within ~10 meters while maintaining aspect ratio
      const maxSize = 10; // meters
      const aspectRatio = width / height;
      let displayWidth = maxSize;
      let displayHeight = maxSize / aspectRatio;
      
      if (displayHeight > maxSize) {
        displayHeight = maxSize;
        displayWidth = maxSize * aspectRatio;
      }

      // Center the image at canvas center
      const position = {
        x: canvasCenter.x - displayWidth / 2,
        y: canvasCenter.y - displayHeight / 2,
      };

      const imageShape: ImageShape = {
        ...DEFAULT_IMAGE_SHAPE,
        id: generateImageId(),
        name: extractFileName(file),
        src,
        originalWidth: width,
        originalHeight: height,
        position,
        width: displayWidth,
        height: displayHeight,
        opacity: 0.5,
        locked: false, // Start unlocked so user can reposition
        visible: true,
      };

      onComplete(imageShape);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load image: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [canvasCenter, onComplete, onClose]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <ImageIcon size={14} />
            <span>ADD TRACE IMAGE</span>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          <div
            style={{
              ...styles.dropZone,
              borderColor: isDragOver ? '#000000' : '#a0a0a0',
              backgroundColor: isDragOver ? '#f0f0f0' : '#fafafa',
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            {isLoading ? (
              <div style={styles.uploadContent}>
                <div style={styles.spinner} />
                <div style={{ marginTop: 12 }}>Loading image...</div>
              </div>
            ) : (
              <div style={styles.uploadContent}>
                <Upload size={40} style={{ marginBottom: 16, opacity: 0.4 }} />
                <div style={{ fontSize: 14, marginBottom: 8 }}>
                  Drop image here or click to browse
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>
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
              if (file) handleFileSelect(file);
            }}
          />

          {error && (
            <div style={styles.error}>{error}</div>
          )}

          <div style={styles.hint}>
            After uploading, click <strong>Calibrate</strong> in the Trace Layers panel 
            to mark two reference points and set the scale.
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles (Clean Theme)
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  modal: {
    width: 420,
    maxWidth: '90vw',
    background: '#ffffff',
    border: '1px solid #000000',
    borderRadius: 4,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
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
    fontSize: '11px',
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
  },
  content: {
    padding: 20,
  },
  dropZone: {
    width: '100%',
    height: 200,
    border: '2px dashed',
    borderRadius: 6,
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
    width: 28,
    height: 28,
    border: '3px solid #e0e0e0',
    borderTopColor: '#000000',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  error: {
    marginTop: 12,
    padding: '10px 14px',
    background: '#fef2f2',
    color: '#dc2626',
    borderRadius: 4,
    fontSize: '11px',
  },
  hint: {
    marginTop: 16,
    padding: '12px 14px',
    background: '#f9f9f9',
    borderRadius: 4,
    fontSize: '10px',
    color: '#666',
    lineHeight: 1.5,
    textAlign: 'center',
  },
};

// Add keyframes for spinner
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('trace-upload-spinner-style');
  if (!existingStyle) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'trace-upload-spinner-style';
    styleSheet.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

export default ImageUploadModal;

