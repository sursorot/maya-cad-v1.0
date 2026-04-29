import { useCallback, useEffect } from 'react';
import type { DrawingMode } from '../types';
import type { WorkspaceSnapshot } from '@maya/workspace-domain/workspace';
import { useWorkspaceController } from './useWorkspaceController';

interface UseDrawingOptions {
  drawingMode?: DrawingMode;
  initialSnapshot?: Partial<WorkspaceSnapshot>;
}

export const useDrawing = (options: UseDrawingOptions | DrawingMode = 'one-time') => {
  // Support both old signature (just drawingMode) and new options object
  const opts: UseDrawingOptions = typeof options === 'string' 
    ? { drawingMode: options } 
    : options;
  
  const controller = useWorkspaceController({ 
    drawingMode: opts.drawingMode || 'one-time',
    initialSnapshot: opts.initialSnapshot,
  });
  const {
    snapshot,
    selectTool,
    setDrawingMode,
    setGuidelineOrientation,
    click,
    updateCursor,
    setPrimarySelection,
    setMultiSelection,
    moveSelection,
    deleteSelection,
    cancelDrawing,
    resizeLineHandle,
    resizePolylineCorner,
    resizeRectangleEdge,
    confirmCurrentShape,
    commitChainSession,
    abortChainSession,
    undo,
    redo,
    cancelHistoryBatch,
    executeTrim,
    clearTrimState,
    copySelection,
    pasteSelection,
  } = controller;

  useEffect(() => {
    if (opts.drawingMode) {
      setDrawingMode(opts.drawingMode);
    }
  }, [opts.drawingMode, setDrawingMode]);

  const setSelectedShapeId = useCallback(
    (id: string | null) => {
      setPrimarySelection(id);
    },
    [setPrimarySelection]
  );

  const setSelectedShapeIds = useCallback(
    (ids: string[]) => {
      setMultiSelection(ids);
    },
    [setMultiSelection]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Guideline tool orientation shortcuts (only when guideline tool is active)
      if (snapshot.activeTool === 'guideline') {
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          setGuidelineOrientation('horizontal');
          return;
        } else if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          setGuidelineOrientation('vertical');
          return;
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          setGuidelineOrientation('freeform');
          return;
        }
      }
      
      const hasSelection = Boolean(snapshot.selectedShapeId || snapshot.selectedShapeIds.length > 0);
      const isModKey = e.metaKey || e.ctrlKey;

      // =========================================================================
      // Modifier key shortcuts (Cmd/Ctrl + key)
      // =========================================================================
      
      if (isModKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (isModKey && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Select All (Cmd+A / Ctrl+A)
      if (isModKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const allShapeIds = snapshot.shapes.map(s => s.id);
        if (allShapeIds.length > 0) {
          setMultiSelection(allShapeIds);
        }
        return;
      }

      // Copy (Cmd+C / Ctrl+C)
      if (isModKey && (e.key === 'c' || e.key === 'C') && !e.shiftKey) {
        if (hasSelection) {
          e.preventDefault();
          copySelection();
        }
        return;
      }

      // Paste (Cmd+V / Ctrl+V)
      if (isModKey && (e.key === 'v' || e.key === 'V') && !e.shiftKey) {
        e.preventDefault();
        pasteSelection();
        return;
      }

      // Group (Cmd+G / Ctrl+G)
      if (isModKey && (e.key === 'g' || e.key === 'G') && !e.shiftKey) {
        if (hasSelection && snapshot.selectedShapeIds.length >= 2) {
          e.preventDefault();
          controller.groupSelection();
        }
        return;
      }

      // Ungroup (Cmd+Shift+G / Ctrl+Shift+G)
      if (isModKey && (e.key === 'g' || e.key === 'G') && e.shiftKey) {
        if (hasSelection) {
          e.preventDefault();
          controller.ungroupSelection();
        }
        return;
      }

      // Explode (X key when shapes are selected)
      if (!isModKey && !e.shiftKey && (e.key === 'x' || e.key === 'X') && !isTyping) {
        if (hasSelection && !snapshot.isDrawing) {
          // Check if any selected shape can be exploded
          const hasExplodable = snapshot.selectedShapeIds.some(id => {
            const shape = snapshot.shapes.find(s => s.id === id);
            return shape && ['polyline', 'rectangle', 'curve', 'group'].includes(shape.type);
          });
          if (hasExplodable) {
            e.preventDefault();
            controller.explodeSelection();
            return;
          }
        }
      }

      // =========================================================================
      // Tool switching shortcuts (single key, no modifiers, not while typing)
      // =========================================================================
      
      if (!isTyping && !isModKey && !e.shiftKey && !e.altKey) {
        // Don't switch tools while actively drawing (except Escape)
        if (snapshot.isDrawing) {
          // Allow specific keys during drawing
          if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== 'Backspace') {
            // Skip tool switching while drawing
          }
        } else {
          switch (e.key.toLowerCase()) {
            case 'v':
              // V = Select tool (only when not in guideline tool)
              if (snapshot.activeTool !== 'guideline') {
                e.preventDefault();
                selectTool('select');
                return;
              }
              break;
            case 'w':
              e.preventDefault();
              selectTool('wall');
              return;
            case 'l':
              e.preventDefault();
              selectTool('line');
              return;
            case 'p':
              e.preventDefault();
              selectTool('polyline');
              return;
            case 'r':
              e.preventDefault();
              selectTool('rectangle');
              return;
            case 'c':
              e.preventDefault();
              selectTool('circle');
              return;
            case 'g':
              e.preventDefault();
              selectTool('guideline');
              return;
            case 't':
              // T = Trim tool (Shift+T is handled elsewhere for trace panel)
              e.preventDefault();
              selectTool('trim');
              return;
            case 'm':
              e.preventDefault();
              selectTool('marker');
              return;
            case 'd':
              e.preventDefault();
              selectTool('dimension');
              return;
            case 'z':
              e.preventDefault();
              selectTool('zone');
              return;
            case 'o':
              e.preventDefault();
              selectTool('opening');
              return;
            case 'a':
              e.preventDefault();
              selectTool('arc');
              return;
          }
        }
      }

      // =========================================================================
      // Arrow key nudging (move selected shapes)
      // =========================================================================
      
      if (!isTyping && hasSelection && !snapshot.isDrawing) {
        const nudgeAmount = e.shiftKey ? 10 : 1; // Shift = larger nudge (10 units)
        
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            moveSelection({ x: 0, y: -nudgeAmount });
            return;
          case 'ArrowDown':
            e.preventDefault();
            moveSelection({ x: 0, y: nudgeAmount });
            return;
          case 'ArrowLeft':
            e.preventDefault();
            moveSelection({ x: -nudgeAmount, y: 0 });
            return;
          case 'ArrowRight':
            e.preventDefault();
            moveSelection({ x: nudgeAmount, y: 0 });
            return;
        }
      }

      // =========================================================================
      // Action shortcuts
      // =========================================================================

      // Handle Enter/Return for trim tool (when confirmed)
      if (e.key === 'Enter') {
        if (snapshot.activeTool === 'trim' && snapshot.trimState?.isConfirmed && snapshot.trimState?.highlightSegment) {
          e.preventDefault();
          executeTrim();
          return;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Handle trim tool deletion (works both before and after confirmation)
        if (snapshot.activeTool === 'trim' && snapshot.trimState?.highlightSegment) {
          e.preventDefault();
          executeTrim();
          return;
        }
        
        // Handle regular selection deletion
        if (hasSelection) {
          e.preventDefault();
          deleteSelection();
        }
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        
        // Clear trim state if active
        if (snapshot.activeTool === 'trim') {
          clearTrimState();
        }
        
        if (snapshot.isDrawing) {
          cancelDrawing();
        }
        if (snapshot.drawingMode === 'chain' && snapshot.chainSessionShapeIds.length > 0) {
          abortChainSession();
        }
        cancelHistoryBatch();
        selectTool('select');
        setPrimarySelection(null);
        setMultiSelection([]);
      }

      if (e.key === 'Enter' || e.key === 'Return') {
        // Handle trim tool first
        if (snapshot.activeTool === 'trim' && snapshot.trimState?.isConfirmed && snapshot.trimState?.highlightSegment) {
          // Already handled above
          return;
        }
        
        // Wall tool in chain mode is handled in useCanvasInteraction.ts where wallMode is available
        // Skip wall handling here to avoid conflicts
        if (snapshot.activeTool === 'wall') {
          return;
        }
        
        // If currently drawing a shape, confirm it
        if (snapshot.isDrawing && snapshot.currentShape) {
          e.preventDefault();
          confirmCurrentShape();
          // In chain mode, stay on the same tool to continue drawing
          // The tool will NOT switch to select because finishPlacement respects chain mode
          return;
        }
        
        // If not drawing but in chain mode with committed shapes, end the chain session
        if (snapshot.drawingMode === 'chain' && snapshot.chainSessionShapeIds.length > 0) {
          e.preventDefault();
          commitChainSession();
          return;
        }
      }
    },
    [
      snapshot.activeTool,
      snapshot.selectedShapeId,
      snapshot.selectedShapeIds,
      snapshot.shapes,
      snapshot.isDrawing,
      snapshot.currentShape,
      snapshot.chainSessionShapeIds,
      snapshot.drawingMode,
      snapshot.trimState,
      setGuidelineOrientation,
      deleteSelection,
      cancelDrawing,
      selectTool,
      setPrimarySelection,
      setMultiSelection,
      moveSelection,
      abortChainSession,
      commitChainSession,
      confirmCurrentShape,
      undo,
      redo,
      cancelHistoryBatch,
      executeTrim,
      clearTrimState,
      copySelection,
      pasteSelection,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    controller,
    activeTool: snapshot.activeTool,
    setActiveTool: selectTool,
    shapes: snapshot.shapes,
    isDrawing: snapshot.isDrawing,
    currentShape: snapshot.currentShape,
    selectedShapeId: snapshot.selectedShapeId,
    selectedShapeIds: snapshot.selectedShapeIds,
    setSelectedShapeId,
    setSelectedShapeIds,
    handleClick: click,
    updateDrawing: updateCursor,
    cancelDrawing,
    deleteSelectedShape: deleteSelection,
    moveSelectedShape: moveSelection,
    resizeSelectedShape: resizeLineHandle,
    resizePolylineCorner,
    resizeRectangleEdge,
    guidelineOrientation: snapshot.guidelineOrientation,
    setGuidelineOrientation,
  };
};

