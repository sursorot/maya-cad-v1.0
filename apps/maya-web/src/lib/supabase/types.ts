/**
 * Supabase Database Types
 * 
 * These types define the database schema for project persistence.
 * Generate these types using: npx supabase gen types typescript --project-id YOUR_PROJECT_ID
 */

import type { WorkspaceSnapshot } from '../../domain/workspace/core/types';

/**
 * Project status for managing project lifecycle
 */
export type ProjectStatus = 'draft' | 'active' | 'archived' | 'deleted';

/**
 * Project metadata stored in the database
 */
export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  user_id: string | null;
  anonymous_session_id: string | null;
  status: ProjectStatus;
  snapshot_data: WorkspaceSnapshot;
  thumbnail_url: string | null;
  tags: string[];
  is_template: boolean;
  parent_template_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
}

/**
 * Insert type for creating a new project
 */
export interface ProjectInsert {
  id?: string;
  name: string;
  description?: string | null;
  user_id?: string | null;
  anonymous_session_id?: string | null;
  status?: ProjectStatus;
  snapshot_data: WorkspaceSnapshot;
  thumbnail_url?: string | null;
  tags?: string[];
  is_template?: boolean;
  parent_template_id?: string | null;
}

/**
 * Update type for modifying an existing project
 */
export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  snapshot_data?: WorkspaceSnapshot;
  thumbnail_url?: string | null;
  tags?: string[];
  version?: number;
  last_opened_at?: string | null;
}

/**
 * Database schema type for Supabase client
 */
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_anonymous_projects: {
        Args: {
          p_user_id: string;
          p_anonymous_session_id: string;
        };
        Returns: number;
      };
    };
    Enums: {
      project_status: ProjectStatus;
    };
  };
}

/**
 * Project summary for listing (without full snapshot data)
 */
export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  thumbnail_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
  shape_count?: number;
}

/**
 * Auto-save state for tracking save status
 */
export interface AutoSaveState {
  status: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  lastSavedAt: number | null;
  lastError: string | null;
  pendingChanges: boolean;
}

