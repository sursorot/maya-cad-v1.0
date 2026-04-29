import { deepClone } from '../utils';
import type { WorkspaceSnapshot } from '../types';
import type { HistoryBatchTelemetry } from '../../telemetry';

/**
 * History entry that stores a complete snapshot of the workspace state.
 * 
 * Note: A previous implementation attempted structural sharing to save memory,
 * but it was fundamentally broken - it tried to recover "unchanged" shapes from
 * the current snapshot during undo/redo, but those shapes may have been modified.
 * This simple approach correctly stores all shapes at each history point.
 */
interface HistoryEntry {
    snapshot: WorkspaceSnapshot;
}

/**
 * Adaptive history limits based on shape count to prevent memory crashes.
 * Each snapshot stores ALL shapes, so memory = shapes × historyLimit × ~1KB per shape
 * 
 * For a 500-shape project with 50 history entries = ~25MB just for history
 * With 100 entries = ~50MB, which can cause Chrome to crash on lower-memory devices
 */
const ADAPTIVE_HISTORY_LIMITS = {
    /** 0-100 shapes: full history */
    SMALL_PROJECT: { maxShapes: 100, historyLimit: 100 },
    /** 101-300 shapes: reduced history */
    MEDIUM_PROJECT: { maxShapes: 300, historyLimit: 50 },
    /** 301-500 shapes: minimal history */
    LARGE_PROJECT: { maxShapes: 500, historyLimit: 30 },
    /** 500+ shapes: very limited history to prevent crashes */
    HUGE_PROJECT: { maxShapes: Infinity, historyLimit: 20 },
} as const;

/**
 * Get adaptive history limit based on shape count
 */
function getAdaptiveHistoryLimit(shapeCount: number): number {
    if (shapeCount <= ADAPTIVE_HISTORY_LIMITS.SMALL_PROJECT.maxShapes) {
        return ADAPTIVE_HISTORY_LIMITS.SMALL_PROJECT.historyLimit;
    }
    if (shapeCount <= ADAPTIVE_HISTORY_LIMITS.MEDIUM_PROJECT.maxShapes) {
        return ADAPTIVE_HISTORY_LIMITS.MEDIUM_PROJECT.historyLimit;
    }
    if (shapeCount <= ADAPTIVE_HISTORY_LIMITS.LARGE_PROJECT.maxShapes) {
        return ADAPTIVE_HISTORY_LIMITS.LARGE_PROJECT.historyLimit;
    }
    return ADAPTIVE_HISTORY_LIMITS.HUGE_PROJECT.historyLimit;
}

export class HistoryManager {
    private readonly history: HistoryEntry[] = [];
    private readonly future: HistoryEntry[] = [];
    private historyLimit = 50; // Reduced default from 100 to 50
    private historyBatch: { before: WorkspaceSnapshot; mutations: number; source?: string } | null = null;
    private telemetry?: HistoryBatchTelemetry;

    constructor(telemetry?: HistoryBatchTelemetry) {
        this.telemetry = telemetry;
    }

    public setHistoryLimit(limit: number) {
        this.historyLimit = Math.max(10, Math.min(limit, 100)); // Cap at 100 max
    }
    
    /**
     * Automatically adjust history limit based on shape count
     * Call this when shapes are added/removed
     */
    public adjustHistoryLimitForShapeCount(shapeCount: number) {
        const adaptiveLimit = getAdaptiveHistoryLimit(shapeCount);
        if (adaptiveLimit < this.historyLimit) {
            this.historyLimit = adaptiveLimit;
            // Trim history if needed
            while (this.history.length > this.historyLimit) {
                this.history.shift();
            }
        }
    }

    public getHistoryDepth(): number {
        return this.history.length;
    }

    public getFutureDepth(): number {
        return this.future.length;
    }

    public clear() {
        this.history.length = 0;
        this.future.length = 0;
        this.cancelHistoryBatch();
    }

    public pushHistoryEntry(snapshot: WorkspaceSnapshot) {
        // Store a deep clone of the snapshot to ensure immutability
        this.history.push({ snapshot: deepClone(snapshot) });
        
        if (this.history.length > this.historyLimit) {
            this.history.shift();
        }
        
        // Clear redo stack when new history is added
        this.future.length = 0;
    }

    public undo(currentSnapshot: WorkspaceSnapshot): WorkspaceSnapshot | null {
        this.cancelHistoryBatch();
        if (this.history.length === 0) return null;

        const previous = this.history.pop()!;
        
        // Save current state to redo stack
        this.future.push({ snapshot: deepClone(currentSnapshot) });

        // Restore the previous snapshot
        const restored = deepClone(previous.snapshot);
        restored.metadata.historyDepth = this.history.length;
        restored.metadata.futureDepth = this.future.length;

        return restored;
    }

    public redo(currentSnapshot: WorkspaceSnapshot): WorkspaceSnapshot | null {
        this.cancelHistoryBatch();
        if (this.future.length === 0) return null;

        const next = this.future.pop()!;
        
        // Save current state to history stack
        this.history.push({ snapshot: deepClone(currentSnapshot) });

        // Restore the next snapshot
        const restored = deepClone(next.snapshot);
        restored.metadata.historyDepth = this.history.length;
        restored.metadata.futureDepth = this.future.length;

        return restored;
    }

    public beginHistoryBatch(source: string, currentSnapshot: WorkspaceSnapshot) {
        if (this.historyBatch) return;
        this.historyBatch = {
            before: deepClone(currentSnapshot),
            mutations: 0,
            source,
        };
        this.telemetry?.onBatchBegin({ source, timestamp: Date.now() });
    }

    public commitHistoryBatch() {
        if (!this.historyBatch) return;
        const { before, mutations, source } = this.historyBatch;
        if (mutations > 0) {
            this.pushHistoryEntry(before);
            this.telemetry?.onBatchCommit({ source, mutations, timestamp: Date.now() });
        } else {
            this.telemetry?.onBatchCancel({ source, mutations, timestamp: Date.now() });
        }
        this.historyBatch = null;
    }

    public cancelHistoryBatch(): WorkspaceSnapshot | null {
        if (!this.historyBatch) return null;
        const { before, mutations, source } = this.historyBatch;

        const restored = deepClone(before);
        this.historyBatch = null;
        this.telemetry?.onBatchCancel({ source, mutations, timestamp: Date.now() });

        return restored;
    }

    public getBatchState() {
        return this.historyBatch;
    }

    public incrementBatchMutations() {
        if (this.historyBatch) {
            this.historyBatch.mutations += 1;
        }
    }
}
