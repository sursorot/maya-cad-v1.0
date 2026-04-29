/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import type { WorkspaceController } from '../hooks/useWorkspaceController';

const WorkspaceControllerContext = createContext<WorkspaceController | null>(null);

export const WorkspaceControllerProvider = WorkspaceControllerContext.Provider;

export const useWorkspaceControllerContext = (): WorkspaceController => {
  const ctx = useContext(WorkspaceControllerContext);
  if (!ctx) {
    throw new Error('useWorkspaceControllerContext must be used within a WorkspaceControllerProvider');
  }
  return ctx;
};


