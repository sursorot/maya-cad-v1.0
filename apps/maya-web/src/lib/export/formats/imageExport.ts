/**
 * Image Export
 * Export canvas as PNG, JPEG, or SVG
 */

import type { ExportBoundingBox, ImageExportOptions } from '../types';
import { 
  drawFooterOnCanvas, 
  generateFooterSVG, 
  calculateFooterHeight,
} from '../utils/footerRenderer';

// Base pixels per meter for export resolution
const BASE_PIXELS_PER_METER = 100;

// ============================================================================
// SVG Cloning and Preparation
// ============================================================================

/**
 * Clone an SVG element and prepare it for export
 */
export function prepareExportSVG(
  svgElement: SVGSVGElement,
  bounds: ExportBoundingBox,
  options: {
    backgroundColor?: string;
    includeGrid?: boolean;
    includeMeasurements?: boolean;
    includeGuidelines?: boolean;
    pixelWidth?: number;
    pixelHeight?: number;
  }
): SVGSVGElement {
  // Deep clone the SVG
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  
  // Calculate pixel dimensions
  const pixelWidth = options.pixelWidth || bounds.width * BASE_PIXELS_PER_METER;
  const pixelHeight = options.pixelHeight || bounds.height * BASE_PIXELS_PER_METER;
  
  // Ensure xmlns is set
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  
  // Set viewBox to match export bounds
  clone.setAttribute('viewBox', `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`);
  
  // Set explicit width and height in PIXELS for export
  clone.setAttribute('width', String(pixelWidth));
  clone.setAttribute('height', String(pixelHeight));
  
  // Remove cursor styles
  clone.style.cursor = 'default';
  clone.style.backgroundColor = '';
  
  // Remove interactive elements
  clone.querySelectorAll('[data-interactive="true"]').forEach(el => el.remove());
  
  // Remove selection indicators (bounding boxes, handles)
  clone.querySelectorAll('.bounding-box, .selection-handle, .resize-handle, .rotate-handle').forEach(el => el.remove());
  
  // Remove snap indicators and other export-excluded elements
  clone.querySelectorAll('.snap-indicator').forEach(el => el.remove());
  clone.querySelectorAll('[data-export-exclude="true"]').forEach(el => el.remove());
  
  // Remove hover highlights
  clone.querySelectorAll('[data-hovered="true"]').forEach(el => {
    el.removeAttribute('data-hovered');
  });
  
  // Remove selection highlights
  clone.querySelectorAll('[data-selected="true"]').forEach(el => {
    el.removeAttribute('data-selected');
  });
  
  // Optionally remove grid - be more thorough
  if (!options.includeGrid) {
    // Remove grid background rect
    clone.querySelectorAll('[fill^="url(#minorGrid)"], [fill^="url(#mediumGrid)"], [fill^="url(#majorGrid)"]').forEach(el => el.remove());
    clone.querySelectorAll('[fill^="url(#grid"]').forEach(el => el.remove());
    clone.querySelectorAll('pattern[id*="Grid"]').forEach(el => el.remove());
    clone.querySelectorAll('pattern[id*="grid"]').forEach(el => el.remove());
    // Remove grid rect that may exist
    const gridRect = clone.querySelector('rect[fill*="url(#"]');
    if (gridRect && gridRect.getAttribute('fill')?.includes('Grid')) {
      gridRect.remove();
    }
  }
  
  // Optionally remove guidelines
  if (!options.includeGuidelines) {
    clone.querySelectorAll('.guideline, [data-shape-type="guideline"]').forEach(el => el.remove());
  }
  
  // NOTE: We keep masks for wall opening cutouts - they are needed for proper rendering
  // Only remove masks that reference non-existent definitions
  clone.querySelectorAll('[mask]').forEach(el => {
    const maskRef = el.getAttribute('mask');
    if (maskRef) {
      // Extract mask ID from url(#mask-id)
      const match = maskRef.match(/url\(#([^)]+)\)/);
      if (match) {
        const maskId = match[1];
        // Check if the mask definition exists in the clone
        const maskDef = clone.querySelector(`#${maskId}`);
        if (!maskDef) {
          // Only remove mask if the definition doesn't exist
          el.removeAttribute('mask');
        }
      }
    }
  });
  
  // Add background color if specified - insert AFTER defs
  if (options.backgroundColor && options.backgroundColor !== 'transparent') {
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', String(bounds.minX));
    bgRect.setAttribute('y', String(bounds.minY));
    bgRect.setAttribute('width', String(bounds.width));
    bgRect.setAttribute('height', String(bounds.height));
    bgRect.setAttribute('fill', options.backgroundColor);
    
    // Find defs element or first child
    const defs = clone.querySelector('defs');
    if (defs && defs.nextSibling) {
      clone.insertBefore(bgRect, defs.nextSibling);
    } else if (clone.firstChild) {
      clone.insertBefore(bgRect, clone.firstChild);
    } else {
      clone.appendChild(bgRect);
    }
  }
  
  // Ensure merged walls have correct explicit attributes preserved
  const mergedWallsGroup = clone.querySelector('.merged-walls');
  if (mergedWallsGroup) {
    // Copy computed styles to explicit attributes for standalone rendering
    mergedWallsGroup.querySelectorAll('polygon, path').forEach(el => {
      // Only set if not already explicitly set
      if (!el.getAttribute('fill')) {
        el.setAttribute('fill', '#FFFFFF');
      }
      if (!el.getAttribute('stroke')) {
        el.setAttribute('stroke', '#1a1a1a');
      }
      if (!el.getAttribute('stroke-width')) {
        el.setAttribute('stroke-width', '1');
      }
    });
  }
  
  // Handle wall seam covers
  const seamCovers = clone.querySelector('.wall-seam-covers');
  if (seamCovers) {
    seamCovers.querySelectorAll('polygon').forEach(el => {
      if (!el.getAttribute('fill') || el.getAttribute('fill') === 'inherit') {
        el.setAttribute('fill', '#FFFFFF');
      }
      el.setAttribute('stroke', 'none');
    });
  }
  
  // Fix centerline strokes (they should be dashed lines)
  clone.querySelectorAll('path[stroke-dasharray], line[stroke-dasharray]').forEach(el => {
    // Centerlines - ensure they have the right stroke
    if (!el.getAttribute('stroke') || el.getAttribute('stroke') === 'inherit') {
      el.setAttribute('stroke', '#FF3B1D');
    }
    el.setAttribute('fill', 'none');
  });
  
  // Handle individual wall polygons - they should have transparent or appearance fill
  // When merged walls are present, individual walls have hideStrokes=true
  // and their fill should not override the merged walls
  clone.querySelectorAll('polygon[fill="transparent"]').forEach(el => {
    // Keep transparent fills as transparent
    el.setAttribute('fill', 'transparent');
  });
  
  // Opening shape SVG visuals (doors/windows) are injected via dangerouslySetInnerHTML
  // They have explicit stroke/fill attributes and should scale naturally with transforms
  // Do NOT add vector-effect="non-scaling-stroke" as it would prevent proper scaling
  
  // Also handle nested defs within groups (opening SVGs contain their own defs)
  // Move them to root defs to ensure proper resolution
  // IMPORTANT: Wall masks use unique IDs already (wall-mask-{shapeId}), so we should
  // NOT rename them - only rename potentially conflicting IDs like "placeholder" patterns
  const rootDefs = clone.querySelector('defs') || (() => {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    clone.insertBefore(defs, clone.firstChild);
    return defs;
  })();
  
  // Find all nested defs and move their children to root defs
  let defCounter = 0;
  clone.querySelectorAll('g defs').forEach(nestedDefs => {
    // Get the parent group to create unique ID prefix
    const parentGroup = nestedDefs.closest('g');
    const groupId = parentGroup?.getAttribute('data-shape-id') || `nested-${defCounter++}`;
    
    // Move each child to root defs
    Array.from(nestedDefs.children).forEach(child => {
      const originalId = child.getAttribute('id');
      if (originalId) {
        // Only rename IDs that could conflict (like generic "placeholder" patterns)
        // Don't rename wall masks, patterns with unique IDs, etc.
        const isGenericId = originalId === 'placeholder' || 
                            originalId.match(/^pattern\d*$/) ||
                            originalId.match(/^gradient\d*$/);
        
        if (isGenericId) {
          // Create unique ID by prefixing with group identifier
          const newId = `${originalId}-${groupId}`;
          child.setAttribute('id', newId);
          
          // Update any references to this ID within the parent group
          if (parentGroup) {
            parentGroup.querySelectorAll(`[fill="url(#${originalId})"]`).forEach(el => {
              el.setAttribute('fill', `url(#${newId})`);
            });
            parentGroup.querySelectorAll(`[stroke="url(#${originalId})"]`).forEach(el => {
              el.setAttribute('stroke', `url(#${newId})`);
            });
          }
        }
        // For unique IDs (like wall-mask-xxx), don't rename - just move to root
      }
      rootDefs.appendChild(child);
    });
    
    // Remove the now-empty nested defs
    nestedDefs.remove();
  });
  
  return clone;
}

/**
 * Inline CSS styles into SVG elements for standalone export
 * This ensures the SVG looks correct when viewed outside the app
 * IMPORTANT: Preserves existing explicit attributes, only fills in missing ones
 */
export function inlineStyles(svgElement: SVGSVGElement): void {
  // Get all shape elements that need styling
  const shapeElements = svgElement.querySelectorAll('polygon, path, rect, circle, ellipse, line, polyline, text, g');
  
  shapeElements.forEach(element => {
    // Skip defs, patterns, masks, clipPaths and their children
    if (element.closest('defs') || element.closest('pattern') || element.closest('mask') || element.closest('clipPath')) {
      return;
    }
    
    const svgEl = element as SVGElement;
    
    // For shapes that should have fill but don't have it explicitly set
    if (!svgEl.hasAttribute('fill')) {
      // Default to none for groups, inherited for others
      if (svgEl.tagName === 'g') {
        // Groups don't need fill
      } else {
        // Check computed style
        try {
          const computedFill = window.getComputedStyle(element).fill;
          if (computedFill && computedFill !== 'none' && computedFill !== '') {
            svgEl.setAttribute('fill', computedFill);
          }
        } catch {
          // Ignore
        }
      }
    }
    
    // For shapes that should have stroke
    if (!svgEl.hasAttribute('stroke') && svgEl.tagName !== 'g') {
      try {
        const computedStroke = window.getComputedStyle(element).stroke;
        if (computedStroke && computedStroke !== 'none' && computedStroke !== '') {
          svgEl.setAttribute('stroke', computedStroke);
        }
      } catch {
        // Ignore
      }
    }
    
    // Handle stroke-width if stroke is set
    if (svgEl.getAttribute('stroke') && !svgEl.hasAttribute('stroke-width')) {
      try {
        const computedStrokeWidth = window.getComputedStyle(element).strokeWidth;
        if (computedStrokeWidth && computedStrokeWidth !== '0' && computedStrokeWidth !== '') {
          svgEl.setAttribute('stroke-width', computedStrokeWidth);
        }
      } catch {
        // Ignore
      }
    }
  });
  
  // Handle text elements specifically
  const textElements = svgElement.querySelectorAll('text, tspan');
  textElements.forEach(element => {
    if (element.closest('defs')) return;
    
    const svgEl = element as SVGElement;
    const textProps = ['font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline'];
    
    textProps.forEach(prop => {
      if (!svgEl.hasAttribute(prop)) {
        try {
          const value = window.getComputedStyle(element).getPropertyValue(prop);
          if (value && value !== 'inherit' && value !== '') {
            svgEl.setAttribute(prop, value);
          }
        } catch {
          // Ignore
        }
      }
    });
  });
  
  // Special handling for opening shape visuals (door/window SVGs)
  // These elements have explicit inline styles that need to be preserved
  // The nested groups with opacity attribute contain the visual SVG content
  svgElement.querySelectorAll('g[opacity] path, g[opacity] line, g[opacity] polygon').forEach(el => {
    const svgEl = el as SVGElement;
    
    // Ensure stroke attributes are properly set
    const stroke = svgEl.getAttribute('stroke');
    const strokeWidth = svgEl.getAttribute('stroke-width');
    const fill = svgEl.getAttribute('fill');
    
    // If element has stroke but stroke-width is missing or very small when parsed,
    // ensure it has a reasonable minimum for visibility
    if (stroke && stroke !== 'none') {
      // Parse stroke-width as a number to check if it's reasonable
      const parsedWidth = parseFloat(strokeWidth || '0');
      if (!strokeWidth || isNaN(parsedWidth) || parsedWidth === 0) {
        // Set a minimum stroke width
        svgEl.setAttribute('stroke-width', '1');
      }
    }
    
    // Ensure fill is explicitly set (paths from door/window SVGs often have fill="none")
    if (!fill) {
      svgEl.setAttribute('fill', 'none');
    }
  });
  
  // Preserve opacity on groups (opening visuals use opacity for styling)
  svgElement.querySelectorAll('g[opacity]').forEach(group => {
    const opacity = group.getAttribute('opacity');
    if (opacity) {
      // Ensure opacity is preserved as a valid number
      const parsedOpacity = parseFloat(opacity);
      if (!isNaN(parsedOpacity) && parsedOpacity >= 0 && parsedOpacity <= 1) {
        group.setAttribute('opacity', String(parsedOpacity));
      }
    }
  });
}

/**
 * Clone styles from source element to cloned element
 * Ensures all explicit SVG attributes are preserved in the clone
 */
export function cloneStylesDirectly(source: SVGSVGElement, clone: SVGSVGElement): void {
  // SVG presentation attributes that should be preserved
  const svgAttributes = [
    'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin',
    'opacity', 'fill-opacity', 'stroke-opacity', 'fill-rule', 'vector-effect',
    'font-family', 'font-size', 'font-weight', 'font-style',
    'text-anchor', 'dominant-baseline', 'transform',
  ];
  
  // First, handle the merged walls group specifically - this is critical for wall export
  const sourceMergedWalls = source.querySelector('.merged-walls');
  const cloneMergedWalls = clone.querySelector('.merged-walls');
  
  if (sourceMergedWalls && cloneMergedWalls) {
    // Copy all shape styles from merged walls
    const sourceWallShapes = sourceMergedWalls.querySelectorAll('polygon, path');
    const cloneWallShapes = cloneMergedWalls.querySelectorAll('polygon, path');
    
    sourceWallShapes.forEach((srcEl, idx) => {
      const cloneEl = cloneWallShapes[idx];
      if (!cloneEl) return;
      
      svgAttributes.forEach(attr => {
        const srcValue = srcEl.getAttribute(attr);
        if (srcValue !== null) {
          cloneEl.setAttribute(attr, srcValue);
        }
      });
    });
  }
  
  // Handle seam covers
  const sourceSeamCovers = source.querySelector('.wall-seam-covers');
  const cloneSeamCovers = clone.querySelector('.wall-seam-covers');
  
  if (sourceSeamCovers && cloneSeamCovers) {
    const sourceCovers = sourceSeamCovers.querySelectorAll('polygon');
    const cloneCovers = cloneSeamCovers.querySelectorAll('polygon');
    
    sourceCovers.forEach((srcEl, idx) => {
      const cloneEl = cloneCovers[idx];
      if (!cloneEl) return;
      
      svgAttributes.forEach(attr => {
        const srcValue = srcEl.getAttribute(attr);
        if (srcValue !== null) {
          cloneEl.setAttribute(attr, srcValue);
        }
      });
    });
  }
  
  // Get all shape elements from source (excluding those already handled)
  const sourceShapes = source.querySelectorAll('polygon, path, rect, circle, ellipse, line, polyline, text');
  const cloneShapes = clone.querySelectorAll('polygon, path, rect, circle, ellipse, line, polyline, text');
  
  // Copy attributes from source shapes to clone shapes
  sourceShapes.forEach((srcEl, idx) => {
    const cloneEl = cloneShapes[idx];
    if (!cloneEl) return;
    
    // Skip elements in defs
    if (srcEl.closest('defs') || cloneEl.closest('defs')) return;
    
    // Skip merged walls and seam covers (already handled)
    if (srcEl.closest('.merged-walls') || srcEl.closest('.wall-seam-covers')) return;
    
    // Copy all SVG presentation attributes from source
    svgAttributes.forEach(attr => {
      const srcValue = srcEl.getAttribute(attr);
      if (srcValue !== null) {
        // Always copy from source - it has the correct value
        cloneEl.setAttribute(attr, srcValue);
      }
    });
  });
  
  // Also handle groups that might have fill/stroke
  const sourceGroups = source.querySelectorAll('g[fill], g[stroke]');
  const allSourceGroups = Array.from(source.querySelectorAll('g'));
  const cloneGroups = clone.querySelectorAll('g');
  
  sourceGroups.forEach((srcEl) => {
    // Find matching group in clone by position
    const srcIdx = allSourceGroups.indexOf(srcEl as SVGGElement);
    const cloneEl = cloneGroups[srcIdx];
    if (!cloneEl) return;
    
    svgAttributes.forEach(attr => {
      const srcValue = srcEl.getAttribute(attr);
      if (srcValue !== null) {
        cloneEl.setAttribute(attr, srcValue);
      }
    });
  });
}

// ============================================================================
// SVG to Canvas Conversion
// ============================================================================

/**
 * Convert SVG element to a canvas
 */
export async function svgToCanvas(
  svgElement: SVGSVGElement,
  options: {
    width: number;
    height: number;
    scale: number;
    backgroundColor?: string;
  }
): Promise<HTMLCanvasElement> {
  const { width, height, scale, backgroundColor } = options;
  
  // Create canvas with scaled dimensions
  const canvas = document.createElement('canvas');
  const canvasWidth = Math.round(width * scale);
  const canvasHeight = Math.round(height * scale);
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas 2D context');
  }
  
  // Fill background if specified
  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // Update SVG dimensions to match scaled canvas
  const scaledSvg = svgElement.cloneNode(true) as SVGSVGElement;
  scaledSvg.setAttribute('width', String(canvasWidth));
  scaledSvg.setAttribute('height', String(canvasHeight));
  
  // Serialize SVG with XML declaration
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(scaledSvg);
  
  // Ensure we have proper XML declaration and namespace
  if (!svgString.startsWith('<?xml')) {
    svgString = '<?xml version="1.0" encoding="UTF-8"?>' + svgString;
  }
  
  // Create blob and URL
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  try {
    // Create and load image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(new Error(`Failed to load SVG image: ${e}`));
      img.src = url;
    });
    
    // Draw image at canvas size
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
  
  return canvas;
}

/**
 * Alternative SVG to Canvas using foreignObject (better CSS support)
 */
export async function svgToCanvasWithForeignObject(
  svgElement: SVGSVGElement,
  options: {
    width: number;
    height: number;
    scale: number;
    backgroundColor?: string;
  }
): Promise<HTMLCanvasElement> {
  const { width, height, scale, backgroundColor } = options;
  
  // Clone and prepare SVG
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  
  // Set explicit dimensions
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  
  // Inline styles for standalone rendering
  inlineStyles(clone);
  
  // Serialize to string
  const svgString = new XMLSerializer().serializeToString(clone);
  
  // Create data URL
  const encodedSvg = encodeURIComponent(svgString)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  
  const dataUrl = `data:image/svg+xml,${encodedSvg}`;
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas 2D context');
  }
  
  // Fill background
  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // Load and draw image
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load SVG'));
    img.src = dataUrl;
  });
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return canvas;
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export SVG element as PNG blob
 */
export async function exportAsPNG(
  svgElement: SVGSVGElement,
  bounds: ExportBoundingBox,
  options: ImageExportOptions
): Promise<Blob> {
  // Calculate pixel dimensions first
  let pixelWidth: number;
  let contentPixelHeight: number;
  
  if (options.pixelWidth && options.pixelHeight) {
    pixelWidth = options.pixelWidth;
    contentPixelHeight = options.pixelHeight;
  } else {
    pixelWidth = Math.round(bounds.width * BASE_PIXELS_PER_METER);
    contentPixelHeight = Math.round(bounds.height * BASE_PIXELS_PER_METER);
  }
  
  // Ensure minimum size
  pixelWidth = Math.max(pixelWidth, 100);
  contentPixelHeight = Math.max(contentPixelHeight, 100);
  
  // Check if footer is enabled and calculate responsive footer height
  // Calculate for scaled canvas width since that's the final output size
  const footerEnabled = options.footer?.enabled ?? false;
  const footerGap = 20;
  const scaledCanvasWidth = pixelWidth * options.scale;
  const footerHeight = footerEnabled ? calculateFooterHeight(scaledCanvasWidth) : 0;
  const scaledFooterGap = footerEnabled ? footerGap : 0;
  
  // Clone styles from source BEFORE preparing (while still in DOM)
  const tempClone = svgElement.cloneNode(true) as SVGSVGElement;
  cloneStylesDirectly(svgElement, tempClone);
  
  // Prepare SVG for export with correct pixel dimensions
  const exportSVG = prepareExportSVG(tempClone, bounds, {
    backgroundColor: options.backgroundColor,
    includeGrid: options.includeGrid,
    includeMeasurements: options.includeMeasurements,
    includeGuidelines: options.includeGuidelines,
    pixelWidth,
    pixelHeight: contentPixelHeight,
  });
  
  // Inline any remaining styles
  inlineStyles(exportSVG);
  
  // Convert to canvas (content only)
  const contentCanvas = await svgToCanvas(exportSVG, {
    width: pixelWidth,
    height: contentPixelHeight,
    scale: options.scale,
    backgroundColor: options.backgroundColor,
  });
  
  // If footer is not enabled, return content canvas directly
  if (!footerEnabled || !options.footer) {
    return new Promise((resolve, reject) => {
      contentCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        },
        'image/png'
      );
    });
  }
  
  // Create combined canvas with footer
  const totalHeight = contentCanvas.height + scaledFooterGap + footerHeight;
  const combinedCanvas = document.createElement('canvas');
  combinedCanvas.width = contentCanvas.width;
  combinedCanvas.height = totalHeight;
  
  const ctx = combinedCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas 2D context');
  }
  
  // Fill background
  if (options.backgroundColor && options.backgroundColor !== 'transparent') {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
  }
  
  // Draw content
  ctx.drawImage(contentCanvas, 0, 0);
  
  // Draw footer at the scaled canvas width (footer renderer handles internal scaling)
  drawFooterOnCanvas(
    ctx,
    options.footer,
    combinedCanvas.width,
    contentCanvas.height + scaledFooterGap
  );
  
  // Convert combined canvas to PNG blob
  return new Promise((resolve, reject) => {
    combinedCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      },
      'image/png'
    );
  });
}

/**
 * Export SVG element as JPEG blob
 */
export async function exportAsJPEG(
  svgElement: SVGSVGElement,
  bounds: ExportBoundingBox,
  options: ImageExportOptions
): Promise<Blob> {
  // Ensure white background for JPEG (no transparency)
  const jpegOptions = {
    ...options,
    backgroundColor: options.backgroundColor === 'transparent' ? '#ffffff' : (options.backgroundColor || '#ffffff'),
  };
  
  // Calculate pixel dimensions first
  let pixelWidth: number;
  let contentPixelHeight: number;
  
  if (options.pixelWidth && options.pixelHeight) {
    pixelWidth = options.pixelWidth;
    contentPixelHeight = options.pixelHeight;
  } else {
    pixelWidth = Math.round(bounds.width * BASE_PIXELS_PER_METER);
    contentPixelHeight = Math.round(bounds.height * BASE_PIXELS_PER_METER);
  }
  
  // Ensure minimum size
  pixelWidth = Math.max(pixelWidth, 100);
  contentPixelHeight = Math.max(contentPixelHeight, 100);
  
  // Check if footer is enabled and calculate responsive footer height
  const footerEnabled = options.footer?.enabled ?? false;
  const footerGap = 20;
  const scaledCanvasWidth = pixelWidth * options.scale;
  const footerHeight = footerEnabled ? calculateFooterHeight(scaledCanvasWidth) : 0;
  const scaledFooterGap = footerEnabled ? footerGap : 0;
  
  // Clone styles from source BEFORE preparing
  const tempClone = svgElement.cloneNode(true) as SVGSVGElement;
  cloneStylesDirectly(svgElement, tempClone);
  
  // Prepare SVG for export
  const exportSVG = prepareExportSVG(tempClone, bounds, {
    backgroundColor: jpegOptions.backgroundColor,
    includeGrid: options.includeGrid,
    includeMeasurements: options.includeMeasurements,
    includeGuidelines: options.includeGuidelines,
    pixelWidth,
    pixelHeight: contentPixelHeight,
  });
  
  // Inline styles
  inlineStyles(exportSVG);
  
  // Convert to canvas (content only)
  const contentCanvas = await svgToCanvas(exportSVG, {
    width: pixelWidth,
    height: contentPixelHeight,
    scale: options.scale,
    backgroundColor: jpegOptions.backgroundColor,
  });
  
  // Fill white background for JPEG (over any transparency)
  const contentCtx = contentCanvas.getContext('2d');
  if (contentCtx) {
    contentCtx.globalCompositeOperation = 'destination-over';
    contentCtx.fillStyle = '#ffffff';
    contentCtx.fillRect(0, 0, contentCanvas.width, contentCanvas.height);
  }
  
  // If footer is not enabled, return content canvas directly
  if (!footerEnabled || !options.footer) {
    const quality = options.jpegQuality ?? 0.92;
    return new Promise((resolve, reject) => {
      contentCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create JPEG blob'));
          }
        },
        'image/jpeg',
        quality
      );
    });
  }
  
  // Create combined canvas with footer
  const totalHeight = contentCanvas.height + scaledFooterGap + footerHeight;
  const combinedCanvas = document.createElement('canvas');
  combinedCanvas.width = contentCanvas.width;
  combinedCanvas.height = totalHeight;
  
  const ctx = combinedCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas 2D context');
  }
  
  // Fill white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
  
  // Draw content
  ctx.drawImage(contentCanvas, 0, 0);
  
  // Draw footer at the scaled canvas width (footer renderer handles internal scaling)
  drawFooterOnCanvas(
    ctx,
    options.footer,
    combinedCanvas.width,
    contentCanvas.height + scaledFooterGap
  );
  
  // Convert combined canvas to JPEG blob
  const quality = options.jpegQuality ?? 0.92;
  
  return new Promise((resolve, reject) => {
    combinedCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create JPEG blob'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Export SVG element as SVG blob
 */
export async function exportAsSVG(
  svgElement: SVGSVGElement,
  bounds: ExportBoundingBox,
  options: ImageExportOptions
): Promise<Blob> {
  // Calculate pixel dimensions
  let pixelWidth: number;
  let contentPixelHeight: number;
  
  if (options.pixelWidth && options.pixelHeight) {
    pixelWidth = options.pixelWidth;
    contentPixelHeight = options.pixelHeight;
  } else {
    pixelWidth = Math.round(bounds.width * BASE_PIXELS_PER_METER);
    contentPixelHeight = Math.round(bounds.height * BASE_PIXELS_PER_METER);
  }
  
  // Ensure minimum size
  pixelWidth = Math.max(pixelWidth, 100);
  contentPixelHeight = Math.max(contentPixelHeight, 100);
  
  // Check if footer is enabled and calculate responsive footer height
  const footerEnabled = options.footer?.enabled ?? false;
  const footerGap = 20;
  const footerHeight = footerEnabled ? calculateFooterHeight(pixelWidth) : 0;
  const totalHeight = footerEnabled 
    ? contentPixelHeight + footerGap + footerHeight 
    : contentPixelHeight;
  
  // Clone styles from source BEFORE preparing
  const tempClone = svgElement.cloneNode(true) as SVGSVGElement;
  cloneStylesDirectly(svgElement, tempClone);
  
  // Prepare SVG for export
  const exportSVG = prepareExportSVG(tempClone, bounds, {
    backgroundColor: options.backgroundColor,
    includeGrid: options.includeGrid,
    includeMeasurements: options.includeMeasurements,
    includeGuidelines: options.includeGuidelines,
    pixelWidth,
    pixelHeight: contentPixelHeight,
  });
  
  // Inline styles for standalone file
  inlineStyles(exportSVG);
  
  // If footer is enabled, create a wrapper SVG with footer
  if (footerEnabled && options.footer) {
    // Update viewBox and height to include footer
    exportSVG.setAttribute('height', String(totalHeight));
    
    // Create wrapper SVG with footer
    const wrapperSvgString = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${pixelWidth}" height="${totalHeight}" viewBox="0 0 ${pixelWidth} ${totalHeight}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&amp;display=swap');
    </style>
  </defs>
  
  <!-- Background -->
  ${options.backgroundColor && options.backgroundColor !== 'transparent' ? 
    `<rect x="0" y="0" width="${pixelWidth}" height="${totalHeight}" fill="${options.backgroundColor}" />` : ''}
  
  <!-- Content Area -->
  <g transform="translate(0, 0)">
    <svg width="${pixelWidth}" height="${contentPixelHeight}" viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}">
      ${exportSVG.innerHTML}
    </svg>
  </g>
  
  <!-- Footer -->
  <g transform="translate(0, ${contentPixelHeight + footerGap})">
    ${generateFooterSVG(options.footer, pixelWidth)}
  </g>
</svg>`;
    
    return new Blob([wrapperSvgString], { type: 'image/svg+xml;charset=utf-8' });
  }
  
  // No footer - return as-is
  const svgString = new XMLSerializer().serializeToString(exportSVG);
  const fullSvgString = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
${svgString}`;
  
  return new Blob([fullSvgString], { type: 'image/svg+xml;charset=utf-8' });
}

/**
 * Export SVG element as an image (PNG, JPEG, or SVG)
 */
export async function exportAsImage(
  svgElement: SVGSVGElement,
  bounds: ExportBoundingBox,
  options: ImageExportOptions
): Promise<Blob> {
  switch (options.format) {
    case 'png':
      return exportAsPNG(svgElement, bounds, options);
    case 'jpeg':
      return exportAsJPEG(svgElement, bounds, options);
    case 'svg':
      return exportAsSVG(svgElement, bounds, options);
    default:
      throw new Error(`Unsupported image format: ${options.format}`);
  }
}

// ============================================================================
// Data URL Export (for previews)
// ============================================================================

/**
 * Export SVG as data URL (useful for previews)
 */
export function svgToDataUrl(svgElement: SVGSVGElement): string {
  const svgString = new XMLSerializer().serializeToString(svgElement);
  const encoded = encodeURIComponent(svgString)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Export canvas as data URL
 */
export function canvasToDataUrl(canvas: HTMLCanvasElement, format: 'png' | 'jpeg', quality?: number): string {
  if (format === 'jpeg') {
    return canvas.toDataURL('image/jpeg', quality ?? 0.92);
  }
  return canvas.toDataURL('image/png');
}

