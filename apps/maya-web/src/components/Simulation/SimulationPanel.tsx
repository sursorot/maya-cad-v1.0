/**
 * SimulationPanel Component
 * 
 * Sidebar panel with controls for the navigation simulation.
 * Styled to match the app's existing design patterns.
 */

import React from 'react';
import type { SimulationState } from './hooks/useSimulation';
import type { SimulationConfig, AgentBehavior, GoalShape } from './utils/navigationTypes';
import type { ToolbarStyle } from '../Workspace/types';

interface SimulationPanelProps {
  state: SimulationState;
  config: SimulationConfig;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onToggle: () => void;
  onReset: () => void;
  onNewGoal: () => void;
  onClearPath: () => void;
  onConfigChange: (updates: Partial<SimulationConfig>) => void;
  onClose: () => void;
  toolbarStyle?: ToolbarStyle;
}

// Style variants
const getStyles = (toolbarStyle: ToolbarStyle = 'modern') => {
  const isWindows95 = toolbarStyle === 'windows95';
  const isFunk = toolbarStyle === 'funk';
  const isCyber = toolbarStyle === 'cyber';
  const isClean = toolbarStyle === 'clean';

  // Base colors by style
  const colors = isClean ? {
    bg: '#ffffff',
    bgAlt: '#f5f5f5',
    text: '#000000',
    textMuted: '#6c6c6c',
    accent: '#000000',
    accentText: '#ffffff',
    border: '#000000',
    borderLight: '#e0e0e0',
    inputBg: '#ffffff',
  } : isWindows95 ? {
    bg: '#c0c0c0',
    bgAlt: '#d4d4d4',
    text: '#000000',
    textMuted: '#404040',
    accent: '#000080',
    accentText: '#ffffff',
    border: '#808080',
    borderLight: '#ffffff',
    inputBg: '#ffffff',
  } : isFunk ? {
    bg: '#ffffff',
    bgAlt: '#f5f5f5',
    text: '#1e1e1e',
    textMuted: '#666666',
    accent: '#ff69b4',
    accentText: '#ffffff',
    border: '#1e1e1e',
    borderLight: '#e0e0e0',
    inputBg: '#ffffff',
  } : isCyber ? {
    bg: '#0a2540',
    bgAlt: '#0d2f4d',
    text: '#e8f4ff',
    textMuted: '#8ab4d6',
    accent: '#4da6ff',
    accentText: '#0a2540',
    border: '#2d7acc',
    borderLight: '#1a4a6e',
    inputBg: '#0d2f4d',
  } : {
    // Modern (default)
    bg: 'rgba(255, 255, 255, 0.98)',
    bgAlt: '#f8f8f9',
    text: '#101010',
    textMuted: '#4B4B4B',
    accent: '#6F62A4',
    accentText: '#ffffff',
    border: 'rgba(111, 98, 164, 0.2)',
    borderLight: 'rgba(111, 98, 164, 0.1)',
    inputBg: '#ffffff',
  };

  const fontFamily = isClean
    ? "'IBM Plex Mono', monospace"
    : isWindows95 
    ? "'Tahoma', 'Verdana', 'Arial', sans-serif"
    : isFunk 
    ? "'Inter', sans-serif"
    : isCyber 
    ? "'JetBrains Mono', 'Courier New', monospace"
    : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  return { colors, fontFamily, isWindows95, isFunk, isCyber, isClean };
};

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  state,
  config,
  onStart: _onStart,
  onPause: _onPause,
  onResume: _onResume,
  onStop: _onStop,
  onToggle,
  onReset,
  onNewGoal,
  onClearPath,
  onConfigChange,
  onClose,
  toolbarStyle = 'modern',
}) => {
  // These are available for future fine-grained control
  void _onStart; void _onPause; void _onResume; void _onStop;

  const { colors, fontFamily, isWindows95, isFunk, isCyber } = getStyles(toolbarStyle);
  const isRunning = state.running && !state.paused;
  const isPaused = state.running && state.paused;

  // Win95 style box shadow helpers
  const win95Inset = 'inset -1px -1px #ffffff, inset 1px 1px #808080, inset -2px -2px #d4d4d4, inset 2px 2px #404040';
  const win95Outset = 'inset -1px -1px #404040, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #d4d4d4';

  return (
    <div
      style={{
        position: 'absolute',
        top: isWindows95 ? 8 : 12,
        right: isWindows95 ? 8 : 12,
        bottom: isWindows95 ? 8 : 12,
        width: isWindows95 ? 260 : 280,
        background: colors.bg,
        border: isWindows95 ? 'none' : isFunk ? `2px solid ${colors.border}` : `1px solid ${colors.border}`,
        borderRadius: isWindows95 ? 0 : isFunk ? 0 : 8,
        boxShadow: isWindows95 
          ? win95Outset 
          : isFunk 
          ? `4px 4px 0 ${colors.border}` 
          : isCyber
          ? `0 0 20px ${colors.accent}40`
          : '0 4px 20px rgba(0,0,0,0.1)',
        padding: 0,
        zIndex: 1000,
        fontFamily,
        color: colors.text,
        display: 'flex',
        flexDirection: 'column',
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Header - Fixed */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isWindows95 ? '2px 4px' : '12px 16px',
          borderBottom: `1px solid ${colors.borderLight}`,
          background: isWindows95 ? colors.accent : colors.bg,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: isWindows95 ? '0.75rem' : '1rem' }}>🎮</span>
          <span style={{ 
            fontSize: isWindows95 ? '0.7rem' : '0.9rem', 
            fontWeight: isWindows95 ? 700 : 600,
            color: isWindows95 ? colors.accentText : colors.accent,
          }}>
            Simulation
          </span>
        </div>
        <button
          onClick={onClose}
          title="Exit Simulation"
          style={{
            background: isWindows95 ? colors.bg : 'transparent',
            border: isWindows95 ? 'none' : 'none',
            boxShadow: isWindows95 ? win95Outset : 'none',
            color: isWindows95 ? colors.text : colors.textMuted,
            fontSize: isWindows95 ? '0.65rem' : '0.85rem',
            cursor: 'pointer',
            padding: isWindows95 ? '2px 4px' : 4,
            width: isWindows95 ? 16 : 'auto',
            height: isWindows95 ? 14 : 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      {/* Content area - Scrollable */}
      <div 
        className="panel-scroll-area"
        style={{ 
          padding: isWindows95 ? 8 : 16,
          flex: '1 1 0',
          minHeight: 0,
        }}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Status Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            marginBottom: 16,
            background: isWindows95 ? colors.bgAlt : isCyber ? colors.bgAlt : colors.bgAlt,
            border: isWindows95 ? 'none' : `1px solid ${colors.borderLight}`,
            boxShadow: isWindows95 ? win95Inset : 'none',
            borderRadius: isWindows95 ? 0 : 6,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: !state.isValid 
                ? colors.textMuted 
                : isRunning 
                ? '#4ade80' 
                : isPaused 
                ? '#fbbf24' 
                : colors.textMuted,
              boxShadow: isRunning ? '0 0 8px rgba(74, 222, 128, 0.5)' : 'none',
            }}
          />
          <span style={{ fontSize: '0.75rem', color: colors.textMuted }}>
            {!state.isValid ? 'No floorplan' : isRunning ? 'Running' : isPaused ? 'Paused' : 'Ready'}
          </span>
        </div>

        {/* Stats Grid */}
        <SectionTitle colors={colors} isWindows95={isWindows95} isCyber={isCyber}>Statistics</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <StatCard colors={colors} isWindows95={isWindows95} isCyber={isCyber} value={state.stats.stepCount} label="Steps" />
          <StatCard colors={colors} isWindows95={isWindows95} isCyber={isCyber} value={state.stats.collisionCount} label="Collisions" />
          <StatCard colors={colors} isWindows95={isWindows95} isCyber={isCyber} value={state.stats.distanceTraveled.toFixed(1)} label="Distance (m)" />
          <StatCard colors={colors} isWindows95={isWindows95} isCyber={isCyber} value={state.stats.goalsReached} label="Goals" />
        </div>

        {/* Agent Behavior */}
        <SectionTitle colors={colors} isWindows95={isWindows95} isCyber={isCyber}>Behavior</SectionTitle>
        <select
          value={config.behavior}
          onChange={(e) => onConfigChange({ behavior: e.target.value as AgentBehavior })}
          style={{
            width: '100%',
            padding: isWindows95 ? '2px 4px' : '8px 12px',
            marginBottom: 16,
            background: colors.inputBg,
            border: isWindows95 ? 'none' : `1px solid ${colors.border}`,
            boxShadow: isWindows95 ? win95Inset : 'none',
            borderRadius: isWindows95 ? 0 : 6,
            color: colors.text,
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontFamily,
          }}
        >
          <option value="random">Random Walk</option>
          <option value="goal">Goal-Seeking</option>
          <option value="explore">Wall Following</option>
          <option value="manual">Manual Control</option>
        </select>

        {/* Speed Control */}
        <SectionTitle colors={colors} isWindows95={isWindows95} isCyber={isCyber}>Settings</SectionTitle>
        <SliderControl
          label="Speed"
          value={config.speed}
          min={1}
          max={30}
          onChange={(v) => onConfigChange({ speed: v })}
          colors={colors}
          isWindows95={isWindows95}
          isCyber={isCyber}
        />
        <SliderControl
          label="Step (cm)"
          value={Math.round(config.stepSize * 100)}
          min={5}
          max={50}
          onChange={(v) => onConfigChange({ stepSize: v / 100 })}
          colors={colors}
          isWindows95={isWindows95}
          isCyber={isCyber}
        />

        {/* Goal Shape */}
        <SectionTitle colors={colors} isWindows95={isWindows95} isCyber={isCyber}>Goal Shape</SectionTitle>
        <select
          value={config.goalShape}
          onChange={(e) => onConfigChange({ goalShape: e.target.value as GoalShape })}
          style={{
            width: '100%',
            padding: isWindows95 ? '2px 4px' : '8px 12px',
            marginBottom: 8,
            background: colors.inputBg,
            border: isWindows95 ? 'none' : `1px solid ${colors.border}`,
            boxShadow: isWindows95 ? win95Inset : 'none',
            borderRadius: isWindows95 ? 0 : 6,
            color: colors.text,
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontFamily,
          }}
        >
          <option value="circle">Circle</option>
          <option value="rectangle">Rectangle</option>
          <option value="diamond">Diamond</option>
        </select>
        
        {/* Goal dimensions - show based on shape */}
        {config.goalShape === 'circle' ? (
          <SliderControl
            label="Radius (cm)"
            value={Math.round(config.goalRadius * 100)}
            min={10}
            max={100}
            onChange={(v) => onConfigChange({ goalRadius: v / 100 })}
            colors={colors}
            isWindows95={isWindows95}
            isCyber={isCyber}
          />
        ) : (
          <>
            <SliderControl
              label="Width (cm)"
              value={Math.round(config.goalWidth * 100)}
              min={20}
              max={150}
              onChange={(v) => onConfigChange({ goalWidth: v / 100 })}
              colors={colors}
              isWindows95={isWindows95}
              isCyber={isCyber}
            />
            <SliderControl
              label="Height (cm)"
              value={Math.round(config.goalHeight * 100)}
              min={20}
              max={150}
              onChange={(v) => onConfigChange({ goalHeight: v / 100 })}
              colors={colors}
              isWindows95={isWindows95}
              isCyber={isCyber}
            />
          </>
        )}

        {/* Visualization Toggles */}
        <SectionTitle colors={colors} isWindows95={isWindows95} isCyber={isCyber}>Visualization</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <ToggleControl
            label="Raycasts"
            checked={config.showRaycasts}
            onChange={(v) => onConfigChange({ showRaycasts: v })}
            colors={colors}
            isWindows95={isWindows95}
            isCyber={isCyber}
          />
          <ToggleControl
            label="Ray Distances"
            checked={config.showRayLabels}
            onChange={(v) => onConfigChange({ showRayLabels: v })}
            colors={colors}
            isWindows95={isWindows95}
            isCyber={isCyber}
          />
          <ToggleControl
            label="Path Trail"
            checked={config.showPath}
            onChange={(v) => onConfigChange({ showPath: v })}
            colors={colors}
            isWindows95={isWindows95}
            isCyber={isCyber}
          />
          <ToggleControl
            label="Goal"
            checked={config.showGoal}
            onChange={(v) => onConfigChange({ showGoal: v })}
            colors={colors}
            isWindows95={isWindows95}
            isCyber={isCyber}
          />
        </div>

        {/* Action Buttons */}
        <SectionTitle colors={colors} isWindows95={isWindows95} isCyber={isCyber}>Actions</SectionTitle>
        <ActionButton
          onClick={onToggle}
          disabled={!state.isValid}
          primary
          colors={colors}
          isWindows95={isWindows95}
          isFunk={isFunk}
          isCyber={isCyber}
        >
          {isRunning ? '⏸ Pause' : isPaused ? '▶ Resume' : '▶ Start'}
        </ActionButton>
        <ActionButton
          onClick={onReset}
          disabled={!state.isValid}
          colors={colors}
          isWindows95={isWindows95}
          isFunk={isFunk}
          isCyber={isCyber}
        >
          ↻ Reset
        </ActionButton>
        {config.showGoal && (
          <ActionButton
            onClick={onNewGoal}
            disabled={!state.isValid}
            colors={colors}
            isWindows95={isWindows95}
            isFunk={isFunk}
            isCyber={isCyber}
          >
            🎯 New Goal
          </ActionButton>
        )}
        <ActionButton
          onClick={onClearPath}
          disabled={!state.isValid}
          colors={colors}
          isWindows95={isWindows95}
          isFunk={isFunk}
          isCyber={isCyber}
        >
          Clear Path
        </ActionButton>

        {/* Keyboard Hints */}
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: isWindows95 ? colors.bgAlt : colors.bgAlt,
            border: isWindows95 ? 'none' : `1px solid ${colors.borderLight}`,
            boxShadow: isWindows95 ? win95Inset : 'none',
            borderRadius: isWindows95 ? 0 : 6,
          }}
        >
          <div style={{ fontSize: '0.65rem', color: colors.textMuted, marginBottom: 8, fontWeight: 600 }}>
            KEYBOARD
          </div>
          <KeyHint keys="Space" text="Pause/Resume" colors={colors} isWindows95={isWindows95} />
          <KeyHint keys="R" text="Reset" colors={colors} isWindows95={isWindows95} />
          <KeyHint keys="G" text="New goal" colors={colors} isWindows95={isWindows95} />
          <KeyHint keys="↑↓←→" text="Move" colors={colors} isWindows95={isWindows95} />
        </div>

        {/* Observation Data */}
        {state.raycasts.length > 0 && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              background: isWindows95 ? colors.bgAlt : isCyber ? colors.bgAlt : colors.bgAlt,
              border: isWindows95 ? 'none' : `1px solid ${colors.borderLight}`,
              boxShadow: isWindows95 ? win95Inset : 'none',
              borderRadius: isWindows95 ? 0 : 6,
              fontFamily: isCyber ? "'JetBrains Mono', monospace" : 'monospace',
              fontSize: '0.65rem',
            }}
          >
            <div style={{ color: colors.accent, marginBottom: 6, fontWeight: 600 }}>OBSERVATION</div>
            <ObsRow label="Pos" value={`(${state.agent.x.toFixed(2)}, ${state.agent.y.toFixed(2)})`} colors={colors} />
            {config.showGoal && (
              <ObsRow label="Goal" value={`(${state.goal.x.toFixed(2)}, ${state.goal.y.toFixed(2)})`} colors={colors} />
            )}
            <ObsRow label="Wall" value={`${Math.min(...state.raycasts.map(r => r.distance)).toFixed(2)}m`} colors={colors} />
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components

interface StyleColors {
  bg: string;
  bgAlt: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  border: string;
  borderLight: string;
  inputBg: string;
}

const SectionTitle: React.FC<{ colors: StyleColors; isWindows95: boolean; isCyber: boolean; children: React.ReactNode }> = ({ colors, isWindows95, isCyber, children }) => (
  <div
    style={{
      fontSize: '0.65rem',
      textTransform: 'uppercase',
      letterSpacing: isWindows95 ? 0 : 1,
      color: isCyber ? colors.accent : colors.textMuted,
      marginBottom: 8,
      fontWeight: 600,
    }}
  >
    {children}
  </div>
);

const StatCard: React.FC<{ colors: StyleColors; isWindows95: boolean; isCyber: boolean; value: number | string; label: string }> = ({ colors, isWindows95, isCyber, value, label }) => (
  <div
    style={{
      background: isWindows95 ? colors.bgAlt : colors.bgAlt,
      border: isWindows95 ? 'none' : `1px solid ${colors.borderLight}`,
      boxShadow: isWindows95 ? 'inset -1px -1px #ffffff, inset 1px 1px #808080' : 'none',
      borderRadius: isWindows95 ? 0 : 6,
      padding: '10px 8px',
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: isCyber ? colors.accent : colors.accent }}>{value}</div>
    <div style={{ fontSize: '0.6rem', color: colors.textMuted, textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
  </div>
);

const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  colors: StyleColors;
  isWindows95: boolean;
  isCyber: boolean;
}> = ({ label, value, min, max, onChange, colors, isWindows95, isCyber }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: '0.7rem', color: colors.textMuted }}>{label}</span>
      <span style={{ fontSize: '0.7rem', color: isCyber ? colors.accent : colors.accent, fontWeight: 600 }}>{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      style={{
        width: '100%',
        height: isWindows95 ? 18 : 4,
        accentColor: colors.accent,
      }}
    />
  </div>
);

const ToggleControl: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  colors: StyleColors;
  isWindows95: boolean;
  isCyber: boolean;
}> = ({ label, checked, onChange, colors, isWindows95, isCyber: _isCyber }) => {
  void _isCyber; // Reserved for future cyber-style toggle
  return (
  <div
    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
    onClick={() => onChange(!checked)}
  >
    <div
      style={{
        width: isWindows95 ? 12 : 32,
        height: isWindows95 ? 12 : 18,
        borderRadius: isWindows95 ? 0 : 9,
        background: isWindows95 
          ? colors.inputBg 
          : checked 
          ? colors.accent 
          : colors.bgAlt,
        border: isWindows95 
          ? 'none' 
          : `1px solid ${checked ? colors.accent : colors.border}`,
        boxShadow: isWindows95 ? 'inset -1px -1px #ffffff, inset 1px 1px #808080' : 'none',
        position: 'relative',
        transition: 'background 0.2s',
      }}
    >
      {isWindows95 ? (
        checked && (
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-6" stroke={colors.text} strokeWidth="2" fill="none" />
          </svg>
        )
      ) : (
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 15 : 2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#ffffff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        />
      )}
    </div>
    <span style={{ fontSize: '0.75rem', color: colors.textMuted }}>{label}</span>
  </div>
  );
};

const ActionButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  colors: StyleColors;
  isWindows95: boolean;
  isFunk: boolean;
  isCyber: boolean;
  children: React.ReactNode;
}> = ({ onClick, disabled, primary, colors, isWindows95, isFunk, isCyber, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '100%',
      padding: isWindows95 ? '4px 8px' : '8px 12px',
      marginBottom: 6,
      background: isWindows95 
        ? colors.bg 
        : primary 
        ? colors.accent 
        : isCyber 
        ? colors.bgAlt 
        : colors.bgAlt,
      border: isWindows95 
        ? 'none' 
        : isFunk 
        ? `2px solid ${colors.border}` 
        : `1px solid ${primary ? colors.accent : colors.border}`,
      borderRadius: isWindows95 ? 0 : isFunk ? 0 : 6,
      boxShadow: isWindows95 
        ? 'inset -1px -1px #404040, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #d4d4d4' 
        : isFunk && !disabled
        ? `2px 2px 0 ${colors.border}`
        : 'none',
      color: primary && !isWindows95 ? colors.accentText : colors.text,
      fontSize: '0.75rem',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    {children}
  </button>
);

const KeyHint: React.FC<{ keys: string; text: string; colors: StyleColors; isWindows95: boolean }> = ({ keys, text, colors, isWindows95 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
    <span
      style={{
        display: 'inline-block',
        padding: '2px 6px',
        background: isWindows95 ? colors.inputBg : colors.bgAlt,
        border: isWindows95 ? 'none' : `1px solid ${colors.border}`,
        boxShadow: isWindows95 ? 'inset -1px -1px #404040, inset 1px 1px #ffffff' : 'none',
        borderRadius: isWindows95 ? 0 : 4,
        fontSize: '0.6rem',
        fontWeight: 600,
        color: colors.text,
        minWidth: 32,
        textAlign: 'center',
      }}
    >
      {keys}
    </span>
    <span style={{ fontSize: '0.65rem', color: colors.textMuted }}>{text}</span>
  </div>
);

const ObsRow: React.FC<{ label: string; value: string; colors: StyleColors }> = ({ label, value, colors }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
    <span style={{ color: colors.textMuted }}>{label}:</span>
    <span style={{ color: '#4ade80' }}>{value}</span>
  </div>
);
