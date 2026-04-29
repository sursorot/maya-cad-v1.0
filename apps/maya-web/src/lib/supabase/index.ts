/**
 * Supabase Module - Public API
 * 
 * This module provides project persistence functionality using Supabase.
 */

// Client
export { supabase, isSupabaseConfigured, getCurrentUser, getAnonymousSessionId } from './client';

// Auth
export { AuthProvider, useAuth } from './AuthContext';
export type { AuthContextType } from './AuthContext';

// Types
export type {
  ProjectRow,
  ProjectInsert,
  ProjectUpdate,
  ProjectSummary,
  ProjectStatus,
  AutoSaveState,
  Database,
} from './types';

// Services
export {
  createProject,
  updateProject,
  saveProjectSnapshot,
  loadProject,
  listProjects,
  renameProject,
  deleteProject,
  archiveProject,
  duplicateProject,
  syncLocalProjectsToCloud,
  claimAnonymousProjects,
} from './projectService';

// Hooks
export * from './hooks';

