/**
 * Export Library
 * Main entry point for all export functionality
 */

// Types
export type {
  ExportBoundingBox,
  ImageFormat,
  DocumentFormat,
  CADFormat,
  NativeFormat,
  ExportFormat,
  BaseExportOptions,
  ImageExportOptions,
  PDFExportOptions,
  PDFPageSize,
  PDFOrientation,
  DXFExportOptions,
  DXFVersion,
  CADUnits,
  DWGExportOptions,
  GeometryOSExportOptions,
  ExportOptions,
  GeometryOSFile,
  GeometryOSFileMetadata,
  ExportResult,
  ExportPreset,
  ExportProgress,
  ExportProgressCallback,
  ExportFooterOptions,
  ExportFooterCompanyInfo,
} from './types';

// Constants
export {
  IMAGE_EXPORT_PRESETS,
  PDF_PAGE_SIZES,
  DEFAULT_EXPORT_OPTIONS,
  DEFAULT_IMAGE_OPTIONS,
  DEFAULT_PDF_OPTIONS,
  DEFAULT_DXF_OPTIONS,
  DEFAULT_GEOS_OPTIONS,
  DEFAULT_DXF_LAYER_MAPPING,
  DEFAULT_FOOTER_OPTIONS,
} from './types';

// Bounding box calculations
export {
  calculateShapeBounds,
  mergeBounds,
  calculateCombinedBounds,
  applyPadding,
  calculateExportBounds,
  ensureMinimumSize,
} from './boundingBox';

// Image export
export {
  prepareExportSVG,
  inlineStyles,
  cloneStylesDirectly,
  svgToCanvas,
  exportAsPNG,
  exportAsJPEG,
  exportAsSVG,
  exportAsImage,
  svgToDataUrl,
  canvasToDataUrl,
} from './formats/imageExport';

// PDF export
export {
  exportAsPDF,
  exportAsPDFWithTitleBlock,
  exportMultiPagePDF,
  isPDFExportAvailable,
} from './formats/pdfExport';

// DXF export
export {
  exportAsDXF,
  getDXFPreview,
} from './formats/dxfExport';

// GeometryOS export/import
export {
  exportAsGeometryOS,
  importGeometryOS,
  importGeometryOSFromBlob,
  getGeosFileInfo,
  isGeosFile,
} from './formats/geosExport';

// Download utilities
export {
  downloadBlob,
  downloadDataUrl,
  downloadText,
  downloadJSON,
  generateFileName,
  getFileExtension,
  getMimeType,
} from './utils/download';

// Footer renderer
export {
  generateFooterSVG,
  drawFooterOnCanvas,
  generateFooterPreviewSVG,
  calculateTotalHeightWithFooter,
  calculateFooterHeight,
  FOOTER_HEIGHT_PX,
  FOOTER_HEIGHT_MM,
} from './utils/footerRenderer';

// Export service
export { ExportService, exportService } from './ExportService';

// React hook
export { useExport } from './useExport';

