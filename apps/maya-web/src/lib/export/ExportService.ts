/**
 * Export Service
 * Main service that coordinates all export operations
 */

import type { Shape } from '../../components/Workspace/types';
import type { WorkspaceSnapshot } from '../../domain/workspace/core/types';
import type {
  ExportFormat,
  ExportOptions,
  ExportBoundingBox,
  ExportResult,
  ImageExportOptions,
  PDFExportOptions,
  DXFExportOptions,
  GeometryOSExportOptions,
  ExportProgress,
  ExportProgressCallback,
  GeometryOSFileMetadata,
} from './types';
import {
  DEFAULT_IMAGE_OPTIONS,
  DEFAULT_PDF_OPTIONS,
  DEFAULT_DXF_OPTIONS,
  DEFAULT_GEOS_OPTIONS,
} from './types';
import { calculateExportBounds, ensureMinimumSize } from './boundingBox';
import { exportAsImage } from './formats/imageExport';
import { exportAsPDF, isPDFExportAvailable } from './formats/pdfExport';
import { exportAsDXF } from './formats/dxfExport';
import { exportAsGeometryOS, importGeometryOS } from './formats/geosExport';
import { downloadBlob, generateFileName, getFileExtension } from './utils/download';

// ============================================================================
// Export Service Class
// ============================================================================

export class ExportService {
  private onProgress: ExportProgressCallback | null = null;
  
  /**
   * Set progress callback for export operations
   */
  setProgressCallback(callback: ExportProgressCallback | null): void {
    this.onProgress = callback;
  }
  
  private reportProgress(stage: ExportProgress['stage'], progress: number, message: string): void {
    if (this.onProgress) {
      this.onProgress({ stage, progress, message });
    }
  }
  
  // ============================================================================
  // Bounds Calculation
  // ============================================================================
  
  /**
   * Calculate export bounds for shapes
   */
  calculateBounds(
    shapes: Shape[],
    selectedIds: string[],
    scope: 'all' | 'selection',
    padding: number,
    options?: { includeGuidelines?: boolean; viewBox?: { x: number; y: number; width: number; height: number } }
  ): ExportBoundingBox {
    const bounds = calculateExportBounds(shapes, selectedIds, scope, padding, options);
    return ensureMinimumSize(bounds);
  }
  
  // ============================================================================
  // Main Export Methods
  // ============================================================================
  
  /**
   * Export canvas as an image (PNG, JPEG, SVG)
   */
  async exportImage(
    svgElement: SVGSVGElement,
    shapes: Shape[],
    selectedIds: string[],
    options: Partial<ImageExportOptions> = {}
  ): Promise<ExportResult> {
    const fullOptions: ImageExportOptions = {
      ...DEFAULT_IMAGE_OPTIONS,
      ...options,
    };
    
    this.reportProgress('preparing', 10, 'Calculating export bounds...');
    
    const bounds = this.calculateBounds(
      shapes,
      selectedIds,
      fullOptions.scope,
      fullOptions.padding,
      { includeGuidelines: fullOptions.includeGuidelines }
    );
    
    this.reportProgress('rendering', 40, `Rendering ${fullOptions.format.toUpperCase()}...`);
    
    try {
      const blob = await exportAsImage(svgElement, bounds, fullOptions);
      
      this.reportProgress('finalizing', 100, 'Export complete');
      
      const fileName = fullOptions.fileName 
        ? `${fullOptions.fileName}.${getFileExtension(fullOptions.format)}`
        : generateFileName('maya-export', getFileExtension(fullOptions.format));
      
      return {
        success: true,
        blob,
        fileName,
        format: fullOptions.format,
        bounds,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during image export',
        fileName: '',
        format: fullOptions.format,
        bounds,
      };
    }
  }
  
  /**
   * Export canvas as PDF
   */
  async exportPDF(
    svgElement: SVGSVGElement,
    shapes: Shape[],
    selectedIds: string[],
    options: Partial<PDFExportOptions> = {}
  ): Promise<ExportResult> {
    const fullOptions: PDFExportOptions = {
      ...DEFAULT_PDF_OPTIONS,
      ...options,
    };
    
    this.reportProgress('preparing', 10, 'Checking PDF support...');
    
    // Check if PDF libraries are available
    const pdfAvailable = await isPDFExportAvailable();
    if (!pdfAvailable) {
      return {
        success: false,
        error: 'PDF export requires additional libraries. Install jspdf and svg2pdf.js packages.',
        fileName: '',
        format: 'pdf',
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
      };
    }
    
    this.reportProgress('preparing', 20, 'Calculating export bounds...');
    
    const bounds = this.calculateBounds(
      shapes,
      selectedIds,
      fullOptions.scope,
      fullOptions.padding,
      { includeGuidelines: fullOptions.includeGuidelines }
    );
    
    this.reportProgress('rendering', 50, 'Generating PDF...');
    
    try {
      const blob = await exportAsPDF(svgElement, bounds, fullOptions);
      
      this.reportProgress('finalizing', 100, 'Export complete');
      
      const fileName = fullOptions.fileName 
        ? `${fullOptions.fileName}.pdf`
        : generateFileName('maya-export', 'pdf');
      
      return {
        success: true,
        blob,
        fileName,
        format: 'pdf',
        bounds,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during PDF export',
        fileName: '',
        format: 'pdf',
        bounds,
      };
    }
  }
  
  /**
   * Export shapes as DXF
   */
  async exportDXF(
    shapes: Shape[],
    selectedIds: string[],
    options: Partial<DXFExportOptions> = {}
  ): Promise<ExportResult> {
    const fullOptions: DXFExportOptions = {
      ...DEFAULT_DXF_OPTIONS,
      ...options,
    };
    
    this.reportProgress('preparing', 10, 'Preparing shapes for DXF export...');
    
    // Get shapes to export based on scope
    const exportShapes = fullOptions.scope === 'selection' && selectedIds.length > 0
      ? shapes.filter(s => selectedIds.includes(s.id))
      : shapes;
    
    const bounds = this.calculateBounds(
      shapes,
      selectedIds,
      fullOptions.scope,
      fullOptions.padding,
      { includeGuidelines: fullOptions.includeGuidelines }
    );
    
    this.reportProgress('converting', 50, 'Converting to DXF format...');
    
    try {
      const blob = await exportAsDXF(exportShapes, bounds, fullOptions);
      
      this.reportProgress('finalizing', 100, 'Export complete');
      
      const fileName = fullOptions.fileName 
        ? `${fullOptions.fileName}.dxf`
        : generateFileName('maya-export', 'dxf');
      
      return {
        success: true,
        blob,
        fileName,
        format: 'dxf',
        bounds,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during DXF export',
        fileName: '',
        format: 'dxf',
        bounds,
      };
    }
  }
  
  /**
   * Export as GeometryOS native format
   */
  async exportGeometryOS(
    snapshot: WorkspaceSnapshot,
    options: Partial<GeometryOSExportOptions> = {},
    metadata?: Partial<GeometryOSFileMetadata>
  ): Promise<ExportResult> {
    const fullOptions: GeometryOSExportOptions = {
      ...DEFAULT_GEOS_OPTIONS,
      ...options,
    };
    
    this.reportProgress('preparing', 20, 'Preparing snapshot for export...');
    
    const bounds = this.calculateBounds(
      snapshot.shapes,
      [],
      'all',
      0
    );
    
    this.reportProgress('converting', 60, 'Serializing to GeometryOS format...');
    
    try {
      const blob = await exportAsGeometryOS(snapshot, fullOptions, metadata);
      
      this.reportProgress('finalizing', 100, 'Export complete');
      
      const fileName = fullOptions.fileName 
        ? `${fullOptions.fileName}.geos`
        : generateFileName(metadata?.name || 'maya-project', 'geos');
      
      return {
        success: true,
        blob,
        fileName,
        format: 'geos',
        bounds,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during GeometryOS export',
        fileName: '',
        format: 'geos',
        bounds,
      };
    }
  }
  
  // ============================================================================
  // Convenience Methods
  // ============================================================================
  
  /**
   * Export with automatic format detection and download
   */
  async exportAndDownload(
    format: ExportFormat,
    svgElement: SVGSVGElement | null,
    snapshot: WorkspaceSnapshot,
    selectedIds: string[],
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    let result: ExportResult;
    
    switch (format) {
      case 'png':
      case 'jpeg':
      case 'svg':
        if (!svgElement) {
          return {
            success: false,
            error: 'SVG element is required for image export',
            fileName: '',
            format,
            bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
          };
        }
        result = await this.exportImage(
          svgElement,
          snapshot.shapes,
          selectedIds,
          { ...options, format } as Partial<ImageExportOptions>
        );
        break;
        
      case 'pdf':
        if (!svgElement) {
          return {
            success: false,
            error: 'SVG element is required for PDF export',
            fileName: '',
            format,
            bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
          };
        }
        result = await this.exportPDF(
          svgElement,
          snapshot.shapes,
          selectedIds,
          options as Partial<PDFExportOptions>
        );
        break;
        
      case 'dxf':
        result = await this.exportDXF(
          snapshot.shapes,
          selectedIds,
          options as Partial<DXFExportOptions>
        );
        break;
        
      case 'geos':
        result = await this.exportGeometryOS(
          snapshot,
          options as Partial<GeometryOSExportOptions>
        );
        break;
        
      case 'dwg':
        // DWG requires server-side conversion
        return {
          success: false,
          error: 'DWG export requires server-side conversion, which is not yet implemented.',
          fileName: '',
          format,
          bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
        };
        
      default:
        return {
          success: false,
          error: `Unsupported export format: ${format}`,
          fileName: '',
          format,
          bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
        };
    }
    
    // Trigger download if successful
    if (result.success && result.blob) {
      downloadBlob(result.blob, result.fileName);
    }
    
    return result;
  }
  
  /**
   * Quick export with default settings
   */
  async quickExport(
    format: 'png' | 'pdf' | 'svg',
    svgElement: SVGSVGElement,
    snapshot: WorkspaceSnapshot
  ): Promise<ExportResult> {
    return this.exportAndDownload(
      format,
      svgElement,
      snapshot,
      snapshot.selectedShapeIds,
      { scope: 'all' }
    );
  }
  
  // ============================================================================
  // Import Methods
  // ============================================================================
  
  /**
   * Import GeometryOS file
   */
  async importGeometryOS(file: File): Promise<{
    success: boolean;
    snapshot?: WorkspaceSnapshot;
    metadata?: GeometryOSFileMetadata;
    error?: string;
  }> {
    try {
      const result = await importGeometryOS(file);
      return {
        success: true,
        snapshot: result.snapshot,
        metadata: result.metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import file',
      };
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const exportService = new ExportService();

