import React from 'react';
import type { TextShape as TextShapeType } from '../../types';

interface TextShapeProps {
    shape: TextShapeType;
    isSelected: boolean;
    isHovered: boolean;
    zoomScale: number;
    onMouseDown: (e: React.MouseEvent<SVGElement>, shapeId: string) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

export const TextShapeComponent: React.FC<TextShapeProps> = ({
    shape,
    isSelected,
    isHovered,
    zoomScale,
    onMouseDown,
    onMouseEnter,
    onMouseLeave,
}) => {
    if (shape.type !== 'text') return null;

    // Calculate text styling
    const fontStyle = shape.italic ? 'italic' : 'normal';
    const fontWeight = shape.bold ? 'bold' : 'normal';
    const textDecoration = shape.underline ? 'underline' : 'none';

    // Calculate text anchor based on alignment
    const textAnchor = shape.textAlign === 'center' ? 'middle' :
        shape.textAlign === 'right' ? 'end' :
            'start';

    return (
        <g key={shape.id}>
            {/* Invisible background rectangle for easier clicking/selecting */}
            <rect
                x={shape.position.x - (textAnchor === 'middle' ? 0.5 : textAnchor === 'end' ? 1 : 0)}
                y={shape.position.y - shape.fontSize * 0.7}
                width={shape.content.length * shape.fontSize * 0.6}
                height={shape.fontSize * 1.2}
                fill="rgba(0,0,0,0)"
                stroke="transparent"
                strokeWidth={10}
                vectorEffect="non-scaling-stroke"
                pointerEvents="all"
                style={{ cursor: 'all-scroll' }}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    // Always allow onMouseDown to propagate for selection and dragging
                    onMouseDown(e, shape.id);
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    // Only trigger edit mode on double-click
                    if (e.detail === 2) {
                        onMouseDown(e, `${shape.id}-edit`);
                    }
                }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            />

            {/* The text itself */}
            <text
                x={shape.position.x}
                y={shape.position.y}
                fontSize={shape.fontSize}
                fontFamily={shape.fontFamily}
                fontStyle={fontStyle}
                fontWeight={fontWeight}
                textDecoration={textDecoration}
                fill={isSelected ? '#2E5C8A' : (isHovered ? '#4A90E2' : shape.color)}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                pointerEvents="none"
                style={{ userSelect: 'none' }}
            >
                {shape.content}
            </text>

            {/* Selection outline when selected */}
            {isSelected && (
                <>
                    {(() => {
                        // Calculate proper bounding box dimensions
                        const padding = 0.1; // Padding around text
                        const estimatedWidth = shape.content.length * shape.fontSize * 0.6;

                        // Calculate x position based on alignment
                        let boxX: number;
                        if (textAnchor === 'middle') {
                            boxX = shape.position.x - estimatedWidth / 2 - padding;
                        } else if (textAnchor === 'end') {
                            boxX = shape.position.x - estimatedWidth - padding;
                        } else {
                            boxX = shape.position.x - padding;
                        }

                        const boxY = shape.position.y - shape.fontSize * 0.7 - padding;
                        const boxWidth = estimatedWidth + padding * 2;
                        const boxHeight = shape.fontSize * 1.2 + padding * 2;

                        // Handle size in world space (consistent with BoundingBox component)
                        const handleSize = 0.06 * zoomScale;

                        return (
                            <>
                                {/* Bounding box - solid stroke */}
                                <rect
                                    x={boxX}
                                    y={boxY}
                                    width={boxWidth}
                                    height={boxHeight}
                                    fill="none"
                                    stroke="#4A90E2"
                                    strokeWidth={1}
                                    vectorEffect="non-scaling-stroke"
                                    pointerEvents="none"
                                />

                                {/* Corner resize handles */}
                                {/* Top-left */}
                                <rect
                                    x={boxX - handleSize / 2}
                                    y={boxY - handleSize / 2}
                                    width={handleSize}
                                    height={handleSize}
                                    fill="white"
                                    stroke="#4A90E2"
                                    strokeWidth={1}
                                    vectorEffect="non-scaling-stroke"
                                    style={{ cursor: 'nwse-resize' }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        onMouseDown(e, `${shape.id}-resize-tl`);
                                    }}
                                />
                                {/* Top-right */}
                                <rect
                                    x={boxX + boxWidth - handleSize / 2}
                                    y={boxY - handleSize / 2}
                                    width={handleSize}
                                    height={handleSize}
                                    fill="white"
                                    stroke="#4A90E2"
                                    strokeWidth={1}
                                    vectorEffect="non-scaling-stroke"
                                    style={{ cursor: 'nesw-resize' }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        onMouseDown(e, `${shape.id}-resize-tr`);
                                    }}
                                />
                                {/* Bottom-left */}
                                <rect
                                    x={boxX - handleSize / 2}
                                    y={boxY + boxHeight - handleSize / 2}
                                    width={handleSize}
                                    height={handleSize}
                                    fill="white"
                                    stroke="#4A90E2"
                                    strokeWidth={1}
                                    vectorEffect="non-scaling-stroke"
                                    style={{ cursor: 'nesw-resize' }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        onMouseDown(e, `${shape.id}-resize-bl`);
                                    }}
                                />
                                {/* Bottom-right */}
                                <rect
                                    x={boxX + boxWidth - handleSize / 2}
                                    y={boxY + boxHeight - handleSize / 2}
                                    width={handleSize}
                                    height={handleSize}
                                    fill="white"
                                    stroke="#4A90E2"
                                    strokeWidth={1}
                                    vectorEffect="non-scaling-stroke"
                                    style={{ cursor: 'nwse-resize' }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        onMouseDown(e, `${shape.id}-resize-br`);
                                    }}
                                />
                            </>
                        );
                    })()}
                </>
            )}
        </g>
    );
};
