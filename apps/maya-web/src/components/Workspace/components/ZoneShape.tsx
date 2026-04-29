import React, { useMemo } from 'react';
import type { ZoneShape, LengthUnit, MeasurementSettings } from '../types';
import { getPolygonCentroid, calculatePolygonArea, formatArea, formatLength } from '../utils/measurements';
import { useDimensionCollector } from './Canvas/dimensions/DimensionContext';
import { LinearDimension } from './Canvas/dimensions/LinearDimension';
import {
    getFillAttribute,
    getStrokeAttribute,
    getStrokeWidth,
    getStrokeDashArray,
    getFillOpacity,
    getShapeOpacity,
    getStrokeOpacity,
    getBlendMode,
    getFilterAttribute,
} from './Canvas/appearanceUtils';
import {
    DynamicPattern,
    DynamicShadowFilter,
    DynamicGradient,
    HATCH_PATTERN_ID,
} from './Canvas/AppearanceRenderer';

interface ZoneShapeProps {
    shape: ZoneShape;
    isSelected: boolean;
    isHovered: boolean;
    forceHatch?: boolean;
    lengthUnit: LengthUnit;
    showMeasurements: boolean;
    measurementSettings?: MeasurementSettings;
    onMouseDown: (e: React.MouseEvent<SVGElement>, shapeId: string) => void;
    onMouseEnter: (shapeId: string) => void;
    onMouseLeave: (shapeId: string) => void;
}

/**
 * ZoneShapeComponent - Memoized for performance
 * Renders zone polygons with area labels and edge dimensions
 */
export const ZoneShapeComponent: React.FC<ZoneShapeProps> = React.memo(({
    shape,
    isSelected,
    isHovered,
    forceHatch = false,
    lengthUnit,
    showMeasurements,
    onMouseDown,
    onMouseEnter,
    onMouseLeave,
}) => {
    const dimensionCollector = useDimensionCollector();
    const shouldUseDescriptorLayer = Boolean(dimensionCollector);

    const pointsString = useMemo(() => {
        return shape.points.map(p => `${p.x},${p.y}`).join(' ');
    }, [shape.points]);

    const centroid = useMemo(() => {
        if (shape.points.length < 3) return null;
        return getPolygonCentroid(shape.points);
    }, [shape.points]);

    const area = useMemo(() => {
        if (shape.points.length < 3) return 0;
        return calculatePolygonArea(shape.points);
    }, [shape.points]);

    const label = shape.label || 'Zone 1'; // Default label if none provided
    const hatchOpacity = isSelected ? 0.24 : 0.14;
    const showHatch = forceHatch || isSelected || isHovered;

    // Calculate bounds for pattern transform
    const bounds = useMemo(() => {
        if (shape.points.length < 2) return undefined;
        const xs = shape.points.map(p => p.x);
        const ys = shape.points.map(p => p.y);
        return {
            minX: Math.min(...xs),
            minY: Math.min(...ys),
            maxX: Math.max(...xs),
            maxY: Math.max(...ys),
        };
    }, [shape.points]);

    // Calculate edge dimensions if needed
    const edges = useMemo(() => {
        if (!showMeasurements || shape.points.length < 2) return [];
        const result = [];
        for (let i = 0; i < shape.points.length; i++) {
            const p1 = shape.points[i];
            const p2 = shape.points[(i + 1) % shape.points.length];
            // Skip closing edge if not closed yet (though zone is always closed visually)
            // For now, show all edges
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);

            // Calculate angle for rotation
            let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
            if (angle > 90) angle -= 180;
            if (angle < -90) angle += 180;

            result.push({
                x: midX,
                y: midY,
                length,
                angle
            });
        }
        return result;
    }, [shape.points, showMeasurements]);

    // Emit label and area as separate chips if using descriptor layer
    if (shouldUseDescriptorLayer && centroid && showMeasurements) {
        const chipSpacing = 0.15; // Vertical spacing between chips

        // Emit title chip (above center)
        dimensionCollector?.({
            type: 'chip',
            id: `zone-${shape.id}-label`,
            position: { x: centroid.x, y: centroid.y - chipSpacing },
            text: label,
            zoomScale: 1,
        });

        // Emit area chip (below center)
        dimensionCollector?.({
            type: 'chip',
            id: `zone-${shape.id}-area`,
            position: { x: centroid.x, y: centroid.y + chipSpacing },
            text: formatArea(area, lengthUnit),
            zoomScale: 1,
        });
    }

    // If zone is disabled, don't render it at all
    if (shape.disabled) {
        return null;
    }

    return (
        <g
            data-shape-id={shape.id}
            onMouseDown={(e) => onMouseDown(e, shape.id)}
            onMouseEnter={() => onMouseEnter(shape.id)}
            onMouseLeave={() => onMouseLeave(shape.id)}
            style={{ cursor: isHovered ? 'move' : 'default' }}
        >
            {/* Dynamic definitions for this shape */}
            {shape.appearance?.fill?.type === 'gradient' && shape.appearance.fill.gradient && (
                <DynamicGradient shapeId={shape.id} fill={shape.appearance.fill} />
            )}
            {shape.appearance?.fill?.type === 'pattern' && shape.appearance.fill.patternId && (
                <DynamicPattern shapeId={shape.id} fill={shape.appearance.fill} bounds={bounds} />
            )}
            {shape.appearance?.shadow && (
                <DynamicShadowFilter shapeId={shape.id} shadow={shape.appearance.shadow} />
            )}

            {/* Main polygon with fill and stroke - with full appearance support */}
            <polygon
                points={pointsString}
                fill={shape.appearance ? getFillAttribute(shape.appearance?.fill, shape.id) : (isSelected ? 'rgba(111, 98, 164, 0.3)' : 'rgba(111, 98, 164, 0.12)')}
                fillOpacity={shape.appearance ? getFillOpacity(shape.appearance) : undefined}
                stroke={shape.appearance ? getStrokeAttribute(shape.appearance, isSelected ? '#2E5C8A' : (isHovered ? '#4A90E2' : '#2E5C8A')) : (isSelected ? '#2E5C8A' : (isHovered ? '#4A90E2' : '#2E5C8A'))}
                strokeWidth={shape.appearance ? getStrokeWidth(shape.appearance, 1) : 1}
                strokeDasharray={shape.appearance ? getStrokeDashArray(shape.appearance) : undefined}
                strokeOpacity={shape.appearance ? getStrokeOpacity(shape.appearance) : undefined}
                opacity={shape.appearance ? getShapeOpacity(shape.appearance) : undefined}
                vectorEffect="non-scaling-stroke"
                style={{ mixBlendMode: getBlendMode(shape.appearance) }}
                filter={getFilterAttribute(shape.appearance, shape.id)}
            />
            {showHatch && (
                <polygon
                    points={pointsString}
                    fill={`url(#${HATCH_PATTERN_ID})`}
                    fillOpacity={hatchOpacity}
                    stroke="none"
                    pointerEvents="none"
                />
            )}

            {/* Centroid Label - Only if NOT using descriptor layer (fallback) */}
            {!shouldUseDescriptorLayer && centroid && (
                <g transform={`translate(${centroid.x}, ${centroid.y})`}>
                    <text
                        textAnchor="middle"
                        y="-0.2"
                        fontSize={0.4}
                        fill="#3C375A"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                        {label}
                    </text>
                    <text
                        textAnchor="middle"
                        y="0.3"
                        fontSize={0.4}
                        fill="#3C375A"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                        {formatArea(area, lengthUnit)}
                    </text>
                </g>
            )}

            {/* Edge Dimensions */}
            {showMeasurements && edges.map((edge, i) => {
                // Calculate start and end points for the edge
                const p1 = shape.points[i];
                const p2 = shape.points[(i + 1) % shape.points.length];
                return (
                    <LinearDimension
                        key={i}
                        start={p1}
                        end={p2}
                        text={formatLength(edge.length, lengthUnit)}
                        zoomScale={1}
                    />
                );
            })}
        </g>
    );
});

// Display name for React DevTools
ZoneShapeComponent.displayName = 'ZoneShapeComponent';
