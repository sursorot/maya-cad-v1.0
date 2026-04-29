/**
 * useExport Hook
 * React hook for export functionality
 */

import { useState, useCallback, useRef } from 'react';
import type { WorkspaceSnapshot } from '../../domain/workspace/core/types';
import type { ExportFormat, ExportOptions, ExportResult, ExportProgress } from './types';
import { exportService } from './ExportService';

interface UseExportOptions {
  snapshot: WorkspaceSnapshot;
  svgRef: React.RefObject<SVGSVGElement | null>;
  projectName?: string;
}

interface UseExportReturn {
  // State
  isExporting: boolean;
  exportProgress: ExportProgress | null;
  lastResult: ExportResult | null;
  error: string | null;
  
  // Actions
  exportAs: (format: ExportFormat, options?: Partial<ExportOptions>) => Promise<ExportResult>;
  quickExport: (format: 'png' | 'pdf' | 'svg') => Promise<ExportResult>;
  
  // Modal controls
  isModalOpen: boolean;
  openExportModal: () => void;
  closeExportModal: () => void;
}

export function useExport({ snapshot, svgRef, projectName }: UseExportOptions): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [lastResult, setLastResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Set up progress callback
  const progressCallbackRef = useRef<(progress: ExportProgress) => void>((progress) => {
    setExportProgress(progress);
  });
  
  const exportAs = useCallback(async (
    format: ExportFormat,
    options?: Partial<ExportOptions>
  ): Promise<ExportResult> => {
    setIsExporting(true);
    setError(null);
    setExportProgress({ stage: 'preparing', progress: 0, message: 'Starting export...' });
    
    // Set progress callback
    exportService.setProgressCallback(progressCallbackRef.current);
    
    try {
      const result = await exportService.exportAndDownload(
        format,
        svgRef.current,
        snapshot,
        snapshot.selectedShapeIds,
        {
          fileName: projectName || 'maya-export',
          ...options,
        }
      );
      
      setLastResult(result);
      
      if (!result.success) {
        setError(result.error || 'Export failed');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      
      const errorResult: ExportResult = {
        success: false,
        error: errorMessage,
        fileName: '',
        format,
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
      };
      
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      exportService.setProgressCallback(null);
    }
  }, [snapshot, svgRef, projectName]);
  
  const quickExport = useCallback(async (format: 'png' | 'pdf' | 'svg'): Promise<ExportResult> => {
    return exportAs(format, { scope: 'all' });
  }, [exportAs]);
  
  const openExportModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);
  
  const closeExportModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  
  return {
    isExporting,
    exportProgress,
    lastResult,
    error,
    exportAs,
    quickExport,
    isModalOpen,
    openExportModal,
    closeExportModal,
  };
}

export default useExport;

