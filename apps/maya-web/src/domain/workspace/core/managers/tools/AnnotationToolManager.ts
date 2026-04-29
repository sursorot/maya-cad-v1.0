import type {
    DimensionShape,
    GuidelineShape,
    MarkerShape,
    Point,
    TextShape,
} from '../../../../../components/Workspace/types';
import type { MutableSnapshot } from '../../types';
import { GUIDELINE_COLOR, MARKER_COLOR } from '../../constants';
import { generateShapeId } from '../../utils';
import { BaseToolManager } from './BaseToolManager';

/**
 * Manages annotation tools: dimension, text, and guideline.
 * These tools help users annotate and document their workspace.
 */
export class AnnotationToolManager extends BaseToolManager {
    /**
     * Handle clicks for annotation tools
     */
    public handleClick(
        draft: MutableSnapshot,
        point: Point,
        tool: 'dimension' | 'text' | 'guideline' | 'marker'
    ): void {
        switch (tool) {
            case 'guideline':
                this.handleGuidelineClick(draft, point);
                break;
            case 'dimension':
                this.handleDimensionClick(draft, point);
                break;
            case 'text':
                this.handleTextClick(draft, point);
                break;
            case 'marker':
                this.handleMarkerClick(draft, point);
                break;
        }
    }

    /**
     * Handle marker tool clicks - creates named marker points that can be used as snap targets
     * In chain mode, continues placing markers and shows preview line between them
     */
    private handleMarkerClick(draft: MutableSnapshot, point: Point): void {
        // Use marker options from draft, with fallback to defaults
        const { label, color } = draft.markerOptions;
        
        // Auto-increment the label number for next marker
        const match = label.match(/^([A-Za-z]*)(\d+)$/);
        if (match) {
            const prefix = match[1];
            const num = parseInt(match[2], 10);
            draft.markerOptions.label = `${prefix}${num + 1}`;
        }

        const shape: MarkerShape = {
            type: 'marker',
            id: generateShapeId('marker'),
            position: point,
            label: label,
            stroke: color || MARKER_COLOR,
            strokeWidth: 2,
        };
        draft.shapes.push(shape);
        
        // In chain mode, store position for preview line and stay in marker tool
        if (draft.drawingMode === 'chain') {
            draft.lastMarkerPosition = point;
            // Don't deselect the tool - stay in marker mode
            draft.selectedShapeId = null;
            draft.selectedShapeIds = [];
        } else {
            // One-time mode: clear last position and finish placement
            draft.lastMarkerPosition = null;
            this.finishPlacement(draft, shape.id);
        }
    }
    
    /**
     * Clear the last marker position (called when tool changes or Escape is pressed)
     */
    public clearLastMarkerPosition(draft: MutableSnapshot): void {
        draft.lastMarkerPosition = null;
    }

    /**
     * Handle guideline tool clicks - creates infinite guidelines (horizontal, vertical, or freeform)
     */
    private handleGuidelineClick(draft: MutableSnapshot, point: Point): void {
        // Quick placement for horizontal/vertical guidelines
        if (draft.guidelineOrientation === 'horizontal') {
            const shape: GuidelineShape = {
                type: 'guideline',
                id: generateShapeId('guideline'),
                orientation: 'horizontal',
                position: point.y,
                stroke: GUIDELINE_COLOR,
                strokeWidth: 1,
            };
            draft.shapes.push(shape);
            this.finishPlacement(draft, shape.id);
            return;
        }

        if (draft.guidelineOrientation === 'vertical') {
            const shape: GuidelineShape = {
                type: 'guideline',
                id: generateShapeId('guideline'),
                orientation: 'vertical',
                position: point.x,
                stroke: GUIDELINE_COLOR,
                strokeWidth: 1,
            };
            draft.shapes.push(shape);
            this.finishPlacement(draft, shape.id);
            return;
        }

        // Freeform guideline requires two clicks
        if (!draft.isDrawing) {
            // First click: set initial angle to 45 degrees with small length for visibility
            const initialLength = 0.3;
            const angle = Math.PI / 4; // 45 degrees
            const dx = initialLength * Math.cos(angle);
            const dy = -initialLength * Math.sin(angle); // Negate for SVG coordinates (y goes down)

            const shape: GuidelineShape = {
                type: 'guideline',
                id: generateShapeId('guideline'),
                orientation: 'freeform',
                start: point,
                end: { x: point.x + dx, y: point.y + dy },
                stroke: GUIDELINE_COLOR,
                strokeWidth: 1,
            };
            draft.currentShape = shape;
            draft.isDrawing = true;
        } else if (draft.currentShape && draft.currentShape.type === 'guideline') {
            // Second click: set endpoint and commit
            draft.currentShape.end = point;
            this.commitCurrentShape(draft);
        }
    }

    /**
     * Handle dimension tool clicks - 3-stage creation (start, end, offset)
     */
    public handleDimensionClick(draft: MutableSnapshot, point: Point): void {
        if (!draft.isDrawing || !draft.currentShape || draft.currentShape.type !== 'dimension') {
            // Start new dimension
            const newDimension: DimensionShape = this.geometryManager.buildDimensionShape(point, point);
            draft.currentShape = newDimension;
            draft.isDrawing = true;
            this.selectionManager.clearSelection(draft);
            this.resetDrawingHistory(draft);
        } else {
            // We are in drawing mode
            const shape = draft.currentShape;

            if (shape.editingStage === 'end') {
                // We are setting the end point
                const dist = Math.hypot(point.x - shape.start.x, point.y - shape.start.y);
                if (dist < 0.01) return; // Debounce

                // Check for association with shapes
                const startShapeId = this.geometryManager.findShapeNearPoint(draft.shapes, shape.start);
                const endShapeId = this.geometryManager.findShapeNearPoint(draft.shapes, point);
                let attachedTo: string | undefined;

                if (startShapeId && endShapeId && startShapeId === endShapeId) {
                    attachedTo = startShapeId;
                }

                draft.currentShape = {
                    ...shape,
                    end: point,
                    editingStage: 'offset',
                    attachedTo
                };
            } else if (shape.editingStage === 'offset') {
                // We are setting the offset, commit the shape
                this.commitCurrentShape(draft);
            }
        }
    }

    /**
     * Handle text tool clicks - creates editable text
     */
    public handleTextClick(draft: MutableSnapshot, point: Point): void {
        // Create new text shape and put it in drawing mode for editing
        const newText: TextShape = this.geometryManager.buildTextShape(point);

        draft.currentShape = newText;
        draft.isDrawing = true;

        this.selectionManager.clearSelection(draft);
        this.resetDrawingHistory(draft);
    }

    /**
     * Update text content and properties
     */
    public updateTextContent(
        draft: MutableSnapshot,
        textId: string,
        updates: Partial<TextShape>
    ): void {
        // Helper to handle alignment changes
        const handleAlignmentChange = (current: TextShape, next: TextShape): Point => {
            if (current.textAlign === next.textAlign) return next.position;

            // Calculate estimated width (matching TextShape.tsx logic)
            const width = current.content.length * current.fontSize * 0.6;
            let newX = next.position.x;

            // Convert current position to left edge
            let leftEdge = current.position.x;
            if (current.textAlign === 'center') leftEdge -= width / 2;
            if (current.textAlign === 'right') leftEdge -= width;

            // Calculate new position based on new alignment
            if (next.textAlign === 'left') newX = leftEdge;
            if (next.textAlign === 'center') newX = leftEdge + width / 2;
            if (next.textAlign === 'right') newX = leftEdge + width;

            return { ...next.position, x: newX };
        };

        const applyUpdates = (current: TextShape): TextShape => {
            const next = { ...current, ...updates };
            const newPosition = handleAlignmentChange(current, next);
            return { ...next, position: newPosition };
        };

        if (draft.currentShape?.id === textId && draft.currentShape.type === 'text') {
            draft.currentShape = applyUpdates(draft.currentShape as TextShape);
        } else {
            const index = draft.shapes.findIndex(s => s.id === textId && s.type === 'text');
            if (index !== -1) {
                draft.shapes[index] = applyUpdates(draft.shapes[index] as TextShape);
            }
        }
    }

    /**
     * Resize text by changing font size
     */
    public resizeText(draft: MutableSnapshot, textId: string, newFontSize: number, newPosition?: Point): void {
        draft.shapes = draft.shapes.map(shape => {
            if (shape.id === textId && shape.type === 'text') {
                return {
                    ...shape,
                    fontSize: newFontSize,
                    position: newPosition || shape.position
                };
            }
            return shape;
        });
    }

    /**
     * Move current shape during creation (used for text)
     */
    public moveCurrentShape(draft: MutableSnapshot, delta: Point): void {
        if (!draft.currentShape) return;

        if (draft.currentShape.type === 'text') {
            draft.currentShape = {
                ...draft.currentShape,
                position: {
                    x: draft.currentShape.position.x + delta.x,
                    y: draft.currentShape.position.y + delta.y
                }
            };
        }
    }

    /**
     * Resize current text during creation
     */
    public resizeCurrentText(draft: MutableSnapshot, newFontSize: number, newPosition: Point): void {
        if (!draft.currentShape || draft.currentShape.type !== 'text') return;

        draft.currentShape = {
            ...draft.currentShape,
            fontSize: newFontSize,
            position: newPosition
        };
    }

    /**
     * Set the offset for a dimension line
     */
    public setDimensionOffset(draft: MutableSnapshot, dimensionId: string, point: Point): void {
        const dimension = draft.shapes.find(s => s.id === dimensionId && s.type === 'dimension');
        if (!dimension || dimension.type !== 'dimension') return;

        // Calculate perpendicular distance from dimension line
        const dx = dimension.end.x - dimension.start.x;
        const dy = dimension.end.y - dimension.start.y;
        const length = Math.hypot(dx, dy);

        if (length < 0.001) return;

        // Unit perpendicular vector (rotated 90 degrees counter-clockwise)
        // Original vector: (dx, dy)
        // Perpendicular: (-dy, dx)
        const px = -dy / length;
        const py = dx / length;

        // Vector from start to point
        const vx = point.x - dimension.start.x;
        const vy = point.y - dimension.start.y;

        // Project v onto p (dot product)
        const offset = vx * px + vy * py;

        draft.shapes = draft.shapes.map(s => {
            if (s.id === dimensionId) {
                return { ...s, offset };
            }
            return s;
        });
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
