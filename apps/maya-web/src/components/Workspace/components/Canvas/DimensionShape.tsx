import React from 'react';
import type { DimensionShape as DimensionShapeType } from '../../types';
import { DimensionChip } from './dimensions/DimensionChip';
import { formatLength } from '../../utils/measurements';
import type { LengthUnit } from '../../types';

interface DimensionShapeProps {
    shape: DimensionShapeType;
    isSelected?: boolean;
    zoomScale: number;
    lengthUnit?: LengthUnit;
    onMouseDown?: (e: React.MouseEvent, shapeId: string) => void;
}

export const DimensionShape: React.FC<DimensionShapeProps> = ({
    shape,
    isSelected,
    zoomScale,
    lengthUnit = 'm',
    onMouseDown
}) => {
    const { start, end, offset, strokeWidth } = shape;

    // Calculate geometry
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);

    if (length === 0) return null;

    // Unit vector for direction
    const ux = dx / length;
    const uy = dy / length;

    // Perpendicular vector (rotated 90 degrees counter-clockwise)
    const px = -uy;
    const py = ux;

    // Offset vector
    const ox = px * offset;
    const oy = py * offset;

    // Dimension line points
    const p1 = { x: start.x + ox, y: start.y + oy };
    const p2 = { x: end.x + ox, y: end.y + oy };

    // Calculate angle for text rotation
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    // Keep text readable (not upside down)
    if (angle > 90 || angle < -90) {
        angle += 180;
    }

    // Midpoint for text
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    // Calculate extension lines
    // Stop exactly at the dimension line
    const ext1End = { x: p1.x, y: p1.y };
    const ext2End = { x: p2.x, y: p2.y };

    // Only show extension lines if offset is significant
    const showExtensions = Math.abs(offset) > 0.1;

    // Standard colors
    const lineColor = '#4A90E2';
    const extensionColor = '#555555';

    // Format text
    const text = shape.value ? formatLength(shape.value, lengthUnit) : formatLength(length, lengthUnit);

    return (
        <g
            onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown?.(e, shape.id);
            }}
            style={{ cursor: 'pointer' }}
        >
            {/* Extension Lines */}
            {showExtensions && (
                <>
                    <line
                        x1={start.x} y1={start.y}
                        x2={ext1End.x} y2={ext1End.y}
                        stroke={extensionColor}
                        strokeWidth={0.5}
                        opacity={0.5}
                        strokeDasharray="4 4"
                        vectorEffect="non-scaling-stroke"
                    />
                    <line
                        x1={end.x} y1={end.y}
                        x2={ext2End.x} y2={ext2End.y}
                        stroke={extensionColor}
                        strokeWidth={0.5}
                        opacity={0.5}
                        strokeDasharray="4 4"
                        vectorEffect="non-scaling-stroke"
                    />
                </>
            )}

            {/* Dimension Line */}
            <line
                x1={p1.x} y1={p1.y}
                x2={p2.x} y2={p2.y}
                stroke={lineColor}
                strokeWidth={0.75}
                vectorEffect="non-scaling-stroke"
            />

            {/* Text Chip */}
            <g transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
                <DimensionChip
                    text={text}
                    zoomScale={zoomScale}
                // Use default theme (black bg, white text) to match other dimensions
                />
            </g>
            {isSelected && (
                <line
                    x1={p1.x} y1={p1.y}
                    x2={p2.x} y2={p2.y}
                    stroke="#00AEEF"
                    strokeWidth={strokeWidth + 2}
                    opacity={0.3}
                    vectorEffect="non-scaling-stroke"
                />
            )}
        </g>
    );
};
