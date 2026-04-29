/**
 * PDF Export
 * Export canvas as PDF document using jsPDF and svg2pdf.js
 * 
 * Required dependencies:
 * npm install jspdf svg2pdf.js
 */

import type { ExportBoundingBox, PDFExportOptions } from '../types';
import { PDF_PAGE_SIZES } from '../types';
import { prepareExportSVG, cloneStylesDirectly, inlineStyles, svgToCanvas } from './imageExport';
import { drawFooterOnCanvas, calculateFooterHeight } from '../utils/footerRenderer';

// ============================================================================
// Dynamic Import for jsPDF (optional dependency)
// ============================================================================

interface JsPDFModule {
  jsPDF: new (options: {
    orientation: 'portrait' | 'landscape';
    unit: string;
    format: [number, number];
  }) => JsPDFInstance;
}

interface JsPDFInstance {
  setProperties: (props: Record<string, string>) => void;
  svg: (element: SVGElement, options: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => Promise<void>;
  addImage: (
    imageData: string | HTMLCanvasElement,
    format: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) => void;
  output: (type: 'blob' | 'arraybuffer' | 'datauristring') => Blob | ArrayBuffer | string;
  addPage: () => void;
  text: (text: string, x: number, y: number, options?: { align?: string }) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
}

let jsPDFModule: JsPDFModule | null = null;
let svg2pdfLoaded = false;

/**
 * Load jsPDF and svg2pdf.js dynamically
 */
async function loadPDFLibraries(): Promise<JsPDFModule> {
  if (jsPDFModule && svg2pdfLoaded) {
    return jsPDFModule;
  }
  
  try {
    // Dynamic import of jsPDF
    const jspdfImport = await import('jspdf');
    jsPDFModule = jspdfImport as unknown as JsPDFModule;
    
    // Dynamic import of svg2pdf.js (side effect import that extends jsPDF)
    await import('svg2pdf.js');
    svg2pdfLoaded = true;
    
    return jsPDFModule;
  } catch (error) {
    throw new Error(
      'PDF export requires jspdf and svg2pdf.js packages. ' +
      'Install them with: npm install jspdf svg2pdf.js\n' +
      `Original error: ${error}`
    );
  }
}

// ============================================================================
// Page Size Calculations
// ============================================================================

/**
 * Get page dimensions in mm
 */
function getPageDimensions(options: PDFExportOptions): { width: number; height: number } {
  let width: number;
  let height: number;
  
  if (options.pageSize === 'custom') {
    width = options.customWidth || 210;
    height = options.customHeight || 297;
  } else {
    const size = PDF_PAGE_SIZES[options.pageSize];
    width = size.width;
    height = size.height;
  }
  
  // Swap for landscape orientation
  if (options.orientation === 'landscape') {
    return { width: height, height: width };
  }
  
  return { width, height };
}

/**
 * Calculate content area with margins
 */
function getContentArea(pageDimensions: { width: number; height: number }, margin: number): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: margin,
    y: margin,
    width: pageDimensions.width - margin * 2,
    height: pageDimensions.height - margin * 2,
  };
}

/**
 * Calculate scale factor to fit content within area while preserving aspect ratio
 */
function calculateFitScale(
  contentBounds: ExportBoundingBox,
  availableArea: { width: number; height: number }
): number {
  const scaleX = availableArea.width / contentBounds.width;
  const scaleY = availableArea.height / contentBounds.height;
  return Math.min(scaleX, scaleY);
}
// ============================================================================
// PDF Export
// ============================================================================

// Base pixels per meter for export resolution (same as imageExport)
const BASE_PIXELS_PER_METER = 100;

/**
 * Export SVG element as PDF
 * Uses canvas rendering (same as PNG/JPEG) to ensure visual consistency
 */
export async function exportAsPDF(
  svgElement: SVGSVGElement,
  bounds: ExportBoundingBox,
  options: PDFExportOptions
): Promise<Blob> {
  // Load PDF libraries
  const { jsPDF } = await loadPDFLibraries();
  
  // Get page dimensions
  const pageDimensions = getPageDimensions(options);
  
  // Create PDF document
  const pdf = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: [pageDimensions.width, pageDimensions.height],
  });
  
  // Set document metadata
  if (options.includeMetadata) {
    pdf.setProperties({
      title: options.title || 'Maya Export',
      author: options.author || 'Maya by GeometryOS',
      creator: 'Maya Design Tool',
      subject: 'Architectural Design Export',
    });
  }
  
  // Clone styles from source BEFORE preparing
  const tempClone = svgElement.cloneNode(true) as SVGSVGElement;
  cloneStylesDirectly(svgElement, tempClone);
  
  // Calculate pixel dimensions for canvas rendering (same as PNG export)
  const pixelWidth = Math.max(Math.round(bounds.width * BASE_PIXELS_PER_METER), 100);
  const pixelHeight = Math.max(Math.round(bounds.height * BASE_PIXELS_PER_METER), 100);
  
  // Prepare SVG for export (same as PNG export)
  const exportSVG = prepareExportSVG(tempClone, bounds, {
    backgroundColor: options.backgroundColor,
    includeGrid: options.includeGrid,
    includeMeasurements: options.includeMeasurements,
    includeGuidelines: options.includeGuidelines,
    pixelWidth,
    pixelHeight,
  });
  
  // Inline styles for standalone rendering
  inlineStyles(exportSVG);
  
  // Render SVG to canvas (same method as PNG export for visual consistency)
  const renderScale = 2; // Higher resolution for PDF quality
  const contentCanvas = await svgToCanvas(exportSVG, {
    width: pixelWidth,
    height: pixelHeight,
    scale: renderScale,
    backgroundColor: options.backgroundColor,
  });
  
  // Check if footer is enabled
  const footerEnabled = options.footer?.enabled ?? false;
  const footerGap = 20; // pixels
  
  // Calculate final canvas with footer (same as PNG/JPEG)
  let finalCanvas: HTMLCanvasElement;
  
  if (footerEnabled && options.footer) {
    // Calculate footer height based on canvas width (same as PNG/JPEG)
    const footerHeight = calculateFooterHeight(contentCanvas.width);
    const totalHeight = contentCanvas.height + footerGap + footerHeight;
    
    // Create combined canvas with footer
    finalCanvas = document.createElement('canvas');
    finalCanvas.width = contentCanvas.width;
    finalCanvas.height = totalHeight;
    
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }
    
    // Fill background
    if (options.backgroundColor && options.backgroundColor !== 'transparent') {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    }
    
    // Draw content
    ctx.drawImage(contentCanvas, 0, 0);
    
    // Draw footer (same as PNG/JPEG)
    drawFooterOnCanvas(
      ctx,
      options.footer,
      finalCanvas.width,
      contentCanvas.height + footerGap
    );
  } else {
    finalCanvas = contentCanvas;
  }
  
  // Calculate content area to fit in PDF
  const contentArea = {
    x: options.margin,
    y: options.margin,
    width: pageDimensions.width - options.margin * 2,
    height: pageDimensions.height - options.margin * 2,
  };
  
  // Calculate aspect ratio of the canvas
  const canvasAspect = finalCanvas.width / finalCanvas.height;
  const areaAspect = contentArea.width / contentArea.height;
  
  let scaledWidth: number;
  let scaledHeight: number;
  
  if (canvasAspect > areaAspect) {
    // Canvas is wider - fit to width
    scaledWidth = contentArea.width;
    scaledHeight = contentArea.width / canvasAspect;
  } else {
    // Canvas is taller - fit to height
    scaledHeight = contentArea.height;
    scaledWidth = contentArea.height * canvasAspect;
  }
  
  // Center the image
  const offsetX = contentArea.x + (contentArea.width - scaledWidth) / 2;
  const offsetY = contentArea.y + (contentArea.height - scaledHeight) / 2;
  
  // Add canvas as image to PDF (this ensures exact same rendering as PNG/JPEG)
  pdf.addImage(finalCanvas, 'PNG', offsetX, offsetY, scaledWidth, scaledHeight);
  
  // Return PDF as blob
  return pdf.output('blob') as Blob;
}

/**
 * Export SVG with title block (professional documentation)
 */
export async function exportAsPDFWithTitleBlock(
  svgElement: SVGSVGElement,
  bounds: ExportBoundingBox,
  options: PDFExportOptions & {
    projectName?: string;
    drawingNumber?: string;
    date?: string;
    scale?: string;
    company?: string;
  }
): Promise<Blob> {
  const { jsPDF } = await loadPDFLibraries();
  
  const pageDimensions = getPageDimensions(options);
  
  const pdf = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: [pageDimensions.width, pageDimensions.height],
  });
  
  if (options.includeMetadata) {
    pdf.setProperties({
      title: options.title || options.projectName || 'Maya Export',
      author: options.author || options.company || 'Maya by GeometryOS',
      creator: 'Maya Design Tool',
    });
  }
  
  // Title block height (bottom of page)
  const titleBlockHeight = 20;
  const titleBlockY = pageDimensions.height - titleBlockHeight - options.margin;
  
  // Clone styles from source BEFORE preparing
  const tempClone = svgElement.cloneNode(true) as SVGSVGElement;
  cloneStylesDirectly(svgElement, tempClone);
  
  // Prepare SVG
  const exportSVG = prepareExportSVG(tempClone, bounds, {
    backgroundColor: options.backgroundColor,
    includeGrid: options.includeGrid,
    includeMeasurements: options.includeMeasurements,
    includeGuidelines: options.includeGuidelines,
  });
  
  // Inline styles
  inlineStyles(exportSVG);
  
  // Content area (above title block)
  const contentArea = {
    x: options.margin,
    y: options.margin,
    width: pageDimensions.width - options.margin * 2,
    height: titleBlockY - options.margin - 5, // 5mm gap above title block
  };
  
  // Calculate scale and position
  const scale = calculateFitScale(bounds, contentArea);
  const scaledWidth = bounds.width * scale;
  const scaledHeight = bounds.height * scale;
  const offsetX = contentArea.x + (contentArea.width - scaledWidth) / 2;
  const offsetY = contentArea.y + (contentArea.height - scaledHeight) / 2;
  
  // Render SVG
  await pdf.svg(exportSVG, {
    x: offsetX,
    y: offsetY,
    width: scaledWidth,
    height: scaledHeight,
  });
  
  // Draw title block border
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  
  // Title block text
  const titleBlockX = options.margin;
  const textY = titleBlockY + 8;
  
  if (options.projectName) {
    pdf.text(`Project: ${options.projectName}`, titleBlockX, textY);
  }
  
  if (options.drawingNumber) {
    pdf.text(`Drawing: ${options.drawingNumber}`, titleBlockX + 80, textY);
  }
  
  if (options.date) {
    pdf.text(`Date: ${options.date}`, titleBlockX + 140, textY);
  }
  
  if (options.scale) {
    pdf.text(`Scale: ${options.scale}`, titleBlockX, textY + 6);
  }
  
  if (options.company) {
    pdf.text(options.company, pageDimensions.width - options.margin, textY, { align: 'right' });
  }
  
  return pdf.output('blob') as Blob;
}

// ============================================================================
// Multi-page PDF Export
// ============================================================================

/**
 * Export multiple views/snapshots to a single multi-page PDF
 */
export async function exportMultiPagePDF(
  pages: Array<{
    svgElement: SVGSVGElement;
    bounds: ExportBoundingBox;
    title?: string;
  }>,
  options: PDFExportOptions
): Promise<Blob> {
  if (pages.length === 0) {
    throw new Error('No pages to export');
  }
  
  const { jsPDF } = await loadPDFLibraries();
  
  const pageDimensions = getPageDimensions(options);
  
  const pdf = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: [pageDimensions.width, pageDimensions.height],
  });
  
  if (options.includeMetadata) {
    pdf.setProperties({
      title: options.title || 'Maya Multi-Page Export',
      author: options.author || 'Maya by GeometryOS',
      creator: 'Maya Design Tool',
    });
  }
  
  const contentArea = getContentArea(pageDimensions, options.margin);
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    
    if (i > 0) {
      pdf.addPage();
    }
    
    // Clone styles from source BEFORE preparing
    const tempClone = page.svgElement.cloneNode(true) as SVGSVGElement;
    cloneStylesDirectly(page.svgElement, tempClone);
    
    // Prepare SVG
    const exportSVG = prepareExportSVG(tempClone, page.bounds, {
      backgroundColor: options.backgroundColor,
      includeGrid: options.includeGrid,
      includeMeasurements: options.includeMeasurements,
      includeGuidelines: options.includeGuidelines,
    });
    
    // Inline styles
    inlineStyles(exportSVG);
    
    // Calculate scale and position
    const scale = calculateFitScale(page.bounds, contentArea);
    const scaledWidth = page.bounds.width * scale;
    const scaledHeight = page.bounds.height * scale;
    const offsetX = contentArea.x + (contentArea.width - scaledWidth) / 2;
    const offsetY = contentArea.y + (contentArea.height - scaledHeight) / 2;
    
    // Render SVG
    await pdf.svg(exportSVG, {
      x: offsetX,
      y: offsetY,
      width: scaledWidth,
      height: scaledHeight,
    });
    
    // Add page title if provided
    if (page.title) {
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(page.title, options.margin, options.margin - 2);
    }
    
    // Add page number
    pdf.setFontSize(8);
    pdf.text(
      `Page ${i + 1} of ${pages.length}`,
      pageDimensions.width - options.margin,
      pageDimensions.height - options.margin + 5,
      { align: 'right' }
    );
  }
  
  return pdf.output('blob') as Blob;
}

// ============================================================================
// Check PDF Support
// ============================================================================

/**
 * Check if PDF export is available (libraries installed)
 */
export async function isPDFExportAvailable(): Promise<boolean> {
  try {
    await loadPDFLibraries();
    return true;
  } catch {
    return false;
  }
}

