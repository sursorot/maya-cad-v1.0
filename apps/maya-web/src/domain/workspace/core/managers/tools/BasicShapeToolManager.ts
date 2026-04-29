import type {
    CircleShape,
    LineShape,
    Point,
    RectangleShape,
} from '../../../../../components/Workspace/types';
import type { MutableSnapshot } from '../../types';
import { DEFAULT_STROKE } from '../../constants';
import { generateShapeId } from '../../utils';
import { BaseToolManager } from './BaseToolManager';

/**
 * Manages basic geometric shape tools: line, rectangle, and circle.
 * These are simple 2-point or center-radius shapes with straightforward creation logic.
 */
export class BasicShapeToolManager extends BaseToolManager {
    /**
     * Handle clicks for basic shape tools
     */
    public handleClick(draft: MutableSnapshot, point: Point, tool: 'line' | 'rectangle' | 'circle'): void {
        switch (tool) {
            case 'line':
                this.handleLineClick(draft, point);
                break;
            case 'rectangle':
                this.handleRectangleClick(draft, point);
                break;
            case 'circle':
                this.handleCircleClick(draft, point);
                break;
        }
    }

    /**
     * Handle line tool clicks - 2-point line creation
     */
    private handleLineClick(draft: MutableSnapshot, point: Point): void {
        if (!draft.isDrawing) {
            // First click: create line starting at this point
            const shape: LineShape = {
                type: 'line',
                id: generateShapeId('line'),
                start: point,
                end: point,
                stroke: DEFAULT_STROKE,
                strokeWidth: 1,
            };
            draft.currentShape = shape;
            draft.isDrawing = true;
            this.selectionManager.clearSelection(draft);
        } else if (draft.currentShape && draft.currentShape.type === 'line') {
            // Second click: set endpoint and commit
            draft.currentShape.end = point;
            this.commitCurrentShape(draft);
        }
    }

    /**
     * Handle rectangle tool clicks - 2-point rectangle creation
     */
    private handleRectangleClick(draft: MutableSnapshot, point: Point): void {
        if (!draft.isDrawing) {
            // First click: create rectangle starting at this point
            const shape: RectangleShape = {
                type: 'rectangle',
                id: generateShapeId('rectangle'),
                start: point,
                end: point,
                stroke: DEFAULT_STROKE,
                strokeWidth: 1,
            };
            draft.currentShape = shape;
            draft.isDrawing = true;
            this.selectionManager.clearSelection(draft);
        } else if (draft.currentShape && draft.currentShape.type === 'rectangle') {
            // Second click: set opposite corner and commit
            draft.currentShape.end = point;
            this.commitCurrentShape(draft);
        }
    }

    /**
     * Handle circle tool clicks - center + radius creation
     */
    private handleCircleClick(draft: MutableSnapshot, point: Point): void {
        if (!draft.isDrawing) {
            // First click: create circle centered at this point
            const shape: CircleShape = {
                type: 'circle',
                id: generateShapeId('circle'),
                center: point,
                cursorPoint: point,
                radius: 0,
                stroke: DEFAULT_STROKE,
                strokeWidth: 1,
            };
            draft.currentShape = shape;
            draft.isDrawing = true;
            this.selectionManager.clearSelection(draft);
        } else if (draft.currentShape && draft.currentShape.type === 'circle') {
            // Second click: set radius based on distance from center
            draft.currentShape.cursorPoint = point;
            draft.currentShape.radius = Math.hypot(
                point.x - draft.currentShape.center.x,
                point.y - draft.currentShape.center.y
            );
            this.commitCurrentShape(draft);
        }
    }

    /**
     * Resize line handle (start or end point)
     */
    public resizeLineHandle(draft: MutableSnapshot, point: Point, handle: 'start' | 'end'): void {
        const primaryId = this.selectionManager.getPrimarySelectionId(draft);
        if (!primaryId) return;

        let oldPoint: Point | null = null;
        let updated = false;

        // Update the line shape
        draft.shapes = draft.shapes.map((shape) => {
            if (shape.id !== primaryId) {
                return shape;
            }
            if (shape.type === 'line') {
                oldPoint = shape[handle];
                updated = true;
                return {
                    ...shape,
                    [handle]: point,
                };
            }
            return shape;
        });

        // Update any attached dimensions
        if (updated && oldPoint) {
            draft.shapes = draft.shapes.map((shape) => {
                if (shape.type === 'dimension' && shape.attachedTo === primaryId) {
                    const threshold = 0.01;
                    let newStart = shape.start;
                    let newEnd = shape.end;

                    // Check if dimension start point matches old point
                    if (Math.hypot(shape.start.x - oldPoint!.x, shape.start.y - oldPoint!.y) < threshold) {
                        newStart = point;
                    }

                    // Check if dimension end point matches old point
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
