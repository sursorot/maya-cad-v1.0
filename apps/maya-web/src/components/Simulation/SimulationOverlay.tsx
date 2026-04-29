/**
 * SimulationOverlay Component
 * 
 * SVG overlay that renders the agent, path, raycasts, and goal on the canvas.
 * Themed to match the app's toolbar style.
 */

import React from 'react';
import type { SimulationState } from './hooks/useSimulation';
import type { SimulationConfig, RaycastResult, GoalShape } from './utils/navigationTypes';
import type { ViewBox, ToolbarStyle } from '../Workspace/types';

// Theme colors for each style
const getThemeColors = (toolbarStyle: ToolbarStyle = 'modern') => {
  switch (toolbarStyle) {
    case 'windows95':
      return {
        agent: '#000080',        // Navy blue
        agentStroke: '#000000',
        goal: '#00dd00',         // Bright lime green
        goalDark: '#00aa00',
        path: 'rgba(0, 0, 128, 0.5)',
        collision: '#ff0000',
        hudBg: '#c0c0c0',
        hudText: '#000000',
        hudAccent: '#000080',
        hudGoal: '#00cc00',
        hudHit: '#ff0000',
        fontFamily: "'Tahoma', 'Verdana', sans-serif",
      };
    case 'funk':
      return {
        agent: '#ff69b4',        // Hot pink
        agentStroke: '#1e1e1e',
        goal: '#00ffcc',         // Bright cyan-green
        goalDark: '#00cc99',
        path: 'rgba(255, 105, 180, 0.5)',
        collision: '#f9c500',    // Yellow
        hudBg: '#ffffff',
        hudText: '#1e1e1e',
        hudAccent: '#ff69b4',
        hudGoal: '#00e6b8',
        hudHit: '#f9c500',
        fontFamily: "'Inter', sans-serif",
      };
    case 'cyber':
      return {
        agent: '#ff6b35',        // Orange
        agentStroke: '#4da6ff',
        goal: '#00ff88',         // Bright neon green
        goalDark: '#00cc66',
        path: 'rgba(77, 166, 255, 0.5)',
        collision: '#ff6b35',
        hudBg: 'rgba(10, 37, 64, 0.9)',
        hudText: '#e8f4ff',
        hudAccent: '#4da6ff',
        hudGoal: '#00ff88',
        hudHit: '#ff6b35',
        fontFamily: "'JetBrains Mono', monospace",
      };
    default: // modern
      return {
        agent: '#6F62A4',        // Purple
        agentStroke: '#4c5ed9',
        goal: '#22c55e',         // Vibrant green
        goalDark: '#16a34a',
        path: 'rgba(111, 98, 164, 0.5)',
        collision: '#f87171',
        hudBg: 'rgba(255, 255, 255, 0.9)',
        hudText: '#101010',
        hudAccent: '#6F62A4',
        hudGoal: '#22c55e',
        hudHit: '#f87171',
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      };
  }
};

interface SimulationOverlayProps {
  state: SimulationState;
  config: SimulationConfig;
  viewBox: ViewBox;
  toolbarStyle?: ToolbarStyle;
}

export const SimulationOverlay: React.FC<SimulationOverlayProps> = ({
  state,
  config,
  viewBox,
  toolbarStyle = 'modern',
}) => {
  if (!state.isValid || !state.floorplan) {
    return null;
  }
  
  const theme = getThemeColors(toolbarStyle);
  const { agent, goal, path, raycasts, lastCollision } = state;
  const { showRaycasts, showRayLabels, showPath, showGoal } = config;
  
  // Calculate scale for stroke widths based on viewBox
  const scale = viewBox.width / 10;
  const strokeScale = Math.max(0.02, 0.015 * scale);
  
  return (
    <g className="simulation-overlay">

      {/* Path Trail */}
      {showPath && path.length > 1 && (
        <path
          d={pathToSvg(path)}
          fill="none"
          stroke={theme.path}
          strokeWidth={strokeScale * 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: 'none' }}
        />
      )}
      
      {/* Raycasts */}
      {showRaycasts && raycasts.map((ray, index) => (
        <RaycastLine
          key={index}
          ray={ray}
          originX={agent.x}
          originY={agent.y}
          strokeScale={strokeScale}
          toolbarStyle={toolbarStyle}
          showLabels={showRayLabels}
        />
      ))}
      
      {/* Goal */}
      {showGoal && (
        <GoalMarker
          x={goal.x}
          y={goal.y}
          radius={goal.radius}
          width={goal.width}
          height={goal.height}
          shape={goal.shape}
          strokeScale={strokeScale}
          theme={theme}
          toolbarStyle={toolbarStyle}
        />
      )}
      
      {/* Collision Flash */}
      {lastCollision && Date.now() - lastCollision.time < 300 && (
        <CollisionFlash
          x={lastCollision.x}
          y={lastCollision.y}
          time={lastCollision.time}
          strokeScale={strokeScale}
          theme={theme}
        />
      )}
      
      {/* Agent */}
      <AgentMarker
        x={agent.x}
        y={agent.y}
        radius={agent.radius}
        direction={getAgentDirection(path)}
        strokeScale={strokeScale}
        theme={theme}
        toolbarStyle={toolbarStyle}
      />
      
      {/* HUD Overlay (stats in corner) */}
      <HudOverlay
        state={state}
        config={config}
        viewBox={viewBox}
        theme={theme}
        toolbarStyle={toolbarStyle}
      />
    </g>
  );
};

// Theme type
interface ThemeColors {
  agent: string;
  agentStroke: string;
  goal: string;
  goalDark: string;
  path: string;
  collision: string;
  hudBg: string;
  hudText: string;
  hudAccent: string;
  hudGoal: string;
  hudHit: string;
  fontFamily: string;
}

// Path to SVG path string
function pathToSvg(path: { x: number; y: number }[]): string {
  if (path.length === 0) return '';
  
  let d = `M ${path[0].x} ${path[0].y}`;
  for (let i = 1; i < path.length; i++) {
    d += ` L ${path[i].x} ${path[i].y}`;
  }
  return d;
}

// Get agent direction from path
function getAgentDirection(path: { x: number; y: number }[]): { dx: number; dy: number } | null {
  if (path.length < 2) return null;
  
  const prev = path[path.length - 2];
  const curr = path[path.length - 1];
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  if (len < 0.001) return null;
  
  return { dx: dx / len, dy: dy / len };
}

// Raycast Line Component - Thin, precise with distance labels
interface RaycastLineProps {
  ray: RaycastResult;
  originX: number;
  originY: number;
  strokeScale: number;
  toolbarStyle: ToolbarStyle;
  showLabels?: boolean;
}

const RaycastLine: React.FC<RaycastLineProps> = ({ ray, originX, originY, strokeScale, toolbarStyle, showLabels = true }) => {
  const normalized = Math.min(ray.distance / 5, 1);
  
  // Theme-aware raycast colors (red=close/danger → green=far/safe)
  let color: string;
  let labelBg: string;
  let labelText: string;
  
  if (toolbarStyle === 'windows95') {
    // Bright green vs red
    color = normalized > 0.5 ? '#00dd00' : '#ff0000';
    labelBg = '#c0c0c0';
    labelText = '#000000';
  } else if (toolbarStyle === 'funk') {
    // Pink to bright cyan-green
    const r = Math.floor(255 * (1 - normalized));
    const g = Math.floor(100 + 155 * normalized);
    const b = Math.floor(180 - 80 * normalized);
    color = `rgb(${r}, ${g}, ${b})`;
    labelBg = '#ffffff';
    labelText = '#1e1e1e';
  } else if (toolbarStyle === 'cyber') {
    // Orange to neon green
    const r = Math.floor(255 * (1 - normalized * 0.85));
    const g = Math.floor(107 + 148 * normalized);
    const b = Math.floor(53 + 83 * normalized);
    color = `rgb(${r}, ${g}, ${b})`;
    labelBg = 'rgba(10, 37, 64, 0.9)';
    labelText = '#e8f4ff';
  } else {
    // Red to vibrant green
    const r = Math.floor(255 * (1 - normalized));
    const g = Math.floor(80 + 175 * normalized);
    const b = Math.floor(80 * (1 - normalized));
    color = `rgb(${r}, ${g}, ${b})`;
    labelBg = 'rgba(255, 255, 255, 0.9)';
    labelText = '#101010';
  }
  
  // Calculate label position (midpoint of ray, offset slightly)
  const midX = (originX + ray.hitX) / 2;
  const midY = (originY + ray.hitY) / 2;
  
  // Calculate perpendicular offset for label
  const dx = ray.hitX - originX;
  const dy = ray.hitY - originY;
  const len = Math.sqrt(dx * dx + dy * dy);
  const offsetX = len > 0 ? (-dy / len) * strokeScale * 3 : 0;
  const offsetY = len > 0 ? (dx / len) * strokeScale * 3 : 0;
  
  // Format distance (1 decimal place)
  const distLabel = ray.distance.toFixed(1);
  const fontSize = strokeScale * 2.5;
  const labelPadX = fontSize * 0.3;
  const labelPadY = fontSize * 0.15;
  
  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Thin precise ray line */}
      <line
        x1={originX}
        y1={originY}
        x2={ray.hitX}
        y2={ray.hitY}
        stroke={color}
        strokeWidth={strokeScale * 0.4}
        strokeOpacity={0.7}
        strokeDasharray={`${strokeScale * 0.8} ${strokeScale * 0.4}`}
      />
      {/* Tiny dot at hit point */}
      <circle
        cx={ray.hitX}
        cy={ray.hitY}
        r={strokeScale * 0.5}
        fill={color}
      />
      {/* Distance label chip */}
      {showLabels && (
        <g>
          <rect
            x={midX + offsetX - (distLabel.length * fontSize * 0.3) - labelPadX}
            y={midY + offsetY - fontSize * 0.5 - labelPadY}
            width={distLabel.length * fontSize * 0.6 + labelPadX * 2}
            height={fontSize + labelPadY * 2}
            rx={fontSize * 0.2}
            fill={labelBg}
            stroke={color}
            strokeWidth={strokeScale * 0.15}
          />
          <text
            x={midX + offsetX}
            y={midY + offsetY + fontSize * 0.35}
            fill={labelText}
            fontSize={fontSize}
            fontFamily={toolbarStyle === 'cyber' ? "'JetBrains Mono', monospace" : "-apple-system, sans-serif"}
            textAnchor="middle"
            fontWeight={toolbarStyle === 'windows95' ? 'bold' : '500'}
          >
            {distLabel}
          </text>
        </g>
      )}
    </g>
  );
};

// Goal Marker Component - Supports circle, rectangle, and diamond shapes
interface GoalMarkerProps {
  x: number;
  y: number;
  radius: number;
  width: number;
  height: number;
  shape: GoalShape;
  strokeScale: number;
  theme: ThemeColors;
  toolbarStyle: ToolbarStyle;
}

const GoalMarker: React.FC<GoalMarkerProps> = ({ x, y, radius, width, height, shape, strokeScale, theme, toolbarStyle }) => {
  const isWindows95 = toolbarStyle === 'windows95';
  const lineWidth = strokeScale * 1.2;
  
  // Render shape-specific goal area
  const renderShape = () => {
    switch (shape) {
      case 'rectangle': {
        const halfW = width / 2;
        const halfH = height / 2;
        return (
          <>
            {/* Rectangle outline */}
            <rect
              x={x - halfW}
              y={y - halfH}
              width={width}
              height={height}
              fill={theme.goal}
              fillOpacity={0.15}
              stroke={theme.goal}
              strokeWidth={lineWidth}
              strokeDasharray={isWindows95 ? 'none' : `${strokeScale * 2} ${strokeScale}`}
            />
            {/* Corner markers */}
            {!isWindows95 && (
              <>
                <line x1={x - halfW} y1={y - halfH} x2={x - halfW + strokeScale * 2} y2={y - halfH} stroke={theme.goal} strokeWidth={lineWidth * 1.5} />
                <line x1={x - halfW} y1={y - halfH} x2={x - halfW} y2={y - halfH + strokeScale * 2} stroke={theme.goal} strokeWidth={lineWidth * 1.5} />
                <line x1={x + halfW} y1={y - halfH} x2={x + halfW - strokeScale * 2} y2={y - halfH} stroke={theme.goal} strokeWidth={lineWidth * 1.5} />
                <line x1={x + halfW} y1={y - halfH} x2={x + halfW} y2={y - halfH + strokeScale * 2} stroke={theme.goal} strokeWidth={lineWidth * 1.5} />
                <line x1={x - halfW} y1={y + halfH} x2={x - halfW + strokeScale * 2} y2={y + halfH} stroke={theme.goal} strokeWidth={lineWidth * 1.5} />
                <line x1={x - halfW} y1={y + halfH} x2={x - halfW} y2={y + halfH - strokeScale * 2} stroke={theme.goal} strokeWidth={lineWidth * 1.5} />
                <line x1={x + halfW} y1={y + halfH} x2={x + halfW - strokeScale * 2} y2={y + halfH} stroke={theme.goal} strokeWidth={lineWidth * 1.5} />
                <line x1={x + halfW} y1={y + halfH} x2={x + halfW} y2={y + halfH - strokeScale * 2} stroke={theme.goal} strokeWidth={lineWidth * 1.5} />
              </>
            )}
          </>
        );
      }
      case 'diamond': {
        const halfW = width / 2;
        const halfH = height / 2;
        return (
          <>
            {/* Diamond outline */}
            <polygon
              points={`${x},${y - halfH} ${x + halfW},${y} ${x},${y + halfH} ${x - halfW},${y}`}
              fill={theme.goal}
              fillOpacity={0.15}
              stroke={theme.goal}
              strokeWidth={lineWidth}
              strokeLinejoin="round"
            />
            {/* Extending lines */}
            {!isWindows95 && (
              <>
                <line x1={x} y1={y - halfH - strokeScale * 1.5} x2={x} y2={y - halfH} stroke={theme.goal} strokeWidth={lineWidth} />
                <line x1={x} y1={y + halfH} x2={x} y2={y + halfH + strokeScale * 1.5} stroke={theme.goal} strokeWidth={lineWidth} />
                <line x1={x - halfW - strokeScale * 1.5} y1={y} x2={x - halfW} y2={y} stroke={theme.goal} strokeWidth={lineWidth} />
                <line x1={x + halfW} y1={y} x2={x + halfW + strokeScale * 1.5} y2={y} stroke={theme.goal} strokeWidth={lineWidth} />
              </>
            )}
          </>
        );
      }
      default: // circle
        return (
          <>
            {/* Circle area */}
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill={theme.goal}
              fillOpacity={0.15}
              stroke={theme.goal}
              strokeWidth={lineWidth}
              strokeDasharray={isWindows95 ? 'none' : `${strokeScale * 2} ${strokeScale}`}
            />
          </>
        );
    }
  };
  
  // Render crosshair overlay (for all shapes)
  const renderCrosshair = () => {
    const s = shape === 'circle' ? radius * 0.4 : Math.min(width, height) * 0.25;
    
    if (isWindows95) {
      return (
        <>
          <line x1={x - s} y1={y - s} x2={x + s} y2={y + s} stroke={theme.goalDark} strokeWidth={lineWidth * 1.5} />
          <line x1={x + s} y1={y - s} x2={x - s} y2={y + s} stroke={theme.goalDark} strokeWidth={lineWidth * 1.5} />
        </>
      );
    }
    
    return (
      <>
        {/* Crosshair lines */}
        <line x1={x} y1={y - s * 1.2} x2={x} y2={y - s * 0.3} stroke={theme.goal} strokeWidth={lineWidth} strokeLinecap="round" />
        <line x1={x} y1={y + s * 0.3} x2={x} y2={y + s * 1.2} stroke={theme.goal} strokeWidth={lineWidth} strokeLinecap="round" />
        <line x1={x - s * 1.2} y1={y} x2={x - s * 0.3} y2={y} stroke={theme.goal} strokeWidth={lineWidth} strokeLinecap="round" />
        <line x1={x + s * 0.3} y1={y} x2={x + s * 1.2} y2={y} stroke={theme.goal} strokeWidth={lineWidth} strokeLinecap="round" />
        {/* Center dot */}
        <circle cx={x} cy={y} r={s * 0.1} fill={theme.goal} />
      </>
    );
  };
  
  return (
    <g style={{ pointerEvents: 'none' }}>
      {renderShape()}
      {renderCrosshair()}
    </g>
  );
};

// Agent Marker Component - Sharp arrow/triangle design
interface AgentMarkerProps {
  x: number;
  y: number;
  radius: number;
  direction: { dx: number; dy: number } | null;
  strokeScale: number;
  theme: ThemeColors;
  toolbarStyle: ToolbarStyle;
}

const AgentMarker: React.FC<AgentMarkerProps> = ({ x, y, radius, direction, strokeScale, theme, toolbarStyle }) => {
  const isWindows95 = toolbarStyle === 'windows95';
  const isCyber = toolbarStyle === 'cyber';
  const isFunk = toolbarStyle === 'funk';
  
  const s = radius * 0.5; // Size factor - smaller, sharper
  const lineWidth = strokeScale * 1.2;
  
  // Calculate rotation angle from direction
  const angle = direction 
    ? Math.atan2(direction.dy, direction.dx) * (180 / Math.PI) + 90
    : 0;
  
  if (isWindows95) {
    // Windows 95: Simple arrow
    return (
      <g style={{ pointerEvents: 'none' }} transform={`rotate(${angle} ${x} ${y})`}>
        <polygon
          points={`${x},${y - s} ${x - s * 0.6},${y + s * 0.6} ${x + s * 0.6},${y + s * 0.6}`}
          fill={theme.agent}
          stroke="#000000"
          strokeWidth={lineWidth * 0.8}
        />
      </g>
    );
  }
  
  if (isCyber) {
    // Cyber: Chevron/arrow with tail
    return (
      <g style={{ pointerEvents: 'none' }} transform={`rotate(${angle} ${x} ${y})`}>
        {/* Arrow head */}
        <polygon
          points={`${x},${y - s * 1.1} ${x - s * 0.5},${y - s * 0.2} ${x},${y + s * 0.1} ${x + s * 0.5},${y - s * 0.2}`}
          fill={theme.agent}
          stroke={theme.agentStroke}
          strokeWidth={lineWidth * 0.6}
          strokeLinejoin="round"
        />
        {/* Tail line */}
        <line
          x1={x}
          y1={y + s * 0.2}
          x2={x}
          y2={y + s * 0.8}
          stroke={theme.agentStroke}
          strokeWidth={lineWidth}
          strokeLinecap="round"
        />
      </g>
    );
  }
  
  if (isFunk) {
    // Funk: Bold triangle with accent
    return (
      <g style={{ pointerEvents: 'none' }} transform={`rotate(${angle} ${x} ${y})`}>
        <polygon
          points={`${x},${y - s * 1.1} ${x - s * 0.7},${y + s * 0.7} ${x + s * 0.7},${y + s * 0.7}`}
          fill={theme.agent}
          stroke={theme.agentStroke}
          strokeWidth={lineWidth * 1.5}
          strokeLinejoin="round"
        />
        {/* Accent dot */}
        <circle cx={x} cy={y - s * 0.2} r={s * 0.15} fill={theme.agentStroke} />
      </g>
    );
  }
  
  // Modern: Clean triangle arrow
  return (
    <g style={{ pointerEvents: 'none' }} transform={`rotate(${angle} ${x} ${y})`}>
      {/* Subtle trail */}
      <line
        x1={x}
        y1={y + s * 0.5}
        x2={x}
        y2={y + s * 1.2}
        stroke={theme.agent}
        strokeWidth={lineWidth * 0.6}
        strokeOpacity={0.4}
        strokeLinecap="round"
      />
      {/* Arrow body */}
      <polygon
        points={`${x},${y - s * 1.1} ${x - s * 0.55},${y + s * 0.5} ${x},${y + s * 0.2} ${x + s * 0.55},${y + s * 0.5}`}
        fill={theme.agent}
        stroke={theme.agentStroke}
        strokeWidth={lineWidth * 0.5}
        strokeLinejoin="round"
      />
    </g>
  );
};

// Collision Flash Component - Minimal burst
interface CollisionFlashProps {
  x: number;
  y: number;
  time: number;
  strokeScale: number;
  theme: ThemeColors;
}

const CollisionFlash: React.FC<CollisionFlashProps> = ({ x, y, time, strokeScale, theme }) => {
  const elapsed = Date.now() - time;
  const alpha = Math.max(0, 1 - elapsed / 200);
  const s = strokeScale * 4;
  
  // Small X burst
  return (
    <g style={{ pointerEvents: 'none' }} opacity={alpha}>
      <line x1={x - s} y1={y - s} x2={x + s} y2={y + s} stroke={theme.collision} strokeWidth={strokeScale * 1.5} strokeLinecap="round" />
      <line x1={x + s} y1={y - s} x2={x - s} y2={y + s} stroke={theme.collision} strokeWidth={strokeScale * 1.5} strokeLinecap="round" />
    </g>
  );
};

// HUD Overlay Component
interface HudOverlayProps {
  state: SimulationState;
  config: SimulationConfig;
  viewBox: ViewBox;
  theme: ThemeColors;
  toolbarStyle: ToolbarStyle;
}

const HudOverlay: React.FC<HudOverlayProps> = ({ state, config, viewBox, theme, toolbarStyle }) => {
  const isWindows95 = toolbarStyle === 'windows95';
  const isFunk = toolbarStyle === 'funk';
  const isCyber = toolbarStyle === 'cyber';
  
  const fontSize = viewBox.width * 0.02;
  const padding = viewBox.width * 0.01;
  const x = viewBox.x + padding;
  const y = viewBox.y + viewBox.height - padding;
  const hudWidth = viewBox.width * 0.4;
  const hudHeight = fontSize * 2.2;
  
  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Background */}
      <rect
        x={x}
        y={y - hudHeight}
        width={hudWidth}
        height={hudHeight}
        rx={isWindows95 ? 0 : isFunk ? 0 : fontSize * 0.3}
        fill={theme.hudBg}
        stroke={isWindows95 ? '#808080' : isFunk ? '#1e1e1e' : 'none'}
        strokeWidth={isWindows95 || isFunk ? fontSize * 0.1 : 0}
      />
      {/* Win95 3D effect */}
      {isWindows95 && (
        <>
          <line x1={x} y1={y - hudHeight} x2={x + hudWidth} y2={y - hudHeight} stroke="#ffffff" strokeWidth={fontSize * 0.05} />
          <line x1={x} y1={y - hudHeight} x2={x} y2={y} stroke="#ffffff" strokeWidth={fontSize * 0.05} />
          <line x1={x + hudWidth} y1={y - hudHeight} x2={x + hudWidth} y2={y} stroke="#404040" strokeWidth={fontSize * 0.05} />
          <line x1={x} y1={y} x2={x + hudWidth} y2={y} stroke="#404040" strokeWidth={fontSize * 0.05} />
        </>
      )}
      {/* Stats text */}
      <text
        x={x + padding * 2}
        y={y - hudHeight / 2 + fontSize * 0.35}
        fill={theme.hudText}
        fontSize={fontSize}
        fontFamily={theme.fontFamily}
        fontWeight={isWindows95 ? 'bold' : isCyber ? '500' : 'normal'}
      >
        <tspan fill={theme.hudAccent}>Steps:</tspan>
        <tspan fill={theme.hudText}> {state.stats.stepCount}</tspan>
        <tspan dx={fontSize * 0.8}></tspan>
        <tspan fill={theme.hudHit}>{isWindows95 ? 'X:' : 'Hits:'}</tspan>
        <tspan fill={theme.hudText}> {state.stats.collisionCount}</tspan>
        {config.showGoal && (
          <>
            <tspan dx={fontSize * 0.8}></tspan>
            <tspan fill={theme.hudGoal}>{isWindows95 ? 'G:' : '🎯'}</tspan>
            <tspan fill={theme.hudText}> {state.stats.goalsReached}</tspan>
          </>
        )}
      </text>
    </g>
  );
};
