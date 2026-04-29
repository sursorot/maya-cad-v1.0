import type { FillStyle, Appearance } from '../../types';

/**
 * Get the fill URL or color for a shape based on its appearance
 */
export function getFillAttribute(fill: FillStyle | undefined, shapeId: string): string {
    if (!fill || fill.type === 'none') {
        return 'none';
    }

    if (fill.type === 'solid') {
        return fill.color || '#000000';
    }

    if (fill.type === 'pattern' && fill.patternId) {
        // Use dynamic pattern that's created per-shape with actual colors
        return `url(#pattern-${fill.patternId}-${shapeId})`;
    }

    if (fill.type === 'gradient') {
        // Gradient will be created dynamically per shape
        return `url(#gradient-${shapeId})`;
    }

    if (fill.type === 'image' && fill.imageUrl) {
        // Image fills need special handling with clipping
        return `url(#image-fill-${shapeId})`;
    }

    return 'none';
}

/**
 * Get the stroke color from appearance
 */
export function getStrokeAttribute(appearance: Appearance | undefined, fallback: string = '#000000'): string {
    return appearance?.stroke?.color || fallback;
}

/**
 * Get the stroke width from appearance
 */
export function getStrokeWidth(appearance: Appearance | undefined, fallback: number = 1): number {
    return appearance?.stroke?.width ?? fallback;
}

/**
 * Get the stroke dash array
 */
export function getStrokeDashArray(appearance: Appearance | undefined): string | undefined {
    return appearance?.stroke?.dashArray?.join(' ');
}

/**
 * Get the stroke line cap
 */
export function getStrokeLineCap(appearance: Appearance | undefined): 'butt' | 'round' | 'square' | undefined {
    return appearance?.stroke?.lineCap;
}

/**
 * Get the stroke line join
 */
export function getStrokeLineJoin(appearance: Appearance | undefined): 'miter' | 'round' | 'bevel' | undefined {
    return appearance?.stroke?.lineJoin;
}

/**
 * Get the stroke opacity
 */
export function getStrokeOpacity(appearance: Appearance | undefined): number {
    return appearance?.stroke?.opacity ?? 1;
}

/**
 * Get the fill opacity (combined with shape opacity)
 */
export function getFillOpacity(appearance: Appearance | undefined): number {
    const fillOpacity = appearance?.fill?.opacity ?? 1;
    const shapeOpacity = appearance?.opacity ?? 1;
    return fillOpacity * shapeOpacity;
}

/**
 * Get the shape opacity
 */
export function getShapeOpacity(appearance: Appearance | undefined): number {
    return appearance?.opacity ?? 1;
}

/**
 * Get the blend mode CSS property
 */
export function getBlendMode(appearance: Appearance | undefined): React.CSSProperties['mixBlendMode'] {
    if (!appearance?.blendMode || appearance.blendMode === 'normal') {
        return undefined;
    }
    return appearance.blendMode as React.CSSProperties['mixBlendMode'];
}

/**
 * Get the filter attribute for drop shadow
 */
export function getFilterAttribute(appearance: Appearance | undefined, shapeId: string): string | undefined {
    if (!appearance?.shadow) {
        return undefined;
    }
    return `url(#shadow-${shapeId})`;
}

