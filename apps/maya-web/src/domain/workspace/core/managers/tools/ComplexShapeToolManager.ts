import type {
    ArcShape,
    CurveShape,
    Point,
    PolylineShape,
    Shape,
} from '../../../../../components/Workspace/types';
import type { MutableSnapshot } from '../../types';
import { DEFAULT_STROKE } from '../../constants';
import { deepClone, distance, generateShapeId } from '../../utils';
import { BaseToolManager } from './BaseToolManager';

/**
 * Manages complex shape tools: polyline, curve, and arc.
 * These tools support incremental drawing with undo/redo capabilities.
 */
export class ComplexShapeToolManager extends BaseToolManager {
    /**
     * Handle clicks for complex shape tools
     */
    public handleClick(draft: MutableSnapshot, point: Point, tool: 'polyline' | 'curve' | 'arc'): void {
        switch (tool) {
            case 'polyline':
                this.handlePolylineClick(draft, point);
                break;
            case 'curve':
                this.handleCurveClick(draft, point);
                break;
            case 'arc':
                this.handleArcClick(draft, point);
                break;
        }
    }

    /**
     * Handle polyline tool clicks - multi-point line creation
     */
    private handlePolylineClick(draft: MutableSnapshot, point: Point): void {
        if (!draft.isDrawing) {
            // First click: start new polyline
            const shape: PolylineShape = {
                type: 'polyline',
                id: generateShapeId('polyline'),
                points: [point, point], // First point + trailing preview point
                stroke: DEFAULT_STROKE,
                strokeWidth: 1,
            };
            draft.currentShape = shape;
            draft.isDrawing = true;
            this.selectionManager.clearSelection(draft);
            this.resetDrawingHistory(draft);
        } else if (draft.currentShape && draft.currentShape.type === 'polyline') {
            // Additional click: add point to polyline
            this.recordDrawingCheckpoint(draft, draft.currentShape);
            const pts = draft.currentShape.points.slice(0, -1); // Remove trailing point
            pts.push(point); // Add clicked point
            pts.push(point); // Add new trailing point for preview
            draft.currentShape.points = pts;
        }
    }

    /**
     * Handle curve tool clicks - bezier curve with closure detection
     */
    private handleCurveClick(draft: MutableSnapshot, point: Point): void {
        if (!draft.isDrawing) {
            // First click: start new curve
            const shape: CurveShape = {
                type: 'curve',
                id: generateShapeId('curve'),
                points: [point, point], // First point + trailing preview point
                stroke: DEFAULT_STROKE,
                strokeWidth: 1,
            };
            draft.currentShape = shape;
            draft.isDrawing = true;
            this.selectionManager.clearSelection(draft);
            this.resetDrawingHistory(draft);
        } else if (draft.currentShape && draft.currentShape.type === 'curve') {
            // Additional click: add point or close curve
            this.recordDrawingCheckpoint(draft, draft.currentShape);
            const first = draft.currentShape.points[0];
            const distToFirst = distance(point, first);

            // Auto-close if clicking near first point (and have enough points)
            if (draft.currentShape.points.length >= 4 && distToFirst < 0.15) {
                const pts = draft.currentShape.points.slice(0, -1); // Remove trailing point
                pts.push(first); // Close the curve to first point
                draft.currentShape.points = pts;
                this.commitCurrentShape(draft);
            } else {
                // Add new point
                const pts = draft.currentShape.points.slice(0, -1); // Remove trailing point
                pts.push(point); // Add clicked point
                pts.push(point); // Add new trailing point for preview
                draft.currentShape.points = pts;
            }
        }
    }

    /**
     * Handle arc tool clicks - 3-point arc creation (start, end, control)
     */
    private handleArcClick(draft: MutableSnapshot, point: Point): void {
        if (!draft.isDrawing) {
            // First click: set start point
            const shape: ArcShape = {
                type: 'arc',
                id: generateShapeId('arc'),
                start: point,
                end: point,
                controlPoint: point,
                stroke: DEFAULT_STROKE,
                strokeWidth: 1,
            };
            draft.currentShape = shape;
            draft.isDrawing = true;
            this.selectionManager.clearSelection(draft);
            return;
        }

        if (draft.currentShape && draft.currentShape.type === 'arc') {
            // Check if control point has moved from start
            const hasMoved = Math.abs(draft.currentShape.controlPoint.x - draft.currentShape.start.x) > 0.001 ||
                Math.abs(draft.currentShape.controlPoint.y - draft.currentShape.start.y) > 0.001;

            if (!hasMoved) {
                // Second click: set end point (and initial control point)
                draft.currentShape.end = point;
                draft.currentShape.controlPoint = point;
            } else {
                // Third click: set final control point and commit
                draft.currentShape.controlPoint = point;
                this.commitCurrentShape(draft);
            }
        }
    }

    /**
     * Record a checkpoint in drawing history for undo/redo
     */
    private recordDrawingCheckpoint(draft: MutableSnapshot, shape: Shape): void {
        if (!this.isIncrementalDrawingShape(shape)) return;
        draft.drawingHistory.push(deepClone(shape));
        draft.drawingFuture = []; // Clear redo stack when new action is taken
        this.updateDrawingHistoryMetadata(draft, draft.drawingHistory.length, 0);
    }

    /**
     * Undo last drawing step for incremental shapes
     */
    public undoDrawingStep(draft: MutableSnapshot): boolean {
        const { currentShape, isDrawing } = draft;
        if (!isDrawing || !currentShape || !this.isIncrementalDrawingShape(currentShape)) {
            return false;
        }
        if (draft.drawingHistory.length === 0) {
            return false;
        }

        // Pop previous state and save current to future
        const previous = draft.drawingHistory.pop()!;
        draft.drawingFuture.push(deepClone(currentShape));
        draft.currentShape = deepClone(previous);
        this.updateDrawingHistoryMetadata(draft, draft.drawingHistory.length, draft.drawingFuture.length);
        return true;
    }

    /**
     * Redo previously undone drawing step
     */
    public redoDrawingStep(draft: MutableSnapshot): boolean {
        const { currentShape, isDrawing } = draft;
        if (!isDrawing || !currentShape || !this.isIncrementalDrawingShape(currentShape)) {
            return false;
        }
        if (draft.drawingFuture.length === 0) {
            return false;
        }

        // Save current to history and restore next from future
        draft.drawingHistory.push(deepClone(currentShape));
        const next = draft.drawingFuture.pop()!;
        draft.currentShape = deepClone(next);
        this.updateDrawingHistoryMetadata(draft, draft.drawingHistory.length, draft.drawingFuture.length);
        return true;
    }

    /**
     * Commit the current shape being drawn
     */
    private commitCurrentShape(draft: MutableSnapshot): void {
        if (!draft.currentShape) return;
        const shapeId = draft.currentShape.id;
        this.commitShape(draft, draft.currentShape);
        this.finishPlacement(draft, shapeId);
    }
}
