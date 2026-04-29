/**
 * Desktop Integration Hook
 * 
 * Provides seamless integration with Geometry OS desktop app features.
 * Falls back gracefully when running in a web browser.
 */

import { useEffect, useCallback, useState } from 'react';
import type { MenuEvent } from '../../types/electron';

/**
 * Check if running in Electron desktop app
 */
export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && !!window.geometryOS?.isElectron;
}

/**
 * Get the desktop API (returns undefined in browser)
 */
export function getDesktopAPI() {
  return window.geometryOS;
}

/**
 * Hook for desktop app integration
 * 
 * Provides:
 * - Desktop detection
 * - Menu event handlers
 * - Native file operations
 * - System theme detection
 */
export function useDesktopIntegration(handlers?: {
  onNewProject?: () => void;
  onSave?: () => void;
  onSaveAs?: (filePath: string) => void;
  onOpenFile?: (filePath: string, content: string) => void;
  onExport?: (format: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onDelete?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomFit?: () => void;
  onZoom100?: () => void;
  onToggleGrid?: () => void;
  onToggleSnap?: () => void;
  onToolChange?: (tool: string) => void;
  onShowShortcuts?: () => void;
}) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [appInfo, setAppInfo] = useState<{
    name: string;
    version: string;
    platform: string;
  } | null>(null);

  // Initialize desktop features
  useEffect(() => {
    const desktop = isDesktopApp();
    setIsDesktop(desktop);

    if (!desktop) return;

    const api = getDesktopAPI()!;

    // Get app info
    api.getAppInfo().then(setAppInfo);

    // Get initial theme
    api.getSystemTheme().then(setSystemTheme);

    // Listen for theme changes
    api.onThemeChange(setSystemTheme);
  }, []);

  // Register menu event handlers
  useEffect(() => {
    if (!isDesktop || !handlers) return;

    const api = getDesktopAPI()!;

    const menuHandlers: Array<[MenuEvent, () => void]> = [];

    if (handlers.onNewProject) {
      const handler = () => handlers.onNewProject?.();
      api.onMenuEvent('menu-new-project', handler);
      menuHandlers.push(['menu-new-project', handler]);
    }

    if (handlers.onSave) {
      const handler = () => handlers.onSave?.();
      api.onMenuEvent('menu-save', handler);
      menuHandlers.push(['menu-save', handler]);
    }

    if (handlers.onSaveAs) {
      const handler = (filePath: string) => handlers.onSaveAs?.(filePath);
      api.onMenuEvent('menu-save-as', handler as () => void);
      menuHandlers.push(['menu-save-as', handler as () => void]);
    }

    if (handlers.onOpenFile) {
      const handler = () => {
        // File content is passed from main process
        api.openFile().then(result => {
          if (result.success && result.filePath && result.content) {
            handlers.onOpenFile?.(result.filePath, result.content);
          }
        });
      };
      api.onMenuEvent('menu-open-file', handler);
      menuHandlers.push(['menu-open-file', handler]);
    }

    if (handlers.onExport) {
      const handler = (format: string) => handlers.onExport?.(format);
      api.onMenuEvent('menu-export', handler as () => void);
      menuHandlers.push(['menu-export', handler as () => void]);
    }

    if (handlers.onUndo) {
      const handler = () => handlers.onUndo?.();
      api.onMenuEvent('menu-undo', handler);
      menuHandlers.push(['menu-undo', handler]);
    }

    if (handlers.onRedo) {
      const handler = () => handlers.onRedo?.();
      api.onMenuEvent('menu-redo', handler);
      menuHandlers.push(['menu-redo', handler]);
    }

    if (handlers.onSelectAll) {
      const handler = () => handlers.onSelectAll?.();
      api.onMenuEvent('menu-select-all', handler);
      menuHandlers.push(['menu-select-all', handler]);
    }

    if (handlers.onDeselectAll) {
      const handler = () => handlers.onDeselectAll?.();
      api.onMenuEvent('menu-deselect-all', handler);
      menuHandlers.push(['menu-deselect-all', handler]);
    }

    if (handlers.onDelete) {
      const handler = () => handlers.onDelete?.();
      api.onMenuEvent('menu-delete', handler);
      menuHandlers.push(['menu-delete', handler]);
    }

    if (handlers.onZoomIn) {
      const handler = () => handlers.onZoomIn?.();
      api.onMenuEvent('menu-zoom-in', handler);
      menuHandlers.push(['menu-zoom-in', handler]);
    }

    if (handlers.onZoomOut) {
      const handler = () => handlers.onZoomOut?.();
      api.onMenuEvent('menu-zoom-out', handler);
      menuHandlers.push(['menu-zoom-out', handler]);
    }

    if (handlers.onZoomFit) {
      const handler = () => handlers.onZoomFit?.();
      api.onMenuEvent('menu-zoom-fit', handler);
      menuHandlers.push(['menu-zoom-fit', handler]);
    }

    if (handlers.onZoom100) {
      const handler = () => handlers.onZoom100?.();
      api.onMenuEvent('menu-zoom-100', handler);
      menuHandlers.push(['menu-zoom-100', handler]);
    }

    if (handlers.onToggleGrid) {
      const handler = () => handlers.onToggleGrid?.();
      api.onMenuEvent('menu-toggle-grid', handler);
      menuHandlers.push(['menu-toggle-grid', handler]);
    }

    if (handlers.onToggleSnap) {
      const handler = () => handlers.onToggleSnap?.();
      api.onMenuEvent('menu-toggle-snap', handler);
      menuHandlers.push(['menu-toggle-snap', handler]);
    }

    if (handlers.onToolChange) {
      const handler = (tool: string) => handlers.onToolChange?.(tool);
      api.onMenuEvent('menu-tool', handler as () => void);
      menuHandlers.push(['menu-tool', handler as () => void]);
    }

    if (handlers.onShowShortcuts) {
      const handler = () => handlers.onShowShortcuts?.();
      api.onMenuEvent('menu-shortcuts', handler);
      menuHandlers.push(['menu-shortcuts', handler]);
    }

    // Cleanup handlers on unmount
    return () => {
      menuHandlers.forEach(([event, handler]) => {
        api.removeMenuEventListener(event, handler);
      });
    };
  }, [isDesktop, handlers]);

  // Native file operations
  const saveProject = useCallback(async (data: unknown, defaultPath?: string) => {
    if (!isDesktop) {
      // Fallback: Download as JSON in browser
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultPath || 'project.geos';
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    }

    return getDesktopAPI()!.saveFile(data, defaultPath);
  }, [isDesktop]);

  const openProject = useCallback(async () => {
    if (!isDesktop) {
      // Fallback: File input in browser
      return new Promise<{ success: boolean; content?: string; filePath?: string }>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.geos,.json';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                success: true,
                content: reader.result as string,
                filePath: file.name,
              });
            };
            reader.readAsText(file);
          } else {
            resolve({ success: false });
          }
        };
        input.click();
      });
    }

    return getDesktopAPI()!.openFile();
  }, [isDesktop]);

  const exportFile = useCallback(async (
    data: string | ArrayBuffer,
    filename: string,
    filters: Array<{ name: string; extensions: string[] }>
  ) => {
    if (!isDesktop) {
      // Fallback: Download in browser
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    }

    return getDesktopAPI()!.exportFile(data, filename, filters);
  }, [isDesktop]);

  return {
    isDesktop,
    systemTheme,
    appInfo,
    saveProject,
    openProject,
    exportFile,
  };
}

/**
 * Hook to apply desktop-specific CSS classes
 */
export function useDesktopStyles() {
  const [classes, setClasses] = useState('');

  useEffect(() => {
    const desktop = isDesktopApp();
    const platform = window.geometryOS?.platform;

    const classNames: string[] = [];

    if (desktop) {
      classNames.push('is-desktop');
      if (platform === 'darwin') {
        classNames.push('is-macos');
      }
    } else {
      classNames.push('is-web');
    }

    setClasses(classNames.join(' '));

    // Add to body for global styling
    document.body.classList.add(...classNames);

    return () => {
      document.body.classList.remove(...classNames);
    };
  }, []);

  return classes;
}

