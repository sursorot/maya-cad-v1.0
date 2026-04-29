import React, { useMemo } from 'react';
import type { AssetShape, ToolType } from '../../types';
import { getAssetById } from './assetRegistry';

interface AssetShapeProps {
  shape: AssetShape;
  isSelected: boolean;
  isHovered: boolean;
  activeTool: ToolType;
  zoomScale: number;
  onMouseDown: (e: React.MouseEvent<SVGElement>, shapeId: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const AssetShapeComponent: React.FC<AssetShapeProps> = React.memo(({
  shape,
  isSelected,
  isHovered,
  activeTool,
  zoomScale,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (shape.type !== 'asset') return null;

  const assetDef = useMemo(() => getAssetById(shape.assetId), [shape.assetId]);
  
  if (!assetDef) {
    // Render a placeholder for unknown assets
    return (
      <g key={shape.id}>
        <rect
          x={shape.position.x - shape.width / 2}
          y={shape.position.y - shape.height / 2}
          width={shape.width}
          height={shape.height}
          fill="none"
          stroke="#999"
          strokeWidth={1}
          strokeDasharray="4 2"
          vectorEffect="non-scaling-stroke"
          transform={`rotate(${shape.rotation}, ${shape.position.x}, ${shape.position.y})`}
        />
        <text
          x={shape.position.x}
          y={shape.position.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={0.08 * zoomScale}
          fill="#999"
          transform={`rotate(${shape.rotation}, ${shape.position.x}, ${shape.position.y})`}
        >
          Unknown Asset
        </text>
      </g>
    );
  }

  // Calculate the transform for position, rotation, and flip
  const { position, width, height, rotation, flipHorizontal, flipVertical, opacity } = shape;
  
  // Build transform: translate to position, rotate, then scale to fit
  // The SVG content is centered at (0,0) so we translate to the position
  const scaleX = (flipHorizontal ? -1 : 1);
  const scaleY = (flipVertical ? -1 : 1);
  
  // Parse viewBox to get original dimensions
  const viewBoxParts = assetDef.viewBox.split(' ').map(Number);
  const vbX = viewBoxParts[0];
  const vbY = viewBoxParts[1];
  const vbWidth = viewBoxParts[2];
  const vbHeight = viewBoxParts[3];
  
  // Calculate scale to fit asset into the specified width/height
  // Use the actual stored dimensions (which maintain aspect ratio from resize)
  const scaleToFitX = width / vbWidth;
  const scaleToFitY = height / vbHeight;
  
  // Use uniform scale to maintain aspect ratio - SVG fills snugly
  const uniformScale = Math.min(scaleToFitX, scaleToFitY);
  
  // Calculate actual rendered dimensions (snug fit)
  const renderedWidth = vbWidth * uniformScale;
  const renderedHeight = vbHeight * uniformScale;
  
  // Final transform: translate to center position, rotate, scale, then offset for viewBox
  const transform = `
    translate(${position.x}, ${position.y})
    rotate(${rotation})
    scale(${uniformScale * scaleX}, ${uniformScale * scaleY})
    translate(${-vbX - vbWidth / 2}, ${-vbY - vbHeight / 2})
  `;

  // Color the SVG content based on theme/selection state
  const strokeColor = isSelected 
    ? '#2E5C8A' 
    : isHovered 
      ? '#4A90E2' 
      : shape.appearance?.stroke?.color || shape.stroke || '#000000';

  // Get fill from appearance system or use default
  const fillStyle = shape.appearance?.fill;
  const fillColor = fillStyle?.type === 'solid' ? (fillStyle.color || '#f5f5f5') : '#f5f5f5';
  const fillOpacity = fillStyle?.type === 'solid' ? (fillStyle.opacity ?? 0.3) : (fillStyle?.type === 'none' ? 0 : 0.3);

  return (
    <g key={shape.id}>
      {/* Background fill - solid color behind the SVG content */}
      <rect
        x={position.x - renderedWidth / 2}
        y={position.y - renderedHeight / 2}
        width={renderedWidth}
        height={renderedHeight}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke="none"
        pointerEvents="none"
        transform={`rotate(${rotation}, ${position.x}, ${position.y})`}
      />

      {/* The asset SVG content - pointerEvents none so clicks go to hit area */}
      <g
        transform={transform}
        opacity={opacity}
        style={{ color: strokeColor, pointerEvents: 'none' }}
      >
        {/* Use dangerouslySetInnerHTML to render the SVG content */}
        <g dangerouslySetInnerHTML={{ __html: assetDef.svgContent }} />
      </g>

      {/* Hover indicator - snug to rendered SVG */}
      {isHovered && !isSelected && (
        <rect
          x={position.x - renderedWidth / 2}
          y={position.y - renderedHeight / 2}
          width={renderedWidth}
          height={renderedHeight}
          fill="none"
          stroke="#4A90E2"
          strokeWidth={1.5}
          strokeOpacity={0.5}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
          transform={`rotate(${rotation}, ${position.x}, ${position.y})`}
        />
      )}

      {/* Clickable hit area on top - captures all mouse events */}
      <rect
        x={position.x - renderedWidth / 2}
        y={position.y - renderedHeight / 2}
        width={renderedWidth}
        height={renderedHeight}
        fill="rgba(0,0,0,0)"
        stroke="none"
        pointerEvents="all"
        style={{ cursor: (activeTool === 'select' || activeTool === 'asset') ? 'pointer' : 'inherit' }}
        transform={`rotate(${rotation}, ${position.x}, ${position.y})`}
        onMouseDown={(e) => {
          // Allow selection when using select tool OR when clicking on existing asset while in asset mode
          if (activeTool === 'select' || activeTool === 'asset') {
            e.stopPropagation();
            onMouseDown(e, shape.id);
          }
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

      {/* Label if provided */}
      {shape.label && (
        <text
          x={position.x}
          y={position.y + renderedHeight / 2 + 0.05 * zoomScale}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontSize={0.06 * zoomScale}
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={strokeColor}
          opacity={0.7}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {shape.label}
        </text>
      )}
    </g>
  );
});

AssetShapeComponent.displayName = 'AssetShapeComponent';

