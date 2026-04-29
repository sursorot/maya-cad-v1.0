/**
 * Contextual Hints System
 * 
 * Provides real-time, context-aware hints showing users which keyboard shortcuts
 * and actions are available based on the current app state.
 */

// Types
export type {
  Hint,
  HintCategory,
  HintPriority,
  HintContext,
  ContextRule,
  ContextualHint,
  ToolHints,
  SelectionHints,
  HintsRegistry,
  HintsDisplayConfig,
  KeyBinding,
  ShapeType,
} from './types';

export { DEFAULT_HINTS_CONFIG } from './types';

// Hints Registry & Data
export {
  HINTS_REGISTRY,
  GLOBAL_HINTS,
  MODE_HINTS,
  TOOL_SWITCH_HINTS,
  SELECTION_HINTS,
  CONFIRM_HINTS,
  TOOL_HINTS,
  SHAPE_SELECTION_HINTS,
  CONTEXTUAL_HINTS,
  WORKFLOW_HINTS,
} from './contextualHints';

// Utility Functions
export {
  getToolHints,
  getGlobalHints,
  getModeHints,
  getToolSwitchHints,
  getSelectionHints,
  getConfirmHints,
  getAllHintsGrouped,
  sortHintsByPriority,
  getDisplayHints,
} from './contextualHints';

// Context Detection Hook
export {
  useContextualHints,
  useContextualHintsFromController,
  deriveHintContext,
  matchesContextRule,
  shouldShowHint,
  collectHintsForContext,
} from './useContextualHints';

export type {
  UseContextualHintsOptions,
  ContextualHintsResult,
} from './useContextualHints';

// UI Components
export { HintsBar } from './HintsBar';
export type { HintsBarProps } from './HintsBar';

export { ShortcutsModal } from './ShortcutsModal';
export type { ShortcutsModalProps } from './ShortcutsModal';

