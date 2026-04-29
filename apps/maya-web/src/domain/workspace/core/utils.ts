import type { Point, WallShape } from '../../../components/Workspace/types';
import { DEFAULT_WALL_THICKNESS } from './constants';

export const getPolygonCentroid = (points: Point[]): Point => {
    let accumulatedArea = 0;
    let centroidX = 0;
    let centroidY = 0;
    const pointCount = points.length;
    if (pointCount < 3) return { x: 0, y: 0 };

    for (let i = 0, j = pointCount - 1; i < pointCount; j = i, i += 1) {
        const p1 = points[j];
        const p2 = points[i];
        const f = p1.x * p2.y - p2.x * p1.y;
        accumulatedArea += f;
        centroidX += (p1.x + p2.x) * f;
        centroidY += (p1.y + p2.y) * f;
    }

    const area = accumulatedArea / 2;
    if (Math.abs(area) < 1e-9) {
        return {
            x: points.reduce((sum, p) => sum + p.x, 0) / pointCount,
            y: points.reduce((sum, p) => sum + p.y, 0) / pointCount,
        };
    }

    const factor = 1 / (6 * area);
    return {
        x: centroidX * factor,
        y: centroidY * factor,
    };
};

export const clampNormalized = (value: number) => Math.min(1, Math.max(0, value));

export const normalizeVector = (dx: number, dy: number): Point => {
    const length = Math.hypot(dx, dy);
    if (length < 1e-9) {
        return { x: 1, y: 0 };
    }
    return { x: dx / length, y: dy / length };
};

export const perpendicular = (vector: Point): Point => ({ x: -vector.y, y: vector.x });

export const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;

export const getWallAlignmentCenterOffset = (wall: WallShape): number => {
    const thickness = typeof wall.thickness === 'number' ? wall.thickness : DEFAULT_WALL_THICKNESS;
    const half = thickness / 2;
    if (wall.alignment === 'inside') {
        return half;
    }
    if (wall.alignment === 'outside') {
        return -half;
    }
    return 0;
};

export const calculatePolygonArea = (points: Point[]): number => {
    if (!points || points.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < points.length; i += 1) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        sum += current.x * next.y - next.x * current.y;
    }
    return Math.abs(sum) / 2;
};

export const calculatePolygonPerimeter = (points: Point[]): number => {
    if (!points || points.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < points.length; i += 1) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        const dx = next.x - current.x;
        const dy = next.y - current.y;
        total += Math.hypot(dx, dy);
    }
    return total;
};

/**
 * Deep clone a value using structuredClone (native, fast) with JSON fallback.
 * structuredClone is 2-10x faster than JSON.parse/stringify and handles more types.
 */
export const deepClone = <T>(value: T): T => {
    // Use native structuredClone when available (modern browsers, Node 17+)
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    // Fallback for older environments
    return JSON.parse(JSON.stringify(value));
};

export const generateShapeId = (prefix: string) => {
    const globalScope = typeof globalThis !== 'undefined' ? (globalThis as typeof globalThis & { crypto?: Crypto }) : undefined;
    const cryptoApi = globalScope ? globalScope.crypto : undefined;
    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
        return `${prefix}-${cryptoApi.randomUUID()}`;
    }
    const random = Math.random().toString(16).slice(2, 10);
    return `${prefix}-${Date.now()}-${random}`;
};

/**
 * Calculate the Euclidean distance between two points.
 * Uses Math.hypot for better numerical precision.
 */
export const distance = (p1: Point, p2: Point): number => {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
};

/**
 * Calculate the squared distance between two points.
 * Useful for performance when comparing distances (avoids sqrt).
 */
export const distanceSquared = (p1: Point, p2: Point): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return dx * dx + dy * dy;
};

/**
 * Check if two points are within a given threshold distance.
 * More efficient than calculating full distance when only checking proximity.
 */
export const isPointNear = (p1: Point, p2: Point, threshold: number): boolean => {
    return distanceSquared(p1, p2) < threshold * threshold;
};
