/**
 * useProjectList Hook
 * 
 * Fetches and manages the list of user projects for the sidebar.
 * Properly waits for auth state to be determined before fetching.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../client';
import { listProjects, claimAnonymousProjects, syncLocalProjectsToCloud } from '../projectService';
import type { ProjectSummary, ProjectStatus } from '../types';

export interface UseProjectListOptions {
  /** Filter by status */
  status?: ProjectStatus;
  /** Maximum number of projects to load */
  limit?: number;
  /** Auto-refresh interval in milliseconds (0 to disable) */
  refreshInterval?: number;
}

export interface UseProjectListReturn {
  /** List of projects */
  projects: ProjectSummary[];
  /** Whether the list is loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Refresh the project list */
  refresh: () => Promise<void>;
  /** Get recent projects (sorted by last_opened_at) */
  recentProjects: ProjectSummary[];
}

export const useProjectList = (options: UseProjectListOptions = {}): UseProjectListReturn => {
  const { status, limit = 50, refreshInterval = 0 } = options;
  
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const initialFetchDone = useRef(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const projectList = await listProjects(status, limit);
      setProjects(projectList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [status, limit]);

  const runPostSignInSync = useCallback(async () => {
    try {
      await claimAnonymousProjects();
      await syncLocalProjectsToCloud();
    } catch {
      // Silent failure - sync can be retried
    } finally {
      await refresh();
    }
  }, [refresh]);

  // Wait for auth state to be determined, then fetch
  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    let isMounted = true;
    let hasHandledCurrentSession = false;

    const handleSignedIn = () => {
      if (!isMounted || hasHandledCurrentSession) return;
      hasHandledCurrentSession = true;
      void runPostSignInSync();
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        setAuthReady(true);
        if (session) {
          handleSignedIn();
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setAuthReady(true);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) return;
      setAuthReady(true);

      if (event === 'SIGNED_IN') {
        handleSignedIn();
      } else if (event === 'SIGNED_OUT') {
        hasHandledCurrentSession = false;
        refresh();
      } else if (event === 'TOKEN_REFRESHED') {
        refresh();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [refresh, runPostSignInSync]);

  // Initial load - only after auth is ready
  useEffect(() => {
    if (authReady && !initialFetchDone.current) {
      initialFetchDone.current = true;
      refresh();
    }
  }, [authReady, refresh]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  // Get recent projects (sorted by last opened)
  const recentProjects = [...projects]
    .filter(p => p.last_opened_at)
    .sort((a, b) => {
      const aTime = a.last_opened_at ? new Date(a.last_opened_at).getTime() : 0;
      const bTime = b.last_opened_at ? new Date(b.last_opened_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  return {
    projects,
    isLoading,
    error,
    refresh,
    recentProjects,
  };
};
