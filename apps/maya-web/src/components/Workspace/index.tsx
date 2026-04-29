import { useRef, forwardRef, useImperativeHandle, useState, useCallback, useEffect, useMemo } from 'react';
import type {
  WorkspaceProps,
  WorkspaceHandle,
  WallAlignment,
  WallShape,
  WallDrawingMode,
  RoomShape,
  OpeningShape,
  OpeningCategory,
  ToolType,
  MarkerShape,
} from './types';
import { useZoomPan } from './hooks/useZoomPan';
import { useDrawing } from './hooks/useDrawing';
import { calculateGridSystem } from './utils/gridSystem';
import { Canvas } from './components/Canvas/index';
import { EmptyState } from './components/EmptyState';
import { Toolbar } from './components/Toolbar';
import { GuidelineOrientationSelector } from './components/GuidelineOrientationSelector';
import { CUSTOM_CURSOR, CURSOR_HOTSPOT } from './constants';
import { WorkspaceControllerProvider } from './context/WorkspaceControllerContext';
import { WallBottomPanel } from './components/WallBottomPanel';
import { RoomToolPanel } from './components/RoomToolPanel';
import { OpeningBottomPanel } from './components/OpeningBottomPanel';
import { AssetPanel } from './components/AssetPanel';
import { MarkerToolPanel, MARKER_COLOR_PRESETS } from './components/MarkerToolPanel';
import { OPENING_PRESETS, type OpeningPreset, type WindowVisualType, type DoorVisualType } from './components/OpeningPresets';
import { TextEditorPanel } from './components/TextEditorPanel';
import { StylePanelWrapper } from './components/StylePanelWrapper';
import { CompassOverlay } from './components/CompassOverlay';
import { EditingToolsPanel } from './components/EditingToolsPanel';
import type { WallCreationOptions } from '@maya/workspace-domain/workspace';
import { calculateLength, calculateArcLength, metersToUnitValue, unitValueToMeters } from './utils/measurements';
import type { CommandLogEntry } from '@maya/rl-core/types';

// Simulation imports
import { SimulationOverlay, useSimulation } from '../Simulation';
import { SunlightPanel, SunlightOverlay, useSunlight } from '../Sunlight';

// BIM Panel imports
import { LayerPanel, useLayerPanel } from './components/LayerPanel';
import { PropertyPanel } from './components/PropertyPanel';
import type { PropertyValue } from '../../domain/workspace/core/types/bim/PropertySet';
import type { Discipline } from '../../domain/workspace/core/types/bim/Layer';

// Trace Layer imports
import { TraceLayerPanel, ImageUploadModal, CalibrationOverlay } from '../TraceLayer';
import type { ImageShape, Point, Shape } from './types';

// Precision Input imports
import { DynamicInput } from './components/PrecisionInput';
import { getFeatureFlags } from '../../config/featureFlags';

type WallToolOptions = Required<Pick<WallCreationOptions, 'thickness' | 'height' | 'alignment'>> & {
  mode: WallDrawingMode;
  offsetDistance: number;
};

type OpeningToolOptions = {
  width: number;
  height: number;
  presetId: string | null;
  category: OpeningCategory | null;
  visualType?: WindowVisualType | DoorVisualType;
};

const getOpeningCategoryFromPreset = (
  preset: OpeningPreset | null | undefined,
  fallback: OpeningCategory = 'door'
): OpeningCategory => {
  if (!preset) {
    return fallback;
  }
  if (preset.id.startsWith('window')) {
    return 'window';
  }
  if (preset.id.startsWith('opening')) {
    return 'opening';
  }
  return 'door';
};

const getWallLength = (wall: WallShape): number => {
  const { centerline } = wall;
  if (!centerline || centerline.length < 2) {
    return 0;
  }
  if (wall.controlPoint) {
    const start = centerline[0];
    const end = centerline[centerline.length - 1];
    return calculateArcLength(start, end, wall.controlPoint);
  }
  let total = 0;
  for (let i = 1; i < centerline.length; i += 1) {
    total += calculateLength(centerline[i - 1], centerline[i]);
  }
  return total;
};

// Re-export types for external use
export type { WorkspaceHandle, WorkspaceProps } from './types';

const Workspace = forwardRef<WorkspaceHandle, WorkspaceProps>(
  (
    {
      canvasOpen,
      onScaleChange,
      onViewBoxChange,
      onContainerWidthChange,
      showGrid = true,
      showToolbar = false,
      toolbarStyle = 'modern',
      lengthUnit = 'ft-in',
      snapSettings,
      drawingMode = 'one-time',
      onDrawingModeChange,
      showCompass = false,
      zoneHoverEnabled = true,
      showMarkers = true,
      alignmentGuidesEnabled = true,
      initialSnapshot,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null!);
    const svgRef = useRef<SVGSVGElement>(null!);
    const [wallOptions, setWallOptions] = useState<WallToolOptions>({
      thickness: 0.1524, // 6 inches in meters
      height: 9,
      alignment: 'outside',
      mode: 'single', // Default to single (one-time) mode
      offsetDistance: 1,
    });
    const defaultOpeningPreset = OPENING_PRESETS.find((preset) => preset.id === 'door-3070') ?? OPENING_PRESETS[0];
    const [openingOptions, setOpeningOptions] = useState<OpeningToolOptions>({
      width: defaultOpeningPreset.width,
      height: defaultOpeningPreset.height,
      presetId: null,
      category: null,
    });
    const [markerOptions, setMarkerOptions] = useState({
      label: 'M1',
      color: MARKER_COLOR_PRESETS[0].color,
    });
    const [selectedAssetId, setSelectedAssetId] = useState('king-bed');
    const [markerPanelPosition, setMarkerPanelPosition] = useState<{ x: number; y: number } | null>(null);
    const [showWallCenterline, setShowWallCenterline] = useState(false);
    const [roomLabelFocus, setRoomLabelFocus] = useState<{ roomId: string | null; token: number }>({
      roomId: null,
      token: 0,
    });
    const [stylePanelOpenTrigger, setStylePanelOpenTrigger] = useState(0);
    const [interactionState, setInteractionState] = useState({ isResizingAny: false });

    // Simulation mode state
    const [simulationModeActive, setSimulationModeActive] = useState(false);

    // Sunlight mode state
    const [sunlightModeActive, setSunlightModeActive] = useState(false);

    // BIM Panel states
    const [layerPanelVisible, setLayerPanelVisible] = useState(false);
    const [propertyPanelVisible, setPropertyPanelVisible] = useState(false);
    const layerPanel = useLayerPanel();

    // Editing Tools Panel state
    const [editingPanelVisible, setEditingPanelVisible] = useState(false);

    // Trace Layer states
    const [tracePanelVisible, setTracePanelVisible] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [calibrationMode, setCalibrationMode] = useState<{
      active: boolean;
      imageId: string | null;
      point1: Point | null;
      point2: Point | null;
    }>({ active: false, imageId: null, point1: null, point2: null });

    const precisionInputEnabled = getFeatureFlags().enablePrecisionInput;

    // Panel toolbar position and drag state
    const [panelToolbarPos, setPanelToolbarPos] = useState({ x: 12, y: 12 });
    const [isPanelToolbarDragging, setIsPanelToolbarDragging] = useState(false);
    const [panelToolbarDragOffset, setPanelToolbarDragOffset] = useState({ x: 0, y: 0 });
    const panelToolbarRef = useRef<HTMLDivElement>(null);

    // Zoom and pan logic
    const { viewBox, isPanning, handleZoomIn, handleZoomOut, handleZoomReset } = useZoomPan({
      containerRef,
      canvasOpen,
      onScaleChange,
      onViewBoxChange,
    });

    // Drawing logic - pass initialSnapshot to restore saved projects
    const {
      controller,
      activeTool,
      setActiveTool,
      guidelineOrientation,
      setGuidelineOrientation,
    } = useDrawing({ drawingMode, initialSnapshot });

    // Read showMeasurements from controller snapshot (single source of truth)
    const showMeasurements = controller.snapshot.showMeasurements;
    const measurementSettings = controller.snapshot.measurementSettings;

    // Initialize marker options in controller on first mount
    const markerInitializedRef = useRef(false);
    useEffect(() => {
      if (!markerInitializedRef.current) {
        controller.setMarkerOptions(markerOptions);
        markerInitializedRef.current = true;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [controller]);

    // Sync marker options with the controller (only when user changes them via panel)
    const handleMarkerLabelChange = useCallback((label: string) => {
      setMarkerOptions(prev => ({ ...prev, label }));
      controller.setMarkerOptions({ label });
    }, [controller]);

    const handleMarkerColorChange = useCallback((color: string) => {
      setMarkerOptions(prev => ({ ...prev, color }));
      controller.setMarkerOptions({ color });
    }, [controller]);

    // Handler for updating existing markers (edit mode)
    const handleMarkerUpdate = useCallback((markerId: string, updates: { label?: string; color?: string }) => {
      controller.updateMarker(markerId, updates);
    }, [controller]);

    // Track canvas click position for panel placement
    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
      if (activeTool === 'marker') {
        setMarkerPanelPosition({ x: e.clientX, y: e.clientY });
      }
    }, [activeTool]);

    // Update local state when marker is placed and label auto-increments
    const prevMarkerCountRef = useRef(0);
    useEffect(() => {
      const markerCount = controller.snapshot.shapes.filter(s => s.type === 'marker').length;
      if (markerCount > prevMarkerCountRef.current) {
        // A marker was just placed - sync the auto-incremented label from controller
        const controllerLabel = controller.snapshot.markerOptions?.label;
        if (controllerLabel) {
          setMarkerOptions(prev => ({ ...prev, label: controllerLabel }));
        }
      }
      prevMarkerCountRef.current = markerCount;
    }, [controller.snapshot.shapes, controller.snapshot.markerOptions?.label]);

    // Simulation hook - uses current snapshot for navigation environment
    const simulation = useSimulation(simulationModeActive ? controller.snapshot : null);

    // Sunlight hook - uses current snapshot for sunlight analysis
    const sunlight = useSunlight(sunlightModeActive ? controller.snapshot : null);

    // Trace image handlers - memoize the filtered list
    const traceImages = useMemo(() =>
      controller.snapshot.shapes.filter((s): s is ImageShape => s.type === 'image'),
      [controller.snapshot.shapes]
    );

    const handleTraceImageAdd = useCallback((image: ImageShape) => {
      controller.addTraceImage(image);
    }, [controller]);

    const handleTraceImageUpdate = useCallback((imageId: string, updates: Partial<ImageShape>) => {
      controller.updateTraceImage(imageId, updates);
    }, [controller]);

    const handleTraceImageRemove = useCallback((imageId: string) => {
      controller.removeTraceImage(imageId);
    }, [controller]);

    // Start calibration mode for an image
    const handleStartCalibration = useCallback((imageId: string) => {
      const image = traceImages.find(img => img.id === imageId);
      if (image) {
        setCalibrationMode({
          active: true,
          imageId,
          point1: null,
          point2: null,
        });
      }
    }, [traceImages]);

    // Handle canvas click during calibration mode
    const handleCalibrationClick = useCallback((canvasPoint: Point, imageId: string) => {
      if (!calibrationMode.active || calibrationMode.imageId !== imageId) return;

      const image = traceImages.find(img => img.id === imageId);
      if (!image) return;

      // Convert canvas point to image pixel coordinates
      const relX = canvasPoint.x - image.position.x;
      const relY = canvasPoint.y - image.position.y;

      // Convert from canvas units (meters) to image pixels
      const pixelX = (relX / image.width) * image.originalWidth;
      const pixelY = (relY / image.height) * image.originalHeight;

      const pixelPoint = { x: pixelX, y: pixelY };

      if (!calibrationMode.point1) {
        setCalibrationMode(prev => ({ ...prev, point1: pixelPoint }));
      } else if (!calibrationMode.point2) {
        setCalibrationMode(prev => ({ ...prev, point2: pixelPoint }));
      }
    }, [calibrationMode, traceImages]);

    // Complete calibration
    const handleCalibrationComplete = useCallback((
      imageId: string,
      calibration: ImageShape['calibration'],
      scaledWidth: number,
      scaledHeight: number
    ) => {
      controller.updateTraceImage(imageId, {
        calibration,
        width: scaledWidth,
        height: scaledHeight,
        locked: true,
      });
      setCalibrationMode({ active: false, imageId: null, point1: null, point2: null });
    }, [controller]);

    // Cancel calibration
    const handleCancelCalibration = useCallback(() => {
      setCalibrationMode({ active: false, imageId: null, point1: null, point2: null });
    }, []);

    // Reset calibration points
    const handleResetCalibrationPoints = useCallback(() => {
      setCalibrationMode(prev => ({ ...prev, point1: null, point2: null }));
    }, []);

    // Get current canvas center for image placement
    const getCanvasCenter = useCallback(() => {
      return {
        x: viewBox.x + viewBox.width / 2,
        y: viewBox.y + viewBox.height / 2,
      };
    }, [viewBox]);

    // Panel toolbar drag handler
    useEffect(() => {
      if (!isPanelToolbarDragging) return;

      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        setPanelToolbarPos({
          x: e.clientX - panelToolbarDragOffset.x,
          y: e.clientY - panelToolbarDragOffset.y,
        });
      };

      const handleMouseUp = () => {
        setIsPanelToolbarDragging(false);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isPanelToolbarDragging, panelToolbarDragOffset]);

    // Calculate grid system based on current view
    const gridSystem = calculateGridSystem(viewBox.width);

    // Notify parent of container width changes
    useEffect(() => {
      if (onContainerWidthChange && containerRef.current) {
        const updateWidth = () => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            onContainerWidthChange(rect.width);
          }
        };
        updateWidth();
        const resizeObserver = new ResizeObserver(updateWidth);
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
      }
    }, [onContainerWidthChange, canvasOpen]);

    // Expose zoom controls and measurement controls through ref
    useImperativeHandle(ref, () => ({
      zoomIn: handleZoomIn,
      zoomOut: handleZoomOut,
      zoomReset: handleZoomReset,
      setShowMeasurements: controller.setShowMeasurements,
      setMeasurementSettings: controller.setMeasurementSettings,
      getShowMeasurements: () => controller.snapshot.showMeasurements,
      getMeasurementSettings: () => controller.snapshot.measurementSettings,
      getSnapshot: () => controller.snapshot,
      getCommandLog: () => controller.getCommandLog(),
      resetCommandLog: () => controller.resetCommandLog(),
      subscribeToCommandLog: (listener: (entry: CommandLogEntry) => void) =>
        controller.subscribeToCommandLog(listener),
      subscribe: controller.subscribe,
    }));

    // Register controller with Tinker bridge
    useEffect(() => {
      if (canvasOpen && controller) {
        // Dynamically import to avoid issues before bridge is loaded
        import('@maya/rl-core/tinker/controller').then(({ setWorkspaceController }) => {
          setWorkspaceController(controller);
        });
      }
      return () => {
        import('@maya/rl-core/tinker/controller').then(({ clearWorkspaceController }) => {
          clearWorkspaceController();
        });
      };
    }, [controller, canvasOpen]);

    // Connect WebSocket bridge for RL workspace integration
    useEffect(() => {
      if (!canvasOpen) {
        return undefined;
      }

      let cancelled = false;
      type BridgeInstance = { connect: () => Promise<void>; disconnect: () => void };
      let bridge: BridgeInstance | null = null;

      const startBridge = async () => {
        try {
          const { TinkerWebSocketBridge } = await import('@maya/rl-core/tinker/websocket-bridge');
          if (cancelled) {
            return;
          }
          const nextBridge: BridgeInstance = new TinkerWebSocketBridge();
          bridge = nextBridge;
          await nextBridge.connect();
        } catch {
          // WebSocket bridge is optional - silently fail
        }
      };

      void startBridge();

      return () => {
        cancelled = true;
        bridge?.disconnect();
      };
    }, [canvasOpen]);

    // Determine cursor based on state
    const getCursor = () => {
      if (isPanning) return 'grabbing';
      // Drawing tools - show crosshair immediately when tool is selected
      if (
        activeTool === 'line' ||
        activeTool === 'polyline' ||
        activeTool === 'curve' ||
        activeTool === 'arc' ||
        activeTool === 'circle' ||
        activeTool === 'rectangle' ||
        activeTool === 'guideline' ||
        activeTool === 'marker' ||
        activeTool === 'wall' ||
        activeTool === 'opening'
      ) {
        return 'crosshair';
      }
      // Use custom cursor (matches toolbar select icon, filled)
      return `url("${CUSTOM_CURSOR}") ${CURSOR_HOTSPOT}, auto`;
    };

    const {
      historyDepth,
      futureDepth,
      drawingHistoryDepth = 0,
      drawingFutureDepth = 0,
    } = controller.snapshot.metadata;
    const canUndo = historyDepth > 0 || drawingHistoryDepth > 0;
    const canRedo = futureDepth > 0 || drawingFutureDepth > 0;
    const {
      shapes,
      selectedShapeId,
      selectedShapeIds,
      isDrawing,
      currentShape,
    } = controller.snapshot;
    const selectedIds =
      selectedShapeIds && selectedShapeIds.length > 0
        ? selectedShapeIds
        : selectedShapeId
          ? [selectedShapeId]
          : [];
    const selectedIdSet = new Set(selectedIds);
    const hasWallInSelection =
      selectedIdSet.size > 0 &&
      shapes.some((shape) => selectedIdSet.has(shape.id) && shape.type === 'wall');
    const hasOpeningInSelection =
      selectedIdSet.size > 0 &&
      shapes.some((shape) => selectedIdSet.has(shape.id) && shape.type === 'opening');
    const hasRoomInSelection =
      selectedIdSet.size > 0 &&
      shapes.some((shape) => selectedIdSet.has(shape.id) && shape.type === 'room');
    const selectedMarkers = shapes.filter((shape) => selectedIdSet.has(shape.id) && shape.type === 'marker');
    const hasMarkerInSelection = selectedMarkers.length > 0;
    const selectedMarkerCount = selectedMarkers.length;
    const isDrawingWall = isDrawing && currentShape?.type === 'wall';
    const isDrawingOpening = isDrawing && currentShape?.type === 'opening';
    const wallPanelVisible = activeTool === 'wall' || isDrawingWall || hasWallInSelection;
    const openingPanelVisible = activeTool === 'opening' || isDrawingOpening || hasOpeningInSelection;
    const assetPanelVisible = activeTool === 'asset';
    const roomPanelVisible = hasRoomInSelection;
    const markerPanelVisible = activeTool === 'marker' || hasMarkerInSelection;

    // Compute marker panel position based on selected marker or last click
    const computedMarkerPanelPosition = (() => {
      if (hasMarkerInSelection) {
        // Find the selected marker and compute screen position
        const selectedMarker = shapes.find(s => selectedIdSet.has(s.id) && s.type === 'marker');
        if (selectedMarker && selectedMarker.type === 'marker' && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const scaleX = rect.width / viewBox.width;
          const scaleY = rect.height / viewBox.height;
          const screenX = rect.left + (selectedMarker.position.x - viewBox.x) * scaleX;
          const screenY = rect.top + (selectedMarker.position.y - viewBox.y) * scaleY;
          return { x: screenX, y: screenY };
        }
      }
      return markerPanelPosition;
    })();
    let primarySelectedWall: WallShape | null = null;
    let primarySelectedRoom: RoomShape | null = null;
    let primarySelectedOpening: OpeningShape | null = null;
    let primarySelectedMarker: MarkerShape | null = null;
    if (selectedIds.length > 0) {
      for (const id of selectedIds) {
        const shape = shapes.find((item) => item.id === id);
        if (!shape) continue;
        if (!primarySelectedWall && shape.type === 'wall') {
          primarySelectedWall = shape;
        }
        if (!primarySelectedOpening && shape.type === 'opening') {
          primarySelectedOpening = shape;
        }
        if (!primarySelectedRoom && shape.type === 'room') {
          primarySelectedRoom = shape;
        }
        if (!primarySelectedMarker && shape.type === 'marker') {
          primarySelectedMarker = shape as MarkerShape;
        }
        if (primarySelectedWall && primarySelectedRoom && primarySelectedOpening && primarySelectedMarker) {
          break;
        }
      }
    }
    const panelOpeningDimensions = (isDrawingOpening && currentShape?.type === 'opening'
      ? { width: currentShape.width, height: currentShape.height }
      : primarySelectedOpening
        ? { width: primarySelectedOpening.width, height: primarySelectedOpening.height }
        : { width: openingOptions.width, height: openingOptions.height });
    const openingMetadata =
      openingOptions.presetId !== null
        ? { presetId: openingOptions.presetId, ...(openingOptions.visualType ? { visualType: openingOptions.visualType } : {}) }
        : openingOptions.visualType
          ? { visualType: openingOptions.visualType }
          : undefined;
    const nextOpeningOptions = {
      width: openingOptions.width,
      height: openingOptions.height,
      category: openingOptions.category ?? undefined,
      ...(openingMetadata ? { metadata: openingMetadata } : {}),
    };

    const matchedPresetId = (() => {
      const tolerance = 1e-3;
      const selectedVisualType = primarySelectedOpening?.metadata?.visualType as WindowVisualType | undefined;
      const match = OPENING_PRESETS.find(
        (preset) =>
          Math.abs(preset.width - panelOpeningDimensions.width) < tolerance &&
          Math.abs(preset.height - panelOpeningDimensions.height) < tolerance &&
          (selectedVisualType ? preset.visualType === selectedVisualType : true)
      );
      return match ? match.id : null;
    })();

    const panelSelectedPresetId = hasOpeningInSelection ? matchedPresetId : openingOptions.presetId;

    const applyOpeningPreset = useCallback((preset: OpeningPreset | null) => {
      setOpeningOptions((prev) => {
        if (!preset) {
          return { ...prev, presetId: null, visualType: undefined };
        }
        return {
          width: preset.width,
          height: preset.height,
          presetId: preset.id,
          category: getOpeningCategoryFromPreset(preset, prev.category ?? undefined),
          visualType: preset.visualType,
        };
      });
    }, []);
    const panelWall = (isDrawingWall && currentShape?.type === 'wall' ? currentShape : primarySelectedWall) ?? null;
    // Get wall dimensions in meters
    const wallLengthMeters =
      panelWall && panelWall.centerline && panelWall.centerline.length >= 2 ? getWallLength(panelWall) : null;
    const wallThicknessMeters = panelWall?.thickness ?? wallOptions.thickness;
    const wallHeightMeters = panelWall?.height ?? wallOptions.height;
    const panelAlignment = panelWall?.alignment ?? (wallOptions.alignment as WallAlignment);

    // Convert to selected unit for display
    const panelLength = wallLengthMeters !== null ? metersToUnitValue(wallLengthMeters, lengthUnit) : null;
    const panelThickness = metersToUnitValue(wallThicknessMeters, lengthUnit);
    const panelHeight = metersToUnitValue(wallHeightMeters, lengthUnit);
    const panelOffsetDistance = metersToUnitValue(wallOptions.offsetDistance, lengthUnit);

    const handleRoomLabelEditRequest = useCallback((roomId: string) => {
      setRoomLabelFocus((prev) => ({
        roomId,
        token: prev.token + 1,
      }));
    }, []);

    const handleOpeningPlaced = useCallback(() => {
      if (drawingMode === 'one-time') {
        setOpeningOptions((prev) => ({ ...prev, category: null, presetId: null }));
      }
    }, [drawingMode]);

    const handleToolChange = useCallback((tool: ToolType) => {
      setActiveTool(tool);

      // Only auto-switch drawing mode for wall tool
      // Other tools respect the current drawing mode setting (user can toggle via footer)
      if (tool === 'wall') {
        // Default to chain mode for walls
        setWallOptions((prev) => ({ ...prev, mode: 'chain' }));
        onDrawingModeChange?.('chain');
      } else {
        // Reset wall options mode but DON'T change the global drawing mode
        // This lets users use chain mode with any tool
        setWallOptions((prev) => ({ ...prev, mode: 'single' }));
      }
    }, [setActiveTool, onDrawingModeChange]);

    // NOTE: Removed auto-switching of drawing mode based on tool
    // User should be able to toggle chain/one-time mode freely via footer toggle
    // The mode is now only set automatically when explicitly changing tools via handleToolChange

    // Keyboard shortcut to flip wall alignment while drawing
    // Press 'F' to cycle: inside → center → outside → inside
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Only handle 'F' key when wall tool is active
        if (activeTool !== 'wall') return;
        if (e.key !== 'f' && e.key !== 'F') return;

        // Don't trigger if typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

        e.preventDefault();

        // Cycle through alignments: outside → center → inside → outside
        const alignmentCycle: WallAlignment[] = ['outside', 'center', 'inside'];
        const currentIndex = alignmentCycle.indexOf(wallOptions.alignment);
        const nextIndex = (currentIndex + 1) % alignmentCycle.length;
        const nextAlignment = alignmentCycle[nextIndex];

        setWallOptions((prev) => ({ ...prev, alignment: nextAlignment }));

        // If currently drawing a wall, update the active wall's alignment too
        if (isDrawingWall && currentShape?.type === 'wall') {
          controller.wallSetAlignment(nextAlignment);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTool, wallOptions.alignment, isDrawingWall, currentShape, controller]);

    // Trace layer keyboard shortcuts
    // T - Toggle trace panel visibility
    // [ - Decrease opacity by 10%
    // ] - Increase opacity by 10%
    useEffect(() => {
      const handleTraceKeyDown = (e: KeyboardEvent) => {
        // Don't trigger if typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

        if (e.key === 't' || e.key === 'T') {
          // Shift+T toggles all trace images visibility
          if (e.shiftKey && traceImages.length > 0) {
            e.preventDefault();
            const anyVisible = traceImages.some(img => img.visible);
            traceImages.forEach(img => {
              controller.updateTraceImage(img.id, { visible: !anyVisible });
            });
          } else {
            // T toggles trace panel
            e.preventDefault();
            setTracePanelVisible(prev => !prev);
          }
        } else if (e.key === '[' && traceImages.length > 0) {
          // Decrease opacity of all visible trace images
          e.preventDefault();
          traceImages.forEach(img => {
            if (img.visible) {
              controller.updateTraceImage(img.id, { opacity: Math.max(0.1, img.opacity - 0.1) });
            }
          });
        } else if (e.key === ']' && traceImages.length > 0) {
          // Increase opacity of all visible trace images
          e.preventDefault();
          traceImages.forEach(img => {
            if (img.visible) {
              controller.updateTraceImage(img.id, { opacity: Math.min(1, img.opacity + 0.1) });
            }
          });
        }
      };

      window.addEventListener('keydown', handleTraceKeyDown);
      return () => window.removeEventListener('keydown', handleTraceKeyDown);
    }, [traceImages, controller]);

    // Editing tools panel keyboard shortcut
    // E - Toggle editing tools panel
    useEffect(() => {
      const handleEditingPanelKeyDown = (e: KeyboardEvent) => {
        // Don't trigger if typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        
        // Don't trigger if it conflicts with other tools (only activate with plain 'e' without modifiers)
        if (e.metaKey || e.ctrlKey || e.altKey) return;

        if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          setEditingPanelVisible(prev => !prev);
        }
      };

      window.addEventListener('keydown', handleEditingPanelKeyDown);
      return () => window.removeEventListener('keydown', handleEditingPanelKeyDown);
    }, []);

    // Simulation mode keyboard shortcuts
    useEffect(() => {
      if (!simulationModeActive) return;

      const handleSimulationKeyDown = (e: KeyboardEvent) => {
        // Don't trigger if typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

        switch (e.code) {
          case 'Space':
            e.preventDefault();
            simulation.toggleRunning();
            break;
          case 'KeyR':
            e.preventDefault();
            simulation.resetAgent();
            break;
          case 'KeyG':
            e.preventDefault();
            simulation.setNewGoal();
            break;
          case 'ArrowUp':
            e.preventDefault();
            simulation.manualMove('up');
            break;
          case 'ArrowDown':
            e.preventDefault();
            simulation.manualMove('down');
            break;
          case 'ArrowLeft':
            e.preventDefault();
            simulation.manualMove('left');
            break;
          case 'ArrowRight':
            e.preventDefault();
            simulation.manualMove('right');
            break;
          case 'Escape':
            setSimulationModeActive(false);
            break;
        }
      };

      window.addEventListener('keydown', handleSimulationKeyDown);
      return () => window.removeEventListener('keydown', handleSimulationKeyDown);
    }, [simulationModeActive, simulation]);

    return (
      <WorkspaceControllerProvider value={controller}>
        <main className="editor-area" style={canvasOpen ? { padding: 0 } : undefined}>
          {canvasOpen ? (
            <div
              ref={containerRef}
              style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                position: 'relative',
                cursor: getCursor(),
              }}
              onClick={handleCanvasClick}
            >
              <Canvas
                svgRef={svgRef}
                viewBox={viewBox}
                showGrid={showGrid}
                gridSystem={gridSystem}
                lengthUnit={lengthUnit}
                snapSettings={snapSettings}
                showMeasurements={showMeasurements}
                measurementSettings={measurementSettings}
                wallOptions={wallOptions}
                wallMode={wallOptions.mode}
                openingOptions={nextOpeningOptions}
                assetOptions={{ assetId: selectedAssetId, category: 'furniture' }}
                showWallCenterline={showWallCenterline}
                zoneHoverEnabled={zoneHoverEnabled}
                showMarkers={showMarkers}
                alignmentGuidesEnabled={alignmentGuidesEnabled}
                onRoomLabelEditRequest={handleRoomLabelEditRequest}
                onOpeningPlaced={handleOpeningPlaced}
                onZoneInteract={() => setStylePanelOpenTrigger(prev => prev + 1)}
                toolbarStyle={toolbarStyle}
                calibrationMode={calibrationMode}
                onCalibrationClick={handleCalibrationClick}
                onInteractionStateChange={setInteractionState}
                simulationOverlay={
                  simulationModeActive ? (
                    <SimulationOverlay
                      state={simulation.state}
                      config={simulation.config}
                      viewBox={viewBox}
                      toolbarStyle={toolbarStyle}
                    />
                  ) : sunlightModeActive ? (
                    <SunlightOverlay
                      state={sunlight.state}
                      config={sunlight.config}
                      viewBox={viewBox}
                      toolbarStyle={toolbarStyle}
                    />
                  ) : undefined
                }
              />
              
              {/* Precision Input Overlay - AutoCAD-style dynamic input */}
              {(() => {
                const precisionActive =
                  precisionInputEnabled &&
                  (controller.snapshot.isDrawing || interactionState.isResizingAny);

                if (!precisionActive) return null;

                const selectedIds =
                  controller.snapshot.selectedShapeIds?.length
                    ? controller.snapshot.selectedShapeIds
                    : controller.snapshot.selectedShapeId
                    ? [controller.snapshot.selectedShapeId]
                    : [];

                const selectedShape =
                  controller.snapshot.currentShape ??
                  shapes.find((s) => selectedIds.includes(s.id)) ??
                  null;

                if (!selectedShape) return null;

                const shapeType = selectedShape.type ?? null;

                const deriveLastPoint = (shape: Shape): Point => {
                  switch (shape.type) {
                    case 'line':
                      return shape.start;
                    case 'wall':
                      return shape.centerline[0] ?? { x: 0, y: 0 };
                    case 'polyline':
                      return shape.points.length > 1
                        ? shape.points[shape.points.length - 2]
                        : shape.points[0] ?? { x: 0, y: 0 };
                    case 'arc':
                      return shape.start;
                    case 'rectangle':
                      return shape.start;
                    case 'circle':
                      return shape.center;
                    default:
                      return { x: 0, y: 0 };
                  }
                };

                const lastPoint = deriveLastPoint(selectedShape);
                const cursorPoint =
                  controller.snapshot.lastCursorPoint ??
                  (selectedShape.type === 'line'
                    ? selectedShape.end
                    : selectedShape.type === 'rectangle'
                    ? selectedShape.end
                    : selectedShape.type === 'circle'
                    ? selectedShape.center
                    : lastPoint);

                const prevPoint =
                  selectedShape.type === 'polyline' && selectedShape.points.length > 2
                    ? selectedShape.points[selectedShape.points.length - 3]
                    : null;

                const allowAngle =
                  shapeType !== 'circle' && shapeType !== 'rectangle';

                return (
                <DynamicInput
                  cursorPosition={cursorPoint ?? { x: 0, y: 0 }}
                  lastPoint={lastPoint}
                  lengthUnit={lengthUnit}
                  enabled={true}
                  isDrawing={controller.snapshot.isDrawing || interactionState.isResizingAny}
                  onConfirm={(point) => {
                    controller.click(point);
                  }}
                  prevPoint={prevPoint}
                  allowAngle={allowAngle}
                  shapeType={shapeType}
                  toolbarStyle={toolbarStyle}
                />
                );
              })()}
              
              <Toolbar
                visible={showToolbar}
                toolbarStyle={toolbarStyle}
                activeTool={activeTool}
                onToolChange={handleToolChange}
                onUndo={controller.undo}
                onRedo={controller.redo}
                canUndo={canUndo}
                canRedo={canRedo}
              />
              <WallBottomPanel
                visible={wallPanelVisible}
                length={panelLength ?? undefined}
                thickness={panelThickness}
                height={panelHeight}
                alignment={panelAlignment}
                lengthUnit={lengthUnit}
                mode={wallOptions.mode}
                offsetDistance={panelOffsetDistance}
                onThicknessChange={(value) => {
                  // Convert from selected unit to meters
                  const thicknessMeters = unitValueToMeters(value, lengthUnit);
                  setWallOptions((prev) => ({ ...prev, thickness: thicknessMeters }));
                  if (isDrawingWall && currentShape?.type === 'wall') {
                    controller.wallSetThickness(thicknessMeters);
                  }
                  if (primarySelectedWall) {
                    controller.selectedWallSetThickness(thicknessMeters);
                  }
                }}
                onHeightChange={(value) => {
                  // Convert from selected unit to meters
                  const heightMeters = unitValueToMeters(value, lengthUnit);
                  setWallOptions((prev) => ({ ...prev, height: heightMeters }));
                  if (primarySelectedWall) {
                    controller.selectedWallSetHeight(heightMeters);
                  }
                }}
                onAlignmentChange={(value) => {
                  setWallOptions((prev) => ({ ...prev, alignment: value }));
                  if (isDrawingWall && currentShape?.type === 'wall') {
                    controller.wallSetAlignment(value);
                  }
                  if (primarySelectedWall) {
                    controller.selectedWallSetAlignment(value);
                  }
                }}
                onModeChange={(value) => {
                  setWallOptions((prev) => ({ ...prev, mode: value }));
                  // Sync global drawing mode with wall mode
                  // Chain mode should enable chain drawing, all other modes should use one-time
                  if (value === 'chain') {
                    onDrawingModeChange?.('chain');
                  } else {
                    onDrawingModeChange?.('one-time');
                  }
                }}
                onOffsetDistanceChange={(value) => {
                  // Convert from selected unit to meters
                  const offsetMeters = unitValueToMeters(value, lengthUnit);
                  setWallOptions((prev) => ({ ...prev, offsetDistance: offsetMeters }));
                }}
                onLengthChange={primarySelectedWall ? (value) => {
                  // Convert from selected unit to meters
                  const lengthMeters = unitValueToMeters(value, lengthUnit);
                  controller.selectedWallSetLength(lengthMeters);
                } : undefined}
                showCenterline={showWallCenterline}
                onCenterlineToggle={(value) => setShowWallCenterline(value)}
                wallsLocked={controller.snapshot.wallsLocked}
                onWallsLockedChange={controller.setWallsLocked}
                canSnapWallsOrthogonal={hasWallInSelection}
                onSnapWallsOrthogonal={controller.snapSelectedWallsOrthogonal}
                onClose={() => {
                  setActiveTool('select');
                }}
              />
              <OpeningBottomPanel
                visible={openingPanelVisible}
                width={panelOpeningDimensions.width}
                height={panelOpeningDimensions.height}
                lengthUnit={lengthUnit}
                selectedPresetId={openingPanelVisible ? panelSelectedPresetId : null}
                selectedCategory={openingOptions.category ?? undefined}
                onCategoryChange={(category) => {
                  // Find first preset for this category
                  const defaultPresetForCategory = OPENING_PRESETS.find(p => p.category === category) ?? OPENING_PRESETS[0];

                  if (hasOpeningInSelection) {
                    controller.selectedOpeningSetCategory(category);
                    // Optionally reset size to default for category if switching categories?
                    // For now, let's just switch category.
                  } else {
                    setOpeningOptions((prev) => ({
                      ...prev,
                      category,
                      width: defaultPresetForCategory.width,
                      height: defaultPresetForCategory.height,
                      presetId: defaultPresetForCategory.id,
                      visualType: defaultPresetForCategory.visualType,
                    }));
                  }
                }}
                onPresetSelect={(preset) => {
                  if (hasOpeningInSelection) {
                    if (preset) {
                      controller.selectedOpeningSetSize({ width: preset.width, height: preset.height });
                      controller.selectedOpeningSetCategory(getOpeningCategoryFromPreset(preset));
                      if (preset.visualType) {
                        controller.selectedOpeningSetMetadata({ visualType: preset.visualType });
                      }
                    }
                    return;
                  }
                  applyOpeningPreset(preset);
                }}
                onWidthChange={(value) => {
                  if (hasOpeningInSelection) {
                    controller.selectedOpeningSetSize({ width: value });
                  } else {
                    setOpeningOptions((prev) => ({
                      ...prev,
                      width: value,
                      presetId: null,
                    }));
                  }
                }}
                onHeightChange={(value) => {
                  if (hasOpeningInSelection) {
                    controller.selectedOpeningSetSize({ height: value });
                  } else {
                    setOpeningOptions((prev) => ({
                      ...prev,
                      height: value,
                      presetId: null,
                    }));
                  }
                }}
                onClose={() => {
                  setActiveTool('select');
                }}
              />
              <RoomToolPanel
                visible={roomPanelVisible && Boolean(primarySelectedRoom)}
                roomId={primarySelectedRoom?.id}
                label={primarySelectedRoom?.label}
                area={primarySelectedRoom?.area ?? 0}
                perimeter={primarySelectedRoom?.perimeter ?? 0}
                lengthUnit={lengthUnit}
                focusToken={
                  primarySelectedRoom && roomLabelFocus.roomId === primarySelectedRoom.id
                    ? roomLabelFocus.token
                    : undefined
                }
                onLabelChange={(value) => controller.selectedRoomSetLabel(value)}
              />
              <MarkerToolPanel
                visible={markerPanelVisible}
                markerLabel={markerOptions.label}
                markerColor={markerOptions.color}
                onLabelChange={handleMarkerLabelChange}
                onColorChange={handleMarkerColorChange}
                editingMarker={selectedMarkerCount === 1 ? primarySelectedMarker : null}
                onMarkerUpdate={handleMarkerUpdate}
                onDelete={hasMarkerInSelection ? controller.deleteSelection : undefined}
                initialPosition={computedMarkerPanelPosition}
                drawingMode={drawingMode}
                onToggleDrawingMode={() => onDrawingModeChange?.(drawingMode === 'one-time' ? 'chain' : 'one-time')}
                selectedMarkerCount={selectedMarkerCount}
              />
              <AssetPanel
                visible={assetPanelVisible}
                selectedAssetId={selectedAssetId}
                onAssetSelect={setSelectedAssetId}
              />
              <GuidelineOrientationSelector
                visible={activeTool === 'guideline'}
                orientation={guidelineOrientation}
                onChange={setGuidelineOrientation}
              />
              <StylePanelWrapper
                selectedShapes={selectedShapeIds.map(id => shapes.find(s => s.id === id)).filter((s): s is typeof shapes[number] => s !== undefined)}
                openTrigger={stylePanelOpenTrigger}
              />
              {/* Text Editor Panel - show during creation OR when editing existing text */}
              {(() => {
                // Show editor if creating new text (isDrawing + currentShape)
                if (isDrawing && currentShape?.type === 'text') {
                  // Calculate screen position
                  const rect = containerRef.current?.getBoundingClientRect();
                  let position = { x: 100, y: 100 };

                  if (rect) {
                    const scaleX = rect.width / viewBox.width;
                    const scaleY = rect.height / viewBox.height;

                    // Calculate visual center of text box to keep panel stable
                    const width = currentShape.content.length * currentShape.fontSize * 0.6;
                    let visualCenterX = currentShape.position.x;

                    if (currentShape.textAlign === 'left') visualCenterX += width / 2;
                    else if (currentShape.textAlign === 'right') visualCenterX -= width / 2;
                    // if center, position.x is already visual center

                    const x = (visualCenterX - viewBox.x) * scaleX;
                    const y = (currentShape.position.y - viewBox.y) * scaleY;

                    position = {
                      x: rect.left + x - 160, // Center the 320px panel
                      y: rect.top + y + 40
                    };
                  }

                  return (
                    <TextEditorPanel
                      key={currentShape.id}
                      textShape={currentShape}
                      onUpdate={(updates) => {
                        if (currentShape.type === 'text') {
                          controller.updateTextContent(currentShape.id, updates);
                        }
                      }}
                      onConfirm={() => {
                        controller.confirmCurrentShape();
                      }}
                      position={position}
                    />
                  );
                }

                // Show editor if editing existing selected text (double-click or click when selected)
                // We detect this by checking if there's a single selected text shape
                if (!isDrawing && selectedShapeIds.length === 1 && activeTool === 'select') {
                  const selectedShape = shapes.find(s => s.id === selectedShapeIds[0]);
                  if (selectedShape?.type === 'text') {
                    // Calculate screen position
                    const rect = containerRef.current?.getBoundingClientRect();
                    let position = { x: 100, y: 100 };

                    if (rect) {
                      const scaleX = rect.width / viewBox.width;
                      const scaleY = rect.height / viewBox.height;

                      // Calculate visual center of text box to keep panel stable
                      const width = selectedShape.content.length * selectedShape.fontSize * 0.6;
                      let visualCenterX = selectedShape.position.x;

                      if (selectedShape.textAlign === 'left') visualCenterX += width / 2;
                      else if (selectedShape.textAlign === 'right') visualCenterX -= width / 2;
                      // if center, position.x is already visual center

                      const x = (visualCenterX - viewBox.x) * scaleX;
                      const y = (selectedShape.position.y - viewBox.y) * scaleY;

                      // Position centered below the text
                      position = {
                        x: rect.left + x - 160, // Center the 320px panel
                        y: rect.top + y + 40
                      };
                    }

                    return (
                      <TextEditorPanel
                        key={selectedShape.id}
                        textShape={selectedShape}
                        onUpdate={(updates) => {
                          controller.updateTextContent(selectedShape.id, updates);
                        }}
                        onConfirm={() => {
                          // Just deselect when confirming edits to existing text
                          controller.setPrimarySelection(null);
                        }}
                        position={position}
                      />
                    );
                  }
                }

                return null;
              })()}

              {/* Compact Panel Toggle Toolbar - Draggable */}
              {(() => {
                const isWindows95 = toolbarStyle === 'windows95';
                const isFunk = toolbarStyle === 'funk';
                const isCyber = toolbarStyle === 'cyber';
                const isClean = toolbarStyle === 'clean';

                // SVG Icons
                const SunlightIcon = ({ color = 'currentColor' }: { color?: string }) => (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                );

                // Trace Image / Reference Layer Icon
                const TraceImageIcon = ({ color = 'currentColor' }: { color?: string }) => (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                );

                // Editing Tools Icon
                const EditToolsIcon = ({ color = 'currentColor' }: { color?: string }) => (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0-4-4L4 16v4" />
                    <path d="M13.5 6.5l4 4" />
                    <path d="M20 7h-4M22 12h-4M20 17h-4" />
                  </svg>
                );

                const handlePanelToolbarDragStart = (e: React.MouseEvent) => {
                  if (!panelToolbarRef.current) return;
                  setIsPanelToolbarDragging(true);
                  setPanelToolbarDragOffset({
                    x: e.clientX - panelToolbarRef.current.offsetLeft,
                    y: e.clientY - panelToolbarRef.current.offsetTop,
                  });
                };

                // Container styles for the compact toolbar
                const containerStyle: React.CSSProperties = isWindows95 ? {
                  position: 'absolute',
                  top: `${panelToolbarPos.y}px`,
                  left: `${panelToolbarPos.x}px`,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 2,
                  padding: '2px',
                  background: '#c0c0c0',
                  border: '2px solid',
                  borderColor: '#ffffff #808080 #808080 #ffffff',
                  zIndex: 999,
                  userSelect: 'none',
                } : isFunk ? {
                  position: 'absolute',
                  top: `${panelToolbarPos.y}px`,
                  left: `${panelToolbarPos.x}px`,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px',
                  background: '#ffffff',
                  border: '2px solid #1e1e1e',
                  borderRadius: 6,
                  boxShadow: '3px 3px 0 #1e1e1e',
                  zIndex: 999,
                  userSelect: 'none',
                } : isCyber ? {
                  position: 'absolute',
                  top: `${panelToolbarPos.y}px`,
                  left: `${panelToolbarPos.x}px`,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px',
                  background: '#0d2f4d',
                  border: '1px solid #4da6ff',
                  borderRadius: 4,
                  boxShadow: '0 0 12px rgba(77, 166, 255, 0.3)',
                  zIndex: 999,
                  userSelect: 'none',
                } : isClean ? {
                  position: 'absolute',
                  top: `${panelToolbarPos.y}px`,
                  left: `${panelToolbarPos.x}px`,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 2,
                  padding: '3px',
                  background: '#ffffff',
                  border: '1px solid #000000',
                  borderRadius: 4,
                  zIndex: 999,
                  userSelect: 'none',
                } : {
                  position: 'absolute',
                  top: `${panelToolbarPos.y}px`,
                  left: `${panelToolbarPos.x}px`,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(111, 98, 164, 0.2)',
                  borderRadius: 8,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  zIndex: 999,
                  userSelect: 'none',
                };

                // Drag handle styles
                const dragHandleStyle: React.CSSProperties = isWindows95 ? {
                  width: 8,
                  height: 24,
                  cursor: isPanelToolbarDragging ? 'grabbing' : 'grab',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 2,
                } : isFunk ? {
                  width: 10,
                  height: 26,
                  cursor: isPanelToolbarDragging ? 'grabbing' : 'grab',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 4,
                } : isCyber ? {
                  width: 10,
                  height: 26,
                  cursor: isPanelToolbarDragging ? 'grabbing' : 'grab',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 4,
                } : isClean ? {
                  width: 8,
                  height: 24,
                  cursor: isPanelToolbarDragging ? 'grabbing' : 'grab',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 2,
                } : {
                  width: 10,
                  height: 28,
                  cursor: isPanelToolbarDragging ? 'grabbing' : 'grab',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 4,
                };

                // Compact icon button styles
                const getIconBtnStyle = (isActive: boolean, activeColor: string): React.CSSProperties => {
                  if (isWindows95) {
                    return {
                      width: 28,
                      height: 28,
                      padding: 0,
                      background: '#c0c0c0',
                      border: '2px solid',
                      borderColor: isActive
                        ? '#808080 #ffffff #ffffff #808080'
                        : '#ffffff #808080 #808080 #ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000000',
                    };
                  }
                  if (isFunk) {
                    return {
                      width: 30,
                      height: 30,
                      padding: 0,
                      background: isActive ? activeColor : '#ffffff',
                      border: '2px solid #1e1e1e',
                      borderRadius: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? '#ffffff' : '#1e1e1e',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    };
                  }
                  if (isCyber) {
                    return {
                      width: 30,
                      height: 30,
                      padding: 0,
                      background: isActive ? '#4da6ff' : 'transparent',
                      border: '1px solid #4da6ff',
                      borderRadius: 2,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? '#0a2540' : '#4da6ff',
                      boxShadow: isActive ? '0 0 8px rgba(77, 166, 255, 0.5)' : 'none',
                    };
                  }
                  if (isClean) {
                    return {
                      width: 28,
                      height: 28,
                      padding: 0,
                      background: isActive ? '#1565C0' : 'transparent',
                      border: 'none',
                      borderRadius: 3,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? '#ffffff' : '#1A1A1A',
                    };
                  }
                  return {
                    width: 32,
                    height: 32,
                    padding: 0,
                    background: isActive ? activeColor : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive ? '#ffffff' : '#605E61',
                    transition: 'background 0.15s',
                  };
                };

                const getDragHandleColor = () => {
                  if (isWindows95) return '#808080';
                  if (isFunk) return '#1e1e1e';
                  if (isCyber) return '#4da6ff';
                  if (isClean) return '#000000';
                  return '#b0b0b0';
                };

                return (
                  <div ref={panelToolbarRef} style={containerStyle}>
                    {/* Drag Handle */}
                    <div
                      onMouseDown={handlePanelToolbarDragStart}
                      style={dragHandleStyle}
                    >
                      <svg width="6" height="16" viewBox="0 0 6 16" fill={getDragHandleColor()}>
                        <circle cx="1.5" cy="2" r="1.2" />
                        <circle cx="4.5" cy="2" r="1.2" />
                        <circle cx="1.5" cy="6" r="1.2" />
                        <circle cx="4.5" cy="6" r="1.2" />
                        <circle cx="1.5" cy="10" r="1.2" />
                        <circle cx="4.5" cy="10" r="1.2" />
                        <circle cx="1.5" cy="14" r="1.2" />
                        <circle cx="4.5" cy="14" r="1.2" />
                      </svg>
                    </div>

                    {/* PRODUCTION: Simulate button hidden - feature not production-ready
                    <button
                      onClick={() => {
                        setSimulationModeActive(!simulationModeActive);
                        if (!simulationModeActive) setSunlightModeActive(false);
                      }}
                      style={getIconBtnStyle(simulationModeActive, '#6F62A4')}
                      title={simulationModeActive ? 'Exit Simulation Mode' : 'Simulate'}
                    >
                      <SimulateIcon color={simulationModeActive ? (isCyber ? '#0a2540' : isClean ? '#ffffff' : '#ffffff') : (isCyber ? '#4da6ff' : isClean ? '#000000' : '#605E61')} />
                    </button>
                    */}

                    {/* Sunlight */}
                    <button
                      onClick={() => {
                        setSunlightModeActive(!sunlightModeActive);
                        if (!sunlightModeActive) setSimulationModeActive(false);
                      }}
                      style={getIconBtnStyle(sunlightModeActive, '#ff9500')}
                      title={sunlightModeActive ? 'Exit Sunlight Mode' : 'Sunlight'}
                    >
                      <SunlightIcon color={sunlightModeActive ? (isCyber ? '#0a2540' : isClean ? '#ffffff' : '#ffffff') : (isCyber ? '#4da6ff' : isClean ? '#000000' : '#605E61')} />
                    </button>

                    {/* PRODUCTION: Layers button hidden - BIM layers not production-ready
                    <button
                      onClick={() => setLayerPanelVisible(!layerPanelVisible)}
                      style={getIconBtnStyle(layerPanelVisible, '#4A90D9')}
                      title={layerPanelVisible ? 'Hide Layers' : 'Layers'}
                    >
                      <LayersIcon color={layerPanelVisible ? (isCyber ? '#0a2540' : isClean ? '#ffffff' : '#ffffff') : (isCyber ? '#4da6ff' : isClean ? '#000000' : '#605E61')} />
                    </button>
                    */}

                    {/* PRODUCTION: Properties button hidden - BIM properties not production-ready
                    <button
                      onClick={() => setPropertyPanelVisible(!propertyPanelVisible)}
                      style={getIconBtnStyle(propertyPanelVisible, '#2ECC71')}
                      title={propertyPanelVisible ? 'Hide Properties' : 'Properties'}
                    >
                      <PropertiesIcon color={propertyPanelVisible ? (isCyber ? '#0a2540' : isClean ? '#ffffff' : '#ffffff') : (isCyber ? '#4da6ff' : isClean ? '#000000' : '#605E61')} />
                    </button>
                    */}

                    {/* Editing Tools */}
                    <button
                      onClick={() => setEditingPanelVisible(!editingPanelVisible)}
                      style={getIconBtnStyle(editingPanelVisible, '#10B981')}
                      title={editingPanelVisible ? 'Hide Editing Tools' : 'Editing Tools (E)'}
                    >
                      <EditToolsIcon color={editingPanelVisible ? (isCyber ? '#0a2540' : isClean ? '#ffffff' : '#ffffff') : (isCyber ? '#4da6ff' : isClean ? '#000000' : '#605E61')} />
                    </button>

                    {/* Trace Layer */}
                    <button
                      onClick={() => setTracePanelVisible(!tracePanelVisible)}
                      style={getIconBtnStyle(tracePanelVisible, '#8B5CF6')}
                      title={tracePanelVisible ? 'Hide Trace Layers' : 'Trace Layers (T)'}
                    >
                      <TraceImageIcon color={tracePanelVisible ? (isCyber ? '#0a2540' : isClean ? '#ffffff' : '#ffffff') : (isCyber ? '#4da6ff' : isClean ? '#000000' : '#605E61')} />
                    </button>
                  </div>
                );
              })()}

              {/* PRODUCTION: Simulation Panel hidden - not production-ready
              {simulationModeActive && (
                <SimulationPanel
                  state={simulation.state}
                  config={simulation.config}
                  onStart={simulation.start}
                  onPause={simulation.pause}
                  onResume={simulation.resume}
                  onStop={simulation.stop}
                  onToggle={simulation.toggleRunning}
                  onReset={simulation.resetAgent}
                  onNewGoal={simulation.setNewGoal}
                  onClearPath={simulation.clearPath}
                  onConfigChange={simulation.updateConfig}
                  onClose={() => setSimulationModeActive(false)}
                  toolbarStyle={toolbarStyle}
                />
              )}
              */}

              {/* Sunlight Panel */}
              {sunlightModeActive && (
                <SunlightPanel
                  state={sunlight.state}
                  config={sunlight.config}
                  onConfigChange={sunlight.updateConfig}
                  onLocationChange={sunlight.setLocation}
                  onTimeChange={sunlight.setTimeOfDay}
                  getTimeOfDay={sunlight.getTimeOfDay}
                  onSetNow={sunlight.setToNow}
                  onSetSunrise={sunlight.setToSunrise}
                  onSetNoon={sunlight.setToNoon}
                  onSetSunset={sunlight.setToSunset}
                  onToggleAnimation={sunlight.toggleAnimation}
                  onClose={() => setSunlightModeActive(false)}
                  toolbarStyle={toolbarStyle}
                />
              )}

              {/* BIM Layer Panel */}
              <LayerPanel
                visible={layerPanelVisible}
                layers={layerPanel.layers}
                activeLayerId={layerPanel.activeLayerId}
                onLayerVisibilityChange={layerPanel.setLayerVisibility}
                onLayerLockChange={layerPanel.setLayerLocked}
                onActiveLayerChange={layerPanel.setActiveLayer}
                onLayerCreate={(name: string, discipline: Discipline) => {
                  layerPanel.addLayer(name, discipline);
                }}
                onClose={() => setLayerPanelVisible(false)}
              />

              {/* BIM Property Panel */}
              <PropertyPanel
                visible={propertyPanelVisible}
                selectedShape={controller.snapshot.selectedShapeId
                  ? controller.snapshot.shapes.find(s => s.id === controller.snapshot.selectedShapeId) ?? null
                  : null}
                onPropertyChange={(_shapeId: string, _psetName: string, _propertyName: string, _value: PropertyValue) => {
                  // Property set changes not yet implemented in controller
                }}
                onNameChange={(shapeId: string, name: string) => {
                  controller.execute({
                    type: 'workspace/shape_set_bim_name',
                    shapeId,
                    name: name || undefined
                  });
                }}
                onTagChange={(shapeId: string, tag: string) => {
                  controller.execute({
                    type: 'workspace/shape_set_bim_tag',
                    shapeId,
                    tag: tag || undefined
                  });
                }}
                onDescriptionChange={(shapeId: string, description: string) => {
                  controller.execute({
                    type: 'workspace/shape_set_bim_description',
                    shapeId,
                    description: description || undefined
                  });
                }}
                onClassificationChange={(shapeId: string, classification) => {
                  controller.execute({
                    type: 'workspace/shape_set_classification',
                    shapeId,
                    classification
                  });
                }}
                onClose={() => setPropertyPanelVisible(false)}
              />

              {/* Editing Tools Panel */}
              <EditingToolsPanel
                visible={editingPanelVisible}
                toolbarStyle={toolbarStyle}
                hasSelection={selectedIds.length > 0}
                selectionCount={selectedIds.length}
                selectedShapeTypes={selectedIds.map(id => {
                  const shape = shapes.find(s => s.id === id);
                  return shape?.type ?? '';
                }).filter(Boolean)}
                onClose={() => setEditingPanelVisible(false)}
                onCopy={controller.copySelection}
                onMove={() => setActiveTool('select')}
                onOffset={() => setActiveTool('wall')}
                onGroup={controller.groupSelection}
                onUngroup={controller.ungroupSelection}
                onMirror={(axis) => controller.mirrorSelection(axis, true)}
                onExplode={controller.explodeSelection}
                onRotate={(angle) => controller.rotateSelection(angle)}
                onTrim={() => setActiveTool('trim')}
                onFillet={(radius) => {
                  // Fillet requires two selected lines
                  const [shapeId1, shapeId2] = selectedIds;
                  if (shapeId1 && shapeId2) {
                    controller.createFillet(shapeId1, shapeId2, radius);
                  }
                }}
              />

              {/* Trace Layer Panel */}
              <TraceLayerPanel
                visible={tracePanelVisible}
                images={traceImages}
                onClose={() => setTracePanelVisible(false)}
                onUploadClick={() => setUploadModalOpen(true)}
                onImageUpdate={handleTraceImageUpdate}
                onImageRemove={handleTraceImageRemove}
                onRecalibrate={handleStartCalibration}
              />

              {/* Image Upload Modal (simple upload, no calibration) */}
              <ImageUploadModal
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                onComplete={handleTraceImageAdd}
                canvasCenter={getCanvasCenter()}
              />

              {/* On-Canvas Calibration Overlay */}
              <CalibrationOverlay
                isActive={calibrationMode.active}
                image={calibrationMode.imageId ? traceImages.find(img => img.id === calibrationMode.imageId) || null : null}
                point1={calibrationMode.point1}
                point2={calibrationMode.point2}
                defaultUnit={lengthUnit}
                onCancel={handleCancelCalibration}
                onComplete={handleCalibrationComplete}
                onResetPoints={handleResetCalibrationPoints}
              />

              {/* Compass Indicator - HTML overlay */}
              {showCompass && (
                <CompassOverlay
                  toolbarStyle={toolbarStyle}
                  hasPanelOpen={simulationModeActive || sunlightModeActive}
                  buildingOrientation={sunlight.config.buildingOrientation}
                />
              )}

            </div>
          ) : (
            <EmptyState />
          )}
        </main>
      </WorkspaceControllerProvider>
    );
  }
);

Workspace.displayName = 'Workspace';

export default Workspace;
