/**
 * SunlightPanel Component - Clean Theme
 * 
 * Compact control panel for the sunlight simulation.
 * Allows users to set location, date, time, and visualization options.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { SunlightState } from './hooks/useSunlight';
import type { SunlightConfig, GeoLocation } from './utils/sunlightTypes';
import { PRESET_LOCATIONS } from './utils/sunlightTypes';
import type { ToolbarStyle } from '../Workspace/types';

interface SunlightPanelProps {
  state: SunlightState;
  config: SunlightConfig;
  onConfigChange: (updates: Partial<SunlightConfig>) => void;
  onLocationChange: (location: GeoLocation) => void;
  onTimeChange: (minutes: number) => void;
  getTimeOfDay: () => number;
  onSetNow: () => void;
  onSetSunrise: () => void;
  onSetNoon: () => void;
  onSetSunset: () => void;
  onToggleAnimation: () => void;
  onClose: () => void;
  toolbarStyle?: ToolbarStyle;
}

// Collapsible Section State
type SectionKey = 'location' | 'time' | 'animation' | 'visualization' | 'info';

export const SunlightPanel: React.FC<SunlightPanelProps> = ({
  state,
  config,
  onConfigChange,
  onLocationChange,
  onTimeChange,
  getTimeOfDay,
  onSetNow,
  onSetSunrise,
  onSetNoon,
  onSetSunset,
  onToggleAnimation,
  onClose,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(['animation']));
  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize position
  useEffect(() => {
    if (isInitialized) return;
    const viewportWidth = window.innerWidth;
    setPosition({
      x: viewportWidth - 220,
      y: 60,
    });
    setIsInitialized(true);
  }, [isInitialized]);

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!panelRef.current) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - panelRef.current.offsetLeft,
      y: e.clientY - panelRef.current.offsetTop,
    });
  };

  const toggleSection = (key: SectionKey) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const currentMinutes = getTimeOfDay();
  
  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: 200,
        background: '#ffffff',
        border: '1px solid #000000',
        borderRadius: 4,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '10px',
        color: '#000000',
        zIndex: 1100,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Header with subtle yellow sunshine */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: '8px 10px',
          background: state.sunPosition.isAboveHorizon 
            ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #2d2d20 100%)' 
            : '#000000',
          color: '#ffffff',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          borderRadius: '3px 3px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle yellow glow when sun is up */}
        {state.sunPosition.isAboveHorizon && (
          <div style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 60,
            height: 60,
            background: 'radial-gradient(circle, rgba(255,243,128,0.2) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', zIndex: 1 }}>
          <span style={{ opacity: 0.5, letterSpacing: '-2px' }}>⋮⋮</span>
          {/* Sun icon - subtle yellow */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ opacity: state.sunPosition.isAboveHorizon ? 1 : 0.5 }}>
            <circle cx="12" cy="12" r="5" fill={state.sunPosition.isAboveHorizon ? '#FFF380' : '#888'} />
            {state.sunPosition.isAboveHorizon && (
              <>
                <line x1="12" y1="1" x2="12" y2="4" stroke="#FFF380" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="20" x2="12" y2="23" stroke="#FFF380" strokeWidth="2" strokeLinecap="round" />
                <line x1="1" y1="12" x2="4" y2="12" stroke="#FFF380" strokeWidth="2" strokeLinecap="round" />
                <line x1="20" y1="12" x2="23" y2="12" stroke="#FFF380" strokeWidth="2" strokeLinecap="round" />
                <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="#FFF380" strokeWidth="2" strokeLinecap="round" />
                <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="#FFF380" strokeWidth="2" strokeLinecap="round" />
                <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="#FFF380" strokeWidth="2" strokeLinecap="round" />
                <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="#FFF380" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </svg>
          SUNLIGHT
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '2px 4px',
            fontSize: '12px',
            opacity: 0.7,
            zIndex: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Sun Status Bar with subtle yellow glow */}
      <div
        style={{
          padding: '8px 10px',
          background: state.sunPosition.isAboveHorizon 
            ? 'linear-gradient(90deg, rgba(255,248,200,0.3) 0%, #f5f5f5 100%)'
            : '#f5f5f5',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: state.sunPosition.isAboveHorizon 
            ? 'radial-gradient(circle, #FFFDE7 30%, #FFF59D 100%)' 
            : '#e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: state.sunPosition.isAboveHorizon ? '#8B8000' : '#666666',
          boxShadow: state.sunPosition.isAboveHorizon 
            ? '0 0 10px rgba(255,245,157,0.6)' 
            : 'none',
          transition: 'all 0.3s ease',
        }}>
          {state.sunPosition.isAboveHorizon ? '☀' : '☾'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '11px', color: '#000000' }}>
            {config.dateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </div>
          <div style={{ color: state.sunPosition.isAboveHorizon ? '#9E9D24' : '#6c6c6c', fontSize: '9px' }}>
            {state.sunPosition.isAboveHorizon ? `Alt: ${Math.round(state.sunPosition.altitude)}°` : 'Below horizon'}
          </div>
        </div>
      </div>

      {/* Content - Auto height */}
      <div
        style={{
          overflowX: 'hidden',
        }}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Location Section */}
        <CollapsibleSection
          title="LOCATION"
          isOpen={expandedSections.has('location')}
          onToggle={() => toggleSection('location')}
        >
        <select
          value={config.location.name ?? ''}
          onChange={(e) => {
            const loc = PRESET_LOCATIONS.find(l => l.name === e.target.value);
            if (loc) onLocationChange(loc);
          }}
            style={styles.select}
        >
          {PRESET_LOCATIONS.map(loc => (
            <option key={loc.name} value={loc.name}>{loc.name}</option>
          ))}
        </select>
          <div style={{ fontSize: '9px', color: '#6c6c6c', marginTop: 4 }}>
            {config.location.latitude.toFixed(2)}°N, {config.location.longitude.toFixed(2)}°E
        </div>
        </CollapsibleSection>

        {/* Time Section */}
        <CollapsibleSection
          title="TIME"
          isOpen={expandedSections.has('time')}
          onToggle={() => toggleSection('time')}
        >
        <input
          type="date"
          value={config.dateTime.toISOString().split('T')[0]}
          onChange={(e) => {
            const newDate = new Date(e.target.value);
            onConfigChange({ 
              dateTime: new Date(
                newDate.getFullYear(),
                newDate.getMonth(),
                newDate.getDate(),
                config.dateTime.getHours(),
                config.dateTime.getMinutes()
              )
            });
          }}
            style={styles.input}
          />
          <input
            type="range"
            min={0}
            max={1440}
            value={currentMinutes}
            onChange={(e) => onTimeChange(parseInt(e.target.value))}
            disabled={config.animating}
            style={{ width: '100%', marginTop: 8 }}
          />
          <div style={styles.quickButtons}>
            <button onClick={onSetSunrise} style={{ ...styles.quickBtn, background: 'linear-gradient(180deg, #fff 0%, #FFFDE7 100%)' }}>↑ Rise</button>
            <button onClick={onSetNoon} style={{ ...styles.quickBtn, background: 'linear-gradient(180deg, #FFF9C4 0%, #FFF59D 100%)', color: '#7C7B00', fontWeight: 600 }}>☀ Noon</button>
            <button onClick={onSetSunset} style={{ ...styles.quickBtn, background: 'linear-gradient(180deg, #FFFDE7 0%, #fff 100%)' }}>↓ Set</button>
            <button onClick={onSetNow} style={styles.quickBtn}>● Now</button>
          </div>
        </CollapsibleSection>

        {/* Simulate Section */}
        <CollapsibleSection
          title="SIMULATE"
          isOpen={expandedSections.has('animation')}
          onToggle={() => toggleSection('animation')}
        >
          {/* Time Display with sun arc indicator */}
          <div style={{ 
            textAlign: 'center', 
            padding: '10px 8px 8px', 
            marginBottom: 8,
            background: state.sunPosition.isAboveHorizon 
              ? 'linear-gradient(180deg, rgba(255,249,196,0.3) 0%, #f5f5f5 100%)'
              : '#f5f5f5',
            borderRadius: 3,
            border: '1px solid #e0e0e0',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Mini sun arc - subtle yellow */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: 4,
              background: 'linear-gradient(90deg, #e0e0e0 0%, #FFF59D 50%, #e0e0e0 100%)',
              borderRadius: '0 0 50% 50%',
              opacity: state.sunPosition.isAboveHorizon ? 1 : 0.3,
            }}>
              {/* Sun position indicator - subtle yellow */}
              <div style={{
                position: 'absolute',
                top: -2,
                left: `${(currentMinutes / 1440) * 100}%`,
                width: 8,
                height: 8,
                background: state.sunPosition.isAboveHorizon ? '#FFF59D' : '#888',
                borderRadius: '50%',
                transform: 'translateX(-50%)',
                boxShadow: state.sunPosition.isAboveHorizon ? '0 0 6px rgba(255,245,157,0.8)' : 'none',
              }} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#000000', marginTop: 4 }}>
              {config.dateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
            <div style={{ fontSize: '9px', color: '#6c6c6c', marginTop: 2 }}>
              {config.dateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>

          {/* Time Slider */}
          <input
            type="range"
            min={0}
            max={1440}
            value={currentMinutes}
            onChange={(e) => onTimeChange(parseInt(e.target.value))}
            disabled={config.animating}
            style={{ width: '100%', marginBottom: 4 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#6c6c6c', marginBottom: 8 }}>
            <span>12AM</span>
            <span>12PM</span>
            <span>12AM</span>
        </div>

          {/* Quick Time Buttons with subtle yellow styling */}
          <div style={styles.quickButtons}>
            <button onClick={onSetSunrise} style={{ ...styles.quickBtn, background: 'linear-gradient(180deg, #fff 0%, #FFFDE7 100%)' }}>↑ Rise</button>
            <button onClick={onSetNoon} style={{ ...styles.quickBtn, background: 'linear-gradient(180deg, #FFF9C4 0%, #FFF59D 100%)', color: '#7C7B00', fontWeight: 600 }}>☀ Noon</button>
            <button onClick={onSetSunset} style={{ ...styles.quickBtn, background: 'linear-gradient(180deg, #FFFDE7 0%, #fff 100%)' }}>↓ Set</button>
            <button onClick={onSetNow} style={styles.quickBtn}>● Now</button>
        </div>

          {/* Play/Stop Button with subtle yellow accent */}
        <button
          onClick={onToggleAnimation}
          style={{
              ...styles.button,
              background: config.animating 
                ? 'linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)' 
                : '#ffffff',
              color: config.animating ? '#7C7B00' : '#000000',
              borderColor: config.animating ? '#FFEE58' : '#000000',
              marginTop: 10,
              marginBottom: 0,
              boxShadow: config.animating ? '0 2px 8px rgba(255,245,157,0.5)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {config.animating ? '■ STOP SIMULATION' : '☀ SIMULATE DAY'}
        </button>

          {/* Speed Control */}
          <div style={{ ...styles.row, marginTop: 10 }}>
            <span>Speed</span>
          <input
            type="range"
            min={10}
            max={180}
            value={config.animationSpeed}
            onChange={(e) => onConfigChange({ animationSpeed: parseInt(e.target.value) })}
            style={{ flex: 1 }}
          />
            <span style={{ minWidth: 40, textAlign: 'right' }}>{config.animationSpeed}m/s</span>
        </div>
        </CollapsibleSection>

        {/* Visualization Section */}
        <CollapsibleSection
          title="DISPLAY"
          isOpen={expandedSections.has('visualization')}
          onToggle={() => toggleSection('visualization')}
        >
          <label style={styles.checkbox}>
          <input
              type="checkbox"
            checked={config.showLightPatches}
              onChange={(e) => onConfigChange({ showLightPatches: e.target.checked })}
            />
            <span>Light Patches</span>
          </label>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
            checked={config.showSunDirection}
              onChange={(e) => onConfigChange({ showSunDirection: e.target.checked })}
            />
            <span>Sun Direction</span>
          </label>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
            checked={config.enableWallOcclusion}
              onChange={(e) => onConfigChange({ enableWallOcclusion: e.target.checked })}
            />
            <span>Wall Occlusion</span>
          </label>
          <div style={styles.row}>
            <span>Opacity</span>
            <input
              type="range"
              min={10}
              max={80}
              value={config.patchOpacity * 100}
              onChange={(e) => onConfigChange({ patchOpacity: parseInt(e.target.value) / 100 })}
              style={{ width: 60 }}
            />
            <span style={{ minWidth: 30, textAlign: 'right' }}>{Math.round(config.patchOpacity * 100)}%</span>
          </div>
          <div style={styles.row}>
            <span>Orientation</span>
            <input
              type="range"
              min={0}
              max={360}
              value={config.buildingOrientation}
              onChange={(e) => onConfigChange({ buildingOrientation: parseInt(e.target.value) })}
              style={{ width: 60 }}
            />
            <span style={{ minWidth: 30, textAlign: 'right' }}>{config.buildingOrientation}°</span>
        </div>
        </CollapsibleSection>

        {/* Info Section */}
        <CollapsibleSection
          title="INFO"
          isOpen={expandedSections.has('info')}
          onToggle={() => toggleSection('info')}
        >
          <div style={{ fontSize: '9px', lineHeight: 1.6, color: '#6c6c6c' }}>
            <div>Walls: <strong style={{ color: '#000' }}>{state.walls.length}</strong></div>
            <div>Openings: <strong style={{ color: '#000' }}>{state.walls.reduce((sum, w) => sum + w.openings.length, 0)}</strong></div>
            <div>Patches: <strong style={{ color: '#000' }}>{state.lightPatches.length}</strong></div>
          {state.walls.length === 0 && (
              <div style={{ color: '#dc2626', marginTop: 4 }}>⚠ No walls detected</div>
          )}
        </div>
        </CollapsibleSection>
      </div>

      {/* Decorative sun bottom bar - subtle yellow */}
      <div style={{
        height: 3,
        background: state.sunPosition.isAboveHorizon 
          ? 'linear-gradient(90deg, transparent 0%, #FFF59D 30%, #FFEE58 50%, #FFF59D 70%, transparent 100%)'
          : 'linear-gradient(90deg, transparent 0%, #c0c0c0 50%, transparent 100%)',
        borderRadius: '0 0 3px 3px',
        opacity: state.sunPosition.isAboveHorizon ? 0.8 : 0.4,
        transition: 'all 0.3s ease',
      }} />
    </div>
  );
};

// Collapsible Section Component
const CollapsibleSection: React.FC<{
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, isOpen, onToggle, children }) => (
  <div style={{ borderBottom: '1px solid #e0e0e0' }}>
    <button
      onClick={onToggle}
    style={{
        width: '100%',
        padding: '8px 10px',
        background: 'transparent',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        fontSize: '9px',
        fontWeight: 600,
        color: '#6c6c6c',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <span>{title}</span>
      <span style={{ fontSize: '10px', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
    </button>
    {isOpen && (
      <div style={{ padding: '0 10px 10px' }}>
    {children}
      </div>
    )}
  </div>
);

// Styles
const styles: Record<string, React.CSSProperties> = {
  select: {
    width: '100%',
    padding: '6px 8px',
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: 3,
    color: '#000000',
    fontSize: '10px',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  input: {
    width: '100%',
    padding: '6px 8px',
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: 3,
    color: '#000000',
    fontSize: '10px',
    fontFamily: "'IBM Plex Mono', monospace",
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '8px',
    border: '1px solid #000000',
    borderRadius: 3,
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 8,
  },
  quickButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gap: 4,
    marginTop: 8,
  },
  quickBtn: {
      padding: '4px 2px',
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: 2,
      cursor: 'pointer',
    fontSize: '8px',
    fontFamily: "'IBM Plex Mono', monospace",
    color: '#000000',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    fontSize: '9px',
    color: '#6c6c6c',
  },
  checkbox: {
    display: 'flex', 
    alignItems: 'center', 
    gap: 8,
    cursor: 'pointer',
    fontSize: '10px',
    marginBottom: 6,
  },
};
