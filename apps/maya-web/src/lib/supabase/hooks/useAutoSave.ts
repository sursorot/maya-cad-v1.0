/**
 * useAutoSave Hook
 * 
 * Provides debounced auto-save functionality for workspace snapshots.
 * Automatically saves changes after a delay, with status tracking.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { saveProjectSnapshot } from '../projectService';
import type { AutoSaveState } from '../types';
import type { WorkspaceSnapshot } from '../../../domain/workspace/core/types';

export interface UseAutoSaveOptions {
  /** Project ID to save to */
  projectId: string | null;
  /** Debounce delay in milliseconds (default: 2000ms) */
  debounceMs?: number;
  /** Whether auto-save is enabled */
  enabled?: boolean;
  /** Callback when save completes */
  onSaveComplete?: (success: boolean) => void;
  /** Callback when save starts */
  onSaveStart?: () => void;
}

export interface UseAutoSaveReturn {
  /** Current auto-save state */
  state: AutoSaveState;
  /** Trigger a save with the given snapshot */
  save: (snapshot: WorkspaceSnapshot) => void;
  /** Force an immediate save */
  saveNow: (snapshot: WorkspaceSnapshot) => Promise<boolean>;
  /** Cancel any pending save */
  cancel: () => void;
  /** Reset save state */
  reset: () => void;
}

const INITIAL_STATE: AutoSaveState = {
  status: 'idle',
  lastSavedAt: null,
  lastError: null,
  pendingChanges: false,
};

export const useAutoSave = (options: UseAutoSaveOptions): UseAutoSaveReturn => {
  const { 
    projectId, 
    debounceMs = 2000, 
    enabled = true,
    onSaveComplete,
    onSaveStart,
  } = options;
  
  const [state, setState] = useState<AutoSaveState>(INITIAL_STATE);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSnapshotRef = useRef<WorkspaceSnapshot | null>(null);
  const isSavingRef = useRef(false);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Reset state when project changes
  useEffect(() => {
    setState(INITIAL_STATE);
    pendingSnapshotRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [projectId]);

  const performSave = useCallback(async (snapshot: WorkspaceSnapshot): Promise<boolean> => {
    if (!projectId || isSavingRef.current) return false;
    
    isSavingRef.current = true;
    setState(prev => ({ ...prev, status: 'saving', pendingChanges: false }));
    onSaveStart?.();
    
    try {
      const success = await saveProjectSnapshot(projectId, snapshot);
      
      if (success) {
        setState({
          status: 'saved',
          lastSavedAt: Date.now(),
          lastError: null,
          pendingChanges: false,
        });
        onSaveComplete?.(true);
        
        // Return to idle after showing "saved" status
        setTimeout(() => {
          setState(prev => ({ ...prev, status: 'idle' }));
        }, 2000);
      } else {
        throw new Error('Save failed');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Save failed';
      setState(prev => ({
        ...prev,
        status: 'error',
        lastError: errorMessage,
        pendingChanges: true,
      }));
      onSaveComplete?.(false);
      return false;
    } finally {
      isSavingRef.current = false;
      pendingSnapshotRef.current = null;
    }
  }, [projectId, onSaveComplete, onSaveStart]);

  const save = useCallback((snapshot: WorkspaceSnapshot) => {
    if (!enabled || !projectId) return;
    
    pendingSnapshotRef.current = snapshot;
    setState(prev => ({ ...prev, status: 'pending', pendingChanges: true }));
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new debounced save
    timeoutRef.current = setTimeout(() => {
      if (pendingSnapshotRef.current) {
        performSave(pendingSnapshotRef.current);
      }
    }, debounceMs);
  }, [enabled, projectId, debounceMs, performSave]);

  const saveNow = useCallback(async (snapshot: WorkspaceSnapshot): Promise<boolean> => {
    if (!projectId) return false;
    
    // Cancel any pending debounced save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    return performSave(snapshot);
  }, [projectId, performSave]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingSnapshotRef.current = null;
    setState(prev => ({ ...prev, status: 'idle', pendingChanges: false }));
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState(INITIAL_STATE);
  }, [cancel]);

  return {
    state,
    save,
    saveNow,
    cancel,
    reset,
  };
};

/**
 * Format the last saved time for display
 */
export const formatLastSaved = (timestamp: number | null): string => {
  if (!timestamp) return 'Never';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 5000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return new Date(timestamp).toLocaleDateString();
};

/**
 * Get status icon/text for auto-save state
 */
export const getAutoSaveStatusText = (state: AutoSaveState): string => {
  switch (state.status) {
    case 'pending':
      return 'Unsaved changes...';
    case 'saving':
      return 'Saving...';
    case 'saved':
      return 'All changes saved';
    case 'error':
      return `Save failed: ${state.lastError}`;
    default:
      return state.lastSavedAt 
        ? `Last saved ${formatLastSaved(state.lastSavedAt)}`
        : '';
  }
};

