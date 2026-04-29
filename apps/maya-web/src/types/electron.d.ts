/**
 * Geometry OS Desktop API
 * 
 * Types for the Electron preload API exposed via contextBridge.
 * This API is available at `window.geometryOS` when running in the desktop app.
 */

interface GeometryOSAPI {
  // App info
  getAppInfo: () => Promise<{
    name: string;
    version: string;
    platform: string;
    arch: string;
  }>;

  // Theme
  getSystemTheme: () => Promise<'dark' | 'light'>;
  onThemeChange: (callback: (theme: 'dark' | 'light') => void) => void;

  // File operations
  saveFile: (data: unknown, defaultPath?: string) => Promise<{
    success: boolean;
    filePath?: string;
  }>;
  
  openFile: () => Promise<{
    success: boolean;
    filePath?: string;
    content?: string;
  }>;
  
  exportFile: (
    data: string | ArrayBuffer,
    filename: string,
    filters: Array<{ name: string; extensions: string[] }>
  ) => Promise<{
    success: boolean;
    filePath?: string;
  }>;

  // Window controls
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;

  // Menu event listeners
  onMenuEvent: (
    event: MenuEvent,
    callback: (...args: unknown[]) => void
  ) => void;
  
  removeMenuEventListener: (
    event: MenuEvent,
    callback: (...args: unknown[]) => void
  ) => void;

  // Platform info
  platform: 'darwin' | 'win32' | 'linux';
  isElectron: true;
}

type MenuEvent =
  | 'menu-preferences'
  | 'menu-new-project'
  | 'menu-open-file'
  | 'menu-save'
  | 'menu-save-as'
  | 'menu-export'
  | 'menu-undo'
  | 'menu-redo'
  | 'menu-select-all'
  | 'menu-deselect-all'
  | 'menu-delete'
  | 'menu-zoom-in'
  | 'menu-zoom-out'
  | 'menu-zoom-fit'
  | 'menu-zoom-100'
  | 'menu-toggle-grid'
  | 'menu-toggle-snap'
  | 'menu-tool'
  | 'menu-shortcuts'
  | 'menu-check-updates';

declare global {
  interface Window {
    geometryOS?: GeometryOSAPI;
  }
}

export type { GeometryOSAPI, MenuEvent };

