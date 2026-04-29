/**
 * useContextualHints Hook
 * 
 * Derives contextual hints from the current workspace state.
 * Provides real-time, context-aware keyboard shortcuts and action hints.
 */

import { useMemo, useSyncExternalStore, useCallback } from 'react';
import type { WorkspaceSnapshot } from '@maya/workspace-domain/workspace';
import type { 
  Hint, 
  HintContext, 
  ContextRule, 
  ContextualHint,
  ShapeType,
  HintCategory,
} from './types';
import { DEFAULT_HINTS_CONFIG } from './types';
import {
  HINTS_REGISTRY,
  GLOBAL_HINTS,
  MODE_HINTS,
  TOOL_HINTS,
  CONTEXTUAL_HINTS,
  WORKFLOW_HINTS,
  sortHintsByPriority,
} from './contextualHints';

// ============================================================================
// Context Derivation
// ============================================================================

/**
 * Derive the current hint context from a workspace snapshot
 */
export function deriveHintContext(
  snapshot: WorkspaceSnapshot,
  options: {
    hasClipboard?: boolean;
    canUndo?: boolean;
    canRedo?: boolean;
    previousSnapshot?: WorkspaceSnapshot | null;
  } = {}
): HintContext {
  const selectedShapeIds = snapshot.selectedShapeIds.length > 0 
    ? snapshot.selectedShapeIds 
    : snapshot.selectedShapeId 
      ? [snapshot.selectedShapeId] 
      : [];
  
  // Get types of selected shapes
  const selectedShapeTypes: ShapeType[] = selectedShapeIds
    .map(id => snapshot.shapes.find(s => s.id === id)?.type)
    .filter((type): type is ShapeType => type !== undefined);
  
  // Determine if there's a wall/opening preview
  const hasWallPreview = snapshot.activeTool === 'wall' && 
    snapshot.isDrawing && 
    snapshot.currentShape?.type === 'wall';
  
  const hasOpeningPreview = snapshot.activeTool === 'opening' && 
    snapshot.isDrawing && 
    snapshot.currentShape?.type === 'opening';
  
  // Check history state from metadata
  const canUndo = options.canUndo ?? (snapshot.metadata?.historyDepth ?? 0) > 0;
  const canRedo = options.canRedo ?? (snapshot.metadata?.futureDepth ?? 0) > 0;
  
  // Derive workflow state by counting shape types
  const shapeCounts = snapshot.shapes.reduce((acc, shape) => {
    acc[shape.type] = (acc[shape.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const wallCount = shapeCounts['wall'] || 0;
  const openingCount = shapeCounts['opening'] || shapeCounts['door'] || shapeCounts['window'] || 0;
  const roomCount = shapeCounts['zone'] || shapeCounts['room'] || 0;
  const assetCount = shapeCounts['asset'] || shapeCounts['furniture'] || 0;
  const dimensionCount = shapeCounts['dimension'] || 0;
  const guidelineCount = shapeCounts['guideline'] || 0;
  
  // Detect "just did X" states by comparing to previous snapshot
  const prevShapeCounts = options.previousSnapshot?.shapes.reduce((acc, shape) => {
    acc[shape.type] = (acc[shape.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};
  
  const prevWallCount = prevShapeCounts['wall'] || 0;
  const prevOpeningCount = prevShapeCounts['opening'] || prevShapeCounts['door'] || prevShapeCounts['window'] || 0;
  const prevRoomCount = prevShapeCounts['zone'] || prevShapeCounts['room'] || 0;
  
  // Detect if user just finished drawing and switched away
  const justCreatedWall = wallCount > prevWallCount && snapshot.activeTool === 'select';
  const justCreatedRoom = roomCount > prevRoomCount && snapshot.activeTool === 'select';
  const justPlacedOpening = openingCount > prevOpeningCount;
  const justSelectedWall = selectedShapeTypes.includes('wall') && selectedShapeIds.length === 1;
  
  return {
    // Tool state
    activeTool: snapshot.activeTool,
    isDrawing: snapshot.isDrawing,
    drawingMode: snapshot.drawingMode,
    guidelineOrientation: snapshot.guidelineOrientation,
    
    // Current shape being drawn
    currentShapeType: snapshot.currentShape?.type ?? null,
    
    // Selection state
    hasSelection: selectedShapeIds.length > 0,
    selectionCount: selectedShapeIds.length,
    selectedShapeTypes,
    
    // Special states
    isInChainMode: snapshot.chainSessionShapeIds.length > 0,
    hasTrimPreview: snapshot.trimState?.isConfirmed ?? false,
    hasWallPreview,
    hasOpeningPreview,
    
    // Mode toggles
    orthoEnabled: snapshot.snapSettings?.ortho ?? false,
    snapEnabled: snapshot.snapSettings?.enabled ?? true,
    wallsLocked: snapshot.wallsLocked ?? false,
    
    // History state
    canUndo,
    canRedo,
    
    // Clipboard state
    hasClipboard: options.hasClipboard ?? false,
    
    // Workflow state
    workflow: {
      hasWalls: wallCount > 0,
      hasOpenings: openingCount > 0,
      hasRooms: roomCount > 0,
      hasAssets: assetCount > 0,
      hasDimensions: dimensionCount > 0,
      hasGuidelines: guidelineCount > 0,
      wallCount,
      openingCount,
      justCreatedWall,
      justCreatedRoom,
      justPlacedOpening,
      justSelectedWall,
    },
  };
}

// ============================================================================
// Context Rule Matching
// ============================================================================

/**
 * Check if a context rule matches the current context
 */
export function matchesContextRule(rule: ContextRule, context: HintContext): boolean {
  // Check tool requirement
  if (rule.tools && rule.tools.length > 0) {
    if (!rule.tools.includes(context.activeTool)) {
      return false;
    }
  }
  
  // Check tool exclusion
  if (rule.excludeTools && rule.excludeTools.length > 0) {
    if (rule.excludeTools.includes(context.activeTool)) {
      return false;
    }
  }
  
  // Check drawing state
  if (rule.isDrawing !== undefined && rule.isDrawing !== context.isDrawing) {
    return false;
  }
  
  // Check selection state
  if (rule.hasSelection !== undefined && rule.hasSelection !== context.hasSelection) {
    return false;
  }
  
  // Check minimum selection count
  if (rule.minSelectionCount !== undefined && context.selectionCount < rule.minSelectionCount) {
    return false;
  }
  
  // Check selected shape types
  if (rule.selectedShapeTypes && rule.selectedShapeTypes.length > 0) {
    const hasRequiredType = rule.selectedShapeTypes.some(type => 
      context.selectedShapeTypes.includes(type)
    );
    if (!hasRequiredType) {
      return false;
    }
  }
  
  // Check chain mode
  if (rule.isInChainMode !== undefined && rule.isInChainMode !== context.isInChainMode) {
    return false;
  }
  
  // Check trim preview
  if (rule.hasTrimPreview !== undefined && rule.hasTrimPreview !== context.hasTrimPreview) {
    return false;
  }
  
  // Custom matcher
  if (rule.match && !rule.match(context)) {
    return false;
  }
  
  return true;
}

/**
 * Check if a contextual hint should be shown
 */
export function shouldShowHint(contextualHint: ContextualHint, context: HintContext): boolean {
  // Check hide conditions first (they override show conditions)
  if (contextualHint.hideWhen && matchesContextRule(contextualHint.hideWhen, context)) {
    return false;
  }
  
  // Check show conditions
  return matchesContextRule(contextualHint.showWhen, context);
}

// ============================================================================
// Hint Collection
// ============================================================================

/**
 * Get tool-specific hints based on current state
 */
function getToolSpecificHints(context: HintContext): Hint[] {
  const toolHints = TOOL_HINTS[context.activeTool];
  if (!toolHints) return [];
  
  // Determine which state we're in
  if (context.isDrawing) {
    // Check for preview state (e.g., wall endpoint, opening placement)
    if (context.hasWallPreview || context.hasOpeningPreview) {
      return [...toolHints.preview, ...toolHints.drawing];
    }
    return toolHints.drawing;
  }
  
  // Check for special preview states
  if (context.hasTrimPreview) {
    return toolHints.preview;
  }
  
  return toolHints.idle;
}

/**
 * Get selection-based hints
 */
function getSelectionHints(context: HintContext): Hint[] {
  const { selection } = HINTS_REGISTRY;
  const hints: Hint[] = [];
  
  if (!context.hasSelection) {
    hints.push(...selection.none);
  } else if (context.selectionCount === 1) {
    hints.push(...selection.single);
    
    // Add shape-specific hints
    const shapeType = context.selectedShapeTypes[0];
    if (shapeType && selection.byShapeType[shapeType]) {
      hints.push(...selection.byShapeType[shapeType]!);
    }
  } else {
    hints.push(...selection.multi);
  }
  
  return hints;
}

/**
 * Get all applicable contextual hints based on rules
 */
function getContextualHintsForContext(context: HintContext): Hint[] {
  return CONTEXTUAL_HINTS
    .filter(ch => shouldShowHint(ch, context))
    .map(ch => ch.hint);
}

/**
 * Get workflow "next step" hints based on current state
 */
function getWorkflowHints(context: HintContext): Hint[] {
  return WORKFLOW_HINTS
    .filter(ch => shouldShowHint(ch, context))
    .map(ch => ch.hint);
}

/**
 * Collect all relevant hints for the current context
 */
export function collectHintsForContext(context: HintContext): Hint[] {
  const allHints: Hint[] = [];
  
  // 1. Add tool-specific hints (highest priority for current workflow)
  allHints.push(...getToolSpecificHints(context));
  
  // 2. Add contextual hints based on rules
  allHints.push(...getContextualHintsForContext(context));
  
  // 3. Add selection hints if relevant
  if (context.hasSelection) {
    allHints.push(...getSelectionHints(context));
  }
  
  // 4. Add workflow "next step" suggestions (lower priority)
  allHints.push(...getWorkflowHints(context));
  
  // Deduplicate by hint ID, key display, AND label
  // This prevents showing:
  // - Same keyboard shortcut multiple times (e.g., "wall-cancel" and "cancel" both use Escape)
  // - Same action with different keys (e.g., "Delete" with Delete key and Backspace)
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const seenLabels = new Set<string>();
  const dedupedHints = allHints.filter(hint => {
    // Skip if we've seen this exact hint ID
    if (seenIds.has(hint.id)) return false;
    
    // Skip if we've seen this keyboard shortcut already
    const keyNormalized = hint.key.display.toLowerCase().trim();
    if (seenKeys.has(keyNormalized)) return false;
    
    // Skip if we've seen this label already (prevents "Delete" showing twice)
    const labelNormalized = hint.label.toLowerCase().trim();
    if (seenLabels.has(labelNormalized)) return false;
    
    seenIds.add(hint.id);
    seenKeys.add(keyNormalized);
    seenLabels.add(labelNormalized);
    return true;
  });
  
  return sortHintsByPriority(dedupedHints);
}

// ============================================================================
// Main Hook
// ============================================================================

export interface UseContextualHintsOptions {
  /** Maximum number of hints to return */
  maxHints?: number;
  /** Categories to include (in priority order) */
  includeCategories?: HintCategory[];
  /** Categories to exclude */
  excludeCategories?: HintCategory[];
  /** Whether to include global hints */
  includeGlobal?: boolean;
  /** Whether to include mode hints (ortho, snap) */
  includeModeHints?: boolean;
}

export interface ContextualHintsResult {
  /** Current hint context */
  context: HintContext;
  /** Primary hints for display (filtered and sorted) */
  hints: Hint[];
  /** All applicable hints (before filtering) */
  allHints: Hint[];
  /** Tool-specific hints only */
  toolHints: Hint[];
  /** Selection hints only */
  selectionHints: Hint[];
  /** Workflow "next step" hints */
  workflowHints: Hint[];
  /** Global hints (always available) */
  globalHints: Hint[];
  /** Mode toggle hints */
  modeHints: Hint[];
  /** Get hints for the shortcuts modal, grouped by category */
  getGroupedHints: () => Record<HintCategory, Hint[]>;
}

/**
 * Hook to get contextual hints based on workspace state
 * 
 * This hook should be used within a WorkspaceControllerProvider.
 * It subscribes to the workspace state and returns relevant hints
 * based on the current tool, selection, and drawing state.
 * 
 * @example
 * ```tsx
 * function HintsBar() {
 *   const { hints, context } = useContextualHints({ maxHints: 5 });
 *   
 *   return (
 *     <div className="hints-bar">
 *       {hints.map(hint => (
 *         <HintBadge key={hint.id} hint={hint} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useContextualHints(
  snapshot: WorkspaceSnapshot,
  options: UseContextualHintsOptions & {
    hasClipboard?: boolean;
    canUndo?: boolean;
    canRedo?: boolean;
  } = {}
): ContextualHintsResult {
  const {
    maxHints = DEFAULT_HINTS_CONFIG.maxHints,
    includeCategories,
    excludeCategories,
    includeGlobal = false,
    includeModeHints = true,
    hasClipboard = false,
    canUndo,
    canRedo,
  } = options;
  
  // Derive context from snapshot
  const context = useMemo(() => 
    deriveHintContext(snapshot, { hasClipboard, canUndo, canRedo }),
    [snapshot, hasClipboard, canUndo, canRedo]
  );
  
  // Get tool-specific hints
  const toolHints = useMemo(() => 
    getToolSpecificHints(context),
    [context]
  );
  
  // Get selection hints
  const selectionHints = useMemo(() => 
    getSelectionHints(context),
    [context]
  );
  
  // Collect all hints
  const allHints = useMemo(() => 
    collectHintsForContext(context),
    [context]
  );
  
  // Filter and limit hints for display
  const hints = useMemo(() => {
    let filtered = [...allHints];
    
    // Filter by included categories
    if (includeCategories && includeCategories.length > 0) {
      filtered = filtered.filter(h => includeCategories.includes(h.category));
    }
    
    // Filter by excluded categories
    if (excludeCategories && excludeCategories.length > 0) {
      filtered = filtered.filter(h => !excludeCategories.includes(h.category));
    }
    
    // Helper to check if a hint would conflict with existing hints
    const hasConflict = (hint: Hint) => {
      const keyNormalized = hint.key.display.toLowerCase().trim();
      const labelNormalized = hint.label.toLowerCase().trim();
      return filtered.some(f => 
        f.key.display.toLowerCase().trim() === keyNormalized ||
        f.label.toLowerCase().trim() === labelNormalized
      );
    };
    
    // Add global hints if requested
    if (includeGlobal) {
      const globalToAdd = GLOBAL_HINTS.filter(h => {
        // Don't duplicate by ID, key, or label
        if (filtered.some(f => f.id === h.id)) return false;
        if (hasConflict(h)) return false;
        // Check category filters
        if (includeCategories && !includeCategories.includes(h.category)) return false;
        if (excludeCategories && excludeCategories.includes(h.category)) return false;
        return true;
      });
      filtered = [...filtered, ...globalToAdd];
    }
    
    // Add mode hints if requested
    if (includeModeHints) {
      const modeToAdd = MODE_HINTS.filter(h => {
        if (filtered.some(f => f.id === h.id)) return false;
        if (hasConflict(h)) return false;
        if (includeCategories && !includeCategories.includes(h.category)) return false;
        if (excludeCategories && excludeCategories.includes(h.category)) return false;
        return true;
      });
      filtered = [...filtered, ...modeToAdd];
    }
    
    // Sort and limit
    return sortHintsByPriority(filtered).slice(0, maxHints);
  }, [allHints, maxHints, includeCategories, excludeCategories, includeGlobal, includeModeHints]);
  
  // Get workflow hints for current context
  const workflowHints = useMemo(() => getWorkflowHints(context), [context]);
  
  // Get grouped hints for shortcuts modal
  const getGroupedHints = useCallback(() => {
    const grouped: Record<HintCategory, Hint[]> = {
      'tool-switch': [],
      'tool-action': [],
      'drawing': [],
      'selection': [],
      'edit': [],
      'history': [],
      'navigation': [],
      'modifier': [],
      'mode': [],
      'confirm': [],
      'help': [],
      'workflow': [],
    };
    
    // Add all hints from registry
    const allRegistryHints = [
      ...GLOBAL_HINTS,
      ...MODE_HINTS,
      ...HINTS_REGISTRY.global,
      ...toolHints,
      ...selectionHints,
      ...workflowHints,
    ];
    
    // Deduplicate by ID and key display
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    allRegistryHints.forEach(hint => {
      if (seenIds.has(hint.id)) return;
      const keyNormalized = hint.key.display.toLowerCase().trim();
      if (keyNormalized && seenKeys.has(keyNormalized)) return;
      seenIds.add(hint.id);
      if (keyNormalized) seenKeys.add(keyNormalized);
      grouped[hint.category].push(hint);
    });
    
    return grouped;
  }, [toolHints, selectionHints, workflowHints]);
  
  return {
    context,
    hints,
    allHints,
    toolHints,
    selectionHints,
    workflowHints,
    globalHints: GLOBAL_HINTS,
    modeHints: MODE_HINTS,
    getGroupedHints,
  };
}

// ============================================================================
// Convenience Hook for Controller Context
// ============================================================================

/**
 * Hook that works with WorkspaceController directly
 * Use this when you have access to the controller
 */
export function useContextualHintsFromController(
  controller: {
    snapshot: WorkspaceSnapshot;
    subscribe: (callback: () => void) => () => void;
    hasClipboard?: () => boolean;
  },
  options: UseContextualHintsOptions = {}
): ContextualHintsResult {
  // Subscribe to controller changes
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    () => controller.snapshot,
    () => controller.snapshot
  );
  
  const hasClipboard = controller.hasClipboard?.() ?? false;
  const canUndo = (snapshot.metadata?.historyDepth ?? 0) > 0;
  const canRedo = (snapshot.metadata?.futureDepth ?? 0) > 0;
  
  return useContextualHints(snapshot, {
    ...options,
    hasClipboard,
    canUndo,
    canRedo,
  });
}

export default useContextualHints;

