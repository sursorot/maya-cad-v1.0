import type { MutableSnapshot, Shape } from '../../types';
import type { GeometryManager } from '../GeometryManager';
import type { SelectionManager } from '../SelectionManager';

/**
 * Abstract base class for all specialized tool managers.
 * Provides common dependencies and shared utility methods.
 */
export abstract class BaseToolManager {
    protected selectionManager: SelectionManager;
    protected geometryManager: GeometryManager;

    constructor(
        selectionManager: SelectionManager,
        geometryManager: GeometryManager
    ) {
        this.selectionManager = selectionManager;
        this.geometryManager = geometryManager;
    }

    /**
     * Common method to commit a shape to the workspace
     */
    protected commitShape(draft: MutableSnapshot, shape: Shape): void {
        draft.shapes = [...draft.shapes, shape];
        draft.currentShape = null;
        draft.isDrawing = false;
    }

    /**
     * Finish placement of a shape (e.g., after dragging)
     * In one-time mode: selects the shape and switches to select tool
     * In chain mode: adds to chain session and clears selection
     */
    protected finishPlacement(draft: MutableSnapshot, shapeId: string): void {
        const shape = draft.shapes.find((s) => s.id === shapeId);
        if (!shape) return;

        // Mark shape as placed
        draft.currentShape = null;
        draft.isDrawing = false;

        // Handle selection and tool based on drawing mode
        if (draft.drawingMode === 'one-time') {
            // Select the newly placed shape and switch to select tool
            draft.activeTool = 'select';
            this.selectionManager.setSelection(draft, [shapeId]);
        } else {
            // Chain mode: add to session, clear selection to continue drawing
            draft.chainSessionShapeIds = [...draft.chainSessionShapeIds, shapeId];
            this.selectionManager.clearSelection(draft);
        }
    }

    /**
     * Reset drawing history metadata for incremental shapes
     */
    protected resetDrawingHistory(draft: MutableSnapshot): void {
        if (draft.metadata) {
            draft.metadata.drawingHistoryDepth = 0;
            draft.metadata.drawingFutureDepth = 0;
        }
    }

    /**
     * Update drawing history metadata
     * Note: The actual history arrays are managed by ToolManager 
     * This just updates the depth counters
     */
    protected updateDrawingHistoryMetadata(draft: MutableSnapshot, historyLength: number, futureLength: number): void {
        if (draft.metadata) {
            draft.metadata.drawingHistoryDepth = historyLength;
            draft.metadata.drawingFutureDepth = futureLength;
        }
    }

    /**
     * Check if a shape supports incremental drawing (polyline, curve)
     */
    protected isIncrementalDrawingShape(shape: Shape): boolean {
        return shape.type === 'polyline' || shape.type === 'curve';
    }
}
