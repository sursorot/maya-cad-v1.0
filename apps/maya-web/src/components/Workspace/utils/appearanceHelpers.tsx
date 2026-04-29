import type { Shape } from '../types';

/**
 * Get the effective fill color for a shape, considering appearance
 */
export const getShapeFill = (shape: Shape): string => {
    const fill = shape.appearance?.fill;
    if (!fill || fill.type === 'none') return 'none';
    if (fill.type === 'solid') return fill.color || '#E5E7EB';
    // For patterns/gradients/images, we'll need pattern definitions
    // For now, return a fallback color
    if (fill.type === 'pattern' && fill.patternColors?.primary) {
        return fill.patternColors.primary;
    }
    return '#E5E7EB';
};

/**
 * Get the effective stroke color for a shape, considering appearance
 */
export const getShapeStroke = (shape: Shape): string => {
    const stroke = shape.appearance?.stroke;
    if (!stroke) {
        // Fallback to old property if it exists
        if ('stroke' in shape && typeof shape.stroke === 'string') {
            return shape.stroke as string;
        }
        return '#000000';
    }
    return stroke.color;
};

/**
 * Get the effective stroke width for a shape
 */
export const getShapeStrokeWidth = (shape: Shape): number => {
    const stroke = shape.appearance?.stroke;
    return stroke?.width ?? 1;
};

/**
 * Get the effective opacity for a shape
 */
export const getShapeOpacity = (shape: Shape): number => {
    return shape.appearance?.opacity ?? 1;
};

/**
 * Get stroke dash array if any
 */
export const getStrokeDashArray = (shape: Shape): string | undefined => {
    const stroke = shape.appearance?.stroke;
    return stroke?.dashArray?.join(' ');
};

/**
 * Get stroke line cap
 */
export const getStrokeLineCap = (shape: Shape): 'butt' | 'round' | 'square' => {
    const stroke = shape.appearance?.stroke;
    return stroke?.lineCap ?? 'round';
};

/**
 * Get shape blend mode
 */
export const getShapeBlendMode = (shape: Shape): string => {
    return shape.appearance?.blendMode ?? 'normal';
};

/**
 * Get shape filter for shadow
 */
export const getShapeFilter = (shape: Shape): string | undefined => {
    const shadow = shape.appearance?.shadow;
    if (!shadow) return undefined;

    const filterId = `shadow-${shape.id}`;
    return `url(#${filterId})`;
};

/**
 * Create SVG filter definition for shape shadow
 */
export const createShadowFilter = (shape: Shape): React.ReactNode | null => {
    const shadow = shape.appearance?.shadow;
    if (!shadow) return null;

    const filterId = `shadow-${shape.id}`;

    return (
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation={shadow.blur / 2} />
            <feOffset dx={shadow.offsetX} dy={shadow.offsetY} result="offsetblur" />
            <feFlood floodColor={shadow.color} />
            <feComposite in2="offsetblur" operator="in" />
            <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    );
};
