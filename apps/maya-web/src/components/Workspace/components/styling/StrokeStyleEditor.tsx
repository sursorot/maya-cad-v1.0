import React from 'react';
import type { StrokeStyle } from '../../types';
import { ColorPicker } from './ColorPicker';

interface StrokeStyleEditorProps {
    value: StrokeStyle;
    onChange: (stroke: StrokeStyle) => void;
    showAdvancedControls?: boolean;
}

const DASH_PATTERNS: Array<{ label: string; value: number[] | undefined; icon: React.ReactNode }> = [
    { 
        label: 'Solid', 
        value: undefined,
        icon: <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="currentColor" strokeWidth="2" /></svg>
    },
    { 
        label: 'Dashed', 
        value: [5, 5],
        icon: <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" /></svg>
    },
    { 
        label: 'Dotted', 
        value: [2, 4],
        icon: <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="2 4" strokeLinecap="round" /></svg>
    },
];

// Clean Theme styles
const styles: Record<string, React.CSSProperties> = {
    label: {
        fontSize: '9px',
        fontWeight: 600,
        color: '#6c6c6c',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 6,
        display: 'block',
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '9px',
        color: '#6c6c6c',
    },
    value: {
        fontSize: '9px',
        color: '#000000',
        minWidth: 28,
        textAlign: 'right' as const,
    },
};

export const StrokeStyleEditor: React.FC<StrokeStyleEditorProps> = ({
    value,
    onChange,
    showAdvancedControls = true,
}) => {
    const dashArrayKey = value.dashArray ? value.dashArray.join(',') : 'solid';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Stroke Color */}
            <ColorPicker
                label="Color"
                value={value.color}
                onChange={(color) => onChange({ ...value, color })}
            />

            {/* Stroke Width */}
            <div style={styles.row}>
                <span style={{ minWidth: 32 }}>Width</span>
                <input
                    type="range"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={value.width}
                    onChange={(e) => onChange({ ...value, width: parseFloat(e.target.value) })}
                    style={{ 
                        flex: 1, 
                        minWidth: 0,
                        '--slider-progress': `${((value.width - 0.5) / 19.5) * 100}%`
                    } as React.CSSProperties}
                />
                <span style={styles.value}>{value.width}px</span>
            </div>

            {showAdvancedControls && (
                <>
                    {/* Dash Pattern */}
                    <div>
                        <label style={styles.label}>Style</label>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {DASH_PATTERNS.map(({ label, value: dashValue, icon }) => {
                                const key = dashValue ? dashValue.join(',') : 'solid';
                                const isSelected = key === dashArrayKey;

                                return (
                                    <button
                                        key={key}
                                        onClick={() => onChange({ ...value, dashArray: dashValue })}
                                        title={label}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            border: isSelected ? '1px solid #000000' : '1px solid #e0e0e0',
                                            borderRadius: 3,
                                            backgroundColor: isSelected ? '#f5f5f5' : '#fff',
                                            cursor: 'pointer',
                                            transition: 'all 0.1s',
                                            color: isSelected ? '#000000' : '#c0c0c0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {icon}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Stroke Opacity */}
            <div style={styles.row}>
                <span style={{ minWidth: 32 }}>Opacity</span>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round((value.opacity ?? 1) * 100)}
                    onChange={(e) => onChange({ ...value, opacity: parseInt(e.target.value) / 100 })}
                    style={{ 
                        flex: 1, 
                        minWidth: 0,
                        '--slider-progress': `${Math.round((value.opacity ?? 1) * 100)}%`
                    } as React.CSSProperties}
                />
                <span style={styles.value}>{Math.round((value.opacity ?? 1) * 100)}%</span>
            </div>
        </div>
    );
};
