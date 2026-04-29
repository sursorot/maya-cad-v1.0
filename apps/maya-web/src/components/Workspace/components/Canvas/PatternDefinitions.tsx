import React from 'react';

/**
 * Pattern catalog for fill patterns
 * Each pattern matches exactly the definitions from hatch-patterns.html
 */

export interface PatternInfo {
    id: string;
    label: string;
    category: 'tiles' | 'lines' | 'shapes' | 'nature' | 'decorative' | 'wood';
}

export const PATTERN_CATALOG: PatternInfo[] = [
    // Tile Patterns
    { id: 'jointed', label: 'Jointed', category: 'tiles' },
    { id: 'octagon', label: 'Octagon', category: 'tiles' },
    { id: 'deco', label: 'Deco Tile', category: 'tiles' },
    { id: 'stack-parquet', label: 'Stack Parquet', category: 'tiles' },
    { id: 'cinder-block', label: 'Cinder Block', category: 'tiles' },
    { id: 'brick-basketweave', label: 'Basketweave', category: 'tiles' },
    
    // Line Patterns
    { id: 'double-oblique', label: 'Double Oblique', category: 'lines' },
    { id: 'triple-oblique', label: 'Triple Oblique', category: 'lines' },
    { id: 'oblique-compact', label: 'Oblique', category: 'lines' },
    { id: 'horizontal', label: 'Horizontal', category: 'lines' },
    { id: 'vertical', label: 'Vertical', category: 'lines' },
    { id: 'grid', label: 'Grid', category: 'lines' },
    { id: 'oblique-grid', label: 'Oblique Grid', category: 'lines' },
    { id: 'diamonds', label: 'Diamonds', category: 'lines' },
    
    // Shape Patterns
    { id: 'circles', label: 'Circles', category: 'shapes' },
    { id: 'weave', label: 'Weave', category: 'shapes' },
    { id: 'squares', label: 'Squares', category: 'shapes' },
    { id: 'double-zigzag', label: 'Zigzag', category: 'shapes' },
    { id: 'lattice', label: 'Lattice', category: 'shapes' },
    
    // Nature Patterns
    { id: 'grass', label: 'Grass', category: 'nature' },
    { id: 'dense-grass', label: 'Dense Grass', category: 'nature' },
    { id: 'soil', label: 'Soil', category: 'nature' },
    { id: 'turf', label: 'Turf', category: 'nature' },
    
    // Decorative Patterns
    { id: 'water', label: 'Water', category: 'decorative' },
    { id: 'pebble', label: 'Pebble', category: 'decorative' },
    { id: 'gravel', label: 'Gravel', category: 'decorative' },
    
    // Wood Patterns
    { id: 'wood-1', label: 'Wood Grain', category: 'wood' },
    { id: 'wood-2', label: 'Wood Plank', category: 'wood' },
    { id: 'parquet-basket', label: 'Parquet', category: 'wood' },
];

/**
 * Get pattern definition info
 */
export function getPatternInfo(patternId: string): { width: number; height: number; transform?: string } {
    const info: Record<string, { width: number; height: number; transform?: string }> = {
        'jointed': { width: 25, height: 25 },
        'octagon': { width: 24, height: 24 },
        'deco': { width: 50, height: 50 },
        'stack-parquet': { width: 40, height: 10 },
        'cinder-block': { width: 40, height: 20 },
        'brick-basketweave': { width: 40, height: 40 },
        'double-oblique': { width: 20, height: 20, transform: 'rotate(45)' },
        'triple-oblique': { width: 24, height: 24, transform: 'rotate(45)' },
        'oblique-compact': { width: 8, height: 8 },
        'horizontal': { width: 10, height: 10 },
        'vertical': { width: 10, height: 10 },
        'grid': { width: 10, height: 10 },
        'oblique-grid': { width: 10, height: 10 },
        'diamonds': { width: 12, height: 20 },
        'circles': { width: 20, height: 20 },
        'weave': { width: 40, height: 40 },
        'squares': { width: 25, height: 25 },
        'double-zigzag': { width: 20, height: 20 },
        'lattice': { width: 20, height: 20 },
        'grass': { width: 60, height: 60 },
        'dense-grass': { width: 50, height: 50 },
        'soil': { width: 20, height: 20 },
        'turf': { width: 40, height: 30 },
        'water': { width: 40, height: 12 },
        'pebble': { width: 50, height: 50 },
        'gravel': { width: 40, height: 40, transform: 'rotate(45)' },
        'wood-1': { width: 40, height: 40 },
        'wood-2': { width: 100, height: 16 },
        'parquet-basket': { width: 80, height: 80 },
    };
    return info[patternId] || { width: 20, height: 20 };
}

/**
 * Render pattern content with specified stroke color
 * This matches exactly the patterns from hatch-patterns.html
 */
export function renderPatternContent(patternId: string, color: string): React.ReactNode {
    switch (patternId) {
        case 'jointed':
            return <path d="M0 25 H25 M25 0 V25" fill="none" stroke={color} strokeWidth="1"/>;
        case 'octagon':
            return <path d="M7 0 H17 M0 7 V17 M24 7 V17 M7 24 H17 M0 7 L7 0 M17 0 L24 7 M0 17 L7 24 M17 24 L24 17" fill="none" stroke={color} strokeWidth="1"/>;
        case 'deco':
            return (
                <g>
                    <path d="M50 0 V50 M0 50 H50" fill="none" stroke={color} strokeWidth="1" />
                    <g fill="none" stroke={color} strokeWidth="1">
                        <path d="M18.5 0 L13 13 L0 18.5" />
                        <path d="M10 0 A 10 10 0 0 1 0 10" />
                    </g>
                    <g fill="none" stroke={color} strokeWidth="1" transform="translate(50, 0) scale(-1, 1)">
                        <path d="M18.5 0 L13 13 L0 18.5" />
                        <path d="M10 0 A 10 10 0 0 1 0 10" />
                    </g>
                    <g fill="none" stroke={color} strokeWidth="1" transform="translate(0, 50) scale(1, -1)">
                        <path d="M18.5 0 L13 13 L0 18.5" />
                        <path d="M10 0 A 10 10 0 0 1 0 10" />
                    </g>
                    <g fill="none" stroke={color} strokeWidth="1" transform="translate(50, 50) scale(-1, -1)">
                        <path d="M18.5 0 L13 13 L0 18.5" />
                        <path d="M10 0 A 10 10 0 0 1 0 10" />
                    </g>
                </g>
            );
        case 'stack-parquet':
            return <path d="M0 10 H40 M40 0 V10" fill="none" stroke={color} strokeWidth="1"/>;
        case 'cinder-block':
            return <path d="M0 20 H40 M40 0 V20" fill="none" stroke={color} strokeWidth="1"/>;
        case 'brick-basketweave':
            return <path d="M20 0 V40 M0 20 H40 M0 10 H20 M30 0 V20 M10 20 V40 M20 30 H40" fill="none" stroke={color} strokeWidth="1"/>;
        case 'double-oblique':
            return <path d="M0 5 H20 M0 8 H20" fill="none" stroke={color} strokeWidth="1"/>;
        case 'triple-oblique':
            return <path d="M0 5 H24 M0 8 H24 M0 11 H24" fill="none" stroke={color} strokeWidth="1"/>;
        case 'oblique-compact':
            return <path d="M0 8 L8 0" fill="none" stroke={color} strokeWidth="1"/>;
        case 'horizontal':
            return <path d="M0 5 H10" fill="none" stroke={color} strokeWidth="1"/>;
        case 'vertical':
            return <path d="M5 0 V10" fill="none" stroke={color} strokeWidth="1"/>;
        case 'grid':
            return <path d="M0 10 H10 M10 0 V10" fill="none" stroke={color} strokeWidth="1"/>;
        case 'oblique-grid':
            return <path d="M0 10 L10 0 M0 0 L10 10" fill="none" stroke={color} strokeWidth="1"/>;
        case 'diamonds':
            return <path d="M0 20 L12 0 M0 0 L12 20" fill="none" stroke={color} strokeWidth="1"/>;
        case 'circles':
            return <circle cx="10" cy="10" r="7" fill="none" stroke={color} strokeWidth="1"/>;
        case 'weave':
            return <path d="M20 0 V40 M0 20 H40 M10 0 V20 M30 20 V40 M0 10 H20 M20 30 H40" fill="none" stroke={color} strokeWidth="1"/>;
        case 'squares':
            return <rect x="5" y="5" width="15" height="15" fill="none" stroke={color} strokeWidth="1"/>;
        case 'double-zigzag':
            return <path d="M-5 13 l5 -5 l5 5 l5 -5 l5 5 M-5 16 l5 -5 l5 5 l5 -5 l5 5" fill="none" stroke={color} strokeWidth="1"/>;
        case 'lattice':
            return <path d="M0 5 H20 M0 8 H20 M5 0 V20 M8 0 V20" fill="none" stroke={color} strokeWidth="1"/>;
        case 'grass':
            return <path d="M5 5 l5 2 M15 20 l-3 6 M40 10 l-5 -3 M50 25 l3 5 M10 40 l6 -2 M25 50 l-2 6 M45 55 l5 2" fill="none" stroke={color} strokeWidth="1"/>;
        case 'dense-grass':
            return <path d="M2 10 l5 2 M5 5 l-3 6 M10 3 l5 -2 M12 20 l-4 5 M15 15 l3 5 M20 8 l-2 6 M23 28 l6 2 M30 5 l-5 5 M32 21 l2 6 M35 40 l-6 3 M40 10 l5 -3 M45 25 l-3 5 M48 5 l2 5" fill="none" stroke={color} strokeWidth="1"/>;
        case 'soil':
            return (
                <g fill="none" stroke={color} strokeWidth="1">
                    <path d="M0 5 L5 0 M0 10 L10 0 M5 10 L10 5 M10 15 L15 10 M10 20 L20 10 M15 20 L20 15"/>
                    <path d="M10 5 L15 0 M10 10 L20 0 M15 10 L20 5 M0 15 L5 10 M0 20 L10 10 M5 20 L10 15"/>
                </g>
            );
        case 'turf':
            return <path d="M2 0 l-2 30 M8 0 l1 30 M15 0 l-1 30 M22 0 l2 30 M28 0 l-1 30 M35 0 l1 30" fill="none" stroke={color} strokeWidth="1"/>;
        case 'water':
            return <path d="M-10 6 Q 0 0, 10 6 T 30 6 T 50 6" fill="none" stroke={color} strokeWidth="1"/>;
        case 'pebble':
            return (
                <g fill="none" stroke={color} strokeWidth="1">
                    <path d="M5 5 A 5 5 0 0 1 10 10" />
                    <path d="M15 2 L 18 8" />
                    <path d="M45 45 A 5 5 0 0 0 40 40" />
                    <path d="M40 8 L 38 2" />
                    <path d="M25 20 A 8 8 0 0 1 35 25" />
                    <path d="M20 45 L 25 48" />
                    <path d="M5 30 L 2 35" />
                    <path d="M48 20 A 6 6 0 0 0 40 18" />
                </g>
            );
        case 'gravel':
            return (
                <g fill={color}>
                    <rect x="5" y="5" width="10" height="6" rx="3" />
                    <circle cx="25" cy="10" r="4" />
                    <rect x="15" y="25" width="12" height="8" rx="4" />
                    <circle cx="3" cy="30" r="3" />
                </g>
            );
        case 'wood-1':
            return <path d="M5,5 A5,5 0 0 1 10,10 M25,5 A5,5 0 0 0 30,10 M8,25 A5,5 0 0 0 13,30 M30,25 A5,5 0 0 1 35,30" stroke={color} strokeWidth="1" fill="none"/>;
        case 'wood-2':
            return <path d="M0,4 H30 M40,4 H100 M0,12 H60 M75,12 H100" stroke={color} strokeWidth="1" fill="none"/>;
        case 'parquet-basket':
            return <path d="M40 0 V80 M0 40 H80 M0 10 H40 M0 20 H40 M0 30 H40 M50 0 V40 M60 0 V40 M70 0 V40 M10 40 V80 M20 40 V80 M30 40 V80 M40 50 H80 M40 60 H80 M40 70 H80" stroke={color} strokeWidth="1" fill="none"/>;
        default:
            return <path d="M0 8 L8 0" fill="none" stroke={color} strokeWidth="1"/>;
    }
}

/**
 * SVG Pattern Definitions Component - Base patterns with black stroke
 * These are the master patterns, used as templates
 */
export const PatternDefinitions: React.FC = () => {
    return (
        <>
            {/* Base patterns - these are referenced but we create colored versions dynamically */}
        </>
    );
};

/**
 * Complete SVG with pattern preview - includes defs and rect
 * This displays the pattern exactly like hatch-patterns.html does
 */
export const PatternPreviewSVG: React.FC<{
    patternId: string;
    color?: string;
    size?: number;
}> = ({ patternId, color = '#000000', size = 100 }) => {
    const uniqueId = `preview-${patternId}-${Math.random().toString(36).slice(2, 8)}`;
    const info = getPatternInfo(patternId);
    
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'hidden' }}>
            <defs>
                <pattern
                    id={uniqueId}
                    width={info.width}
                    height={info.height}
                    patternUnits="userSpaceOnUse"
                    patternTransform={info.transform}
                >
                    {renderPatternContent(patternId, color)}
                </pattern>
            </defs>
            <rect width={size} height={size} fill={`url(#${uniqueId})`} />
        </svg>
    );
};

export default PatternDefinitions;
