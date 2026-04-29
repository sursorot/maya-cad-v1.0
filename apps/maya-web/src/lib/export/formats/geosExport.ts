/**
 * GeometryOS Native Format Export/Import
 * Full-fidelity export of workspace snapshots
 */

import type { WorkspaceSnapshot } from '../../../domain/workspace/core/types';
import type { GeometryOSFile, GeometryOSFileMetadata, GeometryOSExportOptions } from '../types';

// Application version - should be imported from a config in production
const APP_VERSION = '1.0.0';

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Clean snapshot for export by removing transient state
 */
function cleanSnapshotForExport(
  snapshot: WorkspaceSnapshot,
  options: GeometryOSExportOptions
): WorkspaceSnapshot {
  const cleaned: WorkspaceSnapshot = {
    ...snapshot,
    // Always clear transient drawing state
    isDrawing: false,
    currentShape: null,
    selectedShapeId: null,
    selectedShapeIds: [],
    hoveredShapeId: null,
    chainSessionShapeIds: [],
    lastCursorPoint: null,
    // Clear trim state
    trimState: {
      wallId: null,
      firstPoint: null,
      secondPoint: null,
      highlightSegment: null,
      isConfirmed: false,
    },
    // Clear drawing history (can be large)
    drawingHistory: [],
    drawingFuture: [],
  };
  
  // Optionally include viewport state
  if (!options.includeViewport) {
    cleaned.viewBox = {
      x: -5,
      y: -5,
      width: 10,
      height: 10,
    };
  }
  
  // Optionally exclude settings
  if (!options.includeSettings) {
    cleaned.snapSettings = {
      endpoint: true,
      midpoint: true,
      center: true,
      nearest: false,
      quadrant: false,
      intersection: true,
      grid: true,
      direction: false,
      perpendicular: false,
      ortho: false,
      marker: true,
      enabled: true,
    };
    cleaned.measurementSettings = {
      linearDimensions: true,
      chipDimensions: true,
      arcDimensions: true,
      spanDimensions: true,
      angles: true,
      areaLabels: true,
      enabled: true,
    };
  }
  
  // Update metadata timestamps
  cleaned.metadata = {
    ...cleaned.metadata,
    updatedAt: Date.now(),
  };
  
  return cleaned;
}

/**
 * Generate a simple checksum for file integrity
 */
function generateChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Export workspace snapshot as GeometryOS file
 */
export async function exportAsGeometryOS(
  snapshot: WorkspaceSnapshot,
  options: GeometryOSExportOptions,
  metadata?: Partial<GeometryOSFileMetadata>
): Promise<Blob> {
  const cleanedSnapshot = cleanSnapshotForExport(snapshot, options);
  
  const file: GeometryOSFile = {
    version: '1.0',
    format: 'geos',
    metadata: {
      name: metadata?.name || options.fileName || 'Untitled',
      createdAt: metadata?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: metadata?.author,
      description: metadata?.description,
      units: cleanedSnapshot.lengthUnit,
      application: 'maya',
      applicationVersion: APP_VERSION,
    },
    content: {
      snapshot: cleanedSnapshot,
    },
  };
  
  // Generate checksum
  const contentJson = JSON.stringify(file.content);
  file.checksum = generateChecksum(contentJson);
  
  // Convert to JSON string
  const jsonString = JSON.stringify(file, null, 2);
  
  return new Blob([jsonString], { type: 'application/json' });
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Validate GeometryOS file structure
 */
function validateGeosFile(data: unknown): data is GeometryOSFile {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  const file = data as Record<string, unknown>;
  
  // Check required fields
  if (file.format !== 'geos') {
    return false;
  }
  
  if (!file.version || typeof file.version !== 'string') {
    return false;
  }
  
  if (!file.metadata || typeof file.metadata !== 'object') {
    return false;
  }
  
  if (!file.content || typeof file.content !== 'object') {
    return false;
  }
  
  const content = file.content as Record<string, unknown>;
  if (!content.snapshot || typeof content.snapshot !== 'object') {
    return false;
  }
  
  return true;
}

/**
 * Validate checksum if present
 */
function validateChecksum(file: GeometryOSFile): boolean {
  if (!file.checksum) {
    return true; // No checksum to validate
  }
  
  const contentJson = JSON.stringify(file.content);
  const calculatedChecksum = generateChecksum(contentJson);
  
  return calculatedChecksum === file.checksum;
}

/**
 * Check version compatibility
 */
function isVersionCompatible(version: string): boolean {
  // Currently only support version 1.x
  return version.startsWith('1.');
}

/**
 * Import GeometryOS file and return workspace snapshot
 */
export async function importGeometryOS(file: File): Promise<{
  snapshot: WorkspaceSnapshot;
  metadata: GeometryOSFileMetadata;
}> {
  const text = await file.text();
  
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid GeometryOS file: not valid JSON');
  }
  
  if (!validateGeosFile(parsed)) {
    throw new Error('Invalid GeometryOS file: missing required fields');
  }
  
  const geosFile = parsed as GeometryOSFile;
  
  // Check version compatibility
  if (!isVersionCompatible(geosFile.version)) {
    throw new Error(`Incompatible GeometryOS file version: ${geosFile.version}. This application supports version 1.x files.`);
  }
  
  // Validate checksum
  if (!validateChecksum(geosFile)) {
    console.warn('GeometryOS file checksum mismatch - file may be corrupted');
    // We continue anyway but warn the user
  }
  
  return {
    snapshot: geosFile.content.snapshot,
    metadata: geosFile.metadata,
  };
}

/**
 * Import GeometryOS file from Blob
 */
export async function importGeometryOSFromBlob(blob: Blob): Promise<{
  snapshot: WorkspaceSnapshot;
  metadata: GeometryOSFileMetadata;
}> {
  const file = new File([blob], 'import.geos', { type: 'application/json' });
  return importGeometryOS(file);
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get file info without fully parsing the snapshot
 */
export async function getGeosFileInfo(file: File): Promise<{
  version: string;
  metadata: GeometryOSFileMetadata;
  shapeCount: number;
}> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  
  if (!validateGeosFile(parsed)) {
    throw new Error('Invalid GeometryOS file');
  }
  
  const geosFile = parsed as GeometryOSFile;
  
  return {
    version: geosFile.version,
    metadata: geosFile.metadata,
    shapeCount: geosFile.content.snapshot.shapes?.length || 0,
  };
}

/**
 * Check if a file is a valid GeometryOS file
 */
export async function isGeosFile(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    return validateGeosFile(parsed);
  } catch {
    return false;
  }
}

