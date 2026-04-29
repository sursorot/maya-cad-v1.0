/**
 * Contextual Hints Registry
 * 
 * Complete registry of all keyboard shortcuts and contextual hints for Maya.
 * Organized by category, tool, and context for efficient lookup.
 */

import type {
  Hint,
  HintCategory,
  HintPriority,
  ContextualHint,
  HintsRegistry,
  ToolHints,
  KeyBinding,
} from './types';
import type { ToolType } from '../Workspace/types';

// ============================================================================
// Helper Functions
// ============================================================================

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

/**
 * Create a simple key binding
 */
const key = (display: string, code?: string): KeyBinding => ({
  display,
  code,
});

/**
 * Create a meta (Cmd/Ctrl) key binding
 */
const metaKey = (baseKey: string, code?: string): KeyBinding => ({
  display: isMac ? `⌘${baseKey}` : `Ctrl+${baseKey}`,
  mac: `⌘${baseKey}`,
  windows: `Ctrl+${baseKey}`,
  code,
  meta: true,
});

/**
 * Create a shift+meta key binding
 */
const shiftMetaKey = (baseKey: string, code?: string): KeyBinding => ({
  display: isMac ? `⌘⇧${baseKey}` : `Ctrl+Shift+${baseKey}`,
  mac: `⌘⇧${baseKey}`,
  windows: `Ctrl+Shift+${baseKey}`,
  code,
  meta: true,
  shift: true,
});

/**
 * Create a hint with defaults
 */
const hint = (
  id: string,
  keyBinding: KeyBinding,
  label: string,
  category: HintCategory,
  priority: HintPriority = 'medium',
  description?: string,
  icon?: string
): Hint => ({
  id,
  key: keyBinding,
  label,
  description,
  category,
  priority,
  icon,
});

// ============================================================================
// Global Hints (Always Available)
// ============================================================================

export const GLOBAL_HINTS: Hint[] = [
  // History
  hint('undo', metaKey('Z', 'KeyZ'), 'Undo', 'history', 'high', 'Undo the last action'),
  hint('redo', shiftMetaKey('Z', 'KeyZ'), 'Redo', 'history', 'high', 'Redo the previously undone action'),
  hint('redo-alt', metaKey('Y', 'KeyY'), 'Redo', 'history', 'low', 'Redo (alternative)'),
  
  // Help
  hint('help', key('?', 'Slash'), 'Shortcuts', 'help', 'low', 'Show keyboard shortcuts reference'),
  
  // Navigation
  hint('pan', key('Space + Drag'), 'Pan', 'navigation', 'low', 'Hold Space and drag to pan the canvas'),
  hint('zoom-in', metaKey('+', 'Equal'), 'Zoom In', 'navigation', 'low', 'Zoom in'),
  hint('zoom-out', metaKey('-', 'Minus'), 'Zoom Out', 'navigation', 'low', 'Zoom out'),
  hint('zoom-fit', metaKey('0', 'Digit0'), 'Fit View', 'navigation', 'low', 'Fit all content in view'),
  hint('zoom-100', metaKey('1', 'Digit1'), '100%', 'navigation', 'low', 'Reset zoom to 100%'),
];

// ============================================================================
// Mode Toggle Hints
// ============================================================================

export const MODE_HINTS: Hint[] = [
  hint('toggle-ortho', key('⇧O', 'KeyO'), 'Ortho', 'mode', 'medium', 'Toggle orthogonal constraint (Shift+O)'),
  hint('toggle-snap', metaKey('P', 'KeyP'), 'Snap', 'mode', 'medium', 'Toggle snapping'),
];

// ============================================================================
// Tool Switch Hints
// ============================================================================

export const TOOL_SWITCH_HINTS: Hint[] = [
  hint('tool-select', key('V', 'KeyV'), 'Select', 'tool-switch', 'medium', 'Switch to Select tool'),
  hint('tool-wall', key('W', 'KeyW'), 'Wall', 'tool-switch', 'medium', 'Switch to Wall tool'),
  hint('tool-opening', key('O', 'KeyO'), 'Opening', 'tool-switch', 'medium', 'Switch to Opening tool (doors/windows)'),
  hint('tool-line', key('L', 'KeyL'), 'Line', 'tool-switch', 'medium', 'Switch to Line tool'),
  hint('tool-polyline', key('P', 'KeyP'), 'Polyline', 'tool-switch', 'low', 'Switch to Polyline tool'),
  hint('tool-arc', key('A', 'KeyA'), 'Arc', 'tool-switch', 'low', 'Switch to Arc tool'),
  hint('tool-circle', key('C', 'KeyC'), 'Circle', 'tool-switch', 'low', 'Switch to Circle tool'),
  hint('tool-rectangle', key('R', 'KeyR'), 'Rectangle', 'tool-switch', 'low', 'Switch to Rectangle tool'),
  hint('tool-guideline', key('G', 'KeyG'), 'Guideline', 'tool-switch', 'low', 'Switch to Guideline tool'),
  hint('tool-trim', key('T', 'KeyT'), 'Trim', 'tool-switch', 'low', 'Switch to Trim tool'),
  hint('tool-marker', key('M', 'KeyM'), 'Marker', 'tool-switch', 'low', 'Switch to Marker tool'),
  hint('tool-dimension', key('D', 'KeyD'), 'Dimension', 'tool-switch', 'low', 'Switch to Dimension tool'),
  hint('tool-zone', key('Z', 'KeyZ'), 'Zone', 'tool-switch', 'low', 'Switch to Zone tool'),
];

// ============================================================================
// Selection & Edit Hints
// ============================================================================

export const SELECTION_HINTS: Hint[] = [
  hint('delete', key('Delete', 'Delete'), 'Delete', 'edit', 'high', 'Delete selected shapes'),
  hint('delete-backspace', key('⌫', 'Backspace'), 'Delete', 'edit', 'high', 'Delete selected shapes'),
  hint('copy', metaKey('C', 'KeyC'), 'Copy', 'edit', 'high', 'Copy selected shapes'),
  hint('paste', metaKey('V', 'KeyV'), 'Paste', 'edit', 'high', 'Paste copied shapes'),
  hint('select-all', metaKey('A', 'KeyA'), 'Select All', 'edit', 'medium', 'Select all shapes on canvas'),
  hint('deselect', key('Esc', 'Escape'), 'Deselect', 'selection', 'medium', 'Clear selection and return to Select tool'),
  hint('add-to-selection', key('Shift + Click'), 'Add', 'selection', 'medium', 'Add to selection'),
  hint('nudge-up', key('↑', 'ArrowUp'), 'Nudge Up', 'selection', 'medium', 'Move selection up (Shift for 10x)'),
  hint('nudge-down', key('↓', 'ArrowDown'), 'Nudge Down', 'selection', 'medium', 'Move selection down (Shift for 10x)'),
  hint('nudge-left', key('←', 'ArrowLeft'), 'Nudge Left', 'selection', 'medium', 'Move selection left (Shift for 10x)'),
  hint('nudge-right', key('→', 'ArrowRight'), 'Nudge Right', 'selection', 'medium', 'Move selection right (Shift for 10x)'),
  // Group/Ungroup
  hint('group', metaKey('G', 'KeyG'), 'Group', 'edit', 'high', 'Group selected shapes'),
  hint('ungroup', shiftMetaKey('G', 'KeyG'), 'Ungroup', 'edit', 'high', 'Ungroup selected groups'),
  // Mirror
  hint('mirror', key('MI'), 'Mirror', 'edit', 'medium', 'Mirror selected shapes'),
  // Explode
  hint('explode', key('X', 'KeyX'), 'Explode', 'edit', 'medium', 'Explode compound shapes into primitives'),
  // Fillet (when two lines selected)
  hint('fillet', key('CF'), 'Fillet', 'edit', 'medium', 'Create rounded corner between two lines'),
];

// ============================================================================
// Confirm/Cancel Hints
// ============================================================================

export const CONFIRM_HINTS: Hint[] = [
  hint('confirm', key('Enter', 'Enter'), 'Confirm', 'confirm', 'critical', 'Confirm current operation'),
  hint('cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'critical', 'Cancel current operation'),
];

// ============================================================================
// Tool-Specific Hints
// ============================================================================

// Guideline Tool
const GUIDELINE_HINTS: ToolHints = {
  idle: [
    hint('guideline-h', key('H', 'KeyH'), 'Horizontal', 'tool-action', 'high', 'Set horizontal orientation'),
    hint('guideline-v', key('V', 'KeyV'), 'Vertical', 'tool-action', 'high', 'Set vertical orientation'),
    hint('guideline-f', key('F', 'KeyF'), 'Freeform', 'tool-action', 'high', 'Set freeform orientation'),
    hint('guideline-click', key('Click'), 'Place', 'tool-action', 'high', 'Click to place guideline'),
  ],
  drawing: [
    hint('guideline-finish', key('Click'), 'Finish', 'drawing', 'high', 'Click to finish guideline'),
    hint('guideline-cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'high', 'Cancel guideline'),
  ],
  preview: [],
};

// Wall Tool
const WALL_HINTS: ToolHints = {
  idle: [
    hint('wall-click', key('Click'), 'Start Wall', 'tool-action', 'high', 'Click to start drawing a wall'),
    hint('wall-shift', key('Shift'), 'Ortho', 'modifier', 'medium', 'Hold for orthogonal constraint'),
  ],
  drawing: [
    hint('wall-click-next', key('Click'), 'Add Point', 'drawing', 'high', 'Click to add wall point'),
    hint('wall-finish', key('Enter', 'Enter'), 'Finish', 'confirm', 'critical', 'Press Enter to finish wall chain'),
    hint('wall-close', key('Double Click'), 'Close', 'drawing', 'medium', 'Double-click to close wall loop'),
    hint('wall-cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'high', 'Cancel wall drawing'),
  ],
  preview: [
    hint('wall-confirm', key('Click'), 'Place', 'confirm', 'high', 'Click to place wall segment'),
  ],
};

// Opening Tool (Door/Window)
const OPENING_HINTS: ToolHints = {
  idle: [
    hint('opening-click', key('Click'), 'Place', 'tool-action', 'high', 'Click on a wall to place opening'),
  ],
  drawing: [],
  preview: [
    hint('opening-confirm', key('Click'), 'Confirm', 'confirm', 'high', 'Click to confirm placement'),
    hint('opening-cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'high', 'Cancel opening placement'),
  ],
};

// Select Tool
const SELECT_HINTS: ToolHints = {
  idle: [
    hint('select-click', key('Click'), 'Select', 'tool-action', 'high', 'Click to select a shape'),
    hint('select-box', key('Drag'), 'Box Select', 'tool-action', 'medium', 'Drag to box select'),
    hint('select-add', key('Shift + Click'), 'Add', 'tool-action', 'medium', 'Shift+Click to add to selection'),
  ],
  drawing: [],
  preview: [],
};

// Measure Tool
const MEASURE_HINTS: ToolHints = {
  idle: [
    hint('measure-start', key('Click'), 'Start Point', 'tool-action', 'high', 'Click to set measurement start'),
  ],
  drawing: [
    hint('measure-end', key('Click'), 'End Point', 'drawing', 'high', 'Click to set measurement end'),
    hint('measure-cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'high', 'Cancel measurement'),
  ],
  preview: [],
};

// Line Tool
const LINE_HINTS: ToolHints = {
  idle: [
    hint('line-start', key('Click'), 'Start', 'tool-action', 'high', 'Click to start line'),
    hint('line-shift', key('Shift'), 'Ortho', 'modifier', 'medium', 'Hold for 45° angles'),
  ],
  drawing: [
    hint('line-end', key('Click'), 'End', 'drawing', 'high', 'Click to finish line'),
    hint('line-cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'high', 'Cancel line'),
  ],
  preview: [],
};

// Polyline Tool
const POLYLINE_HINTS: ToolHints = {
  idle: [
    hint('polyline-start', key('Click'), 'Start', 'tool-action', 'high', 'Click to start polyline'),
  ],
  drawing: [
    hint('polyline-add', key('Click'), 'Add Point', 'drawing', 'high', 'Click to add point'),
    hint('polyline-finish', key('Enter', 'Enter'), 'Finish', 'confirm', 'critical', 'Finish polyline'),
    hint('polyline-close', key('Double Click'), 'Close', 'drawing', 'medium', 'Double-click to close'),
    hint('polyline-cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'high', 'Cancel polyline'),
  ],
  preview: [],
};

// Arc Tool
const ARC_HINTS: ToolHints = {
  idle: [
    hint('arc-start', key('Click'), 'Start', 'tool-action', 'high', 'Click to start arc'),
  ],
  drawing: [
    hint('arc-end', key('Click'), 'End/Control', 'drawing', 'high', 'Click to set end point, then control point'),
    hint('arc-cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'high', 'Cancel arc'),
  ],
  preview: [],
};

// Curve Tool
const CURVE_HINTS: ToolHints = {
  idle: [
    hint('curve-start', key('Click'), 'Start', 'tool-action', 'high', 'Click to start curve'),
  ],
  drawing: [
    hint('curve-add', key('Click'), 'Add Point', 'drawing', 'high', 'Click to add control point'),
    hint('curve-finish', key('Enter', 'Enter'), 'Finish', 'confirm', 'critical', 'Finish curve'),
    hint('curve-cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'high', 'Cancel curve'),
  ],
  preview: [],
};

// Circle Tool
const CIRCLE_HINTS: ToolHints = {
  idle: [
    hint('circle-center', key('Click'), 'Center', 'tool-action', 'high', 'Click to set center'),
  ],
  drawing: [
    hint('circle-radius', key('Click'), 'Radius', 'drawing', 'high', 'Click to set radius'),
    hint('circle-cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'high', 'Cancel circle'),
  ],
  preview: [],
};

// Rectangle Tool
const RECTANGLE_HINTS: ToolHints = {
  idle: [
    hint('rect-corner', key('Click'), 'Corner', 'tool-action', 'high', 'Click to set first corner'),
    hint('rect-shift', key('Shift'), 'Square', 'modifier', 'medium', 'Hold for square'),
  ],
  drawing: [
    hint('rect-opposite', key('Click'), 'Opposite', 'drawing', 'high', 'Click to set opposite corner'),
    hint('rect-cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'high', 'Cancel rectangle'),
  ],
  preview: [],
};

// Trim Tool
const TRIM_HINTS: ToolHints = {
  idle: [
    hint('trim-select', key('Click'), 'Select', 'tool-action', 'high', 'Click on a line segment to select'),
  ],
  drawing: [],
  preview: [
    hint('trim-confirm', key('Enter', 'Enter'), 'Trim', 'confirm', 'critical', 'Press Enter to trim'),
    hint('trim-cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'high', 'Cancel trim'),
  ],
};

// Marker Tool
const MARKER_HINTS: ToolHints = {
  idle: [
    hint('marker-place', key('Click'), 'Place', 'tool-action', 'high', 'Click to place marker'),
  ],
  drawing: [],
  preview: [],
};

// Zone Tool
const ZONE_HINTS: ToolHints = {
  idle: [
    hint('zone-start', key('Click'), 'Start', 'tool-action', 'high', 'Click to start zone boundary'),
  ],
  drawing: [
    hint('zone-add', key('Click'), 'Add Point', 'drawing', 'high', 'Click to add boundary point'),
    hint('zone-finish', key('Enter', 'Enter'), 'Finish', 'confirm', 'critical', 'Finish zone'),
    hint('zone-close', key('Double Click'), 'Close', 'drawing', 'medium', 'Double-click to close'),
    hint('zone-cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'high', 'Cancel zone'),
  ],
  preview: [],
};

// Dimension Tool
const DIMENSION_HINTS: ToolHints = {
  idle: [
    hint('dim-start', key('Click'), 'Start', 'tool-action', 'high', 'Click to set dimension start'),
  ],
  drawing: [
    hint('dim-end', key('Click'), 'End/Offset', 'drawing', 'high', 'Click to set end point, then offset'),
    hint('dim-cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'high', 'Cancel dimension'),
  ],
  preview: [],
};

// Text Tool
const TEXT_HINTS: ToolHints = {
  idle: [
    hint('text-place', key('Click'), 'Place', 'tool-action', 'high', 'Click to place text'),
  ],
  drawing: [
    hint('text-finish', key('Esc', 'Escape'), 'Finish', 'confirm', 'high', 'Finish editing text'),
  ],
  preview: [],
};

// Asset Tool
const ASSET_HINTS: ToolHints = {
  idle: [
    hint('asset-place', key('Click'), 'Place', 'tool-action', 'high', 'Click to place asset'),
    hint('asset-rotate', key('R'), 'Rotate', 'tool-action', 'medium', 'Press R to rotate before placing'),
  ],
  drawing: [],
  preview: [
    hint('asset-confirm', key('Click'), 'Confirm', 'confirm', 'high', 'Click to confirm placement'),
    hint('asset-cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'high', 'Cancel placement'),
  ],
};

// ============================================================================
// Tool Hints Map
// ============================================================================

export const TOOL_HINTS: Partial<Record<ToolType, ToolHints>> = {
  select: SELECT_HINTS,
  measure: MEASURE_HINTS,
  line: LINE_HINTS,
  polyline: POLYLINE_HINTS,
  arc: ARC_HINTS,
  curve: CURVE_HINTS,
  circle: CIRCLE_HINTS,
  rectangle: RECTANGLE_HINTS,
  guideline: GUIDELINE_HINTS,
  trim: TRIM_HINTS,
  marker: MARKER_HINTS,
  wall: WALL_HINTS,
  opening: OPENING_HINTS,
  zone: ZONE_HINTS,
  dimension: DIMENSION_HINTS,
  text: TEXT_HINTS,
  asset: ASSET_HINTS,
};

// ============================================================================
// Shape-Specific Selection Hints
// ============================================================================

export const SHAPE_SELECTION_HINTS: Partial<Record<string, Hint[]>> = {
  wall: [
    hint('wall-curve', key('C + Drag'), 'Curve', 'selection', 'medium', 'Drag center to curve wall'),
    hint('wall-thickness', key('T'), 'Thickness', 'selection', 'low', 'Adjust wall thickness'),
  ],
  opening: [
    hint('opening-flip', key('F', 'KeyF'), 'Flip', 'selection', 'medium', 'Flip opening direction'),
  ],
  room: [
    hint('room-label', key('L', 'KeyL'), 'Label', 'selection', 'medium', 'Edit room label'),
  ],
  text: [
    hint('text-edit', key('Enter', 'Enter'), 'Edit', 'selection', 'high', 'Edit text content'),
  ],
};

// ============================================================================
// Contextual Hints with Rules
// ============================================================================

export const CONTEXTUAL_HINTS: ContextualHint[] = [
  // Undo/Redo - always show when available
  {
    hint: hint('undo', metaKey('Z', 'KeyZ'), 'Undo', 'history', 'high'),
    showWhen: { match: (ctx) => ctx.canUndo },
  },
  {
    hint: hint('redo', shiftMetaKey('Z', 'KeyZ'), 'Redo', 'history', 'high'),
    showWhen: { match: (ctx) => ctx.canRedo },
  },
  
  // Delete - show when selection exists
  {
    hint: hint('delete', key('Delete', 'Delete'), 'Delete', 'edit', 'high'),
    showWhen: { hasSelection: true },
  },
  
  // Copy/Paste - show when selection exists
  {
    hint: hint('copy', metaKey('C', 'KeyC'), 'Copy', 'edit', 'high'),
    showWhen: { hasSelection: true },
  },
  {
    hint: hint('paste', metaKey('V', 'KeyV'), 'Paste', 'edit', 'medium'),
    showWhen: { match: (ctx) => ctx.hasClipboard },
  },
  
  // Ortho toggle - always available
  {
    hint: hint('toggle-ortho', key('O', 'KeyO'), 'Ortho', 'mode', 'medium', 
      'Toggle orthogonal constraint'),
    showWhen: {},
  },
  
  // Cancel - show when drawing
  {
    hint: hint('cancel', key('Esc', 'Escape'), 'Cancel', 'confirm', 'critical'),
    showWhen: { isDrawing: true },
  },
  
  // Finish chain - show in chain mode
  {
    hint: hint('finish-chain', key('Enter', 'Enter'), 'Finish', 'confirm', 'critical'),
    showWhen: { isInChainMode: true },
  },
  
  // Trim confirm - show when trim is ready
  {
    hint: hint('trim-execute', key('Enter', 'Enter'), 'Trim', 'confirm', 'critical'),
    showWhen: { hasTrimPreview: true, tools: ['trim'] },
  },
  
  // Group - show when 2+ shapes selected
  {
    hint: hint('group', metaKey('G', 'KeyG'), 'Group', 'edit', 'high'),
    showWhen: { hasSelection: true, minSelectionCount: 2 },
  },
  
  // Ungroup - show when groups are selected
  {
    hint: hint('ungroup', shiftMetaKey('G', 'KeyG'), 'Ungroup', 'edit', 'high'),
    showWhen: { 
      hasSelection: true, 
      match: (ctx) => ctx.selectedShapeTypes.includes('group'),
    },
  },
  
  // Explode - show when compound shapes selected (polyline, rectangle, group)
  {
    hint: hint('explode', key('X', 'KeyX'), 'Explode', 'edit', 'medium'),
    showWhen: {
      hasSelection: true,
      match: (ctx) => ctx.selectedShapeTypes.some(t => 
        ['polyline', 'rectangle', 'curve', 'group'].includes(t)
      ),
    },
  },
  
  // Guideline orientation hints
  {
    hint: hint('guideline-h', key('H', 'KeyH'), 'Horizontal', 'tool-action', 'high'),
    showWhen: { tools: ['guideline'] },
  },
  {
    hint: hint('guideline-v', key('V', 'KeyV'), 'Vertical', 'tool-action', 'high'),
    showWhen: { tools: ['guideline'] },
  },
  {
    hint: hint('guideline-f', key('F', 'KeyF'), 'Freeform', 'tool-action', 'high'),
    showWhen: { tools: ['guideline'] },
  },
];

// ============================================================================
// Workflow Hints - "Next Step" Suggestions
// ============================================================================

/**
 * Workflow hints suggest logical next steps based on what the user has done.
 * These help guide users through common workflows like:
 * - Wall → Opening → Furniture
 * - Draw shapes → Add dimensions
 * - Select → Style/Edit
 */
export const WORKFLOW_HINTS: ContextualHint[] = [
  // After creating walls, suggest adding openings
  {
    hint: hint(
      'workflow-add-opening',
      key('→ Opening', ''),
      'Add doors/windows',
      'workflow',
      'medium',
      'Press O for Opening tool to add doors and windows to your walls'
    ),
    showWhen: {
      match: (ctx) => 
        ctx.workflow.hasWalls && 
        !ctx.workflow.hasOpenings && 
        ctx.activeTool !== 'opening' &&
        !ctx.isDrawing
    },
  },
  
  // After creating walls with openings, suggest furniture
  {
    hint: hint(
      'workflow-add-furniture',
      key('→ Assets', ''),
      'Add furniture',
      'workflow',
      'low',
      'Use the Assets tool to place furniture and fixtures'
    ),
    showWhen: {
      match: (ctx) => 
        ctx.workflow.hasWalls && 
        ctx.workflow.hasOpenings && 
        !ctx.workflow.hasAssets &&
        ctx.activeTool !== 'asset' &&
        !ctx.isDrawing
    },
  },
  
  // When walls exist but no dimensions, suggest adding them
  {
    hint: hint(
      'workflow-add-dimensions',
      key('→ Dimension', ''),
      'Add measurements',
      'workflow',
      'low',
      'Press D for Dimension tool to annotate measurements'
    ),
    showWhen: {
      match: (ctx) => 
        ctx.workflow.hasWalls && 
        !ctx.workflow.hasDimensions &&
        ctx.workflow.wallCount >= 2 &&
        ctx.activeTool !== 'dimension' &&
        !ctx.isDrawing
    },
  },
  
  // When user selects a wall, suggest opening or styling
  {
    hint: hint(
      'workflow-wall-opening',
      key('O', 'KeyO'),
      'Add opening here',
      'workflow',
      'high',
      'Press O to switch to Opening tool and add a door or window'
    ),
    showWhen: {
      match: (ctx) => 
        ctx.workflow.justSelectedWall &&
        ctx.hasSelection &&
        ctx.selectedShapeTypes.includes('wall')
    },
  },
  
  // After just creating a wall (not currently drawing)
  {
    hint: hint(
      'workflow-wall-continue',
      key('W', 'KeyW'),
      'Continue walls',
      'workflow',
      'medium',
      'Press W to continue drawing more walls'
    ),
    showWhen: {
      match: (ctx) => 
        ctx.workflow.justCreatedWall &&
        ctx.activeTool === 'select' &&
        !ctx.isDrawing
    },
  },
  
  // Suggest zone tool when enclosed walls exist
  {
    hint: hint(
      'workflow-create-zone',
      key('Z', 'KeyZ'),
      'Create room zone',
      'workflow',
      'medium',
      'Press Z to create a zone/room area'
    ),
    showWhen: {
      match: (ctx) => 
        ctx.workflow.wallCount >= 4 &&
        !ctx.workflow.hasRooms &&
        ctx.activeTool !== 'zone' &&
        !ctx.isDrawing
    },
  },
  
  // When starting fresh, suggest wall tool
  {
    hint: hint(
      'workflow-start-walls',
      key('W', 'KeyW'),
      'Start with walls',
      'workflow',
      'medium',
      'Press W to start drawing walls for your floor plan'
    ),
    showWhen: {
      match: (ctx) => 
        !ctx.workflow.hasWalls &&
        !ctx.workflow.hasGuidelines &&
        ctx.activeTool === 'select' &&
        !ctx.isDrawing
    },
  },
  
  // Suggest guidelines for precision work
  {
    hint: hint(
      'workflow-add-guidelines',
      key('G', 'KeyG'),
      'Add guidelines',
      'workflow',
      'low',
      'Press G to add guidelines for precise alignment'
    ),
    showWhen: {
      match: (ctx) => 
        !ctx.workflow.hasGuidelines &&
        ctx.workflow.hasWalls &&
        ctx.activeTool !== 'guideline' &&
        !ctx.isDrawing
    },
  },
];

// ============================================================================
// Complete Registry
// ============================================================================

export const HINTS_REGISTRY: HintsRegistry = {
  global: [...GLOBAL_HINTS, ...MODE_HINTS, ...TOOL_SWITCH_HINTS],
  tools: TOOL_HINTS,
  selection: {
    none: [],
    single: [...SELECTION_HINTS.filter(h => h.id !== 'select-all')],
    multi: [...SELECTION_HINTS],
    byShapeType: SHAPE_SELECTION_HINTS,
  },
  contextual: CONTEXTUAL_HINTS,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get hints for a specific tool and state
 */
export function getToolHints(
  tool: ToolType,
  state: 'idle' | 'drawing' | 'preview'
): Hint[] {
  const toolHints = TOOL_HINTS[tool];
  if (!toolHints) return [];
  return toolHints[state] || [];
}

/**
 * Get all global hints
 */
export function getGlobalHints(): Hint[] {
  return GLOBAL_HINTS;
}

/**
 * Get mode toggle hints
 */
export function getModeHints(): Hint[] {
  return MODE_HINTS;
}

/**
 * Get tool switch shortcuts
 */
export function getToolSwitchHints(): Hint[] {
  return TOOL_SWITCH_HINTS;
}

/**
 * Get selection-related hints
 */
export function getSelectionHints(): Hint[] {
  return SELECTION_HINTS;
}

/**
 * Get confirm/cancel hints
 */
export function getConfirmHints(): Hint[] {
  return CONFIRM_HINTS;
}

/**
 * Get all hints grouped by category for the shortcuts modal
 */
export function getAllHintsGrouped(): Record<HintCategory, Hint[]> {
  const allHints: Hint[] = [
    ...GLOBAL_HINTS,
    ...MODE_HINTS,
    ...TOOL_SWITCH_HINTS,
    ...SELECTION_HINTS,
    ...CONFIRM_HINTS,
    ...Object.values(TOOL_HINTS).flatMap(th => [...th.idle, ...th.drawing, ...th.preview]),
    ...Object.values(SHAPE_SELECTION_HINTS).flat(),
  ].filter((hint): hint is Hint => Boolean(hint));
  
  // Deduplicate by ID
  const uniqueHints = Array.from(
    new Map(allHints.map(h => [h.id, h])).values()
  );
  
  // Group by category
  const grouped: Record<HintCategory, Hint[]> = {
    'tool-switch': [],
    'tool-action': [],
    'drawing': [],
    'selection': [],
    'edit': [],
    'history': [],
    'workflow': [],
    'navigation': [],
    'modifier': [],
    'mode': [],
    'confirm': [],
    'help': [],
  };
  
  uniqueHints.forEach(hint => {
    grouped[hint.category].push(hint);
  });
  
  return grouped;
}

/**
 * Priority order for sorting hints
 */
const PRIORITY_ORDER: Record<HintPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Sort hints by priority (highest first)
 */
export function sortHintsByPriority(hints: Hint[]): Hint[] {
  return [...hints].sort((a, b) => 
    PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]
  );
}

/**
 * Filter and limit hints for display
 */
export function getDisplayHints(hints: Hint[], maxCount: number = 6): Hint[] {
  return sortHintsByPriority(hints).slice(0, maxCount);
}

