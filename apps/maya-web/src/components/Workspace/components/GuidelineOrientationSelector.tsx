import React from 'react';
import type { GuidelineOrientation } from '../types';

interface GuidelineOrientationSelectorProps {
  visible: boolean;
  orientation: GuidelineOrientation;
  onChange: (orientation: GuidelineOrientation) => void;
}

export const GuidelineOrientationSelector: React.FC<GuidelineOrientationSelectorProps> = ({
  visible,
  orientation,
  onChange,
}) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '8px 12px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
      }}
    >
      {/* Horizontal */}
      <button
        onClick={() => onChange('horizontal')}
        style={{
          width: '40px',
          height: '40px',
          border: orientation === 'horizontal' ? '2px solid #4A90E2' : '2px solid transparent',
          background: orientation === 'horizontal' ? '#E3F2FD' : '#F5F5F5',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        title="Horizontal Guideline (H)"
        onMouseEnter={(e) => {
          if (orientation !== 'horizontal') {
            e.currentTarget.style.background = '#EEEEEE';
          }
        }}
        onMouseLeave={(e) => {
          if (orientation !== 'horizontal') {
            e.currentTarget.style.background = '#F5F5F5';
          }
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <line
            x1="4"
            y1="12"
            x2="20"
            y2="12"
            stroke={orientation === 'horizontal' ? '#4A90E2' : '#666'}
            strokeWidth="2"
            strokeDasharray="2 2"
          />
        </svg>
      </button>

      {/* Vertical */}
      <button
        onClick={() => onChange('vertical')}
        style={{
          width: '40px',
          height: '40px',
          border: orientation === 'vertical' ? '2px solid #4A90E2' : '2px solid transparent',
          background: orientation === 'vertical' ? '#E3F2FD' : '#F5F5F5',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        title="Vertical Guideline (V)"
        onMouseEnter={(e) => {
          if (orientation !== 'vertical') {
            e.currentTarget.style.background = '#EEEEEE';
          }
        }}
        onMouseLeave={(e) => {
          if (orientation !== 'vertical') {
            e.currentTarget.style.background = '#F5F5F5';
          }
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <line
            x1="12"
            y1="4"
            x2="12"
            y2="20"
            stroke={orientation === 'vertical' ? '#4A90E2' : '#666'}
            strokeWidth="2"
            strokeDasharray="2 2"
          />
        </svg>
      </button>

      {/* Freeform */}
      <button
        onClick={() => onChange('freeform')}
        style={{
          width: '40px',
          height: '40px',
          border: orientation === 'freeform' ? '2px solid #4A90E2' : '2px solid transparent',
          background: orientation === 'freeform' ? '#E3F2FD' : '#F5F5F5',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        title="Freeform Guideline (F)"
        onMouseEnter={(e) => {
          if (orientation !== 'freeform') {
            e.currentTarget.style.background = '#EEEEEE';
          }
        }}
        onMouseLeave={(e) => {
          if (orientation !== 'freeform') {
            e.currentTarget.style.background = '#F5F5F5';
          }
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <line
            x1="6"
            y1="18"
            x2="18"
            y2="6"
            stroke={orientation === 'freeform' ? '#4A90E2' : '#666'}
            strokeWidth="2"
            strokeDasharray="2 2"
          />
        </svg>
      </button>
    </div>
  );
};

