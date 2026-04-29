import { useState, useRef, useEffect, lazy, Suspense, useCallback } from 'react';
import Header from './Header';
import Workspace from './Workspace';
import type { WorkspaceHandle } from './Workspace';
import Footer from './Footer';
import Resizer from './Resizer';
import type { SnapSettings, ViewBox, MeasurementSettings, ToolbarStyle } from './Workspace/types';
import { useProject, useAutoSave } from '../lib/supabase/hooks';
import { renameProject, deleteProject, duplicateProject, archiveProject } from '../lib/supabase';
import { DEFAULT_SNAPSHOT } from '../domain/workspace/core/constants';
import { X, Zap } from 'lucide-react';
import { ExportModal } from './Export';
import { getPerformanceTier, getPerformanceModeDescription } from '../config/featureFlags';
import { ShortcutsModal } from './Hints';

// Lazy load non-critical components for faster initial load
const Sidebar = lazy(() => import('./Sidebar'));
const DataModePanel = lazy(() => 
  import('./DataMode/DataModePanel').then(m => ({ default: m.DataModePanel }))
);

/**
 * Loading fallback for lazy-loaded panels
 * Uses minimal styling to avoid layout shift
 */
const PanelLoadingFallback = ({ width }: { width: number }) => (
  <div 
    style={{ 
      width, 
      height: '100%', 
      background: '#18181b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#71717a',
      fontSize: '14px',
    }}
  >
    Loading...
  </div>
);

/**
 * Full-page loading screen shown while project data is being fetched
 */
const ProjectLoadingScreen = () => (
  <div 
    style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
    }}
  >
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
    }}>
      {/* Geometry OS Icon */}
      <div style={{
        width: '48px',
        height: '48px',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="1"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="9" x2="9" y2="21"/>
        </svg>
      </div>
      {/* Loading spinner */}
      <div style={{
        width: '24px',
        height: '24px',
        border: '2px solid #e0e0e0',
        borderTopColor: '#000000',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '14px',
        fontWeight: 600,
        color: '#000000',
        letterSpacing: '-0.02em',
      }}>
        Geometry OS
      </span>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '10px',
        color: '#6c6c6c',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        Loading
      </span>
    </div>
  </div>
);

type LengthUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft' | 'ft-in';
type DrawingMode = 'one-time' | 'chain';

/**
 * WorkspaceApp - The main application workspace
 * This is the core CAD/floor planning interface with project persistence
 */
export default function WorkspaceApp() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(true);
  const [canvasScale, setCanvasScale] = useState(1);
  const [viewBoxWidth, setViewBoxWidth] = useState<number | undefined>(undefined);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);
  const [showGrid, setShowGrid] = useState(true); // Default ON for production
  const [showToolbar, setShowToolbar] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [measurementSettings, setMeasurementSettings] = useState<MeasurementSettings | undefined>(undefined);
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('ft-in');
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('one-time');
  const [sidebarWidth, setSidebarWidth] = useState(180);
  const [chatPanelWidth, setChatPanelWidth] = useState(400);
  const [snapSettings, setSnapSettings] = useState<SnapSettings>({
    endpoint: true,
    midpoint: true,
    center: false,
    nearest: true,
    quadrant: true,
    intersection: true,
    grid: true,
    direction: true,
    perpendicular: true,
    ortho: true,
    marker: true, // Snap to user-placed marker points
    enabled: true,
  });
  const [dataModeEnabled, setDataModeEnabled] = useState(false);
  const [toolbarStyle, setToolbarStyle] = useState<ToolbarStyle>('modern');
  const [showCompass, setShowCompass] = useState(true);
  const [zoneHoverEnabled, setZoneHoverEnabled] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [alignmentGuidesEnabled, setAlignmentGuidesEnabled] = useState(false); // Default OFF for production
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const workspaceRef = useRef<WorkspaceHandle>(null);
  
  // Performance warning state
  const [shapeCountWarning, setShapeCountWarning] = useState<{ count: number; tier: number; dismissed: boolean } | null>(null);
  const lastWarningCountRef = useRef<number>(1); // Track last tier shown (start at 1 = no warning)

  // Project persistence hooks
  const {
    project,
    isLoading: isProjectLoading,
    createNewProject,
    loadExistingProject,
    updateSnapshot,
    renameProject: handleRenameProject,
    markAsSaved,
  } = useProject({ autoCreate: false });

  // Auto-save with 3 second debounce (increased for better performance)
  const autoSave = useAutoSave({
    projectId: project?.id || null,
    debounceMs: 3000,
    enabled: !!project,
    onSaveComplete: (success) => {
      if (success) markAsSaved();
    },
  });

  // Track workspace changes for auto-save
  const lastSnapshotRevisionRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);

  // When project changes, sync the revision counter to the loaded project's revision
  // This prevents immediately overwriting the loaded state
  useEffect(() => {
    if (project?.snapshot_data?.metadata?.revision) {
      lastSnapshotRevisionRef.current = project.snapshot_data.metadata.revision;
      isInitialLoadRef.current = true;
    }
  }, [project?.id]); // Only when project ID changes

  // Event-driven change detection (replaces polling for better performance)
  useEffect(() => {
    if (!workspaceRef.current) return;

    // Subscribe to workspace state changes for auto-save
    const unsubscribe = workspaceRef.current.subscribe(() => {
      const snapshot = workspaceRef.current?.getSnapshot();
      if (!snapshot) return;
      
      // Only handle auto-save if project exists
      if (project && snapshot.metadata.revision !== lastSnapshotRevisionRef.current) {
        // Skip the first change after loading to avoid saving the initial state
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          lastSnapshotRevisionRef.current = snapshot.metadata.revision;
          return;
        }
        lastSnapshotRevisionRef.current = snapshot.metadata.revision;
        updateSnapshot(snapshot);
        autoSave.save(snapshot);
        
        // Check shape count for performance tier changes
        const shapeCount = snapshot.shapes.length;
        const currentTier = getPerformanceTier(shapeCount);
        
        // Show warning when entering a new performance tier (2, 3, or 4)
        if (currentTier > 1 && currentTier !== lastWarningCountRef.current) {
          lastWarningCountRef.current = currentTier;
          setShapeCountWarning({ count: shapeCount, tier: currentTier, dismissed: false });
        }
      }
    });

    return unsubscribe;
  }, [project, updateSnapshot, autoSave]);

  // Create new project when starting fresh - always start with blank canvas
  const handleNewProject = useCallback(async () => {
    // Always use DEFAULT_SNAPSHOT for new projects to start with a blank canvas
    const newProject = await createNewProject(DEFAULT_SNAPSHOT);
    if (newProject) {
      // Reset revision tracker to avoid saving stale data
      lastSnapshotRevisionRef.current = 0;
      isInitialLoadRef.current = true;
      setSidebarVisible(true); // Show sidebar with new project
    }
  }, [createNewProject]);

  // Load existing project - the key prop on Workspace will trigger remount with new snapshot
  const handleProjectSelect = useCallback(async (projectId: string) => {
    // Reset the revision tracker so we don't immediately save old state
    lastSnapshotRevisionRef.current = 0;
    await loadExistingProject(projectId);
  }, [loadExistingProject]);

  // Project actions from sidebar
  const handleProjectAction = useCallback(async (
    action: 'rename' | 'duplicate' | 'archive' | 'delete',
    projectId: string
  ) => {
    switch (action) {
      case 'rename': {
        const newName = prompt('Enter new project name:');
        if (newName) {
          await renameProject(projectId, newName);
        }
        break;
      }
      case 'duplicate':
        await duplicateProject(projectId);
        break;
      case 'archive':
        await archiveProject(projectId);
        break;
      case 'delete': {
        if (confirm('Are you sure you want to delete this project?')) {
          await deleteProject(projectId);
        }
        break;
      }
    }
  }, []);

  // Auto-create project on first meaningful interaction
  const ensureProjectExists = useCallback(async () => {
    if (!project && workspaceRef.current) {
      const snapshot = workspaceRef.current.getSnapshot();
      // Only create project if there are shapes
      if (snapshot.shapes.length > 0) {
        await createNewProject(snapshot);
      }
    }
  }, [project, createNewProject]);

  // Create project when user starts drawing
  useEffect(() => {
    if (!project && workspaceRef.current) {
      const checkForShapes = () => {
        const snapshot = workspaceRef.current?.getSnapshot();
        if (snapshot && snapshot.shapes.length > 0) {
          ensureProjectExists();
        }
      };
      
      const interval = setInterval(checkForShapes, 1000);
      return () => clearInterval(interval);
    }
  }, [project, ensureProjectExists]);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);
  
  // Create a fresh new canvas/project when clicking "New Canvas" button
  const handleNewCanvas = useCallback(async () => {
    try {
      // Create a brand new project with blank canvas
      const newProject = await createNewProject(DEFAULT_SNAPSHOT);
      if (newProject) {
        // Reset revision tracker to avoid saving stale data
        lastSnapshotRevisionRef.current = 0;
        isInitialLoadRef.current = true;
        // Ensure canvas is visible
        setCanvasOpen(true);
      }
    } catch {
      // Handle error silently
    }
  }, [createNewProject]);
  
  const handleScaleChange = (scale: number) => setCanvasScale(scale);
  const handleViewBoxChange = (viewBox: ViewBox) => setViewBoxWidth(viewBox.width);
  const handleContainerWidthChange = (width: number) => setContainerWidth(width);
  const toggleGrid = () => setShowGrid(!showGrid);
  const toggleToolbar = () => setShowToolbar(!showToolbar);
  const toggleCompass = () => setShowCompass(!showCompass);
  const toggleMeasurements = () => {
    if (workspaceRef.current) {
      const current = workspaceRef.current.getShowMeasurements();
      workspaceRef.current.setShowMeasurements(!current);
      setShowMeasurements(!current);
      if (measurementSettings) {
        const newSettings = { ...measurementSettings, enabled: !current };
        setMeasurementSettings(newSettings);
        workspaceRef.current.setMeasurementSettings(newSettings);
      }
    }
  };

  const handleMeasurementSettingsChange = (settings: Partial<MeasurementSettings>) => {
    if (workspaceRef.current) {
      workspaceRef.current.setMeasurementSettings(settings);
      setMeasurementSettings((prev) => {
        if (!prev) return undefined;
        const next = { ...prev, ...settings };
        if (settings.enabled !== undefined) {
          setShowMeasurements(settings.enabled);
        }
        return next;
      });
    }
  };
  const toggleDrawingMode = () => setDrawingMode((prev) => prev === 'one-time' ? 'chain' : 'one-time');

  const handleZoomIn = () => workspaceRef.current?.zoomIn();
  const handleZoomOut = () => workspaceRef.current?.zoomOut();
  const handleZoomReset = () => workspaceRef.current?.zoomReset();

  const handleSnapSettingsChange = (settings: Partial<SnapSettings>) => {
    setSnapSettings((prev) => ({ ...prev, ...settings }));
  };

  // Keyboard shortcuts for snapping modes and help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Cmd/Ctrl+P = Toggle snapping
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setSnapSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
      }
      // Shift+O = Toggle ortho mode (plain O is now Opening tool)
      if (e.shiftKey && (e.key === 'o' || e.key === 'O') && !isTyping) {
        e.preventDefault();
        setSnapSettings((prev) => ({ ...prev, ortho: !prev.ortho }));
      }
      // ? key opens shortcuts modal (Shift + / on most keyboards)
      if (e.key === '?' && !isTyping) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync showMeasurements state from workspace controller
  useEffect(() => {
    if (workspaceRef.current) {
      const current = workspaceRef.current.getShowMeasurements();
      setShowMeasurements(current);
      const currentSettings = workspaceRef.current.getMeasurementSettings();
      setMeasurementSettings(currentSettings);
    }
  }, [canvasOpen]);

  const handleSidebarResize = (delta: number) => {
    setSidebarWidth((prev) => Math.max(160, Math.min(prev + delta, window.innerWidth * 0.35)));
  };

  const handleChatPanelResize = (delta: number) => {
    setChatPanelWidth((prev) => Math.max(300, Math.min(prev + delta, window.innerWidth * 0.5)));
  };

  // Manual save / retry failed save
  const handleManualSave = useCallback(() => {
    if (workspaceRef.current && project) {
      const snapshot = workspaceRef.current.getSnapshot();
      autoSave.saveNow(snapshot);
    }
  }, [autoSave, project]);

  // Show loading screen while fetching project data
  if (isProjectLoading) {
    return <ProjectLoadingScreen />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-950">
      <Header
        onToggleSidebar={toggleSidebar}
        onOpenCanvas={handleNewCanvas}
        sidebarVisible={sidebarVisible}
        canvasOpen={canvasOpen}
        toolbarStyle={toolbarStyle}
        projectName={project?.name}
        onRenameProject={handleRenameProject}
        autoSaveState={autoSave.state}
        onRetrySave={handleManualSave}
        onManualSave={handleManualSave}
        onExport={() => setIsExportModalOpen(true)}
      />

      <div className="main-view">
        {sidebarVisible && (
          <>
            <div style={{ 
              width: `${sidebarWidth}px`, 
              flexShrink: 0,
              flexGrow: 0,
              display: 'flex', 
              minHeight: 0, 
              height: '100%' 
            }}>
              <Suspense fallback={<PanelLoadingFallback width={sidebarWidth} />}>
                <Sidebar
                  currentProjectId={project?.id || null}
                  onProjectSelect={handleProjectSelect}
                  onNewProject={handleNewProject}
                  onProjectAction={handleProjectAction}
                  onClose={() => setSidebarVisible(false)}
                  toolbarStyle={toolbarStyle}
                />
              </Suspense>
            </div>
            <Resizer onResize={handleSidebarResize} direction="left" />
          </>
        )}

        <Workspace
          key={project?.id || 'new'} // Re-mount workspace when project changes
          ref={workspaceRef}
          canvasOpen={canvasOpen}
          onScaleChange={handleScaleChange}
          onViewBoxChange={handleViewBoxChange}
          onContainerWidthChange={handleContainerWidthChange}
          showGrid={showGrid}
          showToolbar={showToolbar}
          toolbarStyle={toolbarStyle}
          lengthUnit={lengthUnit}
          snapSettings={snapSettings}
          drawingMode={drawingMode}
          onDrawingModeChange={setDrawingMode}
          showCompass={showCompass}
          zoneHoverEnabled={zoneHoverEnabled}
          showMarkers={showMarkers}
          alignmentGuidesEnabled={alignmentGuidesEnabled}
          initialSnapshot={project?.snapshot_data}
        />

        {dataModeEnabled && workspaceRef.current && (
          <>
            <Resizer onResize={handleChatPanelResize} direction="right" />
            <div style={{ flexBasis: `${chatPanelWidth}px`, display: 'flex', minHeight: 0, height: '100%' }}>
              <Suspense fallback={<PanelLoadingFallback width={chatPanelWidth} />}>
                <DataModePanel workspace={workspaceRef.current} />
              </Suspense>
            </div>
          </>
        )}
      </div>

      <Footer
        canvasOpen={canvasOpen}
        scale={canvasScale}
        viewBoxWidth={viewBoxWidth}
        containerWidth={containerWidth}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        showGrid={showGrid}
        onToggleGrid={toggleGrid}
        showToolbar={showToolbar}
        onToggleToolbar={toggleToolbar}
        toolbarStyle={toolbarStyle}
        onToolbarStyleChange={setToolbarStyle}
        showMeasurements={showMeasurements}
        onToggleMeasurements={toggleMeasurements}
        measurementSettings={measurementSettings}
        onMeasurementSettingsChange={handleMeasurementSettingsChange}
        lengthUnit={lengthUnit}
        onLengthUnitChange={setLengthUnit}
        snapSettings={snapSettings}
        onSnapSettingsChange={handleSnapSettingsChange}
        drawingMode={drawingMode}
        onToggleDrawingMode={toggleDrawingMode}
        dataModeEnabled={dataModeEnabled}
        onDataModeChange={setDataModeEnabled}
        showCompass={showCompass}
        onToggleCompass={toggleCompass}
        zoneHoverEnabled={zoneHoverEnabled}
        onToggleZoneHover={setZoneHoverEnabled}
        showMarkers={showMarkers}
        onToggleMarkers={() => setShowMarkers(prev => !prev)}
        alignmentGuidesEnabled={alignmentGuidesEnabled}
        onToggleAlignmentGuides={() => setAlignmentGuidesEnabled(prev => !prev)}
      />
      
      {/* Performance Mode Toast */}
      {shapeCountWarning && !shapeCountWarning.dismissed && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: shapeCountWarning.tier >= 3 ? '#fef3c7' : '#e0f2fe',
            border: `1px solid ${shapeCountWarning.tier >= 3 ? '#f59e0b' : '#0ea5e9'}`,
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 9999,
            maxWidth: '450px',
          }}
        >
          <Zap 
            size={20} 
            style={{ 
              color: shapeCountWarning.tier >= 3 ? '#d97706' : '#0284c7', 
              flexShrink: 0 
            }} 
          />
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: 600, 
              color: shapeCountWarning.tier >= 3 ? '#92400e' : '#0369a1', 
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              {getPerformanceModeDescription(shapeCountWarning.count)}
              <span style={{ 
                fontSize: '10px', 
                backgroundColor: shapeCountWarning.tier >= 3 ? '#fde68a' : '#bae6fd',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 500,
              }}>
                {shapeCountWarning.count} shapes
              </span>
            </div>
            <div style={{ 
              color: shapeCountWarning.tier >= 3 ? '#b45309' : '#0369a1', 
              fontSize: '11px', 
              marginTop: '4px',
              opacity: 0.9,
            }}>
              {shapeCountWarning.tier === 2 && 'Intersection snapping disabled for smoother performance.'}
              {shapeCountWarning.tier === 3 && 'Wall rendering simplified. Consider splitting into layers.'}
              {shapeCountWarning.tier === 4 && 'Maximum performance mode. Some visual features reduced.'}
            </div>
          </div>
          <button
            onClick={() => setShapeCountWarning(prev => prev ? { ...prev, dismissed: true } : null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: shapeCountWarning.tier >= 3 ? '#b45309' : '#0284c7',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      
      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        snapshot={workspaceRef.current?.getSnapshot() || DEFAULT_SNAPSHOT}
        svgSelector=".editor-area svg"
        projectName={project?.name}
      />
      
      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        toolbarStyle={toolbarStyle}
      />
    </div>
  );
}
