import type {
  DrawingMode,
  GuidelineOrientation,
  MeasurementSettings,
  OpeningCategory,

  OpeningShape,
  OpeningSwingState,
  Point,
  Shape,
  TextShape,
  RoomShape,
  ToolType,
  WallShape,
  WallAlignment,
  WallOffsetDirection,
  ZoneShape,
  ViewBox,
} from '../../../components/Workspace/types';
import type {
  WorkspaceStateOptions,
  WorkspaceSnapshot,
  MutableSnapshot,
  WallCreationOptions,
  RoomCreationOptions,
  OpeningPlacementOptions,
  AssetPlacementOptions,
} from './types';
import {
  DEFAULT_SNAPSHOT,
  DEFAULT_TRIM_STATE,
  MIN_OPENING_WIDTH,
} from './constants';
import {
  getPolygonCentroid,
  deepClone,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  generateShapeId,
} from './utils';
import { SelectionManager } from './managers/SelectionManager';
import { HistoryManager } from './managers/HistoryManager';
import { GeometryManager } from './managers/GeometryManager';
import { ToolManager } from './managers/ToolManager';
import { canHaveFill, canHaveStroke, getPresetById } from './appearanceUtils';

export class WorkspaceState {
  private snapshot: WorkspaceSnapshot;
  private cachedSnapshot: WorkspaceSnapshot;
  private snapshotDirty = false;
  private listeners = new Set<() => void>();



  // Managers
  public readonly selectionManager: SelectionManager;
  public readonly historyManager: HistoryManager;
  public readonly geometryManager: GeometryManager;
  public readonly toolManager: ToolManager;

  constructor(initial?: Partial<WorkspaceSnapshot>, options: WorkspaceStateOptions = {}) {
    const initialShapes = initial && initial.shapes ? deepClone(initial.shapes) : [];
    const initialMetadata = initial && initial.metadata ? initial.metadata : {};
    this.snapshot = {
      ...deepClone(DEFAULT_SNAPSHOT),
      ...initial,
      shapes: initialShapes,
      metadata: {
        ...DEFAULT_SNAPSHOT.metadata,
        ...initialMetadata,
      },
    };
    this.cachedSnapshot = deepClone(this.snapshot);
    this.snapshotDirty = false;

    this.selectionManager = new SelectionManager();
    this.historyManager = new HistoryManager(options.telemetry);
    this.geometryManager = new GeometryManager();
    this.toolManager = new ToolManager(this.selectionManager, this.geometryManager);
  }

  public setHistoryLimit(limit: number) {
    this.historyManager.setHistoryLimit(limit);
  }

  public getSnapshot(): WorkspaceSnapshot {
    if (this.snapshotDirty) {
      this.cachedSnapshot = deepClone(this.snapshot);
      this.snapshotDirty = false;
    }
    // Ensure trimState is always present (for backwards compatibility with old snapshots)
    if (!this.cachedSnapshot.trimState) {
      this.cachedSnapshot.trimState = deepClone(DEFAULT_TRIM_STATE);
    }
    return this.cachedSnapshot;
  }

  public forceUpdate(): void {
    this.emit();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private invalidateSnapshot() {
    this.snapshotDirty = true;
  }

  public reset(next?: Partial<WorkspaceSnapshot>) {
    this.historyManager.clear();
    this.toolManager.reset();
    const nextShapes = next && next.shapes ? deepClone(next.shapes) : [];
    const nextMetadata = next && next.metadata ? next.metadata : {};
    this.snapshot = {
      ...deepClone(DEFAULT_SNAPSHOT),
      ...next,
      shapes: nextShapes,
      metadata: {
        ...DEFAULT_SNAPSHOT.metadata,
        ...nextMetadata,
        revision: this.snapshot.metadata.revision + 1,
        updatedAt: Date.now(),
      },
    };
    this.invalidateSnapshot();
    this.emit();
  }

  public mutate(mutator: (draft: MutableSnapshot) => void, opts: { recordHistory?: boolean } = { recordHistory: true }) {
    const draft = this.snapshot;
    const shouldRecord = opts.recordHistory !== false;
    const batchActive = this.historyManager.getBatchState() !== null;
    const before = shouldRecord && !batchActive ? deepClone(draft) : null;

    mutator(draft);
    draft.metadata.updatedAt = Date.now();
    draft.metadata.revision += 1;

    if (shouldRecord) {
      if (batchActive) {
        this.historyManager.incrementBatchMutations();
      } else if (before) {
        this.historyManager.pushHistoryEntry(before);
      }
    }
    
    // Adjust history limit based on shape count to prevent memory crashes
    this.historyManager.adjustHistoryLimitForShapeCount(draft.shapes.length);

    // Update history depth metadata so UI can show correct undo/redo state
    draft.metadata.historyDepth = this.historyManager.getHistoryDepth();
    draft.metadata.futureDepth = this.historyManager.getFutureDepth();

    this.invalidateSnapshot();
    this.emit();
  }

  public undo(): WorkspaceSnapshot {
    const restored = this.historyManager.undo(this.snapshot);
    if (restored) {
      this.snapshot = restored;
      this.invalidateSnapshot();
      this.emit();
    }
    return this.getSnapshot();
  }

  public redo(): WorkspaceSnapshot {
    const restored = this.historyManager.redo(this.snapshot);
    if (restored) {
      this.snapshot = restored;
      this.invalidateSnapshot();
      this.emit();
    }
    return this.getSnapshot();
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  // --- Stateful helper routines used by command handlers -------------------

  public setTool(tool: ToolType) {
    this.mutate((draft) => {
      draft.activeTool = tool;
      this.selectionManager.clearSelection(draft);

      // Always reset drawing state when switching tools
      draft.isDrawing = false;
      draft.currentShape = null;
      
      // Clear marker chain position when switching tools
      draft.lastMarkerPosition = null;

      this.toolManager.reset(draft);
    }, { recordHistory: false });
  }

  public setGuidelineOrientation(orientation: GuidelineOrientation) {
    this.mutate((draft) => {
      draft.guidelineOrientation = orientation;
    }, { recordHistory: false });
  }

  public setDrawingMode(mode: DrawingMode) {
    this.mutate((draft) => {
      draft.drawingMode = mode;
      // Clear marker chain position when switching to one-time mode
      if (mode === 'one-time') {
        draft.lastMarkerPosition = null;
      }
    }, { recordHistory: false });
  }

  public setShowMeasurements(show: boolean) {
    this.mutate((draft) => {
      draft.showMeasurements = show;
      // Sync master toggle with granular settings
      draft.measurementSettings.enabled = show;
    }, { recordHistory: false });
  }

  public setMeasurementSettings(settings: Partial<MeasurementSettings>) {
    this.mutate((draft) => {
      draft.measurementSettings = {
        ...draft.measurementSettings,
        ...settings,
      };
      // Sync master toggle if enabled changed
      if (typeof settings.enabled === 'boolean') {
        draft.showMeasurements = settings.enabled;
      }
    }, { recordHistory: false });
  }

  public setWallsLocked(locked: boolean) {
    this.mutate((draft) => {
      draft.wallsLocked = locked;
    }, { recordHistory: false });
  }

  public setMarkerOptions(options: { label?: string; color?: string }) {
    this.mutate((draft) => {
      if (options.label !== undefined) {
        draft.markerOptions.label = options.label;
      }
      if (options.color !== undefined) {
        draft.markerOptions.color = options.color;
      }
    }, { recordHistory: false });
  }

  public updateMarker(markerId: string, updates: { label?: string; color?: string }) {
    this.mutate((draft) => {
      const marker = draft.shapes.find(s => s.id === markerId && s.type === 'marker');
      if (marker && marker.type === 'marker') {
        if (updates.label !== undefined) {
          marker.label = updates.label;
        }
        if (updates.color !== undefined) {
          marker.stroke = updates.color;
        }
      }
    });
  }

  public setViewBox(viewBox: ViewBox) {
    this.mutate((draft) => {
      draft.viewBox = viewBox;
    }, { recordHistory: false });
  }

  public updateCursor(point: Point) {
    this.mutate((draft) => {
      this.toolManager.updateCursor(draft, point, this.snapshot);
    }, { recordHistory: false });
  }

  public handleClick(point: Point) {
    this.mutate((draft) => {
      this.toolManager.handleClick(draft, point);
    });
  }

  public selectShape(ids: string[], append = false) {
    this.mutate((draft) => {
      this.selectionManager.selectShapes(draft, ids, append);
    });
  }

  public clearSelection() {
    this.mutate((draft) => {
      this.selectionManager.clearSelection(draft);
    });
  }

  public setSelection(ids: string[]) {
    this.mutate((draft) => {
      this.selectionManager.setSelection(draft, ids);
    });
  }

  public getPrimarySelectionId(): string | null {
    return this.selectionManager.getPrimarySelectionId(this.snapshot);
  }

  public cancelDrawing() {
    this.mutate((draft) => {
      this.toolManager.cancelDrawing(draft);
    }, { recordHistory: false });
  }

  public moveSelection(delta: Point) {
    this.mutate((draft) => {
      this.toolManager.moveSelection(draft, delta);
    });
  }

  public rotateSelection(angle: number, pivot?: Point) {
    if (!Number.isFinite(angle) || Math.abs(angle) < 1e-6) {
      return;
    }
    this.mutate((draft) => {
      this.toolManager.rotateSelection(draft, angle, pivot);
    });
  }

  // ============================================================================
  // Group/Ungroup Operations
  // ============================================================================

  public groupSelection() {
    this.mutate((draft) => {
      this.toolManager.groupSelection(draft);
    });
  }

  public ungroupSelection() {
    this.mutate((draft) => {
      this.toolManager.ungroupSelection(draft);
    });
  }

  // ============================================================================
  // Mirror Operation
  // ============================================================================

  public mirrorSelection(axis: { point1: Point; point2: Point }, keepOriginal: boolean = true) {
    this.mutate((draft) => {
      this.toolManager.mirrorSelection(draft, axis, keepOriginal);
    });
  }

  // ============================================================================
  // Fillet Operation
  // ============================================================================

  public createFillet(shapeId1: string, shapeId2: string, radius: number) {
    if (radius <= 0) return;
    this.mutate((draft) => {
      this.geometryManager.createFillet(draft, shapeId1, shapeId2, radius);
    });
  }

  // ============================================================================
  // Explode Operation
  // ============================================================================

  public explodeSelection() {
    this.mutate((draft) => {
      this.toolManager.explodeSelection(draft);
    });
  }

  public resizeLineHandle(point: Point, handle: 'start' | 'end') {
    this.mutate((draft) => {
      this.toolManager.resizeLineHandle(draft, point, handle);
    });
  }

  public resizeWallHandle(point: Point, handle: 'start' | 'end') {
    this.mutate((draft) => {
      this.toolManager.resizeWallHandle(draft, point, handle);
    });
  }

  /**
   * Translate a wall by moving both endpoints by the same delta.
   * When walls are locked, connected walls automatically extend or shrink to maintain connections.
   */
  public translateWall(wallId: string, delta: Point) {
    this.mutate((draft) => {
      this.toolManager.translateWall(draft, wallId, delta);
    });
  }

  public setSelectedWallThickness(thickness: number) {
    this.mutate((draft) => {
      this.toolManager.setSelectedWallThickness(draft, thickness);
    });
  }

  public updateTextContent(textId: string, updates: Partial<TextShape>) {
    this.mutate((draft) => {
      this.toolManager.updateTextContent(draft, textId, updates);
    }, { recordHistory: false }); // Don't record every keystroke
  }

  public resizeText(textId: string, newFontSize: number, newPosition?: Point) {
    this.mutate(draft => {
      this.toolManager.resizeText(draft, textId, newFontSize, newPosition);
    });
  }

  public moveCurrentShape(delta: Point) {
    this.mutate((draft) => {
      this.toolManager.moveCurrentShape(draft, delta);
    }, { recordHistory: false }); // Don't record history for drag updates
  }

  public resizeCurrentText(newFontSize: number, newPosition: Point) {
    this.mutate(draft => {
      this.toolManager.resizeCurrentText(draft, newFontSize, newPosition);
    }, { recordHistory: false });
  }

  public setSelectedWallHeight(height: number) {
    this.mutate((draft) => {
      this.toolManager.setSelectedWallHeight(draft, height);
    });
  }

  public setSelectedWallLength(length: number) {
    if (length <= 0) return;
    this.mutate((draft) => {
      const primaryId = this.selectionManager.getPrimarySelectionId(draft);
      if (!primaryId) return;
      let updated = false;
      draft.shapes = draft.shapes.map((shape) => {
        if (shape.id === primaryId && shape.type === 'wall') {
          const centerline = shape.centerline.slice();
          if (centerline.length < 2) {
            return shape;
          }
          const start = centerline[0];
          const end = centerline[centerline.length - 1];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const currentLength = Math.hypot(dx, dy);
          if (currentLength < 1e-6) {
            return shape;
          }
          const unitX = dx / currentLength;
          const unitY = dy / currentLength;
          const newEnd = {
            x: start.x + unitX * length,
            y: start.y + unitY * length,
          };
          centerline[centerline.length - 1] = newEnd;
          updated = true;
          return { ...shape, centerline, controlPoint: null };
        }
        return shape;
      });
      if (updated) {
        this.geometryManager.recomputeOpeningsForWalls(draft, [primaryId]);
      }
    });
  }

  public setSelectedWallAlignment(alignment: WallAlignment) {
    this.mutate((draft) => {
      const primaryId = this.selectionManager.getPrimarySelectionId(draft);
      if (!primaryId) return;
      let updated = false;
      draft.shapes = draft.shapes.map((shape) => {
        if (shape.id === primaryId && shape.type === 'wall') {
          updated = true;
          return { ...shape, alignment };
        }
        return shape;
      });
      if (updated) {
        this.geometryManager.recomputeOpeningsForWalls(draft, [primaryId]);
      }
    });
  }

  public snapSelectedWallsOrthogonal() {
    this.mutate((draft) => {
      this.toolManager.snapSelectedWallsOrthogonal(draft);
    });
  }

  public setWallControlPoint(point: Point | null) {
    this.mutate((draft) => {
      const primaryId = this.selectionManager.getPrimarySelectionId(draft);
      if (!primaryId) return;
      let updated = false;
      draft.shapes = draft.shapes.map((shape) => {
        if (shape.id === primaryId && shape.type === 'wall') {
          if (!point) {
            updated = true;
            return { ...shape, controlPoint: null };
          }
          const centerline = shape.centerline;
          if (!centerline || centerline.length < 2) {
            updated = true;
            return { ...shape, controlPoint: point };
          }
          const start = centerline[0];
          const end = centerline[centerline.length - 1];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const length = Math.hypot(dx, dy);
          if (length < 1e-6) {
            return { ...shape, controlPoint: null };
          }
          const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
          const unitPerpX = -dy / length;
          const unitPerpY = dx / length;
          const offset =
            (point.x - midpoint.x) * unitPerpX + (point.y - midpoint.y) * unitPerpY;
          const resetThreshold = Math.min(0.01, length * 0.02);
          if (Math.abs(offset) < resetThreshold) {
            updated = true;
            return { ...shape, controlPoint: null };
          }
          const constrainedPoint = {
            x: midpoint.x + unitPerpX * offset,
            y: midpoint.y + unitPerpY * offset,
          };
          updated = true;
          return { ...shape, controlPoint: constrainedPoint };
        }
        return shape;
      });
      if (updated) {
        this.geometryManager.recomputeOpeningsForWalls(draft, [primaryId]);
        this.geometryManager.detectAndUpdateRooms(draft);
        this.geometryManager.updateWallBoundZones(draft);
      }
    });
  }

  public setSelectedRoomLabel(label: string | null) {
    this.mutate((draft) => {
      const roomId = draft.selectedShapeIds.find((id) => {
        const shape = draft.shapes.find((s) => s.id === id);
        return shape?.type === 'room';
      });
      if (!roomId) return;
      draft.shapes = draft.shapes.map((shape) => {
        if (shape.id === roomId && shape.type === 'room') {
          if (label == null) {
            return { ...shape, label: undefined };
          }
          const normalized = label.trim();
          return {
            ...shape,
            label: normalized.length > 0 ? normalized : undefined,
          };
        }
        return shape;
      });
    });
  }

  public setSelectedOpeningSize(size: { width?: number; height?: number }) {
    this.mutate((draft) => {
      const primaryId = this.selectionManager.getPrimarySelectionId(draft);
      if (!primaryId) return;
      
      // First pass: update width and collect affected wall IDs
      const affectedWallIds: string[] = [];
      
      draft.shapes = draft.shapes.map((shape) => {
        if (shape.id === primaryId && shape.type === 'opening') {
          const nextWidth =
            typeof size.width === 'number' && size.width > 0
              ? Math.max(MIN_OPENING_WIDTH, size.width)
              : shape.width;
          const nextHeight = size.height && size.height > 0 ? size.height : shape.height;
          
          // If attached to a wall and width is changing, we need to validate position
          if (shape.host && nextWidth !== shape.width) {
            const wall = draft.shapes.find(
              (s): s is WallShape => s.type === 'wall' && s.id === shape.host!.wallId
            );
            
            if (wall) {
              const descriptor = this.geometryManager.describeWallCenterline(wall);
              if (descriptor && descriptor.totalLength > 0) {
                const wallLength = descriptor.totalLength;
                const halfWidth = nextWidth / 2;
                
                // Calculate the allowed range for the opening center
                // The center must be at least halfWidth from each end
                const minPosition = halfWidth / wallLength;
                const maxPosition = 1 - (halfWidth / wallLength);
                
                // Clamp the normalized position
                const currentPosition = shape.host.normalizedPosition;
                let clampedPosition = currentPosition;
                
                if (maxPosition >= minPosition) {
                  // Wall is long enough to fit the opening
                  clampedPosition = Math.max(minPosition, Math.min(maxPosition, currentPosition));
                } else {
                  // Opening is too wide for the wall - center it
                  clampedPosition = 0.5;
                }
                
                // Only update host if position changed
                const updatedHost = {
                  ...shape.host,
                  normalizedPosition: clampedPosition,
                  distance: clampedPosition * wallLength,
                };
                
                // Track this wall for anchor recalculation
                affectedWallIds.push(wall.id);
                
                return {
                  ...shape,
                  width: nextWidth,
                  height: nextHeight,
                  host: updatedHost,
                };
              }
            }
          }
          
          return {
            ...shape,
            width: nextWidth,
            height: nextHeight,
          };
        }
        return shape;
      });
      
      // Recompute anchor positions for openings on affected walls
      if (affectedWallIds.length > 0) {
        this.geometryManager.recomputeOpeningsForWalls(draft, affectedWallIds);
      }
    });
  }

  public setSelectedOpeningCategory(category: OpeningCategory) {
    this.mutate((draft) => {
      const primaryId = this.selectionManager.getPrimarySelectionId(draft);
      if (!primaryId) return;
      draft.shapes = draft.shapes.map((shape) => {
        if (shape.id === primaryId && shape.type === 'opening') {
          return {
            ...shape,
            category,
          };
        }
        return shape;
      });
    });
  }

  public setSelectedOpeningMetadata(metadata: Record<string, string | number | boolean | null>) {
    this.mutate((draft) => {
      const primaryId = this.selectionManager.getPrimarySelectionId(draft);
      if (!primaryId) return;
      draft.shapes = draft.shapes.map((shape) => {
        if (shape.id === primaryId && shape.type === 'opening') {
          return {
            ...shape,
            metadata: {
              ...shape.metadata,
              ...metadata,
            },
          };
        }
        return shape;
      });
    });
  }

  /**
   * Resize an opening by dragging its start or end handle.
   * The handle positions are at the endpoints of the opening span (anchor ± halfWidth along direction).
   * Dragging a handle changes the width while keeping the opposite end fixed.
   */
  public resizeOpeningHandle(point: Point, handle: 'start' | 'end') {
    this.mutate((draft) => {
      const primaryId = this.selectionManager.getPrimarySelectionId(draft);
      if (!primaryId) return;

      const openingIndex = draft.shapes.findIndex(
        (s): s is OpeningShape => s.id === primaryId && s.type === 'opening'
      );
      if (openingIndex === -1) return;

      const opening = draft.shapes[openingIndex] as OpeningShape;
      const { anchor, direction, width } = opening;
      const halfWidth = width / 2;

      // Current start and end points of the opening
      const currentStart = {
        x: anchor.x - direction.x * halfWidth,
        y: anchor.y - direction.y * halfWidth,
      };
      const currentEnd = {
        x: anchor.x + direction.x * halfWidth,
        y: anchor.y + direction.y * halfWidth,
      };

      let newStart: Point;
      let newEnd: Point;

      if (handle === 'start') {
        // Moving start point, end stays fixed
        newEnd = currentEnd;
        // Project the dragged point onto the opening direction line
        const toPoint = { x: point.x - newEnd.x, y: point.y - newEnd.y };
        const projLength = -(toPoint.x * direction.x + toPoint.y * direction.y);
        newStart = {
          x: newEnd.x - direction.x * projLength,
          y: newEnd.y - direction.y * projLength,
        };
      } else {
        // Moving end point, start stays fixed
        newStart = currentStart;
        // Project the dragged point onto the opening direction line
        const toPoint = { x: point.x - newStart.x, y: point.y - newStart.y };
        const projLength = toPoint.x * direction.x + toPoint.y * direction.y;
        newEnd = {
          x: newStart.x + direction.x * projLength,
          y: newStart.y + direction.y * projLength,
        };
      }

      // Calculate new width and anchor
      const newWidth = Math.max(MIN_OPENING_WIDTH, Math.hypot(newEnd.x - newStart.x, newEnd.y - newStart.y));
      const newAnchor = {
        x: (newStart.x + newEnd.x) / 2,
        y: (newStart.y + newEnd.y) / 2,
      };

      // If attached to a wall, update the host attachment
      let updatedHost = opening.host;
      if (opening.host) {
        const wall = draft.shapes.find(
          (s): s is WallShape => s.type === 'wall' && s.id === opening.host!.wallId
        );
        if (wall) {
          // Project the new anchor back onto the wall to get updated attachment
          const pose = this.geometryManager.projectPointOntoWall(
            wall,
            newAnchor,
            opening.host.normalOffset,
            opening.swing.facing
          );
          if (pose) {
            updatedHost = {
              wallId: pose.wallId,
              normalizedPosition: pose.normalizedPosition,
              distance: pose.distance,
              normalOffset: pose.normalOffset,
            };
            // Use the pose anchor to keep it snapped to wall
            draft.shapes[openingIndex] = {
              ...opening,
              width: newWidth,
              anchor: pose.anchor,
              host: updatedHost,
            };
            return;
          }
        }
      }

      // No wall attachment or couldn't reproject - just update position freely
      draft.shapes[openingIndex] = {
        ...opening,
        width: newWidth,
        anchor: newAnchor,
        host: updatedHost,
      };
    }, { recordHistory: false }); // Don't record every drag movement
  }

  public resizePolylineCorner(point: Point, corner: 'tl' | 'tr' | 'bl' | 'br') {
    this.mutate((draft) => {
      if (!draft.selectedShapeIds || draft.selectedShapeIds.length === 0) {
        return;
      }

      const selectedIds = draft.selectedShapeIds;

      if (selectedIds.length > 1) {
        const selectedShapes = draft.shapes.filter((shape) => selectedIds.includes(shape.id));
        if (selectedShapes.length === 0) return;

        const allPoints: Point[] = [];
        selectedShapes.forEach((shape) => {
          if (shape.type === 'line') {
            allPoints.push(shape.start, shape.end);
          } else if (shape.type === 'polyline' || shape.type === 'curve') {
            allPoints.push(...shape.points);
          } else if (shape.type === 'arc') {
            allPoints.push(shape.start, shape.end, shape.controlPoint);
          } else if (shape.type === 'circle') {
            allPoints.push(
              { x: shape.center.x - shape.radius, y: shape.center.y },
              { x: shape.center.x + shape.radius, y: shape.center.y },
              { x: shape.center.x, y: shape.center.y - shape.radius },
              { x: shape.center.x, y: shape.center.y + shape.radius }
            );
          } else if (shape.type === 'rectangle') {
            allPoints.push(shape.start, shape.end);
          } else if (shape.type === 'wall') {
            allPoints.push(...shape.centerline);
          } else if (shape.type === 'asset') {
            // Asset bounds are center +/- half dimensions
            allPoints.push(
              { x: shape.position.x - shape.width / 2, y: shape.position.y - shape.height / 2 },
              { x: shape.position.x + shape.width / 2, y: shape.position.y + shape.height / 2 }
            );
          }
        });

        if (allPoints.length < 2) return;

        const xs = allPoints.map((p) => p.x);
        const ys = allPoints.map((p) => p.y);
        const oldMinX = Math.min(...xs);
        const oldMinY = Math.min(...ys);
        const oldMaxX = Math.max(...xs);
        const oldMaxY = Math.max(...ys);
        const oldWidth = oldMaxX - oldMinX;
        const oldHeight = oldMaxY - oldMinY;

        let anchorX = 0;
        let anchorY = 0;
        let newWidth = 0;
        let newHeight = 0;

        switch (corner) {
          case 'tl':
            anchorX = oldMaxX;
            anchorY = oldMaxY;
            newWidth = anchorX - point.x;
            newHeight = anchorY - point.y;
            break;
          case 'tr':
            anchorX = oldMinX;
            anchorY = oldMaxY;
            newWidth = point.x - anchorX;
            newHeight = anchorY - point.y;
            break;
          case 'bl':
            anchorX = oldMaxX;
            anchorY = oldMinY;
            newWidth = anchorX - point.x;
            newHeight = point.y - anchorY;
            break;
          case 'br':
          default:
            anchorX = oldMinX;
            anchorY = oldMinY;
            newWidth = point.x - anchorX;
            newHeight = point.y - anchorY;
            break;
        }

        const minDimension = 0.001;
        const isCollapsedX = oldWidth < minDimension;
        const isCollapsedY = oldHeight < minDimension;
        const oppositeY = corner === 'tl' || corner === 'tr' ? oldMinY : oldMaxY;
        const oppositeX = corner === 'tl' || corner === 'bl' ? oldMinX : oldMaxX;

        let uniformScale = 1;
        if (!isCollapsedX && !isCollapsedY) {
          const scaleX = newWidth / oldWidth;
          const scaleY = newHeight / oldHeight;
          uniformScale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
          if (scaleX < 0 || scaleY < 0) {
            uniformScale = Math.abs(scaleX) > Math.abs(scaleY) ? scaleX : scaleY;
          }
        }

        const transformPoint = (p: Point, idx?: number, totalPoints?: number) => {
          let newX: number;
          let newY: number;

          if (isCollapsedX) {
            if (isCollapsedY) {
              newX = (anchorX + point.x) / 2;
            } else {
              const rangeY = oppositeY - anchorY;
              if (Math.abs(rangeY) > minDimension) {
                const relativeY = (p.y - anchorY) / rangeY;
                newX = anchorX + (point.x - anchorX) * relativeY;
              } else if (typeof idx === 'number' && typeof totalPoints === 'number' && totalPoints > 1) {
                const t = idx / (totalPoints - 1);
                newX = anchorX + (point.x - anchorX) * t;
              } else {
                newX = anchorX + (point.x - anchorX);
              }
            }
          } else {
            newX = anchorX + (p.x - anchorX) * uniformScale;
          }

          if (isCollapsedY) {
            if (isCollapsedX) {
              newY = (anchorY + point.y) / 2;
            } else {
              const rangeX = oppositeX - anchorX;
              if (Math.abs(rangeX) > minDimension) {
                const relativeX = (p.x - anchorX) / rangeX;
                newY = anchorY + (point.y - anchorY) * relativeX;
              } else if (typeof idx === 'number' && typeof totalPoints === 'number' && totalPoints > 1) {
                const t = idx / (totalPoints - 1);
                newY = anchorY + (point.y - anchorY) * t;
              } else {
                newY = anchorY + (point.y - anchorY);
              }
            }
          } else {
            newY = anchorY + (p.y - anchorY) * uniformScale;
          }

          return { x: newX, y: newY };
        };

        let movedWalls = false;
        const affectedShapeIds = new Set<string>();

        draft.shapes = draft.shapes.map((shape) => {
          if (!selectedIds.includes(shape.id)) return shape;
          affectedShapeIds.add(shape.id);

          if (shape.type === 'line') {
            return {
              ...shape,
              start: transformPoint(shape.start),
              end: transformPoint(shape.end),
            };
          }

          if (shape.type === 'arc') {
            return {
              ...shape,
              start: transformPoint(shape.start),
              end: transformPoint(shape.end),
              controlPoint: transformPoint(shape.controlPoint),
            };
          }

          if (shape.type === 'circle') {
            const newCenter = transformPoint(shape.center);
            const newRadius = shape.radius * uniformScale;
            return {
              ...shape,
              center: newCenter,
              cursorPoint: transformPoint(shape.cursorPoint),
              radius: newRadius,
            };
          }

          if (shape.type === 'rectangle') {
            return {
              ...shape,
              start: transformPoint(shape.start),
              end: transformPoint(shape.end),
            };
          }

          if (shape.type === 'polyline' || shape.type === 'curve') {
            const totalPoints = shape.points.length;
            const transformed = shape.points.map((p, idx) => transformPoint(p, idx, totalPoints));
            return {
              ...shape,
              points: transformed,
            };
          }

          if (shape.type === 'wall') {
            movedWalls = true;
            return {
              ...shape,
              centerline: shape.centerline.map((p) => transformPoint(p)),
              controlPoint: shape.controlPoint ? transformPoint(shape.controlPoint) : shape.controlPoint ?? null,
            };
          }

          if (shape.type === 'zone') {
            const totalPoints = shape.points.length;
            // For closed shapes like zones, the last point is same as first.
            // We should transform them consistently.
            const transformed = shape.points.map((p, idx) => transformPoint(p, idx, totalPoints));
            const area = calculatePolygonArea(transformed.slice(0, -1));
            return {
              ...shape,
              points: transformed,
              area,
            };
          }

          if (shape.type === 'asset') {
            // Transform center position
            const newPosition = transformPoint(shape.position);
            // Scale dimensions uniformly (aspect ratio locked)
            const newWidth = shape.width * Math.abs(uniformScale);
            const newHeight = shape.height * Math.abs(uniformScale);
            return {
              ...shape,
              position: newPosition,
              width: newWidth,
              height: newHeight,
            };
          }

          return shape;
        });

        // Update dimensions attached to resized shapes
        draft.shapes = draft.shapes.map((shape) => {
          if (shape.type === 'dimension' && shape.attachedTo && affectedShapeIds.has(shape.attachedTo)) {
            return {
              ...shape,
              start: transformPoint(shape.start),
              end: transformPoint(shape.end),
            };
          }
          return shape;
        });

        if (movedWalls) {
          this.geometryManager.detectAndUpdateRooms(draft);
          this.geometryManager.updateWallBoundZones(draft);
        }
        return;
      }

      const primaryId = this.selectionManager.getPrimarySelectionId(draft);
      if (!primaryId) return;
      const targetShape = draft.shapes.find((shape) => shape.id === primaryId);
      if (!targetShape) return;

      let allPoints: Point[] = [];
      if (targetShape.type === 'polyline' || targetShape.type === 'curve' || targetShape.type === 'zone') {
        allPoints = targetShape.points;
      } else if (targetShape.type === 'arc') {
        allPoints = [targetShape.start, targetShape.end, targetShape.controlPoint];
      } else if (targetShape.type === 'circle') {
        allPoints = [
          { x: targetShape.center.x - targetShape.radius, y: targetShape.center.y },
          { x: targetShape.center.x + targetShape.radius, y: targetShape.center.y },
          { x: targetShape.center.x, y: targetShape.center.y - targetShape.radius },
          { x: targetShape.center.x, y: targetShape.center.y + targetShape.radius },
        ];
      } else if (targetShape.type === 'rectangle') {
        allPoints = [targetShape.start, targetShape.end];
      } else if (targetShape.type === 'wall') {
        allPoints = targetShape.centerline;
      } else if (targetShape.type === 'line') {
        allPoints = [targetShape.start, targetShape.end];
      } else if (targetShape.type === 'asset') {
        // Asset bounds are center +/- half dimensions
        allPoints = [
          { x: targetShape.position.x - targetShape.width / 2, y: targetShape.position.y - targetShape.height / 2 },
          { x: targetShape.position.x + targetShape.width / 2, y: targetShape.position.y + targetShape.height / 2 },
        ];
      } else {
        return;
      }

      if (!allPoints || allPoints.length < 2) return;

      const xs = allPoints.map((p) => p.x);
      const ys = allPoints.map((p) => p.y);
      const oldMinX = Math.min(...xs);
      const oldMinY = Math.min(...ys);
      const oldMaxX = Math.max(...xs);
      const oldMaxY = Math.max(...ys);
      const oldWidth = oldMaxX - oldMinX;
      const oldHeight = oldMaxY - oldMinY;

      let anchorX = 0;
      let anchorY = 0;
      let newWidth = 0;
      let newHeight = 0;

      switch (corner) {
        case 'tl':
          anchorX = oldMaxX;
          anchorY = oldMaxY;
          newWidth = anchorX - point.x;
          newHeight = anchorY - point.y;
          break;
        case 'tr':
          anchorX = oldMinX;
          anchorY = oldMaxY;
          newWidth = point.x - anchorX;
          newHeight = anchorY - point.y;
          break;
        case 'bl':
          anchorX = oldMaxX;
          anchorY = oldMinY;
          newWidth = anchorX - point.x;
          newHeight = point.y - anchorY;
          break;
        case 'br':
        default:
          anchorX = oldMinX;
          anchorY = oldMinY;
          newWidth = point.x - anchorX;
          newHeight = point.y - anchorY;
          break;
      }

      const minDimension = 0.001;
      const isCollapsedX = oldWidth < minDimension;
      const isCollapsedY = oldHeight < minDimension;
      const oppositeY = corner === 'tl' || corner === 'tr' ? oldMinY : oldMaxY;
      const oppositeX = corner === 'tl' || corner === 'bl' ? oldMinX : oldMaxX;

      let uniformScale = 1;
      if (!isCollapsedX && !isCollapsedY) {
        const scaleX = newWidth / (oldWidth || 1);
        const scaleY = newHeight / (oldHeight || 1);
        uniformScale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
        if (scaleX < 0 || scaleY < 0) {
          uniformScale = Math.abs(scaleX) > Math.abs(scaleY) ? scaleX : scaleY;
        }
      }

      const transformPoint = (p: Point, idx?: number, totalPoints?: number) => {
        let newX: number;
        let newY: number;

        if (isCollapsedX) {
          if (isCollapsedY) {
            newX = (anchorX + point.x) / 2;
          } else {
            const rangeY = oppositeY - anchorY;
            if (Math.abs(rangeY) > minDimension) {
              const relativeY = (p.y - anchorY) / rangeY;
              newX = anchorX + (point.x - anchorX) * relativeY;
            } else if (typeof idx === 'number' && typeof totalPoints === 'number' && totalPoints > 1) {
              const t = idx / (totalPoints - 1);
              newX = anchorX + (point.x - anchorX) * t;
            } else {
              newX = anchorX + (point.x - anchorX);
            }
          }
        } else {
          newX = anchorX + (p.x - anchorX) * uniformScale;
        }

        if (isCollapsedY) {
          if (isCollapsedX) {
            newY = (anchorY + point.y) / 2;
          } else {
            const rangeX = oppositeX - anchorX;
            if (Math.abs(rangeX) > minDimension) {
              const relativeX = (p.x - anchorX) / rangeX;
              newY = anchorY + (point.y - anchorY) * relativeX;
            } else if (typeof idx === 'number' && typeof totalPoints === 'number' && totalPoints > 1) {
              const t = idx / (totalPoints - 1);
              newY = anchorY + (point.y - anchorY) * t;
            } else {
              newY = anchorY + (point.y - anchorY);
            }
          }
        } else {
          newY = anchorY + (p.y - anchorY) * uniformScale;
        }

        return { x: newX, y: newY };
      };

      let movedWalls = false;
      draft.shapes = draft.shapes.map((shape) => {
        if (shape.id !== primaryId) return shape;

        if (shape.type === 'line') {
          return {
            ...shape,
            start: transformPoint(shape.start),
            end: transformPoint(shape.end),
          };
        }

        if (shape.type === 'arc') {
          return {
            ...shape,
            start: transformPoint(shape.start),
            end: transformPoint(shape.end),
            controlPoint: transformPoint(shape.controlPoint),
          };
        }

        if (shape.type === 'circle') {
          const newCenter = transformPoint(shape.center);
          const newRadius = shape.radius * uniformScale;
          return {
            ...shape,
            center: newCenter,
            cursorPoint: transformPoint(shape.cursorPoint),
            radius: newRadius,
          };
        }

        if (shape.type === 'rectangle') {
          return {
            ...shape,
            start: transformPoint(shape.start),
            end: transformPoint(shape.end),
          };
        }

        if (shape.type === 'polyline' || shape.type === 'curve') {
          const totalPoints = shape.points.length;
          const transformed = shape.points.map((p, idx) => transformPoint(p, idx, totalPoints));
          return {
            ...shape,
            points: transformed,
          };
        }

        if (shape.type === 'wall') {
          movedWalls = true;
          return {
            ...shape,
            centerline: shape.centerline.map((p) => transformPoint(p)),
            controlPoint: shape.controlPoint ? transformPoint(shape.controlPoint) : shape.controlPoint ?? null,
          };
        }

        if (shape.type === 'zone') {
          const totalPoints = shape.points.length;
          const transformed = shape.points.map((p, idx) => transformPoint(p, idx, totalPoints));
          const area = calculatePolygonArea(transformed.slice(0, -1));
          return {
            ...shape,
            points: transformed,
            area,
          };
        }

        if (shape.type === 'asset') {
          // Transform center position
          const newPosition = transformPoint(shape.position);
          // Scale dimensions uniformly (aspect ratio locked)
          const newWidth = shape.width * Math.abs(uniformScale);
          const newHeight = shape.height * Math.abs(uniformScale);
          return {
            ...shape,
            position: newPosition,
            width: newWidth,
            height: newHeight,
          };
        }

        return shape;
      });

      // Update dimensions attached to the primary shape
      draft.shapes = draft.shapes.map((shape) => {
        if (shape.type === 'dimension' && shape.attachedTo === primaryId) {
          return {
            ...shape,
            start: transformPoint(shape.start),
            end: transformPoint(shape.end),
          };
        }
        return shape;
      });

      if (movedWalls) {
        this.geometryManager.detectAndUpdateRooms(draft);
        this.geometryManager.updateWallBoundZones(draft);
      }
    });
  }

  public resizeRectangleEdge(point: Point, edge: 'top' | 'right' | 'bottom' | 'left') {
    this.mutate((draft) => {
      const primaryId = this.selectionManager.getPrimarySelectionId(draft);
      if (!primaryId) return;

      draft.shapes = draft.shapes.map((shape) => {
        if (shape.id !== primaryId || shape.type !== 'rectangle') {
          return shape;
        }

        let newStart = { ...shape.start };
        let newEnd = { ...shape.end };

        switch (edge) {
          case 'top':
            if (shape.start.y < shape.end.y) {
              newStart = { ...shape.start, y: point.y };
            } else {
              newEnd = { ...shape.end, y: point.y };
            }
            break;
          case 'bottom':
            if (shape.start.y > shape.end.y) {
              newStart = { ...shape.start, y: point.y };
            } else {
              newEnd = { ...shape.end, y: point.y };
            }
            break;
          case 'left':
            if (shape.start.x < shape.end.x) {
              newStart = { ...shape.start, x: point.x };
            } else {
              newEnd = { ...shape.end, x: point.x };
            }
            break;
          case 'right':
            if (shape.start.x > shape.end.x) {
              newStart = { ...shape.start, x: point.x };
            } else {
              newEnd = { ...shape.end, x: point.x };
            }
            break;
        }

        return {
          ...shape,
          start: newStart,
          end: newEnd,
        };
      });
    });
  }

  public resizeRoomCorner(point: Point, corner: 'tl' | 'tr' | 'bl' | 'br') {
    this.mutate((draft) => {
      const primaryId = this.selectionManager.getPrimarySelectionId(draft);
      if (!primaryId) return;

      // Find the selected shape (either room or zone)
      const targetShape = draft.shapes.find(
        (shape): shape is RoomShape | ZoneShape =>
          shape.id === primaryId && (shape.type === 'room' || shape.type === 'zone')
      );

      if (!targetShape || !targetShape.points || targetShape.points.length < 3) {
        return;
      }

      const xs = targetShape.points.map((p) => p.x);
      const ys = targetShape.points.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const MIN_SIZE = 0.05;

      let newMinX = minX;
      let newMaxX = maxX;
      if (corner === 'tl' || corner === 'bl') {
        const maxLeft = maxX - MIN_SIZE;
        newMinX = Math.min(point.x, maxLeft);
      } else {
        const minRight = minX + MIN_SIZE;
        newMaxX = Math.max(point.x, minRight);
      }

      let newMinY = minY;
      let newMaxY = maxY;
      if (corner === 'tl' || corner === 'tr') {
        const maxTop = maxY - MIN_SIZE;
        newMinY = Math.min(point.y, maxTop);
      } else {
        const minBottom = minY + MIN_SIZE;
        newMaxY = Math.max(point.y, minBottom);
      }

      const oldWidth = maxX - minX;
      const oldHeight = maxY - minY;

      const remap = (
        value: number,
        oldStart: number,
        oldRange: number,
        newStart: number,
        newEnd: number,
      ) => {
        if (Math.abs(oldRange) < 1e-6) {
          // Translate by the delta between new and old start when collapsed
          return value + (newStart - oldStart);
        }
        const t = (value - oldStart) / oldRange;
        return newStart + t * (newEnd - newStart);
      };

      const transformPoint = (p: Point): Point => ({
        x: remap(p.x, minX, oldWidth, newMinX, newMaxX),
        y: remap(p.y, minY, oldHeight, newMinY, newMaxY),
      });

      const updateRoomGeometry = (room: RoomShape): RoomShape => {
        const transformedPoints = room.points.map(transformPoint);
        return {
          ...room,
          points: transformedPoints,
          centroid: getPolygonCentroid(transformedPoints),
          area: calculatePolygonArea(transformedPoints),
          perimeter: calculatePolygonPerimeter(transformedPoints),
        };
      };

      const updateZoneGeometry = (zone: ZoneShape): ZoneShape => {
        const transformedPoints = zone.points.map(transformPoint);
        return {
          ...zone,
          points: transformedPoints,
          area: calculatePolygonArea(transformedPoints),
        };
      };

      const hasWalls = targetShape.type === 'room' && Boolean(targetShape.wallIds && targetShape.wallIds.length > 0);
      if (!hasWalls) {
        draft.shapes = draft.shapes.map((shape) => {
          if (shape.id === targetShape.id) {
            if (shape.type === 'room') {
              return updateRoomGeometry(shape);
            } else if (shape.type === 'zone') {
              return updateZoneGeometry(shape);
            }
          }
          return shape;
        });

        // Update dimensions attached to the resized zone/room
        draft.shapes = draft.shapes.map((shape) => {
          if (shape.type === 'dimension' && shape.attachedTo === primaryId) {
            return {
              ...shape,
              start: transformPoint(shape.start),
              end: transformPoint(shape.end),
            };
          }
          return shape;
        });

        return;
      }

      const wallIdSet = new Set(targetShape.type === 'room' ? (targetShape.wallIds ?? []) : []);

      draft.shapes = draft.shapes.map((shape) => {
        if (shape.type === 'wall' && wallIdSet.has(shape.id)) {
          return {
            ...shape,
            centerline: shape.centerline.map(transformPoint),
            controlPoint: shape.controlPoint
              ? transformPoint(shape.controlPoint)
              : shape.controlPoint ?? null,
          };
        }
        return shape;
      });

      const wallKey = targetShape.type === 'room' ? (targetShape.wallIds?.slice().sort().join('|') ?? null) : null;
      this.geometryManager.detectAndUpdateRooms(draft);
      this.geometryManager.updateWallBoundZones(draft);
      if (wallKey) {
        const replacement = draft.shapes.find((shape): shape is RoomShape => {
          if (shape.type !== 'room' || !shape.wallIds) {
            return false;
          }
          return shape.wallIds.slice().sort().join('|') === wallKey;
        });
        if (replacement) {
          this.selectionManager.setSelection(draft, [replacement.id]);
        }
      }
    });
  }

  public confirmCurrentShape() {
    this.mutate((draft) => {
      this.toolManager.confirmCurrentShape(draft);
    });
  }

  public commitChainSession() {
    this.mutate((draft) => {
      if (!draft.chainSessionShapeIds.length) {
        return;
      }
      this.selectionManager.setSelection(draft, [...draft.chainSessionShapeIds]);
      draft.chainSessionShapeIds = [];
      draft.activeTool = 'select';
      this.toolManager.resetDrawingHistory(draft);
    }, { recordHistory: false });
  }

  public abortChainSession() {
    this.mutate((draft) => {
      if (!draft.chainSessionShapeIds.length) {
        return;
      }
      const pending = new Set(draft.chainSessionShapeIds);
      draft.shapes = draft.shapes.filter((shape) => !pending.has(shape.id));
      draft.chainSessionShapeIds = [];
      this.selectionManager.clearSelection(draft);
      this.toolManager.reset(draft);
    });
  }

  public deleteSelection() {
    this.mutate((draft) => {
      const deletedWallIds = new Set<string>();
      const idsToDelete = new Set(draft.selectedShapeIds);

      // Find associated dimensions to delete
      draft.shapes.forEach((shape) => {
        if (shape.type === 'dimension' && shape.attachedTo && idsToDelete.has(shape.attachedTo)) {
          idsToDelete.add(shape.id);
        }
      });

      draft.shapes.forEach((shape) => {
        if (shape.type === 'wall' && idsToDelete.has(shape.id)) {
          deletedWallIds.add(shape.id);
        }
      });

      draft.shapes = draft.shapes.filter((shape) => !idsToDelete.has(shape.id));

      if (deletedWallIds.size) {
        this.geometryManager.removeOpeningsAttachedToWalls(draft, deletedWallIds);
      }
      this.selectionManager.clearSelection(draft);
    });
  }

  /**
   * Paste shapes from clipboard with new IDs and optional offset.
   * @param shapesToPaste Array of shapes to paste (should be deep cloned before calling)
   * @param offset Position offset for pasted shapes
   * @returns Array of new shape IDs
   */
  public pasteShapes(shapesToPaste: Shape[], offset: Point = { x: 0.1, y: 0.1 }): string[] {
    const newIds: string[] = [];
    const idMap = new Map<string, string>(); // Map old IDs to new IDs

    this.mutate((draft) => {
      // First pass: create new IDs and build ID mapping
      shapesToPaste.forEach((originalShape) => {
        const shapeType = originalShape.type;
        const newId = generateShapeId(shapeType);
        idMap.set(originalShape.id, newId);
        newIds.push(newId);
      });

      // Second pass: create shapes with new IDs and offset positions
      shapesToPaste.forEach((originalShape) => {
        const newId = idMap.get(originalShape.id)!;
        let newShape: Shape;

        switch (originalShape.type) {
          case 'line':
            newShape = {
              ...deepClone(originalShape),
              id: newId,
              start: { x: originalShape.start.x + offset.x, y: originalShape.start.y + offset.y },
              end: { x: originalShape.end.x + offset.x, y: originalShape.end.y + offset.y },
            };
            break;

          case 'polyline':
          case 'curve':
            newShape = {
              ...deepClone(originalShape),
              id: newId,
              points: originalShape.points.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y })),
            };
            break;

          case 'arc':
            newShape = {
              ...deepClone(originalShape),
              id: newId,
              start: { x: originalShape.start.x + offset.x, y: originalShape.start.y + offset.y },
              end: { x: originalShape.end.x + offset.x, y: originalShape.end.y + offset.y },
              controlPoint: { x: originalShape.controlPoint.x + offset.x, y: originalShape.controlPoint.y + offset.y },
            };
            break;

          case 'circle':
            newShape = {
              ...deepClone(originalShape),
              id: newId,
              center: { x: originalShape.center.x + offset.x, y: originalShape.center.y + offset.y },
              cursorPoint: { x: originalShape.cursorPoint.x + offset.x, y: originalShape.cursorPoint.y + offset.y },
            };
            break;

          case 'rectangle':
            newShape = {
              ...deepClone(originalShape),
              id: newId,
              start: { x: originalShape.start.x + offset.x, y: originalShape.start.y + offset.y },
              end: { x: originalShape.end.x + offset.x, y: originalShape.end.y + offset.y },
            };
            break;

          case 'wall':
            newShape = {
              ...deepClone(originalShape),
              id: newId,
              centerline: originalShape.centerline.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y })),
              controlPoint: originalShape.controlPoint
                ? { x: originalShape.controlPoint.x + offset.x, y: originalShape.controlPoint.y + offset.y }
                : null,
            };
            break;

          case 'opening':
            // For openings, we detach from the host wall since position changes
            newShape = {
              ...deepClone(originalShape),
              id: newId,
              anchor: { x: originalShape.anchor.x + offset.x, y: originalShape.anchor.y + offset.y },
              host: null, // Detach from original wall
            };
            break;

          case 'room':
            newShape = {
              ...deepClone(originalShape),
              id: newId,
              points: originalShape.points.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y })),
              centroid: { x: originalShape.centroid.x + offset.x, y: originalShape.centroid.y + offset.y },
              wallIds: undefined, // Detach from original walls
            };
            break;

          case 'zone':
            newShape = {
              ...deepClone(originalShape),
              id: newId,
              points: originalShape.points.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y })),
              wallIds: undefined, // Detach from original walls
            };
            break;

          case 'guideline':
            if (originalShape.orientation === 'horizontal' || originalShape.orientation === 'vertical') {
              const posOffset = originalShape.orientation === 'horizontal' ? offset.y : offset.x;
              newShape = {
                ...deepClone(originalShape),
                id: newId,
                position: (originalShape.position ?? 0) + posOffset,
              };
            } else {
              // Freeform guideline
              newShape = {
                ...deepClone(originalShape),
                id: newId,
                start: originalShape.start
                  ? { x: originalShape.start.x + offset.x, y: originalShape.start.y + offset.y }
                  : undefined,
                end: originalShape.end
                  ? { x: originalShape.end.x + offset.x, y: originalShape.end.y + offset.y }
                  : undefined,
              };
            }
            break;

          case 'dimension':
            newShape = {
              ...deepClone(originalShape),
              id: newId,
              start: { x: originalShape.start.x + offset.x, y: originalShape.start.y + offset.y },
              end: { x: originalShape.end.x + offset.x, y: originalShape.end.y + offset.y },
              attachedTo: originalShape.attachedTo ? idMap.get(originalShape.attachedTo) : undefined,
            };
            break;

          case 'text':
            newShape = {
              ...deepClone(originalShape),
              id: newId,
              position: { x: originalShape.position.x + offset.x, y: originalShape.position.y + offset.y },
            };
            break;

          case 'marker':
            newShape = {
              ...deepClone(originalShape),
              id: newId,
              position: { x: originalShape.position.x + offset.x, y: originalShape.position.y + offset.y },
            };
            break;

          default:
            // Fallback for any unknown shape type - should never be reached
            // as all shape types are handled above
            newShape = {
              ...(deepClone(originalShape) as Shape),
              id: newId,
            };
        }

        draft.shapes.push(newShape);
      });

      // Select the newly pasted shapes
      this.selectionManager.setSelection(draft, newIds);
    });

    return newIds;
  }

  public applySnapshot(next: WorkspaceSnapshot) {
    this.cancelHistoryBatch();
    this.toolManager.reset();
    this.mutate((draft) => {
      Object.assign(draft, deepClone(next));
    });
  }

  public beginHistoryBatch(source?: string) {
    this.historyManager.beginHistoryBatch(source || 'unknown', this.snapshot);
  }

  public commitHistoryBatch() {
    this.historyManager.commitHistoryBatch();
    // Update history depth metadata after batch commit
    this.snapshot.metadata.historyDepth = this.historyManager.getHistoryDepth();
    this.snapshot.metadata.futureDepth = this.historyManager.getFutureDepth();
    this.invalidateSnapshot();
    this.emit();
  }

  public cancelHistoryBatch() {
    const restored = this.historyManager.cancelHistoryBatch();
    if (restored) {
      this.snapshot = restored;
      // Update history depth metadata after batch cancel
      this.snapshot.metadata.historyDepth = this.historyManager.getHistoryDepth();
      this.snapshot.metadata.futureDepth = this.historyManager.getFutureDepth();
      this.cachedSnapshot = deepClone(this.snapshot);
      this.snapshotDirty = false;
      this.emit();
    }
  }



  public undoDrawingStep(): boolean {
    let result = false;
    this.mutate((draft) => {
      result = this.toolManager.undoDrawingStep(draft);
    });
    return result;
  }

  public redoDrawingStep(): boolean {
    let result = false;
    this.mutate((draft) => {
      result = this.toolManager.redoDrawingStep(draft);
    });
    return result;
  }

  // ---- Tool handlers ------------------------------------------------------

  // ============================================================================
  // Universal Styling Methods
  // ============================================================================

  public setShapeFill(shapeId: string, fill: import('../../../components/Workspace/types').FillStyle) {
    this.mutate((draft) => {
      const shape = draft.shapes.find(s => s.id === shapeId);
      if (!shape) return;

      // Validate fill is allowed for this shape type
      if (!canHaveFill(shape)) {
        console.warn(`Shape type ${shape.type} cannot have fill`);
        return;
      }

      draft.shapes = draft.shapes.map(s => {
        if (s.id === shapeId) {
          return {
            ...s,
            appearance: {
              ...s.appearance,
              fill
            }
          };
        }
        return s;
      });
    });
  }

  public setShapeStroke(shapeId: string, stroke: import('../../../components/Workspace/types').StrokeStyle) {
    this.mutate((draft) => {
      const shape = draft.shapes.find(s => s.id === shapeId);
      if (!shape) return;

      if (!canHaveStroke(shape)) {
        console.warn(`Shape type ${shape.type} cannot have stroke`);
        return;
      }

      draft.shapes = draft.shapes.map(s => {
        if (s.id === shapeId) {
          return {
            ...s,
            appearance: {
              ...s.appearance,
              stroke
            }
          };
        }
        return s;
      });
    });
  }

  public setShapeOpacity(shapeId: string, opacity: number) {
    this.mutate((draft) => {
      const clampedOpacity = Math.max(0, Math.min(1, opacity));

      draft.shapes = draft.shapes.map(s => {
        if (s.id === shapeId) {
          return {
            ...s,
            appearance: {
              ...s.appearance,
              opacity: clampedOpacity
            }
          };
        }
        return s;
      });
    });
  }

  public setShapeBlendMode(shapeId: string, blendMode: import('../../../components/Workspace/types').BlendMode) {
    this.mutate((draft) => {
      draft.shapes = draft.shapes.map(s => {
        if (s.id === shapeId) {
          return {
            ...s,
            appearance: {
              ...s.appearance,
              blendMode
            }
          };
        }
        return s;
      });
    });
  }

  public setShapeShadow(shapeId: string, shadow: import('../../../components/Workspace/types').ShadowStyle | null) {
    this.mutate((draft) => {
      draft.shapes = draft.shapes.map(s => {
        if (s.id === shapeId) {
          return {
            ...s,
            appearance: {
              ...s.appearance,
              shadow: shadow ?? undefined
            }
          };
        }
        return s;
      });
    });
  }

  public applyStylePreset(shapeId: string, presetId: string) {
    this.mutate((draft) => {
      const shape = draft.shapes.find(s => s.id === shapeId);
      if (!shape) return;

      const preset = getPresetById(presetId);
      if (!preset) {
        console.warn(`Preset ${presetId} not found`);
        return;
      }

      // Check if preset is applicable to this shape type
      if (!preset.applicableTo.includes(shape.type)) {
        console.warn(`Preset ${presetId} not applicable to ${shape.type}`);
        return;
      }

      draft.shapes = draft.shapes.map(s => {
        if (s.id === shapeId) {
          return {
            ...s,
            appearance: { ...preset.appearance }
          };
        }
        return s;
      });
    });
  }

  // ============================================================================
  // BIM Property Methods
  // ============================================================================

  public setShapeBIMName(shapeId: string, name: string | undefined) {
    this.mutate((draft) => {
      draft.shapes = draft.shapes.map(s => {
        if (s.id === shapeId) {
          return { ...s, name: name ?? '' } as typeof s;
        }
        return s;
      }) as typeof draft.shapes;
    });
  }

  public setShapeBIMTag(shapeId: string, tag: string | undefined) {
    this.mutate((draft) => {
      draft.shapes = draft.shapes.map(s => {
        if (s.id === shapeId) {
          return { ...s, tag };
        }
        return s;
      });
    });
  }

  public setShapeBIMDescription(shapeId: string, description: string | undefined) {
    this.mutate((draft) => {
      draft.shapes = draft.shapes.map(s => {
        if (s.id === shapeId) {
          return { ...s, description };
        }
        return s;
      });
    });
  }

  public setShapeClassification(shapeId: string, classification: import('../../../components/Workspace/types').BIMShapeProperties['classification'] | null) {
    this.mutate((draft) => {
      draft.shapes = draft.shapes.map(s => {
        if (s.id === shapeId) {
          if (classification === null) {
            // Remove classification
            const { classification: _, ...rest } = s as typeof s & { classification?: unknown };
            return rest;
          }
          return { ...s, classification };
        }
        return s;
      });
    });
  }

  // Bulk operations on selection
  public setSelectionFill(fill: import('../../../components/Workspace/types').FillStyle) {
    this.mutate((draft) => {
      const selectedIds = this.selectionManager.getSelectedIds(draft);

      draft.shapes = draft.shapes.map(s => {
        if (selectedIds.includes(s.id) && canHaveFill(s)) {
          return {
            ...s,
            appearance: {
              ...s.appearance,
              fill
            }
          };
        }
        return s;
      });
    });
  }

  public setSelectionStroke(stroke: import('../../../components/Workspace/types').StrokeStyle) {
    this.mutate((draft) => {
      const selectedIds = this.selectionManager.getSelectedIds(draft);

      draft.shapes = draft.shapes.map(s => {
        if (selectedIds.includes(s.id) && canHaveStroke(s)) {
          return {
            ...s,
            appearance: {
              ...s.appearance,
              stroke
            }
          };
        }
        return s;
      });
    });
  }

  public setSelectionOpacity(opacity: number) {
    this.mutate((draft) => {
      const selectedIds = this.selectionManager.getSelectedIds(draft);
      const clampedOpacity = Math.max(0, Math.min(1, opacity));

      draft.shapes = draft.shapes.map(s => {
        if (selectedIds.includes(s.id)) {
          return {
            ...s,
            appearance: {
              ...s.appearance,
              opacity: clampedOpacity
            }
          };
        }
        return s;
      });
    });
  }

  public applySelectionPreset(presetId: string) {
    this.mutate((draft) => {
      const selectedIds = this.selectionManager.getSelectedIds(draft);
      const preset = getPresetById(presetId);

      if (!preset) return;

      draft.shapes = draft.shapes.map(s => {
        if (selectedIds.includes(s.id) && preset.applicableTo.includes(s.type)) {
          return {
            ...s,
            appearance: { ...preset.appearance }
          };
        }
        return s;
      });
    });
  }

  // ============================================================================
  // Wall Placement & Creation
  // ============================================================================

  public beginWallDrawing(point: Point, options: WallCreationOptions = {}) {
    this.mutate((draft) => {
      this.toolManager.beginWallDrawing(draft, point, options);
    }, { recordHistory: false });
  }

  public updateActiveWall(point: Point) {
    this.mutate((draft) => {
      this.toolManager.updateActiveWall(draft, point);
    }, { recordHistory: false });
  }

  public commitActiveWall() {
    this.mutate((draft) => {
      this.toolManager.commitActiveWall(draft);
    });
  }

  public cancelActiveWall() {
    this.mutate((draft) => {
      this.toolManager.cancelActiveWall(draft);
    }, { recordHistory: false });
  }

  public beginOpeningPlacement(point: Point, options: OpeningPlacementOptions = {}) {
    this.mutate((draft) => {
      this.toolManager.beginOpeningPlacement(draft, point, options);
    }, { recordHistory: false });
  }

  public updateActiveOpening(point: Point) {
    this.mutate((draft) => {
      this.toolManager.updateActiveOpening(draft, point);
    }, { recordHistory: false });
  }

  public commitActiveOpening() {
    this.mutate((draft) => {
      this.toolManager.commitActiveOpening(draft);
    });
  }

  public cancelActiveOpening() {
    this.mutate((draft) => {
      this.toolManager.cancelActiveOpening(draft);
    }, { recordHistory: false });
  }

  public insertOpening(point: Point, options: OpeningPlacementOptions = {}) {
    this.mutate((draft) => {
      this.toolManager.insertOpening(draft, point, options);
    });
  }

  public insertAsset(point: Point, options: AssetPlacementOptions) {
    this.mutate((draft) => {
      this.toolManager.insertAsset(draft, point, options);
    });
  }

  public setActiveWallThickness(thickness: number) {
    if (thickness <= 0) return;
    this.mutate((draft) => {
      this.toolManager.setActiveWallThickness(draft, thickness);
    }, { recordHistory: false });
  }

  public setActiveWallAlignment(alignment: WallAlignment) {
    this.mutate((draft) => {
      this.toolManager.setActiveWallAlignment(draft, alignment);
    }, { recordHistory: false });
  }

  public createWallSegment(start: Point, end: Point, options: WallCreationOptions = {}) {
    this.mutate((draft) => {
      this.toolManager.createWallSegment(draft, start, end, options);
    });
  }

  public drawWallRectangle(start: Point, end: Point, options: WallCreationOptions = {}) {
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    const minDimension = 0.0005;
    if (width < minDimension || height < minDimension) {
      return;
    }

    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    const corners: Point[] = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];

    this.beginHistoryBatch('wall.rectangle');
    let succeeded = false;
    try {
      for (let i = 0; i < corners.length; i += 1) {
        const current = corners[i];
        const next = corners[(i + 1) % corners.length];
        this.createWallSegment(current, next, options);
      }
      succeeded = true;
    } finally {
      if (succeeded) {
        this.commitHistoryBatch();
      } else {
        this.cancelHistoryBatch();
      }
    }
  }

  public offsetWall(
    wallId: string,
    distance: number,
    direction: WallOffsetDirection,
    overrides: WallCreationOptions = {}
  ) {
    if (distance <= 0) {
      return;
    }
    const wall = this.snapshot.shapes.find(
      (shape): shape is WallShape => shape.type === 'wall' && shape.id === wallId
    );
    if (!wall || wall.centerline.length < 2) {
      return;
    }
    const start = wall.centerline[0];
    const end = wall.centerline[wall.centerline.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-6) {
      return;
    }
    const unitPerp = { x: -dy / length, y: dx / length };
    const multiplier = direction === 'right' ? -1 : 1;
    const offsetVec = {
      x: unitPerp.x * distance * multiplier,
      y: unitPerp.y * distance * multiplier,
    };
    const newStart = { x: start.x + offsetVec.x, y: start.y + offsetVec.y };
    const newEnd = { x: end.x + offsetVec.x, y: end.y + offsetVec.y };
    const baseOptions: WallCreationOptions = {
      thickness: overrides.thickness ?? wall.thickness,
      height: overrides.height ?? wall.height,
      alignment: overrides.alignment ?? wall.alignment,
      materialId: overrides.materialId ?? wall.materialId,
    };
    this.mutate((draft) => {
      this.toolManager.createWallSegment(draft, newStart, newEnd, baseOptions);
    });
  }

  public createRoom(points: Point[], options: RoomCreationOptions = {}) {
    if (!points || points.length < 3) return;
    this.mutate((draft) => {
      this.toolManager.createRoom(draft, points, options);
    });
  }

  /**
   * Split a wall at a given point, creating two new wall segments that share that point.
   * This enables T-junction creation where new walls can connect at the split point.
   * @param wallId - The wall to split
   * @param splitPoint - The point along the wall where to split (will be projected onto centerline)
   * @returns The IDs of the two new wall segments, or null if split failed
   */
  public splitWallAtPoint(wallId: string, splitPoint: Point): { segment1Id: string; segment2Id: string } | null {
    const wall = this.snapshot.shapes.find(
      (shape): shape is WallShape => shape.type === 'wall' && shape.id === wallId
    );
    if (!wall || wall.centerline.length < 2) {
      return null;
    }

    const start = wall.centerline[0];
    const end = wall.centerline[wall.centerline.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-6) {
      return null;
    }

    // Project splitPoint onto the wall centerline
    const t = Math.max(0.01, Math.min(0.99, 
      ((splitPoint.x - start.x) * dx + (splitPoint.y - start.y) * dy) / (length * length)
    ));
    
    // Don't split too close to endpoints
    if (t < 0.05 || t > 0.95) {
      return null;
    }

    const projectedPoint = {
      x: start.x + dx * t,
      y: start.y + dy * t,
    };

    const baseOptions: WallCreationOptions = {
      thickness: wall.thickness,
      height: wall.height,
      alignment: wall.alignment,
      materialId: wall.materialId,
    };

    let segment1Id: string | null = null;
    let segment2Id: string | null = null;

    this.beginHistoryBatch('wall.split');
    try {
      // Remove the original wall
      this.mutate((draft) => {
        draft.shapes = draft.shapes.filter((s) => s.id !== wallId);
      }, { recordHistory: true });

      // Create segment 1 (start to split point)
      this.mutate((draft) => {
        const segment1 = this.geometryManager.buildWallShape(start, projectedPoint, baseOptions);
        segment1Id = segment1.id;
        draft.shapes = [...draft.shapes, segment1];
      }, { recordHistory: true });

      // Create segment 2 (split point to end)
      this.mutate((draft) => {
        const segment2 = this.geometryManager.buildWallShape(projectedPoint, end, baseOptions);
        segment2Id = segment2.id;
        draft.shapes = [...draft.shapes, segment2];
        this.geometryManager.detectAndUpdateRooms(draft);
        this.geometryManager.updateWallBoundZones(draft);
      }, { recordHistory: true });

      this.commitHistoryBatch();
      return segment1Id && segment2Id ? { segment1Id, segment2Id } : null;
    } catch {
      this.cancelHistoryBatch();
      return null;
    }
  }




  public flipOpening(openingId: string, flipState: Partial<OpeningSwingState>) {
    this.mutate((draft) => {
      const opening = draft.shapes.find((s): s is OpeningShape => s.type === 'opening' && s.id === openingId);
      if (!opening) return;

      opening.swing = {
        ...opening.swing,
        ...flipState
      };
    });
  }

  // ============================================================================
  // Trim Tool Methods
  // ============================================================================

  /**
   * Set the first trim point on a wall. Projects the point onto the wall centerline.
   */
  public setTrimFirstPoint(point: Point, wallId: string) {
    const wall = this.snapshot.shapes.find(
      (shape): shape is WallShape => shape.type === 'wall' && shape.id === wallId
    );
    if (!wall || wall.centerline.length < 2) {
      return;
    }

    // Project point onto wall centerline
    const start = wall.centerline[0];
    const end = wall.centerline[wall.centerline.length - 1];
    const projectedPoint = this.projectPointOntoSegment(point, start, end);

    this.mutate((draft) => {
      draft.trimState = {
        wallId,
        firstPoint: projectedPoint,
        secondPoint: null,
        highlightSegment: null,
        isConfirmed: false,
      };
    }, { recordHistory: false });
  }

  /**
   * Set the second trim point on the same wall and compute the highlight segment.
   * @param point The point to project onto the wall
   * @param confirmed If true, the point is confirmed (clicked) and won't follow the mouse anymore
   */
  public setTrimSecondPoint(point: Point, confirmed: boolean = false) {
    const { wallId, firstPoint, isConfirmed } = this.snapshot.trimState;
    if (!wallId || !firstPoint) {
      return;
    }
    
    // If already confirmed, don't update from mouse movement
    if (isConfirmed && !confirmed) {
      return;
    }

    const wall = this.snapshot.shapes.find(
      (shape): shape is WallShape => shape.type === 'wall' && shape.id === wallId
    );
    if (!wall || wall.centerline.length < 2) {
      return;
    }

    // Project point onto wall centerline
    const start = wall.centerline[0];
    const end = wall.centerline[wall.centerline.length - 1];
    const projectedPoint = this.projectPointOntoSegment(point, start, end);

    // Determine which point comes first along the wall
    const t1 = this.getParameterOnSegment(firstPoint, start, end);
    const t2 = this.getParameterOnSegment(projectedPoint, start, end);

    const segmentStart = t1 < t2 ? firstPoint : projectedPoint;
    const segmentEnd = t1 < t2 ? projectedPoint : firstPoint;

    this.mutate((draft) => {
      draft.trimState = {
        wallId,
        firstPoint,
        secondPoint: projectedPoint,
        highlightSegment: { start: segmentStart, end: segmentEnd },
        isConfirmed: confirmed,
      };
    }, { recordHistory: false });
  }

  /**
   * Clear the trim state.
   */
  public clearTrimState() {
    // Only mutate if trim state is not already clear (prevents infinite loops)
    const current = this.snapshot.trimState;
    if (!current || (current.wallId === null && current.firstPoint === null && current.secondPoint === null && current.highlightSegment === null && !current.isConfirmed)) {
      return; // Already clear, no mutation needed
    }
    this.mutate((draft) => {
      draft.trimState = { ...DEFAULT_TRIM_STATE };
    }, { recordHistory: false });
  }

  /**
   * Execute the trim operation: remove the section between the two points,
   * leaving two separate wall segments.
   */
  public executeTrim(): boolean {
    const trimState = this.snapshot.trimState;
    if (!trimState) {
      return false;
    }
    const { wallId, highlightSegment } = trimState;
    if (!wallId || !highlightSegment) {
      return false;
    }

    const wall = this.snapshot.shapes.find(
      (shape): shape is WallShape => shape.type === 'wall' && shape.id === wallId
    );
    if (!wall || wall.centerline.length < 2) {
      this.clearTrimState();
      return false;
    }

    const wallStart = wall.centerline[0];
    const wallEnd = wall.centerline[wall.centerline.length - 1];
    
    // Get the trim segment endpoints
    const trimStart = highlightSegment.start;
    const trimEnd = highlightSegment.end;

    // Get parameters to check if we're trimming endpoints
    const t1 = this.getParameterOnSegment(trimStart, wallStart, wallEnd);
    const t2 = this.getParameterOnSegment(trimEnd, wallStart, wallEnd);

    const baseOptions: WallCreationOptions = {
      thickness: wall.thickness,
      height: wall.height,
      alignment: wall.alignment,
      materialId: wall.materialId,
    };

    this.beginHistoryBatch('wall.trim');
    try {
      // Remove the original wall
      this.mutate((draft) => {
        draft.shapes = draft.shapes.filter((s) => s.id !== wallId);
      }, { recordHistory: true });

      // Create segment 1 (wall start to trim start) if there's meaningful length
      if (t1 > 0.01) {
        this.mutate((draft) => {
          const segment1 = this.geometryManager.buildWallShape(wallStart, trimStart, baseOptions);
          draft.shapes = [...draft.shapes, segment1];
        }, { recordHistory: true });
      }

      // Create segment 2 (trim end to wall end) if there's meaningful length
      if (t2 < 0.99) {
        this.mutate((draft) => {
          const segment2 = this.geometryManager.buildWallShape(trimEnd, wallEnd, baseOptions);
          draft.shapes = [...draft.shapes, segment2];
          this.geometryManager.detectAndUpdateRooms(draft);
          this.geometryManager.updateWallBoundZones(draft);
        }, { recordHistory: true });
      }

      this.commitHistoryBatch();
      this.clearTrimState();
      return true;
    } catch {
      this.cancelHistoryBatch();
      this.clearTrimState();
      return false;
    }
  }

  /**
   * Project a point onto a line segment and return the projected point.
   */
  private projectPointOntoSegment(point: Point, segStart: Point, segEnd: Point): Point {
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq < 1e-9) {
      return segStart;
    }

    let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    return {
      x: segStart.x + dx * t,
      y: segStart.y + dy * t,
    };
  }

  /**
   * Get the parameter t (0-1) of a point along a segment.
   */
  private getParameterOnSegment(point: Point, segStart: Point, segEnd: Point): number {
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq < 1e-9) {
      return 0;
    }

    const t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lenSq;
    return Math.max(0, Math.min(1, t));
  }

  public zoneCommit() {
    this.mutate((draft) => {
      this.toolManager.zoneCommit(draft);
    });
  }

  public createZoneFromPoint(point: Point) {
    this.mutate((draft) => {
      this.toolManager.createZoneFromPoint(draft, point);
    });
  }

  public createZoneFromPolygon(polygon: Point[]) {
    this.mutate((draft) => {
      this.toolManager.createZoneFromPolygon(draft, polygon);
    });
  }

  public setZoneDisabled(zoneId: string, disabled: boolean) {
    this.mutate((draft) => {
      const zone = draft.shapes.find(s => s.id === zoneId && s.type === 'zone');
      if (zone && zone.type === 'zone') {
        draft.shapes = draft.shapes.map(s => {
          if (s.id === zoneId && s.type === 'zone') {
            return { ...s, disabled };
          }
          return s;
        });
      }
    });
  }

  public setDimensionOffset(dimensionId: string, point: Point) {
    this.mutate((draft) => {
      this.toolManager.setDimensionOffset(draft, dimensionId, point);
    });
  }

  // ============================================================================
  // Trace Image / Reference Layer Commands
  // ============================================================================

  /**
   * Add a new trace/reference image to the canvas
   */
  public addTraceImage(image: Shape) {
    if (image.type !== 'image') return;
    this.mutate((draft) => {
      // Add at the beginning of shapes array so it renders behind everything
      draft.shapes = [image, ...draft.shapes];
    });
  }

  /**
   * Update a trace image's properties
   */
  public updateTraceImage(imageId: string, updates: Partial<Shape>) {
    this.mutate((draft) => {
      draft.shapes = draft.shapes.map(shape => {
        if (shape.id === imageId && shape.type === 'image') {
          return { ...shape, ...updates } as typeof shape;
        }
        return shape;
      }) as typeof draft.shapes;
    });
  }

  /**
   * Remove a trace image from the canvas
   */
  public removeTraceImage(imageId: string) {
    this.mutate((draft) => {
      draft.shapes = draft.shapes.filter(shape => 
        !(shape.id === imageId && shape.type === 'image')
      );
    });
  }

  /**
   * Get all trace images from the snapshot
   */
  public getTraceImages(): Shape[] {
    return this.snapshot.shapes.filter(shape => shape.type === 'image');
  }

  /**
   * Set trace image visibility
   */
  public setTraceImageVisibility(imageId: string, visible: boolean) {
    this.updateTraceImage(imageId, { visible });
  }

  /**
   * Set trace image locked state
   */
  public setTraceImageLocked(imageId: string, locked: boolean) {
    this.updateTraceImage(imageId, { locked });
  }

  /**
   * Set trace image opacity
   */
  public setTraceImageOpacity(imageId: string, opacity: number) {
    this.updateTraceImage(imageId, { opacity: Math.max(0.1, Math.min(1, opacity)) });
  }

  /**
   * Toggle all trace images visibility
   */
  public toggleAllTraceImagesVisibility(visible: boolean) {
    this.mutate((draft) => {
      draft.shapes = draft.shapes.map(shape => {
        if (shape.type === 'image') {
          return { ...shape, visible };
        }
        return shape;
      });
    });
  }

  /**
   * Lock all trace images
   */
  public lockAllTraceImages() {
    this.mutate((draft) => {
      draft.shapes = draft.shapes.map(shape => {
        if (shape.type === 'image') {
          return { ...shape, locked: true };
        }
        return shape;
      });
    });
  }
}



// -------------------------- Command bus ------------------------------------

export type WorkspaceCommand =
  | { type: 'workspace/select_tool'; tool: ToolType }
  | { type: 'workspace/set_guideline_orientation'; orientation: GuidelineOrientation }
  | { type: 'workspace/set_drawing_mode'; mode: DrawingMode }
  | { type: 'workspace/set_show_measurements'; show: boolean }
  | { type: 'workspace/set_walls_locked'; locked: boolean }
  | { type: 'workspace/set_marker_options'; options: { label?: string; color?: string } }
  | { type: 'workspace/click'; point: Point }
  | { type: 'workspace/update_cursor'; point: Point }
  | { type: 'workspace/select_shapes'; ids: string[]; append?: boolean }
  | { type: 'workspace/move_selection'; delta: Point }
  | { type: 'workspace/rotate_selection'; angle: number; pivot?: Point }
  | { type: 'workspace/resize_line_handle'; point: Point; handle: 'start' | 'end' }
  | { type: 'workspace/resize_polyline_corner'; point: Point; corner: 'tl' | 'tr' | 'bl' | 'br' }
  | { type: 'workspace/resize_rectangle_edge'; point: Point; edge: 'top' | 'right' | 'bottom' | 'left' }
  | { type: 'workspace/delete_selection' }
  | { type: 'workspace/paste_shapes'; shapes: Shape[]; offset?: Point }
  | { type: 'workspace/confirm_current_shape' }
  | { type: 'workspace/commit_chain_session' }
  | { type: 'workspace/abort_chain_session' }
  | { type: 'workspace/cancel_drawing' }
  | { type: 'workspace/undo' }
  | { type: 'workspace/redo' }
  | { type: 'workspace/reset'; snapshot?: Partial<WorkspaceSnapshot> }
  | { type: 'workspace/apply_snapshot'; snapshot: WorkspaceSnapshot }
  | { type: 'workspace/history_begin_batch'; source?: string }
  | { type: 'workspace/history_commit_batch' }
  | { type: 'workspace/history_cancel_batch' }
  | { type: 'workspace/wall_begin'; point: Point; options?: WallCreationOptions }
  | { type: 'workspace/wall_update'; point: Point }
  | { type: 'workspace/wall_commit' }
  | { type: 'workspace/wall_cancel' }
  | { type: 'workspace/create_wall'; start: Point; end: Point; options?: WallCreationOptions }
  | { type: 'workspace/create_room'; points: Point[]; label?: string }
  | { type: 'workspace/wall_set_thickness'; thickness: number }
  | { type: 'workspace/wall_set_alignment'; alignment: WallAlignment }
  | { type: 'workspace/wall_rectangle'; start: Point; end: Point; options?: WallCreationOptions }
  | {
    type: 'workspace/wall_offset';
    wallId: string;
    distance: number;
    direction: WallOffsetDirection;
    options?: WallCreationOptions;
  }
  | { type: 'workspace/selected_wall_set_thickness'; thickness: number }
  | { type: 'workspace/selected_wall_set_height'; height: number }
  | { type: 'workspace/selected_wall_set_length'; length: number }
  | { type: 'workspace/selected_wall_set_alignment'; alignment: WallAlignment }
  | { type: 'workspace/snap_selected_walls_orthogonal' }
  | { type: 'workspace/wall_resize_handle'; point: Point; handle: 'start' | 'end' }
  | { type: 'workspace/wall_set_control_point'; point: Point | null }
  | { type: 'workspace/resize_room_corner'; point: Point; corner: 'tl' | 'tr' | 'bl' | 'br' }
  | { type: 'workspace/selected_room_set_label'; label: string | null }
  | { type: 'workspace/selected_opening_set_size'; width?: number; height?: number }
  | { type: 'workspace/selected_opening_set_category'; category: OpeningCategory }
  | { type: 'workspace/selected_opening_set_metadata'; metadata: Record<string, string | number | boolean | null> }
  | { type: 'workspace/opening_begin'; point: Point; options?: OpeningPlacementOptions }
  | { type: 'workspace/opening_update'; point: Point }
  | { type: 'workspace/opening_commit' }
  | { type: 'workspace/opening_cancel' }
  | { type: 'workspace/opening_insert'; point: Point; options?: OpeningPlacementOptions }
  | { type: 'workspace/asset_insert'; point: Point; options: AssetPlacementOptions }
  | { type: 'workspace/opening_flip'; openingId: string; flipState: Partial<OpeningSwingState> }
  | { type: 'workspace/opening_resize_handle'; point: Point; handle: 'start' | 'end' }
  | { type: 'workspace/zone_commit' }
  | { type: 'workspace/create_zone_from_point'; point: Point }
  | { type: 'workspace/create_zone_from_polygon'; polygon: Point[] }
  | { type: 'workspace/zone_set_disabled'; zoneId: string; disabled: boolean }
  | { type: 'workspace/set_dimension_offset'; dimensionId: string; point: Point }
  // Universal styling commands
  | { type: 'workspace/shape_set_fill'; shapeId: string; fill: import('../../../components/Workspace/types').FillStyle }
  | { type: 'workspace/shape_set_stroke'; shapeId: string; stroke: import('../../../components/Workspace/types').StrokeStyle }
  | { type: 'workspace/shape_set_opacity'; shapeId: string; opacity: number }
  | { type: 'workspace/shape_set_blend_mode'; shapeId: string; blendMode: import('../../../components/Workspace/types').BlendMode }
  | { type: 'workspace/shape_set_shadow'; shapeId: string; shadow: import('../../../components/Workspace/types').ShadowStyle | null }
  | { type: 'workspace/shape_apply_preset'; shapeId: string; presetId: string }
  | { type: 'workspace/selection_set_fill'; fill: import('../../../components/Workspace/types').FillStyle }
  | { type: 'workspace/selection_set_stroke'; stroke: import('../../../components/Workspace/types').StrokeStyle }
  | { type: 'workspace/selection_set_opacity'; opacity: number }
  | { type: 'workspace/selection_apply_preset'; presetId: string }
  | { type: 'workspace/update_marker'; markerId: string; updates: { label?: string; color?: string } }
  // BIM property commands
  | { type: 'workspace/shape_set_bim_name'; shapeId: string; name: string | undefined }
  | { type: 'workspace/shape_set_bim_tag'; shapeId: string; tag: string | undefined }
  | { type: 'workspace/shape_set_bim_description'; shapeId: string; description: string | undefined }
  | { type: 'workspace/shape_set_classification'; shapeId: string; classification: import('../../../components/Workspace/types').BIMShapeProperties['classification'] | null }
  // Trace image / reference layer commands
  | { type: 'workspace/trace_image_add'; image: import('../../../components/Workspace/types').ImageShape }
  | { type: 'workspace/trace_image_update'; imageId: string; updates: Partial<import('../../../components/Workspace/types').ImageShape> }
  | { type: 'workspace/trace_image_remove'; imageId: string }
  | { type: 'workspace/trace_image_set_visibility'; imageId: string; visible: boolean }
  | { type: 'workspace/trace_image_set_locked'; imageId: string; locked: boolean }
  | { type: 'workspace/trace_image_set_opacity'; imageId: string; opacity: number }
  | { type: 'workspace/trace_image_toggle_all_visibility'; visible: boolean }
  | { type: 'workspace/trace_image_lock_all' }
  // Group/Ungroup commands
  | { type: 'workspace/group_selection' }
  | { type: 'workspace/ungroup_selection' }
  // Mirror command
  | { type: 'workspace/mirror_selection'; axis: { point1: Point; point2: Point }; keepOriginal?: boolean }
  // Fillet command
  | { type: 'workspace/fillet'; shapeId1: string; shapeId2: string; radius: number }
  // Explode command
  | { type: 'workspace/explode_selection' };

export interface WorkspaceCommandResult {
  snapshot: WorkspaceSnapshot;
  events: string[];
}

export class WorkspaceCommandBus {
  private readonly state: WorkspaceState;

  constructor(state: WorkspaceState) {
    this.state = state;
  }

  execute(command: WorkspaceCommand): WorkspaceCommandResult {
    switch (command.type) {
      case 'workspace/select_tool':
        this.state.setTool(command.tool);
        return this.result('tool.changed');
      case 'workspace/set_guideline_orientation':
        this.state.setGuidelineOrientation(command.orientation);
        return this.result('guideline.orientation.changed', { orientation: command.orientation });
      case 'workspace/set_drawing_mode':
        this.state.setDrawingMode(command.mode);
        return this.result('workspace.drawing_mode.changed', { mode: command.mode });
      case 'workspace/set_show_measurements':
        this.state.setShowMeasurements(command.show);
        return this.result('measurements.visibility.changed', { show: command.show });
      case 'workspace/set_walls_locked':
        this.state.setWallsLocked(command.locked);
        return this.result('walls.lock.changed', { locked: command.locked });
      case 'workspace/set_marker_options':
        this.state.setMarkerOptions(command.options);
        return this.result('marker.options.changed', { options: command.options });
      case 'workspace/click':
        this.state.handleClick(command.point);
        return this.result('canvas.click', { point: command.point });
      case 'workspace/update_cursor':
        this.state.updateCursor(command.point);
        return this.result('cursor.move', { point: command.point });
      case 'workspace/select_shapes':
        this.state.selectShape(command.ids, Boolean(command.append));
        return this.result('selection.changed', { ids: command.ids });
      case 'workspace/move_selection':
        this.state.moveSelection(command.delta);
        return this.result('selection.moved', { delta: command.delta });
      case 'workspace/rotate_selection':
        this.state.rotateSelection(command.angle, command.pivot);
        return this.result('selection.rotated', { angle: command.angle, pivot: command.pivot });
      case 'workspace/resize_line_handle':
        this.state.resizeLineHandle(command.point, command.handle);
        return this.result('selection.resized.line', { handle: command.handle });
      case 'workspace/resize_polyline_corner':
        this.state.resizePolylineCorner(command.point, command.corner);
        return this.result('selection.resized.corner', { corner: command.corner });
      case 'workspace/resize_rectangle_edge':
        this.state.resizeRectangleEdge(command.point, command.edge);
        return this.result('selection.resized.rectangle_edge', { edge: command.edge });
      case 'workspace/delete_selection':
        this.state.deleteSelection();
        return this.result('selection.deleted');
      case 'workspace/paste_shapes':
        this.state.pasteShapes(command.shapes, command.offset);
        return this.result('shapes.pasted');
      case 'workspace/confirm_current_shape':
        this.state.confirmCurrentShape();
        return this.result('drawing.confirmed');
      case 'workspace/commit_chain_session':
        this.state.commitChainSession();
        return this.result('chain.committed');
      case 'workspace/abort_chain_session':
        this.state.abortChainSession();
        return this.result('chain.aborted');
      case 'workspace/cancel_drawing':
        this.state.cancelDrawing();
        return this.result('drawing.cancelled');
      case 'workspace/undo':
        if (this.state.undoDrawingStep()) {
          return this.result('history.undo.drawing');
        }
        this.state.undo();
        return this.result('history.undo');
      case 'workspace/redo':
        if (this.state.redoDrawingStep()) {
          return this.result('history.redo.drawing');
        }
        this.state.redo();
        return this.result('history.redo');
      case 'workspace/reset':
        this.state.reset(command.snapshot);
        return this.result('workspace.reset');
      case 'workspace/apply_snapshot':
        this.state.applySnapshot(command.snapshot);
        return this.result('workspace.snapshot.applied');
      case 'workspace/history_begin_batch':
        this.state.beginHistoryBatch(command.source);
        return this.result('history.batch.begin', command.source ? { source: command.source } : undefined);
      case 'workspace/history_commit_batch':
        this.state.commitHistoryBatch();
        return this.result('history.batch.commit');
      case 'workspace/history_cancel_batch':
        this.state.cancelHistoryBatch();
        return this.result('history.batch.cancel');
      case 'workspace/wall_begin':
        this.state.beginWallDrawing(command.point, command.options);
        return this.result('wall.begin');
      case 'workspace/wall_update':
        this.state.updateActiveWall(command.point);
        return this.result('wall.update', { point: command.point });
      case 'workspace/wall_commit':
        this.state.commitActiveWall();
        return this.result('wall.commit');
      case 'workspace/wall_cancel':
        this.state.cancelActiveWall();
        return this.result('wall.cancel');
      case 'workspace/opening_begin':
        this.state.beginOpeningPlacement(command.point, command.options);
        return this.result('opening.begin');
      case 'workspace/opening_update':
        this.state.updateActiveOpening(command.point);
        return this.result('opening.update', { point: command.point });
      case 'workspace/opening_commit':
        this.state.commitActiveOpening();
        return this.result('opening.commit');
      case 'workspace/opening_cancel':
        this.state.cancelActiveOpening();
        return this.result('opening.cancel');
      case 'workspace/opening_insert':
        this.state.insertOpening(command.point, command.options);
        return this.result('opening.insert');
      case 'workspace/asset_insert':
        this.state.insertAsset(command.point, command.options);
        return this.result('asset.insert');
      case 'workspace/opening_flip':
        this.state.flipOpening(command.openingId, command.flipState);
        return this.result('opening.flip', { openingId: command.openingId });
      case 'workspace/opening_resize_handle':
        this.state.resizeOpeningHandle(command.point, command.handle);
        return this.result('opening.resize_handle', { handle: command.handle });
      case 'workspace/create_wall':
        this.state.createWallSegment(command.start, command.end, command.options);
        return this.result('wall.create');
      case 'workspace/create_room':
        this.state.createRoom(command.points, { label: command.label });
        return this.result('room.create');
      case 'workspace/wall_rectangle':
        this.state.drawWallRectangle(command.start, command.end, command.options);
        return this.result('wall.rectangle');
      case 'workspace/wall_offset':
        this.state.offsetWall(command.wallId, command.distance, command.direction, command.options);
        return this.result('wall.offset');
      case 'workspace/selected_room_set_label':
        this.state.setSelectedRoomLabel(command.label ?? null);
        return this.result('room.selection.set_label', { label: command.label ?? null });
      case 'workspace/selected_opening_set_size':
        this.state.setSelectedOpeningSize({ width: command.width, height: command.height });
        return this.result('opening.selection.set_size', { width: command.width, height: command.height });
      case 'workspace/selected_opening_set_category':
        this.state.setSelectedOpeningCategory(command.category);
        return this.result('opening.selection.set_category', { category: command.category });
      case 'workspace/selected_opening_set_metadata':
        this.state.setSelectedOpeningMetadata(command.metadata);
        return this.result('opening.selection.set_metadata', { metadata: command.metadata });
      case 'workspace/wall_set_thickness':
        this.state.setActiveWallThickness(command.thickness);
        return this.result('wall.set_thickness', { thickness: command.thickness });
      case 'workspace/wall_set_alignment':
        this.state.setActiveWallAlignment(command.alignment);
        return this.result('wall.set_alignment', { alignment: command.alignment });
      case 'workspace/selected_wall_set_thickness':
        this.state.setSelectedWallThickness(command.thickness);
        return this.result('wall.selection.set_thickness', { thickness: command.thickness });
      case 'workspace/selected_wall_set_height':
        this.state.setSelectedWallHeight(command.height);
        return this.result('wall.selection.set_height', { height: command.height });
      case 'workspace/selected_wall_set_length':
        this.state.setSelectedWallLength(command.length);
        return this.result('wall.selection.set_length', { length: command.length });
      case 'workspace/selected_wall_set_alignment':
        this.state.setSelectedWallAlignment(command.alignment);
        return this.result('wall.selection.set_alignment', { alignment: command.alignment });
      case 'workspace/snap_selected_walls_orthogonal':
        this.state.snapSelectedWallsOrthogonal();
        return this.result('wall.selection.snap_orthogonal');
      case 'workspace/wall_resize_handle':
        this.state.resizeWallHandle(command.point, command.handle);
        return this.result('wall.resize_handle', { handle: command.handle });
      case 'workspace/wall_set_control_point':
        this.state.setWallControlPoint(command.point);
        return this.result('wall.set_control_point');
      case 'workspace/resize_room_corner':
        this.state.resizeRoomCorner(command.point, command.corner);
        return this.result('room.resize_corner', { corner: command.corner });
      case 'workspace/zone_commit':
        this.state.zoneCommit();
        return this.result('zone.commit');
      case 'workspace/create_zone_from_point':
        this.state.createZoneFromPoint(command.point);
        return this.result('zone.created_from_walls');
      case 'workspace/create_zone_from_polygon':
        this.state.createZoneFromPolygon(command.polygon);
        return this.result('zone.created_from_polygon');
      case 'workspace/zone_set_disabled':
        this.state.setZoneDisabled(command.zoneId, command.disabled);
        return this.result('zone.disabled_changed');
      case 'workspace/set_dimension_offset':
        this.state.setDimensionOffset(command.dimensionId, command.point);
        return this.result('dimension.offset_changed');

      // Universal styling commands
      case 'workspace/shape_set_fill':
        this.state.setShapeFill(command.shapeId, command.fill);
        return this.result('shape.fill_changed');

      case 'workspace/shape_set_stroke':
        this.state.setShapeStroke(command.shapeId, command.stroke);
        return this.result('shape.stroke_changed');

      case 'workspace/shape_set_opacity':
        this.state.setShapeOpacity(command.shapeId, command.opacity);
        return this.result('shape.opacity_changed');

      case 'workspace/shape_set_blend_mode':
        this.state.setShapeBlendMode(command.shapeId, command.blendMode);
        return this.result('shape.blend_mode_changed');

      case 'workspace/shape_set_shadow':
        this.state.setShapeShadow(command.shapeId, command.shadow);
        return this.result('shape.shadow_changed');

      case 'workspace/shape_apply_preset':
        this.state.applyStylePreset(command.shapeId, command.presetId);
        return this.result('shape.preset_applied');

      case 'workspace/selection_set_fill':
        this.state.setSelectionFill(command.fill);
        return this.result('selection.fill_changed');

      case 'workspace/selection_set_stroke':
        this.state.setSelectionStroke(command.stroke);
        return this.result('selection.stroke_changed');

      case 'workspace/selection_set_opacity':
        this.state.setSelectionOpacity(command.opacity);
        return this.result('selection.opacity_changed');

      case 'workspace/selection_apply_preset':
        this.state.applySelectionPreset(command.presetId);
        return this.result('selection.preset_applied');

      case 'workspace/update_marker':
        this.state.updateMarker(command.markerId, command.updates);
        return this.result('marker.updated', { markerId: command.markerId });

      // BIM property commands
      case 'workspace/shape_set_bim_name':
        this.state.setShapeBIMName(command.shapeId, command.name);
        return this.result('shape.bim_name_changed');

      case 'workspace/shape_set_bim_tag':
        this.state.setShapeBIMTag(command.shapeId, command.tag);
        return this.result('shape.bim_tag_changed');

      case 'workspace/shape_set_bim_description':
        this.state.setShapeBIMDescription(command.shapeId, command.description);
        return this.result('shape.bim_description_changed');

      case 'workspace/shape_set_classification':
        this.state.setShapeClassification(command.shapeId, command.classification);
        return this.result('shape.classification_changed');

      // Trace image / reference layer commands
      case 'workspace/trace_image_add':
        if (!command.image) {
          return this.result('trace_image.error', { error: 'missing image' });
        }
        this.state.addTraceImage(command.image);
        return this.result('trace_image.added', { imageId: command.image.id });

      case 'workspace/trace_image_update':
        this.state.updateTraceImage(command.imageId, command.updates);
        return this.result('trace_image.updated', { imageId: command.imageId });

      case 'workspace/trace_image_remove':
        this.state.removeTraceImage(command.imageId);
        return this.result('trace_image.removed', { imageId: command.imageId });

      case 'workspace/trace_image_set_visibility':
        this.state.setTraceImageVisibility(command.imageId, command.visible);
        return this.result('trace_image.visibility_changed', { imageId: command.imageId, visible: command.visible });

      case 'workspace/trace_image_set_locked':
        this.state.setTraceImageLocked(command.imageId, command.locked);
        return this.result('trace_image.locked_changed', { imageId: command.imageId, locked: command.locked });

      case 'workspace/trace_image_set_opacity':
        this.state.setTraceImageOpacity(command.imageId, command.opacity);
        return this.result('trace_image.opacity_changed', { imageId: command.imageId, opacity: command.opacity });

      case 'workspace/trace_image_toggle_all_visibility':
        this.state.toggleAllTraceImagesVisibility(command.visible);
        return this.result('trace_image.all_visibility_changed', { visible: command.visible });

      case 'workspace/trace_image_lock_all':
        this.state.lockAllTraceImages();
        return this.result('trace_image.all_locked');

      // Group/Ungroup commands
      case 'workspace/group_selection':
        this.state.groupSelection();
        return this.result('selection.grouped');

      case 'workspace/ungroup_selection':
        this.state.ungroupSelection();
        return this.result('selection.ungrouped');

      // Mirror command
      case 'workspace/mirror_selection':
        this.state.mirrorSelection(command.axis, command.keepOriginal);
        return this.result('selection.mirrored');

      // Fillet command
      case 'workspace/fillet':
        this.state.createFillet(command.shapeId1, command.shapeId2, command.radius);
        return this.result('fillet.created');

      // Explode command
      case 'workspace/explode_selection':
        this.state.explodeSelection();
        return this.result('selection.exploded');

      default:
        console.warn('Unknown command type:', (command as any).type);
        return this.result();
    }
  }

  private result(event?: string, payload?: Record<string, unknown>): WorkspaceCommandResult {
    return {
      snapshot: this.state.getSnapshot(),
      events: event ? [payload ? `${event}:${JSON.stringify(payload)}` : event] : [],
    };
  }
}

// -------------------------- RL bindings ------------------------------------

export interface StopCondition {
  done: boolean;
  reason?: string;
}

export interface StepResult<Observation> {
  observation: Observation;
  reward: number;
  stop: StopCondition;
  info?: Record<string, unknown>;
}

export interface Env<Action, Observation> {
  initialObservation(): Promise<[Observation, StopCondition]>;
  step(action: Action): Promise<StepResult<Observation>>;
}

export type RewardFunction = (
  previous: WorkspaceSnapshot,
  current: WorkspaceSnapshot,
  action: WorkspaceCommand
) => number;

export interface WorkspaceObservation extends WorkspaceSnapshot {
  stepCount: number;
}

export interface WorkspaceEnvOptions {
  rewardFn?: RewardFunction;
  maxSteps?: number;
  resetSnapshot?: Partial<WorkspaceSnapshot>;
}

export class WorkspaceEnv implements Env<WorkspaceCommand, WorkspaceObservation> {
  private readonly state: WorkspaceState;
  private readonly bus: WorkspaceCommandBus;
  private readonly rewardFn: RewardFunction;
  private readonly maxSteps: number;
  private stepCounter = 0;

  constructor(options: WorkspaceEnvOptions = {}) {
    this.state = new WorkspaceState(options.resetSnapshot);
    this.bus = new WorkspaceCommandBus(this.state);
    this.rewardFn = options.rewardFn
      ? options.rewardFn
      : ((_, __, action) => {
        // Small default shaping: encourage non-noop events.
        const productivityActions = new Set([
          'workspace/click',
          'workspace/move_selection',
          'workspace/delete_selection',
        ]);
        return productivityActions.has(action.type) ? 0.1 : 0;
      });
    this.maxSteps = typeof options.maxSteps === 'number' ? options.maxSteps : 256;
  }

  async initialObservation(): Promise<[WorkspaceObservation, StopCondition]> {
    this.state.reset();
    this.stepCounter = 0;
    return [this.buildObservation(), { done: false }];
  }

  async step(action: WorkspaceCommand): Promise<StepResult<WorkspaceObservation>> {
    const prev = this.state.getSnapshot();
    this.bus.execute(action);
    const next = this.state.getSnapshot();
    this.stepCounter += 1;

    const stop: StopCondition = this.stepCounter >= this.maxSteps ? { done: true, reason: 'max-steps' } : { done: false };
    const reward = this.rewardFn(prev, next, action);
    return {
      observation: this.buildObservation(),
      reward,
      stop,
      info: { action },
    };
  }

  private buildObservation(): WorkspaceObservation {
    return {
      ...this.state.getSnapshot(),
      stepCount: this.stepCounter,
    };
  }
}

// -------------------------- Tinker adapters -------------------------------

export interface EnvGroupBuilder {
  makeEnvs(): Promise<Env<WorkspaceCommand, WorkspaceObservation>[]>;
}

export class WorkspaceEnvGroupBuilder implements EnvGroupBuilder {
  private readonly size: number;
  private readonly options?: WorkspaceEnvOptions;

  constructor(size: number, options?: WorkspaceEnvOptions) {
    this.size = size;
    this.options = options;
  }

  async makeEnvs(): Promise<Env<WorkspaceCommand, WorkspaceObservation>[]> {
    return Array.from({ length: this.size }, () => new WorkspaceEnv(this.options));
  }
}

export interface RLDataset {
  getBatch(index: number): EnvGroupBuilder[];
}

export class WorkspaceRLDataset implements RLDataset {
  private readonly builders: EnvGroupBuilder[];

  constructor(builders: EnvGroupBuilder[]) {
    this.builders = builders;
  }

  getBatch(): EnvGroupBuilder[] {
    return this.builders;
  }
}
