import type { WorkspaceCommand } from '@maya/workspace-domain/workspace/core';

/**
 * Action categories for reward calculation
 */
export const ActionCategory = {
    CREATIVE: 'creative',          // Actions that create shapes (walls, doors, windows)
    UTILITY: 'utility',            // Settings/config (alignment, thickness, modes)
    SELECTION: 'selection',        // Tool selection, cursor updates
    TRANSFORMATION: 'transformation' // Move, delete, undo, redo
} as const;

export type ActionCategory = typeof ActionCategory[keyof typeof ActionCategory];

/**
 * Classify an action by its index
 */
export function classifyAction(actionIndex: number): ActionCategory {
    // Creative actions: 0-21
    if (actionIndex >= 0 && actionIndex <= 21) {
        return ActionCategory.CREATIVE;
    }
    // Selection/tool actions: 30-39
    if (actionIndex >= 30 && actionIndex <= 39) {
        return ActionCategory.SELECTION;
    }
    // Utility/config actions: 40-47
    if (actionIndex >= 40 && actionIndex <= 47) {
        return ActionCategory.UTILITY;
    }
    // Transformation (part of selection range, but more specific)
    if (actionIndex === 33 || actionIndex === 34) { // move, delete
        return ActionCategory.TRANSFORMATION;
    }
    // Default to utility
    return ActionCategory.UTILITY;
}

/**
 * Check if action requires existing shapes to be meaningful
 */
export function requiresShapes(actionIndex: number): boolean {
    const category = classifyAction(actionIndex);
    // Utility and transformation actions need shapes to be useful
    return category === ActionCategory.UTILITY || category === ActionCategory.TRANSFORMATION;
}


/**
 * Maps the agent's output (action index + continuous parameters) to a concrete WorkspaceCommand.
 * 
 * Action Space (48 total):
 * 0-9: Wall creation and manipulation
 * 10-19: Opening (door/window) placement and modification
 * 20-29: Shape drawing (line, rectangle, circle, etc.)
 * 30-39: Selection and transformation
 * 40-47: Utility commands
 */
export function mapActionToCommand(actionIndex: number, params: number[]): WorkspaceCommand | null {
    // Params are normalized [0, 1]. Scale them to workspace dimensions.
    const SCALE = 20.0;
    const [p1, p2, p3, p4] = params;

    // === WALL COMMANDS (0-9) ===

    // Action 0: Create single wall
    if (actionIndex === 0) {
        return {
            type: 'workspace/create_wall',
            start: { x: p1 * SCALE, y: p2 * SCALE },
            end: { x: p3 * SCALE, y: p4 * SCALE },
            options: {
                thickness: 0.1524, // 6 inches
                height: 3.0 // 3 meters
            }
        };
    }

    // Action 1: Draw rectangular room with walls
    if (actionIndex === 1) {
        return {
            type: 'workspace/wall_rectangle',
            start: { x: p1 * SCALE, y: p2 * SCALE },
            end: { x: p3 * SCALE, y: p4 * SCALE },
            options: {
                thickness: 0.1524,
                height: 3.0
            }
        };
    }

    // Action 2: Begin wall (for chain drawing)
    if (actionIndex === 2) {
        return {
            type: 'workspace/wall_begin',
            point: { x: p1 * SCALE, y: p2 * SCALE },
            options: {
                thickness: 0.1524,
                height: 3.0
            }
        };
    }

    // Action 3: Update wall endpoint
    if (actionIndex === 3) {
        return {
            type: 'workspace/wall_update',
            point: { x: p1 * SCALE, y: p2 * SCALE }
        };
    }

    // Action 4: Commit current wall
    if (actionIndex === 4) {
        return {
            type: 'workspace/wall_commit'
        };
    }

    // Action 5: Cancel wall drawing
    if (actionIndex === 5) {
        return {
            type: 'workspace/wall_cancel'
        };
    }

    // Action 6: Commit chain session (finish multi-wall drawing)
    if (actionIndex === 6) {
        return {
            type: 'workspace/commit_chain_session'
        };
    }

    // Action 7: Abort chain session
    if (actionIndex === 7) {
        return {
            type: 'workspace/abort_chain_session'
        };
    }

    // Action 8: Set wall control point (for arcs)
    if (actionIndex === 8) {
        return {
            type: 'workspace/wall_set_control_point',
            point: { x: p1 * SCALE, y: p2 * SCALE }
        };
    }

    // Action 9: Remove wall control point (make straight)
    if (actionIndex === 9) {
        return {
            type: 'workspace/wall_set_control_point',
            point: null
        };
    }

    // === OPENING COMMANDS (10-19) ===

    // Action 10: Insert door
    if (actionIndex === 10) {
        return {
            type: 'workspace/opening_insert',
            point: { x: p1 * SCALE, y: p2 * SCALE },
            options: {
                category: 'door',
                width: p3 * 0.6 + 0.8, // 0.8-1.4m door width
                height: 2.1
            }
        };
    }

    // Action 11: Insert window
    if (actionIndex === 11) {
        return {
            type: 'workspace/opening_insert',
            point: { x: p1 * SCALE, y: p2 * SCALE },
            options: {
                category: 'window',
                width: p3 * 1.0 + 0.6, // 0.6-1.6m window width
                height: 1.5
            }
        };
    }

    // Action 12: Insert generic opening
    if (actionIndex === 12) {
        return {
            type: 'workspace/opening_insert',
            point: { x: p1 * SCALE, y: p2 * SCALE },
            options: {
                category: 'opening',
                width: p3 * 1.5 + 0.5, // 0.5-2.0m opening
                height: p4 * 1.5 + 1.5 // 1.5-3.0m height
            }
        };
    }

    // Action 13: Begin opening placement
    if (actionIndex === 13) {
        return {
            type: 'workspace/opening_begin',
            point: { x: p1 * SCALE, y: p2 * SCALE },
            options: {
                category: 'door',
                width: 0.9,
                height: 2.1
            }
        };
    }

    // Action 14: Update opening position
    if (actionIndex === 14) {
        return {
            type: 'workspace/opening_update',
            point: { x: p1 * SCALE, y: p2 * SCALE }
        };
    }

    // Action 15: Commit opening
    if (actionIndex === 15) {
        return {
            type: 'workspace/opening_commit'
        };
    }

    // Action 16: Cancel opening
    if (actionIndex === 16) {
        return {
            type: 'workspace/opening_cancel'
        };
    }

    // Actions 17-19: Reserved for future opening commands

    // === SHAPE DRAWING COMMANDS (20-29) ===

    // Action 20: Click (general interaction)
    if (actionIndex === 20) {
        return {
            type: 'workspace/click',
            point: { x: p1 * SCALE, y: p2 * SCALE }
        };
    }

    // Action 21: Create room from points
    if (actionIndex === 21) {
        // Simplified: create a rectangular room
        const x1 = p1 * SCALE;
        const y1 = p2 * SCALE;
        const x2 = p3 * SCALE;
        const y2 = p4 * SCALE;
        return {
            type: 'workspace/create_room',
            points: [
                { x: x1, y: y1 },
                { x: x2, y: y1 },
                { x: x2, y: y2 },
                { x: x1, y: y2 }
            ]
        };
    }

    // Actions 22-29: Reserved for other shape types

    // === SELECTION & TRANSFORMATION (30-39) ===

    // Action 30: Select tool - wall
    if (actionIndex === 30) {
        return {
            type: 'workspace/select_tool',
            tool: 'wall'
        };
    }

    // Action 31: Select tool - opening
    if (actionIndex === 31) {
        return {
            type: 'workspace/select_tool',
            tool: 'opening'
        };
    }

    // Action 32: Select tool - select (cursor)
    if (actionIndex === 32) {
        return {
            type: 'workspace/select_tool',
            tool: 'select'
        };
    }

    // Action 37: Select tool - circle
    if (actionIndex === 37) {
        return {
            type: 'workspace/select_tool',
            tool: 'circle'
        };
    }

    // Action 38: Select tool - rectangle
    if (actionIndex === 38) {
        return {
            type: 'workspace/select_tool',
            tool: 'rectangle'
        };
    }

    // Action 33: Move selection
    if (actionIndex === 33) {
        return {
            type: 'workspace/move_selection',
            delta: { x: (p1 - 0.5) * 2.0, y: (p2 - 0.5) * 2.0 } // -1 to +1 meter
        };
    }

    // Action 34: Delete selection
    if (actionIndex === 34) {
        return {
            type: 'workspace/delete_selection'
        };
    }

    // Action 35: Confirm current shape
    if (actionIndex === 35) {
        return {
            type: 'workspace/confirm_current_shape'
        };
    }

    // Action 36: Cancel drawing
    if (actionIndex === 36) {
        return {
            type: 'workspace/cancel_drawing'
        };
    }

    // Actions 37-39: Reserved for other selection/transformation

    // === UTILITY COMMANDS (40-47) ===

    // Action 40: Undo
    if (actionIndex === 40) {
        return {
            type: 'workspace/undo'
        };
    }

    // Action 41: Redo
    if (actionIndex === 41) {
        return {
            type: 'workspace/redo'
        };
    }

    // Action 42: Set drawing mode - one-time
    if (actionIndex === 42) {
        return {
            type: 'workspace/set_drawing_mode',
            mode: 'one-time'
        };
    }

    // Action 43: Set drawing mode - chain
    if (actionIndex === 43) {
        return {
            type: 'workspace/set_drawing_mode',
            mode: 'chain'
        };
    }

    // Action 44: Update cursor position (noop alternative)
    if (actionIndex === 44) {
        return {
            type: 'workspace/update_cursor',
            point: { x: p1 * SCALE, y: p2 * SCALE }
        };
    }

    // Action 45: Set wall thickness
    if (actionIndex === 45) {
        return {
            type: 'workspace/wall_set_thickness',
            thickness: p1 * 0.3 + 0.1 // 0.1-0.4m thickness
        };
    }

    // Action 46: Set wall alignment - outside
    if (actionIndex === 46) {
        return {
            type: 'workspace/wall_set_alignment',
            alignment: 'outside'
        };
    }

    // Action 47: Set wall alignment - center
    if (actionIndex === 47) {
        return {
            type: 'workspace/wall_set_alignment',
            alignment: 'center'
        };
    }

    // Default: no-op (should not reach here)
    return null;
}
