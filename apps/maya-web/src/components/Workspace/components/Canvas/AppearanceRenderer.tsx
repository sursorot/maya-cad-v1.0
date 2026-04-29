import React from 'react';
import type { FillStyle, ShadowStyle } from '../../types';
import { getPatternInfo, renderPatternContent } from './PatternDefinitions';

export const HATCH_PATTERN_ID = 'workspace-hatch-pattern';

/**
 * AppearanceRenderer
 * 
 * This component generates all SVG definitions needed for the appearance system:
 * - Pattern definitions for fill patterns
 * - Gradient definitions for linear and radial gradients
 * - Filter definitions for drop shadows
 * 
 * It should be placed inside the <defs> section of the main SVG canvas.
 */
export const AppearanceRenderer: React.FC = () => {
    return (
        <>
            <HatchPatternDefs />
            {/* Shadow Filter - reusable for all shapes */}
            <ShadowFilters />
        </>
    );
};

/**
 * Shadow Filter Definitions
 * Creates reusable drop shadow filters
 */
const ShadowFilters: React.FC = () => {
    return (
        <>
            {/* Default drop shadow - can be customized per shape */}
            <filter id="drop-shadow-default" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                <feOffset dx="2" dy="2" result="offsetblur" />
                <feComponentTransfer>
                    <feFuncA type="linear" slope="0.3" />
                </feComponentTransfer>
                <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </>
    );
};

/**
 * Lightweight diagonal hatch used for selection/preview shading.
 */
const HatchPatternDefs: React.FC = () => {
    return (
        <pattern
            id={HATCH_PATTERN_ID}
            width="0.05"
            height="0.05"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-27)"
        >
            <line
                x1="0"
                y1="0"
                x2="0"
                y2="0.05"
                stroke="#4f7dff"
                strokeWidth="0.012"
                strokeOpacity="0.95"
            />
        </pattern>
    );
};

/**
 * Base scale factor to convert pattern units (designed for pixels ~25-100) 
 * to canvas units (meters ~0.1-10)
 * This makes patterns appear at a reasonable size on the canvas
 */
const PATTERN_BASE_SCALE = 0.01;  //0.02

/**
 * Create a dynamic pattern for a specific shape
 * This creates the exact same pattern as hatch-patterns.html with the specified color,
 * scaled appropriately for the canvas coordinate system
 */
export const DynamicPattern: React.FC<{ 
    shapeId: string; 
    fill: FillStyle;
    bounds?: { minX: number; minY: number; maxX: number; maxY: number };
}> = ({ shapeId, fill }) => {
    if (!fill.patternId) return null;

    const patternId = `pattern-${fill.patternId}-${shapeId}`;
    const color = fill.patternColors?.primary || '#000000';
    const info = getPatternInfo(fill.patternId);
    
    // User scale (1.0 = default, can adjust via slider)
    const userScale = fill.patternScale ?? 1;
    const rotation = fill.patternRotation ?? 0;
    
    // Combined scale: base scale * user scale
    const totalScale = PATTERN_BASE_SCALE * userScale;
    
    // Build the patternTransform - scale is applied here to keep strokes proportional
    const transforms: string[] = [];
    
    // Apply scale via patternTransform so stroke widths scale proportionally
    transforms.push(`scale(${totalScale})`);
    
    // Base transform from pattern definition (e.g., rotate(45) for oblique patterns)
    if (info.transform) {
        transforms.push(info.transform);
    }
    
    // User rotation
    if (rotation !== 0) {
        transforms.push(`rotate(${rotation})`);
    }
    
    const patternTransform = transforms.join(' ');

    return (
        <pattern
            id={patternId}
            width={info.width}
            height={info.height}
            patternUnits="userSpaceOnUse"
            patternTransform={patternTransform}
        >
            {renderPatternContent(fill.patternId, color)}
        </pattern>
    );
};

/**
 * Create a dynamic shadow filter for a specific shape
 */
export const DynamicShadowFilter: React.FC<{ shapeId: string; shadow: ShadowStyle }> = ({ shapeId, shadow }) => {
    const shadowColor = shadow.color || '#000000';
    const opacity = shadowColor.length > 7 ? parseInt(shadowColor.slice(7), 16) / 255 : 0.3;

    return (
        <filter id={`shadow-${shapeId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation={shadow.blur / 2} />
            <feOffset dx={shadow.offsetX} dy={shadow.offsetY} result="offsetblur" />
            <feFlood floodColor={shadowColor.slice(0, 7)} floodOpacity={opacity} />
            <feComposite in2="offsetblur" operator="in" />
            <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    );
};

/**
 * Create a dynamic gradient for a specific shape
 */
export const DynamicGradient: React.FC<{ shapeId: string; fill: FillStyle }> = ({ shapeId, fill }) => {
    if (!fill.gradient) return null;

    const { type, stops, angle = 0 } = fill.gradient;

    if (type === 'linear') {
        const radians = (angle * Math.PI) / 180;
        const x2 = Math.cos(radians);
        const y2 = Math.sin(radians);

        return (
            <linearGradient id={`gradient-${shapeId}`} x1="0" y1="0" x2={x2} y2={y2}>
                {stops.map((stop, index) => (
                    <stop key={index} offset={`${stop.offset * 100}%`} stopColor={stop.color} />
                ))}
            </linearGradient>
        );
    }

    if (type === 'radial') {
        return (
            <radialGradient id={`gradient-${shapeId}`} cx="0.5" cy="0.5" r="0.5">
                {stops.map((stop, index) => (
                    <stop key={index} offset={`${stop.offset * 100}%`} stopColor={stop.color} />
                ))}
            </radialGradient>
        );
    }

    return null;
};
