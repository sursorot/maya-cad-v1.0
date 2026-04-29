/**
 * RL Training Data Types
 * 
 * Type definitions for training examples and datasets used in the RL training pipeline.
 */

import type { WorkspaceCommand, WorkspaceSnapshot } from '@maya/workspace-domain/workspace/core';

export type DifficultyLevel = 'level-1' | 'level-2' | 'level-3' | 'level-4';

export interface TrainingConstraints {
    dimensions?: {
        width: number;   // in meters
        height: number;  // in meters
    };
    roomCount?: number;
    features?: string[];  // e.g., ['door', 'window', 'arched-wall']
}

export interface CommandLogEntry {
    id: string;
    timestamp: number;
    command: WorkspaceCommand;
    snapshot: WorkspaceSnapshot;
    actionIndex?: number | null;
}

export interface ContractPromptTurn {
    turn_id: string;
    speaker: 'user' | 'system';
    text: string;
    timestamp: number;
}

export interface ContractRewardTrace {
    total: number | null;
    shape_match?: number | null;
    constraints?: number | null;
    breakdown?: Record<string, number>;
}

export interface ContractAgentTurn {
    turn_id: string;
    speaker: 'agent';
    timestamp: number;
    command: WorkspaceCommand;
    action_index: number | null;
    result_snapshot: WorkspaceSnapshot;
    reward: ContractRewardTrace | null;
}

export interface TrainingAnnotation {
    type: 'privacy' | 'qa' | 'review';
    author?: string;
    note: string;
    timestamp: number;
    severity?: 'info' | 'warn' | 'critical';
}

export interface TrainingSigning {
    hash: string;
    created_by: 'human' | 'agent';
    tool_version: string;
}

export interface ContractSession {
    tdc_version: string;
    workspace_contract_version: string;
    reward_version: string;
    bridge_version?: string;
    session_id: string;
    prompt_thread: ContractPromptTurn[];
    initial_snapshot: WorkspaceSnapshot;
    turns: ContractAgentTurn[];
    final_snapshot: WorkspaceSnapshot;
    constraints: TrainingConstraints;
    difficulty: DifficultyLevel;
    annotations?: TrainingAnnotation[];
    signing: TrainingSigning;
}

/**
 * Statistics about the training example for debugging and analysis
 */
export interface TrainingExampleStats {
    totalCommands: number;        // Raw command count before filtering
    filteredCommands: number;     // Command count after filtering (cursor moves removed)
    commandBreakdown: Record<string, number>;  // Count per command type
    shapeCount: number;           // Number of shapes in final state
    shapesCreated: string[];      // Types of shapes created (e.g., ["wall:4", "room:1"])
    estimatedTokens: number;      // Rough token count estimate for LLM context
}

export interface TrainingExample {
    id: string;
    prompt: string;
    difficulty: DifficultyLevel;
    targetSnapshot: WorkspaceSnapshot;
    constraints: TrainingConstraints;
    createdAt: string;  // ISO timestamp
    contract?: ContractSession;
    /** Statistics about command filtering and content (for debugging/analysis) */
    stats?: TrainingExampleStats;
}

export interface TrainingDataset {
    version: string;
    created: string;
    examples: TrainingExample[];
}
