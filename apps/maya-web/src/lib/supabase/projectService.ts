/**
 * Project Service
 * 
 * Handles all CRUD operations for project persistence with Supabase.
 * Includes optimistic updates, conflict resolution, and offline support.
 */

import { supabase, isSupabaseConfigured, getCurrentUser, getAnonymousSessionId } from './client';
import type { 
  ProjectRow, 
  ProjectInsert, 
  ProjectUpdate, 
  ProjectSummary,
  ProjectStatus 
} from './types';
import type { WorkspaceSnapshot } from '../../domain/workspace/core/types';

/**
 * Generate a unique project ID
 */
const generateProjectId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `proj_${timestamp}_${random}`;
};

/**
 * Generate a default project name based on timestamp
 */
const generateDefaultName = (): string => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  return `Untitled Design - ${dateStr} ${timeStr}`;
};

/**
 * Create a new project
 */
export const createProject = async (
  snapshot: WorkspaceSnapshot,
  name?: string,
  description?: string
): Promise<ProjectRow | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured. Project will not be saved to cloud.');
    // Return a local-only project object
    return createLocalProject(snapshot, name, description);
  }

  const user = await getCurrentUser();
  const projectId = generateProjectId();

  const projectData: ProjectInsert = {
    id: projectId,
    name: name || generateDefaultName(),
    description: description || null,
    user_id: user?.id || null,
    anonymous_session_id: user ? null : getAnonymousSessionId(),
    status: 'active',
    snapshot_data: snapshot,
    tags: [],
    is_template: false,
  };

  const { data, error } = await supabase
    .from('projects')
    .insert(projectData as unknown as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    // Fallback to local storage
    return createLocalProject(snapshot, name, description);
  }

  return data;
};

/**
 * Create a local-only project (for offline or unauthenticated use)
 */
const createLocalProject = (
  snapshot: WorkspaceSnapshot,
  name?: string,
  description?: string
): ProjectRow => {
  const projectId = generateProjectId();
  const now = new Date().toISOString();
  
  const project: ProjectRow = {
    id: projectId,
    name: name || generateDefaultName(),
    description: description || null,
    user_id: null,
    anonymous_session_id: getAnonymousSessionId(),
    status: 'active',
    snapshot_data: snapshot,
    thumbnail_url: null,
    tags: [],
    is_template: false,
    parent_template_id: null,
    version: 1,
    created_at: now,
    updated_at: now,
    last_opened_at: now,
  };

  // Save to localStorage
  saveProjectToLocalStorage(project);
  
  return project;
};

/**
 * Save project to localStorage as fallback
 */
const saveProjectToLocalStorage = (project: ProjectRow): void => {
  const STORAGE_KEY = 'maya_local_projects';
  const existing = localStorage.getItem(STORAGE_KEY);
  const projects: Record<string, ProjectRow> = existing ? JSON.parse(existing) : {};
  projects[project.id] = project;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

/**
 * Get project from localStorage
 */
const getProjectFromLocalStorage = (projectId: string): ProjectRow | null => {
  const STORAGE_KEY = 'maya_local_projects';
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) return null;
  const projects: Record<string, ProjectRow> = JSON.parse(existing);
  return projects[projectId] || null;
};

/**
 * Get all projects from localStorage
 */
const getLocalProjects = (): ProjectRow[] => {
  const STORAGE_KEY = 'maya_local_projects';
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) return [];
  const projects: Record<string, ProjectRow> = JSON.parse(existing);
  return Object.values(projects).filter(p => p.status !== 'deleted');
};

/**
 * Update an existing project (auto-save)
 */
export const updateProject = async (
  projectId: string,
  updates: ProjectUpdate
): Promise<ProjectRow | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    // Update in localStorage
    const existing = getProjectFromLocalStorage(projectId);
    if (existing) {
      const updated: ProjectRow = {
        ...existing,
        ...updates,
        version: existing.version + 1,
        updated_at: new Date().toISOString(),
      };
      saveProjectToLocalStorage(updated);
      return updated;
    }
    return null;
  }

  // Increment version for conflict detection
  const { data: current } = await supabase
    .from('projects')
    .select('version')
    .eq('id', projectId)
    .single();

  const currentVersion = (current as { version?: number } | null)?.version || 0;
  const updateData = {
    ...updates,
    version: currentVersion + 1,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('projects')
    .update(updateData as unknown as never)
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    console.error('Error updating project:', error);
    // Fallback to localStorage
    const existing = getProjectFromLocalStorage(projectId);
    if (existing) {
      const updated: ProjectRow = {
        ...existing,
        ...updates,
        version: existing.version + 1,
        updated_at: new Date().toISOString(),
      };
      saveProjectToLocalStorage(updated);
      return updated;
    }
    return null;
  }

  return data;
};

/**
 * Save snapshot to project (primary auto-save method)
 */
export const saveProjectSnapshot = async (
  projectId: string,
  snapshot: WorkspaceSnapshot
): Promise<boolean> => {
  const result = await updateProject(projectId, { snapshot_data: snapshot });
  return result !== null;
};

/**
 * Load a project by ID
 */
export const loadProject = async (projectId: string): Promise<ProjectRow | null> => {
  // Check localStorage first
  const localProject = getProjectFromLocalStorage(projectId);
  
  if (!isSupabaseConfigured() || !supabase) {
    return localProject;
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('Error loading project:', error);
    return localProject;
  }

  // Update last_opened_at
  await supabase
    .from('projects')
    .update({ last_opened_at: new Date().toISOString() } as unknown as never)
    .eq('id', projectId);

  return data;
};

/**
 * List all projects for the current user
 */
export const listProjects = async (
  status?: ProjectStatus,
  limit = 50
): Promise<ProjectSummary[]> => {
  const localProjects = getLocalProjects();
  
  if (!isSupabaseConfigured() || !supabase) {
    return localProjects
      .filter(p => !status || p.status === status)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, limit)
      .map(projectToSummary);
  }

  const user = await getCurrentUser();
  const anonymousId = getAnonymousSessionId();

  // Build the OR filter based on whether user is authenticated
  const orFilters: string[] = [];
  if (user?.id) {
    orFilters.push(`user_id.eq.${user.id}`);
  }
  orFilters.push(`anonymous_session_id.eq.${anonymousId}`);

  let query = supabase
    .from('projects')
    .select('id, name, description, status, thumbnail_url, tags, created_at, updated_at, last_opened_at')
    .or(orFilters.join(','))
    .neq('status', 'deleted')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error listing projects:', error);
    return localProjects
      .filter(p => !status || p.status === status)
      .map(projectToSummary);
  }

  // Merge cloud and local projects (prefer cloud)
  const cloudIds = new Set((data as ProjectSummary[] | null)?.map(p => p.id) || []);
  const mergedLocal = localProjects
    .filter(p => !cloudIds.has(p.id))
    .filter(p => !status || p.status === status)
    .map(projectToSummary);

  return [...(data || []), ...mergedLocal]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit);
};

/**
 * Convert full project to summary
 */
const projectToSummary = (project: ProjectRow): ProjectSummary => ({
  id: project.id,
  name: project.name,
  description: project.description,
  status: project.status,
  thumbnail_url: project.thumbnail_url,
  tags: project.tags,
  created_at: project.created_at,
  updated_at: project.updated_at,
  last_opened_at: project.last_opened_at,
  shape_count: project.snapshot_data?.shapes?.length || 0,
});

/**
 * Rename a project
 */
export const renameProject = async (
  projectId: string,
  newName: string
): Promise<boolean> => {
  const result = await updateProject(projectId, { name: newName });
  return result !== null;
};

/**
 * Delete a project (soft delete)
 */
export const deleteProject = async (projectId: string): Promise<boolean> => {
  const result = await updateProject(projectId, { status: 'deleted' });
  return result !== null;
};

/**
 * Archive a project
 */
export const archiveProject = async (projectId: string): Promise<boolean> => {
  const result = await updateProject(projectId, { status: 'archived' });
  return result !== null;
};

/**
 * Duplicate a project
 */
export const duplicateProject = async (projectId: string): Promise<ProjectRow | null> => {
  const original = await loadProject(projectId);
  if (!original) return null;

  return createProject(
    original.snapshot_data,
    `${original.name} (Copy)`,
    original.description || undefined
  );
};

/**
 * Sync local projects to cloud when user logs in
 */
export const syncLocalProjectsToCloud = async (): Promise<number> => {
  if (!isSupabaseConfigured() || !supabase) return 0;
  
  const user = await getCurrentUser();
  if (!user) return 0;

  const localProjects = getLocalProjects();
  let syncedCount = 0;

  for (const project of localProjects) {
    // Check if project exists in cloud
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project.id)
      .single();

    if (!existing) {
      // Upload to cloud
      const insertData = {
        ...project,
        user_id: user.id,
        anonymous_session_id: null,
      };
      const { error } = await supabase
        .from('projects')
        .insert(insertData as unknown as never);

      if (!error) {
        syncedCount++;
        // Remove from localStorage after successful sync
        const STORAGE_KEY = 'maya_local_projects';
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const projects: Record<string, ProjectRow> = JSON.parse(stored);
          delete projects[project.id];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        }
      }
    }
  }

  return syncedCount;
};

/**
 * Claim all anonymous projects for the currently authenticated user.
 * This runs when a user signs in so their previous anonymous projects
 * become associated with their account.
 */
export const claimAnonymousProjects = async (): Promise<number> => {
  if (!isSupabaseConfigured() || !supabase) return 0;

  const user = await getCurrentUser();
  if (!user) return 0;

  const anonymousSessionId = getAnonymousSessionId();
  if (!anonymousSessionId) return 0;

  const { data, error } = await supabase.rpc('claim_anonymous_projects', {
    p_user_id: user.id,
    p_anonymous_session_id: anonymousSessionId,
  } as unknown as undefined);

  if (error) {
    console.error('Error claiming anonymous projects:', error);
    return 0;
  }

  return data ?? 0;
};

