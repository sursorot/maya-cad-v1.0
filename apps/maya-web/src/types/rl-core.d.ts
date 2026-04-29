declare module '@maya/rl-core/types' {
    import type { WorkspaceCommand, WorkspaceSnapshot } from '@maya/workspace-domain/workspace/core';

    export type DifficultyLevel = 'level-1' | 'level-2' | 'level-3' | 'level-4';

    export interface CommandLogEntry {
        id: string;
        timestamp: number;
        command: WorkspaceCommand;
        snapshot: WorkspaceSnapshot;
        actionIndex?: number | null;
    }
}

declare module '@maya/rl-core/dataCollector' {
    import type { WorkspaceSnapshot } from '@maya/workspace-domain/workspace/core';
    import type { DifficultyLevel, CommandLogEntry } from '@maya/rl-core/types';

    export interface PromptStepInput {
        id: string;
        text: string;
        timestamp: number;
    }

    export interface TrainingConstraints {
        dimensions?: {
            width: number;
            height: number;
        };
        roomCount?: number;
        features?: string[];
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
        createdAt: string;
        /** Statistics about command filtering and content (for debugging/analysis) */
        stats?: TrainingExampleStats;
    }

    export function generateExampleId(): string;
    
    /** Filter command log to exclude low-value commands (cursor movements, etc.) */
    export function filterCommandLog(commandLog: CommandLogEntry[]): CommandLogEntry[];
    
    /** Check if a command is high-value for training */
    export function isHighValueCommand(command: { type?: string }): boolean;
    
    /** 
     * Get the action index for a workspace command.
     * Returns null if the command type is not in the action mapping.
     * Per docs/contracts/action_mapping_v1.md, every turn MUST include actionIndex.
     */
    export function getActionIndex(command: Record<string, unknown>): number | null;
    
    /** Optimize a snapshot for storage by removing transient UI state */
    export function optimizeSnapshotForTraining(snapshot: WorkspaceSnapshot): WorkspaceSnapshot;
    
    /** Compute statistics about a training example */
    export function computeExampleStats(
        rawCommandLog: CommandLogEntry[],
        filteredCommandLog: CommandLogEntry[],
        finalSnapshot: WorkspaceSnapshot
    ): TrainingExampleStats;
    
    export function createTrainingExample(options: {
        sessionId?: string;
        promptSteps: PromptStepInput[];
        initialSnapshot: WorkspaceSnapshot;
        finalSnapshot: WorkspaceSnapshot;
        commandLog: CommandLogEntry[];
        difficulty?: DifficultyLevel;
    }): Promise<TrainingExample>;
    export function downloadExample(example: TrainingExample): void;
    export function saveExampleToStorage(example: TrainingExample): void;
    export function getStoredExamples(): TrainingExample[];
    export function clearStoredExamples(): void;
    export function getExampleCount(): number;
    
    // ============================================================================
    // TINKER-COMPATIBLE SFT FORMAT EXPORTS
    // ============================================================================
    
    /** Tinker SFT Message format */
    export interface TinkerMessage {
        role: 'system' | 'user' | 'assistant';
        content: string;
    }
    
    /** Tinker SFT Conversation format (for supervised fine-tuning) */
    export interface TinkerConversation {
        messages: TinkerMessage[];
    }
    
    /** Convert a training example to Tinker SFT conversation format */
    export function convertToTinkerSFT(example: TrainingExample): TinkerConversation;
    
    /** Convert a training example to Tinker SFT format with workspace state context */
    export function convertToTinkerSFTWithContext(example: TrainingExample): TinkerConversation;
    
    /** Export training examples as Tinker SFT JSONL format */
    export function exportAsTinkerSFT(examples: TrainingExample[], includeContext?: boolean): void;
    
    /** Export stored examples as Tinker SFT format and clear storage */
    export function exportStoredAsTinkerSFT(includeContext?: boolean): void;
}

declare module '@maya/rl-core/tinker/controller' {
    import type { WorkspaceController as AppWorkspaceController } from '../components/Workspace/hooks/useWorkspaceController';

    export type WorkspaceController = AppWorkspaceController;

    export function setWorkspaceController(controller: WorkspaceController): void;
    export function getWorkspaceController(): WorkspaceController | null;
    export function clearWorkspaceController(): void;
}

declare module '@maya/rl-core/tinker/websocket-bridge' {
    export interface TinkerBridgeOptions {
        url?: string;
    }

    export class TinkerWebSocketBridge {
        constructor(options?: TinkerBridgeOptions);
        connect(): Promise<void>;
        disconnect(): void;
        on(event: string, handler: (data: unknown) => void): void;
        off(event: string, handler: (data: unknown) => void): void;
    }
}
