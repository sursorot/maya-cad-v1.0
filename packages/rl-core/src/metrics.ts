/**
 * Metrics Utilities for Reward Calculation
 * 
 * Helper functions for computing similarity between workspace snapshots
 */

import type { WorkspaceSnapshot } from '@maya/workspace-domain/workspace/core';
import type { TrainingConstraints } from './types';

/**
 * Compare shape counts between generated and target snapshots
 * Returns 0-1 score (1 = perfect match)
 */
export function compareShapeCounts(
    generated: WorkspaceSnapshot,
    target: WorkspaceSnapshot
): number {
    const genCount = generated.shapes.length;
    const targetCount = target.shapes.length;

    if (targetCount === 0) return genCount === 0 ? 1 : 0;

    // Score based on difference
    const diff = Math.abs(genCount - targetCount);
    const score = Math.max(0, 1 - diff / targetCount);

    return score;
}

/**
 * Compare shape types between generated and target
 * Returns 0-1 score based on how many shapes have correct types
 */
export function compareShapeTypes(
    generated: WorkspaceSnapshot,
    target: WorkspaceSnapshot
): number {
    if (target.shapes.length === 0) {
        return generated.shapes.length === 0 ? 1 : 0;
    }

    // Count matches by type
    const targetTypes = target.shapes.map(s => s.type);
    const genTypes = generated.shapes.map(s => s.type);

    // Count how many target types are present in generated
    let matches = 0;
    const usedIndices = new Set<number>();

    for (const targetType of targetTypes) {
        const genIndex = genTypes.findIndex((gt, i) => gt === targetType && !usedIndices.has(i));
        if (genIndex !== -1) {
            matches++;
            usedIndices.add(genIndex);
        }
    }

    return matches / targetTypes.length;
}

/**
 * Compute position similarity between two shapes
 * Returns 0-1 score (1 = same position)
 */
export function computePositionSimilarity(shape1: any, shape2: any): number {
    // Get representative point for each shape
    const p1 = getShapeCenter(shape1);
    const p2 = getShapeCenter(shape2);

    // Euclidean distance
    const distance = Math.sqrt(
        Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
    );

    // Normalize: assume 10m is "very far", 0m is perfect
    // Score = 1 / (1 + distance)
    const score = 1 / (1 + distance);

    return score;
}

/**
 * Compute dimension similarity between two shapes
 * Returns 0-1 score (1 = same dimensions)
 */
export function computeDimensionSimilarity(shape1: any, shape2: any): number {
    const dims1 = getShapeDimensions(shape1);
    const dims2 = getShapeDimensions(shape2);

    if (!dims1 || !dims2) return 0;

    // Compare width and height
    const widthDiff = Math.abs(dims1.width - dims2.width);
    const heightDiff = Math.abs(dims1.height - dims2.height);

    // Normalize by average dimension
    const avgDim = (dims1.width + dims1.height + dims2.width + dims2.height) / 4;
    if (avgDim === 0) return 1; // Both zero-sized

    const totalDiff = (widthDiff + heightDiff) / 2;
    const score = Math.max(0, 1 - totalDiff / avgDim);

    return score;
}

/**
 * Get center point of a shape
 */
function getShapeCenter(shape: any): { x: number; y: number } {
    switch (shape.type) {
        case 'rectangle':
            return {
                x: (shape.start.x + shape.end.x) / 2,
                y: (shape.start.y + shape.end.y) / 2,
            };
        case 'line':
            return {
                x: (shape.start.x + shape.end.x) / 2,
                y: (shape.start.y + shape.end.y) / 2,
            };
        case 'circle':
            return shape.center;
        case 'room':
        case 'zone':
            if (shape.centroid) return shape.centroid;
            // Fallback: average of points
            const sumX = shape.points.reduce((sum: number, p: any) => sum + p.x, 0);
            const sumY = shape.points.reduce((sum: number, p: any) => sum + p.y, 0);
            return {
                x: sumX / shape.points.length,
                y: sumY / shape.points.length,
            };
        case 'wall':
            const centerline = shape.centerline;
            if (centerline.length >= 2) {
                return {
                    x: (centerline[0].x + centerline[centerline.length - 1].x) / 2,
                    y: (centerline[0].y + centerline[centerline.length - 1].y) / 2,
                };
            }
            return { x: 0, y: 0 };
        default:
            return { x: 0, y: 0 };
    }
}

/**
 * Get dimensions of a shape
 */
function getShapeDimensions(shape: any): { width: number; height: number } | null {
    switch (shape.type) {
        case 'rectangle':
            return {
                width: Math.abs(shape.end.x - shape.start.x),
                height: Math.abs(shape.end.y - shape.start.y),
            };
        case 'line':
            const dx = shape.end.x - shape.start.x;
            const dy = shape.end.y - shape.start.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            return { width: length, height: 0 };
        case 'circle':
            const diameter = shape.radius * 2;
            return { width: diameter, height: diameter };
        case 'room':
        case 'zone':
            if (shape.bounds) {
                return {
                    width: shape.bounds.maxX - shape.bounds.minX,
                    height: shape.bounds.maxY - shape.bounds.minY,
                };
            }
            // Calculate from points
            const xs = shape.points.map((p: any) => p.x);
            const ys = shape.points.map((p: any) => p.y);
            return {
                width: Math.max(...xs) - Math.min(...xs),
                height: Math.max(...ys) - Math.min(...ys),
            };
        case 'wall':
            // Wall length
            const centerline = shape.centerline;
            if (centerline.length < 2) return null;
            let totalLength = 0;
            for (let i = 1; i < centerline.length; i++) {
                const dx = centerline[i].x - centerline[i - 1].x;
                const dy = centerline[i].y - centerline[i - 1].y;
                totalLength += Math.sqrt(dx * dx + dy * dy);
            }
            return { width: totalLength, height: shape.thickness || 0.1 };
        default:
            return null;
    }
}

/**
 * Check if constraints are satisfied
 * Returns 0-1 score
 */
export function checkConstraints(
    snapshot: WorkspaceSnapshot,
    constraints: TrainingConstraints
): number {
    let score = 1.0;
    let totalChecks = 0;

    // Check dimensions if specified
    if (constraints.dimensions) {
        totalChecks++;
        const rooms = snapshot.shapes.filter(s => s.type === 'room' || s.type === 'rectangle');
        if (rooms.length > 0) {
            // Use the room that best matches the constraints
            let bestDimScore = 0;

            for (const room of rooms) {
                const dims = getShapeDimensions(room);
                if (dims) {
                    // Check normal orientation
                    const wMatch1 = Math.abs(dims.width - constraints.dimensions.width) / constraints.dimensions.width;
                    const hMatch1 = Math.abs(dims.height - constraints.dimensions.height) / constraints.dimensions.height;
                    const err1 = (wMatch1 + hMatch1) / 2;

                    // Check swapped orientation
                    const wMatch2 = Math.abs(dims.width - constraints.dimensions.height) / constraints.dimensions.height;
                    const hMatch2 = Math.abs(dims.height - constraints.dimensions.width) / constraints.dimensions.width;
                    const err2 = (wMatch2 + hMatch2) / 2;

                    const avgError = Math.min(err1, err2);

                    // Score: 1.0 if within 5%, 0.0 if >50% off
                    const dimScore = Math.max(0, 1 - avgError / 0.5);
                    if (dimScore > bestDimScore) bestDimScore = dimScore;

                    // console.log(`DEBUG: Room dims ${dims.width}x${dims.height}, Target ${constraints.dimensions.width}x${constraints.dimensions.height}, Score ${dimScore}`);
                }
            }
            score *= bestDimScore;
        } else {
            score *= 0;
        }
    }

    // Check room count if specified
    if (constraints.roomCount !== undefined) {
        totalChecks++;
        const actualRoomCount = snapshot.shapes.filter(s => s.type === 'room').length;
        const roomScore = actualRoomCount === constraints.roomCount ? 1 : 0;
        score *= roomScore;
    }

    // Check features if specified
    if (constraints.features && constraints.features.length > 0) {
        totalChecks++;
        let featureScore = 0;
        for (const feature of constraints.features) {
            if (feature === 'door' || feature === 'window') {
                const hasFeature = snapshot.shapes.some(
                    s => s.type === 'opening' && s.category === feature
                );
                if (hasFeature) {
                    featureScore += 1 / constraints.features.length;
                }
            } else if (feature === 'arched-wall') {
                const hasArch = snapshot.shapes.some(
                    s => s.type === 'wall' && s.controlPoint
                );
                if (hasArch) featureScore += 1 / constraints.features.length;
            }
        }
        score *= featureScore;
    }

    // If no constraints specified, return 1.0
    return totalChecks === 0 ? 1.0 : score;
}
