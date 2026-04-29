/**
 * Workspace Environment for Reinforcement Learning
 * 
 * Wraps the core WorkspaceState and WorkspaceCommandBus to provide
 * a standard RL environment interface (reset, step, observe).
 */

import { WorkspaceState, WorkspaceCommandBus } from '@maya/workspace-domain/workspace/core';
import type { WorkspaceCommand, WorkspaceSnapshot } from '@maya/workspace-domain/workspace/core';
import type { TrainingExample } from './types';
import { calculateReward } from './reward';

export interface StepResult {
    snapshot: WorkspaceSnapshot;
    reward: number;
    stop: {
        done: boolean;
        reason?: string;
    };
    info: {
        commandResult?: any;
        rewardBreakdown?: any;
    };
}

export class WorkspaceEnv {
    public state: WorkspaceState;
    public bus: WorkspaceCommandBus;
    private currentExample: TrainingExample | null = null;
    private stepCount = 0;
    private maxSteps = 50;
    private previousSnapshot: WorkspaceSnapshot | null = null;

    constructor(initialSnapshot?: Partial<WorkspaceSnapshot>) {
        this.state = new WorkspaceState(initialSnapshot);
        this.bus = new WorkspaceCommandBus(this.state);
    }

    /**
     * Reset the environment to initial state
     * Optionally load a training example as the target
     */
    async reset(example?: TrainingExample): Promise<WorkspaceSnapshot> {
        this.state.reset();
        this.currentExample = example || null;
        this.stepCount = 0;
        return this.state.getSnapshot();
    }

    /**
     * Execute a command in the environment
     * @param command - The workspace command to execute
     * @param actionIndex - Optional action index for reward calculation
     */
    async step(command: WorkspaceCommand, actionIndex?: number): Promise<StepResult> {
        this.stepCount++;

        // Store previous state for comparison
        this.previousSnapshot = this.state.getSnapshot();

        // Execute command
        const result = this.bus.execute(command);
        const snapshot = this.state.getSnapshot();

        // Calculate reward if we have a target example
        let reward = 0;
        let rewardBreakdown = null;

        if (this.currentExample) {
            // Calculate reward based on the new state
            const rewardResult = calculateReward(
                snapshot,
                this.currentExample,
                this.previousSnapshot || snapshot,
                actionIndex
            );
            reward = rewardResult.total;
            rewardBreakdown = rewardResult.breakdown;
        }

        // Check termination conditions
        let done = false;
        let reason = undefined;

        if (this.stepCount >= this.maxSteps) {
            done = true;
            reason = 'max_steps_reached';
        }

        // If we have a perfect match, we can stop (optional optimization)
        if (reward >= 0.99) {
            done = true;
            reason = 'solved';
        }

        return {
            snapshot,
            reward,
            stop: { done, reason },
            info: {
                commandResult: result,
                rewardBreakdown
            }
        };
    }

    /**
     * Get current observation (snapshot)
     */
    getSnapshot(): WorkspaceSnapshot {
        return this.state.getSnapshot();
    }

    /**
     * Initial observation helper (same as getSnapshot but async for API consistency)
     */
    async initialObservation(): Promise<WorkspaceSnapshot> {
        return this.state.getSnapshot();
    }
    /**
     * Get valid actions mask for the current state
     * Returns an array of 0s and 1s where 1 means valid
     */
    getValidActions(): number[] {
        const mask = new Array(48).fill(0);
        const snapshot = this.state.getSnapshot();
        const { activeTool, isDrawing, selectedShapeIds } = snapshot;

        // Helper to set range
        const setRange = (start: number, end: number, val: number) => {
            for (let i = start; i <= end; i++) mask[i] = val;
        };

        // Always allow tool selection (30-32, 37, 38) and cursor update (44)
        setRange(30, 32, 1);
        mask[37] = 1; // Circle
        mask[38] = 1; // Rectangle
        mask[44] = 1;

        // Undo/Redo (40-41) - Always allow for now (could check history)
        mask[40] = 1;
        mask[41] = 1;

        // Drawing Modes (42-43)
        mask[42] = 1;
        mask[43] = 1;

        if (activeTool === 'wall') {
            if (!isDrawing) {
                // Can start new walls
                mask[0] = 1; // Create single wall
                mask[1] = 1; // Wall rectangle
                mask[2] = 1; // Begin wall
                mask[21] = 1; // Create room
            } else {
                // In drawing mode
                mask[3] = 1; // Update endpoint
                mask[4] = 1; // Commit
                mask[5] = 1; // Cancel
                mask[8] = 1; // Set control point
                mask[9] = 1; // Remove control point
                mask[6] = 1; // Commit chain
                mask[7] = 1; // Abort chain
            }
        } else if (activeTool === 'opening') {
            if (!isDrawing) {
                // Can insert openings
                mask[10] = 1; // Door
                mask[11] = 1; // Window
                mask[12] = 1; // Generic
                mask[13] = 1; // Begin opening
            } else {
                // In placement mode
                mask[14] = 1; // Update pos
                mask[15] = 1; // Commit
                mask[16] = 1; // Cancel
            }
        } else if (activeTool === 'rectangle') {
            if (!isDrawing) {
                mask[20] = 1; // Click/Start
            } else {
                mask[20] = 1; // Click/End
                mask[36] = 1; // Cancel
            }
        } else if (activeTool === 'circle') {
            if (!isDrawing) {
                mask[20] = 1; // Click/Start
            } else {
                mask[20] = 1; // Click/End
                mask[36] = 1; // Cancel
            }
        } else if (activeTool === 'select') {
            mask[20] = 1; // Click to select

            if (selectedShapeIds.length > 0) {
                mask[33] = 1; // Move
                mask[34] = 1; // Delete

                // Check if walls are selected for specific properties
                const hasWalls = snapshot.shapes.some(s => selectedShapeIds.includes(s.id) && s.type === 'wall');
                if (hasWalls) {
                    mask[45] = 1; // Thickness
                    mask[46] = 1; // Align outside
                    mask[47] = 1; // Align center
                }
            }
        }

        return mask;
    }
}
