import * as tf from '@tensorflow/tfjs';
import { RL_CONFIG } from '../config';
import { WorkspaceState } from '@maya/workspace-domain/workspace/core';
import type { Shape, WallShape, OpeningShape } from '../../components/Workspace/types';

/**
 * Encodes a text prompt into a fixed-size vector.
 * Currently uses a simple hash-based bag-of-words approach.
 * In the future, this should be replaced with a proper LLM embedding.
 */
export function encodePrompt(prompt: string): tf.Tensor {
    const embedding = new Float32Array(RL_CONFIG.PROMPT_EMBEDDING_DIM);
    const words = prompt.toLowerCase().split(/\s+/);

    for (const word of words) {
        // Simple hash function to map word to index
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            hash = (hash << 5) - hash + word.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        const index = Math.abs(hash) % RL_CONFIG.PROMPT_EMBEDDING_DIM;
        embedding[index] = 1.0; // Binary bag of words
    }

    return tf.tensor2d([Array.from(embedding)], [1, RL_CONFIG.PROMPT_EMBEDDING_DIM]);
}

/**
 * Encodes the workspace state into a fixed-size vector.
 * Flattens walls and openings into a list of coordinates.
 */
/**
 * Encodes the workspace state into a fixed-size vector.
 * Flattens walls and openings into a list of coordinates.
 */
export function encodeState(state: WorkspaceState): tf.Tensor {
    const flatState = new Float32Array(RL_CONFIG.STATE_DIM);
    let offset = 0;

    const snapshot = state.getSnapshot();
    const shapes = snapshot.shapes;

    // Normalization constant (Workspace is roughly 20x20 meters)
    const SCALE = 20.0;

    // Encode Walls (4 floats: x1, y1, x2, y2)
    const walls = shapes.filter(s => s.type === 'wall') as WallShape[];
    for (const wall of walls) {
        if (offset + 4 > RL_CONFIG.STATE_DIM) break;

        // WallShape uses centerline points
        const start = wall.centerline[0];
        const end = wall.centerline[wall.centerline.length - 1];

        if (start && end) {
            flatState[offset++] = start.x / SCALE;
            flatState[offset++] = start.y / SCALE;
            flatState[offset++] = end.x / SCALE;
            flatState[offset++] = end.y / SCALE;
        } else {
            offset += 4;
        }
    }

    // Encode Openings (5 floats: type, x, y, w, h)
    const openings = shapes.filter(s => s.type === 'opening') as OpeningShape[];
    for (const opening of openings) {
        if (offset + 5 > RL_CONFIG.STATE_DIM) break;

        // Type indicator: 0.5 for window, 0.8 for door
        const typeVal = opening.category === 'window' ? 0.5 : (opening.category === 'door' ? 0.8 : 0.2);

        flatState[offset++] = typeVal;

        // Position (use anchor or center)
        // OpeningShape usually has an anchor on the wall
        // If anchor is missing, use 0,0 (shouldn't happen for valid openings)
        const x = opening.anchor?.x || 0;
        const y = opening.anchor?.y || 0;

        flatState[offset++] = x / SCALE;
        flatState[offset++] = y / SCALE;
        flatState[offset++] = opening.width / SCALE;
        flatState[offset++] = opening.height / SCALE;
    }

    return tf.tensor2d([Array.from(flatState)], [1, RL_CONFIG.STATE_DIM]);
}
