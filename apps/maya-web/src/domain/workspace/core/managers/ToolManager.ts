import type {
    Point,
    Shape,
    WallShape,
    ZoneShape,
    WallOffsetDirection,
    WallAlignment,
    TextShape,
    GroupShape,
    LineShape,
    PolylineShape,
    RectangleShape,
    CurveShape,
} from '../../../../components/Workspace/types';

import type {
    MutableSnapshot,
    OpeningPlacementOptions,
    AssetPlacementOptions,
    WallCreationOptions,
    WorkspaceSnapshot,
    RoomCreationOptions,
} from '../types';
import {
    DEFAULT_WALL_THICKNESS,
    WALL_SNAP_PROXIMITY_THRESHOLD,
} from '../constants';
import {
    calculatePolygonArea,
    deepClone,
    dot,
    generateShapeId,
} from '../utils';
import { findConnectedWalls, findEnclosingWallLoop } from '../../../../components/Workspace/utils/walls';
import { getAssetById } from '../../../../components/Workspace/components/Canvas/assetRegistry';
import type { GeometryManager } from './GeometryManager';
import type { SelectionManager } from './SelectionManager';
import { BasicShapeToolManager } from './tools/BasicShapeToolManager';
import { AnnotationToolManager } from './tools/AnnotationToolManager';
import { ComplexShapeToolManager } from './tools/ComplexShapeToolManager';

interface SelectionBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export class ToolManager {
    // private drawingHistory: Shape[] = [];
    // private drawingFuture: Shape[] = [];
    private selectionManager: SelectionManager;
    private geometryManager: GeometryManager;
    private basicShapes: BasicShapeToolManager;
    private annotations: AnnotationToolManager;
    private complexShapes: ComplexShapeToolManager;

    constructor(selectionManager: SelectionManager, geometryManager: GeometryManager) {
        this.selectionManager = selectionManager;
        this.geometryManager = geometryManager;
        this.basicShapes = new BasicShapeToolManager(selectionManager, geometryManager);
        this.annotations = new AnnotationToolManager(selectionManager, geometryManager);
        this.complexShapes = new ComplexShapeToolManager(selectionManager, geometryManager);
    }

    private rotatePoint(point: Point, pivot: Point, sin: number, cos: number): Point {
        const dx = point.x - pivot.x;
        const dy = point.y - pivot.y;
        return {
            x: pivot.x + dx * cos - dy * sin,
            y: pivot.y + dx * sin + dy * cos,
        };
    }

    private rotateVector(vector: Point, sin: number, cos: number): Point {
        return {
            x: vector.x * cos - vector.y * sin,
            y: vector.x * sin + vector.y * cos,
        };
    }

    private extendBounds(bounds: SelectionBounds, point: Point) {
        if (point.x < bounds.minX) bounds.minX = point.x;
        if (point.x > bounds.maxX) bounds.maxX = point.x;
        if (point.y < bounds.minY) bounds.minY = point.y;
        if (point.y > bounds.maxY) bounds.maxY = point.y;
    }

    private accumulateShapeBounds(shape: Shape, bounds: SelectionBounds) {
        switch (shape.type) {
            case 'line':
                this.extendBounds(bounds, shape.start);
                this.extendBounds(bounds, shape.end);
                break;
            case 'polyline':
            case 'curve':
                shape.points.forEach((point) => this.extendBounds(bounds, point));
                break;
            case 'arc':
                this.extendBounds(bounds, shape.start);
                this.extendBounds(bounds, shape.end);
                this.extendBounds(bounds, shape.controlPoint);
                break;
            case 'circle':
                this.extendBounds(bounds, { x: shape.center.x - shape.radius, y: shape.center.y });
                this.extendBounds(bounds, { x: shape.center.x + shape.radius, y: shape.center.y });
                this.extendBounds(bounds, { x: shape.center.x, y: shape.center.y - shape.radius });
                this.extendBounds(bounds, { x: shape.center.x, y: shape.center.y + shape.radius });
                break;
            case 'rectangle':
                this.extendBounds(bounds, shape.start);
                this.extendBounds(bounds, shape.end);
                break;
            case 'wall':
                shape.centerline.forEach((point) => this.extendBounds(bounds, point));
                if (shape.controlPoint) {
                    this.extendBounds(bounds, shape.controlPoint);
                }
                break;
            case 'opening':
                this.extendBounds(bounds, shape.anchor);
                break;
            case 'room':
            case 'zone':
                shape.points.forEach((point) => this.extendBounds(bounds, point));
                break;
            case 'dimension':
                this.extendBounds(bounds, shape.start);
                this.extendBounds(bounds, shape.end);
                break;
            case 'text': {
                const width = shape.content.length * shape.fontSize * 0.6;
                const height = shape.fontSize * 1.2;
                let originX = shape.position.x;
                if (shape.textAlign === 'center') {
                    originX -= width / 2;
                } else if (shape.textAlign === 'right') {
                    originX -= width;
                }
                const originY = shape.position.y - shape.fontSize * 0.7;
                this.extendBounds(bounds, { x: originX, y: originY });
                this.extendBounds(bounds, { x: originX + width, y: originY + height });
                break;
            }
            case 'guideline':
                if (shape.orientation === 'freeform' && shape.start && shape.end) {
                    this.extendBounds(bounds, shape.start);
                    this.extendBounds(bounds, shape.end);
                }
                break;
            case 'marker':
                this.extendBounds(bounds, shape.position);
                break;
            case 'asset': {
                // Asset bounds based on position and dimensions
                const halfW = shape.width / 2;
                const halfH = shape.height / 2;
                this.extendBounds(bounds, { x: shape.position.x - halfW, y: shape.position.y - halfH });
                this.extendBounds(bounds, { x: shape.position.x + halfW, y: shape.position.y + halfH });
                break;
            }
            default:
                break;
        }
    }

    private getSelectionBounds(shapes: Shape[], selectedIds: Set<string>): SelectionBounds | null {
        const bounds: SelectionBounds = {
            minX: Number.POSITIVE_INFINITY,
            minY: Number.POSITIVE_INFINITY,
            maxX: Number.NEGATIVE_INFINITY,
            maxY: Number.NEGATIVE_INFINITY,
        };

        shapes.forEach((shape) => {
            if (!selectedIds.has(shape.id)) return;
            this.accumulateShapeBounds(shape, bounds);
        });

        if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY) || !Number.isFinite(bounds.maxX) || !Number.isFinite(bounds.maxY)) {
            return null;
        }
        return bounds;
    }

    private shapeSupportsRotation(shape: Shape): boolean {
        if (shape.type === 'rectangle') {
            return false;
        }
        if (shape.type === 'guideline') {
            return shape.orientation === 'freeform' && Boolean(shape.start && shape.end);
        }
        return true;
    }

    public handleClick(draft: MutableSnapshot, point: Point) {
        switch (draft.activeTool) {
            case 'line':
            case 'rectangle':
            case 'circle':
                return this.basicShapes.handleClick(draft, point, draft.activeTool);

            case 'guideline':
            case 'dimension':
            case 'text':
            case 'marker':
                return this.annotations.handleClick(draft, point, draft.activeTool);

            case 'polyline':
            case 'curve':
            case 'arc':
                return this.complexShapes.handleClick(draft, point, draft.activeTool);

            case 'wall':
                this.handleWallClick(draft, point);
                return;
            case 'opening':
                this.handleOpeningClick(draft, point);
                return;
            case 'asset':
                this.handleAssetClick(draft, point);
                return;
            case 'zone':
                this.handleZoneClick(draft, point);
                return;
            default:
                break;
        }
    }

    public updateCursor(draft: MutableSnapshot, point: Point, snapshot: WorkspaceSnapshot) {
        draft.lastCursorPoint = point;
        if (draft.isDrawing && draft.currentShape) {
            draft.currentShape = this.geometryManager.updateShapePreview(draft.currentShape, point, snapshot);
        } else if (draft.activeTool === 'guideline' && !draft.isDrawing) {
            draft.currentShape = this.geometryManager.buildGuidelinePreview(point, draft.guidelineOrientation);
        } else if (draft.activeTool === 'dimension' && draft.isDrawing && draft.currentShape?.type === 'dimension') {
            draft.currentShape = this.geometryManager.updateDimensionPreview(draft.currentShape, point);
        }
    }

    public cancelDrawing(draft: MutableSnapshot) {
        draft.currentShape = null;
        draft.isDrawing = false;
        this.resetDrawingHistory(draft);
    }

    public confirmCurrentShape(draft: MutableSnapshot) {
        if (!draft.currentShape) {
            return;
        }

        const shape = draft.currentShape;
        if (shape.type === 'polyline' || shape.type === 'curve') {
            if (!shape.points || shape.points.length < 3) {
                return;
            }
            const finalizedPoints = shape.points.slice(0, -1);
            if (finalizedPoints.length < 2) {
                return;
            }
            draft.currentShape = { ...shape, points: finalizedPoints };
        } else if (shape.type === 'text') {
            // Text shapes are ready to commit as-is
            this.commitCurrentShape(draft);
            return;
        } else if (shape.type === 'rectangle') {
            // Rectangle needs start and end points to be different
            if (shape.start.x === shape.end.x && shape.start.y === shape.end.y) {
                return;
            }
        } else if (shape.type === 'circle') {
            // Circle needs a non-zero radius
            if (shape.radius <= 0) {
                return;
            }
        } else if (shape.type === 'wall') {
            // Wall needs valid centerline with different start and end points
            const wallShape = shape as WallShape;
            if (!wallShape.centerline || wallShape.centerline.length < 2) {
                return;
            }
            const start = wallShape.centerline[0];
            const end = wallShape.centerline[wallShape.centerline.length - 1];
            if (start.x === end.x && start.y === end.y) {
                return;
            }
        } else if (shape.type !== 'line') {
            return;
        }

        this.commitCurrentShape(draft);
    }

    public insertOpening(draft: MutableSnapshot, point: Point, options: OpeningPlacementOptions = {}) {
        const opening = this.geometryManager.buildOpeningShape(point, draft, options);
        draft.shapes = [...draft.shapes, opening];
        this.finishPlacement(draft, opening.id);
    }

    public insertAsset(draft: MutableSnapshot, point: Point, options: AssetPlacementOptions) {
        // Get asset definition to use default dimensions
        const assetDef = getAssetById(options.assetId);
        
        // Use asset default dimensions if not specified
        const finalOptions: AssetPlacementOptions = {
            ...options,
            width: options.width ?? assetDef?.defaultWidth ?? 1.0,
            height: options.height ?? assetDef?.defaultHeight ?? 1.0,
        };
        
        const asset = this.geometryManager.buildAssetShape(point, finalOptions);
        draft.shapes = [...draft.shapes, asset];
        this.finishPlacement(draft, asset.id);
    }

    public setActiveWallThickness(draft: MutableSnapshot, thickness: number) {
        if (thickness <= 0) return;
        if (!draft.currentShape || draft.currentShape.type !== 'wall') return;
        draft.currentShape = { ...draft.currentShape, thickness };
    }

    public setActiveWallAlignment(draft: MutableSnapshot, alignment: WallAlignment) {
        if (!draft.currentShape || draft.currentShape.type !== 'wall') return;
        draft.currentShape = { ...draft.currentShape, alignment };
    }

    public createWallSegment(draft: MutableSnapshot, start: Point, end: Point, options: WallCreationOptions = {}) {
        const wall = this.geometryManager.buildWallShape(start, end, options);
        draft.shapes = [...draft.shapes, wall];
        this.finishPlacement(draft, wall.id);
        this.geometryManager.detectAndUpdateRooms(draft);
        this.geometryManager.updateWallBoundZones(draft);
    }

    public offsetWall(
        draft: MutableSnapshot,
        wallId: string,
        distance: number,
        direction: WallOffsetDirection,
        overrides: WallCreationOptions = {}
    ) {
        if (distance <= 0) {
            return;
        }
        const wall = draft.shapes.find(
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
        this.createWallSegment(draft, newStart, newEnd, baseOptions);
    }

    public createRoom(draft: MutableSnapshot, points: Point[], options: RoomCreationOptions = {}) {
        if (!points || points.length < 3) return;
        const room = this.geometryManager.buildRoomShape(points, options);
        draft.shapes = [...draft.shapes, room];
    }

    // --- Drawing History ---

    public reset(draft?: MutableSnapshot) {
        if (draft) {
            draft.drawingHistory = [];
            draft.drawingFuture = [];
            this.updateDrawingHistoryMetadata(draft);
        }
    }

    public resetDrawingHistory(draft: MutableSnapshot) {
        this.reset(draft);
    }

    private updateDrawingHistoryMetadata(draft: MutableSnapshot) {
        draft.metadata.drawingHistoryDepth = draft.drawingHistory.length;
        draft.metadata.drawingFutureDepth = draft.drawingFuture.length;
    }


    public undoDrawingStep(draft: MutableSnapshot): boolean {
        return this.complexShapes.undoDrawingStep(draft);
    }

    public redoDrawingStep(draft: MutableSnapshot): boolean {
        return this.complexShapes.redoDrawingStep(draft);
    }

    // --- Tool Handlers ---


    private handleWallClick(draft: MutableSnapshot, point: Point) {
        if (!draft.isDrawing) {
            this.beginWallDrawing(draft, point);
            return;
        }
        this.updateActiveWall(draft, point);
        this.commitActiveWall(draft);
    }

    private handleOpeningClick(draft: MutableSnapshot, point: Point) {
        if (!draft.isDrawing) {
            this.beginOpeningPlacement(draft, point);
            return;
        }
        this.updateActiveOpening(draft, point);
        this.commitActiveOpening(draft);
    }

    private handleAssetClick(draft: MutableSnapshot, point: Point) {
        // Assets are placed immediately on click (no drawing phase)
        // Use the asset ID from metadata, or default to 'king-bed'
        const assetId = (draft.metadata as Record<string, unknown>).selectedAssetId as string || 'king-bed';
        this.insertAsset(draft, point, {
            assetId,
            category: 'furniture',
        });
    }

    public setSelectedAssetId(draft: MutableSnapshot, assetId: string) {
        (draft.metadata as Record<string, unknown>).selectedAssetId = assetId;
    }

    public handleZoneClick(draft: MutableSnapshot, point: Point) {
        if (!draft.isDrawing || !draft.currentShape || draft.currentShape.type !== 'zone') {
            // First, check if click is inside a closed wall space
            const enclosingLoop = findEnclosingWallLoop(point, draft.shapes);
            
            if (enclosingLoop) {
                // Auto-fill: Create zone from the closed wall space
                const zoneId = generateShapeId('zone');
                const zoneNumber = draft.shapes.filter(s => s.type === 'zone').length + 1;
                const newZone: ZoneShape = {
                    type: 'zone',
                    id: zoneId,
                    points: enclosingLoop.polygon.slice(0, -1), // Remove closing duplicate point
                    stroke: '#64748b',
                    strokeWidth: 1,
                    fill: 'rgba(147, 197, 253, 0.3)', // Subtle light blue
                    area: calculatePolygonArea(enclosingLoop.polygon),
                    label: `Zone ${zoneNumber}`,
                    wallIds: enclosingLoop.wallIds, // Bind zone to walls - prevents free movement
                };
                
                // Commit immediately
                draft.shapes.push(newZone);
                this.selectionManager.setSelection(draft, [zoneId]);
                
                // If drawing mode is 'one-time', switch to select tool
                if (draft.drawingMode === 'one-time') {
                    draft.activeTool = 'select';
                } else {
                    draft.chainSessionShapeIds = [...draft.chainSessionShapeIds, zoneId];
                }
                return;
            }
            
            // No enclosing wall space found - start manual polygon drawing
            const zoneId = generateShapeId('zone');
            const newZone: ZoneShape = {
                type: 'zone',
                id: zoneId,
                points: [point, point], // Add a trailing point for preview
                stroke: '#64748b',
                strokeWidth: 1,
                fill: 'rgba(147, 197, 253, 0.3)', // Subtle light blue
                area: 0,
                label: 'Zone',
            };
            draft.currentShape = newZone;
            draft.isDrawing = true;
            this.selectionManager.clearSelection(draft);
            this.resetDrawingHistory(draft);
        } else {
            // Add point to existing zone (manual drawing mode)
            const startPoint = draft.currentShape.points[0];
            const distToStart = Math.hypot(point.x - startPoint.x, point.y - startPoint.y);

            if (distToStart < 0.2 && draft.currentShape.points.length >= 4) { // 4 points because 1 is trailing
                // Close the loop
                this.zoneCommit(draft);
            } else {
                // TODO: Move to ArchitecturalToolManager
                const pts = draft.currentShape.points.slice(0, -1); // Remove trailing
                pts.push(point);
                pts.push(point); // Add new point and new trailing point
                draft.currentShape.points = pts;
                draft.currentShape.area = calculatePolygonArea(pts);
            }
        }
    }


    public zoneCommit(draft: MutableSnapshot) {
        if (!draft.currentShape || draft.currentShape.type !== 'zone') return;
        // Remove the trailing point before finalizing
        const finalPoints = draft.currentShape.points.slice(0, -1);
        if (finalPoints.length < 3) return; // Need at least 3 points for a polygon

        // Finalize the shape with consistent styling
        const finalShape: ZoneShape = {
            ...draft.currentShape,
            points: finalPoints,
            stroke: '#64748b',
            fill: 'rgba(147, 197, 253, 0.3)', // Subtle light blue
            area: calculatePolygonArea(finalPoints),
            label: `Zone ${draft.shapes.filter(s => s.type === 'zone').length + 1}`
        };

        draft.shapes.push(finalShape);
        draft.currentShape = null;
        draft.isDrawing = false;
        this.resetDrawingHistory(draft);

        // Select the new shape
        this.selectionManager.setSelection(draft, [finalShape.id]);

        // If drawing mode is 'one-time', switch to select tool
        if (draft.drawingMode === 'one-time') {
            draft.activeTool = 'select';
        } else {
            // Otherwise, keep the zone tool active for continuous drawing
            // and add to chain session if applicable
            draft.chainSessionShapeIds = [...draft.chainSessionShapeIds, finalShape.id];
        }
    }

    /**
     * Create or select a zone from a point inside a closed wall loop.
     * If a zone already exists for the enclosing walls, select it.
     * If no zone exists, create one and select it.
     */
    public createZoneFromPoint(draft: MutableSnapshot, point: Point) {
        // Find the enclosing wall loop
        const enclosingLoop = findEnclosingWallLoop(point, draft.shapes);
        
        if (!enclosingLoop) {
            return; // No enclosing walls found
        }
        
        // Check if a zone already exists for these walls
        const existingZone = draft.shapes.find(shape => 
            shape.type === 'zone' && 
            shape.wallIds && 
            shape.wallIds.length === enclosingLoop.wallIds.length &&
            shape.wallIds.every(id => enclosingLoop.wallIds.includes(id))
        );
        
        if (existingZone) {
            // Zone already exists - just select it
            this.selectionManager.setSelection(draft, [existingZone.id]);
            draft.activeTool = 'select';
            return;
        }
        
        // Create new zone from the wall loop
        const zoneId = generateShapeId('zone');
        const zoneNumber = draft.shapes.filter(s => s.type === 'zone').length + 1;
        const newZone: ZoneShape = {
            type: 'zone',
            id: zoneId,
            points: enclosingLoop.polygon.slice(0, -1), // Remove closing duplicate point
            stroke: '#64748b',
            strokeWidth: 1,
            fill: 'rgba(147, 197, 253, 0.3)', // Subtle light blue
            area: calculatePolygonArea(enclosingLoop.polygon),
            label: `Zone ${zoneNumber}`,
            wallIds: enclosingLoop.wallIds, // Bind zone to walls
        };
        
        draft.shapes.push(newZone);
        this.selectionManager.setSelection(draft, [zoneId]);
        draft.activeTool = 'select';
    }

    /**
     * Create or select a zone from a polygon (e.g., from merged wall geometry hole).
     * This is used when clicking on detected interior areas.
     */
    public createZoneFromPolygon(draft: MutableSnapshot, polygon: Point[]) {
        if (polygon.length < 3) return;
        
        // Check if a zone already exists with similar polygon
        const existingZone = draft.shapes.find(shape => {
            if (shape.type !== 'zone') return false;
            // Check if polygons are roughly the same (same number of points and close centroids)
            if (Math.abs(shape.points.length - polygon.length) > 2) return false;
            
            // Compare centroids
            const existingCentroid = this.getPolygonCentroid(shape.points);
            const newCentroid = this.getPolygonCentroid(polygon);
            if (!existingCentroid || !newCentroid) return false;
            
            const dist = Math.hypot(existingCentroid.x - newCentroid.x, existingCentroid.y - newCentroid.y);
            return dist < 0.5; // If centroids are close, consider it the same zone
        });
        
        if (existingZone) {
            // Zone already exists - just select it
            this.selectionManager.setSelection(draft, [existingZone.id]);
            draft.activeTool = 'select';
            return;
        }
        
        // Create new zone from the polygon
        const zoneId = generateShapeId('zone');
        const zoneNumber = draft.shapes.filter(s => s.type === 'zone').length + 1;
        
        // Remove closing duplicate point if present
        let zonePoints = [...polygon];
        if (zonePoints.length > 0) {
            const first = zonePoints[0];
            const last = zonePoints[zonePoints.length - 1];
            if (Math.hypot(first.x - last.x, first.y - last.y) < 0.001) {
                zonePoints = zonePoints.slice(0, -1);
            }
        }
        
        const newZone: ZoneShape = {
            type: 'zone',
            id: zoneId,
            points: zonePoints,
            stroke: '#64748b',
            strokeWidth: 1,
            fill: 'rgba(147, 197, 253, 0.3)', // Subtle light blue
            area: calculatePolygonArea(polygon),
            label: `Zone ${zoneNumber}`,
        };
        
        draft.shapes.push(newZone);
        this.selectionManager.setSelection(draft, [zoneId]);
        draft.activeTool = 'select';
    }
    
    private getPolygonCentroid(points: Point[]): Point | null {
        if (points.length === 0) return null;
        let cx = 0, cy = 0;
        for (const p of points) {
            cx += p.x;
            cy += p.y;
        }
        return { x: cx / points.length, y: cy / points.length };
    }

    // --- Helper Methods ---

    public beginWallDrawing(draft: MutableSnapshot, point: Point, options: WallCreationOptions = {}) {
        const wall = this.geometryManager.buildWallShape(point, point, options);
        draft.currentShape = wall;
        draft.isDrawing = true;
        this.selectionManager.clearSelection(draft);
        this.resetDrawingHistory(draft);
    }

    public updateActiveWall(draft: MutableSnapshot, point: Point) {
        if (!draft.currentShape || draft.currentShape.type !== 'wall') {
            return;
        }
        const centerline = draft.currentShape.centerline.slice();
        centerline[centerline.length - 1] = point;
        draft.currentShape = { ...draft.currentShape, centerline };
    }

    public commitActiveWall(draft: MutableSnapshot) {
        if (!draft.currentShape || draft.currentShape.type !== 'wall') return;
        this.commitCurrentShape(draft);
    }

    public cancelActiveWall(draft: MutableSnapshot) {
        if (!draft.currentShape || draft.currentShape.type !== 'wall') return;
        draft.currentShape = null;
        draft.isDrawing = false;
        this.resetDrawingHistory(draft);
    }

    public beginOpeningPlacement(draft: MutableSnapshot, point: Point, options: OpeningPlacementOptions = {}) {
        const opening = this.geometryManager.buildOpeningShape(point, draft, options);
        draft.currentShape = opening;
        draft.isDrawing = true;
        this.selectionManager.clearSelection(draft);
        this.resetDrawingHistory(draft);
    }

    public updateActiveOpening(draft: MutableSnapshot, point: Point) {
        if (!draft.currentShape || draft.currentShape.type !== 'opening') {
            return;
        }
        draft.currentShape = this.geometryManager.updateOpeningPreview(draft.currentShape, point, draft);
    }

    public commitActiveOpening(draft: MutableSnapshot) {
        if (!draft.currentShape || draft.currentShape.type !== 'opening') return;
        this.commitCurrentShape(draft);
    }

    public cancelActiveOpening(draft: MutableSnapshot) {
        if (!draft.currentShape || draft.currentShape.type !== 'opening') return;
        draft.currentShape = null;
        draft.isDrawing = false;
        this.resetDrawingHistory(draft);
    }

    private commitCurrentShape(draft: MutableSnapshot) {
        if (!draft.currentShape) return;
        draft.shapes = [...draft.shapes, deepClone(draft.currentShape)];
        const committedId = draft.currentShape.id;
        draft.currentShape = null;
        draft.isDrawing = false;
        this.resetDrawingHistory(draft);
        this.finishPlacement(draft, committedId);
        if (draft.activeTool === 'wall') {
            this.geometryManager.detectAndUpdateRooms(draft);
            this.geometryManager.updateWallBoundZones(draft);
        }
    }

    private finishPlacement(draft: MutableSnapshot, shapeId: string) {
        if (draft.drawingMode === 'one-time') {
            draft.activeTool = 'select';
            this.selectionManager.setSelection(draft, [shapeId]);
        } else {
            draft.chainSessionShapeIds = [...draft.chainSessionShapeIds, shapeId];
            this.selectionManager.clearSelection(draft);
        }
    }

    // --- Manipulation Methods ---

    private snapCenterlineToOrthogonal(points: Point[]): Point[] | null {
        if (!points || points.length < 2) return null;

        const snapped: Point[] = [{ ...points[0] }];
        const epsilon = 1e-6;
        let changed = false;

        for (let i = 1; i < points.length; i++) {
            const originalPrev = points[i - 1];
            const originalCurrent = points[i];
            const snappedPrev = snapped[i - 1];

            const dx = originalCurrent.x - originalPrev.x;
            const dy = originalCurrent.y - originalPrev.y;
            const length = Math.hypot(dx, dy);
            if (length < epsilon) {
                snapped.push({ ...snappedPrev });
                continue;
            }

            const useHorizontal = Math.abs(dx) >= Math.abs(dy);
            if (useHorizontal) {
                const direction = dx >= 0 ? 1 : -1;
                const nextPoint = {
                    x: snappedPrev.x + direction * length,
                    y: snappedPrev.y,
                };
                if (Math.abs(nextPoint.x - originalCurrent.x) > epsilon || Math.abs(nextPoint.y - originalCurrent.y) > epsilon) {
                    changed = true;
                }
                snapped.push(nextPoint);
            } else {
                const direction = dy >= 0 ? 1 : -1;
                const nextPoint = {
                    x: snappedPrev.x,
                    y: snappedPrev.y + direction * length,
                };
                if (Math.abs(nextPoint.x - originalCurrent.x) > epsilon || Math.abs(nextPoint.y - originalCurrent.y) > epsilon) {
                    changed = true;
                }
                snapped.push(nextPoint);
            }
        }

        return changed ? snapped : null;
    }

    public snapSelectedWallsOrthogonal(draft: MutableSnapshot) {
        if (!draft.selectedShapeIds || draft.selectedShapeIds.length === 0) {
            return;
        }
        const selectedIds = new Set(draft.selectedShapeIds);
        const updatedWallIds = new Set<string>();

        draft.shapes = draft.shapes.map((shape) => {
            if (shape.type !== 'wall' || !selectedIds.has(shape.id) || shape.centerline.length < 2) {
                return shape;
            }
            const snappedCenterline = this.snapCenterlineToOrthogonal(shape.centerline);
            if (!snappedCenterline) {
                return shape;
            }
            updatedWallIds.add(shape.id);
            return {
                ...shape,
                centerline: snappedCenterline,
                controlPoint: null,
            };
        });

        if (updatedWallIds.size > 0) {
            const ids = Array.from(updatedWallIds);
            this.geometryManager.detectAndUpdateRooms(draft);
            this.geometryManager.updateWallBoundZones(draft);
            this.geometryManager.recomputeOpeningsForWalls(draft, ids);
        }
    }

    /**
     * Determines if a wall is horizontal or vertical based on its centerline.
     * Returns 'horizontal' if wall runs more along X-axis, 'vertical' if along Y-axis,
     * or 'diagonal' if it's at a significant angle (not orthogonal).
     */
    private getWallOrientation(wall: WallShape): 'horizontal' | 'vertical' | 'diagonal' {
        if (!wall.centerline || wall.centerline.length < 2) return 'diagonal';
        
        const start = wall.centerline[0];
        const end = wall.centerline[wall.centerline.length - 1];
        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);
        
        // Use a threshold to determine if wall is mostly horizontal or vertical
        // Wall is considered orthogonal if the angle is within ~5 degrees of horizontal/vertical
        const ratio = Math.min(dx, dy) / Math.max(dx, dy);
        const isOrthogonal = ratio < 0.1; // ~5.7 degrees tolerance
        
        if (!isOrthogonal) return 'diagonal';
        
        return dx >= dy ? 'horizontal' : 'vertical';
    }

    public moveSelection(draft: MutableSnapshot, delta: Point) {
        if (!delta.x && !delta.y) return;

        const rawSelection = new Set(draft.selectedShapeIds);
        const selection = new Set(rawSelection);
        const roomsWithoutWalls = new Set<string>();

        // Collect associated dimensions to move
        const associatedDimensions = new Set<string>();
        draft.shapes.forEach(s => {
            if (s.type === 'dimension' && s.attachedTo && selection.has(s.attachedTo)) {
                associatedDimensions.add(s.id);
            }
        });
        associatedDimensions.forEach(id => selection.add(id));

        draft.shapes.forEach((shape) => {
            if (shape.type === 'room' && selection.has(shape.id)) {
                if (shape.wallIds && shape.wallIds.length > 0) {
                    shape.wallIds.forEach((wallId) => selection.add(wallId));
                } else {
                    roomsWithoutWalls.add(shape.id);
                }
            }
        });

        const walls = draft.shapes.filter((shape): shape is WallShape => shape.type === 'wall');
        const userSelectedWallIds = walls.filter((wall) => rawSelection.has(wall.id)).map((wall) => wall.id);
        const derivedSelectedWallIds = walls.filter((wall) => selection.has(wall.id)).map((wall) => wall.id);

        let movement: Point = delta;
        if (draft.wallsLocked && userSelectedWallIds.length > 0) {
            // Get orientations of all selected walls
            const selectedWalls = walls.filter((wall) => rawSelection.has(wall.id));
            const orientations = selectedWalls.map(wall => this.getWallOrientation(wall));
            
            // Check if all walls have the same orientation
            const allHorizontal = orientations.every(o => o === 'horizontal');
            const allVertical = orientations.every(o => o === 'vertical');
            
            if (allHorizontal) {
                // Horizontal walls can only move vertically (perpendicular to wall direction)
                movement = { x: 0, y: delta.y };
            } else if (allVertical) {
                // Vertical walls can only move horizontally (perpendicular to wall direction)
                movement = { x: delta.x, y: 0 };
            } else {
                // Mixed orientations or diagonal walls: fall back to dominant axis
                movement = Math.abs(delta.x) >= Math.abs(delta.y)
                    ? { x: delta.x, y: 0 }
                    : { x: 0, y: delta.y };
            }
        }
        if (!movement.x && !movement.y) return;

        const translatePoint = (p: Point) => ({ x: p.x + movement.x, y: p.y + movement.y });
        const shouldAutoGlideSingleWall = !draft.wallsLocked && rawSelection.size === 1 && userSelectedWallIds.length === 1;
        const glideWallIds = draft.wallsLocked ? derivedSelectedWallIds : (shouldAutoGlideSingleWall ? userSelectedWallIds : []);
        const processedWalls = new Set<string>();

        // Handle locked (or auto-gliding) wall translation first
        if (glideWallIds.length > 0) {
            glideWallIds.forEach((wallId) => {
                if (processedWalls.has(wallId)) return;

                const targetWall = walls.find((w) => w.id === wallId);
                if (!targetWall || !targetWall.centerline || targetWall.centerline.length < 2) {
                    return;
                }

                // Translate the entire centerline so curved/segmented walls keep their shape
                const translatedCenterline = targetWall.centerline.map((point) => ({
                    x: point.x + movement.x,
                    y: point.y + movement.y,
                }));
                const newStart = translatedCenterline[0];
                const newEnd = translatedCenterline[translatedCenterline.length - 1];

                // Find connected walls at both endpoints
                const startConnected = findConnectedWalls(wallId, 0, walls);
                const endConnected = findConnectedWalls(wallId, targetWall.centerline.length - 1, walls);

                // Update all affected shapes
                draft.shapes = draft.shapes.map((shape) => {
                    if (shape.type === 'dimension' && shape.attachedTo === wallId) {
                        return {
                            ...shape,
                            start: { x: shape.start.x + movement.x, y: shape.start.y + movement.y },
                            end: { x: shape.end.x + movement.x, y: shape.end.y + movement.y },
                        };
                    }
                    if (shape.type !== 'wall') return shape;

                    // Update the target wall itself
                    if (shape.id === wallId) {
                        processedWalls.add(shape.id);
                        return {
                            ...shape,
                            centerline: translatedCenterline,
                            controlPoint: shape.controlPoint
                                ? { x: shape.controlPoint.x + movement.x, y: shape.controlPoint.y + movement.y }
                                : null,
                        };
                    }

                    // Update walls connected at the start endpoint (only if not also selected)
                    if (!selection.has(shape.id)) {
                        const startMatch = startConnected.find((c) => c.wallId === shape.id);
                        if (startMatch) {
                            const centerline = shape.centerline.slice();
                            centerline[startMatch.endpointIndex] = newStart;
                            return { ...shape, centerline, controlPoint: null };
                        }

                        // Update walls connected at the end endpoint (only if not also selected)
                        const endMatch = endConnected.find((c) => c.wallId === shape.id);
                        if (endMatch) {
                            const centerline = shape.centerline.slice();
                            centerline[endMatch.endpointIndex] = newEnd;
                            return { ...shape, centerline, controlPoint: null };
                        }
                    }

                    return shape;
                });
            });

            // Recompute rooms, zones, and openings after wall movement
            this.geometryManager.detectAndUpdateRooms(draft);
            this.geometryManager.updateWallBoundZones(draft);
            const allAffectedWallIds = Array.from(processedWalls);
            if (allAffectedWallIds.length > 0) {
                this.geometryManager.recomputeOpeningsForWalls(draft, allAffectedWallIds);
            }
        }

        let movedWalls = false;
        const movedWallIds = new Set<string>();
        
        // Pre-compute which walls will be moved in this operation
        // This is needed to correctly handle openings attached to those walls
        const wallsToMove = new Set<string>();
        draft.shapes.forEach((shape) => {
            if (selection.has(shape.id) && shape.type === 'wall' && !processedWalls.has(shape.id)) {
                wallsToMove.add(shape.id);
            }
        });
        
        draft.shapes = draft.shapes.map((shape) => {
            if (!selection.has(shape.id)) return shape;
            if (shape.type === 'line') {
                return { ...shape, start: translatePoint(shape.start), end: translatePoint(shape.end) };
            }
            if (shape.type === 'polyline' || shape.type === 'curve') {
                return { ...shape, points: shape.points.map(translatePoint) };
            }
            if (shape.type === 'zone') {
                // Wall-bound zones cannot be moved freely
                if (shape.wallIds && shape.wallIds.length > 0) {
                    return shape;
                }
                return { ...shape, points: shape.points.map(translatePoint) };
            }
            if (shape.type === 'arc') {
                return {
                    ...shape,
                    start: translatePoint(shape.start),
                    end: translatePoint(shape.end),
                    controlPoint: translatePoint(shape.controlPoint),
                };
            }
            if (shape.type === 'circle') {
                return {
                    ...shape,
                    center: translatePoint(shape.center),
                    cursorPoint: translatePoint(shape.cursorPoint),
                };
            }
            if (shape.type === 'rectangle') {
                return { ...shape, start: translatePoint(shape.start), end: translatePoint(shape.end) };
            }
            if (shape.type === 'guideline') {
                if (shape.orientation === 'horizontal') {
                    const currentPosition = typeof shape.position === 'number' ? shape.position : 0;
                        return { ...shape, position: currentPosition + movement.y };
                }
                if (shape.orientation === 'vertical') {
                    const currentPosition = typeof shape.position === 'number' ? shape.position : 0;
                        return { ...shape, position: currentPosition + movement.x };
                }
                if (shape.start && shape.end) {
                    return { ...shape, start: translatePoint(shape.start), end: translatePoint(shape.end) };
                }
            }
            if (shape.type === 'dimension') {
                // If attached and the attached shape is NOT selected, update offset
                if (shape.attachedTo && !draft.selectedShapeIds.includes(shape.attachedTo)) {
                    const dx = shape.end.x - shape.start.x;
                    const dy = shape.end.y - shape.start.y;
                    const length = Math.hypot(dx, dy);

                    if (length > 0) {
                        // Unit vector
                        const ux = dx / length;
                        const uy = dy / length;

                        // Perpendicular vector (rotated 90 degrees counter-clockwise)
                        const px = -uy;
                        const py = ux;

                        // Project delta onto perpendicular vector
                        const deltaOffset = movement.x * px + movement.y * py;

                        return {
                            ...shape,
                            offset: shape.offset + deltaOffset
                        };
                    }
                }

                return {
                    ...shape,
                    start: translatePoint(shape.start),
                    end: translatePoint(shape.end),
                };
            }
            if (shape.type === 'wall') {
                // Skip walls if they were already processed in glide mode
                if (processedWalls.has(shape.id)) {
                    return shape; // Already processed above
                }

                movedWalls = true;
                movedWallIds.add(shape.id);

                // Normal unlocked behavior - just translate the wall
                return {
                    ...shape,
                    centerline: shape.centerline.map(translatePoint),
                    controlPoint: shape.controlPoint ? translatePoint(shape.controlPoint) : null,
                };
            }
            if (shape.type === 'opening') {
                // If this opening's host wall is also being moved in this operation,
                // skip individual processing and let recomputeOpeningsForWalls handle it.
                // This prevents incorrect detachment due to stale wall position data.
                if (shape.host && (wallsToMove.has(shape.host.wallId) || processedWalls.has(shape.host.wallId))) {
                    // Opening will be updated by recomputeOpeningsForWalls at the end
                    return shape;
                }

                const translatedAnchor = translatePoint(shape.anchor);
                if (shape.host) {
                    const wall = this.geometryManager.findWallById(draft.shapes, shape.host.wallId);
                    if (wall) {
                        // Get the current pose to understand wall orientation
                        const currentPose = this.geometryManager.projectPointOntoWall(wall, shape.anchor, shape.host.normalOffset, shape.swing.facing);
                        if (currentPose) {
                            // Calculate movement vector
                            const movement = {
                                x: translatedAnchor.x - shape.anchor.x,
                                y: translatedAnchor.y - shape.anchor.y,
                            };
                            const movementLength = Math.hypot(movement.x, movement.y);

                            if (movementLength > 1e-6) {
                                // Normalize movement direction
                                const movementDir = { x: movement.x / movementLength, y: movement.y / movementLength };

                                // Calculate how much movement is perpendicular (away from wall) vs parallel (along wall)
                                // Dot product with wall normal gives perpendicular component
                                const perpendicularComponent = Math.abs(dot(movementDir, currentPose.normal));
                                const parallelComponent = Math.abs(dot(movementDir, currentPose.direction));

                                // Check perpendicular distance from translated anchor to wall centerline
                                const wallThickness = wall.thickness ?? DEFAULT_WALL_THICKNESS;
                                const halfThickness = wallThickness / 2;

                                const closestWallResult = this.geometryManager.findClosestWall([wall], translatedAnchor);
                                if (closestWallResult) {
                                    const perpendicularDistance = closestWallResult.distance;

                                    // If moving primarily along the wall (parallel), use a more lenient threshold
                                    // If moving primarily away from wall (perpendicular), use tighter threshold
                                    const isMovingAlongWall = parallelComponent > perpendicularComponent * 2;
                                    const detachThreshold = isMovingAlongWall
                                        ? halfThickness + 0.02 // 2cm buffer when moving along wall (prevents jitter)
                                        : halfThickness + 0.03; // 3cm when moving away (smooth detachment)

                                    if (perpendicularDistance <= detachThreshold) {
                                        // Still within threshold - keep attached and project onto wall
                                        const pose = this.geometryManager.projectPointOntoWall(wall, translatedAnchor, shape.host.normalOffset, shape.swing.facing);
                                        if (pose) {
                                            return {
                                                ...shape,
                                                anchor: pose.anchor,
                                                direction: pose.direction,
                                                normal: pose.normal,
                                                swing: { ...shape.swing, facing: pose.facing },
                                                host: {
                                                    wallId: pose.wallId,
                                                    normalizedPosition: pose.normalizedPosition,
                                                    distance: pose.distance,
                                                    normalOffset: pose.normalOffset,
                                                },
                                            };
                                        }
                                    }
                                }
                            } else {
                                // No movement - just check distance
                                const wallThickness = wall.thickness ?? DEFAULT_WALL_THICKNESS;
                                const halfThickness = wallThickness / 2;
                                const detachThreshold = halfThickness + 0.03;

                                const closestWallResult = this.geometryManager.findClosestWall([wall], translatedAnchor);
                                if (closestWallResult && closestWallResult.distance <= detachThreshold) {
                                    const pose = this.geometryManager.projectPointOntoWall(wall, translatedAnchor, shape.host.normalOffset, shape.swing.facing);
                                    if (pose) {
                                        return {
                                            ...shape,
                                            anchor: pose.anchor,
                                            direction: pose.direction,
                                            normal: pose.normal,
                                            swing: { ...shape.swing, facing: pose.facing },
                                            host: {
                                                wallId: pose.wallId,
                                                normalizedPosition: pose.normalizedPosition,
                                                distance: pose.distance,
                                                normalOffset: pose.normalOffset,
                                            },
                                        };
                                    }
                                }
                            }
                        }
                    }
                    // Opening moved outside threshold - smoothly detach it
                    return {
                        ...shape,
                        anchor: translatedAnchor,
                        host: null,
                        // Keep existing direction and normal for smooth visual transition
                        direction: shape.direction,
                        normal: shape.normal,
                    };
                } else {
                    // No host - check if we should snap to a nearby wall
                    const closestWallResult = this.geometryManager.findClosestWall(draft.shapes, translatedAnchor, WALL_SNAP_PROXIMITY_THRESHOLD);
                    if (closestWallResult) {
                        const pose = this.geometryManager.projectPointOntoWall(
                            closestWallResult.wall,
                            translatedAnchor,
                            undefined,
                            shape.swing.facing
                        );
                        if (pose) {
                            return {
                                ...shape,
                                anchor: pose.anchor,
                                direction: pose.direction,
                                normal: pose.normal,
                                swing: { ...shape.swing, facing: pose.facing },
                                host: {
                                    wallId: pose.wallId,
                                    normalizedPosition: pose.normalizedPosition,
                                    distance: pose.distance,
                                    normalOffset: pose.normalOffset,
                                },
                            };
                        }
                    }
                    // Place freely
                    return {
                        ...shape,
                        anchor: translatedAnchor,
                    };
                }
            }
            if (shape.type === 'text') {
                return { ...shape, position: translatePoint(shape.position) };
            }
            if (shape.type === 'asset') {
                return { ...shape, position: translatePoint(shape.position) };
            }
            if (shape.type === 'room') {
                if (roomsWithoutWalls.has(shape.id)) {
                    return shape;
                }
                return {
                    ...shape,
                    points: shape.points.map(translatePoint),
                    centroid: translatePoint(shape.centroid),
                };
            }
            return shape;
        });
        if (movedWalls) {
            this.geometryManager.detectAndUpdateRooms(draft);
            this.geometryManager.updateWallBoundZones(draft);
            this.geometryManager.recomputeOpeningsForWalls(draft, movedWallIds);
        }
    }

    public rotateSelection(draft: MutableSnapshot, angleDegrees: number, pivot?: Point) {
        const selectedIds = draft.selectedShapeIds;
        if (!selectedIds || selectedIds.length === 0) {
            return;
        }
        if (!Number.isFinite(angleDegrees) || Math.abs(angleDegrees) < 1e-6) {
            return;
        }

        const selectedSet = new Set(selectedIds);
        const selectionBounds = this.getSelectionBounds(draft.shapes as Shape[], selectedSet);
        const pivotPoint = pivot ?? (selectionBounds
            ? {
                x: (selectionBounds.minX + selectionBounds.maxX) / 2,
                y: (selectionBounds.minY + selectionBounds.maxY) / 2,
            }
            : null);
        if (!pivotPoint) {
            return;
        }

        const radians = (angleDegrees * Math.PI) / 180;
        const sin = Math.sin(radians);
        const cos = Math.cos(radians);
        const affectedWallIds = new Set<string>();
        let selectionChanged = false;

        const rotatePointsArray = (points: Point[]) => points.map((point) => this.rotatePoint(point, pivotPoint, sin, cos));

        draft.shapes = draft.shapes.map((shape) => {
            if (!selectedSet.has(shape.id)) {
                return shape;
            }

            if (!this.shapeSupportsRotation(shape)) {
                return shape;
            }

            selectionChanged = true;

            switch (shape.type) {
                case 'line':
                    return {
                        ...shape,
                        start: this.rotatePoint(shape.start, pivotPoint, sin, cos),
                        end: this.rotatePoint(shape.end, pivotPoint, sin, cos),
                    };
                case 'polyline':
                    return {
                        ...shape,
                        points: rotatePointsArray(shape.points),
                    };
                case 'curve':
                    return {
                        ...shape,
                        points: rotatePointsArray(shape.points),
                    };
                case 'arc':
                    return {
                        ...shape,
                        start: this.rotatePoint(shape.start, pivotPoint, sin, cos),
                        end: this.rotatePoint(shape.end, pivotPoint, sin, cos),
                        controlPoint: this.rotatePoint(shape.controlPoint, pivotPoint, sin, cos),
                    };
                case 'circle':
                    return {
                        ...shape,
                        center: this.rotatePoint(shape.center, pivotPoint, sin, cos),
                        cursorPoint: this.rotatePoint(shape.cursorPoint, pivotPoint, sin, cos),
                    };
                case 'wall': {
                    const rotatedCenterline = rotatePointsArray(shape.centerline);
                    const rotatedControlPoint = shape.controlPoint ? this.rotatePoint(shape.controlPoint, pivotPoint, sin, cos) : null;
                    affectedWallIds.add(shape.id);
                    return {
                        ...shape,
                        centerline: rotatedCenterline,
                        controlPoint: rotatedControlPoint,
                    };
                }
                case 'opening':
                    return {
                        ...shape,
                        anchor: this.rotatePoint(shape.anchor, pivotPoint, sin, cos),
                        direction: this.rotateVector(shape.direction, sin, cos),
                        normal: this.rotateVector(shape.normal, sin, cos),
                    };
                case 'room':
                    return {
                        ...shape,
                        points: rotatePointsArray(shape.points),
                        centroid: this.rotatePoint(shape.centroid, pivotPoint, sin, cos),
                    };
                case 'zone':
                    return {
                        ...shape,
                        points: rotatePointsArray(shape.points),
                    };
                case 'dimension':
                    return {
                        ...shape,
                        start: this.rotatePoint(shape.start, pivotPoint, sin, cos),
                        end: this.rotatePoint(shape.end, pivotPoint, sin, cos),
                    };
                case 'text':
                    return {
                        ...shape,
                        position: this.rotatePoint(shape.position, pivotPoint, sin, cos),
                    };
                case 'asset':
                    return {
                        ...shape,
                        position: this.rotatePoint(shape.position, pivotPoint, sin, cos),
                        rotation: (shape.rotation + angleDegrees) % 360,
                    };
                case 'guideline':
                    if (shape.orientation === 'freeform' && shape.start && shape.end) {
                        return {
                            ...shape,
                            start: this.rotatePoint(shape.start, pivotPoint, sin, cos),
                            end: this.rotatePoint(shape.end, pivotPoint, sin, cos),
                        };
                    }
                    return shape;
                default:
                    return shape;
            }
        });

        if (!selectionChanged) {
            return;
        }

        if (affectedWallIds.size > 0) {
            this.geometryManager.detectAndUpdateRooms(draft);
            this.geometryManager.updateWallBoundZones(draft);
            this.geometryManager.recomputeOpeningsForWalls(draft, affectedWallIds);
        }
    }

    public resizeLineHandle(draft: MutableSnapshot, point: Point, handle: 'start' | 'end') {
        return this.basicShapes.resizeLineHandle(draft, point, handle);
    }

    public resizeWallHandle(draft: MutableSnapshot, point: Point, handle: 'start' | 'end') {
        const primaryId = this.selectionManager.getPrimarySelectionId(draft);
        if (!primaryId) return;

        // Helper to calculate wall length from centerline
        const calculateWallLength = (centerline: Point[]): number => {
            if (centerline.length < 2) return 0;
            let total = 0;
            for (let i = 1; i < centerline.length; i++) {
                total += Math.hypot(
                    centerline[i].x - centerline[i - 1].x,
                    centerline[i].y - centerline[i - 1].y
                );
            }
            return total;
        };

        // If walls are locked, find and update all connected endpoints
        if (draft.wallsLocked) {
            const walls = draft.shapes.filter((shape): shape is WallShape => shape.type === 'wall');
            const primaryWall = walls.find((w) => w.id === primaryId);
            if (!primaryWall || !primaryWall.centerline || primaryWall.centerline.length < 2) {
                return;
            }

            // Determine which endpoint we're moving
            const endpointIndex = handle === 'start' ? 0 : primaryWall.centerline.length - 1;
            const oldEndpoint = primaryWall.centerline[endpointIndex];

            // Find all walls connected at this endpoint
            const connected = findConnectedWalls(primaryId, endpointIndex, walls);

            // Track wall scale factors for proportional opening resize
            const wallScaleFactors = new Map<string, number>();

            // Update all connected endpoints AND the primary wall
            const updatedWallIds = new Set<string>();
            draft.shapes = draft.shapes.map((shape) => {
                if (shape.type === 'dimension') {
                    // Update dimension if it is attached to any of the connected walls (including primary)
                    // AND its endpoint matches the old endpoint location
                    const isAttachedToConnected = shape.attachedTo === primaryId || connected.some(c => c.wallId === shape.attachedTo);

                    if (isAttachedToConnected) {
                        const threshold = 0.01;
                        let newStart = shape.start;
                        let newEnd = shape.end;

                        if (Math.hypot(shape.start.x - oldEndpoint.x, shape.start.y - oldEndpoint.y) < threshold) {
                            newStart = point;
                        }
                        if (Math.hypot(shape.end.x - oldEndpoint.x, shape.end.y - oldEndpoint.y) < threshold) {
                            newEnd = point;
                        }

                        if (newStart !== shape.start || newEnd !== shape.end) {
                            return { ...shape, start: newStart, end: newEnd };
                        }
                    }
                    return shape;
                }

                if (shape.type !== 'wall') return shape;

                // Update the primary wall itself
                if (shape.id === primaryId) {
                    const oldLength = calculateWallLength(shape.centerline);
                    const centerline = shape.centerline.slice();
                    centerline[endpointIndex] = point;
                    const newLength = calculateWallLength(centerline);
                    
                    // Store scale factor for primary wall
                    if (oldLength > 0.001) {
                        wallScaleFactors.set(shape.id, newLength / oldLength);
                    }
                    
                    updatedWallIds.add(shape.id);
                    return { ...shape, centerline, controlPoint: null };
                }

                // Check if this wall's endpoint is in the connected list
                const match = connected.find((c: { wallId: string; endpointIndex: number }) => c.wallId === shape.id);
                if (match) {
                    const oldLength = calculateWallLength(shape.centerline);
                    const centerline = shape.centerline.slice();
                    centerline[match.endpointIndex] = point;
                    const newLength = calculateWallLength(centerline);
                    
                    // Store scale factor for this wall
                    if (oldLength > 0.001) {
                        wallScaleFactors.set(shape.id, newLength / oldLength);
                    }
                    
                    updatedWallIds.add(shape.id);
                    return { ...shape, centerline, controlPoint: null };
                }
                return shape;
            });

            // Proportionally resize openings attached to resized walls
            if (wallScaleFactors.size > 0) {
                draft.shapes = draft.shapes.map((shape) => {
                    if (shape.type === 'opening' && shape.host) {
                        const scaleFactor = wallScaleFactors.get(shape.host.wallId);
                        if (scaleFactor && Math.abs(scaleFactor - 1) > 0.001) {
                            // Scale the opening width proportionally
                            return {
                                ...shape,
                                width: shape.width * scaleFactor,
                            };
                        }
                    }
                    return shape;
                });
            }

            if (updatedWallIds.size > 0) {
                this.geometryManager.recomputeOpeningsForWalls(draft, Array.from(updatedWallIds));
                this.geometryManager.detectAndUpdateRooms(draft);
                this.geometryManager.updateWallBoundZones(draft);
            }
        } else {
            // Normal single-wall resize (unlocked mode)
            let updated = false;
            let oldPoint: Point | null = null;
            let scaleFactor = 1;

            // Find the wall and calculate old length
            const primaryWall = draft.shapes.find((s): s is WallShape => s.id === primaryId && s.type === 'wall');
            const oldWallLength = primaryWall ? calculateWallLength(primaryWall.centerline) : 0;

            draft.shapes = draft.shapes.map((shape) => {
                if (shape.id === primaryId && shape.type === 'wall') {
                    const centerline = shape.centerline.slice();
                    if (centerline.length < 2) return shape;
                    if (handle === 'start') {
                        oldPoint = centerline[0];
                        centerline[0] = point;
                    } else {
                        oldPoint = centerline[centerline.length - 1];
                        centerline[centerline.length - 1] = point;
                    }
                    
                    // Calculate scale factor
                    const newWallLength = calculateWallLength(centerline);
                    if (oldWallLength > 0.001) {
                        scaleFactor = newWallLength / oldWallLength;
                    }
                    
                    updated = true;
                    return { ...shape, centerline, controlPoint: null };
                }
                return shape;
            });

            if (updated && oldPoint) {
                // Proportionally resize openings attached to this wall
                if (Math.abs(scaleFactor - 1) > 0.001) {
                    draft.shapes = draft.shapes.map((shape) => {
                        if (shape.type === 'opening' && shape.host && shape.host.wallId === primaryId) {
                            return {
                                ...shape,
                                width: shape.width * scaleFactor,
                            };
                        }
                        return shape;
                    });
                }

                this.geometryManager.recomputeOpeningsForWalls(draft, [primaryId]);

                // Update attached dimensions
                draft.shapes = draft.shapes.map((shape) => {
                    if (shape.type === 'dimension' && shape.attachedTo === primaryId) {
                        const threshold = 0.01;
                        let newStart = shape.start;
                        let newEnd = shape.end;

                        // Check start point
                        if (Math.hypot(shape.start.x - oldPoint!.x, shape.start.y - oldPoint!.y) < threshold) {
                            newStart = point;
                        }

                        // Check end point
                        if (Math.hypot(shape.end.x - oldPoint!.x, shape.end.y - oldPoint!.y) < threshold) {
                            newEnd = point;
                        }

                        if (newStart !== shape.start || newEnd !== shape.end) {
                            return { ...shape, start: newStart, end: newEnd };
                        }
                    }
                    return shape;
                });
            }
        }
    }

    public translateWall(draft: MutableSnapshot, wallId: string, delta: Point) {
        if (!delta.x && !delta.y) return;

        let movement: Point = delta;
        if (draft.wallsLocked) {
            movement = Math.abs(delta.x) >= Math.abs(delta.y)
                ? { x: delta.x, y: 0 }
                : { x: 0, y: delta.y };
        }
        if (!movement.x && !movement.y) return;

        const walls = draft.shapes.filter((shape): shape is WallShape => shape.type === 'wall');
        const targetWall = walls.find((w) => w.id === wallId);

        if (!targetWall || !targetWall.centerline || targetWall.centerline.length < 2) {
            return;
        }

        // Translate the entire centerline so multi-point walls glide without distortion
        const translatedCenterline = targetWall.centerline.map((point) => ({
            x: point.x + movement.x,
            y: point.y + movement.y,
        }));
        const newStart = translatedCenterline[0];
        const newEnd = translatedCenterline[translatedCenterline.length - 1];

        // If walls are locked, find connected walls at both endpoints
        if (draft.wallsLocked) {
            const startConnected = findConnectedWalls(wallId, 0, walls);
            const endConnected = findConnectedWalls(wallId, targetWall.centerline.length - 1, walls);

            const updatedWallIds = new Set<string>();

            // Update all shapes
            draft.shapes = draft.shapes.map((shape) => {
                if (shape.type !== 'wall') return shape;

                // Update the target wall itself
                if (shape.id === wallId) {
                    updatedWallIds.add(shape.id);
                    return {
                        ...shape,
                        centerline: translatedCenterline,
                        controlPoint: shape.controlPoint
                            ? { x: shape.controlPoint.x + movement.x, y: shape.controlPoint.y + movement.y }
                            : null,
                    };
                }

                // Update walls connected at the start endpoint
                const startMatch = startConnected.find((c) => c.wallId === shape.id);
                if (startMatch) {
                    const centerline = shape.centerline.slice();
                    centerline[startMatch.endpointIndex] = newStart;
                    updatedWallIds.add(shape.id);
                    return { ...shape, centerline, controlPoint: null };
                }

                // Update walls connected at the end endpoint
                const endMatch = endConnected.find((c) => c.wallId === shape.id);
                if (endMatch) {
                    const centerline = shape.centerline.slice();
                    centerline[endMatch.endpointIndex] = newEnd;
                    updatedWallIds.add(shape.id);
                    return { ...shape, centerline, controlPoint: null };
                }

                return shape;
            });

            if (updatedWallIds.size > 0) {
                this.geometryManager.recomputeOpeningsForWalls(draft, updatedWallIds);
                this.geometryManager.detectAndUpdateRooms(draft);
                this.geometryManager.updateWallBoundZones(draft);
            }
        } else {
            // When not locked, just translate the single wall
            const updatedWallIds = new Set<string>();
            draft.shapes = draft.shapes.map((shape) => {
                if (shape.id === wallId && shape.type === 'wall') {
                    updatedWallIds.add(shape.id);
                    return {
                        ...shape,
                        centerline: translatedCenterline,
                        controlPoint: shape.controlPoint
                            ? { x: shape.controlPoint.x + movement.x, y: shape.controlPoint.y + movement.y }
                            : null,
                    };
                }
                return shape;
            });

            if (updatedWallIds.size > 0) {
                this.geometryManager.recomputeOpeningsForWalls(draft, updatedWallIds);
                this.geometryManager.detectAndUpdateRooms(draft);
                this.geometryManager.updateWallBoundZones(draft);
            }
        }
    }

    public setSelectedWallThickness(draft: MutableSnapshot, thickness: number) {
        if (thickness <= 0) return;
        const primaryId = this.selectionManager.getPrimarySelectionId(draft);
        if (!primaryId) return;
        let updated = false;
        draft.shapes = draft.shapes.map((shape) => {
            if (shape.id === primaryId && shape.type === 'wall') {
                updated = true;
                return { ...shape, thickness };
            }
            return shape;
        });
        if (updated) {
            this.geometryManager.recomputeOpeningsForWalls(draft, [primaryId]);
        }
    }

    public setSelectedWallHeight(draft: MutableSnapshot, height: number) {
        if (height <= 0) return;
        const primaryId = this.selectionManager.getPrimarySelectionId(draft);
        if (!primaryId) return;
        let updated = false;
        draft.shapes = draft.shapes.map((shape) => {
            if (shape.id === primaryId && shape.type === 'wall') {
                updated = true;
                return { ...shape, height };
            }
            return shape;
        });
        if (updated) {
            this.geometryManager.recomputeOpeningsForWalls(draft, [primaryId]);
        }
    }

    public setDimensionOffset(draft: MutableSnapshot, dimensionId: string, point: Point) {
        return this.annotations.setDimensionOffset(draft, dimensionId, point);
    }

    public updateTextContent(draft: MutableSnapshot, textId: string, updates: Partial<TextShape>) {
        return this.annotations.updateTextContent(draft, textId, updates);
    }

    public resizeText(draft: MutableSnapshot, textId: string, newFontSize: number, newPosition?: Point) {
        return this.annotations.resizeText(draft, textId, newFontSize, newPosition);
    }

    public moveCurrentShape(draft: MutableSnapshot, delta: Point) {
        return this.annotations.moveCurrentShape(draft, delta);
    }

    public resizeCurrentText(draft: MutableSnapshot, newFontSize: number, newPosition: Point) {
        return this.annotations.resizeCurrentText(draft, newFontSize, newPosition);
    }

    // ============================================================================
    // Group/Ungroup Operations
    // ============================================================================

    /**
     * Groups the currently selected shapes into a single group.
     * The group becomes a new shape that contains references to all member shapes.
     */
    public groupSelection(draft: MutableSnapshot): string | null {
        const selectedIds = draft.selectedShapeIds;
        if (!selectedIds || selectedIds.length < 2) {
            return null; // Need at least 2 shapes to form a group
        }

        // Filter out shapes that are already groups (cannot nest groups for now)
        const validIds = selectedIds.filter(id => {
            const shape = draft.shapes.find(s => s.id === id);
            return shape && shape.type !== 'group';
        });

        if (validIds.length < 2) {
            return null;
        }

        // Calculate bounds for the group
        const bounds = this.getSelectionBounds(draft.shapes, new Set(validIds));
        if (!bounds) {
            return null;
        }

        // Create the group shape
        const groupId = generateShapeId('group');
        const group: GroupShape = {
            type: 'group',
            id: groupId,
            memberIds: validIds,
            bounds: {
                minX: bounds.minX,
                minY: bounds.minY,
                maxX: bounds.maxX,
                maxY: bounds.maxY,
            },
        };

        // Add the group to shapes
        draft.shapes = [...draft.shapes, group];

        // Select only the new group
        this.selectionManager.setSelection(draft, [groupId]);

        return groupId;
    }

    /**
     * Ungroups all selected groups, freeing their member shapes.
     * Member shapes become individually selectable again.
     */
    public ungroupSelection(draft: MutableSnapshot): string[] {
        const selectedIds = draft.selectedShapeIds;
        if (!selectedIds || selectedIds.length === 0) {
            return [];
        }

        const freedMemberIds: string[] = [];
        const groupIdsToRemove: string[] = [];

        // Find all selected groups
        for (const id of selectedIds) {
            const shape = draft.shapes.find(s => s.id === id);
            if (shape && shape.type === 'group') {
                const groupShape = shape as GroupShape;
                freedMemberIds.push(...groupShape.memberIds);
                groupIdsToRemove.push(id);
            }
        }

        if (groupIdsToRemove.length === 0) {
            return [];
        }

        // Remove the group shapes
        draft.shapes = draft.shapes.filter(s => !groupIdsToRemove.includes(s.id));

        // Select the freed members
        this.selectionManager.setSelection(draft, freedMemberIds);

        return freedMemberIds;
    }

    /**
     * Find the group that contains a given shape ID, if any.
     */
    public findGroupContaining(shapes: Shape[], shapeId: string): GroupShape | null {
        for (const shape of shapes) {
            if (shape.type === 'group') {
                const group = shape as GroupShape;
                if (group.memberIds.includes(shapeId)) {
                    return group;
                }
            }
        }
        return null;
    }

    // ============================================================================
    // Mirror Operation
    // ============================================================================

    /**
     * Mirrors selected shapes across a line defined by two points.
     * @param axis The mirror axis defined by two points
     * @param keepOriginal If true, creates copies; if false, moves the originals
     */
    public mirrorSelection(
        draft: MutableSnapshot,
        axis: { point1: Point; point2: Point },
        keepOriginal: boolean = true
    ): string[] {
        const selectedIds = draft.selectedShapeIds;
        if (!selectedIds || selectedIds.length === 0) {
            return [];
        }

        const selectedSet = new Set(selectedIds);
        const newShapeIds: string[] = [];

        // Calculate axis angle
        const axisPoint = axis.point1;
        const axisAngle = Math.atan2(
            axis.point2.y - axis.point1.y,
            axis.point2.x - axis.point1.x
        );

        // Helper to mirror a point across the axis
        const mirrorPoint = (p: Point): Point => {
            // Translate to axis origin
            const dx = p.x - axisPoint.x;
            const dy = p.y - axisPoint.y;

            // Rotate to align axis with X
            const cos = Math.cos(-axisAngle);
            const sin = Math.sin(-axisAngle);
            const rx = dx * cos - dy * sin;
            const ry = dx * sin + dy * cos;

            // Mirror across X axis (flip Y)
            const my = -ry;

            // Rotate back
            const cos2 = Math.cos(axisAngle);
            const sin2 = Math.sin(axisAngle);
            const fx = rx * cos2 - my * sin2;
            const fy = rx * sin2 + my * cos2;

            // Translate back
            return {
                x: fx + axisPoint.x,
                y: fy + axisPoint.y,
            };
        };

        // Helper to mirror a vector (direction, no translation)
        const mirrorVector = (v: Point): Point => {
            const cos = Math.cos(-axisAngle);
            const sin = Math.sin(-axisAngle);
            const rx = v.x * cos - v.y * sin;
            const ry = v.x * sin + v.y * cos;
            const my = -ry;
            const cos2 = Math.cos(axisAngle);
            const sin2 = Math.sin(axisAngle);
            return {
                x: rx * cos2 - my * sin2,
                y: rx * sin2 + my * cos2,
            };
        };

        const mirrorShape = (shape: Shape): Shape => {
            const newId = generateShapeId(shape.type);

            switch (shape.type) {
                case 'line':
                    return {
                        ...deepClone(shape),
                        id: newId,
                        start: mirrorPoint(shape.start),
                        end: mirrorPoint(shape.end),
                    };

                case 'polyline':
                case 'curve':
                    return {
                        ...deepClone(shape),
                        id: newId,
                        points: shape.points.map(mirrorPoint),
                    };

                case 'arc':
                    return {
                        ...deepClone(shape),
                        id: newId,
                        start: mirrorPoint(shape.start),
                        end: mirrorPoint(shape.end),
                        controlPoint: mirrorPoint(shape.controlPoint),
                    };

                case 'circle':
                    return {
                        ...deepClone(shape),
                        id: newId,
                        center: mirrorPoint(shape.center),
                        cursorPoint: mirrorPoint(shape.cursorPoint),
                    };

                case 'rectangle':
                    return {
                        ...deepClone(shape),
                        id: newId,
                        start: mirrorPoint(shape.start),
                        end: mirrorPoint(shape.end),
                    };

                case 'wall': {
                    const mirroredCenterline = shape.centerline.map(mirrorPoint);
                    return {
                        ...deepClone(shape),
                        id: newId,
                        centerline: mirroredCenterline,
                        controlPoint: shape.controlPoint ? mirrorPoint(shape.controlPoint) : null,
                    };
                }

                case 'opening':
                    return {
                        ...deepClone(shape),
                        id: newId,
                        anchor: mirrorPoint(shape.anchor),
                        direction: mirrorVector(shape.direction),
                        normal: mirrorVector(shape.normal),
                        host: null, // Detach from wall when mirroring
                    };

                case 'room':
                case 'zone':
                    return {
                        ...deepClone(shape),
                        id: newId,
                        points: shape.points.map(mirrorPoint),
                        centroid: shape.type === 'room' ? mirrorPoint(shape.centroid) : undefined,
                    } as Shape;

                case 'text':
                    return {
                        ...deepClone(shape),
                        id: newId,
                        position: mirrorPoint(shape.position),
                    };

                case 'asset':
                    return {
                        ...deepClone(shape),
                        id: newId,
                        position: mirrorPoint(shape.position),
                        flipHorizontal: !shape.flipHorizontal, // Toggle flip
                    };

                case 'dimension':
                    return {
                        ...deepClone(shape),
                        id: newId,
                        start: mirrorPoint(shape.start),
                        end: mirrorPoint(shape.end),
                        attachedTo: undefined, // Detach
                    };

                case 'guideline':
                    if (shape.start && shape.end) {
                        return {
                            ...deepClone(shape),
                            id: newId,
                            start: mirrorPoint(shape.start),
                            end: mirrorPoint(shape.end),
                        };
                    }
                    return { ...deepClone(shape), id: newId };

                case 'marker':
                    return {
                        ...deepClone(shape),
                        id: newId,
                        position: mirrorPoint(shape.position),
                    };

                default:
                    return { ...deepClone(shape), id: newId };
            }
        };

        // Process each selected shape
        for (const shape of draft.shapes) {
            if (!selectedSet.has(shape.id)) continue;

            const mirrored = mirrorShape(shape);
            newShapeIds.push(mirrored.id);

            if (keepOriginal) {
                // Add mirrored copy
                draft.shapes = [...draft.shapes, mirrored];
            } else {
                // Replace original with mirrored version
                draft.shapes = draft.shapes.map(s =>
                    s.id === shape.id ? { ...mirrored, id: shape.id } : s
                );
            }
        }

        // Select the new/modified shapes
        if (keepOriginal) {
            this.selectionManager.setSelection(draft, newShapeIds);
        }

        return newShapeIds;
    }

    // ============================================================================
    // Explode Operation
    // ============================================================================

    /**
     * Explodes compound shapes into their primitive components.
     * - Groups → individual member shapes
     * - Polylines → individual line segments
     * - Rectangles → 4 line segments
     */
    public explodeSelection(draft: MutableSnapshot): string[] {
        const selectedIds = draft.selectedShapeIds;
        if (!selectedIds || selectedIds.length === 0) {
            return [];
        }

        const selectedSet = new Set(selectedIds);
        const newShapeIds: string[] = [];
        const shapesToRemove: string[] = [];

        for (const shape of draft.shapes) {
            if (!selectedSet.has(shape.id)) continue;

            const exploded = this.explodeShape(shape);
            if (exploded.length > 1 || (exploded.length === 1 && exploded[0].id !== shape.id)) {
                shapesToRemove.push(shape.id);
                for (const newShape of exploded) {
                    draft.shapes = [...draft.shapes, newShape];
                    newShapeIds.push(newShape.id);
                }
            }
        }

        // Remove exploded shapes
        if (shapesToRemove.length > 0) {
            draft.shapes = draft.shapes.filter(s => !shapesToRemove.includes(s.id));
        }

        // Select the new shapes
        if (newShapeIds.length > 0) {
            this.selectionManager.setSelection(draft, newShapeIds);
        }

        return newShapeIds;
    }

    /**
     * Explodes a single shape into its components.
     */
    private explodeShape(shape: Shape): Shape[] {
        switch (shape.type) {
            case 'group': {
                // Groups just return their member IDs - members are already in shapes array
                // For explode, we don't create new shapes, we just dissolve the group
                return [];
            }

            case 'polyline':
                return this.polylineToLines(shape as PolylineShape);

            case 'rectangle':
                return this.rectangleToLines(shape as RectangleShape);

            case 'curve':
                // Approximate curve with line segments
                return this.curveToLines(shape as CurveShape);

            default:
                // Cannot be exploded further
                return [shape];
        }
    }

    /**
     * Converts a polyline into individual line segments.
     */
    private polylineToLines(polyline: PolylineShape): LineShape[] {
        const lines: LineShape[] = [];
        const points = polyline.points;

        for (let i = 0; i < points.length - 1; i++) {
            lines.push({
                type: 'line',
                id: generateShapeId('line'),
                start: { ...points[i] },
                end: { ...points[i + 1] },
                stroke: polyline.stroke,
                strokeWidth: polyline.strokeWidth,
                appearance: polyline.appearance ? deepClone(polyline.appearance) : undefined,
            });
        }

        return lines;
    }

    /**
     * Converts a rectangle into 4 line segments.
     */
    private rectangleToLines(rect: RectangleShape): LineShape[] {
        const { start, end, stroke, strokeWidth, appearance } = rect;

        // Calculate all 4 corners
        const topLeft = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) };
        const topRight = { x: Math.max(start.x, end.x), y: Math.min(start.y, end.y) };
        const bottomRight = { x: Math.max(start.x, end.x), y: Math.max(start.y, end.y) };
        const bottomLeft = { x: Math.min(start.x, end.x), y: Math.max(start.y, end.y) };

        const makeLineProps = () => ({
            stroke,
            strokeWidth,
            appearance: appearance ? deepClone(appearance) : undefined,
        });

        return [
            // Top edge
            {
                type: 'line' as const,
                id: generateShapeId('line'),
                start: { ...topLeft },
                end: { ...topRight },
                ...makeLineProps(),
            },
            // Right edge
            {
                type: 'line' as const,
                id: generateShapeId('line'),
                start: { ...topRight },
                end: { ...bottomRight },
                ...makeLineProps(),
            },
            // Bottom edge
            {
                type: 'line' as const,
                id: generateShapeId('line'),
                start: { ...bottomRight },
                end: { ...bottomLeft },
                ...makeLineProps(),
            },
            // Left edge
            {
                type: 'line' as const,
                id: generateShapeId('line'),
                start: { ...bottomLeft },
                end: { ...topLeft },
                ...makeLineProps(),
            },
        ];
    }

    /**
     * Approximates a curve with line segments.
     */
    private curveToLines(curve: CurveShape): LineShape[] {
        const lines: LineShape[] = [];
        const points = curve.points;

        // For a simple approximation, just connect the control points
        // A more sophisticated approach would sample the actual curve
        for (let i = 0; i < points.length - 1; i++) {
            lines.push({
                type: 'line',
                id: generateShapeId('line'),
                start: { ...points[i] },
                end: { ...points[i + 1] },
                stroke: curve.stroke,
                strokeWidth: curve.strokeWidth,
                appearance: curve.appearance ? deepClone(curve.appearance) : undefined,
            });
        }

        return lines;
    }
}
