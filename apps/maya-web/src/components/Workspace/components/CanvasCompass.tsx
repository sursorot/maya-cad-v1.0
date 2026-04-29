/**
 * CanvasCompass - A compact, modern compass indicator for canvas orientation
 * 
 * Shows N/S/E/W directions in a minimal, sharp design.
 * Position: Bottom-right corner of the viewport.
 */

import React from 'react';
import type { ViewBox, ToolbarStyle } from '../types';

interface CanvasCompassProps {
  viewBox: ViewBox;
  orientation?: number; // Building orientation in degrees (0 = North up)
  toolbarStyle?: ToolbarStyle;
}

export const CanvasCompass: React.FC<CanvasCompassProps> = ({
  viewBox,
  orientation = 0,
  toolbarStyle = 'modern',
}) => {
  const isWindows95 = toolbarStyle === 'windows95';
  const isCyber = toolbarStyle === 'cyber';
  const isFunk = toolbarStyle === 'funk';
  const isClean = toolbarStyle === 'clean';
  
  // Compact size - scales with viewport but stays small
  const scale = Math.min(viewBox.width, viewBox.height) / 10;
  const size = Math.max(scale * 0.4, 0.15); // Minimum size for visibility
  
  // Position in bottom-right corner with small margin
  const margin = size * 1.5;
  const cx = viewBox.x + viewBox.width - margin;
  const cy = viewBox.y + viewBox.height - margin;
  
  // Rotation based on building orientation
  const rotation = -orientation;
  
  // Colors based on theme
  const colors = {
    bg: isClean ? 'rgba(255, 255, 255, 0.95)'
      : isWindows95 ? 'rgba(192, 192, 192, 0.9)' 
      : isCyber ? 'rgba(10, 37, 64, 0.85)' 
      : isFunk ? 'rgba(255, 255, 255, 0.9)'
      : 'rgba(255, 255, 255, 0.88)',
    border: isClean ? '#3A3A3A'
      : isWindows95 ? '#808080' 
      : isCyber ? '#4da6ff' 
      : isFunk ? '#1e1e1e'
      : '#d0d0d0',
    north: isClean ? '#1565C0' : '#E53935', // Deep glossy blue for Clean theme, Red for others
    text: isClean ? '#1A1A1A'
      : isWindows95 ? '#000000' 
      : isCyber ? '#e8f4ff' 
      : isFunk ? '#1e1e1e'
      : '#444444',
    subtle: isClean ? '#5A6370'
      : isWindows95 ? '#666666' 
      : isCyber ? '#5a7a94' 
      : isFunk ? '#888888'
      : '#999999',
  };
  
  const r = size; // Radius
  const arrowLen = size * 0.65;
  const fontSize = size * 0.35;
  const strokeW = size * 0.04;

  return (
    <g className="canvas-compass" style={{ pointerEvents: 'none' }}>
      {/* Background circle */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={colors.bg}
        stroke={colors.border}
        strokeWidth={strokeW}
      />
      
      {/* Compass rose - rotates with orientation */}
      <g transform={`rotate(${rotation} ${cx} ${cy})`}>
        {/* North arrow - prominent red triangle */}
        <polygon
          points={`
            ${cx},${cy - arrowLen}
            ${cx - arrowLen * 0.22},${cy - arrowLen * 0.15}
            ${cx + arrowLen * 0.22},${cy - arrowLen * 0.15}
          `}
          fill={colors.north}
        />
        
        {/* South indicator - small tick */}
        <line
          x1={cx}
          y1={cy + arrowLen * 0.3}
          x2={cx}
          y2={cy + arrowLen * 0.7}
          stroke={colors.subtle}
          strokeWidth={strokeW * 1.5}
          strokeLinecap="round"
        />
        
        {/* East indicator - small tick */}
        <line
          x1={cx + arrowLen * 0.3}
          y1={cy}
          x2={cx + arrowLen * 0.7}
          y2={cy}
          stroke={colors.subtle}
          strokeWidth={strokeW * 1.5}
          strokeLinecap="round"
        />
        
        {/* West indicator - small tick */}
        <line
          x1={cx - arrowLen * 0.3}
          y1={cy}
          x2={cx - arrowLen * 0.7}
          y2={cy}
          stroke={colors.subtle}
          strokeWidth={strokeW * 1.5}
          strokeLinecap="round"
        />
        
        {/* N label */}
        <text
          x={cx}
          y={cy - arrowLen * 0.55}
          fill={colors.north}
          fontSize={fontSize}
          fontWeight="700"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={isCyber ? "'JetBrains Mono', monospace" : "-apple-system, system-ui, sans-serif"}
        >
          N
        </text>
      </g>
      
      {/* Center dot */}
      <circle
        cx={cx}
        cy={cy}
        r={size * 0.06}
        fill={colors.text}
      />
    </g>
  );
};

