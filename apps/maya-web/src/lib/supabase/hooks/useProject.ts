/**
 * useProject Hook
 * 
 * Manages the current project state, including loading, saving, and metadata.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  createProject, 
  loadProject, 
  renameProject as renameProjectService,
  deleteProject as deleteProjectService,
  duplicateProject as duplicateProjectService,
} from '../projectService';
import type { ProjectRow } from '../types';
import type { WorkspaceSnapshot } from '../../../domain/workspace/core/types';

export interface UseProjectOptions {
  /** Auto-create a new project if none exists */
  autoCreate?: boolean;
  /** Initial project ID to load */
  initialProjectId?: string | null;
}

export interface UseProjectReturn {
  /** Current project data */
  project: ProjectRow | null;
  /** Whether a project is currently loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Whether the project has unsaved changes */
  hasUnsavedChanges: boolean;
  /** Create a new project */
  createNewProject: (snapshot: WorkspaceSnapshot, name?: string) => Promise<ProjectRow | null>;
  /** Load an existing project */
  loadExistingProject: (projectId: string) => Promise<ProjectRow | null>;
  /** Update the current project snapshot */
  updateSnapshot: (snapshot: WorkspaceSnapshot) => void;
  /** Rename the current project */
  renameProject: (newName: string) => Promise<boolean>;
  /** Delete the current project */
  deleteProject: () => Promise<boolean>;
  /** Duplicate the current project */
  duplicateProject: () => Promise<ProjectRow | null>;
  /** Clear the current project (start fresh) */
  clearProject: () => void;
  /** Mark changes as saved */
  markAsSaved: () => void;
}

// Check synchronously if there's a project to load (before first render)
const getInitialProjectId = (initialProjectId: string | null): string | null => {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  const urlProjectId = urlParams.get('project') || initialProjectId;
  const lastProjectId = localStorage.getItem('maya_last_project_id');
  return urlProjectId || lastProjectId;
};

export const useProject = (options: UseProjectOptions = {}): UseProjectReturn => {
  const { autoCreate: _autoCreate = true, initialProjectId = null } = options;
  
  // Determine if we need to load a project on mount (check synchronously)
  const initialProjectToLoad = getInitialProjectId(initialProjectId);
  
  const [project, setProject] = useState<ProjectRow | null>(null);
  // Start loading as true if there's a project to load
  const [isLoading, setIsLoading] = useState(!!initialProjectToLoad);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Track pending snapshot to avoid race conditions
  const pendingSnapshotRef = useRef<WorkspaceSnapshot | null>(null);
  const initRef = useRef(false);

  // Load initial project
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      // Check URL for project ID
      const urlParams = new URLSearchParams(window.location.search);
      const urlProjectId = urlParams.get('project') || initialProjectId;
      
      // Check localStorage for last opened project
      const lastProjectId = localStorage.getItem('maya_last_project_id');
      const projectIdToLoad = urlProjectId || lastProjectId;

      if (projectIdToLoad) {
        await loadExistingProject(projectIdToLoad);
      }
    };

    init();
  }, [initialProjectId]);

  const createNewProject = useCallback(async (
    snapshot: WorkspaceSnapshot,
    name?: string
  ): Promise<ProjectRow | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newProject = await createProject(snapshot, name);
      if (newProject) {
        setProject(newProject);
        setHasUnsavedChanges(false);
        localStorage.setItem('maya_last_project_id', newProject.id);
        
        // Update URL without reload
        const url = new URL(window.location.href);
        url.searchParams.set('project', newProject.id);
        window.history.replaceState({}, '', url.toString());
      }
      return newProject;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadExistingProject = useCallback(async (projectId: string): Promise<ProjectRow | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const loadedProject = await loadProject(projectId);
      if (loadedProject) {
        setProject(loadedProject);
        setHasUnsavedChanges(false);
        localStorage.setItem('maya_last_project_id', loadedProject.id);
        
        // Update URL without reload
        const url = new URL(window.location.href);
        url.searchParams.set('project', loadedProject.id);
        window.history.replaceState({}, '', url.toString());
      } else {
        setError('Project not found');
      }
      return loadedProject;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load project';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSnapshot = useCallback((snapshot: WorkspaceSnapshot) => {
    pendingSnapshotRef.current = snapshot;
    setHasUnsavedChanges(true);
    
    // Update local project state immediately for UI
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        snapshot_data: snapshot,
        updated_at: new Date().toISOString(),
      };
    });
  }, []);

  const renameProject = useCallback(async (newName: string): Promise<boolean> => {
    if (!project) return false;
    
    const success = await renameProjectService(project.id, newName);
    if (success) {
      setProject(prev => prev ? { ...prev, name: newName } : null);
    }
    return success;
  }, [project]);

  const deleteProject = useCallback(async (): Promise<boolean> => {
    if (!project) return false;
    
    const success = await deleteProjectService(project.id);
    if (success) {
      setProject(null);
      localStorage.removeItem('maya_last_project_id');
      
      // Remove from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('project');
      window.history.replaceState({}, '', url.toString());
    }
    return success;
  }, [project]);

  const duplicateProject = useCallback(async (): Promise<ProjectRow | null> => {
    if (!project) return null;
    
    setIsLoading(true);
    try {
      const duplicate = await duplicateProjectService(project.id);
      if (duplicate) {
        setProject(duplicate);
        localStorage.setItem('maya_last_project_id', duplicate.id);
        
        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('project', duplicate.id);
        window.history.replaceState({}, '', url.toString());
      }
      return duplicate;
    } finally {
      setIsLoading(false);
    }
  }, [project]);

  const clearProject = useCallback(() => {
    setProject(null);
    setHasUnsavedChanges(false);
    setError(null);
    localStorage.removeItem('maya_last_project_id');
    
    // Remove from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('project');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false);
    pendingSnapshotRef.current = null;
  }, []);

  return {
    project,
    isLoading,
    error,
    hasUnsavedChanges,
    createNewProject,
    loadExistingProject,
    updateSnapshot,
    renameProject,
    deleteProject,
    duplicateProject,
    clearProject,
    markAsSaved,
  };
};

