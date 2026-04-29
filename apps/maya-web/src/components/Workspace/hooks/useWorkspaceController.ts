import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import type {
  DrawingMode,
  GuidelineOrientation,
  Point,
  Shape,
  ToolType,
  WallAlignment,
  WallOffsetDirection,
  OpeningCategory,
  OpeningSwingState,
  MeasurementSettings,
  TextShape,
  ViewBox,
  ImageShape,
} from '../types';
import type {
  WorkspaceSnapshot,
  WorkspaceCommand,
  WallCreationOptions,
  OpeningPlacementOptions,
  AssetPlacementOptions,
} from '@maya/workspace-domain/workspace';
import { WorkspaceState, WorkspaceCommandBus, HistoryBatchMetricsCollector } from '@maya/workspace-domain/workspace';
import type { CommandLogEntry } from '@maya/rl-core/types';

interface UseWorkspaceControllerOptions {
  /**
   * Provide an initial snapshot to hydrate the workspace. Useful for loading saved sessions
   * or unit tests that need deterministic starting conditions.
   */
  initialSnapshot?: Partial<WorkspaceSnapshot>;
  /**
   * Initial drawing mode mirrors the existing useDrawing hook signature. Consumers can still
   * change modes later via the exposed setter.
   */
  drawingMode?: DrawingMode;
}

interface CommandResult {
  snapshot: WorkspaceSnapshot;
  events: string[];
}

type CommandLogListener = (entry: CommandLogEntry) => void;

export interface WorkspaceController {
  snapshot: WorkspaceSnapshot;
  execute: (command: WorkspaceCommand) => CommandResult;
  getCommandLog: () => CommandLogEntry[];
  resetCommandLog: () => void;
  subscribeToCommandLog: (listener: CommandLogListener) => () => void;
  /** Subscribe to workspace state changes (returns unsubscribe function) */
  subscribe: (listener: () => void) => () => void;
  selectTool: (tool: ToolType) => void;
  setDrawingMode: (mode: DrawingMode) => void;
  setGuidelineOrientation: (orientation: GuidelineOrientation) => void;
  setShowMeasurements: (show: boolean) => void;
  setMeasurementSettings: (settings: Partial<MeasurementSettings>) => void;
  setWallsLocked: (locked: boolean) => void;
  setMarkerOptions: (options: { label?: string; color?: string }) => void;
  updateMarker: (markerId: string, updates: { label?: string; color?: string }) => void;
  click: (point: Point) => void;
  updateCursor: (point: Point) => void;
  setPrimarySelection: (id: string | null) => void;
  setMultiSelection: (ids: string[]) => void;
  moveSelection: (delta: Point) => void;
  rotateSelection: (angle: number, pivot?: Point) => void;
  translateWall: (wallId: string, delta: Point) => void;
  deleteSelection: () => void;
  cancelDrawing: () => void;
  resizeLineHandle: (point: Point, handle: 'start' | 'end') => void;
  resizePolylineCorner: (point: Point, corner: 'tl' | 'tr' | 'bl' | 'br') => void;
  resizeRectangleEdge: (point: Point, edge: 'top' | 'right' | 'bottom' | 'left') => void;
  resizeRoomCorner: (point: Point, corner: 'tl' | 'tr' | 'bl' | 'br') => void;
  confirmCurrentShape: () => void;
  commitChainSession: () => void;
  abortChainSession: () => void;
  undo: () => void;
  redo: () => void;
  beginHistoryBatch: (source?: string) => void;
  commitHistoryBatch: () => void;
  cancelHistoryBatch: () => void;
  reset: (snapshot?: Partial<WorkspaceSnapshot>) => void;
  historyTelemetry: HistoryBatchMetricsCollector | null;
  wallBegin: (point: Point, options?: WallCreationOptions) => void;
  wallUpdate: (point: Point) => void;
  wallCommit: () => void;
  wallCancel: () => void;
  wallSetThickness: (thickness: number) => void;
  wallSetAlignment: (alignment: WallAlignment) => void;
  wallDrawRectangle: (start: Point, end: Point, options?: WallCreationOptions) => void;
  wallOffset: (
    wallId: string,
    distance: number,
    direction: WallOffsetDirection,
    options?: WallCreationOptions
  ) => void;
  selectedWallSetThickness: (thickness: number) => void;
  selectedWallSetHeight: (height: number) => void;
  selectedWallSetLength: (length: number) => void;
  selectedWallSetAlignment: (alignment: WallAlignment) => void;
  snapSelectedWallsOrthogonal: () => void;
  createWall: (start: Point, end: Point, options?: WallCreationOptions) => void;
  createRoom: (points: Point[], label?: string) => void;
  resizeWallHandle: (point: Point, handle: 'start' | 'end') => void;
  setWallControlPoint: (point: Point | null) => void;
  selectedRoomSetLabel: (label: string | null) => void;
  selectedOpeningSetSize: (size: { width?: number; height?: number }) => void;
  selectedOpeningSetCategory: (category: OpeningCategory) => void;
  selectedOpeningSetMetadata: (metadata: Record<string, string | number | boolean | null>) => void;
  openingBegin: (point: Point, options?: OpeningPlacementOptions) => void;
  openingUpdate: (point: Point) => void;
  openingCommit: () => void;
  openingCancel: () => void;
  openingInsert: (point: Point, options?: OpeningPlacementOptions) => void;
  assetInsert: (point: Point, options: AssetPlacementOptions) => void;
  openingFlip: (openingId: string, flipState: Partial<OpeningSwingState>) => void;
  resizeOpeningHandle: (point: Point, handle: 'start' | 'end') => void;
  zoneCommit: () => void;
  createZoneFromPoint: (point: Point) => void;
  createZoneFromPolygon: (polygon: Point[]) => void;
  setZoneDisabled: (zoneId: string, disabled: boolean) => void;
  setDimensionOffset: (dimensionId: string, point: Point) => void;
  updateTextContent: (textId: string, updates: Partial<TextShape>) => void;
  resizeText: (textId: string, newFontSize: number, newPosition?: Point) => void;
  moveCurrentShape: (delta: Point) => void;
  resizeCurrentText: (newFontSize: number, newPosition: Point) => void;
  setViewBox: (viewBox: ViewBox) => void;
  // Universal styling methods
  setShapeFill: (shapeId: string, fill: import('../types').FillStyle) => void;
  setShapeStroke: (shapeId: string, stroke: import('../types').StrokeStyle) => void;
  setShapeOpacity: (shapeId: string, opacity: number) => void;
  setShapeBlendMode: (shapeId: string, blendMode: import('../types').BlendMode) => void;
  setShapeShadow: (shapeId: string, shadow: import('../types').ShadowStyle | null) => void;
  applyStylePreset: (shapeId: string, presetId: string) => void;
  setSelectionFill: (fill: import('../types').FillStyle) => void;
  setSelectionStroke: (stroke: import('../types').StrokeStyle) => void;
  setSelectionOpacity: (opacity: number) => void;
  applySelectionPreset: (presetId: string) => void;
  // Trim tool methods
  setTrimFirstPoint: (point: Point, wallId: string) => void;
  setTrimSecondPoint: (point: Point, confirmed?: boolean) => void;
  clearTrimState: () => void;
  executeTrim: () => boolean;
  // Copy/paste methods
  copySelection: () => void;
  pasteSelection: () => void;
  hasClipboard: () => boolean;
  // Editing tools
  groupSelection: () => void;
  ungroupSelection: () => void;
  mirrorSelection: (axis: { point1: Point; point2: Point }, keepOriginal?: boolean) => void;
  explodeSelection: () => void;
  createFillet: (shapeId1: string, shapeId2: string, radius: number) => void;
  // Trace image methods
  addTraceImage: (image: ImageShape) => void;
  updateTraceImage: (imageId: string, updates: Partial<ImageShape>) => void;
  removeTraceImage: (imageId: string) => void;
}

export const useWorkspaceController = (options: UseWorkspaceControllerOptions = {}): WorkspaceController => {
  const controllerHandle = useMemo(() => {
    const snapshotOverride = options.initialSnapshot;
    let initialMode: DrawingMode = 'one-time';
    if (options.drawingMode) {
      initialMode = options.drawingMode;
    } else if (snapshotOverride && snapshotOverride.drawingMode) {
      initialMode = snapshotOverride.drawingMode;
    }

    const baseSnapshot = snapshotOverride ? { ...snapshotOverride } : {};
    const historyTelemetry = new HistoryBatchMetricsCollector();
    const state = new WorkspaceState(
      {
        ...baseSnapshot,
        drawingMode: initialMode,
      },
      { telemetry: historyTelemetry }
    );
    const bus = new WorkspaceCommandBus(state);
    return { state, bus, telemetry: historyTelemetry };
    // options are only used for initial creation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { state, bus, telemetry } = controllerHandle;
  const commandLogRef = useRef<CommandLogEntry[]>([]);
  const commandLogListenersRef = useRef<Set<CommandLogListener>>(new Set());
  
  // Clipboard for copy/paste functionality
  const clipboardRef = useRef<Shape[]>([]);
  const pasteCountRef = useRef<number>(0); // Track paste count for cumulative offset

  const emitCommandLogEntry = useCallback((entry: CommandLogEntry) => {
    commandLogRef.current.push(entry);
    commandLogListenersRef.current.forEach((listener) => {
      try {
        listener(entry);
      } catch (error) {
        // Error in command log listener - silently fail
      }
    });
  }, []);

  const getCommandLog = useCallback(() => [...commandLogRef.current], []);

  const resetCommandLog = useCallback(() => {
    commandLogRef.current = [];
  }, []);

  const subscribeToCommandLog = useCallback((listener: CommandLogListener) => {
    commandLogListenersRef.current.add(listener);
    return () => {
      commandLogListenersRef.current.delete(listener);
    };
  }, []);

  const generateCommandLogId = useCallback(() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `cmd-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const subscribe = useCallback(
    (onStoreChange: () => void) => state.subscribe(onStoreChange),
    [state]
  );

  const snapshot = useSyncExternalStore(
    subscribe,
    () => state.getSnapshot(),
    () => state.getSnapshot()
  );

  const execute = useCallback(
    (command: WorkspaceCommand) => {
      const result = bus.execute(command);
      const entry: CommandLogEntry = {
        id: generateCommandLogId(),
        timestamp: Date.now(),
        command,
        snapshot: result.snapshot,
        actionIndex: null,
      };
      emitCommandLogEntry(entry);
      return result;
    },
    [bus, emitCommandLogEntry, generateCommandLogId]
  );

  const selectTool = useCallback(
    (tool: ToolType) => {
      execute({ type: 'workspace/select_tool', tool });
    },
    [execute]
  );

  const setDrawingMode = useCallback(
    (mode: DrawingMode) => {
      execute({ type: 'workspace/set_drawing_mode', mode });
    },
    [execute]
  );

  const setGuidelineOrientation = useCallback(
    (orientation: GuidelineOrientation) => {
      execute({ type: 'workspace/set_guideline_orientation', orientation });
    },
    [execute]
  );

  const setShowMeasurements = useCallback(
    (show: boolean) => {
      execute({ type: 'workspace/set_show_measurements', show });
    },
    [execute]
  );

  const setMeasurementSettings = useCallback(
    (settings: Partial<MeasurementSettings>) => {
      // Direct state mutation for settings to avoid command overhead for UI toggles
      // or we can create a command if we want undo/redo support for settings
      state.setMeasurementSettings(settings);
    },
    [state]
  );

  const setWallsLocked = useCallback(
    (locked: boolean) => {
      execute({ type: 'workspace/set_walls_locked', locked });
    },
    [execute]
  );

  const setMarkerOptions = useCallback(
    (options: { label?: string; color?: string }) => {
      execute({ type: 'workspace/set_marker_options', options });
    },
    [execute]
  );

  const updateMarker = useCallback(
    (markerId: string, updates: { label?: string; color?: string }) => {
      execute({ type: 'workspace/update_marker', markerId, updates });
    },
    [execute]
  );

  const click = useCallback(
    (point: Point) => {
      execute({ type: 'workspace/click', point });
    },
    [execute]
  );

  const updateCursor = useCallback(
    (point: Point) => {
      execute({ type: 'workspace/update_cursor', point });
    },
    [execute]
  );

  const setPrimarySelection = useCallback(
    (id: string | null) => {
      if (id) {
        execute({ type: 'workspace/select_shapes', ids: [id], append: false });
      } else {
        execute({ type: 'workspace/select_shapes', ids: [] });
      }
    },
    [execute]
  );

  const setMultiSelection = useCallback(
    (ids: string[]) => {
      execute({ type: 'workspace/select_shapes', ids });
    },
    [execute]
  );

  const moveSelection = useCallback(
    (delta: Point) => {
      execute({ type: 'workspace/move_selection', delta });
    },
    [execute]
  );

  const rotateSelection = useCallback(
    (angle: number, pivot?: Point) => {
      execute({ type: 'workspace/rotate_selection', angle, pivot });
    },
    [execute]
  );

  const translateWall = useCallback(
    (wallId: string, delta: Point) => {
      state.translateWall(wallId, delta);
    },
    [state]
  );

  const deleteSelection = useCallback(
    () => {
      execute({ type: 'workspace/delete_selection' });
    },
    [execute]
  );

  const cancelDrawing = useCallback(
    () => {
      execute({ type: 'workspace/cancel_drawing' });
    },
    [execute]
  );

  const resizeLineHandle = useCallback(
    (point: Point, handle: 'start' | 'end') => {
      execute({ type: 'workspace/resize_line_handle', point, handle });
    },
    [execute]
  );

  const resizePolylineCorner = useCallback(
    (point: Point, corner: 'tl' | 'tr' | 'bl' | 'br') => {
      execute({ type: 'workspace/resize_polyline_corner', point, corner });
    },
    [execute]
  );

  const resizeRectangleEdge = useCallback(
    (point: Point, edge: 'top' | 'right' | 'bottom' | 'left') => {
      execute({ type: 'workspace/resize_rectangle_edge', point, edge });
    },
    [execute]
  );

  const resizeRoomCorner = useCallback(
    (point: Point, corner: 'tl' | 'tr' | 'bl' | 'br') => {
      execute({ type: 'workspace/resize_room_corner', point, corner });
    },
    [execute]
  );

  const confirmCurrentShape = useCallback(
    () => {
      execute({ type: 'workspace/confirm_current_shape' });
    },
    [execute]
  );

  const commitChainSession = useCallback(
    () => {
      execute({ type: 'workspace/commit_chain_session' });
    },
    [execute]
  );

  const abortChainSession = useCallback(
    () => {
      execute({ type: 'workspace/abort_chain_session' });
    },
    [execute]
  );

  const undo = useCallback(
    () => {
      execute({ type: 'workspace/undo' });
    },
    [execute]
  );

  const redo = useCallback(
    () => {
      execute({ type: 'workspace/redo' });
    },
    [execute]
  );

  const beginHistoryBatch = useCallback((source?: string) => {
    execute({ type: 'workspace/history_begin_batch', source });
  }, [execute]);

  const commitHistoryBatch = useCallback(() => {
    execute({ type: 'workspace/history_commit_batch' });
  }, [execute]);

  const cancelHistoryBatch = useCallback(() => {
    execute({ type: 'workspace/history_cancel_batch' });
  }, [execute]);

  const reset = useCallback(
    (nextSnapshot?: Partial<WorkspaceSnapshot>) => {
      execute({ type: 'workspace/reset', snapshot: nextSnapshot });
    },
    [execute]
  );

  const wallBegin = useCallback((point: Point, options?: WallCreationOptions) => {
    execute({ type: 'workspace/wall_begin', point, options });
  }, [execute]);

  const wallUpdate = useCallback((point: Point) => {
    execute({ type: 'workspace/wall_update', point });
  }, [execute]);

  const wallCommit = useCallback(() => {
    execute({ type: 'workspace/wall_commit' });
  }, [execute]);

  const wallCancel = useCallback(() => {
    execute({ type: 'workspace/wall_cancel' });
  }, [execute]);

  const wallSetThickness = useCallback((thickness: number) => {
    execute({ type: 'workspace/wall_set_thickness', thickness });
  }, [execute]);

  const wallSetAlignment = useCallback((alignment: WallAlignment) => {
    execute({ type: 'workspace/wall_set_alignment', alignment });
  }, [execute]);

  const wallDrawRectangle = useCallback((start: Point, end: Point, options?: WallCreationOptions) => {
    execute({ type: 'workspace/wall_rectangle', start, end, options });
  }, [execute]);

  const wallOffset = useCallback(
    (wallId: string, distance: number, direction: WallOffsetDirection, options?: WallCreationOptions) => {
      execute({ type: 'workspace/wall_offset', wallId, distance, direction, options });
    },
    [execute]
  );

  const selectedWallSetThickness = useCallback((thickness: number) => {
    execute({ type: 'workspace/selected_wall_set_thickness', thickness });
  }, [execute]);

  const selectedWallSetHeight = useCallback((height: number) => {
    execute({ type: 'workspace/selected_wall_set_height', height });
  }, [execute]);

  const selectedWallSetLength = useCallback((length: number) => {
    execute({ type: 'workspace/selected_wall_set_length', length });
  }, [execute]);

  const selectedWallSetAlignment = useCallback((alignment: WallAlignment) => {
    execute({ type: 'workspace/selected_wall_set_alignment', alignment });
  }, [execute]);

  const snapSelectedWallsOrthogonal = useCallback(() => {
    execute({ type: 'workspace/snap_selected_walls_orthogonal' });
  }, [execute]);

  const createWall = useCallback((start: Point, end: Point, options?: WallCreationOptions) => {
    execute({ type: 'workspace/create_wall', start, end, options });
  }, [execute]);

  const createRoom = useCallback((points: Point[], label?: string) => {
    execute({ type: 'workspace/create_room', points, label });
  }, [execute]);

  const resizeWallHandle = useCallback((point: Point, handle: 'start' | 'end') => {
    execute({ type: 'workspace/wall_resize_handle', point, handle });
  }, [execute]);

  const setWallControlPoint = useCallback((point: Point | null) => {
    execute({ type: 'workspace/wall_set_control_point', point });
  }, [execute]);

  const selectedRoomSetLabel = useCallback((label: string | null) => {
    execute({ type: 'workspace/selected_room_set_label', label });
  }, [execute]);

  const selectedOpeningSetSize = useCallback(
    (size: { width?: number; height?: number }) => {
      execute({
        type: 'workspace/selected_opening_set_size',
        width: typeof size.width === 'number' ? size.width : undefined,
        height: typeof size.height === 'number' ? size.height : undefined,
      });
    },
    [execute]
  );

  const selectedOpeningSetCategory = useCallback(
    (category: OpeningCategory) => {
      execute({ type: 'workspace/selected_opening_set_category', category });
    },
    [execute]
  );

  const selectedOpeningSetMetadata = useCallback(
    (metadata: Record<string, string | number | boolean | null>) => {
      execute({ type: 'workspace/selected_opening_set_metadata', metadata });
    },
    [execute]
  );

  const openingBegin = useCallback((point: Point, options?: OpeningPlacementOptions) => {
    execute({ type: 'workspace/opening_begin', point, options });
  }, [execute]);

  const openingUpdate = useCallback((point: Point) => {
    execute({ type: 'workspace/opening_update', point });
  }, [execute]);

  const openingCommit = useCallback(() => {
    execute({ type: 'workspace/opening_commit' });
  }, [execute]);

  const openingCancel = useCallback(() => {
    execute({ type: 'workspace/opening_cancel' });
  }, [execute]);

  const openingInsert = useCallback((point: Point, options?: OpeningPlacementOptions) => {
    execute({ type: 'workspace/opening_insert', point, options });
  }, [execute]);

  const assetInsert = useCallback((point: Point, options: AssetPlacementOptions) => {
    execute({ type: 'workspace/asset_insert', point, options });
  }, [execute]);

  const openingFlip = useCallback((openingId: string, flipState: Partial<OpeningSwingState>) => {
    execute({ type: 'workspace/opening_flip', openingId, flipState });
  }, [execute]);

  const resizeOpeningHandle = useCallback((point: Point, handle: 'start' | 'end') => {
    execute({ type: 'workspace/opening_resize_handle', point, handle });
  }, [execute]);

  // Universal styling methods
  const setShapeFill = useCallback((shapeId: string, fill: import('../types').FillStyle) => {
    execute({ type: 'workspace/shape_set_fill', shapeId, fill });
  }, [execute]);

  const setShapeStroke = useCallback((shapeId: string, stroke: import('../types').StrokeStyle) => {
    execute({ type: 'workspace/shape_set_stroke', shapeId, stroke });
  }, [execute]);

  const setShapeOpacity = useCallback((shapeId: string, opacity: number) => {
    execute({ type: 'workspace/shape_set_opacity', shapeId, opacity });
  }, [execute]);

  const setShapeBlendMode = useCallback((shapeId: string, blendMode: import('../types').BlendMode) => {
    execute({ type: 'workspace/shape_set_blend_mode', shapeId, blendMode });
  }, [execute]);

  const setShapeShadow = useCallback((shapeId: string, shadow: import('../types').ShadowStyle | null) => {
    execute({ type: 'workspace/shape_set_shadow', shapeId, shadow });
  }, [execute]);

  const applyStylePreset = useCallback((shapeId: string, presetId: string) => {
    execute({ type: 'workspace/shape_apply_preset', shapeId, presetId });
  }, [execute]);

  const setSelectionFill = useCallback((fill: import('../types').FillStyle) => {
    execute({ type: 'workspace/selection_set_fill', fill });
  }, [execute]);

  const setSelectionStroke = useCallback((stroke: import('../types').StrokeStyle) => {
    execute({ type: 'workspace/selection_set_stroke', stroke });
  }, [execute]);

  const setSelectionOpacity = useCallback((opacity: number) => {
    execute({ type: 'workspace/selection_set_opacity', opacity });
  }, [execute]);

  const applySelectionPreset = useCallback((presetId: string) => {
    execute({ type: 'workspace/selection_apply_preset', presetId });
  }, [execute]);

  // Trim tool methods
  const setTrimFirstPoint = useCallback((point: Point, wallId: string) => {
    state.setTrimFirstPoint(point, wallId);
  }, [state]);

  const setTrimSecondPoint = useCallback((point: Point, confirmed: boolean = false) => {
    state.setTrimSecondPoint(point, confirmed);
  }, [state]);

  const clearTrimState = useCallback(() => {
    state.clearTrimState();
  }, [state]);

  const executeTrim = useCallback(() => {
    return state.executeTrim();
  }, [state]);

  // Copy selected shapes to clipboard
  const copySelection = useCallback(() => {
    const currentSnapshot = state.getSnapshot();
    const selectedIds = currentSnapshot.selectedShapeIds;
    if (selectedIds.length === 0) return;

    // Deep clone the selected shapes to clipboard
    const shapesToCopy = currentSnapshot.shapes.filter((shape) => 
      selectedIds.includes(shape.id)
    );
    
    // Store deep cloned shapes in clipboard
    clipboardRef.current = JSON.parse(JSON.stringify(shapesToCopy));
    // Reset paste count when copying new shapes
    pasteCountRef.current = 0;
  }, [state]);

  // Paste shapes from clipboard
  const pasteSelection = useCallback(() => {
    if (clipboardRef.current.length === 0) return;

    // Increment paste count for cumulative offset
    pasteCountRef.current += 1;
    
    // Base offset of 0.3m (about 1 foot), multiplied by paste count
    // This ensures each paste is further offset from the original
    const baseOffset = 0.3;
    const multiplier = pasteCountRef.current;
    const offset = { 
      x: baseOffset * multiplier, 
      y: baseOffset * multiplier 
    };

    execute({
      type: 'workspace/paste_shapes',
      shapes: clipboardRef.current,
      offset,
    });
  }, [execute]);

  // Check if clipboard has shapes
  const hasClipboard = useCallback(() => {
    return clipboardRef.current.length > 0;
  }, []);

  // Trace image methods
  const addTraceImage = useCallback((image: ImageShape) => {
    execute({ type: 'workspace/trace_image_add', image });
  }, [execute]);

  const updateTraceImage = useCallback((imageId: string, updates: Partial<ImageShape>) => {
    execute({ type: 'workspace/trace_image_update', imageId, updates });
  }, [execute]);

  const removeTraceImage = useCallback((imageId: string) => {
    execute({ type: 'workspace/trace_image_remove', imageId });
  }, [execute]);

  return useMemo(() => ({
    snapshot,
    execute,
    getCommandLog,
    resetCommandLog,
    subscribeToCommandLog,
    subscribe,
    selectTool,
    setDrawingMode,
    setGuidelineOrientation,
    setShowMeasurements,
    setMeasurementSettings,
    setWallsLocked,
    setMarkerOptions,
    updateMarker,
    click,
    updateCursor,
    setPrimarySelection,
    setMultiSelection,
    moveSelection,
    rotateSelection,
    translateWall,
    deleteSelection,
    cancelDrawing,
    resizeLineHandle,
    resizePolylineCorner,
    resizeRectangleEdge,
    resizeRoomCorner,
    confirmCurrentShape,
    commitChainSession,
    abortChainSession,
    undo,
    redo,
    beginHistoryBatch,
    commitHistoryBatch,
    cancelHistoryBatch,
    reset,
    historyTelemetry: telemetry,
    wallBegin,
    wallUpdate,
    wallCommit,
    wallCancel,
    wallSetThickness,
    wallSetAlignment,
    selectedWallSetThickness,
    selectedWallSetHeight,
    selectedWallSetLength,
    selectedWallSetAlignment,
    snapSelectedWallsOrthogonal,
    createWall,
    createRoom,
    resizeWallHandle,
    setWallControlPoint,
    selectedRoomSetLabel,
    selectedOpeningSetSize,
    selectedOpeningSetCategory,
    selectedOpeningSetMetadata,
    wallDrawRectangle,
    wallOffset,
    openingBegin,
    openingUpdate,
    openingCommit,
    openingCancel,
    openingInsert,
    assetInsert,
    openingFlip,
    resizeOpeningHandle,
    zoneCommit: () => execute({ type: 'workspace/zone_commit' }),
    createZoneFromPoint: (point: Point) => execute({ type: 'workspace/create_zone_from_point', point }),
    createZoneFromPolygon: (polygon: Point[]) => execute({ type: 'workspace/create_zone_from_polygon', polygon }),
    setZoneDisabled: (zoneId: string, disabled: boolean) => execute({ type: 'workspace/zone_set_disabled', zoneId, disabled }),
    setDimensionOffset: (dimensionId: string, point: Point) => execute({ type: 'workspace/set_dimension_offset', dimensionId, point }),
    updateTextContent: (textId: string, updates: Partial<TextShape>) => state.updateTextContent(textId, updates),
    resizeText: (textId: string, newFontSize: number, newPosition?: Point) => state.resizeText(textId, newFontSize, newPosition),
    moveCurrentShape: (delta: Point) => state.moveCurrentShape(delta),
    resizeCurrentText: (newFontSize: number, newPosition: Point) => state.resizeCurrentText(newFontSize, newPosition),
    setViewBox: (viewBox: ViewBox) => state.setViewBox(viewBox),
    // Universal styling
    setShapeFill,
    setShapeStroke,
    setShapeOpacity,
    setShapeBlendMode,
    setShapeShadow,
    applyStylePreset,
    setSelectionFill,
    setSelectionStroke,
    setSelectionOpacity,
    applySelectionPreset,
    // Trim tool
    setTrimFirstPoint,
    setTrimSecondPoint,
    clearTrimState,
    executeTrim,
    // Copy/paste
    copySelection,
    pasteSelection,
    hasClipboard,
    // Trace images
    addTraceImage,
    updateTraceImage,
    removeTraceImage,
    // Editing tools: Group, Ungroup, Mirror, Explode
    groupSelection: () => execute({ type: 'workspace/group_selection' }),
    ungroupSelection: () => execute({ type: 'workspace/ungroup_selection' }),
    mirrorSelection: (axis: { point1: Point; point2: Point }, keepOriginal?: boolean) => 
      execute({ type: 'workspace/mirror_selection', axis, keepOriginal }),
    explodeSelection: () => execute({ type: 'workspace/explode_selection' }),
    createFillet: (shapeId1: string, shapeId2: string, radius: number) =>
      execute({ type: 'workspace/fillet', shapeId1, shapeId2, radius }),
  }), [
    snapshot,
    execute,
    getCommandLog,
    resetCommandLog,
    subscribeToCommandLog,
    subscribe,
    selectTool,
    setDrawingMode,
    setGuidelineOrientation,
    setShowMeasurements,
    setMeasurementSettings,
    setWallsLocked,
    setMarkerOptions,
    updateMarker,
    click,
    updateCursor,
    setPrimarySelection,
    setMultiSelection,
    moveSelection,
    rotateSelection,
    translateWall,
    deleteSelection,
    cancelDrawing,
    resizeLineHandle,
    resizePolylineCorner,
    resizeRectangleEdge,
    resizeRoomCorner,
    confirmCurrentShape,
    commitChainSession,
    abortChainSession,
    undo,
    redo,
    beginHistoryBatch,
    commitHistoryBatch,
    cancelHistoryBatch,
    reset,
    telemetry,
    wallBegin,
    wallUpdate,
    wallCommit,
    wallCancel,
    wallSetThickness,
    wallSetAlignment,
    selectedWallSetThickness,
    selectedWallSetHeight,
    selectedWallSetLength,
    selectedWallSetAlignment,
    snapSelectedWallsOrthogonal,
    createWall,
    createRoom,
    resizeWallHandle,
    setWallControlPoint,
    selectedRoomSetLabel,
    selectedOpeningSetSize,
    selectedOpeningSetCategory,
    selectedOpeningSetMetadata,
    wallDrawRectangle,
    wallOffset,
    openingBegin,
    openingUpdate,
    openingCommit,
    openingCancel,
    openingInsert,
    assetInsert,
    openingFlip,
    resizeOpeningHandle,
    state,
    setTrimFirstPoint,
    setTrimSecondPoint,
    clearTrimState,
    executeTrim,
    copySelection,
    pasteSelection,
    hasClipboard,
    addTraceImage,
    updateTraceImage,
    removeTraceImage,
  ]);
};
