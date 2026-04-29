/**
 * Data Collector Utility
 * 
 * Utilities for collecting, analyzing, and exporting training examples
 * from the workspace for RL training.
 * 
 * Key Design Decisions:
 * - Cursor movements (workspace/update_cursor) are filtered out by default
 *   as they add noise without meaningful signal for tool-calling models
 * - Full snapshots are stored only for meaningful state transitions
 * - Transient UI state is stripped from snapshots to reduce file size
 */

import type { WorkspaceSnapshot } from '@maya/workspace-domain/workspace/core';
import type {
    TrainingExample,
    TrainingConstraints,
    DifficultyLevel,
    CommandLogEntry,
    ContractSession,
    ContractPromptTurn,
    ContractAgentTurn,
} from './types';

const WORKSPACE_CONTRACT_VERSION = '1.0.0';
const TRAINING_DATA_VERSION = '1.0.0';
const REWARD_VERSION = '1.0';
const BRIDGE_VERSION = '1.0';
const TOOL_VERSION = 'workspace-data-mode/0.2.0';

/**
 * Commands to exclude from training data.
 * These commands don't provide meaningful signal for model training:
 * - cursor updates: Just mouse movement noise
 * - hover events: Transient UI state
 */
const EXCLUDED_COMMAND_TYPES = new Set([
    'workspace/update_cursor',  // Mouse movement - high frequency, low signal
]);

/**
 * Commands that are important for training but should have optimized snapshots
 * (only store the snapshot delta or key state changes)
 */
const HIGH_VALUE_COMMANDS = new Set([
    'workspace/click',
    'workspace/select_tool',
    'workspace/create_wall',
    'workspace/wall_rectangle',
    'workspace/opening_insert',
    'workspace/opening_begin',
    'workspace/opening_commit',
    'workspace/create_room',
    'workspace/move_selection',
    'workspace/rotate_selection',
    'workspace/resize_selection',
    'workspace/delete_selection',
    'workspace/undo',
    'workspace/redo',
    'workspace/select_shapes',
    'workspace/set_drawing_mode',
    'workspace/set_guideline_orientation',
    'workspace/place_asset',
]);

/**
 * Action Index Mapping (from docs/contracts/action_mapping_v1.md)
 * 
 * Maps command types to their canonical action indices for RL training.
 * Some commands have multiple indices depending on parameters (e.g., select_tool).
 * This mapping returns the base index; parameter-specific indices should be
 * computed by the caller if needed.
 */
const ACTION_INDEX_MAP: Record<string, number | ((cmd: Record<string, unknown>) => number)> = {
    // Creative actions (0-29)
    'workspace/create_wall': 0,
    'workspace/wall_rectangle': 1,
    'workspace/wall_begin': 2,
    'workspace/wall_update': 3,
    'workspace/wall_commit': 4,
    'workspace/wall_cancel': 5,
    'workspace/commit_chain_session': 6,
    'workspace/abort_chain_session': 7,
    'workspace/wall_set_control_point': (cmd) => cmd.point === null ? 9 : 8,
    'workspace/opening_insert': (cmd) => {
        const category = cmd.category as string | undefined;
        if (category === 'door') return 10;
        if (category === 'window') return 11;
        return 12;
    },
    'workspace/opening_begin': 13,
    'workspace/opening_update': 14,
    'workspace/opening_commit': 15,
    'workspace/opening_cancel': 16,
    'workspace/click': 20,
    'workspace/create_room': 21,
    
    // Selection actions (30-39)
    'workspace/select_tool': (cmd) => {
        const tool = cmd.tool as string | undefined;
        switch (tool) {
            case 'wall': return 30;
            case 'opening': return 31;
            case 'select': return 32;
            case 'circle': return 37;
            case 'rectangle': return 38;
            default: return 32; // Default to select
        }
    },
    'workspace/select_shapes': 32,  // Maps to select tool conceptually
    
    // Transformation actions (33-36)
    'workspace/move_selection': 33,
    'workspace/delete_selection': 34,
    'workspace/confirm_current_shape': 35,
    'workspace/cancel_drawing': 36,
    
    // Utility actions (40-47)
    'workspace/undo': 40,
    'workspace/redo': 41,
    'workspace/set_drawing_mode': (cmd) => {
        const mode = cmd.mode as string | undefined;
        return mode === 'chain' ? 43 : 42;
    },
    'workspace/update_cursor': 44,  // Included for completeness, but filtered out
    'workspace/wall_set_thickness': 45,
    'workspace/wall_set_alignment': (cmd) => {
        const alignment = cmd.alignment as string | undefined;
        return alignment === 'outside' ? 46 : 47;
    },
};

/**
 * Get the action index for a workspace command.
 * Returns null if the command type is not in the action mapping.
 * 
 * Per docs/contracts/action_mapping_v1.md, implementations MUST emit
 * the actionIndex in every turn record for deterministic replay.
 */
export function getActionIndex(command: Record<string, unknown>): number | null {
    const commandType = command.type as string | undefined;
    if (!commandType) return null;
    
    const mapping = ACTION_INDEX_MAP[commandType];
    if (mapping === undefined) return null;
    
    if (typeof mapping === 'function') {
        return mapping(command);
    }
    
    return mapping;
}

/**
 * Generate a unique ID for a training example
 */
export function generateExampleId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `example-${timestamp}-${random}`;
}

/**
 * Filter command log to exclude low-value commands (cursor movements, etc.)
 * This significantly reduces training data size while preserving all meaningful actions.
 */
export function filterCommandLog(commandLog: CommandLogEntry[]): CommandLogEntry[] {
    return commandLog.filter(entry => {
        const commandType = (entry.command as { type?: string }).type;
        return commandType && !EXCLUDED_COMMAND_TYPES.has(commandType);
    });
}

/**
 * Check if a command is high-value for training
 */
export function isHighValueCommand(command: { type?: string }): boolean {
    return command.type ? HIGH_VALUE_COMMANDS.has(command.type) : false;
}

/**
 * Optimize a snapshot for storage by removing transient UI state
 * that isn't relevant for training (hover states, cursor position, etc.)
 */
export function optimizeSnapshotForTraining(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
    // Create a clean copy without mutating the original
    const optimized = { ...snapshot };
    
    // Remove transient UI state that adds no training value
    optimized.hoveredShapeId = null;
    optimized.lastCursorPoint = null;
    
    // Keep the currentShape only if we're in the middle of drawing
    // (it shows the in-progress state which is valuable for training)
    if (!optimized.isDrawing) {
        optimized.currentShape = null;
    }
    
    // Remove drawing history/future - we have full snapshots per turn
    optimized.drawingHistory = [];
    optimized.drawingFuture = [];
    
    return optimized;
}

/**
 * Statistics about the training example for debugging and analysis
 */
export interface TrainingExampleStats {
    totalCommands: number;
    filteredCommands: number;
    commandBreakdown: Record<string, number>;
    shapeCount: number;
    shapesCreated: string[];  // Types of shapes in final state
    estimatedTokens: number;  // Rough estimate for LLM context planning
}

/**
 * Compute statistics about a training example
 */
export function computeExampleStats(
    rawCommandLog: CommandLogEntry[],
    filteredCommandLog: CommandLogEntry[],
    finalSnapshot: WorkspaceSnapshot
): TrainingExampleStats {
    const commandBreakdown: Record<string, number> = {};
    
    for (const entry of rawCommandLog) {
        const commandType = (entry.command as { type?: string }).type || 'unknown';
        commandBreakdown[commandType] = (commandBreakdown[commandType] || 0) + 1;
    }
    
    const shapesCreated = finalSnapshot.shapes.map(s => s.type);
    const shapeTypeCounts: Record<string, number> = {};
    for (const type of shapesCreated) {
        shapeTypeCounts[type] = (shapeTypeCounts[type] || 0) + 1;
    }
    
    // Rough token estimate: ~4 chars per token average for JSON
    const estimatedSize = JSON.stringify({ 
        turns: filteredCommandLog.length,
        shapes: finalSnapshot.shapes.length 
    }).length;
    const estimatedTokens = Math.ceil(estimatedSize / 4) * filteredCommandLog.length;
    
    return {
        totalCommands: rawCommandLog.length,
        filteredCommands: filteredCommandLog.length,
        commandBreakdown,
        shapeCount: finalSnapshot.shapes.length,
        shapesCreated: Object.entries(shapeTypeCounts).map(([t, c]) => `${t}:${c}`),
        estimatedTokens,
    };
}

/**
 * Analyze a workspace snapshot to extract constraints
 */
export function analyzeSnapshot(snapshot: WorkspaceSnapshot): TrainingConstraints {
    const constraints: TrainingConstraints = {};

    // Count rooms
    const rooms = snapshot.shapes.filter(s => s.type === 'room');
    if (rooms.length > 0) {
        constraints.roomCount = rooms.length;

        // Get dimensions from first room
        const firstRoom = rooms[0];
        if (firstRoom.type === 'room' && firstRoom.points.length >= 4) {
            // Simple rectangle detection
            const xs = firstRoom.points.map(p => p.x);
            const ys = firstRoom.points.map(p => p.y);
            const width = Math.max(...xs) - Math.min(...xs);
            const height = Math.max(...ys) - Math.min(...ys);

            if (width > 0 && height > 0) {
                constraints.dimensions = { width, height };
            }
        }
    }

    // Detect features
    const features: string[] = [];

    const openings = snapshot.shapes.filter(s => s.type === 'opening');
    openings.forEach(opening => {
        if (opening.type === 'opening') {
            if (opening.category === 'door') features.push('door');
            if (opening.category === 'window') features.push('window');
        }
    });

    const walls = snapshot.shapes.filter(s => s.type === 'wall');
    const archedWalls = walls.filter(w => w.type === 'wall' && w.controlPoint);
    if (archedWalls.length > 0) {
        features.push('arched-wall');
    }

    if (features.length > 0) {
        constraints.features = Array.from(new Set(features)); // unique
    }

    return constraints;
}

export interface PromptStepInput {
    id: string;
    text: string;
    timestamp: number;
}

export interface CreateTrainingExampleOptions {
    sessionId?: string;
    promptSteps: PromptStepInput[];
    initialSnapshot: WorkspaceSnapshot;
    finalSnapshot: WorkspaceSnapshot;
    commandLog: CommandLogEntry[];
    difficulty?: DifficultyLevel;
}

function toPromptThread(steps: PromptStepInput[]): ContractPromptTurn[] {
    return steps.map((step, index) => ({
        turn_id: `${step.id || `prompt-${index}`}`,
        speaker: 'user',
        text: step.text.trim(),
        timestamp: step.timestamp,
    }));
}

function toAgentTurns(
    commandLog: CommandLogEntry[], 
    sessionId: string,
    optimizeSnapshots: boolean = true
): ContractAgentTurn[] {
    // Filter out low-value commands (cursor movements, etc.)
    const filteredLog = filterCommandLog(commandLog);
    
    return filteredLog.map((entry, index) => {
        // Compute action_index from the command if not already set
        // Per action_mapping_v1.md, every turn MUST include actionIndex for replay
        const actionIndex = entry.actionIndex ?? getActionIndex(entry.command as Record<string, unknown>);
        
        return {
            turn_id: `${sessionId}-cmd-${index}`,
            speaker: 'agent',
            timestamp: entry.timestamp,
            command: entry.command,
            action_index: actionIndex,
            // Optimize snapshot to remove transient UI state
            result_snapshot: optimizeSnapshots 
                ? optimizeSnapshotForTraining(entry.snapshot)
                : entry.snapshot,
            reward: null,
        };
    });
}

async function computeSha256Base64(payload: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
        const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(digest));
        const hashString = btoa(String.fromCharCode(...hashArray));
        return `sha256-${hashString}`;
    }
    // Fallback (non-crypto environments)
    return `sha256-unavailable-${Date.now()}`;
}

/**
 * Create a training example from current workspace state
 * 
 * This function:
 * 1. Filters out cursor movements and other low-value commands
 * 2. Optimizes snapshots to remove transient UI state  
 * 3. Adds statistics for debugging and analysis
 */
export async function createTrainingExample(options: CreateTrainingExampleOptions): Promise<TrainingExample> {
    const {
        promptSteps,
        initialSnapshot,
        finalSnapshot,
        commandLog,
        difficulty = 'level-1',
        sessionId = generateExampleId(),
    } = options;

    const normalizedPrompt = promptSteps[0]?.text.trim() ?? '';
    const constraints = analyzeSnapshot(finalSnapshot);
    const createdAt = new Date().toISOString();
    
    // Filter the command log to remove cursor movements and other noise
    const filteredCommandLog = filterCommandLog(commandLog);
    
    // Compute statistics before and after filtering
    const stats = computeExampleStats(commandLog, filteredCommandLog, finalSnapshot);

    const contract: ContractSession = {
        tdc_version: TRAINING_DATA_VERSION,
        workspace_contract_version: WORKSPACE_CONTRACT_VERSION,
        reward_version: REWARD_VERSION,
        bridge_version: BRIDGE_VERSION,
        session_id: sessionId,
        prompt_thread: toPromptThread(promptSteps),
        // Optimize initial snapshot - remove transient state
        initial_snapshot: optimizeSnapshotForTraining(initialSnapshot),
        // toAgentTurns now filters commands internally and optimizes snapshots
        turns: toAgentTurns(commandLog, sessionId, true),
        // Optimize final snapshot
        final_snapshot: optimizeSnapshotForTraining(finalSnapshot),
        constraints,
        difficulty,
        annotations: [],
        signing: {
            hash: '',
            created_by: 'human',
            tool_version: TOOL_VERSION,
        },
    };

    const example: TrainingExample = {
        id: sessionId,
        prompt: normalizedPrompt,
        difficulty,
        targetSnapshot: optimizeSnapshotForTraining(finalSnapshot),
        constraints,
        createdAt,
        contract,
        // Add stats for debugging and analysis
        stats,
    };

    const hash = await computeSha256Base64(JSON.stringify(contract));
    example.contract!.signing.hash = hash;
    
    // Log filtering stats for visibility
    if (stats.totalCommands !== stats.filteredCommands) {
        console.log(
            `[DataCollector] Filtered ${stats.totalCommands - stats.filteredCommands} low-value commands ` +
            `(${stats.totalCommands} → ${stats.filteredCommands}). ` +
            `Breakdown: ${JSON.stringify(stats.commandBreakdown)}`
        );
    }

    return example;
}

/**
 * Download a training example as a JSON file
 */
export function downloadExample(example: TrainingExample): void {
    const json = JSON.stringify(example, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${example.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Store examples in localStorage for session persistence
 */
const STORAGE_KEY = 'maya-training-examples';
const MAX_STORED_EXAMPLES = 50; // Limit to prevent quota exceeded errors

export function saveExampleToStorage(example: TrainingExample): boolean {
    try {
        let stored = getStoredExamples();
        stored.push(example);
        
        // If we have too many examples, remove the oldest ones
        if (stored.length > MAX_STORED_EXAMPLES) {
            console.warn(`Training examples exceeded limit (${MAX_STORED_EXAMPLES}). Removing oldest examples.`);
            stored = stored.slice(-MAX_STORED_EXAMPLES);
        }
        
        const json = JSON.stringify(stored);
        localStorage.setItem(STORAGE_KEY, json);
        return true;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.error('localStorage quota exceeded. Attempting to clear old examples...');
            
            // Try to make room by removing oldest examples
            try {
                let stored = getStoredExamples();
                if (stored.length > 1) {
                    // Remove oldest half of examples
                    const keepCount = Math.max(1, Math.floor(stored.length / 2));
                    stored = stored.slice(-keepCount);
                    stored.push(example);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
                    console.log(`Cleared old examples. Now storing ${stored.length} examples.`);
                    return true;
                } else {
                    // Can't fit even a single example - clear everything and try once more
                    clearStoredExamples();
                    localStorage.setItem(STORAGE_KEY, JSON.stringify([example]));
                    console.log('Cleared all examples and stored new one.');
                    return true;
                }
            } catch (retryError) {
                console.error('Failed to save example even after clearing storage:', retryError);
                // Download the example so it's not lost
                console.log('Downloading example as file to prevent data loss...');
                downloadExample(example);
                return false;
            }
        }
        console.error('Failed to save training example:', error);
        return false;
    }
}

export function getStoredExamples(): TrainingExample[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch {
        return [];
    }
}

export function clearStoredExamples(): void {
    localStorage.removeItem(STORAGE_KEY);
}

export function getExampleCount(): number {
    return getStoredExamples().length;
}

export function getStorageSize(): { bytes: number; formatted: string } {
    const stored = localStorage.getItem(STORAGE_KEY) || '';
    const bytes = new Blob([stored]).size;
    const formatted = bytes < 1024 
        ? `${bytes} B` 
        : bytes < 1024 * 1024 
            ? `${(bytes / 1024).toFixed(1)} KB`
            : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return { bytes, formatted };
}

export function exportAndClearExamples(): void {
    const examples = getStoredExamples();
    if (examples.length === 0) {
        console.log('No examples to export.');
        return;
    }
    
    // Download all examples as a single file
    const json = JSON.stringify(examples, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `maya-training-examples-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Clear storage after export
    clearStoredExamples();
    console.log(`Exported ${examples.length} examples and cleared storage.`);
}

// ============================================================================
// TINKER-COMPATIBLE SFT FORMAT EXPORTS
// ============================================================================

/**
 * Tinker SFT Message format
 */
export interface TinkerMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Tinker SFT Conversation format (for supervised fine-tuning)
 */
export interface TinkerConversation {
    messages: TinkerMessage[];
}

/**
 * System prompt for the CAD assistant
 */
const CAD_SYSTEM_PROMPT = `You are a CAD assistant for an architectural floor plan design tool. 
Given a user's design request, output the sequence of workspace commands needed to create the design.

Available commands:
- workspace/select_tool: Select a drawing tool (wall, room, opening, circle, line, etc.)
- workspace/click: Click at a point to place or draw
- workspace/wall_rectangle: Create a rectangular wall enclosure
- workspace/opening_insert: Add a door or window to a wall
- workspace/move_selection: Move selected shapes
- workspace/delete_selection: Delete selected shapes

Output commands as a JSON array. Each command has a "type" field and relevant parameters.`;

/**
 * Convert a training example to Tinker SFT conversation format
 * 
 * This creates a format suitable for supervised fine-tuning where:
 * - User message = the design prompt
 * - Assistant message = the JSON command sequence that achieves the design
 */
export function convertToTinkerSFT(example: TrainingExample): TinkerConversation {
    const messages: TinkerMessage[] = [];
    
    // Add system prompt
    messages.push({
        role: 'system',
        content: CAD_SYSTEM_PROMPT,
    });
    
    // Add user prompt
    messages.push({
        role: 'user',
        content: example.prompt,
    });
    
    // Extract commands from the contract turns
    const commands: object[] = [];
    if (example.contract?.turns) {
        for (const turn of example.contract.turns) {
            if (turn.command) {
                commands.push(turn.command);
            }
        }
    }
    
    // Assistant response = the command sequence as JSON
    const assistantContent = commands.length > 0
        ? '```json\n' + JSON.stringify(commands, null, 2) + '\n```'
        : '```json\n[]\n```';
    
    messages.push({
        role: 'assistant',
        content: assistantContent,
    });
    
    return { messages };
}

/**
 * Convert a training example to Tinker SFT format with state context
 * 
 * This version includes the initial state in the prompt, which helps the model
 * understand the starting conditions and generate appropriate commands.
 */
export function convertToTinkerSFTWithContext(example: TrainingExample): TinkerConversation {
    const messages: TinkerMessage[] = [];
    
    // Add system prompt
    messages.push({
        role: 'system',
        content: CAD_SYSTEM_PROMPT,
    });
    
    // Build user message with context
    const initialShapes = example.contract?.initial_snapshot?.shapes || [];
    const shapesSummary = initialShapes.length > 0
        ? `\n\nCurrent workspace contains ${initialShapes.length} shapes: ${summarizeShapes(initialShapes)}`
        : '\n\nWorkspace is empty.';
    
    messages.push({
        role: 'user',
        content: example.prompt + shapesSummary,
    });
    
    // Extract commands
    const commands: object[] = [];
    if (example.contract?.turns) {
        for (const turn of example.contract.turns) {
            if (turn.command) {
                commands.push(turn.command);
            }
        }
    }
    
    messages.push({
        role: 'assistant',
        content: '```json\n' + JSON.stringify(commands, null, 2) + '\n```',
    });
    
    return { messages };
}

/**
 * Summarize shapes for context
 */
function summarizeShapes(shapes: Array<{ type: string }>): string {
    const counts: Record<string, number> = {};
    for (const shape of shapes) {
        counts[shape.type] = (counts[shape.type] || 0) + 1;
    }
    return Object.entries(counts)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');
}

/**
 * Export training examples as Tinker SFT JSONL format
 * 
 * This creates a .jsonl file that can be directly used with:
 * python -m tinker_cookbook.recipes.sl_basic dataset_path=/path/to/output.jsonl
 */
export function exportAsTinkerSFT(examples: TrainingExample[], includeContext: boolean = false): void {
    if (examples.length === 0) {
        console.log('No examples to export.');
        return;
    }
    
    // Convert each example to Tinker SFT format
    const conversations = examples.map(ex => 
        includeContext ? convertToTinkerSFTWithContext(ex) : convertToTinkerSFT(ex)
    );
    
    // JSONL format: one JSON object per line
    const jsonl = conversations.map(conv => JSON.stringify(conv)).join('\n');
    
    const blob = new Blob([jsonl], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `maya-tinker-sft-${Date.now()}.jsonl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`Exported ${examples.length} examples as Tinker SFT JSONL format.`);
}

/**
 * Export stored examples as Tinker SFT format and clear storage
 */
export function exportStoredAsTinkerSFT(includeContext: boolean = false): void {
    const examples = getStoredExamples();
    exportAsTinkerSFT(examples, includeContext);
    clearStoredExamples();
}
