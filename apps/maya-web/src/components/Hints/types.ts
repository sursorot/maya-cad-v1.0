/**
 * Contextual Hints System - Type Definitions
 * 
 * This module defines the types for the contextual hints system that provides
 * real-time keyboard shortcut and action hints based on the current app state.
 */

import type { ToolType, Shape, DrawingMode, GuidelineOrientation } from '../Workspace/types';

// ============================================================================
// Hint Categories
// ============================================================================

/**
 * Categories for organizing hints
 */
export type HintCategory =
  | 'tool-switch'     // Shortcuts to switch between tools
  | 'tool-action'     // Actions specific to the current tool
  | 'drawing'         // Actions during active drawing
  | 'selection'       // Actions on selected shapes
  | 'edit'            // Editing actions (copy, paste, delete)
  | 'history'         // Undo, redo
  | 'navigation'      // Pan, zoom, view controls
  | 'modifier'        // Modifier keys (shift, alt, etc.)
  | 'mode'            // Mode toggles (ortho, snap, etc.)
  | 'confirm'         // Confirm/cancel actions
  | 'help'            // Help and reference
  | 'workflow';       // Next step suggestions based on workflow

/**
 * Priority levels for hint display ordering
 */
export type HintPriority = 'critical' | 'high' | 'medium' | 'low';

// ============================================================================
// Hint Definition
// ============================================================================

/**
 * Platform-specific key representation
 */
export interface KeyBinding {
  /** Display string (e.g., "⌘Z", "Ctrl+Z") */
  display: string;
  /** macOS key combo */
  mac?: string;
  /** Windows/Linux key combo */
  windows?: string;
  /** Raw key code for matching (e.g., "KeyZ", "Enter") */
  code?: string;
  /** Whether Cmd/Ctrl is required */
  meta?: boolean;
  /** Whether Shift is required */
  shift?: boolean;
  /** Whether Alt/Option is required */
  alt?: boolean;
}

/**
 * A single contextual hint
 */
export interface Hint {
  /** Unique identifier */
  id: string;
  /** Keyboard key or combo */
  key: KeyBinding;
  /** Short label for display (e.g., "Undo", "Horizontal") */
  label: string;
  /** Longer description for tooltips/modals */
  description?: string;
  /** Category for grouping */
  category: HintCategory;
  /** Priority for display ordering (higher = more important) */
  priority: HintPriority;
  /** Icon identifier (optional) */
  icon?: string;
}

// ============================================================================
// Context Detection
// ============================================================================

/**
 * Shape type for context detection (simplified from full Shape type)
 */
export type ShapeType = Shape['type'];

/**
 * Current application context derived from WorkspaceSnapshot
 */
export interface HintContext {
  // Tool state
  activeTool: ToolType;
  isDrawing: boolean;
  drawingMode: DrawingMode;
  guidelineOrientation?: GuidelineOrientation;
  
  // Current shape being drawn
  currentShapeType: ShapeType | null;
  
  // Selection state
  hasSelection: boolean;
  selectionCount: number;
  selectedShapeTypes: ShapeType[];
  
  // Special states
  isInChainMode: boolean;
  hasTrimPreview: boolean;
  hasWallPreview: boolean;
  hasOpeningPreview: boolean;
  
  // Mode toggles
  orthoEnabled: boolean;
  snapEnabled: boolean;
  wallsLocked: boolean;
  
  // History state
  canUndo: boolean;
  canRedo: boolean;
  
  // Clipboard state
  hasClipboard: boolean;
  
  // Workflow state - for "next step" suggestions
  workflow: {
    hasWalls: boolean;           // User has created walls
    hasOpenings: boolean;        // User has placed doors/windows
    hasRooms: boolean;           // User has rooms/zones
    hasAssets: boolean;          // User has placed furniture
    hasDimensions: boolean;      // User has added dimensions
    hasGuidelines: boolean;      // User has placed guidelines
    wallCount: number;           // Number of walls
    openingCount: number;        // Number of openings
    justCreatedWall: boolean;    // User just finished creating a wall
    justCreatedRoom: boolean;    // User just finished creating a room
    justPlacedOpening: boolean;  // User just placed an opening
    justSelectedWall: boolean;   // User just selected a wall
  };
}

/**
 * Context rule for matching hints to contexts
 */
export interface ContextRule {
  /** Tool(s) this rule applies to (undefined = all tools) */
  tools?: ToolType[];
  /** Exclude these tools */
  excludeTools?: ToolType[];
  /** Whether user is actively drawing */
  isDrawing?: boolean;
  /** Whether user has selection */
  hasSelection?: boolean;
  /** Minimum selection count */
  minSelectionCount?: number;
  /** Selected shape types required */
  selectedShapeTypes?: ShapeType[];
  /** Special state flags */
  isInChainMode?: boolean;
  hasTrimPreview?: boolean;
  /** Custom matcher function */
  match?: (context: HintContext) => boolean;
}

/**
 * A hint with its activation context rules
 */
export interface ContextualHint {
  hint: Hint;
  /** When this hint should be shown */
  showWhen: ContextRule;
  /** When this hint should be hidden (overrides showWhen) */
  hideWhen?: ContextRule;
}

// ============================================================================
// Hints Registry Structure
// ============================================================================

/**
 * Tool-specific hints organized by drawing state
 */
export interface ToolHints {
  /** Hints when tool is selected but not actively drawing */
  idle: Hint[];
  /** Hints while actively drawing */
  drawing: Hint[];
  /** Hints when previewing (e.g., wall endpoint, opening placement) */
  preview: Hint[];
}

/**
 * Selection-based hints
 */
export interface SelectionHints {
  /** No selection */
  none: Hint[];
  /** Single shape selected */
  single: Hint[];
  /** Multiple shapes selected */
  multi: Hint[];
  /** Hints specific to selected shape types */
  byShapeType: Partial<Record<ShapeType, Hint[]>>;
}

/**
 * Complete hints registry
 */
export interface HintsRegistry {
  /** Global hints (always potentially relevant) */
  global: Hint[];
  /** Tool-specific hints */
  tools: Partial<Record<ToolType, ToolHints>>;
  /** Selection-based hints */
  selection: SelectionHints;
  /** All contextual hints with rules */
  contextual: ContextualHint[];
}

// ============================================================================
// Display Configuration
// ============================================================================

/**
 * Configuration for hints display
 */
export interface HintsDisplayConfig {
  /** Maximum number of hints to show in the bar */
  maxHints: number;
  /** Show keyboard key badges */
  showKeys: boolean;
  /** Show descriptions on hover */
  showDescriptions: boolean;
  /** Group hints by category */
  groupByCategory: boolean;
  /** Categories to show (in order) */
  visibleCategories: HintCategory[];
}

/**
 * Default display configuration
 */
export const DEFAULT_HINTS_CONFIG: HintsDisplayConfig = {
  maxHints: 6,
  showKeys: true,
  showDescriptions: true,
  groupByCategory: false,
  visibleCategories: [
    'tool-action',
    'drawing',
    'confirm',
    'selection',
    'edit',
    'mode',
    'history',
    'navigation',
    'help',
  ],
};

