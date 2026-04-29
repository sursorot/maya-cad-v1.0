import type { Shape, Appearance, Point } from '../../../components/Workspace/types';

/**
 * Capability Detection
 */

// Check if a shape can have a fill
export function canHaveFill(shape: Shape): boolean {
    switch (shape.type) {
        // Always fillable (closed shapes)
        case 'circle':
        case 'rectangle':
        case 'zone':
        case 'room':
        case 'wall':
        case 'opening':
        case 'asset':
            return true;

        // Conditionally fillable (if closed)
        case 'polyline':
        case 'curve':
            return isClosedPath(shape.points);

        // Never fillable (open or line shapes)
        case 'line':
        case 'arc': // Arcs are open by definition
        case 'guideline':
        case 'dimension':
        case 'text':
            return false;

        default:
            return false;
    }
}

// Check if a shape can have a stroke
export function canHaveStroke(shape: Shape): boolean {
    // Almost all shapes can have stroke except text (which has its own styling)
    return shape.type !== 'text';
}

// Check if a path is closed (first and last points are very close)
function isClosedPath(points: Point[]): boolean {
    if (points.length < 3) return false;

    const first = points[0];
    const last = points[points.length - 1];
    const dist = Math.hypot(last.x - first.x, last.y - first.y);

    return dist < 0.001; // Tolerance of 1mm
}

/**
 * Default Appearance Factory
 */

export function getDefaultAppearance(shapeType: Shape['type']): Appearance {
    const defaults: Record<Shape['type'], Appearance> = {
        // Basic shapes - no fill by default, just stroke
        line: {
            stroke: { color: '#000000', width: 1 }
        },

        circle: {
            stroke: { color: '#000000', width: 1 }
        },

        rectangle: {
            stroke: { color: '#000000', width: 1 }
        },

        polyline: {
            stroke: { color: '#000000', width: 1 }
        },

        curve: {
            stroke: { color: '#000000', width: 1 }
        },

        arc: {
            stroke: { color: '#000000', width: 1 }
        },

        // Architectural shapes - with fills
        wall: {
            stroke: { color: '#666666', width: 1 },
            fill: { type: 'solid', color: '#e5e7eb' }
        },

        opening: {
            stroke: { color: '#333333', width: 2 },
            fill: { type: 'solid', color: '#ffffff', opacity: 0.8 }
        },

        room: {
            stroke: { color: '#666666', width: 1 },
            fill: { type: 'solid', color: '#f5f5f5', opacity: 0.5 }
        },

        zone: {
            stroke: { color: '#3b82f6', width: 1 },
            fill: {
                type: 'pattern',
                patternId: 'zoneHatch',
                patternColors: { primary: '#3b82f6' },
                opacity: 0.3
            }
        },

        // Annotation shapes
        guideline: {
            stroke: { color: '#ef4444', width: 1, dashArray: [4, 4] }
        },

        marker: {
            stroke: { color: '#E65100', width: 2 }
        },

        dimension: {
            stroke: { color: '#2563eb', width: 1 }
        },

        text: {
            // Text uses its own styling (color, fontSize, etc.)
            // appearance is optional for background/border
        },

        asset: {
            stroke: { color: '#000000', width: 1 },
            fill: { type: 'solid', color: '#f5f5f5', opacity: 0.3 }
        },

        image: {
            // Images don't use appearance, they have their own opacity/filters
        },

        group: {
            // Groups inherit appearance from their member shapes
        }
    };

    return defaults[shapeType] || {};
}

/**
 * Appearance Merging
 */

export function mergeAppearance(base: Appearance | undefined, override: Partial<Appearance>): Appearance {
    return {
        ...base,
        ...override,
        // Deep merge for nested objects
        fill: override.fill !== undefined ? override.fill : base?.fill,
        stroke: override.stroke !== undefined ? override.stroke : base?.stroke,
        shadow: override.shadow !== undefined ? override.shadow : base?.shadow,
    };
}

/**
 * Migration Helpers
 */

export function migrateShapeToAppearance(shape: Shape): Shape {
    // If shape already has appearance, return as-is
    if (shape.appearance) {
        return shape;
    }

    // Create appearance from old stroke/fill properties
    const appearance: Appearance = {};

    // Migrate stroke (all shapes except text have stroke/strokeWidth)
    if ('stroke' in shape && 'strokeWidth' in shape) {
        appearance.stroke = {
            color: shape.stroke,
            width: shape.strokeWidth
        };
    }

    // Migrate fill (only zones have fill property currently)
    if (shape.type === 'zone' && 'fill' in shape) {
        if (shape.fill.startsWith('url(#')) {
            // Pattern reference
            const patternId = shape.fill.match(/url\(#(.+)\)/)?.[1];
            if (patternId) {
                appearance.fill = {
                    type: 'pattern',
                    patternId,
                    patternColors: { primary: shape.stroke }
                };
            }
        } else if (shape.fill && shape.fill !== 'none') {
            // Solid color
            appearance.fill = {
                type: 'solid',
                color: shape.fill
            };
        }
    }

    return {
        ...shape,
        appearance
    };
}

/**
 * Style Presets
 */

export interface StylePreset {
    id: string;
    name: string;
    description?: string;
    appearance: Appearance;
    applicableTo: Shape['type'][];
}

export const STYLE_PRESETS: StylePreset[] = [
    {
        id: 'blueprint-style',
        name: 'Blueprint Style',
        description: 'Blue lines on white, classic architectural look',
        appearance: {
            stroke: { color: '#2563eb', width: 1 },
            fill: { type: 'solid', color: '#dbeafe', opacity: 0.3 }
        },
        applicableTo: ['circle', 'rectangle', 'polyline', 'curve', 'wall', 'room', 'zone']
    },

    {
        id: 'highlight-red',
        name: 'Red Highlight',
        description: 'Red fill for emphasis',
        appearance: {
            stroke: { color: '#dc2626', width: 2 },
            fill: { type: 'solid', color: '#fee2e2', opacity: 0.5 }
        },
        applicableTo: ['circle', 'rectangle', 'zone', 'room']
    },

    {
        id: 'highlight-yellow',
        name: 'Yellow Highlight',
        description: 'Yellow fill for marking areas',
        appearance: {
            stroke: { color: '#ca8a04', width: 2 },
            fill: { type: 'solid', color: '#fef3c7', opacity: 0.6 }
        },
        applicableTo: ['circle', 'rectangle', 'zone', 'room']
    },

    {
        id: 'dashed-construction',
        name: 'Construction (Dashed)',
        description: 'Dashed lines for proposed or temporary elements',
        appearance: {
            stroke: { color: '#f59e0b', width: 1, dashArray: [5, 5] }
        },
        applicableTo: ['line', 'polyline', 'wall', 'guideline']
    },

    {
        id: 'wood-floor',
        name: 'Wood Floor',
        description: 'Wood plank pattern for floors',
        appearance: {
            stroke: { color: '#8B4513', width: 0.5 },
            fill: {
                type: 'pattern',
                patternId: 'wood-plank-h',
                patternColors: { primary: '#D2B48C', secondary: '#8B4513' }
            }
        },
        applicableTo: ['room', 'zone']
    },

    {
        id: 'tile-floor',
        name: 'Tile Floor',
        description: 'Square tile pattern',
        appearance: {
            stroke: { color: '#999', width: 0.5 },
            fill: {
                type: 'pattern',
                patternId: 'tile-square',
                patternScale: 1.0
            }
        },
        applicableTo: ['room', 'zone']
    }
];

export function getPresetById(id: string): StylePreset | undefined {
    return STYLE_PRESETS.find(preset => preset.id === id);
}

export function getPresetsForShape(shapeType: Shape['type']): StylePreset[] {
    return STYLE_PRESETS.filter(preset => preset.applicableTo.includes(shapeType));
}
