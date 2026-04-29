/**
 * Trace Layer Utilities
 * Calibration calculations and helper functions
 */

import type { LengthUnit, Point, ImageCalibration } from '../Workspace/types';
import type { CalibrationInput, CalibrationResult } from './types';
import { unitValueToMeters } from '../Workspace/utils/measurements';

/**
 * Calculate the Euclidean distance between two points
 */
export function calculateDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate calibration parameters from user input
 */
export function calculateCalibration(
  input: CalibrationInput,
  originalWidth: number,
  originalHeight: number
): CalibrationResult {
  const { point1Pixel, point2Pixel, realDistance, unit } = input;
  
  // Calculate pixel distance between the two points
  const pixelDistance = calculateDistance(point1Pixel, point2Pixel);
  
  // Convert real distance to meters (internal unit)
  const realDistanceMeters = unitValueToMeters(realDistance, unit);
  
  // Calculate scale: how many meters per pixel
  const metersPerPixel = realDistanceMeters / pixelDistance;
  
  return {
    pixelDistance,
    metersPerPixel,
    scaledWidth: originalWidth * metersPerPixel,
    scaledHeight: originalHeight * metersPerPixel,
  };
}

/**
 * Create a full ImageCalibration object from calibration result
 */
export function createImageCalibration(
  input: CalibrationInput,
  result: CalibrationResult,
  canvasPosition: Point
): ImageCalibration {
  const { point1Pixel, point2Pixel, realDistance, unit } = input;
  const { metersPerPixel, pixelDistance } = result;
  
  // Convert pixel positions to canvas coordinates
  const point1Canvas: Point = {
    x: canvasPosition.x + point1Pixel.x * metersPerPixel,
    y: canvasPosition.y + point1Pixel.y * metersPerPixel,
  };
  
  const point2Canvas: Point = {
    x: canvasPosition.x + point2Pixel.x * metersPerPixel,
    y: canvasPosition.y + point2Pixel.y * metersPerPixel,
  };
  
  return {
    point1Pixel,
    point2Pixel,
    point1Canvas,
    point2Canvas,
    pixelDistance,
    realDistance,
    unit,
    metersPerPixel,
    timestamp: Date.now(),
  };
}

/**
 * Generate CSS filter string from image filters
 */
export function generateCSSFilters(filters?: {
  brightness?: number;
  contrast?: number;
  grayscale?: boolean;
  invert?: boolean;
}): string {
  if (!filters) return 'none';
  
  const filterParts: string[] = [];
  
  if (filters.brightness !== undefined && filters.brightness !== 0) {
    // Convert -100 to +100 to CSS brightness (0 to 2, with 1 being normal)
    const brightnessValue = 1 + filters.brightness / 100;
    filterParts.push(`brightness(${brightnessValue})`);
  }
  
  if (filters.contrast !== undefined && filters.contrast !== 0) {
    // Convert -100 to +100 to CSS contrast (0 to 2, with 1 being normal)
    const contrastValue = 1 + filters.contrast / 100;
    filterParts.push(`contrast(${contrastValue})`);
  }
  
  if (filters.grayscale) {
    filterParts.push('grayscale(1)');
  }
  
  if (filters.invert) {
    filterParts.push('invert(1)');
  }
  
  return filterParts.length > 0 ? filterParts.join(' ') : 'none';
}

/**
 * Generate SVG transform string for image rotation and flip
 */
export function generateImageTransform(
  position: Point,
  width: number,
  height: number,
  rotation: number,
  flipHorizontal: boolean,
  flipVertical: boolean
): string {
  const transforms: string[] = [];
  
  // Calculate center for rotation/flip
  const centerX = position.x + width / 2;
  const centerY = position.y + height / 2;
  
  // Apply rotation around center
  if (rotation !== 0) {
    transforms.push(`rotate(${rotation} ${centerX} ${centerY})`);
  }
  
  // Apply flip transforms
  if (flipHorizontal || flipVertical) {
    const scaleX = flipHorizontal ? -1 : 1;
    const scaleY = flipVertical ? -1 : 1;
    
    // To flip around center: translate to origin, scale, translate back
    transforms.push(`translate(${centerX} ${centerY})`);
    transforms.push(`scale(${scaleX} ${scaleY})`);
    transforms.push(`translate(${-centerX} ${-centerY})`);
  }
  
  return transforms.join(' ');
}

/**
 * Load an image file and return its dimensions and data URL
 */
export function loadImageFile(file: File): Promise<{
  src: string;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    // Try using createObjectURL first (more efficient for large files)
    // Fall back to FileReader if that fails
    
    const tryObjectURL = () => {
      try {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        
        img.onload = () => {
          // Convert to data URL for storage (ObjectURL won't persist)
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            // Fall back to FileReader
            tryFileReader();
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          
          // Try to get data URL, handling potential security errors
          try {
            const dataUrl = canvas.toDataURL(file.type || 'image/png');
            URL.revokeObjectURL(objectUrl);
            
            resolve({
              src: dataUrl,
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          } catch (e) {
            console.warn('[TraceLayer] Canvas toDataURL failed, using FileReader:', e);
            URL.revokeObjectURL(objectUrl);
            tryFileReader();
          }
        };
        
        img.onerror = () => {
          console.warn('[TraceLayer] ObjectURL image load failed, trying FileReader');
          URL.revokeObjectURL(objectUrl);
          tryFileReader();
        };
        
        img.src = objectUrl;
      } catch (e) {
        console.warn('[TraceLayer] createObjectURL failed, using FileReader:', e);
        tryFileReader();
      }
    };
    
    const tryFileReader = () => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const src = reader.result as string;
        
        if (!src) {
          reject(new Error('FileReader returned empty result'));
          return;
        }
        
        const img = new Image();
        
        img.onload = () => {
          if (img.naturalWidth === 0 || img.naturalHeight === 0) {
            reject(new Error('Image has invalid dimensions (0x0)'));
            return;
          }
          
          resolve({
            src,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        };
        
        img.onerror = (e) => {
          console.error('[TraceLayer] Image load error:', e);
          reject(new Error('Browser failed to decode the image. The file may be corrupted or in an unsupported format.'));
        };
        
        img.src = src;
      };
      
      reader.onerror = (e) => {
        console.error('[TraceLayer] FileReader error:', e);
        reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`));
      };
      
      reader.readAsDataURL(file);
    };
    
    // Start with ObjectURL approach (faster for large images)
    tryObjectURL();
  });
}

/**
 * Format scale for display
 */
export function formatScale(metersPerPixel: number, unit: LengthUnit): string {
  // Convert to display unit
  let valuePerPixel: number;
  let unitLabel: string;
  
  switch (unit) {
    case 'mm':
      valuePerPixel = metersPerPixel * 1000;
      unitLabel = 'mm';
      break;
    case 'cm':
      valuePerPixel = metersPerPixel * 100;
      unitLabel = 'cm';
      break;
    case 'm':
      valuePerPixel = metersPerPixel;
      unitLabel = 'm';
      break;
    case 'in':
      valuePerPixel = metersPerPixel / 0.0254;
      unitLabel = 'in';
      break;
    case 'ft':
    case 'ft-in':
    default:
      valuePerPixel = metersPerPixel / 0.3048;
      unitLabel = 'ft';
      break;
  }
  
  // Format with appropriate precision
  if (valuePerPixel < 0.001) {
    return `1px = ${(valuePerPixel * 1000).toFixed(2)} ${unitLabel === 'mm' ? 'µm' : 'm' + unitLabel}`;
  } else if (valuePerPixel < 0.01) {
    return `1px = ${valuePerPixel.toFixed(4)} ${unitLabel}`;
  } else if (valuePerPixel < 1) {
    return `1px = ${valuePerPixel.toFixed(3)} ${unitLabel}`;
  } else {
    return `1px = ${valuePerPixel.toFixed(2)} ${unitLabel}`;
  }
}

/**
 * Generate a unique ID for a new image
 */
export function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract filename from a File object
 */
export function extractFileName(file: File): string {
  // Remove extension and limit length
  const name = file.name.replace(/\.[^/.]+$/, '');
  return name.length > 30 ? name.substring(0, 30) + '...' : name;
}

