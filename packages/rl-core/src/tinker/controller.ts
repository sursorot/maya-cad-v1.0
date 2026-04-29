// import type { WorkspaceController } from '../../components/Workspace/hooks/useWorkspaceController';

export interface WorkspaceController {
    execute(command: any): any;
    snapshot: any;
    selectTool(tool: any): void;
    click(point: any): void;
    deleteSelection(): void;
    [key: string]: any;
}

let globalController: WorkspaceController | null = null;

/**
 * Set the global workspace controller instance.
 * This should be called from the Workspace component when it initializes.
 */
export function setWorkspaceController(controller: WorkspaceController): void {
    globalController = controller;
}

/**
 * Get the global workspace controller instance.
 * Used by the bridge to execute commands.
 */
export function getWorkspaceController(): WorkspaceController | null {
    return globalController;
}

/**
 * Clear the global workspace controller.
 */
export function clearWorkspaceController(): void {
    globalController = null;
}
