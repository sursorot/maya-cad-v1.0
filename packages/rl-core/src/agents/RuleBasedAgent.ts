/**
 * Rule-Based Agent for RL Pipeline Validation
 * 
 * A simple agent that uses regex and heuristics to parse prompts and 
 * generate command sequences. Used to validate the environment and reward function.
 */

import type { WorkspaceEnv } from '../workspaceEnv';
import type { WorkspaceCommand } from '@maya/workspace-domain/workspace/core';

interface Intent {
    dimensions: { width: number; height: number };
    features: string[];
    roomType: 'rectangular' | 'room_structure' | 'unknown';
}

export class RuleBasedAgent {
    /**
     * Parse natural language prompt into structured intent
     */
    parsePrompt(prompt: string): Intent {
        const intent: Intent = {
            dimensions: { width: 10, height: 10 }, // Default
            features: [],
            roomType: 'unknown',
        };

        const lowerPrompt = prompt.toLowerCase();

        // 1. Extract dimensions (e.g., "10x12", "10 by 12", "10ft by 12ft")
        const dimRegex = /(\d+(?:\.\d+)?)\s*(?:x|by)\s*(\d+(?:\.\d+)?)/;
        const dimMatch = lowerPrompt.match(dimRegex);

        // Helper to convert feet to meters (internal units are meters)
        const toMeters = (ft: number) => ft * 0.3048;

        if (dimMatch) {
            intent.dimensions = {
                width: toMeters(parseFloat(dimMatch[1])),
                height: toMeters(parseFloat(dimMatch[2])),
            };
            intent.roomType = lowerPrompt.includes('room') ? 'room_structure' : 'rectangular';
        } else {
            // Check for "square" with single dimension
            const squareRegex = /square.*?(\d+(?:\.\d+)?)/;
            const squareMatch = lowerPrompt.match(squareRegex);
            if (squareMatch) {
                const size = toMeters(parseFloat(squareMatch[1]));
                intent.dimensions = { width: size, height: size };
                intent.roomType = lowerPrompt.includes('room') ? 'room_structure' : 'rectangular';
            }
        }

        // 2. Extract features
        if (lowerPrompt.includes('door')) {
            intent.features.push('door');
        }
        if (lowerPrompt.includes('window')) {
            intent.features.push('window');
        }

        return intent;
    }

    /**
     * Generate sequence of commands based on intent
     */
    generateCommands(intent: Intent): WorkspaceCommand[] {
        const commands: WorkspaceCommand[] = [];

        // Determine tool based on intent
        // If it's a simple rectangle/square without features, use rectangle tool
        // If it has features (door/window) or explicitly says "room", use wall tool

        // Refined logic:
        // If prompt implies "room" (walls) or has features -> Wall Tool
        // If prompt implies "shape" (rectangle/square) and no features -> Rectangle Tool
        // For this simple agent, we'll assume "room" = walls, "rectangle/square" = shape
        // But intent.roomType is 'rectangular' for both.
        // Let's assume if features are present, we MUST use walls (openings need walls).
        // If no features, we check if we should use walls or rectangle.
        // For now, let's default to rectangle tool if no features are requested, 
        // unless we can detect "room" keyword in the prompt (which we don't have access to here easily without passing it).
        // Let's update parsePrompt to distinguish 'shape' vs 'room'.

        const isRoom = intent.roomType === 'room_structure' || intent.features.length > 0;

        if (isRoom) {
            // 1. Select wall tool
            commands.push({ type: 'workspace/select_tool', tool: 'wall' });

            // 2. Draw wall rectangle
            commands.push({
                type: 'workspace/wall_rectangle',
                start: { x: 0, y: 0 },
                end: { x: intent.dimensions.width, y: intent.dimensions.height }
            });
        } else {
            // 1. Select rectangle tool
            commands.push({ type: 'workspace/select_tool', tool: 'rectangle' });

            // 2. Draw shape rectangle via clicks (click-move-click interaction)
            commands.push({ type: 'workspace/click', point: { x: 0, y: 0 } });
            commands.push({ type: 'workspace/click', point: { x: intent.dimensions.width, y: intent.dimensions.height } });
        }

        // 3. Add features (only possible if we used walls)
        if (isRoom) {
            if (intent.features.includes('door')) {
                commands.push({ type: 'workspace/select_tool', tool: 'opening' });
                // Place door on bottom wall
                commands.push({
                    type: 'workspace/opening_insert',
                    point: { x: intent.dimensions.width / 2, y: 0 },
                    options: { category: 'door' }
                });
            }

            if (intent.features.includes('window')) {
                commands.push({ type: 'workspace/select_tool', tool: 'opening' });
                // Place window on top wall
                commands.push({
                    type: 'workspace/opening_insert',
                    point: { x: intent.dimensions.width / 2, y: intent.dimensions.height },
                    options: { category: 'window' }
                });
            }
        }

        return commands;
    }

    /**
     * Run the agent on an environment
     * @returns Total reward accumulated
     */
    async run(env: WorkspaceEnv, prompt: string): Promise<number> {
        const intent = this.parsePrompt(prompt);
        const commands = this.generateCommands(intent);

        let totalReward = 0;

        // Execute commands
        for (const command of commands) {
            const result = await env.step(command);
            totalReward += result.reward;

            if (result.stop.done) break;
        }

        return totalReward;
    }
}
