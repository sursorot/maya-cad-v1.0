/**
 * Download Utility
 * Helper functions for downloading blobs and triggering file downloads
 */

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  
  // Append to body and click
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download a data URL as a file
 */
export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download text content as a file
 */
export function downloadText(text: string, fileName: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([text], { type: mimeType });
  downloadBlob(blob, fileName);
}

/**
 * Download JSON as a file
 */
export function downloadJSON(data: unknown, fileName: string, pretty: boolean = true): void {
  const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  downloadText(json, fileName, 'application/json');
}

/**
 * Generate a timestamp-based filename
 */
export function generateFileName(baseName: string, extension: string): string {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  return `${baseName}_${timestamp}.${extension}`;
}

/**
 * Get file extension for a format
 */
export function getFileExtension(format: string): string {
  const extensions: Record<string, string> = {
    png: 'png',
    jpeg: 'jpg',
    jpg: 'jpg',
    svg: 'svg',
    pdf: 'pdf',
    dxf: 'dxf',
    dwg: 'dwg',
    geos: 'geos',
  };
  return extensions[format.toLowerCase()] || format;
}

/**
 * Get MIME type for a format
 */
export function getMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    dxf: 'application/dxf',
    dwg: 'application/acad',
    geos: 'application/json',
  };
  return mimeTypes[format.toLowerCase()] || 'application/octet-stream';
}

