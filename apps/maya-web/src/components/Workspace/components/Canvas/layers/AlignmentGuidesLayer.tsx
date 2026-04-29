/**
 * Alignment Guides Layer
 * 
 * Renders smart alignment guide lines when dragging shapes.
 * Shows thin lines indicating alignment with centers, edges, and corners
 * of other objects on the canvas.
 * 
 * Visual Design:
 * - Thin, semi-transparent lines (magenta/pink color like Figma)
 * - Dashed pattern for center alignment
 * - Solid pattern for edge alignment
 * - Small distance indicators at snap points
 */

import { memo } from 'react';
import type { AlignmentGuide, AlignmentGuideType } from '../../../hooks/useAlignmentGuides';

interface AlignmentGuidesLayerProps {
  /** Active alignment guides to display */
  guides: AlignmentGuide[];
  /** Zoom scale for proper line thickness */
  zoomScale: number;
  /** Whether guides are enabled */
  enabled?: boolean;
}

/**
 * Get color for alignment guide type
 * Using a blue color scheme for clear visibility
 */
function getGuideColor(type: AlignmentGuideType): string {
  switch (type) {
    case 'center-horizontal':
    case 'center-vertical':
      return '#2196F3'; // Material blue for center alignment
    case 'edge-left':
    case 'edge-right':
    case 'edge-top':
    case 'edge-bottom':
      return '#1976D2'; // Darker blue for edge alignment
    case 'corner':
      return '#42A5F5'; // Lighter blue for corner alignment
    case 'spacing':
      return '#0288D1'; // Light blue for spacing guides
    default:
      return '#2196F3';
  }
}

/**
 * Get dash pattern for alignment guide type
 */
function getDashPattern(type: AlignmentGuideType, zoomScale: number): string | undefined {
  const unit = 0.02 * zoomScale; // Base unit for dash pattern
  
  switch (type) {
    case 'center-horizontal':
    case 'center-vertical':
      // Dashed pattern for center alignment
      return `${unit * 3} ${unit * 2}`;
    case 'spacing':
      // Dotted pattern for spacing
      return `${unit} ${unit * 2}`;
    default:
      // Solid line for edge alignment
      return undefined;
  }
}

/**
 * Get stroke width for alignment guide
 */
function getStrokeWidth(type: AlignmentGuideType, zoomScale: number): number {
  // Thin lines that scale with zoom
  const baseWidth = 0.008 * zoomScale;
  
  switch (type) {
    case 'center-horizontal':
    case 'center-vertical':
      return baseWidth * 1.2; // Slightly thicker for center guides
    default:
      return baseWidth;
  }
}

/**
 * Individual guide line component
 */
const GuideLine = memo(function GuideLine({
  guide,
  zoomScale,
}: {
  guide: AlignmentGuide;
  zoomScale: number;
}) {
  const color = getGuideColor(guide.type);
  const dashPattern = getDashPattern(guide.type, zoomScale);
  const strokeWidth = getStrokeWidth(guide.type, zoomScale);

  return (
    <g className={`alignment-guide alignment-guide-${guide.type}`}>
      {/* Main guide line */}
      <line
        x1={guide.start.x}
        y1={guide.start.y}
        x2={guide.end.x}
        y2={guide.end.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashPattern}
        strokeLinecap="round"
        opacity={0.8}
        pointerEvents="none"
      />
      
      {/* Small marker at the alignment value */}
      {guide.orientation === 'vertical' ? (
        // Vertical line - show small horizontal tick
        <line
          x1={guide.alignValue - 0.02 * zoomScale}
          y1={(guide.start.y + guide.end.y) / 2}
          x2={guide.alignValue + 0.02 * zoomScale}
          y2={(guide.start.y + guide.end.y) / 2}
          stroke={color}
          strokeWidth={strokeWidth * 1.5}
          opacity={0.9}
          pointerEvents="none"
        />
      ) : (
        // Horizontal line - show small vertical tick
        <line
          x1={(guide.start.x + guide.end.x) / 2}
          y1={guide.alignValue - 0.02 * zoomScale}
          x2={(guide.start.x + guide.end.x) / 2}
          y2={guide.alignValue + 0.02 * zoomScale}
          stroke={color}
          strokeWidth={strokeWidth * 1.5}
          opacity={0.9}
          pointerEvents="none"
        />
      )}
    </g>
  );
});

/**
 * Snap indicator at alignment points
 */
const SnapIndicator = memo(function SnapIndicator({
  guide,
  zoomScale,
}: {
  guide: AlignmentGuide;
  zoomScale: number;
}) {
  const color = getGuideColor(guide.type);
  const size = 0.015 * zoomScale;
  
  // Position at the alignment value
  const x = guide.orientation === 'vertical' 
    ? guide.alignValue 
    : (guide.start.x + guide.end.x) / 2;
  const y = guide.orientation === 'horizontal' 
    ? guide.alignValue 
    : (guide.start.y + guide.end.y) / 2;

  return (
    <g className="alignment-snap-indicator">
      {/* Diamond shape indicator */}
      <path
        d={`M ${x} ${y - size} L ${x + size} ${y} L ${x} ${y + size} L ${x - size} ${y} Z`}
        fill={color}
        fillOpacity={0.3}
        stroke={color}
        strokeWidth={0.004 * zoomScale}
        pointerEvents="none"
      />
    </g>
  );
});

/**
 * Memoized alignment guides layer
 */
export const AlignmentGuidesLayer = memo(function AlignmentGuidesLayer({
  guides,
  zoomScale,
  enabled = true,
}: AlignmentGuidesLayerProps) {
  if (!enabled || guides.length === 0) {
    return null;
  }

  return (
    <g className="alignment-guides-layer" data-export-exclude="true">
      {/* Render all guide lines */}
      {guides.map((guide, index) => (
        <GuideLine
          key={`guide-${guide.type}-${guide.alignValue.toFixed(4)}-${index}`}
          guide={guide}
          zoomScale={zoomScale}
        />
      ))}
      
      {/* Render snap indicators for the closest guides */}
      {guides.slice(0, 2).map((guide, index) => (
        <SnapIndicator
          key={`snap-${guide.type}-${guide.alignValue.toFixed(4)}-${index}`}
          guide={guide}
          zoomScale={zoomScale}
        />
      ))}
    </g>
  );
});

export default AlignmentGuidesLayer;

