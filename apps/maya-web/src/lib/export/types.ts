/**
 * Export Types and Interfaces
 * Defines all types used by the export functionality
 */

import type { Shape, LengthUnit } from '../../components/Workspace/types';
import type { WorkspaceSnapshot } from '../../domain/workspace/core/types';

// ============================================================================
// Bounding Box Types
// ============================================================================

export interface ExportBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

// ============================================================================
// Export Format Types
// ============================================================================

export type ImageFormat = 'png' | 'jpeg' | 'svg';
export type DocumentFormat = 'pdf';
export type CADFormat = 'dxf' | 'dwg';
export type NativeFormat = 'geos';

export type ExportFormat = ImageFormat | DocumentFormat | CADFormat | NativeFormat;

// ============================================================================
// Export Options
// ============================================================================

export interface BaseExportOptions {
  /** Export all shapes or only selected */
  scope: 'all' | 'selection';
  /** Padding around content in meters */
  padding: number;
  /** Include grid in export */
  includeGrid: boolean;
  /** Include measurement annotations */
  includeMeasurements: boolean;
  /** Include guidelines */
  includeGuidelines: boolean;
  /** Background color or 'transparent' */
  backgroundColor: string;
  /** File name (without extension) */
  fileName?: string;
  /** Footer options for visual exports */
  footer?: ExportFooterOptions;
}

export interface ImageExportOptions extends BaseExportOptions {
  format: ImageFormat;
  /** Scale factor (1x, 2x, 3x, 4x) */
  scale: 1 | 2 | 3 | 4;
  /** JPEG quality (0.1 - 1.0), only for JPEG */
  jpegQuality?: number;
  /** Override: export at specific pixel width */
  pixelWidth?: number;
  /** Override: export at specific pixel height */
  pixelHeight?: number;
}

export type PDFPageSize = 'a4' | 'a3' | 'a2' | 'a1' | 'a0' | 'letter' | 'tabloid' | 'custom';
export type PDFOrientation = 'portrait' | 'landscape';

export interface PDFExportOptions extends BaseExportOptions {
  format: 'pdf';
  /** Page size */
  pageSize: PDFPageSize;
  /** Page orientation */
  orientation: PDFOrientation;
  /** Custom page width in mm (only for 'custom' pageSize) */
  customWidth?: number;
  /** Custom page height in mm (only for 'custom' pageSize) */
  customHeight?: number;
  /** Margin in mm */
  margin: number;
  /** Include document metadata */
  includeMetadata: boolean;
  /** Document title */
  title?: string;
  /** Document author */
  author?: string;
}

export type DXFVersion = 'R12' | 'R2000' | 'R2010';
export type CADUnits = 'mm' | 'cm' | 'm' | 'in' | 'ft';

export interface DXFExportOptions extends BaseExportOptions {
  format: 'dxf';
  /** DXF version */
  version: DXFVersion;
  /** Output units */
  units: CADUnits;
  /** Custom layer mapping for shape types */
  layerMapping?: Partial<Record<Shape['type'], string>>;
  
  // ======== BIM Enhancement Options ========
  /** Use AIA-compliant layer names from BIM Layer system */
  useAIALayers?: boolean;
  /** Include XDATA with BIM properties (globalId, classification, etc.) */
  includeBIMData?: boolean;
  /** Export doors/windows as block references instead of simple geometry */
  useBlockReferences?: boolean;
  /** Include architectural dimension styles */
  includeArchDimStyles?: boolean;
  /** Project metadata for header */
  projectMetadata?: {
    projectName?: string;
    projectNumber?: string;
    author?: string;
    company?: string;
    client?: string;
  };
}

export interface DWGExportOptions extends Omit<DXFExportOptions, 'format'> {
  format: 'dwg';
  /** DWG version */
  dwgVersion: '2000' | '2007' | '2010' | '2013' | '2018';
}

export interface GeometryOSExportOptions extends BaseExportOptions {
  format: 'geos';
  /** Include viewport state */
  includeViewport: boolean;
  /** Include tool settings */
  includeSettings: boolean;
  /** Compress output (future) */
  compress?: boolean;
}

export type ExportOptions = 
  | ImageExportOptions 
  | PDFExportOptions 
  | DXFExportOptions 
  | DWGExportOptions 
  | GeometryOSExportOptions;

// ============================================================================
// GeometryOS File Format
// ============================================================================

export interface GeometryOSFileMetadata {
  name: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
  description?: string;
  units: LengthUnit;
  application: 'maya';
  applicationVersion: string;
}

export interface GeometryOSFile {
  version: '1.0';
  format: 'geos';
  metadata: GeometryOSFileMetadata;
  content: {
    snapshot: WorkspaceSnapshot;
  };
  checksum?: string;
}

// ============================================================================
// Export Result Types
// ============================================================================

export interface ExportResult {
  success: boolean;
  blob?: Blob;
  error?: string;
  fileName: string;
  format: ExportFormat;
  bounds: ExportBoundingBox;
}

// ============================================================================
// Export Presets
// ============================================================================

export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  options: Partial<ExportOptions>;
}

export const IMAGE_EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'web',
    name: 'Web (1x)',
    description: 'Standard resolution for web use',
    options: { format: 'png', scale: 1 },
  },
  {
    id: 'print',
    name: 'Print (2x)',
    description: 'High resolution for printing',
    options: { format: 'png', scale: 2 },
  },
  {
    id: 'high-res',
    name: 'High Resolution (4x)',
    description: 'Maximum resolution',
    options: { format: 'png', scale: 4 },
  },
  {
    id: 'email',
    name: 'Email (Compressed)',
    description: 'Smaller file size for email',
    options: { format: 'jpeg', scale: 1, jpegQuality: 0.8 },
  },
  {
    id: 'vector',
    name: 'Vector (SVG)',
    description: 'Scalable vector format',
    options: { format: 'svg' },
  },
];

export const PDF_PAGE_SIZES: Record<Exclude<PDFPageSize, 'custom'>, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  a3: { width: 297, height: 420 },
  a2: { width: 420, height: 594 },
  a1: { width: 594, height: 841 },
  a0: { width: 841, height: 1189 },
  letter: { width: 215.9, height: 279.4 },
  tabloid: { width: 279.4, height: 431.8 },
};

// ============================================================================
// Default Export Options
// ============================================================================

export const DEFAULT_EXPORT_OPTIONS: BaseExportOptions = {
  scope: 'all',
  padding: 0.5, // 0.5 meters
  includeGrid: false,
  includeMeasurements: true,
  includeGuidelines: false,
  backgroundColor: '#ffffff',
};

export const DEFAULT_IMAGE_OPTIONS: ImageExportOptions = {
  ...DEFAULT_EXPORT_OPTIONS,
  format: 'png',
  scale: 2,
};

export const DEFAULT_PDF_OPTIONS: PDFExportOptions = {
  ...DEFAULT_EXPORT_OPTIONS,
  format: 'pdf',
  pageSize: 'a4',
  orientation: 'landscape',
  margin: 10,
  includeMetadata: true,
};

export const DEFAULT_DXF_OPTIONS: DXFExportOptions = {
  ...DEFAULT_EXPORT_OPTIONS,
  format: 'dxf',
  version: 'R12', // R12 for maximum compatibility with all CAD software
  units: 'm',
  includeMeasurements: false,
  includeGuidelines: false,
  // BIM Enhancement defaults
  useAIALayers: true,
  includeBIMData: true,
  useBlockReferences: true,
  includeArchDimStyles: true,
};

export const DEFAULT_GEOS_OPTIONS: GeometryOSExportOptions = {
  ...DEFAULT_EXPORT_OPTIONS,
  format: 'geos',
  includeViewport: true,
  includeSettings: true,
  padding: 0,
};

// ============================================================================
// DXF Layer Mapping
// ============================================================================

export const DEFAULT_DXF_LAYER_MAPPING: Record<Shape['type'], string> = {
  wall: 'A-WALL',
  opening: 'A-DOOR-WINDOW',
  room: 'A-AREA-ROOM',
  zone: 'A-AREA-ZONE',
  line: 'GEOMETRY',
  polyline: 'GEOMETRY',
  arc: 'GEOMETRY',
  curve: 'GEOMETRY',
  circle: 'GEOMETRY',
  rectangle: 'GEOMETRY',
  dimension: 'A-ANNO-DIMS',
  text: 'A-ANNO-TEXT',
  guideline: 'DEFPOINTS',
  image: 'REFERENCE',
  asset: 'A-FURN',
  marker: 'A-ANNO-MARK',
  group: 'GROUPS',
};

// ============================================================================
// Utility Types
// ============================================================================

export interface ExportProgress {
  stage: 'preparing' | 'rendering' | 'converting' | 'finalizing';
  progress: number; // 0-100
  message: string;
}

export type ExportProgressCallback = (progress: ExportProgress) => void;

// ============================================================================
// Export Footer Types
// ============================================================================

export interface ExportFooterCompanyInfo {
  /** Company name */
  name: string;
  /** Company tagline/slogan */
  tagline?: string;
  /** Contact phone number */
  phone?: string;
  /** Contact email */
  email?: string;
  /** Location/address */
  location?: string;
}

export interface ExportFooterOptions {
  /** Enable footer in export */
  enabled: boolean;
  /** Page identifier (e.g., A01, B02) */
  pageId?: string;
  /** Drawing/Page title */
  title?: string;
  /** Drawing subtitle */
  subtitle?: string;
  /** Project name (can be auto-filled from metadata) */
  projectName?: string;
  /** Project number */
  projectNumber?: string;
  /** Made by / Author name */
  madeBy?: string;
  /** Date (can be auto-filled with current date) */
  date?: string;
  /** Company/Organization information */
  company?: ExportFooterCompanyInfo;
  /** Show north symbol */
  showNorthSymbol?: boolean;
}

export const DEFAULT_FOOTER_OPTIONS: ExportFooterOptions = {
  enabled: false,
  pageId: 'A01',
  title: '',
  subtitle: '',
  projectName: '',
  projectNumber: '',
  madeBy: '',
  date: new Date().toLocaleDateString('en-GB'),
  showNorthSymbol: true,
  company: {
    name: 'Geometry OS',
    tagline: 'CAD of the Future.',
    phone: '',
    email: '',
    location: '',
  },
};

