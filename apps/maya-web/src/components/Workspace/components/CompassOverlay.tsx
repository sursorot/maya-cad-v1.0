/**
 * CompassOverlay - HTML overlay compass indicator
 * Shows N/S/E/W directions positioned in the bottom-right corner
 */

import React from 'react';

interface CompassOverlayProps {
  toolbarStyle: string;
  hasPanelOpen: boolean;
  buildingOrientation: number;
}

export const CompassOverlay: React.FC<CompassOverlayProps> = ({
  toolbarStyle,
  hasPanelOpen,
  buildingOrientation,
}) => {
  const isWindows95 = toolbarStyle === 'windows95';
  const isCyber = toolbarStyle === 'cyber';
  const isFunk = toolbarStyle === 'funk';
  const panelOffset = isWindows95 ? 276 : 304;

  const colors = {
    bg: isWindows95
      ? 'rgba(192, 192, 192, 0.95)'
      : isCyber
        ? 'rgba(10, 37, 64, 0.9)'
        : isFunk
          ? 'rgba(255, 255, 255, 0.95)'
          : 'rgba(255, 255, 255, 0.92)',
    border: isWindows95
      ? '#808080'
      : isCyber
        ? '#4da6ff'
        : isFunk
          ? '#1e1e1e'
          : '#d0d0d0',
    north: '#E53935',
    text: isWindows95
      ? '#000000'
      : isCyber
        ? '#e8f4ff'
        : isFunk
          ? '#1e1e1e'
          : '#444444',
    subtle: isWindows95
      ? '#666666'
      : isCyber
        ? '#5a7a94'
        : isFunk
          ? '#888888'
          : '#999999',
  };

  const rotation = -buildingOrientation;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: hasPanelOpen ? panelOffset : 16,
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: isCyber
          ? `0 0 8px ${colors.border}40`
          : '0 2px 8px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        transition: 'right 0.2s ease',
        pointerEvents: 'none',
      }}
    >
      <svg width="36" height="36" viewBox="0 0 36 36">
        <g transform={`rotate(${rotation} 18 18)`}>
          <polygon points="18,4 21,14 18,11 15,14" fill={colors.north} />
          <line
            x1="18"
            y1="22"
            x2="18"
            y2="28"
            stroke={colors.subtle}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="22"
            y1="18"
            x2="28"
            y2="18"
            stroke={colors.subtle}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="8"
            y1="18"
            x2="14"
            y2="18"
            stroke={colors.subtle}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <text
            x="18"
            y="9"
            fill={colors.north}
            fontSize="7"
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily={
              isCyber
                ? "'JetBrains Mono', monospace"
                : '-apple-system, system-ui, sans-serif'
            }
          >
            N
          </text>
        </g>
        <circle cx="18" cy="18" r="2" fill={colors.text} />
      </svg>
    </div>
  );
};

