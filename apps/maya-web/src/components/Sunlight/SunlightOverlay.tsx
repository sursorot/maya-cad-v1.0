/**
 * SunlightOverlay Component
 * 
 * SVG overlay that renders light patches with shadow boundary curves
 * in a 2D architectural sun study style.
 */

import React from 'react';
import type { SunlightState } from './hooks/useSunlight';
import type { SunlightConfig, LightPatch } from './utils/sunlightTypes';
import type { ViewBox, ToolbarStyle } from '../Workspace/types';
import { polygonToPath, createSunDirectionIndicator } from './utils/lightProjection';

interface SunlightOverlayProps {
  state: SunlightState;
  config: SunlightConfig;
  viewBox: ViewBox;
  toolbarStyle?: ToolbarStyle;
}

// Theme colors for overlays
const getThemeColors = (toolbarStyle: ToolbarStyle = 'modern') => {
  switch (toolbarStyle) {
    case 'clean':
      return {
        sunIndicator: '#000000',
        sunIndicatorStroke: '#ffffff',
        lightFill: 'rgba(0, 0, 0, 0.08)',
        shadowLine: '#000000',
        rayLine: '#6c6c6c',
      };
    case 'windows95':
      return {
        sunIndicator: '#ffcc00',
        sunIndicatorStroke: '#000000',
        lightFill: 'rgba(255, 220, 100, 0.25)',
        shadowLine: '#666666',
        rayLine: '#cccc00',
      };
    case 'funk':
      return {
        sunIndicator: '#f9c500',
        sunIndicatorStroke: '#1e1e1e',
        lightFill: 'rgba(249, 197, 0, 0.2)',
        shadowLine: '#1e1e1e',
        rayLine: '#f9c500',
      };
    case 'cyber':
      return {
        sunIndicator: '#ff6b35',
        sunIndicatorStroke: '#4da6ff',
        lightFill: 'rgba(255, 107, 53, 0.15)',
        shadowLine: '#4da6ff',
        rayLine: '#ff6b35',
      };
    default: // modern
      return {
        sunIndicator: '#ff9500',
        sunIndicatorStroke: '#ffffff',
        lightFill: 'rgba(255, 200, 100, 0.2)',
        shadowLine: '#ff9500',
        rayLine: '#ffcc66',
      };
  }
};

export const SunlightOverlay: React.FC<SunlightOverlayProps> = ({
  state,
  config,
  viewBox,
  toolbarStyle = 'modern',
}) => {
  const theme = getThemeColors(toolbarStyle);

  // Calculate scale for stroke widths
  const scale = viewBox.width / 10;
  const strokeScale = Math.max(0.02, 0.015 * scale);

  // Sun direction indicator
  const indicatorLength = Math.min(viewBox.width, viewBox.height) * 0.12;
  const sunIndicator = config.showSunDirection && state.sunPosition.isAboveHorizon
    ? createSunDirectionIndicator(
      state.sunPosition,
      config.buildingOrientation,
      { x: state.bounds.centerX, y: state.bounds.centerY },
      indicatorLength
    )
    : null;

  return (
    <g className="sunlight-overlay">
      {/* Defs for patterns and gradients */}
      <defs>
        {/* Hatching pattern for shadow areas */}
        <pattern
          id="shadow-hatch"
          patternUnits="userSpaceOnUse"
          width={strokeScale * 3}
          height={strokeScale * 3}
          patternTransform={`rotate(${45 + (state.sunPosition.azimuth - config.buildingOrientation)})`}
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={strokeScale * 3}
            stroke={theme.shadowLine}
            strokeWidth={strokeScale * 0.15}
            strokeOpacity={0.4}
          />
        </pattern>

        {/* Gradients for light patches */}
        {config.showLightPatches && createGradientDefs(state.lightPatches)}
      </defs>

      {/* Light patches with shadow boundary curves */}
      {config.showLightPatches && state.lightPatches.map((patch) => (
        <LightPatchWithCurves
          key={patch.id}
          patch={patch}
        />
      ))}

      {/* Sun rays from openings */}
      {config.showLightPatches && state.lightPatches.map((patch) => (
        <SunRays
          key={`rays-${patch.id}`}
          patch={patch}
          strokeScale={strokeScale}
          theme={theme}
        />
      ))}

      {/* Sun Direction Indicator */}
      {sunIndicator && (
        <SunDirectionArrow
          start={sunIndicator.start}
          end={sunIndicator.end}
          fromSun={sunIndicator.fromSun}
          strokeScale={strokeScale}
          theme={theme}
          altitude={state.sunPosition.altitude}
        />
      )}

      {/* Lit Wall Segments */}
      {state.lightPatches.map((patch) =>
        patch.litSegments?.map((segment) => (
          <line
            key={segment.id}
            x1={segment.start.x}
            y1={segment.start.y}
            x2={segment.end.x}
            y2={segment.end.y}
            stroke="rgba(255, 220, 150, 0.9)"
            strokeWidth={strokeScale * 6}
            strokeLinecap="round"
          />
        ))
      )}

      {/* Sun Position Label */}
      {config.showSunDirection && state.sunPosition.isAboveHorizon && sunIndicator && (
        <SunLabel
          x={sunIndicator.end.x}
          y={sunIndicator.end.y - strokeScale * 8}
          altitude={state.sunPosition.altitude}
          azimuth={state.sunPosition.azimuth}
          strokeScale={strokeScale}
          theme={theme}
          toolbarStyle={toolbarStyle}
        />
      )}

      {/* Debug Info */}
      {state.lightPatches.map((patch) => patch.debugInfo && patch.paths.length > 0 && patch.paths[0].length > 0 && (
        <text
          key={`debug-${patch.id}`}
          x={patch.paths[0][0].x}
          y={patch.paths[0][0].y}
          fill="red"
          fontSize={strokeScale * 2}
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          {patch.debugInfo}
        </text>
      ))}

    </g>
  );
};

// Light Patch - Simple polygon rendering with gradient reference
interface LightPatchWithCurvesProps {
  patch: LightPatch;
}

const LightPatchWithCurves: React.FC<LightPatchWithCurvesProps> = ({
  patch,
}) => {
  return (
    <g className="light-patch" opacity={1}>
      {patch.paths.map((polygon, polyIndex) => {
        if (polygon.length < 3) return null;

        const pathData = polygonToPath(polygon);
        const gradientId = `gradient-${patch.id}-${polyIndex}`;

        return (
          <path
            key={`${patch.id}-poly-${polyIndex}`}
            d={pathData}
            fill={`url(#${gradientId})`}
            stroke="none"
          />
        );
      })}
    </g>
  );
};

// Create gradient definitions for all patches
const createGradientDefs = (patches: LightPatch[]) => {
  return patches.flatMap(patch =>
    patch.paths.map((polygon, polyIndex) => {
      if (polygon.length < 4) return null;

      // Calculate gradient from opening edge (first 2 points) to far edge (last 2 points)
      const gradMidStart = {
        x: (polygon[0].x + polygon[1].x) / 2,
        y: (polygon[0].y + polygon[1].y) / 2,
      };
      const gradMidEnd = {
        x: (polygon[2].x + polygon[3].x) / 2,
        y: (polygon[2].y + polygon[3].y) / 2,
      };

      const gradientId = `gradient-${patch.id}-${polyIndex}`;

      return (
        <linearGradient
          key={gradientId}
          id={gradientId}
          x1={gradMidStart.x}
          y1={gradMidStart.y}
          x2={gradMidEnd.x}
          y2={gradMidEnd.y}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="rgb(255, 204, 102)" stopOpacity="0.7" />
          <stop offset="30%" stopColor="rgb(255, 214, 123)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="rgb(255, 221, 153)" stopOpacity="0.0" />
        </linearGradient>
      );
    })
  ).filter(Boolean);
};

// Sun rays emanating from opening into room
interface SunRaysProps {
  patch: LightPatch;
  strokeScale: number;
  theme: ReturnType<typeof getThemeColors>;
}

const SunRays: React.FC<SunRaysProps> = ({ patch, strokeScale, theme }) => {
  // Use the first path if available
  if (patch.paths.length === 0 || patch.paths[0].length < 4) return null;

  const [p0, p1, p2, p3] = patch.paths[0];

  // Create 3-5 rays from the opening edge toward the far edge
  const numRays = 3;
  const rays: React.ReactNode[] = [];

  for (let i = 0; i <= numRays; i++) {
    const t = i / numRays;

    // Start point on near edge
    const startX = p0.x + (p1.x - p0.x) * t;
    const startY = p0.y + (p1.y - p0.y) * t;

    // End point on far edge
    const endX = p3.x + (p2.x - p3.x) * t;
    const endY = p3.y + (p2.y - p3.y) * t;

    // Draw ray as dashed line
    rays.push(
      <line
        key={i}
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={theme.rayLine}
        strokeWidth={strokeScale * 0.25}
        strokeDasharray={`${strokeScale * 0.5} ${strokeScale * 1.5}`}
        strokeOpacity={0.4}
        strokeLinecap="round"
      />
    );

    // Arrow head at midpoint
    if (i === Math.floor(numRays / 2)) {
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const dx = endX - startX;
      const dy = endY - startY;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len > 0.01) {
        const ux = dx / len;
        const uy = dy / len;
        const arrowSize = strokeScale * 1.5;

        rays.push(
          <polygon
            key={`arrow-${i}`}
            points={`
              ${midX + ux * arrowSize},${midY + uy * arrowSize}
              ${midX - uy * arrowSize * 0.5 - ux * arrowSize * 0.5},${midY + ux * arrowSize * 0.5 - uy * arrowSize * 0.5}
              ${midX + uy * arrowSize * 0.5 - ux * arrowSize * 0.5},${midY - ux * arrowSize * 0.5 - uy * arrowSize * 0.5}
            `}
            fill={theme.rayLine}
            fillOpacity={0.5}
          />
        );
      }
    }
  }

  return <g style={{ pointerEvents: 'none' }}>{rays}</g>;
};

// Sun Direction Arrow Component
interface SunDirectionArrowProps {
  start: { x: number; y: number };
  end: { x: number; y: number };
  fromSun: { x: number; y: number };
  strokeScale: number;
  theme: ReturnType<typeof getThemeColors>;
  altitude: number;
}

const SunDirectionArrow: React.FC<SunDirectionArrowProps> = ({
  start,
  end,
  fromSun,
  strokeScale,
  theme,
  altitude,
}) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < 0.001) return null;

  const intensity = Math.min(1, altitude / 60);
  const glowSize = strokeScale * (6 + intensity * 4);

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Sun glow */}
      <circle
        cx={end.x}
        cy={end.y}
        r={glowSize}
        fill={theme.sunIndicator}
        fillOpacity={0.15 + intensity * 0.1}
      />

      {/* Light direction rays */}
      <line
        x1={end.x}
        y1={end.y}
        x2={fromSun.x}
        y2={fromSun.y}
        stroke={theme.sunIndicator}
        strokeWidth={strokeScale * 0.6}
        strokeDasharray={`${strokeScale * 1.5} ${strokeScale * 0.8}`}
        strokeOpacity={0.4}
      />

      {/* Sun circle */}
      <circle
        cx={end.x}
        cy={end.y}
        r={strokeScale * 3}
        fill={theme.sunIndicator}
        stroke={theme.sunIndicatorStroke}
        strokeWidth={strokeScale * 0.3}
      />

      {/* Sun rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const innerR = strokeScale * 4;
        const outerR = strokeScale * 5.5;
        return (
          <line
            key={angle}
            x1={end.x + Math.cos(rad) * innerR}
            y1={end.y + Math.sin(rad) * innerR}
            x2={end.x + Math.cos(rad) * outerR}
            y2={end.y + Math.sin(rad) * outerR}
            stroke={theme.sunIndicator}
            strokeWidth={strokeScale * 0.4}
            strokeLinecap="round"
            strokeOpacity={0.7}
          />
        );
      })}

      {/* Center reference */}
      <circle
        cx={start.x}
        cy={start.y}
        r={strokeScale}
        fill={theme.sunIndicatorStroke}
        fillOpacity={0.4}
      />
    </g>
  );
};

// Sun Label Component
interface SunLabelProps {
  x: number;
  y: number;
  altitude: number;
  azimuth: number;
  strokeScale: number;
  theme: ReturnType<typeof getThemeColors>;
  toolbarStyle: ToolbarStyle;
}

const SunLabel: React.FC<SunLabelProps> = ({
  x,
  y,
  altitude,
  azimuth,
  strokeScale,
  theme,
  toolbarStyle,
}) => {
  const isWindows95 = toolbarStyle === 'windows95';
  const isCyber = toolbarStyle === 'cyber';

  const fontSize = strokeScale * 2.2;
  const padding = strokeScale * 1.2;

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dirIndex = Math.round(azimuth / 45) % 8;
  const compass = directions[dirIndex];

  const labelText = `${compass} ${altitude.toFixed(0)}°`;
  const labelWidth = labelText.length * fontSize * 0.55 + padding * 2;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={x - labelWidth / 2}
        y={y - fontSize / 2 - padding}
        width={labelWidth}
        height={fontSize + padding * 2}
        rx={isWindows95 ? 0 : fontSize * 0.25}
        fill={isWindows95 ? '#c0c0c0' : isCyber ? 'rgba(10, 37, 64, 0.9)' : 'rgba(255, 255, 255, 0.9)'}
        stroke={theme.sunIndicator}
        strokeWidth={strokeScale * 0.2}
      />
      <text
        x={x}
        y={y + fontSize * 0.3}
        fill={isWindows95 ? '#000000' : isCyber ? '#e8f4ff' : '#101010'}
        fontSize={fontSize}
        fontFamily={isCyber ? "'JetBrains Mono', monospace" : "-apple-system, sans-serif"}
        textAnchor="middle"
        fontWeight="600"
      >
        ☀️ {labelText}
      </text>
    </g>
  );
};

// Compass Indicator Component - Shows N/S/E/W orientation
interface CompassIndicatorProps {
  viewBox: ViewBox;
  buildingOrientation: number;
  strokeScale: number;
  theme: ReturnType<typeof getThemeColors>;
  toolbarStyle: ToolbarStyle;
}

// Reserved for future use - compass indicator for sunlight direction
export const CompassIndicator: React.FC<CompassIndicatorProps> = ({
  viewBox,
  buildingOrientation,
  strokeScale,
  theme,
  toolbarStyle,
}) => {
  const isWindows95 = toolbarStyle === 'windows95';
  const isCyber = toolbarStyle === 'cyber';
  
  // Position compass in bottom-left corner of viewport - use larger size for visibility
  const compassSize = Math.max(Math.min(viewBox.width, viewBox.height) * 0.12, strokeScale * 20);
  const margin = strokeScale * 8;
  const cx = viewBox.x + margin + compassSize;
  const cy = viewBox.y + viewBox.height - margin - compassSize;
  
  // Rotate compass based on building orientation
  // If building is oriented 45° from North, compass should show that
  const rotationAngle = -buildingOrientation;
  
  const fontSize = strokeScale * 3;
  const arrowLength = compassSize * 0.5;
  const labelOffset = compassSize * 0.7;
  
  // Colors based on theme
  const bgColor = isWindows95 ? 'rgba(192, 192, 192, 0.95)' : isCyber ? 'rgba(10, 37, 64, 0.9)' : 'rgba(255, 255, 255, 0.92)';
  const borderColor = isWindows95 ? '#808080' : isCyber ? theme.sunIndicator : '#cccccc';
  const northColor = '#E53935'; // Red for North
  const southColor = isWindows95 ? '#000000' : isCyber ? '#8ba4bc' : '#666666';
  const eastWestColor = isWindows95 ? '#000080' : isCyber ? '#4da6ff' : '#888888';
  const textColor = isWindows95 ? '#000000' : isCyber ? '#e8f4ff' : '#333333';

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Background circle */}
      <circle
        cx={cx}
        cy={cy}
        r={compassSize * 0.85}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={strokeScale * 0.5}
      />
      
      {/* Inner decorative circle */}
      <circle
        cx={cx}
        cy={cy}
        r={compassSize * 0.65}
        fill="none"
        stroke={borderColor}
        strokeWidth={strokeScale * 0.2}
        strokeOpacity={0.5}
      />
      
      {/* Rotated compass rose */}
      <g transform={`rotate(${rotationAngle} ${cx} ${cy})`}>
        {/* North arrow (red, prominent) */}
        <polygon
          points={`
            ${cx},${cy - arrowLength}
            ${cx - arrowLength * 0.25},${cy}
            ${cx + arrowLength * 0.25},${cy}
          `}
          fill={northColor}
        />
        
        {/* South arrow (gray) */}
        <polygon
          points={`
            ${cx},${cy + arrowLength}
            ${cx - arrowLength * 0.2},${cy}
            ${cx + arrowLength * 0.2},${cy}
          `}
          fill={southColor}
          fillOpacity={0.6}
        />
        
        {/* East tick */}
        <line
          x1={cx + arrowLength * 0.3}
          y1={cy}
          x2={cx + arrowLength * 0.8}
          y2={cy}
          stroke={eastWestColor}
          strokeWidth={strokeScale * 0.4}
          strokeLinecap="round"
        />
        
        {/* West tick */}
        <line
          x1={cx - arrowLength * 0.3}
          y1={cy}
          x2={cx - arrowLength * 0.8}
          y2={cy}
          stroke={eastWestColor}
          strokeWidth={strokeScale * 0.4}
          strokeLinecap="round"
        />
        
        {/* Direction labels */}
        <text
          x={cx}
          y={cy - labelOffset}
          fill={northColor}
          fontSize={fontSize}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={isCyber ? "'JetBrains Mono', monospace" : "-apple-system, sans-serif"}
        >
          N
        </text>
        
        <text
          x={cx}
          y={cy + labelOffset}
          fill={textColor}
          fontSize={fontSize * 0.8}
          fontWeight="500"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={isCyber ? "'JetBrains Mono', monospace" : "-apple-system, sans-serif"}
          opacity={0.7}
        >
          S
        </text>
        
        <text
          x={cx + labelOffset}
          y={cy}
          fill={textColor}
          fontSize={fontSize * 0.8}
          fontWeight="500"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={isCyber ? "'JetBrains Mono', monospace" : "-apple-system, sans-serif"}
          opacity={0.7}
        >
          E
        </text>
        
        <text
          x={cx - labelOffset}
          y={cy}
          fill={textColor}
          fontSize={fontSize * 0.8}
          fontWeight="500"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={isCyber ? "'JetBrains Mono', monospace" : "-apple-system, sans-serif"}
          opacity={0.7}
        >
          W
        </text>
      </g>
      
      {/* Center dot */}
      <circle
        cx={cx}
        cy={cy}
        r={strokeScale * 1.2}
        fill={textColor}
      />
    </g>
  );
};
