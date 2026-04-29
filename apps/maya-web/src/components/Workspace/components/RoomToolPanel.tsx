import { useEffect, useRef } from 'react';
import { formatArea, formatLength } from '../utils/measurements';
import type { LengthUnit } from '../types';

interface RoomToolPanelProps {
  visible: boolean;
  roomId?: string;
  label?: string;
  area: number;
  perimeter: number;
  lengthUnit: LengthUnit;
  onLabelChange: (value: string) => void;
  focusToken?: number;
}

export const RoomToolPanel: React.FC<RoomToolPanelProps> = ({
  visible,
  roomId,
  label,
  area,
  perimeter,
  lengthUnit,
  onLabelChange,
  focusToken,
}) => {
  const formattedArea = formatArea(area, lengthUnit);
  const formattedPerimeter = formatLength(perimeter, lengthUnit);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!visible || !roomId) return;
    if (typeof focusToken === 'number') {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [focusToken, visible, roomId, label]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 58,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '6px 16px',
        borderRadius: 8,
        border: '1px solid rgba(111, 98, 164, 0.25)',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        zIndex: 1100,
        boxShadow: '0 8px 24px rgba(16, 24, 40, 0.08)',
      }}
    >
      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontSize: '0.65rem',
          color: '#4B4B4B',
          gap: 2,
        }}
      >
        <span style={{ opacity: 0.7 }}>Room Name</span>
        <input
          type="text"
          value={label ?? ''}
          placeholder="Untitled Room"
          onChange={(e) => {
            onLabelChange(e.target.value);
          }}
          ref={inputRef}
          style={{
            minWidth: 140,
            borderRadius: 6,
            border: '1px solid rgba(111, 98, 164, 0.5)',
            padding: '4px 8px',
            fontSize: '0.8rem',
            color: '#3C375A',
          }}
        />
      </label>
      <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.1)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', color: '#4B4B4B', gap: 2 }}>
        <span style={{ opacity: 0.7 }}>Area</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3C375A' }}>{formattedArea}</span>
      </div>
      <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.1)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', color: '#4B4B4B', gap: 2 }}>
        <span style={{ opacity: 0.7 }}>Perimeter</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3C375A' }}>{formattedPerimeter}</span>
      </div>
    </div>
  );
};

